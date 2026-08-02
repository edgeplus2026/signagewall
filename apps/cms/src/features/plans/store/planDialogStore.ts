import { create } from 'zustand'

/** Why the upgrade dialog opened — it changes the copy, not the form. */
export type UpgradeDialogTrigger = 'header' | 'screens' | 'organizations'

interface PlanDialogState {
  open: boolean
  trigger: UpgradeDialogTrigger
  openDialog: (trigger: UpgradeDialogTrigger) => void
  close: () => void
}

/**
 * App-level state for the upgrade dialog. In a store rather than page state
 * because it is opened from three unrelated places — the header button, a
 * refused screen creation and a refused organization creation — and the dialog
 * itself is mounted once in the layout.
 */
export const usePlanDialogStore = create<PlanDialogState>((set) => ({
  open: false,
  trigger: 'header',

  openDialog: (trigger) => {
    set({ open: true, trigger })
  },
  close: () => {
    set({ open: false })
  },
}))
