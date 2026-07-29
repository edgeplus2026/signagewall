# API Contract

Base URL: `/api/v1` (URI versioning, `defaultVersion: '1'`).
`GET /api/health` is unversioned (`VERSION_NEUTRAL`). All paths in the tables
below are relative to `/api/v1` unless noted otherwise.

## Response envelope

### Success

```json
{
  "success": true,
  "data": { }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed. Please check your input.",
    "details": ["email must be an email"]
  },
  "path": "/api/v1/auth/login",
  "timestamp": "2026-06-11T12:00:00.000Z"
}
```

### Frontend integration

`apps/cms/src/lib/axios.ts` unwraps `{ success, data }` on success responses. For errors, use `getApiErrorMessage()` which reads `error.response.data.error.message`.

## i18n

Send language preference on every request:

```
Accept-Language: sr
# or
x-lang: en
```

## Implemented endpoints

Org-scoped routes (`X-Organization-Id`) are guarded by `OrgMembershipGuard` +
`@RequireOrgRole(...)`. Sensitive public auth/invite routes carry `@AuthThrottle()`
(stricter rate limit; over-limit → `429 TOO_MANY_REQUESTS`).

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | Public | Health check — **unversioned**: `/api/health` |
| POST | `/auth/register` | Public | Optional `inviteToken`; rate-limited; tx when invited |
| POST | `/auth/login` | Public | Rate-limited |
| POST | `/auth/forgot-password` | Public | Rate-limited |
| POST | `/auth/reset-password` | Public | Rate-limited |
| POST | `/auth/refresh` | Public | Rate-limited |
| GET | `/auth/me` | Bearer | |
| POST | `/auth/logout` | Bearer | No-op while impersonating |
| POST | `/auth/exit-impersonation` | Bearer | Requires `impersonatorId` in JWT |
| GET | `/auth/google` | Public | When Google configured |
| GET | `/auth/google/callback` | Public | When Google configured |
| GET | `/settings` | Bearer | |
| PATCH | `/settings` | Bearer | |
| PATCH | `/settings/profile` | Bearer | |
| POST | `/settings/change-password` | Bearer | |
| POST | `/settings/set-password` | Bearer | |
| DELETE | `/settings` | Bearer | |
| POST | `/settings/feedback` | Bearer + `X-Organization-Id` | |
| POST | `/settings/report-problem` | Bearer + `X-Organization-Id` | |
| GET | `/organizations` | Bearer | |
| POST | `/organizations` | Bearer | |
| PATCH | `/organizations/:id` | Bearer | Admin only |
| DELETE | `/organizations/:id` | Bearer | Admin only |
| GET | `/members` | Bearer + `X-Organization-Id` | Org members list |
| POST | `/members/invite` | Bearer + `X-Organization-Id` | Admin only |
| PATCH | `/members/:id` | Bearer + `X-Organization-Id` | Admin only |
| DELETE | `/members/:id` | Bearer + `X-Organization-Id` | Admin only |
| GET | `/invitations/:token` | Public | Invitation preview; rate-limited |
| POST | `/invitations/:token/accept` | Bearer | |
| POST | `/invitations/:token/decline` | Bearer | |
| GET | `/admin/users` | Bearer + super-admin | Paginated, searchable, sortable |
| GET | `/admin/users/:id` | Bearer + super-admin | User detail |
| POST | `/admin/users/:id/impersonate` | Bearer + super-admin | Returns target user + tokens |
| POST | `/admin/users/:id/promote-super-admin` | Bearer + super-admin | |
| POST | `/admin/users/:id/demote-super-admin` | Bearer + super-admin | |

## Organization context

Tenant-scoped endpoints require the active organization on every request:

```
X-Organization-Id: <organizationId>
```

Used by: `/members/*`, `/settings/feedback`, `/settings/report-problem`, and future domain modules (media, playlists, screens).

Backend pattern (declarative authorization):

```typescript
@Controller('members')
@UseGuards(OrgMembershipGuard)
export class MembersController {
  @Get()
  @RequireOrgRole() // membership only
  list(
    @CurrentUser() user: RequestUser,
    @RequiredOrganizationId() organizationId: string,
  ) { ... }

  @Post('invite')
  @RequireOrgRole({ roles: [OrganizationRole.ADMIN] }) // admin only
  invite(@CurrentMembership() membership: OrganizationMembershipDocument, ...) { ... }
}
```

`OrgMembershipGuard` resolves the org id (header, or a route param via
`idParam` — e.g. `PATCH /organizations/:id`), loads the membership once,
enforces the role, and exposes it via `@CurrentMembership()`. Services no longer
call `assertMembership`/`assertAdmin` for guarded routes.

The header is optional on user-scoped routes (`/auth/*`, `/settings/*` except feedback, `/admin/*`). `/organizations/*` write routes use the `:id` param via the guard's `idParam`.

## Auth (`apps/cms/src/features/auth`)

| Method | Path | Request body | Response `data` |
|--------|------|--------------|-----------------|
| POST | `/auth/login` | `{ email, password }` | `{ user, tokens }` |
| POST | `/auth/register` | `{ name, email, phone, company?, password, inviteToken? }` | `{ user, tokens }` |
| POST | `/auth/forgot-password` | `{ email }` | `null` |
| POST | `/auth/reset-password` | `{ token, password, confirmPassword }` | `null` |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| GET | `/auth/me` | — | `User` |
| POST | `/auth/logout` | — | `null` |
| POST | `/auth/exit-impersonation` | — | `{ user, tokens }` (super-admin session) |

### User shape

```typescript
interface User {
  id: string
  email: string
  name: string
  phone?: string
  company?: string
  provider: 'local' | 'google'
  hasPassword: boolean
  isSuperAdmin: boolean
}
```

Global `role` on the user document is `user` | `super-admin`. Organization roles (`admin` | `member`) are separate — see Members.

### Auth response shape

```typescript
interface AuthResponse {
  user: User
  tokens: { accessToken: string; refreshToken: string }
}
```

### Impersonation JWT

Impersonation tokens include `impersonatorId` in the JWT payload (access + refresh). While impersonating:

- `POST /auth/logout` is a no-op (does not clear super-admin refresh hash)
- `POST /auth/refresh` re-issues impersonation tokens
- `POST /auth/exit-impersonation` returns fresh super-admin tokens
- `/admin/*` routes are blocked (`SuperAdminGuard` rejects `impersonatorId`)

## Settings (`apps/cms/src/features/settings`)

| Method | Path | Request body | Response `data` |
|--------|------|--------------|-----------------|
| PATCH | `/settings/profile` | `{ name, phone, company? }` | `User` |
| POST | `/settings/change-password` | `{ currentPassword, password, confirmPassword }` | `null` |
| POST | `/settings/set-password` | `{ password, confirmPassword }` | `null` |
| GET | `/settings` | — | `AccountSettings` |
| PATCH | `/settings` | `{ language?, theme? }` | `AccountSettings` |
| DELETE | `/settings` | — | `null` |
| POST | `/settings/feedback` | `{ rating, message }` | `null` |
| POST | `/settings/report-problem` | `{ message }` | `null` |

```typescript
interface AccountSettings {
  language: 'en' | 'sr'
  theme: 'light' | 'dark' | 'system'
}
```

## Organizations (`apps/cms/src/features/organizations`)

| Method | Path | Request body | Response `data` |
|--------|------|--------------|-----------------|
| GET | `/organizations` | — | `Organization[]` |
| POST | `/organizations` | `{ name }` | `Organization` |
| PATCH | `/organizations/:id` | `{ name }` | `Organization` |
| DELETE | `/organizations/:id` | — | `null` |

```typescript
interface Organization {
  id: string
  name: string
  role: 'admin' | 'member'  // legacy 'owner' normalized to 'admin' in API
}
```

Rules:
- Every user must belong to at least one organization (onboarding after login/register unless joining via invite).
- Delete is rejected when it would remove the user's last organization (`cannotDeleteLast`).
- Frontend blocks deleting the active organization or the only organization.
- Org create/rename/delete requires `admin` role in that organization.

## Members (`apps/cms/src/features/users`)

Org-scoped team management. Distinct from super-admin global user management.

| Method | Path | Request body | Response `data` |
|--------|------|--------------|-----------------|
| GET | `/members` | — | `Member[]` |
| POST | `/members/invite` | `{ name, email, role }` | `Member` |
| PATCH | `/members/:id` | `{ name, role }` | `Member` |
| DELETE | `/members/:id` | — | `null` |

```typescript
interface Member {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  status: 'approved' | 'pending'  // derived in the mapper: approved = membership, pending = open invitation
  createdAt: string
}
```

> Pending members are open invitations. Invitations are deleted on accept/decline
> (no persisted status enum), so any row returned as `pending` is a live invite.

### Invitation flow

| Method | Path | Auth | Response `data` |
|--------|------|------|-----------------|
| GET | `/invitations/:token` | Public | `InvitationPreview` |
| POST | `/invitations/:token/accept` | Bearer | `Organization` |
| POST | `/invitations/:token/decline` | Bearer | `null` |

- **New user:** invite email → `/register?invite=token` (email prefilled) → register with `inviteToken` → auto-joins org.
- **Existing user:** invite email → `/accept-invite?invite=token` → login if needed → accept/decline dialog.

When `MAIL_ENABLED=false`, invite links are logged to the backend console.

## Super Admin (`apps/cms/src/features/super-admin`)

Requires `user.role === 'super-admin'` in MongoDB. Set manually:

```js
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "super-admin" } })
```

User must re-login for `isSuperAdmin` to appear in the session.

| Method | Path | Query / body | Response `data` |
|--------|------|--------------|-----------------|
| GET | `/admin/users` | `page`, `limit`, `search`, `sortBy`, `sortOrder` | `PaginatedAdminUsers` |
| GET | `/admin/users/:id` | — | `AdminUserDetail` |
| POST | `/admin/users/:id/impersonate` | — | `{ user, tokens }` |
| POST | `/admin/users/:id/promote-super-admin` | — | `AdminUserListItem` |
| POST | `/admin/users/:id/demote-super-admin` | — | `AdminUserListItem` |

### List query params

| Param | Default | Values |
|-------|---------|--------|
| `page` | `1` | ≥ 1 |
| `limit` | `20` | 1–100 |
| `search` | — | Filters `name` and `email` (case-insensitive) |
| `sortBy` | `createdAt` | `name`, `createdAt`, `isActive`, `organizationCount` |
| `sortOrder` | `desc` | `asc`, `desc` |

```typescript
// Shared pagination envelope (backend: PaginatedResult<T> in common/dto/paginated-result.ts)
interface PaginatedAdminUsers {
  items: AdminUserListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface AdminUserListItem {
  id: string
  name: string
  email: string
  provider: string
  isActive: boolean
  isSuperAdmin: boolean
  organizationCount: number
  createdAt: string
}
```

Rules:
- Cannot impersonate, promote, or demote yourself.
- Admin actions blocked while impersonating (use exit-impersonation first).
- Promote sets global role to `super-admin`; demote sets it back to `user`.

## Google OAuth flow

1. Frontend redirects browser to `GET /api/v1/auth/google`
2. User authenticates with Google
3. Google redirects to `GET /api/v1/auth/google/callback` (must match the
   redirect URI registered in the Google Cloud console)
4. Backend creates/links user, issues JWT tokens
5. Backend redirects to `{FRONTEND_URL}/auth/google/callback?accessToken=...&refreshToken=...`
6. Frontend callback page stores tokens and redirects to dashboard

## Error codes reference

| Code | HTTP | Usage |
|------|------|-------|
| `VALIDATION_ERROR` | 400 | DTO validation failed |
| `BAD_REQUEST` | 400 | Generic client error |
| `UNAUTHORIZED` | 401 | Invalid/missing token or credentials |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate email, etc. |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded (throttler) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
