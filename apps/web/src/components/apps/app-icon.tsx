import { cn } from '@/lib/utils'

/**
 * Renders an app's inline-SVG icon (from the `@edge/apps` manifest, `currentColor`
 * stroke). The markup is trusted — it comes from our own code registry, not user
 * input — so `dangerouslySetInnerHTML` is safe here.
 */
export function AppIcon({ svg, className }: { svg?: string; className?: string }) {
  if (!svg) {
    return <span className={cn('block rounded bg-highlight', className)} aria-hidden />
  }
  return (
    <span
      aria-hidden
      className={cn('inline-flex items-center justify-center [&_svg]:size-full', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
