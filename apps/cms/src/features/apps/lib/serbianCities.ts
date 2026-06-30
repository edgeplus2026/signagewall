/** A city option for the `location` field, with coordinates the backend uses. */
export interface CityOption {
  name: string
  lat: number
  lng: number
}

/**
 * Seed list for the location picker — the 20 largest Serbian cities with their
 * coordinates. The weather connector fetches straight from `lat`/`lng` (no
 * geocode). Extend or replace this list as we add regions/countries.
 */
export const SERBIAN_CITIES: CityOption[] = [
  { name: 'Beograd', lat: 44.8125, lng: 20.4612 },
  { name: 'Novi Sad', lat: 45.2671, lng: 19.8335 },
  { name: 'Niš', lat: 43.3209, lng: 21.8958 },
  { name: 'Kragujevac', lat: 44.0128, lng: 20.9114 },
  { name: 'Subotica', lat: 46.1008, lng: 19.665 },
  { name: 'Zrenjanin', lat: 45.3836, lng: 20.3819 },
  { name: 'Pančevo', lat: 44.8708, lng: 20.6403 },
  { name: 'Čačak', lat: 43.8914, lng: 20.3497 },
  { name: 'Kraljevo', lat: 43.7258, lng: 20.6894 },
  { name: 'Novi Pazar', lat: 43.1367, lng: 20.5122 },
  { name: 'Kruševac', lat: 43.5806, lng: 21.3258 },
  { name: 'Leskovac', lat: 42.9981, lng: 21.9461 },
  { name: 'Valjevo', lat: 44.2708, lng: 19.8908 },
  { name: 'Vranje', lat: 42.5544, lng: 21.9 },
  { name: 'Šabac', lat: 44.7547, lng: 19.6975 },
  { name: 'Užice', lat: 43.8556, lng: 19.8425 },
  { name: 'Sombor', lat: 45.7742, lng: 19.1122 },
  { name: 'Požarevac', lat: 44.6206, lng: 21.1897 },
  { name: 'Smederevo', lat: 44.6664, lng: 20.9281 },
  { name: 'Zaječar', lat: 43.9042, lng: 22.2639 },
]
