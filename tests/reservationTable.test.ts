import { describe, it, expect } from 'vitest';
import { ReservationTable } from '../src/algorithms/reservationTable';
import { PathStep } from '../src/types';

describe('ReservationTable Space-Time Conflict Prevention', () => {
  it('should prevent vertex conflicts at same time t', () => {
    const table = new ReservationTable();

    // Robot A reserves (3, 4) at t=5
    const pathA: PathStep[] = [
      { x: 3, y: 3, t: 4, action: 'MOVE' },
      { x: 3, y: 4, t: 5, action: 'MOVE' },
    ];
    table.reservePath('robot-A', pathA, false);

    // Robot A itself can access (3, 4) at t=5
    expect(table.isVertexAvailable(3, 4, 5, 'robot-A')).toBe(true);

    // Another robot cannot occupy (3, 4) at t=5
    expect(table.isVertexAvailable(3, 4, 5, 'robot-B')).toBe(false);

    // Different cell at t=5 is free
    expect(table.isVertexAvailable(3, 5, 5, 'robot-B')).toBe(true);

    // Same cell at different time t=6 is free
    expect(table.isVertexAvailable(3, 4, 6, 'robot-B')).toBe(true);
  });

  it('should detect and prevent edge-swap conflicts', () => {
    const table = new ReservationTable();

    // Robot A moves from (2, 2) at t=1 to (3, 2) at t=2
    const pathA: PathStep[] = [
      { x: 2, y: 2, t: 1, action: 'MOVE' },
      { x: 3, y: 2, t: 2, action: 'MOVE' },
    ];
    table.reservePath('robot-A', pathA, false);

    // Robot B attempts to move in opposite direction: (3, 2) at t=1 to (2, 2) at t=2
    // Both vertices (3,2, t=1) and (2,2, t=2) are free, BUT the edge swap must be detected and rejected!
    const isTransitionAllowed = table.isTransitionAvailable(3, 2, 2, 2, 1, 'robot-B');
    expect(isTransitionAllowed).toBe(false);

    // Parallel move in same direction is allowed
    const isParallelAllowed = table.isTransitionAvailable(2, 3, 3, 3, 1, 'robot-B');
    expect(isParallelAllowed).toBe(true);
  });

  it('should enforce goal occupancy for t >= arrivalTime', () => {
    const table = new ReservationTable();

    // Robot A arrives at goal (5, 5) at t=4 and parks there indefinitely
    const pathA: PathStep[] = [
      { x: 4, y: 5, t: 3, action: 'MOVE' },
      { x: 5, y: 5, t: 4, action: 'MOVE' },
    ];
    table.reservePath('robot-A', pathA, true, 20);

    // Goal cell should be blocked for Robot B at t=4, 5, 10
    expect(table.isVertexAvailable(5, 5, 4, 'robot-B')).toBe(false);
    expect(table.isVertexAvailable(5, 5, 5, 'robot-B')).toBe(false);
    expect(table.isVertexAvailable(5, 5, 10, 'robot-B')).toBe(false);

    // But before arrival (e.g. t=2), (5, 5) was still free
    expect(table.isVertexAvailable(5, 5, 2, 'robot-B')).toBe(true);
  });

  it('should release future reservations cleanly starting from t_from', () => {
    const table = new ReservationTable();

    const pathA: PathStep[] = [
      { x: 1, y: 1, t: 0, action: 'WAIT' },
      { x: 2, y: 1, t: 1, action: 'MOVE' },
      { x: 3, y: 1, t: 2, action: 'MOVE' },
      { x: 4, y: 1, t: 3, action: 'MOVE' },
    ];
    table.reservePath('robot-A', pathA, false);

    // Release from t=2 onwards (e.g. when obstacle appeared at t=2)
    table.releaseRobotFromTime('robot-A', 2);

    // Past reservations preserved
    expect(table.getVertexOwner(2, 1, 1)).toBe('robot-A');

    // Future reservations cleared
    expect(table.getVertexOwner(3, 1, 2)).toBeUndefined();
    expect(table.getVertexOwner(4, 1, 3)).toBeUndefined();
  });
});
