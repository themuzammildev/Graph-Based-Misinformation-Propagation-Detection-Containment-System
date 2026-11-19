import React, { useState } from 'react';

interface ICMComparisonChartProps {
  bfsSteps: { step: number; cumulativeReach: number }[];
  icmSteps: { step: number; avgCumulativeActive: number }[];
  totalNodes: number;
  minSpread: number;
  maxSpread: number;
  height?: number;
}

export const ICMComparisonChart: React.FC<ICMComparisonChartProps> = ({
  bfsSteps,
  icmSteps,
  totalNodes,
  minSpread,
  maxSpread,
  height = 280,
}) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const maxStep = Math.max(
    1,
    Math.max(
      bfsSteps.length > 0 ? bfsSteps[bfsSteps.length - 1].step : 0,
      icmSteps.length > 0 ? icmSteps[icmSteps.length - 1].step : 0
    )
  );

  const maxY = Math.max(totalNodes, 1);

  const padding = { top: 24, right: 30, bottom: 40, left: 45 };
  const width = 640;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (step: number) => padding.left + (step / maxStep) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxY) * chartHeight;

  // Build BFS Line Path
  const bfsPath = bfsSteps
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.step).toFixed(1)} ${getY(d.cumulativeReach).toFixed(1)}`)
    .join(' ');

  // Build ICM Mean Line Path
  const icmPath = icmSteps
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.step).toFixed(1)} ${getY(d.avgCumulativeActive).toFixed(1)}`)
    .join(' ');

  // Y-axis ticks
  const yTicks = [
    0,
    Math.round(maxY * 0.25),
    Math.round(maxY * 0.5),
    Math.round(maxY * 0.75),
    maxY,
  ];

  return (
    <div className="relative w-full rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Rumor Spread Comparison: Maximum vs Realistic
          </h4>
          <p className="text-xs text-slate-500">
            Comparing maximum potential reach with simulated realistic viral forwarding
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span className="text-slate-700">Maximum Possible Reach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-600 ring-2 ring-purple-100" />
            <span className="text-slate-700">Simulated Realistic Spread</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          {/* Y Grid lines and labels */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="font-mono text-[10px] fill-slate-400 tabular-nums"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* X Axis ticks */}
          {Array.from({ length: maxStep + 1 }).map((_, stepIdx) => {
            const x = getX(stepIdx);
            return (
              <g key={stepIdx}>
                <line
                  x1={x}
                  y1={padding.top + chartHeight}
                  x2={x}
                  y2={padding.top + chartHeight + 4}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padding.top + chartHeight + 16}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-slate-500"
                >
                  t={stepIdx}
                </text>
              </g>
            );
          })}

          {/* Shaded Area between ICM and BFS representing Transmission Deficit */}
          {bfsSteps.length > 0 && icmSteps.length > 0 && (
            <path
              d={`${bfsPath} L ${getX(icmSteps[icmSteps.length - 1].step).toFixed(1)} ${getY(
                icmSteps[icmSteps.length - 1].avgCumulativeActive
              ).toFixed(1)} ${icmSteps
                .slice()
                .reverse()
                .map((d) => `L ${getX(d.step).toFixed(1)} ${getY(d.avgCumulativeActive).toFixed(1)}`)
                .join(' ')} Z`}
              fill="#8b5cf6"
              fillOpacity="0.08"
            />
          )}

          {/* BFS Path (Blue Solid) */}
          {bfsSteps.length > 0 && (
            <path
              d={bfsPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* ICM Path (Purple Solid) */}
          {icmSteps.length > 0 && (
            <path
              d={icmPath}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points on BFS */}
          {bfsSteps.map((d) => (
            <circle
              key={`bfs-${d.step}`}
              cx={getX(d.step)}
              cy={getY(d.cumulativeReach)}
              r="4"
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth="2"
            />
          ))}

          {/* Data Points on ICM */}
          {icmSteps.map((d) => (
            <circle
              key={`icm-${d.step}`}
              cx={getX(d.step)}
              cy={getY(d.avgCumulativeActive)}
              r="4.5"
              fill="#ffffff"
              stroke="#7c3aed"
              strokeWidth="2.5"
              className="cursor-pointer hover:r-6"
              onMouseEnter={() => setHoveredStep(d.step)}
              onMouseLeave={() => setHoveredStep(null)}
            />
          ))}
        </svg>

        {/* Hover Step Indicator Card */}
        {hoveredStep !== null && (
          <div className="mt-2 flex items-center justify-center gap-6 rounded-md bg-slate-50 p-2 text-xs font-mono border border-slate-200">
            <span className="font-bold text-slate-800">Time Step t = {hoveredStep}</span>
            <span className="text-blue-700">
              BFS Reach: {bfsSteps.find((b) => b.step === hoveredStep)?.cumulativeReach ?? 'N/A'}
            </span>
            <span className="text-purple-700 font-bold">
              ICM Expected: {icmSteps.find((c) => c.step === hoveredStep)?.avgCumulativeActive ?? 'N/A'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
