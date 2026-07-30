'use client';
import { toast } from 'sonner';
import { useState } from 'react';
import { addLeave, deleteLeave } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2Icon } from 'lucide-react';

export default function LeaveClient({ employeeId, leaves }: { employeeId: string, leaves: any[] }) {
  const [date, setDate] = useState('');
  const [kind, setKind] = useState<'paid' | 'unpaid' | 'half'>('paid');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    
    setLoading(true);
    setError('');
    try {
      await addLeave(employeeId, date, kind, note);
      setDate('');
      setNote('');
      setKind('paid');
    } catch (err: any) {
      setError(err.message || 'Failed to log leave');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (leaveId: string) => {
    if (!confirm('Are you sure you want to delete this leave entry?')) return;
    try {
      await deleteLeave(employeeId, leaveId);
    } catch (err) {
      toast.error('Failed to delete leave');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Log Leave</CardTitle>
            <CardDescription>Add a retroactive leave card off-cycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={kind} onValueChange={(val: any) => setKind(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid Leave</SelectItem>
                    <SelectItem value="half">Half Day</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input placeholder="e.g. Sick leave" value={note} onChange={e => setNote(e.target.value)} />
              </div>

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              <Button type="submit" disabled={loading || !date} className="w-full">
                {loading ? 'Logging...' : 'Log Leave'}
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
                <th className="text-left font-semibold py-3 px-4">Logged By</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">No leave entries recorded.</td>
                </tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{leave.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        leave.kind === 'paid' ? 'bg-green-100 text-green-800' :
                        leave.kind === 'half' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {leave.kind === 'half' ? 'HALF DAY' : leave.kind.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{leave.note || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {leave.loggedByUser?.name || 'Unknown'}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(leave.loggedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(leave._id)} className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700">
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
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
