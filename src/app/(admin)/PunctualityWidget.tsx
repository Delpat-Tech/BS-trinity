"use client";
import { TrophyIcon, AlertCircleIcon } from "lucide-react";

export default function PunctualityWidget({ records, periodName }: { records: any[], periodName: string }) {
  return (
    <div className="border border-border rounded-[8px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-text tracking-tight flex items-center gap-2">
          <TrophyIcon className="w-4 h-4 text-yellow-500" />
          Punctuality Leaderboard
        </h3>
        <div className="text-[11px] text-text-muted">{periodName}</div>
      </div>
      
      <div className="p-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
        {records.length === 0 ? (
          <div className="text-center text-[12px] text-text-muted py-6">
            No locked periods available.
          </div>
        ) : (
          records.map((record, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-[6px] hover:bg-surface-hover transition-colors">
              <div className="w-6 text-center text-[12px] font-bold text-text-muted">
                #{i + 1}
              </div>
              <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0 text-text font-medium text-[12px]">
                {record.emp?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-text truncate">{record.emp?.name || 'Unknown'}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="text-[11px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  {record.pres} Pres
                </div>
                {(record.abs > 0 || record.EW > 0) && (
                  <div className="text-[10px] text-red-500 flex items-center gap-1">
                    <AlertCircleIcon className="w-3 h-3" />
                    {record.abs + record.EW} Abs
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
