import React, { useState } from 'react';
import {
  X,
  Play,
  Download,
  BarChart3,
  Loader2,
  Clock,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { AlgorithmType, BenchmarkAggregate, BenchmarkTrial } from '../types';
import { runBenchmarkSuite } from '../analytics/BenchmarkRunner';
import { exportBenchmarkToCsv } from '../utils/exportCsv';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('cooperative_astar');
  const [trialsPerCount, setTrialsPerCount] = useState<number>(3);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [aggregates, setAggregates] = useState<BenchmarkAggregate[]>([]);
  const [rawTrials, setRawTrials] = useState<BenchmarkTrial[]>([]);

  if (!isOpen) return null;

  const handleStartBenchmark = async () => {
    setIsRunning(true);
    setProgress(0);
    setStatusMessage('Initializing standardized benchmark trials...');
    setAggregates([]);
    setRawTrials([]);

    try {
      const results = await runBenchmarkSuite(
        {
          robotCounts: [1, 2, 4, 6, 8, 10],
          trialsPerCount,
          algorithm,
          maxPlanningHorizon: 80,
        },
        (pct, msg) => {
          setProgress(pct);
          setStatusMessage(msg);
        }
      );

      setAggregates(results.aggregates);
      setRawTrials(results.rawTrials);
      setStatusMessage('Benchmark suite completed successfully.');
    } catch (err) {
      console.error('Benchmark failed:', err);
      setStatusMessage('Benchmark encountered an error.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = () => {
    if (aggregates.length === 0) return;
    exportBenchmarkToCsv(aggregates, rawTrials);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Scientific Algorithmic Benchmarking Suite
              </h2>
              <p className="text-[11px] text-slate-400">
                Empirical high-resolution performance evaluation across scalable AMR fleet sizes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6 text-xs">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Algorithm:</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
                  disabled={isRunning}
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="cooperative_astar">Space-Time Cooperative A*</option>
                  <option value="windowed_coop_astar">Windowed Cooperative A* (WHCA*)</option>
                  <option value="astar">Standard Independent A* (Baseline)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Trials per Count:</label>
                <select
                  value={trialsPerCount}
                  onChange={(e) => setTrialsPerCount(Number(e.target.value))}
                  disabled={isRunning}
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value={1}>1 Trial (Fast)</option>
                  <option value={3}>3 Trials (Recommended)</option>
                  <option value={5}>5 Trials (High Precision)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fleet Sizes:</label>
                <span className="font-mono text-cyan-400 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                  [1, 2, 4, 6, 8, 10] AMRs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStartBenchmark}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running Trials ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Benchmark Experiments</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExport}
                disabled={aggregates.length === 0 || isRunning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 text-xs font-medium transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Progress Status Bar */}
          {isRunning && (
            <div className="p-3 bg-slate-950/80 border border-cyan-800/60 rounded-lg space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-mono text-cyan-400">{statusMessage}</span>
                <span className="font-mono font-bold text-cyan-300">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Table & Charts */}
          {aggregates.length > 0 && (
            <div className="space-y-6">
              {/* Aggregates Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                <div className="p-3 bg-slate-950 border-b border-slate-800 font-semibold text-slate-200 flex items-center justify-between">
                  <span>Measured Benchmark Aggregates ({aggregates[0].algorithm})</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    High-Resolution Monotonic Clock (performance.now)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">AMR Count</th>
                        <th className="p-2.5">Success Rate</th>
                        <th className="p-2.5">Avg Plan Time (ms)</th>
                        <th className="p-2.5">Min / Max (ms)</th>
                        <th className="p-2.5">Avg Nodes Expanded</th>
                        <th className="p-2.5">Avg Path Length</th>
                        <th className="p-2.5">Avg Wait Steps</th>
                        <th className="p-2.5">Throughput</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {aggregates.map((agg) => (
                        <tr key={agg.robotCount} className="hover:bg-slate-900/40">
                          <td className="p-2.5 font-bold text-cyan-400">{agg.robotCount} Robots</td>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                agg.successRate === 100
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-amber-950 text-amber-400'
                              }`}
                            >
                              {agg.successRate}%
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-100">{agg.avgPlanningTimeMs} ms</td>
                          <td className="p-2.5 text-slate-400">
                            {agg.minPlanningTimeMs} / {agg.maxPlanningTimeMs} ms
                          </td>
                          <td className="p-2.5 text-purple-400">{agg.avgNodesExpanded}</td>
                          <td className="p-2.5">{agg.avgPathLength} cells</td>
                          <td className="p-2.5 text-amber-400">{agg.avgWaitSteps}</td>
                          <td className="p-2.5 text-emerald-400 font-bold">{agg.avgThroughput}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Benchmark Charts Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="font-semibold text-slate-200 mb-2 flex items-center justify-between">
                    <span>Planning Computation Time vs Robot Count</span>
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={aggregates}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="robotCount"
                          stroke="#64748b"
                          fontSize={10}
                          tickFormatter={(v) => `${v} AMRs`}
                        />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            fontSize: '11px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line
                          type="monotone"
                          dataKey="avgPlanningTimeMs"
                          name="Avg Time (ms)"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="font-semibold text-slate-200 mb-2 flex items-center justify-between">
                    <span>Expanded Nodes vs Robot Count</span>
                    <Cpu className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aggregates}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="robotCount"
                          stroke="#64748b"
                          fontSize={10}
                          tickFormatter={(v) => `${v} AMRs`}
                        />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            fontSize: '11px',
                          }}
                        />
                        <Bar
                          dataKey="avgNodesExpanded"
                          name="Avg Nodes"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {aggregates.length === 0 && !isRunning && (
            <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
              <BarChart3 className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-medium text-slate-300">Ready to execute benchmark experiments</div>
              <p className="text-slate-500 max-w-md mx-auto text-[11px]">
                Click "Run Benchmark Experiments" above to systematically simulate 1, 2, 4, 6, 8,
                and 10 robots, recording real execution metrics with zero synthetic values.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 px-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-slate-400 text-[11px]">
          <span>Autonomous Robotics Simulator • Benchmarking Suite</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Benchmark
          </button>
        </div>
      </div>
    </div>
  );
};
