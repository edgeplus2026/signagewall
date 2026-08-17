import type {
  CoverageReport,
  DaypartingReport,
  PlanReport,
  PlaybackItemsReport,
  ReportSchedule,
} from '@/features/reports/types/reports.types'
import { api } from '@/lib/axios'

export const reportsApi = {
  coverage: async (
    day: string,
    focus?: { contentId?: string },
  ): Promise<CoverageReport> => {
    const { data } = await api.get<CoverageReport>('/playback/coverage', {
      params: { day, ...focus },
    })
    return data
  },

  dayparting: async (
    from: string,
    to: string,
    focus?: { contentId?: string },
  ): Promise<DaypartingReport> => {
    const { data } = await api.get<DaypartingReport>('/playback/dayparting', {
      params: { from, to, ...focus },
    })
    return data
  },

  plan: async (day: string): Promise<PlanReport> => {
    const { data } = await api.get<PlanReport>('/playback/plan', {
      params: { day },
    })
    return data
  },

  schedule: async (): Promise<ReportSchedule> => {
    const { data } = await api.get<ReportSchedule>('/playback/schedule')
    return data
  },

  saveSchedule: async (
    schedule: Omit<ReportSchedule, 'lastSentAt' | 'lastError'>,
  ): Promise<ReportSchedule> => {
    const { data } = await api.put<ReportSchedule>('/playback/schedule', schedule)
    return data
  },

  items: async (
    from: string,
    to: string,
    screenIds?: string[],
  ): Promise<PlaybackItemsReport> => {
    const { data } = await api.get<PlaybackItemsReport>('/playback/items', {
      params: {
        from,
        to,
        ...(screenIds?.length ? { screenIds: screenIds.join(',') } : {}),
      },
    })
    return data
  },

  /**
   * Downloads the range as a CSV file.
   *
   * Fetched through the same axios instance rather than as a plain link so the
   * request carries the auth token and the active organization header — a bare
   * `<a href>` would arrive unauthenticated. The blob is handed to the browser
   * with an object URL, which is revoked immediately after the click: keeping it
   * would pin the whole file in memory for the life of the tab.
   */
  downloadCsv: async (
    from: string,
    to: string,
    screenIds?: string[],
  ): Promise<void> => {
    const { data } = await api.get<Blob>('/playback/items.csv', {
      params: {
        from,
        to,
        ...(screenIds?.length ? { screenIds: screenIds.join(',') } : {}),
      },
      responseType: 'blob',
    })

    save(data, `playback-${from}_${to}.csv`)
  },

  /**
   * Downloads the signed PDF — the copy that gets sent to a client.
   *
   * Same authenticated path as the CSV, for the same reason.
   */
  downloadPdf: async (from: string, to: string): Promise<void> => {
    const { data } = await api.get<Blob>('/playback/report.pdf', {
      params: { from, to },
      responseType: 'blob',
    })
    save(data, `playback-${from}_${to}.pdf`)
  },
}

/**
 * Hands a downloaded blob to the browser.
 *
 * The object URL is revoked straight after the click: keeping it would pin the
 * whole file in memory for the life of the tab.
 */
function save(data: Blob, filename: string): void {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
