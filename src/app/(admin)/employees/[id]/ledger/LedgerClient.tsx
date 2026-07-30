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

export default function LedgerClient({ employeeId, entries }: { employeeId: string, entries: any[] }) {
  const [date, setDate] = useState('');
  const [type, setType] = useState<'opening' | 'advance'>('advance');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentOutstanding = entries.length > 0 ? entries[0].balance : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !note) return;
    
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive integer in rupees');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await logLedgerEntry(employeeId, date, type, numAmount, note);
      setDate('');
      setAmount('');
      setNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to log entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry? This will change the running balance for all subsequent months.')) return;
    try {
      await deleteLedgerEntry(employeeId, entryId);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-6">
        <Card className="bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              ₹{currentOutstanding.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log Entry</CardTitle>
            <CardDescription>Add a mid-month advance or an opening balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="opening">Opening Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" step="1" min="1" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Note</Label>
                <Input placeholder="e.g., Medical emergency" value={note} onChange={e => setNote(e.target.value)} required />
              </div>

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              <Button type="submit" disabled={loading || !date || !amount || !note} className="w-full">
                {loading ? 'Logging...' : 'Log Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

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
                      ₹{entry.balance.toLocaleString()}
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
