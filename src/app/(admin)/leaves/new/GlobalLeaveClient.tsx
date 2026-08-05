"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLeave } from "@/app/(admin)/employees/[id]/leave/actions";
import { toast } from "sonner";
import { CalendarDays, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function GlobalLeaveClient({ employees }: { employees: any[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [kind, setKind] = useState<"paid" | "unpaid" | "half">("paid");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.machineId.toString().includes(search)
  );

  const selectedEmployee = employees.find((e) => e._id === selectedEmpId);
  const isSelectionActive = selectedEmployee && search === `${selectedEmployee.name} (#${selectedEmployee.machineId})`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      toast.error("Please select an employee");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Please select a date range");
      return;
    }
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (start > end) {
      toast.error("From Date cannot be after To Date");
      return;
    }

    if (!note.trim()) {
      toast.error("Please enter a note or reason");
      return;
    }

    setLoading(true);
    try {
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }
      
      // We can await Promise.all, but simple loop works if the range is short
      for (const d of dates) {
        await addLeave(selectedEmpId, d, kind, note);
      }

      toast.success(`Leave recorded for ${selectedEmployee?.name || 'employee'}`);
      setNote("");
      setSelectedEmpId("");
      setSearch("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to log leave entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface">
      <div className="px-[32px] pt-[28px] pb-[20px] border-b border-border flex-none">
        <h1 className="m-0 text-[24px] font-semibold tracking-tight text-text flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-text-secondary" />
          Record Global Leave
        </h1>
        <div className="text-[14px] text-text-secondary mt-[4px]">
          Select an employee to log an off-cycle or retroactive leave entry.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[32px] py-[28px] max-w-[720px]">
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[8px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 space-y-6">
          
          {/* Employee Search & Select */}
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-text">Select Employee *</Label>
            
            <div className="flex items-center h-[38px] rounded-[6px] bg-surface border border-border-strong focus-within:ring-1 focus-within:ring-[#E8630A] px-3 gap-2">
              <Search className="w-[14px] h-[14px] text-text-muted shrink-0" />
              <input
                type="text"
                className="search-input flex-1 text-text placeholder:text-text-muted"
                placeholder="Search employee by name or machine ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {!isSelectionActive && (
              <div className="mt-2 max-h-[200px] overflow-y-auto border border-border rounded-md bg-surface divide-y divide-border-subtle">
                {filteredEmployees.length === 0 ? (
                  <div className="p-3 text-center text-[12.5px] text-text-muted">No active employees found</div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = emp._id === selectedEmpId;
                    return (
                      <button
                        type="button"
                        key={emp._id}
                        onClick={() => {
                          setSelectedEmpId(emp._id);
                          setSearch(`${emp.name} (#${emp.machineId})`);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 text-left text-[13px] transition-colors hover:bg-hover ${
                          isSelected ? "bg-hover font-medium text-text" : "text-text-secondary"
                        }`}
                      >
                        <div>
                          <span className="font-mono text-text-muted mr-2">#{emp.machineId}</span>
                          <span className="text-text font-medium">{emp.name}</span>
                          {emp.designation && <span className="text-[11.5px] text-text-muted ml-2">({emp.designation})</span>}
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
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-text">Leave Type *</Label>
              <Select value={kind} onValueChange={(val: any) => setKind(val)}>
                <SelectTrigger className="w-full h-[36px] data-[size=default]:h-[36px] bg-surface border-border-strong text-[13px] px-3 font-medium">
                  <span>
                    {kind === 'paid' && 'Paid Leave'}
                    {kind === 'half' && 'Half Day'}
                    {kind === 'unpaid' && 'Unpaid Leave'}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-surface border-border z-[200] min-w-[240px] text-[13px]">
                  <SelectItem value="paid" className="text-[13px] py-2">Paid Leave (Full Day)</SelectItem>
                  <SelectItem value="half" className="text-[13px] py-2">Half Day Leave</SelectItem>
                  <SelectItem value="unpaid" className="text-[13px] py-2">Unpaid Leave (Absent)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-1">
              <Label className="text-[13px] font-medium text-text">From Date *</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="h-[36px] bg-surface border-border-strong font-mono"
              />
            </div>
            
            <div className="space-y-2 col-span-1">
              <Label className="text-[13px] font-medium text-text">To Date *</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="h-[36px] bg-surface border-border-strong font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-text">Note / Reason *</Label>
            <Input
              type="text"
              placeholder="e.g. Approved medical leave card"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              className="h-[36px] bg-surface border-border-strong"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/employees")}
              className="h-[38px] border-border-strong"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedEmpId || !note.trim()}
              className="h-[38px] bg-[#E8630A] text-white hover:bg-[#C9540A] font-medium"
            >
              {loading ? "Recording..." : "Save Leave Entry"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
