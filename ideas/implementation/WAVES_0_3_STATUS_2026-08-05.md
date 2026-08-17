# Waves 0–3 — integrated status, release decision and next agent tickets

**Date:** 5 August 2026  
**Decision:** OpsBoard can proceed to controlled internal/provider smoke tests. Secure Power BI remains non-public and must not be sold as production-ready.

## Integrated outcome

- `opsboard`: manual, Google Sheets and Microsoft Excel modes; shift, dispatch,
  KPI, safety and custom presets; connector, embed and catalog copy are wired.
- Sellable demo pack: datasets, field mappings, 60-second scripts, offline test
  checklist and pilot measurements are in `ideas/demo/pilot/`.
- `powerbi-secure`: Microsoft workspace/report/page pickers, async export state,
  private R2 references, authorized CMS/player hydration, pending/stale/LKG UI and
  offline-aware player prefetch are wired.
- Private cleanup hooks exist for config change, reconnect, disconnect, instance
  deletion and bulk uninstall. These are deterministic direct-path protections,
  not a complete distributed cleanup guarantee.
- OAuth start/callback now verifies organization, instance and app-slug ownership
  before state minting or token exchange; repository reconnect is scoped by
  immutable organization+instance ownership.
- Power BI downloads enforce a streaming byte cap, unsafe returned export ids are
  rejected before persistence, parse/storage failures preserve the last good
  payload, and reconnect cannot retain a previous account's refresh token/expiry.

## Verification recorded on this tree

- Backend: **34 suites, 397 tests passed**; production build passed.
- Player: **25 files, 234 tests passed**; type-check and production build passed.
- Apps package: library and all embeds, including `opsboard` and
  `powerbi-secure`, built successfully.
- CMS: type-check and production build passed.
- Player contract build passed after adding async `pending` metadata to the
  shared snapshot contract.

These automated checks do not replace real OAuth, browser, screen or bucket
tests.

## Go/no-go by offer

### OpsBoard — conditional go for the sales demo

Before outreach on 17 August:

1. create the catalog entry;
2. add a supported beta entitlement path for one internal/demo organization —
   today non-public apps cannot be granted/instantiated through the product API;
3. verify one real Google Sheet and one real Excel workbook;
4. pair a physical player and run the offline/reconnect checklist;
5. record update latency and photograph/video the working board;
6. use only claims proven by those checks.

### Secure Power BI — no-go for public availability

Code-level blockers:

1. draft preview and stale pruning can leave private R2 objects;
2. teardown can race an in-flight export/upload and allow a late write;
3. best-effort deletion has no durable retry queue/tombstone;
4. multiple backend replicas and previews have no distributed lease/fencing;
5. a renewed signed URL may not reach a player when logical content revision is
   unchanged;
6. CMS receives only `pending/stale`, not a safe operator-facing error code and
   remediation message.

External verification blockers:

1. real delegated Microsoft consent and token audience;
2. Premium/Embedded/Fabric capacity-backed one-page and multi-page PNG export;
3. tenant export settings, throttling, unsupported visuals and sensitivity labels;
4. private R2 CORS, expiry, offline cache and teardown on a physical player.

The fixed OAuth cross-tenant finding was critical; its regression tests pass.
The remaining high-risk cleanup/fencing and real-tenant gates are why the app
must stay non-public.

## Next parallel implementation wave

Run no more than three agents beside the coordinator and keep shared registry,
module and contract edits with the coordinator.

### SEC-02 — durable private-asset lifecycle

**Primary paths:** new queue/tombstone/lease files under
`apps/be/src/modules/apps/` and private-storage helpers/tests under
`apps/be/src/modules/media/storage/`.

1. define a persisted cleanup job containing owner identity and exact immutable
   refs/prefix, without tokens or signed URLs;
2. fence refresh/export/upload by `cacheKey` across backend replicas;
3. on config/delete/disconnect, tombstone first, stop/expire the lease, then
   delete assets and cache, and finally remove owner state;
4. make stale pruning enqueue private cleanup before deleting cache rows;
5. retry deletions idempotently with bounded backoff and dead-letter visibility;
6. add an owner-prefix sweeper and private-bucket lifecycle policy as a safety net;
7. test preview-only assets, partial upload, process interruption, late writer,
   retry and two-replica contention.

Acceptance: no successful post-tombstone cache/object write; every orphan path is
retryable and observable; deleting an owner never silently loses the cleanup key.

### SEC-03 — signed-URL renewal delivery

**Primary paths:** private hydration/storage, player content/gateway/controller,
player socket/prefetch and matching focused tests.

1. preserve the stable logical asset/version identity used by offline cache;
2. introduce a bounded renewal fingerprint or explicit credential-expiry signal;
3. have reconnect, REST `since` polling and connected heartbeat request a renewed
   snapshot before the signature expires;
4. keep the same versioned cache key so renewal does not re-download cached bytes;
5. test expiry while online, reconnect after expiry, cache hit after expiry and
   cache miss recovery.

Acceptance: an online/reconnecting player can always obtain usable credentials,
while content revision semantics and offline cache identity remain stable.

### INT-03 — beta entitlement and operator diagnostics

**Primary paths:** apps admin/service/repository, app-instance authorization,
preview response contract/CMS state and tests.

1. add a super-admin-only grant/revoke action for a non-public app and a named
   organization;
2. include installed non-public apps in that organization's catalog and allow
   instance creation only for entitled organizations;
3. keep the normal organization install endpoint public-app-only;
4. expose a fixed allowlist of safe connector error codes/messages to the CMS,
   never upstream bodies or credentials;
5. show consent, permission, capacity, throttling and generic retry guidance;
6. add cross-org/controller tests proving authorization occurs before signing or
   provider work.

Acceptance: OpsBoard can be enabled for exactly one demo/design-partner org
without making it public, and operators can diagnose a failed Power BI setup
without log access or secret exposure.
