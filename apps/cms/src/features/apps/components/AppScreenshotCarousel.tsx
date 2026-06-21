import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface AppScreenshotCarouselProps {
  images: string[]
  alt: string
}

/**
 * A simple screenshot gallery: one large active preview with a thumbnail
 * strip to switch between images. No sliding/swiping.
 */
export function AppScreenshotCarousel({ images, alt }: AppScreenshotCarouselProps) {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return null
  }

  const activeSrc = images[active] ?? images[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-quaternary">
        <div className="aspect-video w-full">
          <img
            src={activeSrc}
            alt={alt}
            className="size-full object-cover"
          />
        </div>
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={t('apps.carousel.goTo', { index: i + 1 })}
              aria-current={i === active}
              onClick={() => {
                setActive(i)
              }}
              className={cn(
                'aspect-video overflow-hidden rounded-md ring-1 transition',
                i === active
                  ? 'ring-2 ring-brand'
                  : 'opacity-70 ring-quaternary hover:opacity-100',
              )}
            >
              <img
                src={src}
                alt={`${alt} — ${String(i + 1)}`}
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
