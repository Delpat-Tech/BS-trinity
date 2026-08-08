'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { LedgerEntry } from '@/models/LedgerEntry';
import { revalidatePath } from 'next/cache';

export async function logLedgerEntry(
  employeeId: string, 
  date: string, 
  type: 'opening' | 'advance', 
  amount: number, 
  note: string
) {
  try {
    await requireSession();
    await dbConnect();

    if (amount <= 0 || !Number.isInteger(amount)) {
      return { error: 'Amount must be a positive integer in rupees' };
    }

    await LedgerEntry.create({
      employeeId,
      periodId: null,
      date,
      type,
      amount,
      note
    });

    revalidatePath(`/employees/${employeeId}/ledger`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
}

export async function deleteLedgerEntry(employeeId: string, entryId: string) {
  try {
    await requireSession();
    await dbConnect();
    
    await LedgerEntry.findOneAndDelete({ _id: entryId, employeeId, type: { $in: ['opening', 'advance'] } });
    
    revalidatePath(`/employees/${employeeId}/ledger`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
}
