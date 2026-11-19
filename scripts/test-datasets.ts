import {
  parseAndValidateCSVDataset,
  parseAndValidateJSONDataset,
  tokenizeCSVLine,
  splitCSVRows,
} from '../src/utils/datasetParser';
import {
  CSV_NODES_TEMPLATE,
  CSV_EDGES_TEMPLATE,
  JSON_DATASET_TEMPLATE,
  SAMPLE_24_NODES_CSV,
  SAMPLE_48_EDGES_CSV,
  SAMPLE_24_48_JSON,
  PHEME_RUMOR_BENCHMARK,
} from '../src/data/sampleDatasets';
import {
  buildAdjacencyList,
  runBFSPropagation,
  calculateCentralityStats,
  evaluateContainmentCandidates,
  calculateGraphStatistics,
} from '../src/utils/graphTheory';
import { calculateRecurrencePrediction } from '../src/utils/recurrenceModel';
import { evaluatePropositionalRisk } from '../src/utils/logicModel';
import { UserNode, Connection, InformationMessage } from '../src/types';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    testResults.push({ name: testName, passed: true });
    console.log(`  [PASS] ${testName}`);
  } else {
    testResults.push({ name: testName, passed: false, details: failureDetails });
    console.error(`  [FAIL] ${testName}: ${failureDetails || 'Assertion failed'}`);
  }
}

console.log('===========================================================');
console.log(' DATASET INGESTION & GRAPH ALGORITHM TEST SUITE');
console.log('===========================================================\n');

// -------------------------------------------------------------
// TEST SUITE 1: VALID CSV UPLOAD
// -------------------------------------------------------------
console.log('--- Test Suite 1: Valid CSV Upload ---');
{
  const result = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);
  assert(result.isValid === true, 'Valid CSV parses with isValid = true');
  assert(result.nodes.length === 24, 'Correctly parsed all 24 nodes from CSV');
  assert(result.connections.length === 48, 'Correctly parsed all 48 directed edges from CSV');
  assert(result.errors.length === 0, 'Zero errors for valid CSV');
  assert(result.report.nodesCount === 24, 'Report reports 24 nodes');
  assert(result.report.edgesCount === 48, 'Report reports 48 edges');

  // Verify node properties
  const u01 = result.nodes.find((n) => n.id === 'U01');
  assert(u01 !== undefined && u01.name === 'Dr. Aris Thorne', 'Node U01 name is preserved');
  assert(u01 !== undefined && u01.followers === 16500, 'Follower count is correctly parsed');
  assert(u01 !== undefined && u01.verified === false, 'Verified boolean parsed correctly');

  // Verify edge connection
  const e1 = result.connections.find((c) => c.source === 'U01' && c.target === 'U02');
  assert(e1 !== undefined && e1.weight === 1.0, 'Directed edge U01 -> U02 parsed with weight 1.0');
}

// -------------------------------------------------------------
// TEST SUITE 2: VALID JSON UPLOAD
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Valid JSON Upload ---');
{
  const result = parseAndValidateJSONDataset(SAMPLE_24_48_JSON);
  assert(result.isValid === true, 'Valid JSON parses with isValid = true');
  assert(result.nodes.length === 24, 'Correctly parsed all 24 nodes from JSON');
  assert(result.connections.length === 48, 'Correctly parsed all 48 directed edges from JSON');
  assert(result.errors.length === 0, 'Zero errors for valid JSON');

  // Test template JSON
  const templateResult = parseAndValidateJSONDataset(JSON_DATASET_TEMPLATE);
  assert(templateResult.isValid === true, 'JSON template parses successfully');
  assert(templateResult.nodes.length === 5, 'JSON template has 5 nodes');
  assert(templateResult.connections.length === 6, 'JSON template has 6 edges');
}

// -------------------------------------------------------------
// TEST SUITE 3: MISSING COLUMNS
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Missing Columns Validation ---');
{
  // Missing 'followers' column in nodes.csv
  const invalidNodesCsv = `id,name,verified
U01,Alice,true
U02,Bob,false`;
  const resultMissingCol = parseAndValidateCSVDataset(invalidNodesCsv, SAMPLE_48_EDGES_CSV);
  assert(resultMissingCol.isValid === false, 'Rejects nodes.csv missing followers column');
  assert(
    resultMissingCol.errors.some((e) => e.includes('missing required column(s)') && e.includes('followers')),
    'Explicit error message identifies missing followers column'
  );

  // Missing 'source' column in edges.csv
  const invalidEdgesCsv = `target,weight
U02,1.0`;
  const resultMissingEdgeCol = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, invalidEdgesCsv);
  assert(resultMissingEdgeCol.isValid === false, 'Rejects edges.csv missing source column');
  assert(
    resultMissingEdgeCol.errors.some((e) => e.includes('missing required column(s)') && e.includes('source')),
    'Explicit error message identifies missing source column'
  );
}

// -------------------------------------------------------------
// TEST SUITE 4: DUPLICATE NODE IDS
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Duplicate Node IDs Validation ---');
{
  const duplicateNodesCsv = `id,name,verified,followers
U01,Alice,true,1000
U02,Bob,false,500
U01,Duplicate Alice,false,200`;
  const resultDup = parseAndValidateCSVDataset(duplicateNodesCsv, CSV_EDGES_TEMPLATE);
  assert(resultDup.isValid === false, 'Rejects CSV with duplicate node IDs');
  assert(
    resultDup.errors.some((e) => e.includes("Duplicate node ID 'U01'")),
    'Error message specifies duplicate ID U01 and uniqueness requirement'
  );

  // Duplicate in JSON
  const duplicateJson = JSON.stringify({
    nodes: [
      { id: 'N1', name: 'User 1', verified: true, followers: 100 },
      { id: 'N1', name: 'User 1 Dup', verified: false, followers: 50 },
    ],
    edges: [{ source: 'N1', target: 'N1' }],
  });
  const resultJsonDup = parseAndValidateJSONDataset(duplicateJson);
  assert(resultJsonDup.isValid === false, 'Rejects JSON with duplicate node IDs');
  assert(
    resultJsonDup.errors.some((e) => e.includes("Duplicate node ID 'N1'")),
    'JSON error specifies duplicate node ID'
  );
}

// -------------------------------------------------------------
// TEST SUITE 5: INVALID EDGE REFERENCES & REJECTED RELATIONSHIPS
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: Invalid Edge References & Rejected Relationships ---');
{
  const nodesCsv = `id,name,verified,followers
U01,Alice,true,1000
U02,Bob,false,500
U03,Charlie,true,800`;

  // Edges containing:
  // 1. Valid edge U01 -> U02
  // 2. Invalid edge U01 -> U99 (U99 does not exist)
  // 3. Self-loop U02 -> U02
  // 4. Duplicate edge U01 -> U02
  // 5. Valid edge U02 -> U03
  const mixedEdgesCsv = `source,target,weight
U01,U02,1.0
U01,U99,1.0
U02,U02,1.0
U01,U02,1.0
U02,U03,1.5`;

  // Strict mode: reports invalid edge reference as error
  const strictResult = parseAndValidateCSVDataset(nodesCsv, mixedEdgesCsv, { strictEdgeReferences: true });
  assert(strictResult.isValid === false, 'Strict mode flags non-existent node reference U99 as error');
  assert(
    strictResult.errors.some((e) => e.includes("references non-existent node 'U99'")),
    'Error identifies missing node U99 and exact edge'
  );

  // Sanitizing / Rejection mode: rejects invalid relationship and duplicate edge, constructs graph with valid relationships
  const sanitizedResult = parseAndValidateCSVDataset(nodesCsv, mixedEdgesCsv, { strictEdgeReferences: false });
  assert(sanitizedResult.isValid === true, 'Sanitizing mode successfully constructs graph');
  assert(sanitizedResult.connections.length === 2, 'Constructed graph keeps only 2 valid directed edges (U01->U02, U02->U03)');
  assert(sanitizedResult.report.rejectedEdgesCount === 2, 'Report tracks 2 rejected edges (self-loop U02->U02 and invalid U01->U99)');
  assert(sanitizedResult.report.deduplicatedEdgesCount === 1, 'Report tracks 1 deduplicated edge (duplicate U01->U02)');
}

// -------------------------------------------------------------
// TEST SUITE 6: EMPTY FILES
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Empty Files Validation ---');
{
  const emptyNodes = '';
  const emptyEdges = '';
  const resultEmpty = parseAndValidateCSVDataset(emptyNodes, emptyEdges);
  assert(resultEmpty.isValid === false, 'Rejects empty CSV files');
  assert(
    resultEmpty.errors.some((e) => e.includes('nodes.csv is empty')),
    'Identifies empty nodes.csv'
  );
  assert(
    resultEmpty.errors.some((e) => e.includes('edges.csv is empty')),
    'Identifies empty edges.csv'
  );

  const emptyJson = '{}';
  const resultEmptyJson = parseAndValidateJSONDataset(emptyJson);
  assert(resultEmptyJson.isValid === false, 'Rejects empty JSON payload');
}

// -------------------------------------------------------------
// TEST SUITE 7: LARGE DATASETS
// -------------------------------------------------------------
console.log('\n--- Test Suite 7: Large Datasets (200 Nodes, 600 Edges) ---');
{
  const N = 200;
  const E = 600;

  const largeNodeRows = ['id,name,verified,followers,role,shares,independentSources'];
  for (let i = 1; i <= N; i++) {
    const id = `U${String(i).padStart(3, '0')}`;
    const verified = i % 5 === 0;
    const followers = i * 250;
    largeNodeRows.push(`${id},Synthetic_User_${i},${verified},${followers},Contributor,${i * 2},${verified ? 2 : 0}`);
  }
  const largeNodesCsv = largeNodeRows.join('\n');

  const largeEdgeRows = ['source,target,weight'];
  for (let j = 1; j <= E; j++) {
    const srcIdx = (j % N) + 1;
    let tgtIdx = ((j * 7) % N) + 1;
    if (srcIdx === tgtIdx) tgtIdx = (tgtIdx % N) + 1;
    const srcId = `U${String(srcIdx).padStart(3, '0')}`;
    const tgtId = `U${String(tgtIdx).padStart(3, '0')}`;
    largeEdgeRows.push(`${srcId},${tgtId},1.0`);
  }
  const largeEdgesCsv = largeEdgeRows.join('\n');

  const startTime = Date.now();
  const largeResult = parseAndValidateCSVDataset(largeNodesCsv, largeEdgesCsv, { strictEdgeReferences: false });
  const elapsedMs = Date.now() - startTime;

  assert(largeResult.isValid === true, 'Large 200-node dataset parses successfully');
  assert(largeResult.nodes.length === N, `Parsed all ${N} nodes`);
  assert(largeResult.connections.length > 0, `Constructed ${largeResult.connections.length} edges`);
  assert(elapsedMs < 1000, `Parsed and positioned 200 nodes in ${elapsedMs}ms (< 1000ms threshold)`);

  // Verify positions were calculated within canvas bounds
  const allInBounds = largeResult.nodes.every(
    (n) => n.x >= 50 && n.x <= 750 && n.y >= 50 && n.y <= 450
  );
  assert(allInBounds, 'All 200 nodes are positioned within valid canvas bounds [50, 750] x [50, 450]');
}

// -------------------------------------------------------------
// TEST SUITE 8: INTEGRATION WITH EXISTING ALGORITHMS
// -------------------------------------------------------------
console.log('\n--- Test Suite 8: Integration with Existing Algorithms ---');
{
  // Parse the 24-node, 48-edge benchmark dataset
  const dataset = parseAndValidateCSVDataset(SAMPLE_24_NODES_CSV, SAMPLE_48_EDGES_CSV);
  const { nodes, connections } = dataset;

  // 1. buildAdjacencyList()
  const adj = buildAdjacencyList(nodes, connections);
  assert(adj instanceof Map, 'buildAdjacencyList returns Map instance');
  assert(adj.size === 24, 'buildAdjacencyList has 24 entries');
  const u01Neighbors = adj.get('U01') || [];
  assert(u01Neighbors.length === 4, `U01 has 4 outgoing neighbors (U02, U04, U23, U06) - got ${u01Neighbors.length}`);

  // 2. runBFSPropagation()
  const bfsResult = runBFSPropagation('U01', nodes, connections, []);
  assert(bfsResult.steps.length > 1, `BFS completed across ${bfsResult.steps.length} levels`);
  assert(bfsResult.totalReach === 24, `BFS reaches all 24 nodes from U01 (reach = ${bfsResult.totalReach})`);
  assert(bfsResult.steps[0].activeNodes[0] === 'U01', 'Step 0 active node is source U01');

  // BFS with blocked containment cut: isolate bridge U02
  const bfsContained = runBFSPropagation('U01', nodes, connections, ['U02']);
  assert(bfsContained.totalReach < bfsResult.totalReach, `Blocking U02 reduces reach from 24 to ${bfsContained.totalReach}`);

  // 3. calculateCentralityStats()
  const centrality = calculateCentralityStats(nodes, connections);
  assert(centrality.length === 24, 'Centrality stats computed for all 24 nodes');
  assert(centrality[0].rank === 1, 'Top node has rank 1');
  assert(centrality[0].degreeCentrality >= centrality[1].degreeCentrality, 'Nodes are sorted descending by centrality');
  const topHub = centrality[0];
  assert(topHub.outDegree > 0, `Top hub ${topHub.id} (${topHub.name}) has out-degree ${topHub.outDegree}`);

  // 4. evaluateContainmentCandidates()
  const candidates = evaluateContainmentCandidates('U01', nodes, connections);
  assert(candidates.length > 0, `Computed ${candidates.length} containment candidates`);
  assert(candidates[0].rank === 1, 'Top candidate has rank 1');
  assert(candidates[0].preventedReach >= 0, 'Prevented reach is non-negative');
  assert(candidates[0].effectivenessPercentage > 0, `Top candidate prevented reach effectiveness = ${candidates[0].effectivenessPercentage}%`);

  // 5. calculateRecurrencePrediction()
  const recurrence = calculateRecurrencePrediction(nodes.length, 1.5, bfsResult.steps, 7);
  assert(recurrence.dataPoints.length >= 7, `Recurrence produced ${recurrence.dataPoints.length} data points`);
  assert(recurrence.dataPoints[0].predictedAffected === 1, 'Initial recurrence condition S(0) = 1');
  assert(recurrence.predictedFinalAffected <= 24, 'Recurrence ceiling is bounded by N = 24');

  // 6. evaluatePropositionalRisk()
  const highRiskMessage: InformationMessage = {
    text: 'Unverified rumor payload',
    sourceUserId: 'U01',
    verified: false,
    shares: 195,
    independentSources: 0,
    claimTopic: 'Viral Outbreak',
  };
  const riskResult = evaluatePropositionalRisk(highRiskMessage);
  assert(riskResult.riskCategory === 'High', 'Unverified + High Shares evaluates to High Risk');
  assert(riskResult.riskScore >= 70, `High risk score is ${riskResult.riskScore} (>= 70)`);
  assert(riskResult.propositionStates.U === true, 'Proposition U = ¬V is TRUE');
  assert(riskResult.propositionStates.S === true, 'Proposition S is TRUE');

  const verifiedMessage: InformationMessage = {
    text: 'Official corroborated report',
    sourceUserId: 'U03',
    verified: true,
    shares: 20,
    independentSources: 4,
    claimTopic: 'Verified Announcement',
  };
  const lowRiskResult = evaluatePropositionalRisk(verifiedMessage);
  assert(lowRiskResult.riskCategory === 'Lower', 'Verified + 4 sources evaluates to Lower Risk');
  assert(lowRiskResult.credibilityScore > 70, `Verified credibility is ${lowRiskResult.credibilityScore} (> 70)`);

  // 7. calculateGraphStatistics()
  const graphStats = calculateGraphStatistics(nodes, connections);
  assert(graphStats.totalNodes === 24, 'GraphStats totalNodes = 24');
  assert(graphStats.totalEdges === 48, 'GraphStats totalEdges = 48');
  assert(graphStats.graphDensity > 0, `GraphStats density = ${graphStats.graphDensity}`);
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n===========================================================');
const passedCount = testResults.filter((r) => r.passed).length;
const failedCount = testResults.filter((r) => !r.passed).length;
console.log(` TOTAL TESTS: ${testResults.length}`);
console.log(` PASSED:      ${passedCount}`);
console.log(` FAILED:      ${failedCount}`);
console.log('===========================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\n All test suites passed successfully!\n');
  process.exit(0);
}
