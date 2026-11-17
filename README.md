# Autonomous Warehouse Robot Path Planning & Collision Avoidance Simulator

An industrial-grade, interactive, educational Autonomous Mobile Robot (AMR) warehouse simulator built with **React**, **TypeScript**, **HTML5 Canvas**, and **Tailwind CSS**.

Featuring genuine algorithmic implementations of **A\* Search**, **Space-Time Cooperative A\* (CA\*)**, **Reservation Tables** for zero-collision multi-agent coordination, **Dynamic Obstacle Real-Time Replanning**, **Deadlock Detection & Automated Recovery**, and an **Empirical Scientific Benchmarking Suite** with live chart visualizations and CSV export.

---

## 🌟 Key Features

### 1. Genuine Multi-Agent Path Planning Algorithms
- **Single-Robot A\* Search**:
  - Manhattan Distance admissible heuristic $h(n) = |x_1 - x_2| + |y_1 - y_2|$.
  - Binary min-heap Priority Queue with secondary tie-breaking.
  - Explores graph states $(x, y)$, tracking exact $g$, $h$, and $f$-costs with obstacle avoidance.
- **Space-Time Cooperative A\* (CA\*)**:
  - Time-expanded search in $(x, y, t)$ coordinates over discrete simulation timesteps.
  - Generates waiting actions in place $(dx=0, dy=0)$ allowing lower-priority AMRs to yield at intersections.
  - Prioritized sequential planning where higher-priority robots reserve space-time trajectories.
- **Windowed Cooperative A\* (WHCA\*)**:
  - Rolling-horizon windowed space-time planning for high scalability in large fleets.
- **Zero-Collision Reservation Table**:
  - **Vertex Conflicts**: Prevents two robots from occupying cell $(x, y)$ at the same timestep $t$.
  - **Edge-Swap Conflicts**: Prevents head-on edge crossing where Robot A traverses $(u \to v)$ while Robot B traverses $(v \to u)$ during $t \to t+1$.
  - **Goal Occupancy**: Indefinitely reserves destination coordinates $(x_g, y_g, t)$ for all $t \ge t_{\text{arrival}}$ until new task dispatch, preventing parked robots from being clipped.

### 2. Task Lifecycle Management
- **Full Industrial Flow**: `Idle` $\to$ `Navigate to Pickup` $\to$ `Pick Up Package` $\to$ `Navigate to Delivery Dock` $\to$ `Deliver Item` $\to$ `Complete`.
- Real-time task queue with automated dispatch and manual task injection.
- Visual package carried on top of AMR deck while in transit.

### 3. Dynamic Obstacles & Real-Time Replanning
- Interactive hazard placement: Users can click any floor aisle during runtime to place a dynamic hazard (e.g. spill, obstacle).
- Trajectory Intersection Detection: Automatically detects if any AMR's remaining planned route intersects the new blockage.
- Clean Reservation Rollback: Releases future reservations from $t_{\text{curr}}$ onwards while preserving past integrity.
- Prioritized Rerouting: Computes replacement space-time paths avoiding both the obstacle and active reservations of other robots.

### 4. Deadlock Detection & Automated Recovery
- **Cyclic Waiting Dependency**: Flags situations where Robot A waits for Robot B's position while Robot B waits for Robot A's position.
- **Head-On Corridor Bottlenecks**: Detects opposing AMRs trapped in 1-cell aisles.
- **Automated Recovery**: Executes dynamic priority inversion, releases conflicting reservations, and guides robots to available bypass pockets.

### 5. Empirical Scientific Benchmarking Suite
- Repeatable trials across fleet sizes: **1, 2, 4, 6, 8, and 10 AMRs**.
- High-resolution monotonic timing using `performance.now()`.
- Calculates actual average, min, and max planning times, total nodes expanded, throughput, and success rates.
- No fabricated data: All charts and statistics reflect genuine execution.
- **Export to CSV**: Instant one-click CSV download of aggregate and raw trial data.

### 6. Interactive Industrial Command Dashboard
- Dark charcoal and navy aesthetic with crisp cyan, emerald, amber, and purple highlights.
- High-DPI Canvas warehouse grid with smooth rendering, heading arrows, and coordinate tooltips.
- Interactive Map Editor: Add/remove shelves, pickup stations, delivery docks, charging pads, and hazards.
- Built-in scenarios:
  1. *Basic Warehouse* (2 AMRs, shelf pods)
  2. *Multi-Robot Traffic* (4–6 AMRs, central cross-aisles)
  3. *Congested Warehouse* (6 AMRs, narrow 1-cell aisles)
  4. *Procedural Randomized Warehouse* (guaranteed path connectivity via BFS flood fill)

---

## 🏗️ Architecture & Module Organization

```
src/
├── algorithms/
│   ├── astar.ts               # Standard 2D A* search with cost tracking & explored nodes
│   ├── cooperativeAstar.ts    # Space-time (x, y, t) Cooperative A* & Prioritized Planner
│   ├── deadlockDetection.ts   # Deadlock monitoring & priority inversion recovery
│   ├── heuristic.ts           # Manhattan, Chebyshev, and Euclidean distance heuristics
│   ├── priorityQueue.ts       # Binary Min-Heap Priority Queue with tie-breaking
│   ├── replanning.ts          # Dynamic obstacle intersection detection & rerouting
│   └── reservationTable.ts    # Space-time vertex & edge reservation management
├── analytics/
│   └── BenchmarkRunner.ts     # Multi-agent benchmark experiments runner
├── components/
│   ├── AlgorithmExplanation.tsx # Educational theory guide modal
│   ├── AnalyticsDashboard.tsx   # Live KPIs, Recharts graphs, task queue, event log
│   ├── BenchmarkModal.tsx       # Scientific benchmark UI & Recharts evaluation
│   ├── ConfigurationPanel.tsx   # Warehouse presets, map editor, fleet & priority manager
│   ├── Header.tsx               # Top navigation bar, status pill, ticks, quick controls
│   ├── RobotControls.tsx        # Bottom playback controls (Play/Pause, Step, Speed)
│   ├── RobotDetailsModal.tsx    # Robot telemetry inspector & waypoint viewer
│   └── WarehouseGrid.tsx        # HTML5 Canvas 2D interactive warehouse visualizer
├── simulation/
│   ├── ScenarioGenerator.ts   # Built-in presets & procedural maze generator
│   ├── SimulationEngine.ts    # Central discrete-event simulation coordinator
│   └── TaskManager.ts         # Task state machine & order queue manager
├── types/
│   └── index.ts               # Full TypeScript type definitions
└── utils/
    ├── colors.ts              # AMR color palette
    └── exportCsv.ts           # CSV export utility
tests/
├── astar.test.ts              # A* shortest path, heuristics, wall avoidance, unreachable goal
├── reservationTable.test.ts   # Vertex conflicts, edge swaps, goal occupancy, future release
├── cooperativeAstar.test.ts   # Multi-agent aisle coordination & zero-collision invariants
├── replanningAndDeadlock.test.ts # Obstacle replanning, cyclic deadlock detection & recovery
└── benchmark.test.ts          # Benchmark runner execution & aggregation accuracy
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended; verified on Node v26.13.1)
- **npm** (v9.0.0 or higher)

### 1. Installation
Navigate to the project root directory and install dependencies:
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` (or the URL displayed in the terminal).

### 3. Run Automated Unit Tests
Run the comprehensive Vitest test suite:
```bash
npm test
```
All 15 automated unit tests test algorithmic invariants, obstacle avoidance, edge-swap prevention, and deadlock handling.

### 4. Build for Production
To compile and bundle for production deployment:
```bash
npm run build
```
Production assets are generated in the `dist/` directory.

---

## 🎮 Simulator Controls & Instructions

1. **Playback**:
   - **Play / Pause**: Start or stop continuous discrete simulation steps.
   - **Step (1 Tick)**: Advance exactly one simulation timestep ($t \to t+1$) for precise debugging.
   - **Reset**: Reload the scenario back to initial state ($t=0$).
   - **Speed**: Select from `0.5x` (slow motion), `1x`, `2x`, or `5x` (fast execution).
2. **Interactive Map Editing**:
   - Select an editing tool in the Left Panel: `+ Shelf`, `+ Pickup`, `+ Delivery`, `+ Obstacle`, `+ Charger`, or `Clear Cell`.
   - Click or drag across grid cells to customize the warehouse geometry.
   - Click `Randomize` to generate a fresh layout with verified reachability.
3. **Fleet & Priority Management**:
   - Click `+ Add AMR` to spawn a new robot on a vacant floor cell.
   - Click `▲` or `▼` beside any robot in the fleet list to adjust its planning priority (lower priority values plan first).
   - Click any robot on the grid or in the list to open the **AMR Telemetry Inspector** showing its planned waypoints, distance, and task status.
4. **Dynamic Hazards**:
   - Click `+ Dynamic Hazard` or click any empty aisle cell during simulation to spawn a blockage.
   - Observe real-time trajectory invalidation and automated rerouting in the event log!
5. **Scientific Benchmarking**:
   - Click **Benchmark Suite** in the top navigation bar.
   - Choose trials per robot count and click **Run Benchmark Experiments**.
   - Review live Recharts charts of planning time and expanded nodes, then click **Export CSV** to download raw data.
6. **Educational Theory Guide**:
   - Click **Algorithm Theory** in the top navigation bar to read comprehensive breakdowns of A\*, space-time coordinate states, Manhattan heuristics, collision invariants, and complexity analysis.

---

## 🔬 Algorithmic Invariants Enforced

1. **Static Invariant**: AMRs never enter shelf racks or static boundaries.
2. **Vertex Collision Invariant**: $\forall i \neq j, \forall t: \text{pos}(R_i, t) \neq \text{pos}(R_j, t)$.
3. **Edge-Swap Invariant**: $\forall i \neq j, \forall t: (\text{pos}(R_i, t) \to \text{pos}(R_i, t+1)) \neq (\text{pos}(R_j, t+1) \to \text{pos}(R_j, t))$.
4. **Transition Continuity**: Every step satisfies $|x_{t+1} - x_t| + |y_{t+1} - y_t| \le 1$. Robots never teleport.
5. **Safety on Replan**: If no collision-free trajectory exists within the planning horizon, the robot transitions to a safe `waiting` state holding its current cell reservation rather than violating boundaries.
6. **Delivery Verification**: Orders transition to `delivered` only when the robot carrying the package reaches the designated drop-off coordinates.

---

## 📄 License
MIT License. Built for autonomous robotics research, education, and simulation.
