import dbConnect from '../src/lib/db';
import { Employee } from '../src/models/Employee';
import { AttendanceDay } from '../src/models/AttendanceDay';
import { Period } from '../src/models/Period';
import { LeaveEntry } from '../src/models/LeaveEntry';
import { Holiday } from '../src/models/Holiday';
import { PayrollInput } from '../src/models/PayrollInput';
import { computePayroll } from '../src/lib/rules/engine';

async function main() {
  await dbConnect();
  
  const period = await Period.findOne({ month: 8, year: 2026 }).lean();
  if (!period) {
    console.log("August 2026 period not found");
    process.exit(1);
  }

  const employee = await Employee.findOne({ $or: [{ _id: 1 }, { machineId: 1 }] }).lean();
  if (!employee) {
    console.log("Employee 1 not found");
    process.exit(1);
  }

  const attendance = await AttendanceDay.find({ periodId: period._id, employeeId: employee._id }).lean();
  const leaves = await LeaveEntry.find({ date: { $regex: /^2026-08-/ } }).lean();
  const holidays = await Holiday.find({ date: { $regex: /^2026-08-/ } }).lean();
  const inputs = await PayrollInput.find({ periodId: period._id, employeeId: employee._id }).lean();

  console.log("Running engine calculation for Employee 1 in August 2026...");
  const result = computePayroll({
    period: period as any,
    employees: [employee] as any,
    attendance: attendance as any,
    leaves: leaves as any,
    holidays: holidays as any,
    ledger: [],
    inputs: inputs as any
  });

  const line = result.lines[0];
  console.log("\n=== Computed Line ===");
  console.log(`Present: ${line.presentDays}`);
  console.log(`Half: ${line.halfDays}`);
  console.log(`Absent: ${line.absDays}`);
  console.log(`Paid Leaves: ${line.paidLeaveDays}`);
  console.log(`EW sugerest: ${line.ewDays}`);
  console.log(`Total Paid Days: ${line.totalPaidDays}`);
  console.log(`Absent dates list:`, line.absentDates);

  // Let's print out what the engine does day by day. We can copy the logic here or modify the engine to print.
  // Actually, let's just inspect day by day how the engine evaluated them.
  console.log("\nDay by day evaluation:");
  const periodDates: string[] = [];
  for (let i = 1; i <= 31; i++) {
    periodDates.push(`2026-08-${String(i).padStart(2, '0')}`);
  }

  const attendanceByEmpDate = new Map<string, any>();
  attendance.forEach(a => attendanceByEmpDate.set(`${a.employeeId}_${a.date}`, a));

  for (const date of periodDates) {
    const isWeeklyOff = new Date(date).getDay() === (employee.weeklyOff ?? 0);
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    const att = attendanceByEmpDate.get(`${employee._id}_${date}`);
    const machineStatus = att?.machineStatus ?? 'A';
    const finalStatus = att?.finalStatus ?? null;
    
    // Compute status like engine does
    let status = 'ABSENT_UNPAID';
    if (finalStatus !== null) {
      status = finalStatus;
    } else if (att?.inTime !== null && att?.outTime === null) {
      status = 'EXCEPTION';
    } else if (machineStatus === 'A' && !isWeeklyOff) {
      status = 'ABSENT_UNPAID';
    } else {
      if (machineStatus === 'A' && isWeeklyOff) {
        status = 'WEEKLY_OFF';
      } else {
        status = isWeeklyOff ? 'WEEKLY_OFF_WORKED' : 'PRESENT';
      }
    }
    console.log(`${date} (${dayOfWeek}): isWO=${isWeeklyOff}, mach=${machineStatus}, final=${finalStatus} -> status=${status}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
