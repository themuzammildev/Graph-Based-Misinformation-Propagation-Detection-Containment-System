export type NodeStatus = 'normal' | 'source' | 'exposed' | 'affected' | 'blocked' | 'containment_target';

export interface UserNode {
  id: string;
  name: string;
  role: string;
  verified: boolean;
  shares: number;
  independentSources: number;
  followers?: number;
  x: number;
  y: number;
  riskScore?: number;
  influenceScore?: number;
}

export interface DatasetMetadata {
  isCustomUpload: boolean;
  datasetName: string;
  uploadedAt?: string;
  format?: 'csv' | 'json' | 'preset';
  nodesCount: number;
  edgesCount: number;
  sourceType: 'demo' | 'uploaded' | 'benchmark';
}

export interface DatasetValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  nodesCount: number;
  edgesCount: number;
  density: number;
  deduplicatedEdgesCount: number;
  rejectedEdgesCount: number;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  weight?: number;
}

export interface InformationMessage {
  text: string;
  sourceUserId: string;
  verified: boolean;
  shares: number;
  independentSources: number;
  claimTopic: string;
}

export interface PropositionalRiskResult {
  credibilityScore: number; // 0 to 100
  riskScore: number; // 100 - credibility
  riskCategory: 'High' | 'Moderate' | 'Lower';
  formulaExplanation: string;
  propositionStates: {
    V: boolean; // Source verified
    S: boolean; // High share count (> 50)
    I: boolean; // Independent verification available (>= 2)
    U: boolean; // Source unverified (!V)
  };
  satisfiedRules: string[];
  scoringBreakdown: {
    label: string;
    delta: number;
    reason: string;
  }[];
}

export interface BFSStep {
  step: number;
  activeNodes: string[]; // nodes spreading at this step
  newlyAffectedNodes: string[]; // newly infected at this step
  cumulativeAffected: string[]; // all affected up to this step
  propagationEdges: { source: string; target: string }[];
  frontierQueue: string[];
}

export interface SimulationState {
  currentStep: number;
  totalSteps: number;
  affectedNodes: string[];
  newlyAffected: string[];
  propagationOrder: string[];
  stepsHistory: BFSStep[];
  isPlaying: boolean;
  isCompleted: boolean;
  speedMs: number;
  sourceNodeId: string;
  blockedNodes: string[];
}

export interface RecurrenceDataPoint {
  step: number;
  actualAffected: number;
  predictedAffected: number;
  growthDeltaActual: number;
  growthDeltaPredicted: number;
  // Extended multi-model comparison fields
  predictedLogisticAffected?: number;
  icmMeanAffected?: number;
  icmStdDev?: number;
  icmCiLow?: number;
  icmCiHigh?: number;
  deltaError?: number;
}

export interface GraphDerivedParameters {
  totalVertices: number; // |V| = N
  totalEdges: number; // |E|
  avgOutDegree: number; // <k_out>
  avgInDegree: number; // <k_in>
  outDegreeVariance: number; // Var(k_out)
  inDegreeVariance: number; // Var(k_in)
  inOutCovariance: number; // Cov(k_in, k_out)
  sourceOutDegree: number; // k_out(s)
  transmissionProbability: number; // p
  rNaive: number; // p * <k_out>
  rDegree: number; // p * <k_in * k_out> / <k_in> (correlated excess degree branching)
  rSource: number; // p * k_out(s)
  selectedR: number; // currently active branching factor
  degreeDistribution: { degree: number; count: number; probability: number }[];
}

export interface RecurrenceModelComparison {
  parameters: GraphDerivedParameters;
  dataPoints: RecurrenceDataPoint[];
  formulaString: string;
  logisticFormulaString: string;
  branchingFactorType: 'degree' | 'naive' | 'source' | 'manual';
  modelAssumptions: string[];
  modelLimitations: string[];
  maeStandard: number;
  rmseStandard: number;
  maeLogistic: number;
  rmseLogistic: number;
  finalPredictedStandard: number;
  finalPredictedLogistic: number;
  finalICM: number;
  finalBFS: number;
  saturationStep: number | null;
}

export interface RecurrenceContainmentCandidate {
  nodeId: string;
  nodeName: string;
  verified?: boolean;
  baselineSpread: number;
  containedSpread: number;
  preventedSpread: number;
  effectivenessPercentage: number;
  baselineBranchingFactor: number;
  containedBranchingFactor: number;
  newBranchingFactor: number;
  branchingFactorDelta?: number;
  icmPreventedSpread: number;
  icmEffectiveness: number;
  bfsPreventedReach: number;
  rank: number;
}

export interface BetweennessResult {
  raw: number;
  normalized: number;
}

export interface NodeInfluenceStats {
  id: string;
  name: string;
  verified: boolean;
  outDegree: number;
  inDegree: number;
  totalDegree: number;
  degreeCentrality: number; // outDegree / (N - 1)
  reachabilityCount: number; // how many total nodes can be reached from here
  rank: number;
  // Brandes Betweenness Centrality
  betweennessCentrality: number; // Normalized: C_B(v) / ((N - 1)(N - 2))
  rawBetweenness: number; // Raw Brandes score: \sum \sigma_{st}(v) / \sigma_{st}
  betweennessRank: number; // Rank ordered by betweenness centrality descending
  isBridgeNode: boolean; // True if node is a key structural bridge or cut-path vertex
  structuralRole: 'Broadcast Hub' | 'Propagation Bridge' | 'Information Gatekeeper' | 'Peripheral Node';
}

export interface ContainmentCandidate {
  nodeId: string;
  nodeName: string;
  verified: boolean;
  outDegree: number;
  influenceScore: number;
  originalReach: number;
  newReachAfterBlocking: number;
  preventedReach: number;
  effectivenessPercentage: number;
  rank: number;
}

export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  maxDegree: number;
  maxDegreeNode: string;
  graphDensity: number;
  diameterApprox: number;
  connectedComponentsCount: number;
}

export interface ICMStep {
  step: number;
  newlyActivatedNodes: string[];
  previouslyActivatedNodes: string[];
  cumulativeActiveNodes: string[];
  successfulEdges: { source: string; target: string; probability: number }[];
  attemptedEdges: { source: string; target: string; probability: number; succeeded: boolean }[];
}

export interface ICMSimulationRun {
  runIndex: number;
  seed: number;
  totalReach: number;
  steps: ICMStep[];
  activatedNodeSet: string[];
}

export interface ICMAggregateStats {
  iterations: number;
  transmissionProbability: number;
  sourceNodeId: string;
  seed: number;
  averageSpread: number;
  stdDevSpread: number;
  minSpread: number;
  maxSpread: number;
  bfsTheoreticalReach: number;
  reachablePenetrationPercentage: number;
  nodeActivationProbabilities: Record<string, number>;
  averageSpreadByStep: { step: number; avgNewlyActive: number; avgCumulativeActive: number }[];
  runs: ICMSimulationRun[];
  executionTimeMs: number;
}

export interface ICMOptions {
  transmissionProbability?: number; // default p \in [0, 1]
  useCustomEdgeProbabilities?: boolean; // if true and conn.weight \in [0, 1], use as p
  iterations?: number; // Monte Carlo iterations count M
  seed?: number; // pseudo-random seed for reproducibility
  blockedNodes?: string[]; // containment cuts
}

export interface ICMContainmentCandidate {
  nodeId: string;
  nodeName: string;
  verified: boolean;
  outDegree: number;
  baselineSpread: number;
  isolatedSpread: number;
  preventedSpread: number;
  effectivenessPercentage: number;
  bfsPreventedReach: number;
  betweennessScore: number;
  rank: number;
}

