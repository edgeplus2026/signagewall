import { createContext } from 'react'

/**
 * Lets menus/dialogs rendered inside the app drawer report their open state so
 * the drawer can switch vaul's `dismissible` off while one is open.
 *
 * Why it's needed: a dropdown/dialog is portaled *outside* the drawer's DOM, so
 * dismissing it reads as an outside interaction and vaul closes the whole drawer.
 * vaul runs its close side-effect eagerly inside its own `onOpenChange`, so
 * intercepting `onOpenChange` on our side is too late — only `dismissible={false}`
 * blocks it (it returns before `closeDrawer`). We keep `dismissible` false for as
 * long as any nested overlay is open, then restore it.
 */
export const AppDrawerNestedOverlayContext = createContext<(open: boolean) => void>(() => undefined)
