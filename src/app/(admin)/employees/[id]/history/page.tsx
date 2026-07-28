import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { AttendanceDay } from '@/models/AttendanceDay';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic';

export default async function EmployeeHistoryPage({ params }: { params: { id: string } }) {
  await dbConnect();
  
  const empDoc = await Employee.findById(params.id).lean();
  if (!empDoc) {
    return <div>Employee not found</div>;
  }
  
  const employee = JSON.parse(JSON.stringify(empDoc));
  
  // Fetch all attendance records for this employee, sort by date desc
  const attDocs = await AttendanceDay.find({ employeeId: params.id }).sort({ date: -1 }).lean();
  const history = JSON.parse(JSON.stringify(attDocs));

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
