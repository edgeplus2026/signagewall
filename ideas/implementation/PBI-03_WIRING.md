# PBI-03 — secure Power BI export connector wiring

Status: connector and shared registry/storage wiring complete. Direct teardown paths are covered, but race-safe cleanup/orphan GC, signed-URL renewal delivery and a real Microsoft tenant/capacity test remain release blockers.

## Delivered

- `powerbi-secure.connector.ts` implements a scheduler-friendly state machine:
  - first tick starts `ExportTo` and persists only job metadata in `secrets`;
  - later ticks poll the persisted opaque job id, so restart recovery is automatic;
  - success downloads immediately from the fixed export-file endpoint, parses a bounded PNG/ZIP export, stores pages in private R2 and returns `PrivateAssetRef[]`;
  - pending, failure and timeout paths never replace the last-known-good player payload;
  - failed pending results include only a sanitized `error`, allowing the host to retain secrets/LKG while marking the cache stale;
  - unchanged exported bytes reuse the same stable asset refs and version;
  - replaced and partially uploaded objects receive best-effort cleanup; a durable retry path is not yet implemented.
- `powerbi-secure/powerbi-export-api.ts` contains the token-isolated REST calls and sanitized error classification.
- `powerbi-secure/png-export.ts` rejects path traversal, encryption, ZIP64/multi-disk archives, duplicate names, unsupported compression, CRC/size mismatches, non-PNG files, more than 50 pages, pages over 25 MiB, downloads over 100 MiB, and total expanded pages over 150 MiB.
- `cleanupPowerBiSecureState` is the deterministic deletion hook for app-instance/connection teardown.

The connector accepts only `ResolvedConnection.organizationId`, `appInstanceId` and `id` as the private object owner. App config labels or ids can never choose the storage owner. Connector payload/state/log metadata contains no OAuth token, refresh token or signed asset URL.

## Coordinator wiring — completed

1. `connector-registry.ts` imports `powerbiSecureConnector` and registers it under `powerbi-secure`.
2. Nest DI is bridged once during `AppsModule` initialization:

   ```ts
   import { PrivateR2StorageService } from '../media/storage/private-r2-storage.service';
   import { registerPowerBiPrivateStorage } from './connectors/powerbi-secure/storage.registry';

   export class AppsModule {
     constructor(private readonly privateStorage: PrivateR2StorageService) {
       registerPowerBiPrivateStorage(privateStorage);
     }
   }
   ```

   `AppsModule` already imports `MediaModule`, and `MediaModule` already exports `PrivateR2StorageService`.
3. Disconnect, instance deletion and bulk uninstall resolve token-free ownership from the persisted connection, call `cleanupPowerBiSecureState(owner, cache.secrets)`, then delete the cache and connection. This covers deterministic direct lifecycle calls, but an in-flight export can still race teardown and stale pruning does not yet remove R2 objects.
4. The catalog app remains non-public until the real-tenant gate below passes.

## Automated verification

- Final integrated backend verification: 34 suites, 397 tests pass.
- Backend, CMS, player and embed production builds pass.
- Scoped backend/CMS/player lint passes.
- Repository-wide type-check reaches only the pre-existing
  `packages/apps/vite.embeds.config.ts` `node:module/createRequire` baseline
  error; the apps production build itself passes.

## Official Microsoft semantics used

- Start: `POST /groups/{groupId}/reports/{reportId}/ExportTo`, body format `PNG`, optionally with `powerBIReportConfiguration.pages[].pageName`.
- Poll: `GET /groups/{groupId}/reports/{reportId}/exports/{exportId}`.
- Download: `GET /groups/{groupId}/reports/{reportId}/exports/{exportId}/file` before the export expires.
- The export id is an opaque string (Microsoft examples include characters such as `=`), so it is length/control/path validated and then URL-encoded; it is not treated as a UUID.
- Workspace/report identifiers remain UUID-validated.
- Delegated scopes are the read-only Power BI scopes already frozen by PBI-01: `Workspace.Read.All`, `Report.Read.All`, and `Dataset.Read.All` under the Power BI resource.

Official references:

- [Export To File In Group](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/export-to-file-in-group)
- [Get Export To File Status In Group](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-export-to-file-status-in-group)
- [Get File Of Export To File In Group](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-file-of-export-to-file-in-group)
- [Export Power BI report to file](https://learn.microsoft.com/en-us/power-bi/developer/embedded/export-to)

## Still unverified — release blockers

No real tenant or capacity credentials are available in the workspace. PBI-04 must verify all of these before sales claims or public catalog availability:

- delegated consent and token audience with the exact configured scopes;
- a Premium, Embedded or Fabric capacity-backed workspace; PPU is not supported for this API;
- one-page and multi-page PNG response shapes produced by the tenant;
- tenant export settings, unsupported visuals, sensitivity labels and permissions;
- throttling/retry behavior and actual export duration for the pilot report;
- signed-URL hydration/expiry/offline cache on a real player;
- instance/connection teardown cleanup against the real private bucket.

Before PBI-04, code-level Gate C also requires a durable cleanup queue/tombstone,
distributed lease/fencing around export/upload, stale-prune R2 cleanup, a storage
lifecycle/sweeper safety net, and a delivery mechanism that renews signed URLs on
the player even when the report's logical revision did not change.

The implementation deliberately does not claim arbitrary RLS/effective identity support. It exports the view available to the connected delegated user; RLS remains a separate acceptance gate.
