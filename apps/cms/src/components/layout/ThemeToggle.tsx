import { useTranslation } from 'react-i18next'

import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/providers/ThemeProvider'

export function ThemeSwitch() {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Switch
      checked={resolvedTheme === 'dark'}
      onCheckedChange={(checked) => {
        setTheme(checked ? 'dark' : 'light')
      }}
      aria-label={t('theme.toggle')}
    />
  )
}
