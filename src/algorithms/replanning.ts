import {
  GridMap,
  Robot,
  DynamicObstacle,
  LogEvent,
  Position,
  SimulationConfig,
} from '../types';
import { ReservationTable } from './reservationTable';
import { findSpaceTimePath } from './cooperativeAstar';

export interface ReplanResult {
  affectedRobotIds: string[];
  successfulReplanIds: string[];
  failedReplanIds: string[];
}

/**
 * Handles the introduction or removal of dynamic obstacles.
 * Scans active robot paths, invalidates conflicting trajectories, and replans them sequentially.
 */
export function handleDynamicObstacleEvent(
  obstacle: DynamicObstacle | Position,
  isAddition: boolean,
  robots: Robot[],
  grid: GridMap,
  reservationTable: ReservationTable,
  currentTick: number,
  config: SimulationConfig,
  activeObstacles: DynamicObstacle[],
  logEvent: (event: Omit<LogEvent, 'id' | 'timestamp'>) => void
): ReplanResult {
  const affectedRobotIds: string[] = [];
  const successfulReplanIds: string[] = [];
  const failedReplanIds: string[] = [];

  const blockedSet = new Set<string>();
  activeObstacles.forEach((obs) => blockedSet.add(`${obs.x},${obs.y}`));
  if (isAddition) {
    blockedSet.add(`${obstacle.x},${obstacle.y}`);
  }

  // Find all robots whose remaining planned path intersects the obstacle
  for (const robot of robots) {
    if (!robot.path || robot.path.length === 0) continue;

    const remainingSteps = robot.path.slice(robot.currentPathIndex);
    const intersects = remainingSteps.some(
      (step) => step.x === obstacle.x && step.y === obstacle.y
    );

    if (intersects) {
      affectedRobotIds.push(robot.id);
    }
  }

  if (isAddition) {
    logEvent({
      tick: currentTick,
      level: 'warn',
      category: 'OBSTACLE',
      message: `Dynamic obstacle placed at (${obstacle.x}, ${obstacle.y}). ${affectedRobotIds.length} robot(s) affected.`,
      position: { x: obstacle.x, y: obstacle.y },
    });
  } else {
    logEvent({
      tick: currentTick,
      level: 'info',
      category: 'OBSTACLE',
      message: `Obstacle cleared at (${obstacle.x}, ${obstacle.y}). Checking robots for replanning.`,
      position: { x: obstacle.x, y: obstacle.y },
    });
  }

  // Also include robots currently 'blocked' or 'waiting' when an obstacle is removed
  if (!isAddition) {
    robots.forEach((r) => {
      if ((r.state === 'blocked' || r.isBlocked) && !affectedRobotIds.includes(r.id)) {
        affectedRobotIds.push(r.id);
      }
    });
  }

  // Sort affected robots by priority (1 is highest)
  const sortedAffected = robots
    .filter((r) => affectedRobotIds.includes(r.id))
    .sort((a, b) => a.priority - b.priority);

  for (const robot of sortedAffected) {
    // 1. Release robot's reservations from currentTick onwards
    reservationTable.releaseRobotFromTime(robot.id, currentTick);

    // 2. Identify target
    let target = robot.position;
    if (robot.currentTask) {
      target =
        robot.carryingPackage || robot.state === 'carrying_to_delivery'
          ? robot.currentTask.deliveryLocation
          : robot.currentTask.pickupLocation;
    }

    // 3. Attempt Space-Time Replan
    const replan = findSpaceTimePath(
      grid,
      robot.position,
      target,
      reservationTable,
      robot.id,
      {
        startTime: currentTick,
        horizon: config.planningHorizon,
        windowSize: config.algorithm === 'windowed_coop_astar' ? config.windowSize : undefined,
        maxExpansions: config.maxExpansions,
        blockedCells: blockedSet,
      }
    );

    robot.metrics.replanCount++;

    if (replan.success && replan.path.length > 0) {
      // Replace robot's path
      robot.path = replan.path;
      robot.currentPathIndex = 0;
      robot.isBlocked = false;
      if (robot.state === 'blocked') {
        robot.state = robot.carryingPackage ? 'carrying_to_delivery' : 'moving_to_pickup';
      }

      // Reserve newly planned route
      reservationTable.reservePath(
        robot.id,
        replan.path,
        true,
        currentTick + config.planningHorizon
      );

      successfulReplanIds.push(robot.id);
      logEvent({
        tick: currentTick,
        level: 'success',
        category: 'REPLAN',
        message: `Rerouted ${robot.name} around obstacle (Path len: ${replan.path.length}, ${replan.computationTimeMs}ms)`,
        robotId: robot.id,
      });
    } else {
      // No path immediately available: place robot in waiting/blocked state and hold current cell reservation
      robot.isBlocked = true;
      robot.state = 'blocked';
      // Reserve robot's current cell so others don't hit it while it's stalled
      reservationTable.reservePath(
        robot.id,
        [{ x: robot.position.x, y: robot.position.y, t: currentTick, action: 'WAIT' }],
        true,
        currentTick + 20
      );

      failedReplanIds.push(robot.id);
      logEvent({
        tick: currentTick,
        level: 'error',
        category: 'REPLAN',
        message: `Replanning failed for ${robot.name}: destination unreachable with current obstacles. Holding position.`,
        robotId: robot.id,
      });
    }
  }

  return {
    affectedRobotIds,
    successfulReplanIds,
    failedReplanIds,
  };
}
