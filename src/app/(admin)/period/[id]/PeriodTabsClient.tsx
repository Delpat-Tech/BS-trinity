"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function PeriodTabsClient({ periodId, exceptionsCount }: { periodId: string, exceptionsCount: number }) {
  const pathname = usePathname();
  
  const isOverview = pathname === `/period/${periodId}`;
  const isExceptions = pathname.startsWith(`/period/${periodId}/queue`);
  const isReview = pathname.startsWith(`/period/${periodId}/review`);

  const activeTabClass = "text-[13px] pb-[9px] border-b-[2px] border-text text-text";
  const inactiveTabClass = "text-[13px] pb-[9px] border-b-[2px] border-transparent text-text-secondary hover:text-text transition-colors";

  return (
    <div className="flex gap-[20px] mt-[14px]">
      <Link 
        href={`/period/${periodId}`}
        className={cn(isOverview ? activeTabClass : inactiveTabClass)}
      >
        Upload
      </Link>
      
      <Link 
        href={`/period/${periodId}/queue`}
        className={cn(isExceptions ? activeTabClass : inactiveTabClass)}
      >
        Resolve
      </Link>

      <Link 
        href={`/period/${periodId}/review`}
        className={cn(isReview ? activeTabClass : inactiveTabClass)}
      >
        Review
      </Link>
    </div>
  );
}
