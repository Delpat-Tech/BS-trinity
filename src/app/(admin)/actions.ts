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

  // Fetch the global settings to pin the ruleset
  const settings = await Settings.findOne();
  if (!settings) {
    throw new Error('Global settings not found. Please initialize settings first.');
  }

  const period = await Period.create({
    month,
    year,
    divisorDays,
    ruleset: settings.globalRuleset
  });

  revalidatePath('/');
  redirect(`/period/${period._id.toString()}`);
}
