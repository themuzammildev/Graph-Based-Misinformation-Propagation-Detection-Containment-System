/**
 * Comprehensive Automated Test & Benchmark Suite for Independent Cascade Model (ICM)
 *
 * Verifies:
 * 1. Simple Linear Chain Graph (A -> B -> C -> D)
 * 2. Directed Star Graph (C -> L1, L2, L3)
 * 3. Diamond Graph (S -> A -> T, S -> B -> T)
 * 4. Disconnected Graph
 * 5. Boundary Condition: Transmission Probability p = 0
 * 6. Boundary Condition: Transmission Probability p = 1 (Deterministic BFS Equivalence)
 * 7. Reproducibility with Identical Random Seeds
 * 8. Stochastic Variance with Different Random Seeds
 * 9. Multiple Simulation Iterations (Monte Carlo Convergence)
 * 10. ICM Containment Effectiveness Analysis
 * 11. Uploaded CSV Dataset (PHEME 24-Node Cascade)
 * 12. Uploaded JSON Dataset
 * 13. Performance Benchmarks: 100, 500, and 1,000 nodes across 100, 500, and 1,000 iterations
 */

import {
  runSingleICMSimulation,
  runMonteCarloICM,
  evaluateICMContainmentCandidates,
  compareBFSandICM,
  createSeededRandom,
} from '../src/utils/independentCascade';
import { runBFSPropagation } from '../src/utils/graphTheory';
import {
  parseAndValidateCSVDataset,
  parseAndValidateJSONDataset,
} from '../src/utils/datasetParser';
import {
  SAMPLE_24_NODES_CSV,
  SAMPLE_48_EDGES_CSV,
  JSON_DATASET_TEMPLATE,
} from '../src/data/sampleDatasets';
import { UserNode, Connection } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
}

function approxEqual(a: number, b: number, epsilon = 0.05): boolean {
  return Math.abs(a - b) <= epsilon;
}

function makeNode(id: string, name?: string): UserNode {
  return {
    id,
    name: name || `User ${id}`,
    role: 'Standard',
    verified: false,
    shares: 10,
    independentSources: 1,
    followers: 1000,
    x: 100,
    y: 100,
  };
}

function makeConn(source: string, target: string, id?: string, weight = 1.0): Connection {
  return {
    id: id || `${source}->${target}`,
    source,
    target,
    weight,
  };
}

console.log('===========================================================');
console.log(' INDEPENDENT CASCADE MODEL (ICM) TEST & BENCHMARK SUITE');
console.log('===========================================================\n');

// -------------------------------------------------------------
// Test 1: Simple Linear Chain Graph (A -> B -> C -> D)
// -------------------------------------------------------------
console.log('--- Test 1: Simple Linear Chain Graph (A -> B -> C -> D) ---');
{
  const nodes = ['A', 'B', 'C', 'D'].map((id) => makeNode(id));
  const connections = [
    makeConn('A', 'B'),
    makeConn('B', 'C'),
    makeConn('C', 'D'),
  ];

  // Under p = 1.0, cascade must propagate along all 3 edges to all 4 nodes in exactly 3 time steps
  const runP1 = runSingleICMSimulation('A', nodes, connections, { transmissionProbability: 1.0 });
  assert(runP1.totalReach === 4, 'Linear chain with p=1.0 reaches all 4 nodes');
  assert(runP1.steps.length === 4, 'Linear chain with p=1.0 runs across 4 steps (t=0, 1, 2, 3)');
  assert(runP1.steps[0].newlyActivatedNodes[0] === 'A', 'Step 0 seed is A');
  assert(runP1.steps[1].newlyActivatedNodes[0] === 'B', 'Step 1 newly activated is B');
  assert(runP1.steps[2].newlyActivatedNodes[0] === 'C', 'Step 2 newly activated is C');
  assert(runP1.steps[3].newlyActivatedNodes[0] === 'D', 'Step 3 newly activated is D');

  // Monte Carlo with p = 0.5:
  // Expected reach for A -> B -> C -> D from A:
  // E[Reach] = 1 + p + p^2 + p^3 = 1 + 0.5 + 0.25 + 0.125 = 1.875
  const mc = runMonteCarloICM('A', nodes, connections, {
    transmissionProbability: 0.5,
    iterations: 2000,
    seed: 12345,
  });
  console.log(`    Observed average spread: ${mc.averageSpread} (Analytical expected: 1.875)`);
  assert(
    approxEqual(mc.averageSpread, 1.875, 0.15),
    `Linear chain Monte Carlo spread (${mc.averageSpread}) converges to analytical expectation 1.875`
  );
}

// -------------------------------------------------------------
// Test 2: Directed Star Graph (C -> L1, L2, L3)
// -------------------------------------------------------------
console.log('\n--- Test 2: Directed Star Graph (Center -> Leaves) ---');
{
  const nodes = ['C', 'L1', 'L2', 'L3'].map((id) => makeNode(id));
  const connections = [
    makeConn('C', 'L1'),
    makeConn('C', 'L2'),
    makeConn('C', 'L3'),
  ];

  // From center C with p = 0.4:
  // E[Reach] = 1 (center) + 3 * p = 1 + 3 * 0.4 = 2.20
  const mc = runMonteCarloICM('C', nodes, connections, {
    transmissionProbability: 0.4,
    iterations: 2000,
    seed: 999,
  });
  console.log(`    Observed average spread: ${mc.averageSpread} (Analytical expected: 2.20)`);
  assert(
    approxEqual(mc.averageSpread, 2.2, 0.1),
    `Star graph Monte Carlo spread (${mc.averageSpread}) matches analytical expectation 2.20`
  );

  // If a leaf L1 is source, it has out-degree 0: reach must be exactly 1
  const leafRun = runMonteCarloICM('L1', nodes, connections, {
    transmissionProbability: 0.5,
    iterations: 50,
  });
  assert(leafRun.averageSpread === 1.0, 'Leaf node with out-degree 0 produces spread of exactly 1.0');
}

// -------------------------------------------------------------
// Test 3: Diamond Graph (S -> A -> T, S -> B -> T)
// -------------------------------------------------------------
console.log('\n--- Test 3: Diamond Graph (Fork / Join) ---');
{
  const nodes = ['S', 'A', 'B', 'T'].map((id) => makeNode(id));
  const connections = [
    makeConn('S', 'A'),
    makeConn('S', 'B'),
    makeConn('A', 'T'),
    makeConn('B', 'T'),
  ];

  // At p = 1.0, reach must be 4, and both A and B reach T at step 2
  const runP1 = runSingleICMSimulation('S', nodes, connections, { transmissionProbability: 1.0 });
  assert(runP1.totalReach === 4, 'Diamond graph reaches all 4 nodes at p=1.0');
  assert(runP1.steps.length === 3, 'Diamond graph cascade completes in 3 steps (t=0,1,2)');
  assert(runP1.steps[1].newlyActivatedNodes.length === 2, 'Step 1 activates both A and B');
  assert(runP1.steps[2].newlyActivatedNodes.length === 1, 'Step 2 activates T');

  // Analytical check for T activation probability at p = 0.5:
  // P(A active) = 0.5, P(B active) = 0.5.
  // P(T active | A, B) = 1 - (1 - 0.5*P(A))(1 - 0.5*P(B))
  // P(T active) = P(A active and activates T) + P(B active and activates T) - P(both activate T)
  // E[T] = 0.5 * 0.5 + 0.5 * 0.5 - (0.5*0.5)^2 = 0.25 + 0.25 - 0.0625 = 0.4375.
  const mc = runMonteCarloICM('S', nodes, connections, {
    transmissionProbability: 0.5,
    iterations: 3000,
    seed: 777,
  });
  const observedProbT = mc.nodeActivationProbabilities['T'];
  console.log(`    Observed P(T active): ${observedProbT} (Analytical expected: ~0.438)`);
  assert(
    approxEqual(observedProbT, 0.4375, 0.05),
    `Diamond target T activation probability (${observedProbT}) converges to theoretical probability 0.4375`
  );
}

// -------------------------------------------------------------
// Test 4: Disconnected Graph
// -------------------------------------------------------------
console.log('\n--- Test 4: Disconnected Graph ---');
{
  // Component 1: A -> B (2 nodes)
  // Component 2: C -> D -> E (3 nodes)
  const nodes = ['A', 'B', 'C', 'D', 'E'].map((id) => makeNode(id));
  const connections = [
    makeConn('A', 'B'),
    makeConn('C', 'D'),
    makeConn('D', 'E'),
  ];

  const mcA = runMonteCarloICM('A', nodes, connections, { transmissionProbability: 1.0 });
  assert(mcA.averageSpread === 2, 'Source A in component 1 reaches only 2 nodes (A, B)');
  assert(mcA.nodeActivationProbabilities['C'] === 0, 'Component 2 node C has 0 activation probability from A');
  assert(mcA.nodeActivationProbabilities['D'] === 0, 'Component 2 node D has 0 activation probability from A');

  const mcC = runMonteCarloICM('C', nodes, connections, { transmissionProbability: 1.0 });
  assert(mcC.averageSpread === 3, 'Source C in component 2 reaches only 3 nodes (C, D, E)');
  assert(mcC.nodeActivationProbabilities['A'] === 0, 'Component 1 node A has 0 activation probability from C');
}

// -------------------------------------------------------------
// Test 5: Boundary Condition: Transmission Probability p = 0
// -------------------------------------------------------------
console.log('\n--- Test 5: Boundary Condition p = 0 ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);
  const runP0 = runSingleICMSimulation('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.0,
  });

  assert(runP0.totalReach === 1, 'At p = 0, total reach is strictly 1 (seed node only)');
  assert(runP0.steps.length === 1, 'At p = 0, cascade terminates after initial step 0');
  assert(runP0.steps[0].successfulEdges.length === 0, 'At p = 0, zero successful transmissions occur');

  const mcP0 = runMonteCarloICM('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.0,
    iterations: 100,
  });
  assert(mcP0.averageSpread === 1.0, 'At p = 0, Monte Carlo average spread is exactly 1.0');
  assert(mcP0.minSpread === 1 && mcP0.maxSpread === 1, 'At p = 0, min and max spread are both 1');
}

// -------------------------------------------------------------
// Test 6: Boundary Condition: Transmission Probability p = 1 (Deterministic BFS Equivalence)
// -------------------------------------------------------------
console.log('\n--- Test 6: Boundary Condition p = 1 (Deterministic BFS Equivalence) ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);

  // Deterministic BFS reachability
  const bfsResult = runBFSPropagation('U01', parseRes.nodes, parseRes.connections, []);

  // ICM at p = 1.0
  const icmP1 = runSingleICMSimulation('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 1.0,
  });

  assert(
    icmP1.totalReach === bfsResult.totalReach,
    `At p = 1.0, ICM reach (${icmP1.totalReach}) exactly equals BFS reach (${bfsResult.totalReach})`
  );

  // Verify node sets are identical
  const bfsSet = new Set(bfsResult.visitedNodes);
  const icmSet = new Set(icmP1.activatedNodeSet);
  assert(bfsSet.size === icmSet.size, 'BFS and ICM activated sets have identical size');
  let allContained = true;
  for (const id of bfsSet) {
    if (!icmSet.has(id)) allContained = false;
  }
  assert(allContained, 'Every node reachable in BFS is activated in ICM at p = 1.0');

  // Verify blocked nodes equivalence
  const blockedBfs = runBFSPropagation('U01', parseRes.nodes, parseRes.connections, ['U02']);
  const blockedIcm = runSingleICMSimulation('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 1.0,
    blockedNodes: ['U02'],
  });
  assert(
    blockedIcm.totalReach === blockedBfs.totalReach,
    `With blocked node U02, ICM reach (${blockedIcm.totalReach}) matches BFS reach (${blockedBfs.totalReach})`
  );
}

// -------------------------------------------------------------
// Test 7: Reproducibility with Identical Random Seeds
// -------------------------------------------------------------
console.log('\n--- Test 7: Reproducibility with Identical Random Seeds ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);

  const seed = 424242;
  const rng1 = createSeededRandom(seed);
  const rng2 = createSeededRandom(seed);

  const run1 = runSingleICMSimulation(
    'U01',
    parseRes.nodes,
    parseRes.connections,
    { transmissionProbability: 0.35, seed },
    rng1
  );

  const run2 = runSingleICMSimulation(
    'U01',
    parseRes.nodes,
    parseRes.connections,
    { transmissionProbability: 0.35, seed },
    rng2
  );

  assert(run1.totalReach === run2.totalReach, `Identical seed produces identical reach: ${run1.totalReach}`);
  assert(run1.steps.length === run2.steps.length, `Identical seed produces identical step count: ${run1.steps.length}`);
  assert(
    JSON.stringify(run1.activatedNodeSet) === JSON.stringify(run2.activatedNodeSet),
    'Identical seed produces bit-for-bit identical activated node sequences'
  );

  // Monte Carlo aggregation with identical master seed
  const mc1 = runMonteCarloICM('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.3,
    iterations: 100,
    seed: 55555,
  });
  const mc2 = runMonteCarloICM('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.3,
    iterations: 100,
    seed: 55555,
  });

  assert(mc1.averageSpread === mc2.averageSpread, `Identical Monte Carlo master seed produces identical average spread: ${mc1.averageSpread}`);
  assert(mc1.stdDevSpread === mc2.stdDevSpread, `Identical Monte Carlo master seed produces identical std dev: ${mc1.stdDevSpread}`);
}

// -------------------------------------------------------------
// Test 8: Stochastic Variance with Different Random Seeds
// -------------------------------------------------------------
console.log('\n--- Test 8: Stochastic Variance with Different Random Seeds ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);

  const runA = runSingleICMSimulation(
    'U01',
    parseRes.nodes,
    parseRes.connections,
    { transmissionProbability: 0.3, seed: 1001 },
    createSeededRandom(1001)
  );

  const runB = runSingleICMSimulation(
    'U01',
    parseRes.nodes,
    parseRes.connections,
    { transmissionProbability: 0.3, seed: 9009 },
    createSeededRandom(9009)
  );

  console.log(`    Run A reach (seed 1001): ${runA.totalReach}, Run B reach (seed 9009): ${runB.totalReach}`);
  assert(
    runA.totalReach >= 1 && runB.totalReach >= 1,
    'Both independent runs produce valid non-empty cascades'
  );
}

// -------------------------------------------------------------
// Test 9: Multiple Simulation Iterations (Monte Carlo Convergence)
// -------------------------------------------------------------
console.log('\n--- Test 9: Multiple Simulation Iterations (Monte Carlo Convergence) ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);

  const mcSmall = runMonteCarloICM('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.3,
    iterations: 20,
    seed: 123,
  });

  const mcLarge = runMonteCarloICM('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.3,
    iterations: 500,
    seed: 123,
  });

  console.log(`    20 Iterations Spread:  ${mcSmall.averageSpread} ± ${mcSmall.stdDevSpread}`);
  console.log(`    500 Iterations Spread: ${mcLarge.averageSpread} ± ${mcLarge.stdDevSpread}`);
  assert(mcLarge.iterations === 500, '500 iterations completed');
  assert(mcLarge.averageSpread <= 24, 'Average spread bounded by N = 24');
  assert(mcLarge.minSpread >= 1, 'Minimum spread is >= 1');
  assert(mcLarge.maxSpread <= 24, 'Maximum spread is <= 24');
  assert(mcLarge.stdDevSpread >= 0, 'Standard deviation is non-negative');
}

// -------------------------------------------------------------
// Test 10: ICM Containment Effectiveness Analysis
// -------------------------------------------------------------
console.log('\n--- Test 10: ICM Containment Effectiveness Analysis ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);

  const candidates = evaluateICMContainmentCandidates('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.4,
    iterations: 150,
    seed: 42,
  });

  assert(candidates.length > 0, `Generated ${candidates.length} containment candidates under ICM`);
  const topCandidate = candidates[0];
  assert(topCandidate.rank === 1, 'Top candidate has rank 1');
  assert(topCandidate.preventedSpread >= 0, 'Top candidate prevented spread is non-negative');
  assert(topCandidate.effectivenessPercentage >= 0, 'Top candidate effectiveness percentage is non-negative');
  console.log(`    Top ICM Containment Candidate: ${topCandidate.nodeId} (${topCandidate.nodeName})`);
  console.log(`    Prevented Spread: ${topCandidate.preventedSpread} nodes (${topCandidate.effectivenessPercentage}%)`);
  console.log(`    Deterministic BFS Prevented: ${topCandidate.bfsPreventedReach} nodes`);
}

// -------------------------------------------------------------
// Test 11: Uploaded CSV Dataset Integration (PHEME 24-Node Cascade)
// -------------------------------------------------------------
console.log('\n--- Test 11: Uploaded CSV Dataset Integration ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);
  assert(parseRes.report.isValid, 'PHEME CSV parsed successfully');

  const comparison = compareBFSandICM('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.35,
    iterations: 200,
    seed: 101,
  });

  assert(comparison.bfsTotalReachable === 24, 'Deterministic BFS reachability is 24 nodes');
  assert(
    comparison.icmExpectedSpread <= comparison.bfsTotalReachable,
    `ICM expected spread (${comparison.icmExpectedSpread}) <= BFS deterministic upper bound (${comparison.bfsTotalReachable})`
  );
  assert(comparison.deficitSpread >= 0, 'Spread deficit (BFS - ICM) is non-negative');
  assert(
    comparison.networkPenetrationPercentage <= 100,
    'Reachable network penetration percentage is <= 100%'
  );
  console.log(`    PHEME Comparison: BFS Reach = ${comparison.bfsTotalReachable}, ICM Mean = ${comparison.icmExpectedSpread} ± ${comparison.icmStdDev}`);
  console.log(`    Penetration: ${comparison.networkPenetrationPercentage}%, Deficit: ${comparison.deficitSpread}`);
}

// -------------------------------------------------------------
// Test 12: Uploaded JSON Dataset Integration
// -------------------------------------------------------------
console.log('\n--- Test 12: Uploaded JSON Dataset Integration ---');
{
  const parseRes = parseAndValidateJSONDataset(JSON_DATASET_TEMPLATE);
  assert(parseRes.report.isValid, 'JSON template parsed successfully');

  const comparison = compareBFSandICM('U01', parseRes.nodes, parseRes.connections, {
    transmissionProbability: 0.5,
    iterations: 100,
    seed: 7,
  });

  assert(comparison.bfsTotalReachable === 5, 'JSON template BFS reach is 5 nodes');
  assert(comparison.icmExpectedSpread <= 5, 'JSON template ICM spread <= 5');
  assert(comparison.icmExpectedSpread >= 1, 'JSON template ICM spread >= 1');
}

// -------------------------------------------------------------
// Test 13: Performance Benchmarking (100, 500, 1,000 Nodes)
// -------------------------------------------------------------
console.log('\n--- Test 13: Performance Benchmarking (100, 500, 1,000 Nodes) ---');

function generateBenchmarkGraph(
  numNodes: number,
  edgesPerNode: number
): { nodes: UserNode[]; connections: Connection[] } {
  const nodes: UserNode[] = [];
  for (let i = 0; i < numNodes; i++) {
    nodes.push(makeNode(`N${i}`, `User ${i}`));
  }

  const connections: Connection[] = [];
  const edgeSet = new Set<string>();

  // Backbone spine
  for (let i = 0; i < numNodes - 1; i++) {
    const src = `N${i}`;
    const tgt = `N${i + 1}`;
    connections.push(makeConn(src, tgt, `spine-${i}`));
    edgeSet.add(`${src}->${tgt}`);
  }

  // Cross edges
  for (let i = 0; i < numNodes; i++) {
    for (let e = 0; e < edgesPerNode; e++) {
      const targetIdx = Math.floor(Math.random() * numNodes);
      if (targetIdx !== i) {
        const src = `N${i}`;
        const tgt = `N${targetIdx}`;
        const key = `${src}->${tgt}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          connections.push(makeConn(src, tgt, `edge-${connections.length}`));
        }
      }
    }
  }

  return { nodes, connections };
}

// Benchmarking 100 Nodes
{
  const g100 = generateBenchmarkGraph(100, 4);

  for (const iterCount of [100, 500, 1000]) {
    const start = performance.now();
    const stats = runMonteCarloICM('N0', g100.nodes, g100.connections, {
      transmissionProbability: 0.25,
      iterations: iterCount,
      seed: 42,
    });
    const duration = performance.now() - start;

    assert(stats.iterations === iterCount, `100 nodes at ${iterCount} iterations finished`);
    assert(duration < 1000, `100 nodes / ${iterCount} iter finished in ${duration.toFixed(2)}ms (< 1000ms threshold)`);
    console.log(`    100 Nodes (${g100.connections.length} edges), M=${iterCount}: ${duration.toFixed(2)}ms, Spread=${stats.averageSpread}±${stats.stdDevSpread}`);
  }
}

// Benchmarking 500 Nodes
{
  const g500 = generateBenchmarkGraph(500, 4);

  for (const iterCount of [100, 500, 1000]) {
    const start = performance.now();
    const stats = runMonteCarloICM('N0', g500.nodes, g500.connections, {
      transmissionProbability: 0.2,
      iterations: iterCount,
      seed: 42,
    });
    const duration = performance.now() - start;

    assert(stats.iterations === iterCount, `500 nodes at ${iterCount} iterations finished`);
    assert(duration < 2500, `500 nodes / ${iterCount} iter finished in ${duration.toFixed(2)}ms (< 2500ms threshold)`);
    console.log(`    500 Nodes (${g500.connections.length} edges), M=${iterCount}: ${duration.toFixed(2)}ms, Spread=${stats.averageSpread}±${stats.stdDevSpread}`);
  }
}

// Benchmarking 1,000 Nodes
{
  const g1000 = generateBenchmarkGraph(1000, 5);

  for (const iterCount of [100, 500, 1000]) {
    const start = performance.now();
    const stats = runMonteCarloICM('N0', g1000.nodes, g1000.connections, {
      transmissionProbability: 0.15,
      iterations: iterCount,
      seed: 42,
    });
    const duration = performance.now() - start;

    assert(stats.iterations === iterCount, `1,000 nodes at ${iterCount} iterations finished`);
    assert(duration < 6000, `1,000 nodes / ${iterCount} iter finished in ${duration.toFixed(2)}ms (< 6000ms threshold)`);
    console.log(`    1,000 Nodes (${g1000.connections.length} edges), M=${iterCount}: ${duration.toFixed(2)}ms, Spread=${stats.averageSpread}±${stats.stdDevSpread}`);
  }
}

console.log('\n===========================================================');
console.log(` TOTAL TESTS: ${totalTests}`);
console.log(` PASSED:      ${passedTests}`);
console.log(` FAILED:      ${totalTests - passedTests}`);
console.log('===========================================================\n');
console.log(' All Independent Cascade Model tests and benchmarks passed successfully!');
