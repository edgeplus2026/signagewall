import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'

import { config } from '../config'
import { getDeviceId } from '../device'
import {
  closeApp,
  deactivateDevice,
  isServiceMenuAvailable,
  loadShellDeviceInfo,
  reportServiceMenuOpen,
  requestRecoveryPermission,
  type ShellDeviceInfo,
} from '../native/service'
import { connection, kioskMode, serviceMenuOpen, snapshot } from '../store'
import { setKioskLockEnabled } from '../sync/kiosk'

/**
 * The on-device service bar: what a technician standing in front of a screen
 * needs, reachable with the one key every remote has spare — UP.
 *
 * It rises from the bottom edge and spans the full width, like a TV's own
 * settings bar, so it reads as part of the device rather than as a dialog the
 * content threw up. Content keeps playing behind it; the bar covers only the
 * strip it needs.
 *
 * It lives in the web layer, not the shell, for two reasons: it can show what the
 * shell cannot (screen name, pairing state, player version) and it looks the same
 * on an Android box, a webOS TV and a browser, where a native dialog would exist
 * on exactly one of the three. The trade-off is real and worth stating: a page
 * that fails to load has no bar. That case is covered below this layer, by the
 * shell's key escape hatch, which unlocks the kiosk without needing the page.
 *
 * Navigation follows the shape: the actions sit side by side, so LEFT/RIGHT walks
 * them and OK activates whichever is focused. DOWN sends the bar back where it
 * came from. The destructive action sits at the far end, in danger colour, and is
 * the only one that asks twice.
 */

/**
 * One action in the bar. Built as data rather than as fixed markup because the
 * set is not fixed: the recovery grant exists only on a device that still needs
 * it, and D-pad navigation has to walk whatever is actually there.
 */
interface BarAction {
  key: string
  label: string
  hint: string
  danger?: boolean
  disabled?: boolean
  /** Rendered as an on/off switch rather than a plain button. */
  toggle?: boolean
  on?: boolean
  activate: () => void
}

export function ServiceMenu() {
  const open = serviceMenuOpen.value
  const [index, setIndex] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<ShellDeviceInfo | undefined>(undefined)
  const [noSettingsScreen, setNoSettingsScreen] = useState(false)

  const close = useCallback((): void => {
    serviceMenuOpen.value = false
    setConfirming(false)
    setIndex(0)
  }, [])

  const locked = kioskMode.value !== 'off'
  const canClose = Boolean(window.AndroidBridge?.closeApp)
  const screen = snapshot.value
  // Undefined means a shell too old to answer — say nothing rather than accuse a
  // healthy device of being broken.
  const needsRecovery = info?.canRecover === false

  const actions: BarAction[] = []

  // First, and only while it is missing. Without this the display cannot put
  // itself back after anything knocks it off — which is the difference between a
  // four-second blip and a screen that sits on the TV menu until a customer
  // notices. Seen in the field: a firmware codec crash took the player off and
  // 63 consecutive recovery attempts were refused by Android.
  if (needsRecovery) {
    actions.push({
      key: 'recovery',
      label: noSettingsScreen ? 'Not available here' : 'Allow auto-recovery',
      hint: noSettingsScreen
        ? 'This TV has no screen for it — the player cannot restore itself'
        : 'Opens Android settings. Without it the screen stays blank if playback crashes.',
      disabled: noSettingsScreen,
      activate: () => {
        void requestRecoveryPermission().then((opened) => {
          setNoSettingsScreen(!opened)
        })
      },
    })
  }

  actions.push({
    key: 'kiosk',
    label: 'Kiosk mode',
    // What the setting DOES, not what it is called. Deliberately not the mode
    // name: the shell quietly degrades `hard` to `soft` on a box that isn't
    // Device Owner, so printing "hard" here would be a promise it cannot keep.
    hint: locked
      ? 'On — the remote cannot leave the player'
      : 'Off — anyone can exit to the TV menu',
    toggle: true,
    on: locked,
    activate: () => setKioskLockEnabled(kioskMode.peek() === 'off'),
  })

  actions.push({
    key: 'close',
    label: 'Close application',
    hint: canClose
      ? 'Exits to the TV menu. Nothing plays until it is reopened.'
      : 'Only available on the Android player app',
    disabled: !canClose,
    // Off a native shell this is a no-op; the button is disabled there, so
    // reaching here at all means a shell that promised `closeApp` and refused.
    activate: () => void closeApp(),
  })

  actions.push({
    key: 'deactivate',
    label: busy
      ? 'Deactivating…'
      : confirming
        ? 'Press again to confirm'
        : 'Deactivate player',
    hint: 'Frees this device for another screen. It asks for a new registration code; your screen and its playlist stay in the dashboard.',
    danger: true,
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
  // whether or not the bar is open, because UP is also what opens it.
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

      // While open, the bar owns the arrows: stopPropagation keeps the stage's
      // own left/right handler from paging the playlist behind us.
      switch (event.key) {
        case 'ArrowLeft':
          move(-1)
          break
        case 'ArrowRight':
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
        // Down dismisses — the bar goes back the way it came. Escape/Back are
        // the same intent from a keyboard or a remote whose BACK the shell
        // forwards to us.
        case 'ArrowDown':
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          close()
          break
        default:
          return
      }
      event.preventDefault()
      event.stopPropagation()
    }

    // Capture phase so the bar sees the key before the stage's bubble-phase
    // handler, which is what makes stopPropagation above actually hold.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [close, move])

  // Let the native shell drive the bar too. On a signage screen the content is
  // usually an app in a cross-origin iframe, and while that iframe holds focus
  // the page never sees a key at all — so the shell intercepts UP above the
  // WebView and calls in here. It also needs to know we are open, so it can send
  // its BACK to the bar instead of quitting the app.
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

  // Ask the shell for its device facts each time the bar opens rather than once
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
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div class="service-bar" role="dialog" aria-modal="true" aria-label="Service menu">
      <div class="service-bar__sheet">
        <div class="service-bar__facts">
          <span class="service-bar__name">{screen?.name ?? 'Unpaired display'}</span>
          <Fact label="Status" value={screen ? connection.value : 'not paired'} />
          <Fact label="Player" value={config.appVersion} />
          <Fact label="Shell" value={info?.shellVersion} />
          <Fact label="Android" value={androidLabel(info)} />
          <Fact label="Model" value={info?.model} />
          <Fact label="Device" value={getDeviceId()} mono />
          {/* Only meaningful on Android, and only worth showing when the answer
              is no: a box that isn't Device Owner cannot truly lock, and this is
              where a technician finds out instead of assuming it did. */}
          {info?.deviceOwner === false && (
            <span class="service-bar__warn">
              Kiosk lock can be bypassed on this box
            </span>
          )}
          {needsRecovery && (
            <span class="service-bar__warn">
              Screen cannot restore itself if playback crashes
            </span>
          )}
        </div>

        <div
          class="service-bar__actions"
          style={`grid-template-columns: repeat(${actions.length}, 1fr)`}
        >
          {actions.map((action, i) => (
            <button
              key={action.key}
              type="button"
              class={
                action.danger
                  ? 'service-bar__action service-bar__action--danger'
                  : 'service-bar__action'
              }
              data-focused={index === i}
              data-armed={action.danger ? confirming : undefined}
              aria-pressed={action.toggle ? action.on : undefined}
              disabled={action.disabled ?? false}
              onClick={() => {
                setIndex(i)
                action.activate()
              }}
            >
              <span class="service-bar__action-text">
                <span class="service-bar__action-label">{action.label}</span>
                <span class="service-bar__action-hint">{action.hint}</span>
              </span>
              {action.toggle && (
                <span
                  class="service-bar__switch"
                  data-on={action.on ?? false}
                  aria-hidden="true"
                >
                  <span class="service-bar__knob" />
                </span>
              )}
            </button>
          ))}
        </div>

        <div class="service-bar__hints">◀ ▶ select · OK confirm · ▼ close</div>
      </div>
    </div>
  )
}

/** One inline label/value pair. Missing values render as an em dash, never blank. */
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
    <span class="service-bar__fact">
      <span class="service-bar__fact-label">{label}</span>
      <span class={mono ? 'service-bar__mono' : undefined}>{value ?? '—'}</span>
    </span>
  )
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
