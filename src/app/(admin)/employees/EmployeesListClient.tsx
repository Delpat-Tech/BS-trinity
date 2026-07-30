"use client";

import { useState } from "react";
import { EmployeeDrawer } from "./EmployeeDrawer";
import RecordLeaveModal from "./RecordLeaveModal";
import RecordAdvanceModal from "./RecordAdvanceModal";
import UploadEmployeesModal from "./UploadEmployeesModal";
import { updateMachineId } from "./actions";
import { Pencil, Check, X, MoreHorizontal, Filter, Search, ChevronLeft, ChevronRight, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function MachineIdCell({ emp }: { emp: any }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(emp.machineId.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    if (num === emp.machineId) {
      setEditing(false);
      return;
    }

    setLoading(true);
    try {
      const res = await updateMachineId(emp._id, num);
      if (res.success) {
        setEditing(false);
        toast.success("Machine ID updated successfully");
      } else {
        toast.error(res.error || "Failed to update ID");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isTempId = emp.machineId > 90000;

  return (
    <TableCell className="px-[28px] py-[11px] border-b border-border-subtle w-[100px]">
      <div className="flex items-center gap-2 group h-[24px]">
        {editing ? (
          <div className="flex items-center gap-1">
            <input 
              autoFocus
              type="number"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setEditing(false);
                  setVal(emp.machineId.toString());
                }
              }}
              className="w-[60px] px-1 py-0.5 border border-border-strong rounded text-[13px] outline-none"
              disabled={loading}
            />
            <button onClick={handleSave} disabled={loading} className="text-green-600 hover:text-green-700 disabled:opacity-50">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setEditing(false); setVal(emp.machineId.toString()); }} disabled={loading} className="text-red-500 hover:text-red-600 disabled:opacity-50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className={`font-mono ${isTempId ? 'text-red-500 font-semibold cursor-help' : ''}`} title={isTempId ? 'Temporary ID (Unmapped). Edit to link to machine.' : ''}>
              {emp.machineId}
            </span>
            <button 
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text transition-opacity"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </TableCell>
  );
}

export default function EmployeesListClient({ employees }: { employees: any[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("machineId");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Search & Filter
  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch = emp.name?.toLowerCase().includes(q) || emp.machineId.toString().includes(q);
    
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = !emp.isIgnored;
    if (statusFilter === 'resigned') matchesStatus = !!emp.isIgnored && !!emp.endDate;
    if (statusFilter === 'ignored') matchesStatus = !!emp.isIgnored && !emp.endDate;

    return matchesSearch && matchesStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'salary') {
      const revsA = a.salaryRevisions || [];
      const revsB = b.salaryRevisions || [];
      valA = [...revsA].sort((x, y) => y.effectiveFrom.localeCompare(x.effectiveFrom))[0]?.fixedSalary || 0;
      valB = [...revsB].sort((x, y) => y.effectiveFrom.localeCompare(x.effectiveFrom))[0]?.fixedSalary || 0;
    }
    
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate
  const totalPages = Math.ceil(sorted.length / rowsPerPage) || 1;
  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const getSortIndicator = (field: string) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-text-muted">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface">
      <div className="px-[32px] pt-[28px] pb-[20px] flex items-center justify-between flex-none">
        <div>
          <h1 className="m-0 text-[24px] font-semibold tracking-tight text-text flex items-center gap-2">
            <Users className="w-6 h-6 text-text-secondary" />
            Employees
          </h1>
          <div className="text-[14px] text-text-secondary mt-[4px]">
            Manage workforce, view history, and record global actions.
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-border text-text hover:bg-hover hover:text-text h-[36px] px-4">
                <MoreHorizontal className="w-4 h-4 mr-2" />
                Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="uppercase tracking-wider text-[11px] text-text-muted px-2 py-1.5">Employee Data</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setUploadModalOpen(true)}>
                Upload / Download CSV Schema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <UploadEmployeesModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />

          <EmployeeDrawer trigger={
            <Button className="bg-text text-surface hover:bg-[#332F2A] h-[36px] shadow-sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          } />
        </div>
      </div>

      <div className="px-[32px] pb-[16px] flex items-center justify-between flex-none gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-[280px] h-[36px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              type="text" 
              placeholder="Search by ID or Name..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-[36px] bg-panel border-border-strong focus-visible:ring-1 focus-visible:ring-text"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-[36px] data-[size=default]:h-[36px] bg-panel border-border-strong flex items-center text-[13px] px-3 font-medium">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-text-muted" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-panel border-border z-[200] min-w-[180px] text-[13px]">
              <SelectItem value="all" className="text-[13px] py-2">All Employees</SelectItem>
              <SelectItem value="active" className="text-[13px] py-2">Active Only</SelectItem>
              <SelectItem value="resigned" className="text-[13px] py-2">Resigned</SelectItem>
              <SelectItem value="ignored" className="text-[13px] py-2">Ignored (Hidden)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-[13px] text-text-secondary font-medium">
          {sorted.length} records found
        </div>
      </div>

      <div className="flex-1 overflow-auto px-[32px] pb-[32px]">
        <div className="border border-border rounded-lg bg-panel shadow-sm overflow-hidden">
          <Table className="w-full text-[13px] text-left">
            <TableHeader className="bg-header border-b border-border sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead 
                  className="px-[28px] py-[12px] font-semibold text-text-secondary cursor-pointer hover:text-text transition-colors w-[100px]"
                  onClick={() => toggleSort('machineId')}
                >
                  <div className="flex items-center">Mach. ID {getSortIndicator('machineId')}</div>
                </TableHead>
                <TableHead 
                  className="px-[28px] py-[12px] font-semibold text-text-secondary cursor-pointer hover:text-text transition-colors w-[220px]"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center">Full Name {getSortIndicator('name')}</div>
                </TableHead>
                <TableHead 
                  className="px-[28px] py-[12px] font-semibold text-text-secondary cursor-pointer hover:text-text transition-colors"
                  onClick={() => toggleSort('designation')}
                >
                  <div className="flex items-center">Designation {getSortIndicator('designation')}</div>
                </TableHead>
                <TableHead 
                  className="px-[28px] py-[12px] font-semibold text-text-secondary cursor-pointer hover:text-text transition-colors text-right"
                  onClick={() => toggleSort('salary')}
                >
                  <div className="flex items-center justify-end">Fixed Salary {getSortIndicator('salary')}</div>
                </TableHead>
                <TableHead 
                  className="px-[28px] py-[12px] font-semibold text-text-secondary cursor-pointer hover:text-text transition-colors text-center"
                  onClick={() => toggleSort('isIgnored')}
                >
                  <div className="flex items-center justify-center">Status {getSortIndicator('isIgnored')}</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((emp) => {
                const revisions = emp.salaryRevisions || [];
                const latestSalary = [...revisions].sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.fixedSalary || 0;
                
                return (
                  <EmployeeDrawer key={emp._id} employee={emp} trigger={
                    <TableRow className="border-b border-border-subtle last:border-0 hover:bg-hover transition-colors cursor-pointer">
                      <MachineIdCell emp={emp} />
                      <TableCell className="px-[28px] py-[11px] font-medium text-text">
                        {emp.name}
                      </TableCell>
                      <TableCell className="px-[28px] py-[11px] text-text-secondary truncate max-w-[200px]">
                        {emp.designation || '-'}
                      </TableCell>
                      <TableCell className="px-[28px] py-[11px] text-right font-mono text-text">
                        ₹{latestSalary.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-[28px] py-[11px] text-center">
                        {emp.isIgnored ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 border border-red-200">
                            {emp.endDate ? 'Resigned' : 'Ignored'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 border border-green-200">
                            Active
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  } />
                );
              })}
              
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-[48px] text-center text-text-muted text-[14px]">
                    No employees found matching the filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Enhanced Pagination Footer */}
          <div className="flex items-center justify-between px-[24px] py-[12px] bg-header border-t border-border">
            <div className="text-[13px] text-text-secondary">
              Showing <span className="font-medium text-text">{paginated.length > 0 ? (page - 1) * rowsPerPage + 1 : 0}</span> to <span className="font-medium text-text">{Math.min(page * rowsPerPage, sorted.length)}</span> of <span className="font-medium text-text">{sorted.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="h-8 border-border-strong text-text"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <div className="text-[13px] font-medium px-2 min-w-[60px] text-center">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="h-8 border-border-strong text-text"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
