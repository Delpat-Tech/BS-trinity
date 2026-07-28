'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee, updateEmployee } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function EmployeeForm({ employee, trigger }: { employee?: any, trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isEdit = !!employee;
  const latestSalary = employee ? [...employee.salaryRevisions].sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.fixedSalary : '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const data = {
      machineId: Number(formData.get('machineId')),
      name: formData.get('name') as string,
      dateOfJoining: formData.get('dateOfJoining') as string,
      fixedSalary: Number(formData.get('fixedSalary')),
      isIgnored: formData.get('isIgnored') === 'on',
      effectiveFrom: formData.get('effectiveFrom') as string
    };

    try {
      if (isEdit) {
        await updateEmployee(employee._id, data);
      } else {
        await createEmployee(data);
      }
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger as any} />
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="machineId">Machine ID (Bio-metric ID)</Label>
            <Input id="machineId" name="machineId" type="number" defaultValue={employee?.machineId} disabled={isEdit} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" defaultValue={employee?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfJoining">Date of Joining</Label>
            <Input id="dateOfJoining" name="dateOfJoining" type="date" defaultValue={employee?.dateOfJoining} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fixedSalary">Fixed Salary (₹)</Label>
            <Input id="fixedSalary" name="fixedSalary" type="number" defaultValue={latestSalary} required />
          </div>
          
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Salary Effective From (Date)</Label>
              <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              <p className="text-xs text-slate-500">Change this if the salary update should apply from a specific date.</p>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="isIgnored" 
              name="isIgnored" 
              defaultChecked={employee?.isIgnored}
              className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900" 
            />
            <Label htmlFor="isIgnored">Is Ignored (Skip in Payroll)</Label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Employee'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
