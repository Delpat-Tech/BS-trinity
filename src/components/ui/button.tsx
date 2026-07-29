import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-[3px] border border-transparent text-[12.5px] font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:bg-[#E4DED4] disabled:text-[#A29A90] disabled:border-[#D6CFC4]",
  {
    variants: {
      variant: {
        default: "bg-ink text-white border-ink hover:bg-ink-hover",
        outline: "bg-paper text-ink border-line-strong hover:bg-sunken",
        ghost: "bg-transparent text-ink hover:bg-sunken",
        destructive: "bg-paper text-destructive border-destructive-border hover:bg-destructive-bg",
      },
      size: {
        default: "px-[13px] py-[7px]",
        sm: "px-[12px] py-[6px]",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
