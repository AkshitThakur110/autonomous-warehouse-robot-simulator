import React from 'react';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { AlgorithmType } from '../types';

interface HeaderProps {
  currentTick: number;
  isRunning: boolean;
  algorithm: AlgorithmType;
  robotCount: number;
  activeDeadlocksCount: number;
  onPlayPause: () => void;
  onReset: () => void;
  onOpenBenchmark: () => void;
  onOpenDocs: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTick,
  isRunning,
  algorithm,
  robotCount,
  activeDeadlocksCount,
  onPlayPause,
  onReset,
  onOpenBenchmark,
  onOpenDocs,
}) => {
  const getAlgoName = (algo: AlgorithmType) => {
    switch (algo) {
      case 'astar':
        return 'Standard 2D A* (Independent)';
      case 'cooperative_astar':
        return 'Cooperative A* (Space-Time)';
      case 'windowed_coop_astar':
        return 'Windowed Cooperative A*';
    }
  };

  return (
    <header className="h-16 px-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 backdrop-blur z-20">
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Cpu className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-slate-100 text-sm tracking-wide">
              Warehouse AMR Path Planning & Collision Avoidance
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-medium">
              v1.0 PRO
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>Autonomous Industrial Robotics Lab</span>
            <span>•</span>
            <span className="text-cyan-400/90 font-mono text-[11px]">{getAlgoName(algorithm)}</span>
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">SIM TICK:</span>
          <span className="text-cyan-400 font-bold text-sm tracking-widest">
            {String(currentTick).padStart(4, '0')}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRunning ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
            }`}
          />
          <span className="font-medium text-slate-300">
            {isRunning ? 'RUNNING' : 'PAUSED'}
          </span>
          <button
            onClick={onPlayPause}
            className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title={isRunning ? 'Pause' : 'Play'}
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={onReset}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {activeDeadlocksCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs font-semibold text-red-400 animate-pulse">
            <span>DEADLOCK DETECTED ({activeDeadlocksCount})</span>
          </div>
        )}

        <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <span className="text-slate-500">Fleet:</span>{' '}
          <span className="text-emerald-400 font-mono font-bold">{robotCount} AMRs</span>
        </div>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenBenchmark}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-medium transition"
          title="Run scientific benchmarking experiments (1, 2, 4, 6, 8, 10 robots)"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Benchmark Suite</span>
        </button>

        <button
          onClick={onOpenDocs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition"
          title="Educational Guide: A*, Space-Time States, Reservation Tables, Deadlocks"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Algorithm Theory</span>
        </button>
      </div>
    </header>
  );
};
