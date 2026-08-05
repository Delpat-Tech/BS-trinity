'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { LeaveEntry } from '@/models/LeaveEntry';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function approveLeave(leaveId: string) {
  await requireSession();
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = await User.findOne({ username: session?.user?.name }).lean();
  if (!user) throw new Error('User not found');

  await LeaveEntry.findByIdAndUpdate(leaveId, {
    status: 'approved',
    actionedBy: user._id,
    actionedAt: new Date()
  });

  revalidatePath('/leaves/approvals');
}

export async function rejectLeave(leaveId: string, reason?: string) {
  await requireSession();
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = await User.findOne({ username: session?.user?.name }).lean();
  if (!user) throw new Error('User not found');

  await LeaveEntry.findByIdAndUpdate(leaveId, {
    status: 'rejected',
    rejectionReason: reason || 'Rejected by administrator',
    actionedBy: user._id,
    actionedAt: new Date()
  });

  revalidatePath('/leaves/approvals');
}

export async function updateAndApproveLeave(leaveId: string, data: { date: string; kind: 'paid' | 'unpaid' | 'half'; note?: string }) {
  await requireSession();
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = await User.findOne({ username: session?.user?.name }).lean();
  if (!user) throw new Error('User not found');

  await LeaveEntry.findByIdAndUpdate(leaveId, {
    date: data.date,
    kind: data.kind,
    note: data.note,
    status: 'approved',
    actionedBy: user._id,
    actionedAt: new Date()
  });

  revalidatePath('/leaves/approvals');
}

export async function bulkApproveLeaves(leaveIds: string[]) {
  await requireSession();
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = await User.findOne({ username: session?.user?.name }).lean();
  if (!user) throw new Error('User not found');

  await LeaveEntry.updateMany(
    { _id: { $in: leaveIds } },
    {
      status: 'approved',
      actionedBy: user._id,
      actionedAt: new Date()
    }
  );

  revalidatePath('/leaves/approvals');
}

export async function bulkRejectLeaves(leaveIds: string[], reason?: string) {
  await requireSession();
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = await User.findOne({ username: session?.user?.name }).lean();
  if (!user) throw new Error('User not found');

  await LeaveEntry.updateMany(
    { _id: { $in: leaveIds } },
    {
      status: 'rejected',
      rejectionReason: reason || 'Bulk rejected by administrator',
      actionedBy: user._id,
      actionedAt: new Date()
    }
  );

  revalidatePath('/leaves/approvals');
}
