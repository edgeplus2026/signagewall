// Import from `@tiptap/react` (a direct dep) rather than `@tiptap/core` (only
// transitive) so the Vite dev server resolves it. The augmentation below still
// targets `@tiptap/core` — that's type-only and erased at runtime.
import { Extension } from '@tiptap/react'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    letterSpacing: {
      /** Set the letter-spacing of the selection (e.g. '0.06em'). */
      setLetterSpacing: (value: string) => ReturnType
      /** Clear the letter-spacing of the selection. */
      unsetLetterSpacing: () => ReturnType
    }
  }
}

/**
 * A small `textStyle`-based extension that adds letter-spacing — there is no
 * built-in one in `@tiptap/extension-text-style`. Mirrors how FontSize/LineHeight
 * register a global attribute on the `textStyle` mark, so it renders as an inline
 * `<span style="letter-spacing: …">` the player bundle keeps after sanitizing.
 */
export const LetterSpacing = Extension.create({
  name: 'letterSpacing',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.letterSpacing || null,
            renderHTML: (attributes: { letterSpacing?: string | null }) =>
              attributes.letterSpacing
                ? { style: `letter-spacing: ${attributes.letterSpacing}` }
                : {},
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLetterSpacing:
        (value: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { letterSpacing: value }).run(),
      unsetLetterSpacing:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { letterSpacing: null }).run(),
    }
  },
})
