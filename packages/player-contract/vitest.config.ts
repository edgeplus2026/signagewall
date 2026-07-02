import { defineConfig } from 'vitest/config'

// The evaluator is pure and Intl-only, so a plain node environment (full ICU
// ships with Node ≥ 20) exercises real timezone/DST behavior.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
