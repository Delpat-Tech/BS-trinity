'use client';
import { toast } from 'sonner';
import { useState } from 'react';
import { logLedgerEntry, deleteLedgerEntry } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2Icon } from 'lucide-react';

import { useRouter } from 'next/navigation';

export default function LedgerClient({ employeeId, entries, onRefresh }: { employeeId: string, entries: any[], onRefresh?: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [type, setType] = useState<'opening' | 'advance'>('advance');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentOutstanding = entries.length > 0 ? (entries[0].runningBalance ?? 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !note) return;
    
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive integer in rupees');
      toast.error('Amount must be a positive integer in rupees');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await logLedgerEntry(employeeId, date, type, numAmount, note);
      toast.success('Successfully logged ledger entry');
      setDate('');
      setAmount('');
      setNote('');
      if (onRefresh) onRefresh();
      router.refresh();
    } catch (err: any) {
      const errMsg = err.message || 'Failed to log entry';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry? This will change the running balance for all subsequent months.')) return;
    try {
      await deleteLedgerEntry(employeeId, entryId);
      toast.success('Successfully deleted ledger entry');
      if (onRefresh) onRefresh();
      router.refresh();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card className="bg-slate-900 text-white">
        <CardHeader className="pb-2 py-3 px-5">
          <CardTitle className="text-xs font-medium text-slate-300">Total Outstanding Balance</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-5">
          <div className="text-3xl font-bold">
            ₹{currentOutstanding.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-semibold text-text">Log Ledger Entry</CardTitle>
          <CardDescription className="text-[12.5px] text-text-secondary">Add a mid-month advance or an opening balance for this employee.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-text-secondary">Type</Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="w-full h-[36px] data-[size=default]:h-[36px] bg-surface border-border-strong text-[13px] px-3 font-medium">
                  <span>
                    {type === 'advance' && 'Advance'}
                    {type === 'opening' && 'Opening Balance'}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-surface border-border z-[200] min-w-[240px] text-[13px]">
                  <SelectItem value="advance" className="text-[13px] py-2">Advance</SelectItem>
                  <SelectItem value="opening" className="text-[13px] py-2">Opening Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-text-secondary">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-[36px] bg-surface border-border-strong font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-text-secondary">Amount (₹)</Label>
              <Input type="number" step="1" min="1" value={amount} onChange={e => setAmount(e.target.value)} required className="h-[36px] bg-surface border-border-strong font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-text-secondary">Note / Remarks</Label>
              <Input placeholder="e.g. Medical emergency" value={note} onChange={e => setNote(e.target.value)} required className="h-[36px] bg-surface border-border-strong" />
            </div>

            {error && <p className="col-span-2 text-xs text-red-600 font-medium">{error}</p>}

            <div className="col-span-2 flex justify-end pt-1">
              <Button type="submit" disabled={loading || !date || !amount || !note} className="h-[36px] bg-[#E8630A] text-white hover:bg-[#C9540A] px-6">
                {loading ? 'Logging...' : 'Log Ledger Entry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left font-semibold py-3 px-4">Date</th>
                <th className="text-left font-semibold py-3 px-4">Type</th>
                <th className="text-left font-semibold py-3 px-4">Note</th>
                <th className="text-right font-semibold py-3 px-4">Amount</th>
                <th className="text-right font-semibold py-3 px-4">Balance</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">No ledger entries yet.</td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600">{entry.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        entry.type === 'advance' ? 'bg-amber-100 text-amber-800' :
                        entry.type === 'deduction' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {entry.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">{entry.note}</td>
                    <td className={`py-3 px-4 text-right font-medium ${entry.type === 'deduction' ? 'text-green-600' : 'text-slate-800'}`}>
                      {entry.type === 'deduction' ? '-' : '+'}₹{entry.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{(entry.runningBalance ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {entry.type !== 'deduction' && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(entry._id)} className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700">
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
