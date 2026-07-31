"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { uploadEmployeeMaster } from "./actions";

import React from "react";

import { toast } from 'sonner';

export default function UploadEmployeesModal({ trigger, open: externalOpen, onOpenChange }: { trigger?: React.ReactElement<any>, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadEmployeeMaster(formData);
      if (res.success) {
        toast.success("Employee master uploaded successfully");
        setOpen(false);
        setFile(null);
        window.location.reload();
      } else {
        const errText = res.error || "Upload failed";
        setError(errText);
        toast.error(errText);
      }
    } catch (err: any) {
      const errMsg = err.message || "An unexpected error occurred";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

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

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded shadow-xl w-[500px] max-w-[90vw] p-[24px] z-50">
          <Dialog.Title className="m-0 text-[16px] font-semibold mb-[8px]">Upload Employee Master</Dialog.Title>
          <Dialog.Description className="m-0 text-[13px] text-text-secondary mb-[20px]">
            Upload an Excel sheet containing employee data. The sheet must have columns: Emp ID, Name, Date of Joining, Salary.
          </Dialog.Description>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-3 py-2 rounded text-[12.5px]">
                {error}
              </div>
            )}

            <div 
              className="border-2 border-dashed border-border rounded p-8 flex flex-col items-center justify-center cursor-pointer hover:border-text transition-colors"
              onClick={() => document.getElementById('emp-file-upload')?.click()}
            >
              <input
                id="emp-file-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="text-[13px] font-medium mb-1">
                {file ? file.name : "Click to select Excel file"}
              </div>
              <div className="text-[11px] text-text-muted">
                .xls, .xlsx supported
              </div>
            </div>

            <div className="flex justify-between items-center bg-header p-3 rounded border border-border">
              <div>
                <div className="text-[12.5px] font-medium text-text">Employee Panel Schema Template</div>
                <div className="text-[11px] text-text-muted">Download standard column layout (.xlsx)</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  import('xlsx').then(XLSX => {
                    const headers = [
                      "Emp ID / Machine ID",
                      "Full Name",
                      "Designation",
                      "Mobile Number",
                      "Date of Joining (YYYY-MM-DD)",
                      "Designated Weekly Off (0=Sun, 1=Mon, ...)",
                      "Fixed Salary (₹)",
                      "Aadhaar Number",
                      "PAN Number",
                      "Is Ignored / Resigned (TRUE/FALSE)",
                      "Resignation End Date (YYYY-MM-DD)"
                    ];
                    const sampleRow = [
                      101,
                      "Rajesh Kumar",
                      "Technician",
                      "9876543210",
                      "2024-01-15",
                      0,
                      25000,
                      "123456789012",
                      "ABCDE1234F",
                      "FALSE",
                      ""
                    ];
                    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Employee Schema");
                    XLSX.writeFile(wb, "Trinity_Employee_Master_Template.xlsx");
                  });
                }}
                className="px-3 py-1.5 bg-surface border border-border-strong rounded text-[12px] font-medium hover:bg-hover text-text shadow-sm"
              >
                Download Schema
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 border border-border rounded text-[12.5px] font-medium hover:bg-header"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="px-4 py-2 bg-text text-surface rounded text-[12.5px] font-medium hover:bg-[#C9540A] disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}
