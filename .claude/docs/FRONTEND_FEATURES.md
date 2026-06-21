# Frontend Features Reference

Catalog of MVP features, routes, and backend integration status. API paths in the tables below are relative to `/api/v1` (axios base URL includes the version prefix).

## Routes

| Path | Page | Sidebar | API status |
|------|------|---------|------------|
| `/login` | LoginPage | — | Real (`authApi`) |
| `/register` | RegisterPage | — | Real (`authApi`, supports `?invite=`) |
| `/accept-invite` | AcceptInvitePage | — | Real (`invitations` API) |
| `/forgot-password` | ForgotPasswordPage | — | Real (`authApi`) |
| `/reset-password` | ResetPasswordPage | — | Real (`authApi`) |
| `/auth/google/callback` | GoogleCallbackPage | — | Real (OAuth redirect) |
| `/create-organization` | CreateOrganizationPage | — | Real (`organizationApi`) |
| `/dashboard` | DashboardPage | Yes | Mock (aggregates stores) |
| `/screens` | ScreensPage | Yes | Mock (`screensApi` → store) |
| `/screens/:screenId` | ScreenPage | — | Mock |
| `/playlists` | PlaylistsPage | Yes | Mock (`playlistsApi` → store) |
| `/playlists/:playlistId` | PlaylistPage | — | Mock |
| `/media` | MediaPage | Yes | Mock (`mediaApi` → store) |
| `/settings` | SettingsPage | Yes | Real (`settingsApi`) |
| `/faq` | FaqPage | Yes | Static i18n content |
| `/users` | UsersPage | Yes | Real (`usersApi` → `/members`) |
| `/super-admin` | SuperAdminPage | Yes (super-admins only) | Real (`adminApi`) |

Organizations: onboarding at `/create-organization` when user has no orgs; managed via sidebar `OrganizationSwitcher` and form sheet. Org switcher hidden for `member` role.

## Feature details

### Auth (`features/auth/`)

| Flow | Schema | API endpoint |
|------|--------|--------------|
| Login | `createLoginSchema` | `POST /auth/login` |
| Register | `createRegisterSchema` | `POST /auth/register` |
| Forgot password | `createForgotPasswordSchema` | `POST /auth/forgot-password` |
| Reset password | `createResetPasswordSchema` | `POST /auth/reset-password` |
| Google login | — | `GET /auth/google` (redirect) |
| Get me | — | `GET /auth/me` |
| Exit impersonation | — | `POST /auth/exit-impersonation` |

**User type:**

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

**Session:** `authStore` persists `user`, `token`, `refreshToken`. Automatic refresh on 401 via axios interceptor. Impersonation backup stored in `sessionStorage`.

### Settings (`features/settings/`)

| Section | API |
|---------|-----|
| Profile (name, phone, company) | `PATCH /settings/profile` |
| Change / set password | `POST /settings/change-password` / `set-password` |
| Preferences (language, theme) | `GET/PATCH /settings` |
| Delete account | `DELETE /settings` |
| Feedback | `POST /settings/feedback` |
| Report problem | `POST /settings/report-problem` |

Profile form splits `name` into `firstName` + `lastName` in UI, combines before API call.

### Users / Members (`features/users/`)

Org-scoped team table at `/users`. Admin-only invite, edit, delete.

```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  status: 'approved' | 'pending'
  createdAt: string
}
```

**Note:** This `User` is a **member** record, not the auth `User`. API base: `/members`.

Invite flow pages: `/register?invite=token`, `/accept-invite?invite=token`.

### Super Admin (`features/super-admin/`)

Global user management at `/super-admin`. Gated by `SuperAdminGate` (`isSuperAdmin && !impersonationActive`).

| UI | Behavior |
|----|----------|
| All Users tab | Paginated table (20/page), server-side search & sort |
| User sheet | Detail view with copyable fields |
| Promote / demote | Confirmation modal; cannot act on own row (`Me` badge) |
| Switch to user | Confirmation modal → impersonation |
| Impersonation banner | Shown app-wide; exit requires confirmation modal |

Hooks: `useAdminUsers`, `useImpersonateUser`, `useEnsureSuperAdminSession` (auto-restores super-admin tokens after impersonation).

### Organizations (`features/organizations/`)

```typescript
interface Organization {
  id: string
  name: string
  role: 'admin' | 'member'
}
```

API: `organizationApi` (axios). Active org persisted in `organizationStore`; axios sends `X-Organization-Id` header.

### Screens (`features/screens/`)

```typescript
interface Screen {
  id: string
  name: string
  status: 'online' | 'offline'
  location?: string
  description?: string
  volume: number
  items: ScreenItem[]
  pairingCode: string
  createdAt: string
  updatedAt: string
  lastSeenAt?: string
}
```

Tabs: Content (shared editor), Settings, Connect (pairing code). **Mock only.**

### Playlists (`features/playlists/`)

```typescript
interface Playlist {
  id: string
  name: string
  description?: string
  items: PlaylistItem[]
  createdAt: string
  updatedAt: string
}
```

Shares content editor components from `features/content/`. **Mock only.**

### Media (`features/media/`)

```typescript
interface MediaItem {
  id: string
  name: string
  type: 'folder' | 'image' | 'video'
  parentId: string | null
  size?: number
  mimeType?: string
  thumbnailUrl?: string
  fileUrl?: string
  source: 'local' | 'google_drive'
}
```

Folder tree navigation with breadcrumb. **Mock only.**

### FAQ (`features/faq/`)

Static FAQ content loaded from i18n (`faq.categories.*`). Categories: general, content, organizations, users, account, support.

## Shared content editor (`features/content/`)

Cross-cutting slice used by screens and playlists:

- `ContentEditor` — drag-and-drop item ordering
- `ContentLibraryPanel` — media/playlist picker
- `contentDraft` lib — unsaved changes tracking
- `@dnd-kit` for reordering

No pages or API — consumed as child components.

## Dashboard (`features/dashboard/`)

Aggregates stats from mock stores (screen count, playlist count, media count). Will need a dedicated API or client-side aggregation from real endpoints.
