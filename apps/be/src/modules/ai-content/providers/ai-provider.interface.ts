import type { AiGenerationInput } from '@signagewall/apps-contract';

/**
 * DI token for the AI content provider. Bind it to a concrete implementation in
 * the module (`{ provide: AI_CONTENT_PROVIDER, useClass: OpenRouterProvider }`),
 * mirroring the stock-media provider pattern. Swapping providers means changing
 * only the `useClass` — no caller touches a concrete class.
 */
export const AI_CONTENT_PROVIDER = Symbol('AI_CONTENT_PROVIDER');

export interface AiGenerateOptions {
  /** How many slides to request. */
  slideCount: number;
  /** Abort signal for cancellation/timeout. */
  signal?: AbortSignal;
}

/**
 * A "dumb" text generator: given the business context, return the model's raw
 * text response. The processor owns fence-stripping, JSON parsing and Zod
 * validation, so providers stay interchangeable and free of parsing logic.
 */
export interface AiContentProvider {
  /** Stable provider name, persisted for observability (e.g. `'openrouter'`). */
  readonly name: string;
  /** Model id the provider is configured to use (persisted per generation). */
  readonly model: string;
  /** Whether the provider has the credentials it needs to run. */
  isConfigured(): boolean;
  /** Returns the model's raw text output (expected to contain JSON). */
  generate(
    input: AiGenerationInput,
    options: AiGenerateOptions,
  ): Promise<string>;
}
