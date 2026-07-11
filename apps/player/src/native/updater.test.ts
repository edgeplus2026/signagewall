import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Covers the web side of the OTA updater: boot detection, the guarded apply path
 * shared by both triggers, the health handshake, and the standby catch-up. Each
 * test loads the module graph fresh so runtime.ts's in-memory status and the
 * module-level in-flight guard never leak across cases.
 */

type CheckResult =
  | {
      available: boolean
      currentVersion: string
      availableVersion?: string | null
    }
  | 'reject'

/** Stubs a Tauri window whose `check_update` returns `result` (or rejects). */
function stubTauri(result: CheckResult) {
  const invoke = vi.fn(async (cmd: string) => {
    if (cmd === 'check_update') {
      if (result === 'reject') throw new Error('endpoint unreachable')
      return result
    }
    return undefined
  })
  vi.stubGlobal('window', {
    __TAURI_INTERNALS__: {},
    __TAURI__: { core: { invoke } },
  })
  return invoke
}

/** Stubs a Tauri window whose `run_update` returns `result`, with a relaunch spy. */
function stubRunUpdate(result: unknown | 'reject') {
  const relaunch = vi.fn()
  const invoke = vi.fn(async (cmd: string) => {
    if (cmd !== 'run_update') return undefined
    if (result === 'reject') throw new Error('install failed')
    return result
  })
  vi.stubGlobal('window', {
    __TAURI_INTERNALS__: {},
    __TAURI__: { core: { invoke }, process: { relaunch } },
  })
  return { relaunch, invoke }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load() {
  vi.resetModules()
  const updater = await import('./updater')
  const runtime = await import('./runtime')
  return { ...updater, ...runtime }
}

describe('checkForUpdate', () => {
  it('is a no-op in a plain browser (no status recorded)', async () => {
    vi.stubGlobal('window', {})
    const { checkForUpdate, getUpdateStatus } = await load()
    await checkForUpdate()
    expect(getUpdateStatus()).toBeUndefined()
  })

  it("reports 'up-to-date' when no newer build is available", async () => {
    stubTauri({ available: false, currentVersion: '0.1.0' })
    const { checkForUpdate, getUpdateStatus } = await load()
    await checkForUpdate()
    const status = getUpdateStatus()
    expect(status?.lastResult).toBe('up-to-date')
    expect(status?.currentVersion).toBe('0.1.0')
    expect(status?.availableVersion).toBeUndefined()
    expect(status?.lastCheckAt).toBeDefined()
  })

  it("reports 'available' with the version when a newer build exists", async () => {
    stubTauri({
      available: true,
      currentVersion: '0.1.0',
      availableVersion: '0.2.0',
    })
    const { checkForUpdate, getUpdateStatus } = await load()
    await checkForUpdate()
    const status = getUpdateStatus()
    expect(status?.lastResult).toBe('available')
    expect(status?.availableVersion).toBe('0.2.0')
    expect(status?.currentVersion).toBe('0.1.0')
  })

  it("reports 'error' when the check command fails", async () => {
    stubTauri('reject')
    const { checkForUpdate, getUpdateStatus } = await load()
    await checkForUpdate()
    expect(getUpdateStatus()?.lastResult).toBe('error')
  })
})

describe('applyUpdateOrReload (nightly window)', () => {
  it('does NOT restart when Rust reports an update is installing', async () => {
    const { relaunch, invoke } = stubRunUpdate({
      kind: 'updating',
      version: '0.3.0',
    })
    const { applyUpdateOrReload } = await load()
    await applyUpdateOrReload()
    expect(invoke).toHaveBeenCalledWith('run_update', undefined)
    // 'updating' → the shell is relaunching into the new version itself.
    expect(relaunch).not.toHaveBeenCalled()
  })

  it('falls back to a normal restart when there is no update', async () => {
    const { relaunch } = stubRunUpdate({ kind: 'up-to-date' })
    const { applyUpdateOrReload } = await load()
    await applyUpdateOrReload()
    expect(relaunch).toHaveBeenCalledTimes(1)
  })

  it('still reloads when the update fails (the nightly reload is owed either way)', async () => {
    const { relaunch } = stubRunUpdate('reject')
    const { applyUpdateOrReload, getUpdateStatus } = await load()
    await applyUpdateOrReload()
    expect(relaunch).toHaveBeenCalledTimes(1)
    expect(getUpdateStatus()?.lastResult).toBe('error')
  })

  it('reloads in a plain browser (no native update path)', async () => {
    const reload = vi.fn()
    vi.stubGlobal('window', { location: { reload, href: '' } })
    const { applyUpdateOrReload } = await load()
    await applyUpdateOrReload()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

describe('applyUpdateIfAvailable (standby catch-up)', () => {
  it('runs the update but never reloads when there is no update', async () => {
    const { relaunch, invoke } = stubRunUpdate({ kind: 'up-to-date' })
    const { applyUpdateIfAvailable, getUpdateStatus } = await load()
    await applyUpdateIfAvailable()
    expect(invoke).toHaveBeenCalledWith('run_update', undefined)
    // Off the nightly window there is nothing to reload if no update exists.
    expect(relaunch).not.toHaveBeenCalled()
    expect(getUpdateStatus()?.lastResult).toBe('up-to-date')
  })

  it('surfaces a failed apply as an error instead of swallowing it', async () => {
    stubRunUpdate('reject')
    const { applyUpdateIfAvailable, getUpdateStatus } = await load()
    await applyUpdateIfAvailable()
    // A silently-swallowed failure would leave the CMS showing a stale
    // "available" forever with no sign the device had tried and failed.
    expect(getUpdateStatus()?.lastResult).toBe('error')
  })

  it('is a no-op in a plain browser', async () => {
    vi.stubGlobal('window', {})
    const { applyUpdateIfAvailable } = await load()
    await expect(applyUpdateIfAvailable()).resolves.toBeUndefined()
  })

  it('serializes overlapping applies — the second call no-ops while one is in flight', async () => {
    let settle: ((v: unknown) => void) | undefined
    const pending = new Promise((resolve) => {
      settle = resolve
    })
    const invoke = vi.fn(async (cmd: string) =>
      cmd === 'run_update' ? pending : undefined,
    )
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      __TAURI__: { core: { invoke }, process: { relaunch: vi.fn() } },
    })
    const { applyUpdateIfAvailable } = await load()

    // The nightly window and the standby catch-up can fire together; a second
    // concurrent run would double-download and race the Rust state file.
    const first = applyUpdateIfAvailable()
    const second = applyUpdateIfAvailable()
    expect(invoke).toHaveBeenCalledTimes(1)

    settle?.({ kind: 'up-to-date' })
    await Promise.all([first, second])

    // Guard released: a later apply runs again.
    await applyUpdateIfAvailable()
    expect(invoke).toHaveBeenCalledTimes(2)
  })
})

describe('loadUpdateState', () => {
  it('reflects a rollback/unhealthy outcome into the reported status', async () => {
    const invoke = vi.fn(async (cmd: string) =>
      cmd === 'get_update_state'
        ? { lastResult: 'unhealthy', rolledBack: true, currentVersion: '0.2.0' }
        : undefined,
    )
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      __TAURI__: { core: { invoke } },
    })
    const { loadUpdateState, getUpdateStatus } = await load()
    await loadUpdateState()
    const status = getUpdateStatus()
    expect(status?.lastResult).toBe('unhealthy')
    expect(status?.currentVersion).toBe('0.2.0')
  })

  it("surfaces an in-progress 'installing' state from a post-update boot", async () => {
    const invoke = vi.fn(async (cmd: string) =>
      cmd === 'get_update_state'
        ? {
            lastResult: 'installing',
            pendingVersion: '0.3.0',
            currentVersion: '0.3.0',
          }
        : undefined,
    )
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      __TAURI__: { core: { invoke } },
    })
    const { loadUpdateState, getUpdateStatus } = await load()
    await loadUpdateState()
    expect(getUpdateStatus()?.lastResult).toBe('installing')
    expect(getUpdateStatus()?.currentVersion).toBe('0.3.0')
  })

  it('records nothing when there is no prior result', async () => {
    const invoke = vi.fn(async () => undefined)
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      __TAURI__: { core: { invoke } },
    })
    const { loadUpdateState, getUpdateStatus } = await load()
    await loadUpdateState()
    expect(getUpdateStatus()).toBeUndefined()
  })
})

describe('reportHealthy', () => {
  it('invokes the native report_healthy command', async () => {
    const invoke = vi.fn(async () => undefined)
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      __TAURI__: { core: { invoke } },
    })
    const { reportHealthy } = await load()
    await reportHealthy()
    expect(invoke).toHaveBeenCalledWith('report_healthy', undefined)
  })

  it('is a no-op in a plain browser', async () => {
    vi.stubGlobal('window', {})
    const { reportHealthy } = await load()
    await expect(reportHealthy()).resolves.toBeUndefined()
  })
})

describe('startStandbyUpdate', () => {
  it('applies a pending update when the screen enters standby', async () => {
    const invoke = vi.fn(async () => ({ kind: 'up-to-date' }))
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      __TAURI__: { core: { invoke } },
    })
    vi.resetModules()
    const { startStandbyUpdate } = await import('./updater')
    const { availabilityOn } = await import('../store')

    availabilityOn.value = true // working hours → view is not standby
    const stop = startStandbyUpdate()
    expect(invoke).not.toHaveBeenCalled()

    availabilityOn.value = false // off-hours → view becomes 'standby'
    expect(invoke).toHaveBeenCalledWith('run_update', undefined)
    stop()
  })
})
