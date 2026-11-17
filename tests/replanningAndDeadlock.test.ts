import { describe, it, expect } from 'vitest';
import { handleDynamicObstacleEvent } from '../src/algorithms/replanning';
import { detectDeadlocks, attemptDeadlockRecovery } from '../src/algorithms/deadlockDetection';
import { ReservationTable } from '../src/algorithms/reservationTable';
import { createEmptyGrid } from '../src/simulation/ScenarioGenerator';
import { Robot, SimulationConfig } from '../src/types';

describe('Dynamic Obstacles, Replanning & Deadlock Recovery', () => {
  const dummyConfig: SimulationConfig = {
    algorithm: 'cooperative_astar',
    planningHorizon: 50,
    windowSize: 20,
    maxExpansions: 5000,
    priorityMode: 'manual',
    stepIntervalMs: 300,
    allowDiagonals: false,
    detectDeadlocks: true,
    autoReplanOnConflict: true,
  };

  it('should detect when dynamic obstacle intersects a planned trajectory and replan', () => {
    const grid = createEmptyGrid(10, 10);
    const table = new ReservationTable();

    const robot: Robot = {
      id: 'robot-1',
      name: 'AMR-1',
      color: '#06b6d4',
      position: { x: 1, y: 1 },
      orientation: 'RIGHT',
      state: 'moving_to_pickup',
      priority: 1,
      currentTask: {
        id: 't1',
        name: 'Task 1',
        packageId: 'PKG-1',
        pickupLocation: { x: 5, y: 1 },
        deliveryLocation: { x: 5, y: 5 },
        status: 'in_transit_pickup',
        createdAtTime: 0,
      },
      carryingPackage: false,
      // Original straight path: (1,1) -> (2,1) -> (3,1) -> (4,1) -> (5,1)
      path: [
        { x: 1, y: 1, t: 0, action: 'WAIT' },
        { x: 2, y: 1, t: 1, action: 'MOVE' },
        { x: 3, y: 1, t: 2, action: 'MOVE' },
        { x: 4, y: 1, t: 3, action: 'MOVE' },
        { x: 5, y: 1, t: 4, action: 'MOVE' },
      ],
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
    };

    table.reservePath(robot.id, robot.path, true, 50);

    // Place obstacle directly at (3, 1) where robot was scheduled to pass
    const logs: any[] = [];
    const replanOutcome = handleDynamicObstacleEvent(
      { id: 'obs-1', x: 3, y: 1, placedAtTick: 0 },
      true,
      [robot],
      grid,
      table,
      0,
      dummyConfig,
      [{ id: 'obs-1', x: 3, y: 1, placedAtTick: 0 }],
      (l) => logs.push(l)
    );

    expect(replanOutcome.affectedRobotIds).toContain('robot-1');
    expect(replanOutcome.successfulReplanIds).toContain('robot-1');
    expect(robot.metrics.replanCount).toBe(1);

    // Verify new path avoids (3, 1)
    for (const step of robot.path) {
      expect(step.x === 3 && step.y === 1).toBe(false);
    }
    // Verify destination reached
    const last = robot.path[robot.path.length - 1];
    expect(last.x).toBe(5);
    expect(last.y).toBe(1);
  });

  it('should detect cyclic waiting dependency and trigger deadlock recovery', () => {
    const grid = createEmptyGrid(6, 6);
    const table = new ReservationTable();

    // Two robots waiting for each other's cell
    const robotA: Robot = {
      id: 'robot-A',
      name: 'AMR-A',
      color: '#06b6d4',
      position: { x: 2, y: 2 },
      orientation: 'RIGHT',
      state: 'waiting',
      priority: 1,
      currentTask: {
        id: 'tA',
        name: 'Task A',
        packageId: 'PKG-A',
        pickupLocation: { x: 3, y: 2 },
        deliveryLocation: { x: 4, y: 2 },
        status: 'in_transit_pickup',
        createdAtTime: 0,
      },
      carryingPackage: false,
      path: [
        { x: 2, y: 2, t: 0, action: 'WAIT' },
        { x: 3, y: 2, t: 1, action: 'MOVE' },
      ],
      currentPathIndex: 0,
      metrics: { totalDistance: 0, waitSteps: 5, tasksCompleted: 0, replanCount: 0, timeSpentMoving: 0, timeSpentWaiting: 0 },
      waitingTicks: 4, // Stalled for 4 ticks
      isBlocked: true,
    };

    const robotB: Robot = {
      id: 'robot-B',
      name: 'AMR-B',
      color: '#f59e0b',
      position: { x: 3, y: 2 },
      orientation: 'LEFT',
      state: 'waiting',
      priority: 2,
      currentTask: {
        id: 'tB',
        name: 'Task B',
        packageId: 'PKG-B',
        pickupLocation: { x: 2, y: 2 },
        deliveryLocation: { x: 1, y: 2 },
        status: 'in_transit_pickup',
        createdAtTime: 0,
      },
      carryingPackage: false,
      path: [
        { x: 3, y: 2, t: 0, action: 'WAIT' },
        { x: 2, y: 2, t: 1, action: 'MOVE' },
      ],
      currentPathIndex: 0,
      metrics: { totalDistance: 0, waitSteps: 5, tasksCompleted: 0, replanCount: 0, timeSpentMoving: 0, timeSpentWaiting: 0 },
      waitingTicks: 4, // Stalled for 4 ticks
      isBlocked: true,
    };

    const deadlocks = detectDeadlocks([robotA, robotB], grid, table, 10);
    expect(deadlocks.length).toBeGreaterThan(0);
    expect(deadlocks[0].type).toBe('cyclic_dependency');

    // Attempt recovery
    const logs: any[] = [];
    const recovered = attemptDeadlockRecovery(
      deadlocks[0],
      [robotA, robotB],
      grid,
      table,
      10,
      (l) => logs.push(l)
    );

    expect(recovered).toBe(true);
    // Inverted priority
    expect(robotA.priority).toBe(2);
    expect(robotB.priority).toBe(1);
    expect(robotA.waitingTicks).toBe(0);
    expect(robotB.waitingTicks).toBe(0);
  });
});
