import { UserNode, Connection } from '../src/types';
import {
  calculateGraphDerivedParameters,
  calculateEnhancedRecurrencePrediction,
  evaluateRecurrenceContainmentCandidates,
} from '../src/utils/recurrenceModel';
import { parseAndValidateCSVDataset, parseAndValidateJSONDataset } from '../src/utils/datasetParser';
import {
  SAMPLE_24_NODES_CSV,
  SAMPLE_48_EDGES_CSV,
  JSON_DATASET_TEMPLATE,
} from '../src/data/sampleDatasets';

let totalTests = 0;
let passedTests = 0;

function makeNode(id: string, name: string, followers = 10, verified = false): UserNode {
  return {
    id,
    name,
    role: 'user',
    verified,
    shares: 0,
    independentSources: 1,
    followers,
    x: 0,
    y: 0,
  };
}

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('===========================================================');
console.log(' GRAPH-DERIVED RECURRENCE PREDICTION TEST & BENCHMARK SUITE');
console.log('===========================================================\n');

// ---------------------------------------------------------------------
// Test 1: Simple Linear Chain Graph (A -> B -> C -> D)
// ---------------------------------------------------------------------
console.log('--- Test 1: Simple Linear Chain Graph (A -> B -> C -> D) ---');
const chainNodes: UserNode[] = [
  makeNode('A', 'Node A'),
  makeNode('B', 'Node B'),
  makeNode('C', 'Node C'),
  makeNode('D', 'Node D'),
];
const chainEdges: Connection[] = [
  { id: 'e1', source: 'A', target: 'B', weight: 1.0 },
  { id: 'e2', source: 'B', target: 'C', weight: 1.0 },
  { id: 'e3', source: 'C', target: 'D', weight: 1.0 },
];

const chainParams = calculateGraphDerivedParameters(chainNodes, chainEdges, 1.0, 'A');
assert(chainParams.totalVertices === 4, 'Chain has 4 vertices');
assert(chainParams.totalEdges === 3, 'Chain has 3 edges');
assert(chainParams.avgOutDegree === 0.75, 'Average out-degree is 3/4 = 0.75');
assert(chainParams.avgInDegree === 0.75, 'Average in-degree is 3/4 = 0.75');
assert(chainParams.sourceOutDegree === 1, 'Source A out-degree is 1');
assert(chainParams.rNaive === 0.75, 'r_naive at p=1.0 is 0.75');
// In-degrees: A:0, B:1, C:1, D:1; Out-degrees: A:1, B:1, C:1, D:0
// in*out: A:0, B:1, C:1, D:0 -> sum = 2 -> mean = 2/4 = 0.5
// r_degree = 0.5 / 0.75 = 2/3 ~ 0.6667
assert(Math.abs(chainParams.rDegree - 0.6667) < 0.001, 'Excess degree branching factor is ~0.6667');

const chainRec = calculateEnhancedRecurrencePrediction(chainNodes, chainEdges, {
  transmissionProbability: 1.0,
  sourceNodeId: 'A',
  branchingFactorType: 'degree',
});
assert(chainRec.dataPoints[0].predictedAffected === 1, 'Step 0 standard recurrence is S(0) = 1');
assert(chainRec.dataPoints[0].predictedLogisticAffected === 1, 'Step 0 logistic recurrence is 1');
assert(chainRec.finalPredictedStandard <= 4, 'Chain prediction is bounded by N = 4');
assert(chainRec.finalPredictedStandard >= 1, 'Chain prediction is non-negative and >= 1');

// ---------------------------------------------------------------------
// Test 2: Directed Star Graph (Center -> Leaves)
// ---------------------------------------------------------------------
console.log('\n--- Test 2: Directed Star Graph (Center -> Leaves) ---');
const starNodes: UserNode[] = [
  makeNode('C', 'Center', 100, true),
  makeNode('L1', 'Leaf 1', 5),
  makeNode('L2', 'Leaf 2', 5),
  makeNode('L3', 'Leaf 3', 5),
  makeNode('L4', 'Leaf 4', 5),
];
const starEdges: Connection[] = [
  { id: 's1', source: 'C', target: 'L1', weight: 1.0 },
  { id: 's2', source: 'C', target: 'L2', weight: 1.0 },
  { id: 's3', source: 'C', target: 'L3', weight: 1.0 },
  { id: 's4', source: 'C', target: 'L4', weight: 1.0 },
];

const starParams = calculateGraphDerivedParameters(starNodes, starEdges, 0.5, 'C');
assert(starParams.totalVertices === 5, 'Star has 5 vertices');
assert(starParams.totalEdges === 4, 'Star has 4 edges');
assert(starParams.avgOutDegree === 0.8, 'Star average out-degree is 4/5 = 0.8');
assert(starParams.sourceOutDegree === 4, 'Center out-degree is 4');
assert(starParams.rSource === 2.0, 'Center source branching factor is 0.5 * 4 = 2.0');
// Leaves have out-degree 0, center has in-degree 0 -> k_in * k_out = 0 for all nodes!
assert(starParams.rDegree === 0, 'Excess branching r_degree is 0 because leaves have no outgoing edges');

const starRec = calculateEnhancedRecurrencePrediction(starNodes, starEdges, {
  transmissionProbability: 0.5,
  sourceNodeId: 'C',
  branchingFactorType: 'source',
});
assert(starRec.dataPoints.every((pt) => isFinite(pt.predictedAffected)), 'All star predictions are finite');
assert(starRec.finalPredictedStandard <= 5, 'Star prediction bounded by N = 5');

// ---------------------------------------------------------------------
// Test 3: Diamond Graph (Fork / Join)
// ---------------------------------------------------------------------
console.log('\n--- Test 3: Diamond Graph (Fork / Join) ---');
const diamondNodes: UserNode[] = [
  makeNode('S', 'Source'),
  makeNode('A', 'Fork A'),
  makeNode('B', 'Fork B'),
  makeNode('T', 'Target'),
];
const diamondEdges: Connection[] = [
  { id: 'd1', source: 'S', target: 'A', weight: 1.0 },
  { id: 'd2', source: 'S', target: 'B', weight: 1.0 },
  { id: 'd3', source: 'A', target: 'T', weight: 1.0 },
  { id: 'd4', source: 'B', target: 'T', weight: 1.0 },
];
const diamondParams = calculateGraphDerivedParameters(diamondNodes, diamondEdges, 0.4, 'S');
assert(diamondParams.totalVertices === 4, 'Diamond has 4 vertices');
assert(diamondParams.totalEdges === 4, 'Diamond has 4 edges');
assert(diamondParams.avgOutDegree === 1.0, 'Average out-degree is 1.0');
assert(diamondParams.rNaive === 0.4, 'Naive branching factor is 0.4 * 1.0 = 0.4');

const diamondRec = calculateEnhancedRecurrencePrediction(diamondNodes, diamondEdges, {
  transmissionProbability: 0.4,
  sourceNodeId: 'S',
});
assert(diamondRec.maeStandard >= 0, 'MAE is non-negative');
assert(diamondRec.rmseStandard >= 0, 'RMSE is non-negative');

// ---------------------------------------------------------------------
// Test 4: Cyclic Graph (Directed 4-Cycle)
// ---------------------------------------------------------------------
console.log('\n--- Test 4: Cyclic Graph (Directed 4-Cycle) ---');
const cycleNodes: UserNode[] = [
  makeNode('C1', 'C1'),
  makeNode('C2', 'C2'),
  makeNode('C3', 'C3'),
  makeNode('C4', 'C4'),
];
const cycleEdges: Connection[] = [
  { id: 'cy1', source: 'C1', target: 'C2', weight: 1.0 },
  { id: 'cy2', source: 'C2', target: 'C3', weight: 1.0 },
  { id: 'cy3', source: 'C3', target: 'C4', weight: 1.0 },
  { id: 'cy4', source: 'C4', target: 'C1', weight: 1.0 },
];
const cycleParams = calculateGraphDerivedParameters(cycleNodes, cycleEdges, 0.5, 'C1');
assert(cycleParams.avgOutDegree === 1.0, 'Cycle average out-degree is exactly 1.0');
assert(cycleParams.outDegreeVariance === 0, 'Cycle out-degree variance is 0 (regular graph)');
assert(cycleParams.inOutCovariance === 0, 'Cycle degree covariance is 0');
assert(cycleParams.rDegree === 0.5, 'Cycle branching factor is 0.5');

// ---------------------------------------------------------------------
// Test 5: Disconnected Graph
// ---------------------------------------------------------------------
console.log('\n--- Test 5: Disconnected Graph ---');
const discNodes: UserNode[] = [
  makeNode('D1', 'D1'),
  makeNode('D2', 'D2'),
  makeNode('D3', 'D3'),
  makeNode('D4', 'D4'),
];
const discEdges: Connection[] = [
  { id: 'de1', source: 'D1', target: 'D2', weight: 1.0 },
  { id: 'de2', source: 'D3', target: 'D4', weight: 1.0 },
];
const discParams = calculateGraphDerivedParameters(discNodes, discEdges, 0.5, 'D1');
assert(discParams.totalVertices === 4, 'Disconnected graph has 4 vertices');
assert(discParams.totalEdges === 2, 'Disconnected graph has 2 edges');
assert(discParams.avgOutDegree === 0.5, 'Average out-degree is 0.5');

// ---------------------------------------------------------------------
// Test 6: Sparse Graph vs Dense Graph
// ---------------------------------------------------------------------
console.log('\n--- Test 6: Sparse vs Dense Graphs ---');
// Dense graph of 6 nodes (near complete: 6 * 5 = 30 edges)
const denseNodes: UserNode[] = [];
for (let i = 0; i < 6; i++) {
  denseNodes.push(makeNode(`DN${i}`, `Dense ${i}`));
}
const denseEdges: Connection[] = [];
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 6; j++) {
    if (i !== j) {
      denseEdges.push({ id: `de_${i}_${j}`, source: `DN${i}`, target: `DN${j}`, weight: 1.0 });
    }
  }
}
const denseParams = calculateGraphDerivedParameters(denseNodes, denseEdges, 0.3, 'DN0');
assert(denseParams.totalEdges === 30, 'Dense graph has 30 directed edges');
assert(denseParams.avgOutDegree === 5.0, 'Dense graph average out-degree is 5.0');
assert(denseParams.rNaive === 1.5, 'Dense graph branching factor at p=0.3 is 1.5');

const denseRec = calculateEnhancedRecurrencePrediction(denseNodes, denseEdges, {
  transmissionProbability: 0.3,
  sourceNodeId: 'DN0',
});
assert(denseRec.finalPredictedStandard <= 6, 'Dense recurrence strictly capped by N = 6');
assert(denseRec.finalPredictedLogistic <= 6, 'Dense logistic recurrence strictly capped by N = 6');

// ---------------------------------------------------------------------
// Test 7: Boundary Condition p = 0
// ---------------------------------------------------------------------
console.log('\n--- Test 7: Boundary Condition p = 0 ---');
const zeroRec = calculateEnhancedRecurrencePrediction(denseNodes, denseEdges, {
  transmissionProbability: 0.0,
  sourceNodeId: 'DN0',
});
assert(zeroRec.parameters.rNaive === 0, 'r_naive is 0 at p=0');
assert(zeroRec.parameters.rDegree === 0, 'r_degree is 0 at p=0');
assert(zeroRec.finalPredictedStandard === 1, 'At p=0, predicted spread is strictly 1 (seed only)');
assert(zeroRec.finalPredictedLogistic === 1, 'At p=0, logistic spread is strictly 1');
assert(
  zeroRec.dataPoints.every((pt) => pt.predictedAffected === 1),
  'At p=0, all recurrence steps remain at 1'
);

// ---------------------------------------------------------------------
// Test 8: Boundary Condition p = 1
// ---------------------------------------------------------------------
console.log('\n--- Test 8: Boundary Condition p = 1 ---');
const oneRec = calculateEnhancedRecurrencePrediction(denseNodes, denseEdges, {
  transmissionProbability: 1.0,
  sourceNodeId: 'DN0',
});
assert(oneRec.parameters.rNaive === 5.0, 'At p=1, r_naive equals average out-degree 5.0');
assert(oneRec.finalPredictedStandard === 6, 'At p=1, reaches all 6 nodes');
assert(oneRec.finalPredictedLogistic === 6, 'At p=1, logistic reaches all 6 nodes');

// ---------------------------------------------------------------------
// Test 9: Different Network Sizes (N = 10, 50, 100)
// ---------------------------------------------------------------------
console.log('\n--- Test 9: Different Network Sizes ---');
for (const nSize of [10, 50, 100]) {
  const gNodes: UserNode[] = [];
  const gEdges: Connection[] = [];
  for (let i = 0; i < nSize; i++) {
    gNodes.push(makeNode(`N${i}`, `Node ${i}`));
    if (i > 0) {
      gEdges.push({ id: `ge_${i}`, source: `N${i - 1}`, target: `N${i}`, weight: 1.0 });
    }
  }
  const rec = calculateEnhancedRecurrencePrediction(gNodes, gEdges, {
    transmissionProbability: 0.5,
    sourceNodeId: 'N0',
  });
  assert(rec.parameters.totalVertices === nSize, `N=${nSize} parameter correctly matches node count`);
  assert(rec.finalPredictedStandard <= nSize, `N=${nSize} spread bounded by ${nSize}`);
  assert(rec.finalPredictedStandard >= 1, `N=${nSize} spread >= 1`);
  assert(
    rec.dataPoints.every((pt) => isFinite(pt.predictedAffected) && pt.predictedAffected >= 0),
    `N=${nSize} all data points are non-negative and finite`
  );
}

// ---------------------------------------------------------------------
// Test 10: Uploaded CSV Dataset (PHEME 24-Node Network)
// ---------------------------------------------------------------------
console.log('\n--- Test 10: Uploaded CSV Dataset (PHEME 24-Node) ---');
const csvRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);
assert(csvRes.isValid, 'PHEME CSV parsed successfully');

const phemeParams = calculateGraphDerivedParameters(csvRes.nodes, csvRes.connections, 0.35, 'U01');
assert(phemeParams.totalVertices === 24, 'PHEME has 24 nodes');
assert(phemeParams.totalEdges === 48, 'PHEME has 48 directed edges');
assert(phemeParams.avgOutDegree === 2.0, 'PHEME average out-degree is exactly 48/24 = 2.0');
assert(phemeParams.rNaive === 0.7, 'PHEME r_naive at p=0.35 is 0.35 * 2.0 = 0.70');
assert(phemeParams.rDegree > 0, 'PHEME excess branching r_degree is non-zero');
console.log(`    PHEME Graph Parameters: <k_out>=${phemeParams.avgOutDegree}, Var(k_out)=${phemeParams.outDegreeVariance}, Cov(in,out)=${phemeParams.inOutCovariance}`);
console.log(`    Branching factors: r_naive=${phemeParams.rNaive}, r_degree=${phemeParams.rDegree}, r_source=${phemeParams.rSource}`);

const phemeRec = calculateEnhancedRecurrencePrediction(csvRes.nodes, csvRes.connections, {
  transmissionProbability: 0.35,
  sourceNodeId: 'U01',
  branchingFactorType: 'degree',
});
assert(phemeRec.dataPoints.length > 0, 'PHEME produced recurrence data points');
assert(phemeRec.finalPredictedStandard <= 24, 'PHEME standard recurrence bounded by N = 24');
assert(phemeRec.finalPredictedLogistic <= 24, 'PHEME logistic recurrence bounded by N = 24');
assert(phemeRec.maeStandard >= 0, 'PHEME MAE is non-negative');
assert(phemeRec.rmseStandard >= 0, 'PHEME RMSE is non-negative');
console.log(`    PHEME Error vs ICM: MAE(Standard)=${phemeRec.maeStandard}, MAE(Logistic)=${phemeRec.maeLogistic}`);
console.log(`    PHEME Final Spread: Recurrence(Std)=${phemeRec.finalPredictedStandard}, Recurrence(Log)=${phemeRec.finalPredictedLogistic}, ICM=${phemeRec.finalICM}, BFS=${phemeRec.finalBFS}`);

// ---------------------------------------------------------------------
// Test 11: Uploaded JSON Dataset Integration
// ---------------------------------------------------------------------
console.log('\n--- Test 11: Uploaded JSON Dataset Integration ---');
const jsonRes = parseAndValidateJSONDataset(JSON_DATASET_TEMPLATE);
assert(jsonRes.isValid, 'JSON template parsed successfully');

const jsonRec = calculateEnhancedRecurrencePrediction(jsonRes.nodes, jsonRes.connections, {
  transmissionProbability: 0.4,
  sourceNodeId: jsonRes.nodes[0]?.id,
});
assert(jsonRec.parameters.totalVertices === 5, 'JSON template has 5 nodes');
assert(jsonRec.finalPredictedStandard <= 5, 'JSON prediction bounded by N = 5');

// ---------------------------------------------------------------------
// Test 12: Recurrence Containment Candidate Analysis
// ---------------------------------------------------------------------
console.log('\n--- Test 12: Recurrence Containment Candidate Analysis ---');
const contCandidates = evaluateRecurrenceContainmentCandidates(
  csvRes.nodes,
  csvRes.connections,
  'U01',
  { transmissionProbability: 0.35, icmIterations: 20 }
);
assert(contCandidates.length === 23, 'Generated 23 containment candidates (all non-source nodes)');
assert(contCandidates[0].rank === 1, 'Top candidate has rank 1');
assert(contCandidates[0].preventedSpread >= 0, 'Prevented spread is non-negative');
assert(contCandidates[0].effectivenessPercentage >= 0, 'Effectiveness percentage is non-negative');
console.log(`    Top Recurrence Containment Candidate: ${contCandidates[0].nodeId} (${contCandidates[0].nodeName})`);
console.log(`    Prevented Spread: ${contCandidates[0].preventedSpread} nodes (${contCandidates[0].effectivenessPercentage}%)`);
console.log(`    New Branching Factor on G \\ {c}: ${contCandidates[0].newBranchingFactor}`);

// ---------------------------------------------------------------------
// Test 13: Performance Benchmarking (100, 500, 1,000, 2,000 Nodes)
// ---------------------------------------------------------------------
console.log('\n--- Test 13: Performance Benchmarking ---');
function generateBenchmarkGraph(numNodes: number, avgDegree: number) {
  const bNodes: UserNode[] = [];
  const bEdges: Connection[] = [];
  for (let i = 0; i < numNodes; i++) {
    bNodes.push(makeNode(`BN${i}`, `User ${i}`));
  }
  let edgeId = 0;
  for (let i = 0; i < numNodes; i++) {
    for (let d = 0; d < avgDegree; d++) {
      const target = (i + d + 1) % numNodes;
      bEdges.push({ id: `be_${edgeId++}`, source: `BN${i}`, target: `BN${target}`, weight: 1.0 });
    }
  }
  return { bNodes, bEdges };
}

for (const size of [100, 500, 1000, 2000]) {
  const { bNodes, bEdges } = generateBenchmarkGraph(size, 5);
  const t0 = performance.now();
  const rec = calculateEnhancedRecurrencePrediction(bNodes, bEdges, {
    transmissionProbability: 0.3,
    sourceNodeId: 'BN0',
  });
  const elapsed = Number((performance.now() - t0).toFixed(2));
  assert(elapsed < 500, `${size} nodes benchmark completed in ${elapsed}ms (< 500ms threshold)`);
  assert(rec.parameters.totalVertices === size, `${size} nodes parameters correctly calculated`);
  console.log(`    ${size} Nodes (${bEdges.length} edges): ${elapsed}ms, Branching r=${rec.parameters.selectedR}, Spread=${rec.finalPredictedLogistic}`);
}

console.log('\n===========================================================');
console.log(` TOTAL TESTS: ${totalTests}`);
console.log(` PASSED:      ${passedTests}`);
console.log(` FAILED:      ${totalTests - passedTests}`);
console.log('===========================================================');

if (passedTests === totalTests) {
  console.log('\n All Graph-Derived Recurrence tests and benchmarks passed successfully!\n');
} else {
  process.exit(1);
}
