import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { SERBIAN_CITIES } from '@/features/apps/lib/serbianCities'

interface LocationValue {
  label?: string
  lat: number
  lng: number
}

const CITY_OPTIONS: ComboboxOption[] = SERBIAN_CITIES.map((city) => ({
  value: city.name,
  label: city.name,
}))

/** The selected city name (from the stored object, or a legacy string value). */
function selectedName(value: unknown): string {
  if (value && typeof value === 'object') {
    return (value as LocationValue).label ?? ''
  }
  return typeof value === 'string' ? value : ''
}

/**
 * The `location` field control: an internal searchable dropdown of cities. The
 * stored value is `{ label, lat, lng }` so the backend fetches weather straight
 * from the coordinates (no geocode). Reuses the shared {@link Combobox}.
 */
export function LocationControl({
  field,
  id,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
}: FieldControlProps) {
  return (
    <Combobox
      id={id}
      value={selectedName(value)}
      options={CITY_OPTIONS}
      onChange={(name) => {
        const city = SERBIAN_CITIES.find((entry) => entry.name === name)
        if (city) {
          onChange({ label: city.name, lat: city.lat, lng: city.lng })
        }
      }}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={field.placeholder ?? 'Select a city'}
      searchPlaceholder="Search city…"
      emptyLabel="No city found"
      aria-invalid={invalid}
    />
  )
}
