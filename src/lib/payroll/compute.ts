import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import { Employee } from '@/models/Employee';
import { AttendanceDay } from '@/models/AttendanceDay';
import { LeaveEntry } from '@/models/LeaveEntry';
import { Holiday } from '@/models/Holiday';
import { LedgerEntry } from '@/models/LedgerEntry';
import { PayrollInput } from '@/models/PayrollInput';
import { computePayroll } from '@/lib/rules/engine';

export async function runPayrollCycle(periodId: string) {
  await dbConnect();

  const period = await Period.findById(periodId).lean();
  if (!period) throw new Error('Period not found');

  // Fetch active employees
  // "null = active" for endDate. Or we check if endDate is null or in the future?
  // Let's just fetch all employees that are active or were active during this period.
  // The engine can handle filtering if needed, or we just pass all not-ignored employees.
  const employees = await Employee.find({ isIgnored: false }).lean();

  const attendance = await AttendanceDay.find({ periodId }).lean();
  
  // Format dates for the month
  const monthStr = period.month.toString().padStart(2, '0');
  const datePrefix = `${period.year}-${monthStr}-`;

  // Fetch approved leaves for this month (or legacy leaves without status field)
  const leaves = await LeaveEntry.find({ 
    date: { $regex: `^${datePrefix}` },
    $or: [{ status: 'approved' }, { status: { $exists: false } }]
  }).lean();

  // Fetch holidays for this month (and any recurring holidays)
  const holidays = await Holiday.find({
    $or: [
      { date: { $regex: `^${datePrefix}` } },
      { recurrence: { $in: ['monthly', 'yearly'] } }
    ]
  }).lean();

  // Fetch ledger entries for employees (up to end of period, or all?)
  // Actually, computePayroll handles ledger processing (opening + advance + deduction).
  // The spec says "Ledger: advances, opening balances..."
  // For now, we'll fetch all ledger entries (or maybe just those relevant).
  // The engine expects LedgerEntry[] but doesn't specify if it filters by date.
  // Usually, we just pass all ledger entries up to this period, or all of them.
  const ledger = await LedgerEntry.find().lean();

  // Fetch PayrollInputs for this period
  const inputs = await PayrollInput.find({ periodId }).lean();

  // Run the pure engine
  const result = computePayroll({
    period: period as any,
    employees: employees as any,
    attendance: attendance as any,
    leaves: leaves as any,
    holidays: holidays as any,
    ledger: ledger as any,
    inputs: inputs as any
  });

  return result;
}
