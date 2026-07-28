'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resolveException, bulkMarkPresent } from './actions';

type ExceptionObj = {
  employeeId: string;
  date: string;
  reason: string;
  employeeName: string;
  machineId: number;
  inTime: string | null;
  outTime: string | null;
  machineStatus: string | null;
};

export default function QueueClient({ periodId, initialExceptions }: { periodId: string, initialExceptions: ExceptionObj[] }) {
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  
  const current = exceptions[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      if (loading || !current) return;

      const key = e.key.toUpperCase();
      switch (key) {
        case '1':
          handleResolve('PRESENT');
          break;
        case '2':
          handleResolve('HALF_DAY');
          break;
        case '3':
          handleResolve('ABSENT');
          break;
        case '4':
          handleResolve('PAID_LEAVE');
          break;
        case 'S':
          handleSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, exceptions, loading, reasonInput, current]);

  const handleResolve = async (action: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'PAID_LEAVE') => {
    setLoading(true);
    try {
      await resolveException(periodId, current.employeeId, current.date, action, reasonInput);
      
      // Remove from queue locally to avoid refetch wait
      const newExceptions = [...exceptions];
      newExceptions.splice(currentIndex, 1);
      setExceptions(newExceptions);
      
      setReasonInput('');
      
      // Keep index the same, since removing an item shifts the next one into place
      // If we are at the end, jump to 0
      if (currentIndex >= newExceptions.length) {
        setCurrentIndex(0);
      }
    } catch (err) {
      alert('Failed to resolve exception');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setReasonInput('');
    setCurrentIndex((prev) => (prev + 1) % exceptions.length);
  };

  const handleBulkPresent = async () => {
    if (!confirm(`Mark remaining ${exceptions.length} exceptions as PRESENT?`)) return;
    setLoading(true);
    try {
      await bulkMarkPresent(periodId, exceptions.map(e => ({ employeeId: e.employeeId, date: e.date })));
      setExceptions([]); // all cleared
    } catch (err) {
      alert('Failed bulk update');
    } finally {
      setLoading(false);
    }
  };

  if (!current) {
    return (
      <div className="p-12 border rounded-lg bg-white shadow-sm text-center">
        <p className="text-green-600 font-medium mb-4">All exceptions processed!</p>
        <Button onClick={() => window.location.reload()}>Refresh Queue from Server</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-md border shadow-sm">
        <p className="font-mono text-sm text-slate-500">
          Exception {currentIndex + 1} of {exceptions.length}
        </p>
        <Button variant="outline" size="sm" onClick={handleBulkPresent} disabled={loading}>
          Bulk Mark All Present
        </Button>
      </div>

      <Card className="border-red-200 shadow-md">
        <CardHeader className="bg-red-50 border-b border-red-100 pb-4">
          <CardTitle className="text-red-900 flex justify-between">
            <span>{current.employeeName}</span>
            <span>{current.date}</span>
          </CardTitle>
          <CardDescription className="text-red-700 font-medium text-base pt-2">
            Flagged reason: {current.reason}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded border">
              <p className="text-xs text-slate-500 uppercase font-semibold">Machine ID</p>
              <p className="font-mono font-medium text-lg">{current.machineId}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded border">
              <p className="text-xs text-slate-500 uppercase font-semibold">Machine Status</p>
              <p className="font-mono font-medium text-lg">{current.machineStatus || 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded border">
              <p className="text-xs text-slate-500 uppercase font-semibold">In Time</p>
              <p className="font-mono font-medium text-lg text-blue-600">{current.inTime || 'Missing'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded border">
              <p className="text-xs text-slate-500 uppercase font-semibold">Out Time</p>
              <p className="font-mono font-medium text-lg text-amber-600">{current.outTime || 'Missing'}</p>
            </div>
          </div>

          <div className="space-y-2 mb-8">
            <label className="text-sm font-medium text-slate-700">Override Reason (Optional, focuses on typing)</label>
            <Input 
              placeholder="E.g. Approved leave, machine error..." 
              value={reasonInput}
              onChange={e => setReasonInput(e.target.value)}
              className="bg-amber-50"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Button onClick={() => handleResolve('PRESENT')} disabled={loading} variant="outline" className="flex flex-col h-auto py-3 bg-green-50 hover:bg-green-100 border-green-200">
              <kbd className="mb-1 px-2 py-0.5 bg-white border rounded shadow-sm text-xs font-mono text-slate-500">1</kbd>
              <span className="font-semibold text-green-900">Present</span>
            </Button>
            
            <Button onClick={() => handleResolve('HALF_DAY')} disabled={loading} variant="outline" className="flex flex-col h-auto py-3 bg-amber-50 hover:bg-amber-100 border-amber-200">
              <kbd className="mb-1 px-2 py-0.5 bg-white border rounded shadow-sm text-xs font-mono text-slate-500">2</kbd>
              <span className="font-semibold text-amber-900">Half Day</span>
            </Button>

            <Button onClick={() => handleResolve('ABSENT')} disabled={loading} variant="outline" className="flex flex-col h-auto py-3 bg-red-50 hover:bg-red-100 border-red-200">
              <kbd className="mb-1 px-2 py-0.5 bg-white border rounded shadow-sm text-xs font-mono text-slate-500">3</kbd>
              <span className="font-semibold text-red-900">Absent</span>
            </Button>

            <Button onClick={() => handleResolve('PAID_LEAVE')} disabled={loading} variant="outline" className="flex flex-col h-auto py-3 bg-purple-50 hover:bg-purple-100 border-purple-200">
              <kbd className="mb-1 px-2 py-0.5 bg-white border rounded shadow-sm text-xs font-mono text-slate-500">4</kbd>
              <span className="font-semibold text-purple-900">Paid Leave</span>
            </Button>

            <Button onClick={handleSkip} disabled={loading} variant="outline" className="flex flex-col h-auto py-3 bg-slate-100 hover:bg-slate-200 border-slate-300">
              <kbd className="mb-1 px-2 py-0.5 bg-white border rounded shadow-sm text-xs font-mono text-slate-500">S</kbd>
              <span className="font-semibold text-slate-700">Skip</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
