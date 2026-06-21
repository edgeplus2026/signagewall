# Frontend Development Guide

## Workflow

1. Read `.claude/rules/` for conventions before editing `edge-fe/`
2. Confirm backend contract in `API_CONTRACT.md` (paths are under `/api/v1`)
3. Add types in `features/<name>/types/`
4. Add Zod schema factory in `features/<name>/schemas/`
5. Add API functions in `features/<name>/api/`
6. Wrap with React Query hooks in `features/<name>/hooks/`
7. Build UI in `components/` and `pages/`
8. Add i18n keys to **both** `en` and `sr` translation files
9. Register route in `router/index.tsx` if new page

## Code style

- TypeScript strict mode — no `any`
- Single quotes, no semicolons (match existing Prettier config)
- Named exports for components and hooks
- Colocate feature code — do not import across features except through shared slices (`content/`) or `components/`

## Feature checklist (new domain)

- [ ] `types/*.types.ts` — entities + request/response interfaces
- [ ] `schemas/*Schemas.ts` — Zod factories with `t()` messages
- [ ] `api/*Api.ts` — data access layer
- [ ] `hooks/use*.ts` — React Query hooks
- [ ] `pages/*Page.tsx` — route entry
- [ ] `components/` — feature UI
- [ ] i18n keys in `en` + `sr`
- [ ] Sidebar nav entry in `AppSidebarNav.tsx` (if applicable)
- [ ] Lazy import in `router/index.tsx`

## Forms

Every user input flow uses:

1. Zod schema factory accepting `TFunction`
2. `react-hook-form` + `zodResolver`
3. shadcn `Field` components for labels and errors
4. Mutation hook for submit; toast on success/error

See `features/auth/components/LoginForm.tsx` as the reference implementation.

## State ownership

| Concern | Tool |
|---------|------|
| Server data (API responses) | React Query |
| Auth session | Zustand `authStore` (persisted; includes refresh token) |
| Impersonation backup | `sessionStorage` via `features/auth/lib/impersonation.ts` |
| Active organization | Zustand `organizationStore` (persisted) |
| Mock domain data | Zustand feature stores (screens, playlists, media) |
| Super-admin users list | React Query + `adminApi` (server-side pagination/search/sort) |
| UI preferences (theme) | `ThemeProvider` + settings API |
| Form state | react-hook-form (local) |

Do not put server data in Zustand once the real API is wired — use React Query as the source of truth.

## Backend integration

- Set `VITE_API_URL=http://localhost:3000/api/v1` in `edge-fe/.env`
- Axios (`lib/axios.ts`) unwraps `{ success, data }`, sends `Accept-Language` and `X-Organization-Id`, refreshes on 401
- Real APIs: auth, settings, organizations, members, invitations, super-admin — see `state-and-api.mdc` and `FRONTEND_BACKEND_INTEGRATION.md`
- Mock APIs (store + delay): screens, playlists, media — keep function signatures when migrating to axios
- **OpenAPI types:** after backend API changes, run `cd edge-be && npm run openapi:export` then `npm run generate:api-types`. Generated types: `src/lib/api/schema.d.ts`; helpers: `@/lib/api/types`.

## Testing strategy

| Layer | Tool | Focus |
|-------|------|-------|
| Unit | Vitest | Schemas, lib helpers, store logic |
| Component | Testing Library | Forms, critical flows |
| E2E | Playwright | Auth, org onboarding, members, super-admin |
| Manual | Local stack | Invite flows (`MAIL_ENABLED=false` logs links) |

No automated test setup in CI yet — manual verification against `edge-be` + `edge-fe` dev servers.

## Git conventions

- Branch: `feature/<name>` or `fix/<name>`
- Do not commit `.env.local` with secrets
- Keep `dist/` out of commits (build output)

## Performance

- All pages are lazy-loaded — keep page bundles focused
- React Query `staleTime` prevents unnecessary refetches
- Large lists: use `DataTable` — client-side for small mock tables; `serverSide` prop + `keepPreviousData` for paginated API lists (see super-admin users)
- DnD: `@dnd-kit` patterns in `features/content/` and `features/playlists/`

## Common pitfalls

- **Forgetting `sr` translations** — always update both locale files
- **Schema without `useMemo([t])`** — validation messages won't update on language switch
- **Calling store directly from components** — go through hooks/api layer
- **Hardcoded strings** — use `t()` for all user-visible text
- **Unmounting tables on refetch** — use `placeholderData: keepPreviousData` in React Query so search inputs keep focus
- **Client-side sort/search with pagination** — delegate to the API when the list is paginated server-side
- **Wrong API base URL** — `VITE_API_URL` must include `/api/v1`, not bare `/api`
- **Refresh races during impersonation** — call `resetAuthRefreshState()` before impersonate start/exit
