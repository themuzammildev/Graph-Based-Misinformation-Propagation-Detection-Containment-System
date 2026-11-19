import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UserNode,
  Connection,
  SimulationState,
  BFSStep,
} from '../types';
import { GraphCanvas } from '../components/GraphCanvas';
import { SpreadLineChart } from '../components/charts/SpreadLineChart';
import { ICMComparisonChart } from '../components/charts/ICMComparisonChart';
import {
  calculateRecurrencePrediction,
  calculateEnhancedRecurrencePrediction,
} from '../utils/recurrenceModel';
import {
  runMonteCarloICM,
  compareBFSandICM,
} from '../utils/independentCascade';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Share2,
  TrendingUp,
  Layers,
  ListOrdered,
  Sliders,
  GitBranch,
  Dices,
  Sparkles,
  Info,
  Activity,
  CheckCircle2,
  Compass,
  ArrowRight,
  GitFork,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calculator,
  HelpCircle,
  BarChart3,
} from 'lucide-react';

interface PropagationPredictionViewProps {
  nodes: UserNode[];
  connections: Connection[];
  simulationState: SimulationState;
  propagationFactor: number;
  fullBfsSteps: BFSStep[];
  bridgeNodeIds?: string[];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onNextStep: () => void;
  onChangeSpeed: (ms: number) => void;
  onSelectSourceNode: (nodeId: string) => void;
  onNodePositionChange: (id: string, x: number, y: number) => void;
  onChangePropagationFactor: (factor: number) => void;
}

export const PropagationPredictionView: React.FC<PropagationPredictionViewProps> = ({
  nodes,
  connections,
  simulationState,
  propagationFactor,
  fullBfsSteps,
  bridgeNodeIds = [],
  onStart,
  onPause,
  onResume,
  onReset,
  onNextStep,
  onChangeSpeed,
  onSelectSourceNode,
  onNodePositionChange,
  onChangePropagationFactor,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tree' | 'prediction' | 'cascade'>('tree');
  const [sliderVal, setSliderVal] = useState(propagationFactor);

  // Independent Cascade Model (ICM) Configuration State
  const [icmSourceId, setIcmSourceId] = useState<string>(simulationState.sourceNodeId);
  const [transmissionP, setTransmissionP] = useState<number>(0.35);
  const [iterations, setIterations] = useState<number>(100);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [useCustomWeights, setUseCustomWeights] = useState<boolean>(false);
  const [icmStepIndex, setIcmStepIndex] = useState<number>(0);
  const [isIcmPlaying, setIsIcmPlaying] = useState<boolean>(false);

  useEffect(() => {
    setSliderVal(propagationFactor);
  }, [propagationFactor]);

  useEffect(() => {
    if (simulationState.sourceNodeId) {
      setIcmSourceId(simulationState.sourceNodeId);
    }
  }, [simulationState.sourceNodeId]);

  const currentStepData = simulationState.stepsHistory[simulationState.currentStep] || null;
  const reachPercentage =
    nodes.length > 0 ? Math.round((simulationState.affectedNodes.length / nodes.length) * 100) : 0;

  const recurrenceResult = calculateRecurrencePrediction(
    nodes.length,
    sliderVal,
    fullBfsSteps,
    Math.max(8, fullBfsSteps.length + 2)
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSliderVal(val);
    onChangePropagationFactor(val);
  };

  // Run Monte Carlo ICM Simulation
  const icmStats = useMemo(() => {
    return runMonteCarloICM(icmSourceId, nodes, connections, {
      transmissionProbability: transmissionP,
      iterations,
      seed: randomSeed,
      useCustomEdgeProbabilities: useCustomWeights,
      blockedNodes: simulationState.blockedNodes,
    });
  }, [
    icmSourceId,
    nodes,
    connections,
    transmissionP,
    iterations,
    randomSeed,
    useCustomWeights,
    simulationState.blockedNodes,
  ]);

  // Structured Academic Comparison between Deterministic BFS and Probabilistic ICM
  const comparison = useMemo(() => {
    return compareBFSandICM(icmSourceId, nodes, connections, {
      transmissionProbability: transmissionP,
      iterations,
      seed: randomSeed,
      useCustomEdgeProbabilities: useCustomWeights,
      blockedNodes: simulationState.blockedNodes,
    });
  }, [
    icmSourceId,
    nodes,
    connections,
    transmissionP,
    iterations,
    randomSeed,
    useCustomWeights,
    simulationState.blockedNodes,
  ]);

  // Graph-Derived Recurrence Configuration State
  const [branchingFactorType, setBranchingFactorType] = useState<'degree' | 'naive' | 'source' | 'manual'>('degree');
  const [recurrenceTransmissionP, setRecurrenceTransmissionP] = useState<number>(0.35);

  // Enhanced Graph-Derived Recurrence & Multi-Model Synthesis
  const enhancedRecurrenceResult = useMemo(() => {
    return calculateEnhancedRecurrencePrediction(nodes, connections, {
      transmissionProbability: recurrenceTransmissionP,
      branchingFactorType,
      manualBranchingFactor: sliderVal,
      sourceNodeId: icmSourceId,
      blockedNodes: simulationState.blockedNodes,
      bfsSteps: fullBfsSteps,
      icmStats,
    });
  }, [
    nodes,
    connections,
    recurrenceTransmissionP,
    branchingFactorType,
    sliderVal,
    icmSourceId,
    simulationState.blockedNodes,
    fullBfsSteps,
    icmStats,
  ]);

  // Primary representative simulation run for step-by-step playback
  const representativeRun = icmStats.runs[0] || {
    steps: [
      {
        step: 0,
        newlyActivatedNodes: [icmSourceId],
        previouslyActivatedNodes: [],
        cumulativeActiveNodes: [icmSourceId],
        successfulEdges: [],
        attemptedEdges: [],
      },
    ],
    totalReach: 1,
    runIndex: 0,
    seed: randomSeed,
    activatedNodeSet: [icmSourceId],
  };

  const clampedIcmStep = Math.min(icmStepIndex, Math.max(0, representativeRun.steps.length - 1));
  const currentIcmStepData = representativeRun.steps[clampedIcmStep] || representativeRun.steps[0];

  // Playback timer for ICM cascade
  const icmTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isIcmPlaying) {
      icmTimerRef.current = setInterval(() => {
        setIcmStepIndex((prev) => {
          if (prev < representativeRun.steps.length - 1) {
            return prev + 1;
          } else {
            setIsIcmPlaying(false);
            return prev;
          }
        });
      }, 1000);
    } else {
      if (icmTimerRef.current) clearInterval(icmTimerRef.current);
    }

    return () => {
      if (icmTimerRef.current) clearInterval(icmTimerRef.current);
    };
  }, [isIcmPlaying, representativeRun.steps.length]);

  const bfsChartSteps = useMemo(() => {
    if (fullBfsSteps.length === 0) {
      return [{ step: 0, cumulativeReach: 1 }];
    }
    return fullBfsSteps.map((s) => ({
      step: s.step,
      cumulativeReach: s.cumulativeAffected.length,
    }));
  }, [fullBfsSteps]);

  const nodeActivationList = useMemo(() => {
    return nodes
      .map((node) => {
        const prob = icmStats.nodeActivationProbabilities[node.id] || 0;
        const isReachable =
          simulationState.affectedNodes.includes(node.id) ||
          fullBfsSteps.some((s) => s.cumulativeAffected.includes(node.id));
        return {
          node,
          prob,
          isReachable,
        };
      })
      .sort((a, b) => b.prob - a.prob);
  }, [nodes, icmStats.nodeActivationProbabilities, simulationState.affectedNodes, fullBfsSteps]);

  const handleIcmPrevStep = () => {
    setIsIcmPlaying(false);
    setIcmStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleIcmNextStep = () => {
    setIsIcmPlaying(false);
    setIcmStepIndex((prev) => Math.min(representativeRun.steps.length - 1, prev + 1));
  };

  const handleIcmReset = () => {
    setIsIcmPlaying(false);
    setIcmStepIndex(0);
  };

  const handleIcmTogglePlay = () => {
    if (clampedIcmStep >= representativeRun.steps.length - 1) {
      setIcmStepIndex(0);
      setIsIcmPlaying(true);
    } else {
      setIsIcmPlaying((prev) => !prev);
    }
  };

  const handleRollSeed = () => {
    setRandomSeed(Math.floor(Math.random() * 90000) + 1000);
    setIcmStepIndex(0);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Propagation Simulation & Diffusion Modelling
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic BFS (Module 4), Recurrence Growth (Module 3) & Independent Cascade Model (ICM)
          </p>
        </div>

        {/* View Switcher: Tree vs Prediction vs ICM */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('tree')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'tree'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5 text-blue-600" />
            <span>Propagation Tree (BFS)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('prediction')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'prediction'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            <span>Discrete Recurrence (M3)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('cascade')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'cascade'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="h-3.5 w-3.5 text-purple-600" />
            <span>Independent Cascade (ICM)</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'tree' ? (
        <>
          {/* Traversal Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Current Step n</div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {simulationState.currentStep}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  / {simulationState.totalSteps}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Discrete traversal depth</div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Affected Users</div>
              <div className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums">
                {simulationState.affectedNodes.length}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {nodes.length}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Cumulative reach set</div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Frontier Wave</div>
              <div className="mt-1 font-mono text-2xl font-bold text-blue-600 tabular-nums">
                {currentStepData ? currentStepData.newlyAffectedNodes.length : 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Newly infected at step n</div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Network Penetration</div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {reachPercentage}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Proportion of |V|</div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              {!simulationState.isPlaying ? (
                <button
                  onClick={simulationState.currentStep > 0 ? onResume : onStart}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{simulationState.currentStep > 0 ? 'Resume' : 'Start BFS'}</span>
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-600 transition-colors cursor-pointer"
                >
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={onNextStep}
                disabled={simulationState.isPlaying || simulationState.isCompleted}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <SkipForward className="h-3.5 w-3.5 text-slate-500" />
                <span>Next Step</span>
              </button>

              <button
                onClick={onReset}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500 font-medium">Source:</span>
              <select
                value={simulationState.sourceNodeId}
                onChange={(e) => onSelectSourceNode(e.target.value)}
                disabled={simulationState.isPlaying}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono font-bold text-blue-700 outline-none text-xs cursor-pointer"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id} ({n.name})
                  </option>
                ))}
              </select>

              <span className="text-slate-400">|</span>

              <span className="text-slate-500">Speed:</span>
              <div className="flex gap-1">
                {[1000, 600, 300].map((ms) => (
                  <button
                    key={ms}
                    onClick={() => onChangeSpeed(ms)}
                    className="rounded border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    {ms === 1000 ? '1x' : ms === 600 ? '1.5x' : '2x'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Visualizer & Traversal Tree Column */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Interactive Propagation Wavefronts
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  BFS Level Waves L_n
                </span>
              </div>
              <GraphCanvas
                nodes={nodes}
                connections={connections}
                sourceNodeId={simulationState.sourceNodeId}
                affectedNodes={simulationState.affectedNodes}
                activeStepNodes={simulationState.newlyAffected}
                activeStepEdges={currentStepData?.propagationEdges || []}
                blockedNodes={simulationState.blockedNodes}
                bridgeNodeIds={bridgeNodeIds}
                onSelectNode={onSelectSourceNode}
                onNodePositionChange={onNodePositionChange}
                height={500}
              />
            </div>

            <div className="lg:col-span-4 space-y-4">
              {/* Active Step Details */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Step n = {simulationState.currentStep} Frontier</span>
                </h2>

                {currentStepData ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        Active Transmitters:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {currentStepData.activeNodes.length > 0 ? (
                          currentStepData.activeNodes.map((id) => (
                            <span
                              key={id}
                              className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700 font-bold"
                            >
                              {id}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 font-sans">None</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        Newly Reached Vertices:
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {currentStepData.newlyAffectedNodes.length > 0 ? (
                          currentStepData.newlyAffectedNodes.map((id) => (
                            <span
                              key={id}
                              className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800 font-bold"
                            >
                              {id}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 font-sans">Traversal terminated</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        BFS FIFO Queue Q:
                      </span>
                      <div className="mt-1 rounded-md bg-slate-50 p-2 border border-slate-200 text-[11px] text-slate-700 font-mono">
                        Q = [{currentStepData.frontierQueue.join(', ') || '∅ (Empty)'}]
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Simulation not started.</p>
                )}
              </div>

              {/* Step Sequence Log */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <ListOrdered className="h-4 w-4 text-green-600" />
                    <span>Propagation Tree Edges</span>
                  </h2>
                  <span className="text-[10px] font-mono text-slate-500">
                    {simulationState.propagationOrder.length} visited
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                  {simulationState.stepsHistory.map((step) => (
                    <div
                      key={step.step}
                      className={`rounded-md border p-2 text-xs transition-colors ${
                        step.step === simulationState.currentStep
                          ? 'border-blue-300 bg-blue-50/70 text-blue-900'
                          : 'border-slate-100 bg-slate-50/60 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                        <span>Step {step.step}:</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          +{step.newlyAffectedNodes.length} nodes
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700">
                        {step.step === 0 ? (
                          <span>Source: {step.newlyAffectedNodes.join(', ')}</span>
                        ) : step.propagationEdges.length > 0 ? (
                          <div className="space-y-0.5">
                            {step.propagationEdges.map((e, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="font-semibold text-slate-900">{e.source}</span>
                                <span className="text-slate-400">→</span>
                                <span className="font-semibold text-blue-600">{e.target}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No outward branch</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeSubTab === 'prediction' ? (
        /* Module 3: Graph-Derived Recurrence & Multi-Model Diffusion Analysis */
        <div className="space-y-6">
          {/* Recurrence Equation & Theoretical Foundations Hero Card */}
          <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-slate-50 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 font-mono">
                    <TrendingUp className="h-3 w-3" />
                    GRAPH-DERIVED RECURRENCE PREDICTION (MODULE 3)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Configuration Model Branching & Multi-Model Synthesis
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Mathematical Spread Predictions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-800">
                  <div className="bg-white/90 rounded-md border border-amber-200 p-3 space-y-1 shadow-2xs">
                    <span className="font-semibold text-amber-900 block font-sans">1. Standard Growth Prediction</span>
                    <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                      Models rapid viral forwarding at each step, naturally bounded by the total number of users in the network.
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-md border border-emerald-200 p-3 space-y-1 shadow-2xs">
                    <span className="font-semibold text-emerald-900 block font-sans">2. Realistic Saturation Prediction</span>
                    <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                      Accounts for people who already saw the message. Growth naturally slows down as the rumor runs out of new people to reach.
                    </p>
                  </div>
                </div>

                {/* Academic Caveat Banner */}
                <div className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50/80 border border-amber-200 rounded-md p-3">
                  <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-950 font-sans">
                      How Spread Prediction Works:
                    </p>
                    <p className="leading-relaxed font-sans">
                      The spreading rate <span className="font-semibold text-amber-900">r</span> is derived dynamically from the network's connection pattern. It provides a clear analytical forecast of how many users will be reached in subsequent forwarding rounds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formula & Active Branching Factor Summary Badge */}
              <div className="shrink-0 flex flex-col items-end gap-2">
                <div className="rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs shadow-2xs text-right space-y-1 min-w-[200px]">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Branching Factor r</div>
                  <div className="text-2xl font-bold text-amber-600 tabular-nums">
                    {enhancedRecurrenceResult.parameters.selectedR.toFixed(2)}
                  </div>
                  <span className="inline-block rounded bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-sans font-medium">
                    {branchingFactorType === 'degree'
                      ? 'Excess Degree (Config. Model)'
                      : branchingFactorType === 'naive'
                      ? 'Naive Mean Out-Degree'
                      : branchingFactorType === 'source'
                      ? 'Source Out-Degree'
                      : 'Manual Override'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Graph-Derived Parameters Toolbar */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-amber-600" />
                <span>Empirical Graph Topology Parameters & Branching Mode</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Source: {icmSourceId} | N = {enhancedRecurrenceResult.parameters.totalVertices}
              </span>
            </div>

            {/* 4 Parameter Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                <div className="text-[11px] font-medium text-slate-500">Active Topology Scale</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  |V| = {enhancedRecurrenceResult.parameters.totalVertices}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    |E| = {enhancedRecurrenceResult.parameters.totalEdges}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Quarantined: {simulationState.blockedNodes.length} nodes
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                <div className="text-[11px] font-medium text-slate-500">Degree First Moments</div>
                <div className="mt-1 font-mono text-lg font-bold text-blue-700 tabular-nums">
                  ⟨k<sub>out</sub>⟩ = {enhancedRecurrenceResult.parameters.avgOutDegree.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Var(k<sub>out</sub>) = {enhancedRecurrenceResult.parameters.outDegreeVariance.toFixed(2)}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                <div className="text-[11px] font-medium text-slate-500">Degree Covariance</div>
                <div className="mt-1 font-mono text-lg font-bold text-purple-700 tabular-nums">
                  {enhancedRecurrenceResult.parameters.inOutCovariance.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {enhancedRecurrenceResult.parameters.inOutCovariance > 0
                    ? 'Positive hub correlation'
                    : 'Uncorrelated / assortative'}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-medium text-slate-500">Transmission Prob. p</div>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {recurrenceTransmissionP.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={recurrenceTransmissionP}
                  onChange={(e) => setRecurrenceTransmissionP(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>p=0.0</span>
                  <span>p=0.5</span>
                  <span>p=1.0</span>
                </div>
              </div>
            </div>

            {/* Branching Factor Model Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700">
                Select Graph-Derived Branching Factor Formulation:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* 1. Correlated Excess Degree (Recommended) */}
                <button
                  type="button"
                  onClick={() => setBranchingFactorType('degree')}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                    branchingFactorType === 'degree'
                      ? 'border-amber-400 bg-amber-50/60 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-900">
                      r<sub>degree</sub> = {enhancedRecurrenceResult.parameters.rDegree.toFixed(2)}
                    </span>
                    <span className="rounded bg-amber-200/70 text-amber-900 text-[9px] font-semibold px-1 py-0.2">
                      Recommended
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700 mt-1">Correlated Excess Degree</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    p · ⟨k<sub>in</sub>k<sub>out</sub>⟩ / ⟨k<sub>in</sub>⟩
                  </div>
                </button>

                {/* 2. Naive Mean Out-Degree */}
                <button
                  type="button"
                  onClick={() => setBranchingFactorType('naive')}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                    branchingFactorType === 'naive'
                      ? 'border-amber-400 bg-amber-50/60 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-900">
                      r<sub>naive</sub> = {enhancedRecurrenceResult.parameters.rNaive.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Mean Out</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700 mt-1">Homogeneous Average</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    p · ⟨k<sub>out</sub>⟩
                  </div>
                </button>

                {/* 3. Source Immediate Out-Degree */}
                <button
                  type="button"
                  onClick={() => setBranchingFactorType('source')}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                    branchingFactorType === 'source'
                      ? 'border-amber-400 bg-amber-50/60 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-900">
                      r<sub>source</sub> = {enhancedRecurrenceResult.parameters.rSource.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Step 1</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700 mt-1">Source Immediate Out-Degree</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    p · k<sub>out</sub>({icmSourceId})
                  </div>
                </button>

                {/* 4. Manual Custom Override */}
                <button
                  type="button"
                  onClick={() => setBranchingFactorType('manual')}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                    branchingFactorType === 'manual'
                      ? 'border-amber-400 bg-amber-50/60 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      r<sub>manual</sub> = {sliderVal.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Slider</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-700 mt-1">Manual Custom Override</div>
                  <div className="text-[10px] text-slate-500 font-mono">Arbitrary experiment</div>
                </button>
              </div>

              {/* Slider appears if manual override is active */}
              {branchingFactorType === 'manual' && (
                <div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="manual-factor-slider" className="text-xs font-semibold text-slate-700">
                      Manual Branching Factor r:
                    </label>
                    <span className="font-mono text-sm font-bold text-blue-600">{sliderVal.toFixed(2)}</span>
                  </div>
                  <input
                    id="manual-factor-slider"
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={sliderVal}
                    onChange={handleSliderChange}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span>Dampened (0.50)</span>
                    <span>1.00</span>
                    <span>Virulent (3.00)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Model Comparison KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Deterministic BFS Structural Ceiling */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium text-slate-500">BFS Structural Ceiling</div>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-800">
                  Upper Bound (p=1.0)
                </span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-blue-700 tabular-nums">
                {enhancedRecurrenceResult.finalBFS}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {nodes.length} nodes</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Topological reachability limit</div>
            </div>

            {/* 2. ICM Monte Carlo Simulated Mean */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-purple-900">ICM Simulated Spread</div>
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-purple-800">
                  Monte Carlo (M={iterations})
                </span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-purple-700 tabular-nums">
                {enhancedRecurrenceResult.finalICM.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ± {icmStats.stdDevSpread.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Stochastic ground truth under p={recurrenceTransmissionP.toFixed(2)}
              </div>
            </div>

            {/* 3. Recurrence Theoretical Spread */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-amber-900">Recurrence Prediction</div>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-800">
                  Theoretical S(T)
                </span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
                {enhancedRecurrenceResult.finalPredictedStandard}
                <span className="text-xs font-normal text-emerald-700 ml-2">
                  (Logistic: {enhancedRecurrenceResult.finalPredictedLogistic})
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {enhancedRecurrenceResult.saturationStep !== null
                  ? `Saturated at step ${enhancedRecurrenceResult.saturationStep}`
                  : 'Sub-saturation steady state'}
              </div>
            </div>

            {/* 4. Prediction Error vs Simulated Mean */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium text-slate-500">Prediction Accuracy Error</div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
                  |S − μ|
                </span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {enhancedRecurrenceResult.maeLogistic.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">MAE</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                RMSE = {enhancedRecurrenceResult.rmseLogistic.toFixed(2)} vs ICM stochastic mean
              </div>
            </div>
          </div>

          {/* Tri-Model Spread Trajectories Chart */}
          <SpreadLineChart
            dataPoints={enhancedRecurrenceResult.dataPoints}
            totalNodes={nodes.length}
            height={330}
            theoreticalLabel={`Standard Recurrence [r = ${enhancedRecurrenceResult.parameters.selectedR.toFixed(2)}]`}
            actualLabel="BFS Structural Ceiling"
            showICMComparison={true}
          />

          {/* Mathematical Model Assumptions vs Theoretical Limitations Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Assumptions */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-1.5 border-b border-blue-100 pb-2">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Model Assumptions (Branching Process)
                </h4>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                {enhancedRecurrenceResult.modelAssumptions.map((assump, idx) => (
                  <li key={idx}>{assump}</li>
                ))}
              </ul>
            </div>

            {/* Card 2: Limitations */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-1.5 border-b border-amber-100 pb-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Known Mathematical Limitations
                </h4>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                {enhancedRecurrenceResult.modelLimitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Step-by-Step Multi-Model Values Table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <span>Multi-Model Step Progression & Residual Analysis</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Comparing discrete epochs t = 0, 1, 2, ...
              </span>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200">
                  <tr className="text-slate-500 font-sans text-[11px]">
                    <th className="px-4 py-2.5 font-semibold">Step (Time)</th>
                    <th className="px-4 py-2.5 font-semibold text-amber-700">Standard Growth</th>
                    <th className="px-4 py-2.5 font-semibold text-emerald-700">Saturation Model</th>
                    <th className="px-4 py-2.5 font-semibold text-purple-700">Simulated Average</th>
                    <th className="px-4 py-2.5 font-semibold text-blue-700">Maximum Reach</th>
                    <th className="px-4 py-2.5 font-semibold">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {enhancedRecurrenceResult.dataPoints.map((pt) => {
                    const icm = pt.icmMeanAffected ?? 0;
                    const err = Number(Math.abs(pt.predictedAffected - icm).toFixed(2));
                    return (
                      <tr key={pt.step} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2 font-bold text-slate-900 font-sans">Step {pt.step}</td>
                        <td className="px-4 py-2 font-semibold text-amber-600">
                          {pt.predictedAffected}
                        </td>
                        <td className="px-4 py-2 font-semibold text-emerald-600">
                          {pt.predictedLogisticAffected ?? pt.predictedAffected}
                        </td>
                        <td className="px-4 py-2 font-semibold text-purple-600">
                          {icm.toFixed(2)}
                          {pt.icmCiLow !== undefined && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              [{pt.icmCiLow}, {pt.icmCiHigh}]
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-semibold text-blue-600">
                          {pt.actualAffected}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              err === 0
                                ? 'bg-slate-100 text-slate-600'
                                : err < 2
                                ? 'bg-emerald-50 text-emerald-700'
                                : err < 5
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            Δ = {err}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Independent Cascade Model (ICM) Simulation View */
        <div className="space-y-6">
          {/* Academic Model Header & Mathematical Equations */}
          <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50/60 via-white to-slate-50 p-6 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-800 font-mono">
                    <Share2 className="h-3 w-3" />
                    INDEPENDENT CASCADE MODEL (ICM)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Kempe, Kleinberg & Tardos (2003) / Goldenberg et al. (2001)
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Realistic Probabilistic Simulation (Independent Cascade)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-800">
                  <div className="bg-white/90 rounded-md border border-purple-200 p-3 shadow-2xs">
                    <span className="font-semibold text-purple-900 block font-sans">1. Sharing Chance ({Math.round(transmissionP * 100)}%)</span>
                    <p className="text-[11px] text-slate-600 font-sans mt-0.5 leading-relaxed">
                      Each friend has a {Math.round(transmissionP * 100)}% chance of forwarding the message.
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-md border border-purple-200 p-3 shadow-2xs">
                    <span className="font-semibold text-purple-900 block font-sans">2. One-Time Chance</span>
                    <p className="text-[11px] text-slate-600 font-sans mt-0.5 leading-relaxed">
                      A user only attempts to forward once when they first see the rumor.
                    </p>
                  </div>
                  <div className="bg-white/90 rounded-md border border-purple-200 p-3 shadow-2xs">
                    <span className="font-semibold text-purple-900 block font-sans">3. Permanent State</span>
                    <p className="text-[11px] text-slate-600 font-sans mt-0.5 leading-relaxed">
                      Once a user receives the rumor, they remain in the informed group.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50/70 border border-amber-200/80 rounded-md p-2.5">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900 font-sans">
                      Realistic Probability vs Maximum Potential:
                    </p>
                    <p className="leading-relaxed font-sans text-slate-600">
                      <strong>BFS</strong> shows the maximum possible reach if everyone forwards the post. <strong>ICM</strong> runs {iterations} randomized simulations to show what is realistically likely to happen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Execution Badge */}
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs shadow-2xs">
                  <Activity className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-slate-500">Benchmark:</span>
                  <span className="font-bold text-slate-900">{icmStats.executionTimeMs.toFixed(1)} ms</span>
                  <span className="text-slate-400">({iterations} runs)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulation Configuration Controls */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-purple-600" />
                <span>Simulation Hyperparameters & Seed Controls</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                PRNG: Mulberry32 (Seed = {randomSeed})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Source Node Selector */}
              <div>
                <label htmlFor="icm-source-select" className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Initial Source Node s
                </label>
                <select
                  id="icm-source-select"
                  value={icmSourceId}
                  onChange={(e) => {
                    setIcmSourceId(e.target.value);
                    setIcmStepIndex(0);
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name} ({node.id}) {node.verified ? '✓' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Seed of diffusion cascade</span>
              </div>

              {/* Transmission Probability Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="transmission-p-slider" className="text-xs font-semibold text-slate-700">
                    Probability P(u → v)
                  </label>
                  <span className="font-mono text-xs font-bold text-purple-600">
                    {transmissionP.toFixed(2)} ({(transmissionP * 100).toFixed(0)}%)
                  </span>
                </div>
                <input
                  id="transmission-p-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={transmissionP}
                  onChange={(e) => {
                    setTransmissionP(parseFloat(e.target.value));
                    setIcmStepIndex(0);
                  }}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0.0 (None)</span>
                  <span>0.50</span>
                  <span>1.0 (BFS Bound)</span>
                </div>
              </div>

              {/* Monte Carlo Iterations M */}
              <div>
                <label htmlFor="icm-iterations-select" className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Monte Carlo Iterations M
                </label>
                <select
                  id="icm-iterations-select"
                  value={iterations}
                  onChange={(e) => {
                    setIterations(parseInt(e.target.value, 10));
                    setIcmStepIndex(0);
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden"
                >
                  <option value={25}>25 runs (Fastest)</option>
                  <option value={50}>50 runs</option>
                  <option value={100}>100 runs (Standard)</option>
                  <option value={250}>250 runs</option>
                  <option value={500}>500 runs (High Precision)</option>
                  <option value={1000}>1,000 runs (Exhaustive)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Number of stochastic trials</span>
              </div>

              {/* Pseudo-Random Seed Control */}
              <div>
                <label htmlFor="icm-random-seed-input" className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Reproducible Seed
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="icm-random-seed-input"
                    type="number"
                    value={randomSeed}
                    onChange={(e) => {
                      setRandomSeed(parseInt(e.target.value, 10) || 1);
                      setIcmStepIndex(0);
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-purple-500 focus:outline-hidden"
                  />
                  <button
                    onClick={handleRollSeed}
                    title="Roll new random seed"
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Dices className="h-3.5 w-3.5 text-purple-600" />
                    <span>Roll</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Identical seeds give identical cascades</span>
              </div>
            </div>

            {/* Quick Probability Presets & Edge Weight Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
                <button
                  onClick={() => { setTransmissionP(0.0); setIcmStepIndex(0); }}
                  className={`rounded px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    transmissionP === 0 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  p = 0.0 (Isolated)
                </button>
                <button
                  onClick={() => { setTransmissionP(0.15); setIcmStepIndex(0); }}
                  className={`rounded px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    transmissionP === 0.15 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  p = 0.15 (Skeptical)
                </button>
                <button
                  onClick={() => { setTransmissionP(0.35); setIcmStepIndex(0); }}
                  className={`rounded px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    transmissionP === 0.35 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  p = 0.35 (Baseline)
                </button>
                <button
                  onClick={() => { setTransmissionP(0.70); setIcmStepIndex(0); }}
                  className={`rounded px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    transmissionP === 0.70 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  p = 0.70 (Virulent)
                </button>
                <button
                  onClick={() => { setTransmissionP(1.0); setIcmStepIndex(0); }}
                  className={`rounded px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                    transmissionP === 1.0 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  p = 1.0 (BFS Bound)
                </button>
              </div>

              {/* Dataset Edge Weights Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCustomWeights}
                  onChange={(e) => {
                    setUseCustomWeights(e.target.checked);
                    setIcmStepIndex(0);
                  }}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  Use dataset edge weights (clamped [0, 1]) when defined
                </span>
              </label>
            </div>
          </div>

          {/* 4 Comparison Metric KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Deterministic BFS Reach */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium text-slate-500">BFS Deterministic Reach</div>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-800">
                  Upper Bound
                </span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-blue-700 tabular-nums">
                {comparison.bfsTotalReachable}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {nodes.length} nodes</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Structural reachability ceiling (p = 1.0)
              </div>
            </div>

            {/* ICM Average Spread */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-purple-900">ICM Expected Spread (μ)</div>
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-purple-800">
                  Monte Carlo
                </span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-purple-700 tabular-nums">
                {comparison.icmExpectedSpread.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ± {comparison.icmStdDev.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Range: [{comparison.icmMinSpread}, {comparison.icmMaxSpread}] across {iterations} runs
              </div>
            </div>

            {/* Penetration Percentage */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Reachable Penetration</div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {comparison.networkPenetrationPercentage.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                μ / R<sub>BFS</sub> of reachable component
              </div>
            </div>

            {/* Transmission Deficit */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500">Transmission Deficit (Δ)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-amber-600 tabular-nums">
                {comparison.deficitSpread.toFixed(2)}
                <span className="text-xs font-normal text-slate-400 ml-1">nodes</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                R<sub>BFS</sub> − μ (unactivated due to friction)
              </div>
            </div>
          </div>

          {/* Interactive Cascade Step Stepper & Network Canvas */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            {/* Timeline & Stepper Controls Header */}
            <div className="border-b border-slate-200 p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-purple-600" />
                  <span>Representative Cascade Playback</span>
                </span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                  Run 1 / {iterations} (Seed: {representativeRun.seed})
                </span>
              </div>

              {/* Stepper Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleIcmReset}
                  title="Reset to Step 0"
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={handleIcmPrevStep}
                  disabled={clampedIcmStep <= 0}
                  title="Step Backward"
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleIcmTogglePlay}
                  className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition-colors cursor-pointer shadow-xs"
                >
                  {isIcmPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{clampedIcmStep >= representativeRun.steps.length - 1 ? 'Replay' : 'Play'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleIcmNextStep}
                  disabled={clampedIcmStep >= representativeRun.steps.length - 1}
                  title="Step Forward"
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Step Indicator */}
                <div className="ml-2 font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1">
                  Step {clampedIcmStep}{' '}
                  <span className="font-normal text-slate-400">
                    / {Math.max(0, representativeRun.steps.length - 1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Network Canvas */}
            <div className="p-4">
              <GraphCanvas
                nodes={nodes}
                connections={connections}
                sourceNodeId={icmSourceId}
                affectedNodes={currentIcmStepData.cumulativeActiveNodes}
                activeStepNodes={currentIcmStepData.newlyActivatedNodes}
                activeStepEdges={currentIcmStepData.successfulEdges}
                blockedNodes={simulationState.blockedNodes}
                bridgeNodeIds={bridgeNodeIds}
                onSelectNode={(nodeId) => {
                  setIcmSourceId(nodeId);
                  setIcmStepIndex(0);
                }}
                selectedNodeId={icmSourceId}
                onNodePositionChange={onNodePositionChange}
                height={460}
              />
            </div>

            {/* Step Transmission Details Sub-Bar */}
            <div className="border-t border-slate-200 p-4 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Active Frontier A<sub>t</sub>:</span>
                  {currentIcmStepData.newlyActivatedNodes.length > 0 ? (
                    currentIcmStepData.newlyActivatedNodes.map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-purple-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-800"
                      >
                        {id}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No new activations (cascade terminated)</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                  <span>Cumulative Active:</span>
                  <span className="font-bold text-slate-800">
                    {currentIcmStepData.cumulativeActiveNodes.length} / {nodes.length}
                  </span>
                </div>
              </div>

              {/* Attempted Edges Summary */}
              <div className="text-[11px] text-slate-500 font-mono">
                {currentIcmStepData.attemptedEdges.length > 0 ? (
                  <span>
                    Edges attempted: {currentIcmStepData.attemptedEdges.length} (
                    <span className="text-green-600 font-bold">
                      {currentIcmStepData.successfulEdges.length} succeeded
                    </span>
                    ,{' '}
                    <span className="text-slate-400">
                      {currentIcmStepData.attemptedEdges.length - currentIcmStepData.successfulEdges.length} failed
                    </span>
                    )
                  </span>
                ) : (
                  <span>Initial source node activation</span>
                )}
              </div>
            </div>
          </div>

          {/* Dual-Trajectory Comparison Chart & Theoretical Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ICMComparisonChart
                bfsSteps={bfsChartSteps}
                icmSteps={icmStats.averageSpreadByStep}
                totalNodes={nodes.length}
                minSpread={icmStats.minSpread}
                maxSpread={icmStats.maxSpread}
                height={300}
              />
            </div>

            {/* Academic Comparison Synthesis Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-purple-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Structural vs Probabilistic Spread
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {comparison.academicExplanation}
                </p>

                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reachable Network:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {comparison.bfsTotalReachable} nodes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ICM Expected Spread:</span>
                    <span className="font-mono font-semibold text-purple-700">
                      {comparison.icmExpectedSpread.toFixed(2)} nodes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Penetration Rate:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {comparison.networkPenetrationPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transmission Deficit:</span>
                    <span className="font-mono font-semibold text-amber-600">
                      {comparison.deficitSpread.toFixed(2)} nodes
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-purple-50/60 border border-purple-100 p-2.5 text-[11px] text-purple-900 mt-4">
                <strong>Model Note:</strong> Setting <span className="font-mono font-bold">p = 1.0</span> reproduces
                the deterministic BFS reachability boundary exactly.
              </div>
            </div>
          </div>

          {/* Node Activation Probabilities π(v) Leaderboard Table */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-purple-600" />
                  <span>Node Activation Probabilities π(v) across {iterations} Runs</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Empirical probability π(v) = (1/M) ∑ 𝟙(v ∈ S<sup>(m)</sup>)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Sorted by activation vulnerability
              </span>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200">
                  <tr className="text-slate-500 font-mono text-[11px]">
                    <th className="px-4 py-2.5 font-semibold">Node</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-center">BFS Reachable</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Empirical π(v)</th>
                    <th className="px-4 py-2.5 font-semibold w-48">Activation Likelihood</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {nodeActivationList.map(({ node, prob, isReachable }) => {
                    const isSource = node.id === icmSourceId;
                    const percent = Math.round(prob * 100);
                    return (
                      <tr key={node.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isSource
                                  ? 'bg-blue-600'
                                  : prob > 0.5
                                  ? 'bg-purple-600'
                                  : prob > 0
                                  ? 'bg-purple-300'
                                  : 'bg-slate-300'
                              }`}
                            />
                            <span className="font-semibold text-slate-900">{node.name}</span>
                            <span className="text-[10px] text-slate-400">({node.id})</span>
                            {node.verified && (
                              <span className="text-[10px] text-blue-600 font-sans">✓</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-sans text-[11px]">
                          {isSource ? (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800">
                              Initial Seed
                            </span>
                          ) : simulationState.blockedNodes.includes(node.id) ? (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-semibold text-slate-700">
                              Quarantined
                            </span>
                          ) : (
                            <span className="text-slate-500">Regular</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {isReachable ? (
                            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700 font-semibold">
                              Yes
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">
                              Unreachable
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900">
                          {prob.toFixed(3)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isSource
                                    ? 'bg-blue-600'
                                    : percent > 60
                                    ? 'bg-purple-600'
                                    : percent > 25
                                    ? 'bg-purple-400'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 w-8 text-right">
                              {percent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
