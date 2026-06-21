import type { DragEvent } from "react"

export function attachMediaDragImage(event: DragEvent<HTMLElement>): void {
  const source = event.currentTarget.querySelector<HTMLElement>(
    "[data-media-drag-preview]",
  )

  if (!source) {
    return
  }

  const preview = source.cloneNode(true) as HTMLElement
  preview.style.position = "fixed"
  preview.style.top = "-1000px"
  preview.style.left = "0"
  preview.style.opacity = "1"
  preview.style.pointerEvents = "none"
  preview.style.zIndex = "-1"

  document.body.appendChild(preview)

  const rect = preview.getBoundingClientRect()
  event.dataTransfer.setDragImage(preview, rect.width / 2, Math.min(rect.height / 2, 48))

  window.setTimeout(() => {
    preview.remove()
  }, 0)
}

export function setMediaDragData(
  event: DragEvent<HTMLElement>,
  dragIds: string[],
): void {
  event.dataTransfer.setData("text/media-ids", JSON.stringify(dragIds))
  event.dataTransfer.effectAllowed = "move"
}
