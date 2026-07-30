'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { LeaveEntry } from '@/models/LeaveEntry';
import { LedgerEntry } from '@/models/LedgerEntry';
import { AttendanceDay } from '@/models/AttendanceDay';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';

export async function createEmployee(data: {
  machineId: number;
  name: string;
  designation?: string;
  mobileNumber?: string;
  paymentMode?: string;
  dateOfJoining: string;
  endDate?: string;
  isIgnored: boolean;
  fixedSalary: number;
  effectiveFrom?: string;
  aadharNumber?: string;
  panNumber?: string;
  bankAccount?: string;
  ifsc?: string;
  weeklyOff?: number;
}) {
  await requireSession();
  await dbConnect();

  const existing = await Employee.findOne({ machineId: data.machineId });
  if (existing) {
    throw new Error('Employee with this Machine ID already exists');
  }

  await Employee.create({
    _id: data.machineId,
    machineId: data.machineId,
    name: data.name,
    designation: data.designation,
    mobileNumber: data.mobileNumber,
    paymentMode: data.paymentMode,
    dateOfJoining: data.dateOfJoining,
    endDate: data.endDate || null,
    isIgnored: data.isIgnored,
    aadharNumber: data.aadharNumber,
    panNumber: data.panNumber,
    bankAccount: data.bankAccount,
    ifsc: data.ifsc,
    weeklyOff: data.weeklyOff !== undefined ? Number(data.weeklyOff) : 0,
    salaryRevisions: [{
      fixedSalary: data.fixedSalary,
      effectiveFrom: data.effectiveFrom || data.dateOfJoining
    }]
  });

  revalidatePath('/employees');
  return { success: true };
}

export async function updateEmployee(id: number, data: {
  name: string;
  designation?: string;
  mobileNumber?: string;
  paymentMode?: string;
  dateOfJoining: string;
  endDate?: string;
  isIgnored: boolean;
  fixedSalary: number;
  effectiveFrom: string;
  aadharNumber?: string;
  panNumber?: string;
  bankAccount?: string;
  ifsc?: string;
  weeklyOff?: number;
}) {
  await requireSession();
  await dbConnect();

  const emp = await Employee.findById(id);
  if (!emp) throw new Error('Employee not found');

  emp.name = data.name;
  emp.designation = data.designation;
  emp.mobileNumber = data.mobileNumber;
  emp.paymentMode = data.paymentMode;
  emp.dateOfJoining = data.dateOfJoining;
  emp.endDate = data.endDate || null;
  emp.isIgnored = data.isIgnored;
  emp.aadharNumber = data.aadharNumber;
  emp.panNumber = data.panNumber;
  emp.bankAccount = data.bankAccount;
  emp.ifsc = data.ifsc;
  emp.weeklyOff = data.weeklyOff !== undefined ? Number(data.weeklyOff) : 0;

  // Check if we need to add a new salary revision
  const latestRev = [...emp.salaryRevisions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  
  if (!latestRev || latestRev.fixedSalary !== data.fixedSalary) {
    // If effective date already exists, update it, else append
    const existingDateRev = emp.salaryRevisions.find((r: any) => r.effectiveFrom === data.effectiveFrom);
    if (existingDateRev) {
      existingDateRev.fixedSalary = data.fixedSalary;
    } else {
      emp.salaryRevisions.push({
        fixedSalary: data.fixedSalary,
        effectiveFrom: data.effectiveFrom || new Date().toISOString().split('T')[0]
      });
    }
  }

  await emp.save();
  revalidatePath('/employees');
  return { success: true };
}

export async function addLeave(machineId: number, data: { date: string; kind: 'paid' | 'unpaid' | 'half'; note?: string }) {
  await requireSession();
  await dbConnect();
  
  const emp = await Employee.findOne({ machineId });
  if (!emp) throw new Error('Employee not found');

  await LeaveEntry.create({
    employeeId: emp._id,
    date: data.date,
    kind: data.kind,
    note: data.note || ''
  });
  
  revalidatePath('/employees');
}

export async function addAdvance(machineId: number, data: { date: string; amount: number; note: string }) {
  await requireSession();
  await dbConnect();
  
  const emp = await Employee.findOne({ machineId });
  if (!emp) throw new Error('Employee not found');

  await LedgerEntry.create({
    employeeId: emp._id,
    date: data.date,
    type: 'advance',
    amount: data.amount,
    note: data.note
  });
  
  revalidatePath('/employees');
}

export async function getEmployeeDetails(employeeId: any) {
  await requireSession();
  await dbConnect();

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw new Error('Employee not found');

  const leaves = await LeaveEntry.find({ employeeId }).sort({ date: -1 }).lean();
  const ledger = await LedgerEntry.find({ employeeId }).sort({ date: -1, createdAt: -1 }).lean();
  const history = await AttendanceDay.find({ employeeId }).sort({ date: -1 }).limit(100).lean();

  return { 
    employee: JSON.parse(JSON.stringify(employee)), 
    leaves: JSON.parse(JSON.stringify(leaves)), 
    ledger: JSON.parse(JSON.stringify(ledger)), 
    history: JSON.parse(JSON.stringify(history)) 
  };
}

export async function uploadEmployeeMaster(formData: FormData) {
  await requireSession();
  await dbConnect();

  const file = formData.get('file') as File;
  if (!file) return { success: false, error: 'No file uploaded' };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) return { success: false, error: 'No sheet found' };

    const rows = XLSX.utils.sheet_to_json<any>(sheet);
    if (!rows || rows.length === 0) return { success: false, error: 'File is empty' };

    // Get max machineId to generate temporary ones
    const highestEmp = await Employee.findOne().sort({ machineId: -1 }).lean();
    let nextMachineId = highestEmp && highestEmp.machineId >= 90000 ? highestEmp.machineId + 1 : 90001;

    const ops = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const machineIdStr = row['Machine ID'] || row['Emp ID'] || row['ID'];
      const name = row['Name'] || row['Employee Name'] || row['Employee'];
      const dojRaw = row['Date of Joining'] || row['DOJ'] || row['Joining Date'];
      const salaryRaw = row['Salary'] || row['Base Salary'] || row['Net Salary'];

      if (!name || !dojRaw || !salaryRaw) {
        continue;
      }

      let machineId;
      if (machineIdStr) {
        machineId = parseInt(String(machineIdStr).trim(), 10);
        if (isNaN(machineId)) machineId = nextMachineId++;
      } else {
        machineId = nextMachineId++;
      }

      let doj = String(dojRaw).trim();
      // If it's a number, it's an excel serial date
      if (typeof dojRaw === 'number') {
        const d = XLSX.SSF.parse_date_code(dojRaw);
        if (d) {
          doj = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
        }
      }

      const salary = parseFloat(String(salaryRaw).replace(/[^\d.-]/g, ''));
      if (isNaN(salary)) continue;

      ops.push({
        updateOne: {
          filter: { machineId },
          update: {
            $set: {
              name,
              dateOfJoining: doj
            },
            $setOnInsert: {
              _id: machineId,
              isIgnored: false,
              weeklyOff: 0,
              salaryRevisions: [{
                fixedSalary: salary,
                effectiveFrom: doj
              }]
            }
          },
          upsert: true
        }
      });
    }

    if (ops.length > 0) {
      await Employee.bulkWrite(ops, { ordered: false });
    }

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMachineId(employeeId: number, newMachineId: number) {
  await requireSession();
  await dbConnect();
  
  try {
    if (!newMachineId || isNaN(newMachineId)) {
      throw new Error('Invalid Machine ID');
    }

    // Check if new ID already exists
    const existing = await Employee.findOne({ machineId: newMachineId });
    if (existing && existing._id !== employeeId) {
      throw new Error('An employee with this Machine ID already exists');
    }

    // Update employee
    await Employee.updateOne(
      { _id: employeeId },
      { $set: { machineId: newMachineId } }
    );

    // Update related records
    await AttendanceDay.updateMany(
      { employeeId: employeeId },
      { $set: { employeeId: newMachineId } }
    );

    await LeaveEntry.updateMany(
      { employeeId: employeeId },
      { $set: { employeeId: newMachineId } }
    );

    await LedgerEntry.updateMany(
      { employeeId: employeeId },
      { $set: { employeeId: newMachineId } }
    );

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
