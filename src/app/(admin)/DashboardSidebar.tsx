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
    { $match: { date: { $lt: today } } },
    { $sort: { date: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'employees', localField: 'employeeId', foreignField: 'machineId', as: 'emp' } },
    { $unwind: '$emp' }
  ]);

  // Fetch Future Leaves (next 10)
  const futureLeaves = await LeaveEntry.aggregate([
    { $match: { date: { $gte: today } } },
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

  // Ensure documents are plain objects for React Server Components
  const plainPast = pastLeaves.map(l => ({ ...l, _id: l._id.toString(), emp: { ...l.emp, _id: l.emp._id.toString() } }));
  const plainFuture = futureLeaves.map(l => ({ ...l, _id: l._id.toString(), emp: { ...l.emp, _id: l.emp._id.toString() } }));
  const plainPunctuality = punctuality.map(p => ({ ...p, _id: p._id.toString(), periodId: p.periodId.toString(), emp: { ...p.emp, _id: p.emp._id.toString() } }));

  return (
    <div className="flex flex-col gap-6">
      <LeavesListWidget past={plainPast} future={plainFuture} />
      <PunctualityWidget records={plainPunctuality} periodName={latestPeriod ? `${latestPeriod.month}/${latestPeriod.year}` : 'No Locked Periods'} />
    </div>
  );
}
