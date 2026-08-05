# SignageWall Ops — product and multi-agent implementation plan

**Version:** 1.0  
**Date:** 5 August 2026  
**Status:** Waves 0–3 code-integrated; provider/device smoke tests and PBI-04 remain; code remains the source of truth  
**Primary objective:** make one operational-screen offer understandable in under 60 seconds, deployable for a paid pilot, and extensible into a secure enterprise product

**Prodajni plan od 17. avgusta:** [`ZERO_TO_ONE_SALES_SPRINT_2026-08-17.md`](ZERO_TO_ONE_SALES_SPRINT_2026-08-17.md)

### Implementation snapshot — 5 August 2026

| Workstream | State |
| --- | --- |
| OpsBoard (`OPS-01`) | implemented and integrated; real Sheets/Excel smoke tests pending |
| Private delivery (`SEC-01`) | implemented across backend, authorized CMS/player hydration and offline cache; real R2/CORS test pending |
| Sellable demo (`DEMO-01`) | shift, dispatch and safety fixtures, 60-second scripts and pilot metrics delivered |
| Power BI API/pickers (`PBI-01`, `INT-02`) | implemented with generic cascading pickers; real tenant consent/listing pending |
| Power BI manifest/embed (`PBI-02`) | implemented with pending/stale/LKG and offline slideshow behavior |
| Power BI export (`PBI-03`) | implemented and registered; direct teardown paths are covered, but distributed fencing/orphan GC remain Gate C blockers |
| Power BI verification (`PBI-04`) | blocked by unavailable real tenant/capacity credentials; app stays non-public |

---

## 1. How to use this document

This is both a product plan and an execution plan for several coding agents working in the same repository.

The order is deliberate:

1. ship the smallest sellable operational board first;
2. package existing Microsoft integrations into a clear frontline-communications offer;
3. add safety and dispatch presets on the same data engine;
4. build private asset delivery before calling any rendered dashboard "secure";
5. add private Power BI as a separate connected app;
6. add multi-site governance only when a pilot or signed design partner requires it.

Do not implement every section before sales outreach. The first release gate is a paid pilot, not feature completeness.

When multiple agents run in one shared workspace:

- each agent must only edit the paths assigned to its ticket;
- feature agents must not edit shared registry, translation, lockfile, or module-wiring files unless their ticket explicitly grants ownership;
- agents must not run repository-wide formatting;
- agents must not commit while other agents are editing the same workspace;
- the coordinator/integration agent owns shared-file edits, final verification, and commits;
- an agent that discovers a required cross-ticket change should document it and message the coordinator instead of expanding its scope.

The app catalog already has an `isPublic` governance flag. New apps must remain non-public until their release gate passes. This is the release mechanism; a second feature-flag system is not required for the first implementation.

---

## 2. Product decision

### 2.1. Category

Do not lead with "digital signage software" or the number of apps.

Lead with:

> SignageWall Ops turns the Excel, Google Sheets, Teams, PowerPoint, Outlook and Power BI workflows a company already uses into reliable shared operational screens.

The same technical platform produces several narrowly named offers. A prospect sees only the offer relevant to their role.

| Offer                        | Ten-second promise                                                                         | Economic buyer               | Initial implementation                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Live Shift Board**         | Change one row in Excel; the whole shift sees the new plan and status.                     | plant/operations manager     | new `opsboard` app                                                                                    |
| **Dock & Dispatch Board**    | Dispatch changes a truck or dock status; drivers and warehouse staff see it immediately.   | logistics/warehouse manager  | `opsboard` dispatch preset                                                                            |
| **Frontline Communications** | Publish in Teams or update PowerPoint; deskless workers see it on shared screens.          | HR/internal comms/operations | package existing `teams` + connected-source `powerpoint` apps; do not claim confidential delivery yet |
| **Digital Safety Board**     | HSE updates one source; every screen shows the current safety status and message.          | HSE/quality/plant manager    | `opsboard` safety preset, existing `alert`, later emergency takeover                                  |
| **Secure Power BI Screens**  | Private reports reach unattended screens without public links or a user account on the TV. | IT/BI/operations             | new `powerbi-secure` app plus private asset delivery                                                  |
| **Room & Visitor Board**     | Outlook changes; today's meetings, rooms or visitors update automatically.                 | facilities/office/hotel      | package existing `outlook` app; lower strategic priority                                              |

### 2.2. One engine, several presets

Shift, KPI, dock/dispatch and basic safety tables should not become four unrelated connectors. They share the same tabular ingestion and status rendering. Implement one `opsboard` app with presets:

- `shift`
- `dispatch`
- `kpi`
- `safety`
- `custom`

Presets choose sensible labels, columns, colours and default layout. They do not change the normalized payload contract.

Frontline Communications and Room/Visitor Board are packaging and onboarding workflows around apps that already exist. Do not build duplicate Teams, PowerPoint or Outlook connectors. The current PowerPoint connector reads a private Microsoft source but mirrors rendered slides through the public media R2 path; describe it as connected/private-source, not end-to-end private, until it migrates to `PrivateAssetRef` delivery.

### 2.3. Power BI remains two products

Keep the existing public `powerbi` app unchanged and accurately named. It accepts Microsoft "Publish to web" URLs and is network-only.

Add a separate `powerbi-secure` connected app. Do not silently change existing public instances or overload the existing slug with incompatible security and licensing behavior.

The secure app should be snapshot-first:

1. backend OAuth reads the workspaces/reports available to an authorized account;
2. the backend starts an asynchronous Power BI `exportToFile` job;
3. the connector polls until the job succeeds;
4. exported page images are normalized and stored privately;
5. the player receives time-limited asset URLs and caches the bytes;
6. the last-known-good snapshot remains on screen when Power BI or the internet is unavailable.

Interactive live embed is a later mode and must not block snapshot MVP. Live embed requires token renewal, constant connectivity, Power BI Embedded/Fabric capacity planning and a player-bound token endpoint. It does not provide the offline promise.

Microsoft prerequisites and limitations must be shown before connection:

- production embedded analytics requires a supported capacity;
- `exportToFile` requires a Premium, Embedded or Fabric-backed workspace and is not supported for PPU;
- the export API is asynchronous;
- some visuals and sensitivity-label combinations are not exportable;
- RLS and SSO require explicit identity handling and cannot be assumed.

Primary implementation references:

- [Embed for your customers](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-customer-app)
- [Generate an embed token](https://learn.microsoft.com/en-us/power-bi/developer/embedded/generate-embed-token)
- [Power BI embedded capacities](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embedded-capacity)
- [Export a Power BI report to file](https://learn.microsoft.com/en-us/power-bi/developer/embedded/export-to)
- [ExportToFile REST operation](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/export-to-file-in-group)
- [Get export status](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-export-to-file-status-in-group)
- [Workspace listing](https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups)
- [Report listing](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group)

### 2.4. Commercial boundary: Ops is not the SMB menu package

The 17–23 August sprint targets one paid factory/logistics Ops pilot. Its 750 EUR founding-pilot price and the post-pilot onboarding hypothesis from 900 EUR are appropriate only for a named operational workflow where SignageWall actually provides consulting, source mapping/integration, training or multi-zone coordination.

Bakeries, cafés and other small firms belong to a separate **Menu Starter** lane:

- one location and one to three screens;
- no setup fee for the standard package;
- an existing Menu Board template, structured input or a supported Sheet/Excel connection;
- the customer uses its own compatible display/player when agreed and receives a guide plus at most one short remote activation call;
- pricing to test, not publish as a final price list: 29 EUR/location/month for the first screen, 8 EUR/month for each additional screen up to three, or 290 EUR/year for the first screen/location;
- custom design, unstructured migration, field work, hardware and special integrations require a separate quote or partner delivery.

Menu Starter work must not delay Gate A or count toward the first paid Ops-pilot goal. Track its funnel separately: activated location, conversion to subscription, activation time and support minutes.

---

## 3. Current reusable foundations

The following already exists and should be reused instead of rebuilt:

| Foundation                        | Current source of truth                                             | Reuse                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Manifest-driven CMS and player    | `packages/apps-contract/src/manifest.ts`, `packages/apps/README.md` | new apps need a manifest, embed bundle and optional connector; no app-specific CMS form                       |
| Google Sheets/Excel source fields | `packages/apps/src/_shared/tabular-source.ts`                       | `opsboard` source picker, worksheet and column mapping                                                        |
| Tabular normalization             | `apps/be/src/modules/apps/connectors/_shared/tabular/`              | apply mapping and normalize displayed cell values                                                             |
| Google Sheets reader              | `apps/be/src/modules/connections/providers/google-api.ts`           | private Sheets via read-only OAuth                                                                            |
| Microsoft Excel reader            | `apps/be/src/modules/connections/providers/graph-api.ts`            | private OneDrive/SharePoint workbooks via read-only OAuth                                                     |
| Push plus polling                 | `menu.connector.ts`, Drive/Graph webhook services                   | near-live spreadsheet updates with polling fallback                                                           |
| Async connector state             | `ConnectorResult.pending`, cache `secrets` in `app-data.service.ts` | Power BI export job state machine                                                                             |
| Last-known-good app payload       | app data cache + player snapshot persistence                        | offline operational data                                                                                      |
| Connected PowerPoint rendering    | `powerpoint.connector.ts` and PPTX render service                   | rendering/slideshow pattern only; its current public-media delivery is not the private-storage security model |
| Teams channel feed                | `teams` manifest/connector                                          | frontline communications offer                                                                                |
| Outlook calendar                  | `outlook` manifest/connector                                        | room and visitor board offer                                                                                  |
| Offline alert visual              | `alert` manifest/embed                                              | safety content item; not yet emergency takeover                                                               |
| App visibility governance         | app `isPublic` field                                                | hide unfinished apps from organizations                                                                       |

Implemented in code but still requiring the named release gates before broad marketing:

- `opsboard` with manual, Google Sheets and Excel modes — real-provider and real-device smoke tests remain;
- `powerbi-secure` and tenant-private asset delivery — cleanup concurrency, URL renewal delivery and real tenant/private-R2 verification remain Gate C blockers.

Other known gaps that must not be marketed as shipped:

- no saved screen groups/site model;
- no per-item/shift schedule;
- no arbitrary multi-zone layout;
- no emergency takeover behavior;
- no proof-of-play;
- no granular per-site roles, approval workflow or rollback.

`apps/web/CONTENT-CLAIMS.md` remains binding until each capability has code, tests and a verified pilot.

---

## 4. Security decisions that cannot be skipped

### 4.1. Public R2 URLs are not private delivery

Current media and rendered document flows use `R2_PUBLIC_URL`. Object keys are difficult to guess, but the bytes are publicly reachable to anyone holding the URL. That is acceptable for current ordinary signage media; it is not sufficient for confidential Power BI exports.

Secure Power BI is blocked until private delivery exists.

Required design:

1. configure a separate non-public bucket or equivalent private object namespace;
2. cache only a typed private-asset reference in connector payloads, never a permanent public URL;
3. resolve that reference to a time-limited signed GET URL only when building an authorized CMS preview or player snapshot;
4. scope the object key to the owning connection/app instance and include a stable content version;
5. sign URLs for long enough that an online player can prefetch them, but never treat URL secrecy as authorization;
6. ensure signed query strings do not churn the content revision; the asset version, not the temporary URL, controls revision;
7. delete replaced exports and orphaned private objects;
8. never place OAuth tokens, client secrets, embed tokens or RLS identities in app config, connector payload, logs or player persistence.

Suggested shared contract:

```ts
export interface PrivateAssetRef {
  kind: "private-asset";
  key: string;
  version: string;
  mimeType: string;
}

export interface HydratedPrivateAssetRef extends PrivateAssetRef {
  /** Short-lived URL added only for an authorized preview/player snapshot. */
  url: string;
}
```

The connector cache may hold `PrivateAssetRef` because it contains no credential. `PlayerContentService` must hydrate it with a signed URL only for a screen actually assigned the app instance. The CMS preview endpoint must hydrate it only after organization/instance ownership checks. Keeping `kind`, `key` and `version` beside the temporary `url` lets the player prefetch private app assets and key its offline cache by the immutable versioned object path rather than by a rotating signature.

### 4.2. Power BI authentication stages

For the first real pilot, prefer delegated Microsoft OAuth because the repository already supports per-instance Microsoft access/refresh tokens. Add only the Power BI read scopes required by the chosen APIs. Validate the exact granted scopes against the official REST operation documentation; workspace listing requires `Workspace.Read.All`, report listing/export requires report/dataset read permissions.

Move to a service principal after the pilot proves demand. Production service-principal support needs a separate non-human connection model or a customer onboarding flow for the SignageWall enterprise application. Do not store a customer's client secret in ordinary app config fields.

### 4.3. RLS is a separate acceptance gate

MVP can export the view available to the connected delegated user. Do not advertise arbitrary RLS until tests cover effective identity, roles, dataset/workspace combinations and failure isolation. A report that renders successfully without RLS does not prove tenant-safe RLS behavior.

---

## 5. Target contracts

These are planning contracts. The implementing agent may refine names, but any incompatible change must be agreed before parallel work starts.

### 5.1. OpsBoard configuration

```ts
type OpsBoardPreset = "shift" | "dispatch" | "kpi" | "safety" | "custom";
type OpsBoardLayout = "status-table" | "cards" | "queue";
type OpsBoardStatus =
  | "neutral"
  | "planned"
  | "active"
  | "warning"
  | "blocked"
  | "done";

interface OpsBoardConfig {
  preset: OpsBoardPreset;
  heading?: string;
  source: "manual" | "gsheets" | "excel";
  connectionId?: string;
  spreadsheet?: { id: string; label: string };
  workbook?: { id: string; label: string };
  worksheet?: string;
  mapping?: Record<string, string>;
  rows?: Array<{
    label: string;
    primary?: string;
    secondary?: string;
    status?: string;
    note?: string;
    group?: string;
    sortOrder?: number;
  }>;
  layout: OpsBoardLayout;
  showHeader: boolean;
  pageSeconds: number;
  theme: "light" | "dark";
}
```

Use the existing `tabularSourceFields` helper. The first normalized mapping targets should be:

- `label` — line, vehicle, dock, KPI or safety item;
- `primary` — plan, appointment time or main value;
- `secondary` — actual, carrier or secondary value;
- `status` — normalized operational state;
- `note` — blocker, instruction or safety message;
- `group` — area, shift or zone;
- `sortOrder` — optional explicit ordering.

Do not add a free-form formula language in MVP.

### 5.2. OpsBoard payload

```ts
interface OpsBoardRow {
  label: string;
  primary?: string;
  secondary?: string;
  status: OpsBoardStatus;
  note?: string;
  group?: string;
}

interface OpsBoardPayload {
  sourceTitle?: string;
  rows: OpsBoardRow[];
  updatedAt?: string;
}
```

Normalize common localized status values case-insensitively. Unknown values must degrade to `neutral`, never make the connector fail. The exact accepted aliases belong in a tested utility.

### 5.3. Secure Power BI configuration

```ts
interface SecurePowerBiConfig {
  connectionId: string;
  workspace: { id: string; label: string };
  report: { id: string; label: string };
  page?: { id: string; label: string };
  refreshMinutes: number;
  slideDuration: number;
  fit: "contain" | "cover";
  background: string;
}
```

Snapshot MVP intentionally excludes arbitrary filters, bookmarks, RLS roles and live interactivity. Add them only as versioned follow-up fields after the base export is reliable.

### 5.4. Secure Power BI payload and private state

```ts
interface SecurePowerBiPayload {
  reportName: string;
  /** Connector cache: PrivateAssetRef; authorized preview/snapshot: hydrated ref. */
  pages: Array<PrivateAssetRef | HydratedPrivateAssetRef>;
  exportedAt: string;
  sourceVersion?: string;
}

interface SecurePowerBiConnectorState {
  exportJob?: {
    id: string;
    workspaceId: string;
    reportId: string;
    requestedAt: string;
  };
  rendered?: {
    keys: string[];
    version: string;
    reportName: string;
  };
}
```

The job state belongs in connector `secrets`; exported private-asset references belong in player-safe payload. On failed refresh, retain the previous payload and mark it stale through the existing cache behavior.

---

## 6. Release gates

### Gate A — sellable demo

Required before pitching Live Shift/Dock Board:

- `opsboard` renders manual and one connected source correctly;
- an operator can map columns without code changes;
- editing a source reaches a test screen through push or polling;
- unknown/blank rows do not crash the embed;
- long tables paginate and remain readable at 1080p portrait and landscape;
- last-known-good data remains visible offline;
- app is hidden by default and enabled only for the internal/demo organization.

### Gate B — paid operational pilot

Required before installing at a customer:

- Google Sheets and Microsoft Excel paths are both tested;
- read-only OAuth copy matches actual scopes;
- stale-data state is visible without replacing useful data;
- one dispatch, shift and safety fixture is part of tests/demo documentation;
- screen reconnect and server restart do not lose the last good payload;
- pilot runbook names who updates the source and what metric determines success.

### Gate C — secure Power BI pilot

Required before using the word "private" or "secure" in sales copy:

- private bucket/asset path has no public origin URL;
- unauthorized CMS user/player cannot obtain an asset URL;
- signed URLs expire and a renewed delivery reaches the device even when the logical report content is unchanged;
- no Power BI/OAuth token appears in snapshot, browser storage, logs or connector payload;
- workspace/report/page pickers are tenant-scoped;
- asynchronous export survives process restarts via persisted job state;
- previous successful report remains visible during failed/pending export;
- exported objects are deleted on replacement/instance deletion;
- licensing/capacity prerequisites are shown before connection;
- at least one real customer-owned report is tested with written permission.

### Gate D — enterprise rollout

Required before claiming multi-site operational control:

- site/location metadata and saved screen targeting;
- per-item or per-content schedule evaluated in the player's local timezone;
- emergency takeover with explicit activation, expiry and audit trail;
- screen health alerting and current-item visibility;
- granular site permissions and audit history if requested by the signed customer;
- proof-of-play only after event volume, retention and reporting are designed.

---

## 7. Multi-agent execution map

The current environment supports four concurrent slots including the coordinator. Run at most three implementation agents beside the coordinator. Waves below avoid the main file collisions.

### Shared hot files — integration agent only

Unless a ticket explicitly says otherwise, only the coordinator/integration agent edits:

- `packages/apps/src/index.ts`
- `apps/be/src/modules/apps/connectors/connector-registry.ts`
- `apps/be/src/modules/apps/apps.module.ts`
- `apps/be/src/modules/connections/connections.service.ts`
- `apps/be/src/modules/connections/schemas/app-connection.schema.ts`
- `apps/be/src/config/configuration.ts`
- `apps/player/src/sync/prefetch.ts`
- `apps/player/vite.config.ts`
- CMS translation JSON files
- root/package lockfiles
- `apps/web/CONTENT-CLAIMS.md`

Feature agents should export their implementation from local files and leave a short wiring note for the coordinator.

### Wave 0 — coordinator baseline and decisions

#### INT-00: freeze contracts and baseline

**Owner:** coordinator  
**Dependencies:** none  
**Edits:** documentation and, if required, shared contract types only

Steps:

1. Confirm the planning contracts in section 5.
2. Record current baseline results for backend tests, player tests, contracts, targeted builds and type-checks.
3. Record known unrelated failures separately; do not make feature agents "fix everything".
4. Confirm development OAuth credentials for Google/Microsoft.
5. Confirm whether a real Power BI capacity-backed test workspace is available.
6. Create representative fixtures for shift, dispatch and safety rows.
7. Keep new catalog entries non-public.

Exit criteria:

- agents receive frozen payload/config shapes;
- baseline commands and known failures are written in the task handoff;
- Power BI work is marked either `unblocked` or `blocked by test tenant/capacity`.

### Wave 1 — three parallel foundations

#### OPS-01: OpsBoard app end to end

**Owner:** app/connector agent  
**Dependencies:** INT-00 contracts  
**Exclusive paths:**

- `packages/apps/src/opsboard/**`
- `packages/apps/embeds/opsboard/**`
- `apps/be/src/modules/apps/connectors/opsboard.connector.ts`
- `apps/be/src/modules/apps/connectors/opsboard.connector.spec.ts`
- optional new status-normalization utility under `.../connectors/_shared/tabular/` with an `opsboard`-specific filename

Do not edit the shared registries.

Steps:

1. Add `OpsBoardPayload` and manifest with `tabularSourceFields`.
2. Implement manual, Google Sheets and Excel config paths.
3. Reuse `fetchSheetTable`, `fetchWorkbookTable`, `applyColumnMapping`, `hashMapping`, Drive watch and Graph webhook patterns.
4. Use a cache key containing source, connection, file, worksheet and mapping hash.
5. Normalize blank/unknown statuses safely.
6. Implement `status-table`, `cards` and `queue` render modes.
7. Add preset-specific labels/defaults without creating preset-specific payloads.
8. Show freshness/staleness using existing shared embed helpers.
9. Add unit tests for cache isolation, both providers, mapping, status aliases, empty rows and errors.
10. Add responsive embed fixtures for portrait and landscape.
11. Deliver a wiring note naming exports and connector registration.

Acceptance:

- manual mode performs no connector fetch;
- connected cache keys always include `connectionId`;
- Google and Microsoft connections never share cache entries;
- no OAuth token enters payload;
- 100 rows paginate without overflow;
- last valid payload renders when the next fetch is stale/failed.

#### SEC-01: tenant-private asset delivery

**Owner:** backend/player security agent  
**Dependencies:** INT-00 private-asset contract  
**Exclusive paths:**

- new files under `apps/be/src/modules/media/storage/private-*`
- new files under `apps/be/src/modules/player/` specifically named for private assets
- new files under `apps/player/src/sync/` specifically named for private app-asset collection/cache keys
- new shared type file under `packages/apps-contract/src/` agreed by INT-00
- tests matching those new files

Shared module/config/contract index wiring is left to INT-01.

Steps:

1. Introduce a separately configured private R2 bucket/client; do not reuse a bucket exposed by `R2_PUBLIC_URL`.
2. Implement upload, stream/download, delete and presigned GET URL operations.
3. Add a typed `PrivateAssetRef` guard and recursive/specific payload hydration utility.
4. Hydrate refs only while building an authorized player snapshot or owned CMS preview.
5. Sign URLs after logical revision calculation so signatures do not churn revisions.
6. Add a player utility that recursively collects hydrated private-asset URLs from app payloads so all report pages are proactively warmed, not only the first page shown by the embed.
7. Specify a dedicated Workbox route/cache for the private asset host. Cache identity must ignore the expiring signature query and use the immutable versioned object path; a new asset version must use a new path.
8. Add cleanup hooks/API for replaced and deleted asset sets.
9. Add structured logs containing object version/id but never the signed query string.
10. Test cross-organization denial, expired URL behavior, signing failure, prefetch, signature renewal without re-download and stable revision behavior.
11. Document required environment variables without printing secrets.
12. Deliver module/config/player-prefetch wiring notes to the coordinator.

Acceptance:

- there is no public URL for private objects;
- an app not assigned to a player cannot be used to mint its asset URLs;
- CMS preview enforces organization ownership;
- every page is proactively cached and remains usable offline after URL expiry;
- renewing a signature for the same versioned object does not download a duplicate;
- a new signed URL can be issued without changing the content revision.

#### CORE-01: site metadata and saved screen targeting design/spike

**Owner:** screen-domain agent  
**Dependencies:** INT-00  
**Exclusive paths:** new design/test files; do not modify screen schema/controller in the spike

This wave is a design and repository-impact spike, not a full implementation.

Steps:

1. Map every backend/CMS/player file touched by adding `siteId`, `area`, `line` and tags.
2. Decide whether MVP needs a `Site` collection or simple screen metadata. Prefer a first-class `Site` if billing, permissions or timezone will be site-scoped.
3. Define saved-group semantics: explicit membership vs dynamic tag query.
4. Define bulk content assignment using existing multi-screen assignment behavior.
5. Define per-screen variables without allowing arbitrary code interpolation.
6. Produce schema/API/UI test cases and a migration/backfill plan.
7. Do not change production schemas until the coordinator approves the ADR.

Acceptance:

- ADR covers tenancy indexes, deletion behavior, timezone, permissions and migration;
- it lists exact shared files that a later implementation agent must own exclusively;
- no product claim is changed by the spike.

### Wave 1 integration

#### INT-01: wire and verify Wave 1

**Owner:** coordinator/integration agent  
**Dependencies:** OPS-01, SEC-01, CORE-01

Steps:

1. Review each diff for scope leakage and secret exposure.
2. Add `opsboard` exports and manifest registry entry.
3. Add the connector registry entry.
4. Wire private storage module/config/contract exports.
5. Wire private app-asset collection into player prefetch and add the dedicated Workbox cache route without changing public-media behavior.
6. Sync the app catalog with `opsboard` non-public.
7. Run focused tests, builds and type-checks.
8. Perform a real Sheets and Excel smoke test.
9. Approve/reject CORE-01 ADR.
10. Commit only after all shared-file edits are complete.

### Wave 2 — product presets and Power BI API foundation

#### DEMO-01: sellable presets and demo runbook

**Owner:** product/demo agent  
**Dependencies:** integrated OpsBoard  
**Exclusive paths:** new files under `ideas/demo/` and fixture/test files assigned by coordinator

Steps:

1. Create three datasets: shift production, dock dispatch and safety board.
2. Define exactly which columns map to each OpsBoard target.
3. Create a 60-second demo script for each buyer.
4. Create an offline/reconnect demo checklist.
5. Document the existing Teams + private PowerPoint frontline workflow.
6. Document the existing Outlook room/visitor workflow.
7. Define pilot success metrics and data that must be captured manually.

Acceptance:

- a founder can demo any primary use case without opening the app catalog;
- every statement in the script is supported by current code;
- no customer outcome is claimed without measurement.

#### PBI-01: delegated Power BI API and remote pickers

**Owner:** Microsoft integration agent  
**Dependencies:** INT-00; real Power BI test tenant strongly recommended  
**Exclusive paths:**

- new `apps/be/src/modules/connections/providers/powerbi-api.ts`
- matching specs
- a written wiring patch/note for remote-source switch cases

Do not edit `connections.service.ts` concurrently; INT-02 owns wiring.

Steps:

1. Add typed API helpers for workspaces, reports and report pages.
2. Use `https://api.powerbi.com/v1.0/myorg` endpoints with bearer token and abort signal.
3. Return token-free `{id, title}` remote options.
4. Handle pagination where the API supports/returns continuation.
5. Filter or clearly label unsupported/non-capacity workspaces for snapshot mode.
6. Surface actionable 401, 403, 404, 429 and capacity errors without response-body/token logging.
7. Specify the minimal delegated scopes required for listing and export.
8. Add mocked tests for tenant isolation, empty results, malformed responses and throttling.
9. Write the exact `ConnectionsService` remote-source cases for the integrator.

Acceptance:

- no token is returned to CMS;
- a user only sees workspaces/reports granted by Microsoft;
- errors tell the operator whether the issue is consent, permission or capacity where determinable.

#### SAFE-01: Safety preset and emergency-takeover ADR

**Owner:** safety/product-core agent  
**Dependencies:** integrated OpsBoard  
**Exclusive paths:** OpsBoard preset tests/styles assigned by coordinator; new ADR under `ideas/architecture/`

Steps:

1. Add a safety preset using the normalized OpsBoard contract.
2. Support incident-free days as an existing `countdown` item in the pilot playlist; do not duplicate date arithmetic unless a customer requires a combined layout.
3. Create safety fixture covering PPE, current risk, next training and incident status.
4. Confirm the existing Alert app remains an ordinary full-screen rotation item.
5. Design emergency takeover as a separate core feature with target screens, priority, activation, expiry, audit record and local offline behavior.
6. Define fail-safe behavior for expired alerts and disconnected players.
7. Do not market emergency takeover until the later core ticket passes.

Acceptance:

- safety board can be sold without falsely claiming emergency override;
- ADR makes activation/expiry/audit behavior unambiguous.

### Wave 2 integration

#### INT-02: wire Power BI OAuth/pickers and validate pilot prerequisites

**Owner:** coordinator/integration agent  
**Dependencies:** PBI-01; SEC-01 integrated

Steps:

1. Add remote-source cases to `ConnectionsService`.
2. Confirm existing Microsoft OAuth can request Power BI scopes per `powerbi-secure` instance without widening scopes for unrelated apps.
3. Verify admin-consent copy and reconnect behavior when scopes change.
4. Run a real workspace/report/page listing test.
5. Record whether the test workspace is capacity-backed and export-compatible.
6. Block Wave 3 release if no real export-compatible workspace exists; mocks alone are not release evidence.

### Wave 3 — secure Power BI snapshot

#### PBI-02: Power BI secure manifest and embed

**Owner:** app-render agent  
**Dependencies:** frozen payload; private-asset contract  
**Exclusive paths:**

- `packages/apps/src/powerbi-secure/**`
- `packages/apps/embeds/powerbi-secure/**`
- matching embed tests/fixtures

Do not edit package registries.

Steps:

1. Add connected manifest with Microsoft OAuth, workspace/report/page remote selects and explicit capacity help.
2. Set defaults for refresh, slide duration, fit and background.
3. Render hydrated private page assets (`page.url`) as a slideshow/static page.
4. Show pending, stale and last-exported states without blanking last-known-good content.
5. Do not set `requiresNetwork: true` for snapshot mode; downloaded page images must remain offline-capable.
6. Add clear empty/error states that do not expose upstream response bodies.
7. Add responsive and lifecycle tests.
8. Deliver registry wiring note.

Acceptance:

- embed consumes hydrated URLs but payload types retain private refs;
- app never receives OAuth/Entra tokens;
- offline behavior matches PowerPoint-style cached slides.

#### PBI-03: asynchronous export connector

**Owner:** backend connector agent  
**Dependencies:** PBI-01 APIs, SEC-01 storage, PBI planning contract  
**Exclusive paths:**

- `apps/be/src/modules/apps/connectors/powerbi-secure.connector.ts`
- `apps/be/src/modules/apps/connectors/powerbi-secure/**`
- matching specs

Do not edit connector registry.

Steps:

1. Add `powerbi-secure` OAuth descriptor with only required Power BI delegated read scopes.
2. Build a cache key containing connection, workspace, report, page and export-affecting configuration.
3. On first fetch, submit `ExportToFile` and persist job metadata in `secrets`; return `pending` with no new payload.
4. On subsequent tick, poll export status.
5. On success, download the export file before Microsoft's download URL expires.
6. Safely parse PNG/ZIP or chosen output; reject path traversal, excessive page count and excessive size.
7. Convert/normalize pages to display assets when needed.
8. Upload to private storage and return `PrivateAssetRef[]` with stable version.
9. Preserve and re-persist rendered state when upstream content has not changed.
10. Best-effort delete replaced page objects; add deterministic orphan cleanup.
11. On 401/403/capacity/unsupported-visual errors, record an actionable error and leave old payload untouched.
12. Add tests for job start, pending, success, failure, restart recovery, rate limit, timeout, cleanup and no-token leakage.

Acceptance:

- pending jobs do not occupy a scheduler worker for the full export duration;
- process restart resumes from persisted job id;
- a failed refresh never replaces good pages with an empty payload;
- private objects cannot be fetched through `R2_PUBLIC_URL`;
- connector result and logs contain no access token or signed asset URL.

#### PBI-04: real-tenant security and licensing verification

**Owner:** integration/security agent  
**Dependencies:** PBI-02, PBI-03 integrated  
**Edits:** tests/docs only unless a defect is found and assigned

Steps:

1. Connect a permitted test account in a non-production tenant.
2. Select a capacity-backed workspace and report.
3. Export one page, then several pages.
4. Rotate/revoke the connection and verify error recovery.
5. Test a report the account cannot access.
6. Inspect API, player snapshot, IndexedDB and logs for secrets.
7. Verify signed URL expiry and renewal.
8. Disconnect the network after successful prefetch and verify playback.
9. Delete the app instance and verify object cleanup.
10. Document supported and unsupported report configurations from evidence.

Release requires Gate C in section 6, not just green unit tests.

### Wave 4 — enterprise rollout spine, only after pilot evidence

These are separate tickets and should not delay the first OpsBoard customer.

#### CORE-02: sites, tags, saved screen groups and bulk publish

Implement the approved CORE-01 ADR. Include migration, indexes, organization scoping, CMS filters and tests. Use existing explicit multi-screen assignment logic instead of inventing a parallel publishing path.

#### CORE-03: per-item scheduling and shift windows

Add optional schedule data to screen/playlist items, a shared wire contract and local player evaluation. Timezone and overnight shifts must have dedicated tests. Disabled/out-of-window items must be skipped without leaving a blank stage.

#### CORE-04: emergency takeover

Implement the approved safety ADR as a targetable, expiring priority override. It must supersede ordinary playback, persist locally, expire safely and record activation/deactivation. Do not overload the existing Alert app config with organization-wide control.

#### CORE-05: health, current item and proof foundation

Start with low-volume heartbeats containing current item/app id, snapshot revision and error state. Add alerting for offline/stale screens. Design proof-of-play aggregation and retention before emitting a high-volume event per frame/item.

#### CORE-06: site RBAC, audit, approval and rollback

Implement only against a signed customer's governance requirements. Separate content authoring, approval and device administration. Audit every production publish, emergency action and role change. Rollback requires immutable content revisions, not a copied current document.

---

## 8. Coordinator integration checklist

Use this after every wave.

### Scope and security

- [ ] No agent edited unrelated user changes.
- [ ] No provider token, secret, signed URL or private data appears in logs/tests/fixtures.
- [ ] Connected cache keys include connection identity.
- [ ] Organization and instance ownership checks happen before private preview or asset signing.
- [ ] New apps remain non-public until release gate approval.
- [ ] Marketing claims were not changed ahead of implementation.

### App architecture

- [ ] Manifest is registered and exported exactly once.
- [ ] Connected/server app has a connector registration.
- [ ] Config validates through the generic CMS schema.
- [ ] Preview and player use the same embed bundle.
- [ ] Network/offline flags match actual behavior.
- [ ] Payload is normalized and display-only settings do not unnecessarily fragment cache keys.

### Data reliability

- [ ] Empty, malformed and long upstream data is handled.
- [ ] Fetch timeout/abort signal is honored.
- [ ] Failed refresh preserves last-known-good payload.
- [ ] Staleness is visible.
- [ ] Push notification is an accelerator; polling remains the fallback.
- [ ] Cleanup handles replaced and deleted resources.

### Verification commands

Run focused commands first, then repository-level commands when the wave is integrated:

```bash
pnpm --filter @signagewall/apps-contract type-check
pnpm --filter @signagewall/apps build
pnpm --filter @signagewall/be test -- --runInBand
pnpm --filter @signagewall/be build
pnpm --filter @signagewall/player test
pnpm --filter @signagewall/player build
pnpm --filter @signagewall/cms build
pnpm test
pnpm type-check
```

If a known baseline command is already failing, record the pre-existing failure and prove the feature with focused commands. Do not hide a new regression behind a baseline failure.

Manual verification is mandatory for OAuth, provider consent, screen lifecycle, offline behavior and Power BI capacity behavior. Mocks cannot prove those integrations.

---

## 9. Ready-to-copy agent briefs

Use one brief per agent and append the current baseline/test output.

### Brief: OpsBoard agent

> Implement ticket OPS-01 from `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md`. Work only in the exclusive paths listed there. Do not edit registries, translations, lockfiles or unrelated files. Reuse existing tabular providers/mapping and webhook patterns. Add focused tests and finish with a wiring note plus exact commands/results. Do not commit.

### Brief: private asset agent

> Implement ticket SEC-01 from `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md`. Treat current `R2_PUBLIC_URL` objects as public and unsuitable for confidential Power BI exports. Work only in the exclusive paths listed there. Never log or fixture secrets/signed URLs. Add ownership, expiry, revision-stability and cross-org tests. Leave module/config/index wiring to the coordinator. Do not commit.

### Brief: Power BI API agent

> Implement ticket PBI-01 from `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md` using only official Microsoft REST behavior. Work only in the new Power BI provider files and tests. Do not edit `ConnectionsService`; provide the exact remote-source wiring as a note. Never return or log tokens. Do not commit.

### Brief: Power BI connector agent

> Implement ticket PBI-03 from `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md`. Use the existing pending connector state machine and the private asset service; do not hold a scheduler worker while an export job runs. Preserve last-known-good payload on every failure. Work only in the exclusive connector paths and tests, leave registry wiring to the coordinator, and do not commit.

### Brief: Power BI embed agent

> Implement ticket PBI-02 from `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md`. Work only under the new `powerbi-secure` manifest/embed paths. Snapshot mode is offline-capable and receives hydrated signed asset URLs, never OAuth/embed tokens. Add lifecycle/responsive/error-state tests, leave registry wiring to the coordinator, and do not commit.

### Brief: screen-domain agent

> Execute CORE-01 as an ADR/repository-impact spike from `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md`. Do not change production schemas or APIs. Resolve site ownership, timezone, saved-group semantics, variables, migrations and exact affected files. Return the ADR and test matrix; do not commit.

---

## 10. Recommended implementation order versus sales

### Before first paid customer

1. Complete Gate A for OpsBoard.
2. Prepare shift and dispatch demos.
3. Use existing private PowerPoint and Teams for Frontline Communications.
4. Sell one paid pilot; do not wait for Power BI.

### During the first pilot

1. Measure which source the customer actually uses.
2. Record repeated requests for private BI, sites/groups, schedules and safety override.
3. Complete private asset delivery and the Power BI real-tenant spike in parallel.
4. Do not broaden the app catalog presentation.

### Build trigger for secure Power BI

Proceed from spike to production only when at least one is true:

- a paid pilot explicitly requires a private Power BI report;
- three qualified prospects identify public links/shared TV logins as the same blocker;
- a design partner provides an export-compatible test workspace and agrees to the licensing prerequisites.

### Build trigger for enterprise core features

- sites/groups: a customer has more than one operational area or location;
- schedules: the same screen must change by shift without operator action;
- emergency takeover: HSE accepts the activation/expiry workflow and pays for it;
- RBAC/approval/audit: the customer's IT/security process explicitly requires it;
- proof-of-play: a contractual or operational decision depends on the evidence.

This order prevents six months of speculative enterprise work while preserving a credible path from the first spreadsheet-driven screen to a secure, high-ACV operational-screen platform.
