import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium', className)} {...props} />
}

/* Focus is coral, matching the catalogue's search field — the contact form was
   the one input on the site that lit up grey instead. */
const fieldBase =
  'w-full border border-secondary bg-page px-3.5 text-sm outline-none transition-colors placeholder:text-secondary/60 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-32 py-2.5', className)} {...props} />
}

export function Field({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />
}
