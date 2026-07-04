/** BullMQ queue that background AI content generations run on. */
export const AI_CONTENT_QUEUE = 'ai-content';

/** Job name for a single content generation. */
export const AI_CONTENT_GENERATE_JOB = 'generate';

/** How many generations the worker processes concurrently in-process. */
export const AI_CONTENT_WORKER_CONCURRENCY = 2;

/** BullMQ retry attempts per job (parse/validate failures retry a bounded number of times). */
export const AI_CONTENT_JOB_ATTEMPTS = 3;

/** Default duration (seconds) assigned to each generated slide's playlist item. */
export const AI_CONTENT_SLIDE_DURATION_SECONDS = 15;

/** Slug of the catalog app whose instances render generated text slides. */
export const TEXT_APP_SLUG = 'text';
