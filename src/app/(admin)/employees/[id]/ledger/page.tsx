import { Employee } from '@/models/Employee';
import { LedgerEntry } from '@/models/LedgerEntry';
import { Period } from '@/models/Period';
import dbConnect from '@/lib/db';
import { notFound } from 'next/navigation';
import LedgerClient from './LedgerClient';

export const dynamic = 'force-dynamic';

export default async function EmployeeLedgerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await dbConnect();

  const emp = await Employee.findById(id).lean();
  if (!emp) return notFound();

  const entries = await LedgerEntry.find({ employeeId: id }).sort({ date: 1, createdAt: 1 }).lean();

  const periodIds = [...new Set(entries.map(e => e.periodId?.toString()).filter(Boolean))];
  const periods = await Period.find({ _id: { $in: periodIds } }).lean();
  const periodMap = new Map(periods.map(p => [p._id.toString(), p]));

  let balance = 0;
  const enrichedEntries = entries.map(entry => {
    if (entry.type === 'opening' || entry.type === 'advance') {
      balance += entry.amount;
    } else if (entry.type === 'deduction') {
      balance -= entry.amount;
    }
    const isLocked = entry.periodId ? periodMap.get(entry.periodId.toString())?.status === 'locked' : false;
    
    return {
      ...entry,
      runningBalance: balance,
      isLocked
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{emp.name} - Advance Ledger</h1>
          <p className="text-muted-foreground mt-1">Current Balance: ₹{balance}</p>
        </div>
      </div>

      <LedgerClient employeeId={id} entries={enrichedEntries.reverse()} />
    </div>
  );
}
