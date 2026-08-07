"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function PeriodTabsClient({ 
  periodId, 
  exceptionsCount,
  hasBiometrics,
  isLocked
}: { 
  periodId: string, 
  exceptionsCount: number,
  hasBiometrics: boolean,
  isLocked: boolean
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

  return (
    <div className="w-full px-8 pt-4 pb-6">
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
