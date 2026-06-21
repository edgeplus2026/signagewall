# Development Guide

> Backend-focused guide. For frontend conventions see `FRONTEND_DEVELOPMENT_GUIDE.md`.

## Workflow

1. Read `.cursor/rules/` before starting backend work
2. Check `API_CONTRACT.md` for frontend alignment
3. Implement feature module (schema → repository → service → controller → DTOs)
4. Add i18n keys in both `en` and `sr`
5. Update `API_CONTRACT.md` when endpoints ship
6. Test against frontend locally

## Code style

- **TypeScript strict mode** — no `any` unless unavoidable
- **Async/await** — no floating promises
- **DTOs at the boundary** — never accept raw `Request` body in services
- **Mappers** — never return Mongoose documents directly from controllers
- **Immutability** — prefer `readonly` on injected dependencies

## Security checklist

- [x] Passwords hashed with bcrypt (cost factor 10)
- [x] JWT secrets ≥ 32 characters, different for access/refresh
- [x] Refresh tokens stored hashed in DB
- [x] Password reset tokens hashed + expiry enforced
- [x] `select: false` on sensitive schema fields
- [x] Rate limiting — global `ThrottlerGuard` + `@AuthThrottle()` on login, register, reset, refresh, invite preview (`429 TOO_MANY_REQUESTS`)
- [x] Email normalization at DTO boundary (`@NormalizeEmail()`)
- [x] CORS restricted to `FRONTEND_URL`
- [x] Helmet enabled (in `main.ts`)
- [x] No user enumeration on forgot-password (always return success message)
- [x] Super-admin guard blocks admin routes during impersonation
- [x] Declarative org authz — `OrgMembershipGuard` + `@RequireOrgRole()` (no manual membership checks on guarded routes)

## Testing strategy

| Layer | Tool | Focus |
|-------|------|-------|
| Unit | Jest | Services, mappers, token logic |
| E2E | Supertest | HTTP contracts, auth flows |
| Manual | Frontend | Full user journeys |

E2E tests require MongoDB **as a replica set** (Atlas or local single-node replica set) when exercising transactional flows. Use a separate `edge-test` database.

## Git conventions

- Branch: `feature/<name>` or `fix/<name>`
- Commits: imperative mood, focused scope
- Do not commit `.env` files

## Multi-tenancy

Organizations scope resources (`media`, `playlists`, `screens`, `members`).

**Implemented:**
- `organizations` + `organizationmemberships` collections
- Org CRUD at `/api/v1/organizations` (admin writes use `:id` param via `OrgMembershipGuard` `idParam`)
- Members at `/api/v1/members` (requires `X-Organization-Id`)
- Frontend org switcher + onboarding (`/create-organization`)
- `X-Organization-Id` request header (set by `edge-fe/src/lib/axios.ts`)
- Declarative authorization: `@UseGuards(OrgMembershipGuard)` + `@RequireOrgRole({ roles?, idParam? })` + `@CurrentMembership()`

**Next domain modules must:**
- Add `organizationId` to tenant-scoped schemas
- Apply `OrgMembershipGuard` on the controller and `@RequireOrgRole(...)` per handler
- Read org id via `@RequiredOrganizationId()` or `@CurrentMembership()` — do not call `assertMembership`/`assertAdmin` in services for guarded routes
- Wrap multi-document writes in `TransactionService.run()` when creating/deleting related records

## Feature implementation order

1. ✅ **Foundation** — boilerplate, standards, mail, Google OAuth infra
2. ✅ **Auth** — login, register, forgot/reset/change password, me, refresh, logout
3. ✅ **Settings** — profile, preferences, feedback, account deletion
4. ✅ **Organizations** — CRUD, membership, org context header
5. ✅ **Members** — invite, roles, list, invitation accept/decline
6. ✅ **Super Admin** — global user list, promote/demote, impersonation
7. **Media** — folders, files, upload
8. **Playlists** — CRUD, item ordering
9. **Screens** — CRUD, pairing codes, status
10. **Dashboard** — stats API or client aggregation

## Email templates

Templates live in `edge-be/src/modules/mail/templates/`. Use `base.layout.ts` for consistent branding.

When adding a new email:
1. Create `*.template.ts` using `renderEmailLayout()`
2. Add send method to `MailService`
3. Call from the relevant service (never from controllers)

When `MAIL_ENABLED=false`, `MailService` logs the payload instead of sending.

## Common pitfalls

- **Forgetting `@Public()`** — route returns 401 for unauthenticated users
- **Returning `_id`** — always map to `id` string
- **Missing i18n key in `sr`** — keep locales in sync
- **Google routes without env** — routes are not registered; frontend gets 404
- **Super-admin role** — set in MongoDB; no env-based bootstrap
- **Impersonation tokens** — include `impersonatorId`; block `/admin/*` until exit
- **Standalone Mongo locally** — `TransactionService.run()` throws without a replica set; use Atlas or enable a local replica set
- **Bare `@HttpCode(204)`** — bypasses the `{ success, data }` envelope; return `null` from the handler instead
