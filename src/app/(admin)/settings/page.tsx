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

  // Convert to plain object
  const plainRuleset = JSON.parse(JSON.stringify(ruleset));

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Global Settings</h1>
      <p className="text-slate-500 mb-8">
        Manage the global payroll ruleset. These settings take effect immediately for all unlocked periods.
      </p>
      
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 text-amber-800 text-sm">
        <strong>Important:</strong> Day deduction and Rupee debit should not be used simultaneously. 
        If you plan to use Rupee debits on the payroll review screen, set Penalty Days Per Trigger to 0 here.
      </div>

      <SettingsForm initialData={plainRuleset} />
    </div>
  );
}
