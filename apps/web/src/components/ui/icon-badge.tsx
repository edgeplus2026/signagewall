import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * The solid square chip that heads feature, step and platform cards — the one
 * piece of high-contrast mass in an otherwise line-drawn layout.
 */
export function IconBadge({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex size-11 shrink-0 items-center justify-center bg-brand text-brand-contrast [&_svg]:size-5',
        className,
      )}
      {...props}
    />
  )
}
