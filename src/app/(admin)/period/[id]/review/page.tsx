import { runPayrollCycle } from '@/lib/payroll/compute';
import { Employee } from '@/models/Employee';
import { Period } from '@/models/Period';
import { PayrollLine } from '@/models/PayrollLine';
import { AttendanceDay } from '@/models/AttendanceDay';
import dbConnect from '@/lib/db';
import ReviewGridClient from './ReviewGridClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReviewGridPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();
  
  const period = await Period.findById(id).lean();
  if (!period) return notFound();

  const isLocked = period.status === 'locked';

  let lines;
  let exceptionsCount = 0;

  if (isLocked) {
    lines = await PayrollLine.find({ periodId: id }).lean();
  } else {
    const res = await runPayrollCycle(id);
    lines = res.lines;
    exceptionsCount = res.exceptions.length;
  }

  // Enhance lines with employee info
  const empIds = lines.map(l => l.employeeId);
  const emps = await Employee.find({ _id: { $in: empIds } }).lean();
  const empMap = new Map(emps.map(e => [e._id.toString(), e]));

  // Fetch raw attendance & period details to dynamically resolve absent dates if we are viewing a locked period that doesn't have it saved
  const attendance = isLocked ? await AttendanceDay.find({ periodId: id }).lean() : [];
  const attendanceMap = new Map(attendance.map(a => [`${a.employeeId}_${a.date}`, a]));

  const enrichedLines = lines.map(l => {
    const emp = empMap.get(l.employeeId.toString());
    const safeEmployeeId = l.employeeId.toString();
    const safePeriodId = l.periodId ? l.periodId.toString() : id;
    const safeId = l._id ? l._id.toString() : undefined;

    // Recalculate date lists if they are not stored (e.g. for already locked periods)
    let absentDates = l.absentDates || [];
    let presentDatesList = l.presentDatesList || [];
    let halfDatesList = l.halfDatesList || [];
    let paidLeaveDatesList = l.paidLeaveDatesList || [];
    let ewDatesList = l.ewDatesList || [];

    if (isLocked && (absentDates.length === 0 && presentDatesList.length === 0 && halfDatesList.length === 0 && paidLeaveDatesList.length === 0 && ewDatesList.length === 0)) {
      const periodYear = period.year;
      const periodMonth = period.month;
      const numDays = new Date(periodYear, periodMonth, 0).getDate();
      const monthShort = new Date(periodYear, periodMonth - 1).toLocaleString('default', { month: 'short' });

      for (let i = 1; i <= numDays; i++) {
        const dateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        // Skip out of service range
        if (emp) {
          if (dateStr < emp.dateOfJoining || (emp.endDate && dateStr > emp.endDate)) {
            continue;
          }
          const [yr, mo, dy] = dateStr.split('-').map(Number);
          const isWeeklyOff = new Date(yr, mo - 1, dy).getDay() === (emp.weeklyOff ?? 0);
          const key = `${emp._id}_${dateStr}`;
          const att = attendanceMap.get(key);
          const dayFormatted = `${i} ${monthShort}`;

          let dayStatus = 'ABSENT_UNPAID';
          if (att) {
            if (att.finalStatus) {
              dayStatus = att.finalStatus;
            } else if (att.inTime !== null && att.outTime === null) {
              dayStatus = 'EXCEPTION';
            } else if (att.machineStatus === 'A') {
              dayStatus = isWeeklyOff ? 'WEEKLY_OFF' : 'ABSENT_UNPAID';
            } else {
              dayStatus = isWeeklyOff ? 'WEEKLY_OFF_WORKED' : 'PRESENT';
            }
          } else {
            dayStatus = isWeeklyOff ? 'WEEKLY_OFF' : 'ABSENT_UNPAID';
          }

          if (dayStatus === 'ABSENT_UNPAID') {
            absentDates.push(dayFormatted);
          } else if (dayStatus === 'PRESENT' || dayStatus === 'WEEKLY_OFF') {
            presentDatesList.push(dayFormatted);
          } else if (dayStatus === 'HALF_DAY') {
            halfDatesList.push(dayFormatted);
          } else if (dayStatus === 'PAID_LEAVE') {
            paidLeaveDatesList.push(dayFormatted);
          } else if (dayStatus === 'WEEKLY_OFF_WORKED') {
            ewDatesList.push(dayFormatted);
          }
        }
      }
    }

    return {
      ...l,
      _id: safeId,
      periodId: safePeriodId,
      employeeId: safeEmployeeId,
      employeeName: emp?.name || 'Unknown',
      machineId: emp?.machineId || 0,
      absentDates,
      presentDatesList,
      halfDatesList,
      paidLeaveDatesList,
      ewDatesList
    };
  });
  
  enrichedLines.sort((a, b) => (a.machineId || 0) - (b.machineId || 0));

  // Final serialization pass to ensure absolutely NO mongoose objects (like Decimal128, ObjectId, etc.) are passed to client
  const safeLines = JSON.parse(JSON.stringify(enrichedLines));

  return (
    <ReviewGridClient 
      periodId={id} 
      lines={safeLines} 
      exceptionsCount={exceptionsCount}
      status={period.status}
    />
  );
}
