import {
  UserNode,
  Connection,
  RecurrenceDataPoint,
  BFSStep,
  GraphDerivedParameters,
  RecurrenceModelComparison,
  RecurrenceContainmentCandidate,
  ICMAggregateStats,
} from '../types';
import { runBFSPropagation } from './graphTheory';
import { runMonteCarloICM } from './independentCascade';

/**
 * Calculates graph-derived structural parameters and degree distribution moments
 * for directed networks, honoring blocked/quarantined nodes.
 *
 * Implements:
 * - Total vertices N = |V \ B|
 * - Total directed edges M_E = |E \ incident(B)|
 * - First moments: <k_out>, <k_in>
 * - Second moments & variances: Var(k_out), Var(k_in)
 * - In-Out degree covariance: Cov(k_in, k_out) = <k_in * k_out> - <k_in><k_out>
 * - Degree distribution P(k_out)
 * - Branching factors:
 *     r_naive = p * <k_out>
 *     r_degree = p * <k_in * k_out> / <k_in> (correlated excess degree on configuration model)
 *     r_source = p * k_out(s)
 */
export function calculateGraphDerivedParameters(
  nodes: UserNode[],
  connections: Connection[],
  transmissionP: number = 0.35,
  sourceId?: string,
  blockedNodes: string[] = []
): GraphDerivedParameters {
  const p = Math.max(0, Math.min(1, transmissionP));
  const blockedSet = new Set(blockedNodes);

  // Active nodes V' = V \ B
  const activeNodes = nodes.filter((n) => !blockedSet.has(n.id));
  const activeNodeIds = new Set(activeNodes.map((n) => n.id));
  const N = activeNodes.length;

  if (N === 0) {
    return {
      totalVertices: 0,
      totalEdges: 0,
      avgOutDegree: 0,
      avgInDegree: 0,
      outDegreeVariance: 0,
      inDegreeVariance: 0,
      inOutCovariance: 0,
      sourceOutDegree: 0,
      transmissionProbability: p,
      rNaive: 0,
      rDegree: 0,
      rSource: 0,
      selectedR: 0,
      degreeDistribution: [],
    };
  }

  // Active edges E' = E \ incident(B)
  const activeConnections = connections.filter(
    (c) => activeNodeIds.has(c.source) && activeNodeIds.has(c.target)
  );
  const totalEdges = activeConnections.length;

  // Degrees per active node
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();

  for (const node of activeNodes) {
    inDegreeMap.set(node.id, 0);
    outDegreeMap.set(node.id, 0);
  }

  for (const conn of activeConnections) {
    outDegreeMap.set(conn.source, (outDegreeMap.get(conn.source) || 0) + 1);
    inDegreeMap.set(conn.target, (inDegreeMap.get(conn.target) || 0) + 1);
  }

  // First and second degree moments
  let sumOut = 0;
  let sumIn = 0;
  let sumOutSq = 0;
  let sumInSq = 0;
  let sumInOut = 0;
  const outDegreeFreq: Record<number, number> = {};

  for (const node of activeNodes) {
    const kOut = outDegreeMap.get(node.id) || 0;
    const kIn = inDegreeMap.get(node.id) || 0;

    sumOut += kOut;
    sumIn += kIn;
    sumOutSq += kOut * kOut;
    sumInSq += kIn * kIn;
    sumInOut += kIn * kOut;

    outDegreeFreq[kOut] = (outDegreeFreq[kOut] || 0) + 1;
  }

  const avgOutDegree = Number((sumOut / N).toFixed(4));
  const avgInDegree = Number((sumIn / N).toFixed(4));

  const meanOutSq = sumOutSq / N;
  const meanInSq = sumInSq / N;
  const meanInOut = sumInOut / N;

  const outDegreeVariance = Number(Math.max(0, meanOutSq - avgOutDegree * avgOutDegree).toFixed(4));
  const inDegreeVariance = Number(Math.max(0, meanInSq - avgInDegree * avgInDegree).toFixed(4));
  const inOutCovariance = Number((meanInOut - avgInDegree * avgOutDegree).toFixed(4));

  // Branching factor formulations
  const rNaive = Number((p * avgOutDegree).toFixed(4));

  // Degree-distribution-based excess branching factor:
  // r_degree = p * <k_in * k_out> / <k_in>
  const rDegree =
    avgInDegree > 0 ? Number((p * (meanInOut / avgInDegree)).toFixed(4)) : rNaive;

  // Source-specific out-degree branching factor
  const sourceNode = sourceId ? activeNodes.find((n) => n.id === sourceId) : activeNodes[0];
  const sourceOutDegree = sourceNode ? outDegreeMap.get(sourceNode.id) || 0 : 0;
  const rSource = Number((p * sourceOutDegree).toFixed(4));

  // Degree distribution table
  const degreeDistribution = Object.entries(outDegreeFreq)
    .map(([degStr, count]) => {
      const degree = parseInt(degStr, 10);
      return {
        degree,
        count,
        probability: Number((count / N).toFixed(4)),
      };
    })
    .sort((a, b) => a.degree - b.degree);

  return {
    totalVertices: N,
    totalEdges,
    avgOutDegree,
    avgInDegree,
    outDegreeVariance,
    inDegreeVariance,
    inOutCovariance,
    sourceOutDegree,
    transmissionProbability: p,
    rNaive,
    rDegree,
    rSource,
    selectedR: rDegree,
    degreeDistribution,
  };
}

export interface EnhancedRecurrenceOptions {
  transmissionProbability?: number;
  branchingFactorType?: 'degree' | 'naive' | 'source' | 'manual';
  manualBranchingFactor?: number;
  sourceNodeId?: string;
  blockedNodes?: string[];
  bfsSteps?: BFSStep[];
  icmStats?: ICMAggregateStats;
  maxStepsLimit?: number;
}

/**
 * Calculates graph-derived recurrence predictions and produces a structured 3-way
 * comparative synthesis contrasting:
 *   A. Recurrence Theoretical Prediction (Standard and Susceptible-Depleted Logistic)
 *   B. Independent Cascade Model (ICM) Monte Carlo Expectations with Confidence Intervals
 *   C. Deterministic BFS Structural Reachability Ceiling
 */
export function calculateEnhancedRecurrencePrediction(
  nodes: UserNode[],
  connections: Connection[],
  options: EnhancedRecurrenceOptions = {}
): RecurrenceModelComparison {
  const sourceId = options.sourceNodeId || nodes[0]?.id || '';
  const p = Math.max(0, Math.min(1, options.transmissionProbability ?? 0.35));
  const blockedNodes = options.blockedNodes || [];
  const branchingType = options.branchingFactorType || 'degree';

  // 1. Compute graph-derived parameters
  const params = calculateGraphDerivedParameters(nodes, connections, p, sourceId, blockedNodes);

  // Determine active branching factor r
  let activeR: number;
  if (branchingType === 'manual' && options.manualBranchingFactor !== undefined) {
    activeR = Math.max(0, options.manualBranchingFactor);
  } else if (branchingType === 'naive') {
    activeR = params.rNaive;
  } else if (branchingType === 'source') {
    activeR = params.rSource;
  } else {
    // Default: 'degree' (correlated excess degree branching)
    activeR = params.rDegree;
  }
  params.selectedR = Number(activeR.toFixed(4));

  // 2. Obtain BFS steps (deterministic ceiling)
  const resolvedBfsSteps: BFSStep[] =
    options.bfsSteps && options.bfsSteps.length > 0
      ? options.bfsSteps
      : runBFSPropagation(sourceId, nodes, connections, blockedNodes).steps;

  // 3. Obtain ICM Monte Carlo steps (stochastic ground truth)
  let icmStats = options.icmStats;
  if (!icmStats) {
    icmStats = runMonteCarloICM(sourceId, nodes, connections, {
      transmissionProbability: p,
      iterations: 50,
      seed: 42,
      blockedNodes,
    });
  }

  const N = params.totalVertices;
  const numSteps = Math.max(
    options.maxStepsLimit || 8,
    resolvedBfsSteps.length,
    icmStats.averageSpreadByStep.length
  );

  const dataPoints: RecurrenceDataPoint[] = [];

  // Trajectory state: Standard bounded recurrence
  // S(0) = 1, S(t+1) = min(N, floor(r * S(t)))
  let currentStdS = N > 0 ? 1 : 0;

  // Trajectory state: Susceptible-depleted logistic recurrence
  // deltaS(0) = 1, deltaS(t+1) = round(r * deltaS(t) * (N - S(t)) / N)
  let currentLogS = N > 0 ? 1 : 0;
  let currentLogDelta = N > 0 ? 1 : 0;

  let saturationStep: number | null = null;

  for (let step = 0; step < numSteps; step++) {
    // Actual BFS cumulative reach at this step
    let bfsCount = 0;
    if (step < resolvedBfsSteps.length) {
      bfsCount = resolvedBfsSteps[step].cumulativeAffected.length;
    } else if (resolvedBfsSteps.length > 0) {
      bfsCount = resolvedBfsSteps[resolvedBfsSteps.length - 1].cumulativeAffected.length;
    }

    // ICM Monte Carlo empirical average at this step
    let icmMean = 0;
    if (step < icmStats.averageSpreadByStep.length) {
      icmMean = icmStats.averageSpreadByStep[step].avgCumulativeActive;
    } else if (icmStats.averageSpreadByStep.length > 0) {
      icmMean =
        icmStats.averageSpreadByStep[icmStats.averageSpreadByStep.length - 1]
          .avgCumulativeActive;
    }

    // ICM variance and confidence interval
    // Standard error = stdDev / sqrt(M)
    const stdDev = icmStats.stdDevSpread;
    const standardError = icmStats.iterations > 1 ? stdDev / Math.sqrt(icmStats.iterations) : 0;
    const icmCiLow = Number(Math.max(1, icmMean - 1.96 * standardError).toFixed(2));
    const icmCiHigh = Number(Math.min(N, icmMean + 1.96 * standardError).toFixed(2));

    if (step === 0) {
      currentStdS = N > 0 ? 1 : 0;
      currentLogS = N > 0 ? 1 : 0;
      currentLogDelta = N > 0 ? 1 : 0;
    } else {
      // Standard bounded recurrence (monotonic cumulative spread):
      // S(t+1) = min(N, max(S(t), floor(r * S(t))))
      currentStdS = Math.min(N, Math.max(currentStdS, Math.floor(activeR * currentStdS)));

      // Susceptible-depleted logistic recurrence:
      // deltaS(t+1) = round(r * deltaS(t) * (N - S(t)) / N)
      if (N > 0 && currentLogS < N) {
        const susceptibleFraction = (N - currentLogS) / N;
        const newInfections = Math.min(
          N - currentLogS,
          Math.max(0, Math.round(activeR * currentLogDelta * susceptibleFraction))
        );
        currentLogDelta = newInfections;
        currentLogS = Math.min(N, currentLogS + currentLogDelta);
      } else {
        currentLogDelta = 0;
      }
    }

    if (currentStdS >= N && N > 0 && saturationStep === null) {
      saturationStep = step;
    }

    const prevBfs = step > 0 ? (dataPoints[step - 1]?.actualAffected || 0) : 0;
    const prevStd = step > 0 ? (dataPoints[step - 1]?.predictedAffected || 0) : 0;

    dataPoints.push({
      step,
      actualAffected: bfsCount,
      predictedAffected: currentStdS,
      predictedLogisticAffected: currentLogS,
      icmMeanAffected: Number(icmMean.toFixed(2)),
      icmStdDev: stdDev,
      icmCiLow,
      icmCiHigh,
      deltaError: Number(Math.abs(currentStdS - icmMean).toFixed(2)),
      growthDeltaActual: step === 0 ? bfsCount : bfsCount - prevBfs,
      growthDeltaPredicted: step === 0 ? currentStdS : currentStdS - prevStd,
    });
  }

  // Calculate prediction errors relative to ICM stochastic mean
  let sumAbsErrStd = 0;
  let sumSqErrStd = 0;
  let sumAbsErrLog = 0;
  let sumSqErrLog = 0;

  for (const pt of dataPoints) {
    const icm = pt.icmMeanAffected ?? 0;
    const diffStd = pt.predictedAffected - icm;
    const diffLog = (pt.predictedLogisticAffected ?? pt.predictedAffected) - icm;

    sumAbsErrStd += Math.abs(diffStd);
    sumSqErrStd += diffStd * diffStd;
    sumAbsErrLog += Math.abs(diffLog);
    sumSqErrLog += diffLog * diffLog;
  }

  const numPts = Math.max(1, dataPoints.length);
  const maeStandard = Number((sumAbsErrStd / numPts).toFixed(2));
  const rmseStandard = Number(Math.sqrt(sumSqErrStd / numPts).toFixed(2));
  const maeLogistic = Number((sumAbsErrLog / numPts).toFixed(2));
  const rmseLogistic = Number(Math.sqrt(sumSqErrLog / numPts).toFixed(2));

  const finalPt = dataPoints[dataPoints.length - 1];
  const finalPredictedStandard = finalPt ? finalPt.predictedAffected : 0;
  const finalPredictedLogistic = finalPt ? (finalPt.predictedLogisticAffected ?? 0) : 0;
  const finalICM = finalPt ? (finalPt.icmMeanAffected ?? 0) : 0;
  const finalBFS = finalPt ? finalPt.actualAffected : 0;

  const formulaString = `S(0) = ${N > 0 ? 1 : 0}, \\quad S(t+1) = \\min\\left(${N}, \\lfloor ${activeR.toFixed(2)} \\cdot S(t) \\rfloor\\right)`;
  const logisticFormulaString = `S(0) = 1, \\quad \\Delta S(t+1) = \\text{round}\\left(${activeR.toFixed(2)} \\cdot \\Delta S(t) \\cdot \\frac{${N} - S(t)}{${N}}\\right)`;

  const modelAssumptions = [
    'Random Configuration Network Model: Assumes outgoing transmission edges connect uniformly at random according to the degree distribution.',
    'Local Tree-Likeness: Assumes cycle-free local neighborhood structure without short clustering loops or overlapping friendship triangles.',
    'Memoryless Independent Diffusion: Assumes constant transmission probability across all steps without user exhaustion or variable attention.',
    'Homogeneous Population Mixing: Treats nodes within the same degree class as structurally interchangeable.',
  ];

  const modelLimitations = [
    'Cycle & Triangle Dampening: In clustered social graphs, mutual neighbors collide on already-infected nodes, rendering recurrence predictions an overestimate compared to simulated ICM.',
    'Degree Correlation Neglect: High modularity or assortativity can trap cascades in dense communities, preventing global branching factor propagation.',
    'Deterministic vs Stochastic Duality: Recurrence produces a single deterministic trajectory, ignoring the wide empirical variance (sigma) and bimodal survival/extinction behavior of stochastic ICM.',
    'Finite Capacity Clipping: Standard recurrence clips abruptly via min(N, ·) rather than modeling continuous gradual saturation, whereas logistic recurrence dampens growth as susceptible pool depletes.',
  ];

  return {
    parameters: params,
    dataPoints,
    formulaString,
    logisticFormulaString,
    branchingFactorType: branchingType,
    modelAssumptions,
    modelLimitations,
    maeStandard,
    rmseStandard,
    maeLogistic,
    rmseLogistic,
    finalPredictedStandard,
    finalPredictedLogistic,
    finalICM,
    finalBFS,
    saturationStep,
  };
}

/**
 * Evaluates candidate containment nodes under the graph-derived recurrence model.
 * Simulates network with candidate removed (G \ {c}), re-deriving structural parameters,
 * new branching factor r', and resulting theoretical spread reduction.
 */
export function evaluateRecurrenceContainmentCandidates(
  nodes: UserNode[],
  connections: Connection[],
  sourceId: string,
  options: {
    transmissionProbability?: number;
    branchingFactorType?: 'degree' | 'naive' | 'source' | 'manual';
    manualBranchingFactor?: number;
    timeSteps?: number;
    icmIterations?: number;
  } = {}
): RecurrenceContainmentCandidate[] {
  const p = options.transmissionProbability ?? 0.35;
  const branchingType = options.branchingFactorType || 'degree';
  const steps = options.timeSteps ?? 6;

  // 1. Baseline prediction on full graph G
  const baselineRec = calculateEnhancedRecurrencePrediction(nodes, connections, {
    transmissionProbability: p,
    branchingFactorType: branchingType,
    manualBranchingFactor: options.manualBranchingFactor,
    sourceNodeId: sourceId,
    maxStepsLimit: steps,
  });
  const baselineSpread = baselineRec.finalPredictedLogistic;

  // 2. Evaluate candidates (nodes other than source)
  const candidateNodes = nodes.filter((n) => n.id !== sourceId);
  const results: RecurrenceContainmentCandidate[] = [];

  for (const candidate of candidateNodes) {
    const blocked = [candidate.id];

    // Re-evaluate recurrence on G \ {c}
    const containedRec = calculateEnhancedRecurrencePrediction(nodes, connections, {
      transmissionProbability: p,
      branchingFactorType: branchingType,
      manualBranchingFactor: options.manualBranchingFactor,
      sourceNodeId: sourceId,
      maxStepsLimit: steps,
      blockedNodes: blocked,
    });

    const containedSpread = containedRec.finalPredictedLogistic;
    const preventedSpread = Number(Math.max(0, baselineSpread - containedSpread).toFixed(2));
    const effectivenessPercentage =
      baselineSpread > 0
        ? Number(((preventedSpread / baselineSpread) * 100).toFixed(1))
        : 0;

    // Deterministic BFS reach on G \ {c}
    const bfsBaseline = runBFSPropagation(sourceId, nodes, connections, []);
    const bfsContained = runBFSPropagation(sourceId, nodes, connections, blocked);
    const bfsPreventedReach = Math.max(0, bfsBaseline.totalReach - bfsContained.totalReach);

    // ICM Monte Carlo containment on G \ {c}
    const icmBaseline = runMonteCarloICM(sourceId, nodes, connections, {
      transmissionProbability: p,
      iterations: options.icmIterations || 30,
      seed: 42,
    });
    const icmContained = runMonteCarloICM(sourceId, nodes, connections, {
      transmissionProbability: p,
      iterations: options.icmIterations || 30,
      seed: 42,
      blockedNodes: blocked,
    });
    const icmPreventedSpread = Number(
      Math.max(0, icmBaseline.averageSpread - icmContained.averageSpread).toFixed(2)
    );
    const icmEffectiveness =
      icmBaseline.averageSpread > 0
        ? Number(((icmPreventedSpread / icmBaseline.averageSpread) * 100).toFixed(1))
        : 0;

    results.push({
      nodeId: candidate.id,
      nodeName: candidate.name,
      verified: candidate.verified,
      baselineSpread,
      containedSpread,
      preventedSpread,
      effectivenessPercentage,
      baselineBranchingFactor: baselineRec.parameters.selectedR,
      containedBranchingFactor: containedRec.parameters.selectedR,
      newBranchingFactor: containedRec.parameters.selectedR,
      branchingFactorDelta: Number((baselineRec.parameters.selectedR - containedRec.parameters.selectedR).toFixed(3)),
      icmPreventedSpread,
      icmEffectiveness,
      bfsPreventedReach,
      rank: 0,
    });
  }

  // Rank descending by prevented spread, then effectiveness
  results.sort((a, b) => b.preventedSpread - a.preventedSpread || b.effectivenessPercentage - a.effectivenessPercentage);
  results.forEach((cand, idx) => {
    cand.rank = idx + 1;
  });

  return results;
}

/**
 * Backward-compatible wrapper for existing components.
 */
export function calculateRecurrencePrediction(
  totalNetworkNodes: number,
  propagationFactor_r: number,
  bfsSteps: BFSStep[],
  maxStepsLimit: number = 7
): {
  dataPoints: RecurrenceDataPoint[];
  formulaString: string;
  mathExplanation: string;
  actualFinalAffected: number;
  predictedFinalAffected: number;
  saturationStep: number | null;
} {
  const N = Math.max(0, totalNetworkNodes);
  const r = Math.max(0, isNaN(propagationFactor_r) ? 1.0 : propagationFactor_r);

  const numSteps = Math.max(bfsSteps.length, maxStepsLimit);
  const dataPoints: RecurrenceDataPoint[] = [];

  let currentS = N > 0 ? 1 : 0;
  let saturationStep: number | null = null;

  for (let step = 0; step < numSteps; step++) {
    let actualCount = 0;
    if (step < bfsSteps.length) {
      actualCount = bfsSteps[step].cumulativeAffected.length;
    } else if (bfsSteps.length > 0) {
      actualCount = bfsSteps[bfsSteps.length - 1].cumulativeAffected.length;
    }

    if (step === 0) {
      currentS = N > 0 ? 1 : 0;
    } else {
      currentS = Math.min(N, Math.floor(r * currentS));
    }

    if (currentS >= N && N > 0 && saturationStep === null) {
      saturationStep = step;
    }

    const prevActual = step > 0 ? (dataPoints[step - 1]?.actualAffected || 0) : 0;
    const prevPredicted = step > 0 ? (dataPoints[step - 1]?.predictedAffected || 0) : 0;

    dataPoints.push({
      step,
      actualAffected: actualCount,
      predictedAffected: currentS,
      growthDeltaActual: step === 0 ? actualCount : actualCount - prevActual,
      growthDeltaPredicted: step === 0 ? currentS : currentS - prevPredicted,
    });
  }

  const formulaString = `S(0) = ${N > 0 ? 1 : 0}, \\quad S(n+1) = \\min\\left(${N}, \\lfloor ${r.toFixed(2)} \\cdot S(n) \\rfloor\\right)`;
  const mathExplanation = `The recurrence relation models epidemic-style cascading dissemination through a population of size N = ${N}. At each discrete epoch n, each affected agent activates approximately r = ${r.toFixed(2)} new connections. Because the network is finite, the function is bounded from above by min(N, ·), guaranteeing convergence to saturation rather than unbounded exponential divergence.`;

  const actualFinal = dataPoints[dataPoints.length - 1]?.actualAffected || 0;
  const predictedFinal = dataPoints[dataPoints.length - 1]?.predictedAffected || 0;

  return {
    dataPoints,
    formulaString,
    mathExplanation,
    actualFinalAffected: actualFinal,
    predictedFinalAffected: predictedFinal,
    saturationStep,
  };
}
