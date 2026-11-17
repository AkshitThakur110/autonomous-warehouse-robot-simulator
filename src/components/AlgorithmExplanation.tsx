import React, { useState } from 'react';
import { X, BookOpen, CheckCircle, AlertTriangle, Cpu, GitBranch, ShieldCheck } from 'lucide-react';

interface AlgorithmExplanationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlgorithmExplanation: React.FC<AlgorithmExplanationProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<'astar' | 'cooperative' | 'conflicts' | 'deadlock' | 'complexity'>('cooperative');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Autonomous Warehouse Robotics: Algorithm & Path-Planning Theory
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-64 border-r border-slate-800 p-3 space-y-1 bg-slate-950/40 text-xs">
            <button
              onClick={() => setSelectedTopic('astar')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition font-medium flex items-center gap-2 ${
                selectedTopic === 'astar'
                  ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>1. Single-Robot A* Search</span>
            </button>

            <button
              onClick={() => setSelectedTopic('cooperative')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition font-medium flex items-center gap-2 ${
                selectedTopic === 'cooperative'
                  ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-4 h-4 shrink-0" />
              <span>2. Space-Time Cooperative A*</span>
            </button>

            <button
              onClick={() => setSelectedTopic('conflicts')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition font-medium flex items-center gap-2 ${
                selectedTopic === 'conflicts'
                  ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>3. Vertex & Edge-Swap Avoidance</span>
            </button>

            <button
              onClick={() => setSelectedTopic('deadlock')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition font-medium flex items-center gap-2 ${
                selectedTopic === 'deadlock'
                  ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>4. Deadlock Detection & Recovery</span>
            </button>

            <button
              onClick={() => setSelectedTopic('complexity')}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition font-medium flex items-center gap-2 ${
                selectedTopic === 'complexity'
                  ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>5. Computational Complexity</span>
            </button>
          </div>

          {/* Reading Pane */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-xs leading-relaxed space-y-4">
            {selectedTopic === 'astar' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-cyan-400">1. Single-Robot A* Path Planning</h3>
                <p>
                  A* is a best-first graph traversal algorithm that finds the mathematically optimal
                  (shortest) collision-free path between a robot's start location and its target cell.
                </p>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-cyan-300 text-xs">
                  f(n) = g(n) + h(n)
                </div>

                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-slate-100">g(n):</strong> The exact cumulative cost
                    incurred from the start node to current node <code className="text-cyan-400">n</code>.
                  </li>
                  <li>
                    <strong className="text-slate-100">h(n):</strong> The heuristic estimate of the
                    cost from node <code className="text-cyan-400">n</code> to the goal.
                  </li>
                  <li>
                    <strong className="text-slate-100">f(n):</strong> Total estimated route cost. The
                    priority queue expands nodes with the minimal <code className="text-cyan-400">f(n)</code> first.
                  </li>
                </ul>

                <h4 className="text-sm font-semibold text-slate-100 pt-2">Why Manhattan Distance Heuristic?</h4>
                <p>
                  On a 4-connected grid warehouse where mobile robots move strictly Up, Down, Left, or Right with unit cost, the Manhattan distance:
                </p>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-md font-mono text-slate-300">
                  h((x1, y1), (x2, y2)) = |x1 - x2| + |y1 - y2|
                </div>
                <p>
                  is strictly <strong>admissible</strong> (it never overestimates the true distance to the goal) and <strong>consistent / monotonic</strong> (satisfying <code className="text-cyan-400">h(u) &le; c(u, v) + h(v)</code>). This guarantees that the first time a goal node is popped from the open set, the extracted path is provably optimal.
                </p>
              </div>
            )}

            {selectedTopic === 'cooperative' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-cyan-400">2. Space-Time Cooperative A* (CA*)</h3>
                <p>
                  When multiple robots share the same warehouse aisles, planning paths independently using standard 2D A* leads to fatal collisions: robots cross intersections simultaneously or enter narrow 1-cell aisles head-on.
                </p>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-cyan-400 font-semibold">Space-Time State Representation:</span>
                  <div className="font-mono text-slate-300 mt-1">State: s = (x, y, t)</div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Instead of searching a 2D plane (x, y), the search space expands into a 3D space-time cylinder where each node corresponds to a specific grid cell at a specific discrete timestep <code className="text-cyan-400">t</code>.
                  </p>
                </div>

                <h4 className="text-sm font-semibold text-slate-100 pt-2">The Prioritized Planning Strategy</h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>Robots are assigned distinct priorities (e.g. Priority 1, 2, 3...).</li>
                  <li>Higher-priority robots plan their space-time trajectories first and reserve their occupied cells and traversed edges in a centralized <strong>Reservation Table</strong>.</li>
                  <li>Lower-priority robots plan their routes around the existing reservations of higher-priority robots.</li>
                  <li>A robot can take an action to <strong>WAIT in place</strong> <code className="text-cyan-400">(dx=0, dy=0)</code> at timestep <code className="text-cyan-400">t+1</code>, enabling it to yield and let a higher-priority robot pass through an intersection!</li>
                </ol>
              </div>
            )}

            {selectedTopic === 'conflicts' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-cyan-400">3. Collision Prevention: Vertex & Edge-Swap Conflicts</h3>
                <p>
                  Multi-agent pathfinding (MAPF) must eliminate two fundamental physical conflict types:
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="text-rose-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Vertex Conflict
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Occurs when two robots occupy the same grid cell at the same timestep:
                    </p>
                    <div className="font-mono text-slate-300 text-[10px] bg-slate-900 p-1.5 rounded">
                      pos(RobotA, t) == pos(RobotB, t)
                    </div>
                    <p className="text-emerald-400 text-[11px]">
                      <strong>Resolution:</strong> The reservation table checks <code className="text-cyan-400">isVertexAvailable(x, y, t)</code> before allowing any expansion.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="text-rose-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Edge-Swap Conflict
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Occurs when two robots traverse the same aisle segment in opposite directions during the same tick:
                    </p>
                    <div className="font-mono text-slate-300 text-[10px] bg-slate-900 p-1.5 rounded">
                      u &rarr; v (RobotA) and v &rarr; u (RobotB) at t
                    </div>
                    <p className="text-emerald-400 text-[11px]">
                      <strong>Resolution:</strong> The reservation table tracks directed edges and blocks transitions where the reverse edge is already reserved.
                    </p>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-slate-100 pt-2">Goal Occupancy Rule</h4>
                <p className="text-slate-300">
                  When a robot reaches its delivery station or completed destination at timestep <code className="text-cyan-400">t_goal</code>, it physically occupies that coordinate indefinitely until assigned a new task. The Reservation Table automatically reserves <code className="text-cyan-400">(x_goal, y_goal, t)</code> for all <code className="text-cyan-400">t &ge; t_goal</code> up to the planning horizon so other robots do not plot trajectories through it!
                </p>
              </div>
            )}

            {selectedTopic === 'deadlock' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-cyan-400">4. Deadlock Detection & Automated Recovery</h3>
                <p>
                  Prioritized planning is complete and fast, but not globally optimal. In congested warehouses with narrow 1-cell aisles, situations can arise where:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li><strong>Cyclic Wait Dependency:</strong> Robot 1 is waiting for Robot 2's cell, while Robot 2 is waiting for Robot 1's cell.</li>
                  <li><strong>Narrow Corridor Bottlenecks:</strong> Two robots facing each other head-on in an aisle with no immediate passing alcoves.</li>
                  <li><strong>Starvation:</strong> A low-priority robot is repeatedly blocked by continuous streams of high-priority traffic.</li>
                </ul>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-cyan-400 font-semibold">Active Recovery Mechanisms Implemented:</div>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-[11px]">
                    <li><strong>Dynamic Priority Inversion:</strong> When a cyclic deadlock is identified, the simulator inverts the priority order of the involved pair and clears conflicting future reservations.</li>
                    <li><strong>Sidestep Insertion:</strong> Bounded backtracking searches adjacent vacant alcoves to allow one AMR to temporarily yield into a pocket.</li>
                    <li><strong>Bounded Replanning Horizon:</strong> Unresolvable deadlocks trigger automated event logging and emergency hold without violating physical boundary constraints.</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedTopic === 'complexity' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-cyan-400">5. Computational Complexity Analysis</h3>
                <p>
                  Comparing search complexities across single-agent and multi-agent paradigms:
                </p>

                <div className="space-y-2 text-slate-300">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-md">
                    <strong className="text-slate-100">Standard 2D A*:</strong>
                    <div className="font-mono text-cyan-400 text-xs mt-0.5">O(|V| log |V| + |E|)</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Where <code className="text-cyan-400">|V| = W &times; H</code> is the grid cell count. Very fast (sub-millisecond), but ignores other agents.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-md">
                    <strong className="text-slate-100">Prioritized Space-Time Cooperative A*:</strong>
                    <div className="font-mono text-cyan-400 text-xs mt-0.5">O(K &times; (|V| &times; T) log (|V| &times; T))</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Where <code className="text-cyan-400">K</code> is the number of robots and <code className="text-cyan-400">T</code> is the planning horizon. Linear in robot count <code className="text-cyan-400">K</code>, making it practical for real-time warehouse execution!
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-md">
                    <strong className="text-slate-100">Optimal Multi-Agent Pathfinding (Coupled / CBS):</strong>
                    <div className="font-mono text-rose-400 text-xs mt-0.5">Exponential O(|V|^K) (NP-Hard)</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Finding the globally optimal makespan for <code className="text-cyan-400">K</code> agents simultaneously is NP-hard. Prioritized Cooperative A* serves as the industrial gold-standard polynomial approximation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-slate-400 text-[11px]">
          <span>Autonomous Robotics Simulator • Algorithms Module</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Theory Guide
          </button>
        </div>
      </div>
    </div>
  );
};
