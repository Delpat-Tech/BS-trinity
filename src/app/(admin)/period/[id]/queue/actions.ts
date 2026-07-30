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
import mongoose from 'mongoose';
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
  const session = await requireSession();
  
  await dbConnect();
  let user = await User.findOne({ username: session.user?.name }).lean();
  if (!user) {
    user = await User.findOne().lean();
  }
  const userId = user?._id || null;

  const periodObjId = new mongoose.Types.ObjectId(periodId);
  const empNum = Number(employeeId);

  if (action === 'PRESENT' || action === 'HALF_DAY' || action === 'ABSENT') {
    let finalStatus = action === 'PRESENT' ? 'PRESENT' : (action === 'ABSENT' ? 'ABSENT_UNPAID' : 'HALF_DAY');
    
    await AttendanceDay.updateOne(
      { periodId: periodObjId, employeeId: empNum, date },
      { 
        $set: { 
          finalStatus,
          overrideReason: reasonText || `Resolved via queue as ${action}`,
          overriddenBy: userId,
          overriddenAt: new Date()
        } 
      }
    );
  } else if (action === 'PAID_LEAVE') {
    try {
      await LeaveEntry.create({
        employeeId: empNum,
        date,
        kind: 'paid',
        note: reasonText || 'Resolved via queue',
        loggedBy: userId,
        loggedAt: new Date()
      });
    } catch (err) {
      // Ignore duplicates
    }
    
    await AttendanceDay.updateOne(
      { periodId: periodObjId, employeeId: empNum, date },
      { 
        $set: { 
          finalStatus: 'PAID_LEAVE',
          overrideReason: reasonText || 'Resolved as Paid Leave',
          overriddenBy: userId,
          overriddenAt: new Date()
        } 
      }
    );
  }

  revalidatePath(`/period/${periodId}/queue`);
  return { success: true };
}

export async function bulkResolve(periodId: string, targets: { employeeId: string | number, date: string, action: string, note: string }[]) {
  const session = await requireSession();
  
  await dbConnect();
  let user = await User.findOne({ username: session.user?.name }).lean();
  if (!user) {
    user = await User.findOne().lean();
  }
  
  const userId = user?._id || null;

  const updates = [];
  const leaveEntries = [];
  const periodObjId = new mongoose.Types.ObjectId(periodId);

  for (const t of targets) {
    const empNum = Number(t.employeeId);
    if (t.action === 'PRESENT' || t.action === 'HALF_DAY' || t.action === 'ABSENT') {
      let finalStatus = t.action === 'PRESENT' ? 'PRESENT' : (t.action === 'ABSENT' ? 'ABSENT_UNPAID' : 'HALF_DAY');
      
      updates.push({
        updateOne: {
          filter: { periodId: periodObjId, employeeId: empNum, date: t.date },
          update: { 
            $set: { 
              finalStatus,
              overrideReason: t.note || `Bulk resolved as ${t.action}`,
              overriddenBy: userId,
              overriddenAt: new Date()
            } 
          }
        }
      });
    } else if (t.action === 'PAID_LEAVE') {
      leaveEntries.push({
        employeeId: empNum,
        date: t.date,
        kind: 'paid',
        note: t.note || 'Bulk resolved via queue',
        loggedBy: userId,
        loggedAt: new Date()
      });
      
      updates.push({
        updateOne: {
          filter: { periodId: periodObjId, employeeId: empNum, date: t.date },
          update: { 
            $set: { 
              finalStatus: 'PAID_LEAVE',
              overrideReason: t.note || 'Bulk resolved as Paid Leave',
              overriddenBy: userId,
              overriddenAt: new Date()
            } 
          }
        }
      });
    }
  }

  if (leaveEntries.length > 0) {
    try {
      await LeaveEntry.insertMany(leaveEntries, { ordered: false });
    } catch (err) {
      // Ignore duplicates
    }
  }

  if (updates.length > 0) {
    await AttendanceDay.bulkWrite(updates, { ordered: false });
  }

  revalidatePath(`/period/${periodId}/queue`);
  return { success: true };
}
