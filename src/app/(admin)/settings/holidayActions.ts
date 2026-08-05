'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Holiday } from '@/models/Holiday';
import { revalidatePath } from 'next/cache';

export async function addHoliday(date: string, name: string, sandwichEligible: boolean, recurrence: string = 'none', isHalfDay: boolean = false) {
  await requireSession();
  await dbConnect();

  try {
    await Holiday.create({ date, name, sandwichEligible, recurrence, isHalfDay });
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('A holiday already exists for this date.');
    }
    throw error;
  }

  revalidatePath('/settings');
}

export async function deleteHoliday(id: string) {
  await requireSession();
  await dbConnect();

  await Holiday.findByIdAndDelete(id);
  revalidatePath('/settings');
}
