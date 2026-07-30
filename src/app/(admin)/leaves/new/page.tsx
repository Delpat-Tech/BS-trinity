import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import GlobalLeaveClient from './GlobalLeaveClient';

export default async function GlobalLeavePage() {
  await requireSession();
  await dbConnect();

  const rawEmployees = await Employee.find({ isIgnored: false, endDate: null }).sort({ machineId: 1 }).lean();
  const employees = rawEmployees.map((e: any) => ({
    _id: e._id.toString(),
    machineId: e.machineId,
    name: e.name,
    designation: e.designation
  }));

  return <GlobalLeaveClient employees={employees} />;
}
