import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Covers boot-time update *detection*: how `checkForUpdate()` maps the native
 * `check_update` command outcome into the reported update status. Each test
 * loads the module graph fresh so runtime.ts's in-memory status never leaks.
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
