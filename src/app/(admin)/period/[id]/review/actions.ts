'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { PayrollInput } from '@/models/PayrollInput';
import { revalidatePath } from 'next/cache';

export async function updatePayrollInput(
  periodId: string, 
  employeeId: string, 
  field: string, 
  value: number | null
) {
  await requireSession();
  await dbConnect();
  
  const allowedFields = ['ewDays', 'incentive', 'bonus', 'advanceDeduction', 'latePunchAmt', 'otherDebit'];
  if (!allowedFields.includes(field)) {
    throw new Error('Invalid field');
  }

  await PayrollInput.findOneAndUpdate(
    { periodId, employeeId },
    { $set: { [field]: value } },
    { upsert: true, new: true }
  );

  revalidatePath(`/period/${periodId}/review`);
  return { success: true };
}

export async function lockPeriod(periodId: string) {
  await requireSession();
  await dbConnect();
  
  const { runPayrollCycle } = await import('@/lib/payroll/compute');
  const { lines, exceptions } = await runPayrollCycle(periodId);
  
  if (exceptions.length > 0) {
    throw new Error('Cannot lock a period with exceptions');
  }

  const { Period } = await import('@/models/Period');
  const { PayrollLine } = await import('@/models/PayrollLine');
  const { LedgerEntry } = await import('@/models/LedgerEntry');
  const { User } = await import('@/models/User');
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/auth');

  const session = await getServerSession(authOptions);
  const user = await User.findOne({ username: session?.user?.name }).lean();

    // 1. Write PayrollLines
    const linesWithPeriodId = lines.map(l => ({
      ...l,
      periodId
    }));
    await PayrollLine.insertMany(linesWithPeriodId);

    // 2. Write Ledger deductions for advances
    const deductions = lines
      .filter(l => l.advanceDeduction > 0)
      .map(l => ({
        employeeId: l.employeeId,
        periodId: periodId,
        date: new Date().toISOString().split('T')[0], // lock date as string
        type: 'deduction',
        amount: l.advanceDeduction,
        note: `Payroll deduction for period`
      }));
    if (deductions.length > 0) {
      await LedgerEntry.insertMany(deductions);
    }

    // 3. Update Period status
    await Period.findByIdAndUpdate(
      periodId,
      { 
        $set: { 
          status: 'locked',
          lockedAt: new Date(),
          lockedBy: user?._id
        }
      }
    );

  revalidatePath(`/period/${periodId}/review`);
  revalidatePath(`/period/${periodId}`);
  return { success: true };
}

export async function unlockPeriod(periodId: string, reason: string) {
  await requireSession();
  await dbConnect();

  if (!reason) throw new Error('Unlock reason is required');

  const { Period } = await import('@/models/Period');
  const { PayrollLine } = await import('@/models/PayrollLine');
  const { LedgerEntry } = await import('@/models/LedgerEntry');

    // 1. Delete all PayrollLines for this period
    await PayrollLine.deleteMany({ periodId });

    // 2. Delete all deduction LedgerEntries for this period
    await LedgerEntry.deleteMany({ periodId, type: 'deduction' });

    // 3. Revert Period status
    await Period.findByIdAndUpdate(
      periodId,
      { 
        $set: { 
          status: 'review',
          unlockReason: reason
        }
      }
    );

  revalidatePath(`/period/${periodId}/review`);
  revalidatePath(`/period/${periodId}`);
  return { success: true };
}
