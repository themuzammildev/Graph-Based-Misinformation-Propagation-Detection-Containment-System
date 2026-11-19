import React from 'react';
import {
  UserNode,
  Connection,
  SimulationState,
  PropositionalRiskResult,
  NodeInfluenceStats,
  ContainmentCandidate,
  GraphStatistics,
  RecurrenceDataPoint,
  DatasetMetadata,
} from '../types';
import { exportNodesToCSV, exportEdgesToCSV, exportDatasetToJSON, downloadFile } from '../data/sampleDatasets';
import { GraphCanvas } from '../components/GraphCanvas';
import { SpreadLineChart } from '../components/charts/SpreadLineChart';
import {
  Users,
  GitFork,
  Radio,
  Share2,
  Award,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Upload,
  Download,
  Database,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ActiveTab } from '../components/Sidebar';

interface DashboardViewProps {
  nodes: UserNode[];
  connections: Connection[];
  simulationState: SimulationState;
  riskResult: PropositionalRiskResult;
  centralityStats: NodeInfluenceStats[];
  containmentCandidates: ContainmentCandidate[];
  graphStats: GraphStatistics;
  recurrencePoints: RecurrenceDataPoint[];
  datasetMetadata: DatasetMetadata;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectNode: (nodeId: string) => void;
  onApplyContainment: (nodeId: string) => void;
  onPlaySimulation: () => void;
  onResetSimulation: () => void;
  onNodePositionChange: (id: string, x: number, y: number) => void;
  onOpenUploader: () => void;
  onLoadBenchmark: () => void;
  onSelectDatasetMode?: (mode: 'demo' | 'uploaded') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  nodes,
  connections,
  simulationState,
  riskResult,
  centralityStats,
  containmentCandidates,
  graphStats,
  recurrencePoints,
  datasetMetadata,
  setActiveTab,
  onSelectNode,
  onApplyContainment,
  onPlaySimulation,
  onResetSimulation,
  onNodePositionChange,
  onOpenUploader,
  onLoadBenchmark,
  onSelectDatasetMode,
}) => {
  const topInfluencer = centralityStats[0];
  const topBridge = [...centralityStats].sort(
    (a, b) => b.betweennessCentrality - a.betweennessCentrality
  )[0];
  const bridgeNodeIds = centralityStats.filter((s) => s.isBridgeNode).map((s) => s.id);
  const topContainment = containmentCandidates[0];

  const affectedCount = simulationState.affectedNodes.length;
  const penetrationPercent =
    nodes.length > 0 ? Math.round((affectedCount / nodes.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Graph-Based Misinformation Propagation Detection and Containment System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            An Educational Graph-Theoretic Simulation of Information Propagation
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenUploader}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-blue-600" />
            <span>Upload Dataset (CSV / JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('propagation')}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <span>Propagation Simulator</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('containment')}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span>Influence & Containment</span>
          </button>
        </div>
      </div>

      {/* Dataset Source & Ingestion Status Banner */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              datasetMetadata.sourceType === 'uploaded'
                ? 'border-green-200 bg-green-50 text-green-700'
                : datasetMetadata.sourceType === 'benchmark'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}
          >
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900 font-sans">
                Active Dataset: {datasetMetadata.datasetName}
              </span>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider border ${
                  datasetMetadata.sourceType === 'uploaded'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : datasetMetadata.sourceType === 'benchmark'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                {datasetMetadata.sourceType === 'uploaded'
                  ? 'Real Uploaded Dataset'
                  : datasetMetadata.sourceType === 'benchmark'
                  ? 'PHEME Rumor Benchmark'
                  : 'Synthetic Demo Topology'}
              </span>
              {datasetMetadata.uploadedAt && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Loaded at {datasetMetadata.uploadedAt}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Topological Graph G=(V,E): {nodes.length} nodes, {connections.length} directed edges. All graph statistics, centrality rankings, and recurrence growth update dynamically.
            </p>
          </div>
        </div>

        {/* Action Controls for Dataset */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenUploader}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Upload className="h-3 w-3" />
            <span>Ingest CSV / JSON</span>
          </button>
          {datasetMetadata.sourceType !== 'benchmark' && (
            <button
              onClick={onLoadBenchmark}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-blue-600" />
              <span>Load PHEME Benchmark</span>
            </button>
          )}
          <button
            onClick={() => {
              downloadFile('exported_nodes.csv', exportNodesToCSV(nodes), 'text/csv');
              downloadFile('exported_edges.csv', exportEdgesToCSV(connections), 'text/csv');
            }}
            title="Export current graph as nodes.csv and edges.csv"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="h-3 w-3 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              downloadFile('exported_network.json', exportDatasetToJSON(nodes, connections), 'application/json');
            }}
            title="Export current graph as JSON"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="h-3 w-3 text-slate-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Compact 6-KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Total Users */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total Users</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {graphStats.totalNodes}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Nodes in network</div>
        </div>

        {/* 2. Total Connections */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total Connections</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {graphStats.totalEdges}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Directed edges</div>
        </div>

        {/* 3. Affected Users */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Affected Users</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums">
            {affectedCount} <span className="text-sm font-normal text-slate-400">/ {nodes.length}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{penetrationPercent}% network penetration</div>
        </div>

        {/* 4. Propagation Steps */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Propagation Steps</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {simulationState.currentStep} <span className="text-sm font-normal text-slate-400">/ {simulationState.totalSteps}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Max depth</div>
        </div>

        {/* 5. Top Influencer & Bridge */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Top Hub & Bridge</span>
            <span className="font-mono text-[9px] text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
              Brandes C_B
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-blue-600 truncate">
              {topInfluencer ? topInfluencer.id : 'N/A'}
            </span>
            {topBridge && topBridge.id !== topInfluencer?.id && (
              <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                Bridge: {topBridge.id}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            Hub: {topInfluencer ? `${Math.round(topInfluencer.degreeCentrality * 100)}%` : '0%'} | Bridge: {topBridge ? `${Math.round(topBridge.betweennessCentrality * 100)}%` : '0%'}
          </div>
        </div>

        {/* 6. Containment Candidate */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Containment Candidate</div>
          <div className="mt-1 font-mono text-2xl font-bold text-green-600 truncate">
            {topContainment ? topContainment.nodeId : 'None'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {topContainment ? `${topContainment.effectivenessPercentage}% prevention` : 'No cut needed'}
          </div>
        </div>
      </div>

      {/* Main Grid: Network Visualization & Right-side Analysis Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Network Visualization Card */}
        <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Network Visualization
              </h2>
              <p className="text-xs text-slate-500">
                Interactive graph of users and information-sharing relationships
              </p>
            </div>
            <button
              onClick={() => setActiveTab('propagation')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Simulate Spread</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <GraphCanvas
            nodes={nodes}
            connections={connections}
            sourceNodeId={simulationState.sourceNodeId}
            affectedNodes={simulationState.affectedNodes}
            activeStepNodes={simulationState.newlyAffected}
            activeStepEdges={simulationState.stepsHistory[simulationState.currentStep]?.propagationEdges || []}
            blockedNodes={simulationState.blockedNodes}
            containmentTargetId={topContainment?.nodeId}
            bridgeNodeIds={bridgeNodeIds}
            onSelectNode={onSelectNode}
            onNodePositionChange={onNodePositionChange}
            height={460}
          />
        </div>

        {/* Right Column (5 cols): Analysis Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 1: Propagation Risk Analysis */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Propagation Risk Analysis
              </h3>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  riskResult.riskCategory === 'High'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : riskResult.riskCategory === 'Moderate'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {riskResult.riskCategory} Risk
              </span>
            </div>

            <div className="space-y-3">
              {/* Score bar */}
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-600">Risk Score</span>
                  <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {riskResult.riskScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      riskResult.riskCategory === 'High'
                        ? 'bg-red-600'
                        : riskResult.riskCategory === 'Moderate'
                        ? 'bg-amber-500'
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${riskResult.riskScore}%` }}
                  />
                </div>
              </div>

              {/* Short explanation */}
              <p className="text-xs text-slate-600 leading-relaxed">
                This message has a {riskResult.riskCategory.toLowerCase()} potential to propagate based on source credibility, share count, and verification status.
              </p>

              {/* Evaluated logic rule in clean mathematical/code-like block */}
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-sans font-medium">Evaluated Rule:</span>
                  <span className="text-[11px] text-slate-400 font-sans">Propositional Calculus</span>
                </div>
                <div className="font-bold text-slate-900 pt-0.5">
                  {riskResult.riskCategory === 'High'
                    ? 'HighRisk = U ∧ S'
                    : riskResult.riskCategory === 'Moderate'
                    ? 'ModerateRisk = (V ∧ S) ∨ U'
                    : 'LowRisk = V ∧ ¬S'}
                </div>
                <div className="text-[11px] text-slate-500 font-sans">
                  {riskResult.riskCategory === 'High'
                    ? '(Unverified source AND high share count)'
                    : riskResult.riskCategory === 'Moderate'
                    ? '(Verified source with high share, or unverified)'
                    : '(Verified source with low share count)'}
                </div>
              </div>

              {/* Credibility Score indicator */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-600 font-medium">Credibility Score:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  {riskResult.credibilityScore} / 100
                </span>
              </div>

              {/* View Full Logic Analysis Button */}
              <button
                onClick={() => setActiveTab('logic')}
                className="w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>View Full Logic Analysis</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* SECTION 2: Top Influential Nodes Table */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Top Influential Nodes
                </h3>
                <p className="text-[11px] text-slate-500">Ranked by out-degree centrality</p>
              </div>
              <button
                onClick={() => setActiveTab('containment')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                View All →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-400 uppercase font-semibold">
                    <th className="pb-2 w-8">#</th>
                    <th className="pb-2">User</th>
                    <th className="pb-2 text-right">Out-deg</th>
                    <th className="pb-2 text-right">Influence</th>
                    <th className="pb-2 text-right text-purple-700">Betweenness</th>
                    <th className="pb-2 text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centralityStats.slice(0, 5).map((node, index) => {
                    const influencePct = Math.round(node.degreeCentrality * 100);
                    const betPct = Number((node.betweennessCentrality * 100).toFixed(1));

                    return (
                      <tr
                        key={node.id}
                        onClick={() => onSelectNode(node.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 font-mono text-slate-400 tabular-nums">
                          {index + 1}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">{node.id}</span>
                            {node.isBridgeNode && (
                              <span className="font-mono text-[9px] font-bold px-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                Bridge
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-700">
                          {node.outDegree}
                        </td>
                        <td className="py-2 text-right font-mono font-bold tabular-nums text-blue-600">
                          {influencePct}%
                        </td>
                        <td className="py-2 text-right font-mono font-bold tabular-nums text-purple-700">
                          {betPct}%
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                              node.structuralRole === 'Propagation Bridge'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : node.structuralRole === 'Broadcast Hub'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {node.structuralRole}
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
      </div>

      {/* Bottom Section: Propagation Analytics & Network Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Propagation Over Time Chart */}
        <div className="lg:col-span-7">
          <SpreadLineChart dataPoints={recurrencePoints} totalNodes={graphStats.totalNodes} />
        </div>

        {/* Right Column (5 cols): Network Statistics */}
        <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Network Statistics
            </h3>
            <p className="text-xs text-slate-500">
              Key structural properties of the social network
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Graph Density */}
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[11px] font-medium text-slate-500">Graph Density</span>
              <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                {graphStats.graphDensity}
              </div>
              <span className="text-[10px] text-slate-400 font-sans">Connectivity ratio</span>
            </div>

            {/* Average Degree */}
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[11px] font-medium text-slate-500">Average Degree</span>
              <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                {graphStats.averageDegree}
              </div>
              <span className="text-[10px] text-slate-400 font-sans">Connections per user</span>
            </div>

            {/* Maximum Degree */}
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[11px] font-medium text-slate-500">Maximum Degree</span>
              <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                {graphStats.maxDegree}
              </div>
              <span className="text-[10px] text-slate-400 font-sans">Peak connections</span>
            </div>

            {/* Connected Components */}
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[11px] font-medium text-slate-500">Connected Groups</span>
              <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                {graphStats.connectedComponentsCount}
              </div>
              <span className="text-[10px] text-slate-400 font-sans">Unified group</span>
            </div>

            {/* Reachability */}
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[11px] font-medium text-slate-500">Reachability</span>
              <div className="mt-1 font-mono text-base font-bold text-blue-600 tabular-nums">
                {affectedCount} / {graphStats.totalNodes}
              </div>
              <span className="text-[10px] text-slate-400 font-sans">From source user</span>
            </div>

            {/* Network Type */}
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[11px] font-medium text-slate-500">Network Type</span>
              <div className="mt-1 font-sans text-base font-bold text-slate-900">
                Directed
              </div>
              <span className="text-[10px] text-slate-400 font-sans">One-way links (follows)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
