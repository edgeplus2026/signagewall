import { cn } from "@/lib/utils"

export const mediaActionCardClassName = cn(
  "group flex w-full min-w-[11rem] items-center gap-3 rounded-xl p-3.5 text-left transition-colors",
  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-tertiary/50",
  "disabled:pointer-events-none disabled:opacity-50"
)

export const mediaActionCardIconClassName =
  "flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar text-secondary group-hover:text-brand"

export const mediaActionCardsGridClassName =
  "grid lg:grid-cols-3 gap-4"

export const mediaGridClassName =
  "grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3"
