import { cn } from '@/lib/utils'

interface AppTvFrameProps {
  src: string
  alt: string
  /** Tailwind gradient classes for the soft glow behind the frame. */
  glow: string
  className?: string
}

/**
 * The premium "TV on a desk" preview used on app cards. A thick dark bezel
 * sits above a soft coloured glow to give the floating-screen look.
 */
export function AppTvFrame({ src, alt, glow, className }: AppTvFrameProps) {
  return (
    <div className={cn('relative isolate', className)}>
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-6 -bottom-2 top-6 -z-10 rounded-[2rem] bg-linear-to-br blur-2xl',
          glow,
        )}
      />
      <div className="rounded-xl bg-neutral-900 p-2 shadow-xl ring-1 ring-black/10 dark:ring-white/10">
        <div className="aspect-video overflow-hidden rounded-md bg-neutral-800">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="size-full object-cover"
          />
        </div>
      </div>
    </div>
  )
}
