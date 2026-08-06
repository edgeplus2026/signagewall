import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router-dom'

/**
 * Warns before unsaved container edits are lost: in-app navigation is held
 * behind a confirm prompt via the router blocker, and tab close / hard reload
 * arms the browser's native beforeunload dialog (uploads already do the same
 * in UploadManager).
 */
export function useDirtyDraftGuard(isDirty: boolean): void {
  const { t } = useTranslation()

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    if (window.confirm(t('common.unsavedChangesPrompt'))) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker, t])

  useEffect(() => {
    if (!isDirty) {
      return
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [isDirty])
}
