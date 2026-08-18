# Post-merge checklist (agent/secure-powerbi-opsboard-zero-to-one)

Operational steps that cannot ship in code. Do them in this order after the PR
merges. Code-side work stays in [TODO.md](TODO.md).

## 1. Deploy order (required)

- [ ] **Deploy the CMS (Vercel) before the backend (Railway) — mandatory.** The
      Google login flow changed: the backend now redirects with a one-time
      `code` instead of tokens in the URL. The old CMS callback page cannot
      redeem a code, and the new one accepts *only* a code (the legacy
      token-in-URL branch was removed — it was unreachable from any backend
      path and doubled as a session-fixation vector). Wrong order = broken
      Google login until the CMS deploy lands.
- [ ] **Every signed-in CMS session re-authenticates once after the backend
      deploy.** Refresh-token hashes moved from bcrypt (whose 72-byte input
      truncation made every one of a user's refresh tokens match every other —
      rotation revoked nothing) to SHA-256. Stored bcrypt hashes fail closed,
      so the first refresh after the deploy returns 401 and the CMS routes the
      user to login. One-time, self-healing, and the reason the change exists.
- [ ] **Google logins in flight across the backend deploy fail once.** The
      callback now verifies a CSRF `state` against an HttpOnly cookie minted
      when the flow started, so a user sitting on Google's account chooser
      during the restart lands back on `/login` with the normal error and just
      signs in again. Expected, self-healing — not a broken deploy.
- [ ] Player and marketing site have no ordering constraints, with one skew
      caveat from the BE-4 recovery change: after the backend deploys, an
      **old** player build that lost its device token (the rare storage-wipe
      case) will idle instead of showing a pairing code until it picks up the
      new bundle (nightly reload / OTA). A paired player that still holds its
      token is unaffected. If a screen is stuck in that window, unpair and
      re-pair it from the CMS.

## 2. Backend environment (Railway)

- [ ] Confirm proxy hops: `TRUST_PROXY_HOPS` defaults to `1` in production —
      correct for Railway's single proxy. Only set it explicitly if the
      topology differs (e.g. Cloudflare in front → `2`).
- [ ] Optionally tune the new lockout knobs:
      `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` (default 5),
      `AUTH_LOGIN_LOCKOUT_MINUTES` (default 15).
- [ ] Screen-offline alerts: `SCREEN_OFFLINE_ALERT_MINUTES` (default 10; 0
      disables) — requires `MAIL_ENABLED=true`. Every active+verified org
      member is emailed once per outage; verify the first real alert lands and
      reads well before the pilot.
      The first sweep runs 60s after boot. `offlineAlertedAt` is a new field,
      so nothing is stamped yet — the sweep is bounded by
      `SCREEN_OFFLINE_ALERT_LOOKBACK_HOURS` (default 24) and
      `SCREEN_OFFLINE_ALERT_MAX_PER_SWEEP` (default 200) so it cannot alert on
      the whole historical backlog. If the fleet has many screens dark for
      under 24h, deploy with `SCREEN_OFFLINE_ALERT_MINUTES=0`, confirm the
      device list is what you expect, then set the real value.
- [ ] **Private R2 (required before any Secure Power BI use):**
      `PRIVATE_R2_ACCOUNT_ID`, `PRIVATE_R2_ACCESS_KEY_ID`,
      `PRIVATE_R2_SECRET_ACCESS_KEY`, `PRIVATE_R2_BUCKET`, and optionally
      `PRIVATE_R2_SIGNED_URL_TTL_SECONDS` (default 900). Unset, the service
      only logs "Private R2 storage is not configured" at boot and every
      snapshot operation then throws at runtime. Two hard requirements: the
      bucket must **not** equal `R2_BUCKET` (enforced at boot), and it must
      have no `r2.dev` or custom public domain attached.
- [ ] After deploy, verify throttling sees real client IPs: two logins from
      different networks must not share a throttle bucket (check logs or lower
      `THROTTLE_AUTH_LIMIT` on a staging env to test).

## 3. Marketing site / SEO (Vercel)

- [ ] Verify `NEXT_PUBLIC_SITE_URL=https://www.signagewall.com` **exactly**
      (www, https, no trailing slash) on the production project. Anything else
      serves `noindex` + `Disallow: /` sitewide.
- [ ] Verify the new apex→www redirect: `curl -I https://signagewall.com/pricing`
      must return 308 → `https://www.signagewall.com/pricing`. If the apex
      doesn't reach the Next app at all, add the domain alias in Vercel first.
- [x] **SEO-2 (strict content gates) — resolved in code; no ops step remains.**
      The gate now defaults *closed* (`apps/web/src/lib/payload.ts`) and is
      relaxed only by an explicit `SEO_STRICT_CONTENT_GATES=false`. Nothing has
      to be set in Vercel, and no future environment can publish unreviewed
      content simply by omitting a variable — which is precisely how production
      served it, since the variable was never set there.
      The backfill turned out to be a no-op: all 52 seeded locale versions
      already carry an editor-owned intent, so `seo:backfill` skipped every one
      of them. No database write was needed, and therefore no backup.
      Verified two independent ways before the default changed:
      `pnpm --filter @signagewall/web seo:gates` reports 0 of 114 published
      locale versions losing a public URL, and a local sitemap rendered under
      the strict gate is URL-for-URL identical to the live one (146 each).
      Re-run `seo:gates` after any bulk content import. One trap: two dev runs
      sharing a warm `.next` cache make that sitemap comparison lie — clear the
      cache between them, or it reports drops that are not real.
- [ ] After the redirect is live, check Google Search Console: submit the
      sitemap under the www property, confirm no coverage drop.

## 4. Player fleet

- [ ] Web/PWA players pick up the socket + ErrorBoundary fixes on their next
      daily reload (03:00 default) — no action needed, but confirm the daily
      reload is not disabled on browser/webOS units (they have no other update
      path; see PL-5 in TODO.md).
- [ ] Native shells: cut a new desktop (`player-desktop-v*`) and Android
      (`player-v*`) release tag when convenient; changes are web-layer only,
      so this is not urgent.

## 5. Rollout verification (same day)

- [ ] Google login end-to-end: fresh login lands on `/dashboard`, no
      `accessToken` visible in the URL bar or browser history.
- [ ] Wrong-password lockout: 5 bad passwords → 429 with the localized
      "temporarily locked" message; correct password after 15 min works.
- [ ] Screen create at the licence cap: create screens up to the limit, next
      create shows the upgrade modal (403 `PLAN_LIMIT_REACHED`), no orphan
      screen row appears.
- [ ] Kill the API briefly on staging: CMS lists must show the error state
      with a retry button, not "No screens yet".
- [ ] Recovery flow end-to-end: "Open web player" on a paired screen must open
      a tab that slides into the screen (URL shows `?device=…&recovery=…`, the
      recovery param disappears after pairing); opening the same URL a second
      time in a private window must NOT be admitted — it should reset to a
      pairing code within a few seconds.
      **Test this on an offline/spare screen, not a live one.** Redeeming a
      recovery grant rotates the device token, so it takes the identity over:
      the previous holder is now revoked immediately (it used to fail silently
      at its next reconnect). The CMS asks for confirmation when the screen is
      online — that prompt is the intended behaviour, not a bug.

## 6. OpsBoard demo enablement (new capability in this PR)

- [ ] **Create the catalog entries first.** `syncManifestDefinitions` does not
      auto-add new manifests (`if (!existing) continue;` — super-admin curates
      what enters the catalog), so `GET /admin/apps` returns nothing for the
      two new apps until you create them. As super-admin:
      `POST /api/v1/admin/apps` with
      `{ "slug": "opsboard", "name": "OpsBoard", "isPublic": false }`, and the
      same for `"powerbi-secure"`. Slug is validated against `APP_MANIFESTS`;
      icon/colour/schema come from code, only name and visibility from the
      request. Keep both non-public.
- [ ] Grant OpsBoard to the internal/demo organization:
      `POST /api/v1/admin/apps/<opsBoardAppId>/grants` with
      `{ "organizationId": "<demoOrgId>" }` as a super-admin (app ids via
      `GET /admin/apps`). The app then appears in that org's catalog and can
      be instantiated; it stays invisible to every other org.
- [ ] Run the OpsBoard go-checklist from TODO.md against that org (real
      Sheet + Excel tenant, physical player, offline/reconnect, latency).

## 7. Larger items intentionally NOT in this PR (tracked in TODO.md)

- PL-5: health-gated/canary promotion for the web player bundle (infra).
- Gate C external verification for Secure Power BI (real tenant, capacity
  export, private R2 CORS on a physical player) — keep the app non-public.
- OpsBoard demo go-checklist (real Sheet/Excel tenant, physical player
  offline/reconnect run, latency recording) — required before the sales
  outreach, cannot be verified in CI.
