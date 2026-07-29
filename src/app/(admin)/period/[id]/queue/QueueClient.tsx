'use client';

import { useState, useEffect } from 'react';
import { resolveException, bulkMarkPresent } from './actions';
import { useRouter } from 'next/navigation';

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

export default function QueueClient({ periodId, initialExceptions }: { periodId: string, initialExceptions: ExceptionObj[] }) {
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [skippedCount, setSkippedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const total = initialExceptions.length;
  const remaining = exceptions.length;
  const progressPct = total > 0 ? ((total - remaining) / total) * 100 : 100;

  const cur = exceptions[0];

  const handleResolve = async (action: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'PAID_LEAVE') => {
    if (!cur) return;
    setLoading(true);
    
    try {
      await resolveException(periodId, cur.employeeId, cur.date, action, '');
      setExceptions(prev => prev.slice(1));
    } catch (err) {
      alert('Failed to resolve exception');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (!cur || loading) return;
    setExceptions(prev => [...prev.slice(1), cur]); // Move to back of queue
    setSkippedCount(prev => prev + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!cur || loading) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'p': handleResolve('PRESENT'); break;
        case 'h': handleResolve('HALF_DAY'); break;
        case 'a': handleResolve('ABSENT'); break;
        case 'l': handleResolve('PAID_LEAVE'); break;
        case 's': handleSkip(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cur, loading]);

  const handleBulkPresent = async () => {
    if (!confirm(`Mark remaining ${remaining} exceptions as PRESENT?`)) return;
    setLoading(true);
    try {
      await bulkMarkPresent(periodId, exceptions.map(e => ({ employeeId: e.employeeId, date: e.date })));
      setExceptions([]);
    } catch (err) {
      alert('Failed bulk update');
    } finally {
      setLoading(false);
    }
  };

  if (!cur) {
    return (
      <div className="flex-1 flex items-center justify-center py-[70px] px-[28px] bg-surface h-full">
        <div className="max-w-[430px] text-center">
          <div className="text-[18px] font-semibold tracking-[-0.015em]">Nothing left to resolve</div>
          <div className="text-[13px] text-text-secondary mt-[6px]">
            {total} flagged days resolved. Attendance is complete and the payroll figures are final.
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

  return (
    <div className="flex-1 flex flex-col h-full bg-surface">
      
      {/* Progress Bar Header */}
      <div className="px-[28px] py-[9px] border-b border-border-subtle bg-header flex items-center gap-[16px]">
        <div className="font-mono text-[12.5px] font-medium">{remaining} left</div>
        <div className="flex-1 h-[4px] bg-[#E6E2DB] rounded-[2px] overflow-hidden">
          <div className="h-full bg-text transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
        </div>
        <div className="text-[12px] text-text-secondary">{skippedCount} skipped</div>
        <button onClick={handleBulkPresent} disabled={loading} className="bg-surface text-text border border-border-strong rounded-[4px] px-[10px] py-[5px] text-[12px] cursor-pointer hover:bg-hover disabled:opacity-50">
          {loading ? 'Processing...' : 'Mark all remaining present'}
        </button>
      </div>

      <div className="flex-1 flex">
        {/* Left Side: Context */}
        <div className="flex-1 min-w-0 pt-[26px] px-[28px] pb-[30px] flex flex-col">
          <div className="flex items-baseline gap-[12px]">
            <div className="text-[24px] font-semibold tracking-[-0.02em]">{cur.employeeName}</div>
            <div className="text-[13px] text-text-secondary font-mono">#{cur.machineId}</div>
          </div>
          <div className="font-mono text-[15px] mt-[5px] text-text-secondary">{cur.date}</div>

          <div className="mt-[22px] grid grid-cols-4 gap-[1px] bg-border border border-border rounded-[4px] overflow-hidden w-max">
            <div className="bg-surface px-[14px] py-[11px] w-[150px]">
              <div className="text-[11.5px] text-text-secondary">Punch in</div>
              <div className="font-mono text-[20px] font-medium mt-[2px]">{cur.inTime || '--:--'}</div>
            </div>
            <div className="bg-surface px-[14px] py-[11px] w-[150px]">
              <div className="text-[11.5px] text-text-secondary">Punch out</div>
              <div className="font-mono text-[20px] font-medium mt-[2px] text-alert-text">{cur.outTime || '--:--'}</div>
            </div>
            <div className="bg-surface px-[14px] py-[11px] w-[150px]">
              <div className="text-[11.5px] text-text-secondary">Machine status</div>
              <div className="font-mono text-[20px] font-medium mt-[2px]">{cur.machineStatus || 'None'}</div>
            </div>
            <div className="bg-surface px-[14px] py-[11px] w-[150px]">
              <div className="text-[11.5px] text-text-secondary">Shift</div>
              <div className="font-mono text-[20px] font-medium mt-[2px]">09:30–19:30</div>
            </div>
          </div>

          <div className="mt-[16px] bg-alert-bg border border-alert-border rounded-[4px] px-[14px] py-[10px] text-[13px] text-alert-text w-max max-w-[620px]">
            {cur.reason}
          </div>
          <div className="mt-[12px] text-[12.5px] text-text-secondary max-w-[620px]">
            Raw data analysis shows incomplete punch records for this date.
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="w-[340px] flex-none border-l border-border bg-header px-[22px] pt-[22px] pb-[30px] flex flex-col">
          <div className="text-[11.5px] text-text-secondary font-medium mb-[9px]">Resolve as</div>
          
          <div className="flex flex-col gap-[6px]">
            <button disabled={loading} onClick={() => handleResolve('PRESENT')} className="flex items-center justify-between w-full text-left bg-surface border border-border-strong rounded-[4px] px-[12px] py-[9px] cursor-pointer hover:border-text group disabled:opacity-50">
              <span>
                <span className="block text-[13.5px] font-medium text-text group-hover:text-text">Present</span>
                <span className="block text-[11.5px] text-text-secondary mt-[1px]">Full day</span>
              </span>
              <span className="font-mono text-[12px] text-text-secondary border border-[#E0DBD3] rounded-[3px] px-[6px] py-[1px] bg-panel">P</span>
            </button>

            <button disabled={loading} onClick={() => handleResolve('HALF_DAY')} className="flex items-center justify-between w-full text-left bg-surface border border-border-strong rounded-[4px] px-[12px] py-[9px] cursor-pointer hover:border-text group disabled:opacity-50">
              <span>
                <span className="block text-[13.5px] font-medium text-text group-hover:text-text">Half Day</span>
                <span className="block text-[11.5px] text-text-secondary mt-[1px]">0.5 penalty</span>
              </span>
              <span className="font-mono text-[12px] text-text-secondary border border-[#E0DBD3] rounded-[3px] px-[6px] py-[1px] bg-panel">H</span>
            </button>

            <button disabled={loading} onClick={() => handleResolve('ABSENT')} className="flex items-center justify-between w-full text-left bg-surface border border-border-strong rounded-[4px] px-[12px] py-[9px] cursor-pointer hover:border-text group disabled:opacity-50">
              <span>
                <span className="block text-[13.5px] font-medium text-text group-hover:text-text">Absent</span>
                <span className="block text-[11.5px] text-text-secondary mt-[1px]">1.0 penalty</span>
              </span>
              <span className="font-mono text-[12px] text-text-secondary border border-[#E0DBD3] rounded-[3px] px-[6px] py-[1px] bg-panel">A</span>
            </button>
            
            <button disabled={loading} onClick={() => handleResolve('PAID_LEAVE')} className="flex items-center justify-between w-full text-left bg-surface border border-border-strong rounded-[4px] px-[12px] py-[9px] cursor-pointer hover:border-text group disabled:opacity-50">
              <span>
                <span className="block text-[13.5px] font-medium text-text group-hover:text-text">Paid Leave</span>
                <span className="block text-[11.5px] text-text-secondary mt-[1px]">No penalty</span>
              </span>
              <span className="font-mono text-[12px] text-text-secondary border border-[#E0DBD3] rounded-[3px] px-[6px] py-[1px] bg-panel">L</span>
            </button>
          </div>

          <button disabled={loading} onClick={handleSkip} className="mt-[10px] flex items-center justify-between w-full text-left bg-transparent border border-dashed border-border-strong rounded-[4px] px-[12px] py-[8px] cursor-pointer text-text-secondary hover:border-text-muted disabled:opacity-50">
            <span className="text-[13px]">Skip for now</span>
            <span className="font-mono text-[12px] border border-[#E0DBD3] rounded-[3px] px-[6px] py-[1px] bg-panel">S</span>
          </button>
          
        </div>
      </div>
    </div>
  );
}
