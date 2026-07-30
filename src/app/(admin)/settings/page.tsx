import dbConnect from '@/lib/db';
import { Settings } from '@/models/Settings';
import { Holiday } from '@/models/Holiday';
import { SettingsForm } from './SettingsForm';
import { HolidayClient } from './HolidayClient';

// We force dynamic to ensure settings aren't cached stale
export const dynamic = 'force-dynamic';

import { Settings as SettingsIcon } from 'lucide-react';

export default async function SettingsPage() {
  await dbConnect();
  const settingsDoc = await Settings.findOne({});
  const ruleset = settingsDoc?.ruleset || {
    shift_start: "09:30",
    shift_end: "19:30",
    grace_until: "09:40",
    half_day_if_in_after: "11:30",
    half_day_if_out_before: "15:30",
    late_strike_window: ["09:41", "11:29"],
    early_strike_window: ["15:31", "19:29"],
    strikes_per_penalty: 3,
    penalty_days_per_trigger: 0.5,
    sandwich_skips_weekly_off: true
  };

  const plainRuleset = JSON.parse(JSON.stringify(ruleset));

  const holidayDocs = await Holiday.find().sort({ date: 1 }).lean();
  const holidays = JSON.parse(JSON.stringify(holidayDocs));

  return (
    <>
      <div className="px-[32px] pt-[28px] pb-[20px] border-b border-border flex flex-col justify-center">
        <h1 className="m-0 text-[24px] font-semibold tracking-tight text-text flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-text-secondary" />
          Global Settings
        </h1>
        <div className="text-[14px] text-text-secondary mt-[4px]">
          Manage the global payroll ruleset. These settings take effect immediately for all unlocked periods.
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-header">
        <div className="p-[32px] flex flex-col gap-[32px]">
          <div>
            <blockquote className="bg-alert-bg border-l-4 border-alert-text px-[16px] py-[12px] text-alert-text text-[13px] italic mb-[20px] shadow-sm">
              Late arrivals are penalised by day deduction. The rupee Late Punch Amount on the payroll sheet is entered manually and is not applied automatically. Do not use both as a policy.
            </blockquote>
            <SettingsForm initialData={plainRuleset} />
          </div>
          
          <HolidayClient holidays={holidays} />
        </div>
      </div>
    </>
  );
}
