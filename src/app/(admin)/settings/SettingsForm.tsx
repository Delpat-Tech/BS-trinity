'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSettings } from './actions';

export function SettingsForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      shift_start: formData.get('shift_start') as string,
      shift_end: formData.get('shift_end') as string,
      grace_until: formData.get('grace_until') as string,
      half_day_if_in_after: formData.get('half_day_if_in_after') as string,
      half_day_if_out_before: formData.get('half_day_if_out_before') as string,
      late_strike_window: [formData.get('late_strike_start') as string, formData.get('late_strike_end') as string],
      early_strike_window: [formData.get('early_strike_start') as string, formData.get('early_strike_end') as string],
      strikes_per_penalty: Number(formData.get('strikes_per_penalty')),
      penalty_days_per_trigger: Number(formData.get('penalty_days_per_trigger')),
      sandwich_skips_weekly_off: formData.get('sandwich_skips_weekly_off') === 'on',
    };

    try {
      await updateSettings(data);
      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[24px]">
      
      {/* Group: Time Boundaries */}
      <div className="bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-[4px] overflow-hidden">
        <div className="px-[20px] py-[12px] bg-header border-b border-border">
          <div className="text-[13px] font-semibold">Time Boundaries</div>
          <div className="text-[12px] text-text-secondary mt-[1px]">Base shift hours and half-day thresholds</div>
        </div>
        
        <div className="p-[20px] flex flex-col gap-[16px]">
          <div className="grid grid-cols-2 gap-[24px]">
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="shift_start" className="text-[12px] font-medium text-text-secondary">Shift Start</label>
              <input id="shift_start" name="shift_start" type="time" defaultValue={initialData.shift_start} className="w-full rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="shift_end" className="text-[12px] font-medium text-text-secondary">Shift End</label>
              <input id="shift_end" name="shift_end" type="time" defaultValue={initialData.shift_end} className="w-full rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-[24px]">
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="half_day_if_in_after" className="text-[12px] font-medium text-text-secondary">Half-day if IN after</label>
              <input id="half_day_if_in_after" name="half_day_if_in_after" type="time" defaultValue={initialData.half_day_if_in_after} className="w-full rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="half_day_if_out_before" className="text-[12px] font-medium text-text-secondary">Half-day if OUT before</label>
              <input id="half_day_if_out_before" name="half_day_if_out_before" type="time" defaultValue={initialData.half_day_if_out_before} className="w-full rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
            </div>
          </div>
        </div>
      </div>

      {/* Group: Strikes & Penalties */}
      <div className="bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-[4px] overflow-hidden">
        <div className="px-[20px] py-[12px] bg-header border-b border-border">
          <div className="text-[13px] font-semibold">Strikes & Penalties</div>
          <div className="text-[12px] text-text-secondary mt-[1px]">Late arrivals and early departures that accrue towards a penalty</div>
        </div>
        
        <div className="p-[20px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="grace_until" className="text-[12px] font-medium text-text-secondary">Grace Period Until</label>
            <input id="grace_until" name="grace_until" type="time" defaultValue={initialData.grace_until} className="w-[200px] rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
            <div className="text-[11.5px] text-text-muted">Arrivals before this time are counted as fully present.</div>
          </div>

          <div className="h-[1px] bg-border-subtle my-[8px]"></div>

          <div className="grid grid-cols-2 gap-[24px]">
            <div className="flex flex-col gap-[16px]">
              <div className="text-[13px] font-medium">Late Strike Window</div>
              <div className="flex items-center gap-[12px]">
                <input id="late_strike_start" name="late_strike_start" type="time" defaultValue={initialData.late_strike_window[0]} className="flex-1 rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
                <span className="text-text-secondary">to</span>
                <input id="late_strike_end" name="late_strike_end" type="time" defaultValue={initialData.late_strike_window[1]} className="flex-1 rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
              </div>
            </div>
            
            <div className="flex flex-col gap-[16px]">
              <div className="text-[13px] font-medium">Early Strike Window</div>
              <div className="flex items-center gap-[12px]">
                <input id="early_strike_start" name="early_strike_start" type="time" defaultValue={initialData.early_strike_window[0]} className="flex-1 rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
                <span className="text-text-secondary">to</span>
                <input id="early_strike_end" name="early_strike_end" type="time" defaultValue={initialData.early_strike_window[1]} className="flex-1 rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-border-subtle my-[8px]"></div>

          <div className="grid grid-cols-2 gap-[24px]">
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="strikes_per_penalty" className="text-[12px] font-medium text-text-secondary">Strikes to Trigger Penalty</label>
              <input id="strikes_per_penalty" name="strikes_per_penalty" type="number" defaultValue={initialData.strikes_per_penalty} className="w-full rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="penalty_days_per_trigger" className="text-[12px] font-medium text-text-secondary">Penalty Days Deduction</label>
              <input id="penalty_days_per_trigger" name="penalty_days_per_trigger" type="number" step="0.5" defaultValue={initialData.penalty_days_per_trigger} className="w-full rounded-[4px] border border-border-strong px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text" />
              <div className="text-[11.5px] text-text-muted mt-[2px]">e.g. 0.5 = deduct half day per trigger</div>
            </div>
          </div>
        </div>
      </div>

      {/* Group: Leave Policy */}
      <div className="bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-[4px] overflow-hidden">
        <div className="px-[20px] py-[12px] bg-header border-b border-border">
          <div className="text-[13px] font-semibold">Leave Policy</div>
        </div>
        <div className="p-[20px]">
          <label className="flex items-start gap-[10px] cursor-pointer">
            <input 
              type="checkbox" 
              id="sandwich_skips_weekly_off" name="sandwich_skips_weekly_off" 
              defaultChecked={initialData.sandwich_skips_weekly_off}
              className="mt-[3px] w-[14px] h-[14px] accent-text" 
            />
            <div>
              <div className="text-[13px] font-medium">Sandwich ignores weekly off</div>
              <div className="text-[12px] text-text-secondary mt-[2px]">If absent Friday and Monday, Saturday/Sunday are not penalised.</div>
            </div>
          </label>
        </div>
      </div>

      {error && <div className="text-[13px] text-alert-text bg-alert-bg border border-alert-border p-[12px] rounded-[4px]">{error}</div>}
      {success && <div className="text-[13px] text-success-text bg-success-bg border border-success-border p-[12px] rounded-[4px]">Settings saved successfully.</div>}
      
      <div className="flex justify-start pb-[40px]">
        <button type="submit" disabled={loading} className="px-[16px] py-[8px] border border-text bg-text text-surface rounded-[4px] text-[13px] font-medium hover:bg-[#332F2A] disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

    </form>
  );
}
