import React from 'react';
import { X, Package, Navigation } from 'lucide-react';
import { Robot } from '../types';

interface RobotDetailsModalProps {
  robot: Robot | null;
  onClose: () => void;
  onChangePriority: (robotId: string, delta: number) => void;
}

export const RobotDetailsModal: React.FC<RobotDetailsModalProps> = ({
  robot,
  onClose,
  onChangePriority,
}) => {
  if (!robot) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col text-slate-200 text-xs animate-in slide-in-from-right">
      {/* Header */}
      <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ backgroundColor: robot.color }}
          />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{robot.name}</h3>
            <span className="text-[10px] text-slate-400 font-mono">ID: {robot.id}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
        {/* Status Card */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current State:</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                robot.state === 'carrying_to_delivery'
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                  : robot.state === 'moving_to_pickup'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : robot.state === 'waiting'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : robot.state === 'blocked'
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {robot.state.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Position & Heading:</span>
            <span className="font-mono text-slate-200">
              ({robot.position.x}, {robot.position.y}) • {robot.orientation}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Priority Level:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-400 font-bold">P:{robot.priority}</span>
              <button
                onClick={() => onChangePriority(robot.id, -1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-bold"
                title="Increase priority"
              >
                ▲
              </button>
              <button
                onClick={() => onChangePriority(robot.id, 1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-bold"
                title="Decrease priority"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Active Task Card */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-cyan-400" />
            Assigned Task
          </div>

          {robot.currentTask ? (
            <div className="space-y-1.5 text-[11px]">
              <div className="font-medium text-slate-100">{robot.currentTask.name}</div>
              <div className="flex justify-between text-slate-400">
                <span>Package ID:</span>
                <span className="font-mono text-emerald-400">{robot.currentTask.packageId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pickup Station:</span>
                <span className="font-mono text-slate-200">
                  ({robot.currentTask.pickupLocation.x}, {robot.currentTask.pickupLocation.y})
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Dock:</span>
                <span className="font-mono text-slate-200">
                  ({robot.currentTask.deliveryLocation.x}, {robot.currentTask.deliveryLocation.y})
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Carrying Item:</span>
                <span className="font-semibold text-slate-200">
                  {robot.carryingPackage ? 'YES (In Transit)' : 'NO (Heading to Bay)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 py-2 text-center">No active task assigned. AMR is idle.</div>
          )}
        </div>

        {/* Robot Lifetime Metrics */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            Telemetry & Metrics
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px]">Distance Traveled</div>
              <div className="text-base font-bold font-mono text-slate-100">
                {robot.metrics.totalDistance} cells
              </div>
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px]">Wait Steps</div>
              <div className="text-base font-bold font-mono text-amber-400">
                {robot.metrics.waitSteps} ticks
              </div>
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px]">Tasks Finished</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {robot.metrics.tasksCompleted}
              </div>
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px]">Replans Triggered</div>
              <div className="text-base font-bold font-mono text-purple-400">
                {robot.metrics.replanCount}
              </div>
            </div>
          </div>
        </div>

        {/* Space-Time Path Steps */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>Planned Path Waypoints</span>
            <span className="font-mono text-cyan-400 text-[10px]">
              {robot.path ? `${robot.currentPathIndex}/${robot.path.length} steps` : '0 steps'}
            </span>
          </div>

          {robot.path && robot.path.length > 0 ? (
            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 font-mono text-[10px]">
              {robot.path.map((step, idx) => {
                const isPassed = idx < robot.currentPathIndex;
                const isCurrent = idx === robot.currentPathIndex;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-2 py-1 rounded ${
                      isCurrent
                        ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold'
                        : isPassed
                        ? 'text-slate-600 line-through'
                        : 'bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <span>
                      Step {idx}: ({step.x}, {step.y})
                    </span>
                    <span>t={step.t}</span>
                    <span
                      className={`font-semibold ${
                        step.action === 'WAIT' ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {step.action} {step.direction ? `(${step.direction})` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 py-2 text-center">No active path trajectory.</div>
          )}
        </div>
      </div>
    </div>
  );
};
