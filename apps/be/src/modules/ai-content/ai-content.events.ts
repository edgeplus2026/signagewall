/**
 * In-process domain event for AI content generations. The worker emits this via
 * `EventEmitter2` after a generation reaches a terminal state (and after the
 * Mongo write commits); the {@link CmsGateway} subscribes with `@OnEvent` and
 * relays an `ai-content:changed` nudge to the generation's `org:<id>` room so the
 * wizard refetches the job. Keeps the AI module decoupled from the websocket
 * layer (it never imports the gateway) — mirrors the notifications pattern.
 */
export const AiContentEvents = {
  Changed: 'ai-content.changed',
} as const;

export interface AiContentChangedEvent {
  /** Org room the change is scoped to. */
  organizationId: string;
  /** The user who owns the generation (so clients can notify only the initiator). */
  userId: string;
  /** The generation that changed. */
  generationId: string;
  /** Terminal status the generation reached (`succeeded` | `failed`). */
  status: string;
}
