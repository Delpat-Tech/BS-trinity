"use client";

import { useMemo } from "react";

interface MonthlyNetChartProps {
  periods: any[];
  netPayableMap: Map<string, number>;
}

export default function MonthlyNetChart({ periods, netPayableMap }: MonthlyNetChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...periods].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return sorted.map((p) => {
      const date = new Date(p.year, p.month - 1);
      const label = date.toLocaleString("default", { month: "short", year: "2-digit" });
      const totalNet = netPayableMap instanceof Map 
        ? netPayableMap.get(p._id.toString()) || 0
        : (netPayableMap as any)[p._id.toString()] || 0;
      
      return {
        label,
        netPayable: totalNet,
        fullLabel: date.toLocaleString("default", { month: "long", year: "numeric" })
      };
    }).slice(-12); // limit to last 12 months for better display
  }, [periods, netPayableMap]);

  if (chartData.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-[13px] text-text-muted border border-border rounded-[8px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        Not enough data to display trend
      </div>
    );
  }

  const maxVal = Math.max(...chartData.map(d => d.netPayable), 1); // prevent division by zero

  return (
    <div className="border border-border rounded-[8px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 flex flex-col h-full">
      <h3 className="text-[14px] font-semibold text-text tracking-tight mb-6">Payroll Expenditure Trend</h3>
      <div className="flex-1 w-full min-h-[200px] flex items-end gap-2 pb-6 relative pt-4">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pt-4">
          {[4, 3, 2, 1, 0].map(i => {
            const val = (maxVal * i) / 4;
            return (
              <div key={i} className="w-full flex items-center border-t border-dashed border-border-strong relative">
                <span className="absolute -top-[10px] -left-1 bg-surface pr-2 text-[10px] text-text-muted">
                  ₹{(val / 1000).toFixed(0)}k
                </span>
              </div>
            );
          })}
        </div>

        {/* Bars */}
        {chartData.map((d, i) => {
          const heightPct = (d.netPayable / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 group relative">
              <div 
                className="w-full max-w-[40px] bg-primary/80 hover:bg-primary transition-all rounded-t-[4px]"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              ></div>
              <div className="absolute -bottom-6 text-[10px] text-text-secondary whitespace-nowrap">
                {d.label}
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 flex flex-col items-center">
                <div className="bg-text text-surface px-2 py-1 rounded text-[11px] whitespace-nowrap shadow-lg">
                  <div className="font-medium text-white">₹{d.netPayable.toLocaleString()}</div>
                  <div className="text-[10px] text-text-muted">{d.fullLabel}</div>
                </div>
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-text"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
