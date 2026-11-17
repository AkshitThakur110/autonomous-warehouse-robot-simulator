import { GridMap, Robot, Position, CellType } from '../types';
import { getRobotColor } from '../utils/colors';

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  grid: GridMap;
  robots: Robot[];
  initialTasks: Array<{ pickup: Position; delivery: Position; name?: string }>;
}

/**
 * Creates an empty grid initialized to 'empty' walkable floor.
 */
export function createEmptyGrid(width: number, height: number): GridMap {
  const cells: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'empty' as CellType)
  );
  return {
    width,
    height,
    cells,
    pickups: [],
    deliveries: [],
    chargingStations: [],
  };
}

/**
 * Helper to add a rectangular shelf block.
 */
function addShelfBlock(
  grid: GridMap,
  startX: number,
  startY: number,
  width: number,
  height: number
): void {
  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + width; x++) {
      if (y >= 0 && y < grid.height && x >= 0 && x < grid.width) {
        grid.cells[y][x] = 'shelf';
      }
    }
  }
}

/**
 * Preset A: Basic Warehouse (Introductory setup with 1-2 robots, shelf pods, clear corridors)
 */
export function createBasicWarehouseScenario(): PresetScenario {
  const width = 20;
  const height = 14;
  const grid = createEmptyGrid(width, height);

  // Add 4 shelf pods (2 rows x 2 cols of racks)
  addShelfBlock(grid, 3, 2, 5, 3);
  addShelfBlock(grid, 12, 2, 5, 3);
  addShelfBlock(grid, 3, 8, 5, 3);
  addShelfBlock(grid, 12, 8, 5, 3);

  // Pickups
  grid.pickups = [
    { x: 1, y: 3 },
    { x: 1, y: 9 },
  ];
  grid.pickups.forEach((p) => (grid.cells[p.y][p.x] = 'pickup'));

  // Deliveries (Docks on the right side)
  grid.deliveries = [
    { x: 18, y: 3 },
    { x: 18, y: 9 },
  ];
  grid.deliveries.forEach((d) => (grid.cells[d.y][d.x] = 'delivery'));

  // Charging Stations
  grid.chargingStations = [
    { x: 9, y: 0 },
    { x: 10, y: 0 },
  ];
  grid.chargingStations.forEach((c) => (grid.cells[c.y][c.x] = 'charging'));

  // Initial Robots
  const robots: Robot[] = [
    {
      id: 'robot-1',
      name: 'Alpha-01',
      color: getRobotColor(0),
      position: { x: 9, y: 1 },
      orientation: 'DOWN',
      state: 'idle',
      priority: 1,
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
    },
    {
      id: 'robot-2',
      name: 'Beta-02',
      color: getRobotColor(1),
      position: { x: 10, y: 13 },
      orientation: 'UP',
      state: 'idle',
      priority: 2,
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
    },
  ];

  const initialTasks = [
    { pickup: { x: 1, y: 3 }, delivery: { x: 18, y: 3 }, name: 'Pallet A-101' },
    { pickup: { x: 1, y: 9 }, delivery: { x: 18, y: 9 }, name: 'Box B-204' },
  ];

  return {
    id: 'basic-warehouse',
    name: 'Basic Warehouse',
    description: '1–2 robots navigating around shelf pods with direct pickup and delivery points.',
    grid,
    robots,
    initialTasks,
  };
}

/**
 * Preset B: Multi-Robot Traffic (4–6 robots sharing multiple aisles, parallel flow, crossing intersections)
 */
export function createMultiRobotTrafficScenario(): PresetScenario {
  const width = 20;
  const height = 14;
  const grid = createEmptyGrid(width, height);

  // 3 long horizontal rack rows with cross-aisles at x=9..10
  addShelfBlock(grid, 2, 2, 6, 2);
  addShelfBlock(grid, 12, 2, 6, 2);

  addShelfBlock(grid, 2, 6, 6, 2);
  addShelfBlock(grid, 12, 6, 6, 2);

  addShelfBlock(grid, 2, 10, 6, 2);
  addShelfBlock(grid, 12, 10, 6, 2);

  // Pickups along left wall
  grid.pickups = [
    { x: 0, y: 2 },
    { x: 0, y: 6 },
    { x: 0, y: 10 },
    { x: 0, y: 12 },
  ];
  grid.pickups.forEach((p) => (grid.cells[p.y][p.x] = 'pickup'));

  // Deliveries along right wall
  grid.deliveries = [
    { x: 19, y: 2 },
    { x: 19, y: 6 },
    { x: 19, y: 10 },
    { x: 19, y: 12 },
  ];
  grid.deliveries.forEach((d) => (grid.cells[d.y][d.x] = 'delivery'));

  // Charging
  grid.chargingStations = [
    { x: 9, y: 0 },
    { x: 10, y: 0 },
    { x: 9, y: 13 },
    { x: 10, y: 13 },
  ];
  grid.chargingStations.forEach((c) => (grid.cells[c.y][c.x] = 'charging'));

  // 4 robots stationed in central cross-aisle and perimeter
  const robotCoords = [
    { x: 9, y: 1, dir: 'DOWN' as const },
    { x: 10, y: 1, dir: 'DOWN' as const },
    { x: 9, y: 12, dir: 'UP' as const },
    { x: 10, y: 12, dir: 'UP' as const },
    { x: 1, y: 4, dir: 'RIGHT' as const },
  ];

  const robots: Robot[] = robotCoords.map((pos, idx) => ({
    id: `robot-${idx + 1}`,
    name: `AMR-0${idx + 1}`,
    color: getRobotColor(idx),
    position: { x: pos.x, y: pos.y },
    orientation: pos.dir,
    state: 'idle',
    priority: idx + 1,
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
  }));

  const initialTasks = [
    { pickup: { x: 0, y: 2 }, delivery: { x: 19, y: 10 }, name: 'Electronics C-1' },
    { pickup: { x: 0, y: 6 }, delivery: { x: 19, y: 2 }, name: 'Hardware D-4' },
    { pickup: { x: 0, y: 10 }, delivery: { x: 19, y: 6 }, name: 'Dry Goods E-7' },
    { pickup: { x: 0, y: 12 }, delivery: { x: 19, y: 12 }, name: 'Apparel F-9' },
  ];

  return {
    id: 'multi-robot-traffic',
    name: 'Multi-Robot Traffic',
    description: '4–6 robots sharing central cross-aisles and horizontal shelf racks.',
    grid,
    robots,
    initialTasks,
  };
}

/**
 * Preset C: Congested Warehouse (Narrow corridors, crossing traffic, competing destinations)
 */
export function createCongestedWarehouseScenario(): PresetScenario {
  const width = 20;
  const height = 14;
  const grid = createEmptyGrid(width, height);

  // Create dense warehouse layout with narrow 1-cell aisles in places
  addShelfBlock(grid, 2, 1, 3, 5);
  addShelfBlock(grid, 6, 1, 3, 5);
  addShelfBlock(grid, 11, 1, 3, 5);
  addShelfBlock(grid, 15, 1, 3, 5);

  addShelfBlock(grid, 2, 8, 3, 5);
  addShelfBlock(grid, 6, 8, 3, 5);
  addShelfBlock(grid, 11, 8, 3, 5);
  addShelfBlock(grid, 15, 8, 3, 5);

  // Pickups
  grid.pickups = [
    { x: 1, y: 3 },
    { x: 5, y: 3 },
    { x: 10, y: 3 },
    { x: 1, y: 10 },
    { x: 5, y: 10 },
  ];
  grid.pickups.forEach((p) => (grid.cells[p.y][p.x] = 'pickup'));

  // Deliveries
  grid.deliveries = [
    { x: 19, y: 3 },
    { x: 14, y: 3 },
    { x: 19, y: 10 },
    { x: 14, y: 10 },
  ];
  grid.deliveries.forEach((d) => (grid.cells[d.y][d.x] = 'delivery'));

  // Charging
  grid.chargingStations = [
    { x: 0, y: 0 },
    { x: 19, y: 0 },
  ];
  grid.chargingStations.forEach((c) => (grid.cells[c.y][c.x] = 'charging'));

  // 6 robots starting in conflicting aisles
  const robotCoords = [
    { x: 0, y: 6, dir: 'RIGHT' as const },
    { x: 19, y: 7, dir: 'LEFT' as const },
    { x: 5, y: 0, dir: 'DOWN' as const },
    { x: 10, y: 13, dir: 'UP' as const },
    { x: 14, y: 0, dir: 'DOWN' as const },
    { x: 10, y: 7, dir: 'RIGHT' as const },
  ];

  const robots: Robot[] = robotCoords.map((pos, idx) => ({
    id: `robot-${idx + 1}`,
    name: `Carrier-${idx + 1}`,
    color: getRobotColor(idx),
    position: { x: pos.x, y: pos.y },
    orientation: pos.dir,
    state: 'idle',
    priority: idx + 1,
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
  }));

  const initialTasks = [
    { pickup: { x: 1, y: 3 }, delivery: { x: 19, y: 10 }, name: 'Priority Part X-1' },
    { pickup: { x: 19, y: 3 }, delivery: { x: 1, y: 10 }, name: 'Reverse Heavy Cargo' },
    { pickup: { x: 5, y: 10 }, delivery: { x: 14, y: 3 }, name: 'Bottleneck Batch B' },
    { pickup: { x: 10, y: 3 }, delivery: { x: 19, y: 3 }, name: 'Cold Storage Tray' },
    { pickup: { x: 1, y: 10 }, delivery: { x: 14, y: 10 }, name: 'Express Parcel' },
  ];

  return {
    id: 'congested-warehouse',
    name: 'Congested Warehouse',
    description: '6 robots in narrow intersecting corridors testing conflict resolution and dynamic replanning.',
    grid,
    robots,
    initialTasks,
  };
}

/**
 * Procedural Randomized Warehouse Generator:
 * Generates valid shelf racks, guarantees grid connectivity via flood-fill,
 * places pickups along shelves, drop-offs along perimeter, and spawns robots safely.
 */
export function generateRandomWarehouseScenario(
  width = 20,
  height = 14,
  robotCount = 4
): PresetScenario {
  const grid = createEmptyGrid(width, height);

  // Generate 4 to 6 random shelf blocks
  const numBlocks = Math.floor(Math.random() * 3) + 4;
  for (let i = 0; i < numBlocks; i++) {
    const bWidth = Math.floor(Math.random() * 4) + 2;
    const bHeight = Math.floor(Math.random() * 3) + 2;
    // Leave at least 1 cell margin on boundaries
    const startX = Math.floor(Math.random() * (width - bWidth - 2)) + 1;
    const startY = Math.floor(Math.random() * (height - bHeight - 2)) + 1;

    addShelfBlock(grid, startX, startY, bWidth, bHeight);
  }

  // Find all walkable floor cells
  const walkable: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid.cells[y][x] === 'empty') {
        walkable.push({ x, y });
      }
    }
  }

  // Verify connectivity using BFS from walkable[0]
  const visited = new Set<string>();
  const queue: Position[] = [walkable[0]];
  visited.add(`${walkable[0].x},${walkable[0].y}`);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = [
      { x: curr.x + 1, y: curr.y },
      { x: curr.x - 1, y: curr.y },
      { x: curr.x, y: curr.y + 1 },
      { x: curr.x, y: curr.y - 1 },
    ];
    for (const n of neighbors) {
      if (
        n.x >= 0 &&
        n.x < width &&
        n.y >= 0 &&
        n.y < height &&
        grid.cells[n.y][n.x] === 'empty' &&
        !visited.has(`${n.x},${n.y}`)
      ) {
        visited.add(`${n.x},${n.y}`);
        queue.push(n);
      }
    }
  }

  // Remove disconnected pockets (convert disconnected cells to shelves or clear them)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid.cells[y][x] === 'empty' && !visited.has(`${x},${y}`)) {
        grid.cells[y][x] = 'shelf';
      }
    }
  }

  // Re-collect strictly connected walkable cells
  const connectedWalkable: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid.cells[y][x] === 'empty') {
        connectedWalkable.push({ x, y });
      }
    }
  }

  // Place Pickups on the left third
  const leftCells = connectedWalkable.filter((p) => p.x < Math.floor(width / 3));
  // Place Deliveries on the right third
  const rightCells = connectedWalkable.filter((p) => p.x > Math.floor((2 * width) / 3));

  const pickupCount = Math.min(3, leftCells.length);
  const deliveryCount = Math.min(3, rightCells.length);

  grid.pickups = leftCells.slice(0, pickupCount);
  grid.pickups.forEach((p) => (grid.cells[p.y][p.x] = 'pickup'));

  grid.deliveries = rightCells.slice(0, deliveryCount);
  grid.deliveries.forEach((d) => (grid.cells[d.y][d.x] = 'delivery'));

  // Station robots in remaining middle floor cells
  const middleCells = connectedWalkable.filter(
    (p) =>
      grid.cells[p.y][p.x] === 'empty' &&
      !grid.pickups.some((pk) => pk.x === p.x && pk.y === p.y) &&
      !grid.deliveries.some((dl) => dl.x === p.x && dl.y === p.y)
  );

  const numRobots = Math.min(robotCount, middleCells.length);
  const robots: Robot[] = [];

  for (let i = 0; i < numRobots; i++) {
    const pos = middleCells[i];
    robots.push({
      id: `robot-${i + 1}`,
      name: `Bot-${String(i + 1).padStart(2, '0')}`,
      color: getRobotColor(i),
      position: { x: pos.x, y: pos.y },
      orientation: 'RIGHT',
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

  const initialTasks = [];
  for (let i = 0; i < Math.min(grid.pickups.length, grid.deliveries.length); i++) {
    initialTasks.push({
      pickup: grid.pickups[i],
      delivery: grid.deliveries[i],
      name: `Auto Order #${i + 1}`,
    });
  }

  return {
    id: `random-${Date.now()}`,
    name: 'Randomized Warehouse',
    description: `Procedurally generated ${width}x${height} layout with ${robots.length} robots and verified path connectivity.`,
    grid,
    robots,
    initialTasks,
  };
}
