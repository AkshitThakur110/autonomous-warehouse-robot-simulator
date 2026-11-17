export const ROBOT_PALETTE = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#10b981', // Emerald / Green
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

export function getRobotColor(index: number): string {
  return ROBOT_PALETTE[index % ROBOT_PALETTE.length];
}
