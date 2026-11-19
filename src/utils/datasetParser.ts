import { UserNode, Connection, DatasetValidationReport } from '../types';
import { calculateNodePositions } from './graphLayout';

export interface ParseResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  nodes: UserNode[];
  connections: Connection[];
  report: DatasetValidationReport;
}

export interface ParserOptions {
  strictEdgeReferences?: boolean; // If true (default), missing node references in edges produce validation errors. If false, invalid relationships are rejected with warnings.
}

/**
 * Robust CSV line tokenizer respecting RFC-4180 quotes and escaped quotes
 */
export function tokenizeCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentValue += '"';
        i += 2;
        continue;
      }
      insideQuotes = !insideQuotes;
      i++;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
      i++;
      continue;
    }

    currentValue += char;
    i++;
  }

  values.push(currentValue.trim());
  return values;
}

/**
 * Splits raw CSV text into rows, removing blank lines, carriage returns, and UTF-8 BOM
 */
export function splitCSVRows(csvText: string): string[] {
  return csvText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
}

/**
 * Coerces truthy/falsy strings into boolean
 */
export function parseBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const str = String(val).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'yes' || str === 'y' || str === 't';
}

/**
 * Parses nodes.csv and edges.csv files
 */
export function parseAndValidateCSVDataset(
  nodesCsvText: string,
  edgesCsvText: string,
  options: ParserOptions = { strictEdgeReferences: true }
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawNodeRows = splitCSVRows(nodesCsvText);
  const rawEdgeRows = splitCSVRows(edgesCsvText);

  // 1. Check for empty files
  if (rawNodeRows.length === 0) {
    errors.push('nodes.csv is empty or contains no valid rows.');
  }
  if (rawEdgeRows.length === 0) {
    errors.push('edges.csv is empty or contains no valid rows.');
  }

  if (errors.length > 0) {
    return createFailedResult(errors, warnings);
  }

  // 2. Validate nodes.csv headers
  const nodeHeaderTokens = tokenizeCSVLine(rawNodeRows[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, '')
  );

  const requiredNodeCols = ['id', 'name', 'verified', 'followers'];
  const missingNodeCols = requiredNodeCols.filter((col) => !nodeHeaderTokens.includes(col));

  if (missingNodeCols.length > 0) {
    errors.push(
      `nodes.csv is missing required column(s): ${missingNodeCols.join(', ')}. Expected: id,name,verified,followers`
    );
  }

  // 3. Validate edges.csv headers
  const edgeHeaderTokens = tokenizeCSVLine(rawEdgeRows[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, '')
  );

  const requiredEdgeCols = ['source', 'target'];
  const missingEdgeCols = requiredEdgeCols.filter((col) => !edgeHeaderTokens.includes(col));

  if (missingEdgeCols.length > 0) {
    errors.push(
      `edges.csv is missing required column(s): ${missingEdgeCols.join(', ')}. Expected: source,target,weight`
    );
  }

  if (errors.length > 0) {
    return createFailedResult(errors, warnings);
  }

  // Map header column indices
  const nodeIdIdx = nodeHeaderTokens.indexOf('id');
  const nodeNameIdx = nodeHeaderTokens.indexOf('name');
  const nodeVerIdx = nodeHeaderTokens.indexOf('verified');
  const nodeFolIdx = nodeHeaderTokens.indexOf('followers');
  const nodeRoleIdx = nodeHeaderTokens.indexOf('role');
  const nodeSharesIdx = nodeHeaderTokens.indexOf('shares');
  const nodeIndIdx = nodeHeaderTokens.indexOf('independentsources');

  const edgeSrcIdx = edgeHeaderTokens.indexOf('source');
  const edgeTgtIdx = edgeHeaderTokens.indexOf('target');
  const edgeWeightIdx = edgeHeaderTokens.indexOf('weight');

  // 4. Parse Nodes
  const parsedNodes: UserNode[] = [];
  const seenNodeIds = new Set<string>();

  for (let i = 1; i < rawNodeRows.length; i++) {
    const rowTokens = tokenizeCSVLine(rawNodeRows[i]);
    const rowNumber = i + 1;

    const id = rowTokens[nodeIdIdx]?.trim();
    const name = rowTokens[nodeNameIdx]?.trim();

    if (!id) {
      errors.push(`Line ${rowNumber} in nodes.csv: Missing node 'id'.`);
      continue;
    }

    if (seenNodeIds.has(id)) {
      errors.push(`Line ${rowNumber} in nodes.csv: Duplicate node ID '${id}'. Node IDs must be unique.`);
      continue;
    }

    seenNodeIds.add(id);

    const verified = parseBoolean(rowTokens[nodeVerIdx]);
    const cleanFol = String(rowTokens[nodeFolIdx] || '').replace(/,/g, '').trim();
    const rawFollowers = Number(cleanFol);
    const followers = isNaN(rawFollowers) || rawFollowers < 0 ? 0 : Math.floor(rawFollowers);

    // Optional fields with sensible defaults
    const role =
      nodeRoleIdx !== -1 && rowTokens[nodeRoleIdx]?.trim()
        ? rowTokens[nodeRoleIdx].trim()
        : verified
        ? 'Verified Influencer'
        : 'Network Contributor';

    const cleanShares = nodeSharesIdx !== -1 ? String(rowTokens[nodeSharesIdx] || '').replace(/,/g, '').trim() : '';
    const shares =
      nodeSharesIdx !== -1 && !isNaN(Number(cleanShares))
        ? Math.max(0, Math.floor(Number(cleanShares)))
        : Math.min(250, Math.max(10, Math.floor(followers * 0.05) || 25));

    const cleanInd = nodeIndIdx !== -1 ? String(rowTokens[nodeIndIdx] || '').replace(/,/g, '').trim() : '';
    const independentSources =
      nodeIndIdx !== -1 && !isNaN(Number(cleanInd))
        ? Math.max(0, Math.floor(Number(cleanInd)))
        : verified
        ? 2
        : 0;

    parsedNodes.push({
      id,
      name: name || `User ${id}`,
      role,
      verified,
      followers,
      shares,
      independentSources,
      x: 0,
      y: 0,
    });
  }

  if (parsedNodes.length === 0 && errors.length === 0) {
    errors.push('nodes.csv contains no valid node data rows.');
  }

  // 5. Parse Edges & Validate References
  const parsedConnections: Connection[] = [];
  const seenEdgePairs = new Set<string>();
  let deduplicatedEdgesCount = 0;
  let rejectedEdgesCount = 0;

  for (let j = 1; j < rawEdgeRows.length; j++) {
    const rowTokens = tokenizeCSVLine(rawEdgeRows[j]);
    const rowNumber = j + 1;

    const source = rowTokens[edgeSrcIdx]?.trim();
    const target = rowTokens[edgeTgtIdx]?.trim();

    if (!source || !target) {
      warnings.push(`Line ${rowNumber} in edges.csv: Incomplete edge definition ignored.`);
      rejectedEdgesCount++;
      continue;
    }

    // Check self-loop
    if (source === target) {
      warnings.push(`Line ${rowNumber} in edges.csv: Self-loop '${source} -> ${target}' rejected.`);
      rejectedEdgesCount++;
      continue;
    }

    // Validate edge references against existing node IDs
    const sourceExists = seenNodeIds.has(source);
    const targetExists = seenNodeIds.has(target);

    if (!sourceExists || !targetExists) {
      const missing = !sourceExists && !targetExists
        ? `'${source}' and '${target}'`
        : !sourceExists
        ? `'${source}'`
        : `'${target}'`;
      const msg = `Line ${rowNumber} in edges.csv: Edge '${source} -> ${target}' references non-existent node ${missing}.`;
      if (options.strictEdgeReferences) {
        errors.push(msg);
      } else {
        warnings.push(`${msg} Relationship rejected.`);
      }
      rejectedEdgesCount++;
      continue;
    }

    // Check duplicate edges
    const pairKey = `${source}->${target}`;
    if (seenEdgePairs.has(pairKey)) {
      warnings.push(`Line ${rowNumber} in edges.csv: Duplicate edge '${source} -> ${target}' merged.`);
      deduplicatedEdgesCount++;
      continue;
    }

    seenEdgePairs.add(pairKey);

    const rawWeight = edgeWeightIdx !== -1 ? Number(rowTokens[edgeWeightIdx]) : 1.0;
    const weight = isNaN(rawWeight) || rawWeight <= 0 ? 1.0 : Number(rawWeight.toFixed(2));

    parsedConnections.push({
      id: `e_${source}_${target}_${j}`,
      source,
      target,
      weight,
    });
  }

  // If critical errors exist, fail
  if (errors.length > 0) {
    return createFailedResult(errors, warnings, parsedNodes.length, parsedConnections.length);
  }

  // Position nodes within canvas bounds
  const positionedNodes = calculateNodePositions(parsedNodes, parsedConnections);

  const N = positionedNodes.length;
  const E = parsedConnections.length;
  const maxPossibleEdges = N * (N - 1);
  const density = maxPossibleEdges > 0 ? Number((E / maxPossibleEdges).toFixed(3)) : 0;

  const report: DatasetValidationReport = {
    isValid: true,
    errors: [],
    warnings,
    nodesCount: N,
    edgesCount: E,
    density,
    deduplicatedEdgesCount,
    rejectedEdgesCount,
  };

  return {
    isValid: true,
    errors: [],
    warnings,
    nodes: positionedNodes,
    connections: parsedConnections,
    report,
  };
}

/**
 * Parses and validates combined JSON dataset
 */
export function parseAndValidateJSONDataset(
  jsonText: string,
  options: ParserOptions = { strictEdgeReferences: true }
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err: any) {
    return createFailedResult([`Invalid JSON syntax: ${err.message || 'Unable to parse JSON string'}`], []);
  }

  if (!parsed || typeof parsed !== 'object') {
    return createFailedResult(['JSON root must be an object containing "nodes" and "edges" arrays.'], []);
  }

  // Support both "edges" and "connections" key
  const rawNodes = parsed.nodes;
  const rawEdges = parsed.edges || parsed.connections;

  if (!Array.isArray(rawNodes)) {
    errors.push('JSON is missing required "nodes" array.');
  }
  if (!Array.isArray(rawEdges)) {
    errors.push('JSON is missing required "edges" (or "connections") array.');
  }

  if (errors.length > 0) {
    return createFailedResult(errors, warnings);
  }

  if (rawNodes.length === 0) {
    errors.push('"nodes" array is empty. At least one user node is required.');
    return createFailedResult(errors, warnings);
  }

  // Parse nodes
  const parsedNodes: UserNode[] = [];
  const seenNodeIds = new Set<string>();

  for (let i = 0; i < rawNodes.length; i++) {
    const raw = rawNodes[i];
    if (!raw || typeof raw !== 'object') {
      errors.push(`Node index ${i}: Invalid node object.`);
      continue;
    }

    const id = raw.id ? String(raw.id).trim() : '';
    if (!id) {
      errors.push(`Node index ${i}: Missing 'id' field.`);
      continue;
    }

    if (seenNodeIds.has(id)) {
      errors.push(`Node index ${i}: Duplicate node ID '${id}'. Node IDs must be unique.`);
      continue;
    }

    seenNodeIds.add(id);

    const name = raw.name ? String(raw.name).trim() : `User ${id}`;
    const verified = parseBoolean(raw.verified);
    const rawFollowers = typeof raw.followers === 'number'
      ? raw.followers
      : Number(String(raw.followers || '').replace(/,/g, ''));
    const followers = isNaN(rawFollowers) || rawFollowers < 0 ? 100 : Math.floor(rawFollowers);
    const role = raw.role ? String(raw.role).trim() : verified ? 'Verified Contributor' : 'Community Member';
    const shares =
      typeof raw.shares === 'number' && raw.shares >= 0
        ? Math.floor(raw.shares)
        : Math.min(250, Math.max(10, Math.floor(followers * 0.05) || 25));
    const independentSources =
      typeof raw.independentSources === 'number' && raw.independentSources >= 0
        ? Math.floor(raw.independentSources)
        : verified
        ? 2
        : 0;

    const x = typeof raw.x === 'number' ? raw.x : 0;
    const y = typeof raw.y === 'number' ? raw.y : 0;

    parsedNodes.push({
      id,
      name,
      role,
      verified,
      followers,
      shares,
      independentSources,
      x,
      y,
    });
  }

  // Parse edges
  const parsedConnections: Connection[] = [];
  const seenEdgePairs = new Set<string>();
  let deduplicatedEdgesCount = 0;
  let rejectedEdgesCount = 0;

  for (let j = 0; j < rawEdges.length; j++) {
    const raw = rawEdges[j];
    if (!raw || typeof raw !== 'object') {
      warnings.push(`Edge index ${j}: Invalid edge object skipped.`);
      rejectedEdgesCount++;
      continue;
    }

    const source = raw.source ? String(raw.source).trim() : '';
    const target = raw.target ? String(raw.target).trim() : '';

    if (!source || !target) {
      warnings.push(`Edge index ${j}: Missing 'source' or 'target' field.`);
      rejectedEdgesCount++;
      continue;
    }

    if (source === target) {
      warnings.push(`Edge index ${j}: Self-loop '${source} -> ${target}' rejected.`);
      rejectedEdgesCount++;
      continue;
    }

    const sourceExists = seenNodeIds.has(source);
    const targetExists = seenNodeIds.has(target);

    if (!sourceExists || !targetExists) {
      const missing = !sourceExists && !targetExists
        ? `'${source}' and '${target}'`
        : !sourceExists
        ? `'${source}'`
        : `'${target}'`;
      const msg = `Edge index ${j}: Edge '${source} -> ${target}' references non-existent node ${missing}.`;
      if (options.strictEdgeReferences) {
        errors.push(msg);
      } else {
        warnings.push(`${msg} Relationship rejected.`);
      }
      rejectedEdgesCount++;
      continue;
    }

    const pairKey = `${source}->${target}`;
    if (seenEdgePairs.has(pairKey)) {
      warnings.push(`Edge index ${j}: Duplicate edge '${source} -> ${target}' merged.`);
      deduplicatedEdgesCount++;
      continue;
    }

    seenEdgePairs.add(pairKey);

    const weight = typeof raw.weight === 'number' && raw.weight > 0 ? Number(raw.weight.toFixed(2)) : 1.0;

    parsedConnections.push({
      id: raw.id || `e_${source}_${target}_${j}`,
      source,
      target,
      weight,
    });
  }

  if (errors.length > 0) {
    return createFailedResult(errors, warnings, parsedNodes.length, parsedConnections.length);
  }

  // Assign coordinates if missing
  const positionedNodes = calculateNodePositions(parsedNodes, parsedConnections);

  const N = positionedNodes.length;
  const E = parsedConnections.length;
  const maxPossibleEdges = N * (N - 1);
  const density = maxPossibleEdges > 0 ? Number((E / maxPossibleEdges).toFixed(3)) : 0;

  const report: DatasetValidationReport = {
    isValid: true,
    errors: [],
    warnings,
    nodesCount: N,
    edgesCount: E,
    density,
    deduplicatedEdgesCount,
    rejectedEdgesCount,
  };

  return {
    isValid: true,
    errors: [],
    warnings,
    nodes: positionedNodes,
    connections: parsedConnections,
    report,
  };
}

function createFailedResult(
  errors: string[],
  warnings: string[],
  nodesCount = 0,
  edgesCount = 0
): ParseResult {
  return {
    isValid: false,
    errors,
    warnings,
    nodes: [],
    connections: [],
    report: {
      isValid: false,
      errors,
      warnings,
      nodesCount,
      edgesCount,
      density: 0,
      deduplicatedEdgesCount: 0,
      rejectedEdgesCount: 0,
    },
  };
}
