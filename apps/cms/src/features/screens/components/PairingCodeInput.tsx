import {
  useCallback,
  useMemo,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'

import { cn } from '@/lib/utils'

const CODE_LENGTH = 6

interface PairingCodeInputProps {
  value: string
  onChange: (value: string) => void
  /** Fired when all slots are filled (e.g. to auto-submit). */
  onComplete?: ((value: string) => void) | undefined
  disabled?: boolean
  autoFocus?: boolean
  /** `screen` styles the slots for the dark TV panel; `default` for a form. */
  theme?: 'default' | 'screen'
}

/** Strips to A–Z / 0–9 and caps at the code length. */
function sanitize(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH)
}

/**
 * Six-slot pairing-code entry rendered as two groups of three (`ABC-D29`).
 * Behaves like a one-time-code field: typing advances, Backspace on an empty
 * slot steps back, and pasting a full code (with or without the dash) fills
 * every slot. The visual chrome (TV frame) lives in {@link PairingCodeFrame}.
 */
export function PairingCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  theme = 'default',
}: PairingCodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const chars = useMemo(() => {
    const padded = value.padEnd(CODE_LENGTH, ' ').slice(0, CODE_LENGTH)
    return padded.split('')
  }, [value])

  const focusSlot = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(CODE_LENGTH - 1, index))
    inputsRef.current[clamped]?.focus()
    inputsRef.current[clamped]?.select()
  }, [])

  const commit = useCallback(
    (next: string) => {
      const clean = sanitize(next)
      onChange(clean)
      if (clean.length === CODE_LENGTH) {
        onComplete?.(clean)
      }
      return clean
    },
    [onChange, onComplete],
  )

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const typed = sanitize(raw)
      if (!typed) {
        return
      }

      // Replace the current slot (and overflow into following ones for a paste
      // that lands in a single field).
      const chars = value.split('')
      let cursor = index
      for (const ch of typed) {
        if (cursor >= CODE_LENGTH) break
        chars[cursor] = ch
        cursor += 1
      }
      commit(chars.join(''))
      focusSlot(cursor)
    },
    [value, commit, focusSlot],
  )

  const handleKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Backspace') {
        event.preventDefault()
        const chars = value.split('')
        if (chars[index]) {
          chars[index] = ''
          commit(chars.join(''))
          focusSlot(index)
        } else {
          chars[index - 1] = ''
          commit(chars.join(''))
          focusSlot(index - 1)
        }
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        focusSlot(index - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        focusSlot(index + 1)
      }
    },
    [value, commit, focusSlot],
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault()
      const pasted = commit(event.clipboardData.getData('text'))
      focusSlot(pasted.length)
    },
    [commit, focusSlot],
  )

  const renderSlot = (index: number) => {
    const char = chars[index]?.trim() ?? ''
    return (
      <input
        key={index}
        ref={(el) => {
          inputsRef.current[index] = el
        }}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        autoFocus={autoFocus && index === 0}
        maxLength={1}
        disabled={disabled}
        value={char}
        aria-label={String(index + 1)}
        onChange={(event) => {
          handleChange(index, event.currentTarget.value)
        }}
        onKeyDown={(event) => {
          handleKeyDown(index, event)
        }}
        onPaste={handlePaste}
        onFocus={(event) => {
          event.currentTarget.select()
        }}
        className={cn(
          'aspect-square min-w-0 flex-1 rounded-lg border text-center text-lg font-semibold uppercase transition-colors outline-none sm:text-2xl',
          'max-w-12 sm:max-w-14',
          'disabled:pointer-events-none disabled:opacity-50',
          theme === 'screen'
            ? 'border-white/15 bg-white/6 text-white caret-white/80 focus-visible:border-white/40 focus-visible:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/20'
            : 'border-secondary bg-panel text-primary caret-tertiary focus-visible:border-tertiary focus-visible:ring-3 focus-visible:ring-tertiary/40',
        )}
      />
    )
  }

  return (
    <div className="flex w-full items-center justify-center gap-1 sm:gap-2.5">
      <div className="flex min-w-0 flex-1 justify-center gap-1 sm:gap-2.5">
        {[0, 1, 2].map(renderSlot)}
      </div>
      <span
        className={cn(
          'shrink-0 px-0.5 text-xl font-medium select-none sm:text-2xl',
          theme === 'screen' ? 'text-white/30' : 'text-secondary',
        )}
      >
        -
      </span>
      <div className="flex min-w-0 flex-1 justify-center gap-1 sm:gap-2.5">
        {[3, 4, 5].map(renderSlot)}
      </div>
    </div>
  )
}

export { CODE_LENGTH }
