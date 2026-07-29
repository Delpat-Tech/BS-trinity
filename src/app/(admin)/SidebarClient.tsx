"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SidebarClient() {
  const pathname = usePathname();
  
  const isPeriods = pathname === "/" || pathname.startsWith("/period");
  const isEmployees = pathname.startsWith("/employees");
  const isSettings = pathname.startsWith("/settings");

  return (
    <>
      <Link 
        href="/" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors",
          isPeriods 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        Periods
      </Link>
      <Link 
        href="/employees" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors",
          isEmployees 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        Employees
      </Link>
      <Link 
        href="/settings" 
        className={cn(
          "px-[10px] py-[6px] rounded-[4px] text-[13px] cursor-pointer transition-colors",
          isSettings 
            ? "bg-[#E6E2DB] font-medium text-text" 
            : "text-text-secondary hover:bg-[#EBE8E2] hover:text-text"
        )}
      >
        Settings
      </Link>
    </>
  );
}
