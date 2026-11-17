import { GridMap, Position, PathStep, PlanResult, ExploredNodeInfo, Direction } from '../types';
import { PriorityQueue } from './priorityQueue';
import { manhattanDistance } from './heuristic';

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
  action: 'MOVE' | 'WAIT';
}

const CARDINAL_DIRS: { dx: number; dy: number; dir: Direction }[] = [
  { dx: 0, dy: -1, dir: 'UP' },
  { dx: 1, dy: 0, dir: 'RIGHT' },
  { dx: 0, dy: 1, dir: 'DOWN' },
  { dx: -1, dy: 0, dir: 'LEFT' },
];

/**
 * Checks if a coordinate is within warehouse bounds and not blocked by shelves/walls or active obstacles.
 */
export function isWalkable(
  grid: GridMap,
  x: number,
  y: number,
  blockedCells?: Set<string>
): boolean {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) {
    return false;
  }
  const cellType = grid.cells[y][x];
  if (cellType === 'shelf') {
    return false;
  }
  if (blockedCells && blockedCells.has(`${x},${y}`)) {
    return false;
  }
  return true;
}

/**
 * Executes standard static 2D A* search from start to goal.
 * Records computation metrics and node exploration history for educational visualization.
 */
export function findPathAStar(
  grid: GridMap,
  start: Position,
  goal: Position,
  options?: {
    blockedCells?: Set<string>;
    maxExpansions?: number;
    allowDiagonals?: boolean;
    costMultiplier?: (pos: Position) => number;
    robotId?: string;
  }
): PlanResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const maxExpansions = options?.maxExpansions ?? 10000;
  const blockedCells = options?.blockedCells;

  // Validate start and goal
  if (!isWalkable(grid, start.x, start.y, blockedCells)) {
    return {
      path: [],
      success: false,
      expandedCount: 0,
      computationTimeMs: 0,
      failureReason: `Start position (${start.x}, ${start.y}) is blocked or invalid`,
    };
  }
  if (!isWalkable(grid, goal.x, goal.y, blockedCells)) {
    return {
      path: [],
      success: false,
      expandedCount: 0,
      computationTimeMs: 0,
      failureReason: `Goal position (${goal.x}, ${goal.y}) is blocked or invalid`,
    };
  }

  // Trivial start equals goal case
  if (start.x === goal.x && start.y === goal.y) {
    const elapsed = typeof performance !== 'undefined' ? performance.now() - startTime : 0;
    return {
      path: [{ x: start.x, y: start.y, t: 0, action: 'WAIT', direction: 'WAIT' }],
      success: true,
      expandedCount: 1,
      computationTimeMs: Number(elapsed.toFixed(3)),
      visitedNodes: [{ x: start.x, y: start.y, g: 0, h: 0, f: 0, robotId: options?.robotId }],
    };
  }

  const openQueue = new PriorityQueue<AStarNode>();
  // Best g-cost seen so far for (x, y)
  const gScore = new Map<string, number>();
  // Closed set to prevent re-expansion
  const closedSet = new Set<string>();

  const startH = manhattanDistance(start, goal);
  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: startH,
    f: startH,
    parent: null,
    action: 'WAIT',
  };

  const startKey = `${start.x},${start.y}`;
  gScore.set(startKey, 0);
  openQueue.push(startNode, startNode.f, startNode.h);

  const visitedNodes: ExploredNodeInfo[] = [];
  let expandedCount = 0;

  while (!openQueue.isEmpty()) {
    const current = openQueue.pop()!;
    const currentKey = `${current.x},${current.y}`;

    if (closedSet.has(currentKey)) {
      continue;
    }
    closedSet.add(currentKey);
    expandedCount++;

    visitedNodes.push({
      x: current.x,
      y: current.y,
      g: current.g,
      h: current.h,
      f: current.f,
      robotId: options?.robotId,
    });

    // Check if goal reached
    if (current.x === goal.x && current.y === goal.y) {
      const elapsed = typeof performance !== 'undefined' ? performance.now() - startTime : 0;
      const reconstructedPath = reconstructPath(current);
      return {
        path: reconstructedPath,
        success: true,
        expandedCount,
        computationTimeMs: Number(elapsed.toFixed(3)),
        visitedNodes,
      };
    }

    if (expandedCount >= maxExpansions) {
      const elapsed = typeof performance !== 'undefined' ? performance.now() - startTime : 0;
      return {
        path: [],
        success: false,
        expandedCount,
        computationTimeMs: Number(elapsed.toFixed(3)),
        visitedNodes,
        failureReason: `Search exceeded maximum expansions (${maxExpansions})`,
      };
    }

    // Expand neighbors
    for (const dir of CARDINAL_DIRS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const nKey = `${nx},${ny}`;

      if (!isWalkable(grid, nx, ny, blockedCells) || closedSet.has(nKey)) {
        continue;
      }

      const moveCost = options?.costMultiplier ? options.costMultiplier({ x: nx, y: ny }) : 1;
      const tentativeG = current.g + moveCost;

      const prevG = gScore.get(nKey);
      if (prevG === undefined || tentativeG < prevG) {
        gScore.set(nKey, tentativeG);
        const h = manhattanDistance({ x: nx, y: ny }, goal);
        const f = tentativeG + h;

        const neighborNode: AStarNode = {
          x: nx,
          y: ny,
          g: tentativeG,
          h,
          f,
          parent: current,
          action: 'MOVE',
        };

        // Prefer lower h-cost for tie-breaking
        openQueue.push(neighborNode, f, h);
      }
    }
  }

  // Goal was unreachable
  const elapsed = typeof performance !== 'undefined' ? performance.now() - startTime : 0;
  return {
    path: [],
    success: false,
    expandedCount,
    computationTimeMs: Number(elapsed.toFixed(3)),
    visitedNodes,
    failureReason: 'Destination is unreachable from the current position',
  };
}

function reconstructPath(goalNode: AStarNode): PathStep[] {
  const steps: PathStep[] = [];
  let curr: AStarNode | null = goalNode;

  while (curr !== null) {
    let direction: Direction = 'WAIT';
    if (curr.parent) {
      const dx = curr.x - curr.parent.x;
      const dy = curr.y - curr.parent.y;
      if (dx === 1) direction = 'RIGHT';
      else if (dx === -1) direction = 'LEFT';
      else if (dy === 1) direction = 'DOWN';
      else if (dy === -1) direction = 'UP';
    }

    steps.push({
      x: curr.x,
      y: curr.y,
      t: 0, // will be indexed in reverse order
      action: curr.action,
      direction,
    });
    curr = curr.parent;
  }

  steps.reverse();
  // Assign timesteps t = 0, 1, 2, ...
  steps.forEach((step, idx) => {
    step.t = idx;
  });

  return steps;
}
