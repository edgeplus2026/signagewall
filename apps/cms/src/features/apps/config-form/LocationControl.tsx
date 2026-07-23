import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { GEO_CITIES, GEO_COUNTRIES, type GeoCity } from '@/features/apps/lib/geo/worldCities'

interface LocationValue {
  label?: string
  lat: number
  lng: number
}

/** ISO alpha-2 → country name, for grouping and disambiguating the option value. */
const COUNTRY_NAME = new Map(GEO_COUNTRIES.map((country) => [country.code, country.name]))

/** A stable, globally-unique option value (city names repeat across countries). */
function optionValue(city: GeoCity): string {
  return `${city.cc}:${city.name}`
}

/**
 * The city dropdown, grouped by country. Cities keep their source order (largest
 * first within each country), so groups stay contiguous for the grouped renderer.
 */
const CITY_OPTIONS: ComboboxOption[] = GEO_CITIES.map((city) => ({
  value: optionValue(city),
  label: city.name,
  group: COUNTRY_NAME.get(city.cc) ?? city.cc,
}))

const CITY_BY_OPTION = new Map(GEO_CITIES.map((city) => [optionValue(city), city]))

/** Coordinate key so a saved location resolves back to its dropdown option. */
function coordKey(lat: number, lng: number): string {
  return `${String(lat)},${String(lng)}`
}
const OPTION_BY_COORD = new Map(
  GEO_CITIES.map((city) => [coordKey(city.lat, city.lng), optionValue(city)]),
)

function asLocation(value: unknown): LocationValue | undefined {
  if (value && typeof value === 'object' && 'lat' in value && 'lng' in value) {
    return value as LocationValue
  }
  return undefined
}

/** The current option value (matched by coordinates), '' for legacy/unknown. */
function currentOptionValue(value: unknown): string {
  const location = asLocation(value)
  if (!location) return ''
  return OPTION_BY_COORD.get(coordKey(location.lat, location.lng)) ?? ''
}

/** A display label for a legacy value the dataset no longer resolves exactly. */
function legacyLabel(value: unknown): string | undefined {
  const location = asLocation(value)
  if (location?.label) return location.label
  return typeof value === 'string' ? value : undefined
}

/**
 * The `location` field control: an offline, searchable dropdown of world cities
 * grouped by country (no geocode, no maps API). The stored value is
 * `{ label, lat, lng }` so the backend fetches straight from the coordinates.
 * Reuses the shared {@link Combobox} with its grouped, capped rendering.
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
      value={currentOptionValue(value)}
      selectedLabel={legacyLabel(value)}
      options={CITY_OPTIONS}
      maxResults={60}
      onChange={(selected) => {
        const city = CITY_BY_OPTION.get(selected)
        if (city) {
          onChange({ label: city.name, lat: city.lat, lng: city.lng })
        }
      }}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={field.placeholder ?? 'Search a city…'}
      searchPlaceholder="Search city or country…"
      emptyLabel="No matching city"
      aria-invalid={invalid}
    />
  )
}
