# SignageWall — Audit Fix List (2026-08-06)

Source: full architecture / backend security / player+CMS reliability / SEO audit.
Ordered by (sales leverage × severity) ÷ effort.

Checked items were implemented on 2026-08-06/07 (verified: be 431 tests, player 250 tests, all four apps type-check).
Deploy-time and ops-only steps (env vars, deploy order, SEO backfill, rollout
verification) live in [POST_MERGE.md](POST_MERGE.md).

## P0 — Fix before selling (security / revenue / trust)

- [x] **BE-1: Rate limiting broken behind proxy + no account lockout** — set `trust proxy` in `apps/be/src/main.ts`, key throttling on forwarded client IP, add per-account failed-login backoff (`auth.service.ts`).
- [x] **BE-2: Google OAuth tokens leak via redirect URL** — replace `accessToken`/`refreshToken` query params in `google-auth.controller.ts` with a one-time exchange code the CMS redeems via POST.
- [x] **BE-3: Screen-limit enforcement fails open + TOCTOU race** — make `PlansService.assertCanCreateScreen` fail closed and enforce the limit atomically at insert time (`plans.service.ts`, `screens.service.ts`).
- [x] **PL-1: Player socket emits buffer unbounded offline** — make heartbeat / now-playing emits `volatile` or `connected`-guarded (`apps/player/src/sync/socket.ts`).
- [x] **CMS-1: API outages render as empty states ("No screens yet")** — add `isError` branches / global query-error surface to screens, playlists, media, dashboard lists.
- [x] **PL-2: ErrorBoundary reload loop has no backoff** — add persisted crash counter + exponential backoff (`apps/player/src/ui/ErrorBoundary.tsx`).

## P1 — Hardening (this month)

- [x] **BE-4: deviceId acts as a bearer recovery credential** — paired devices are now admitted only with their token (proof of possession) or a single-use, 10-min, hashed recovery code minted by `POST /screens/:id/device/recovery-link`; bare deviceId gets `recovery:required` and the player resets to a fresh identity + pairing flow. CMS "Open web player" mints the grant per click.
- [x] **BE-5a: Unguarded-controller sweep** — metadata-reflection spec (`guard-coverage.spec.ts`) fails on any controller route that is neither authorization-guarded, `@Public`, nor allowlisted with a reason.
- [ ] **BE-5b: Tenancy e2e pack** — real-app tests: cross-org read must 403/404, auth + billing lifecycle, pairing/revoke.
- [x] **PL-3: No test coverage for `sync/socket.ts`** — 13 tests: pairing/revoke lifecycle, volatile heartbeat/now-playing, server-disconnect backoff, cleanup.
- [ ] **BE-6: Uploads buffer fully in memory** — stream multer→R2; raise the 10 MB CMS cap for video (`media.constants.ts`).
- [x] **BE-7a: Request tracing** — `X-Request-Id` middleware (honors proxy ids), id + user + status in every HTTP log line, id in 5xx logs and JSON error bodies.
- [ ] **BE-7b: Surface "video not offline-cacheable" via player heartbeat** (player + backend + CMS display).
- [x] **PL-4: Small delay/backoff on `io server disconnect` reconnect path** (`socket.ts`).
- [ ] **PL-5: Web-bundle deploys have no health gate/rollback** (native shells are covered) — add canary or health-gated promotion for the PWA bundle.
- [x] **CMS-2: Dirty-draft navigation guard** (router blocker + beforeunload in `useContentContainer`) + conflict toasts now describe the real keep-draft behavior.
- [x] **CMS-3: Reject queued 401 requests explicitly when refresh fails** (`axios.ts`).

## P2 — Features that help sales

- [x] **FT-1: Screen-offline email alert** — minute sweep emails active+verified org members once per outage episode (`SCREEN_OFFLINE_ALERT_MINUTES`, default 10, 0 disables); grouped per org so a site outage is one email; re-arms when the device reports back online.
- [x] **FT-2: Fleet health dashboard** — problem-first panel on the dashboard (offline displays longest-down first with "offline for X", then unpaired, then healthy; platform + app version per row), live via the existing presence socket. Cache/offline-video status per screen remains with BE-7b.
- [x] **FT-3a: Beta entitlement path (INT-03 items 1–3)** — super-admin `POST/GET/DELETE /admin/apps/:id/grants`; granted non-public apps appear in that org's catalog and are instantiable; the normal install endpoint stays public-only; revoke runs the full uninstall cascade.
- [x] **FT-3b: Operator diagnostics (INT-03 items 4–5)** — fixed `ConnectorErrorCode` allowlist end-to-end (contract → cache → preview meta → CMS banner with en/sr remediation); typed `ConnectorError` lets connectors name consent/capacity precisely; raw provider errors never leave the backend. Per-connector fine-mapping (e.g. PBI capacity detection) can be added by throwing `ConnectorError` where providers are called.
- [ ] **FT-4: Proof-of-play reporting** — persist `now-playing` events, per-screen playback report.
- [x] **FT-5: Viewer role** — new read-only `viewer` org role, enforced centrally in `OrgMembershipGuard` (non-GET on any membership-only route → 403, admin routes unchanged), invitable/assignable from the members UI; moving the last admin to any lesser role stays blocked. CMS-side hiding of edit affordances for viewers is cosmetic follow-up (server enforces).
- [ ] **FT-6: Stripe/Paddle self-serve checkout** — gate on Menu Starter funnel signal; unblocks SEO→signup→pay motion.
- [ ] **FT-7: Template gallery** (menu boards, ops boards) — activation + SEO asset.

## P3 — SEO technical (this week; gates all organic traffic)

- [x] **SEO-1: Apex→www 308 redirect** — indexing hard-requires `https://www.signagewall.com`; apex currently serves `Disallow: /` + `noindex` and no redirect exists. Add to `next.config.ts` + verify prod `NEXT_PUBLIC_SITE_URL`.
- [ ] **SEO-2: Enable strict content gates** — ops steps, see [POST_MERGE.md](POST_MERGE.md) §3 (unreviewed CMS content is indexable today).
- [x] **SEO-3: /solutions meta description advertises retired verticals** (healthcare, gyms) — fix `en` + `sr` message files; extend content audit to cover i18n metas.
- [x] **SEO-4: `lastmod` for static sitemap routes (per-deploy build time); `revalidate` on `/apps/[slug]`.**
- [ ] **SEO-5: Per-route OG images** for /pricing, /features, /solutions/*.

## P4 — SEO content (the growth lever, in intent order)

- [ ] **CNT-1: Competitor/alternative pages** — "Yodeck alternative", "ScreenCloud vs OptiSigns", "best digital signage software 2026" (new route/collection; plumbing exists).
- [x] **CNT-2: "Free digital signage software" page** — `/free-digital-signage-software` (sr `/besplatan-digital-signage`), honest no-forever-free positioning in the hardware-page voice, FAQ + JSON-LD, sitemap + footer link, en+sr. Also fixed the banned QR-pairing claim on /download and added the missing opsboard/powerbi-secure catalog copy (content audit now green).
- [ ] **CNT-3: Per-platform player pages** — Android box, Fire TV Stick, Raspberry Pi, Samsung/LG TV, Windows.
- [ ] **CNT-4: Re-launch retired verticals** — healthcare, gyms, salons, events, transport, banking (11 currently 404 without redirect).
- [ ] **CNT-5: Bottom-funnel how-tos** — "show Power BI on a TV", "menu board from Google Sheets"; templates gallery content.
- [ ] **CNT-6: 2–3 real case studies from the August pilot** (photos, measured edit→screen latency, quote).

## Gate C — Secure Power BI (keep non-public until done)

- [ ] **SEC-02: durable private-asset cleanup** — persisted queue/tombstone/lease, replica fencing, idempotent retries, orphan sweeper.
- [ ] **SEC-03: signed-URL renewal delivery** — renewal fingerprint/expiry signal; reconnect/poll/heartbeat request renewed snapshot before signature expiry without cache re-download.
- [ ] **Real-tenant verification** — delegated consent, capacity-backed export, tenant export settings/throttling/sensitivity labels, private R2 CORS + offline cache on a physical player.

## OpsBoard demo go-checklist (before outreach)

- [ ] Catalog entry created; beta entitlement for one internal/demo org (FT-3).
- [ ] One real Google Sheet + one real Excel workbook verified end-to-end.
- [ ] Physical player paired; offline/reconnect checklist run.
- [ ] Update latency recorded; working board photographed/filmed.
