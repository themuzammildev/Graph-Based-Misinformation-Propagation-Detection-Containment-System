import React, { useState, useMemo } from 'react';
import {
  UserNode,
  Connection,
  NodeInfluenceStats,
  ContainmentCandidate,
  SimulationState,
  ICMContainmentCandidate,
  RecurrenceContainmentCandidate,
} from '../types';
import { GraphCanvas } from '../components/GraphCanvas';
import { evaluateICMContainmentCandidates } from '../utils/independentCascade';
import { evaluateRecurrenceContainmentCandidates } from '../utils/recurrenceModel';
import {
  Award,
  ShieldCheck,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowRight,
  GitFork,
  Radio,
  Info,
  Sparkles,
  ArrowUpDown,
  Layers,
  Share2,
  GitBranch,
  Sliders,
  Activity,
  TrendingDown,
} from 'lucide-react';

interface InfluenceContainmentViewProps {
  nodes: UserNode[];
  connections: Connection[];
  sourceNodeId: string;
  centralityStats: NodeInfluenceStats[];
  containmentCandidates: ContainmentCandidate[];
  simulationState: SimulationState;
  onApplyContainment: (nodeId: string) => void;
  onClearBlockedNodes: () => void;
  onSelectNode: (nodeId: string) => void;
  onNodePositionChange: (id: string, x: number, y: number) => void;
}

export const InfluenceContainmentView: React.FC<InfluenceContainmentViewProps> = ({
  nodes,
  connections,
  sourceNodeId,
  centralityStats,
  containmentCandidates,
  simulationState,
  onApplyContainment,
  onClearBlockedNodes,
  onSelectNode,
  onNodePositionChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'influence' | 'containment'>('influence');
  const [containmentModel, setContainmentModel] = useState<'icm' | 'recurrence' | 'bfs'>('icm');
  const [icmTransmissionP, setIcmTransmissionP] = useState<number>(0.35);
  const [icmIterations, setIcmIterations] = useState<number>(50);
  const [sortKey, setSortKey] = useState<
    'betweenness' | 'centrality' | 'outDegree' | 'inDegree' | 'reachability' | 'name'
  >('betweenness');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    containmentCandidates[0]?.nodeId || null
  );

  const icmCandidates = useMemo(() => {
    return evaluateICMContainmentCandidates(sourceNodeId, nodes, connections, {
      transmissionProbability: icmTransmissionP,
      iterations: icmIterations,
      seed: 42,
    });
  }, [sourceNodeId, nodes, connections, icmTransmissionP, icmIterations]);

  const recurrenceCandidates = useMemo(() => {
    return evaluateRecurrenceContainmentCandidates(nodes, connections, sourceNodeId, {
      transmissionProbability: icmTransmissionP,
      timeSteps: 6,
      branchingFactorType: 'degree',
    });
  }, [nodes, connections, sourceNodeId, icmTransmissionP]);

  const bridgeNodeIds = useMemo(() => {
    return centralityStats.filter((s) => s.isBridgeNode).map((s) => s.id);
  }, [centralityStats]);

  // Highlight entities
  const highestOutDegreeNode = useMemo(() => {
    return [...centralityStats].sort((a, b) => b.outDegree - a.outDegree)[0] || null;
  }, [centralityStats]);

  const highestBetweennessNode = useMemo(() => {
    return (
      [...centralityStats].sort(
        (a, b) => b.betweennessCentrality - a.betweennessCentrality || b.rawBetweenness - a.rawBetweenness
      )[0] || null
    );
  }, [centralityStats]);

  const topBridgeNode = useMemo(() => {
    return (
      centralityStats.find((s) => s.isBridgeNode && s.betweennessRank === 1) ||
      centralityStats.find((s) => s.isBridgeNode) ||
      highestBetweennessNode
    );
  }, [centralityStats, highestBetweennessNode]);

  const sortedStats = useMemo(() => {
    return [...centralityStats].sort((a, b) => {
      if (sortKey === 'betweenness') {
        return (
          b.betweennessCentrality - a.betweennessCentrality ||
          b.rawBetweenness - a.rawBetweenness ||
          b.degreeCentrality - a.degreeCentrality
        );
      }
      if (sortKey === 'outDegree') return b.outDegree - a.outDegree;
      if (sortKey === 'inDegree') return b.inDegree - a.inDegree;
      if (sortKey === 'reachability') return b.reachabilityCount - a.reachabilityCount;
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      return b.degreeCentrality - a.degreeCentrality;
    });
  }, [centralityStats, sortKey]);

  const activeCandidate =
    containmentCandidates.find((c) => c.nodeId === selectedCandidateId) ||
    containmentCandidates[0];

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Influence & Containment Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Network Analysis: Finding Key Influencers, Bridge Accounts & Containing the Spread
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('influence')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'influence'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-blue-600" />
            <span>Most Influential Nodes</span>
          </button>
          <button
            onClick={() => setActiveSubTab('containment')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'containment'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            <span>Containment Candidates</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'influence' ? (
        /* Most Influential Nodes & Betweenness Centrality */
        <div className="space-y-6">
          {/* Key Metric Highlights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Highest Out-Degree User (Broadcast Hub) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-blue-600" />
                    <span>Highest Out-Degree User</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Broadcast Hub
                  </span>
                </div>
                {highestOutDegreeNode ? (
                  <div className="mt-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xl font-bold text-slate-900">
                        {highestOutDegreeNode.id}
                      </span>
                      <span className="text-xs font-medium text-slate-600 truncate">
                        {highestOutDegreeNode.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-mono">
                      <span>Out-Degree: <strong className="text-blue-700">{highestOutDegreeNode.outDegree}</strong></span>
                      <span>Degree Centrality: <strong className="text-blue-700">{Math.round(highestOutDegreeNode.degreeCentrality * 100)}%</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-2">No nodes available</div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-blue-100">
                Directly transmits to the largest number of neighboring accounts.
              </p>
            </div>

            {/* 2. Highest Betweenness User (Top Network Bridge) */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                    <GitFork className="h-3.5 w-3.5 text-purple-600" />
                    <span>Highest Betweenness User</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                    Brandes C_B
                  </span>
                </div>
                {highestBetweennessNode ? (
                  <div className="mt-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xl font-bold text-purple-900">
                        {highestBetweennessNode.id}
                      </span>
                      <span className="text-xs font-medium text-slate-600 truncate">
                        {highestBetweennessNode.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-mono">
                      <span>Normalized C'_B: <strong className="text-purple-700">{Math.round(highestBetweennessNode.betweennessCentrality * 100)}%</strong></span>
                      <span>Raw σ: <strong className="text-purple-700">{highestBetweennessNode.rawBetweenness}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-2">No nodes available</div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-purple-100">
                Controls the highest volume of shortest information paths between other users.
              </p>
            </div>

            {/* 3. Most Influential Propagation Bridge */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Key Propagation Bridge</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Intermediary
                  </span>
                </div>
                {topBridgeNode ? (
                  <div className="mt-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xl font-bold text-emerald-900">
                        {topBridgeNode.id}
                      </span>
                      <span className="text-xs font-medium text-slate-600 truncate">
                        {topBridgeNode.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-mono">
                      <span>Reach: <strong className="text-emerald-700">{topBridgeNode.reachabilityCount}</strong> / {nodes.length}</span>
                      <span>Role: <strong className="text-emerald-700">{topBridgeNode.structuralRole}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-2">No bridges detected</div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-emerald-100">
                Critical topological conduit linking otherwise distant community clusters.
              </p>
            </div>
          </div>

          {/* Mathematical Formulations Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-blue-600" />
                  <span>Out-Degree Centrality</span>
                </span>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  C_D(v) = deg⁺(v) / (N - 1)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Measures immediate local broadcasting capacity: the fraction of other network accounts directly following or reachable via 1-hop outgoing edges.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <GitFork className="h-4 w-4 text-purple-600" />
                  <span>Brandes' Betweenness Centrality</span>
                </span>
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  C_B(v) = Σ (σ_st(v) / σ_st)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculates global bottleneck importance via Brandes' single-source BFS algorithm. Normalized for directed networks by <span className="font-mono font-semibold">(N - 1)(N - 2)</span>.
              </p>
            </div>
          </div>

          {/* Ethical & Methodological Notice: Structural Position vs. Malicious Intent */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 shadow-2xs flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider font-sans">
                Graph Theory Principle: High Centrality Reflects Network Structure, Not Malicious Behavior
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                In misinformation topology analysis, vertices with high betweenness centrality or out-degree centrality act as critical <strong className="text-amber-950 font-semibold">structural conduits</strong> or <strong className="text-amber-950 font-semibold">topological bridges</strong> between disparate social clusters. High centrality does <em>not</em> indicate intentional deception, malicious propaganda generation, or ethical wrongdoing—it reflects an account's mathematical position in information diffusion pathways.
              </p>
            </div>
          </div>

          {/* Interactive Network Graph Highlighting Bridges */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Network Topology: Propagation Bridges Highlighted
                </h3>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {bridgeNodeIds.length} bridge {bridgeNodeIds.length === 1 ? 'node' : 'nodes'} identified with purple halo rings
              </div>
            </div>
            <GraphCanvas
              nodes={nodes}
              connections={connections}
              sourceNodeId={sourceNodeId}
              affectedNodes={simulationState.affectedNodes}
              activeStepNodes={[]}
              activeStepEdges={[]}
              blockedNodes={simulationState.blockedNodes}
              bridgeNodeIds={bridgeNodeIds}
              onSelectNode={onSelectNode}
              onNodePositionChange={onNodePositionChange}
              height={360}
            />
          </div>

          {/* Ranked Influential Users Table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Ranked User Centrality & Bridge Analysis
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click column headers to sort by Out-Degree, Degree Centrality, Betweenness Centrality, or Reachable Users.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Sort by:</span>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as any)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300"
                >
                  <option value="betweenness">Betweenness Centrality (Brandes)</option>
                  <option value="centrality">Out-Degree Centrality</option>
                  <option value="outDegree">Out-Degree (Broadcasting)</option>
                  <option value="inDegree">In-Degree (Popularity)</option>
                  <option value="reachability">Reachable Nodes</option>
                  <option value="name">User Name</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-mono text-[11px]">
                    <th className="px-4 py-3 font-semibold">Rank</th>
                    <th
                      onClick={() => setSortKey('name')}
                      className="px-4 py-3 font-semibold hover:text-slate-900 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>User Vertex</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => setSortKey('outDegree')}
                      className="px-4 py-3 font-semibold hover:text-slate-900 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Out-Degree (deg⁺)</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => setSortKey('centrality')}
                      className="px-4 py-3 font-semibold hover:text-slate-900 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Direct Connections Score</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => setSortKey('betweenness')}
                      className="px-4 py-3 font-semibold text-purple-700 hover:text-purple-900 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Bridge Score (Betweenness)</span>
                        <ArrowUpDown className="h-3 w-3 text-purple-500" />
                      </div>
                    </th>
                    <th
                      onClick={() => setSortKey('reachability')}
                      className="px-4 py-3 font-semibold hover:text-slate-900 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Reachable Nodes</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold">Structural Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {sortedStats.map((st, idx) => {
                    const degPct = Math.round(st.degreeCentrality * 100);
                    const betPct = Number((st.betweennessCentrality * 100).toFixed(1));
                    const isTopOutDegree = st.id === highestOutDegreeNode?.id;
                    const isTopBetweenness = st.id === highestBetweennessNode?.id;

                    return (
                      <tr
                        key={st.id}
                        onClick={() => onSelectNode(st.id)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          isTopBetweenness
                            ? 'bg-purple-50/30'
                            : isTopOutDegree
                            ? 'bg-blue-50/20'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-bold text-slate-500">#{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 font-sans font-medium text-slate-900">
                            <span
                              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] border ${
                                st.isBridgeNode
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {st.id}
                            </span>
                            <span className="truncate max-w-[160px]">{st.name}</span>
                            {st.verified && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 tabular-nums">
                          {st.outDegree}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-blue-700 tabular-nums">
                          {degPct}%
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-700">{betPct}%</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              (σ={st.rawBetweenness})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 tabular-nums">
                          {st.reachabilityCount} / {nodes.length}
                        </td>
                        <td className="px-4 py-2.5 font-sans">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isTopBetweenness && (
                              <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                                <GitFork className="h-3 w-3" />
                                <span>Highest Betweenness</span>
                              </span>
                            )}
                            {isTopOutDegree && !isTopBetweenness && (
                              <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                                <Radio className="h-3 w-3" />
                                <span>Highest Out-Degree</span>
                              </span>
                            )}
                            {st.isBridgeNode && !isTopBetweenness && (
                              <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                <GitFork className="h-2.5 w-2.5" />
                                <span>Bridge</span>
                              </span>
                            )}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                                st.structuralRole === 'Broadcast Hub'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : st.structuralRole === 'Propagation Bridge'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : st.structuralRole === 'Information Gatekeeper'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {st.structuralRole}
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
      ) : (
        /* Module 4 & ICM / Recurrence Containment Candidates */
        <div className="space-y-6">
          {/* Academic Metric Distinction Banner */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Containment Effectiveness vs Betweenness Centrality
                </h2>
              </div>
              <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-mono font-semibold">
                Tri-Model Graph-Theoretic Metrics
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-md bg-purple-50/60 border border-purple-100 p-3 space-y-1">
                <span className="font-semibold text-purple-900 font-mono">
                  Betweenness Centrality C_B(v):
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Measures static shortest-path routing volume: Σ [σst(v) / σst].
                  High betweenness reflects network brokerage, not source-specific isolation.
                </p>
              </div>

              <div className="rounded-md bg-emerald-50/60 border border-emerald-100 p-3 space-y-1">
                <span className="font-semibold text-emerald-900 font-sans">
                  Mathematical Growth Reduction:
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px] font-sans">
                  Measures how much the overall network spreading velocity drops when this user is quarantined.
                </p>
              </div>

              <div className="rounded-md bg-blue-50/60 border border-blue-100 p-3 space-y-1">
                <span className="font-semibold text-blue-900 font-sans">
                  Simulated Spread Prevention:
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px] font-sans">
                  Runs 50 randomized cascade simulations without this user to calculate the exact count of people saved.
                </p>
              </div>
            </div>
          </div>

          {/* Model Switcher & Parameter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            {/* Model Mode Toggle */}
            <div className="flex flex-wrap items-center rounded-lg border border-slate-200 bg-slate-100 p-1 self-start md:self-auto gap-1">
              <button
                onClick={() => setContainmentModel('icm')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  containmentModel === 'icm'
                    ? 'bg-white text-purple-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 className="h-3.5 w-3.5 text-purple-600" />
                <span>Probabilistic ICM (Simulated)</span>
              </button>
              <button
                onClick={() => setContainmentModel('recurrence')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  containmentModel === 'recurrence'
                    ? 'bg-white text-emerald-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                <span>Graph-Derived Recurrence (Theoretical)</span>
              </button>
              <button
                onClick={() => setContainmentModel('bfs')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  containmentModel === 'bfs'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitBranch className="h-3.5 w-3.5 text-blue-600" />
                <span>Deterministic BFS (Topological)</span>
              </button>
            </div>

            {/* Model Parameters */}
            {(containmentModel === 'icm' || containmentModel === 'recurrence') && (
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Trans. Prob p:</span>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={icmTransmissionP}
                    onChange={(e) => setIcmTransmissionP(parseFloat(e.target.value))}
                    className={`w-24 cursor-pointer ${containmentModel === 'icm' ? 'accent-purple-600' : 'accent-emerald-600'}`}
                  />
                  <span className={`font-mono font-bold w-8 ${containmentModel === 'icm' ? 'text-purple-700' : 'text-emerald-700'}`}>
                    {icmTransmissionP.toFixed(2)}
                  </span>
                </div>

                {containmentModel === 'icm' && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Trials M:</span>
                    <select
                      value={icmIterations}
                      onChange={(e) => setIcmIterations(parseInt(e.target.value, 10))}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-mono"
                    >
                      <option value={25}>25 runs</option>
                      <option value={50}>50 runs</option>
                      <option value={100}>100 runs</option>
                    </select>
                  </div>
                )}

                {containmentModel === 'recurrence' && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    r_degree = p·⟨k_in·k_out⟩/⟨k_in⟩
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Containment Candidates Table & Interactive Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    {containmentModel === 'icm'
                      ? `Ranked ICM Containment Candidates (M = ${icmIterations})`
                      : containmentModel === 'recurrence'
                      ? 'Ranked Theoretical Recurrence Containment Candidates'
                      : 'Ranked Deterministic BFS Containment Candidates'}
                  </h3>
                  {containmentModel === 'icm' && icmCandidates.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Baseline Uncontained Spread: μ = {icmCandidates[0].baselineSpread.toFixed(2)} nodes
                    </span>
                  )}
                  {containmentModel === 'recurrence' && recurrenceCandidates.length > 0 && recurrenceCandidates[0] && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Baseline Recurrence Spread: S_rec = {recurrenceCandidates[0].baselineSpread.toFixed(1)} nodes (r = {recurrenceCandidates[0].baselineBranchingFactor.toFixed(2)})
                    </span>
                  )}
                </div>

                {simulationState.blockedNodes.length > 0 && (
                  <button
                    onClick={onClearBlockedNodes}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Clear Active Cuts ({simulationState.blockedNodes.length})</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200">
                    <tr className="text-slate-500 font-mono text-[11px]">
                      <th className="px-4 py-2.5 font-semibold">Rank & User</th>
                      <th className="px-4 py-2.5 font-semibold">
                        Infections Prevented
                      </th>
                      <th className="px-4 py-2.5 font-semibold">Effectiveness (%)</th>
                      <th className="px-4 py-2.5 font-semibold">
                        {containmentModel === 'recurrence' ? 'Reduced Spreading Rate' : 'Bridge Score'}
                      </th>
                      <th className="px-4 py-2.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {containmentModel === 'icm' ? (
                      icmCandidates.map((cand) => {
                        const isBlocked = simulationState.blockedNodes.includes(cand.nodeId);
                        const betPct = Number((cand.betweennessScore * 100).toFixed(1));
                        return (
                          <tr
                            key={cand.nodeId}
                            onClick={() => setSelectedCandidateId(cand.nodeId)}
                            className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                              selectedCandidateId === cand.nodeId ? 'bg-purple-50/40' : ''
                            }`}
                          >
                            <td className="px-4 py-2.5 font-medium font-sans">
                              <span className="font-mono text-slate-400 mr-1.5">#{cand.rank}</span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                                {cand.nodeId}
                              </span>
                              <span className="text-slate-700">{cand.nodeName}</span>
                              {cand.verified && (
                                <CheckCircle2 className="h-3 w-3 text-green-600 inline ml-1" />
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-green-700">
                              +{cand.preventedSpread.toFixed(2)} nodes
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-900">
                              <span className="rounded bg-green-50 px-2 py-0.5 text-green-800 border border-green-200">
                                {cand.effectivenessPercentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-purple-700 font-medium">
                              {betPct}%
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyContainment(cand.nodeId);
                                }}
                                className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isBlocked
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                                }`}
                              >
                                {isBlocked ? (
                                  <>
                                    <Unlock className="h-3 w-3" />
                                    <span>Unblock</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3 w-3" />
                                    <span>Quarantine</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : containmentModel === 'recurrence' ? (
                      recurrenceCandidates.map((cand) => {
                        const isBlocked = simulationState.blockedNodes.includes(cand.nodeId);
                        return (
                          <tr
                            key={cand.nodeId}
                            onClick={() => setSelectedCandidateId(cand.nodeId)}
                            className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                              selectedCandidateId === cand.nodeId ? 'bg-emerald-50/40' : ''
                            }`}
                          >
                            <td className="px-4 py-2.5 font-medium font-sans">
                              <span className="font-mono text-slate-400 mr-1.5">#{cand.rank}</span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                                {cand.nodeId}
                              </span>
                              <span className="text-slate-700">{cand.nodeName}</span>
                              {cand.verified && (
                                <CheckCircle2 className="h-3 w-3 text-green-600 inline ml-1" />
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-emerald-700">
                              +{cand.preventedSpread.toFixed(1)} nodes
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-900">
                              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 border border-emerald-200">
                                {cand.effectivenessPercentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">
                              <span className="text-slate-500">{cand.baselineBranchingFactor.toFixed(2)}</span>
                              <span className="mx-1 text-emerald-600">→</span>
                              <strong className="text-emerald-700">{cand.containedBranchingFactor.toFixed(2)}</strong>
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyContainment(cand.nodeId);
                                }}
                                className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isBlocked
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                }`}
                              >
                                {isBlocked ? (
                                  <>
                                    <Unlock className="h-3 w-3" />
                                    <span>Unblock</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3 w-3" />
                                    <span>Quarantine</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      containmentCandidates.map((cand, idx) => {
                        const isBlocked = simulationState.blockedNodes.includes(cand.nodeId);
                        const cStats = centralityStats.find((s) => s.id === cand.nodeId);
                        const betPct = cStats ? Number((cStats.betweennessCentrality * 100).toFixed(1)) : 0;
                        return (
                          <tr
                            key={cand.nodeId}
                            onClick={() => setSelectedCandidateId(cand.nodeId)}
                            className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                              selectedCandidateId === cand.nodeId ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            <td className="px-4 py-2.5 font-medium font-sans">
                              <span className="font-mono text-slate-400 mr-1.5">#{idx + 1}</span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                                {cand.nodeId}
                              </span>
                              <span className="text-slate-700">{cand.nodeName}</span>
                            </td>
                            <td className="px-4 py-2.5 font-bold text-green-700">
                              +{cand.preventedReach} nodes
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-900">
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800 border border-blue-200">
                                {cand.effectivenessPercentage}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-purple-700 font-medium">
                              {betPct}%
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyContainment(cand.nodeId);
                                }}
                                className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isBlocked
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                                }`}
                              >
                                {isBlocked ? (
                                  <>
                                    <Unlock className="h-3 w-3" />
                                    <span>Unblock</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3 w-3" />
                                    <span>Quarantine</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Candidate Cut Graph Inspector & Tri-Model Impact Comparison */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Active Cut Graph Preview
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {simulationState.blockedNodes.length} Isolated
                  </span>
                </div>
                <GraphCanvas
                  nodes={nodes}
                  connections={connections}
                  sourceNodeId={sourceNodeId}
                  affectedNodes={simulationState.affectedNodes}
                  activeStepNodes={[]}
                  activeStepEdges={[]}
                  blockedNodes={simulationState.blockedNodes}
                  bridgeNodeIds={bridgeNodeIds}
                  onSelectNode={onSelectNode}
                  onNodePositionChange={onNodePositionChange}
                  height={320}
                />
              </div>

              {/* Side-by-Side Tri-Model Containment Comparison for Selected Candidate */}
              {selectedCandidateId && (() => {
                const targetIcm = icmCandidates.find((c) => c.nodeId === selectedCandidateId);
                const targetRec = recurrenceCandidates.find((c) => c.nodeId === selectedCandidateId);
                const targetBfs = containmentCandidates.find((c) => c.nodeId === selectedCandidateId);
                const targetNode = nodes.find((n) => n.id === selectedCandidateId);
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Tri-Model Containment Comparison
                        </h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {selectedCandidateId} ({targetNode?.name || ''})
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      {/* Recurrence */}
                      <div className="rounded bg-emerald-50/70 border border-emerald-200 p-2.5">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                          Recurrence (Theor.)
                        </span>
                        <div className="text-base font-bold text-emerald-900 font-mono mt-1">
                          +{targetRec ? targetRec.preventedSpread.toFixed(1) : '0.0'}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-mono block">
                          η = {targetRec ? targetRec.effectivenessPercentage.toFixed(1) : '0.0'}%
                        </span>
                        <span className="text-[9px] text-emerald-600 font-mono block mt-0.5">
                          r': {targetRec ? targetRec.containedBranchingFactor.toFixed(2) : '-'}
                        </span>
                      </div>

                      {/* ICM */}
                      <div className="rounded bg-purple-50/70 border border-purple-200 p-2.5">
                        <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                          ICM (Simulated)
                        </span>
                        <div className="text-base font-bold text-purple-900 font-mono mt-1">
                          +{targetIcm ? targetIcm.preventedSpread.toFixed(2) : '0.00'}
                        </div>
                        <span className="text-[10px] text-purple-700 font-mono block">
                          η = {targetIcm ? targetIcm.effectivenessPercentage.toFixed(1) : '0.0'}%
                        </span>
                        <span className="text-[9px] text-purple-600 font-mono block mt-0.5">
                          M={icmIterations} runs
                        </span>
                      </div>

                      {/* BFS */}
                      <div className="rounded bg-blue-50/70 border border-blue-200 p-2.5">
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                          BFS (Topological)
                        </span>
                        <div className="text-base font-bold text-blue-900 font-mono mt-1">
                          +{targetBfs ? targetBfs.preventedReach : 0}
                        </div>
                        <span className="text-[10px] text-blue-700 font-mono block">
                          η = {targetBfs ? targetBfs.effectivenessPercentage : 0}%
                        </span>
                        <span className="text-[9px] text-blue-600 font-mono block mt-0.5">
                          p = 1.0 bound
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
                      <strong className="text-slate-700">Model Interpretation:</strong> Theoretical recurrence computes the mean-field reduction from removing candidate edges and re-evaluating branching factor <span className="font-mono text-emerald-700">r</span>. ICM evaluates simulated stochastic paths with transmission <span className="font-mono text-purple-700">p={icmTransmissionP}</span>. BFS determines the absolute cut-vertex reachability ceiling (<span className="font-mono text-blue-700">p=1.0</span>).
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
