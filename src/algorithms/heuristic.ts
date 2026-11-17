import { Position } from '../types';

/**
 * Calculates Manhattan distance between two grid points.
 * For 4-directional grid movement with uniform unit cost,
 * Manhattan distance is strictly admissible (never overestimates)
 * and monotonic / consistent (satisfies triangle inequality: h(u) <= c(u, v) + h(v)).
 */
export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Euclidean distance for visual distance or alternate checks.
 */
export function euclideanDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Chebyshev distance (for 8-directional movement with unit diagonal cost).
 */
export function chebyshevDistance(a: Position, b: Position): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Octile distance (for 8-directional movement with sqrt(2) diagonal cost).
 */
export function octileDistance(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const F = Math.SQRT2 - 1;
  return dx < dy ? F * dx + dy : F * dy + dx;
}
