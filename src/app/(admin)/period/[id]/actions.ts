'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import { Import } from '@/models/Import';
import { Employee } from '@/models/Employee';
import { AttendanceDay } from '@/models/AttendanceDay';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseBiometricFile } from '@/lib/parser/biometric';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { runPayrollCycle } from '@/lib/payroll/compute';

export async function uploadBiometrics(periodId: string, formData: FormData) {
  await requireSession();
  await dbConnect();

  const period = await Period.findById(periodId);
  if (!period) throw new Error('Period not found');
  if (period.status === 'locked') throw new Error('Period is locked');

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file uploaded');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Hash check
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  const existingImport = await Import.findOne({ periodId, fileHash });
  if (existingImport) {
    throw new Error('This exact file has already been uploaded for this period.');
  }

  // Parse file
  const res = parseBiometricFile(buffer, period.month, period.year);
  if (!res.ok) {
    throw new Error(res.errors?.join(', ') || 'Failed to parse file');
  }
  
  const records = res.days;

  // Find all active employees
  const employees = await Employee.find({ isIgnored: false }).lean();
  const employeeMap = new Map(); // machineId -> employeeId (string)
  employees.forEach(emp => {
    employeeMap.set(emp.machineId, emp._id.toString());
  });

  // Identify unmapped and missing
  const unmappedMachineIds = new Set<number>();
  const fileMachineIds = new Set<number>();

  const attendanceDocs = [];

  for (const record of records) {
    fileMachineIds.add(record.machineId);
    
    const empId = employeeMap.get(record.machineId);
    if (!empId) {
      unmappedMachineIds.add(record.machineId);
      continue;
    }

    attendanceDocs.push({
      periodId: period._id,
      employeeId: empId,
      date: record.date,
      shift: record.shift,
      inTime: record.inTime,
      outTime: record.outTime,
      durationMins: record.durationMins,
      machineStatus: record.machineStatus,
      resolved: true // Will update to false if missing data causes an exception in T6
    });
  }

  // Check missing employees
  const missingEmployees = [];
  for (const emp of employees) {
    if (!fileMachineIds.has(emp.machineId)) {
      missingEmployees.push(emp);
    }
  }

  // Insert AttendanceDays safely
  // If we want to overwrite existing records for this period, maybe we should clear them first? 
  // Wait, the spec says "It completely wipes the PayrollRecord and AttendanceDay for that month/year, parses the uploaded .xls".
  // Actually, wait: we might want to clear only the existing AttendanceDays for this period that we are about to overwrite? 
  // Let's clear ALL AttendanceDays for this period before inserting.
  await AttendanceDay.deleteMany({ periodId: period._id });
  
  let recordsCreated = 0;
  if (attendanceDocs.length > 0) {
    const result = await AttendanceDay.insertMany(attendanceDocs, { ordered: false });
    recordsCreated = result.length;
  }

  // Store import document
  await Import.create({
    periodId: period._id,
    fileName: file.name,
    fileHash,
    recordsCreated
  });

  revalidatePath(`/period/${periodId}`);

  return {
    success: true,
    recordsCreated,
    unmappedCodes: Array.from(unmappedMachineIds),
    missingEmployees: missingEmployees.map(e => ({ name: e.name, machineId: e.machineId }))
  };
}

export async function checkExceptions(periodId: string) {
  await requireSession();
  
  try {
    const { exceptions } = await runPayrollCycle(periodId);
    
    // Also mark these exception days as unresolved in the DB, so the Queue knows what to fetch
    // First reset all to resolved=true for this period
    await AttendanceDay.updateMany({ periodId }, { $set: { resolved: true } });
    
    // Then mark exceptions as resolved=false
    // exceptions output from computePayroll is usually { employeeId, date, reason }
    const exceptionUpdates = exceptions.map(ex => ({
      updateOne: {
        filter: { periodId, employeeId: ex.employeeId, date: ex.date },
        update: { $set: { resolved: false } }
      }
    }));
    
    if (exceptionUpdates.length > 0) {
      await AttendanceDay.bulkWrite(exceptionUpdates);
    }
    
    return {
      success: true,
      count: exceptions.length,
      exceptions
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to check exceptions');
  }
}

export async function bulkMarkPresentByDate(periodId: string, date: string, reason: string) {
  await requireSession();
  await dbConnect();
  
  const session = await getServerSession(authOptions);
  const user = await User.findOne({ email: session?.user?.email }).lean();

  // 1. Run the engine to get all computed lines and exceptions
  const { lines, exceptions } = await runPayrollCycle(periodId);
  
  // 2. Identify employees who on this DATE have:
  //    - An EXCEPTION
  //    - OR are marked ABSENT_UNPAID in their computed payroll lines (wait, lines doesn't give us daily breakdown, but engine.ts might not export daily breakdown...
  // Wait, let's look at how the engine does it. 
  // Actually, for a single day, if the engine found an exception, it's in the `exceptions` array.
  // If the engine computed it as ABSENT_UNPAID, it's NOT an exception.
  // But wait, if they have NO punch (which means no AttendanceDay record, or machineStatus='A' with no leave), they are ABSENT_UNPAID.
  // The spec says: "only applies to days whose computed status is ABSENT_UNPAID or EXCEPTION and whose finalStatus is null. Days with real punches are never touched."
  // A day with "real punches" means they have an AttendanceDay with machineStatus P, WO, WOP, or they have inTime/outTime.
  // If we want to safely mark everyone present who didn't work (absent) or had an exception (orphan punch),
  // we can just update all AttendanceDay records for this date where `finalStatus` is null AND `machineStatus` is 'A' (which is absent with no punch),
  // OR where they are in the `exceptions` array for this date.
  
  const exceptionEmpIds = exceptions.filter(e => e.date === date).map(e => e.employeeId);
  
  // We can just run an updateMany:
  // Update any AttendanceDay for this date, where finalStatus is null, AND 
  // (machineStatus === 'A' OR employeeId is in exceptionEmpIds)
  const result = await AttendanceDay.updateMany(
    {
      periodId,
      date,
      finalStatus: null,
      $or: [
        { machineStatus: 'A' },
        { employeeId: { $in: exceptionEmpIds } }
      ]
    },
    {
      $set: {
        finalStatus: 'P',
        overrideReason: reason || 'Bulk marked present for date',
        overriddenBy: user?._id,
        overriddenAt: new Date()
      }
    }
  );

  revalidatePath(`/period/${periodId}`);
  return { success: true, count: result.modifiedCount };
}


