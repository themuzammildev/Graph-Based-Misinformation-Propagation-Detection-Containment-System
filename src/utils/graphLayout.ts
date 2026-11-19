import { UserNode, Connection } from '../types';

/**
 * Calculates deterministic, visually balanced canvas coordinates (x, y) for nodes.
 * Uses a concentric multi-ring layout ordered by node degree, ensuring:
 * - Hub/influential nodes occupy prominent inner tiers
 * - Intermediate nodes and leaves form outer concentric shells
 * - All coordinates remain cleanly within canvas bounds [60, 740] x [60, 440]
 */
export function calculateNodePositions(
  nodes: UserNode[],
  connections: Connection[],
  canvasWidth: number = 800,
  canvasHeight: number = 500
): UserNode[] {
  if (nodes.length === 0) return [];

  // Check if nodes already have well-defined, distinct non-zero coordinates
  const hasDistinctCoords =
    nodes.every((n) => typeof n.x === 'number' && typeof n.y === 'number' && n.x > 0 && n.y > 0) &&
    new Set(nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`)).size === nodes.length;

  if (hasDistinctCoords && nodes.length <= 15) {
    return nodes;
  }

  // Calculate degrees to rank nodes for topological positioning
  const outDegreeMap = new Map<string, number>();
  const inDegreeMap = new Map<string, number>();
  nodes.forEach((n) => {
    outDegreeMap.set(n.id, 0);
    inDegreeMap.set(n.id, 0);
  });

  connections.forEach((c) => {
    if (outDegreeMap.has(c.source)) {
      outDegreeMap.set(c.source, outDegreeMap.get(c.source)! + 1);
    }
    if (inDegreeMap.has(c.target)) {
      inDegreeMap.set(c.target, inDegreeMap.get(c.target)! + 1);
    }
  });

  // Sort nodes descending by total degree (hubs first)
  const sortedNodes = [...nodes].sort((a, b) => {
    const degA = (outDegreeMap.get(a.id) || 0) + (inDegreeMap.get(a.id) || 0);
    const degB = (outDegreeMap.get(b.id) || 0) + (inDegreeMap.get(b.id) || 0);
    return degB - degA;
  });

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const total = sortedNodes.length;

  // Decide ring configuration based on network size
  const positionedNodes: UserNode[] = [];

  if (total <= 6) {
    // Single ring
    const radius = Math.min(cx, cy) * 0.65;
    sortedNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / total - Math.PI / 2;
      positionedNodes.push({
        ...node,
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle)),
      });
    });
  } else if (total <= 16) {
    // Two rings: inner core (4 hubs) and outer ring (remaining)
    const coreCount = Math.min(4, Math.floor(total * 0.35));
    const outerCount = total - coreCount;
    const innerRadius = Math.min(cx, cy) * 0.38;
    const outerRadius = Math.min(cx, cy) * 0.76;

    sortedNodes.forEach((node, i) => {
      if (i < coreCount) {
        const angle = (2 * Math.PI * i) / coreCount - Math.PI / 2;
        positionedNodes.push({
          ...node,
          x: Math.round(cx + innerRadius * Math.cos(angle)),
          y: Math.round(cy + innerRadius * Math.sin(angle)),
        });
      } else {
        const outerIndex = i - coreCount;
        const angle = (2 * Math.PI * outerIndex) / outerCount - Math.PI / 2 + Math.PI / outerCount;
        positionedNodes.push({
          ...node,
          x: Math.round(cx + outerRadius * Math.cos(angle)),
          y: Math.round(cy + outerRadius * Math.sin(angle)),
        });
      }
    });
  } else {
    // Three concentric rings: Core hubs (15%), Middle bridges (35%), Outer leaves (50%)
    const innerCount = Math.max(3, Math.round(total * 0.15));
    const middleCount = Math.max(6, Math.round(total * 0.35));
    const outerCount = total - innerCount - middleCount;

    const rInner = Math.min(cx, cy) * 0.28;
    const rMiddle = Math.min(cx, cy) * 0.58;
    const rOuter = Math.min(cx, cy) * 0.84;

    sortedNodes.forEach((node, i) => {
      let radius: number;
      let angle: number;

      if (i < innerCount) {
        radius = rInner;
        angle = (2 * Math.PI * i) / innerCount - Math.PI / 2;
      } else if (i < innerCount + middleCount) {
        const midIdx = i - innerCount;
        radius = rMiddle;
        angle = (2 * Math.PI * midIdx) / middleCount - Math.PI / 2 + 0.2;
      } else {
        const outIdx = i - (innerCount + middleCount);
        radius = rOuter;
        angle = (2 * Math.PI * outIdx) / outerCount - Math.PI / 2 + 0.4;
      }

      // Keep within canvas padding
      const x = Math.min(canvasWidth - 60, Math.max(60, Math.round(cx + radius * Math.cos(angle))));
      const y = Math.min(canvasHeight - 60, Math.max(60, Math.round(cy + radius * Math.sin(angle))));

      positionedNodes.push({
        ...node,
        x,
        y,
      });
    });
  }

  // Restore original ordering if desired, or return positioned nodes
  const resultMap = new Map(positionedNodes.map((n) => [n.id, n]));
  return nodes.map((original) => resultMap.get(original.id) || original);
}
