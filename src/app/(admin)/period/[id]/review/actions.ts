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
  try {
    await requireSession();
    await dbConnect();
    
    const allowedFields = ['ewDays', 'incentive', 'bonus', 'advanceDeduction', 'latePunchAmt', 'otherDebit'];
    if (!allowedFields.includes(field)) {
      return { error: 'Invalid field' };
    }

    await PayrollInput.findOneAndUpdate(
      { periodId, employeeId },
      { $set: { [field]: value } },
      { upsert: true, new: true }
    );

    revalidatePath(`/period/${periodId}/review`);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update payroll input' };
  }
}

export async function lockPeriod(periodId: string) {
  try {
    await requireSession();
    await dbConnect();
    
    const { runPayrollCycle } = await import('@/lib/payroll/compute');
    const { lines, exceptions } = await runPayrollCycle(periodId);
    
    if (exceptions.length > 0) {
      return { error: 'Cannot lock a period with exceptions' };
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

    const periodDoc = await Period.findById(periodId).lean();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const periodName = periodDoc ? `${monthNames[periodDoc.month - 1]} ${periodDoc.year}` : periodId;

    // 2. Write Ledger deductions for advances
    const deductions = lines.filter(l => l.advanceDeduction > 0).map(l => ({
      employeeId: l.employeeId,
      date: new Date(),
      type: 'deduction',
      amount: l.advanceDeduction,
      note: `Advance deduction for ${periodName}`,
      periodId,
      loggedBy: user?._id
    }));
    if (deductions.length > 0) {
      await LedgerEntry.insertMany(deductions);
    }

    // 3. Mark Period as locked
    await Period.findByIdAndUpdate(periodId, { 
      $set: { 
        status: 'locked',
        lockedAt: new Date(),
        lockedBy: user?._id
      } 
    });

    revalidatePath(`/period/${periodId}/review`);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to lock period' };
  }
}

export async function unlockPeriod(periodId: string, reason: string) {
  try {
    await requireSession();
    await dbConnect();

    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      return { error: 'Unlock reason is required' };
    }

    const { Period } = await import('@/models/Period');
    const { PayrollLine } = await import('@/models/PayrollLine');
    const { LedgerEntry } = await import('@/models/LedgerEntry');
    const { User } = await import('@/models/User');
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');

    const session = await getServerSession(authOptions);
    const user = await User.findOne({ username: session?.user?.name }).lean();
    const userId = user?._id || null;

    const period = await Period.findById(periodId);
    if (!period) return { error: 'Period not found' };
    if (period.status !== 'locked') {
      return { error: 'Period is not locked' };
    }

    // 1. Delete PayrollLines
    await PayrollLine.deleteMany({ periodId });

    // 2. Revert Ledger deductions
    await LedgerEntry.deleteMany({ periodId, type: 'deduction' });

    // 3. Revert Period status and save unlock audit details to DB
    await Period.findByIdAndUpdate(
      periodId,
      { 
        $set: { 
          status: 'review',
          unlockReason: trimmedReason,
          unlockedAt: new Date(),
          unlockedBy: userId
        },
        $push: {
          unlockHistory: {
            reason: trimmedReason,
            unlockedAt: new Date(),
            unlockedBy: userId
          }
        }
      }
    );

    revalidatePath(`/period/${periodId}/review`);
    revalidatePath(`/period/${periodId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to unlock period' };
  }
}
