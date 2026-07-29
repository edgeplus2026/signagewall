# Backend Setup Guide

## Prerequisites

- Node.js 20+
- MongoDB 6+ **as a replica set** (Atlas `mongodb+srv://`, or a local single-node
  replica set). Required because multi-document writes use transactions — a plain
  standalone `mongod` will throw on `withTransaction`.
- npm

## Quick start

```bash
cd apps/be
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT secrets, optional Google/Resend keys
npm run start:dev
```

Server runs at `http://localhost:3000`.

- Unversioned health: `GET http://localhost:3000/api/health`
- Versioned API base: `http://localhost:3000/api/v1` (URI versioning, `defaultVersion: '1'`)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars. `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars |
| `JWT_ACCESS_EXPIRES_IN` | No | Default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | No | Default `7d` |
| `FRONTEND_URL` | No | CORS origin (default `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` | No | Enables Google OAuth routes |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `GOOGLE_CALLBACK_URL` | No | Default `http://localhost:3000/api/v1/auth/google/callback` |
| `MAIL_ENABLED` | No | `true` to send emails; `false` logs to console (default) |
| `RESEND_API_KEY` | No | Required when `MAIL_ENABLED=true` |
| `MAIL_FROM` | No | Sender address for Resend |
| `MAIL_SUPPORT_TO` | No | Feedback / report-problem recipient |
| `PASSWORD_RESET_EXPIRES_IN_HOURS` | No | Default `1` |
| `INVITE_EXPIRES_IN_DAYS` | No | Default `7` |
| `THROTTLE_TTL_SECONDS` | No | Global rate-limit window (default `60`) |
| `THROTTLE_LIMIT` | No | Max requests per window (default `120`) |
| `THROTTLE_AUTH_TTL_SECONDS` | No | Auth/invite throttle window (default `60`) |
| `THROTTLE_AUTH_LIMIT` | No | Auth/invite max requests (default `10`) |

## Google OAuth setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Identity**
3. Create OAuth 2.0 credentials (Web application)
4. Authorized redirect URI: `http://localhost:3000/api/v1/auth/google/callback`
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
6. Restart the server — `/api/v1/auth/google` routes register automatically

After Google login, the backend redirects to:
`{FRONTEND_URL}/auth/google/callback?accessToken=...&refreshToken=...`

## Email setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key → set `RESEND_API_KEY`
3. Set `MAIL_ENABLED=true` in production
4. For development, keep `MAIL_ENABLED=false` — invite and reset links are logged to the console

Without `RESEND_API_KEY` or with `MAIL_ENABLED=false`, emails are not sent (dev-friendly).

## Organizations

Multi-tenant context uses the `X-Organization-Id` request header (set by the frontend axios interceptor).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations` | List organizations for the current user |
| POST | `/organizations` | Create organization + admin membership |
| PATCH | `/organizations/:id` | Rename organization (admin only) |
| DELETE | `/organizations/:id` | Delete organization (admin only; blocked if last org) |

Membership roles: `admin` | `member` (legacy `owner` stored as `admin` in API responses).

## Members & invitations

Org-scoped; requires `X-Organization-Id`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/members` | List members |
| POST | `/members/invite` | Invite by email (admin only) |
| PATCH | `/members/:id` | Update member (admin only) |
| DELETE | `/members/:id` | Remove member (admin only) |
| GET | `/invitations/:token` | Public invitation preview |
| POST | `/invitations/:token/accept` | Accept invite (authenticated) |
| POST | `/invitations/:token/decline` | Decline invite (authenticated) |

## Super Admin

Global platform admin. Requires `role: 'super-admin'` on the user document (set manually in MongoDB).

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "super-admin" } }
)
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | Paginated list (`page`, `limit`, `search`, `sortBy`, `sortOrder`) |
| GET | `/admin/users/:id` | User detail with organizations |
| POST | `/admin/users/:id/impersonate` | Issue impersonation tokens |
| POST | `/admin/users/:id/promote-super-admin` | Grant super-admin role |
| POST | `/admin/users/:id/demote-super-admin` | Revoke super-admin role |
| POST | `/auth/exit-impersonation` | Restore super-admin session |

Default page size: 20. Max limit: 100.

## Project structure

```
apps/be/src/
├── common/           # Filters, interceptors, decorators, shared DTOs
├── config/           # configuration.ts + Joi validation
├── database/         # Mongoose root module
├── i18n/locales/     # en + sr API translations
├── modules/
│   ├── auth/         # JWT + Google OAuth + exit-impersonation
│   ├── users/        # User schema + repository
│   ├── organizations/# Org CRUD + memberships
│   ├── members/      # Org members + invitations
│   ├── admin/        # Super-admin user management + impersonation
│   ├── settings/     # Profile, password, preferences
│   ├── mail/         # Resend + HTML email templates
│   └── health/       # Health check
├── app.module.ts
└── main.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run start:prod` | Run compiled app |
| `npm run lint` | ESLint |
| `npm run test:e2e` | E2E tests (requires MongoDB) |
| `npm run openapi:export` | Build + write `openapi.json` (for frontend type codegen) |

## OpenAPI / Swagger

When `SWAGGER_ENABLED` is true (default in development):

- **Swagger UI:** `http://localhost:3000/api/docs`
- **OpenAPI JSON:** `http://localhost:3000/api/docs-json`

Regenerate the committed spec after API changes:

```bash
npm run openapi:export
```

Then regenerate frontend types from `apps/cms/`:

```bash
npm run generate:api-types
```

Set `SWAGGER_ENABLED=false` in production unless you intentionally expose docs.

## Connecting the frontend

1. Set `VITE_API_URL=http://localhost:3000/api/v1` in `apps/cms/.env`
2. Register or log in at `/login`
3. Create an organization at `/create-organization` if prompted
4. For super-admin UI: set role in MongoDB and re-login
