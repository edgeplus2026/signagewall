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
  },
})
