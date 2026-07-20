import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface AiGeneratorButtonProps {
  onClick: () => void
  className?: string
}

/**
 * Attention-grabbing entry point to the AI generator. Deliberately off the
 * monochrome brand palette — a violet→fuchsia gradient with a soft glow — so it
 * reads as the one "premium" action on the page. Carries a Beta badge.
 */
export function AiGeneratorButton({ onClick, className }: AiGeneratorButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundImage: 'linear-gradient(110deg, #6366f1 0%, #8b5cf6 46%, #d946ef 100%)',
      }}
      className={cn(
        'group relative inline-flex h-[1.925rem] shrink-0 items-center justify-center gap-[0.4rem]',
        'overflow-hidden rounded-[min(var(--radius-md),13px)] pr-[0.45rem] pl-[0.6875rem]',
        'text-[0.88rem] font-medium text-white',
        'shadow-[0_2px_12px_-3px_rgba(139,92,246,0.65)] transition-all outline-none',
        'hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_rgba(139,92,246,0.8)] hover:brightness-[1.06]',
        'focus-visible:ring-3 focus-visible:ring-[rgba(139,92,246,0.45)]',
        'active:translate-y-0',
        className,
      )}
    >
      {/* Glossy top sheen for a premium feel. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/25 to-transparent"
      />
      <SparklesIcon className="relative size-[0.9625rem]" />
      <span className="relative">{t('aiGenerator.button')}</span>
      <span className="relative rounded bg-white/20 px-1.5 py-[0.5px] text-[0.625rem] font-semibold tracking-wide uppercase">
        Beta
      </span>
    </button>
  )
}
