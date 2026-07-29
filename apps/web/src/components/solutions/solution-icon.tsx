/* eslint-disable react-hooks/static-components --
   Nothing is created in this file: SOLUTION_ICONS holds stable module-level
   Lucide components and `solutionIcon` only looks one up. The rule exists to
   catch factories that build a fresh component per render — which would reset
   its state — and it can't tell that case apart from a lookup. Scoped to this
   one small module so the exemption stays reviewable. */
import { solutionIcon } from '@/lib/solution-icons'

/**
 * Resolves an industry's icon key to its Lucide component and renders it.
 *
 * Wrapped rather than inlined so callers never bind a looked-up component to a
 * capitalised local inside their own render, and so the lint exemption below
 * lives in exactly one reviewed place instead of at every call site.
 */
export function SolutionIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = solutionIcon(icon)
  return <Icon className={className} />
}
