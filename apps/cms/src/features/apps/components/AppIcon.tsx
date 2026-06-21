import { RocketIcon } from 'lucide-react'

import { resolveAppColor } from '@/features/apps/lib/appColor'
import { cn } from '@/lib/utils'

interface AppIconProps {
  /** Inline SVG markup; falls back to a rocket glyph when empty. */
  iconSvg?: string | undefined
  /** Brand colour (hex) used as the tile background. */
  color?: string | undefined
  /** Tailwind classes for the tile (size + radius). */
  className?: string | undefined
}

/**
 * Strip anything executable from pasted SVG before rendering it inline. Icons
 * are authored by super-admins, but this keeps a hostile/broken paste from
 * running scripts.
 */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '')
}

export function AppIcon({ iconSvg, color, className }: AppIconProps) {
  const trimmed = iconSvg?.trim()

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden text-white',
        "[&_svg]:size-[55%] [&_img]:size-[55%]",
        className,
      )}
      style={{ backgroundColor: resolveAppColor(color) }}
    >
      {trimmed ? (
        <span
          className="flex size-full items-center justify-center [&_svg]:size-[55%]"
           
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(trimmed) }}
        />
      ) : (
        <RocketIcon className="size-[50%]!" />
      )}
    </div>
  )
}
