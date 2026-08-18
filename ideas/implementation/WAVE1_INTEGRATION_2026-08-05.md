> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../README.md).

# Wave 1 integration — 2026-08-05

Status: code-integrated; real-provider smoke tests still required.

## Delivered

- `opsboard` is exported, categorized and registered with its backend connector.
- OpsBoard has manual, Google Sheets and Excel modes plus shift, dispatch, KPI,
  safety and custom presets.
- English and Serbian catalog copy is present. The manifest is available to the
  super-admin catalog flow but is not automatically created or made public.
- A separate `privateR2.*` service supports tenant/instance/connection/version
  scoped objects, signed GET URLs and replacement cleanup. It never falls back
  to the public media bucket and refuses the same bucket name.
- Private refs are hydrated only after player assignment and organization checks.
  Snapshot logical revision is calculated before signing. Delivery of a renewed
  signature when that logical revision is unchanged is still a release blocker,
  recorded in `WAVES_0_3_STATUS_2026-08-05.md`.
- The player recursively warms every hydrated private app asset. Its dedicated
  Workbox cache ignores the rotating signature query and uses the immutable
  versioned object path. Device revoke/cache purge includes the private cache.
- CORE-01 is documented in
  `ideas/architecture/ADR-CORE-01-SITES-SCREEN-TARGETING.md`; production screen
  schemas were intentionally not changed in this spike.

## Verification

- `pnpm test`: pass (root Turbo test graph).
- Backend: the later integrated status is 34 suites and 397 tests; see
  `WAVES_0_3_STATUS_2026-08-05.md` for the final verification pass.
- Player: 25 files, 234 tests pass.
- Player contract: 32 tests pass.
- OpsBoard focused connector tests: 21 pass.
- Power BI/AppData/connection/private-cleanup focused verification passes; the
  later audit added OAuth ownership and export-id/reconnect regressions.
- `pnpm --filter @signagewall/apps build`: pass, including the OpsBoard embed.
- `pnpm --dir apps/be build`: pass.
- `pnpm --dir apps/player build`: pass both with private cache disabled and with
  a representative HTTPS private R2 origin/path configured.
- `pnpm --dir apps/cms type-check && pnpm --dir apps/cms build`: pass.
- Focused backend/player ESLint: pass.
- Translation JSON parse and format checks: pass.

`pnpm type-check` still stops only at the recorded baseline errors in
`packages/apps/vite.embeds.config.ts` (`node:module` / `createRequire`). The
apps package production build succeeds, and backend/player/CMS checks above are
green.

## Required runtime configuration

Backend:

```text
PRIVATE_R2_ACCOUNT_ID
PRIVATE_R2_ACCESS_KEY_ID
PRIVATE_R2_SECRET_ACCESS_KEY
PRIVATE_R2_BUCKET
PRIVATE_R2_SIGNED_URL_TTL_SECONDS
```

Player build:

```text
VITE_PRIVATE_ASSET_ORIGIN
VITE_PRIVATE_ASSET_PATH_PREFIX
```

The private bucket must have no public domain and must allow CORS GET from the
player origin so proactive offline warming receives a readable response.

## Manual gates not satisfied locally

- Owned CMS preview wiring is complete: connected previews require an owned
  app-instance id, verify the persisted instance + connection relationship and
  recursively sign only refs owned by that relationship. There is no generic
  asset-signing endpoint. A real private-R2 browser smoke test remains pending.
- Real Google Sheets OAuth and live-sync smoke test.
- Real Microsoft Excel/Graph OAuth and webhook smoke test.
- Private R2 upload, expiry, renewal, CORS and offline playback test.
- Power BI capacity-backed workspace/export verification.
- Super-admin creation of the OpsBoard catalog entry as non-public. The current
  API cannot grant a non-public app to one demo organization or create its
  instance, so a beta-entitlement path is required before that internal rollout.
- Power BI orphan cleanup/fencing and unchanged-revision URL renewal described in
  `WAVES_0_3_STATUS_2026-08-05.md`.

Do not make OpsBoard public or advertise secure Power BI until these relevant
manual gates are recorded. The existing Microsoft PowerPoint connector reads a
private source but currently mirrors rendered slides through the public media
storage path; it is not evidence of end-to-end confidential delivery.
