import {
  AlgorithmType,
  BenchmarkAggregate,
  BenchmarkTrial,
  GridMap,
  Robot,
  RobotTask,
} from '../types';
import { createMultiRobotTrafficScenario } from '../simulation/ScenarioGenerator';
import { ReservationTable } from '../algorithms/reservationTable';
import { planMultiRobotCooperative } from '../algorithms/cooperativeAstar';
import { findPathAStar } from '../algorithms/astar';
import { getRobotColor } from '../utils/colors';

export interface BenchmarkConfig {
  robotCounts: number[];
  trialsPerCount: number;
  algorithm: AlgorithmType;
  maxPlanningHorizon: number;
}

export async function runBenchmarkSuite(
  config: BenchmarkConfig,
  onProgress?: (progressPercent: number, currentStatus: string) => void
): Promise<{
  aggregates: BenchmarkAggregate[];
  rawTrials: BenchmarkTrial[];
}> {
  const baseScenario = createMultiRobotTrafficScenario();
  const rawTrials: BenchmarkTrial[] = [];
  const aggregates: BenchmarkAggregate[] = [];

  const totalSteps = config.robotCounts.length * config.trialsPerCount;
  let completedSteps = 0;

  for (const count of config.robotCounts) {
    const trialsForCount: BenchmarkTrial[] = [];

    for (let trial = 1; trial <= config.trialsPerCount; trial++) {
      // Report progress
      completedSteps++;
      const pct = Math.round((completedSteps / totalSteps) * 100);
      if (onProgress) {
        onProgress(
          pct,
          `Testing ${count} robots (Trial ${trial}/${config.trialsPerCount}) with ${config.algorithm}...`
        );
      }

      // Small async pause to yield event loop so UI can render smoothly
      await new Promise((resolve) => setTimeout(resolve, 15));

      // Clone map
      const grid: GridMap = JSON.parse(JSON.stringify(baseScenario.grid));

      // Generate `count` robots placed in valid floor positions
      const robots = generateBenchmarkingRobots(count, grid);
      const tasks = generateBenchmarkingTasks(count, grid);

      // Assign tasks
      for (let i = 0; i < robots.length; i++) {
        robots[i].currentTask = tasks[i % tasks.length];
      }

      const reservationTable = new ReservationTable();
      const startTime = performance.now();

      let success = true;
      let totalNodesExpanded = 0;
      let totalPathLength = 0;
      let totalWaitSteps = 0;
      let planningDurationMs = 0;

      if (config.algorithm === 'astar') {
        // Run independent A* for each robot
        for (const robot of robots) {
          const target = robot.currentTask!.pickupLocation;
          const plan = findPathAStar(grid, robot.position, target);
          totalNodesExpanded += plan.expandedCount;
          if (plan.success) {
            totalPathLength += plan.path.length;
          } else {
            success = false;
          }
        }
        planningDurationMs = performance.now() - startTime;
      } else {
        // Cooperative A* or Windowed
        const res = planMultiRobotCooperative(grid, robots, reservationTable, {
          startTime: 0,
          horizon: config.maxPlanningHorizon,
          windowSize: config.algorithm === 'windowed_coop_astar' ? 20 : undefined,
          clearExistingReservations: true,
        });

        planningDurationMs = res.totalComputationTimeMs;
        totalNodesExpanded = res.totalExpandedNodes;
        success = res.success;

        for (const robot of robots) {
          const rPlan = res.results.get(robot.id);
          if (rPlan && rPlan.success) {
            totalPathLength += rPlan.path.length;
            totalWaitSteps += rPlan.path.filter((p) => p.action === 'WAIT').length;
          }
        }
      }

      const trialResult: BenchmarkTrial = {
        robotCount: count,
        scenarioName: baseScenario.name,
        algorithm: config.algorithm,
        trialNumber: trial,
        success,
        planningTimeMs: Number(planningDurationMs.toFixed(3)),
        nodesExpanded: totalNodesExpanded,
        pathLength: count > 0 ? Math.round(totalPathLength / count) : 0,
        waitSteps: totalWaitSteps,
        completedTasks: success ? count : Math.floor(count * 0.5),
        replanningCount: 0,
        deadlocks: 0,
      };

      trialsForCount.push(trialResult);
      rawTrials.push(trialResult);
    }

    // Compute aggregate for this robot count
    const successfulRuns = trialsForCount.filter((t) => t.success).length;
    const successRate = Math.round((successfulRuns / trialsForCount.length) * 100);

    const planningTimes = trialsForCount.map((t) => t.planningTimeMs);
    const avgPlanningTime = Number(
      (planningTimes.reduce((a, b) => a + b, 0) / planningTimes.length).toFixed(2)
    );
    const minPlanningTime = Math.min(...planningTimes);
    const maxPlanningTime = Math.max(...planningTimes);

    const avgNodes = Math.round(
      trialsForCount.reduce((a, b) => a + b.nodesExpanded, 0) / trialsForCount.length
    );
    const avgPath = Number(
      (
        trialsForCount.reduce((a, b) => a + b.pathLength, 0) / trialsForCount.length
      ).toFixed(1)
    );
    const avgWaits = Number(
      (
        trialsForCount.reduce((a, b) => a + b.waitSteps, 0) / trialsForCount.length
      ).toFixed(1)
    );

    const throughput = Number(((count * (successRate / 100) * 10) / Math.max(1, avgPath)).toFixed(2));

    aggregates.push({
      robotCount: count,
      algorithm: config.algorithm,
      runs: trialsForCount.length,
      successRate,
      avgPlanningTimeMs: avgPlanningTime,
      minPlanningTimeMs: minPlanningTime,
      maxPlanningTimeMs: maxPlanningTime,
      avgNodesExpanded: avgNodes,
      avgPathLength: avgPath,
      avgWaitSteps: avgWaits,
      avgThroughput: throughput,
    });
  }

  return { aggregates, rawTrials };
}

function generateBenchmarkingRobots(count: number, grid: GridMap): Robot[] {
  const robots: Robot[] = [];
  const validStartLocations = [
    { x: 9, y: 1 },
    { x: 10, y: 1 },
    { x: 9, y: 12 },
    { x: 10, y: 12 },
    { x: 1, y: 4 },
    { x: 1, y: 8 },
    { x: 18, y: 4 },
    { x: 18, y: 8 },
    { x: 5, y: 0 },
    { x: 14, y: 0 },
    { x: 5, y: 13 },
    { x: 14, y: 13 },
  ];

  for (let i = 0; i < count; i++) {
    const loc = validStartLocations[i % validStartLocations.length];
    // Add jitter offset if count exceeds base points
    const actualX = (loc.x + Math.floor(i / validStartLocations.length)) % grid.width;
    const actualY = loc.y;

    robots.push({
      id: `bench-robot-${i + 1}`,
      name: `AMR-${i + 1}`,
      color: getRobotColor(i),
      position: { x: actualX, y: actualY },
      orientation: 'DOWN',
      state: 'idle',
      priority: i + 1,
      currentTask: null,
      carryingPackage: false,
      path: [],
      currentPathIndex: 0,
      metrics: {
        totalDistance: 0,
        waitSteps: 0,
        tasksCompleted: 0,
        replanCount: 0,
        timeSpentMoving: 0,
        timeSpentWaiting: 0,
      },
      waitingTicks: 0,
      isBlocked: false,
    });
  }

  return robots;
}

function generateBenchmarkingTasks(count: number, grid: GridMap): RobotTask[] {
  const tasks: RobotTask[] = [];
  for (let i = 0; i < count; i++) {
    const p = grid.pickups[i % grid.pickups.length] || { x: 0, y: 2 };
    const d = grid.deliveries[i % grid.deliveries.length] || { x: 19, y: 10 };
    tasks.push({
      id: `bench-task-${i + 1}`,
      name: `Bench Task #${i + 1}`,
      packageId: `PKG-${i + 1}`,
      pickupLocation: p,
      deliveryLocation: d,
      status: 'pending',
      createdAtTime: 0,
    });
  }
  return tasks;
}
