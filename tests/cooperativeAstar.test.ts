import { describe, it, expect } from 'vitest';
import { findSpaceTimePath, planMultiRobotCooperative } from '../src/algorithms/cooperativeAstar';
import { ReservationTable } from '../src/algorithms/reservationTable';
import { createEmptyGrid } from '../src/simulation/ScenarioGenerator';
import { Robot } from '../src/types';

describe('Space-Time Cooperative A* Multi-Agent Coordination', () => {
  it('should find a collision-free space-time trajectory with wait action', () => {
    const grid = createEmptyGrid(8, 8);
    const table = new ReservationTable();

    // Robot 1 is occupying (3, 3) at t=1, 2, 3
    table.reservePath(
      'robot-1',
      [
        { x: 3, y: 3, t: 1, action: 'WAIT' },
        { x: 3, y: 3, t: 2, action: 'WAIT' },
        { x: 3, y: 3, t: 3, action: 'WAIT' },
      ],
      false
    );

    // Robot 2 wants to move from (2, 3) to (4, 3) through (3, 3)
    const plan = findSpaceTimePath(
      grid,
      { x: 2, y: 3 },
      { x: 4, y: 3 },
      table,
      'robot-2',
      { startTime: 0, horizon: 20 }
    );

    expect(plan.success).toBe(true);
    expect(plan.path.length).toBeGreaterThan(0);

    // Verify Robot 2 never enters (3, 3) at t=1, 2, or 3
    for (const step of plan.path) {
      if (step.t >= 1 && step.t <= 3) {
        expect(step.x === 3 && step.y === 3).toBe(false);
      }
    }
    // Verify destination reached
    const finalStep = plan.path[plan.path.length - 1];
    expect(finalStep.x).toBe(4);
    expect(finalStep.y).toBe(3);
  });

  it('should coordinate multiple robots in a narrow corridor without collisions', () => {
    const grid = createEmptyGrid(10, 5);
    // Narrow corridor: shelves on top and bottom rows
    for (let x = 0; x < 10; x++) {
      grid.cells[0][x] = 'shelf';
      grid.cells[4][x] = 'shelf';
    }

    const table = new ReservationTable();

    // Two robots with opposing paths
    const robots: Robot[] = [
      {
        id: 'robot-1',
        name: 'AMR-1',
        color: '#06b6d4',
        position: { x: 1, y: 2 },
        orientation: 'RIGHT',
        state: 'idle',
        priority: 1, // Higher priority
        currentTask: {
          id: 't1',
          name: 'Task 1',
          packageId: 'PKG-1',
          pickupLocation: { x: 8, y: 2 },
          deliveryLocation: { x: 8, y: 2 },
          status: 'assigned',
          createdAtTime: 0,
        },
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
        name: 'AMR-2',
        color: '#f59e0b',
        position: { x: 8, y: 2 },
        orientation: 'LEFT',
        state: 'idle',
        priority: 2, // Lower priority
        currentTask: {
          id: 't2',
          name: 'Task 2',
          packageId: 'PKG-2',
          pickupLocation: { x: 1, y: 2 },
          deliveryLocation: { x: 1, y: 2 },
          status: 'assigned',
          createdAtTime: 0,
        },
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

    const outcome = planMultiRobotCooperative(grid, robots, table, {
      startTime: 0,
      horizon: 40,
    });

    expect(outcome.success).toBe(true);
    const path1 = outcome.results.get('robot-1')!.path;
    const path2 = outcome.results.get('robot-2')!.path;

    // Invariant Check 1: No two robots occupy the same (x, y) at the same timestep t
    const maxT = Math.max(
      path1[path1.length - 1].t,
      path2[path2.length - 1].t
    );

    for (let t = 0; t <= maxT; t++) {
      const step1 = path1.find((s) => s.t === t) || path1[path1.length - 1];
      const step2 = path2.find((s) => s.t === t) || path2[path2.length - 1];

      // Vertex conflict check
      expect(step1.x === step2.x && step1.y === step2.y).toBe(false);

      // Edge-swap check
      const nextStep1 = path1.find((s) => s.t === t + 1);
      const nextStep2 = path2.find((s) => s.t === t + 1);
      if (nextStep1 && nextStep2) {
        const isSwap =
          step1.x === nextStep2.x &&
          step1.y === nextStep2.y &&
          step2.x === nextStep1.x &&
          step2.y === nextStep1.y;
        expect(isSwap).toBe(false);
      }
    }
  });
});
