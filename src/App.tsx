import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  UserNode,
  Connection,
  InformationMessage,
  SimulationState,
  BFSStep,
  DatasetMetadata,
} from './types';
import {
  DEFAULT_USERS,
  DEFAULT_CONNECTIONS,
  DEFAULT_MESSAGE,
  PRESET_TOPOLOGIES,
} from './data/sampleNetworks';
import { PHEME_RUMOR_BENCHMARK } from './data/sampleDatasets';
import {
  calculateCentralityStats,
  calculateGraphStatistics,
  runBFSPropagation,
  evaluateContainmentCandidates,
} from './utils/graphTheory';
import { evaluatePropositionalRisk } from './utils/logicModel';
import { calculateRecurrencePrediction } from './utils/recurrenceModel';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DatasetUploaderModal } from './components/DatasetUploaderModal';
import { DashboardView } from './pages/DashboardView';
import { InformationInputView } from './pages/InformationInputView';
import { PropagationPredictionView } from './pages/PropagationPredictionView';
import { InfluenceContainmentView } from './pages/InfluenceContainmentView';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Core Network State
  const [nodes, setNodes] = useState<UserNode[]>(DEFAULT_USERS);
  const [connections, setConnections] = useState<Connection[]>(DEFAULT_CONNECTIONS);
  const [sourceNodeId, setSourceNodeId] = useState<string>('U03');

  // Message & Information Input State
  const [message, setMessage] = useState<InformationMessage>(DEFAULT_MESSAGE);

  // Dataset Ingestion Metadata State
  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata>({
    isCustomUpload: false,
    datasetName: 'Balanced Community Network (12 Nodes)',
    sourceType: 'demo',
    nodesCount: DEFAULT_USERS.length,
    edgesCount: DEFAULT_CONNECTIONS.length,
  });
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);
  const [savedUploadedDataset, setSavedUploadedDataset] = useState<{
    nodes: UserNode[];
    connections: Connection[];
    metadata: DatasetMetadata;
  } | null>(null);

  // Recurrence Relation Propagation Factor r
  const [propagationFactor, setPropagationFactor] = useState<number>(1.5);

  // Selected Node for Detailed Inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Blocked Nodes for Containment Cuts
  const [blockedNodes, setBlockedNodes] = useState<string[]>([]);

  // Interactive Simulation Playback State
  const [simStep, setSimStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(1000);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pure Mathematical Derivations (Recalculated on state changes)
  const riskResult = useMemo(() => {
    return evaluatePropositionalRisk(message);
  }, [message]);

  const graphStats = useMemo(() => {
    return calculateGraphStatistics(nodes, connections);
  }, [nodes, connections]);

  const centralityStats = useMemo(() => {
    return calculateCentralityStats(nodes, connections);
  }, [nodes, connections]);

  const bridgeNodeIds = useMemo(() => {
    return centralityStats.filter((s) => s.isBridgeNode).map((s) => s.id);
  }, [centralityStats]);

  const containmentCandidates = useMemo(() => {
    return evaluateContainmentCandidates(sourceNodeId, nodes, connections);
  }, [sourceNodeId, nodes, connections]);

  // Full BFS Run from Source with Blocked Nodes
  const fullBfsResult = useMemo(() => {
    return runBFSPropagation(sourceNodeId, nodes, connections, blockedNodes);
  }, [sourceNodeId, nodes, connections, blockedNodes]);

  // Simulation State Slice for Current Playback Step
  const simulationState: SimulationState = useMemo(() => {
    const steps = fullBfsResult.steps;
    const currentStepIndex = Math.min(simStep, steps.length - 1);
    const activeStepData = steps[currentStepIndex] || null;

    // Cumulative affected up to current step
    const affected = activeStepData ? activeStepData.cumulativeAffected : [];
    const newly = activeStepData ? activeStepData.newlyAffectedNodes : [];

    // Propagation order sequence
    const order: string[] = [];
    for (let i = 0; i <= currentStepIndex; i++) {
      if (steps[i]) {
        order.push(...steps[i].newlyAffectedNodes);
      }
    }

    const isCompleted = currentStepIndex >= steps.length - 1 && steps.length > 0;

    return {
      currentStep: currentStepIndex,
      totalSteps: Math.max(0, steps.length - 1),
      affectedNodes: affected,
      newlyAffected: newly,
      propagationOrder: order,
      stepsHistory: steps,
      isPlaying,
      isCompleted,
      speedMs,
      sourceNodeId,
      blockedNodes,
    };
  }, [fullBfsResult, simStep, isPlaying, speedMs, sourceNodeId, blockedNodes]);

  // Recurrence data points comparison
  const recurrenceResult = useMemo(() => {
    return calculateRecurrencePrediction(
      nodes.length,
      propagationFactor,
      fullBfsResult.steps,
      Math.max(fullBfsResult.steps.length, 7)
    );
  }, [nodes.length, propagationFactor, fullBfsResult.steps]);

  // Playback timer ticker
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setSimStep((prev) => {
          if (prev < fullBfsResult.steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, speedMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, speedMs, fullBfsResult.steps.length]);

  // Handlers for Simulation Controls
  const handleStartSimulation = useCallback(() => {
    setSimStep(0);
    setIsPlaying(true);
  }, []);

  const handlePauseSimulation = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleResumeSimulation = useCallback(() => {
    if (simStep < fullBfsResult.steps.length - 1) {
      setIsPlaying(true);
    }
  }, [simStep, fullBfsResult.steps.length]);

  const handleResetSimulation = useCallback(() => {
    setIsPlaying(false);
    setSimStep(0);
  }, []);

  const handleNextStep = useCallback(() => {
    setSimStep((prev) => Math.min(prev + 1, fullBfsResult.steps.length - 1));
  }, [fullBfsResult.steps.length]);

  const handleQuickRunBFS = useCallback(() => {
    // Jump straight to propagation simulator and play
    setActiveTab('propagation');
    setSimStep(0);
    setIsPlaying(true);
  }, []);

  // Handlers for Graph Modifications
  const handleAddNode = useCallback((newNode: UserNode) => {
    setNodes((prev) => [...prev, newNode]);
  }, []);

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => {
        const nextNodes = prev.filter((n) => n.id !== id);
        if (sourceNodeId === id) {
          const nextSource = nextNodes.length > 0 ? nextNodes[0].id : '';
          setSourceNodeId(nextSource);
          setMessage((m) => ({ ...m, sourceUserId: nextSource }));
        }
        return nextNodes;
      });
      setConnections((prev) => prev.filter((c) => c.source !== id && c.target !== id));
      setBlockedNodes((prev) => prev.filter((bId) => bId !== id));
      handleResetSimulation();
    },
    [sourceNodeId, handleResetSimulation]
  );

  const handleAddConnection = useCallback(
    (source: string, target: string) => {
      // Check if already exists or self-loop
      if (source === target) return;
      setConnections((prev) => {
        const exists = prev.some((c) => c.source === source && c.target === target);
        if (exists) return prev;
        const newConn: Connection = {
          id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          source,
          target,
        };
        return [...prev, newConn];
      });
      handleResetSimulation();
    },
    [handleResetSimulation]
  );

  const handleDeleteConnection = useCallback(
    (connectionId: string) => {
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      handleResetSimulation();
    },
    [handleResetSimulation]
  );

  const handleResetNetwork = useCallback(() => {
    setNodes(DEFAULT_USERS);
    setConnections(DEFAULT_CONNECTIONS);
    setSourceNodeId('U03');
    setMessage(DEFAULT_MESSAGE);
    setBlockedNodes([]);
    setDatasetMetadata({
      isCustomUpload: false,
      datasetName: 'Balanced Community Network (12 Nodes)',
      sourceType: 'demo',
      nodesCount: DEFAULT_USERS.length,
      edgesCount: DEFAULT_CONNECTIONS.length,
    });
    handleResetSimulation();
  }, [handleResetSimulation]);

  const handleLoadTopology = useCallback(
    (topologyId: string) => {
      const topo = PRESET_TOPOLOGIES.find((t) => t.id === topologyId);
      if (topo) {
        setNodes(topo.users);
        setConnections(topo.connections);
        setSourceNodeId(topo.defaultSource);
        setMessage((prev) => ({
          ...prev,
          sourceUserId: topo.defaultSource,
          verified: topo.users.find((u) => u.id === topo.defaultSource)?.verified ?? prev.verified,
        }));
        setBlockedNodes([]);
        setDatasetMetadata({
          isCustomUpload: false,
          datasetName: topo.name,
          sourceType: 'demo',
          nodesCount: topo.users.length,
          edgesCount: topo.connections.length,
        });
        handleResetSimulation();
      }
    },
    [handleResetSimulation]
  );

  const handleApplyDataset = useCallback(
    (newNodes: UserNode[], newConnections: Connection[], metadata: DatasetMetadata) => {
      setNodes(newNodes);
      setConnections(newConnections);

      // Determine an effective source node
      let initialSourceId = newNodes[0]?.id || '';
      if (metadata.sourceType === 'benchmark') {
        initialSourceId = PHEME_RUMOR_BENCHMARK.sourceNodeId;
      } else {
        // Pick the node with maximum out-degree or first
        const outDegMap = new Map<string, number>();
        newNodes.forEach((n) => outDegMap.set(n.id, 0));
        newConnections.forEach((c) => {
          if (outDegMap.has(c.source)) {
            outDegMap.set(c.source, outDegMap.get(c.source)! + 1);
          }
        });
        let maxDeg = -1;
        newNodes.forEach((n) => {
          const deg = outDegMap.get(n.id) || 0;
          if (deg > maxDeg) {
            maxDeg = deg;
            initialSourceId = n.id;
          }
        });
      }

      setSourceNodeId(initialSourceId);

      const sourceNode = newNodes.find((n) => n.id === initialSourceId) || newNodes[0];
      setMessage((prev) => ({
        ...prev,
        text:
          metadata.sourceType === 'benchmark'
            ? 'Breaking: Emerging epidemiological report on unverified cluster containment.'
            : prev.text,
        claimTopic:
          metadata.sourceType === 'benchmark'
            ? 'Health Crisis Diffusion Cascade'
            : prev.claimTopic,
        sourceUserId: initialSourceId,
        verified: sourceNode?.verified ?? false,
        shares: sourceNode?.shares ?? 50,
        independentSources: sourceNode?.independentSources ?? 0,
      }));

      setBlockedNodes([]);
      setDatasetMetadata(metadata);
      if (metadata.sourceType !== 'demo') {
        setSavedUploadedDataset({
          nodes: newNodes,
          connections: newConnections,
          metadata,
        });
      }
      handleResetSimulation();
    },
    [handleResetSimulation]
  );

  const handleSelectDatasetMode = useCallback(
    (mode: 'demo' | 'uploaded') => {
      if (mode === 'demo') {
        handleLoadTopology('balanced-12');
      } else {
        if (savedUploadedDataset) {
          handleApplyDataset(
            savedUploadedDataset.nodes,
            savedUploadedDataset.connections,
            savedUploadedDataset.metadata
          );
        } else {
          setIsUploaderOpen(true);
        }
      }
    },
    [handleLoadTopology, savedUploadedDataset, handleApplyDataset]
  );

  const handleLoadBenchmark = useCallback(() => {
    handleApplyDataset(
      PHEME_RUMOR_BENCHMARK.nodes,
      PHEME_RUMOR_BENCHMARK.connections,
      {
        isCustomUpload: true,
        datasetName: PHEME_RUMOR_BENCHMARK.name,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        format: 'preset',
        nodesCount: PHEME_RUMOR_BENCHMARK.nodes.length,
        edgesCount: PHEME_RUMOR_BENCHMARK.connections.length,
        sourceType: 'benchmark',
      }
    );
  }, [handleApplyDataset]);

  const handleSetSourceNode = useCallback(
    (id: string) => {
      setSourceNodeId(id);
      setMessage((prev) => ({ ...prev, sourceUserId: id }));
      handleResetSimulation();
    },
    [handleResetSimulation]
  );

  const handleNodePositionChange = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x, y } : node))
    );
  }, []);

  const handleApplyContainment = useCallback(
    (nodeId: string) => {
      setBlockedNodes((prev) => {
        if (prev.includes(nodeId)) {
          return prev.filter((id) => id !== nodeId);
        } else {
          return [...prev, nodeId];
        }
      });
      // reset step so user can re-observe with cut applied
      setSimStep(0);
      setIsPlaying(false);
    },
    []
  );

  const handleClearBlockedNodes = useCallback(() => {
    setBlockedNodes([]);
    setSimStep(0);
    setIsPlaying(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-blue-600/10 selection:text-blue-700">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        affectedCount={simulationState.affectedNodes.length}
        totalNodes={nodes.length}
        riskCategory={riskResult.riskCategory}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <TopHeader
          sourceNodeId={sourceNodeId}
          affectedCount={simulationState.affectedNodes.length}
          totalNodes={nodes.length}
          currentStep={simulationState.currentStep}
          riskCategory={riskResult.riskCategory}
          datasetMetadata={datasetMetadata}
          onResetSimulation={handleResetSimulation}
          onLoadTopology={handleLoadTopology}
          onQuickRunBFS={handleQuickRunBFS}
          onOpenUploader={() => setIsUploaderOpen(true)}
          onSelectDatasetMode={handleSelectDatasetMode}
          isPlaying={isPlaying}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              nodes={nodes}
              connections={connections}
              simulationState={simulationState}
              riskResult={riskResult}
              centralityStats={centralityStats}
              containmentCandidates={containmentCandidates}
              graphStats={graphStats}
              recurrencePoints={recurrenceResult.dataPoints}
              datasetMetadata={datasetMetadata}
              setActiveTab={setActiveTab}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                setSourceNodeId(id);
              }}
              onApplyContainment={handleApplyContainment}
              onPlaySimulation={handleStartSimulation}
              onResetSimulation={handleResetSimulation}
              onNodePositionChange={handleNodePositionChange}
              onOpenUploader={() => setIsUploaderOpen(true)}
              onLoadBenchmark={handleLoadBenchmark}
              onSelectDatasetMode={handleSelectDatasetMode}
            />
          )}

          {activeTab === 'logic' && (
            <InformationInputView
              nodes={nodes}
              message={message}
              riskResult={riskResult}
              onUpdateMessage={(newMsg) => {
                setMessage(newMsg);
                if (newMsg.sourceUserId !== sourceNodeId) {
                  setSourceNodeId(newMsg.sourceUserId);
                }
              }}
              onNavigateToSimulator={() => setActiveTab('propagation')}
            />
          )}

          {activeTab === 'propagation' && (
            <PropagationPredictionView
              nodes={nodes}
              connections={connections}
              simulationState={simulationState}
              propagationFactor={propagationFactor}
              fullBfsSteps={fullBfsResult.steps}
              bridgeNodeIds={bridgeNodeIds}
              onStart={handleStartSimulation}
              onPause={handlePauseSimulation}
              onResume={handleResumeSimulation}
              onReset={handleResetSimulation}
              onNextStep={handleNextStep}
              onChangeSpeed={(speed) => setSpeedMs(speed)}
              onSelectSourceNode={handleSetSourceNode}
              onNodePositionChange={handleNodePositionChange}
              onChangePropagationFactor={(r) => setPropagationFactor(r)}
            />
          )}

          {activeTab === 'containment' && (
            <InfluenceContainmentView
              nodes={nodes}
              connections={connections}
              sourceNodeId={sourceNodeId}
              centralityStats={centralityStats}
              containmentCandidates={containmentCandidates}
              simulationState={simulationState}
              onApplyContainment={handleApplyContainment}
              onClearBlockedNodes={handleClearBlockedNodes}
              onSelectNode={(id) => setSelectedNodeId(id)}
              onNodePositionChange={handleNodePositionChange}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-3 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              Graph-Based Misinformation Propagation Detection and Containment System
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span>Modules: M2 + M3 + M4</span>
              <span className="text-slate-300">•</span>
              <span className="text-green-700 font-semibold">Discrete Simulation</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Dataset Ingestion Modal */}
      <DatasetUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onApplyDataset={handleApplyDataset}
        currentMetadata={datasetMetadata}
      />
    </div>
  );
}
