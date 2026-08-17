import { useEffect } from 'react'
import { create } from 'zustand'

/**
 * How much room the bottom-right corner is already spoken for.
 *
 * Floating things anchor to that corner — the onboarding launcher, the upload
 * manager — and so do a page's own controls: the content editor puts a Save bar
 * across the bottom and a library button in the same corner, at the same
 * coordinates, with the same z-index. Nothing arbitrated between them, so on a
 * phone the onboarding pill simply sat on top of the Save button. Both were
 * "visible"; only one was reachable.
 *
 * A page that owns the corner declares how many pixels of clearance it needs and
 * the floating layer lifts itself above that. Clearance rather than a boolean
 * because the answer is not the same everywhere: a Save bar is a different height
 * from a Save bar with a round action button stacked over it, and the page is the
 * only thing that knows which it is showing right now.
 */
interface BottomSlotState {
  /** Clearance in px, per claimant. The largest wins. */
  claims: Record<string, number>
  claim: (id: string, px: number) => void
  release: (id: string) => void
}

const useBottomSlotStore = create<BottomSlotState>((set) => ({
  claims: {},
  claim: (id, px) => {
    set((state) =>
      // Bail on an unchanged value: this runs from an effect that re-fires
      // whenever a page re-measures, and writing an identical number would
      // re-render every floating element for nothing.
      state.claims[id] === px
        ? state
        : { claims: { ...state.claims, [id]: px } },
    )
  },
  release: (id) => {
    set((state) => {
      if (!(id in state.claims)) {
        return state
      }
      return {
        claims: Object.fromEntries(
          Object.entries(state.claims).filter(([key]) => key !== id),
        ),
      }
    })
  },
}))

/**
 * Pixels a floating element must lift itself by to clear whatever the page has
 * put at the bottom. Zero when the corner is free.
 */
export function useBottomClearance(): number {
  return useBottomSlotStore((state) => {
    const values = Object.values(state.claims)
    return values.length === 0 ? 0 : Math.max(...values)
  })
}

/**
 * Declares that this page occupies the bottom-right corner and needs `px` of
 * clearance. Pass `0` to stand down without unmounting — the claim is released
 * on unmount either way, so a page navigating away never strands it.
 */
export function useClaimBottomSlot(id: string, px: number): void {
  const claim = useBottomSlotStore((state) => state.claim)
  const release = useBottomSlotStore((state) => state.release)

  useEffect(() => {
    claim(id, px)
    return () => {
      release(id)
    }
  }, [claim, release, id, px])
}
