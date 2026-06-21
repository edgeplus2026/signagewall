import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  RotateCcwIcon,
  UploadCloudIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
  hasActiveUploads,
  useUploadStore,
  type UploadJob,
} from '@/features/media/store/uploadStore'
import { cn } from '@/lib/utils'

function UploadProgressBar({
  value,
  completed,
}: {
  value: number
  completed?: boolean
}) {
  return (
    <div className="bg-input h-1.5 w-full overflow-hidden rounded-full">
      <div
        className={cn(
          'h-full transition-all duration-300',
          completed ? 'bg-success' : 'bg-brand',
        )}
        style={{ width: `${String(value)}%` }}
      />
    </div>
  )
}

function UploadJobRow({ job }: { job: UploadJob }) {
  const { t } = useTranslation()
  const cancelJob = useUploadStore((state) => state.cancelJob)
  const retryJob = useUploadStore((state) => state.retryJob)

  const isActive =
    job.status === 'queued' ||
    job.status === 'uploading' ||
    job.status === 'processing'
  const canRetry = job.status === 'failed' || job.status === 'cancelled'

  return (
    <div className="flex flex-col gap-2 border-b border-secondary px-3 py-2.5 last:border-b-0">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">
          {job.status === 'completed' ? (
            <CheckIcon className="text-success size-4" />
          ) : job.status === 'failed' || job.status === 'cancelled' ? (
            <XIcon className="text-secondary size-4" />
          ) : (
            <Loader2Icon className="text-brand size-4 animate-spin" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={job.fileName}>
            {job.fileName}
          </p>
          <p className="text-secondary text-xs">
            {t(`media.upload.manager.status.${job.status}`)}
          </p>
        </div>

        {canRetry ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            aria-label={t('media.upload.manager.retry')}
            onClick={() => {
              retryJob(job.id)
            }}
          >
            <RotateCcwIcon />
          </Button>
        ) : isActive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            aria-label={t('media.upload.manager.cancel')}
            onClick={() => {
              cancelJob(job.id)
            }}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>

      {job.status !== 'queued' ? (
        <UploadProgressBar
          value={job.status === 'completed' ? 100 : job.progress}
          completed={job.status === 'completed'}
        />
      ) : null}
    </div>
  )
}

export function UploadManager() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const invalidatedJobIds = useRef(new Set<string>())
  const jobs = useUploadStore((state) => state.jobs)
  const collapsed = useUploadStore((state) => state.collapsed)
  const setCollapsed = useUploadStore((state) => state.setCollapsed)
  const clearCompleted = useUploadStore((state) => state.clearCompleted)

  const visible = jobs.length > 0
  const activeCount = jobs.filter(
    (job) =>
      job.status === 'queued' ||
      job.status === 'uploading' ||
      job.status === 'processing',
  ).length
  const completedCount = jobs.filter((job) => job.status === 'completed').length

  useEffect(() => {
    for (const job of jobs) {
      if (
        job.status === 'completed' &&
        !invalidatedJobIds.current.has(job.id)
      ) {
        invalidatedJobIds.current.add(job.id)
        void queryClient.invalidateQueries({ queryKey: ['media'] })
      }
    }
  }, [jobs, queryClient])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasActiveUploads(jobs)) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [jobs])

  if (!visible) {
    return null
  }

  return (
    <div className="border-secondary bg-panel fixed right-4 bottom-4 z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border shadow-lg">
      <div className="flex items-center gap-2 border-b border-secondary px-3 py-2.5">
        <UploadCloudIcon className="text-brand size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('media.upload.manager.title')}</p>
          <p className="text-secondary text-xs">
            {activeCount > 0
              ? t('media.upload.manager.active', { count: activeCount })
              : t('media.upload.manager.done', { count: completedCount })}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? t('media.upload.manager.expand') : t('media.upload.manager.collapse')}
          onClick={() => {
            setCollapsed(!collapsed)
          }}
        >
          {collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>

      {!collapsed ? (
        <>
          <div className="visible-scrollbar max-h-72 overflow-y-auto">
            {jobs.map((job) => (
              <UploadJobRow key={job.id} job={job} />
            ))}
          </div>

          {jobs.some((job) => job.status === 'completed' || job.status === 'cancelled') ? (
            <div className="border-t border-secondary px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={clearCompleted}
              >
                {t('media.upload.manager.clearCompleted')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
