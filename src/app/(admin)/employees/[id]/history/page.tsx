import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { AttendanceDay } from '@/models/AttendanceDay';
import { Period } from '@/models/Period';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import HistoryClient from './HistoryClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EmployeeHistoryPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();
  
  const empDoc = await Employee.findById(id).lean();
  if (!empDoc) {
    return notFound();
  }
  
  const employee = JSON.parse(JSON.stringify(empDoc));
  
  // Fetch all attendance records for this employee, sort by date desc
  const attDocs = await AttendanceDay.find({ employeeId: id }).sort({ date: -1 }).lean();
  
  // Also load periods to get status (locked/open)
  const periodIds = [...new Set(attDocs.map(d => d.periodId?.toString()).filter(Boolean))];
  const periods = await Period.find({ _id: { $in: periodIds } }).lean();
  const periodMap = new Map(periods.map(p => [p._id.toString(), p]));

  const history = attDocs.map(att => ({
    ...att,
    isLocked: periodMap.get(att.periodId?.toString() || '')?.status === 'locked'
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Attendance History: {employee.name}</h1>
          <p className="text-slate-500">
            View all imported attendance days and reopen resolved exceptions.
          </p>
        </div>
        <Link href="/employees" passHref>
          <Button variant="outline">Back to Employees</Button>
        </Link>
      </div>

      <HistoryClient employeeId={params.id} history={history} />
    </div>
  );
}
