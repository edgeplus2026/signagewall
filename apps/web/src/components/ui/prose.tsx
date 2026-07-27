import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Long-form text styling for legal pages and rich content. */
export function Prose({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'max-w-2xl text-[0.95rem] leading-relaxed text-secondary',
        '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-primary',
        '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-medium [&_h3]:text-primary',
        '[&_li]:mt-1.5 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-medium [&_strong]:text-primary',
        className,
      )}
      {...props}
    />
  )
}
