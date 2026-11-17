import {
  GridMap,
  Robot,
  SimulationConfig,
  SimulationKPIs,
  LogEvent,
  DynamicObstacle,
  PlanResult,
  ExploredNodeInfo,
  Position,
} from '../types';
import { ReservationTable } from '../algorithms/reservationTable';
import { findPathAStar } from '../algorithms/astar';
import { planMultiRobotCooperative, findSpaceTimePath } from '../algorithms/cooperativeAstar';
import { detectDeadlocks, attemptDeadlockRecovery, DeadlockIncident } from '../algorithms/deadlockDetection';
import { handleDynamicObstacleEvent } from '../algorithms/replanning';
import { TaskManager } from './TaskManager';
import { PresetScenario, createBasicWarehouseScenario } from './ScenarioGenerator';

export class SimulationEngine {
  public currentTick: number = 0;
  public isRunning: boolean = false;
  public grid: GridMap;
  public robots: Robot[] = [];
  public dynamicObstacles: DynamicObstacle[] = [];
  public reservationTable: ReservationTable = new ReservationTable();
  public taskManager: TaskManager = new TaskManager();
  public config: SimulationConfig;
  public logs: LogEvent[] = [];
  public kpis: SimulationKPIs;
  public activeDeadlocks: DeadlockIncident[] = [];
  public exploredNodesHistory: ExploredNodeInfo[] = [];

  private timerId: number | null = null;
  private onUpdateCallback?: () => void;
  private planningTimes: number[] = [];
  private currentScenario: PresetScenario;

  constructor(initialScenario?: PresetScenario) {
    this.currentScenario = initialScenario || createBasicWarehouseScenario();
    this.grid = JSON.parse(JSON.stringify(this.currentScenario.grid));
    this.robots = JSON.parse(JSON.stringify(this.currentScenario.robots));

    this.config = {
      algorithm: 'cooperative_astar',
      planningHorizon: 80,
      windowSize: 20,
      maxExpansions: 8000,
      priorityMode: 'manual',
      stepIntervalMs: 350,
      allowDiagonals: false,
      detectDeadlocks: true,
      autoReplanOnConflict: true,
    };

    this.kpis = this.calculateInitialKPIs();
    this.initScenario(this.currentScenario);
  }

  public setOnUpdate(callback: () => void): void {
    this.onUpdateCallback = callback;
  }

  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  public log(event: Omit<LogEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LogEvent = {
      ...event,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
    };
    this.logs.unshift(fullEvent);
    if (this.logs.length > 250) {
      this.logs.pop();
    }
  }

  public initScenario(scenario: PresetScenario): void {
    this.pause();
    this.currentScenario = scenario;
    this.grid = JSON.parse(JSON.stringify(scenario.grid));
    this.robots = JSON.parse(JSON.stringify(scenario.robots));
    this.dynamicObstacles = [];
    this.reservationTable.clear();
    this.taskManager.clear();
    this.currentTick = 0;
    this.planningTimes = [];
    this.activeDeadlocks = [];
    this.exploredNodesHistory = [];
    this.logs = [];

    // Seed initial tasks
    scenario.initialTasks.forEach((t) => {
      this.taskManager.createTask(t.pickup, t.delivery, 0, t.name);
    });

    this.log({
      tick: 0,
      level: 'info',
      category: 'SIM',
      message: `Loaded scenario: "${scenario.name}". Initialized ${this.robots.length} robots and ${scenario.initialTasks.length} tasks.`,
    });

    // Auto-assign tasks to idle robots
    this.taskManager.autoAssignTasks(this.robots, 0, this.log.bind(this));

    // Initial Path Planning for all robots
    this.replanAllRobots();
    this.updateKPIs();
    this.notifyUpdate();
  }

  public reset(): void {
    this.initScenario(this.currentScenario);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log({
      tick: this.currentTick,
      level: 'info',
      category: 'SIM',
      message: `Simulation started at tick ${this.currentTick}`,
    });
    this.scheduleNextTick();
    this.notifyUpdate();
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.log({
      tick: this.currentTick,
      level: 'info',
      category: 'SIM',
      message: `Simulation paused at tick ${this.currentTick}`,
    });
    this.notifyUpdate();
  }

  public setSpeed(stepIntervalMs: number): void {
    this.config.stepIntervalMs = Math.max(50, Math.min(2000, stepIntervalMs));
    if (this.isRunning) {
      if (this.timerId !== null) clearTimeout(this.timerId);
      this.scheduleNextTick();
    }
    this.notifyUpdate();
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;
    this.timerId = window.setTimeout(() => {
      this.step();
      if (this.isRunning) {
        this.scheduleNextTick();
      }
    }, this.config.stepIntervalMs);
  }

  /**
   * Advances simulation by exactly one discrete time step.
   */
  public step(): void {
    this.currentTick++;

    // 1. Process active obstacle expirations
    this.dynamicObstacles = this.dynamicObstacles.filter((obs) => {
      if (obs.duration && this.currentTick - obs.placedAtTick >= obs.duration) {
        this.log({
          tick: this.currentTick,
          level: 'info',
          category: 'OBSTACLE',
          message: `Temporary obstacle at (${obs.x}, ${obs.y}) expired and cleared.`,
        });
        return false;
      }
      return true;
    });

    // 2. Replenish / Auto-assign tasks for idle robots
    if (this.taskManager.pendingTasks.length > 0) {
      this.taskManager.autoAssignTasks(this.robots, this.currentTick, this.log.bind(this));
    }

    // 3. Check for robots needing path planning (e.g. idle robots assigned new tasks)
    this.ensureRobotsHavePaths();

    // 4. Advance each robot one step along its planned trajectory
    this.advanceRobots();

    // 5. Deadlock detection & automated bounded recovery
    if (this.config.detectDeadlocks) {
      this.handleDeadlocks();
    }

    // 6. Update KPIs
    this.updateKPIs();
    this.notifyUpdate();
  }

  private ensureRobotsHavePaths(): void {
    const robotsNeedingPlans = this.robots.filter(
      (r) =>
        r.currentTask !== null &&
        (!r.path || r.path.length === 0 || r.currentPathIndex >= r.path.length - 1)
    );

    if (robotsNeedingPlans.length > 0) {
      for (const robot of robotsNeedingPlans) {
        this.planSingleRobot(robot);
      }
    }
  }

  /**
   * Plans or extends trajectory for a single robot based on active algorithm.
   */
  public planSingleRobot(robot: Robot): PlanResult {
    let target = robot.position;
    if (robot.currentTask) {
      target =
        robot.carryingPackage || robot.state === 'carrying_to_delivery'
          ? robot.currentTask.deliveryLocation
          : robot.currentTask.pickupLocation;
    }

    const blockedSet = new Set<string>();
    this.dynamicObstacles.forEach((o) => blockedSet.add(`${o.x},${o.y}`));

    let result: PlanResult;

    if (this.config.algorithm === 'astar') {
      // Independent static A*
      result = findPathAStar(this.grid, robot.position, target, {
        blockedCells: blockedSet,
        maxExpansions: this.config.maxExpansions,
        robotId: robot.id,
      });
    } else {
      // Cooperative A* or Windowed Cooperative A*
      result = findSpaceTimePath(
        this.grid,
        robot.position,
        target,
        this.reservationTable,
        robot.id,
        {
          startTime: this.currentTick,
          horizon: this.config.planningHorizon,
          windowSize:
            this.config.algorithm === 'windowed_coop_astar' ? this.config.windowSize : undefined,
          maxExpansions: this.config.maxExpansions,
          blockedCells: blockedSet,
        }
      );
    }

    this.planningTimes.push(result.computationTimeMs);
    this.kpis.totalNodesExpanded += result.expandedCount;

    if (result.visitedNodes) {
      this.exploredNodesHistory = result.visitedNodes.slice(0, 150);
    }

    if (result.success && result.path.length > 0) {
      robot.path = result.path;
      robot.currentPathIndex = 0;
      robot.isBlocked = false;
      this.kpis.successfulPlans++;

      if (this.config.algorithm !== 'astar') {
        this.reservationTable.reservePath(
          robot.id,
          result.path,
          true,
          this.currentTick + this.config.planningHorizon
        );
      }

      this.log({
        tick: this.currentTick,
        level: 'info',
        category: 'PLAN',
        message: `Plan found for ${robot.name} (${result.path.length} steps, ${result.computationTimeMs}ms)`,
        robotId: robot.id,
      });
    } else {
      robot.isBlocked = true;
      robot.state = 'blocked';
      this.kpis.failedPlans++;
      this.log({
        tick: this.currentTick,
        level: 'warn',
        category: 'PLAN',
        message: `Planning failed for ${robot.name}: ${result.failureReason || 'No path available'}`,
        robotId: robot.id,
      });
    }

    return result;
  }

  /**
   * Replans all robots in priority order.
   */
  public replanAllRobots(): void {
    if (this.config.algorithm === 'astar') {
      this.reservationTable.clear();
      for (const robot of this.robots) {
        this.planSingleRobot(robot);
      }
    } else {
      const blockedSet = new Set<string>();
      this.dynamicObstacles.forEach((o) => blockedSet.add(`${o.x},${o.y}`));

      const outcome = planMultiRobotCooperative(
        this.grid,
        this.robots,
        this.reservationTable,
        {
          startTime: this.currentTick,
          horizon: this.config.planningHorizon,
          windowSize:
            this.config.algorithm === 'windowed_coop_astar' ? this.config.windowSize : undefined,
          maxExpansions: this.config.maxExpansions,
          blockedCells: blockedSet,
          clearExistingReservations: true,
        }
      );

      this.planningTimes.push(outcome.totalComputationTimeMs);
      this.kpis.totalNodesExpanded += outcome.totalExpandedNodes;
      this.kpis.collisionConflictsDetected += outcome.conflictsResolved;

      for (const robot of this.robots) {
        const res = outcome.results.get(robot.id);
        if (res && res.success && res.path.length > 0) {
          robot.path = res.path;
          robot.currentPathIndex = 0;
          robot.isBlocked = false;
          this.kpis.successfulPlans++;
        } else {
          robot.isBlocked = true;
          robot.state = 'blocked';
          this.kpis.failedPlans++;
        }
      }
    }
  }

  private advanceRobots(): void {
    for (const robot of this.robots) {
      if (!robot.path || robot.path.length === 0) {
        if (robot.currentTask) {
          robot.state = 'waiting';
          robot.metrics.waitSteps++;
          robot.waitingTicks++;
        }
        continue;
      }

      // Check if robot has finished planned trajectory
      if (robot.currentPathIndex >= robot.path.length - 1) {
        // Evaluate task condition at destination
        this.evaluateRobotTaskArrival(robot);
        continue;
      }

      const nextIndex = robot.currentPathIndex + 1;
      const nextStep = robot.path[nextIndex];

      // Physical sanity check: Did an unpredicted obstacle block this cell?
      const isCellBlocked = this.dynamicObstacles.some(
        (obs) => obs.x === nextStep.x && obs.y === nextStep.y
      );

      if (isCellBlocked) {
        // Cannot advance! Emergency wait and replan
        robot.state = 'blocked';
        robot.metrics.waitSteps++;
        robot.waitingTicks++;
        this.handleDynamicObstacle(
          { x: nextStep.x, y: nextStep.y },
          true
        );
        continue;
      }

      // Execute step
      robot.previousPosition = { ...robot.position };

      if (nextStep.action === 'WAIT') {
        robot.state = 'waiting';
        robot.metrics.waitSteps++;
        robot.waitingTicks++;
      } else {
        // Move
        robot.position = { x: nextStep.x, y: nextStep.y };
        if (nextStep.direction && nextStep.direction !== 'WAIT') {
          robot.orientation = nextStep.direction;
        }
        robot.metrics.totalDistance++;
        robot.waitingTicks = 0; // reset consecutive wait

        // Update active state based on carrying package
        if (robot.carryingPackage) {
          robot.state = 'carrying_to_delivery';
        } else if (robot.currentTask) {
          robot.state = 'moving_to_pickup';
        } else {
          robot.state = 'idle';
        }
      }

      robot.currentPathIndex = nextIndex;

      // Check if robot just arrived at current destination
      if (robot.currentPathIndex === robot.path.length - 1) {
        this.evaluateRobotTaskArrival(robot);
      }
    }
  }

  private evaluateRobotTaskArrival(robot: Robot): void {
    if (!robot.currentTask) return;

    // Check if at pickup
    if (
      !robot.carryingPackage &&
      robot.position.x === robot.currentTask.pickupLocation.x &&
      robot.position.y === robot.currentTask.pickupLocation.y
    ) {
      this.taskManager.handlePickup(robot, this.currentTick, this.log.bind(this));
      // Replan immediately to delivery dock
      this.planSingleRobot(robot);
      return;
    }

    // Check if at delivery
    if (
      robot.carryingPackage &&
      robot.position.x === robot.currentTask.deliveryLocation.x &&
      robot.position.y === robot.currentTask.deliveryLocation.y
    ) {
      this.taskManager.handleDelivery(robot, this.currentTick, this.log.bind(this));
      // Try to auto-assign next pending task
      const nextTask = this.taskManager.pendingTasks[0];
      if (nextTask) {
        this.taskManager.assignTaskToRobot(nextTask, robot, this.currentTick, this.log.bind(this));
        this.planSingleRobot(robot);
      }
      return;
    }
  }

  private handleDeadlocks(): void {
    const deadlocks = detectDeadlocks(this.robots, this.grid, this.reservationTable, this.currentTick);
    this.activeDeadlocks = deadlocks;

    if (deadlocks.length > 0) {
      this.kpis.deadlocksDetected += deadlocks.length;

      for (const deadlock of deadlocks) {
        const recovered = attemptDeadlockRecovery(
          deadlock,
          this.robots,
          this.grid,
          this.reservationTable,
          this.currentTick,
          this.log.bind(this)
        );

        if (recovered) {
          this.kpis.deadlocksRecovered++;
          // Trigger prioritized replan for involved robots
          deadlock.robotIds.forEach((rId) => {
            const r = this.robots.find((bot) => bot.id === rId);
            if (r) this.planSingleRobot(r);
          });
        }
      }
    }
  }

  public handleDynamicObstacle(pos: Position, isAddition: boolean): void {
    let obs: DynamicObstacle;
    if (isAddition) {
      obs = {
        id: `obs-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        placedAtTick: this.currentTick,
        color: '#f59e0b',
      };
      this.dynamicObstacles.push(obs);
    } else {
      const idx = this.dynamicObstacles.findIndex((o) => o.x === pos.x && o.y === pos.y);
      if (idx !== -1) {
        obs = this.dynamicObstacles[idx];
        this.dynamicObstacles.splice(idx, 1);
      } else {
        return;
      }
    }

    const replanResult = handleDynamicObstacleEvent(
      obs,
      isAddition,
      this.robots,
      this.grid,
      this.reservationTable,
      this.currentTick,
      this.config,
      this.dynamicObstacles,
      this.log.bind(this)
    );

    this.kpis.replanningCount += replanResult.affectedRobotIds.length;
    this.notifyUpdate();
  }

  /**
   * Allows user to edit grid cells (toggle shelf, pickup, delivery, start positions).
   */
  public editCell(x: number, y: number, newType: 'empty' | 'shelf' | 'pickup' | 'delivery' | 'charging'): void {
    if (x < 0 || x >= this.grid.width || y < 0 || y >= this.grid.height) return;

    // Check if robot is occupying cell
    const robotHere = this.robots.find((r) => r.position.x === x && r.position.y === y);
    if (robotHere && newType === 'shelf') {
      this.log({
        tick: this.currentTick,
        level: 'warn',
        category: 'SIM',
        message: `Cannot place shelf at (${x}, ${y}): Robot ${robotHere.name} is stationed there!`,
      });
      return;
    }

    // Clean up existing special markers
    this.grid.pickups = this.grid.pickups.filter((p) => p.x !== x || p.y !== y);
    this.grid.deliveries = this.grid.deliveries.filter((d) => d.x !== x || d.y !== y);
    this.grid.chargingStations = this.grid.chargingStations.filter((c) => c.x !== x || c.y !== y);

    this.grid.cells[y][x] = newType;

    if (newType === 'pickup') {
      this.grid.pickups.push({ x, y });
    } else if (newType === 'delivery') {
      this.grid.deliveries.push({ x, y });
    } else if (newType === 'charging') {
      this.grid.chargingStations.push({ x, y });
    }

    this.replanAllRobots();
    this.notifyUpdate();
  }

  private calculateInitialKPIs(): SimulationKPIs {
    return {
      activeRobots: this.robots.length,
      completedDeliveries: 0,
      pendingTasks: this.taskManager.pendingTasks.length,
      totalDistanceTraveled: 0,
      averagePathLength: 0,
      totalNodesExpanded: 0,
      averagePlanningTimeMs: 0,
      maxPlanningTimeMs: 0,
      replanningCount: 0,
      collisionConflictsDetected: 0,
      successfulPlans: 0,
      failedPlans: 0,
      totalWaitSteps: 0,
      idleTimeRatio: 0,
      throughput: 0,
      makespan: 0,
      deadlocksDetected: 0,
      deadlocksRecovered: 0,
    };
  }

  private updateKPIs(): void {
    const stats = this.taskManager.getStatistics(this.currentTick);

    let totalDist = 0;
    let totalWaits = 0;
    let totalPathSteps = 0;
    let activeRobotsCount = 0;

    for (const r of this.robots) {
      totalDist += r.metrics.totalDistance;
      totalWaits += r.metrics.waitSteps;
      if (r.path && r.path.length > 0) {
        totalPathSteps += r.path.length;
      }
      if (r.state !== 'idle') {
        activeRobotsCount++;
      }
    }

    const avgPlanningTime =
      this.planningTimes.length > 0
        ? Number(
            (
              this.planningTimes.reduce((a, b) => a + b, 0) / this.planningTimes.length
            ).toFixed(2)
          )
        : 0;

    const maxPlanningTime =
      this.planningTimes.length > 0
        ? Number(Math.max(...this.planningTimes).toFixed(2))
        : 0;

    const totalStepsPossible = this.robots.length * Math.max(1, this.currentTick);
    const idleRatio =
      totalStepsPossible > 0
        ? Number(((totalWaits / totalStepsPossible) * 100).toFixed(1))
        : 0;

    this.kpis = {
      ...this.kpis,
      activeRobots: activeRobotsCount,
      completedDeliveries: stats.totalCompleted,
      pendingTasks: stats.pendingCount,
      totalDistanceTraveled: totalDist,
      averagePathLength:
        this.robots.length > 0 ? Number((totalPathSteps / this.robots.length).toFixed(1)) : 0,
      averagePlanningTimeMs: avgPlanningTime,
      maxPlanningTimeMs: maxPlanningTime,
      totalWaitSteps: totalWaits,
      idleTimeRatio: idleRatio,
      throughput: stats.throughputPer100Ticks,
      makespan: this.currentTick,
    };
  }
}
