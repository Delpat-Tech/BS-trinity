'use client';

import { deletePeriodAction } from './deleteAction';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function DeletePeriodButton({ periodId, monthName, year }: { periodId: string; monthName: string; year: number }) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent navigation since the whole row is clickable
    if (!confirm(`Are you sure you want to delete ${monthName} ${year} period and all its associated records (attendance overrides, inputs, and deductions)?`)) {
      return;
    }

    try {
      await deletePeriodAction(periodId);
      toast.success(`Successfully deleted period ${monthName} ${year}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete period');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="p-2 border border-border text-red-500 rounded-[6px] hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
      title="Delete Period"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
