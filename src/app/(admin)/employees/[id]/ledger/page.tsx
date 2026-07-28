import { Employee } from '@/models/Employee';
import { LedgerEntry } from '@/models/LedgerEntry';
import dbConnect from '@/lib/db';
import { notFound } from 'next/navigation';
import LedgerClient from './LedgerClient';

export const dynamic = 'force-dynamic';

export default async function EmployeeLedgerPage({ params }: { params: { id: string } }) {
  await dbConnect();
  
  const emp = await Employee.findById(params.id).lean();
  if (!emp) return notFound();

  const entries = await LedgerEntry.find({ employeeId: params.id }).sort({ date: 1, createdAt: 1 }).lean();

  // Compute running balances
  let runningBalance = 0;
  const enrichedEntries = entries.map(entry => {
    if (entry.type === 'opening' || entry.type === 'advance') {
      runningBalance += entry.amount;
    } else if (entry.type === 'deduction') {
      runningBalance -= entry.amount;
    }
    return {
      _id: entry._id.toString(),
      date: entry.date,
      type: entry.type,
      amount: entry.amount,
      note: entry.note,
      balance: runningBalance
    };
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Advance Ledger</h2>
      <p className="text-sm text-slate-500">
        Log mid-month advances or opening balances here. 
        Deductions are automatically created when a payroll period is locked.
      </p>

      <LedgerClient employeeId={params.id} entries={enrichedEntries.reverse()} />
    </div>
  );
}
