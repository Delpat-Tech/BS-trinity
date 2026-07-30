'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import { Settings } from '@/models/Settings';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function openPeriod(formData: FormData) {
  await requireSession();
  await dbConnect();

  const month = parseInt(formData.get('month') as string, 10);
  const year = parseInt(formData.get('year') as string, 10);
  const divisorDays = parseFloat(formData.get('divisorDays') as string);

  if (isNaN(month) || isNaN(year) || isNaN(divisorDays)) {
    throw new Error('Invalid input data');
  }

  // Ensure Period does not already exist
  const existing = await Period.findOne({ month, year });
  if (existing) {
    throw new Error('Period already exists for this month and year');
  }

  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      ruleset: {
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
      }
    });
  }

  const period = await Period.create({
    month,
    year,
    divisorDays,
    ruleset: settings.ruleset
  });

  revalidatePath('/');
  redirect(`/period/${period._id.toString()}`);
}
