process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/signagewall-test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ??
  'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  'test-refresh-secret-with-at-least-32-characters';
// The tenancy pack registers and logs in several users back-to-back from one
// IP; production's 10/min auth throttle would 429 the suite, and throttling
// itself is not what these tests prove.
process.env.THROTTLE_AUTH_LIMIT = process.env.THROTTLE_AUTH_LIMIT ?? '1000';
process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT ?? '10000';
