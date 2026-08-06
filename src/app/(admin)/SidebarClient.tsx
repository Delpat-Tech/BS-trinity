"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarDays, Wallet, Calendar, Users, Settings, LogOut, CheckSquare } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SidebarClient() {
  const pathname = usePathname();

  const isDashboard = pathname === "/";
  const isAttendance = pathname === "/attendance" || pathname.startsWith("/period/");
  const isEmployees = pathname === "/employees" || pathname.startsWith("/employees/");
  const isLeaveApprovals = pathname === "/leaves/approvals";
  const isLeavesNew = pathname === "/leaves/new";
  const isLedgerNew = pathname === "/ledger/new";
  const isSettings = pathname === "/settings";

  const linkBase = "flex items-center gap-3 px-3 py-[10px] rounded-[8px] text-[13.5px] font-medium transition-all duration-150 mx-2";
  const linkActive = "bg-[rgba(232,99,10,0.15)] text-white font-medium";
  const linkInactive = "text-[#9BAAB8] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#CBD5E0]";
  const iconActive = "text-[#E8630A]";
  const iconInactive = "text-[#6B7A8D]";

  return (
    <div className="flex flex-col w-full gap-[2px]">
      <Link href="/" className={cn(linkBase, isDashboard ? linkActive : linkInactive)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("w-4 h-4 shrink-0", isDashboard ? iconActive : iconInactive)}>
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
        Dashboard
      </Link>

      <Link href="/attendance" className={cn(linkBase, isAttendance ? linkActive : linkInactive)}>
        <Calendar className={cn("w-4 h-4 shrink-0", isAttendance ? iconActive : iconInactive)} />
        Attendance
      </Link>

      <Link href="/employees" className={cn(linkBase, isEmployees ? linkActive : linkInactive)}>
        <Users className={cn("w-4 h-4 shrink-0", isEmployees ? iconActive : iconInactive)} />
        Employees
      </Link>

      <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#3D4A5C] px-[12px] pt-[18px] pb-[6px]">Actions</div>

      <Link href="/leaves/approvals" className={cn(linkBase, isLeaveApprovals ? linkActive : linkInactive)}>
        <CheckSquare className={cn("w-4 h-4 shrink-0", isLeaveApprovals ? iconActive : iconInactive)} />
        Leave Approvals
      </Link>

      <Link href="/leaves/new" className={cn(linkBase, isLeavesNew ? linkActive : linkInactive)}>
        <CalendarDays className={cn("w-4 h-4 shrink-0", isLeavesNew ? iconActive : iconInactive)} />
        Record Leave
      </Link>

      <Link href="/ledger/new" className={cn(linkBase, isLedgerNew ? linkActive : linkInactive)}>
        <Wallet className={cn("w-4 h-4 shrink-0", isLedgerNew ? iconActive : iconInactive)} />
        Record Advance
      </Link>

      <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#3D4A5C] px-[12px] pt-[18px] pb-[6px]">System</div>

      <Link href="/settings" className={cn(linkBase, isSettings ? linkActive : linkInactive)}>
        <Settings className={cn("w-4 h-4 shrink-0", isSettings ? iconActive : iconInactive)} />
        Settings
      </Link>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className={cn(linkBase, linkInactive, "w-full text-left cursor-pointer")}
      >
        <LogOut className={cn("w-4 h-4 shrink-0", iconInactive)} />
        Logout
      </button>
    </div>
  );
}
