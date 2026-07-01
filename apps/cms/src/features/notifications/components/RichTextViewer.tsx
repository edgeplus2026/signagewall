import { EditorContent, useEditor } from '@tiptap/react'

import {
  emptyTiptapDoc,
  proseClassName,
  richTextExtensions,
} from '@/features/notifications/lib/tiptapExtensions'
import type { RichTextContent } from '@/features/notifications/types/notification.types'
import { cn } from '@/lib/utils'

interface RichTextViewerProps {
  content: RichTextContent | null
  className?: string
}

/**
 * Renders stored Tiptap JSON read-only. Mount with a `key` (e.g. the
 * notification id) so it re-initialises when a different notification is shown.
 */
export function RichTextViewer({ content, className }: RichTextViewerProps) {
  const editor = useEditor({
    editable: false,
    extensions: richTextExtensions,
    content: content ?? emptyTiptapDoc,
  })

  return <EditorContent editor={editor} className={cn(proseClassName, className)} />
}
