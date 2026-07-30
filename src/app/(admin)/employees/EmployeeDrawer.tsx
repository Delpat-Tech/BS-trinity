"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee, updateEmployee, getEmployeeDetails } from './actions';
import React from 'react';
import HistoryClient from './[id]/history/HistoryClient';
import LeaveClient from './[id]/leave/LeaveClient';
import LedgerClient from './[id]/ledger/LedgerClient';
import RecordLeaveModal from './RecordLeaveModal';
import RecordAdvanceModal from './RecordAdvanceModal';
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  machineId: z.coerce.number().min(1, "Machine ID is required"),
  designation: z.string().optional().default(''),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Must be exactly 10 digits").or(z.literal('')).optional(),
  dateOfJoining: z.string().min(1, "Date of Joining is required"),
  aadharNumber: z.string().regex(/^[0-9]{12}$/, "Must be exactly 12 digits").or(z.literal('')).optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format (e.g. ABCDE1234F)").or(z.literal('')).optional(),
  weeklyOff: z.coerce.number().min(0).max(6),
  fixedSalary: z.coerce.number().min(0, "Salary cannot be negative"),
  effectiveFrom: z.string().min(1, "Effective Date is required"),
  isIgnored: z.boolean(),
  endDate: z.string().optional().default(''),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export function EmployeeDrawer({ employee, trigger }: { employee?: any, trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'profile' | 'revisions' | 'history' | 'leave' | 'ledger'>('profile');
  const [fullData, setFullData] = useState<any>(null);
  const router = useRouter();

  const isEdit = !!employee;
  const revisions = fullData?.employee?.salaryRevisions || (employee?.salaryRevisions || []);
  const latestSalary = [...revisions].sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.fixedSalary || 0;

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name || '',
      machineId: employee?.machineId || 0,
      designation: employee?.designation || '',
      mobileNumber: employee?.mobileNumber || '',
      dateOfJoining: employee?.dateOfJoining || new Date().toISOString().split('T')[0],
      aadharNumber: employee?.aadharNumber || '',
      panNumber: employee?.panNumber || '',
      weeklyOff: employee?.weeklyOff ?? 0,
      fixedSalary: latestSalary,
      effectiveFrom: new Date().toISOString().split('T')[0],
      isIgnored: employee?.isIgnored || false,
      endDate: employee?.endDate || '',
    }
  });

  const isIgnoredWatched = watch("isIgnored");

  useEffect(() => {
    if (open && isEdit && !fullData) {
      getEmployeeDetails(employee._id).then(data => setFullData(data)).catch(console.error);
    }
  }, [open, isEdit, fullData]);

  useEffect(() => {
    if (open) {
      reset({
        name: employee?.name || '',
        machineId: employee?.machineId || (isEdit ? 0 : undefined),
        designation: employee?.designation || '',
        mobileNumber: employee?.mobileNumber || '',
        dateOfJoining: employee?.dateOfJoining || new Date().toISOString().split('T')[0],
        aadharNumber: employee?.aadharNumber || '',
        panNumber: employee?.panNumber || '',
        weeklyOff: employee?.weeklyOff ?? 0,
        fixedSalary: latestSalary,
        effectiveFrom: new Date().toISOString().split('T')[0],
        isIgnored: employee?.isIgnored || false,
        endDate: employee?.endDate || '',
      });
    }
  }, [open, employee, isEdit, latestSalary, reset]);

  async function onSubmit(data: any) {
    setLoading(true);
    
    // Convert undefined to empty string to keep DB clean
    const payload = {
      ...data,
      endDate: data.endDate || null,
      paymentMode: '',
      bankAccount: '',
      ifsc: ''
    };

    try {
      if (isEdit) {
        await updateEmployee(employee._id, payload as any);
        toast.success("Employee updated successfully");
      } else {
        await createEmployee(payload as any);
        toast.success("Employee created successfully");
      }
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const triggerElement = React.cloneElement(trigger as React.ReactElement<any>, {
    onClick: () => { setOpen(true); setTab('profile'); }
  });

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  return (
    <>
      {triggerElement}
      
      {open && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-transparent">
          <div className="absolute inset-0 bg-[#1A1815]/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          
          <div className="relative w-[700px] h-full bg-surface border-l border-border flex flex-col shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
            <div className="px-[28px] py-[20px] border-b border-border bg-header flex items-center justify-between">
              <div>
                <div className="text-[16px] font-semibold tracking-[-0.015em] text-left">{isEdit ? (fullData?.employee?.name || employee.name) : 'Add employee'}</div>
                <div className="text-[12.5px] text-text-secondary mt-[2px] font-mono text-left">#{isEdit ? employee.machineId : 'New Mapping'}</div>
              </div>
              
              <div className="flex items-center gap-4">
                {isEdit && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setLeaveModalOpen(true)} className="px-3 py-1.5 text-[12px] font-medium border border-border rounded shadow-sm hover:bg-hover bg-surface">
                      Record Leave
                    </button>
                    <button onClick={() => setAdvanceModalOpen(true)} className="px-3 py-1.5 text-[12px] font-medium border border-border rounded shadow-sm hover:bg-hover bg-surface">
                      Record Advance
                    </button>
                  </div>
                )}
                <button onClick={() => setOpen(false)} className="text-[12px] text-text-secondary hover:text-text cursor-pointer ml-2">
                  Close ✕
                </button>
              </div>
            </div>

            <RecordLeaveModal open={leaveModalOpen} onOpenChange={setLeaveModalOpen} employees={[fullData?.employee || employee]} />
            <RecordAdvanceModal open={advanceModalOpen} onOpenChange={setAdvanceModalOpen} employees={[fullData?.employee || employee]} />
            
            {isEdit && (
              <div className="flex border-b border-border bg-header px-[28px] gap-[20px] text-[13px] font-medium">
                {['profile', 'revisions', 'history', 'leave', 'ledger'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setTab(t as any)}
                    className={`py-[12px] capitalize border-b-2 transition-colors ${tab === t ? 'border-text text-text' : 'border-transparent text-text-secondary hover:text-text'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-auto bg-surface px-[32px] py-[28px]">
              {tab === 'profile' && (
                <form id="employeeForm" onSubmit={handleSubmit(onSubmit)} className="flex flex-col text-left">
                  
                  {/* Personal Information */}
                  <div className="flex flex-col gap-5 pb-8 border-b border-border-subtle">
                    <h3 className="text-[14px] font-semibold text-text tracking-tight m-0">Personal Profile</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Full Name</Label>
                        <Input {...register("name")} placeholder="John Doe" />
                        {errors.name && <span className="text-[11px] text-alert-text text-left">{errors.name.message}</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Machine ID</Label>
                        <Input {...register("machineId")} type="number" disabled={isEdit} placeholder="e.g. 1" />
                        {errors.machineId && <span className="text-[11px] text-alert-text text-left">{errors.machineId.message}</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Mobile Number</Label>
                        <Input {...register("mobileNumber")} placeholder="9876543210" />
                        {errors.mobileNumber && <span className="text-[11px] text-alert-text text-left">{errors.mobileNumber.message}</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Aadhaar Number</Label>
                        <Input {...register("aadharNumber")} placeholder="XXXX XXXX XXXX" />
                        {errors.aadharNumber && <span className="text-[11px] text-alert-text text-left">{errors.aadharNumber.message}</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">PAN Number</Label>
                        <Input {...register("panNumber")} placeholder="ABCDE1234F" className="uppercase" />
                        {errors.panNumber && <span className="text-[11px] text-alert-text text-left">{errors.panNumber.message}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="flex flex-col gap-5 py-8 border-b border-border-subtle">
                    <h3 className="text-[14px] font-semibold text-text tracking-tight m-0">Employment Details</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Designation</Label>
                        <Input {...register("designation")} placeholder="Mechanic" />
                        {errors.designation && <span className="text-[11px] text-alert-text text-left">{errors.designation.message}</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Date of Joining</Label>
                        <Input {...register("dateOfJoining")} type="date" />
                        {errors.dateOfJoining && <span className="text-[11px] text-alert-text text-left">{errors.dateOfJoining.message}</span>}
                      </div>
                      <div className="flex flex-col gap-2 col-span-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Designated Weekly Off</Label>
                        <Select value={watch("weeklyOff").toString()} onValueChange={v => reset({...watch(), weeklyOff: parseInt(v || "0")})}>
                          <SelectTrigger className="w-full h-[36px] bg-surface border border-border shadow-sm focus:ring-1 focus:ring-text text-[13px]">
                            <SelectValue placeholder="Select day..." />
                          </SelectTrigger>
                          <SelectContent className="bg-surface border-border">
                            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                              <SelectItem key={i} value={i.toString()}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.weeklyOff && <span className="text-[11px] text-alert-text text-left">{errors.weeklyOff.message}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-[10px] mt-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Employment Status</Label>
                      <div className="flex items-center gap-3">
                        <label className={`flex-1 flex items-center justify-center gap-2 py-[7px] px-3 rounded-[6px] border cursor-pointer transition-colors select-none ${!isIgnoredWatched ? 'border-text bg-text text-surface shadow-sm' : 'border-border bg-surface text-text-secondary hover:bg-hover'}`}>
                          <input type="radio" value="false" {...register("isIgnored", { setValueAs: v => v === 'true' })} className="hidden" />
                          <span className="text-[13px] font-medium">Active</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 py-[7px] px-3 rounded-[6px] border cursor-pointer transition-colors select-none ${isIgnoredWatched ? 'border-alert-text bg-alert-bg text-alert-text shadow-sm' : 'border-border bg-surface text-text-secondary hover:bg-hover'}`}>
                          <input type="radio" value="true" {...register("isIgnored", { setValueAs: v => v === 'true' })} className="hidden" />
                          <span className="text-[13px] font-medium">Inactive / Resigned</span>
                        </label>
                      </div>
                    </div>
                    
                    {isIgnoredWatched && (
                      <div className="flex flex-col gap-2 mt-2 p-4 bg-panel border border-border-subtle rounded-[6px]">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Date of Resignation</Label>
                        <Input {...register("endDate")} type="date" className="w-full bg-surface" />
                        <div className="text-[11px] text-text-muted mt-[2px] leading-tight text-left">Enter a date only if the employee has resigned. They will be ignored in payroll after this date.</div>
                        {errors.endDate && <span className="text-[11px] text-alert-text text-left">{errors.endDate.message}</span>}
                      </div>
                    )}
                  </div>

                  {/* Compensation */}
                  <div className="flex flex-col gap-5 pt-8 pb-4">
                    <h3 className="text-[14px] font-semibold text-text tracking-tight m-0">Compensation</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[12px] font-medium text-text-secondary text-left">Fixed Salary (₹)</Label>
                        <Input {...register("fixedSalary")} type="number" placeholder="25000" className="font-mono text-[14px]" />
                        {errors.fixedSalary && <span className="text-[11px] text-alert-text text-left">{errors.fixedSalary.message}</span>}
                      </div>
                      {isEdit && (
                        <div className="flex flex-col gap-2">
                          <Label className="text-[12px] font-medium text-text-secondary text-left">Effective From</Label>
                          <Input {...register("effectiveFrom")} type="date" className="font-mono" />
                          <div className="text-[11px] text-text-muted mt-[2px] leading-tight text-left">Change only if updating salary amount.</div>
                          {errors.effectiveFrom && <span className="text-[11px] text-alert-text text-left">{errors.effectiveFrom.message}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                </form>
              )}

              {tab === 'revisions' && (
                <div className="flex flex-col gap-[12px]">
                  <h2 className="text-[14px] font-semibold text-left">Salary Revisions</h2>
                  <div className="border border-border rounded-[4px] overflow-hidden">
                    <table className="w-full text-[13px] text-left border-collapse">
                      <thead className="bg-header border-b border-border">
                        <tr>
                          <th className="px-[16px] py-[8px] font-medium text-text-secondary">Effective From</th>
                          <th className="px-[16px] py-[8px] font-medium text-text-secondary">Fixed Salary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...revisions].sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map((rev: any, i: number) => (
                          <tr key={i} className="border-b border-border-subtle last:border-0 hover:bg-hover">
                            <td className="px-[16px] py-[10px] font-mono text-text-secondary">{rev.effectiveFrom}</td>
                            <td className="px-[16px] py-[10px] font-mono">₹{rev.fixedSalary.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'history' && fullData && (
                <HistoryClient employeeId={employee._id} history={fullData.history} />
              )}
              {tab === 'leave' && fullData && (
                <LeaveClient employeeId={employee._id} leaves={fullData.leaves} />
              )}
              {tab === 'ledger' && fullData && (
                <LedgerClient employeeId={employee._id} entries={fullData.ledger} />
              )}
            </div>
            
            {tab === 'profile' && (
              <div className="p-[20px] border-t border-border bg-header flex justify-end gap-[10px]">
                <button type="button" onClick={() => setOpen(false)} className="px-[14px] py-[8px] border border-border-strong bg-surface rounded-[4px] text-[13px] hover:bg-hover">Cancel</button>
                <button form="employeeForm" type="submit" disabled={loading} className="px-[14px] py-[8px] border border-text bg-text text-surface rounded-[4px] text-[13px] font-medium hover:bg-[#332F2A] disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save employee'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
