import { Fragment, type ReactNode } from 'react'

/** Renders `_italic_` spans within a line without dangerouslySetInnerHTML. */
function inline(text: string): ReactNode {
  const parts = text.split(/(_[^_]+_)/g)
  return parts.map((part, i) => {
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={i} className="text-secondary">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

/**
 * Minimal Markdown renderer for the legal documents (headings + paragraphs +
 * inline italics). The bodies are authored in-repo, so the supported subset is
 * intentionally tiny — no third-party markdown dependency.
 */
export function LegalMarkdown({ body }: { body: string }) {
  const lines = body.split('\n')
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (trimmed === '') {
          return null
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-primary mt-4 text-lg font-medium">
              {inline(trimmed.slice(3))}
            </h2>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={i} className="text-primary text-2xl font-medium tracking-tight">
              {inline(trimmed.slice(2))}
            </h1>
          )
        }
        if (trimmed.startsWith('- ')) {
          return (
            <div key={i} className="text-primary flex gap-2 text-sm leading-relaxed">
              <span className="text-secondary select-none">•</span>
              <span>{inline(trimmed.slice(2))}</span>
            </div>
          )
        }
        return (
          <p key={i} className="text-primary text-sm leading-relaxed">
            {inline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}
