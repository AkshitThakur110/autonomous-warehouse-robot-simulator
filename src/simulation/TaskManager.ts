import { GridMap, Robot, RobotTask, LogEvent, Position } from '../types';

export class TaskManager {
  private tasks: RobotTask[] = [];
  private completedTasks: RobotTask[] = [];
  private taskCounter: number = 0;

  constructor() {}

  public get pendingTasks(): RobotTask[] {
    return this.tasks.filter((t) => t.status === 'pending');
  }

  public get activeTasks(): RobotTask[] {
    return this.tasks.filter(
      (t) =>
        t.status === 'assigned' ||
        t.status === 'in_transit_pickup' ||
        t.status === 'picked_up' ||
        t.status === 'in_transit_delivery'
    );
  }

  public get finishedTasks(): RobotTask[] {
    return this.completedTasks;
  }

  public get allTasks(): RobotTask[] {
    return [...this.tasks, ...this.completedTasks];
  }

  /**
   * Clears all tasks.
   */
  public clear(): void {
    this.tasks = [];
    this.completedTasks = [];
    this.taskCounter = 0;
  }

  /**
   * Creates a new warehouse package delivery task.
   */
  public createTask(
    pickup: Position,
    delivery: Position,
    currentTick: number,
    packageName?: string
  ): RobotTask {
    this.taskCounter++;
    const pkgId = `PKG-${String(this.taskCounter).padStart(3, '0')}`;
    const task: RobotTask = {
      id: `task-${Date.now()}-${this.taskCounter}`,
      name: packageName || `Order #${this.taskCounter} (${pkgId})`,
      packageId: pkgId,
      pickupLocation: { ...pickup },
      deliveryLocation: { ...delivery },
      status: 'pending',
      createdAtTime: currentTick,
    };

    this.tasks.push(task);
    return task;
  }

  /**
   * Generates a random valid task from available pickup and delivery stations.
   */
  public generateRandomTask(grid: GridMap, currentTick: number): RobotTask | null {
    if (grid.pickups.length === 0 || grid.deliveries.length === 0) {
      return null;
    }

    const pickup = grid.pickups[Math.floor(Math.random() * grid.pickups.length)];
    const delivery = grid.deliveries[Math.floor(Math.random() * grid.deliveries.length)];

    return this.createTask(pickup, delivery, currentTick);
  }

  /**
   * Automatically pairs available idle robots with pending tasks.
   */
  public autoAssignTasks(
    robots: Robot[],
    currentTick: number,
    logEvent: (event: Omit<LogEvent, 'id' | 'timestamp'>) => void
  ): { assignedCount: number } {
    let assignedCount = 0;
    const idleRobots = robots.filter((r) => r.state === 'idle' && r.currentTask === null);
    const pending = this.pendingTasks;

    for (let i = 0; i < Math.min(idleRobots.length, pending.length); i++) {
      const robot = idleRobots[i];
      const task = pending[i];

      task.status = 'assigned';
      task.assignedRobotId = robot.id;
      robot.currentTask = task;
      robot.state = 'moving_to_pickup';

      assignedCount++;

      logEvent({
        tick: currentTick,
        level: 'info',
        category: 'TASK',
        message: `Task ${task.name} assigned to ${robot.name}: Pickup at (${task.pickupLocation.x}, ${task.pickupLocation.y}) -> Delivery at (${task.deliveryLocation.x}, ${task.deliveryLocation.y})`,
        robotId: robot.id,
        position: task.pickupLocation,
      });
    }

    return { assignedCount };
  }

  /**
   * Assigns a specific task to a specific robot.
   */
  public assignTaskToRobot(
    task: RobotTask,
    robot: Robot,
    currentTick: number,
    logEvent: (event: Omit<LogEvent, 'id' | 'timestamp'>) => void
  ): boolean {
    if (robot.currentTask !== null || task.status !== 'pending') {
      return false;
    }

    task.status = 'assigned';
    task.assignedRobotId = robot.id;
    robot.currentTask = task;
    robot.state = 'moving_to_pickup';

    logEvent({
      tick: currentTick,
      level: 'info',
      category: 'TASK',
      message: `Assigned task ${task.name} to ${robot.name}`,
      robotId: robot.id,
      position: task.pickupLocation,
    });

    return true;
  }

  /**
   * Called when a robot arrives at the pickup cell. Transitions task and robot state.
   */
  public handlePickup(
    robot: Robot,
    currentTick: number,
    logEvent: (event: Omit<LogEvent, 'id' | 'timestamp'>) => void
  ): void {
    if (!robot.currentTask) return;

    robot.currentTask.status = 'picked_up';
    robot.currentTask.pickupTime = currentTick;
    robot.carryingPackage = true;
    robot.state = 'carrying_to_delivery';

    logEvent({
      tick: currentTick,
      level: 'success',
      category: 'TASK',
      message: `${robot.name} picked up ${robot.currentTask.packageId}. Heading to Delivery dock (${robot.currentTask.deliveryLocation.x}, ${robot.currentTask.deliveryLocation.y})`,
      robotId: robot.id,
      position: robot.position,
    });
  }

  /**
   * Called when a robot arrives at the delivery destination.
   * Completes task, updates metrics, and frees robot.
   */
  public handleDelivery(
    robot: Robot,
    currentTick: number,
    logEvent: (event: Omit<LogEvent, 'id' | 'timestamp'>) => void
  ): void {
    if (!robot.currentTask) return;

    const task = robot.currentTask;
    task.status = 'delivered';
    task.deliveredTime = currentTick;

    // Move from active to completed list
    this.tasks = this.tasks.filter((t) => t.id !== task.id);
    this.completedTasks.push(task);

    robot.carryingPackage = false;
    robot.currentTask = null;
    robot.state = 'idle';
    robot.metrics.tasksCompleted++;

    const totalDurationTicks = (task.deliveredTime ?? currentTick) - task.createdAtTime;

    logEvent({
      tick: currentTick,
      level: 'success',
      category: 'TASK',
      message: `Delivery completed by ${robot.name}! Order #${task.packageId} finished in ${totalDurationTicks} ticks.`,
      robotId: robot.id,
      position: robot.position,
    });
  }

  /**
   * Calculates delivery statistics.
   */
  public getStatistics(currentTick: number): {
    totalCompleted: number;
    pendingCount: number;
    averageDeliveryTicks: number;
    throughputPer100Ticks: number;
  } {
    const totalCompleted = this.completedTasks.length;
    const pendingCount = this.pendingTasks.length;

    let avgTicks = 0;
    if (totalCompleted > 0) {
      const sumTicks = this.completedTasks.reduce((acc, t) => {
        const d = (t.deliveredTime || currentTick) - t.createdAtTime;
        return acc + d;
      }, 0);
      avgTicks = Number((sumTicks / totalCompleted).toFixed(1));
    }

    const throughput =
      currentTick > 0 ? Number(((totalCompleted / currentTick) * 100).toFixed(2)) : 0;

    return {
      totalCompleted,
      pendingCount,
      averageDeliveryTicks: avgTicks,
      throughputPer100Ticks: throughput,
    };
  }
}
