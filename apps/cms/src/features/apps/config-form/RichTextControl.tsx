import { TextAlign } from '@tiptap/extension-text-align'
import { FontFamily, FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import type { FieldControlProps } from '@/features/apps/config-form/controls'
import { LetterSpacing } from '@/features/apps/config-form/letterSpacing'
import { cn } from '@/lib/utils'

function htmlValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Font sizes in px (10–100), as the operator requested. '' = default. */
const FONT_SIZES = [
  '', '10', '12', '14', '16', '18', '20', '24', '28', '32',
  '40', '48', '56', '64', '72', '80', '90', '100',
] as const

/** Line heights (unitless, so they scale with the font size). '' = default. */
const LINE_HEIGHTS = [
  { label: 'Line height', value: '' },
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.3', value: '1.3' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
] as const

/** Letter spacing in em (scales with font size). '' = default. */
const LETTER_SPACINGS = [
  { label: 'Spacing', value: '' },
  { label: 'Tight', value: '-0.03em' },
  { label: 'Normal', value: '0em' },
  { label: 'Wide', value: '0.06em' },
  { label: 'Wider', value: '0.12em' },
] as const

/** Web-safe font families (no web-font loading needed). '' = default. */
const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Sans-serif', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
] as const

interface ToolButtonProps {
  active: boolean
  disabled: boolean
  label: string
  onClick: () => void
  children: ReactNode
}

function ToolButton({ active, disabled, label, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-active={active}
      disabled={disabled}
      // Keep the editor selection when clicking the toolbar.
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-50',
        active
          ? 'bg-highlight text-primary ring-1 ring-inset ring-white/10'
          : 'text-secondary hover:bg-highlight hover:text-primary',
      )}
    >
      {children}
    </button>
  )
}

interface ToolSelectProps {
  label: string
  value: string
  disabled: boolean
  options: readonly { label: string; value: string }[]
  onChange: (value: string) => void
}

function ToolSelect({ label, value, disabled, options, onChange }: ToolSelectProps) {
  return (
    <select
      aria-label={label}
      disabled={disabled}
      value={value}
      onMouseDown={(event) => {
        event.stopPropagation()
      }}
      onChange={(event) => {
        onChange(event.target.value)
      }}
      className="text-secondary hover:bg-highlight hover:text-primary border-quaternary h-8 min-w-24 max-w-36 cursor-pointer rounded-md border bg-transparent px-2 text-xs outline-none transition-colors"
    >
      {options.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/**
 * The `richtext` field control: a small TipTap WYSIWYG (bold / italic /
 * underline / strike / lists / font size / alignment). Stores semantic HTML; the
 * player bundle sanitizes it (allowed tags + only `font-size`/`text-align`
 * styles) before rendering. Re-mounts per instance (the form keys on the
 * instance id), so the editor initializes from the saved value and emits edits
 * via `onChange`.
 */
export function RichTextControl({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
}: FieldControlProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      FontFamily,
      LineHeight,
      LetterSpacing,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: htmlValue(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        // `text-center` matches the player's default centering (WYSIWYG).
        class:
          'min-h-28 max-h-72 overflow-y-auto px-3 py-2 text-sm text-primary text-center outline-none ' +
          '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p]:my-0',
      },
    },
    onUpdate: ({ editor: current }) => {
      // Emit '' for a visually-empty doc so `required` works and we don't store
      // an empty `<p></p>`.
      onChange(current.getText().trim() ? current.getHTML() : '')
    },
    onBlur: () => {
      onBlur()
    },
  })

  const isDisabled = disabled ?? false
  const textStyle = editor?.getAttributes('textStyle') ?? {}
  // Stored as e.g. "40px"; the select options are bare numbers.
  const currentSize = ((textStyle.fontSize as string | undefined) ?? '').replace('px', '')
  const currentFamily = (textStyle.fontFamily as string | undefined) ?? ''
  const currentLineHeight = (textStyle.lineHeight as string | undefined) ?? ''
  const currentSpacing = (textStyle.letterSpacing as string | undefined) ?? ''

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-panel',
        invalid ? 'border-danger' : 'border-quaternary',
      )}
    >
      <div className="border-quaternary bg-highlight/30 flex flex-wrap items-center gap-x-1.5 gap-y-2 border-b px-2 py-2">
        <ToolButton
          label="Bold"
          active={editor?.isActive('bold') ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="size-4" />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={editor?.isActive('italic') ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="size-4" />
        </ToolButton>
        <ToolButton
          label="Underline"
          active={editor?.isActive('underline') ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          active={editor?.isActive('strike') ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon className="size-4" />
        </ToolButton>

        <span className="bg-quaternary mx-1.5 h-6 w-px" />

        <ToolButton
          label="Align left"
          active={editor?.isActive({ textAlign: 'left' }) ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeftIcon className="size-4" />
        </ToolButton>
        <ToolButton
          label="Align center"
          active={editor?.isActive({ textAlign: 'center' }) ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenterIcon className="size-4" />
        </ToolButton>
        <ToolButton
          label="Align right"
          active={editor?.isActive({ textAlign: 'right' }) ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          <AlignRightIcon className="size-4" />
        </ToolButton>

        <span className="bg-quaternary mx-1.5 h-6 w-px" />

        <ToolButton
          label="Bullet list"
          active={editor?.isActive('bulletList') ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="size-4" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={editor?.isActive('orderedList') ?? false}
          disabled={isDisabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon className="size-4" />
        </ToolButton>

        {/* Break to a new row so the dropdowns wrap independently of the buttons. */}
        <div className="basis-full" />

        <ToolSelect
          label="Font family"
          value={currentFamily}
          disabled={isDisabled}
          options={FONT_FAMILIES}
          onChange={(next) => {
            const chain = editor?.chain().focus()
            if (!chain) return
            if (next) chain.setFontFamily(next).run()
            else chain.unsetFontFamily().run()
          }}
        />
        <ToolSelect
          label="Font size"
          value={currentSize}
          disabled={isDisabled}
          options={FONT_SIZES.map((size) => ({
            label: size === '' ? 'Size' : `${size}px`,
            value: size,
          }))}
          onChange={(next) => {
            const chain = editor?.chain().focus()
            if (!chain) return
            if (next) chain.setFontSize(`${next}px`).run()
            else chain.unsetFontSize().run()
          }}
        />
        <ToolSelect
          label="Line height"
          value={currentLineHeight}
          disabled={isDisabled}
          options={LINE_HEIGHTS}
          onChange={(next) => {
            const chain = editor?.chain().focus()
            if (!chain) return
            if (next) chain.setLineHeight(next).run()
            else chain.unsetLineHeight().run()
          }}
        />
        <ToolSelect
          label="Letter spacing"
          value={currentSpacing}
          disabled={isDisabled}
          options={LETTER_SPACINGS}
          onChange={(next) => {
            const chain = editor?.chain().focus()
            if (!chain) return
            if (next) chain.setLetterSpacing(next).run()
            else chain.unsetLetterSpacing().run()
          }}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
