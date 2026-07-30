"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logLedgerEntry } from "@/app/(admin)/employees/[id]/ledger/actions";
import { toast } from "sonner";
import { Wallet, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function GlobalLedgerClient({ employees }: { employees: any[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<"advance" | "opening">("advance");
  const [amount, setAmount] = useState<string>("");
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
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive integer amount");
      return;
    }

    setLoading(true);
    try {
      await logLedgerEntry(selectedEmpId, date, type, numAmount, note);
      toast.success(`${type === 'advance' ? 'Advance' : 'Opening balance'} of ₹${numAmount.toLocaleString()} recorded for ${selectedEmployee?.name}`);
      setAmount("");
      setNote("");
      setSelectedEmpId("");
      setSearch("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to log ledger entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface">
      <div className="px-[32px] pt-[28px] pb-[20px] border-b border-border flex-none">
        <h1 className="m-0 text-[24px] font-semibold tracking-tight text-text flex items-center gap-2">
          <Wallet className="w-6 h-6 text-text-secondary" />
          Record Global Advance / Opening Ledger
        </h1>
        <div className="text-[14px] text-text-secondary mt-[4px]">
          Record an off-cycle salary advance or opening balance for any employee.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[32px] py-[28px] max-w-[720px]">
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[8px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 space-y-6">
          
          {/* Employee Search & Select */}
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-text">Select Employee *</Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                type="text"
                placeholder="Search employee by name or machine ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-[38px] bg-surface border-border-strong"
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
              <Label className="text-[13px] font-medium text-text">Entry Type *</Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="w-full h-[36px] data-[size=default]:h-[36px] bg-surface border-border-strong text-[13px] px-3 font-medium">
                  <span>
                    {type === 'advance' && 'Salary Advance'}
                    {type === 'opening' && 'Opening Balance'}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-surface border-border z-[200] min-w-[240px] text-[13px]">
                  <SelectItem value="advance" className="text-[13px] py-2">Salary Advance Disbursed</SelectItem>
                  <SelectItem value="opening" className="text-[13px] py-2">Opening Balance Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-text">Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-[36px] bg-surface border-border-strong font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-text">Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-[36px] bg-surface border-border-strong font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-text">Note / Remarks (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. Cash advance for emergency"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-[36px] bg-surface border-border-strong"
              />
            </div>
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
              disabled={loading || !selectedEmpId || !amount}
              className="h-[38px] bg-[#E8630A] text-white hover:bg-[#C9540A] font-medium"
            >
              {loading ? "Recording..." : "Save Ledger Entry"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
