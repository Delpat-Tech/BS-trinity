'use client';

import { useState } from 'react';
import { updatePayrollInput, lockPeriod, unlockPeriod } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LockIcon, AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';

function EditableCell({ 
  value, 
  onSave, 
  placeholder = "",
  disabled
}: { 
  value: number | null, 
  onSave: (val: number | null) => void,
  placeholder?: string,
  disabled?: boolean
}) {
  const [val, setVal] = useState(value === null ? '' : value.toString());
  const [isFocused, setIsFocused] = useState(false);

  if (disabled) {
    return <div className="h-8 w-16 text-right px-2 py-1 inline-block text-slate-700">{value === null ? '-' : value}</div>;
  }

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = val === '' ? null : Number(val);
    if (parsed !== value) {
      onSave(parsed);
    }
  };

  return (
    <Input 
      type="number"
      value={isFocused ? val : (value === null ? '' : value)}
      onChange={(e) => setVal(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="h-8 w-16 text-right px-2"
    />
  );
}

export default function ReviewGridClient({ periodId, lines, exceptionsCount, status }: { periodId: string, lines: any[], exceptionsCount: number, status: string }) {
  const isLocked = status === 'locked';
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (employeeId: string, field: string, value: number | null) => {
    if (isLocked) return;
    try {
      await updatePayrollInput(periodId, employeeId, field, value);
    } catch (err) {
      alert('Failed to save input');
    }
  };

  const handleLock = async () => {
    if (!confirm('Are you sure you want to lock this period? This will generate payroll lines and advance deductions.')) return;
    setLoading(true);
    try {
      await lockPeriod(periodId);
    } catch (err: any) {
      alert(err.message || 'Failed to lock');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    const reason = prompt('Enter reason for unlocking:');
    if (!reason) return;
    setLoading(true);
    try {
      await unlockPeriod(periodId, reason);
    } catch (err: any) {
      alert(err.message || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Exceptions</span>
            {exceptionsCount > 0 ? (
              <span className="flex items-center text-red-600 font-bold">
                <AlertTriangleIcon className="w-4 h-4 mr-1" /> {exceptionsCount} Remaining
              </span>
            ) : (
              <span className="text-green-600 font-bold">0 Remaining</span>
            )}
          </div>
          
          {exceptionsCount > 0 && (
            <Link href={`/period/${periodId}/queue`} passHref>
              <Button variant="outline" size="sm" className="text-red-700 border-red-200 bg-red-50 hover:bg-red-100">
                Go to Queue
              </Button>
            </Link>
          )}
        </div>

        {isLocked ? (
          <Button onClick={handleUnlock} disabled={loading} variant="destructive" className="bg-red-600 hover:bg-red-700">
            <LockIcon className="w-4 h-4 mr-2" />
            {loading ? 'Unlocking...' : 'Unlock Period'}
          </Button>
        ) : (
          <Button onClick={handleLock} disabled={exceptionsCount > 0 || loading} className="bg-slate-900 hover:bg-slate-800">
            <LockIcon className="w-4 h-4 mr-2" />
            {loading ? 'Locking...' : 'Lock Period'}
          </Button>
        )}
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="sticky left-0 bg-slate-50 w-[200px] z-10">Employee</TableHead>
              <TableHead className="text-center bg-slate-100" colSpan={3}>Attendance</TableHead>
              <TableHead className="text-center bg-amber-50" colSpan={3}>Penalties</TableHead>
              <TableHead className="text-center bg-green-50" colSpan={6}>Money (₹)</TableHead>
            </TableRow>
            <TableRow className="text-xs">
              <TableHead className="sticky left-0 bg-slate-50 z-10">Name (ID)</TableHead>
              
              {/* Attendance */}
              <TableHead className="text-right">P / A / H</TableHead>
              <TableHead className="text-right w-20">E.W.</TableHead>
              <TableHead className="text-right font-bold text-slate-800">Total Paid</TableHead>
              
              {/* Penalties */}
              <TableHead className="text-right">Late / Early</TableHead>
              <TableHead className="text-right">Pen. Days</TableHead>
              <TableHead className="text-right text-amber-700">Late ₹</TableHead>
              
              {/* Money */}
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right w-20">Inc.</TableHead>
              <TableHead className="text-right w-20">Bonus</TableHead>
              <TableHead className="text-right text-red-600 w-20">Ded.</TableHead>
              <TableHead className="text-right text-red-600 w-20">Debit</TableHead>
              <TableHead className="text-right font-bold text-green-700">Net Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-slate-500">
                  No payroll lines generated. Make sure employees are active and biometric data is uploaded.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.employeeId}>
                  <TableCell className="sticky left-0 bg-white z-10 font-medium border-r">
                    {line.employeeName} <span className="text-slate-400 font-mono text-xs ml-1">#{line.machineId}</span>
                  </TableCell>
                  
                  <TableCell className="text-right text-slate-600">
                    <Popover>
                      <PopoverTrigger className="hover:underline decoration-dashed decoration-slate-300">
                        {line.presentDays} / {line.absDays} / {line.halfDays}
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 text-sm">
                        <p className="font-semibold mb-2 text-slate-800">Attendance Breakdown</p>
                        <ul className="space-y-1 text-slate-600">
                          <li>Present Days: <span className="font-mono float-right">{line.presentDays}</span></li>
                          <li>Absent Days: <span className="font-mono float-right">{line.absDays}</span></li>
                          <li>Half Days: <span className="font-mono float-right">{line.halfDays}</span></li>
                          <li>Paid Leaves: <span className="font-mono float-right">{line.paidLeaveDays}</span></li>
                          <li>Unpaid Leaves: <span className="font-mono float-right">{line.unpaidLeaveDays}</span></li>
                          <li>Out of Service: <span className="font-mono float-right">{line.outOfServiceDays}</span></li>
                        </ul>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableCell 
                      value={line.ewDays} 
                      onSave={(val) => handleUpdate(line.employeeId, 'ewDays', val)} 
                      disabled={isLocked}
                    />
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-800 bg-slate-50/50">
                    <Popover>
                      <PopoverTrigger className="hover:underline decoration-dashed decoration-slate-400">
                        {line.totalPaidDays}
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 text-sm">
                        <p className="font-semibold mb-2 text-slate-800">Paid Days Math</p>
                        <p className="font-mono bg-slate-50 p-2 rounded border">
                          {line.presentDays} (P) <br/>
                          + {line.paidLeaveDays} (PL) <br/>
                          + {line.halfDays * 0.5} (H/2) <br/>
                          + {line.ewDays} (EW) <br/>
                          - {line.penaltyDays} (Pen) <br/>
                          = {line.totalPaidDays}
                        </p>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  
                  <TableCell className="text-right text-slate-600">
                    {line.lateStrikes} / {line.earlyStrikes}
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {line.penaltyDays}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableCell 
                      value={line.latePunchAmt} 
                      onSave={(val) => handleUpdate(line.employeeId, 'latePunchAmt', val)} 
                      disabled={isLocked}
                    />
                  </TableCell>

                  <TableCell className="text-right font-medium text-slate-700 bg-green-50/30">
                    {line.gross.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableCell 
                      value={line.incentive} 
                      onSave={(val) => handleUpdate(line.employeeId, 'incentive', val)} 
                      disabled={isLocked}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableCell 
                      value={line.bonus} 
                      onSave={(val) => handleUpdate(line.employeeId, 'bonus', val)} 
                      disabled={isLocked}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Popover>
                      <PopoverTrigger className="text-left w-full border-b border-dashed border-slate-300 pb-1">
                        <EditableCell 
                          value={line.advanceDeduction} 
                          onSave={(val) => handleUpdate(line.employeeId, 'advanceDeduction', val)} 
                          disabled={isLocked}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3 text-sm">
                        <p className="font-semibold mb-1 text-slate-800">Advance Ledger</p>
                        <p>Total Outstanding: <span className="font-mono text-red-600 float-right">₹{(line.advanceCarried + line.advanceDeduction).toLocaleString()}</span></p>
                        <p className="text-xs text-slate-500 mt-2">Any deduction entered here is clamped to max available gross, and the remainder carries forward.</p>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  <TableCell className="text-right">
                    <EditableCell 
                      value={line.otherDebit} 
                      onSave={(val) => handleUpdate(line.employeeId, 'otherDebit', val)} 
                      disabled={isLocked}
                    />
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-700 bg-green-50/50">
                    <Popover>
                      <PopoverTrigger className="hover:underline decoration-dashed decoration-green-400">
                        {line.net.toLocaleString()}
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 text-sm">
                        <p className="font-semibold mb-2 text-slate-800">Net Math</p>
                        <p className="font-mono bg-slate-50 p-2 rounded border">
                          {line.gross.toLocaleString()} (Gross) <br/>
                          + {line.incentive.toLocaleString()} (Inc) <br/>
                          + {line.bonus.toLocaleString()} (Bon) <br/>
                          - {line.advanceDeduction.toLocaleString()} (Adv) <br/>
                          - {line.latePunchAmt.toLocaleString()} (Late₹) <br/>
                          - {line.otherDebit.toLocaleString()} (Oth) <br/>
                          = {line.net.toLocaleString()}
                        </p>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
