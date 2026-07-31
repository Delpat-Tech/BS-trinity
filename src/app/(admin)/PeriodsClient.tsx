'use client';

import { useState } from 'react';
import { openPeriod } from './actions';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function PeriodsClient({ nextMonth, nextYear }: { nextMonth: string, nextYear: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    try {
      await openPeriod(formData);
      toast.success('Period opened successfully');
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to open period');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-[#E8630A] text-white rounded-[6px] px-[16px] py-[8px] text-[12.5px] font-medium hover:bg-[#C9540A] shadow-sm transition-colors"
      >
       Upload
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1815]/20 backdrop-blur-[2px]">
          <div className="bg-surface border border-border shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-[10px] w-[380px] flex flex-col overflow-hidden">
            <div className="px-[24px] py-[18px] border-b border-border">
              <div className="text-[15px] font-semibold tracking-[-0.01em]">Open new period</div>
              <div className="text-[12px] text-text-secondary mt-[2px]">Creates a new payroll period based on global rules.</div>
            </div>
            
            <form action={handleSubmit} className="p-[20px] flex flex-col gap-[16px]">
              
              <div className="flex flex-col gap-[4px]">
                <label htmlFor="month" className="text-[11.5px] font-medium tracking-[0.02em] uppercase text-text-muted">Month</label>
                <select 
                  id="month" name="month"
                  className="w-full rounded-[6px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-[#E8630A] transition-colors"
                  defaultValue={new Date().getMonth() + 1}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-[4px]">
                <label htmlFor="year" className="text-[11.5px] font-medium tracking-[0.02em] uppercase text-text-muted">Year</label>
                <select 
                  id="year" name="year"
                  className="w-full rounded-[6px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-[#E8630A] transition-colors"
                  defaultValue={nextYear}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-[4px]">
                <label htmlFor="divisorDays" className="text-[11.5px] font-medium tracking-[0.02em] uppercase text-text-muted">Divisor Days</label>
                <input 
                  id="divisorDays" name="divisorDays" type="number" step="0.5" defaultValue="30" required
                  className="w-full rounded-[6px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-[#E8630A] transition-colors"
                />
              </div>

              <div className="flex justify-end gap-[8px] mt-[8px]">
                <button type="button" onClick={() => setIsOpen(false)} className="px-[14px] py-[7px] border border-border rounded-[6px] text-[12.5px] text-text-secondary hover:bg-hover hover:text-text transition-colors">Cancel</button>
                <button type="submit" className="bg-[#E8630A] text-white rounded-[6px] px-[14px] py-[7px] text-[12.5px] font-medium hover:bg-[#C9540A] shadow-sm transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
