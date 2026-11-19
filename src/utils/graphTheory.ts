import {
  UserNode,
  Connection,
  BFSStep,
  NodeInfluenceStats,
  ContainmentCandidate,
  GraphStatistics,
  BetweennessResult,
} from '../types';

/**
 * Builds adjacency list for directed graph G = (V, E)
 * maps node ID -> array of target node IDs
 */
export function buildAdjacencyList(
  nodes: UserNode[],
  connections: Connection[],
  blockedNodes: Set<string> = new Set()
): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    if (!blockedNodes.has(node.id)) {
      adj.set(node.id, []);
    }
  }

  for (const conn of connections) {
    // Only connect if both source and target exist in nodes and are not blocked
    if (
      !blockedNodes.has(conn.source) &&
      !blockedNodes.has(conn.target) &&
      adj.has(conn.source) &&
      adj.has(conn.target)
    ) {
      const currentNeighbors = adj.get(conn.source)!;
      // Prevent duplicate outgoing edges in adjacency list
      if (!currentNeighbors.includes(conn.target)) {
        currentNeighbors.push(conn.target);
      }
    }
  }

  return adj;
}

/**
 * Builds reversed adjacency list (target -> incoming sources)
 */
export function buildInDegreeMap(
  nodes: UserNode[],
  connections: Connection[],
  blockedNodes: Set<string> = new Set()
): Map<string, number> {
  const inDegree = new Map<string, number>();
  const validNodeIds = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    if (!blockedNodes.has(node.id)) {
      inDegree.set(node.id, 0);
    }
  }

  for (const conn of connections) {
    if (
      !blockedNodes.has(conn.source) &&
      !blockedNodes.has(conn.target) &&
      validNodeIds.has(conn.source) &&
      validNodeIds.has(conn.target)
    ) {
      if (inDegree.has(conn.target)) {
        inDegree.set(conn.target, inDegree.get(conn.target)! + 1);
      }
    }
  }

  return inDegree;
}

/**
 * Calculates Betweenness Centrality for all vertices in a directed, unweighted graph
 * using Brandes' Algorithm (Ulrik Brandes, 2001).
 *
 * Mathematical Definition:
 *   C_B(v) = \sum_{s \neq v \neq t \in V} \frac{\sigma_{st}(v)}{\sigma_{st}}
 *
 * Where:
 *   - \sigma_{st} is the number of shortest directed paths from s to t (\sigma_{ss} = 1).
 *   - \sigma_{st}(v) is the number of shortest directed paths from s to t passing through v.
 *   - If \sigma_{st} = 0, \frac{\sigma_{st}(v)}{\sigma_{st}} = 0.
 *
 * Directed Normalization:
 *   In a directed graph of order N = |V|, the maximum possible betweenness of an
 *   intermediate vertex v is (N - 1)(N - 2), corresponding to all ordered pairs (s, t)
 *   with s \neq v \neq t.
 *
 *   For N > 2:
 *     C'_B(v) = \frac{C_B(v)}{(N - 1)(N - 2)}
 *   For N \le 2:
 *     C'_B(v) = 0
 *
 * Brandes' One-Sided Dependency Recurrence:
 *   \delta_{s\bullet}(v) = \sum_{w : v \in P_s(w)} \frac{\sigma_{sv}}{\sigma_{sw}} (1 + \delta_{s\bullet}(w))
 *   where P_s(w) is the set of predecessors of w on shortest paths from s:
 *     P_s(w) = \{ u \in V : (u, w) \in E \text{ and } d(s, w) = d(s, u) + 1 \}
 *
 * Time Complexity: O(|V| \cdot (|V| + |E|)) via single-source BFS traversals.
 * Space Complexity: O(|V| + |E|) for stacks, queues, and predecessor lists.
 */
export function calculateBetweennessCentrality(
  nodes: UserNode[],
  connections: Connection[],
  blockedNodes: Set<string> = new Set()
): Map<string, BetweennessResult> {
  const result = new Map<string, BetweennessResult>();

  // Filter active vertices
  const activeNodes = nodes.filter((n) => !blockedNodes.has(n.id));
  const nodeIds = activeNodes.map((n) => n.id);
  const N = nodeIds.length;

  // Initialize betweenness scores to 0
  const cb = new Map<string, number>();
  for (const id of nodeIds) {
    cb.set(id, 0);
  }

  // A graph with fewer than 3 nodes has no intermediate vertices on paths between distinct s and t
  if (N < 3) {
    for (const id of nodeIds) {
      result.set(id, { raw: 0, normalized: 0 });
    }
    return result;
  }

  const adj = buildAdjacencyList(nodes, connections, blockedNodes);

  // Single-source BFS shortest paths and dependency accumulation for each s in V
  for (const s of nodeIds) {
    // S: stack of vertices in non-decreasing order of distance from s
    const stack: string[] = [];

    // P[w]: predecessors of w on shortest paths from s
    const P = new Map<string, string[]>();
    // sigma[w]: number of shortest paths from s to w
    const sigma = new Map<string, number>();
    // d[w]: shortest path distance from s to w (-1 = infinity/unvisited)
    const d = new Map<string, number>();

    for (const id of nodeIds) {
      P.set(id, []);
      sigma.set(id, 0);
      d.set(id, -1);
    }

    sigma.set(s, 1);
    d.set(s, 0);

    // BFS queue with pointer index for O(1) dequeue operations
    const queue: string[] = [s];
    let head = 0;

    while (head < queue.length) {
      const v = queue[head++];
      stack.push(v);

      const distV = d.get(v)!;
      const sigmaV = sigma.get(v)!;
      const neighbors = adj.get(v) || [];

      for (const w of neighbors) {
        // Path discovery: first time visiting w
        if (d.get(w)! < 0) {
          d.set(w, distV + 1);
          queue.push(w);
        }

        // Path counting: edge (v, w) lies on a shortest directed path from s to w
        if (d.get(w)! === distV + 1) {
          sigma.set(w, sigma.get(w)! + sigmaV);
          P.get(w)!.push(v);
        }
      }
    }

    // delta[w]: dependency of source s on vertex w
    const delta = new Map<string, number>();
    for (const id of nodeIds) {
      delta.set(id, 0);
    }

    // Accumulate dependencies by popping stack in reverse topological / BFS order
    while (stack.length > 0) {
      const w = stack.pop()!;
      const deltaW = delta.get(w)!;
      const sigmaW = sigma.get(w)!;
      const preds = P.get(w)!;

      for (const v of preds) {
        const sigmaV = sigma.get(v)!;
        if (sigmaW > 0) {
          const contrib = (sigmaV / sigmaW) * (1 + deltaW);
          delta.set(v, delta.get(v)! + contrib);
        }
      }

      if (w !== s) {
        cb.set(w, cb.get(w)! + deltaW);
      }
    }
  }

  // Directed normalization: divide raw score by (N - 1)(N - 2)
  const normFactor = (N - 1) * (N - 2);

  for (const id of nodeIds) {
    const raw = cb.get(id) || 0;
    const normalized = normFactor > 0 ? raw / normFactor : 0;
    result.set(id, {
      raw: Number(raw.toFixed(4)),
      normalized: Number(normalized.toFixed(4)),
    });
  }

  return result;
}

/**
 * Calculates Out-Degree, In-Degree, Total Degree, Degree Centrality,
 * and Betweenness Centrality (Brandes' Algorithm) for all nodes.
 */
export function calculateCentralityStats(
  nodes: UserNode[],
  connections: Connection[]
): NodeInfluenceStats[] {
  const N = nodes.length;
  const adj = buildAdjacencyList(nodes, connections);
  const inDegreeMap = buildInDegreeMap(nodes, connections);
  const betweennessMap = calculateBetweennessCentrality(nodes, connections);

  const stats: NodeInfluenceStats[] = nodes.map((node) => {
    const outNeighbors = adj.get(node.id) || [];
    const outDegree = outNeighbors.length;
    const inDegree = inDegreeMap.get(node.id) || 0;
    const totalDegree = outDegree + inDegree;

    // Normalizing degree centrality by (N - 1)
    const degreeCentrality = N > 1 ? Number((outDegree / (N - 1)).toFixed(4)) : 0;

    // Compute total reachable nodes from this node via BFS
    const reachable = computeReachableCount(node.id, nodes, connections);

    const bResult = betweennessMap.get(node.id) || { raw: 0, normalized: 0 };

    return {
      id: node.id,
      name: node.name,
      verified: node.verified,
      outDegree,
      inDegree,
      totalDegree,
      degreeCentrality,
      reachabilityCount: reachable,
      rank: 0,
      betweennessCentrality: bResult.normalized,
      rawBetweenness: bResult.raw,
      betweennessRank: 0,
      isBridgeNode: false,
      structuralRole: 'Peripheral Node',
    };
  });

  // Sort descending by degreeCentrality, then reachability for standard degree rank
  stats.sort((a, b) => b.degreeCentrality - a.degreeCentrality || b.reachabilityCount - a.reachabilityCount);
  stats.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Calculate betweenness ranks
  const sortedByBetweenness = [...stats].sort(
    (a, b) => b.betweennessCentrality - a.betweennessCentrality || b.rawBetweenness - a.rawBetweenness
  );
  sortedByBetweenness.forEach((item, index) => {
    item.betweennessRank = index + 1;
  });

  // Assign structural roles & identify bridge nodes
  const maxBetweenness = sortedByBetweenness[0]?.betweennessCentrality || 0;
  const maxOutDegree = stats[0]?.outDegree || 0;

  for (const item of stats) {
    const isTopBetweenness = item.betweennessRank === 1 && item.betweennessCentrality > 0;
    const hasHighBetweenness =
      item.betweennessCentrality >= 0.08 ||
      (maxBetweenness > 0 && item.betweennessCentrality >= maxBetweenness * 0.5);
    const isDisproportionateBridge =
      item.betweennessCentrality > 0 &&
      (item.betweennessCentrality > item.degreeCentrality * 1.2 || item.outDegree <= 3);

    if (isTopBetweenness || (hasHighBetweenness && isDisproportionateBridge)) {
      item.isBridgeNode = true;
      item.structuralRole = 'Propagation Bridge';
    } else if (item.outDegree === maxOutDegree && item.outDegree > 0) {
      item.structuralRole = 'Broadcast Hub';
    } else if (item.inDegree >= 3 && item.outDegree < item.inDegree) {
      item.structuralRole = 'Information Gatekeeper';
    } else if (item.outDegree >= 3) {
      item.structuralRole = 'Broadcast Hub';
    } else {
      item.structuralRole = 'Peripheral Node';
    }
  }

  // Ensure top betweenness node is flagged as a bridge if its score is non-zero
  if (sortedByBetweenness[0] && sortedByBetweenness[0].betweennessCentrality > 0) {
    sortedByBetweenness[0].isBridgeNode = true;
    if (sortedByBetweenness[0].structuralRole === 'Peripheral Node') {
      sortedByBetweenness[0].structuralRole = 'Propagation Bridge';
    }
  }

  return stats;
}

/**
 * Calculates overall Graph Statistics including directed density:
 * Density D = |E| / (|V| * (|V| - 1))
 */
export function calculateGraphStatistics(
  nodes: UserNode[],
  connections: Connection[]
): GraphStatistics {
  const totalNodes = nodes.length;
  const totalEdges = connections.length;

  if (totalNodes <= 1) {
    return {
      totalNodes,
      totalEdges,
      averageDegree: 0,
      maxDegree: 0,
      maxDegreeNode: totalNodes > 0 ? nodes[0].id : 'N/A',
      graphDensity: 0,
      diameterApprox: 0,
      connectedComponentsCount: totalNodes === 0 ? 0 : 1,
    };
  }

  const adj = buildAdjacencyList(nodes, connections);
  let maxDeg = 0;
  let maxNode = nodes[0]?.id || 'N/A';
  let totalDegSum = 0;

  for (const node of nodes) {
    const deg = (adj.get(node.id) || []).length;
    totalDegSum += deg;
    if (deg > maxDeg) {
      maxDeg = deg;
      maxNode = node.id;
    }
  }

  const averageDegree = Number((totalDegSum / totalNodes).toFixed(2));
  // Directed density D = |E| / (N * (N - 1))
  const maxPossibleEdges = totalNodes * (totalNodes - 1);
  const graphDensity = maxPossibleEdges > 0 ? Number((totalEdges / maxPossibleEdges).toFixed(3)) : 0;

  return {
    totalNodes,
    totalEdges,
    averageDegree,
    maxDegree: maxDeg,
    maxDegreeNode: maxNode,
    graphDensity,
    diameterApprox: Math.min(totalNodes, Math.max(1, Math.round(Math.log2(totalNodes + 1)))),
    connectedComponentsCount: 1,
  };
}

/**
 * Performs rigorous Breadth-First Search (BFS) Level-by-Level Propagation.
 * Explores frontier neighbors level by level, documenting each step's active nodes,
 * newly infected nodes, cumulative infected set, and traversed edges.
 */
export function runBFSPropagation(
  sourceId: string,
  nodes: UserNode[],
  connections: Connection[],
  blockedNodes: string[] = []
): {
  steps: BFSStep[];
  visitedNodes: string[];
  totalReach: number;
  propagationDepth: number;
} {
  const blockedSet = new Set(blockedNodes);

  // If source is blocked or doesn't exist, zero spread
  if (!nodes.some((n) => n.id === sourceId) || blockedSet.has(sourceId)) {
    return {
      steps: [
        {
          step: 0,
          activeNodes: [],
          newlyAffectedNodes: [],
          cumulativeAffected: [],
          propagationEdges: [],
          frontierQueue: [],
        },
      ],
      visitedNodes: [],
      totalReach: 0,
      propagationDepth: 0,
    };
  }

  const adj = buildAdjacencyList(nodes, connections, blockedSet);
  const visited = new Set<string>();
  const steps: BFSStep[] = [];

  // Step 0: The source node is exposed / infected
  visited.add(sourceId);
  let currentLevel: string[] = [sourceId];
  let stepIndex = 0;

  steps.push({
    step: 0,
    activeNodes: [sourceId],
    newlyAffectedNodes: [sourceId],
    cumulativeAffected: Array.from(visited),
    propagationEdges: [],
    frontierQueue: [sourceId],
  });

  while (currentLevel.length > 0) {
    const nextLevel: string[] = [];
    const stepEdges: { source: string; target: string }[] = [];

    for (const u of currentLevel) {
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!visited.has(v) && !blockedSet.has(v)) {
          visited.add(v);
          nextLevel.push(v);
          stepEdges.push({ source: u, target: v });
        }
      }
    }

    if (nextLevel.length === 0) {
      break;
    }

    stepIndex++;
    steps.push({
      step: stepIndex,
      activeNodes: currentLevel,
      newlyAffectedNodes: nextLevel,
      cumulativeAffected: Array.from(visited),
      propagationEdges: stepEdges,
      frontierQueue: [...nextLevel],
    });

    currentLevel = nextLevel;
  }

  return {
    steps,
    visitedNodes: Array.from(visited),
    totalReach: visited.size,
    propagationDepth: stepIndex,
  };
}

/**
 * Computes count of reachable nodes from a given start node
 */
function computeReachableCount(
  startId: string,
  nodes: UserNode[],
  connections: Connection[],
  blockedSet = new Set<string>()
): number {
  if (blockedSet.has(startId) || !nodes.some((n) => n.id === startId)) return 0;
  const adj = buildAdjacencyList(nodes, connections, blockedSet);
  const visited = new Set<string>([startId]);
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      if (!visited.has(n) && !blockedSet.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  return visited.size;
}

/**
 * Containment Analysis:
 * Evaluates the impact of isolating each non-source node.
 * For candidate c:
 * 1. Temporarily isolate c: G' = G \ {c}
 * 2. Run propagation from source s
 * 3. Calculate new reach R_new
 * 4. Prevented reach = R_orig - R_new
 * 5. Effectiveness = (Prevented Reach / R_orig) * 100%
 */
export function evaluateContainmentCandidates(
  sourceId: string,
  nodes: UserNode[],
  connections: Connection[]
): ContainmentCandidate[] {
  // Baseline original reach
  const originalSim = runBFSPropagation(sourceId, nodes, connections, []);
  const originalReach = originalSim.totalReach;

  if (originalReach <= 1) {
    return [];
  }

  const candidates: ContainmentCandidate[] = [];
  const centralityList = calculateCentralityStats(nodes, connections);
  const centralityMap = new Map<string, NodeInfluenceStats>(
    centralityList.map((c) => [c.id, c])
  );

  // Test every reachable node except the source itself
  for (const node of nodes) {
    if (node.id === sourceId) continue;

    // Simulate isolation of this candidate
    const simWithContainment = runBFSPropagation(sourceId, nodes, connections, [node.id]);
    const newReach = simWithContainment.totalReach;
    const preventedReach = Math.max(0, originalReach - newReach);
    const effectivenessPercentage =
      originalReach > 0
        ? Number(((preventedReach / originalReach) * 100).toFixed(1))
        : 0;

    const stats = centralityMap.get(node.id);

    candidates.push({
      nodeId: node.id,
      nodeName: node.name,
      verified: node.verified,
      outDegree: stats?.outDegree || 0,
      influenceScore: Math.round((stats?.degreeCentrality || 0) * 100),
      originalReach,
      newReachAfterBlocking: newReach,
      preventedReach,
      effectivenessPercentage,
      rank: 0,
    });
  }

  // Sort by preventedReach descending, then effectiveness, then outDegree
  candidates.sort(
    (a, b) =>
      b.preventedReach - a.preventedReach ||
      b.effectivenessPercentage - a.effectivenessPercentage ||
      b.outDegree - a.outDegree
  );

  candidates.forEach((cand, idx) => {
    cand.rank = idx + 1;
  });

  return candidates;
}
