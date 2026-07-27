import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium',
    // `ink` (globals.css) wipes a pane of `--ink` up from the bottom edge on
    // hover; each variant picks that colour and the label colour it flips to.
    'ink',
    'focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default:
          'border border-brand bg-brand text-brand-contrast [--ink:var(--brand-contrast)] hover:text-primary',
        outline:
          'border border-primary bg-transparent text-primary [--ink:var(--brand)] hover:text-brand-contrast',
        ghost: 'text-primary [--ink:var(--highlight)]',
        // For the inverted plate, where the brand pair is already the other way up.
        inverse:
          'border border-brand-contrast bg-brand-contrast text-primary [--ink:var(--brand)] hover:text-brand-contrast',
        inverseOutline:
          'border border-brand-contrast/40 text-brand-contrast [--ink:var(--brand-contrast)] hover:border-brand-contrast hover:text-primary',
        // No box to ink, so the rule under the label sweeps in from the left instead.
        link: 'text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out hover:after:origin-left hover:after:scale-x-100',
      },
      size: {
        sm: 'h-9 px-3',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
