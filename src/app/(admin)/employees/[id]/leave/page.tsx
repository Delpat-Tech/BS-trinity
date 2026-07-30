import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { LeaveEntry } from '@/models/LeaveEntry';
import { User } from '@/models/User';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import LeaveClient from './LeaveClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EmployeeLeavePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();
  
  const empDoc = await Employee.findById(id).lean();
  if (!empDoc) {
    return notFound();
  }
  
  const employee = JSON.parse(JSON.stringify(empDoc));
  
  // Fetch all leaves, sort descending by date
  const leaveDocs = await LeaveEntry.find({ employeeId: id }).sort({ date: -1 }).lean();
  
  // Resolve user who logged the entry
  const userIds = [...new Set(leaveDocs.map(d => d.loggedBy?.toString()).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  const leaves = leaveDocs.map(leave => ({
    ...leave,
    loggedByUser: leave.loggedBy ? userMap.get(leave.loggedBy.toString()) : null
  }));

  const safeLeaves = JSON.parse(JSON.stringify(leaves));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Leave Records: {employee.name}</h1>
          <p className="text-slate-500">
            View and manage off-cycle leave entries for this employee.
          </p>
        </div>
        <Link href="/employees" passHref>
          <Button variant="outline">Back to Employees</Button>
        </Link>
      </div>

      <LeaveClient employeeId={id} leaves={safeLeaves} />
    </div>
  );
}
