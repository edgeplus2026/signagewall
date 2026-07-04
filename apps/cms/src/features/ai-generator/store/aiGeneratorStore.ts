import { create } from 'zustand'

/** Which panel the AI generator drawer is showing. */
export type AiGeneratorView = 'list' | 'form' | 'detail'

interface AiGeneratorState {
  open: boolean
  view: AiGeneratorView
  /** The generation currently being viewed in `detail`, if any. */
  activeGenerationId: string | null

  /** Open the drawer to the history list (the record of past generations). */
  openList: () => void
  /** Open the drawer straight to a specific generation (e.g. from a toast). */
  openGeneration: (id: string) => void
  /** Switch the open drawer to the history list. */
  showList: () => void
  /** Switch the open drawer to a fresh multi-step form. */
  showForm: () => void
  /** Show a specific generation's detail in the open drawer. */
  setActiveGeneration: (id: string) => void
  close: () => void
}

/**
 * App-level drawer state for the AI generator. Kept in a store (not local page
 * state) so the drawer can be mounted app-wide, opened from a completion toast,
 * and survive being closed — closing no longer discards the in-flight action,
 * since the generation lives server-side and is reachable from history.
 */
export const useAiGeneratorStore = create<AiGeneratorState>((set) => ({
  open: false,
  view: 'list',
  activeGenerationId: null,

  openList: () => {
    set({ open: true, view: 'list', activeGenerationId: null })
  },
  openGeneration: (id) => {
    set({ open: true, view: 'detail', activeGenerationId: id })
  },
  showList: () => {
    set({ view: 'list', activeGenerationId: null })
  },
  showForm: () => {
    set({ view: 'form', activeGenerationId: null })
  },
  setActiveGeneration: (id) => {
    set({ view: 'detail', activeGenerationId: id })
  },
  close: () => {
    set({ open: false })
  },
}))
