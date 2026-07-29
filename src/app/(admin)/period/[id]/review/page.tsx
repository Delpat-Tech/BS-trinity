import { runPayrollCycle } from '@/lib/payroll/compute';
import { Employee } from '@/models/Employee';
import { Period } from '@/models/Period';
import { PayrollLine } from '@/models/PayrollLine';
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

  const enrichedLines = lines.map(l => {
    const emp = empMap.get(l.employeeId.toString());
    // Safely extract string IDs to avoid Next.js Client Component serialization errors
    const safeEmployeeId = l.employeeId.toString();
    const safePeriodId = l.periodId ? l.periodId.toString() : id;
    const safeId = l._id ? l._id.toString() : undefined;

    return {
      ...l,
      _id: safeId,
      periodId: safePeriodId,
      employeeId: safeEmployeeId,
      employeeName: emp?.name || 'Unknown',
      machineId: emp?.machineId || 0
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
