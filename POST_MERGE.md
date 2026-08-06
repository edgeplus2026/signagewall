# Post-merge checklist (agent/secure-powerbi-opsboard-zero-to-one)

Operational steps that cannot ship in code. Do them in this order after the PR
merges. Code-side work stays in [TODO.md](TODO.md).

## 1. Deploy order (required)

- [ ] **Deploy the CMS (Vercel) before the backend (Railway).** The Google
      login flow changed: the backend now redirects with a one-time `code`
      instead of tokens in the URL. The new CMS callback page handles both
      shapes; the old one cannot redeem a code. Wrong order = broken Google
      login until the CMS deploy lands.
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
- [ ] **SEO-2 (strict content gates):**
      1. `pnpm --filter @signagewall/web seo:backfill` (dry run, review),
      2. take a DB backup,
      3. `pnpm --filter @signagewall/web seo:backfill:apply`,
      4. set `SEO_STRICT_CONTENT_GATES=true` in production,
      5. re-run `pnpm --filter @signagewall/web content:audit` and resolve warnings.
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

## 6. Larger items intentionally NOT in this PR (tracked in TODO.md)

- PL-5: health-gated/canary promotion for the web player bundle (infra).
- Gate C external verification for Secure Power BI (real tenant, capacity
  export, private R2 CORS on a physical player) — keep the app non-public.
- OpsBoard demo go-checklist (real Sheet/Excel tenant, physical player
  offline/reconnect run, latency recording) — required before the sales
  outreach, cannot be verified in CI.
