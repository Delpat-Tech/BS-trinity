"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

export default function LeavesListWidget({ past, future }: { past: any[], future: any[] }) {
  const [tab, setTab] = useState<'future' | 'past'>('future');
  const leaves = tab === 'future' ? future : past;

  return (
    <div className="border border-border rounded-[8px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('future')}
          className={`flex-1 py-3 text-[13px] font-medium transition-colors ${tab === 'future' ? 'text-text border-b-2 border-primary bg-surface-hover' : 'text-text-muted hover:text-text bg-surface'}`}
        >
          Upcoming Leaves
        </button>
        <button
          onClick={() => setTab('past')}
          className={`flex-1 py-3 text-[13px] font-medium transition-colors ${tab === 'past' ? 'text-text border-b-2 border-primary bg-surface-hover' : 'text-text-muted hover:text-text bg-surface'}`}
        >
          Past Leaves
        </button>
      </div>
      
      <div className="p-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
        {leaves.length === 0 ? (
          <div className="text-center text-[12px] text-text-muted py-6">
            No leaves found.
          </div>
        ) : (
          leaves.map((leave, i) => {
            const dateStr = leave.date;
            const parsed = parseISO(dateStr);
            const formatted = format(parsed, "MMM d, yyyy");
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[6px] border border-border-subtle bg-surface-hover">
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0 text-text font-medium text-[12px]">
                  {leave.emp?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-text truncate">{leave.emp?.name || 'Unknown'}</div>
                  <div className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                    <CalendarIcon className="w-3 h-3" />
                    {formatted} &middot; <span className="capitalize">{leave.kind}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
