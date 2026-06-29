import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading placeholder shaped like the ContentEditor: a library sidebar on the
 * left and the content grid + footer on the right. Used by the playlist/screen
 * pages while the entity loads so the layout doesn't shift in on arrival.
 */
export function ContentEditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
      {/* Library sidebar */}
      <aside className="flex min-h-0 w-full shrink-0 flex-col lg:w-72">
        <div className="border-secondary bg-panel flex min-h-0 flex-1 flex-col gap-3 rounded-xl border p-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
          <Skeleton className="h-7 w-full rounded-md" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-4/3 rounded-xl" />
            ))}
          </div>
        </div>
      </aside>

      {/* Content canvas */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-secondary flex shrink-0 items-center justify-between gap-3 border-t pt-3">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </section>
    </div>
  )
}
