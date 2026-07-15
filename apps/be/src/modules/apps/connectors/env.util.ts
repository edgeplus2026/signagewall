/**
 * Server-side API keys for `server` app connectors (enabler E5).
 *
 * Connectors are plain objects outside Nest's DI, but they run in the backend
 * process — so they read configuration straight from `process.env`, which
 * dotenvx has already loaded from `.env` long before any connector fetches. This
 * helper is the ONE place that does it, so every keyed connector fails the same,
 * legible way when its key is absent: it throws, the scheduler records the error
 * and keeps the last-known-good payload on the wall (flagged stale), and the
 * fault reads as "needs configuration" rather than a blank screen.
 *
 * Keyless connectors (weather, rss, currency, crypto, holidays, …) never call
 * this. Keyed ones document their variable in the backend `.env.example`.
 */
export function requireConnectorKey(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set — add it to the backend environment to use this app`,
    );
  }
  return value;
}
