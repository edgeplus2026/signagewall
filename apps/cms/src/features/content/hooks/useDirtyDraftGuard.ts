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

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty) {
      return false
    }
    if (currentLocation.pathname !== nextLocation.pathname) {
      return true
    }
    // Same pathname, different `tab` search param. ScreenPage switches tabs
    // with setSearchParams and Radix unmounts the inactive tab's content, so
    // this destroys the draft exactly like navigating away does — a pathname
    // comparison alone misses the most common way the editor is left.
    const currentTab = new URLSearchParams(currentLocation.search).get('tab')
    const nextTab = new URLSearchParams(nextLocation.search).get('tab')
    return currentTab !== nextTab
  })

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
