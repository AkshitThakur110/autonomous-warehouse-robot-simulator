import { describe, it, expect } from 'vitest';
import { findPathAStar, isWalkable } from '../src/algorithms/astar';
import { manhattanDistance, euclideanDistance } from '../src/algorithms/heuristic';
import { createEmptyGrid } from '../src/simulation/ScenarioGenerator';

describe('A* Single-Agent Path Planning & Heuristics', () => {
  it('should correctly compute Manhattan distance', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 5, y: 7 })).toBe(12);
    expect(manhattanDistance({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
    expect(manhattanDistance({ x: 10, y: 2 }, { x: 4, y: 8 })).toBe(12);
  });

  it('should find optimal shortest path on an open grid', () => {
    const grid = createEmptyGrid(10, 10);
    const start = { x: 1, y: 1 };
    const goal = { x: 4, y: 5 };

    const result = findPathAStar(grid, start, goal);
    expect(result.success).toBe(true);
    // Manhattan distance is |4-1| + |5-1| = 3 + 4 = 7 steps (+1 start step = 8 points)
    expect(result.path.length).toBe(8);
    expect(result.path[0]).toMatchObject({ x: 1, y: 1 });
    expect(result.path[result.path.length - 1]).toMatchObject({ x: 4, y: 5 });
  });

  it('should handle start equals goal trivially', () => {
    const grid = createEmptyGrid(10, 10);
    const pos = { x: 3, y: 3 };
    const result = findPathAStar(grid, pos, pos);

    expect(result.success).toBe(true);
    expect(result.path.length).toBe(1);
    expect(result.path[0]).toMatchObject({ x: 3, y: 3 });
  });

  it('should navigate around a solid shelf wall', () => {
    const grid = createEmptyGrid(10, 10);
    // Wall across x=5 from y=0 to y=7 (leaves y=8,9 open)
    for (let y = 0; y <= 7; y++) {
      grid.cells[y][5] = 'shelf';
    }

    const start = { x: 2, y: 3 };
    const goal = { x: 7, y: 3 };

    const result = findPathAStar(grid, start, goal);
    expect(result.success).toBe(true);
    // Verify none of the path points lie on the wall
    for (const step of result.path) {
      expect(grid.cells[step.y][step.x]).not.toBe('shelf');
    }
    expect(result.path[result.path.length - 1]).toMatchObject(goal);
  });

  it('should detect when destination is unreachable', () => {
    const grid = createEmptyGrid(10, 10);
    // Enclose goal at (8, 8) in a complete box of shelves
    const goal = { x: 8, y: 8 };
    grid.cells[7][7] = 'shelf';
    grid.cells[7][8] = 'shelf';
    grid.cells[7][9] = 'shelf';
    grid.cells[8][7] = 'shelf';
    grid.cells[8][9] = 'shelf';
    grid.cells[9][7] = 'shelf';
    grid.cells[9][8] = 'shelf';
    grid.cells[9][9] = 'shelf';

    const start = { x: 1, y: 1 };
    const result = findPathAStar(grid, start, goal);

    expect(result.success).toBe(false);
    expect(result.path.length).toBe(0);
    expect(result.failureReason).toBeDefined();
  });

  it('should reject invalid coordinates or blocked start', () => {
    const grid = createEmptyGrid(10, 10);
    grid.cells[0][0] = 'shelf';

    const result = findPathAStar(grid, { x: 0, y: 0 }, { x: 5, y: 5 });
    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('blocked');
  });
});
