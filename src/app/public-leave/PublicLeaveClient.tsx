"use client";

import { useState } from "react";
import { submitPublicLeave } from "./actions";
import { toast } from "sonner";
import { CalendarDays, ShieldAlert, CheckCircle2, User, Phone, IdCard, FileText, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PublicLeaveClient({ employees }: { employees: { _id: string, name: string, mobileNumber: string, machineId?: string }[] }) {
  const [employeeId, setEmployeeId] = useState("");
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [kind, setKind] = useState<"paid" | "unpaid">("unpaid");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.machineId && e.machineId.toString().includes(search))
  );

  const selectedEmployee = employees.find((e) => e._id.toString() === employeeId);
  const isSelectionActive = selectedEmployee && search === `${selectedEmployee.name} ${selectedEmployee.machineId ? `(#${selectedEmployee.machineId})` : ''}`.trim();

  const handleEmployeeChange = (id: string | null) => {
    setEmployeeId(id || "");
    const emp = employees.find(e => e._id.toString() === id);
    if (emp) {
      setMobile(emp.mobileNumber || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (pan.trim().length !== 10) {
      toast.error("PAN number must be exactly 10 characters");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Please select dates");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error("From Date cannot be later than To Date");
      return;
    }

    setLoading(true);
    try {
      const res = await submitPublicLeave({
        employeeId: parseInt(employeeId),
        pan,
        fromDate,
        toDate,
        kind,
        note,
      } as any);

      if (res && res.error) {
        toast.error(res.error);
        return;
      }

      setSubmitted(true);
      toast.success("Leave submitted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit leave. Verify details.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-header p-6">
        <div className="max-w-md w-full bg-header border border-border p-8 rounded-xl shadow-lg text-center space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
          <div className="flex justify-center">
            <div className="p-3 bg-green-50 rounded-full text-green-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-[20px] font-semibold text-text">Leave Request Submitted</h2>
            <p className="text-[13.5px] text-text-secondary leading-relaxed">
              Your leave request from <span className="font-semibold text-text font-mono">{fromDate}</span> to <span className="font-semibold text-text font-mono">{toDate}</span> has been verified and logged.
            </p>
          </div>
          <Button
            onClick={() => {
              setSubmitted(false);
              setFromDate(new Date().toISOString().split("T")[0]);
              setToDate(new Date().toISOString().split("T")[0]);
              setNote("");
              setPan("");
            }}
            className="w-full h-[40px] bg-[#E8630A] text-white hover:bg-[#C9540A] font-medium rounded-lg"
          >
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-header p-6">
      <div className="max-w-[480px] w-full bg-header border border-border rounded-xl shadow-lg overflow-hidden">
        
        {/* Banner Header */}
        <div className="bg-text text-surface p-6 flex items-center gap-3">
          <div className="p-2.5 bg-surface/10 rounded-lg">
            <CalendarDays className="w-6 h-6 text-surface" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight">Trinity Motors</h1>
            <p className="text-[12px] text-surface/80">Employee Leave Self-Portal</p>
          </div>
        </div>

        {/* Verification Alert */}
        <div className="bg-alert-bg border-b border-alert-border px-6 py-3 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-alert-text mt-0.5 shrink-0" />
          <p className="text-[11.5px] text-alert-text leading-relaxed font-medium">
            To submit a leave request, you must verify your identity. Enter details matching your official employee master record.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-text flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-text-muted" />
              Employee Name *
            </Label>
            
            <div className="flex items-center h-[38px] rounded-[6px] bg-surface border border-border-strong focus-within:ring-1 focus-within:ring-[#E8630A] px-3 gap-2">
              <Search className="w-[14px] h-[14px] text-text-muted shrink-0" />
              <input
                type="text"
                className="search-input flex-1 text-[13px] text-text placeholder:text-text-muted outline-none bg-transparent"
                placeholder="Search employee by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {!isSelectionActive && search && (
              <div className="mt-1 max-h-[200px] overflow-y-auto border border-border rounded-md bg-white shadow-lg divide-y divide-border-subtle absolute z-[9999] w-full max-w-[calc(100%-3rem)] sm:max-w-md">
                {filteredEmployees.length === 0 ? (
                  <div className="p-3 text-center text-[12.5px] text-text-muted">No active employees found</div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = emp._id.toString() === employeeId;
                    return (
                      <button
                        type="button"
                        key={emp._id.toString()}
                        onClick={() => {
                          handleEmployeeChange(emp._id.toString());
                          setSearch(`${emp.name} ${emp.machineId ? `(#${emp.machineId})` : ''}`.trim());
                        }}
                        className={`w-full flex items-center justify-between p-2.5 text-left text-[13px] transition-colors hover:bg-hover ${
                          isSelected ? "bg-hover font-medium text-text" : "text-text-secondary"
                        }`}
                      >
                        <div>
                          {emp.machineId && <span className="font-mono text-text-muted mr-2">#{emp.machineId}</span>}
                          <span className="text-text font-medium">{emp.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-text" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-medium text-text flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-text-muted" />
                Mobile Number
              </Label>
              <Input
                type="tel"
                value={mobile}
                readOnly
                disabled
                className="h-[38px] bg-hover border-border-strong text-[13px] font-mono cursor-not-allowed opacity-80"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-medium text-text flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-text-muted" />
                PAN Number *
              </Label>
              <Input
                type="text"
                placeholder="10 char PAN"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                required
                className="h-[38px] bg-surface border-border-strong text-[13px] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-medium text-text">From Date *</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="h-[38px] bg-surface border-border-strong text-[13px] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-medium text-text">To Date *</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="h-[38px] bg-surface border-border-strong text-[13px] font-mono"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-text">Leave Type *</Label>
            <Select value={kind} onValueChange={(v: "paid" | "unpaid" | null) => v && setKind(v)}>
              <SelectTrigger className="w-full h-[38px] bg-surface border-border-strong text-[13px]">
                <span>
                  {kind === 'paid' && 'Paid Leave'}
                  {kind === 'unpaid' && 'Unpaid Leave'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid Leave</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-text flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-text-muted" />
              Note / Reason (Optional)
            </Label>
            <Input
              type="text"
              placeholder="e.g. Personal work / out of station"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-[38px] bg-surface border-border-strong text-[13px]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-[40px] mt-2 bg-[#E8630A] text-white hover:bg-[#C9540A] font-semibold rounded-lg shadow-sm"
          >
            {loading ? "Verifying..." : "Verify & Submit Leave"}
          </Button>

        </form>
      </div>
    </div>
  );
}
