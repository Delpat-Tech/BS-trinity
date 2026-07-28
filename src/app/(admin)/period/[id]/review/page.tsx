import { runPayrollCycle } from '@/lib/payroll/compute';
import { Employee } from '@/models/Employee';
import { Period } from '@/models/Period';
import { PayrollLine } from '@/models/PayrollLine';
import dbConnect from '@/lib/db';
import ReviewGridClient from './ReviewGridClient';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: { id: string } }) {
  await dbConnect();

  const period = await Period.findById(params.id).lean();
  if (!period) return null;

  let lines = [];
  let exceptionsCount = 0;

  if (period.status === 'locked') {
    lines = await PayrollLine.find({ periodId: params.id }).lean();
  } else {
    const res = await runPayrollCycle(params.id);
    lines = res.lines;
    exceptionsCount = res.exceptions.length;
  }

  // We also need employee names and machine IDs for the grid
  const employeesDoc = await Employee.find({ isIgnored: false }).lean();
  const employeesMap = new Map(employeesDoc.map(e => [e._id.toString(), e]));

  const enrichedLines = lines.map((line: any) => {
    const emp = employeesMap.get(line.employeeId.toString()) as any;
    return {
      ...line,
      employeeId: line.employeeId.toString(), // ensure string for client
      employeeName: emp?.name || 'Unknown',
      machineId: emp?.machineId || 0
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Payroll Review {period.status === 'locked' && <span className="ml-2 text-sm font-semibold bg-red-100 text-red-800 px-2 py-1 rounded-full align-middle">LOCKED</span>}
        </h1>
        <p className="text-slate-500">
          {period.status === 'locked' 
            ? 'This period is locked. The data below is permanently frozen.' 
            : 'Computed live from the data layer. Any changes you type will recalculate immediately.'}
        </p>
      </div>

      <ReviewGridClient 
        periodId={params.id} 
        lines={enrichedLines} 
        exceptionsCount={exceptionsCount}
        status={period.status}
      />
    </div>
  );
}
