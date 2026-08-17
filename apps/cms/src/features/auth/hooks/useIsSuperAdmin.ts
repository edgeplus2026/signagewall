import { useAuthStore } from '@/features/auth/store/authStore'

/**
 * Whether the signed-in account is a SignageWall super-admin.
 *
 * Used to keep operator-facing tooling out of a customer's way — the device
 * maintenance controls, the native shell channel and the diagnostics request are
 * all things a customer reads as "something is wrong with my screen" when in fact
 * they are our support instruments.
 *
 * Deliberately NOT combined with the impersonation flag, unlike the super-admin
 * link in the sidebar. While impersonating, the person at the keyboard is still
 * us: they are looking at a customer's screen precisely because it needs
 * attention, and hiding the restart button at that moment removes the tool from
 * the one hand that should hold it. There is no customer present to be confused.
 *
 * This is a VISIBILITY control, not an authorization one. Anything that must not
 * be *done* by a customer has to be enforced by the API as well.
 */
export function useIsSuperAdmin(): boolean {
  return useAuthStore((state) => state.user?.isSuperAdmin) ?? false
}
