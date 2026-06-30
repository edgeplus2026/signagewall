import type { RichTextContent } from '@/features/notifications/types/notification.types'

interface TiptapNode {
  type?: string
  text?: string
  content?: TiptapNode[]
}

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'codeBlock',
])

/**
 * Derives a plain-text preview from a Tiptap document without mounting a
 * ProseMirror editor — cheap enough to run per list item. Walks the node tree
 * collecting `text` nodes and inserts a space between block-level nodes so
 * paragraphs don't run together.
 */
export function tiptapToPlainText(
  doc: RichTextContent | null | undefined,
  maxLength = 160,
): string {
  if (!doc || typeof doc !== 'object') {
    return ''
  }

  const parts: string[] = []

  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') {
      return
    }
    const node = value as TiptapNode
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text)
      return
    }
    if (node.type === 'hardBreak') {
      parts.push(' ')
      return
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk)
    }
    if (node.type && BLOCK_TYPES.has(node.type)) {
      parts.push(' ')
    }
  }

  walk(doc)

  const text = parts.join('').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength).trimEnd()}…`
}
