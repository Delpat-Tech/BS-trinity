import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { LedgerEntry } from '@/models/LedgerEntry';
import GlobalLedgerClient from './GlobalLedgerClient';

export default async function GlobalLedgerPage() {
  await requireSession();
  await dbConnect();

  const rawEmployees = await Employee.find({ isIgnored: false, endDate: null }).sort({ machineId: 1 }).lean();
  const ledgerEntries = await LedgerEntry.find().lean();

  const unsettledMap = new Map<string, number>();
  for (const l of ledgerEntries) {
    const empId = l.employeeId?.toString();
    if (!empId) continue;
    const current = unsettledMap.get(empId) || 0;
    if (l.type === 'advance' || l.type === 'opening') {
      unsettledMap.set(empId, current + (l.amount || 0));
    } else if (l.type === 'deduction') {
      unsettledMap.set(empId, current - (l.amount || 0));
    }
  }

  const employees = rawEmployees.map((e: any) => {
    const empId = e._id.toString();
    const balance = unsettledMap.get(empId) || 0;
    return {
      _id: empId,
      machineId: e.machineId,
      name: e.name,
      designation: e.designation,
      unsettledAdvance: Math.max(0, balance)
    };
  });

  return <GlobalLedgerClient employees={employees} />;
}
