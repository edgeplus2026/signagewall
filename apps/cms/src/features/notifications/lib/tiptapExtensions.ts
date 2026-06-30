import StarterKit from '@tiptap/starter-kit'

import type { RichTextContent } from '@/features/notifications/types/notification.types'

/**
 * Shared extension set for both the authoring editor and the read-only viewer,
 * so stored Tiptap JSON parses against the exact same schema. StarterKit (v3)
 * bundles the Link extension; we harden its output here. Because content is
 * always rendered from this JSON schema (never from an HTML string), there is
 * no injection sink — no `dangerouslySetInnerHTML` and no separate sanitizer.
 */
export const richTextExtensions = [
  StarterKit.configure({
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    },
  }),
]

/** An empty Tiptap document — a single empty paragraph. */
export const emptyTiptapDoc: RichTextContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

/** Tailwind classes that style rendered Tiptap content (used by the viewer). */
export const proseClassName =
  'max-w-none text-sm leading-relaxed text-primary ' +
  '[&_p]:my-2 [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold ' +
  '[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold ' +
  '[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold ' +
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold ' +
  '[&_em]:italic [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-secondary ' +
  '[&_blockquote]:pl-3 [&_blockquote]:text-secondary ' +
  '[&_code]:rounded [&_code]:bg-sidebar [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]'
