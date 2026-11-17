import { describe, it, expect } from 'vitest';
import { runBenchmarkSuite } from '../src/analytics/BenchmarkRunner';

describe('Benchmark Suite & Metric Calculations', () => {
  it('should run benchmark trials and produce valid measured aggregates', async () => {
    const { aggregates, rawTrials } = await runBenchmarkSuite({
      robotCounts: [1, 2],
      trialsPerCount: 1,
      algorithm: 'cooperative_astar',
      maxPlanningHorizon: 40,
    });

    expect(aggregates.length).toBe(2);
    expect(rawTrials.length).toBe(2);

    // Verify properties of aggregate metrics
    const agg1 = aggregates[0];
    expect(agg1.robotCount).toBe(1);
    expect(agg1.runs).toBe(1);
    expect(agg1.successRate).toBeGreaterThanOrEqual(0);
    expect(agg1.avgPlanningTimeMs).toBeGreaterThanOrEqual(0);
    expect(agg1.avgNodesExpanded).toBeGreaterThan(0);
    expect(agg1.avgPathLength).toBeGreaterThan(0);

    const agg2 = aggregates[1];
    expect(agg2.robotCount).toBe(2);
    expect(agg2.runs).toBe(1);
  });
});
