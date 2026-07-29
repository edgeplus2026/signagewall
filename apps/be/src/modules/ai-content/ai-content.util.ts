import {
  aiGeneratedContentSchema,
  type AiGeneratedContent,
} from '@signagewall/apps-contract';

/**
 * Turn a model's raw text response into validated {@link AiGeneratedContent}.
 * Defensive by design: models often wrap JSON in prose or ```code fences```, so
 * we strip those and slice out the first `{…}` before parsing. Throws on invalid
 * JSON or a schema mismatch — the caller (processor) lets BullMQ retry, then
 * marks the job failed once attempts are exhausted.
 */
export function parseGeneratedContent(raw: string): AiGeneratedContent {
  const jsonText = extractJsonObject(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Model output was not valid JSON');
  }

  const result = aiGeneratedContentSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Model output failed validation: ${detail}`);
  }

  return result.data;
}

function extractJsonObject(raw: string): string {
  let text = raw.trim();

  // ```json … ``` or ``` … ``` fences.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  // Fall back to the outermost {…} slice if there's leading/trailing prose.
  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  return text;
}
