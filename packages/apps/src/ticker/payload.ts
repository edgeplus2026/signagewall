/**
 * Normalized ticker payload: the resolved message list, whichever source
 * (operator rows or RSS headlines) produced it. The embed renders `messages`
 * and falls back to the config rows only while no payload has arrived yet.
 */
export interface TickerPayload {
  messages: string[]
}
