import { ReactNode } from 'react';

type Trend = 'up' | 'down' | 'neutral';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: Trend;
  icon: ReactNode;
}

export default function KpiCard({ title, value, subtitle, trend, icon }: KpiCardProps) {
  const trendColor =
    trend === 'up'   ? 'text-emerald-600 bg-emerald-50' :
    trend === 'down' ? 'text-red-500 bg-red-50'         :
                       'text-text-muted bg-border';

  const trendArrow =
    trend === 'up'   ? '↑' :
    trend === 'down' ? '↓' :
    trend === 'neutral' ? '→' : null;

  return (
    <div className="border border-border rounded-[10px] bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-[8px] bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        {trend && trendArrow && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${trendColor}`}>
            {trendArrow}
          </span>
        )}
      </div>

      <div>
        <div className="text-[24px] font-bold tracking-[-0.03em] text-text leading-none">
          {value}
        </div>
        <div className="text-[12px] font-medium text-text-muted mt-1">{title}</div>
        {subtitle && (
          <div className="text-[11px] text-text-muted mt-0.5 opacity-70">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
