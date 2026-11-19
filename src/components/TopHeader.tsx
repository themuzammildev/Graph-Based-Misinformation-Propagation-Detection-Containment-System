import React from 'react';
import { RotateCcw, Play, Layers } from 'lucide-react';
import { PRESET_TOPOLOGIES } from '../data/sampleNetworks';

import { DatasetMetadata } from '../types';

interface TopHeaderProps {
  sourceNodeId: string;
  affectedCount: number;
  totalNodes: number;
  currentStep: number;
  riskCategory: 'High' | 'Moderate' | 'Lower';
  datasetMetadata: DatasetMetadata;
  onResetSimulation: () => void;
  onLoadTopology: (topologyId: string) => void;
  onQuickRunBFS: () => void;
  onOpenUploader: () => void;
  onSelectDatasetMode: (mode: 'demo' | 'uploaded') => void;
  isPlaying: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  sourceNodeId,
  affectedCount,
  totalNodes,
  currentStep,
  riskCategory,
  datasetMetadata,
  onResetSimulation,
  onLoadTopology,
  onQuickRunBFS,
  onOpenUploader,
  onSelectDatasetMode,
  isPlaying,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-3 sticky top-0 z-10 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Context / Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-900">Academic Simulation</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">Discrete Mathematics & Graph Theory</span>
          <span className="text-slate-300">/</span>
          <span className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 font-mono text-[11px] font-medium border border-slate-200">
            Source: {sourceNodeId}
          </span>
          <span className="text-slate-300 hidden md:inline">/</span>
          <span className="text-slate-500 hidden md:inline font-mono text-[11px]">
            Step n = {currentStep}
          </span>
        </div>

        {/* Global Controls, Dataset Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dataset Selection Option: Demo Dataset vs Upload Real Dataset */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => onSelectDatasetMode('demo')}
              title="Switch to Synthetic Demo Dataset Topologies"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                datasetMetadata.sourceType === 'demo'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Demo Dataset</span>
            </button>
            <button
              onClick={() => onSelectDatasetMode('uploaded')}
              title="Switch to Uploaded Real Dataset or open file uploader"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                datasetMetadata.sourceType !== 'demo'
                  ? 'bg-white text-green-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  datasetMetadata.sourceType !== 'demo' ? 'bg-green-500' : 'bg-slate-400'
                }`}
              />
              <span>Upload Real Dataset</span>
            </button>
          </div>

          {/* Contextual Selector based on Active Dataset Mode */}
          {datasetMetadata.sourceType === 'demo' ? (
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-slate-100 text-slate-700 px-2 py-1 text-[11px] font-medium border border-slate-200">
                Synthetic
              </span>
              <div className="relative">
                <select
                  aria-label="Preset Network Topology"
                  value={PRESET_TOPOLOGIES.find((t) => t.name === datasetMetadata.datasetName)?.id || 'balanced-12'}
                  onChange={(e) => onLoadTopology(e.target.value)}
                  className="appearance-none rounded-md border border-slate-200 bg-white pl-2.5 pr-8 py-1.5 text-xs font-medium text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[170px] truncate"
                >
                  {PRESET_TOPOLOGIES.map((topo) => (
                    <option key={topo.id} value={topo.id}>
                      {topo.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-green-50 text-green-700 px-2 py-1 text-[11px] font-semibold border border-green-200 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                Real Dataset
              </span>
              <span className="text-xs font-mono text-slate-700 max-w-[150px] truncate font-medium border border-slate-200 bg-white px-2 py-1 rounded" title={datasetMetadata.datasetName}>
                {datasetMetadata.datasetName}
              </span>
            </div>
          )}

          {/* Dataset Ingestion / Upload Trigger Button */}
          <button
            onClick={onOpenUploader}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <span className="text-blue-600 font-bold">↑</span>
            <span>Upload CSV / JSON</span>
          </button>

          {/* Quick Simulation Trigger */}
          <button
            onClick={onQuickRunBFS}
            disabled={isPlaying}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Simulate Spread</span>
          </button>

          {/* Reset Simulation Button */}
          <button
            onClick={onResetSimulation}
            title="Reset Simulation State"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
