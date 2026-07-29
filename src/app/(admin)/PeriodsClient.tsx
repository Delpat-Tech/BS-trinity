'use client';

import { useState } from 'react';
import { openPeriod } from './actions';

export default function PeriodsClient({ nextMonth, nextYear }: { nextMonth: string, nextYear: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-text text-surface border border-text rounded-[4px] px-[13px] py-[7px] text-[12.5px] font-medium cursor-pointer hover:bg-[#332F2A]"
      >
        Open {nextMonth} {nextYear}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1815]/20 backdrop-blur-[2px]">
          <div className="bg-surface border border-border shadow-lg rounded-[4px] w-[360px] flex flex-col overflow-hidden">
            <div className="px-[20px] py-[16px] border-b border-border bg-header">
              <div className="text-[14px] font-semibold">Open new period</div>
              <div className="text-[12px] text-text-secondary mt-[2px]">Creates a new payroll period based on global rules.</div>
            </div>
            
            <form action={(formData) => {
              openPeriod(formData);
              setIsOpen(false);
            }} className="p-[20px] flex flex-col gap-[16px]">
              
              <div className="flex flex-col gap-[4px]">
                <label htmlFor="month" className="text-[12px] font-medium text-text-secondary">Month</label>
                <select 
                  id="month" name="month"
                  className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text"
                  defaultValue={new Date().getMonth() + 1}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-[4px]">
                <label htmlFor="year" className="text-[12px] font-medium text-text-secondary">Year</label>
                <select 
                  id="year" name="year"
                  className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text"
                  defaultValue={nextYear}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-[4px]">
                <label htmlFor="divisorDays" className="text-[12px] font-medium text-text-secondary">Divisor Days</label>
                <input 
                  id="divisorDays" name="divisorDays" type="number" step="0.5" defaultValue="30" required
                  className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text"
                />
              </div>

              <div className="flex justify-end gap-[8px] mt-[8px]">
                <button type="button" onClick={() => setIsOpen(false)} className="px-[12px] py-[6px] border border-border-strong rounded-[4px] text-[12.5px] hover:bg-hover">Cancel</button>
                <button type="submit" className="bg-text text-surface border border-text rounded-[4px] px-[12px] py-[6px] text-[12.5px] font-medium hover:bg-[#332F2A]">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
