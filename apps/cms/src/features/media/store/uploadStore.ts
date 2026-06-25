import { create } from 'zustand'

import { mediaApi } from '@/features/media/api/mediaApi'
import { prepareVideoUpload } from '@/features/media/lib/captureVideoPoster'
import {
  MEDIA_MAX_CONCURRENT_UPLOADS,
  MEDIA_UPLOAD_MAX_POLL_ATTEMPTS,
  MEDIA_UPLOAD_POLL_INTERVAL_MS,
} from '@/features/media/lib/media.constants'
import {
  pollMediaUntilReady,
  uploadMediaFile,
} from '@/features/media/lib/uploadMediaFile'
import type { CloudImportItem } from '@/features/media/types/media.types'

export type UploadJobStatus =
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

interface UploadJobBase {
  id: string
  fileName: string
  parentId: string | null
  progress: number
  status: UploadJobStatus
  mediaId?: string | undefined
  error?: string | undefined
  abortController: AbortController
}

/** A device upload: the bytes are a local `File` streamed to the server. */
export interface LocalUploadJob extends UploadJobBase {
  kind: 'local'
  file: File
}

/** A cloud import: the server downloads the bytes from the provider for us. */
export interface CloudUploadJob extends UploadJobBase {
  kind: 'cloud'
  item: CloudImportItem
}

export type UploadJob = LocalUploadJob | CloudUploadJob

interface UploadStoreState {
  jobs: UploadJob[]
  collapsed: boolean
  enqueueFiles: (files: File[], parentId: string | null) => void
  /** Queues cloud-picked items; each runs as its own job in the shared queue. */
  enqueueCloudItems: (
    items: CloudImportItem[],
    parentId: string | null,
  ) => void
  cancelJob: (jobId: string) => void
  retryJob: (jobId: string) => void
  clearCompleted: () => void
  setCollapsed: (collapsed: boolean) => void
}

let activeUploads = 0
// Ids picked up by the queue this tick. Prevents a job being started twice if
// `processUploadQueue` runs again before the async `runUploadJob` flips its
// status to 'uploading'.
const startedJobIds = new Set<string>()

// Only the mutable runtime fields change after a job is created — never the
// `kind`/`file`/`item` discriminant — so the patch is typed against the base.
function updateJob(jobId: string, patch: Partial<UploadJobBase>) {
  useUploadStore.setState((state) => ({
    jobs: state.jobs.map((job) =>
      job.id === jobId ? { ...job, ...patch } : job,
    ),
  }))
}

async function runUploadJob(jobId: string) {
  const job = useUploadStore.getState().jobs.find((entry) => entry.id === jobId)

  if (!job || job.status === 'cancelled') {
    return
  }

  if (job.kind === 'cloud') {
    await runCloudJob(job)
    return
  }

  try {
    updateJob(jobId, { status: 'uploading', progress: 0 })

    // For videos, capture a poster frame client-side so the server can build a
    // real thumbnail. Best-effort — null falls back to the placeholder.
    const videoUpload = job.file.type.startsWith('video/')
      ? await prepareVideoUpload(job.file)
      : null
    const poster = videoUpload?.poster ?? null

    if (job.abortController.signal.aborted) {
      updateJob(jobId, { status: 'cancelled' })
      return
    }

    const uploaded = await uploadMediaFile({
      file: job.file,
      parentId: job.parentId,
      poster,
      ...(videoUpload?.durationSeconds !== undefined &&
      videoUpload.durationSeconds !== null
        ? { durationSeconds: videoUpload.durationSeconds }
        : {}),
      signal: job.abortController.signal,
      onProgress: (progress) => {
        updateJob(jobId, { progress })
      },
    })

    updateJob(jobId, {
      mediaId: uploaded.id,
      status: uploaded.status === 'ready' ? 'completed' : 'processing',
      progress: uploaded.status === 'ready' ? 100 : 95,
    })

    if (uploaded.status === 'ready') {
      return
    }

    const readyItem = await pollMediaUntilReady(uploaded.id, {
      signal: job.abortController.signal,
      intervalMs: MEDIA_UPLOAD_POLL_INTERVAL_MS,
      maxAttempts: MEDIA_UPLOAD_MAX_POLL_ATTEMPTS,
    })

    if (readyItem.status === 'ready') {
      updateJob(jobId, { status: 'completed', progress: 100 })
    } else {
      updateJob(jobId, { status: 'failed', error: 'processing_failed' })
    }
  } catch (error) {
    if (job.abortController.signal.aborted) {
      updateJob(jobId, { status: 'cancelled' })
      return
    }

    updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'upload_failed',
    })
  }
}

/**
 * Runs one cloud-import job: the backend downloads the provider bytes and
 * persists them through the same pipeline as device uploads. We submit a
 * single-item batch so each picked file gets its own queue row (progress is
 * coarse — the server controls the download — so it jumps queued → completed).
 */
async function runCloudJob(job: CloudUploadJob) {
  const { id } = job
  const { signal } = job.abortController
  try {
    // Progress is server-controlled and opaque to us, so the row renders an
    // indeterminate bar while 'uploading' (see UploadManager) — keep it at 0.
    updateJob(id, { status: 'uploading', progress: 0 })

    const response = await mediaApi.importCloud(
      { parentId: job.parentId, items: [job.item] },
      signal,
    )

    // The user cancelled while the import was in flight — leave the row
    // 'cancelled' (set by cancelJob) instead of resurrecting it as completed.
    if (signal.aborted) {
      updateJob(id, { status: 'cancelled' })
      return
    }

    const result = response.results[0]
    if (result?.status === 'imported') {
      updateJob(id, {
        status: 'completed',
        progress: 100,
        mediaId: result.mediaId,
      })
    } else {
      updateJob(id, {
        status: 'failed',
        error: result?.error ?? 'import_failed',
      })
    }
  } catch (error) {
    if (signal.aborted) {
      updateJob(id, { status: 'cancelled' })
      return
    }
    updateJob(id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'import_failed',
    })
  }
}

function processUploadQueue() {
  const { jobs } = useUploadStore.getState()
  const queuedJobs = jobs.filter(
    (job) => job.status === 'queued' && !startedJobIds.has(job.id),
  )

  while (activeUploads < MEDIA_MAX_CONCURRENT_UPLOADS && queuedJobs.length > 0) {
    const nextJob = queuedJobs.shift()

    if (!nextJob) {
      break
    }

    activeUploads += 1
    startedJobIds.add(nextJob.id)

    void runUploadJob(nextJob.id).finally(() => {
      activeUploads -= 1
      startedJobIds.delete(nextJob.id)
      processUploadQueue()
    })
  }
}

export const useUploadStore = create<UploadStoreState>((set, get) => ({
  jobs: [],
  collapsed: false,

  enqueueFiles: (files, parentId) => {
    const newJobs: UploadJob[] = files.map((file) => ({
      kind: 'local',
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      parentId,
      progress: 0,
      status: 'queued',
      abortController: new AbortController(),
    }))

    set((state) => ({
      jobs: [...newJobs, ...state.jobs],
      collapsed: false,
    }))

    processUploadQueue()
  },

  enqueueCloudItems: (items, parentId) => {
    const newJobs: UploadJob[] = items.map((item) => ({
      kind: 'cloud',
      id: crypto.randomUUID(),
      item,
      fileName: item.name,
      parentId,
      progress: 0,
      status: 'queued',
      abortController: new AbortController(),
    }))

    set((state) => ({
      jobs: [...newJobs, ...state.jobs],
      collapsed: false,
    }))

    processUploadQueue()
  },

  cancelJob: (jobId) => {
    const job = get().jobs.find((entry) => entry.id === jobId)

    if (!job) {
      return
    }

    if (job.status === 'queued' || job.status === 'uploading' || job.status === 'processing') {
      job.abortController.abort()
      updateJob(jobId, { status: 'cancelled' })
    }
  },

  retryJob: (jobId) => {
    const job = get().jobs.find((entry) => entry.id === jobId)

    if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) {
      return
    }

    // Reset the job to a fresh queued state with a new abort controller; the
    // previous one may already be aborted and can't be reused.
    updateJob(jobId, {
      status: 'queued',
      progress: 0,
      error: undefined,
      mediaId: undefined,
      abortController: new AbortController(),
    })

    processUploadQueue()
  },

  clearCompleted: () => {
    set((state) => ({
      jobs: state.jobs.filter(
        (job) => job.status !== 'completed' && job.status !== 'cancelled',
      ),
    }))
  },

  setCollapsed: (collapsed) => {
    set({ collapsed })
  },
}))

export function hasActiveUploads(jobs: UploadJob[]): boolean {
  return jobs.some(
    (job) =>
      job.status === 'queued' ||
      job.status === 'uploading' ||
      job.status === 'processing',
  )
}
