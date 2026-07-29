import type { ReactNode } from 'react'

/**
 * Renders the markdown subset the legal documents are written in — `#`, `##`,
 * `- ` bullets, `_emphasis_` and paragraphs. That is the whole grammar: no
 * links, no bold, no tables, no code, verified against all six documents.
 *
 * Hand-rolled rather than pulling in `react-markdown` + `remark`, which would
 * add a parser stack to render nineteen headings and nine bullets. If the
 * documents ever grow links or tables, swap this out — do not extend it into a
 * half-parser.
 *
 * `##` headings get an `id` so a clause can be linked to directly, which is
 * what makes "see section 7" in a support reply actually work.
 */

/** `word_with_underscores` must not become emphasis; only free-standing `_…_`. */
const EMPHASIS = /(?<![\w\\])_([^_\n]+)_(?!\w)/g

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(EMPHASIS)) {
    const at = match.index
    if (at > last) nodes.push(text.slice(last, at))
    nodes.push(<em key={`${keyPrefix}-em-${i.toString()}`}>{match[1]}</em>)
    last = at + match[0].length
    i += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** GitHub-style slug, so headings keep stable anchors across edits. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export interface LegalContent {
  /** The `#` line, lifted out so the page can render it as its own H1. */
  title: string
  /** The `_Last updated: …_` line, if the document opens with one. */
  updated: string | null
  body: ReactNode
}

export function parseLegalMarkdown(source: string): LegalContent {
  const lines = source.split('\n')
  let title = ''
  let updated: string | null = null

  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let bullets: string[] = []
  let key = 0

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ').trim()
    paragraph = []
    // The italic "last updated" line is metadata, not body copy.
    if (!updated && /^_.*_$/.test(text)) {
      updated = text.slice(1, -1)
      return
    }
    key += 1
    blocks.push(<p key={`p-${key.toString()}`}>{inline(text, `p-${key.toString()}`)}</p>)
  }

  const flushBullets = () => {
    if (bullets.length === 0) return
    const items = bullets
    bullets = []
    key += 1
    blocks.push(
      <ul key={`ul-${key.toString()}`}>
        {items.map((item, i) => (
          <li key={`li-${key.toString()}-${i.toString()}`}>{inline(item, `li-${i.toString()}`)}</li>
        ))}
      </ul>,
    )
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith('# ')) {
      flushParagraph()
      flushBullets()
      title = line.slice(2).trim()
      continue
    }
    if (line.startsWith('## ')) {
      flushParagraph()
      flushBullets()
      const heading = line.slice(3).trim()
      key += 1
      blocks.push(
        <h2 key={`h-${key.toString()}`} id={slugify(heading)}>
          {heading}
        </h2>,
      )
      continue
    }
    if (line.startsWith('- ')) {
      flushParagraph()
      bullets.push(line.slice(2).trim())
      continue
    }
    if (line.trim() === '') {
      flushParagraph()
      flushBullets()
      continue
    }
    // A bullet's continuation line is indented; fold it into the last item.
    const lastBullet = bullets.at(-1)
    if (lastBullet !== undefined && /^\s+\S/.test(raw)) {
      bullets[bullets.length - 1] = `${lastBullet} ${line.trim()}`
      continue
    }
    flushBullets()
    paragraph.push(line.trim())
  }
  flushParagraph()
  flushBullets()

  return { title, updated, body: blocks }
}
