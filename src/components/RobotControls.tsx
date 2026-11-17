import React from 'react';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Gauge,
  AlertTriangle,
  Package,
} from 'lucide-react';

interface RobotControlsProps {
  isRunning: boolean;
  stepIntervalMs: number;
  currentTick?: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (intervalMs: number) => void;
  onSpawnTask: () => void;
  onTriggerObstacle: () => void;
}

export const RobotControls: React.FC<RobotControlsProps> = ({
  isRunning,
  stepIntervalMs,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  onSpawnTask,
  onTriggerObstacle,
}) => {
  return (
    <div className="h-14 px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 text-slate-200 z-10">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        {isRunning ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play</span>
          </button>
        )}

        <button
          onClick={onStep}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 text-xs font-medium transition"
          title="Advance exactly one simulation timestep (Tick + 1)"
        >
          <StepForward className="w-3.5 h-3.5" />
          <span>Step (1 Tick)</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          title="Reset simulation to initial state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Speed Selector */}
      <div className="flex items-center gap-3">
        <Gauge className="w-4 h-4 text-cyan-400" />
        <span className="text-xs text-slate-400">Simulation Speed:</span>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[
            { label: '0.5x', ms: 700 },
            { label: '1x', ms: 350 },
            { label: '2x', ms: 175 },
            { label: '5x', ms: 70 },
          ].map((spd) => {
            const isActive = stepIntervalMs === spd.ms;
            return (
              <button
                key={spd.label}
                onClick={() => onSpeedChange(spd.ms)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Action Triggers */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSpawnTask}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-emerald-950 hover:border-emerald-700/80 border border-slate-700 text-emerald-400 text-xs font-medium transition"
          title="Create a new delivery order in the task queue"
        >
          <Package className="w-3.5 h-3.5" />
          <span>+ Dispatch Task</span>
        </button>

        <button
          onClick={onTriggerObstacle}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-amber-950 hover:border-amber-700/80 border border-slate-700 text-amber-400 text-xs font-medium transition"
          title="Place dynamic obstacle at random corridor to trigger real-time replanning"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>+ Dynamic Hazard</span>
        </button>
      </div>
    </div>
  );
};
