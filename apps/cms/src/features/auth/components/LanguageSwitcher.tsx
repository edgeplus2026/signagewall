import { Check, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { value: 'en', labelKey: 'settings.language.options.en' },
  { value: 'sr', labelKey: 'settings.language.options.sr' },
] as const

/** i18next may report a regional code (e.g. `sr-Latn`); collapse to the base. */
function getLanguageCode(language: string): 'en' | 'sr' {
  return language.split('-')[0] === 'sr' ? 'sr' : 'en'
}

/**
 * Compact locale switcher for the auth pages (user isn't signed in yet, so the
 * choice is only persisted locally by i18next's localStorage cache — no API call).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const current = getLanguageCode(i18n.language)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
        >
          <Globe className="size-4" />
          {t(`settings.language.options.${current}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            onClick={() => {
              void i18n.changeLanguage(lang.value)
            }}
          >
            {t(lang.labelKey)}
            {lang.value === current ? <Check className="ml-auto size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
