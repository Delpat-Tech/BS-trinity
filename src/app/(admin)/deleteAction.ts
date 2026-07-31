'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import { AttendanceDay } from '@/models/AttendanceDay';
import { Import } from '@/models/Import';
import { LedgerEntry } from '@/models/LedgerEntry';
import { PayrollInput } from '@/models/PayrollInput';
import { PayrollLine } from '@/models/PayrollLine';
import { revalidatePath } from 'next/cache';

export async function deletePeriodAction(periodId: string) {
  await requireSession();
  await dbConnect();

  // 1. Delete all AttendanceDay records connected to this period
  await AttendanceDay.deleteMany({ periodId });

  // 2. Delete all Import records connected to this period
  await Import.deleteMany({ periodId });

  // 3. Delete all LedgerEntry deductions connected to this period
  await LedgerEntry.deleteMany({ periodId, type: 'deduction' });

  // 4. Delete all PayrollInput records connected to this period
  await PayrollInput.deleteMany({ periodId });

  // 5. Delete all PayrollLine records connected to this period
  await PayrollLine.deleteMany({ periodId });

  // 6. Finally, delete the Period record itself
  await Period.findByIdAndDelete(periodId);

  revalidatePath('/');
}
