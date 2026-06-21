import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { settingsApi } from '@/features/settings/api/settingsApi'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'
import type { SupportedLanguage, ThemePreference } from '@/features/settings/types/settings.types'
import { useTheme } from '@/providers/ThemeProvider'

const THEMES: ThemePreference[] = ['light', 'dark', 'system']

const LANGUAGES: { value: SupportedLanguage; labelKey: string }[] = [
  { value: 'en', labelKey: 'settings.language.options.en' },
  { value: 'sr', labelKey: 'settings.language.options.sr' },
]

function getLanguageCode(language: string): SupportedLanguage {
  return language.split('-')[0] === 'sr' ? 'sr' : 'en'
}

export function PreferencesSection() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const language = getLanguageCode(i18n.language)

  const handleLanguageChange = async (value: SupportedLanguage) => {
    if (value === language) return

    setIsSaving(true)

    try {
      await i18n.changeLanguage(value)
      try {
        await settingsApi.updateSettings({ language: value })
      } catch {
        // Language is applied locally even when the API is unavailable.
      }
      toast.success(t('settings.language.success'))
    } catch {
      toast.error(t('settings.language.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsSection title={t('settings.sections.preferences')}>
      <SettingsRow label={t('settings.appearance.theme')}>
        <Select
          value={theme}
          onValueChange={(value) => {
            setTheme(value as ThemePreference)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEMES.map((themeOption) => (
              <SelectItem key={themeOption} value={themeOption}>
                {t(`theme.${themeOption}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow label={t('settings.language.label')}>
        <Select
          value={language}
          onValueChange={(value) => {
            void handleLanguageChange(value as SupportedLanguage)
          }}
          disabled={isSaving}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {t(lang.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
    </SettingsSection>
  )
}
