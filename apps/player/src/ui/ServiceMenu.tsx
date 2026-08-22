import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { ComponentChildren, JSX } from 'preact'

import { config } from '../config'
import { getDeviceId } from '../device'
import {
  closeApp,
  deactivateDevice,
  isServiceMenuAvailable,
  installUpdateNow,
  loadShellDeviceInfo,
  pendingUpdateVersion,
  readShellLog,
  reportServiceMenuOpen,
  requestRecoveryPermission,
  setWebDebugging,
  type ShellDeviceInfo,
} from '../native/service'
import { connection, kioskMode, paired, serviceMenuOpen, snapshot } from '../store'
import { setKioskLockEnabled } from '../sync/kiosk'

/**
 * The on-device service panel: what a technician standing in front of a screen
 * needs, reachable with the one key every remote has spare — UP.
 *
 * It is a sidebar down the right edge rather than a strip along the bottom. The
 * shape matches the content it covers: signage is overwhelmingly landscape, so a
 * column costs the artwork a third of its width instead of a band across the
 * middle of it, and a vertical list is what a D-pad walks best — one axis, no
 * wrapping, no guessing where the next item is on a different screen width.
 *
 * It lives in the web layer, not the shell, for two reasons: it can show what the
 * shell cannot (screen name, pairing state, player version) and it looks the same
 * on an Android box, a webOS TV and a browser, where a native dialog would exist
 * on exactly one of the three. The trade-off is real and worth stating: a page
 * that fails to load has no panel. That case is covered below this layer, by the
 * shell's key escape hatch, which unlocks the kiosk without needing the page.
 *
 * Navigation follows the shape: UP/DOWN walk the list, OK activates, and RIGHT
 * sends the panel back off the edge it came from. The device facts are folded
 * into one "Info" row that opens into a plain label/value list, so the panel
 * opens as a short menu instead of a wall of small print.
 */

/**
 * One row in the panel. Built as data rather than as fixed markup because the set
 * is not fixed: the recovery grant exists only on a device that still needs it,
 * deactivation only on a paired one, and D-pad navigation has to walk whatever is
 * actually there.
 */
interface BarAction {
  key: string
  label: string
  hint: string
  /**
   * Something on this box needs a person. The panel's only accent colour, spent
   * exclusively here — if everything is highlighted, nothing is.
   */
  attention?: boolean
  disabled?: boolean
  /** Rendered as an on/off switch rather than a plain row. */
  toggle?: boolean
  on?: boolean
  /** Rendered as an expandable row (a chevron that turns). */
  expandable?: boolean
  expanded?: boolean
  /** Shown under the row while it is expanded. */
  detail?: JSX.Element
  activate: () => void
}

export function ServiceMenu() {
  const open = serviceMenuOpen.value
  const [index, setIndex] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<ShellDeviceInfo | undefined>(undefined)
  const [noSettingsScreen, setNoSettingsScreen] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<string | undefined>(undefined)
  /** Undefined until the shell answers — and stays undefined where it cannot. */
  const [webDebug, setWebDebug] = useState<boolean | undefined>(undefined)
  const [log, setLog] = useState<string[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const [updateState, setUpdateState] = useState<string | undefined>(undefined)

  const close = useCallback((): void => {
    serviceMenuOpen.value = false
    setConfirming(false)
    setInfoOpen(false)
    setIndex(0)
  }, [])

  const locked = kioskMode.value !== 'off'
  const canClose = Boolean(window.AndroidBridge?.closeApp)
  const screen = snapshot.value
  const isPaired = paired.value
  // Undefined means a shell too old to answer — say nothing rather than accuse a
  // healthy device of being broken.
  const needsRecovery = info?.canRecover === false

  const actions: BarAction[] = []

  // First, and harmless to activate: whichever row the D-pad lands on when the
  // panel opens is the one an impatient OK press hits, and that should be the row
  // that only ever shows something.
  actions.push({
    key: 'info',
    label: 'Info',
    hint: 'Versions, model and device id',
    expandable: true,
    expanded: infoOpen,
    detail: (
      <div class="service-panel__info">
        <dl class="service-panel__facts">
          <Fact label="Player" value={config.appVersion} />
          <Fact label="Shell" value={info?.shellVersion} />
          <Fact label="Android" value={androidLabel(info)} />
          <Fact label="Model" value={info?.model} />
          {/* The one resource that runs out silently. Also the number the cache
              warming's budget guard decides on, so a technician reading it here
              sees exactly what that guard sees. */}
          <Fact label="Storage" value={freeSpaceLabel(info?.freeDiskBytes)} />
          <Fact label="Device" value={getDeviceId()} mono />
        </dl>
        {/* Only meaningful on Android, and only worth showing when the answer is
            no: a box that isn't Device Owner cannot truly lock, and this is where
            a technician finds out instead of assuming it did. */}
        {info?.deviceOwner === false && (
          <Note>Kiosk lock can be bypassed on this box</Note>
        )}
        {(info?.recoveryRung ?? 0) > 0 && (
          <Note>Recovering repeatedly (step {info?.recoveryRung})</Note>
        )}
        {needsRecovery && (
          <Note>Screen cannot restore itself if playback crashes</Note>
        )}
      </div>
    ),
    activate: () => setInfoOpen((shown) => !shown),
  })

  // Only while it is missing. Without this the display cannot put itself back
  // after anything knocks it off — which is the difference between a four-second
  // blip and a screen that sits on the TV menu until a customer notices. Seen in
  // the field: a firmware codec crash took the player off and 63 consecutive
  // recovery attempts were refused by Android.
  if (needsRecovery) {
    actions.push({
      key: 'recovery',
      label: noSettingsScreen ? 'Not available here' : 'Allow auto-recovery',
      hint: noSettingsScreen
        ? 'This TV has no screen for it — the player cannot restore itself'
        : 'Opens Android settings. Without it the screen stays blank if playback crashes.',
      attention: true,
      disabled: noSettingsScreen,
      activate: () => {
        void requestRecoveryPermission().then((opened) => {
          setNoSettingsScreen(!opened)
        })
      },
    })
  }

  // Only while one is genuinely waiting. A screen that cannot install unattended
  // (no Device Owner, no installer of record) would otherwise never get its first
  // update at all, and this is the one moment a human is present to confirm it.
  if (pendingUpdate) {
    actions.push({
      key: 'update',
      label: updateState === 'updating' ? 'Installing…' : `Install update ${pendingUpdate}`,
      hint:
        updateState === 'updating'
          ? 'Confirm the system dialog when it appears; the player restarts itself'
          : 'This screen cannot install updates on its own — confirm it here, once',
      attention: true,
      disabled: updateState === 'updating',
      activate: () => {
        setUpdateState('updating')
        void installUpdateNow().then((kind) => setUpdateState(kind))
      },
    })
  }

  actions.push({
    key: 'kiosk',
    label: 'Kiosk mode',
    // What the setting DOES, not what it is called. Deliberately not the mode
    // name: the shell quietly degrades `hard` to `soft` on a box that isn't
    // Device Owner, so printing "hard" here would be a promise it cannot keep.
    // On a box that is not Device Owner the shell degrades the lock to OS screen
    // pinning, which a determined viewer can leave — so promising that the remote
    // cannot is a claim this device cannot keep, and it contradicted both the Info
    // panel below and the CMS, which say so plainly. Only a confirmed `false`
    // weakens the wording: an older shell reports nothing and must not be accused.
    hint: locked
      ? info?.deviceOwner === false
        ? 'On — but this box can still be exited; it is not Device Owner'
        : 'On — the remote cannot leave the player'
      : 'Off — anyone can exit to the TV menu',
    toggle: true,
    on: locked,
    activate: () => setKioskLockEnabled(kioskMode.peek() === 'off'),
  })

  // Only when there is something to show. An empty log means either a host that
  // keeps none or a screen that has had nothing worth recording — and in both
  // cases an empty panel would just be a dead end.
  if (log.length > 0) {
    actions.push({
      key: 'log',
      label: 'Recent events',
      hint: 'Recoveries, updates and crashes — what this screen did while nobody watched',
      expandable: true,
      expanded: logOpen,
      detail: (
        <div class="service-panel__log">
          {/* Newest first: the answer to "what just happened" is at the end of the
              file, and a technician should not have to scroll to reach it. */}
          {[...log].reverse().map((line) => (
            <p class="service-panel__log-line" key={line}>
              {line}
            </p>
          ))}
        </div>
      ),
      activate: () => setLogOpen((shown) => !shown),
    })
  }

  // Only where the shell can actually do it — its absence in `device_info` marks a
  // host with no such notion, and a switch that does nothing is worse than none.
  if (webDebug !== undefined) {
    actions.push({
      key: 'inspect',
      label: 'Web inspector',
      hint: webDebug
        ? 'On — this screen can be inspected from a computer. Closes itself on restart.'
        : 'Lets a computer see inside the player, for diagnosing a fault',
      toggle: true,
      on: webDebug,
      activate: () => {
        const next = !webDebug
        setWebDebug(next)
        void setWebDebugging(next)
      },
    })
  }

  actions.push({
    key: 'close',
    label: 'Close SignageWall',
    // "Nothing plays until it is reopened" is only true with the lock OFF. The
    // supervisor deliberately undoes an operator close on a LOCKED screen after a
    // few seconds (WatchdogService.onTaskRemoved, "operator close, locked"), which
    // is the right call — a locked kiosk that a remote can close for good is not
    // locked — but the row promised the opposite and simply looked broken. Measured:
    // the player went away and the ladder had it back within about twenty seconds.
    hint: !canClose
      ? 'Only available on the Android player app'
      : locked
        ? 'Leaves for a few seconds, then the screen brings itself back — the kiosk lock is on. Turn the lock off first to keep it closed.'
        : 'Exits to the TV menu. Nothing plays until it is reopened.',
    disabled: !canClose,
    // Off a native shell this is a no-op; the row is disabled there, so reaching
    // here at all means a shell that promised `closeApp` and refused.
    activate: () => void closeApp(),
  })

  // Nothing to deactivate on a display that was never paired: the row would ask
  // to free a device that is already free, and it is the one row here that can
  // cost someone a working screen. It comes back with the pairing.
  if (isPaired) {
    actions.push({
      key: 'deactivate',
      label: busy
        ? 'Deactivating…'
        : confirming
          ? 'Press again to confirm'
          : 'Deactivate player',
      hint: 'Frees it for another screen and asks for a new code. Your content stays in the dashboard.',
      attention: confirming,
      disabled: busy,
      // First press arms, second confirms. Wiping a paired screen on a single
      // D-pad press is not a mistake anyone should be able to make.
      activate: () =>
        setConfirming((armed) => {
          if (!armed) {
            return true
          }
          setBusy(true)
          void deactivateDevice()
          return true
        }),
    })
  }

  // Mirrored into a ref so the key handler — registered once — always sees the
  // current selection and action set without re-subscribing on every keypress.
  const stateRef = useRef({ open, index, busy, actions })
  stateRef.current = { open, index, busy, actions }

  const move = useCallback((step: number): void => {
    const count = stateRef.current.actions.length
    setIndex((value) => (value + step + count) % count)
    // Walking away disarms: an armed destructive action must never survive the
    // operator's attention moving somewhere else.
    setConfirming(false)
  }, [])

  // Signage has no pointer, so one window listener drives everything. It runs
  // whether or not the panel is open, because UP is also what opens it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // Native shells only — see isServiceMenuAvailable. Checked per keypress
      // rather than once at mount so the answer can never be stale.
      if (!isServiceMenuAvailable()) {
        return
      }
      const current = stateRef.current
      if (!current.open) {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          serviceMenuOpen.value = true
        }
        return
      }

      // While open, the panel owns the arrows: stopPropagation keeps the stage's
      // own left/right handler from paging the playlist behind us.
      switch (event.key) {
        case 'ArrowUp':
          move(-1)
          break
        case 'ArrowDown':
          move(1)
          break
        case 'Enter':
        case ' ': {
          const action = current.actions[current.index]
          if (!current.busy && action && !action.disabled) {
            action.activate()
          }
          break
        }
        // Right dismisses — the panel goes back the way it came. Escape/Back are
        // the same intent from a keyboard or a remote whose BACK the shell
        // forwards to us.
        case 'ArrowRight':
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          close()
          break
        // Swallowed, not acted on: LEFT points further into the panel, where
        // there is nothing to go to, and letting it through would page the
        // playlist behind an open menu.
        case 'ArrowLeft':
          break
        default:
          return
      }
      event.preventDefault()
      event.stopPropagation()
    }

    // Capture phase so the panel sees the key before the stage's bubble-phase
    // handler, which is what makes stopPropagation above actually hold.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [close, move])

  // Let the native shell drive the panel too. On a signage screen the content is
  // usually an app in a cross-origin iframe, and while that iframe holds focus
  // the page never sees a key at all — so the shell intercepts UP above the
  // WebView and calls in here. It also needs to know we are open, so it can send
  // its BACK to the panel instead of quitting the app.
  useEffect(() => {
    if (!isServiceMenuAvailable()) {
      return undefined
    }
    window.__signagewallService = {
      open: () => {
        serviceMenuOpen.value = true
      },
      close,
    }
    return () => {
      delete window.__signagewallService
    }
  }, [close])

  useEffect(() => {
    reportServiceMenuOpen(open)
  }, [open])

  // Ask the shell for its device facts each time the panel opens rather than once
  // at boot: kiosk mode, Device Owner and the recovery permission can all change
  // while the player runs — the last one changes precisely because the operator
  // just granted it from here — and a service menu showing stale state is worse
  // than one showing none.
  useEffect(() => {
    if (!open) {
      return undefined
    }
    let cancelled = false
    void loadShellDeviceInfo().then((loaded) => {
      if (!cancelled) {
        setInfo(loaded)
        setWebDebug(loaded?.webDebugging)
      }
    })
    void pendingUpdateVersion().then((version) => {
      if (!cancelled) {
        setPendingUpdate(version)
      }
    })
    void readShellLog().then((lines) => {
      if (!cancelled) {
        setLog(lines)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  // Keep the selection on screen. The list is short, but an expanded Info block
  // on a phone-sized viewport can push the last rows past the fold, and a D-pad
  // user steering a highlight they cannot see is lost.
  const listRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) {
      return
    }
    listRef.current
      ?.querySelector<HTMLElement>('[data-focused="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, index, infoOpen])

  if (!open) {
    return null
  }

  return (
    <div
      class="service-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Service menu"
    >
      <div class="service-panel__sheet">
        <header class="service-panel__header">
          {/* A paired screen whose snapshot hasn't loaded yet has no name to show,
              but it is emphatically not unpaired — saying so would send a
              technician off to re-pair a display that is working. */}
          <span class="service-panel__name">
            {screen?.name ?? (isPaired ? 'Unnamed screen' : 'Unpaired display')}
          </span>
          <span class="service-panel__status">
            {isPaired ? connection.value : 'not paired'}
          </span>
        </header>

        <div class="service-panel__list" ref={listRef}>
          {actions.map((action, i) => (
            <div class="service-panel__item" key={action.key}>
              <button
                type="button"
                class="service-panel__action"
                data-focused={index === i}
                data-attention={action.attention ?? false}
                aria-pressed={action.toggle ? action.on : undefined}
                aria-expanded={action.expandable ? action.expanded : undefined}
                disabled={action.disabled ?? false}
                onClick={() => {
                  setIndex(i)
                  action.activate()
                }}
              >
                <span class="service-panel__action-text">
                  <span class="service-panel__action-label">{action.label}</span>
                  <span class="service-panel__action-hint">{action.hint}</span>
                </span>
                {action.toggle && (
                  <span
                    class="service-panel__switch"
                    data-on={action.on ?? false}
                    aria-hidden="true"
                  >
                    <span class="service-panel__knob" />
                  </span>
                )}
                {action.expandable && (
                  <span
                    class="service-panel__chevron"
                    data-open={action.expanded ?? false}
                    aria-hidden="true"
                  />
                )}
              </button>
              {action.expanded ? action.detail : null}
            </div>
          ))}
        </div>

        <div class="service-panel__hints">▲ ▼ select · OK confirm · ▶ close</div>
      </div>
    </div>
  )
}

/** One label/value row of the Info block. Missing values render as an em dash, never blank. */
function Fact({
  label,
  value,
  mono,
}: {
  label: string
  value?: string | number
  mono?: boolean
}): JSX.Element {
  return (
    <div class="service-panel__fact">
      <dt class="service-panel__fact-label">{label}</dt>
      <dd class={mono ? 'service-panel__mono' : undefined}>{value ?? '—'}</dd>
    </div>
  )
}

/** A device fact that is bad news. Same list, marked — not a different design. */
function Note({ children }: { children: ComponentChildren }): JSX.Element {
  return <p class="service-panel__note">{children}</p>
}

/**
 * "1.8 GB free" — GB below a terabyte, MB below a gigabyte, because a signage box
 * that is down to its last hundreds of megabytes is exactly when the difference
 * between 0.4 and 0.04 GB matters and a rounded "0.4 GB" hides it.
 */
function freeSpaceLabel(bytes: number | undefined): string | undefined {
  if (bytes === undefined) {
    return undefined
  }
  const gb = bytes / 1024 ** 3
  return gb >= 1
    ? `${gb.toFixed(1)} GB free`
    : `${Math.round(bytes / 1024 ** 2)} MB free`
}

/** "14 (SDK 34)" when both are known, and whichever one is when they aren't. */
function androidLabel(info: ShellDeviceInfo | undefined): string | undefined {
  if (!info?.androidRelease) {
    return info?.androidSdk === undefined ? undefined : `SDK ${info.androidSdk}`
  }
  return info.androidSdk === undefined
    ? info.androidRelease
    : `${info.androidRelease} (SDK ${info.androidSdk})`
}
