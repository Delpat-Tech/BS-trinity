import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-[2px] border border-line bg-white px-[8px] py-[6px] font-mono text-[13px] transition-colors outline-none focus:border-ink disabled:pointer-events-none disabled:bg-paper disabled:text-muted aria-invalid:border-destructive read-only:bg-[#F5F2ED] read-only:text-[#8A817A] read-only:border-[#E4DED4]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
