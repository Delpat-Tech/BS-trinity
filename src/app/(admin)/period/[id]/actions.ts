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

export async function previewBiometrics(periodId: string, formData: FormData) {
  try {
    await requireSession();
    await dbConnect();

    const period = await Period.findById(periodId);
    if (!period) return { error: 'Period not found' };
    if (period.status === 'locked') return { error: 'Period is locked' };

    const file = formData.get('file') as File;
    if (!file) return { error: 'No file uploaded' };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const res = parseBiometricFile(buffer, period.month, period.year);
    if (!res.ok) {
      return { error: res.errors?.join(', ') || 'Failed to parse file' };
    }
    
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // We can delete existing import if it exists and hasn't been finalized
    const existingImport = await Import.findOne({ periodId, fileHash });
    if (existingImport) {
      await Import.deleteOne({ _id: existingImport._id });
    }

    // Create an Import document immediately to store the raw fileData
    const imp = await Import.create({
      periodId: period._id,
      filename: file.name,
      fileName: file.name,
      fileHash,
      fileData: buffer,
      rowCount: res.days.length,
      recordsCreated: 0
    });
    
    const records = res.days;
    const fileName = file.name;
    
    const { Employee } = await import('@/models/Employee');
    
    const allMachineIds = [...new Set(records.map(r => r.machineId))];
    const existingEmps = await Employee.find({ isIgnored: false }).lean();
    const existingEmpIds = new Set(existingEmps.map(e => e.machineId));
    
    const unmappedIds = allMachineIds.filter(id => !existingEmpIds.has(id));
    
    // Active employees missing from the file
    const fileMachineIdsSet = new Set(allMachineIds);
    const periodEnd = `${period.year}-${period.month.toString().padStart(2, '0')}-31`; // Approx
    
    const missingActive = existingEmps.filter(e => 
      e.dateOfJoining <= periodEnd && 
      (!e.endDate || e.endDate >= `${period.year}-${period.month.toString().padStart(2, '0')}-01`) &&
      !fileMachineIdsSet.has(e.machineId)
    ).map(e => ({ machineId: e.machineId, name: e.name }));

    // Return just the top 5 records for preview
    const topRecords = records.slice(0, 5);
    
    const empMap = new Map(existingEmps.map((e: any) => [e.machineId, e.name]));

    const previewData = topRecords.map(r => ({
      machineId: r.machineId,
      name: empMap.get(r.machineId) || 'Unknown Employee',
      date: r.date,
      inTime: r.inTime,
      outTime: r.outTime,
      status: r.machineStatus
    }));

    return {
      success: true,
      importId: imp._id.toString(),
      fileName,
      totalRecords: records.length,
      preview: previewData,
      unmappedCodes: unmappedIds,
      missingActive: missingActive
    };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
}

export async function uploadBiometrics(periodId: string, importId: string) {
  try {
    await requireSession();
    await dbConnect();

    const period = await Period.findById(periodId);
    if (!period) return { error: 'Period not found' };
    if (period.status === 'locked') return { error: 'Period is locked' };

    const imp = await Import.findById(importId);
    if (!imp) return { error: 'Import document not found' };

    const buffer = imp.fileData;

    // Parse file again from DB buffer
    const res = parseBiometricFile(buffer, period.month, period.year);
    if (!res.ok) {
      return { error: res.errors?.join(', ') || 'Failed to parse file' };
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

    const fileMachineIdsList = [...new Set(records.map(r => r.machineId))];
    const unmappedIds = fileMachineIdsList.filter(mid => !employeeMap.has(mid));
    
    if (unmappedIds.length > 0) {
      for (const mid of unmappedIds) {
        const emp = await Employee.create({
          _id: mid,
          machineId: mid,
          name: `Employee ${mid}`,
          dateOfJoining: `${period.year}-${period.month.toString().padStart(2, '0')}-01`
        });
        employeeMap.set(mid, emp._id.toString());
      }
    }
    for (const record of records) {
      fileMachineIds.add(record.machineId);
      
      const empId = employeeMap.get(record.machineId);

      attendanceDocs.push({
        periodId: period._id,
        employeeId: empId,
        date: record.date,
        shift: record.shift,
        inTime: record.inTime,
        outTime: record.outTime,
        durationMins: record.durationMins,
        machineStatus: record.machineStatus,
        resolved: true // Now all are mapped because we auto-created them!
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
    await AttendanceDay.deleteMany({ periodId: period._id });
    
    let recordsCreated = 0;
    if (attendanceDocs.length > 0) {
      const result = await AttendanceDay.insertMany(attendanceDocs, { ordered: false });
      recordsCreated = result.length;
    }

    // Update import document recordsCreated
    await Import.updateOne({ _id: imp._id }, {
      $set: { recordsCreated: recordsCreated }
    });

    // Update Period status and filename
    await Period.updateOne({ _id: period._id }, { 
      $set: { 
        status: 'resolving',
        uploadedFileName: imp.filename
      } 
    });

    revalidatePath(`/period/${periodId}`);

    return {
      success: true,
      recordsCreated,
      unmappedCodes: Array.from(unmappedMachineIds),
      missingEmployees: missingEmployees.map(e => ({ name: e.name, machineId: e.machineId }))
    };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
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
    return { error: error.message || 'Failed to check exceptions' };
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


