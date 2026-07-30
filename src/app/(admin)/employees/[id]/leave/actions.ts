'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { LeaveEntry } from '@/models/LeaveEntry';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function addLeave(employeeId: string, date: string, kind: 'paid' | 'unpaid' | 'half', note: string) {
  await requireSession();
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = await User.findOne({ username: session?.user?.name }).lean();

  if (!user) throw new Error('User not found');

  try {
    await LeaveEntry.create({
      employeeId,
      date,
      kind,
      note,
      loggedBy: user._id,
      loggedAt: new Date()
    });
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('A leave entry already exists for this date.');
    }
    throw error;
  }

  revalidatePath(`/employees/${employeeId}/leave`);
}

export async function deleteLeave(employeeId: string, leaveId: string) {
  await requireSession();
  await dbConnect();

  await LeaveEntry.findOneAndDelete({ _id: leaveId, employeeId });
  revalidatePath(`/employees/${employeeId}/leave`);
}
