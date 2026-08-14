import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { OnboardingStepKey } from '@/features/onboarding/types/onboarding.types'

interface OnboardingUiState {
  /** Panel expanded, or collapsed down to the floating launcher. */
  open: boolean
  /**
   * Section showing its details. `null` means "follow the server" — the panel
   * falls back to the first unfinished step, which is where the user left off.
   */
  expandedStep: OnboardingStepKey | null
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  setExpandedStep: (key: OnboardingStepKey | null) => void
}

export const useOnboardingUiStore = create<OnboardingUiState>()(
  persist(
    (set) => ({
      // Open on the very first visit: a new account should meet the checklist
      // without hunting for it. Minimizing is remembered from then on.
      open: true,
      expandedStep: null,
      setOpen: (open) => {
        set({ open })
      },
      toggleOpen: () => {
        set((state) => ({ open: !state.open }))
      },
      setExpandedStep: (key) => {
        set({ expandedStep: key })
      },
    }),
    {
      name: 'onboarding-ui',
      // Which section is unfolded is per-visit context, not a preference.
      partialize: (state) => ({ open: state.open }),
    },
  ),
)
