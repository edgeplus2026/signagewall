import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * Inner gutter for block content. The horizontal bound now comes from the
 * frame's rails, so this only holds content off them — no max-width of its
 * own, or content would float free of the line it is supposed to sit against.
 */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('w-full px-6 md:px-10 lg:px-14', className)} {...props} />
}
