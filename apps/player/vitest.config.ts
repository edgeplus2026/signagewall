import { defineConfig } from 'vitest/config'

// A dedicated test config (vitest prefers this over vite.config.ts) so the PWA
// plugin never runs during tests. The engine is exercised in a plain node
// environment with injected fake slots — no DOM/decode needed; `test/setup.ts`
// provides the few globals the controller touches.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts'],
    /**
     * Well above vitest's 5 s default, because the slowest thing in this suite is
     * not a test — it is module LOADING.
     *
     * The identity and updater suites isolate module state with
     * `vi.resetModules()` and then `await import(...)`, which re-transforms the
     * whole graph from scratch. `native/bootstrap` pulls in `sentry`, and that
     * pulls in `@sentry/browser`. On an idle machine one such import is ~200 ms;
     * under `turbo run type-check lint test`, with every package compiling at
     * once, it passed 5 s and the suite failed on a timeout while asserting
     * nothing more demanding than "a plain browser touches no native store".
     *
     * That is a flaky gate on the release: `player-android-release` will not
     * build an APK unless `player-ci` is green, so a loaded CI runner could block
     * a release for reasons that have nothing to do with the code. Four times the
     * headroom costs nothing on a passing run — a real hang still fails, just
     * twenty seconds later.
     */
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
