import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { templateThumbUrl } from '@/features/apps/lib/appsBase'
import { cn } from '@/lib/utils'

/**
 * The design's NAME, from a label written for a dropdown.
 *
 * Those labels carry their own description because a dropdown had no other way
 * to convey one — "Chalkboard. A hand-written café board", "Primetime: a
 * headliner, and what's up next", "Spotlight (one post at a time)". Next to a
 * screenshot the description is redundant, and at card width it wraps to three
 * lines and pushes the picture around. So the card shows the head and keeps the
 * full label as its tooltip and accessible name — no copy is lost, and none has
 * to be rewritten in nine manifests.
 *
 * A label with no separator (`Modern`, `Grid`) is already just a name.
 */
function designName(label: string): string {
  const head = label.split(/[.,:(]/, 1)[0]?.trim() ?? label
  return head === '' ? label : head
}

/**
 * The picker for a `select` field marked `previewGallery` — a horizontal strip
 * of rendered screenshots instead of a dropdown, so the operator sees a design
 * before applying it.
 *
 * It replaces a control whose only affordance was a text label describing a
 * picture ("Chalkboard. A hand-written café board"), which forced a
 * pick → apply → look → go back loop for every option. That is merely tedious
 * across five menu designs and unusable across ten RSS layouts.
 *
 * A thumbnail may legitimately be missing — a template can ship before
 * `pnpm --filter @signagewall/apps previews` is re-run — so a failed image
 * collapses to a label-only card rather than a broken-image icon. That keeps the
 * field no worse than the dropdown it replaced.
 */
export function TemplateGalleryControl({
  field,
  id,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
}: FieldControlProps) {
  const { t } = useTranslation()
  const stripRef = useRef<HTMLDivElement>(null)
  const [broken, setBroken] = useState<Record<string, true>>({})
  const [overflows, setOverflows] = useState(false)

  const options = field.options ?? []
  const namespace = field.previewGallery ?? ''
  const selected = typeof value === 'string' ? value : ''
  const selectedIndex = options.findIndex((option) => option.value === selected)

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const strip = stripRef.current
    if (!strip) return
    // One card plus its gap; the first child is representative since the cards
    // are a fixed width.
    const card = strip.firstElementChild as HTMLElement | null
    const step = card ? card.offsetWidth + 8 : strip.clientWidth * 0.8
    strip.scrollBy({ left: step * direction, behavior: 'smooth' })
  }, [])

  // Only offer the arrows when there is somewhere to scroll.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const measure = (): void => {
      setOverflows(strip.scrollWidth > strip.clientWidth + 1)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(strip)
    return () => {
      observer.disconnect()
    }
  }, [options.length])

  // Bring the current choice into view on mount — with ten layouts the selected
  // one is often scrolled out of sight, which reads as "nothing is selected".
  useLayoutEffect(() => {
    const strip = stripRef.current
    if (!strip || selectedIndex < 0) return
    const card = strip.children[selectedIndex] as HTMLElement | undefined
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    // Mount only: re-running on every pick would fight the user's own scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Left/right arrows move the selection, as in a native radio group. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0 || options.length === 0) return
    event.preventDefault()
    const from = selectedIndex < 0 ? 0 : selectedIndex
    const next = options[(from + delta + options.length) % options.length]
    if (!next) return
    onChange(next.value)
    onBlur()
    const card = stripRef.current?.children[options.indexOf(next)] as HTMLElement | undefined
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        id={id}
        role="radiogroup"
        aria-label={field.label}
        aria-invalid={invalid}
        onKeyDown={onKeyDown}
        ref={stripRef}
        className={cn(
          'flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1',
          // The strip is the scroll container, so the focus ring must sit inside it.
          'scroll-px-1 scrollbar-thin',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {options.map((option) => {
          const isSelected = option.value === selected
          const hasImage = namespace !== '' && !(option.value in broken)

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (selectedIndex < 0 && option === options[0]) ? 0 : -1}
              disabled={disabled ?? false}
              title={option.label}
              aria-label={option.label}
              onClick={() => {
                onChange(option.value)
                onBlur()
              }}
              className={cn(
                'group flex w-36 shrink-0 snap-start flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-tertiary/50',
                isSelected
                  ? 'border-brand/40 bg-brand/5 dark:border-brand/30 dark:bg-brand/10'
                  : 'border-secondary bg-panel hover:border-brand/50 hover:bg-highlight/30',
              )}
            >
              <span
                className={cn(
                  'flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-sidebar ring-1 transition',
                  isSelected ? 'ring-brand' : 'ring-quaternary group-hover:opacity-100',
                  !isSelected && 'opacity-80',
                )}
              >
                {hasImage ? (
                  <img
                    src={templateThumbUrl(namespace, option.value)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                    onError={() => {
                      setBroken((current) => ({ ...current, [option.value]: true }))
                    }}
                  />
                ) : (
                  <span className="px-2 text-center text-[0.65rem] leading-tight text-secondary">
                    {t('apps.templateGallery.noPreview')}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'truncate px-0.5 text-xs leading-tight',
                  isSelected ? 'font-medium text-primary' : 'text-secondary',
                )}
              >
                {designName(option.label)}
              </span>
            </button>
          )
        })}
      </div>

      {overflows ? (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            aria-label={t('apps.templateGallery.previous')}
            disabled={disabled ?? false}
            onClick={() => {
              scrollByCard(-1)
            }}
            className="rounded-md border border-secondary bg-panel p-1 text-secondary transition-colors hover:border-brand/50 hover:text-primary disabled:opacity-50"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t('apps.templateGallery.next')}
            disabled={disabled ?? false}
            onClick={() => {
              scrollByCard(1)
            }}
            className="rounded-md border border-secondary bg-panel p-1 text-secondary transition-colors hover:border-brand/50 hover:text-primary disabled:opacity-50"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
