import React, { useState, useEffect, useRef, useReducer } from 'react';
import { SimulationEngine } from './simulation/SimulationEngine';
import {
  createBasicWarehouseScenario,
  createMultiRobotTrafficScenario,
  createCongestedWarehouseScenario,
  generateRandomWarehouseScenario,
} from './simulation/ScenarioGenerator';
import { Header } from './components/Header';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { WarehouseGrid } from './components/WarehouseGrid';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { RobotControls } from './components/RobotControls';
import { AlgorithmExplanation } from './components/AlgorithmExplanation';
import { BenchmarkModal } from './components/BenchmarkModal';
import { RobotDetailsModal } from './components/RobotDetailsModal';
import { Position, SimulationDisplayOptions, Robot } from './types';
import { getRobotColor } from './utils/colors';

export const App: React.FC = () => {
  // Force update reducer to re-render whenever the simulation engine ticks
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Initialize engine reference
  const engineRef = useRef<SimulationEngine | null>(null);
  if (!engineRef.current) {
    const defaultScenario = createMultiRobotTrafficScenario();
    engineRef.current = new SimulationEngine(defaultScenario);
  }
  const engine = engineRef.current;

  // Local UI states
  const [currentScenarioId, setCurrentScenarioId] = useState<string>('multi-robot-traffic');
  const [editMode, setEditMode] = useState<
    'none' | 'shelf' | 'pickup' | 'delivery' | 'charging' | 'obstacle' | 'erase'
  >('none');
  const [displayOptions, setDisplayOptions] = useState<SimulationDisplayOptions>({
    showPlannedPaths: true,
    showReservations: true,
    showExploredNodes: false,
    showRobotLabels: true,
    showGridCoordinates: false,
    showHeatmap: false,
    selectedRobotId: null,
  });

  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);

  // Hook engine notifications to React state
  useEffect(() => {
    engine.setOnUpdate(() => {
      forceUpdate();
    });

    return () => {
      engine.pause();
    };
  }, [engine]);

  // Scenario loading handler
  const handleSelectScenario = (scenarioId: string) => {
    setCurrentScenarioId(scenarioId);
    let scenario;
    switch (scenarioId) {
      case 'basic-warehouse':
        scenario = createBasicWarehouseScenario();
        break;
      case 'multi-robot-traffic':
        scenario = createMultiRobotTrafficScenario();
        break;
      case 'congested-warehouse':
        scenario = createCongestedWarehouseScenario();
        break;
      default:
        scenario = createMultiRobotTrafficScenario();
    }
    engine.initScenario(scenario);
  };

  const handleGenerateRandom = () => {
    const randomScenario = generateRandomWarehouseScenario(20, 14, 5);
    setCurrentScenarioId(randomScenario.id);
    engine.initScenario(randomScenario);
  };

  // Cell Interaction on Grid
  const handleCellClick = (pos: Position) => {
    if (editMode === 'none') {
      // Quick toggle dynamic obstacle if not in specific editing mode
      const isObs = engine.dynamicObstacles.some((o) => o.x === pos.x && o.y === pos.y);
      if (isObs) {
        engine.handleDynamicObstacle(pos, false);
      } else if (engine.grid.cells[pos.y][pos.x] === 'empty') {
        engine.handleDynamicObstacle(pos, true);
      }
      return;
    }

    if (editMode === 'obstacle') {
      const isObs = engine.dynamicObstacles.some((o) => o.x === pos.x && o.y === pos.y);
      engine.handleDynamicObstacle(pos, !isObs);
    } else if (editMode === 'erase') {
      // Clear obstacle if present
      const isObs = engine.dynamicObstacles.some((o) => o.x === pos.x && o.y === pos.y);
      if (isObs) {
        engine.handleDynamicObstacle(pos, false);
      }
      engine.editCell(pos.x, pos.y, 'empty');
    } else {
      engine.editCell(pos.x, pos.y, editMode);
    }
  };

  // Add AMR
  const handleAddRobot = () => {
    // Find an empty cell without robots or obstacles
    for (let y = 0; y < engine.grid.height; y++) {
      for (let x = 0; x < engine.grid.width; x++) {
        const isFree =
          engine.grid.cells[y][x] === 'empty' &&
          !engine.robots.some((r) => r.position.x === x && r.position.y === y) &&
          !engine.dynamicObstacles.some((o) => o.x === x && o.y === y);

        if (isFree) {
          const newIdx = engine.robots.length;
          const newRobot: Robot = {
            id: `robot-${Date.now()}-${newIdx + 1}`,
            name: `AMR-${String(newIdx + 1).padStart(2, '0')}`,
            color: getRobotColor(newIdx),
            position: { x, y },
            orientation: 'DOWN',
            state: 'idle',
            priority: newIdx + 1,
            currentTask: null,
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
          };

          engine.robots.push(newRobot);
          engine.log({
            tick: engine.currentTick,
            level: 'info',
            category: 'SIM',
            message: `Deployed new robot ${newRobot.name} at (${x}, ${y})`,
            robotId: newRobot.id,
          });

          // Check for pending task
          engine.taskManager.autoAssignTasks(engine.robots, engine.currentTick, engine.log.bind(engine));
          engine.planSingleRobot(newRobot);
          forceUpdate();
          return;
        }
      }
    }
  };

  // Remove AMR
  const handleRemoveRobot = (robotId: string) => {
    const idx = engine.robots.findIndex((r) => r.id === robotId);
    if (idx !== -1) {
      const bot = engine.robots[idx];
      engine.reservationTable.releaseRobot(bot.id);
      if (bot.currentTask) {
        bot.currentTask.status = 'pending';
        bot.currentTask.assignedRobotId = undefined;
      }
      engine.robots.splice(idx, 1);
      engine.log({
        tick: engine.currentTick,
        level: 'info',
        category: 'SIM',
        message: `Decommissioned robot ${bot.name}`,
      });
      engine.replanAllRobots();
      forceUpdate();
    }
  };

  // Change Priority
  const handleChangePriority = (robotId: string, delta: number) => {
    const bot = engine.robots.find((r) => r.id === robotId);
    if (bot) {
      bot.priority = Math.max(1, bot.priority + delta);
      engine.replanAllRobots();
      forceUpdate();
    }
  };

  // Spawn Task
  const handleSpawnTask = () => {
    const task = engine.taskManager.generateRandomTask(engine.grid, engine.currentTick);
    if (task) {
      engine.log({
        tick: engine.currentTick,
        level: 'info',
        category: 'TASK',
        message: `New package order generated: ${task.name}`,
        position: task.pickupLocation,
      });
      engine.taskManager.autoAssignTasks(engine.robots, engine.currentTick, engine.log.bind(engine));
      engine.replanAllRobots();
      forceUpdate();
    }
  };

  // Trigger Random Dynamic Obstacle
  const handleTriggerObstacle = () => {
    // Find a random walkable aisle cell where no robot currently is
    const candidates: Position[] = [];
    for (let y = 1; y < engine.grid.height - 1; y++) {
      for (let x = 1; x < engine.grid.width - 1; x++) {
        if (
          engine.grid.cells[y][x] === 'empty' &&
          !engine.robots.some((r) => r.position.x === x && r.position.y === y) &&
          !engine.dynamicObstacles.some((o) => o.x === x && o.y === y)
        ) {
          candidates.push({ x, y });
        }
      }
    }

    if (candidates.length > 0) {
      const pos = candidates[Math.floor(Math.random() * candidates.length)];
      engine.handleDynamicObstacle(pos, true);
    }
  };

  const selectedRobot =
    displayOptions.selectedRobotId !== null
      ? engine.robots.find((r) => r.id === displayOptions.selectedRobotId) || null
      : null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0e17] text-slate-100 overflow-hidden font-sans">
      {/* 1. TOP NAVIGATION BAR */}
      <Header
        currentTick={engine.currentTick}
        isRunning={engine.isRunning}
        algorithm={engine.config.algorithm}
        robotCount={engine.robots.length}
        activeDeadlocksCount={engine.activeDeadlocks.length}
        onPlayPause={() => (engine.isRunning ? engine.pause() : engine.start())}
        onReset={() => engine.reset()}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* 2. MAIN WORKSPACE (Sidebars + Warehouse Grid) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Configuration & Fleet Manager */}
        <ConfigurationPanel
          config={engine.config}
          displayOptions={displayOptions}
          robots={engine.robots}
          currentScenarioId={currentScenarioId}
          editMode={editMode}
          onUpdateConfig={(newConf) => {
            Object.assign(engine.config, newConf);
            engine.replanAllRobots();
            forceUpdate();
          }}
          onUpdateDisplayOptions={(newOpts) => {
            setDisplayOptions((prev) => ({ ...prev, ...newOpts }));
          }}
          onSelectScenario={handleSelectScenario}
          onGenerateRandom={handleGenerateRandom}
          onSetEditMode={setEditMode}
          onAddRobot={handleAddRobot}
          onRemoveRobot={handleRemoveRobot}
          onChangeRobotPriority={handleChangePriority}
          onSelectRobot={(id) => setDisplayOptions((prev) => ({ ...prev, selectedRobotId: id }))}
        />

        {/* Center: Canvas Warehouse Grid */}
        <main className="flex-1 h-full p-4 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950/40">
          <WarehouseGrid
            grid={engine.grid}
            robots={engine.robots}
            dynamicObstacles={engine.dynamicObstacles}
            reservationTable={engine.reservationTable}
            currentTick={engine.currentTick}
            displayOptions={displayOptions}
            exploredNodes={engine.exploredNodesHistory}
            editMode={editMode}
            onCellClick={handleCellClick}
            onSelectRobot={(id) => setDisplayOptions((prev) => ({ ...prev, selectedRobotId: id }))}
          />
        </main>

        {/* Right: Live KPIs, Performance Charts & Logs */}
        <AnalyticsDashboard
          kpis={engine.kpis}
          robots={engine.robots}
          tasks={engine.taskManager.activeTasks}
          completedTasks={engine.taskManager.finishedTasks}
          logs={engine.logs}
          currentTick={engine.currentTick}
        />
      </div>

      {/* 3. BOTTOM CONTROL BAR */}
      <RobotControls
        isRunning={engine.isRunning}
        stepIntervalMs={engine.config.stepIntervalMs}
        currentTick={engine.currentTick}
        onPlay={() => engine.start()}
        onPause={() => engine.pause()}
        onStep={() => engine.step()}
        onReset={() => engine.reset()}
        onSpeedChange={(ms) => engine.setSpeed(ms)}
        onSpawnTask={handleSpawnTask}
        onTriggerObstacle={handleTriggerObstacle}
      />

      {/* 4. MODALS & DRAWERS */}
      <AlgorithmExplanation
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      <RobotDetailsModal
        robot={selectedRobot}
        onClose={() => setDisplayOptions((prev) => ({ ...prev, selectedRobotId: null }))}
        onChangePriority={handleChangePriority}
      />
    </div>
  );
};
