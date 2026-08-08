'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { LeaveEntry } from '@/models/LeaveEntry';
import { LedgerEntry } from '@/models/LedgerEntry';
import { AttendanceDay } from '@/models/AttendanceDay';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/User';

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
  try {
    await requireSession();
    await dbConnect();

    const existing = await Employee.findOne({ machineId: data.machineId });
    if (existing) {
      return { error: 'Employee with this Machine ID already exists' };
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
      weeklyOff: data.weeklyOff || 'Sunday',
      salaryRevisions: [{
        fixedSalary: data.fixedSalary,
        effectiveFrom: data.effectiveFrom || data.dateOfJoining
      }]
    });

    revalidatePath('/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
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
  weeklyOff?: string;
}) {
  try {
    await requireSession();
    await dbConnect();

    const emp = await Employee.findById(id);
    if (!emp) return { error: 'Employee not found' };

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
    emp.weeklyOff = data.weeklyOff || 'Sunday';

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
    revalidatePath(`/employees/${id}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
}

export async function addLeave(machineId: number, data: { date: string; kind: 'paid' | 'unpaid' | 'half'; note?: string }) {
  await requireSession();
  await dbConnect();
  
  const emp = await Employee.findOne({ machineId });
  if (!emp) throw new Error('Employee not found');

  const session = await getServerSession(authOptions);
  let user = null;
  if (session?.user?.name) {
    user = await User.findOne({ username: session.user.name }).lean();
  }
  const userId = user?._id || null;

  await LeaveEntry.create({
    employeeId: emp._id,
    date: data.date,
    kind: data.kind,
    note: data.note || '',
    loggedBy: userId,
    loggedAt: new Date()
  });
  
  revalidatePath('/employees');
}

export async function addAdvance(machineId: number, data: { date: string; amount: number; note: string }) {
  await requireSession();
  await dbConnect();
  
  const emp = await Employee.findOne({ machineId });
  if (!emp) throw new Error('Employee not found');

  const session = await getServerSession(authOptions);
  let user = null;
  if (session?.user?.name) {
    user = await User.findOne({ username: session.user.name }).lean();
  }
  const userId = user?._id || null;

  await LedgerEntry.create({
    employeeId: emp._id,
    date: data.date,
    type: 'advance',
    amount: data.amount,
    note: data.note,
    loggedBy: userId,
    loggedAt: new Date()
  });
  
  revalidatePath('/employees');
}

export async function getEmployeeDetails(employeeId: any) {
  await requireSession();
  await dbConnect();

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw new Error('Employee not found');

  const leaves = await LeaveEntry.find({ employeeId }).sort({ date: -1 }).lean();
  
  // Sort oldest first to calculate running balance correctly
  const ledgerDocs = await LedgerEntry.find({ employeeId }).sort({ date: 1, createdAt: 1 }).lean();
  
  const periodIds = [...new Set(ledgerDocs.map(e => e.periodId?.toString()).filter(Boolean))];
  const PeriodModel = (await import('@/models/Period')).Period;
  const periods = await PeriodModel.find({ _id: { $in: periodIds } }).lean();
  const periodMap = new Map(periods.map(p => [p._id.toString(), p]));

  let balance = 0;
  const ledger = ledgerDocs.map(entry => {
    if (entry.type === 'opening' || entry.type === 'advance') {
      balance += entry.amount;
    } else if (entry.type === 'deduction') {
      balance -= entry.amount;
    }
    const isLocked = entry.periodId ? periodMap.get(entry.periodId.toString())?.status === 'locked' : false;
    return {
      ...entry,
      runningBalance: balance,
      isLocked
    };
  });

  const history = await AttendanceDay.find({ employeeId }).sort({ date: -1 }).limit(100).lean();

  return { 
    employee: JSON.parse(JSON.stringify(employee)), 
    leaves: JSON.parse(JSON.stringify(leaves)), 
    ledger: JSON.parse(JSON.stringify(ledger.reverse())), 
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
      
      const machineIdStr = row['Machine ID'] || row['Emp ID'] || row['ID'] || row['Emp ID / Machine ID'];
      const name = row['Name'] || row['Employee Name'] || row['Employee'] || row['Full Name'];
      const dojRaw = row['Date of Joining'] || row['DOJ'] || row['Joining Date'] || row['Date of Joining (YYYY-MM-DD)'];
      const salaryRaw = row['Salary'] || row['Base Salary'] || row['Net Salary'] || row['Fixed Salary (₹)'];
      const designation = row['Designation'];
      const mobile = row['Mobile Number'] || row['Phone'];
      const aadhaar = row['Aadhaar Number'] || row['Aadhaar'];
      const pan = row['PAN Number'] || row['PAN'];
      const weeklyOffRaw = row['Designated Weekly Off (0=Sun, 1=Mon, ...)'] || row['Weekly Off'];
      const isIgnoredRaw = row['Is Ignored / Resigned (TRUE/FALSE)'];
      const endDateRaw = row['Resignation End Date (YYYY-MM-DD)'] || row['End Date'];

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
      if (typeof dojRaw === 'number') {
        const d = XLSX.SSF.parse_date_code(dojRaw);
        if (d) {
          doj = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
        }
      }

      let endDate = null;
      if (endDateRaw) {
        let ed = String(endDateRaw).trim();
        if (typeof endDateRaw === 'number') {
          const d = XLSX.SSF.parse_date_code(endDateRaw);
          if (d) {
            ed = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          }
        }
        endDate = ed;
      }

      const salary = parseFloat(String(salaryRaw).replace(/[^\d.-]/g, ''));
      if (isNaN(salary)) continue;

      let weeklyOff = 0; // Default Sunday
      if (weeklyOffRaw !== undefined && weeklyOffRaw !== null) {
        const wo = parseInt(String(weeklyOffRaw).trim(), 10);
        if (!isNaN(wo) && wo >= 0 && wo <= 6) {
          weeklyOff = wo;
        } else if (typeof weeklyOffRaw === 'string') {
          const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          const idx = days.findIndex(d => weeklyOffRaw.toLowerCase().startsWith(d));
          if (idx !== -1) weeklyOff = idx;
        }
      }

      let isIgnored = false;
      if (isIgnoredRaw !== undefined && isIgnoredRaw !== null) {
        const str = String(isIgnoredRaw).trim().toLowerCase();
        isIgnored = (str === 'true' || str === 'yes' || str === '1' || str === 'y');
      }

      ops.push({
        updateOne: {
          filter: { machineId },
          update: {
            $set: {
              name,
              dateOfJoining: doj,
              designation: designation || undefined,
              mobileNumber: mobile || undefined,
              aadharNumber: aadhaar || undefined,
              panNumber: pan || undefined,
              weeklyOff,
              isIgnored,
              endDate
            },
            $setOnInsert: {
              _id: machineId,
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

export async function bulkDeleteEmployees(employeeIds: string[]) {
  await requireSession();
  await dbConnect();

  try {
    await Employee.deleteMany({ _id: { $in: employeeIds } });
    await LeaveEntry.deleteMany({ employeeId: { $in: employeeIds } });
    await LedgerEntry.deleteMany({ employeeId: { $in: employeeIds } });
    await AttendanceDay.deleteMany({ employeeId: { $in: employeeIds } });
    
    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
