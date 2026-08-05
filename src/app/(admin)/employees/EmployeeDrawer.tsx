"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee, updateEmployee, getEmployeeDetails } from './actions';
import React from 'react';
import { createPortal } from 'react-dom';
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
  weeklyOff: z.string().default('Sunday'),
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
        weeklyOff: typeof employee?.weeklyOff === 'number' ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][employee.weeklyOff] : (employee?.weeklyOff || 'Sunday'),
      fixedSalary: latestSalary,
      effectiveFrom: new Date().toISOString().split('T')[0],
      isIgnored: employee?.isIgnored || false,
      endDate: employee?.endDate || '',
    }
  });

  const isIgnoredWatched = watch("isIgnored");

  const refreshData = async () => {
    if (!employee?._id) return;
    try {
      const data = await getEmployeeDetails(employee._id);
      setFullData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFullData(null);
  };

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
          weeklyOff: typeof employee?.weeklyOff === 'number' ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][employee.weeklyOff] : (employee?.weeklyOff || 'Sunday'),
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
      handleClose();
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
  return (
    <>
      {triggerElement}
      
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-transparent">
          <div className="absolute inset-0 bg-[#1A1815]/20 backdrop-blur-[1px]" onClick={handleClose} />
          
          <div className="relative w-[700px] h-full bg-surface border-l border-border flex flex-col shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">
            <div className="px-[28px] py-[20px] border-b border-border bg-header flex items-center justify-between">
              <div>
                <div className="text-[16px] font-semibold tracking-[-0.015em] text-left">{isEdit ? (fullData?.employee?.name || employee.name) : 'Add employee'}</div>
                <div className="text-[12.5px] text-text-secondary mt-[2px] font-mono text-left">#{isEdit ? employee.machineId : 'New Mapping'}</div>
              </div>
              
              <div className="flex items-center gap-4">
                <button onClick={handleClose} className="text-[12px] text-text-secondary hover:text-text cursor-pointer ml-2">
                  Close ✕
                </button>
              </div>
            </div>
            
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

            <div className="flex-1 overflow-y-auto p-[28px]">
              {tab === 'profile' && (
                <form id="employeeForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Full Name</Label>
                      <Input {...register("name")} placeholder="e.g. John Doe" />
                      {errors.name && <span className="text-[11px] text-alert-text text-left">{errors.name.message}</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Machine ID</Label>
                      <Input {...register("machineId", { valueAsNumber: true })} type="number" disabled={isEdit} />
                      {errors.machineId && <span className="text-[11px] text-alert-text text-left">{errors.machineId.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Designation</Label>
                      <Input {...register("designation")} placeholder="e.g. Mechanic" />
                      {errors.designation && <span className="text-[11px] text-alert-text text-left">{errors.designation.message}</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Mobile Number</Label>
                      <Input {...register("mobileNumber")} placeholder="10 digit number" />
                      {errors.mobileNumber && <span className="text-[11px] text-alert-text text-left">{errors.mobileNumber.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Aadhaar Number</Label>
                      <Input {...register("aadharNumber")} placeholder="12 digit number" />
                      {errors.aadharNumber && <span className="text-[11px] text-alert-text text-left">{errors.aadharNumber.message}</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">PAN Number</Label>
                      <Input {...register("panNumber")} placeholder="e.g. ABCDE1234F" />
                      {errors.panNumber && <span className="text-[11px] text-alert-text text-left">{errors.panNumber.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Fixed Salary (Monthly)</Label>
                      <Input {...register("fixedSalary", { valueAsNumber: true })} type="number" />
                      {errors.fixedSalary && <span className="text-[11px] text-alert-text text-left">{errors.fixedSalary.message}</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Effective Date of Salary</Label>
                      <Input {...register("effectiveFrom")} type="date" />
                      {errors.effectiveFrom && <span className="text-[11px] text-alert-text text-left">{errors.effectiveFrom.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Date of Joining</Label>
                      <Input {...register("dateOfJoining")} type="date" />
                      {errors.dateOfJoining && <span className="text-[11px] text-alert-text text-left">{errors.dateOfJoining.message}</span>}
                    </div>
                    <div className="flex flex-col gap-2 col-span-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Designated Weekly Off</Label>
                      <Select value={watch("weeklyOff")?.toString()} onValueChange={v => reset({...watch(), weeklyOff: v || "Sunday"})}>
                        <SelectTrigger className="w-full h-[36px] data-[size=default]:h-[36px] bg-surface border border-border shadow-sm focus:ring-1 focus:ring-text text-[13px] px-3 font-medium">
                          <SelectValue placeholder="Select day..." />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border z-[200] min-w-[240px] text-[13px]">
                          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                            <SelectItem key={d} value={d} className="text-[13px] py-2">{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.weeklyOff && <span className="text-[11px] text-alert-text text-left">{errors.weeklyOff.message as string}</span>}
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
                    <div className="flex flex-col gap-2 mt-2">
                      <Label className="text-[12px] font-medium text-text-secondary text-left">Resignation / Termination Date (Optional)</Label>
                      <Input {...register("endDate")} type="date" />
                    </div>
                  )}
                </form>
              )}

              {tab === 'revisions' && (
                <div className="space-y-[16px]">
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
                <LeaveClient employeeId={employee._id} leaves={fullData.leaves} onRefresh={refreshData} />
              )}
              {tab === 'ledger' && fullData && (
                <LedgerClient employeeId={employee._id} entries={fullData.ledger} onRefresh={refreshData} />
              )}
            </div>
            
            {tab === 'profile' && (
              <div className="p-[20px] border-t border-border bg-header flex justify-end gap-[10px]">
                <button type="button" onClick={handleClose} className="px-[14px] py-[8px] border border-border-strong bg-surface rounded-[4px] text-[13px] hover:bg-hover">Cancel</button>
                <button form="employeeForm" type="submit" disabled={loading} className="px-[14px] py-[8px] border border-text bg-[#E8630A] text-white rounded-[6px] text-[13px] font-medium hover:bg-[#C9540A] disabled:opacity-50 cursor-pointer">
                  {loading ? 'Saving...' : 'Save employee'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
