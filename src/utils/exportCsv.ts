import { BenchmarkAggregate, BenchmarkTrial } from '../types';

export function exportBenchmarkToCsv(
  aggregates: BenchmarkAggregate[],
  rawTrials: BenchmarkTrial[]
): void {
  let csvContent = 'data:text/csv;charset=utf-8,';

  // Section 1: Aggregate Results
  csvContent += '--- BENCHMARK EXPERIMENT AGGREGATES ---\r\n';
  csvContent += 'Robot Count,Algorithm,Runs,Success Rate (%),Avg Planning Time (ms),Min Planning Time (ms),Max Planning Time (ms),Avg Nodes Expanded,Avg Path Length,Avg Wait Steps,Throughput (del/100 ticks)\r\n';

  aggregates.forEach((agg) => {
    const row = [
      agg.robotCount,
      agg.algorithm,
      agg.runs,
      agg.successRate,
      agg.avgPlanningTimeMs,
      agg.minPlanningTimeMs,
      agg.maxPlanningTimeMs,
      agg.avgNodesExpanded,
      agg.avgPathLength,
      agg.avgWaitSteps,
      agg.avgThroughput,
    ].join(',');
    csvContent += row + '\r\n';
  });

  csvContent += '\r\n--- DETAILED TRIAL SAMPLES ---\r\n';
  csvContent += 'Robot Count,Scenario,Algorithm,Trial #,Success,Planning Time (ms),Nodes Expanded,Path Length,Wait Steps,Completed Tasks,Replans,Deadlocks\r\n';

  rawTrials.forEach((tr) => {
    const row = [
      tr.robotCount,
      `"${tr.scenarioName}"`,
      tr.algorithm,
      tr.trialNumber,
      tr.success,
      tr.planningTimeMs,
      tr.nodesExpanded,
      tr.pathLength,
      tr.waitSteps,
      tr.completedTasks,
      tr.replanningCount,
      tr.deadlocks,
    ].join(',');
    csvContent += row + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `warehouse_robot_benchmark_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
