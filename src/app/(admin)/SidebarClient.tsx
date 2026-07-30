"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, CalendarDays, Wallet, Calendar, Users, Settings } from "lucide-react";
import { toast } from "sonner";

export default function SidebarClient() {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    toast.success("Data refreshed");
    setTimeout(() => setRefreshing(false), 600);
  };
  
  const isPeriods = pathname === "/" || pathname.startsWith("/period");
  const isEmployees = pathname.startsWith("/employees");
  const isLeaves = pathname.startsWith("/leaves");
  const isLedger = pathname.startsWith("/ledger");
  const isSettings = pathname.startsWith("/settings");

  return (
    <div className="flex flex-col gap-1 w-full">
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex items-center gap-2 px-[10px] py-[6px] mb-2 rounded-[4px] text-[12.5px] font-medium text-text bg-surface border border-border-strong hover:bg-hover transition-colors text-left w-full shadow-sm cursor-pointer"
        title="Refetch data globally"
      >
        <RefreshCw className={cn("w-3.5 h-3.5 text-text-secondary", refreshing && "animate-spin text-text")} />
        <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
      </button>

      <Link 
        href="/" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors flex items-center gap-2",
          isPeriods 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        <Calendar className="w-3.5 h-3.5" />
        Periods
      </Link>

      <Link 
        href="/employees" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors flex items-center gap-2",
          isEmployees 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        <Users className="w-3.5 h-3.5" />
        Employees
      </Link>

      <div className="my-1.5 border-t border-border-strong" />

      <Link 
        href="/leaves/new" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors flex items-center gap-2",
          isLeaves 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Record Leave
      </Link>

      <Link 
        href="/ledger/new" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors flex items-center gap-2",
          isLedger 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        <Wallet className="w-3.5 h-3.5" />
        Record Advance
      </Link>

      <div className="my-1.5 border-t border-border-strong" />

      <Link 
        href="/settings" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors flex items-center gap-2",
          isSettings 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        <Settings className="w-3.5 h-3.5" />
        Settings
      </Link>
    </div>
  );
}
