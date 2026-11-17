import { PathStep } from '../types';

/**
 * ReservationTable tracks space-time allocations for multi-agent path planning.
 * Prevents:
 * 1. Vertex Conflicts: Robot A at (x, y, t) and Robot B at (x, y, t).
 * 2. Edge Conflicts (head-on collision / swap): Robot A moves (u -> v, t -> t+1) while Robot B moves (v -> u, t -> t+1).
 * 3. Goal Occupancy: Robot finishing at (x_g, y_g) remains at (x_g, y_g) for all t >= t_arrival.
 */
export class ReservationTable {
  // Key: `${x},${y},${t}` => robotId
  private vertexReservations = new Map<string, string>();

  // Key: `${fromX},${fromY}->${toX},${toY},${t}` => robotId (reservation of directed edge during transition t -> t+1)
  private edgeReservations = new Map<string, string>();

  // Permanent or indefinite goal reservations: Key: `${x},${y}` => { robotId, sinceTime }
  private goalReservations = new Map<string, { robotId: string; sinceTime: number }>();

  // Tracks each robot's reserved steps for fast lookup and selective rollback
  private robotReservations = new Map<string, PathStep[]>();

  constructor() {}

  /**
   * Resets all reservations.
   */
  public clear(): void {
    this.vertexReservations.clear();
    this.edgeReservations.clear();
    this.goalReservations.clear();
    this.robotReservations.clear();
  }

  /**
   * Check if a vertex (x, y) at time t is available for a given robot.
   */
  public isVertexAvailable(x: number, y: number, t: number, robotId?: string): boolean {
    const key = `${x},${y},${t}`;
    const reservedBy = this.vertexReservations.get(key);
    if (reservedBy !== undefined && reservedBy !== robotId) {
      return false;
    }

    // Check goal occupancy: is another robot parked here permanently?
    const goalKey = `${x},${y}`;
    const goalInfo = this.goalReservations.get(goalKey);
    if (goalInfo && goalInfo.robotId !== robotId && t >= goalInfo.sinceTime) {
      return false;
    }

    return true;
  }

  /**
   * Checks whether moving from (fromX, fromY) at t to (toX, toY) at t+1 is conflict-free.
   * Checks both vertex collision at (toX, toY, t+1) AND edge-swap collision against opposite transition (to -> from).
   */
  public isTransitionAvailable(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    t: number,
    robotId?: string
  ): boolean {
    // 1. Target vertex at t+1 must be free
    if (!this.isVertexAvailable(toX, toY, t + 1, robotId)) {
      return false;
    }

    // 2. Edge-swap check: If another robot is moving from (toX, toY) to (fromX, fromY) at time t -> t+1
    const oppositeEdgeKey = `${toX},${toY}->${fromX},${fromY},${t}`;
    const swapRobot = this.edgeReservations.get(oppositeEdgeKey);
    if (swapRobot !== undefined && swapRobot !== robotId) {
      return false;
    }

    return true;
  }

  /**
   * Reserves a sequence of path steps for a robot.
   * If reserveIndefinitelyAtGoal is true, marks the final destination reserved for all t >= path.end.t
   */
  public reservePath(
    robotId: string,
    path: PathStep[],
    reserveIndefinitelyAtGoal: boolean = true,
    horizon: number = 100
  ): void {
    if (!path || path.length === 0) return;

    // First remove any existing reservations for this robot
    this.releaseRobot(robotId);

    const stepsToStore: PathStep[] = [];

    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      const vKey = `${step.x},${step.y},${step.t}`;
      this.vertexReservations.set(vKey, robotId);
      stepsToStore.push({ ...step });

      // Edge reservation
      if (i > 0) {
        const prev = path[i - 1];
        const eKey = `${prev.x},${prev.y}->${step.x},${step.y},${prev.t}`;
        this.edgeReservations.set(eKey, robotId);
      }
    }

    // If robot rests at goal after completing trajectory, reserve up to horizon
    if (reserveIndefinitelyAtGoal && path.length > 0) {
      const lastStep = path[path.length - 1];
      this.goalReservations.set(`${lastStep.x},${lastStep.y}`, {
        robotId,
        sinceTime: lastStep.t,
      });

      // Also explicitly mark discrete timesteps up to horizon
      for (let t = lastStep.t + 1; t <= Math.max(lastStep.t + 20, horizon); t++) {
        this.vertexReservations.set(`${lastStep.x},${lastStep.y},${t}`, robotId);
      }
    }

    this.robotReservations.set(robotId, stepsToStore);
  }

  /**
   * Releases all reservations held by a robot.
   */
  public releaseRobot(robotId: string): void {
    const existing = this.robotReservations.get(robotId);
    if (existing) {
      for (let i = 0; i < existing.length; i++) {
        const step = existing[i];
        this.vertexReservations.delete(`${step.x},${step.y},${step.t}`);
        if (i > 0) {
          const prev = existing[i - 1];
          this.edgeReservations.delete(`${prev.x},${prev.y}->${step.x},${step.y},${prev.t}`);
        }
      }
    }

    // Clean up goal reservation if this robot owns it
    for (const [key, info] of Array.from(this.goalReservations.entries())) {
      if (info.robotId === robotId) {
        this.goalReservations.delete(key);
        // Also remove lingering forward horizon reservations for this goal
        const [gx, gy] = key.split(',').map(Number);
        for (let t = info.sinceTime; t <= info.sinceTime + 150; t++) {
          if (this.vertexReservations.get(`${gx},${gy},${t}`) === robotId) {
            this.vertexReservations.delete(`${gx},${gy},${t}`);
          }
        }
      }
    }

    this.robotReservations.delete(robotId);
  }

  /**
   * Releases future reservations for a robot starting from a specified time `fromTime`.
   * Preserves reservations prior to `fromTime` (used during real-time replanning while robot is in motion!).
   */
  public releaseRobotFromTime(robotId: string, fromTime: number): void {
    const existing = this.robotReservations.get(robotId);
    if (!existing) return;

    const keptSteps: PathStep[] = [];

    for (let i = 0; i < existing.length; i++) {
      const step = existing[i];
      if (step.t >= fromTime) {
        this.vertexReservations.delete(`${step.x},${step.y},${step.t}`);
        if (i > 0) {
          const prev = existing[i - 1];
          this.edgeReservations.delete(`${prev.x},${prev.y}->${step.x},${step.y},${prev.t}`);
        }
      } else {
        keptSteps.push(step);
      }
    }

    // Clean up goal reservation
    for (const [key, info] of Array.from(this.goalReservations.entries())) {
      if (info.robotId === robotId && info.sinceTime >= fromTime) {
        this.goalReservations.delete(key);
        const [gx, gy] = key.split(',').map(Number);
        for (let t = info.sinceTime; t <= info.sinceTime + 150; t++) {
          if (this.vertexReservations.get(`${gx},${gy},${t}`) === robotId) {
            this.vertexReservations.delete(`${gx},${gy},${t}`);
          }
        }
      }
    }

    this.robotReservations.set(robotId, keptSteps);
  }

  /**
   * Returns who owns a vertex at (x, y, t).
   */
  public getVertexOwner(x: number, y: number, t: number): string | undefined {
    const key = `${x},${y},${t}`;
    const directOwner = this.vertexReservations.get(key);
    if (directOwner) return directOwner;

    const goalInfo = this.goalReservations.get(`${x},${y}`);
    if (goalInfo && t >= goalInfo.sinceTime) {
      return goalInfo.robotId;
    }
    return undefined;
  }

  /**
   * Returns a list of all active reservations at a specific time t for UI visualization.
   */
  public getReservationsAtTime(t: number): Array<{ x: number; y: number; robotId: string }> {
    const list: Array<{ x: number; y: number; robotId: string }> = [];

    // Check vertex reservations
    for (const [key, robotId] of this.vertexReservations.entries()) {
      const parts = key.split(',');
      if (Number(parts[2]) === t) {
        list.push({ x: Number(parts[0]), y: Number(parts[1]), robotId });
      }
    }

    // Check goal reservations
    for (const [key, info] of this.goalReservations.entries()) {
      if (t >= info.sinceTime) {
        const parts = key.split(',');
        const x = Number(parts[0]);
        const y = Number(parts[1]);
        if (!list.some((item) => item.x === x && item.y === y)) {
          list.push({ x, y, robotId: info.robotId });
        }
      }
    }

    return list;
  }

  /**
   * Returns the count of active reservations across time.
   */
  public get count(): number {
    return this.vertexReservations.size + this.edgeReservations.size;
  }
}
