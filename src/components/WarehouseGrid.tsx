import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GridMap,
  Robot,
  DynamicObstacle,
  SimulationDisplayOptions,
  Position,
  ExploredNodeInfo,
} from '../types';
import { ReservationTable } from '../algorithms/reservationTable';

interface WarehouseGridProps {
  grid: GridMap;
  robots: Robot[];
  dynamicObstacles: DynamicObstacle[];
  reservationTable: ReservationTable;
  currentTick: number;
  displayOptions: SimulationDisplayOptions;
  exploredNodes?: ExploredNodeInfo[];
  editMode: 'none' | 'shelf' | 'pickup' | 'delivery' | 'charging' | 'obstacle' | 'erase';
  onCellClick: (pos: Position) => void;
  onSelectRobot: (robotId: string | null) => void;
}

export const WarehouseGrid: React.FC<WarehouseGridProps> = ({
  grid,
  robots,
  dynamicObstacles,
  reservationTable,
  currentTick,
  displayOptions,
  exploredNodes,
  editMode,
  onCellClick,
  onSelectRobot,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Compute cell size to fill container dynamically while keeping aspect ratio
  const [cellSize, setCellSize] = useState<number>(36);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 32;
      const maxW = (clientWidth - padding) / grid.width;
      const maxH = (clientHeight - padding) / grid.height;
      const size = Math.max(20, Math.floor(Math.min(maxW, maxH)));
      setCellSize(size);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [grid.width, grid.height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = grid.width * cellSize;
    const height = grid.height * cellSize;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // 1. Clear & Background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Floor Grid Cells
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cellType = grid.cells[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        if (cellType === 'shelf') {
          // Industrial shelf rack
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Rack framing accent
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);

          // Diagonal cross bracing lines
          ctx.strokeStyle = '#273549';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + cellSize - 4, py + cellSize - 4);
          ctx.moveTo(px + cellSize - 4, py + 4);
          ctx.lineTo(px + 4, py + cellSize - 4);
          ctx.stroke();
        } else {
          // Standard walkable aisle cell
          ctx.fillStyle = (x + y) % 2 === 0 ? '#0d1527' : '#0f172a';
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Subtle grid lines
          ctx.strokeStyle = '#1e293b40';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize, cellSize);
        }

        // Station overlays
        if (cellType === 'pickup') {
          // Green pickup bay
          ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 2.5, py + 2.5, cellSize - 5, cellSize - 5);

          // Package icon indicator
          ctx.fillStyle = '#10b981';
          const pSize = Math.max(6, Math.floor(cellSize * 0.35));
          const pOffset = (cellSize - pSize) / 2;
          ctx.fillRect(px + pOffset, py + pOffset, pSize, pSize);
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(px + pOffset + 2, py + pOffset + 2, pSize - 4, pSize - 4);
        } else if (cellType === 'delivery') {
          // Cyan delivery dock
          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 2.5, py + 2.5, cellSize - 5, cellSize - 5);

          // Target Dock symbol
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          const r = Math.max(4, Math.floor(cellSize * 0.22));
          ctx.beginPath();
          ctx.arc(px + cellSize / 2, py + cellSize / 2, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(px + cellSize / 2, py + cellSize / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (cellType === 'charging') {
          // Amber charging station
          ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 2.5, py + 2.5, cellSize - 5, cellSize - 5);

          // Lightning icon
          ctx.fillStyle = '#f59e0b';
          const cx = px + cellSize / 2;
          const cy = py + cellSize / 2;
          ctx.beginPath();
          ctx.moveTo(cx + 1, cy - 6);
          ctx.lineTo(cx - 4, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx - 1, cy + 6);
          ctx.lineTo(cx + 4, cy);
          ctx.lineTo(cx, cy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 3. Optional: Draw Explored Nodes (Frontier / Visited A* cells)
    if (displayOptions.showExploredNodes && exploredNodes) {
      exploredNodes.forEach((node) => {
        const px = node.x * cellSize;
        const py = node.y * cellSize;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
      });
    }

    // 4. Optional: Draw Space-Time Reservations at currentTick or future
    if (displayOptions.showReservations) {
      const activeRes = reservationTable.getReservationsAtTime(currentTick + 1);
      activeRes.forEach((res) => {
        const px = res.x * cellSize;
        const py = res.y * cellSize;
        const rColor = robots.find((r) => r.id === res.robotId)?.color || '#06b6d4';

        ctx.strokeStyle = rColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(px + 3, py + 3, cellSize - 6, cellSize - 6);
        ctx.setLineDash([]);
      });
    }

    // 5. Draw Dynamic Obstacles
    dynamicObstacles.forEach((obs) => {
      const px = obs.x * cellSize;
      const py = obs.y * cellSize;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

      // Hazard border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

      // Warning hazard stripes inside
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + cellSize - 4);
      ctx.lineTo(px + cellSize - 4, py + 4);
      ctx.stroke();

      // Caution Exclamation
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.4))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', px + cellSize / 2, py + cellSize / 2);
    });

    // 6. Draw Planned Paths for all or selected robots
    if (displayOptions.showPlannedPaths) {
      robots.forEach((robot) => {
        if (!robot.path || robot.path.length <= 1) return;
        const isSelected = displayOptions.selectedRobotId === robot.id;
        const isFocused = !displayOptions.selectedRobotId || isSelected;

        if (!isFocused) return;

        ctx.strokeStyle = robot.color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        // Draw from current robot position through remaining waypoints
        const startIdx = Math.max(0, robot.currentPathIndex);
        for (let i = startIdx; i < robot.path.length; i++) {
          const step = robot.path[i];
          const cx = step.x * cellSize + cellSize / 2;
          const cy = step.y * cellSize + cellSize / 2;

          if (i === startIdx) {
            ctx.moveTo(cx, cy);
          } else {
            ctx.lineTo(cx, cy);
          }
        }
        ctx.stroke();

        // Draw small step markers along the path
        for (let i = startIdx + 1; i < robot.path.length; i++) {
          const step = robot.path[i];
          const cx = step.x * cellSize + cellSize / 2;
          const cy = step.y * cellSize + cellSize / 2;

          if (step.action === 'WAIT') {
            // Draw waiting indicator (amber halo)
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(3, cellSize * 0.12), 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = robot.color;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(2, cellSize * 0.08), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // 7. Draw Robots
    robots.forEach((robot) => {
      const isSelected = displayOptions.selectedRobotId === robot.id;
      const px = robot.position.x * cellSize;
      const py = robot.position.y * cellSize;
      const cx = px + cellSize / 2;
      const cy = py + cellSize / 2;
      const radius = Math.max(8, cellSize * 0.38);

      // Selected robot glow / halo
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Blocked / Deadlocked warning pulse
      if (robot.isBlocked || robot.state === 'blocked') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Robot Chassis Outer Ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Colored Robot Border
      ctx.strokeStyle = robot.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
      ctx.stroke();

      // Heading Indicator (Direction Arrow / Headlight)
      let headingAngle = 0;
      switch (robot.orientation) {
        case 'RIGHT':
          headingAngle = 0;
          break;
        case 'DOWN':
          headingAngle = Math.PI / 2;
          break;
        case 'LEFT':
          headingAngle = Math.PI;
          break;
        case 'UP':
          headingAngle = -Math.PI / 2;
          break;
        default:
          headingAngle = 0;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(headingAngle);

      // Front directional triangle
      ctx.fillStyle = robot.color;
      ctx.beginPath();
      ctx.moveTo(radius - 2, 0);
      ctx.lineTo(radius - 7, -4);
      ctx.lineTo(radius - 7, 4);
      ctx.closePath();
      ctx.fill();

      // Small twin headlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(radius - 3, -3, 1.2, 0, Math.PI * 2);
      ctx.arc(radius - 3, 3, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Carrying Package Indicator: Box drawn on top
      if (robot.carryingPackage) {
        const pkgSize = Math.max(6, cellSize * 0.28);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(cx - pkgSize / 2, cy - pkgSize / 2, pkgSize, pkgSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - pkgSize / 2, cy - pkgSize / 2, pkgSize, pkgSize);
      }

      // Robot Label / Number
      if (displayOptions.showRobotLabels) {
        ctx.fillStyle = robot.carryingPackage ? '#0a0e17' : '#ffffff';
        ctx.font = `bold ${Math.max(8, Math.floor(cellSize * 0.28))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = robot.id.replace('robot-', 'R').replace('bench-robot-', 'R');
        ctx.fillText(label, cx, cy);
      }
    });

    // 8. Grid Coordinate Labels (Optional)
    if (displayOptions.showGridCoordinates) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (x === 0 || y === 0) {
            ctx.fillText(`${x},${y}`, x * cellSize + 2, y * cellSize + 2);
          }
        }
      }
    }

    // 9. Hovered Cell Highlight & Tooltip Outline
    if (hoveredCell) {
      const hpx = hoveredCell.x * cellSize;
      const hpy = hoveredCell.y * cellSize;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hpx + 1, hpy + 1, cellSize - 2, cellSize - 2);
    }
  }, [
    grid,
    robots,
    dynamicObstacles,
    reservationTable,
    currentTick,
    cellSize,
    displayOptions,
    exploredNodes,
    hoveredCell,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): Position | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = Math.floor(clientX / cellSize);
    const y = Math.floor(clientY / cellSize);

    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
      return { x, y };
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCellFromEvent(e);
    setHoveredCell(pos);

    if (isMouseDown && pos && editMode !== 'none') {
      onCellClick(pos);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);
    const pos = getCellFromEvent(e);
    if (!pos) return;

    // Check if clicked directly on a robot
    const clickedRobot = robots.find((r) => r.position.x === pos.x && r.position.y === pos.y);
    if (clickedRobot) {
      onSelectRobot(clickedRobot.id);
      return;
    }

    onCellClick(pos);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
    setIsMouseDown(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center p-4 bg-slate-950/80 rounded-xl border border-slate-800 shadow-2xl overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair rounded shadow-lg"
      />

      {/* Coordinate Tooltip in bottom-left corner of grid */}
      {hoveredCell && (
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded text-xs font-mono text-slate-300 shadow pointer-events-none flex items-center gap-2">
          <span className="text-cyan-400 font-semibold">
            X: {hoveredCell.x}, Y: {hoveredCell.y}
          </span>
          <span className="text-slate-500">|</span>
          <span className="capitalize text-slate-300">
            {grid.cells[hoveredCell.y]?.[hoveredCell.x] || 'empty'}
          </span>
          {robots.some((r) => r.position.x === hoveredCell.x && r.position.y === hoveredCell.y) && (
            <span className="text-amber-400 font-semibold">• Robot Present</span>
          )}
        </div>
      )}
    </div>
  );
};
