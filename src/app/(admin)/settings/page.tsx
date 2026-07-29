import dbConnect from '@/lib/db';
import { Settings } from '@/models/Settings';
import { SettingsForm } from './SettingsForm';

// We force dynamic to ensure settings aren't cached stale
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await dbConnect();
  const settingsDoc = await Settings.findOne({});
  const ruleset = settingsDoc?.globalRuleset || {
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

  return (
    <>
      <div className="px-[28px] pt-[20px] pb-[16px] border-b border-border flex flex-col justify-center">
        <h1 className="m-0 text-[18px] font-semibold tracking-[-0.015em]">Global Settings</h1>
        <div className="text-[12.5px] text-text-secondary mt-[2px]">
          Manage the global payroll ruleset. These settings take effect immediately for all unlocked periods.
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-header">
        <div className="p-[28px]">
          <div className="bg-alert-bg border border-alert-border px-[16px] py-[12px] rounded-[4px] text-alert-text text-[13px] mb-[20px]">
            <span className="font-semibold">Important:</span> Day deduction and Rupee debit should not be used simultaneously. 
            If you plan to use Rupee debits on the payroll review screen, set Penalty Days Per Trigger to 0 here.
          </div>

          <SettingsForm initialData={plainRuleset} />
        </div>
      </div>
    </>
  );
}
