// The playback engine schedules work via `window.setTimeout`/`setInterval`. The
// node test environment has no `window`, so alias it to the global scope —
// vitest's fake timers patch the globals, which then drive the engine's timers.
;(globalThis as { window?: unknown }).window = globalThis

// Prefetch warms the SW cache via fetch(). Stub it to a resolved no-op so tests
// never touch the network; `caches` stays undefined (isCached -> false) and
// `navigator.storage` is absent (overStorageBudget -> false), leaving prefetch
// an inert background loop that the engine already swallows failures from.
globalThis.fetch = (() =>
  Promise.resolve(new Response(null, { status: 200 }))) as typeof fetch
