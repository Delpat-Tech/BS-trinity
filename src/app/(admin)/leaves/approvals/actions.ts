'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { LeaveEntry } from '@/models/LeaveEntry';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function approveLeave(leaveId: string) {
  try {
    await requireSession();
    await dbConnect();

    const session = await getServerSession(authOptions);
    const user = await User.findOne({ username: session?.user?.name }).lean();
    if (!user) return { error: 'User not found' };

    await LeaveEntry.findByIdAndUpdate(leaveId, {
      status: 'approved',
      actionedBy: user._id,
      actionedAt: new Date()
    });

    revalidatePath('/leaves/approvals');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to approve leave' };
  }
}

export async function rejectLeave(leaveId: string, reason?: string) {
  try {
    await requireSession();
    await dbConnect();

    const session = await getServerSession(authOptions);
    const user = await User.findOne({ username: session?.user?.name }).lean();
    if (!user) return { error: 'User not found' };

    await LeaveEntry.findByIdAndUpdate(leaveId, {
      status: 'rejected',
      rejectionReason: reason || 'Rejected by administrator',
      actionedBy: user._id,
      actionedAt: new Date()
    });

    revalidatePath('/leaves/approvals');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to reject leave' };
  }
}

export async function updateAndApproveLeave(leaveId: string, data: { date: string; kind: 'paid' | 'unpaid' | 'half'; note?: string }) {
  try {
    await requireSession();
    await dbConnect();

    const session = await getServerSession(authOptions);
    const user = await User.findOne({ username: session?.user?.name }).lean();
    if (!user) return { error: 'User not found' };

    await LeaveEntry.findByIdAndUpdate(leaveId, {
      date: data.date,
      kind: data.kind,
      note: data.note,
      status: 'approved',
      actionedBy: user._id,
      actionedAt: new Date()
    });

    revalidatePath('/leaves/approvals');
    return { success: true };
  } catch (err: any) {
    if (err.code === 11000) {
      return { error: 'An entry for this date already exists for this employee. Please delete the existing leave first.' };
    }
    return { error: err.message || 'Failed to update and approve leave' };
  }
}

export async function bulkApproveLeaves(leaveIds: string[]) {
  try {
    await requireSession();
    await dbConnect();

    const session = await getServerSession(authOptions);
    const user = await User.findOne({ username: session?.user?.name }).lean();
    if (!user) return { error: 'User not found' };

    await LeaveEntry.updateMany(
      { _id: { $in: leaveIds } },
      {
        status: 'approved',
        actionedBy: user._id,
        actionedAt: new Date()
      }
    );

    revalidatePath('/leaves/approvals');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to bulk approve leaves' };
  }
}

export async function bulkRejectLeaves(leaveIds: string[], reason?: string) {
  try {
    await requireSession();
    await dbConnect();

    const session = await getServerSession(authOptions);
    const user = await User.findOne({ username: session?.user?.name }).lean();
    if (!user) return { error: 'User not found' };

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
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to bulk reject leaves' };
  }
}
