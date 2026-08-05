"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Search, 
  Clock, 
  Check, 
  X, 
  Filter,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  approveLeave, 
  rejectLeave, 
  updateAndApproveLeave, 
  bulkApproveLeaves, 
  bulkRejectLeaves 
} from "./actions";

interface LeaveItem {
  _id: string;
  employeeId: number;
  date: string;
  kind: 'paid' | 'unpaid' | 'half';
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  loggedAt?: string;
  rejectionReason?: string;
  emp?: {
    name: string;
    machineId: number;
    phone?: string;
  };
  loggedByUser?: {
    username: string;
  };
}

export default function LeaveApprovalsClient({ leaves }: { leaves: LeaveItem[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editingLeave, setEditingLeave] = useState<LeaveItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editKind, setEditKind] = useState<'paid' | 'unpaid' | 'half'>('paid');
  const [editNote, setEditNote] = useState("");

  // Reject Modal State
  const [rejectingLeave, setRejectingLeave] = useState<LeaveItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Count pending leaves for badge
  const pendingCount = leaves.filter(l => (l.status || 'pending') === 'pending').length;

  const filteredLeaves = leaves.filter((leave) => {
    const status = leave.status || 'pending';
    if (activeTab !== 'all' && status !== activeTab) return false;
    
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const empName = leave.emp?.name?.toLowerCase() || '';
    const empId = leave.employeeId?.toString() || '';
    const note = leave.note?.toLowerCase() || '';
    return empName.includes(q) || empId.includes(q) || note.includes(q);
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredLeaves.map(l => l._id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      await approveLeave(id);
      toast.success("Leave request approved");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve leave");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReject = (leave: LeaveItem) => {
    setRejectingLeave(leave);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingLeave) return;
    setLoading(true);
    try {
      await rejectLeave(rejectingLeave._id, rejectionReason);
      toast.success("Leave request rejected");
      setRejectingLeave(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject leave");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (leave: LeaveItem) => {
    setEditingLeave(leave);
    setEditDate(leave.date);
    setEditKind(leave.kind);
    setEditNote(leave.note || "");
  };

  const handleSaveEdit = async () => {
    if (!editingLeave) return;
    setLoading(true);
    try {
      await updateAndApproveLeave(editingLeave._id, {
        date: editDate,
        kind: editKind,
        note: editNote
      });
      toast.success("Leave request updated and approved");
      setEditingLeave(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update leave");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await bulkApproveLeaves(selectedIds);
      toast.success(`${selectedIds.length} leave requests approved`);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to bulk approve");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await bulkRejectLeaves(selectedIds);
      toast.success(`${selectedIds.length} leave requests rejected`);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to bulk reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('pending'); setSelectedIds([]); }}
            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-[#E8630A] text-white shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Requests
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.5 text-[11px] rounded-full font-bold ${
                activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-[#E8630A]/10 text-[#E8630A]'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('approved'); setSelectedIds([]); }}
            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'approved'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Approved
          </button>

          <button
            onClick={() => { setActiveTab('rejected'); setSelectedIds([]); }}
            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'rejected'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Rejected
          </button>

          <button
            onClick={() => { setActiveTab('all'); setSelectedIds([]); }}
            className={`px-4 py-2 text-[13px] font-medium rounded-md transition-all ${
              activeTab === 'all'
                ? 'bg-surface-hover text-text border border-border font-semibold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            All
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search employee or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-[13px] bg-surface border-border-strong"
          />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-surface border border-primary/30 rounded-lg shadow-sm">
          <span className="text-[13px] font-medium text-text">
            {selectedIds.length} item(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkApprove}
              disabled={loading}
              className="h-8 bg-green-600 hover:bg-green-700 text-white text-[12px]"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Approve Selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkReject}
              disabled={loading}
              className="h-8 text-[12px]"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reject Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead>
            <tr className="bg-header border-b border-border text-[11px] font-medium uppercase tracking-wider text-text-muted">
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filteredLeaves.length > 0 && selectedIds.length === filteredLeaves.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-border-strong text-primary focus:ring-primary cursor-pointer"
                />
              </th>
              <th className="p-3">Employee</th>
              <th className="p-3">Leave Date</th>
              <th className="p-3">Type</th>
              <th className="p-3">Note / Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredLeaves.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-muted text-[13px]">
                  No leave requests found for this filter.
                </td>
              </tr>
            ) : (
              filteredLeaves.map((leave) => {
                const status = leave.status || 'pending';
                const formattedDate = format(parseISO(leave.date), 'MMM d, yyyy (EEE)');
                const isSelected = selectedIds.includes(leave._id);

                return (
                  <tr 
                    key={leave._id} 
                    className={`hover:bg-surface-hover transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(leave._id)}
                        className="rounded border-border-strong text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-text">{leave.emp?.name || `Emp #${leave.employeeId}`}</div>
                      <div className="text-[11px] text-text-muted font-mono">#{leave.employeeId}</div>
                    </td>
                    <td className="p-3 font-mono font-medium text-text">
                      {formattedDate}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${
                        leave.kind === 'paid' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : leave.kind === 'half'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {leave.kind} Leave
                      </span>
                    </td>
                    <td className="p-3 text-text-secondary max-w-xs truncate">
                      {leave.note || <span className="italic text-text-muted">No note</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md uppercase tracking-wider ${
                        status === 'approved'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : status === 'rejected'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(leave._id)}
                              disabled={loading}
                              className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 px-2"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReject(leave)}
                              disabled={loading}
                              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(leave)}
                          disabled={loading}
                          className="h-8 text-text-muted hover:text-text px-2"
                          title="Edit & Adjust"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / Change Modal */}
      <Dialog open={!!editingLeave} onOpenChange={(open) => !open && setEditingLeave(null)}>
        <DialogContent className="bg-surface border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-text font-semibold text-[16px]">Edit & Approve Leave Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-text-secondary">Employee</Label>
              <div className="font-semibold text-[14px] text-text">
                {editingLeave?.emp?.name} (#{editingLeave?.employeeId})
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-text-secondary">Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="bg-surface border-border-strong text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-text-secondary">Leave Kind</Label>
              <Select value={editKind} onValueChange={(val: any) => setEditKind(val)}>
                <SelectTrigger className="w-full bg-surface border-border-strong text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="paid">Paid Leave</SelectItem>
                  <SelectItem value="half">Half Day</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-text-secondary">Note / Reason</Label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="bg-surface border-border-strong text-[13px]"
                placeholder="Optionally update note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLeave(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading} className="bg-primary hover:bg-primary-hover text-white">
              Save & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectingLeave} onOpenChange={(open) => !open && setRejectingLeave(null)}>
        <DialogContent className="bg-surface border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-text font-semibold text-[16px]">Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-[13px] text-text-secondary">
              Are you sure you want to reject the leave for <strong className="text-text">{rejectingLeave?.emp?.name}</strong> on <span className="font-mono text-text">{rejectingLeave?.date}</span>?
            </p>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-text-secondary">Rejection Reason (Optional)</Label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-surface border-border-strong text-[13px]"
                placeholder="e.g. Peak operational load, unannounced"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingLeave(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject} disabled={loading}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
