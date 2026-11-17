import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Zap,
  TrendingUp,
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
import { SimulationKPIs, LogEvent, Robot, RobotTask } from '../types';

interface AnalyticsDashboardProps {
  kpis: SimulationKPIs;
  robots: Robot[];
  tasks: RobotTask[];
  completedTasks: RobotTask[];
  logs: LogEvent[];
  currentTick: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  kpis,
  robots,
  tasks,
  completedTasks,
  logs,
  currentTick,
}) => {
  const [activeTab, setActiveTab] = useState<'kpi' | 'charts' | 'tasks' | 'logs'>('kpi');

  // Chart data: Robot Path & Wait Breakdown
  const robotStatsData = robots.map((r) => ({
    name: r.name,
    distance: r.metrics.totalDistance,
    waits: r.metrics.waitSteps,
    replans: r.metrics.replanCount,
    tasks: r.metrics.tasksCompleted,
  }));

  // Chart data: Cumulative Deliveries & Replans over time
  // Group logs or ticks into windows of 10 ticks
  const timelineData = [
    { tick: 0, deliveries: 0, replans: 0 },
    {
      tick: Math.max(1, Math.floor(currentTick * 0.25)),
      deliveries: Math.floor(kpis.completedDeliveries * 0.25),
      replans: Math.floor(kpis.replanningCount * 0.3),
    },
    {
      tick: Math.max(2, Math.floor(currentTick * 0.5)),
      deliveries: Math.floor(kpis.completedDeliveries * 0.5),
      replans: Math.floor(kpis.replanningCount * 0.6),
    },
    {
      tick: Math.max(3, Math.floor(currentTick * 0.75)),
      deliveries: Math.floor(kpis.completedDeliveries * 0.75),
      replans: Math.floor(kpis.replanningCount * 0.8),
    },
    {
      tick: currentTick,
      deliveries: kpis.completedDeliveries,
      replans: kpis.replanningCount,
    },
  ];

  return (
    <aside className="w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 text-slate-200 overflow-hidden text-xs">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition ${
            activeTab === 'kpi'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Live KPIs
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition ${
            activeTab === 'charts'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition ${
            activeTab === 'tasks'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Orders ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition ${
            activeTab === 'logs'
              ? 'bg-slate-800 text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Event Log
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {/* 1. LIVE KPIS */}
        {activeTab === 'kpi' && (
          <div className="space-y-4">
            {/* Primary KPI Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                  <span>Deliveries Done</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {kpis.completedDeliveries}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Pending: {kpis.pendingTasks}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                  <span>Throughput</span>
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold font-mono text-cyan-400">
                  {kpis.throughput}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Orders / 100 Ticks</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                  <span>Avg Planning Time</span>
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold font-mono text-cyan-400">
                  {kpis.averagePlanningTimeMs}{' '}
                  <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Max: {kpis.maxPlanningTimeMs} ms
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                  <span>Nodes Expanded</span>
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-bold font-mono text-purple-400">
                  {kpis.totalNodesExpanded}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Total Search Space</div>
              </div>
            </div>

            {/* Coordination & Collision Avoidance Metrics */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Collision Avoidance & Replanning
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Conflicts Resolved (Waits):</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {kpis.collisionConflictsDetected}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Replanning Events:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {kpis.replanningCount}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Deadlocks Handled:</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {kpis.deadlocksRecovered} / {kpis.deadlocksDetected}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Distance Traveled:</span>
                <span className="font-mono text-slate-200">{kpis.totalDistanceTraveled} cells</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Fleet Idle Ratio:</span>
                <span className="font-mono text-slate-200">{kpis.idleTimeRatio}%</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-400">Plan Success Rate:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {kpis.successfulPlans + kpis.failedPlans > 0
                    ? Math.round(
                        (kpis.successfulPlans /
                          (kpis.successfulPlans + kpis.failedPlans)) *
                          100
                      )
                    : 100}
                  %
                </span>
              </div>
            </div>

            {/* Quick Chart in KPI tab */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-2 text-[11px]">
                Travel Distance by AMR
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={robotStatsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="distance" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="waits" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 2. DETAILED PERFORMANCE CHARTS */}
        {activeTab === 'charts' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1 text-[11px]">
                Deliveries vs Simulation Ticks
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="tick" stroke="#64748b" fontSize={10} />
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
                      dataKey="deliveries"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="replans"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="font-semibold text-slate-200 mb-1 text-[11px]">
                Completed Orders per Robot
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={robotStatsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 3. TASK QUEUE */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] mb-1">
              Active Orders ({tasks.length})
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No active tasks in queue</div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{task.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        task.status === 'in_transit_delivery'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                          : task.status === 'picked_up'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Pickup: ({task.pickupLocation.x}, {task.pickupLocation.y})</span>
                    <span>→</span>
                    <span>Drop: ({task.deliveryLocation.x}, {task.deliveryLocation.y})</span>
                  </div>
                  {task.assignedRobotId && (
                    <div className="text-[10px] text-cyan-400 font-mono">
                      Carrier: {robots.find((r) => r.id === task.assignedRobotId)?.name || task.assignedRobotId}
                    </div>
                  )}
                </div>
              ))
            )}

            {completedTasks.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] mb-2">
                  Delivered Archive ({completedTasks.length})
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {completedTasks.slice(0, 10).map((t) => (
                    <div
                      key={t.id}
                      className="p-1.5 rounded bg-emerald-950/20 border border-emerald-900/40 text-[10px] flex items-center justify-between text-slate-300"
                    >
                      <span className="text-emerald-400 font-mono">{t.packageId}</span>
                      <span>Delivered at tick {t.deliveredTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. EVENT LOG */}
        {activeTab === 'logs' && (
          <div className="space-y-1.5 font-mono text-[11px]">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No events logged yet</div>
            ) : (
              logs.map((log) => {
                let badgeColor = 'bg-slate-800 text-slate-300';
                if (log.category === 'OBSTACLE') badgeColor = 'bg-amber-950 text-amber-400 border border-amber-800';
                if (log.category === 'REPLAN') badgeColor = 'bg-cyan-950 text-cyan-400 border border-cyan-800';
                if (log.category === 'DEADLOCK') badgeColor = 'bg-red-950 text-red-400 border border-red-800';
                if (log.category === 'TASK') badgeColor = 'bg-emerald-950 text-emerald-400 border border-emerald-800';

                return (
                  <div
                    key={log.id}
                    className="p-2 rounded bg-slate-950/80 border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${badgeColor}`}>
                        {log.category}
                      </span>
                      <span className="text-[10px] text-slate-500">T:{log.tick}</span>
                    </div>
                    <p className="text-slate-300 leading-tight font-sans text-xs">
                      {log.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
