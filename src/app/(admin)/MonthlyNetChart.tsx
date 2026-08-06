"use client";

import { useMemo, useState } from "react";

interface MonthlyNetChartProps {
  periods: any[];
  netPayableMap: Map<string, number>;
}

export default function MonthlyNetChart({ periods, netPayableMap }: MonthlyNetChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const sorted = [...periods].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return sorted.map((p) => {
      const date = new Date(p.year, p.month - 1);
      const label = date.toLocaleString("default", { month: "short", year: "2-digit" });
      const totalNet =
        netPayableMap instanceof Map
          ? netPayableMap.get(p._id.toString()) || 0
          : (netPayableMap as any)[p._id.toString()] || 0;

      return {
        label,
        netPayable: totalNet,
        fullLabel: date.toLocaleString("default", { month: "long", year: "numeric" }),
      };
    }).slice(-12);
  }, [periods, netPayableMap]);

  if (chartData.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-[13px] text-text-muted border border-border rounded-[10px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        Not enough data to display trend
      </div>
    );
  }

  // SVG dimensions
  const W = 800;
  const H = 180;
  const PAD_X = 8;
  const PAD_TOP = 16;
  const PAD_BOT = 8;

  const maxVal = Math.max(...chartData.map((d) => d.netPayable), 1);

  const toX = (i: number) =>
    PAD_X + (i / Math.max(chartData.length - 1, 1)) * (W - PAD_X * 2);
  const toY = (v: number) =>
    PAD_TOP + (1 - v / maxVal) * (H - PAD_TOP - PAD_BOT);

  const points = chartData.map((d, i) => ({ x: toX(i), y: toY(d.netPayable) }));

  // Build polyline points string
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Build area path (line + close bottom)
  const areaPath =
    `M ${points[0].x},${points[0].y} ` +
    points
      .slice(1)
      .map((p) => `L ${p.x},${p.y}`)
      .join(" ") +
    ` L ${points[points.length - 1].x},${H - PAD_BOT} L ${points[0].x},${H - PAD_BOT} Z`;

  // Grid lines at 0%, 25%, 50%, 75%, 100%
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: PAD_TOP + (1 - frac) * (H - PAD_TOP - PAD_BOT),
    label: `₹${((maxVal * frac) / 1000).toFixed(0)}k`,
  }));

  const hovered = hoveredIndex !== null ? chartData[hoveredIndex] : null;
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="border border-border rounded-[10px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-text tracking-tight">
          Payroll Expenditure Trend
        </h3>
        {hovered && (
          <div className="text-right">
            <div className="text-[13px] font-semibold text-text">
              ₹{hovered.netPayable.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted">{hovered.fullLabel}</div>
          </div>
        )}
      </div>

      <div className="flex-1 relative min-h-0 overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          style={{ overflow: "visible" }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a56db" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1a56db" stopOpacity="0.01" />
            </linearGradient>
            {/* Animated line drawing */}
            <style>{`
              @keyframes drawLine {
                from { stroke-dashoffset: 2000; }
                to   { stroke-dashoffset: 0; }
              }
              .chart-line {
                stroke-dasharray: 2000;
                stroke-dashoffset: 2000;
                animation: drawLine 1.2s cubic-bezier(0.4,0,0.2,1) forwards;
              }
            `}</style>
          </defs>

          {/* Grid lines */}
          {gridLines.map((g, i) => (
            <g key={i}>
              <line
                x1={PAD_X}
                y1={g.y}
                x2={W - PAD_X}
                y2={g.y}
                stroke="#E8EAEE"
                strokeWidth="1"
                strokeDasharray={i === 0 ? "none" : "4,4"}
              />
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Line */}
          <polyline
            className="chart-line"
            points={linePoints}
            fill="none"
            stroke="#1a56db"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Dots + hover targets */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === i ? 5.5 : 3.5}
                fill={hoveredIndex === i ? "#1a56db" : "#ffffff"}
                stroke="#1a56db"
                strokeWidth="2"
                style={{ transition: "r 0.15s ease" }}
              />
              {/* Invisible hit target */}
              <rect
                x={p.x - (W / chartData.length) / 2}
                y={0}
                width={W / chartData.length}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "crosshair" }}
              />
            </g>
          ))}

          {/* Hovered vertical line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={PAD_TOP}
              x2={hoveredPoint.x}
              y2={H - PAD_BOT}
              stroke="#1a56db"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.5"
            />
          )}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-[1%]">
          {chartData.map((d, i) => (
            <span
              key={i}
              className={`text-[10px] transition-colors ${
                hoveredIndex === i ? "text-primary font-semibold" : "text-text-muted"
              }`}
              style={{ width: `${100 / chartData.length}%`, textAlign: "center" }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
