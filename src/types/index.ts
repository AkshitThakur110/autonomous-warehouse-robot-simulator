export interface Position {
  x: number;
  y: number;
}

export type CellType = 'empty' | 'shelf' | 'pickup' | 'delivery' | 'charging' | 'obstacle';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'WAIT';

export type RobotState =
  | 'idle'
  | 'moving_to_pickup'
  | 'picking_up'
  | 'carrying_to_delivery'
  | 'delivering'
  | 'waiting'
  | 'blocked'
  | 'charging';

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_transit_pickup'
  | 'picked_up'
  | 'in_transit_delivery'
  | 'delivered'
  | 'failed';

export interface RobotTask {
  id: string;
  name: string;
  packageId: string;
  pickupLocation: Position;
  deliveryLocation: Position;
  status: TaskStatus;
  assignedRobotId?: string;
  createdAtTime: number;
  pickupTime?: number;
  deliveredTime?: number;
}

export interface PathStep {
  x: number;
  y: number;
  t: number;
  action: 'MOVE' | 'WAIT';
  direction?: Direction;
}

export interface RobotMetrics {
  totalDistance: number;
  waitSteps: number;
  tasksCompleted: number;
  replanCount: number;
  timeSpentMoving: number;
  timeSpentWaiting: number;
}

export interface Robot {
  id: string;
  name: string;
  color: string;
  position: Position;
  previousPosition?: Position;
  orientation: Direction;
  state: RobotState;
  priority: number; // 1 is highest priority
  currentTask: RobotTask | null;
  carryingPackage: boolean;
  path: PathStep[];
  currentPathIndex: number;
  metrics: RobotMetrics;
  waitingTicks: number; // consecutive waiting ticks (for deadlock monitoring)
  isBlocked: boolean;
}

export interface DynamicObstacle {
  id: string;
  x: number;
  y: number;
  placedAtTick: number;
  duration?: number; // ticks before auto-removal, or undefined for permanent
  color?: string;
}

export interface GridMap {
  width: number;
  height: number;
  // 2D grid: grid[y][x]
  cells: CellType[][];
  pickups: Position[];
  deliveries: Position[];
  chargingStations: Position[];
}

export type AlgorithmType =
  | 'astar'
  | 'cooperative_astar'
  | 'windowed_coop_astar';

export type PriorityMode =
  | 'manual'
  | 'fifo_task'
  | 'shortest_distance'
  | 'dynamic_priority';

export interface SimulationConfig {
  algorithm: AlgorithmType;
  planningHorizon: number; // max future timesteps
  windowSize: number; // for windowed cooperative A*
  maxExpansions: number;
  priorityMode: PriorityMode;
  stepIntervalMs: number;
  allowDiagonals: boolean;
  detectDeadlocks: boolean;
  autoReplanOnConflict: boolean;
}

export interface SimulationDisplayOptions {
  showPlannedPaths: boolean;
  showReservations: boolean;
  showExploredNodes: boolean;
  showRobotLabels: boolean;
  showGridCoordinates: boolean;
  showHeatmap: boolean;
  selectedRobotId: string | null;
}

export interface SimulationKPIs {
  activeRobots: number;
  completedDeliveries: number;
  pendingTasks: number;
  totalDistanceTraveled: number;
  averagePathLength: number;
  totalNodesExpanded: number;
  averagePlanningTimeMs: number;
  maxPlanningTimeMs: number;
  replanningCount: number;
  collisionConflictsDetected: number;
  successfulPlans: number;
  failedPlans: number;
  totalWaitSteps: number;
  idleTimeRatio: number;
  throughput: number; // deliveries per 100 simulation ticks
  makespan: number; // ticks to complete current batch
  deadlocksDetected: number;
  deadlocksRecovered: number;
}

export interface LogEvent {
  id: string;
  timestamp: number;
  tick: number;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'PLAN' | 'REPLAN' | 'TASK' | 'OBSTACLE' | 'DEADLOCK' | 'SIM';
  message: string;
  robotId?: string;
  position?: Position;
}

export interface ExploredNodeInfo {
  x: number;
  y: number;
  t?: number;
  g: number;
  h: number;
  f: number;
  robotId?: string;
}

export interface PlanResult {
  path: PathStep[];
  success: boolean;
  expandedCount: number;
  computationTimeMs: number;
  visitedNodes?: ExploredNodeInfo[];
  frontierNodes?: ExploredNodeInfo[];
  failureReason?: string;
}

export interface BenchmarkTrial {
  robotCount: number;
  scenarioName: string;
  algorithm: AlgorithmType;
  trialNumber: number;
  success: boolean;
  planningTimeMs: number;
  nodesExpanded: number;
  pathLength: number;
  waitSteps: number;
  completedTasks: number;
  replanningCount: number;
  deadlocks: number;
}

export interface BenchmarkAggregate {
  robotCount: number;
  algorithm: AlgorithmType;
  runs: number;
  successRate: number;
  avgPlanningTimeMs: number;
  maxPlanningTimeMs: number;
  minPlanningTimeMs: number;
  avgNodesExpanded: number;
  avgPathLength: number;
  avgWaitSteps: number;
  avgThroughput: number;
}
