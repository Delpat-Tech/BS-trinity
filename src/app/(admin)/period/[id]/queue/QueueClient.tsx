'use client';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { bulkResolve } from './actions';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

type ExceptionObj = {
  employeeId: string;
  date: string;
  reason: string;
  employeeName: string;
  machineId: number;
  inTime: string | null;
  outTime: string | null;
  machineStatus: string | null;
};

export default function QueueClient({ periodId, initialExceptions, uploadedFileName }: { periodId: string, initialExceptions: ExceptionObj[], uploadedFileName: string }) {
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const filteredExceptions = useMemo(() => {
    if (filter === 'all') return exceptions;
    return exceptions.filter(e => e.reason === filter);
  }, [exceptions, filter]);

  if (exceptions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-[70px] px-[28px] bg-surface h-full">
        <div className="max-w-[430px] text-center">
          <div className="text-[18px] font-semibold tracking-[-0.015em]">Nothing left to resolve</div>
          <div className="text-[13px] text-text-secondary mt-[6px]">
            All flagged days resolved. Attendance is complete and the payroll figures are final.
          </div>
          <div className="flex gap-[8px] mt-[16px] justify-center">
            <button onClick={() => router.push(`/period/${periodId}/review`)} className="bg-text text-surface border border-text rounded-[4px] px-[13px] py-[7px] text-[12.5px] font-medium cursor-pointer hover:bg-[#332F2A]">
              Go to payroll review
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleSelect = (key: string) => {
    const newSet = new Set(selected);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelected(newSet);
  };

  const selectAll = () => {
    if (selected.size === filteredExceptions.length) {
      setSelected(newSet => new Set());
    } else {
      setSelected(new Set(filteredExceptions.map(e => `${e.employeeId}_${e.date}`)));
    }
  };

  const handleBulkAction = async (action: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'PAID_LEAVE') => {
    if (selected.size === 0) return;
    if (!confirm(`Apply ${action} to ${selected.size} selected records?`)) return;
    
    setLoading(true);
    try {
      const targets = exceptions.filter(e => selected.has(`${e.employeeId}_${e.date}`));
      
      // Perform bulk resolve
      await bulkResolve(periodId, targets.map(t => ({ employeeId: t.employeeId, date: t.date, action, note: '' })));
      
      setExceptions(prev => prev.filter(e => !selected.has(`${e.employeeId}_${e.date}`)));
      setSelected(new Set());
    } catch (err: any) {
      toast.error(`Failed to resolve exceptions in bulk: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-border bg-panel">
        <div className="flex items-center gap-[12px]">
          <h2 className="text-[15px] font-medium m-0">Exception Queue</h2>
          <span className="text-[12px] bg-alert-bg text-alert-text px-[8px] py-[2px] rounded-full border border-alert-border">
            {exceptions.length} remaining
          </span>
          <span className="text-[12px] text-text-secondary ml-[8px]">
            Source: <span className="font-mono text-text bg-border-subtle px-[6px] py-[2px] rounded">{uploadedFileName}</span>
          </span>
        </div>
        <div className="flex gap-[8px] items-center">
          <Select value={filter} onValueChange={(v) => { setFilter(v || "all"); setSelected(new Set()); }}>
            <SelectTrigger className="w-[180px] h-[34px] bg-panel border-border-strong text-[12.5px]">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-text-muted" />
                <SelectValue placeholder="Filter by Issue" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-panel border-border">
              <SelectItem value="all">All Exceptions</SelectItem>
              <SelectItem value="orphan_punch">Missing Punch</SelectItem>
              <SelectItem value="conflict">Leave Conflict</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-[1px] h-[24px] bg-border mx-2" />

          <button 
            disabled={selected.size === 0 || loading}
            onClick={() => handleBulkAction('ABSENT')}
            className="text-[12.5px] px-[12px] py-[6px] bg-surface border border-border rounded hover:bg-panel disabled:opacity-50"
          >
            Mark Absent
          </button>
          <button 
            disabled={selected.size === 0 || loading}
            onClick={() => handleBulkAction('HALF_DAY')}
            className="text-[12.5px] px-[12px] py-[6px] bg-surface border border-border rounded hover:bg-panel disabled:opacity-50"
          >
            Mark Half-Day
          </button>
          <button 
            disabled={selected.size === 0 || loading}
            onClick={() => handleBulkAction('PRESENT')}
            className="text-[12.5px] px-[12px] py-[6px] bg-text text-surface border border-text rounded hover:opacity-90 disabled:opacity-50"
          >
            Mark Present
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead className="sticky top-0 bg-header border-b border-border shadow-sm">
            <tr>
              <th className="px-[20px] py-[10px] w-[40px]">
                <input 
                  type="checkbox" 
                  checked={selected.size > 0 && selected.size === exceptions.length} 
                  onChange={selectAll}
                  className="rounded border-border"
                />
              </th>
              <th className="px-[12px] py-[10px] font-medium text-[11.5px] text-text-secondary w-[120px]">Date</th>
              <th className="px-[12px] py-[10px] font-medium text-[11.5px] text-text-secondary w-[100px]">ID</th>
              <th className="px-[12px] py-[10px] font-medium text-[11.5px] text-text-secondary">Employee</th>
              <th className="px-[12px] py-[10px] font-medium text-[11.5px] text-text-secondary w-[200px]">Issue</th>
              <th className="px-[12px] py-[10px] font-medium text-[11.5px] text-text-secondary">Raw Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredExceptions.map(exc => {
              const key = `${exc.employeeId}_${exc.date}`;
              return (
                <tr key={key} className={`border-b border-border-subtle transition-colors hover:bg-panel ${selected.has(key) ? 'bg-panel' : ''}`}>
                  <td className="px-[20px] py-[10px]">
                    <input 
                      type="checkbox" 
                      checked={selected.has(key)}
                      onChange={() => toggleSelect(key)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="px-[12px] py-[10px] font-mono text-[12.5px] text-text-secondary">{exc.date}</td>
                  <td className="px-[12px] py-[10px] font-mono text-[12.5px] font-medium">{exc.machineId}</td>
                  <td className="px-[12px] py-[10px] font-medium">{exc.employeeName}</td>
                  <td className="px-[12px] py-[10px]">
                    {exc.reason === 'orphan_punch' && (
                      <span className="text-alert-text bg-alert-bg px-[6px] py-[2px] rounded text-[11.5px] font-medium border border-alert-border">
                        Missing Punch
                      </span>
                    )}
                    {exc.reason === 'conflict' && (
                      <span className="text-warning-text bg-warning-bg px-[6px] py-[2px] rounded text-[11.5px] font-medium border border-warning-border">
                        Leave Conflict
                      </span>
                    )}
                  </td>
                  <td className="px-[12px] py-[10px] font-mono text-[12px] text-text-muted">
                    {exc.inTime ? `IN: ${exc.inTime}` : 'NO IN'} | {exc.outTime ? `OUT: ${exc.outTime}` : 'NO OUT'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
