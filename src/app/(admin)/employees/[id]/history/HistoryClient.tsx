'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { reopenResolvedDay } from './actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function HistoryClient({ employeeId, history }: { employeeId: string, history: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleReopen = async (attendanceId: string) => {
    if (!confirm('Reopen this day? It will clear any admin overrides and return it to the exceptions queue if missing data.')) return;
    
    setLoading(attendanceId);
    try {
      await reopenResolvedDay(attendanceId, employeeId);
    } catch (err: any) {
      alert(err.message || 'Failed to reopen day');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Machine Data</TableHead>
            <TableHead>Final Status</TableHead>
            <TableHead>Override Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                No attendance history found for this employee.
              </TableCell>
            </TableRow>
          ) : (
            history.map((day: any) => {
              const isResolved = day.finalStatus !== null;

              return (
                <TableRow key={day._id}>
                  <TableCell className="font-medium">{day.date}</TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-600">
                      Code: <span className="font-mono bg-slate-100 px-1">{day.machineStatus}</span> | 
                      In: <span className="font-mono bg-slate-100 px-1">{day.inTime || '--'}</span> | 
                      Out: <span className="font-mono bg-slate-100 px-1">{day.outTime || '--'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isResolved ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        {day.finalStatus} (Admin)
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20">
                        Engine Driven
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 italic">
                    {day.overrideReason || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {isResolved && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleReopen(day._id)}
                        disabled={loading === day._id}
                      >
                        {loading === day._id ? 'Opening...' : 'Reopen'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
