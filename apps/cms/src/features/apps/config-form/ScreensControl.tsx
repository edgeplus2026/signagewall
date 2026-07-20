import { useTranslation } from 'react-i18next'

import { MultiSelectControl } from '@/features/apps/config-form/controls'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { useScreens } from '@/features/screens/hooks/useScreens'

/**
 * The `screens` field control: the org's screens as a multi-select. Used by
 * overlay apps (ticker) to pick where the overlay shows. The options come from
 * the live screen list — the manifest can't know them — and the value is the
 * array of selected screen ids, exactly what the backend snapshot resolver
 * matches against.
 */
export function ScreensControl(props: FieldControlProps) {
  const { t } = useTranslation()
  const { data: screens = [], isLoading } = useScreens()

  const options = screens.map((screen) => ({
    label: screen.name,
    value: screen.id,
  }))

  return (
    <MultiSelectControl
      {...props}
      disabled={(props.disabled ?? false) || isLoading}
      field={{
        ...props.field,
        options,
        placeholder:
          props.field.placeholder ??
          (screens.length === 0 && !isLoading
            ? t('apps.screensField.noScreens')
            : t('apps.screensField.placeholder')),
      }}
    />
  )
}
