'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { runPayrollCycle } from '@/lib/payroll/compute';
import { AttendanceDay } from '@/models/AttendanceDay';
import { LeaveEntry } from '@/models/LeaveEntry';
import { Employee } from '@/models/Employee';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/User';

export async function getQueueExceptions(periodId: string) {
  await requireSession();
  
  // Compute exceptions from facts
  const { exceptions } = await runPayrollCycle(periodId);
  
  if (exceptions.length === 0) return [];

  // Need to map employeeId to names and raw punches
  const employeeIds = [...new Set(exceptions.map(e => e.employeeId))];
  const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();
  const employeeMap = new Map(employees.map(e => [e._id.toString(), e]));

  // Also fetch raw AttendanceDay records to show raw punches for the exceptions
  const dates = [...new Set(exceptions.map(e => e.date))];
  const attendances = await AttendanceDay.find({
    periodId,
    employeeId: { $in: employeeIds },
    date: { $in: dates }
  }).lean();
  
  const attMap = new Map();
  attendances.forEach(a => {
    attMap.set(`${a.employeeId.toString()}_${a.date}`, a);
  });

  return exceptions.map(ex => {
    const emp = employeeMap.get(ex.employeeId.toString()) as any;
    const att = attMap.get(`${ex.employeeId.toString()}_${ex.date}`);
    return {
      employeeId: ex.employeeId.toString(),
      date: ex.date,
      reason: ex.reason,
      employeeName: emp ? emp.name : 'Unknown',
      machineId: emp ? emp.machineId : null,
      inTime: att?.inTime || null,
      outTime: att?.outTime || null,
      machineStatus: att?.machineStatus || null,
    };
  });
}

export async function resolveException(
  periodId: string, 
  employeeId: string, 
  date: string, 
  action: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'PAID_LEAVE',
  reasonText?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) throw new Error('Unauthorized');
  
  await dbConnect();
  
  const user = await User.findOne({ username: session.user.name }).lean();
  if (!user) throw new Error('User not found');

  if (action === 'PRESENT' || action === 'HALF_DAY' || action === 'ABSENT') {
    let finalStatus = action === 'PRESENT' ? 'P' : (action === 'ABSENT' ? 'A' : 'HALF_DAY');
    
    await AttendanceDay.updateOne(
      { periodId, employeeId, date },
      { 
        $set: { 
          finalStatus,
          overrideReason: reasonText || `Resolved via queue as ${action}`,
          overriddenBy: user._id,
          overriddenAt: new Date()
        } 
      }
    );
  } else if (action === 'PAID_LEAVE') {
    // Create a leave entry instead of overriding finalStatus
    // Wait, the spec says we create a leave entry. But we also need to ensure AttendanceDay finalStatus is untouched.
    // If the machine marked them A, and we add a paid leave, the engine converts A + Paid Leave to PAID_LEAVE.
    await LeaveEntry.create({
      employeeId,
      date,
      kind: 'paid',
      note: reasonText || 'Resolved via queue',
      loggedBy: user._id,
      loggedAt: new Date()
    });
  }

  revalidatePath(`/period/${periodId}/queue`);
  return { success: true };
}

export async function bulkMarkPresent(periodId: string, exceptions: { employeeId: string, date: string }[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) throw new Error('Unauthorized');
  
  await dbConnect();
  const user = await User.findOne({ username: session.user.name }).lean();
  
  const updates = exceptions.map(ex => ({
    updateOne: {
      filter: { periodId, employeeId: ex.employeeId, date: ex.date, finalStatus: null },
      update: { 
        $set: { 
          finalStatus: 'P',
          overrideReason: 'Bulk marked present',
          overriddenBy: user?._id,
          overriddenAt: new Date()
        } 
      }
    }
  }));

  if (updates.length > 0) {
    await AttendanceDay.bulkWrite(updates);
  }

  revalidatePath(`/period/${periodId}/queue`);
  return { success: true };
}
