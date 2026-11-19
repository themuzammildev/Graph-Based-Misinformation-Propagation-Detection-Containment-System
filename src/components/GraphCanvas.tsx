import React, { useState, useRef, useMemo } from 'react';
import { UserNode, Connection } from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  GitFork,
} from 'lucide-react';

interface GraphCanvasProps {
  nodes: UserNode[];
  connections: Connection[];
  sourceNodeId: string;
  affectedNodes: string[];
  activeStepNodes?: string[];
  activeStepEdges?: { source: string; target: string }[];
  blockedNodes: string[];
  containmentTargetId?: string | null;
  bridgeNodeIds?: string[];
  onSelectNode?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  onNodePositionChange?: (id: string, x: number, y: number) => void;
  interactive?: boolean;
  height?: number | string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  connections,
  sourceNodeId,
  affectedNodes,
  activeStepNodes = [],
  activeStepEdges = [],
  blockedNodes,
  containmentTargetId,
  bridgeNodeIds = [],
  onSelectNode,
  selectedNodeId,
  onNodePositionChange,
  interactive = true,
  height = 500,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [showBridges, setShowBridges] = useState<boolean>(true);

  const affectedSet = useMemo(() => new Set(affectedNodes), [affectedNodes]);
  const activeSet = useMemo(() => new Set(activeStepNodes), [activeStepNodes]);
  const blockedSet = useMemo(() => new Set(blockedNodes), [blockedNodes]);
  const bridgeSet = useMemo(() => new Set(bridgeNodeIds), [bridgeNodeIds]);

  // Lookup for fast node retrieval
  const nodeMap = useMemo(() => {
    const map = new Map<string, UserNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Active edges set for ongoing step
  const activeEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    activeStepEdges.forEach((e) => set.add(`${e.source}->${e.target}`));
    return set;
  }, [activeStepEdges]);

  // Traversed edges across all completed steps
  const traversedEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => {
      if (
        affectedSet.has(c.source) &&
        affectedSet.has(c.target) &&
        !blockedSet.has(c.source) &&
        !blockedSet.has(c.target)
      ) {
        set.add(`${c.source}->${c.target}`);
      }
    });
    return set;
  }, [connections, affectedSet, blockedSet]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(2.5, Math.max(0.4, prev * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    if (targetTag === 'svg' || targetTag === 'rect') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (draggingNodeId && svgRef.current && onNodePositionChange) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;
      onNodePositionChange(draggingNodeId, Math.round(rawX), Math.round(rawY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const fitToScreen = () => {
    if (nodes.length === 0 || !svgRef.current) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y));

    const rect = svgRef.current.getBoundingClientRect();
    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;

    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;
    const newZoom = Math.min(1.4, Math.max(0.5, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: rect.width / 2 - midX * newZoom,
      y: rect.height / 2 - midY * newZoom,
    });
  };

  const NODE_RADIUS = 24;

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs select-none">
      {/* Interactive SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full cursor-grab active:cursor-grabbing bg-slate-50/40"
        style={{ height }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Subtle Dot Grid Background */}
          <pattern id="graph-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#e2e8f0" />
          </pattern>

          {/* Standard Directional Arrow */}
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#94a3b8" />
          </marker>

          {/* Traversed Edge Arrow Marker */}
          <marker
            id="arrow-traversed"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#dc2626" />
          </marker>

          {/* Active Step Traversing Arrow Marker */}
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#2563eb" />
          </marker>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="url(#graph-dots)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Directed Edges */}
          {connections.map((conn) => {
            const src = nodeMap.get(conn.source);
            const tgt = nodeMap.get(conn.target);
            if (!src || !tgt) return null;

            const edgeKey = `${conn.source}->${conn.target}`;
            const isTraversed = traversedEdgeKeys.has(edgeKey);
            const isActive = activeEdgeKeys.has(edgeKey);
            const isBlocked = blockedSet.has(conn.source) || blockedSet.has(conn.target);

            // Compute edge geometry offset by node radius
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= NODE_RADIUS * 2) return null;

            const unitX = dx / dist;
            const unitY = dy / dist;

            const startX = src.x + unitX * (NODE_RADIUS + 3);
            const startY = src.y + unitY * (NODE_RADIUS + 3);
            const endX = tgt.x - unitX * (NODE_RADIUS + 7);
            const endY = tgt.y - unitY * (NODE_RADIUS + 7);

            // Clean styling
            let strokeColor = '#cbd5e1'; // slate-300
            let strokeWidth = 1.5;
            let markerEnd = 'url(#arrow-default)';
            let strokeDasharray = undefined;

            if (isBlocked) {
              strokeColor = '#e2e8f0';
              strokeDasharray = '4 4';
            } else if (isActive) {
              strokeColor = '#2563eb';
              strokeWidth = 2.5;
              markerEnd = 'url(#arrow-active)';
            } else if (isTraversed) {
              strokeColor = '#dc2626';
              strokeWidth = 2;
              markerEnd = 'url(#arrow-traversed)';
            }

            return (
              <g key={conn.id}>
                {/* Hit target line */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="transparent"
                  strokeWidth="12"
                />
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  markerEnd={markerEnd}
                />
              </g>
            );
          })}

          {/* Node Elements */}
          {nodes.map((node) => {
            const isSource = node.id === sourceNodeId;
            const isAffected = affectedSet.has(node.id);
            const isActive = activeSet.has(node.id);
            const isBlocked = blockedSet.has(node.id);
            const isContainmentTarget = node.id === containmentTargetId;
            const isSelected = node.id === selectedNodeId;

            // Semantic Color Assignment
            let fillColor = '#ffffff';
            let strokeColor = '#cbd5e1';
            let textColor = '#0f172a';
            let labelColor = '#475569';
            let strokeWidth = 1.5;

            if (isBlocked) {
              fillColor = '#f8fafc';
              strokeColor = '#94a3b8';
              textColor = '#94a3b8';
              labelColor = '#94a3b8';
            } else if (isSource) {
              fillColor = '#eff6ff'; // blue-50
              strokeColor = '#2563eb'; // blue-600
              strokeWidth = 2.5;
              textColor = '#1e40af';
              labelColor = '#1d4ed8';
            } else if (isContainmentTarget) {
              fillColor = '#f0fdf4'; // green-50
              strokeColor = '#16a34a'; // green-600 (#16A34A)
              strokeWidth = 2.5;
              textColor = '#166534';
              labelColor = '#15803d';
            } else if (isAffected) {
              fillColor = '#fef2f2'; // red-50
              strokeColor = '#dc2626'; // red-600
              strokeWidth = 2;
              textColor = '#991b1b';
              labelColor = '#b91c1c';
            } else if (!node.verified && node.shares >= 50) {
              // High-risk node
              fillColor = '#fffbeb'; // amber-50
              strokeColor = '#d97706'; // amber-600
              textColor = '#92400e';
              labelColor = '#b45309';
            }

            const isBridge = bridgeSet.has(node.id);
            if (isSelected) {
              strokeWidth = 3;
            }

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode?.(node.id);
                }}
                onMouseDown={(e) => {
                  if (interactive) {
                    e.stopPropagation();
                    setDraggingNodeId(node.id);
                  }
                }}
              >
                {/* Active Pulse Ring */}
                {isActive && (
                  <circle
                    r={NODE_RADIUS + 6}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="animate-spin"
                    style={{ animationDuration: '4s' }}
                  />
                )}

                {/* Bridge Halo Ring (Brandes' High Betweenness Centrality) */}
                {showBridges && isBridge && !isBlocked && (
                  <circle
                    r={NODE_RADIUS + 5}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                    style={{ animationDuration: '3s' }}
                  />
                )}

                {/* Node Main Circle */}
                <circle
                  r={NODE_RADIUS}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isBlocked ? '3 3' : undefined}
                  className="transition-colors duration-150"
                />

                {/* Node ID Text */}
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fill={textColor}
                  className="font-mono text-xs font-bold pointer-events-none select-none"
                >
                  {node.id}
                </text>

                {/* User Name & Verification Status Label */}
                <g transform={`translate(0, ${NODE_RADIUS + 12})`}>
                  <text
                    textAnchor="middle"
                    fill={labelColor}
                    className="text-[11px] font-medium pointer-events-none select-none"
                  >
                    {node.name.split(' ')[0]}
                  </text>
                </g>

                {/* Verification / Risk Marker Icon */}
                <g transform={`translate(${NODE_RADIUS - 8}, ${-NODE_RADIUS + 8})`}>
                  {node.verified ? (
                    <circle r="4.5" fill="#16a34a" />
                  ) : (
                    <circle r="4.5" fill="#d97706" />
                  )}
                  {node.verified ? (
                    <path
                      d="M -2 0 L -0.5 1.5 L 2 -1"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  ) : (
                    <path
                      d="M 0 -2 L 0 0.5 M 0 2 L 0 2.2"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  )}
                </g>

                {/* Propagation Bridge Badge (Top-Left Diamond Indicator) */}
                {showBridges && isBridge && !isBlocked && (
                  <g transform={`translate(${-NODE_RADIUS + 4}, ${-NODE_RADIUS + 4})`}>
                    <rect
                      x="-6"
                      y="-6"
                      width="12"
                      height="12"
                      rx="2.5"
                      fill="#7c3aed"
                      stroke="#ffffff"
                      strokeWidth="1"
                      transform="rotate(45)"
                    />
                    <text
                      textAnchor="middle"
                      dy=".35em"
                      fill="#ffffff"
                      className="font-mono text-[8px] font-bold pointer-events-none select-none"
                    >
                      B
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Canvas Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 shadow-2xs">
        {/* Bridge Highlighting Toggle */}
        <button
          onClick={() => setShowBridges(!showBridges)}
          title={showBridges ? 'Hide Bridge Highlights' : 'Highlight Propagation Bridges (Brandes Betweenness)'}
          className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            showBridges
              ? 'bg-purple-100 text-purple-800 border border-purple-300'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GitFork className="h-3 w-3 text-purple-600" />
          <span>Bridges</span>
        </button>

        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
          title="Zoom In"
          className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
          title="Zoom Out"
          className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          title="Reset Zoom & Pan"
          className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={fitToScreen}
          title="Fit to Screen"
          className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Clean Bottom Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 bg-white px-3 py-1.5 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span>Source</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
          <span>Affected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 border border-slate-400" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
          <span>Containment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-600 ring-2 ring-purple-200" />
          <span className="text-purple-700 font-semibold">Propagation Bridge</span>
        </div>
      </div>
    </div>
  );
};
