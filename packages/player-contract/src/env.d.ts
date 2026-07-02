/**
 * Minimal ambient `console` so this package stays environment-agnostic: its
 * tsconfig lib is pure ES2022 (no DOM, no node types), but both runtimes that
 * consume it (browser player, node backend) provide a real console.
 */
declare const console: { warn: (message: string) => void }
