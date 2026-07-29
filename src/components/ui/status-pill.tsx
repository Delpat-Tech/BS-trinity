import * as React from "react"
import { cn } from "@/lib/utils"

type StatusVariant = "open" | "resolving" | "review" | "locked" | "service_ended"

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: StatusVariant
  children?: React.ReactNode
}

export function StatusPill({ variant, className, children, ...props }: StatusPillProps) {
  const variantStyles = {
    open: "bg-[#F5F2ED] text-[#57534E] border-[#DED8CF]",
    resolving: "bg-[#FBF0E0] text-[#7C4A15] border-[#E8D3AE]",
    review: "bg-[#FBF0E0] text-[#7C4A15] border-[#E8D3AE]",
    locked: "bg-[#F0F4E6] text-[#3F5E12] border-[#D3DFBC]",
    service_ended: "bg-[#FAECEA] text-[#A62121] border-[#E3C9C4]",
  }

  const defaultText = {
    open: "Open",
    resolving: "Resolving",
    review: "Review",
    locked: "Locked",
    service_ended: "Service ended",
  }

  return (
    <span
      className={cn(
        "inline-block font-medium rounded-[2px] border px-[8px] py-[2px] text-[11.5px] leading-tight",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children || defaultText[variant]}
    </span>
  )
}
