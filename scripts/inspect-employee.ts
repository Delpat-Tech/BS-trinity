import dbConnect from '../src/lib/db';
import { Employee } from '../src/models/Employee';
import { AttendanceDay } from '../src/models/AttendanceDay';
import { Period } from '../src/models/Period';
import { LeaveEntry } from '../src/models/LeaveEntry';

async function main() {
  await dbConnect();
  
  // Find employee 1
  const employee = await Employee.findOne({ $or: [{ _id: 1 }, { machineId: 1 }] }).lean();
  console.log("=== Employee 1 ===");
  console.log(JSON.stringify(employee, null, 2));

  if (!employee) {
    console.log("Employee 1 not found!");
    process.exit(1);
  }

  // Find periods
  const periods = await Period.find().lean();
  console.log("\n=== Periods ===");
  console.log(JSON.stringify(periods, null, 2));

  // Find attendance for employee 1
  const attendance = await AttendanceDay.find({ employeeId: employee._id }).lean();
  console.log(`\n=== Attendance Records (${attendance.length}) ===`);
  attendance.sort((a, b) => a.date.localeCompare(b.date)).forEach(att => {
    console.log(`${att.date}: in=${att.inTime}, out=${att.outTime}, machineStatus=${att.machineStatus}, finalStatus=${att.finalStatus}`);
  });

  // Find leaves
  const leaves = await LeaveEntry.find({ employeeId: employee._id }).lean();
  console.log(`\n=== Leaves (${leaves.length}) ===`);
  console.log(JSON.stringify(leaves, null, 2));

  // Find payroll lines
  const { PayrollLine } = await import('../src/models/PayrollLine');
  const payrollLines = await PayrollLine.find({ employeeId: employee._id }).lean();
  console.log(`\n=== Payroll Lines (${payrollLines.length}) ===`);
  console.log(JSON.stringify(payrollLines, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
