'use client';
import { toast } from 'sonner';
import React, { useState, useRef, useEffect } from 'react';
import { updatePayrollInput, lockPeriod, unlockPeriod } from './actions';
import { useRouter } from 'next/navigation';

export default function ReviewGridClient({ periodId, lines, exceptionsCount, status, unlockReason }: { periodId: string, lines: any[], exceptionsCount: number, status: string, unlockReason?: string }) {
  const isLocked = status === 'locked';
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [openRow, setOpenRow] = useState<string | null>(null);
  const [openCell, setOpenCell] = useState<'gross' | 'net' | 'paidDays' | 'penalties' | 'absent' | 'present' | 'half' | 'leave' | 'ew' | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(el);

    window.addEventListener('resize', updateWidth);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const handleUpdate = async (employeeId: string, field: string, value: number | null) => {
    if (isLocked) return;
    try {
      const res = await updatePayrollInput(periodId, employeeId, field, value);
      if (res && res.error) throw new Error(res.error);
      toast.success(`Successfully saved ${field}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save input');
    }
  };

  const handleLock = async () => {
    if (!confirm('Are you sure you want to lock this period?')) return;
    setLoading(true);
    try {
      const res = await lockPeriod(periodId);
      if (res && res.error) throw new Error(res.error);
      toast.success('Period locked successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to lock');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    const reason = prompt('Enter reason for unlocking:');
    if (!reason || !reason.trim()) return;
    setLoading(true);
    try {
      const res = await unlockPeriod(periodId, reason.trim());
      if (res && res.error) throw new Error(res.error);
      toast.success('Period unlocked successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  const totalGross = lines.reduce((sum, r) => sum + (r.gross || 0), 0);
  const totalNet = lines.reduce((sum, r) => sum + (r.net || 0), 0);
  const totalAdvances = lines.reduce((sum, r) => sum + (r.advanceDeduction || 0), 0);

  return (
    <div className="flex flex-col h-full bg-surface">
      {unlockReason && !isLocked && (
        <div className="bg-amber-50 border-b border-amber-200 px-[28px] py-[8px] flex items-center gap-2 text-[12px] text-amber-900 font-medium">
          <span className="font-semibold uppercase tracking-wider text-[10.5px] px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-950">Unlocked</span>
          <span>Reason stored in DB: <span className="italic font-normal">"{unlockReason}"</span></span>
        </div>
      )}
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

      <div ref={tableContainerRef} className="flex-1 overflow-x-auto relative">
        <table className="border-collapse min-w-[1560px] text-[12.5px] w-full">
          <thead>
            <tr>
              <th title="Full Name of Employee" className="sticky left-0 z-30 bg-header text-left font-medium text-[11.5px] text-text-secondary px-[12px] pl-[28px] py-[7px] border-b border-border border-r min-w-[216px]">Employee</th>
              <th title="Biometric Machine Code / ID" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Code</th>
              <th title="Base Fixed Monthly Salary (₹)" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Salary</th>
              <th title="Calculated Daily Rate = Salary / Divisor Days" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Daily</th>
              <th title="Number of Full Present Days" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Pres.</th>
              <th title="Count of Half Days Worked" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Half</th>
              <th title="Number of Unpaid Absent Days" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Abs.</th>
              <th title="Paid Leave Days Approved" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">P.L.</th>
              <th title="Extra Working (E.W.) Days - Pre-filled from Worked Weekly Offs" className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-header cursor-help">E.W.</th>
              <th title="Penalty Day Deductions from Late/Early Strike Rules" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Pen.</th>
              <th title="Total Paid Days = Pres. - Pen. + E.W." className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Paid days</th>
              <th title="Gross Earnings = floor(Daily Rate × Total Paid Days)" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Gross</th>
              <th title="Performance Incentive (₹)" className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-header cursor-help">Incentive</th>
              <th title="Additional Bonus (₹)" className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-header cursor-help">Bonus</th>
              <th title="Manual Rupee Deduction for Late Punches (₹)" className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-header cursor-help">Late ₹</th>
              <th title="Salary Advance Deduction Applied This Month (₹)" className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-header cursor-help">Adv. taken</th>
              <th title="Miscellaneous Debit Deductions (₹)" className="text-right font-medium text-[11.5px] text-text px-[10px] py-[7px] border-b border-border bg-header cursor-help">Other debit</th>
              <th title="Total Outstanding Advance Balance (₹)" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Out. Adv</th>
              <th title="Remaining Advance Carried Forward (₹)" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] py-[7px] border-b border-border bg-header">Carr. Adv</th>
              <th title="Final Net Salary Payable = Gross + Inc + Bonus - Adv - Late - Debit" className="text-right font-medium text-[11.5px] text-text-secondary px-[10px] pr-[28px] py-[7px] border-b border-border bg-header">Net</th>
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
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'present' ? null : r.employeeId); setOpenCell('present'); }}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors text-text"
                  >
                    {r.presentDays}
                  </td>
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'half' ? null : r.employeeId); setOpenCell('half'); }}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors text-text"
                  >
                    {r.halfDays}
                  </td>
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'absent' ? null : r.employeeId); setOpenCell('absent'); }}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors text-text"
                  >
                    {r.absDays}
                  </td>
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'leave' ? null : r.employeeId); setOpenCell('leave'); }}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors text-text"
                  >
                    {r.paidLeaveDays}
                  </td>
                  <td className="text-right px-[6px] py-[3px] border-b border-border-subtle">
                    <div className="flex items-center justify-end gap-1">
                      <input 
                        disabled={isLocked}
                        defaultValue={r.ewDays !== null ? r.ewDays : ''}
                        onBlur={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          if (val !== r.ewDays) handleUpdate(r.employeeId.toString(), 'ewDays', val);
                        }}
                        className="w-[45px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-[#E8630A] disabled:bg-header"
                      />
                      <button 
                        onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'ew' ? null : r.employeeId); setOpenCell('ew'); }}
                        className="text-[10px] px-1 py-0.5 rounded border border-border text-text-secondary hover:bg-hover font-mono"
                        title="View EW Dates"
                      >
                        ℹ
                      </button>
                    </div>
                  </td>
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'penalties' ? null : r.employeeId); setOpenCell('penalties'); }}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors"
                  >
                    {r.penaltyDays}
                  </td>
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'paidDays' ? null : r.employeeId); setOpenCell('paidDays'); }}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono font-medium cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors text-text"
                  >
                    {r.totalPaidDays}
                  </td>
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'gross' ? null : r.employeeId); setOpenCell('gross'); }}
                    className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors"
                  >
                    {r.gross.toLocaleString()}
                  </td>
                  
                  <td className="text-right px-[6px] py-[3px] border-b border-border-subtle">
                    <input 
                      disabled={isLocked}
                      defaultValue={r.incentive || ''}
                      onBlur={(e) => {
                        const val = e.target.value ? Number(e.target.value) : 0;
                        if (val !== (r.incentive || 0)) handleUpdate(r.employeeId.toString(), 'incentive', val);
                      }}
                      className="w-[78px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-[#E8630A] disabled:bg-header"
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
                      className="w-[70px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-[#E8630A] disabled:bg-header"
                    />
                  </td>
                  <td className="text-right px-[6px] py-[3px] border-b border-border-subtle">
                    <input 
                      disabled={isLocked}
                      defaultValue={r.latePunchAmt || ''}
                      onBlur={(e) => {
                        const val = e.target.value ? Number(e.target.value) : 0;
                        if (val !== (r.latePunchAmt || 0)) handleUpdate(r.employeeId.toString(), 'latePunchAmt', val);
                      }}
                      className="w-[70px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-[#E8630A] disabled:bg-header"
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
                      className="w-[78px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-[#E8630A] disabled:bg-header"
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
                      className="w-[70px] text-right font-mono text-[12.5px] px-[6px] py-[4px] border border-border-strong rounded-[3px] bg-surface outline-none focus:border-[#E8630A] disabled:bg-header"
                    />
                  </td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text-secondary">{r.outstandingAdvance?.toLocaleString() || 0}</td>
                  <td className="text-right px-[10px] py-[6px] border-b border-border-subtle font-mono text-text-secondary">{r.advanceCarried?.toLocaleString() || 0}</td>
                  
                  <td 
                    onClick={() => { setOpenRow(openRow === r.employeeId && openCell === 'net' ? null : r.employeeId); setOpenCell('net'); }}
                    className="text-right px-[10px] pr-[28px] py-[6px] border-b border-border-subtle font-mono font-semibold cursor-pointer underline decoration-border decoration-dotted underline-offset-4 hover:bg-hover transition-colors text-text"
                  >
                    {r.net.toLocaleString()}
                  </td>
                </tr>

                {openRow === r.employeeId && (
                  <tr>
                    <td colSpan={20} className="p-0 border-b border-border bg-header">
                      <div 
                        className="sticky left-0 max-w-full py-[12px] px-[28px] flex gap-[34px] items-start overflow-x-auto bg-header z-10 border-b border-border shadow-sm"
                        style={{ width: containerWidth ? `${containerWidth}px` : 'calc(100vw - 220px)' }}
                      >
                        {openCell === 'gross' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">How gross was built</div>
                              <div className="font-mono text-[14px] mt-[6px]">{r.totalPaidDays} paid days × ₹{r.dailyRate.toLocaleString()}</div>
                              <div className="font-mono text-[14px] mt-[3px] text-text-secondary">= ₹{r.gross.toLocaleString()}</div>
                            </div>
                            <div className="border-l border-[#E0DBD3] pl-[24px]">
                              <div className="text-[11.5px] text-text-secondary font-medium">Where the parts come from</div>
                              <div className="text-[12.5px] text-text-secondary mt-[6px] max-w-[520px]">
                                {r.totalPaidDays} paid days = {r.presentDays} present + {r.halfDays * 0.5} (from {r.halfDays} half days) + {r.paidLeaveDays} leaves - {r.penaltyDays} penalty
                              </div>
                            </div>
                          </>
                        )}
                        {openCell === 'net' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">How net was built</div>
                              <div className="font-mono text-[14px] mt-[6px]">₹{r.gross.toLocaleString()} (Gross) + ₹{r.incentive || 0} (Inc) + ₹{r.bonus || 0} (Bon) - ₹{r.latePunchAmt || 0} (Late) - ₹{r.advanceDeduction || 0} (Adv) - ₹{r.otherDebit || 0} (Other)</div>
                              <div className="font-mono text-[14px] mt-[3px] text-text-secondary">= ₹{r.net.toLocaleString()}</div>
                            </div>
                          </>
                        )}
                        {openCell === 'paidDays' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">How Paid Days was built</div>
                              <div className="font-mono text-[14px] mt-[6px]">{r.presentDays} (P) + {r.halfDays * 0.5} (H) + {r.paidLeaveDays} (L) + {r.ewDays} (EW) - {r.penaltyDays} (Pen)</div>
                              <div className="font-mono text-[14px] mt-[3px] text-text-secondary">= {r.totalPaidDays} days</div>
                            </div>
                          </>
                        )}
                        {openCell === 'penalties' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">How Penalty was built</div>
                              <div className="font-mono text-[14px] mt-[6px]">{r.lateStrikes} Late Strikes + {r.earlyStrikes} Early Strikes</div>
                              <div className="font-mono text-[14px] mt-[3px] text-text-secondary">= {r.penaltyDays} penalty days deducted</div>
                            </div>
                          </>
                        )}
                        {openCell === 'absent' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">Absent Dates ({r.absDays} Days)</div>
                              {r.absentDates && r.absentDates.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-[6px]">
                                  {r.absentDates.map((dateStr: string) => (
                                    <span key={dateStr} className="px-2 py-1 rounded bg-[#FEF6EC] text-[#8A4B0B] font-mono text-[12px] border border-[#F2DFC0]">
                                      {dateStr}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[13px] text-text-secondary mt-[6px]">No absent dates recorded.</div>
                              )}
                            </div>
                          </>
                        )}
                        {openCell === 'present' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">Present / Paid Days ({r.presentDays} Days)</div>
                              {r.presentDatesList && r.presentDatesList.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-[6px] max-w-[800px]">
                                  {r.presentDatesList.map((dateStr: string) => (
                                    <span key={dateStr} className="px-2 py-1 rounded bg-success-bg text-success-text font-mono text-[12px] border border-success-border">
                                      {dateStr}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[13px] text-text-secondary mt-[6px]">No present dates.</div>
                              )}
                            </div>
                          </>
                        )}
                        {openCell === 'half' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">Half Days ({r.halfDays} Days)</div>
                              {r.halfDatesList && r.halfDatesList.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-[6px]">
                                  {r.halfDatesList.map((dateStr: string) => (
                                    <span key={dateStr} className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-mono text-[12px] border border-amber-200">
                                      {dateStr}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[13px] text-text-secondary mt-[6px]">No half days.</div>
                              )}
                            </div>
                          </>
                        )}
                        {openCell === 'leave' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">Approved Leaves ({r.paidLeaveDays} Days)</div>
                              {r.paidLeaveDatesList && r.paidLeaveDatesList.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-[6px]">
                                  {r.paidLeaveDatesList.map((dateStr: string) => (
                                    <span key={dateStr} className="px-2 py-1 rounded bg-[#F0F5E6] text-[#3D5A10] font-mono text-[12px] border border-[#D8E4C3]">
                                      {dateStr}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[13px] text-text-secondary mt-[6px]">No approved leave dates.</div>
                              )}
                            </div>
                          </>
                        )}
                        {openCell === 'ew' && (
                          <>
                            <div>
                              <div className="text-[11.5px] text-text-secondary font-medium">Extra Working Days (EW: {r.ewDays} Days)</div>
                              {r.ewDatesList && r.ewDatesList.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-[6px]">
                                  {r.ewDatesList.map((dateStr: string) => (
                                    <span key={dateStr} className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-mono text-[12px] border border-blue-200">
                                      {dateStr}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[13px] text-text-secondary mt-[6px]">No extra working days worked on weekly offs.</div>
                              )}
                            </div>
                          </>
                        )}
                        <div className="ml-auto flex gap-[6px]">
                          <button onClick={() => setOpenRow(null)} className="bg-transparent text-text-secondary border border-transparent rounded-[4px] px-[8px] py-[5px] text-[12px] cursor-pointer hover:bg-header">
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

        {status === 'locked' ? (
          <div className="flex gap-3">
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="px-4 py-2 bg-[#E8630A] text-white rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Unlocking...' : 'Unlock Period'}
            </button>
            <a
              href={`/api/export/${periodId}`}
              download={`Salary_Sheet_${periodId}.xlsx`}
              className="px-4 py-2 bg-success-bg text-success-text border border-success-border rounded-[4px] text-[13px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              Export Excel
            </a>
          </div>
        ) : (
          <button onClick={handleLock} disabled={loading || exceptionsCount > 0} className="bg-[#E8630A] text-white rounded-[6px] px-[13px] py-[7px] text-[12.5px] font-medium cursor-pointer hover:bg-[#C9540A] disabled:opacity-50 disabled:bg-header disabled:text-text-muted disabled:border-border">
            {loading ? 'Locking...' : 'Lock Period'}
          </button>
        )}
      </div>

    </div>
  );
}
