"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function FinancialYearFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentFy = searchParams.get('fy') || 'all';

  return (
    <Select value={currentFy} onValueChange={(v) => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === 'all') {
        params.delete('fy');
      } else {
        params.set('fy', v);
      }
      const newQuery = params.toString();
      router.push(`${pathname}${newQuery ? `?${newQuery}` : ''}`);
    }}>
      <SelectTrigger className="w-[160px] h-[36px] data-[size=default]:h-[36px] rounded-[6px] bg-header border-border-strong flex items-center text-[13px] px-3 font-medium">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <SelectValue placeholder="Financial Year" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-header border-border z-[200] min-w-[160px] text-[13px]">
        <SelectItem value="all" className="text-[13px] py-2">All Years</SelectItem>
        <SelectItem value="2024" className="text-[13px] py-2">2024-2025</SelectItem>
        <SelectItem value="2025" className="text-[13px] py-2">2025-2026</SelectItem>
        <SelectItem value="2026" className="text-[13px] py-2">2026-2027</SelectItem>
      </SelectContent>
    </Select>
  );
}
