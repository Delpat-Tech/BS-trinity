'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings } from '@/models/Settings';
import { revalidatePath } from 'next/cache';

export async function updateSettings(data: {
  shift_start: string;
  shift_end: string;
  grace_until: string;
  half_day_if_in_after: string;
  half_day_if_out_before: string;
  strikes_per_penalty: number;
  penalty_days_per_trigger: number;
  sandwich_skips_weekly_off: boolean;
}) {
  await requireSession();
  await dbConnect();

  // Settings collection only has one document. We update it or create if it doesn't exist.
  const existing = await Settings.findOne({});
  if (existing) {
    existing.globalRuleset = data;
    await existing.save();
  } else {
    await Settings.create({ globalRuleset: data });
  }

  revalidatePath('/settings');
  return { success: true };
}
