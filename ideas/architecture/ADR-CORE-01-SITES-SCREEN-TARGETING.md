> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../README.md).

# ADR CORE-01: sites, screen metadata, saved targeting, and safe variables

- **Status:** Proposed for INT-01 approval
- **Date:** 5 August 2026
- **Decision owner:** screen domain / CORE-01
- **Implementation ticket:** CORE-02 after approval
- **Related plan:** `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md`, sections 3, 6, 7 (CORE-01 and CORE-02)

## Context and scope

Gate D needs site/location metadata and repeatable screen targeting before the
product can claim multi-site operational control. CORE-01 is a design and
repository-impact spike only. It does not implement a schema, endpoint, CMS
screen, player contract, product claim, or migration.

This ADR decides:

- which tenant owns a site and whether a site is first-class;
- where timezone lives;
- the relationship between a screen and its site, area, line, tags, and custom
  variables;
- explicit and dynamic saved-group behavior;
- how group targeting reuses current multi-screen content assignment;
- safe, bounded per-screen substitution without a formula or code language;
- tenant indexes, authorization, deletion, migration, API, CMS, and player
  impact;
- the exact production files a later implementation must own and the required
  verification matrix.

Scheduling individual content and site RBAC remain CORE-03 and CORE-06. A saved
group is not emergency targeting, a schedule, an approval workflow, or a
persistent publishing subscription.

## Repository evidence

The decision is based on these current behaviors:

1. `Screen` is the only location-like record. It is organization-owned, embeds
   ordered content, optionally embeds an availability rule with its own IANA
   timezone, and has only an organization/update-time compound index
   (`apps/be/src/modules/screens/schemas/screen.schema.ts:131-173`).
2. Screen repository reads consistently pair `_id` or a collection query with
   `organizationId`; the sole unscoped lookup returns only the owning
   organization so the preview gateway can subsequently check membership
   (`apps/be/src/modules/screens/screens.repository.ts:41-89`). This must remain
   the tenancy pattern for sites and groups.
3. `ScreensService.addMedia`, `addPlaylists`, and `addApps` already validate all
   referenced content and screens, enforce the 500-item screen limit, append to
   several screens, emit `ScreenContentChanged`, and record publish analytics
   (`apps/be/src/modules/screens/screens.service.ts:316-499`). These paths are
   the publishing engine to reuse.
4. The three add DTOs accept a maximum of 100 `screenIds`
   (`apps/be/src/modules/screens/dto/add-screen-media.dto.ts`,
   `add-screen-playlists.dto.ts`, and `add-screen-apps.dto.ts`). Group expansion
   must honor the same resolved-target limit before performing a write.
5. `AddToScreenSheet` already gives media, playlists, and app instances the same
   screen picker and invokes those three existing mutations
   (`apps/cms/src/features/screens/components/AddToScreenSheet.tsx:44-115`).
6. Screen deletion emits the existing `ScreensDeleted` event, whose player
   handler unpairs bound devices. Any group cleanup belongs around this existing
   flow, not in a second deletion path
   (`apps/be/src/modules/screens/screens.service.ts:296-313` and
   `apps/be/src/modules/player/player.gateway.ts:512-519`).
7. The player snapshot carries resolved app config and an availability rule but
   no site or variable contract (`packages/player-contract/src/renderable.ts`).
   `PlayerContentService` currently copies `instance.config` unchanged into
   direct and overlay app renderables and fingerprints instance/cache timestamps,
   not effective per-screen config (`apps/be/src/modules/player/player-content.service.ts:267-357`).
   Merely emitting a push after a variable edit would therefore fail revision
   comparison on a later reconnect unless the effective values enter the hash.
8. App fields already have a shared manifest definition consumed by CMS,
   backend validation, and player (`packages/apps-contract/src/field-schema.ts:170-255`).
   A field-level opt-in is a smaller and safer surface than recursively
   interpolating arbitrary app config.
9. Availability config deliberately updates a screen with `touch: false` so a
   config edit does not invalidate the content editor's `updatedAt` optimistic
   lock; it gets reliability by putting the rule in the snapshot revision and
   emitting `ScreenContentChanged`
   (`apps/be/src/modules/screens/screens.service.ts:217-266`). Site timezone and
   variable edits need the same separation between metadata and content locks.
10. Authorization currently has organization membership and admin/member roles,
    but no site role. The guard resolves the header organization, verifies an
    active organization and membership, and optionally requires admin
    (`apps/be/src/common/guards/org-membership.guard.ts:46-102`).
11. Organization erasure explicitly registers and deletes each organization-
    scoped collection (`apps/be/src/modules/data-deletion/data-deletion.service.ts:212-238`).
    New `sites` and `screengroups` collections will otherwise survive GDPR
    erasure.
12. The CMS screen browser filters name/status and keeps selection only in local
    state (`apps/cms/src/features/screens/components/ScreensBrowser.tsx:68-137`).
    There is no saved-group persistence hidden elsewhere in the UI.

## Decision

### 1. A site is first-class and organization-owned

Add a `Site` collection. A site belongs to exactly one organization. It is not a
new tenant boundary and does not own billing, members, content, app connections,
or devices independently. Organization remains the authorization and billing
root.

Every screen belongs to exactly one site after backfill. The application must
always validate `(organizationId, siteId)` together; possession of a site ID is
never authority. Cross-organization site IDs, group IDs, and screen IDs return
the same not-found result as missing records.

Use this logical shape (names may change only with coordinator approval):

```ts
interface Site {
  organizationId: ObjectId
  name: string                 // trimmed display form, 1..200
  nameKey: string              // NFKC + lower-case + collapsed whitespace
  timezone: string             // required valid IANA identifier
  isDefault: boolean           // exactly one per organization
  createdAt: Date
  updatedAt: Date
}
```

The first-class record is justified even in MVP because timezone is used by
screen availability now and by per-item scheduling in CORE-03; a future signed
customer may also scope permissions and billing to sites. Encoding site as a
free-form screen string would make those later constraints impossible to
enforce without a second migration.

`isDefault` supplies a backward-compatible target for old clients and newly
created organizations. It is an operational fallback, not a special
authorization scope. New CMS flows must ask for a site explicitly once more
than one site exists.

### 2. Site timezone is canonical

`Site.timezone` is the canonical timezone for all screens in the site. It is a
valid IANA zone, validated with the existing Luxon/IANA validation approach.
Area, line, tags, and custom variables do not override it.

The current `ScreenAvailability.timezone` remains temporarily as a denormalized
compatibility mirror so existing API, CMS, player-contract, and offline snapshot
behavior can roll forward without a flag day. The invariant after migration is:

```text
screen.availability.timezone === owningSite.timezone
```

New availability writes obtain the timezone from the owning site. During the
compatibility release, a client-supplied availability timezone may be accepted
only when it equals the site timezone; a differing value is rejected rather
than silently changing a site or creating a screen override. The CMS displays
the site timezone in the availability tab as read-only and links the operator
to site settings.

Changing a site's timezone is admin-only, requires an explicit CMS warning,
and runs in a transaction that updates the site and the compatibility mirror on
all child availability rules. Existing `HH:mm` wall-clock values are preserved,
so their absolute UTC instants change to the new site timezone. After commit,
every child screen gets `ScreenContentChanged`. Screen documents are updated
without touching their content optimistic-lock timestamp. CORE-03 reads the
site timezone, never a browser or player OS timezone.

The compatibility mirror can be removed in a later versioned migration only
after all API and player consumers resolve timezone through the site.

### 3. Screen metadata is bounded and normalized

Extend `Screen` with:

```ts
interface ScreenLocationMetadata {
  siteId: ObjectId             // required after backfill
  area?: string                // trimmed display form, max 100
  areaKey?: string             // normalized query form
  line?: string                // trimmed display form, max 100
  lineKey?: string             // normalized query form
  tags: string[]               // normalized query/display form, max 20
  variables: Record<string, string>
}
```

`areaKey` and `lineKey` use the same NFKC/lower-case/collapsed-whitespace
normalization as `Site.nameKey`; the original display strings are retained.
Tags are NFKC-normalized, trimmed, lower-case, deduplicated, 1..50 characters
each, and sorted before persistence. Empty area/line values are unset, not
stored as empty strings. Area and line do not become collections in MVP.

Custom variable constraints are defined in section 6. Metadata writes use a
dedicated service method with `touch: false` so they do not produce spurious
content-editor conflicts. Site, screen name, area, line, variable, and tag
changes still invalidate relevant screen/group queries. Every change to a
token-bearing value (screen/site name, site assignment/timezone, area, line, or
variables) also pushes a new player snapshot; tags alone need no player push.

### 4. Saved groups have exactly one mode

Add an organization-owned `ScreenGroup` collection:

```ts
type ScreenGroupMode = 'explicit' | 'dynamic'

interface DynamicScreenSelector {
  siteIds?: ObjectId[]
  areaKeys?: string[]
  lineKeys?: string[]
  tags?: {
    match: 'all' | 'any'
    values: string[]
  }
}

interface ScreenGroup {
  organizationId: ObjectId
  name: string
  nameKey: string
  mode: ScreenGroupMode
  explicitScreenIds: ObjectId[]
  selector?: DynamicScreenSelector
  createdAt: Date
  updatedAt: Date
}
```

Mode semantics are intentionally different and are shown in CMS copy:

| Mode | Stored membership | Resolution behavior |
|---|---|---|
| `explicit` | A deduplicated, ordered set of screen IDs | Membership changes only when a user edits the group or a referenced screen is deleted. Metadata changes do not move a screen in or out. |
| `dynamic` | No screen IDs; only the typed selector | Membership is evaluated against current screen metadata at read/target time. Matching metadata changes membership immediately. |

A group must satisfy exactly one branch: explicit mode has one or more owned
screen IDs and no selector; dynamic mode has no explicit IDs and at least one
non-empty selector predicate. An empty dynamic selector is rejected so a
mistake cannot turn into an organization-wide publish. The ordinary current
"select all filtered screens" UI remains the deliberate all-screens action.

Within one selector:

- `siteIds`, `areaKeys`, and `lineKeys` are OR within their respective field;
- different fields are ANDed;
- tag `all` uses `$all`; tag `any` uses `$in`;
- absent screen metadata never matches a predicate for that field;
- all referenced sites must belong to the same organization.

Dynamic groups are saved queries, not subscriptions. Publishing to one resolves
its members once for that mutation. A later tag/site change does not add/remove
content that was already assigned. Group deletion likewise never removes
content from screens.

### 5. Group targeting reuses existing bulk assignment

Do not create parallel group-publish services or persist group IDs on screen
items. Extend the target part of the existing three screen assignment DTOs:

```ts
interface ScreenTargets {
  screenIds?: string[]
  screenGroupIds?: string[]
}
```

At least one source is required. A new `ScreenTargetResolver` resolves direct
IDs, explicit groups, and dynamic selectors within `organizationId`, unions and
deduplicates them, then returns a stable ID list to the existing
`ScreensService.addMedia`, `addPlaylists`, or `addApps` behavior. It resolves at
mutation time on the server; the client is not the security boundary.

The existing maximum remains 100 **resolved** screens per assignment. Resolution
and every organization/content/item-limit check must finish before the first
append. If the union is empty or exceeds 100, reject the whole request. This
keeps the present resource bound and avoids quietly truncating a group. Raising
the limit requires a separate transaction/bulk-write decision because the
current append loop is not an all-or-nothing transaction on an infrastructure
failure.

The CMS extends `AddToScreenSheet` with site filters and a saved-group picker,
but it calls the same media/playlist/app mutations. It shows mode and a current
resolved-count preview. The server re-resolves on submit, so the confirmation
copy must say dynamic membership can change between preview and publish.

### 6. Per-screen variables use an allowlisted text substitution, never code

Variables are display personalization for a shared app instance, not secrets,
connector inputs, URLs, queries, filters, or executable templates.

Stored custom variables have these constraints:

- at most 50 entries and 8 KiB total serialized key/value content per screen;
- keys match `^[a-z][a-z0-9_-]{0,31}$` and are unique after lower-casing;
- values are plain Unicode strings of at most 500 characters;
- API/CMS copy explicitly forbids credentials, tokens, personal secrets, and
  HTML/JavaScript.

Supported tokens are only:

```text
{{screen.name}}
{{screen.area}}
{{screen.line}}
{{site.name}}
{{site.timezone}}
{{var.<custom-key>}}
```

There are no expressions, property traversal, functions, filters, defaults,
conditionals, loops, includes, environment access, or `${...}` evaluation. A
strict parser performs a single non-recursive pass, allows at most 20 tokens in
one field, caps the resolved field at 4 KiB, leaves an unknown token visibly
unchanged, and substitutes a missing known value with an empty string. A
variable value containing another token is not expanded.

Only manifest fields with both conditions below are resolved:

1. `field.type` is `text` or `textarea` at the top level; and
2. the manifest declares `screenVariables: true` on that exact field.

Do not resolve `url`, `oauth`, `remote-select`, `image`, `file`, `richtext`,
`datetime`, select values, repeater content, connector payloads, or arbitrary
nested config. An app may opt a field in only after its embed test proves it
uses a text sink (`textContent` or equivalent), not `innerHTML`, script, CSS, or
URL construction. The generic manifest contract rejects/ignores the flag for
unsupported field types.

Resolution occurs in `PlayerContentService` on a cloned config after connector
data has been fetched and immediately before direct/overlay `AppRenderable`
creation. The resolver obtains the field opt-in from the code manifest registry,
not from client input. Stored `AppInstance.config` and connector cache keys
remain unchanged, which prevents one screen's variables from changing shared
upstream requests or crossing cache/tenant boundaries. CMS preview receives the
same backend-resolved snapshot as a device. The player and iframe do not receive
the variable map.

The revision hash includes the resolved config (or a canonical hash of it) plus
site/variable version data for both rotation and overlay apps. Thus two screens
using one app instance can receive different display strings, and an offline
screen reconnecting after a variable edit cannot falsely report an unchanged
revision. Metadata update services emit the existing `ScreenContentChanged`
event after persistence.

### 7. Tenancy, indexes, and permissions

All repository methods accept `organizationId`; no site/group mutation or
resolution may query by `_id` alone. Dynamic selector filters always include
`organizationId`, even when a site ID is already present. MongoDB cannot enforce
that references share an organization, so services must validate it before
writes and tests must cover IDOR cases.

Create only the indexes justified by the API queries:

```ts
// sites
{ organizationId: 1, nameKey: 1 } unique
{ organizationId: 1, isDefault: 1 } unique, partial { isDefault: true }
{ organizationId: 1, updatedAt: -1 }

// screens (retain the existing organizationId/updatedAt index)
{ organizationId: 1, siteId: 1, updatedAt: -1 }
{ organizationId: 1, siteId: 1, areaKey: 1, lineKey: 1 }
{ organizationId: 1, tags: 1 } // multikey

// screen groups
{ organizationId: 1, nameKey: 1 } unique
{ organizationId: 1, updatedAt: -1 }
{ organizationId: 1, explicitScreenIds: 1 } // deletion cleanup
```

Do not create global `siteId`, area, line, or tag indexes; every supported query
is tenant-prefixed. Do not add indexes over group selector arrays because groups
are loaded by ID/list, then their selector is applied to indexed screens.

Permissions in CORE-02 are deliberately limited to existing roles:

- any organization member may list sites/groups/screens, edit screen metadata,
  create/edit/delete their saved groups, and publish content, matching current
  screen behavior;
- organization admins create, rename, change timezone, select the default, and
  delete sites because those operations affect many screens;
- no site-scoped membership or permission inference is introduced; CORE-06 owns
  that work.

### 8. Deletion behavior

- **Screen deletion:** keep the existing delete + `ScreensDeleted` device-unpair
  flow. In the same screen-domain operation, pull deleted IDs from all explicit
  groups in that organization. Dynamic groups need no cleanup. Cleanup is
  idempotent. The existing delete is not transactional with device unpairing,
  so do not claim stronger atomicity.
- **Group deletion:** delete only the group. Screens, their content, and devices
  are unchanged because groups are not subscriptions.
- **Site deletion:** reject with `409` if it is the default, has screens, or is
  referenced by a dynamic group's `siteIds`. The response includes blocker
  counts, not cross-tenant identifiers. The operator must rehome screens, edit
  groups, and promote another default first. Never cascade-delete screens or
  silently broaden selectors.
- **Site move:** validate the destination in the same organization. The screen's
  local schedule wall times are preserved but the compatibility timezone mirror
  changes to the destination timezone. Emit `ScreenContentChanged`; saved
  dynamic membership changes naturally, already-published content does not.
- **Organization GDPR purge:** register and delete both new collections inside
  the existing transaction before deleting the organization.

## API contract impact

Add organization-scoped CRUD endpoints under `/sites` and `/screen-groups`,
following the repository's current `POST .../delete` convention for destructive
bulk actions. Site mutations that require admin use `OrganizationRole.ADMIN`.

Extend screen API shapes:

- `ScreenSummary`/detail: `siteId`, `siteName`, optional `area`/`line`, `tags`;
  detail additionally returns `variables`;
- create: `siteId` (temporarily optional only for default-site compatibility),
  optional metadata/variables;
- update: optional `siteId`, `area`, `line`, `tags`, `variables`;
- list query: optional `siteId`, `area`, `line`, repeated `tag`, and `tagMatch`;
- the existing add-media/add-playlists/add-apps bodies accept direct and/or
  saved-group targets and retain content arrays unchanged.

Group list/detail responses include `mode` and current `resolvedScreenCount`;
detail may include resolved summaries for editing but never exposes another
tenant's IDs. Add a read-only `GET /screen-groups/:id/screens` (or equivalent
resolver endpoint) for previewing current membership. It is advisory; assignment
still resolves on the server at mutation time.

Regenerate `apps/be/openapi.json` and
`apps/cms/src/lib/api/schema.d.ts`; do not hand-edit the generated CMS file.

## CMS impact

The implementation adds site and group query/types/forms, then changes the
existing screens workflow rather than introducing a second fleet page:

- a site selector is required by screen create/settings; area, line, tags, and
  custom variables live in screen settings;
- the availability tab displays the owning site's timezone instead of offering
  a conflicting per-screen timezone;
- the screens browser filters by site/area/line/tag and can save either the
  current typed filter as a dynamic group or the current selection as an
  explicit group;
- group cards/pickers clearly label `Explicit` or `Dynamic` and show a current
  count;
- `AddToScreenSheet` uses the same mutations after accepting groups;
- screen card/table rows show site and compact location metadata without
  loading a site once per row;
- app text/textarea controls whose manifest field opts in get a token-insert
  helper. The helper does not make unsupported fields variable-aware.

All new copy must be added in both CMS locale files by the integration owner.
No marketing or `CONTENT-CLAIMS.md` text changes until Gate D is actually met.

## Player impact

CORE-02 does not require a new player wire shape or player runtime code. The
backend continues sending ordinary, already-resolved `AppRenderable.config` and
the existing availability timezone. The existing socket push, CMS preview,
IndexedDB snapshot persistence, iframe host handshake, and offline playback are
reused.

Only the backend snapshot producer changes: it loads the owning site, resolves
allowlisted text fields, and fingerprints the effective config/site timezone.
Player unit tests are still required to prove an existing resolved snapshot
persists and rehydrates unchanged; no player-side template parser is permitted.
CORE-03 may later extend `@signagewall/player-contract` for item schedules, but
that is outside this ADR's implementation.

## Migration and rollout

Use a two-deploy expand/backfill/contract sequence. The migration follows the
existing dry-run-by-default pattern in
`apps/be/src/database/migrations/backfill-plans.ts`.

### Deploy 1: expand and dual-read

1. Add site/group collections and indexes.
2. Add optional `siteId` and optional metadata fields to `Screen`; reads tolerate
   a missing site and present a synthetic/default label only during migration.
3. Create exactly one default site for every newly created organization in the
   same organization-creation transaction. Default timezone comes from a valid
   timezone supplied by the create flow; fall back to `UTC`, never server local
   time.
4. Keep current screen availability timezone reads while the backfill runs.
5. Deploy code that can read both legacy and migrated documents before applying
   data writes.

### Backfill

Add `apps/be/src/database/migrations/backfill-screen-sites.ts` and package scripts
for dry-run and `--apply`. It must be idempotent, resumable, bounded in batches,
and print counts only (no variable values or customer content).

For each organization:

1. Enumerate distinct valid timezones on existing screen availability rules.
2. Create a deterministic imported site for each timezone. If the organization
   has one observed timezone, that site is the default. With several, choose the
   timezone used by the most screens (stable lexical tie-break). With none,
   create a `UTC` default. Screen/site identity used by the script must be
   deterministic so reruns reuse the same records.
3. Assign a screen with an availability timezone to the matching imported site.
   Assign an always-on/missing/invalid legacy rule to the default and report
   invalid zones for manual review. Do not infer area, line, tags, or a physical
   site name from screen names/descriptions.
4. Preserve `availability.timezone` exactly for valid rules; because sites are
   partitioned by that value, the new invariant holds without shifting a
   schedule.
5. Initialize `tags` to `[]` and `variables` to `{}`; leave area/line unset.

This may create technical placeholder sites for different timezones rather than
guessing a customer's physical topology. The CMS asks an admin to rename,
split, or merge them later. Merging/moving screens uses the explicit timezone
warning described above.

Verification before contract deploy:

- every active screen has a site owned by the same organization;
- exactly one default site exists per organization;
- every availability timezone equals its owning site timezone;
- no duplicate normalized site names exist within an organization;
- screen, site, and group counts reconcile and the script reports zero pending
  rows on a second dry run.

### Deploy 2: enforce

1. Make `Screen.siteId` required for new writes and remove the legacy synthetic
   read fallback.
2. Make new availability writes site-derived and reject mismatches.
3. Enable saved-group targeting and variable-aware manifest fields only after
   the corresponding tests pass.
4. Keep the availability timezone mirror for rollback and older player
   snapshots; removing it is a later migration.

Rollback is data-preserving: old code ignores the new collections/fields, and
the original availability timezone is still present. Do not delete sites or
unset `siteId` during rollback.

## Exact implementation ownership

CORE-02 must be scheduled so one screen-domain implementation owner has
exclusive ownership of every file below for the duration of the change. New
files may be renamed only in the integration handoff, with the same boundaries.

### Screen-domain owner: new backend files

```text
apps/be/src/modules/sites/schemas/site.schema.ts
apps/be/src/modules/sites/dto/create-site.dto.ts
apps/be/src/modules/sites/dto/update-site.dto.ts
apps/be/src/modules/sites/dto/delete-sites.dto.ts
apps/be/src/modules/sites/mappers/site.mapper.ts
apps/be/src/modules/sites/sites.repository.ts
apps/be/src/modules/sites/sites.service.ts
apps/be/src/modules/sites/sites.service.spec.ts
apps/be/src/modules/sites/sites.controller.ts
apps/be/src/modules/sites/sites.module.ts

apps/be/src/modules/screen-groups/schemas/screen-group.schema.ts
apps/be/src/modules/screen-groups/dto/create-screen-group.dto.ts
apps/be/src/modules/screen-groups/dto/update-screen-group.dto.ts
apps/be/src/modules/screen-groups/dto/delete-screen-groups.dto.ts
apps/be/src/modules/screen-groups/mappers/screen-group.mapper.ts
apps/be/src/modules/screen-groups/screen-group-selector.ts
apps/be/src/modules/screen-groups/screen-group-selector.spec.ts
apps/be/src/modules/screen-groups/screen-groups.repository.ts
apps/be/src/modules/screen-groups/screen-groups.service.ts
apps/be/src/modules/screen-groups/screen-groups.service.spec.ts
apps/be/src/modules/screen-groups/screen-groups.controller.ts
apps/be/src/modules/screen-groups/screen-groups.module.ts

apps/be/src/modules/screens/dto/screen-targets.dto.ts
apps/be/src/modules/screens/screen-target-resolver.service.ts
apps/be/src/modules/screens/screen-target-resolver.service.spec.ts
apps/be/src/modules/screens/screen-variable.resolver.ts
apps/be/src/modules/screens/screen-variable.resolver.spec.ts
apps/be/src/database/migrations/backfill-screen-sites.ts
```

### Screen-domain owner: existing backend files modified

```text
apps/be/src/modules/screens/schemas/screen.schema.ts
apps/be/src/modules/screens/dto/create-screen.dto.ts
apps/be/src/modules/screens/dto/update-screen.dto.ts
apps/be/src/modules/screens/dto/add-screen-media.dto.ts
apps/be/src/modules/screens/dto/add-screen-playlists.dto.ts
apps/be/src/modules/screens/dto/add-screen-apps.dto.ts
apps/be/src/modules/screens/dto/update-screen-availability.dto.ts
apps/be/src/modules/screens/mappers/screen.mapper.ts
apps/be/src/modules/screens/screens.repository.ts
apps/be/src/modules/screens/screens.service.ts
apps/be/src/modules/screens/screens.service.spec.ts
apps/be/src/modules/screens/screens.controller.ts
apps/be/src/modules/screens/screens.module.ts
apps/be/src/modules/screens/availability/availability.validation.ts

apps/be/src/modules/player/player-content.service.ts
apps/be/src/modules/player/player-content.service.spec.ts
apps/be/src/modules/player/player.module.ts

apps/be/src/modules/organizations/organizations.service.ts
apps/be/src/modules/organizations/organizations.module.ts
apps/be/src/modules/data-deletion/data-deletion.service.ts
apps/be/src/modules/data-deletion/data-deletion.service.spec.ts
apps/be/src/modules/data-deletion/data-deletion.module.ts
```

`player.gateway.ts`, `player.events.ts`, player-contract source, and player
runtime source are reuse points, not expected modifications. If implementation
discovers a required change to them, it must return to the coordinator instead
of expanding scope.

### CMS owner: new files

```text
apps/cms/src/features/sites/api/sitesApi.ts
apps/cms/src/features/sites/types/site.types.ts
apps/cms/src/features/sites/schemas/siteSchemas.ts
apps/cms/src/features/sites/hooks/useSites.ts
apps/cms/src/features/sites/components/SiteFormSheet.tsx
apps/cms/src/features/sites/components/SitesManager.tsx

apps/cms/src/features/screens/api/screenGroupsApi.ts
apps/cms/src/features/screens/types/screen-group.types.ts
apps/cms/src/features/screens/schemas/screenGroupSchemas.ts
apps/cms/src/features/screens/hooks/useScreenGroups.ts
apps/cms/src/features/screens/components/ScreenGroupPicker.tsx
apps/cms/src/features/screens/components/ScreenGroupFormSheet.tsx
apps/cms/src/features/screens/components/ScreenMetadataFields.tsx
apps/cms/src/features/apps/config-form/ScreenVariableTokenMenu.tsx
```

### CMS owner: existing files modified

```text
apps/cms/src/features/screens/types/screen.types.ts
apps/cms/src/features/screens/schemas/screenSchemas.ts
apps/cms/src/features/screens/api/screensApi.ts
apps/cms/src/features/screens/hooks/useScreens.ts
apps/cms/src/features/screens/lib/screenQueryKeys.ts
apps/cms/src/features/screens/pages/ScreensPage.tsx
apps/cms/src/features/screens/components/ScreensBrowser.tsx
apps/cms/src/features/screens/components/ScreensBulkActionsBar.tsx
apps/cms/src/features/screens/components/ScreensGrid.tsx
apps/cms/src/features/screens/components/ScreensTable.tsx
apps/cms/src/features/screens/components/ScreenCard.tsx
apps/cms/src/features/screens/components/ScreenFormSheet.tsx
apps/cms/src/features/screens/components/ScreenSettingsTab.tsx
apps/cms/src/features/screens/components/ScreenAvailabilityTab.tsx
apps/cms/src/features/screens/components/AddToScreenSheet.tsx
apps/cms/src/features/apps/config-form/FieldRenderer.tsx
```

### Shared/integration-owner files

These are collision-prone or generated and remain coordinator-owned even while
CORE-02 is implemented:

```text
packages/apps-contract/src/field-schema.ts
apps/be/src/app.module.ts
apps/be/package.json
apps/be/openapi.json
apps/cms/src/lib/api/schema.d.ts
apps/cms/src/i18n/locales/en/translation.json
apps/cms/src/i18n/locales/sr/translation.json
root/package lockfiles (only if a dependency change is approved)
apps/web/CONTENT-CLAIMS.md (must remain unchanged until Gate D)
```

The screen-domain owner supplies the `Field.screenVariables` patch and module /
migration-script wiring note; the integration owner applies those shared edits.
No new dependency is required by this ADR.

## Test matrix

| Layer | Required cases | Proposed test owner/file |
|---|---|---|
| Site schema/service | valid/invalid IANA zone; normalized-name uniqueness inside one org but same name allowed across orgs; exactly one default; member reads; member denied admin mutation; site ID from another org is not found | `sites.service.spec.ts` plus schema integration coverage |
| Site update | transaction preserves local `HH:mm`, updates availability timezone mirrors, does not touch content lock timestamp, emits one content-change event per child after commit, rolls back on failure | `sites.service.spec.ts`, `screens.service.spec.ts` |
| Screen metadata | create/update validates owned site; trims area/line; builds normalized keys; normalizes/deduplicates/sorts tags; enforces tag/variable limits; moving site emits push | `screens.service.spec.ts` |
| Selector utility | OR within site/area/line, AND across fields, tags all/any, absent metadata, duplicate predicates, empty selector rejection, no arbitrary Mongo operators | `screen-group-selector.spec.ts` |
| Group service | explicit order/deduplication; dynamic resolution reflects current metadata; exact-one-mode validation; cross-org screen/site/group rejection; unique normalized name | `screen-groups.service.spec.ts` |
| Target resolver | union direct + several groups; duplicate screen resolved once; deleted/missing IDs fail safely; empty result; 100 succeeds, 101 rejects before append; tenant filter present | `screen-target-resolver.service.spec.ts` |
| Assignment reuse | media/playlist/app through explicit and dynamic groups produces the same item shape, validation, events, analytics, item-limit behavior, and last-known-good player update as direct IDs | `screens.service.spec.ts` |
| Non-subscription semantics | publish, then change a matching tag/site: prior items stay assigned; next publish uses new membership; group deletion leaves content unchanged | `screen-groups.service.spec.ts` / `screens.service.spec.ts` |
| Variables parser | every built-in token; valid custom key; missing value; unknown token retained; nested token not expanded; 20-token and 4-KiB caps; `${}`/JS/property traversal remain text | `screen-variable.resolver.spec.ts` |
| Variable security | only opted-in top-level text/textarea fields change; URL/OAuth/richtext/repeater/data untouched; HTML/script payload remains a string; connector cache key/stored instance config unchanged | `screen-variable.resolver.spec.ts`, `player-content.service.spec.ts` |
| Player revision | same instance on two screens resolves differently; variable/site edit changes the affected revision; unchanged variables are deterministic; direct and overlay apps both covered; reconnect sends changed snapshot | `player-content.service.spec.ts`, existing gateway test seam if added |
| Deletion | screen delete pulls explicit references and still unpairs; dynamic group naturally shrinks; blocked site deletion reports counts; group delete has no screen effect; org purge deletes sites/groups | `screens.service.spec.ts`, `sites.service.spec.ts`, `data-deletion.service.spec.ts` |
| Migration | dry run writes nothing; apply is idempotent/resumable; deterministic site creation; single/multiple/no/invalid legacy timezone; ownership/count invariants; second dry run clean | isolated migration fixture/integration test plus staging dry run |
| API/authorization | DTO whitelist rejects Mongo operators/unknown selector keys; member/admin matrix; all list/detail/mutation IDs tenant-scoped; generated OpenAPI contains new shapes | focused controller/e2e tests and OpenAPI diff |
| CMS | create/settings round-trip metadata; filters compose; save explicit/dynamic group; mode/count copy; group targeting uses existing mutations; 101-target error; timezone read-only; token menu only on opted-in fields | CMS type-check/build plus component/manual test checklist (CMS currently has no test script) |
| Player regression | resolved snapshot persists, rehydrates, and passes unchanged config to host; offline playback has no variable parser or new network dependency | existing `@signagewall/player` tests/build |

Focused verification after implementation:

```bash
pnpm --filter @signagewall/apps-contract type-check
pnpm --filter @signagewall/be test -- --runInBand
pnpm --filter @signagewall/be build
pnpm --filter @signagewall/player test
pnpm --filter @signagewall/player build
pnpm --filter @signagewall/cms type-check
pnpm --filter @signagewall/cms build
pnpm test
pnpm type-check
```

The 5 August Wave 1 baseline records one unrelated `@signagewall/apps`
`createRequire` type-check failure in `packages/apps/vite.embeds.config.ts`.
CORE-02 must introduce no additional errors and must not claim that baseline
failure as its own.

## Consequences and rejected alternatives

Benefits:

- site timezone and future site permissions have a stable identity;
- saved groups are predictable and safe to reuse across content types;
- dynamic targeting stays current without retroactively mutating published
  screens;
- variables personalize a shared app while keeping connectors, secrets, and
  the player runtime isolated;
- migration preserves existing schedules and rollback remains possible.

Costs:

- site creation and timezone changes become multi-document operations;
- the compatibility timezone mirror must be maintained until a later contract
  migration;
- variable-aware fields require deliberate manifest/app test work;
- the existing 100-screen assignment bound remains visible for larger fleets.

Rejected:

- **Free-form site string on Screen:** cannot own timezone or later permissions,
  and cannot enforce tenant-safe references.
- **Only explicit or only dynamic groups:** explicit alone becomes stale for
  operational tags; dynamic alone cannot preserve a hand-curated fleet.
- **Persist group ID on content/screen items:** creates a subscription whose
  retroactive behavior and audit semantics the product has not designed.
- **Client-only group expansion:** creates a race and makes the browser an
  authorization boundary.
- **Recursive Mustache/Liquid/JavaScript interpolation:** expands the attack
  surface into URLs, HTML, connector inputs, and player persistence.
- **Player-side interpolation:** duplicates policy in an offline client and
  exposes the entire variable map to every embed.
- **Site deletion cascade:** deleting a location must not erase screens,
  content, or paired devices.
- **One guessed physical site per organization in migration:** loses existing
  timezone semantics; timezone-partitioned placeholders are lossless and
  explicitly provisional.

## Approval questions and blockers

The ADR has no repository blocker. Implementation requires coordinator/product
approval on two deliberate limits:

1. Is the existing 100 resolved-screen cap acceptable for the first CORE-02
   pilot? If not, atomic/batched bulk assignment must be designed before raising
   it.
2. Should newly created organization UI collect an IANA timezone, or should its
   default site start at `UTC` until the first site/screen setup? The backend
   fallback remains `UTC` either way.

Neither question changes the core ownership, group, variable, tenancy, deletion,
or migration decisions above.
