import React, { useState, useRef } from 'react';
import {
  UserNode,
  Connection,
  DatasetValidationReport,
  DatasetMetadata,
} from '../types';
import {
  parseAndValidateCSVDataset,
  parseAndValidateJSONDataset,
  ParseResult,
} from '../utils/datasetParser';
import {
  CSV_NODES_TEMPLATE,
  CSV_EDGES_TEMPLATE,
  JSON_DATASET_TEMPLATE,
  SAMPLE_24_NODES_CSV,
  SAMPLE_48_EDGES_CSV,
  SAMPLE_24_48_JSON,
  PHEME_RUMOR_BENCHMARK,
  downloadFile,
} from '../data/sampleDatasets';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Download,
  Database,
  ArrowRight,
  RefreshCw,
  Eye,
  Layers,
  Sparkles,
  Search,
  ShieldCheck,
} from 'lucide-react';

interface DatasetUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDataset: (
    nodes: UserNode[],
    connections: Connection[],
    metadata: DatasetMetadata
  ) => void;
  currentMetadata?: DatasetMetadata;
}

export const DatasetUploaderModal: React.FC<DatasetUploaderModalProps> = ({
  isOpen,
  onClose,
  onApplyDataset,
  currentMetadata,
}) => {
  // Tabs: 'csv' | 'json' | 'benchmark'
  const [activeTab, setActiveTab] = useState<'csv' | 'json' | 'benchmark'>('csv');

  // CSV file state
  const [nodesFile, setNodesFile] = useState<File | null>(null);
  const [edgesFile, setEdgesFile] = useState<File | null>(null);
  const [nodesCsvContent, setNodesCsvContent] = useState<string>('');
  const [edgesCsvContent, setEdgesCsvContent] = useState<string>('');

  // JSON file state
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonContent, setJsonContent] = useState<string>('');

  // Drag and drop states
  const [isDraggingNodes, setIsDraggingNodes] = useState(false);
  const [isDraggingEdges, setIsDraggingEdges] = useState(false);
  const [isDraggingJson, setIsDraggingJson] = useState(false);

  // Parsing and Validation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [previewView, setPreviewView] = useState<'nodes' | 'edges'>('nodes');
  // Search filter in Preview
  const [searchQuery, setSearchQuery] = useState<string>('');

  const nodesInputRef = useRef<HTMLInputElement | null>(null);
  const edgesInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // File Reading Helpers
  const handleNodesFileSelected = (file: File) => {
    setNodesFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setNodesCsvContent(text);
      if (edgesCsvContent) {
        validateCSVPair(text, edgesCsvContent);
      }
    };
    reader.readAsText(file);
  };

  const handleEdgesFileSelected = (file: File) => {
    setEdgesFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setEdgesCsvContent(text);
      if (nodesCsvContent) {
        validateCSVPair(nodesCsvContent, text);
      }
    };
    reader.readAsText(file);
  };

  const handleMultipleCSVFiles = (files: FileList | File[]) => {
    let nFile: File | null = null;
    let eFile: File | null = null;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const name = f.name.toLowerCase();
      if (name.includes('node') || name.includes('user')) {
        nFile = f;
      } else if (name.includes('edge') || name.includes('conn') || name.includes('link')) {
        eFile = f;
      }
    }

    // Fallbacks if filenames don't contain keywords
    if (!nFile && files.length >= 1) nFile = files[0];
    if (!eFile && files.length >= 2) eFile = files[1];

    if (nFile && eFile) {
      setNodesFile(nFile);
      setEdgesFile(eFile);
      const readerN = new FileReader();
      readerN.onload = (eN) => {
        const textN = (eN.target?.result as string) || '';
        setNodesCsvContent(textN);
        const readerE = new FileReader();
        readerE.onload = (eE) => {
          const textE = (eE.target?.result as string) || '';
          setEdgesCsvContent(textE);
          validateCSVPair(textN, textE);
        };
        readerE.readAsText(eFile!);
      };
      readerN.readAsText(nFile);
    } else if (nFile) {
      handleNodesFileSelected(nFile);
    } else if (eFile) {
      handleEdgesFileSelected(eFile);
    }
  };

  const handleJsonFileSelected = (file: File) => {
    setJsonFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setJsonContent(text);
      validateJSON(text);
    };
    reader.readAsText(file);
  };

  // Validation Triggers
  const validateCSVPair = (nodesText: string, edgesText: string, strict = true) => {
    setIsProcessing(true);
    setProgressStage('Parsing CSV schemas & headers...');

    setTimeout(() => {
      setProgressStage('Validating unique node IDs & edge references...');
      setTimeout(() => {
        const result = parseAndValidateCSVDataset(nodesText, edgesText, {
          strictEdgeReferences: strict,
        });
        setParseResult(result);
        setIsProcessing(false);
        setProgressStage('');
      }, 150);
    }, 150);
  };

  const validateJSON = (text: string, strict = true) => {
    setIsProcessing(true);
    setProgressStage('Parsing JSON payload schema...');

    setTimeout(() => {
      setProgressStage('Checking graph topology & relationships...');
      setTimeout(() => {
        const result = parseAndValidateJSONDataset(text, {
          strictEdgeReferences: strict,
        });
        setParseResult(result);
        setIsProcessing(false);
        setProgressStage('');
      }, 150);
    }, 150);
  };

  // Discard invalid relationships and proceed with valid subgraph
  const handleSanitizeAndProceed = () => {
    if (activeTab === 'csv') {
      validateCSVPair(nodesCsvContent, edgesCsvContent, false);
    } else if (activeTab === 'json') {
      validateJSON(jsonContent, false);
    }
  };

  // Benchmark Preloaded Dataset Handler
  const handleLoadBenchmark = () => {
    const metadata: DatasetMetadata = {
      isCustomUpload: true,
      datasetName: PHEME_RUMOR_BENCHMARK.name,
      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      format: 'preset',
      nodesCount: PHEME_RUMOR_BENCHMARK.nodes.length,
      edgesCount: PHEME_RUMOR_BENCHMARK.connections.length,
      sourceType: 'benchmark',
    };

    onApplyDataset(
      PHEME_RUMOR_BENCHMARK.nodes,
      PHEME_RUMOR_BENCHMARK.connections,
      metadata
    );
    onClose();
  };

  // Apply Validated Custom Dataset
  const handleApplyCustom = () => {
    if (!parseResult || !parseResult.isValid) return;

    const datasetName =
      activeTab === 'csv'
        ? `${nodesFile?.name || 'nodes.csv'} + ${edgesFile?.name || 'edges.csv'}`
        : jsonFile?.name || 'dataset.json';

    const metadata: DatasetMetadata = {
      isCustomUpload: true,
      datasetName,
      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      format: activeTab === 'csv' ? 'csv' : 'json',
      nodesCount: parseResult.nodes.length,
      edgesCount: parseResult.connections.length,
      sourceType: 'uploaded',
    };

    onApplyDataset(parseResult.nodes, parseResult.connections, metadata);
    onClose();
  };

  const handleResetCurrent = () => {
    setNodesFile(null);
    setEdgesFile(null);
    setNodesCsvContent('');
    setEdgesCsvContent('');
    setJsonFile(null);
    setJsonContent('');
    setParseResult(null);
    setProgressStage('');
    setSearchQuery('');
    if (nodesInputRef.current) nodesInputRef.current.value = '';
    if (edgesInputRef.current) edgesInputRef.current.value = '';
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Dataset Ingestion & Management
              </h2>
              <p className="text-xs text-slate-500">
                Import CSV or JSON user networks, validate graph topology, and calculate metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2.5 shrink-0">
          <button
            onClick={() => {
              setActiveTab('csv');
              handleResetCurrent();
            }}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'csv'
                ? 'bg-white text-blue-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>CSV Upload (nodes.csv + edges.csv)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('json');
              handleResetCurrent();
            }}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'json'
                ? 'bg-white text-blue-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>JSON Upload (nodes & edges)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('benchmark');
              handleResetCurrent();
            }}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'benchmark'
                ? 'bg-white text-blue-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Benchmark PHEME Dataset & Templates</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CSV UPLOAD */}
          {activeTab === 'csv' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. nodes.csv dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingNodes(true);
                  }}
                  onDragLeave={() => setIsDraggingNodes(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingNodes(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
                      handleMultipleCSVFiles(e.dataTransfer.files);
                    } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleNodesFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => nodesInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    isDraggingNodes
                      ? 'border-blue-500 bg-blue-50/60'
                      : nodesFile
                      ? 'border-green-300 bg-green-50/40'
                      : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <input
                    ref={nodesInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 1) {
                        handleMultipleCSVFiles(e.target.files);
                      } else if (e.target.files && e.target.files[0]) {
                        handleNodesFileSelected(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-2xs mb-2">
                    {nodesFile ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileSpreadsheet className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    {nodesFile ? nodesFile.name : '1. Upload nodes.csv'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 font-mono">
                    Required: id,name,verified,followers
                  </span>
                  {nodesFile && (
                    <span className="mt-2 rounded bg-green-100 text-green-800 px-2 py-0.5 font-mono text-[10px] font-semibold">
                      {(nodesFile.size / 1024).toFixed(1)} KB loaded
                    </span>
                  )}
                </div>

                {/* 2. edges.csv dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingEdges(true);
                  }}
                  onDragLeave={() => setIsDraggingEdges(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingEdges(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
                      handleMultipleCSVFiles(e.dataTransfer.files);
                    } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleEdgesFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => edgesInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    isDraggingEdges
                      ? 'border-blue-500 bg-blue-50/60'
                      : edgesFile
                      ? 'border-green-300 bg-green-50/40'
                      : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <input
                    ref={edgesInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 1) {
                        handleMultipleCSVFiles(e.target.files);
                      } else if (e.target.files && e.target.files[0]) {
                        handleEdgesFileSelected(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-2xs mb-2">
                    {edgesFile ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Layers className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-800">
                    {edgesFile ? edgesFile.name : '2. Upload edges.csv'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 font-mono">
                    Required: source,target,weight
                  </span>
                  {edgesFile && (
                    <span className="mt-2 rounded bg-green-100 text-green-800 px-2 py-0.5 font-mono text-[10px] font-semibold">
                      {(edgesFile.size / 1024).toFixed(1)} KB loaded
                    </span>
                  )}
                </div>
              </div>

              {/* CSV Quick helper / download templates & example dataset */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="text-slate-600 font-medium">Download CSV Templates:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadFile('nodes_template.csv', CSV_NODES_TEMPLATE, 'text/csv')}
                      className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-[11px] font-medium"
                    >
                      <Download className="h-3 w-3 text-slate-400" />
                      <span>nodes_template.csv</span>
                    </button>
                    <button
                      onClick={() => downloadFile('edges_template.csv', CSV_EDGES_TEMPLATE, 'text/csv')}
                      className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-[11px] font-medium"
                    >
                      <Download className="h-3 w-3 text-slate-400" />
                      <span>edges_template.csv</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <span className="text-slate-600 font-medium">Download Example Dataset (24 Users, 48 Edges):</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadFile('example_nodes_24.csv', SAMPLE_24_NODES_CSV, 'text/csv')}
                      className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer text-[11px] font-semibold"
                    >
                      <Download className="h-3 w-3 text-blue-500" />
                      <span>example_nodes_24.csv</span>
                    </button>
                    <button
                      onClick={() => downloadFile('example_edges_48.csv', SAMPLE_48_EDGES_CSV, 'text/csv')}
                      className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer text-[11px] font-semibold"
                    >
                      <Download className="h-3 w-3 text-blue-500" />
                      <span>example_edges_48.csv</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JSON UPLOAD */}
          {activeTab === 'json' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingJson(true);
                }}
                onDragLeave={() => setIsDraggingJson(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingJson(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleJsonFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => jsonInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  isDraggingJson
                    ? 'border-blue-500 bg-blue-50/60'
                    : jsonFile
                    ? 'border-green-300 bg-green-50/40'
                    : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleJsonFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 shadow-2xs mb-3">
                  {jsonFile ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-slate-500" />
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {jsonFile ? jsonFile.name : 'Upload combined dataset.json'}
                </span>
                <span className="text-xs text-slate-500 mt-1 max-w-md">
                  JSON file containing <code className="text-blue-600 font-mono">"nodes"</code> and{' '}
                  <code className="text-blue-600 font-mono">"edges"</code> collections.
                </span>
                {jsonFile && (
                  <span className="mt-2 rounded bg-green-100 text-green-800 px-2 py-0.5 font-mono text-[10px] font-semibold">
                    {(jsonFile.size / 1024).toFixed(1)} KB loaded
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="text-slate-600 font-medium">Download JSON Formats:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFile('sample_dataset.json', JSON_DATASET_TEMPLATE, 'application/json')}
                    className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-[11px] font-medium"
                  >
                    <Download className="h-3 w-3 text-slate-400" />
                    <span>dataset.json template</span>
                  </button>
                  <button
                    onClick={() => downloadFile('example_network_24.json', SAMPLE_24_48_JSON, 'application/json')}
                    className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer text-[11px] font-semibold"
                  >
                    <Download className="h-3 w-3 text-blue-500" />
                    <span>example_network_24.json (24 Nodes, 48 Edges)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BENCHMARK PHEME DATASET */}
          {activeTab === 'benchmark' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded bg-blue-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Academic Misinformation Benchmark
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">
                      {PHEME_RUMOR_BENCHMARK.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {PHEME_RUMOR_BENCHMARK.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="rounded bg-white p-2.5 border border-blue-200 text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Nodes (V)</div>
                    <div className="font-mono text-lg font-bold text-blue-700">24</div>
                  </div>
                  <div className="rounded bg-white p-2.5 border border-blue-200 text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Directed Edges (E)</div>
                    <div className="font-mono text-lg font-bold text-blue-700">48</div>
                  </div>
                  <div className="rounded bg-white p-2.5 border border-blue-200 text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Source Origin</div>
                    <div className="font-mono text-lg font-bold text-slate-800">U01</div>
                  </div>
                  <div className="rounded bg-white p-2.5 border border-blue-200 text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Graph Density</div>
                    <div className="font-mono text-lg font-bold text-slate-800">0.087</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    onClick={handleLoadBenchmark}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Load Benchmark into System Now</span>
                  </button>
                  <button
                    onClick={() => {
                      downloadFile('pheme_nodes.csv', SAMPLE_24_NODES_CSV, 'text/csv');
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>Download PHEME nodes.csv</span>
                  </button>
                  <button
                    onClick={() => {
                      downloadFile('pheme_edges.csv', SAMPLE_48_EDGES_CSV, 'text/csv');
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>Download PHEME edges.csv</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PROGRESS INDICATOR */}
          {isProcessing && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-900">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>{progressStage || 'Processing dataset...'}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div className="h-full bg-blue-600 animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* VALIDATION REPORT */}
          {parseResult && !isProcessing && (
            <div className="space-y-4">
              {/* Error Box */}
              {parseResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-red-900">
                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>Dataset Validation Failed ({parseResult.errors.length} Critical Issues)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-700 font-mono text-[11px] pl-1 max-h-40 overflow-y-auto">
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>

                  {/* Auto-Sanitize Option for edge reference issues */}
                  {parseResult.errors.some((err) => err.includes('references non-existent node')) && (
                    <div className="pt-1 border-t border-red-200/60 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-red-800">
                        Some edges reference missing nodes. You can reject these invalid relationships and construct the graph with remaining valid nodes and edges.
                      </span>
                      <button
                        onClick={handleSanitizeAndProceed}
                        className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Auto-Sanitize & Reject Invalid Edges</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-red-600 font-sans">
                    Please correct critical errors in your CSV or JSON files and re-upload.
                  </p>
                </div>
              )}

              {/* Warnings Box */}
              {parseResult.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Topological Adjustments & Rejected Relationships ({parseResult.warnings.length})</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 font-mono text-[11px] pl-1 max-h-32 overflow-y-auto">
                    {parseResult.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Box & Preview */}
              {parseResult.isValid && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <span className="font-bold text-green-950 block">
                          Dataset Validated Successfully
                        </span>
                        <span className="text-green-800 text-[11px]">
                          Constructed directed graph with {parseResult.nodes.length} nodes and{' '}
                          {parseResult.connections.length} edges.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-green-900">
                      <span>Density: {parseResult.report.density}</span>
                      <span>•</span>
                      <span>Deduplicated: {parseResult.report.deduplicatedEdgesCount}</span>
                      <span>•</span>
                      <span>Rejected: {parseResult.report.rejectedEdgesCount}</span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-900">
                          Dataset Preview ({previewView === 'nodes' ? `${parseResult.nodes.length} Nodes` : `${parseResult.connections.length} Edges`})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Search Input */}
                        <div className="flex items-center gap-1.5 border border-slate-200 bg-white px-2 py-1 rounded text-xs">
                          <Search className="h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={previewView === 'nodes' ? "Filter nodes..." : "Filter edges..."}
                            className="bg-transparent outline-none text-xs text-slate-800 w-28 sm:w-36"
                          />
                          {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center rounded border border-slate-200 bg-slate-50 p-0.5">
                          <button
                            onClick={() => {
                              setPreviewView('nodes');
                              setSearchQuery('');
                            }}
                            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                              previewView === 'nodes'
                                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Nodes ({parseResult.nodes.length})
                          </button>
                          <button
                            onClick={() => {
                              setPreviewView('edges');
                              setSearchQuery('');
                            }}
                            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                              previewView === 'edges'
                                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Edges ({parseResult.connections.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {previewView === 'nodes' ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[11px] text-slate-400 uppercase font-semibold">
                              <th className="pb-1.5">ID</th>
                              <th className="pb-1.5">Name</th>
                              <th className="pb-1.5">Verified</th>
                              <th className="pb-1.5 text-right">Followers</th>
                              <th className="pb-1.5 text-right">Role</th>
                              <th className="pb-1.5 text-right">Shares (S)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {parseResult.nodes
                              .filter(
                                (n) =>
                                  !searchQuery ||
                                  n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (n.role && n.role.toLowerCase().includes(searchQuery.toLowerCase()))
                              )
                              .slice(0, 15)
                              .map((node) => (
                                <tr key={node.id} className="hover:bg-slate-50">
                                  <td className="py-1.5 font-bold text-slate-900">{node.id}</td>
                                  <td className="py-1.5 font-sans text-slate-700">{node.name}</td>
                                  <td className="py-1.5">
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-sans font-medium ${
                                        node.verified
                                          ? 'bg-green-50 text-green-700 border border-green-200'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {node.verified ? 'Verified (V)' : 'Unverified (U)'}
                                    </span>
                                  </td>
                                  <td className="py-1.5 text-right tabular-nums text-slate-600">
                                    {node.followers?.toLocaleString() || 0}
                                  </td>
                                  <td className="py-1.5 text-right font-sans text-slate-500 truncate max-w-[120px]">
                                    {node.role}
                                  </td>
                                  <td className="py-1.5 text-right tabular-nums font-bold text-blue-600">
                                    {node.shares}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[11px] text-slate-400 uppercase font-semibold">
                              <th className="pb-1.5">Edge ID</th>
                              <th className="pb-1.5">Source Node</th>
                              <th className="pb-1.5">Direction</th>
                              <th className="pb-1.5">Target Node</th>
                              <th className="pb-1.5 text-right">Weight</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {parseResult.connections
                              .filter(
                                (c) =>
                                  !searchQuery ||
                                  c.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  c.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  c.id.toLowerCase().includes(searchQuery.toLowerCase())
                              )
                              .slice(0, 15)
                              .map((conn, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-1.5 text-slate-400">{conn.id}</td>
                                  <td className="py-1.5 font-bold text-slate-900">{conn.source}</td>
                                  <td className="py-1.5 text-blue-600">→</td>
                                  <td className="py-1.5 font-bold text-slate-900">{conn.target}</td>
                                  <td className="py-1.5 text-right tabular-nums text-slate-600">
                                    {conn.weight || 1.0}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50 shrink-0">
          <button
            onClick={handleResetCurrent}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3 w-3 text-slate-400" />
            <span>Clear</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {activeTab !== 'benchmark' ? (
              <button
                disabled={!parseResult || !parseResult.isValid}
                onClick={handleApplyCustom}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Apply Dataset to System</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleLoadBenchmark}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <span>Apply PHEME Benchmark</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
