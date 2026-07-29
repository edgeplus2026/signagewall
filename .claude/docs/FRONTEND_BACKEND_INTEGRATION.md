# Frontend ↔ Backend Integration Guide

Status of mock vs real API integration and migration patterns for remaining features.

All backend paths are under `/api/v1` (see `API_CONTRACT.md`). Set
`VITE_API_URL=http://localhost:3000/api/v1` in `apps/cms/.env`.

## Current state

| Feature | Frontend API | Backend | Status |
|---------|-------------|---------|--------|
| Auth | `authApi` | `modules/auth` | ✅ Wired |
| Settings | `settingsApi` | `modules/settings` | ✅ Wired |
| Organizations | `organizationApi` | `modules/organizations` | ✅ Wired |
| Users / Members | `usersApi` → `/members` | `modules/members` | ✅ Wired |
| Invitations | `invitationsApi` | `modules/members` | ✅ Wired |
| Super Admin | `adminApi` | `modules/admin` | ✅ Wired |
| FAQ | i18n only | — | ✅ Static |
| Screens | `screensApi` (store) | Not started | Mock |
| Playlists | `playlistsApi` (store) | Not started | Mock |
| Media | `mediaApi` (store) | Not started | Mock |
| Dashboard | store aggregation | Not started | Mock |

## Phase 1 — Auth + Settings ✅

- Axios envelope unwrapping, refresh on 401, `Accept-Language` header
- Google OAuth callback page
- `AuthSessionGate` + `useCurrentUser` bootstrap
- Settings profile, password, preferences, feedback

## Phase 2 — Organizations ✅

- `organizationApi` — list, create, update, delete
- `OrganizationGate` — `/create-organization` onboarding
- `organizationStore` — active org + `X-Organization-Id` header

## Phase 3 — Members + Invitations ✅

### Frontend

- `usersApi` calls `/members` (list, invite, update, delete)
- `/users` page — admin-only actions, Approved/Pending badges
- `/register?invite=token` — new user invite flow
- `/accept-invite?invite=token` — existing user invite flow

### Backend

- `GET/POST/PATCH/DELETE /members` (requires `X-Organization-Id`)
- `GET /invitations/:token` (public preview)
- `POST /invitations/:token/accept|decline`
- Invite emails via Resend when `MAIL_ENABLED=true`; console log when false

## Phase 4 — Super Admin ✅

### Frontend

- `/super-admin` route with `SuperAdminGate`
- Paginated users table (20/page), server-side search & sort
- Promote/demote super-admin with confirmation modals
- Impersonation with switch/exit confirmation modals
- `ImpersonationBanner`, `useEnsureSuperAdminSession`

### Backend

- `GET /admin/users` with pagination, search, sort
- `GET /admin/users/:id`, impersonate, promote, demote
- `POST /auth/exit-impersonation`
- `SuperAdminGuard` blocks admin actions during impersonation

## Phase 5 — Domain features (mock → real)

For each feature, migrate `api/*.ts` from store to axios. **Hooks should not change.**

### Migration pattern

```typescript
// Before (mock)
export const screensApi = {
  getAll: async (): Promise<Screen[]> => {
    await delay(300)
    return useScreensStore.getState().getAll()
  },
}

// After (real)
export const screensApi = {
  getAll: async (): Promise<Screen[]> => {
    const { data } = await api.get<Screen[]>(`${SCREENS_BASE}`)
    return data
  },
}
```

### Per-feature checklist

- [ ] Replace store calls with axios in `api/*.ts`
- [ ] Remove or gut Zustand store (keep only if needed for optimistic UI)
- [ ] Verify React Query keys still invalidate correctly
- [ ] Test CRUD flows end-to-end
- [ ] Remove `delay()` helper
- [ ] Update `FRONTEND_FEATURES.md` status column
- [ ] Add endpoints to `API_CONTRACT.md`

### Suggested backend order

1. ~~Organizations + membership~~ ✅
2. ~~Members + invitations~~ ✅
3. ~~Super admin~~ ✅
4. Media (folders, upload)
5. Playlists (items, ordering)
6. Screens (pairing, content assignment)
7. Dashboard stats (aggregate or dedicated endpoint)

## API response contract

All endpoints use the envelope defined in `API_CONTRACT.md`:

```json
{ "success": true, "data": { } }
```

Frontend axios interceptor unwraps `data` so `const { data } = await api.get<T>()` continues to work.

## Type alignment

Keep frontend types in `features/*/types/` as the source of truth for request/response shapes. Backend DTOs should match these interfaces.

When backend adds fields, update frontend types first, then backend schema.

## i18n alignment

| Layer | Languages | Detection |
|-------|-----------|-------------|
| Frontend | `en`, `sr` | localStorage + browser |
| Backend | `en`, `sr` | `Accept-Language` / `x-lang` header |

## Testing integration locally

```bash
# Terminal 1 — backend (MongoDB replica set / Atlas required)
cd apps/be && npm run start:dev

# Terminal 2 — frontend
cd apps/cms && npm run dev
```

Verify:
- Login/register flows
- Org onboarding + switcher
- Member invite (check backend console for link when `MAIL_ENABLED=false`)
- Super-admin list, search, sort, promote, impersonate, exit
- Protected routes redirect when logged out
- 401 clears session and redirects
- Settings profile update reflects in UI
