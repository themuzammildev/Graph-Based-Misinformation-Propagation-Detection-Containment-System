/**
 * Independent Cascade Model (ICM) Mathematical Implementation
 *
 * Literature Foundation:
 * - J. Goldenberg, B. Libai, E. Muller (2001). "Talk of the Network: A Complex Systems
 *   Look at the Diffusion of Word-of-Mouth". Marketing Letters 12(3):211-223.
 * - D. Kempe, J. Kleinberg, E. Tardos (2003). "Maximizing the Spread of Influence through
 *   a Social Network". ACM SIGKDD 2003, pp. 137-146.
 *
 * Mathematical Properties:
 * 1. Discrete time cascade: t = 0, 1, 2, ...
 * 2. Seeds A_0 active at t = 0.
 * 3. Newly active node u \in A_{t-1} gets exactly ONE opportunity to activate
 *    each currently inactive outgoing neighbor v \in N^+(u) with probability P(u -> v).
 * 4. Progressive activation: once active, a node remains active permanently.
 * 5. Terminate when no new nodes are activated in a time step (A_t = \emptyset).
 */

import {
  UserNode,
  Connection,
  ICMStep,
  ICMSimulationRun,
  ICMAggregateStats,
  ICMOptions,
  ICMContainmentCandidate,
} from '../types';
import { runBFSPropagation, calculateCentralityStats } from './graphTheory';

/**
 * Fast, deterministic 32-bit PRNG (Mulberry32).
 * Given an integer seed, produces a uniform random distribution in [0, 1).
 */
export function createSeededRandom(seed: number): () => number {
  let a = (seed >>> 0) || 1337;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Directed outgoing edge with transmission probability
 */
interface DirectedNeighborEdge {
  target: string;
  probability: number;
}

/**
 * Builds directed adjacency list with resolved transmission probabilities.
 * Respects blocked nodes and avoids treating arbitrary weights as probabilities
 * unless explicit custom edge probability mode is enabled.
 */
export function buildICMAdjacency(
  nodes: UserNode[],
  connections: Connection[],
  defaultProbability: number,
  useCustomEdgeProbabilities: boolean = false,
  blockedNodes: Set<string> = new Set()
): Map<string, DirectedNeighborEdge[]> {
  const adj = new Map<string, DirectedNeighborEdge[]>();
  const validNodeIds = new Set<string>();

  for (const node of nodes) {
    if (!blockedNodes.has(node.id)) {
      validNodeIds.add(node.id);
      adj.set(node.id, []);
    }
  }

  // Bound default probability to [0, 1]
  const clampedDefaultP = Math.max(0, Math.min(1, defaultProbability));

  for (const conn of connections) {
    if (
      validNodeIds.has(conn.source) &&
      validNodeIds.has(conn.target) &&
      conn.source !== conn.target
    ) {
      let edgeP = clampedDefaultP;
      if (
        useCustomEdgeProbabilities &&
        typeof conn.weight === 'number' &&
        !isNaN(conn.weight) &&
        conn.weight >= 0 &&
        conn.weight <= 1
      ) {
        edgeP = conn.weight;
      }

      const neighbors = adj.get(conn.source)!;
      // Prevent duplicate edges to the same target
      const existing = neighbors.find((n) => n.target === conn.target);
      if (!existing) {
        neighbors.push({ target: conn.target, probability: edgeP });
      }
    }
  }

  return adj;
}

/**
 * Runs a single, discrete-time Independent Cascade Model simulation run.
 * Tracks step-by-step active frontiers, edge transmission attempts, and outcomes.
 */
export function runSingleICMSimulation(
  sourceId: string,
  nodes: UserNode[],
  connections: Connection[],
  options: ICMOptions = {},
  rng: () => number = Math.random
): ICMSimulationRun {
  const p = options.transmissionProbability !== undefined ? options.transmissionProbability : 0.3;
  const blockedSet = new Set(options.blockedNodes || []);
  const runSeed = options.seed !== undefined ? options.seed : 0;

  // Validation: if source node is missing or quarantined
  const sourceExists = nodes.some((n) => n.id === sourceId);
  if (!sourceExists || blockedSet.has(sourceId)) {
    return {
      runIndex: 0,
      seed: runSeed,
      totalReach: 0,
      steps: [
        {
          step: 0,
          newlyActivatedNodes: [],
          previouslyActivatedNodes: [],
          cumulativeActiveNodes: [],
          successfulEdges: [],
          attemptedEdges: [],
        },
      ],
      activatedNodeSet: [],
    };
  }

  const adj = buildICMAdjacency(
    nodes,
    connections,
    p,
    options.useCustomEdgeProbabilities,
    blockedSet
  );

  const activeSet = new Set<string>([sourceId]);
  let newlyActive: string[] = [sourceId];
  const steps: ICMStep[] = [];

  // Step 0: Initial Seed Exposure
  steps.push({
    step: 0,
    newlyActivatedNodes: [sourceId],
    previouslyActivatedNodes: [],
    cumulativeActiveNodes: [sourceId],
    successfulEdges: [],
    attemptedEdges: [],
  });

  let stepIndex = 0;

  // Discrete time progression
  while (newlyActive.length > 0) {
    const nextNewlyActive: string[] = [];
    const successfulEdges: { source: string; target: string; probability: number }[] = [];
    const attemptedEdges: {
      source: string;
      target: string;
      probability: number;
      succeeded: boolean;
    }[] = [];

    // Each newly active node gets exactly ONE attempt to activate its inactive neighbors
    for (const u of newlyActive) {
      const neighbors = adj.get(u) || [];

      for (const edge of neighbors) {
        const v = edge.target;

        // Neighbor already active or blocked: cannot be activated again
        if (activeSet.has(v) || blockedSet.has(v)) {
          continue;
        }

        // Stochastic Bernoulli trial with probability P(u -> v)
        const roll = rng();
        const succeeded = edge.probability > 0 && roll < edge.probability;

        attemptedEdges.push({
          source: u,
          target: v,
          probability: edge.probability,
          succeeded,
        });

        if (succeeded) {
          successfulEdges.push({
            source: u,
            target: v,
            probability: edge.probability,
          });

          // Node v is now activated for the next time step
          if (!activeSet.has(v)) {
            activeSet.add(v);
            nextNewlyActive.push(v);
          }
        }
      }
    }

    if (nextNewlyActive.length === 0) {
      break;
    }

    stepIndex++;
    const cumulativeActive = Array.from(activeSet);
    const previouslyActive = cumulativeActive.filter((id) => !nextNewlyActive.includes(id));

    steps.push({
      step: stepIndex,
      newlyActivatedNodes: nextNewlyActive,
      previouslyActivatedNodes: previouslyActive,
      cumulativeActiveNodes: cumulativeActive,
      successfulEdges,
      attemptedEdges,
    });

    newlyActive = nextNewlyActive;
  }

  return {
    runIndex: 0,
    seed: runSeed,
    totalReach: activeSet.size,
    steps,
    activatedNodeSet: Array.from(activeSet),
  };
}

/**
 * Runs Monte Carlo simulations of the Independent Cascade Model across M iterations.
 * Computes empirical mean spread, standard deviation, bounds, and node-level activation probabilities.
 */
export function runMonteCarloICM(
  sourceId: string,
  nodes: UserNode[],
  connections: Connection[],
  options: ICMOptions = {}
): ICMAggregateStats {
  const startTime = performance.now();
  const iterations = Math.max(1, options.iterations || 100);
  const transmissionP =
    options.transmissionProbability !== undefined ? options.transmissionProbability : 0.3;
  const baseSeed = options.seed !== undefined ? options.seed : 42;
  const blockedNodes = options.blockedNodes || [];

  const runs: ICMSimulationRun[] = [];
  const reachCounts: number[] = [];
  const nodeActivationCounts: Record<string, number> = {};

  for (const node of nodes) {
    nodeActivationCounts[node.id] = 0;
  }

  // Pre-seed pseudo-random generator
  const masterRng = createSeededRandom(baseSeed);

  // Track step-level dynamics
  const stepNewlySums: number[] = [];
  const stepCumulativeSums: number[] = [];

  for (let m = 0; m < iterations; m++) {
    // Generate deterministic child seed for this run
    const childSeed = Math.floor(masterRng() * 2147483647);
    const childRng = createSeededRandom(childSeed);

    const run = runSingleICMSimulation(
      sourceId,
      nodes,
      connections,
      {
        ...options,
        seed: childSeed,
        transmissionProbability: transmissionP,
        blockedNodes,
      },
      childRng
    );

    run.runIndex = m;
    runs.push(run);
    reachCounts.push(run.totalReach);

    for (const nodeId of run.activatedNodeSet) {
      if (nodeActivationCounts[nodeId] !== undefined) {
        nodeActivationCounts[nodeId]++;
      }
    }

    // Accumulate step curves
    for (let s = 0; s < run.steps.length; s++) {
      if (stepNewlySums[s] === undefined) {
        stepNewlySums[s] = 0;
        stepCumulativeSums[s] = 0;
      }
      stepNewlySums[s] += run.steps[s].newlyActivatedNodes.length;
      stepCumulativeSums[s] += run.steps[s].cumulativeActiveNodes.length;
    }
  }

  // Calculate empirical statistics
  const totalReachSum = reachCounts.reduce((acc, val) => acc + val, 0);
  const averageSpread = Number((totalReachSum / iterations).toFixed(2));

  let varianceSum = 0;
  for (const r of reachCounts) {
    varianceSum += Math.pow(r - averageSpread, 2);
  }
  const stdDevSpread =
    iterations > 1 ? Number(Math.sqrt(varianceSum / (iterations - 1)).toFixed(2)) : 0;

  const minSpread = Math.min(...reachCounts);
  const maxSpread = Math.max(...reachCounts);

  // Node activation probability: pi(v) = count(v) / M
  const nodeActivationProbabilities: Record<string, number> = {};
  for (const nodeId in nodeActivationCounts) {
    nodeActivationProbabilities[nodeId] = Number(
      (nodeActivationCounts[nodeId] / iterations).toFixed(3)
    );
  }

  // Average cumulative spread progression by step
  const averageSpreadByStep = stepCumulativeSums.map((cumSum, idx) => ({
    step: idx,
    avgNewlyActive: Number(((stepNewlySums[idx] || 0) / iterations).toFixed(2)),
    avgCumulativeActive: Number((cumSum / iterations).toFixed(2)),
  }));

  // Compare with theoretical deterministic BFS reachability
  const bfsResult = runBFSPropagation(sourceId, nodes, connections, blockedNodes);
  const bfsTheoreticalReach = bfsResult.totalReach;
  const reachablePenetrationPercentage =
    bfsTheoreticalReach > 0
      ? Number(((averageSpread / bfsTheoreticalReach) * 100).toFixed(1))
      : 0;

  const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

  return {
    iterations,
    transmissionProbability: transmissionP,
    sourceNodeId: sourceId,
    seed: baseSeed,
    averageSpread,
    stdDevSpread,
    minSpread,
    maxSpread,
    bfsTheoreticalReach,
    reachablePenetrationPercentage,
    nodeActivationProbabilities,
    averageSpreadByStep,
    runs,
    executionTimeMs,
  };
}

/**
 * Evaluates candidate containment nodes under the Independent Cascade Model.
 * For each candidate c:
 * 1. Simulates cascade on G \ {c} across Monte Carlo iterations
 * 2. Computes spread reduction: Delta mu(c) = mu(G) - mu(G \ {c})
 * 3. Computes containment effectiveness percentage: eta(c) = (Delta mu(c) / mu(G)) * 100%
 */
export function evaluateICMContainmentCandidates(
  sourceId: string,
  nodes: UserNode[],
  connections: Connection[],
  options: ICMOptions = {}
): ICMContainmentCandidate[] {
  // Baseline cascade on full graph G
  const baselineStats = runMonteCarloICM(sourceId, nodes, connections, {
    ...options,
    blockedNodes: [],
  });
  const baselineSpread = baselineStats.averageSpread;

  if (baselineSpread <= 1) {
    return [];
  }

  // Pre-calculate centrality stats for baseline metadata
  const centralityList = calculateCentralityStats(nodes, connections);
  const centralityMap = new Map(centralityList.map((c) => [c.id, c]));

  // Also calculate deterministic BFS baseline for comparison
  const originalBfs = runBFSPropagation(sourceId, nodes, connections, []);
  const bfsOriginalReach = originalBfs.totalReach;

  const candidates: ICMContainmentCandidate[] = [];

  // Evaluate candidate nodes reachable from source
  for (const node of nodes) {
    if (node.id === sourceId) continue;

    // Simulate cascade with node quarantined: G \ {c}
    const candidateStats = runMonteCarloICM(sourceId, nodes, connections, {
      ...options,
      blockedNodes: [node.id],
    });

    const isolatedSpread = candidateStats.averageSpread;
    const preventedSpread = Math.max(0, Number((baselineSpread - isolatedSpread).toFixed(2)));
    const effectivenessPercentage =
      baselineSpread > 0
        ? Number(((preventedSpread / baselineSpread) * 100).toFixed(1))
        : 0;

    // Deterministic BFS comparison
    const bfsCandidate = runBFSPropagation(sourceId, nodes, connections, [node.id]);
    const bfsPreventedReach = Math.max(0, bfsOriginalReach - bfsCandidate.totalReach);

    const stats = centralityMap.get(node.id);

    candidates.push({
      nodeId: node.id,
      nodeName: node.name,
      verified: node.verified,
      outDegree: stats?.outDegree || 0,
      baselineSpread,
      isolatedSpread,
      preventedSpread,
      effectivenessPercentage,
      bfsPreventedReach,
      betweennessScore: stats?.betweennessCentrality || 0,
      rank: 0,
    });
  }

  // Rank by ICM prevented spread descending, then effectiveness, then betweenness
  candidates.sort(
    (a, b) =>
      b.preventedSpread - a.preventedSpread ||
      b.effectivenessPercentage - a.effectivenessPercentage ||
      b.betweennessScore - a.betweennessScore
  );

  candidates.forEach((cand, idx) => {
    cand.rank = idx + 1;
  });

  return candidates;
}

/**
 * Structured academic comparison between deterministic BFS reachability and probabilistic ICM spread.
 */
export function compareBFSandICM(
  sourceId: string,
  nodes: UserNode[],
  connections: Connection[],
  options: ICMOptions = {}
): {
  sourceId: string;
  bfsTotalReachable: number;
  bfsStepsCount: number;
  icmExpectedSpread: number;
  icmStdDev: number;
  icmMinSpread: number;
  icmMaxSpread: number;
  icmAvgStepsCount: number;
  networkPenetrationPercentage: number;
  deficitSpread: number;
  academicExplanation: string;
} {
  const bfsResult = runBFSPropagation(sourceId, nodes, connections, options.blockedNodes || []);
  const icmStats = runMonteCarloICM(sourceId, nodes, connections, options);

  const avgSteps =
    icmStats.runs.length > 0
      ? Number(
          (
            icmStats.runs.reduce((acc, r) => acc + (r.steps.length - 1), 0) /
            icmStats.runs.length
          ).toFixed(1)
        )
      : 0;

  const deficitSpread = Number((bfsResult.totalReach - icmStats.averageSpread).toFixed(2));

  return {
    sourceId,
    bfsTotalReachable: bfsResult.totalReach,
    bfsStepsCount: bfsResult.propagationDepth,
    icmExpectedSpread: icmStats.averageSpread,
    icmStdDev: icmStats.stdDevSpread,
    icmMinSpread: icmStats.minSpread,
    icmMaxSpread: icmStats.maxSpread,
    icmAvgStepsCount: avgSteps,
    networkPenetrationPercentage: icmStats.reachablePenetrationPercentage,
    deficitSpread,
    academicExplanation:
      'Deterministic BFS measures topological upper bounds (assuming 100% transmission probability), identifying all structural paths. The Independent Cascade Model (ICM) models stochastic adoption where each transmission attempt has independent probability P(u -> v), capturing adoption friction, user skepticism, and realistic cascade dampening.',
  };
}
