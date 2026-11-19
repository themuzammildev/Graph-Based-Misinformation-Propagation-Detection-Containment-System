import React from 'react';
import { NodeInfluenceStats } from '../../types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface InfluenceBarChartProps {
  stats: NodeInfluenceStats[];
  limit?: number;
  highlightNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

export const InfluenceBarChart: React.FC<InfluenceBarChartProps> = ({
  stats,
  limit = 5,
  highlightNodeId,
  onSelectNode,
}) => {
  const displayList = stats.slice(0, limit);

  return (
    <div className="w-full space-y-2">
      {displayList.map((node) => {
        const percentage = Math.round(node.degreeCentrality * 100);
        const isHighlighted = node.id === highlightNodeId;

        return (
          <div
            key={node.id}
            onClick={() => onSelectNode?.(node.id)}
            className={`group relative cursor-pointer rounded-md border p-2.5 transition-colors ${
              isHighlighted
                ? 'border-blue-300 bg-blue-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-400 font-semibold tabular-nums">#{node.rank}</span>
                <span className="font-mono font-bold text-slate-900">{node.id}</span>
                <span className="text-slate-600 truncate max-w-[120px]">{node.name}</span>
                {node.verified ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-[11px] text-slate-500">
                  deg⁺ = {node.outDegree}
                </span>
                <span className="font-bold text-blue-600">{percentage}%</span>
              </div>
            </div>

            {/* Horizontal Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isHighlighted ? 'bg-blue-600' : 'bg-blue-500/80 group-hover:bg-blue-600'
                }`}
                style={{ width: `${Math.max(4, percentage)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
