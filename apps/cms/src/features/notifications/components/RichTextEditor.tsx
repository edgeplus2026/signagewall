import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { Bold, Heading2, Italic, Link2, List, ListOrdered } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  emptyTiptapDoc,
  proseClassName,
  richTextExtensions,
} from '@/features/notifications/lib/tiptapExtensions'
import type { RichTextContent } from '@/features/notifications/types/notification.types'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: RichTextContent | null
  onChange: (value: RichTextContent) => void
  id?: string
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean | undefined
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(active && 'bg-sidebar text-primary')}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/**
 * Controlled Tiptap editor. Initialises from `value` on mount and reports the
 * latest document JSON through `onChange`; it does not sync external `value`
 * changes back in, so the caller should remount it (e.g. via tab unmount or a
 * `key`) when switching to a different document.
 */
export function RichTextEditor({ value, onChange, id }: RichTextEditorProps) {
  const { t } = useTranslation()

  const editor = useEditor({
    extensions: richTextExtensions,
    content: value ?? emptyTiptapDoc,
    editorProps: {
      attributes: {
        class: cn(proseClassName, 'min-h-40 px-3 py-2 outline-none'),
        ...(id ? { id } : {}),
      },
    },
    onUpdate: ({ editor }) => { onChange(editor.getJSON() as RichTextContent); },
  })

  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      heading: editor.isActive('heading', { level: 2 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      link: editor.isActive('link'),
    }),
  })

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt(t('notifications.editor.linkPrompt'))?.trim()
    if (!url) {
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="focus-within:border-primary overflow-hidden rounded-lg border border-secondary bg-panel">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-secondary p-1">
        <ToolbarButton
          active={state.bold}
          label={t('notifications.editor.bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          active={state.italic}
          label={t('notifications.editor.italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          active={state.heading}
          label={t('notifications.editor.heading')}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          active={state.bulletList}
          label={t('notifications.editor.bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          active={state.orderedList}
          label={t('notifications.editor.orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton
          active={state.link}
          label={t('notifications.editor.link')}
          onClick={toggleLink}
        >
          <Link2 />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
