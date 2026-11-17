import { Robot, GridMap, Position, LogEvent } from '../types';
import { ReservationTable } from './reservationTable';
import { isWalkable } from './astar';

export interface DeadlockIncident {
  id: string;
  robotIds: string[];
  type: 'cyclic_dependency' | 'head_on_corridor' | 'prolonged_wait' | 'starvation';
  description: string;
  detectedAtTick: number;
  recovered: boolean;
  recoveryActionTaken?: string;
}

const WAITING_THRESHOLD_TICKS = 3; // consecutive wait steps before flagging congestion/deadlock

/**
 * Monitors the current simulation state for potential or active deadlocks.
 */
export function detectDeadlocks(
  robots: Robot[],
  grid: GridMap,
  _reservationTable: ReservationTable,
  currentTick: number
): DeadlockIncident[] {
  const incidents: DeadlockIncident[] = [];

  // 1. Identify robots that have been waiting repeatedly
  const stalledRobots = robots.filter(
    (r) => r.state === 'waiting' && r.waitingTicks >= WAITING_THRESHOLD_TICKS && r.currentTask !== null
  );

  if (stalledRobots.length === 0) {
    return incidents;
  }

  // Map each stalled robot to the robot occupying its desired next position
  // If robot has a planned next step at path[currentPathIndex + 1], check who is there right now
  const waitingFor = new Map<string, string>();

  for (const robot of stalledRobots) {
    const nextStep = robot.path[robot.currentPathIndex + 1];
    if (nextStep) {
      // Check which robot is currently at nextStep.(x, y)
      const occupyingRobot = robots.find(
        (other) =>
          other.id !== robot.id &&
          other.position.x === nextStep.x &&
          other.position.y === nextStep.y
      );
      if (occupyingRobot) {
        waitingFor.set(robot.id, occupyingRobot.id);
      }
    }
  }

  // 2. Check for Cyclic Waiting Dependencies: A -> B and B -> A (or longer cycles)
  const visited = new Set<string>();
  for (const [rA, rB] of Array.from(waitingFor.entries())) {
    if (waitingFor.get(rB) === rA && !visited.has(rA) && !visited.has(rB)) {
      visited.add(rA);
      visited.add(rB);

      const robotA = robots.find((r) => r.id === rA);
      const robotB = robots.find((r) => r.id === rB);

      incidents.push({
        id: `deadlock-${currentTick}-${rA}-${rB}`,
        robotIds: [rA, rB],
        type: 'cyclic_dependency',
        description: `Cyclic wait detected between Robot ${robotA?.name || rA} and ${robotB?.name || rB} at tick ${currentTick}`,
        detectedAtTick: currentTick,
        recovered: false,
      });
    }
  }

  // 3. Check for Head-on Corridor confrontations: two robots facing each other with distance 1
  for (let i = 0; i < stalledRobots.length; i++) {
    for (let j = i + 1; j < stalledRobots.length; j++) {
      const r1 = stalledRobots[i];
      const r2 = stalledRobots[j];
      const dist = Math.abs(r1.position.x - r2.position.x) + Math.abs(r1.position.y - r2.position.y);
      if (dist === 1) {
        // Are they in a narrow aisle? (Check if left/right or up/down are walls)
        const isCorridor = checkIsCorridor(grid, r1.position);
        if (isCorridor && !visited.has(r1.id) && !visited.has(r2.id)) {
          visited.add(r1.id);
          visited.add(r2.id);
          incidents.push({
            id: `corridor-${currentTick}-${r1.id}-${r2.id}`,
            robotIds: [r1.id, r2.id],
            type: 'head_on_corridor',
            description: `Head-on corridor deadlock between ${r1.name} and ${r2.name}`,
            detectedAtTick: currentTick,
            recovered: false,
          });
        }
      }
    }
  }

  // 4. Prolonged waiting / starvation without cycle
  for (const robot of stalledRobots) {
    if (!visited.has(robot.id) && robot.waitingTicks >= 6) {
      incidents.push({
        id: `starve-${currentTick}-${robot.id}`,
        robotIds: [robot.id],
        type: 'starvation',
        description: `Robot ${robot.name} has been stalled for ${robot.waitingTicks} consecutive ticks`,
        detectedAtTick: currentTick,
        recovered: false,
      });
    }
  }

  return incidents;
}

function checkIsCorridor(grid: GridMap, pos: Position): boolean {
  // A corridor cell has opposing walls either horizontal (left & right shelves) or vertical (up & down shelves)
  const leftBlocked = !isWalkable(grid, pos.x - 1, pos.y);
  const rightBlocked = !isWalkable(grid, pos.x + 1, pos.y);
  const upBlocked = !isWalkable(grid, pos.x, pos.y - 1);
  const downBlocked = !isWalkable(grid, pos.x, pos.y + 1);

  return (leftBlocked && rightBlocked) || (upBlocked && downBlocked);
}

/**
 * Attempts bounded recovery for detected deadlocks.
 * Options:
 * 1. Priority Inversion / Adjustment: Swaps priority of involved robots and forces sequential replanning.
 * 2. Sidestepping / Yielding: Find an adjacent vacant walkable cell for one robot to pull into.
 */
export function attemptDeadlockRecovery(
  incident: DeadlockIncident,
  robots: Robot[],
  _grid: GridMap,
  reservationTable: ReservationTable,
  currentTick: number,
  logEvent: (event: Omit<LogEvent, 'id' | 'timestamp'>) => void
): boolean {
  if (incident.robotIds.length < 2) {
    // Single robot starvation: bump its priority to 1 so others yield to it during next replan
    const r = robots.find((bot) => bot.id === incident.robotIds[0]);
    if (r) {
      r.priority = 1;
      r.waitingTicks = 0;
      incident.recovered = true;
      incident.recoveryActionTaken = `Elevated ${r.name} priority to 1 for immediate clearance`;
      logEvent({
        tick: currentTick,
        level: 'warn',
        category: 'DEADLOCK',
        message: incident.recoveryActionTaken,
        robotId: r.id,
      });
      return true;
    }
    return false;
  }

  const [idA, idB] = incident.robotIds;
  const robotA = robots.find((r) => r.id === idA);
  const robotB = robots.find((r) => r.id === idB);

  if (!robotA || !robotB) return false;

  // 1. Swap priorities between robotA and robotB
  const tempP = robotA.priority;
  robotA.priority = robotB.priority;
  robotB.priority = tempP;

  // If they had the same priority, differentiate them
  if (robotA.priority === robotB.priority) {
    robotA.priority = 1;
    robotB.priority = 2;
  }

  // Reset waiting counters
  robotA.waitingTicks = 0;
  robotB.waitingTicks = 0;

  // Clear reservations from currentTick onwards so they can replan with new priority
  reservationTable.releaseRobotFromTime(robotA.id, currentTick);
  reservationTable.releaseRobotFromTime(robotB.id, currentTick);

  incident.recovered = true;
  incident.recoveryActionTaken = `Inverted priority: ${robotA.name} (P:${robotA.priority}) and ${robotB.name} (P:${robotB.priority}) and cleared reservation conflict`;

  logEvent({
    tick: currentTick,
    level: 'warn',
    category: 'DEADLOCK',
    message: incident.recoveryActionTaken,
    robotId: robotA.id,
  });

  return true;
}
