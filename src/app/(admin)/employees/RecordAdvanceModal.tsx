"use client";
import { toast } from 'sonner';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAdvance } from "./actions";

import React from "react";

export default function RecordAdvanceModal({ employees, trigger, open: externalOpen, onOpenChange }: { employees: any[], trigger?: React.ReactElement<any>, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await addAdvance(Number(formData.get("employeeId")), {
        date: formData.get("date") as string,
        amount: Number(formData.get("amount")),
        note: formData.get("note") as string
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, { 
          onClick: (e: any) => {
            setOpen(true);
            if (trigger.props.onClick) trigger.props.onClick(e);
          },
          onSelect: (e: any) => {
            setOpen(true);
            if (trigger.props.onSelect) trigger.props.onSelect(e);
          }
        })
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md p-6 border border-border">
            <h2 className="text-[18px] font-semibold mb-4">Record Advance</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-text-secondary">Employee</label>
                <select name="employeeId" required className="px-3 py-2 bg-panel border border-border rounded text-[13px]">
                  <option value="">Select Employee...</option>
                  {employees.map(e => (
                    <option key={e._id} value={e.machineId}>{e.machineId} - {e.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-text-secondary">Date</label>
                <input type="date" name="date" required className="px-3 py-2 bg-panel border border-border rounded text-[13px]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-text-secondary">Amount (₹)</label>
                <input type="number" name="amount" min="1" required className="px-3 py-2 bg-panel border border-border rounded text-[13px]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-text-secondary">Note / Reason</label>
                <input type="text" name="note" required placeholder="e.g. Mid-month emergency" className="px-3 py-2 bg-panel border border-border rounded text-[13px]" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium hover:bg-panel rounded">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-[13px] font-medium bg-text text-surface rounded disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
