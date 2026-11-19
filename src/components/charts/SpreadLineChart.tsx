import React, { useState } from 'react';
import { RecurrenceDataPoint } from '../../types';

interface SpreadLineChartProps {
  dataPoints: RecurrenceDataPoint[];
  totalNodes: number;
  height?: number;
  theoreticalLabel?: string;
  actualLabel?: string;
  showICMComparison?: boolean;
}

export const SpreadLineChart: React.FC<SpreadLineChartProps> = ({
  dataPoints,
  totalNodes,
  height = 300,
  theoreticalLabel = 'Predicted Growth Model',
  actualLabel = 'Maximum Possible Reach',
  showICMComparison = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-400">
        No simulation data available. Run propagation to plot spread.
      </div>
    );
  }

  const hasICM = showICMComparison && dataPoints.some((d) => d.icmMeanAffected !== undefined);
  const hasLogistic = dataPoints.some((d) => d.predictedLogisticAffected !== undefined);

  const padding = { top: 24, right: 30, bottom: 40, left: 45 };
  const width = 640;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxStep = Math.max(1, dataPoints.length - 1);
  const maxY = Math.max(
    totalNodes,
    Math.max(
      ...dataPoints.map((d) =>
        Math.max(
          d.actualAffected,
          d.predictedAffected,
          d.predictedLogisticAffected ?? 0,
          d.icmMeanAffected ?? 0,
          1
        )
      )
    )
  );

  const getX = (step: number) => padding.left + (step / maxStep) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxY) * chartHeight;

  // Build SVG path for Deterministic BFS
  const bfsPath = dataPoints
    .map(
      (d, i) =>
        `${i === 0 ? 'M' : 'L'} ${getX(d.step).toFixed(1)} ${getY(d.actualAffected).toFixed(1)}`
    )
    .join(' ');

  // Build SVG path for Standard Bounded Recurrence
  const stdRecPath = dataPoints
    .map(
      (d, i) =>
        `${i === 0 ? 'M' : 'L'} ${getX(d.step).toFixed(1)} ${getY(d.predictedAffected).toFixed(1)}`
    )
    .join(' ');

  // Build SVG path for Susceptible-Depleted Logistic Recurrence
  const logisticRecPath = hasLogistic
    ? dataPoints
        .map(
          (d, i) =>
            `${i === 0 ? 'M' : 'L'} ${getX(d.step).toFixed(1)} ${getY(
              d.predictedLogisticAffected ?? d.predictedAffected
            ).toFixed(1)}`
        )
        .join(' ')
    : '';

  // Build SVG path for ICM Monte Carlo Mean
  const icmPath = hasICM
    ? dataPoints
        .map(
          (d, i) =>
            `${i === 0 ? 'M' : 'L'} ${getX(d.step).toFixed(1)} ${getY(
              d.icmMeanAffected ?? 0
            ).toFixed(1)}`
        )
        .join(' ')
    : '';

  // Build shaded confidence interval envelope for ICM
  let icmAreaPath = '';
  if (hasICM) {
    const topCurve = dataPoints
      .map(
        (d, i) =>
          `${i === 0 ? 'M' : 'L'} ${getX(d.step).toFixed(1)} ${getY(
            d.icmCiHigh ?? d.icmMeanAffected ?? 0
          ).toFixed(1)}`
      )
      .join(' ');

    const bottomCurve = [...dataPoints]
      .reverse()
      .map(
        (d) =>
          `L ${getX(d.step).toFixed(1)} ${getY(
            d.icmCiLow ?? d.icmMeanAffected ?? 0
          ).toFixed(1)}`
      )
      .join(' ');

    icmAreaPath = `${topCurve} ${bottomCurve} Z`;
  }

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
      {/* Header and Multi-Model Legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Rumor Spread Comparison Over Time
          </h4>
          <p className="text-xs text-slate-500">
            Comparing maximum potential spread with simulation predictions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          {/* BFS Ceiling */}
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
            <span className="text-slate-700">{actualLabel}</span>
          </div>

          {/* Standard Recurrence */}
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">{theoreticalLabel}</span>
          </div>

          {/* Logistic Recurrence */}
          {hasLogistic && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-slate-700">Realistic Saturation Model</span>
            </div>
          )}

          {/* ICM Monte Carlo */}
          {hasICM && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-600" />
              <span className="text-slate-700">Simulated Realistic Spread</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          {/* Grid lines */}
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

          {/* Network saturation ceiling line (N = totalNodes) */}
          <line
            x1={padding.left}
            y1={getY(totalNodes)}
            x2={width - padding.right}
            y2={getY(totalNodes)}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={width - padding.right}
            y={getY(totalNodes) - 4}
            textAnchor="end"
            className="font-mono text-[9px] fill-slate-500 font-semibold"
          >
            Capacity Limit = {totalNodes} Users
          </text>

          {/* ICM Confidence Area Envelope */}
          {hasICM && icmAreaPath && (
            <path
              d={icmAreaPath}
              fill="#9333ea"
              fillOpacity="0.08"
              stroke="#9333ea"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              strokeOpacity="0.3"
            />
          )}

          {/* Actual Deterministic BFS Trajectory Curve (Blue) */}
          <path
            d={bfsPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
          />

          {/* Standard Bounded Recurrence Curve (Amber) */}
          <path
            d={stdRecPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="5 3"
          />

          {/* Susceptible-Depleted Logistic Recurrence Curve (Emerald) */}
          {hasLogistic && (
            <path
              d={logisticRecPath}
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          )}

          {/* ICM Stochastic Mean Curve (Purple) */}
          {hasICM && (
            <path
              d={icmPath}
              fill="none"
              stroke="#9333ea"
              strokeWidth="2.5"
            />
          )}

          {/* Interactive Data Point Dots */}
          {dataPoints.map((pt, idx) => {
            const cx = getX(pt.step);
            const cyBfs = getY(pt.actualAffected);
            const cyStd = getY(pt.predictedAffected);
            const cyLog = hasLogistic ? getY(pt.predictedLogisticAffected ?? pt.predictedAffected) : cyStd;
            const cyIcm = hasICM ? getY(pt.icmMeanAffected ?? 0) : 0;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={pt.step}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Vertical hover crosshair */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={height - padding.bottom}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                {/* BFS Dot */}
                <circle
                  cx={cx}
                  cy={cyBfs}
                  r={isHovered ? 5 : 3.5}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Standard Recurrence Dot */}
                <circle
                  cx={cx}
                  cy={cyStd}
                  r={isHovered ? 5 : 3}
                  fill="#ffffff"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />

                {/* Logistic Recurrence Dot */}
                {hasLogistic && (
                  <circle
                    cx={cx}
                    cy={cyLog}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#059669"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                )}

                {/* ICM Dot */}
                {hasICM && (
                  <circle
                    cx={cx}
                    cy={cyIcm}
                    r={isHovered ? 6 : 4}
                    fill="#9333ea"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                )}

                {/* X-axis labels */}
                <text
                  x={cx}
                  y={height - 12}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-slate-500 tabular-nums"
                >
                  t={pt.step}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Rich Multi-Model Hover Tooltip Overlay */}
        {hoveredIndex !== null && dataPoints[hoveredIndex] && (
          <div className="absolute top-2 right-4 rounded-lg border border-slate-200 bg-white/95 backdrop-blur-xs p-3 text-xs shadow-md font-mono pointer-events-none z-10 space-y-1 min-w-[220px]">
            <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between">
              <span>Time Epoch t = {dataPoints[hoveredIndex].step}</span>
              <span className="text-slate-400 text-[10px]">Step Metrics</span>
            </div>

            <div className="text-blue-600 flex justify-between gap-4">
              <span>BFS Structural Ceiling:</span>
              <span className="font-bold">{dataPoints[hoveredIndex].actualAffected} nodes</span>
            </div>

            <div className="text-amber-600 flex justify-between gap-4">
              <span>Standard Recurrence:</span>
              <span className="font-bold">{dataPoints[hoveredIndex].predictedAffected} nodes</span>
            </div>

            {hasLogistic && dataPoints[hoveredIndex].predictedLogisticAffected !== undefined && (
              <div className="text-emerald-700 flex justify-between gap-4">
                <span>Logistic Recurrence:</span>
                <span className="font-bold">{dataPoints[hoveredIndex].predictedLogisticAffected} nodes</span>
              </div>
            )}

            {hasICM && dataPoints[hoveredIndex].icmMeanAffected !== undefined && (
              <>
                <div className="text-purple-600 flex justify-between gap-4">
                  <span>ICM Stochastic Mean:</span>
                  <span className="font-bold">{dataPoints[hoveredIndex].icmMeanAffected} nodes</span>
                </div>
                {dataPoints[hoveredIndex].icmCiLow !== undefined && (
                  <div className="text-slate-400 text-[10px] flex justify-between">
                    <span>95% CI Range:</span>
                    <span>[{dataPoints[hoveredIndex].icmCiLow}, {dataPoints[hoveredIndex].icmCiHigh}]</span>
                  </div>
                )}
                <div className="text-slate-700 pt-1 border-t border-slate-100 flex justify-between text-[11px]">
                  <span>Recurrence Error (|S - μ|):</span>
                  <span className="font-bold text-red-600">
                    {dataPoints[hoveredIndex].deltaError ??
                      Math.abs(dataPoints[hoveredIndex].predictedAffected - (dataPoints[hoveredIndex].icmMeanAffected ?? 0)).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
