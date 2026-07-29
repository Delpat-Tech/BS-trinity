'use client';

import React, { useState } from 'react';
import { updatePayrollInput, lockPeriod, unlockPeriod } from './actions';
import { useRouter } from 'next/navigation';

export default function ReviewGridClient({ periodId, lines, exceptionsCount, status }: { periodId: string, lines: any[], exceptionsCount: number, status: string }) {
  const isLocked = status === 'locked';
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Keep track of which row's derivative details are open
  const [openRow, setOpenRow] = useState<string | null>(null);

  const handleUpdate = async (employeeId: string, field: string, value: number | null) => {
    if (isLocked) return;
    try {
      await updatePayrollInput(periodId, employeeId, field, value);
    } catch (err) {
      alert('Failed to save input');
    }
  };

  const handleLock = async () => {
    if (!confirm('Are you sure you want to lock this period?')) return;
    setLoading(true);
    try {
      await lockPeriod(periodId);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to lock');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    const reason = prompt('Enter reason for unlocking:');
    if (!reason) return;
    setLoading(true);
    try {
      await unlockPeriod(periodId, reason);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalGross = lines.reduce((sum, r) => sum + (r.gross || 0), 0);
  const totalNet = lines.reduce((sum, r) => sum + (r.net || 0), 0);
  const totalAdvances = lines.reduce((sum, r) => sum + (r.advanceDeduction || 0), 0);

  return (
    <div className="flex flex-col h-full bg-surface">
      
      {/* Review Header */}
      <div className="px-[28px] py-[9px] border-b border-border-subtle bg-header flex items-center gap-[24px]">
        <div className="text-[12px] text-text-secondary">
          Grey columns are computed. Click a computed figure to see how it was built.
        </div>
        <div className="ml-auto flex gap-[22px] items-baseline">
          <div className="text-[11.5px] text-text-secondary">
            Gross <span className="font-mono text-[13px] text-text ml-[5px]">₹{totalGross.toLocaleString()}</span>
          </div>
          <div className="text-[11.5px] text-text-secondary">
            Advances <span className="font-mono text-[13px] text-text ml-[5px]">−₹{totalAdvances.toLocaleString()}</span>
          </div>
          <div className="text-[11.5px] text-text-secondary">
            Net payable <span className="font-mono text-[14px] font-semibold text-text ml-[5px]">₹{totalNet.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto relative">
        <table className="border-collapse min-w-[1560px] text-[12.5px] w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-30 bg-header text-left font-medium text-[11.5px] text-text-secondary px-[12px] pl-[28px] py-[7px] border-b border-border border-r min-w-[216px]">Employee</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Code</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Salary</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Daily</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Pres.</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Half</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Abs.</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">P.L.</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">E.W.</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Pen.</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Paid days</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Gross</th>
              <th className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-panel">Incentive</th>
              <th className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-panel">Bonus</th>
              <th className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-panel">Adv. taken</th>
              <th className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-panel">Other debit</th>
              <th className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] pr-[28px] py-[7px] border-b border-border bg-header">Net</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((r) => (
              <React.Fragment key={r.employeeId.toString()}>
                <tr className="hover:bg-header transition-colors group">
                  <td className="sticky left-0 z-20 bg-surface group-hover:bg-header px-[12px] pl-[28px] py-[6px] border-b border-border-subtle border-r border-border transition-colors">
                    <span className="font-medium text-text">{r.employeeName}</span>
                    <span className="block text-[11.5px] text-text-muted mt-[1px]">Role</span>
                  </td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text-muted">{r.machineId}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text">{r.fixedSalary.toLocaleString()}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text-secondary">{r.dailyRate.toLocaleString()}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text">{r.presentDays}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text">{r.halfDays}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text">{r.absDays}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text">{r.paidLeaveDays}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text">{r.ewDays}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text">{r.penaltyDays}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono font-medium text-text">{r.totalPaidDays}</td>
                  <td 
                    onClick={() => setOpenRow(openRow === r.employeeId ? null : r.employeeId)}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors"
                  >
                    {r.gross.toLocaleString()}
                  </td>
                  
                  {/* Editable Inputs */}
                  <td className="text-right px-[6px] py-[3px] border-b border-border-subtle">
                    <input 
                      disabled={isLocked}
                      defaultValue={r.incentive || ''}
                      onBlur={(e) => {
                        const val = e.target.value ? Number(e.target.value) : 0;
                        if (val !== (r.incentive || 0)) handleUpdate(r.employeeId.toString(), 'incentive', val);
                      }}
                      className="w-[78px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-text disabled:bg-panel"
                    />
                  </td>
                  <td className="text-right px-[6px] py-[3px] border-b border-border-subtle">
                    <input 
                      disabled={isLocked}
                      defaultValue={r.bonus || ''}
                      onBlur={(e) => {
                        const val = e.target.value ? Number(e.target.value) : 0;
                        if (val !== (r.bonus || 0)) handleUpdate(r.employeeId.toString(), 'bonus', val);
                      }}
                      className="w-[70px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-text disabled:bg-panel"
                    />
                  </td>
                  <td className="text-right px-[6px] py-[3px] border-b border-border-subtle">
                    <input 
                      disabled={isLocked}
                      defaultValue={r.advanceDeduction || ''}
                      onBlur={(e) => {
                        const val = e.target.value ? Number(e.target.value) : 0;
                        if (val !== (r.advanceDeduction || 0)) handleUpdate(r.employeeId.toString(), 'advanceDeduction', val);
                      }}
                      className="w-[78px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-text disabled:bg-panel"
                    />
                  </td>
                  <td className="text-right px-[6px] py-[3px] border-b border-border-subtle">
                    <input 
                      disabled={isLocked}
                      defaultValue={r.otherDebit || ''}
                      onBlur={(e) => {
                        const val = e.target.value ? Number(e.target.value) : 0;
                        if (val !== (r.otherDebit || 0)) handleUpdate(r.employeeId.toString(), 'otherDebit', val);
                      }}
                      className="w-[70px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-text disabled:bg-panel"
                    />
                  </td>
                  
                  <td className="text-right px-[10px] pr-[28px] py-[6px] border-b border-border-subtle font-mono font-semibold text-text">
                    {r.net.toLocaleString()}
                  </td>
                </tr>

                {/* Expanded Details Row */}
                {openRow === r.employeeId && (
                  <tr>
                    <td colSpan={17} className="p-0 border-b border-border bg-header">
                      <div className="py-[12px] px-[28px] flex gap-[34px] items-start">
                        <div>
                          <div className="text-[11.5px] text-text-secondary font-medium">How this gross was built</div>
                          <div className="font-mono text-[14px] mt-[6px]">{r.totalPaidDays} paid days × ₹{r.dailyRate.toLocaleString()}</div>
                          <div className="font-mono text-[14px] mt-[3px] text-text-secondary">= ₹{r.gross.toLocaleString()}</div>
                        </div>
                        <div className="border-l border-[#E0DBD3] pl-[24px]">
                          <div className="text-[11.5px] text-text-secondary font-medium">Where the parts come from</div>
                          <div className="text-[12.5px] text-text-secondary mt-[6px] max-w-[520px]">
                            {r.totalPaidDays} paid days = {r.presentDays} present + {r.halfDays * 0.5} (from {r.halfDays} half days) + {r.paidLeaveDays} leaves - {r.penaltyDays} penalty
                          </div>
                        </div>
                        <div className="ml-auto flex gap-[6px]">
                          <button onClick={() => setOpenRow(null)} className="bg-transparent text-text-secondary border border-transparent rounded-[4px] px-[8px] py-[5px] text-[12px] cursor-pointer hover:bg-panel">
                            Close
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto border-t border-border bg-header px-[28px] py-[11px] flex items-center justify-between">
        {exceptionsCount > 0 ? (
          <div className="text-[12.5px] text-alert-text">
            {exceptionsCount} exceptions unresolved. You cannot lock the period.
          </div>
        ) : (
          <div className="text-[12.5px] text-success-text">
            All exceptions resolved. This period is ready to lock.
          </div>
        )}

        {isLocked ? (
          <button onClick={handleUnlock} disabled={loading} className="bg-surface text-text border border-border-strong rounded-[4px] px-[13px] py-[7px] text-[12.5px] cursor-pointer hover:bg-hover disabled:opacity-50">
            {loading ? 'Processing...' : 'Unlock Period'}
          </button>
        ) : (
          <button onClick={handleLock} disabled={loading || exceptionsCount > 0} className="bg-text text-surface border border-text rounded-[4px] px-[13px] py-[7px] text-[12.5px] font-medium cursor-pointer hover:bg-[#332F2A] disabled:opacity-50 disabled:bg-panel disabled:text-text-muted disabled:border-border">
            {loading ? 'Locking...' : 'Lock Period'}
          </button>
        )}
      </div>

    </div>
  );
}
