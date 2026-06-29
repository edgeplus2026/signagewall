import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  PLAYER_URL: Joi.string().uri().default('http://localhost:5174'),
  MONGODB_URI: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional().allow(''),
  MICROSOFT_CLIENT_ID: Joi.string().optional().allow(''),
  MICROSOFT_CLIENT_SECRET: Joi.string().optional().allow(''),
  MICROSOFT_TENANT: Joi.string().optional().allow(''),
  // Base32/64 of a 32-byte key. Required to store third-party OAuth tokens at
  // rest (AES-256-GCM). Connected apps are disabled when unset.
  ENCRYPTION_KEY: Joi.string().optional().allow(''),
  // Publicly reachable HTTPS base URL of this API, for provider webhook
  // notifications (Microsoft Graph). Falls back to polling when unset.
  PUBLIC_API_URL: Joi.string().uri().optional().allow(''),
  MAIL_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  RESEND_API_KEY: Joi.string().optional().allow(''),
  MAIL_FROM: Joi.string().optional(),
  MAIL_SUPPORT_TO: Joi.string().email().optional().allow(''),
  MAIL_REGISTRATIONS_NOTIFY_TO: Joi.string().email().optional().allow(''),
  PASSWORD_RESET_EXPIRES_IN_HOURS: Joi.number().default(1),
  EMAIL_VERIFICATION_EXPIRES_IN_HOURS: Joi.number().default(24),
  THROTTLE_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),
  THROTTLE_AUTH_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_AUTH_LIMIT: Joi.number().default(10),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').optional(),
  R2_ACCOUNT_ID: Joi.string().optional().allow(''),
  R2_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  R2_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  R2_BUCKET: Joi.string().optional().allow(''),
  R2_PUBLIC_URL: Joi.string().uri().optional().allow(''),
  MEDIA_MAX_FILE_SIZE_BYTES: Joi.number().default(10 * 1024 * 1024),
  MEDIA_MAX_FILES_PER_UPLOAD: Joi.number().default(10),
  PEXELS_API_KEY: Joi.string().optional().allow(''),
  PEXELS_API_BASE_URL: Joi.string().uri().default('https://api.pexels.com'),
  STOCK_MEDIA_MAX_IMPORT_BYTES: Joi.number().default(50 * 1024 * 1024),
  PLAYER_PAIRING_CODE_TTL_MINUTES: Joi.number().default(15),
  PLAYER_OFFLINE_AFTER_SECONDS: Joi.number().default(90),
});
