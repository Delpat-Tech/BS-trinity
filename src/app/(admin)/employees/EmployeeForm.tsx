'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee, updateEmployee } from './actions';
import React from 'react';

export function EmployeeForm({ employee, trigger }: { employee?: any, trigger: React.ReactElement }) {
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

  // Clone trigger element to add onClick handler
  const triggerElement = React.cloneElement(trigger, {
    onClick: () => setOpen(true)
  });

  return (
    <>
      {triggerElement}
      
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-transparent">
          {/* Invisible clickaway backdrop */}
          <div className="absolute inset-0 bg-[#1A1815]/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          
          {/* Rigid solid panel */}
          <div className="relative w-[400px] h-full bg-surface border-l border-border shadow-[-4px_0_12px_rgba(0,0,0,0.05)] flex flex-col bg-surface shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
            <div className="px-[28px] py-[20px] border-b border-border bg-header flex items-center justify-between">
              <div>
                <div className="text-[16px] font-semibold tracking-[-0.015em]">{isEdit ? 'Edit employee' : 'Add employee'}</div>
                <div className="text-[12.5px] text-text-secondary mt-[2px]">{isEdit ? 'Update details or adjust salary' : 'Map a new device ID'}</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-[12px] text-text-secondary hover:text-text cursor-pointer">
                Close ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-[28px]">
              <form id="employeeForm" onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
                
                <div className="flex flex-col gap-[6px]">
                  <label htmlFor="machineId" className="text-[12px] font-medium text-text-secondary">Machine ID (Bio-metric)</label>
                  <input 
                    id="machineId" name="machineId" type="number" 
                    defaultValue={employee?.machineId} disabled={isEdit} required 
                    className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text disabled:bg-panel"
                  />
                </div>
                
                <div className="flex flex-col gap-[6px]">
                  <label htmlFor="name" className="text-[12px] font-medium text-text-secondary">Full Name</label>
                  <input 
                    id="name" name="name" 
                    defaultValue={employee?.name} required 
                    className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-sans text-[13px] outline-none focus:border-text"
                  />
                </div>
                
                <div className="flex flex-col gap-[6px]">
                  <label htmlFor="dateOfJoining" className="text-[12px] font-medium text-text-secondary">Date of Joining</label>
                  <input 
                    id="dateOfJoining" name="dateOfJoining" type="date" 
                    defaultValue={employee?.dateOfJoining} required 
                    className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text"
                  />
                </div>
                
                <div className="flex flex-col gap-[6px]">
                  <label htmlFor="fixedSalary" className="text-[12px] font-medium text-text-secondary">Fixed Salary (₹)</label>
                  <input 
                    id="fixedSalary" name="fixedSalary" type="number" 
                    defaultValue={latestSalary} required 
                    className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text"
                  />
                </div>
                
                {isEdit && (
                  <div className="flex flex-col gap-[6px] p-[16px] bg-panel border border-border-subtle rounded-[4px]">
                    <label htmlFor="effectiveFrom" className="text-[12px] font-medium text-text-secondary">Salary Effective From (Date)</label>
                    <input 
                      id="effectiveFrom" name="effectiveFrom" type="date" 
                      defaultValue={new Date().toISOString().split('T')[0]} required 
                      className="w-full rounded-[4px] border border-border-strong bg-surface px-[10px] py-[8px] font-mono text-[13px] outline-none focus:border-text"
                    />
                    <div className="text-[11.5px] text-text-muted mt-[4px]">Change this only if updating the salary amount.</div>
                  </div>
                )}

                <label className="flex items-center gap-[8px] mt-[4px] cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="isIgnored" name="isIgnored" 
                    defaultChecked={employee?.isIgnored}
                    className="w-[14px] h-[14px] accent-text" 
                  />
                  <span className="text-[13px]">Ignored (skip in payroll)</span>
                </label>

                {error && <div className="text-[13px] text-alert-text bg-alert-bg border border-alert-border p-[10px] rounded-[4px]">{error}</div>}
              </form>
            </div>
            
            <div className="p-[20px] border-t border-border bg-header flex justify-end gap-[10px]">
              <button type="button" onClick={() => setOpen(false)} className="px-[14px] py-[8px] border border-border-strong bg-surface rounded-[4px] text-[13px] hover:bg-hover">
                Cancel
              </button>
              <button form="employeeForm" type="submit" disabled={loading} className="px-[14px] py-[8px] border border-text bg-text text-surface rounded-[4px] text-[13px] font-medium hover:bg-[#332F2A] disabled:opacity-50">
                {loading ? 'Saving...' : 'Save employee'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
