import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * A ruled cell inside a block. Cards share the block's line weight and flat
 * corners so a grid of them reads as a drawn table, not as floating tiles.
 */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('border border-secondary bg-panel p-8', className)} {...props} />
}
