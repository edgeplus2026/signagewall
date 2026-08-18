/**
 * Frozen snapshot-mode configuration for a private Power BI report.
 *
 * The selected resource labels are retained only so the CMS can render a saved
 * selection without another API request. Connectors must authorize and fetch by
 * the stable ids, never by these operator-facing labels.
 */
export interface SecurePowerBiConfig {
  connectionId: string
  workspace: { id: string; label: string }
  report: { id: string; label: string }
  page?: { id: string; label: string }
  refreshMinutes: number
  fit: 'contain' | 'cover'
  background: string
}

export const POWERBI_SECURE_DEFAULTS = {
  refreshMinutes: 15,
  fit: 'contain',
  background: '#000000',
} as const satisfies Pick<
  SecurePowerBiConfig,
  'refreshMinutes' | 'fit' | 'background'
>
