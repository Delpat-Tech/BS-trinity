"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Check, 
  Calendar, 
  Users, 
  Lock, 
  Unlock, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText 
} from "lucide-react";

export default function PeriodTabsClient({ 
  periodId, 
  exceptionsCount,
  hasBiometrics,
  isLocked,
  monthName,
  shortMonth,
  month,
  year,
  employeesCount
}: { 
  periodId: string;
  exceptionsCount: number;
  hasBiometrics: boolean;
  isLocked: boolean;
  monthName?: string;
  shortMonth?: string;
  month?: number;
  year?: number;
  employeesCount?: number;
}) {
  const pathname = usePathname();
  
  const isAtStep1 = pathname === `/period/${periodId}`;
  const isAtStep2 = pathname.startsWith(`/period/${periodId}/queue`);
  const isAtStep3 = pathname.startsWith(`/period/${periodId}/review`);

  let step1Status = 'Pending';
  let step2Status = 'Pending';
  let step3Status = 'Pending';

  if (isAtStep1) {
    step1Status = 'In Progress';
  } else if (isAtStep2 || isAtStep3) {
    step1Status = 'Completed';
  }

  if (isAtStep2) {
    step2Status = 'In Progress';
  } else if (isAtStep3) {
    step2Status = 'Completed';
  }

  if (isAtStep3) {
    step3Status = isLocked ? 'Completed' : 'In Progress';
  }

  if (isLocked) {
    step1Status = 'Completed';
    step2Status = 'Completed';
    step3Status = 'Completed';
  }

  // Clickability
  const canClickStep2 = hasBiometrics;
  const canClickStep3 = hasBiometrics && exceptionsCount === 0;

  const steps = [
    { 
      label: "Upload Biometrics", 
      stepLabel: "STEP 1",
      href: `/period/${periodId}`, 
      status: step1Status,
      isClickable: true
    },
    { 
      label: "Resolve Exceptions", 
      stepLabel: "STEP 2",
      href: `/period/${periodId}/queue`, 
      status: step2Status,
      isClickable: canClickStep2
    },
    { 
      label: "Review Salary", 
      stepLabel: "STEP 3",
      href: `/period/${periodId}/review`, 
      status: step3Status,
      isClickable: canClickStep3
    },
  ];

  // Derived values for summary card
  const currentMonthName = monthName || 'June';
  const currentYear = year || 2026;
  const currentMonth = month || 6;
  const currentShortMonth = shortMonth || 'Jun';
  const totalEmployees = employeesCount ?? 86;

  const lastDayNum = new Date(currentYear, currentMonth, 0).getDate();
  const startDateStr = `01 ${currentShortMonth} ${currentYear}`;
  const endDateStr = `${String(lastDayNum).padStart(2, '0')} ${currentShortMonth} ${currentYear}`;

  return (
    <div className="w-full px-8 pt-8 pb-4 flex flex-col gap-6">
      {/* Payroll Summary Card */}
      <div className="bg-surface rounded-xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border-subtle">
          <FileText className="w-4 h-4 text-text-muted" />
          <h2 className="text-[13px] font-semibold text-text m-0 tracking-tight">Payroll Summary</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-6">
          {/* Payroll Period */}
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
              Payroll Period
            </span>
            <span className="text-[14px] font-semibold text-text">
              {currentMonthName} {currentYear}
            </span>
          </div>

          {/* Employees */}
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              <Users className="w-3.5 h-3.5 text-text-muted shrink-0" />
              Employees
            </span>
            <span className="text-[14px] font-semibold text-text font-mono">
              {totalEmployees}
            </span>
          </div>

          {/* Status */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              {isLocked ? (
                <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-text-muted shrink-0" />
              )}
              Status
            </span>
            {isLocked ? (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-success-bg text-success-text border border-success-border">
                Locked
              </span>
            ) : (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-alert-bg text-alert-text border border-alert-border">
                Open
              </span>
            )}
          </div>

          {/* Payroll Start */}
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
              Payroll Start
            </span>
            <span className="text-[14px] font-semibold text-text font-mono">
              {startDateStr}
            </span>
          </div>

          {/* Payroll End */}
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
              Payroll End
            </span>
            <span className="text-[14px] font-semibold text-text font-mono">
              {endDateStr}
            </span>
          </div>

          {/* Attendance Uploaded */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-text-muted shrink-0" />
              Attendance Uploaded
            </span>
            {hasBiometrics ? (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-success-bg text-success-text border border-success-border">
                Yes
              </span>
            ) : (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-alert-bg text-alert-text border border-alert-border">
                No
              </span>
            )}
          </div>

          {/* Exceptions Pending */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-text-muted shrink-0" />
              Exceptions Pending
            </span>
            {exceptionsCount === 0 ? (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-success-bg text-success-text border border-success-border font-mono">
                0
              </span>
            ) : (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-alert-bg text-alert-text border border-alert-border font-mono">
                {exceptionsCount}
              </span>
            )}
          </div>

          {/* Salary Review */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-text-muted shrink-0" />
              Salary Review
            </span>
            {step3Status === 'Completed' ? (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-success-bg text-success-text border border-success-border">
                Completed
              </span>
            ) : step3Status === 'In Progress' ? (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-[#e5efff] text-[#2c65d1] border border-[#b8d4ff]">
                In Progress
              </span>
            ) : (
              <span className="inline-flex items-center text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full bg-alert-bg text-alert-text border border-alert-border">
                Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stepper Container */}
      <div className="bg-surface rounded-xl p-8 shadow-sm border border-border">
        <div className="flex items-center justify-between w-full relative">
          {/* Background line */}
          <div className="absolute left-[5%] right-[5%] h-[2px] bg-border z-0 top-[24px]" />
          
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'Completed';
            const isCurrent = step.status === 'In Progress';
            const isPending = step.status === 'Pending';
            
            return (
              <div key={step.label} className="relative z-10 flex flex-col items-center group" style={{ flex: 1 }}>
                {/* Connector overlay line for active/completed steps */}
                {idx > 0 && (isCompleted || isCurrent) && (
                  <div className="absolute right-[50%] left-[-50%] h-[2px] bg-[#1a1a1a] z-[-1] top-[24px]" />
                )}

                {/* Step Circle */}
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full text-sm font-semibold transition-all duration-300 mb-4 shadow-sm",
                  isCompleted ? "bg-[#1a1a1a] text-white border-4 border-surface" : 
                  isCurrent ? "bg-[#1a1a1a] text-white border-4 border-surface ring-2 ring-[#1a1a1a]/20" : "bg-surface border-2 border-border-strong text-text-muted"
                )}>
                  {isCompleted ? <Check className="w-5 h-5" strokeWidth={3} /> : 
                   isCurrent ? (idx + 1) : <div className="w-2 h-2 rounded-full bg-border-strong" />}
                </div>

                {/* Step Text */}
                <div className="flex flex-col items-center text-center px-2 bg-surface">
                  <span className="text-[10px] font-bold tracking-wider text-text-muted mb-1 uppercase">
                    {step.stepLabel}
                  </span>
                  
                  {step.isClickable ? (
                    <Link href={step.href} className={cn(
                      "text-sm font-semibold mb-1.5 transition-colors",
                      isCurrent || isCompleted ? "text-text" : "text-text-secondary hover:text-text"
                    )}>
                      {step.label}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-text-muted mb-1.5 cursor-not-allowed">
                      {step.label}
                    </span>
                  )}
                  
                  {/* Badge */}
                  <span className={cn(
                    "text-[10px] font-semibold px-2.5 py-0.5 rounded-full transition-colors",
                    isCompleted ? "bg-success-bg/60 text-[#127a4b]" :
                    isCurrent ? "bg-[#e5efff] text-[#2c65d1]" :
                    "bg-header text-text-muted"
                  )}>
                    {step.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
