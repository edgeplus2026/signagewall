import { Download, FileText, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { reportsApi } from '@/features/reports/api/reportsApi'
import { CoverageMatrix } from '@/features/reports/components/CoverageMatrix'
import { CoverageSummary } from '@/features/reports/components/CoverageSummary'
import { DaypartingStrip } from '@/features/reports/components/DaypartingStrip'
import { PlanTable } from '@/features/reports/components/PlanTable'
import { PlaybackItemsTable } from '@/features/reports/components/PlaybackItemsTable'
import { ReportScheduleCard } from '@/features/reports/components/ReportScheduleCard'
import {
  useCampaignMutations,
  useCampaigns,
  useCoverage,
  useDayparting,
  usePlan,
  usePlaybackItems,
  type ReportFocus,
} from '@/features/reports/hooks/usePlaybackReports'

/** Local calendar day, in the same frame the devices stamp their reports. */
function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${String(now.getFullYear())}-${month}-${day}`
}

function daysBefore(day: string, count: number): string {
  const at = new Date(`${day}T00:00:00`)
  at.setDate(at.getDate() - count)
  const month = String(at.getMonth() + 1).padStart(2, '0')
  const date = String(at.getDate()).padStart(2, '0')
  return `${String(at.getFullYear())}-${month}-${date}`
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const [day, setDay] = useState(today)
  const [from, setFrom] = useState(() => daysBefore(today(), 29))
  const [to, setTo] = useState(today)
  const [exporting, setExporting] = useState(false)
  const [grouped, setGrouped] = useState(false)
  const [focus, setFocus] = useState<(ReportFocus & { name: string }) | null>(
    null,
  )

  const lens: ReportFocus | undefined = focus
    ? {
        ...(focus.contentId ? { contentId: focus.contentId } : {}),
        ...(focus.campaignId ? { campaignId: focus.campaignId } : {}),
      }
    : undefined

  const coverage = useCoverage(day, lens)
  const items = usePlaybackItems(from, to)
  const dayparting = useDayparting(from, to, lens)
  const plan = usePlan(day)

  const download = async (kind: 'csv' | 'pdf'): Promise<void> => {
    setExporting(true)
    try {
      await (kind === 'csv'
        ? reportsApi.downloadCsv(from, to)
        : reportsApi.downloadPdf(from, to))
    } catch {
      toast.error(t('reports.export.failed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 lg:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-primary text-xl font-medium tracking-tight">
          {t('reports.title')}
        </h1>
        <p className="text-secondary text-sm">{t('reports.description')}</p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-primary text-sm font-medium">
            {t('reports.coverage.heading')}
          </h2>
          <Input
            type="date"
            value={day}
            max={today()}
            onChange={(event) => {
              setDay(event.target.value)
            }}
            className="w-auto"
            aria-label={t('reports.coverage.day')}
          />
        </div>

        {focus && (
          // The focused matrix answers a different question from the one above
          // it, so it says which one — and how to get back.
          <div className="border-secondary bg-panel flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2.5 text-sm">
            <span className="text-secondary">{t('reports.focus.showing')}</span>
            <span className="text-primary font-medium">{focus.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7"
              onClick={() => {
                setFocus(null)
              }}
            >
              <X className="size-3.5" />
              {t('reports.focus.clear')}
            </Button>
          </div>
        )}

        {coverage.isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : coverage.data ? (
          <>
            {!focus && (
              <CoverageSummary
                coverage={coverage.data.coverage}
                screens={coverage.data.totals.screens}
                exceptions={coverage.data.exceptions}
              />
            )}
            <CoverageMatrix
              screens={coverage.data.screens}
              focused={Boolean(focus)}
            />
            {coverage.data.truncated && (
              <p className="text-warning text-xs">
                {t('reports.coverage.truncated')}
              </p>
            )}
          </>
        ) : (
          <p className="text-secondary text-sm">{t('reports.error')}</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-primary text-sm font-medium">
            {t('reports.table.heading')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(event) => {
                setFrom(event.target.value)
              }}
              className="w-auto"
              aria-label={t('reports.table.from')}
            />
            <span className="text-secondary text-sm">→</span>
            <Input
              type="date"
              value={to}
              min={from}
              max={today()}
              onChange={(event) => {
                setTo(event.target.value)
              }}
              className="w-auto"
              aria-label={t('reports.table.to')}
            />
            <CampaignsMenu />
            <Button
              variant="outline"
              size="sm"
              disabled={exporting || !items.data}
              onClick={() => {
                void download('csv')
              }}
            >
              <Download className="size-4" />
              {t('reports.export.csv')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting || !items.data}
              onClick={() => {
                void download('pdf')
              }}
            >
              <FileText className="size-4" />
              {t('reports.export.pdf')}
            </Button>
          </div>
        </div>

        {items.isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : items.data ? (
          <PlaybackItemsTable
            report={items.data}
            grouped={grouped}
            onGroupedChange={setGrouped}
            onFocus={setFocus}
          />
        ) : (
          <p className="text-secondary text-sm">{t('reports.error')}</p>
        )}

        {dayparting.data && <DaypartingStrip report={dayparting.data} />}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-primary text-sm font-medium">
          {t('reports.plan.heading')}
        </h2>
        {plan.isLoading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : plan.data ? (
          <PlanTable report={plan.data} />
        ) : (
          <p className="text-secondary text-sm">{t('reports.error')}</p>
        )}
      </section>

      <ReportScheduleCard />

      {/* Said plainly rather than left to be discovered: an operator who needs a
          campaign kept beyond the window can export it while it still exists. */}
      <p className="text-secondary text-xs">{t('reports.retention')}</p>
    </div>
  )
}

/**
 * Creating and deleting campaigns.
 *
 * Kept next to the table rather than given a page of its own: a campaign only
 * ever matters while looking at a report, and the assignment itself happens on
 * the rows, where the operator can see what they are assigning.
 */
function CampaignsMenu() {
  const { t } = useTranslation()
  const { data: campaigns = [] } = useCampaigns()
  const { create, remove } = useCampaignMutations()
  const [name, setName] = useState('')

  const add = (): void => {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate(trimmed, {
      onSuccess: () => {
        setName('')
      },
      onError: () => {
        toast.error(t('reports.campaigns.failed'))
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t('reports.campaigns.heading')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-1.5 p-2">
          <Input
            value={name}
            placeholder={t('reports.campaigns.newPlaceholder')}
            onChange={(event) => {
              setName(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                add()
              }
            }}
            className="h-8"
          />
          <Button size="sm" className="h-8" onClick={add} disabled={create.isPending}>
            <Plus className="size-3.5" />
          </Button>
        </div>
        {campaigns.length === 0 ? (
          <DropdownMenuItem disabled>
            {t('reports.campaigns.none')}
          </DropdownMenuItem>
        ) : (
          campaigns.map((campaign) => (
            <DropdownMenuItem
              key={campaign.id}
              onSelect={(event) => {
                event.preventDefault()
              }}
              className="justify-between"
            >
              <span className="truncate">{campaign.name}</span>
              <button
                type="button"
                className="text-secondary hover:text-danger"
                title={t('common.delete')}
                onClick={() => {
                  remove.mutate(campaign.id)
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
