export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  // Reverse-proxy hops in front of this API (Railway = 1). Express needs it to
  // resolve req.ip from X-Forwarded-For; otherwise every client shares the
  // proxy's IP and per-client throttling collapses into one global bucket.
  trustProxyHops: parseInt(
    process.env.TRUST_PROXY_HOPS ??
      ((process.env.NODE_ENV ?? 'development') === 'production' ? '1' : '0'),
    10,
  ),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  playerUrl: process.env.PLAYER_URL ?? 'http://localhost:5174',
  marketingUrl: process.env.MARKETING_URL ?? 'http://localhost:3002',
  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/signagewall',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3000/api/v1/auth/google/callback',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    // 'common' allows any work/school/personal account; override for single-tenant.
    tenant: process.env.MICROSOFT_TENANT ?? 'common',
  },
  canva: {
    clientId: process.env.CANVA_CLIENT_ID,
    clientSecret: process.env.CANVA_CLIENT_SECRET,
  },
  meta: {
    clientId: process.env.META_CLIENT_ID,
    clientSecret: process.env.META_CLIENT_SECRET,
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },
  // AES-256-GCM key for encrypting third-party OAuth tokens at rest.
  encryptionKey: process.env.ENCRYPTION_KEY,
  // Publicly reachable HTTPS base URL of this API (connection OAuth callbacks +
  // Microsoft Graph webhook notifications).
  publicApiUrl: process.env.PUBLIC_API_URL,
  // Optional override for provider webhook callbacks only (Microsoft Graph).
  // Point it at a dev tunnel (cloudflared/ngrok) to receive webhooks on a
  // machine whose PUBLIC_API_URL is unset or not publicly reachable.
  webhookPublicUrl: process.env.WEBHOOK_PUBLIC_URL,
  mail: {
    enabled: process.env.MAIL_ENABLED === 'true',
    from: process.env.MAIL_FROM ?? 'SignageWall <onboarding@resend.dev>',
    resendApiKey: process.env.RESEND_API_KEY,
    supportTo: process.env.MAIL_SUPPORT_TO,
    // Inbox that receives a notification on every new user registration.
    registrationsNotifyTo:
      process.env.MAIL_REGISTRATIONS_NOTIFY_TO ?? 'edgeplus2026@gmail.com',
    // Founder/sales inbox for durable contact and quote leads.
    crmNotifyTo: process.env.MAIL_CRM_NOTIFY_TO,
    // Founder/admin inbox for the daily manual-billing exception digest.
    billingAlertsTo: process.env.MAIL_BILLING_ALERTS_TO,
  },
  auth: {
    passwordResetExpiresInHours: parseInt(
      process.env.PASSWORD_RESET_EXPIRES_IN_HOURS ?? '1',
      10,
    ),
    emailVerificationExpiresInHours: parseInt(
      process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS ?? '24',
      10,
    ),
    inviteExpiresInDays: parseInt(
      process.env.INVITE_EXPIRES_IN_DAYS ?? '7',
      10,
    ),
    // Consecutive failed password attempts before a temporary lock. Per-account
    // complement to the per-IP AuthThrottle, which a distributed attacker evades.
    maxFailedLoginAttempts: parseInt(
      process.env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS ?? '5',
      10,
    ),
    loginLockoutMinutes: parseInt(
      process.env.AUTH_LOGIN_LOCKOUT_MINUTES ?? '15',
      10,
    ),
  },
  throttle: {
    // Global default window (seconds) and max requests per window per client.
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
    // Stricter window applied to sensitive auth/invite routes.
    authTtlSeconds: parseInt(process.env.THROTTLE_AUTH_TTL_SECONDS ?? '60', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
  },
  analytics: {
    // Optional server-side forwarding. First-party Mongo events work without it.
    gaMeasurementId: process.env.GA_MEASUREMENT_ID,
    gaApiSecret: process.env.GA_API_SECRET,
  },
  swagger: {
    enabled:
      process.env.SWAGGER_ENABLED === 'true'
        ? true
        : process.env.SWAGGER_ENABLED === 'false'
          ? false
          : (process.env.NODE_ENV ?? 'development') !== 'production',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/$/, ''),
  },
  // Tenant-private app assets. This must be a separate, non-public R2 bucket;
  // it deliberately has no public URL and never falls back to `r2.*`.
  privateR2: {
    accountId: process.env.PRIVATE_R2_ACCOUNT_ID,
    accessKeyId: process.env.PRIVATE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.PRIVATE_R2_SECRET_ACCESS_KEY,
    bucket: process.env.PRIVATE_R2_BUCKET,
    signedUrlTtlSeconds: parseInt(
      process.env.PRIVATE_R2_SIGNED_URL_TTL_SECONDS ?? '900',
      10,
    ),
  },
  media: {
    maxFileSizeBytes: parseInt(
      process.env.MEDIA_MAX_FILE_SIZE_BYTES ?? String(10 * 1024 * 1024),
      10,
    ),
    maxFilesPerUpload: parseInt(
      process.env.MEDIA_MAX_FILES_PER_UPLOAD ?? '10',
      10,
    ),
  },
  pexels: {
    apiKey: process.env.PEXELS_API_KEY,
    baseUrl: process.env.PEXELS_API_BASE_URL ?? 'https://api.pexels.com',
  },
  stockMedia: {
    maxImportBytes: parseInt(
      process.env.STOCK_MEDIA_MAX_IMPORT_BYTES ?? String(50 * 1024 * 1024),
      10,
    ),
  },
  player: {
    // How long a freshly issued pairing code remains valid (minutes).
    pairingCodeTtlMinutes: parseInt(
      process.env.PLAYER_PAIRING_CODE_TTL_MINUTES ?? '15',
      10,
    ),
    // A device is considered offline if no heartbeat arrives within this window.
    offlineAfterSeconds: parseInt(
      process.env.PLAYER_OFFLINE_AFTER_SECONDS ?? '90',
      10,
    ),
    // Email org members after a paired screen has been offline this long.
    // 0 disables the alert entirely.
    offlineAlertMinutes: parseInt(
      process.env.SCREEN_OFFLINE_ALERT_MINUTES ?? '10',
      10,
    ),
  },
  // Redis — backs the BullMQ queue used by the AI content generator. A full
  // `REDIS_URL` (e.g. rediss://…) takes precedence over host/port when set.
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
  },
  // OpenRouter — the (swappable) AI provider for content generation.
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model:
      process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free',
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    timeoutMs: parseInt(process.env.OPENROUTER_TIMEOUT_MS ?? '60000', 10),
    // Optional attribution headers OpenRouter recommends for API traffic.
    appUrl: process.env.OPENROUTER_APP_URL,
    appTitle: process.env.OPENROUTER_APP_TITLE ?? 'SignageWall CMS',
  },
  aiContent: {
    // Max generations per user per UTC day.
    dailyLimit: parseInt(process.env.AI_CONTENT_DAILY_LIMIT ?? '10', 10),
    // Slides requested from the model (never asked of the user).
    defaultSlides: parseInt(process.env.AI_CONTENT_DEFAULT_SLIDES ?? '5', 10),
  },
});
