import dbConnect from '@/lib/db';
import { LeaveEntry } from '@/models/LeaveEntry';
import { Employee } from '@/models/Employee';
import { Period } from '@/models/Period';
import { PayrollLine } from '@/models/PayrollLine';
import LeavesListWidget from './LeavesListWidget';
import PunctualityWidget from './PunctualityWidget';

export default async function DashboardSidebar() {
  await dbConnect();
  const today = new Date().toISOString().split('T')[0];

  // Fetch Past Leaves (last 10)
  const pastLeaves = await LeaveEntry.aggregate([
    { $match: { date: { $lt: today }, status: 'approved' } },
    { $sort: { date: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'employees', localField: 'employeeId', foreignField: 'machineId', as: 'emp' } },
    { $unwind: '$emp' }
  ]);

  // Fetch Future Leaves (next 10)
  const futureLeaves = await LeaveEntry.aggregate([
    { $match: { date: { $gte: today }, status: 'approved' } },
    { $sort: { date: 1 } },
    { $limit: 10 },
    { $lookup: { from: 'employees', localField: 'employeeId', foreignField: 'machineId', as: 'emp' } },
    { $unwind: '$emp' }
  ]);

  // Fetch Punctuality (Least Absents/Late in latest period)
  // We'll just find the latest locked period and sort employees by 'pres' descending, 'abs' ascending
  const latestPeriod = await Period.findOne({ status: 'locked' }).sort({ year: -1, month: -1 }).lean();
  let punctuality: any[] = [];
  
  if (latestPeriod) {
    punctuality = await PayrollLine.aggregate([
      { $match: { periodId: (latestPeriod as any)._id } },
      { $sort: { pres: -1, abs: 1, EW: 1 } },
      { $limit: 10 },
      { $lookup: { from: 'employees', localField: 'employeeId', foreignField: 'machineId', as: 'emp' } },
      { $unwind: '$emp' }
    ]);
  }

  // Ensure documents are plain objects for React Server Components (deep serialization to handle ObjectId, Date, Binary fields)
  const plainPast = JSON.parse(JSON.stringify(pastLeaves));
  const plainFuture = JSON.parse(JSON.stringify(futureLeaves));
  const plainPunctuality = JSON.parse(JSON.stringify(punctuality));

  return (
    <div className="flex flex-col gap-6">
      <LeavesListWidget past={plainPast} future={plainFuture} />
      <PunctualityWidget records={plainPunctuality} periodName={latestPeriod ? `${latestPeriod.month}/${latestPeriod.year}` : 'No Locked Periods'} />
    </div>
  );
}
