# Frontend Auth Guide

How authentication, session management, and impersonation work in the Edge frontend.

## Auth store

**File:** `edge-fe/src/features/auth/store/authStore.ts`

| State | Type | Persisted |
|-------|------|-----------|
| `user` | `User \| null` | Yes (localStorage) |
| `token` | `string \| null` | Yes (access token) |
| `refreshToken` | `string \| null` | Yes |
| `isAuthenticated` | `boolean` | Derived on rehydrate |
| `impersonationActive` | `boolean` | No (derived from `sessionStorage` backup on init) |

| Action | Purpose |
|--------|---------|
| `setAuth(user, accessToken, refreshToken)` | After login/register/impersonation |
| `setTokens(accessToken, refreshToken)` | After token refresh |
| `setImpersonationActive(active)` | Toggle impersonation UI state |
| `logout()` | Clear session + impersonation backup |
| `updateUser(partial)` | After profile update |

Storage key: `auth-storage` in localStorage.

Impersonation backup (`sessionStorage`, key `impersonation-backup`) stores super-admin user, tokens, and org state before switching to a target user.

## Route protection

**`ProtectedLayout`** — redirects unauthenticated users to `/login`.

**`AuthSessionGate`** (in `AppLayout`) — validates session via `useCurrentUser` (`GET /auth/me`).

**`OrganizationGate`** — redirects to `/create-organization` when user has no organizations.

**`SuperAdminGate`** — blocks `/super-admin` unless `user.isSuperAdmin && !impersonationActive`.

## Axios integration

**`lib/axios.ts`:**

- Base URL: `VITE_API_URL` or `/api/v1`
- Request: `Authorization: Bearer <token>`, `Accept-Language`, `X-Organization-Id` (when active org set)
- Response: unwraps `{ success, data }` envelope
- On 401: attempts `POST /auth/refresh` with stored refresh token; on failure, logout + redirect to `/login`
- `resetAuthRefreshState()` — clears in-flight refresh queue (used on impersonate start/exit)

## Auth flows

### Login

1. `LoginForm` validates with `createLoginSchema(t)`
2. `authApi.login({ email, password })` → `{ user, tokens }`
3. `setAuth(user, tokens.accessToken, tokens.refreshToken)`
4. Navigate to `/dashboard` (or org onboarding if no orgs)

### Register

1. `RegisterForm` — name, email, phone (libphonenumber-js), company?, password
2. Optional `?invite=token` prefills email and passes `inviteToken` in register body
3. `authApi.register(...)` → `{ user, tokens }`
4. `setAuth` + navigate

### Forgot / Reset password

- Forgot: `POST /auth/forgot-password` with `{ email }` — always show success toast
- Reset: reads `?token=` from URL, `POST /auth/reset-password`

### Google login

1. `GoogleLoginButton` redirects to `GET {VITE_API_URL}/auth/google`
2. Backend handles OAuth, redirects to `/auth/google/callback?accessToken=...&refreshToken=...`
3. Callback page stores tokens, fetches user, redirects to dashboard

### Session refresh

- Axios interceptor refreshes on 401 using `refreshToken` from `authStore`
- Impersonation refresh tokens preserve `impersonatorId` claim
- Super-admin refresh tokens rotate hash in DB on each refresh

### Impersonation (super-admin)

1. **Switch to user** — confirmation modal → `POST /admin/users/:id/impersonate`
2. Saves super-admin session to `sessionStorage` backup
3. Replaces auth state with target user tokens; resets org store; syncs orgs
4. `ImpersonationBanner` shown app-wide
5. **Exit impersonation** — confirmation modal → `POST /auth/exit-impersonation`
6. Restores super-admin tokens; clears backup; invalidates queries
7. `useEnsureSuperAdminSession` on `/super-admin` auto-fixes stale impersonation tokens

### Change password

Lives in settings (`ChangePasswordSheet`), calls `settingsApi.changePassword`.

### Update profile

`UserDetailsSection` splits name into first/last, combines to `name` before `PATCH /settings/profile`.

## Integration checklist

- [x] Axios envelope unwrapping
- [x] `Accept-Language` header
- [x] `/auth/google/callback` page
- [x] `useCurrentUser` via `AuthSessionGate`
- [x] Refresh token stored + automatic refresh on 401
- [x] API error messages surfaced in auth/settings toasts
- [x] Org context header (`X-Organization-Id`)
- [x] Member invite flows (`/register?invite=`, `/accept-invite`)
- [x] Super-admin impersonation with exit-impersonation API
- [x] Confirmation modals for switch/exit impersonation
