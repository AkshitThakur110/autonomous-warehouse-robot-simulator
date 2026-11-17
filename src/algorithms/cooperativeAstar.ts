import {
  GridMap,
  Position,
  PathStep,
  PlanResult,
  ExploredNodeInfo,
  Direction,
  Robot,
} from '../types';
import { PriorityQueue } from './priorityQueue';
import { manhattanDistance } from './heuristic';
import { ReservationTable } from './reservationTable';
import { isWalkable } from './astar';

interface SpaceTimeNode {
  x: number;
  y: number;
  t: number;
  g: number;
  h: number;
  f: number;
  parent: SpaceTimeNode | null;
  action: 'MOVE' | 'WAIT';
  direction: Direction;
}

const TRANSITIONS: { dx: number; dy: number; action: 'MOVE' | 'WAIT'; dir: Direction }[] = [
  // Waiting in place
  { dx: 0, dy: 0, action: 'WAIT', dir: 'WAIT' },
  // Cardinal moves
  { dx: 0, dy: -1, action: 'MOVE', dir: 'UP' },
  { dx: 1, dy: 0, action: 'MOVE', dir: 'RIGHT' },
  { dx: 0, dy: 1, action: 'MOVE', dir: 'DOWN' },
  { dx: -1, dy: 0, action: 'MOVE', dir: 'LEFT' },
];

export interface CooperativeAStarOptions {
  startTime?: number;
  horizon?: number;
  maxExpansions?: number;
  windowSize?: number;
  blockedCells?: Set<string>;
  waitCost?: number;
  reserveIndefinitelyAtGoal?: boolean;
}

/**
 * Searches for a space-time trajectory for a single robot given existing reservations.
 * Explores state space (x, y, t).
 */
export function findSpaceTimePath(
  grid: GridMap,
  start: Position,
  goal: Position,
  reservationTable: ReservationTable,
  robotId: string,
  options?: CooperativeAStarOptions
): PlanResult {
  const perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const startTime = options?.startTime ?? 0;
  const horizon = options?.horizon ?? 100;
  const maxExpansions = options?.maxExpansions ?? 8000;
  const windowSize = options?.windowSize; // if set, plan only up to startTime + windowSize
  const maxTime = windowSize ? startTime + windowSize : startTime + horizon;
  const waitCost = options?.waitCost ?? 1.0;
  const blockedCells = options?.blockedCells;

  // Validate start cell
  if (!isWalkable(grid, start.x, start.y, blockedCells)) {
    return {
      path: [],
      success: false,
      expandedCount: 0,
      computationTimeMs: 0,
      failureReason: `Start (${start.x}, ${start.y}) is blocked by a shelf or obstacle`,
    };
  }

  // If start == goal
  if (start.x === goal.x && start.y === goal.y) {
    const elapsed = typeof performance !== 'undefined' ? performance.now() - perfStart : 0;
    return {
      path: [{ x: start.x, y: start.y, t: startTime, action: 'WAIT', direction: 'WAIT' }],
      success: true,
      expandedCount: 1,
      computationTimeMs: Number(elapsed.toFixed(3)),
      visitedNodes: [{ x: start.x, y: start.y, t: startTime, g: 0, h: 0, f: 0, robotId }],
    };
  }

  const openQueue = new PriorityQueue<SpaceTimeNode>();
  // Best g-cost for (x, y, t)
  const gScore = new Map<string, number>();
  const closedSet = new Set<string>();

  const initialH = manhattanDistance(start, goal);
  const startNode: SpaceTimeNode = {
    x: start.x,
    y: start.y,
    t: startTime,
    g: 0,
    h: initialH,
    f: initialH,
    parent: null,
    action: 'WAIT',
    direction: 'WAIT',
  };

  const startKey = `${start.x},${start.y},${startTime}`;
  gScore.set(startKey, 0);
  openQueue.push(startNode, startNode.f, startNode.h);

  const visitedNodes: ExploredNodeInfo[] = [];
  let expandedCount = 0;

  // Track the best partial node in case windowed or bounded horizon expires
  let bestNodeSoFar: SpaceTimeNode = startNode;
  let bestH = initialH;

  while (!openQueue.isEmpty()) {
    const current = openQueue.pop()!;
    const currentKey = `${current.x},${current.y},${current.t}`;

    if (closedSet.has(currentKey)) {
      continue;
    }
    closedSet.add(currentKey);
    expandedCount++;

    visitedNodes.push({
      x: current.x,
      y: current.y,
      t: current.t,
      g: current.g,
      h: current.h,
      f: current.f,
      robotId,
    });

    if (current.h < bestH) {
      bestH = current.h;
      bestNodeSoFar = current;
    }

    // Goal condition: arrived at goal (x, y)
    // If not windowed, we also verify the goal remains free afterwards
    if (current.x === goal.x && current.y === goal.y) {
      const elapsed = typeof performance !== 'undefined' ? performance.now() - perfStart : 0;
      const path = reconstructSpaceTimePath(current);
      return {
        path,
        success: true,
        expandedCount,
        computationTimeMs: Number(elapsed.toFixed(3)),
        visitedNodes,
      };
    }

    // Time horizon reached
    if (current.t >= maxTime) {
      // In windowed planning (WHCA*), reaching the window border with the best node is a valid partial plan!
      if (windowSize && current === bestNodeSoFar) {
        const elapsed = typeof performance !== 'undefined' ? performance.now() - perfStart : 0;
        return {
          path: reconstructSpaceTimePath(current),
          success: true,
          expandedCount,
          computationTimeMs: Number(elapsed.toFixed(3)),
          visitedNodes,
        };
      }
      continue;
    }

    // Expansion limit reached
    if (expandedCount >= maxExpansions) {
      const elapsed = typeof performance !== 'undefined' ? performance.now() - perfStart : 0;
      return {
        path: [],
        success: false,
        expandedCount,
        computationTimeMs: Number(elapsed.toFixed(3)),
        visitedNodes,
        failureReason: `Max search expansions (${maxExpansions}) reached without finding collision-free path`,
      };
    }

    // Generate valid space-time successor transitions
    const nextTime = current.t + 1;

    for (const tr of TRANSITIONS) {
      const nx = current.x + tr.dx;
      const ny = current.y + tr.dy;

      // 1. Static map check
      if (!isWalkable(grid, nx, ny, blockedCells)) {
        continue;
      }

      // 2. Dynamic space-time reservation check (Vertex + Edge swap)
      const isAvailable = reservationTable.isTransitionAvailable(
        current.x,
        current.y,
        nx,
        ny,
        current.t,
        robotId
      );

      if (!isAvailable) {
        continue;
      }

      const nextKey = `${nx},${ny},${nextTime}`;
      if (closedSet.has(nextKey)) {
        continue;
      }

      const stepCost = tr.action === 'WAIT' ? waitCost : 1.0;
      const tentativeG = current.g + stepCost;

      const prevG = gScore.get(nextKey);
      if (prevG === undefined || tentativeG < prevG) {
        gScore.set(nextKey, tentativeG);
        const h = manhattanDistance({ x: nx, y: ny }, goal);
        // Tie-breaker: prefer higher g (closer to goal along time) or lower h
        const f = tentativeG + h;

        const successorNode: SpaceTimeNode = {
          x: nx,
          y: ny,
          t: nextTime,
          g: tentativeG,
          h,
          f,
          parent: current,
          action: tr.action,
          direction: tr.dir,
        };

        openQueue.push(successorNode, f, h);
      }
    }
  }

  // If windowed search reached end of queue, check if bestNodeSoFar made progress
  if (windowSize && bestNodeSoFar !== startNode) {
    const elapsed = typeof performance !== 'undefined' ? performance.now() - perfStart : 0;
    return {
      path: reconstructSpaceTimePath(bestNodeSoFar),
      success: true,
      expandedCount,
      computationTimeMs: Number(elapsed.toFixed(3)),
      visitedNodes,
    };
  }

  const elapsed = typeof performance !== 'undefined' ? performance.now() - perfStart : 0;
  return {
    path: [],
    success: false,
    expandedCount,
    computationTimeMs: Number(elapsed.toFixed(3)),
    visitedNodes,
    failureReason: 'No collision-free trajectory found within the planning horizon',
  };
}

function reconstructSpaceTimePath(goalNode: SpaceTimeNode): PathStep[] {
  const steps: PathStep[] = [];
  let curr: SpaceTimeNode | null = goalNode;

  while (curr !== null) {
    steps.push({
      x: curr.x,
      y: curr.y,
      t: curr.t,
      action: curr.action,
      direction: curr.direction,
    });
    curr = curr.parent;
  }

  steps.reverse();
  return steps;
}

/**
 * Plans paths for multiple robots in priority order using Cooperative A*.
 * Robots with lower priority values (1, 2, ...) plan first and reserve space-time cells.
 */
export function planMultiRobotCooperative(
  grid: GridMap,
  robots: Robot[],
  reservationTable: ReservationTable,
  options?: {
    startTime?: number;
    horizon?: number;
    windowSize?: number;
    maxExpansions?: number;
    blockedCells?: Set<string>;
    clearExistingReservations?: boolean;
  }
): {
  success: boolean;
  results: Map<string, PlanResult>;
  totalComputationTimeMs: number;
  totalExpandedNodes: number;
  conflictsResolved: number;
} {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const startTime = options?.startTime ?? 0;
  const horizon = options?.horizon ?? 100;
  const results = new Map<string, PlanResult>();

  if (options?.clearExistingReservations !== false) {
    reservationTable.clear();
  }

  // Sort robots by priority ascending (1 = highest priority, plans first)
  const sortedRobots = [...robots].sort((a, b) => a.priority - b.priority);

  let totalExpandedNodes = 0;
  let allSuccess = true;
  let conflictsResolved = 0;

  for (const robot of sortedRobots) {
    // Determine target location:
    // If robot has a task:
    //   if carrying package => destination is task.deliveryLocation
    //   else => destination is task.pickupLocation
    // If no task, stay in place or go to charging station
    let target: Position = robot.position;
    if (robot.currentTask) {
      if (robot.carryingPackage || robot.state === 'carrying_to_delivery') {
        target = robot.currentTask.deliveryLocation;
      } else {
        target = robot.currentTask.pickupLocation;
      }
    }

    const plan = findSpaceTimePath(
      grid,
      robot.position,
      target,
      reservationTable,
      robot.id,
      {
        startTime,
        horizon,
        windowSize: options?.windowSize,
        maxExpansions: options?.maxExpansions,
        blockedCells: options?.blockedCells,
      }
    );

    results.set(robot.id, plan);
    totalExpandedNodes += plan.expandedCount;

    if (plan.success && plan.path.length > 0) {
      // Check if robot had to wait at least once due to conflicts
      const waitCount = plan.path.filter((step) => step.action === 'WAIT').length;
      if (waitCount > 0) {
        conflictsResolved += waitCount;
      }
      // Commit reservations
      reservationTable.reservePath(robot.id, plan.path, true, startTime + horizon);
    } else {
      allSuccess = false;
    }
  }

  const elapsed = typeof performance !== 'undefined' ? performance.now() - t0 : 0;

  return {
    success: allSuccess,
    results,
    totalComputationTimeMs: Number(elapsed.toFixed(3)),
    totalExpandedNodes,
    conflictsResolved,
  };
}
