"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarDays, Wallet, Calendar, Users, Settings } from "lucide-react";

export default function SidebarClient() {
  const pathname = usePathname();
  
  const isPeriods = pathname === "/" || pathname.startsWith("/period");
  const isEmployees = pathname.startsWith("/employees");
  const isLeaves = pathname.startsWith("/leaves");
  const isLedger = pathname.startsWith("/ledger");
  const isSettings = pathname.startsWith("/settings");

  const linkBase = "flex items-center gap-[10px] px-[12px] py-[8px] rounded-[6px] text-[13px] transition-all duration-150";
  const linkActive = "bg-[rgba(232,99,10,0.15)] text-white font-medium";
  const linkInactive = "text-[#9BAAB8] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#CBD5E0]";
  const iconActive = "text-[#E8630A]";
  const iconInactive = "text-[#6B7A8D]";

  return (
    <div className="flex flex-col w-full gap-[2px]">
      <Link href="/" className={cn(linkBase, isPeriods ? linkActive : linkInactive)}>
        <Calendar className={cn("w-4 h-4 shrink-0", isPeriods ? iconActive : iconInactive)} />
        Attendance
      </Link>

      <Link href="/employees" className={cn(linkBase, isEmployees ? linkActive : linkInactive)}>
        <Users className={cn("w-4 h-4 shrink-0", isEmployees ? iconActive : iconInactive)} />
        Employees
      </Link>

      <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#3D4A5C] px-[12px] pt-[18px] pb-[6px]">Actions</div>

      <Link href="/leaves/new" className={cn(linkBase, isLeaves ? linkActive : linkInactive)}>
        <CalendarDays className={cn("w-4 h-4 shrink-0", isLeaves ? iconActive : iconInactive)} />
        Record Leave
      </Link>

      <Link href="/ledger/new" className={cn(linkBase, isLedger ? linkActive : linkInactive)}>
        <Wallet className={cn("w-4 h-4 shrink-0", isLedger ? iconActive : iconInactive)} />
        Record Advance
      </Link>

      <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#3D4A5C] px-[12px] pt-[18px] pb-[6px]">System</div>

      <Link href="/settings" className={cn(linkBase, isSettings ? linkActive : linkInactive)}>
        <Settings className={cn("w-4 h-4 shrink-0", isSettings ? iconActive : iconInactive)} />
        Settings
      </Link>
    </div>
  );
}
