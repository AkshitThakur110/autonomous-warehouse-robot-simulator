import React from 'react';
import {
  Layers,
  Settings,
  Boxes,
  Truck,
  Plus,
  Sparkles,
  MapPin,
} from 'lucide-react';
import {
  SimulationConfig,
  SimulationDisplayOptions,
  Robot,
} from '../types';

interface ConfigurationPanelProps {
  config: SimulationConfig;
  displayOptions: SimulationDisplayOptions;
  robots: Robot[];
  currentScenarioId: string;
  editMode: 'none' | 'shelf' | 'pickup' | 'delivery' | 'charging' | 'obstacle' | 'erase';
  onUpdateConfig: (newConfig: Partial<SimulationConfig>) => void;
  onUpdateDisplayOptions: (newOpts: Partial<SimulationDisplayOptions>) => void;
  onSelectScenario: (scenarioId: string) => void;
  onGenerateRandom: () => void;
  onSetEditMode: (mode: 'none' | 'shelf' | 'pickup' | 'delivery' | 'charging' | 'obstacle' | 'erase') => void;
  onAddRobot: () => void;
  onRemoveRobot: (robotId: string) => void;
  onChangeRobotPriority: (robotId: string, delta: number) => void;
  onSelectRobot: (robotId: string | null) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  displayOptions,
  robots,
  currentScenarioId,
  editMode,
  onUpdateConfig,
  onUpdateDisplayOptions,
  onSelectScenario,
  onGenerateRandom,
  onSetEditMode,
  onAddRobot,
  onRemoveRobot,
  onChangeRobotPriority,
  onSelectRobot,
}) => {
  return (
    <aside className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-200 overflow-y-auto custom-scrollbar text-xs">
      {/* 1. SCENARIO SELECTION */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-cyan-400" />
            Warehouse Scenarios
          </span>
          <button
            onClick={onGenerateRandom}
            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 transition text-[11px]"
            title="Generate a randomized warehouse with verified connectivity"
          >
            <Sparkles className="w-3 h-3" />
            <span>Randomize</span>
          </button>
        </div>

        <select
          value={currentScenarioId}
          onChange={(e) => onSelectScenario(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
        >
          <option value="basic-warehouse">Basic Warehouse (2 Robots, Pods)</option>
          <option value="multi-robot-traffic">Multi-Robot Traffic (4–6 AMRs)</option>
          <option value="congested-warehouse">Congested Warehouse (Narrow Aisles)</option>
        </select>
      </div>

      {/* 2. INTERACTIVE MAP EDITOR TOOLS */}
      <div className="p-4 border-b border-slate-800">
        <div className="font-semibold text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          Interactive Map Editor
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onSetEditMode(editMode === 'shelf' ? 'none' : 'shelf')}
            className={`px-2 py-1.5 rounded border text-center transition font-medium ${
              editMode === 'shelf'
                ? 'bg-slate-700 border-cyan-400 text-white'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            + Shelf
          </button>
          <button
            onClick={() => onSetEditMode(editMode === 'pickup' ? 'none' : 'pickup')}
            className={`px-2 py-1.5 rounded border text-center transition font-medium ${
              editMode === 'pickup'
                ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                : 'bg-slate-950/70 border-slate-800 text-emerald-400 hover:bg-slate-800'
            }`}
          >
            + Pickup
          </button>
          <button
            onClick={() => onSetEditMode(editMode === 'delivery' ? 'none' : 'delivery')}
            className={`px-2 py-1.5 rounded border text-center transition font-medium ${
              editMode === 'delivery'
                ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                : 'bg-slate-950/70 border-slate-800 text-cyan-400 hover:bg-slate-800'
            }`}
          >
            + Delivery
          </button>
          <button
            onClick={() => onSetEditMode(editMode === 'obstacle' ? 'none' : 'obstacle')}
            className={`px-2 py-1.5 rounded border text-center transition font-medium ${
              editMode === 'obstacle'
                ? 'bg-amber-950 border-amber-400 text-amber-200'
                : 'bg-slate-950/70 border-slate-800 text-amber-400 hover:bg-slate-800'
            }`}
          >
            + Obstacle
          </button>
          <button
            onClick={() => onSetEditMode(editMode === 'charging' ? 'none' : 'charging')}
            className={`px-2 py-1.5 rounded border text-center transition font-medium ${
              editMode === 'charging'
                ? 'bg-purple-950 border-purple-400 text-purple-200'
                : 'bg-slate-950/70 border-slate-800 text-purple-400 hover:bg-slate-800'
            }`}
          >
            + Charger
          </button>
          <button
            onClick={() => onSetEditMode(editMode === 'erase' ? 'none' : 'erase')}
            className={`px-2 py-1.5 rounded border text-center transition font-medium ${
              editMode === 'erase'
                ? 'bg-rose-950 border-rose-400 text-rose-200'
                : 'bg-slate-950/70 border-slate-800 text-rose-400 hover:bg-slate-800'
            }`}
          >
            Clear Cell
          </button>
        </div>
        {editMode !== 'none' && (
          <p className="mt-2 text-[11px] text-cyan-400/90 font-mono">
            Click / drag on grid cells to apply: <span className="uppercase font-bold">{editMode}</span>
          </p>
        )}
      </div>

      {/* 3. ALGORITHM CONFIGURATION */}
      <div className="p-4 border-b border-slate-800">
        <div className="font-semibold text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          Planning Algorithm
        </div>

        <div className="space-y-1.5 mb-3">
          <label className="flex items-center gap-2 p-2 rounded bg-slate-950/80 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="radio"
              name="algo"
              checked={config.algorithm === 'cooperative_astar'}
              onChange={() => onUpdateConfig({ algorithm: 'cooperative_astar' })}
              className="text-cyan-500 focus:ring-0"
            />
            <div>
              <div className="font-medium text-slate-200">Space-Time Cooperative A*</div>
              <div className="text-[10px] text-slate-400">Vertex + Edge reservation table (Zero Collisions)</div>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2 rounded bg-slate-950/80 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="radio"
              name="algo"
              checked={config.algorithm === 'windowed_coop_astar'}
              onChange={() => onUpdateConfig({ algorithm: 'windowed_coop_astar' })}
              className="text-cyan-500 focus:ring-0"
            />
            <div>
              <div className="font-medium text-slate-200">Windowed Cooperative A* (WHCA*)</div>
              <div className="text-[10px] text-slate-400">Rolling horizon window (Scalable for large fleets)</div>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2 rounded bg-slate-950/80 border border-slate-800 cursor-pointer hover:border-slate-700">
            <input
              type="radio"
              name="algo"
              checked={config.algorithm === 'astar'}
              onChange={() => onUpdateConfig({ algorithm: 'astar' })}
              className="text-cyan-500 focus:ring-0"
            />
            <div>
              <div className="font-medium text-slate-200">Standard 2D A* (Independent)</div>
              <div className="text-[10px] text-slate-400">Baseline without coordination (Shows collisions)</div>
            </div>
          </label>
        </div>

        {/* Sliders */}
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Time Horizon:</span>
              <span className="font-mono text-cyan-400">{config.planningHorizon} ticks</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              step="10"
              value={config.planningHorizon}
              onChange={(e) => onUpdateConfig({ planningHorizon: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {config.algorithm === 'windowed_coop_astar' && (
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Window Size (W):</span>
                <span className="font-mono text-cyan-400">{config.windowSize} steps</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={config.windowSize}
                onChange={(e) => onUpdateConfig({ windowSize: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Deadlock Monitor & Recovery:</span>
            <input
              type="checkbox"
              checked={config.detectDeadlocks}
              onChange={(e) => onUpdateConfig({ detectDeadlocks: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4. FLEET & PRIORITY MANAGEMENT */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            Robots & Priorities ({robots.length})
          </span>
          <button
            onClick={onAddRobot}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px]"
          >
            <Plus className="w-3 h-3" /> Add AMR
          </button>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {robots.map((robot) => {
            const isSelected = displayOptions.selectedRobotId === robot.id;
            return (
              <div
                key={robot.id}
                onClick={() => onSelectRobot(isSelected ? null : robot.id)}
                className={`flex items-center justify-between p-2 rounded border cursor-pointer transition ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: robot.color }}
                  />
                  <div>
                    <div className="font-medium text-slate-200">{robot.name}</div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {robot.state.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    P:{robot.priority}
                  </span>
                  <button
                    onClick={() => onChangeRobotPriority(robot.id, -1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Raise priority (plans earlier)"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onChangeRobotPriority(robot.id, 1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Lower priority"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => onRemoveRobot(robot.id)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300"
                    title="Remove Robot"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. VISUALIZATION LAYERS */}
      <div className="p-4">
        <div className="font-semibold text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Display Layers
        </div>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Show Planned Paths</span>
            <input
              type="checkbox"
              checked={displayOptions.showPlannedPaths}
              onChange={(e) => onUpdateDisplayOptions({ showPlannedPaths: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Show Space-Time Reservations</span>
            <input
              type="checkbox"
              checked={displayOptions.showReservations}
              onChange={(e) => onUpdateDisplayOptions({ showReservations: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Show Explored / Frontier Nodes</span>
            <input
              type="checkbox"
              checked={displayOptions.showExploredNodes}
              onChange={(e) => onUpdateDisplayOptions({ showExploredNodes: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Show Robot Labels & Badges</span>
            <input
              type="checkbox"
              checked={displayOptions.showRobotLabels}
              onChange={(e) => onUpdateDisplayOptions({ showRobotLabels: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Show Grid Coordinates</span>
            <input
              type="checkbox"
              checked={displayOptions.showGridCoordinates}
              onChange={(e) => onUpdateDisplayOptions({ showGridCoordinates: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};
