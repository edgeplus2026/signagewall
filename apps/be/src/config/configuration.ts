export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  playerUrl: process.env.PLAYER_URL ?? 'http://localhost:5174',
  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/edge',
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
  mail: {
    enabled: process.env.MAIL_ENABLED === 'true',
    from: process.env.MAIL_FROM ?? 'Edge <onboarding@resend.dev>',
    resendApiKey: process.env.RESEND_API_KEY,
    supportTo: process.env.MAIL_SUPPORT_TO,
    // Inbox that receives a notification on every new user registration.
    registrationsNotifyTo:
      process.env.MAIL_REGISTRATIONS_NOTIFY_TO ?? 'edgeplus2026@gmail.com',
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
  },
  throttle: {
    // Global default window (seconds) and max requests per window per client.
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
    // Stricter window applied to sensitive auth/invite routes.
    authTtlSeconds: parseInt(process.env.THROTTLE_AUTH_TTL_SECONDS ?? '60', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
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
  },
});
