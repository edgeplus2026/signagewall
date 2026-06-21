# Auth & Platform Roadmap

Status of auth, org, members, and super-admin work. Use `API_CONTRACT.md` for endpoint details.

## Completed

### Auth module (`modules/auth/`)

- [x] Login, register, forgot/reset password
- [x] JWT access + refresh tokens (refresh hash in DB)
- [x] `GET /auth/me`, `POST /auth/logout`
- [x] `POST /auth/refresh` with rotation
- [x] Google OAuth (when env configured)
- [x] Register with `inviteToken` for org onboarding
- [x] `POST /auth/exit-impersonation` for super-admin session restore

### Settings module (`modules/settings/`)

- [x] Profile update, change/set password
- [x] Language + theme preferences
- [x] Account deletion
- [x] Feedback + report problem (email to `MAIL_SUPPORT_TO`)

### Organizations (`modules/organizations/`)

- [x] CRUD + membership (`admin` | `member`; legacy `owner` → `admin`)
- [x] `X-Organization-Id` header + `@RequiredOrganizationId()`
- [x] Declarative org authz: `OrgMembershipGuard` + `@RequireOrgRole()` + `@CurrentMembership()`
- [x] Org create + delete cascade run in transactions

### Members (`modules/members/`)

- [x] List, invite, update, remove (org admin only)
- [x] Invitation preview (`GET /invitations/:token`)
- [x] Accept / decline for existing users
- [x] Pending invite → register flow for new users (user create + accept in one transaction)
- [x] Invite link logged when `MAIL_ENABLED=false`

### Super Admin (`modules/admin/`)

- [x] `SuperAdminGuard` (global `user.role === 'super-admin'`)
- [x] Paginated user list with search + sort
- [x] User detail, promote/demote super-admin
- [x] Impersonation JWT with `impersonatorId`
- [x] Block admin routes while impersonating

### Frontend

- [x] Axios envelope + refresh interceptor
- [x] Auth store with refresh token persistence
- [x] Protected layout + org onboarding gate
- [x] Members table wired to `/members`
- [x] Super-admin page with pagination, search, sort
- [x] Impersonation banner + confirmation modals

## Super-admin setup

Role is set manually in MongoDB (no env-based email list):

```js
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "super-admin" } }
)
```

User must log out and back in for `isSuperAdmin: true` in the JWT/session.

### Platform hardening

- [x] API versioning — URI `/api/v1` (`defaultVersion: '1'`; health is `VERSION_NEUTRAL`)
- [x] `@nestjs/throttler` — global limit + `@AuthThrottle()` on login/register/reset/refresh/invite-preview (`429 TOO_MANY_REQUESTS`)
- [x] Transactions — `TransactionService` for org create, org/account delete cascades, invite accept, register-with-invite
- [x] Email normalization at DTO boundary (`@NormalizeEmail()`)
- [x] Shared pagination (`PaginationQueryDto`, `PaginatedResult<T>`)

## Remaining / follow-up

### Security hardening

- [ ] Audit log for super-admin actions (promote, impersonate) — persistent `AuditLog` collection
- [ ] Resolve `members` vs `users` naming + the legacy `OWNER` role (keep as real role or remove)
- [x] OpenAPI (`@nestjs/swagger`) + frontend type codegen (`openapi-typescript`)
- [ ] Automated tests (no test suite exists yet)

### Domain features (not started)

- [ ] Media — folders, upload
- [ ] Playlists — CRUD, item ordering
- [ ] Screens — CRUD, pairing codes, status
- [ ] Dashboard stats API

## Token strategy

| Token | Expiry | Storage |
|-------|--------|---------|
| Access | 15m (configurable) | Frontend localStorage + memory |
| Refresh | 7d (configurable) | Frontend localStorage + hashed in DB |

Impersonation tokens are stateless for the target user (do not update target's refresh hash). Super-admin backup tokens remain in `sessionStorage` during impersonation.

## Password reset email URL

```
{FRONTEND_URL}/reset-password?token={rawToken}
```

## Invitation email URLs

```
{FRONTEND_URL}/register?invite={token}       # new user
{FRONTEND_URL}/accept-invite?invite={token}  # existing user
```
