import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-[0.9625rem] whitespace-nowrap transition-all outline-none select-none focus-visible:border-tertiary focus-visible:ring-3 focus-visible:ring-tertiary/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-70 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.1rem]",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-contrast hover:bg-brand/90",
        outline:
          "border-secondary bg-panel hover:border-primary hover:bg-sidebar hover:text-primary aria-expanded:bg-sidebar aria-expanded:text-primary",
        secondary:
          "bg-panel text-primary hover:bg-[color-mix(in_oklch,var(--panel),var(--text-primary)_5%)] aria-expanded:bg-panel aria-expanded:text-primary",
        ghost:
          "hover:bg-sidebar hover:text-primary aria-expanded:bg-sidebar aria-expanded:text-primary",
        danger:
          "bg-danger/10 text-danger hover:bg-danger/20 focus-visible:border-danger/40 focus-visible:ring-danger/20",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[2.2rem] gap-[0.4125rem] px-[0.6875rem] has-data-[icon=inline-end]:pr-[0.55rem] has-data-[icon=inline-start]:pl-[0.55rem]",
        xs: "h-[1.65rem] gap-[0.275rem] rounded-[min(var(--radius-md),11px)] px-[0.55rem] text-[0.825rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-[0.4125rem] has-data-[icon=inline-start]:pl-[0.4125rem] [&_svg:not([class*='size-'])]:size-[0.825rem]",
        sm: "h-[1.925rem] gap-[0.275rem] rounded-[min(var(--radius-md),13px)] px-[0.6875rem] text-[0.88rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-[0.4125rem] has-data-[icon=inline-start]:pl-[0.4125rem] [&_svg:not([class*='size-'])]:size-[0.9625rem]",
        lg: "h-[2.475rem] gap-[0.4125rem] px-[0.6875rem] has-data-[icon=inline-end]:pr-[0.55rem] has-data-[icon=inline-start]:pl-[0.55rem]",
        icon: "size-[2.2rem]",
        "icon-xs":
          "size-[1.65rem] rounded-[min(var(--radius-md),11px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-[0.825rem]",
        "icon-sm":
          "size-[1.925rem] rounded-[min(var(--radius-md),13px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-[2.475rem]",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
