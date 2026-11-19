/**
 * Comprehensive Automated Test & Benchmark Suite for Brandes' Betweenness Centrality
 * in Directed, Unweighted Networks.
 *
 * Verifies:
 * 1. Linear Chain Graph
 * 2. Star Graphs (Inward, Outward, and Center Hub)
 * 3. Directed Branching Graph (Diamond / Fork)
 * 4. Disconnected Graph
 * 5. Cyclic Graph
 * 6. Uploaded CSV Graph (PHEME 24-node cascade)
 * 7. Uploaded JSON Graph
 * 8. Performance Benchmarks: 100, 500, and 1,000 nodes
 */

import { calculateBetweennessCentrality, calculateCentralityStats } from '../src/utils/graphTheory';
import { parseAndValidateCSVDataset, parseAndValidateJSONDataset } from '../src/utils/datasetParser';
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

function approxEqual(a: number, b: number, epsilon = 0.001): boolean {
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

function makeConn(source: string, target: string, id?: string): Connection {
  return {
    id: id || `${source}->${target}`,
    source,
    target,
    weight: 1.0,
  };
}

console.log('===========================================================');
console.log(' BRANDES BETWEENNESS CENTRALITY TEST & BENCHMARK SUITE');
console.log('===========================================================\n');

// -------------------------------------------------------------
// Test 1: Linear Chain Graph A -> B -> C -> D
// -------------------------------------------------------------
console.log('--- Test 1: Linear Chain Graph (A -> B -> C -> D) ---');
{
  const nodes = ['A', 'B', 'C', 'D'].map((id) => makeNode(id));
  const connections = [
    makeConn('A', 'B'),
    makeConn('B', 'C'),
    makeConn('C', 'D'),
  ];
  const N = 4;
  // Normalized factor = (N-1)(N-2) = 3 * 2 = 6
  // Shortest paths:
  // A -> B: (none intermediate)
  // A -> C: A -> B -> C (B is intermediate, +1)
  // A -> D: A -> B -> C -> D (B and C intermediate, +1 each)
  // B -> C: (none)
  // B -> D: B -> C -> D (C intermediate, +1)
  // C -> D: (none)
  // Expected raw:
  // C_B(A) = 0, C_B(B) = 2, C_B(C) = 2, C_B(D) = 0
  // Normalized:
  // C'_B(A) = 0, C'_B(B) = 2/6 = 0.3333, C'_B(C) = 2/6 = 0.3333, C'_B(D) = 0

  const bcMap = calculateBetweennessCentrality(nodes, connections);

  assert(bcMap.get('A')?.raw === 0, 'Source node A has raw betweenness = 0');
  assert(bcMap.get('D')?.raw === 0, 'Sink node D has raw betweenness = 0');
  assert(bcMap.get('B')?.raw === 2, 'Intermediate bridge node B has raw betweenness = 2');
  assert(bcMap.get('C')?.raw === 2, 'Intermediate bridge node C has raw betweenness = 2');

  assert(approxEqual(bcMap.get('B')?.normalized || 0, 2 / 6), 'Node B normalized betweenness = 2/6 = 0.3333');
  assert(approxEqual(bcMap.get('C')?.normalized || 0, 2 / 6), 'Node C normalized betweenness = 2/6 = 0.3333');
  assert(bcMap.get('A')?.normalized === 0, 'Node A normalized betweenness = 0');
  assert(bcMap.get('D')?.normalized === 0, 'Node D normalized betweenness = 0');
}

// -------------------------------------------------------------
// Test 2: Star Graphs (Inward, Outward, and Center Hub)
// -------------------------------------------------------------
console.log('\n--- Test 2: Star Graphs (Inward, Outward, and Hub) ---');
{
  // 2a. Outward Star: Center -> Leaf_1, Leaf_2, Leaf_3
  // Since all paths have length 1, no vertex can ever be an intermediate!
  const outwardNodes = ['C', 'L1', 'L2', 'L3'].map((id) => makeNode(id));
  const outwardConns = [
    makeConn('C', 'L1'),
    makeConn('C', 'L2'),
    makeConn('C', 'L3'),
  ];
  const outMap = calculateBetweennessCentrality(outwardNodes, outwardConns);
  assert(outMap.get('C')?.raw === 0, 'Pure outward star center has raw betweenness = 0');
  assert(outMap.get('L1')?.raw === 0, 'Outward star leaf L1 has raw betweenness = 0');

  // 2b. Inward Star: Leaf_1, Leaf_2, Leaf_3 -> Center
  // Again all paths have length 1, no intermediate vertices!
  const inwardNodes = ['C', 'L1', 'L2', 'L3'].map((id) => makeNode(id));
  const inwardConns = [
    makeConn('L1', 'C'),
    makeConn('L2', 'C'),
    makeConn('L3', 'C'),
  ];
  const inMap = calculateBetweennessCentrality(inwardNodes, inwardConns);
  assert(inMap.get('C')?.raw === 0, 'Pure inward star center has raw betweenness = 0');

  // 2c. True Hub Star: L1, L2 -> Center -> R1, R2
  // N = 5. (N-1)(N-2) = 4 * 3 = 12.
  // Paths: L1 -> C -> R1, L1 -> C -> R2, L2 -> C -> R1, L2 -> C -> R2
  // All 4 pass through C!
  // C_B(C) = 4. Normalized = 4 / 12 = 0.3333.
  const hubNodes = ['C', 'L1', 'L2', 'R1', 'R2'].map((id) => makeNode(id));
  const hubConns = [
    makeConn('L1', 'C'),
    makeConn('L2', 'C'),
    makeConn('C', 'R1'),
    makeConn('C', 'R2'),
  ];
  const hubMap = calculateBetweennessCentrality(hubNodes, hubConns);
  assert(hubMap.get('C')?.raw === 4, 'Directed hub center C has raw betweenness = 4');
  assert(approxEqual(hubMap.get('C')?.normalized || 0, 4 / 12), 'Directed hub center C normalized = 4/12 = 0.3333');
  assert(hubMap.get('L1')?.raw === 0, 'Peripheral node L1 has betweenness = 0');
  assert(hubMap.get('R1')?.raw === 0, 'Peripheral node R1 has betweenness = 0');
}

// -------------------------------------------------------------
// Test 3: Directed Branching Graph (Diamond / Fork)
// -------------------------------------------------------------
console.log('\n--- Test 3: Directed Branching Graph (Diamond / Fork) ---');
{
  // S -> A -> T
  // S -> B -> T
  // 4 nodes: S, A, B, T. (N-1)(N-2) = 6.
  // Two shortest paths from S to T of length 2: (S, A, T) and (S, B, T).
  // \sigma_{ST} = 2.
  // \sigma_{ST}(A) = 1 => 1/2 = 0.5.
  // \sigma_{ST}(B) = 1 => 1/2 = 0.5.
  // S and T are endpoints => betweenness = 0.
  const nodes = ['S', 'A', 'B', 'T'].map((id) => makeNode(id));
  const connections = [
    makeConn('S', 'A'),
    makeConn('S', 'B'),
    makeConn('A', 'T'),
    makeConn('B', 'T'),
  ];

  const bcMap = calculateBetweennessCentrality(nodes, connections);

  assert(bcMap.get('A')?.raw === 0.5, 'Branching node A has raw betweenness = 0.5');
  assert(bcMap.get('B')?.raw === 0.5, 'Branching node B has raw betweenness = 0.5');
  assert(bcMap.get('S')?.raw === 0, 'Source node S has raw betweenness = 0');
  assert(bcMap.get('T')?.raw === 0, 'Target node T has raw betweenness = 0');
  assert(approxEqual(bcMap.get('A')?.normalized || 0, 0.5 / 6), 'Node A normalized = 0.5 / 6 = 0.0833');
  assert(approxEqual(bcMap.get('B')?.normalized || 0, 0.5 / 6), 'Node B normalized = 0.5 / 6 = 0.0833');
}

// -------------------------------------------------------------
// Test 4: Disconnected Graph
// -------------------------------------------------------------
console.log('\n--- Test 4: Disconnected Graph ---');
{
  // Component 1: A -> B -> C (3 nodes)
  // Component 2: D -> E (2 nodes)
  // Total N = 5. (N-1)(N-2) = 12.
  // In Component 1: path A -> B -> C passes through B (weight 1).
  // In Component 2: path D -> E has length 1 (no intermediate).
  // Between components: no reachable paths.
  // So C_B(B) = 1, all others = 0.
  const nodes = ['A', 'B', 'C', 'D', 'E'].map((id) => makeNode(id));
  const connections = [
    makeConn('A', 'B'),
    makeConn('B', 'C'),
    makeConn('D', 'E'),
  ];

  const bcMap = calculateBetweennessCentrality(nodes, connections);

  assert(bcMap.get('B')?.raw === 1, 'Bridge node B in component 1 has raw betweenness = 1');
  assert(approxEqual(bcMap.get('B')?.normalized || 0, 1 / 12), 'Node B normalized = 1 / 12 = 0.0833');
  assert(bcMap.get('A')?.raw === 0, 'Node A has betweenness = 0');
  assert(bcMap.get('C')?.raw === 0, 'Node C has betweenness = 0');
  assert(bcMap.get('D')?.raw === 0, 'Node D has betweenness = 0');
  assert(bcMap.get('E')?.raw === 0, 'Node E has betweenness = 0');
}

// -------------------------------------------------------------
// Test 5: Cyclic Graph (Directed 4-Cycle: A -> B -> C -> D -> A)
// -------------------------------------------------------------
console.log('\n--- Test 5: Cyclic Graph (Directed 4-Cycle) ---');
{
  // N = 4. (N-1)(N-2) = 6.
  // Directed 4-cycle:
  // From A:
  // - to B: len 1
  // - to C: A -> B -> C (len 2, B is intermediate, +1 for B)
  // - to D: A -> B -> C -> D (len 3, B and C intermediate, +1 for B, +1 for C)
  // By rotational symmetry, each node gets 2 as immediate successor, 1 as secondary successor = 3.
  // C_B(v) = 3 for all 4 vertices.
  // Normalized = 3 / 6 = 0.5 for all vertices!
  const nodes = ['A', 'B', 'C', 'D'].map((id) => makeNode(id));
  const connections = [
    makeConn('A', 'B'),
    makeConn('B', 'C'),
    makeConn('C', 'D'),
    makeConn('D', 'A'),
  ];

  const bcMap = calculateBetweennessCentrality(nodes, connections);

  assert(bcMap.get('A')?.raw === 3, 'Cycle node A has raw betweenness = 3');
  assert(bcMap.get('B')?.raw === 3, 'Cycle node B has raw betweenness = 3');
  assert(bcMap.get('C')?.raw === 3, 'Cycle node C has raw betweenness = 3');
  assert(bcMap.get('D')?.raw === 3, 'Cycle node D has raw betweenness = 3');
  assert(approxEqual(bcMap.get('A')?.normalized || 0, 0.5), 'Cycle node A normalized = 0.5');
  assert(approxEqual(bcMap.get('B')?.normalized || 0, 0.5), 'Cycle node B normalized = 0.5');
}

// -------------------------------------------------------------
// Test 6: Uploaded CSV Graph (PHEME 24-Node Cascade)
// -------------------------------------------------------------
console.log('\n--- Test 6: Uploaded CSV Graph (PHEME 24-Node Cascade) ---');
{
  const parseRes = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);
  assert(parseRes.report.isValid, 'PHEME CSV parsed successfully');

  const bcMap = calculateBetweennessCentrality(parseRes.nodes, parseRes.connections);
  assert(bcMap.size === 24, 'Computed betweenness for all 24 nodes');

  // Verify full centrality stats integration
  const stats = calculateCentralityStats(parseRes.nodes, parseRes.connections);
  assert(stats.length === 24, 'Centrality stats computed for all 24 nodes');

  const topBetweennessNode = [...stats].sort(
    (a, b) => b.betweennessCentrality - a.betweennessCentrality
  )[0];

  assert(topBetweennessNode.betweennessRank === 1, 'Top betweenness node has rank 1');
  assert(topBetweennessNode.betweennessCentrality > 0, 'Top betweenness score is non-zero');
  assert(topBetweennessNode.rawBetweenness > 0, 'Top raw betweenness score is non-zero');
  assert(topBetweennessNode.isBridgeNode === true, 'Top betweenness node flagged as bridge node');
  assert(
    topBetweennessNode.structuralRole === 'Propagation Bridge' ||
      topBetweennessNode.structuralRole === 'Broadcast Hub',
    `Top node has meaningful structural role: ${topBetweennessNode.structuralRole}`
  );
  console.log(`    PHEME Top Betweenness: ${topBetweennessNode.id} (${topBetweennessNode.name})`);
  console.log(`    Raw: ${topBetweennessNode.rawBetweenness}, Normalized: ${topBetweennessNode.betweennessCentrality}`);
  console.log(`    Role: ${topBetweennessNode.structuralRole}`);
}

// -------------------------------------------------------------
// Test 7: Uploaded JSON Graph
// -------------------------------------------------------------
console.log('\n--- Test 7: Uploaded JSON Graph ---');
{
  const parseRes = parseAndValidateJSONDataset(JSON_DATASET_TEMPLATE);
  assert(parseRes.report.isValid, 'JSON template parsed successfully');

  const bcMap = calculateBetweennessCentrality(parseRes.nodes, parseRes.connections);
  assert(bcMap.size === 5, 'Computed betweenness for all 5 template nodes');

  const stats = calculateCentralityStats(parseRes.nodes, parseRes.connections);
  assert(stats.length === 5, 'Stats generated for 5 JSON nodes');

  const bridgeCandidates = stats.filter((s) => s.isBridgeNode);
  assert(bridgeCandidates.length >= 1, 'Identified at least one bridge node in JSON graph');
}

// -------------------------------------------------------------
// Test 8: Performance Benchmarking (100, 500, 1,000 Nodes)
// -------------------------------------------------------------
console.log('\n--- Test 8: Performance Benchmarking (100, 500, 1,000 Nodes) ---');

function generateBenchmarkGraph(numNodes: number, edgesPerNode: number): { nodes: UserNode[]; connections: Connection[] } {
  const nodes: UserNode[] = [];
  for (let i = 0; i < numNodes; i++) {
    nodes.push(makeNode(`N${i}`, `User ${i}`));
  }

  const connections: Connection[] = [];
  const edgeSet = new Set<string>();

  // Ensure connectivity with a directed spine / tree
  for (let i = 0; i < numNodes - 1; i++) {
    const src = `N${i}`;
    const tgt = `N${i + 1}`;
    connections.push(makeConn(src, tgt, `spine-${i}`));
    edgeSet.add(`${src}->${tgt}`);
  }

  // Add random forward/cross directed edges
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

// Benchmark 100 Nodes
{
  const g100 = generateBenchmarkGraph(100, 4);
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const bc100 = calculateBetweennessCentrality(g100.nodes, g100.connections);
  const duration = performance.now() - startTime;
  const endMem = process.memoryUsage().heapUsed;
  const memDeltaMb = ((endMem - startMem) / (1024 * 1024)).toFixed(2);

  assert(bc100.size === 100, 'Benchmark 100 nodes computed all scores');
  assert(duration < 200, `Benchmark 100 nodes finished in ${duration.toFixed(2)}ms (< 200ms threshold)`);
  console.log(`    100 Nodes (${g100.connections.length} edges): ${duration.toFixed(2)}ms, heap delta: ${memDeltaMb} MB`);
}

// Benchmark 500 Nodes
{
  const g500 = generateBenchmarkGraph(500, 4);
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const bc500 = calculateBetweennessCentrality(g500.nodes, g500.connections);
  const duration = performance.now() - startTime;
  const endMem = process.memoryUsage().heapUsed;
  const memDeltaMb = ((endMem - startMem) / (1024 * 1024)).toFixed(2);

  assert(bc500.size === 500, 'Benchmark 500 nodes computed all scores');
  assert(duration < 1500, `Benchmark 500 nodes finished in ${duration.toFixed(2)}ms (< 1500ms threshold)`);
  console.log(`    500 Nodes (${g500.connections.length} edges): ${duration.toFixed(2)}ms, heap delta: ${memDeltaMb} MB`);
}

// Benchmark 1,000 Nodes
{
  const g1000 = generateBenchmarkGraph(1000, 5);
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const bc1000 = calculateBetweennessCentrality(g1000.nodes, g1000.connections);
  const duration = performance.now() - startTime;
  const endMem = process.memoryUsage().heapUsed;
  const memDeltaMb = ((endMem - startMem) / (1024 * 1024)).toFixed(2);

  assert(bc1000.size === 1000, 'Benchmark 1,000 nodes computed all scores');
  assert(duration < 5000, `Benchmark 1,000 nodes finished in ${duration.toFixed(2)}ms (< 5000ms threshold)`);
  console.log(`    1,000 Nodes (${g1000.connections.length} edges): ${duration.toFixed(2)}ms, heap delta: ${memDeltaMb} MB`);
}

console.log('\n===========================================================');
console.log(` TOTAL TESTS: ${totalTests}`);
console.log(` PASSED:      ${passedTests}`);
console.log(` FAILED:      ${totalTests - passedTests}`);
console.log('===========================================================\n');
console.log(' All Brandes algorithm tests and benchmarks passed successfully!');
