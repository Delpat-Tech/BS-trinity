'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Holiday } from '@/models/Holiday';
import { revalidatePath } from 'next/cache';

export async function addHoliday(date: string, name: string, sandwichEligible: boolean, recurrence: string = 'none', isHalfDay: boolean = false) {
  try {
    await requireSession();
    await dbConnect();
    await Holiday.create({ date, name, sandwichEligible, recurrence, isHalfDay });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    if (error.code === 11000) {
      return { error: 'A holiday already exists for this date.' };
    }
    return { error: error.message || 'Failed to add holiday' };
  }
}

export async function deleteHoliday(id: string) {
  try {
    await requireSession();
    await dbConnect();
    await Holiday.findByIdAndDelete(id);
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete holiday' };
  }
}
