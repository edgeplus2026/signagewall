import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AiGenerationInput } from '@signagewall/apps-contract';

import { AiContentProvider, AiGenerateOptions } from './ai-provider.interface';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * AI content provider backed by OpenRouter's OpenAI-compatible chat completions
 * API. Kept intentionally thin (build prompt → POST → return raw text) so it can
 * be swapped for another provider by changing only the module binding. Mirrors
 * {@link PexelsProvider}: `fetch` + `AbortSignal.timeout`, key via `ConfigService`,
 * `isConfigured()` gate.
 */
@Injectable()
export class OpenRouterProvider implements AiContentProvider {
  readonly name = 'openrouter';

  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly appUrl: string;
  private readonly appTitle: string;
  readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('openrouter.apiKey')?.trim() ?? '';
    this.model =
      this.configService.get<string>('openrouter.model')?.trim() ??
      'meta-llama/llama-3.3-70b-instruct:free';
    this.baseUrl =
      this.configService.get<string>('openrouter.baseUrl')?.trim() ??
      'https://openrouter.ai/api/v1';
    this.timeoutMs =
      this.configService.get<number>('openrouter.timeoutMs') ?? 60_000;
    this.appUrl =
      this.configService.get<string>('openrouter.appUrl')?.trim() ?? '';
    this.appTitle =
      this.configService.get<string>('openrouter.appTitle')?.trim() ?? '';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generate(
    input: AiGenerationInput,
    options: AiGenerateOptions,
  ): Promise<string> {
    // Join onto the full base path (which includes `/api/v1`). A `new URL()` with
    // a leading-slash path would resolve against the origin and drop `/api/v1`.
    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    // OpenRouter uses these for attribution/ranking; optional.
    if (this.appUrl) headers['HTTP-Referer'] = this.appUrl;
    if (this.appTitle) headers['X-Title'] = this.appTitle;

    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: this.model,
        // Ask for JSON; harmless if the model ignores it (the processor strips
        // fences and parses defensively regardless).
        response_format: { type: 'json_object' },
        temperature: 0.8,
        messages: [
          { role: 'system', content: buildSystemPrompt(options.slideCount) },
          { role: 'user', content: buildUserPrompt(input, options.slideCount) },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await safeReadText(response);
      throw new Error(
        `OpenRouter request failed with status ${String(response.status)}${
          detail ? `: ${detail.slice(0, 500)}` : ''
        }`,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content || content.trim().length === 0) {
      throw new Error('OpenRouter returned an empty completion');
    }
    return content;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function buildSystemPrompt(slideCount: number): string {
  return [
    'You are a copywriter for digital signage screens.',
    `Produce exactly ${slideCount} short on-screen slides for a rotating display.`,
    'Mix two layouts: most slides are "message" (a short headline plus one punchy sentence);',
    'include one or two "photo" slides that are image-forward with just a short headline.',
    'EVERY slide MUST include "imageQuery": 2-4 words naming a concrete, relevant stock photo',
    '(e.g. "modern gym interior", "fresh coffee cup", "happy shoppers").',
    'Keep copy short (no markdown, no emojis unless clearly appropriate).',
    'Respond with ONLY a JSON object, no prose and no code fences, of the form:',
    '{"slides":[{"layout":"message","title":"short heading","body":"the message","imageQuery":"stock photo terms"}],"suggestedName":"a short playlist name"}.',
    'Use "layout":"photo" (short or empty body) for image-forward slides and "layout":"message" otherwise.',
  ].join(' ');
}

function buildUserPrompt(input: AiGenerationInput, slideCount: number): string {
  const lines: string[] = [
    `Industry: ${input.industry}`,
    `Primary goal: ${input.primaryGoal}`,
    `Tone: ${input.tone}`,
    `Language: write all slide text in "${input.language}".`,
    `Number of slides: ${slideCount}.`,
  ];
  if (input.businessName) lines.push(`Business name: ${input.businessName}`);
  if (input.targetAudience)
    lines.push(`Target audience: ${input.targetAudience}`);
  if (input.keyPoints && input.keyPoints.length > 0) {
    lines.push(
      `Key points to reflect:\n${input.keyPoints
        .map((point) => `- ${point}`)
        .join('\n')}`,
    );
  }
  return lines.join('\n');
}
