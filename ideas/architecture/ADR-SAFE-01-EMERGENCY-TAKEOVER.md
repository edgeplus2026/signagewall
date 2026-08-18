> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../README.md).

# ADR SAFE-01: targetable, expiring emergency takeover

- **Status:** Proposed; documentation only
- **Date:** 5 August 2026
- **Decision owner:** safety / product core
- **Implementation ticket:** CORE-04 after coordinator approval
- **Related decisions:** `ADR-CORE-01-SITES-SCREEN-TARGETING.md`
- **Related pilot:** `ideas/demo/safety/README.md`

## Release and marketing gate

This ADR does not implement emergency takeover. Until CORE-04 is implemented,
tested on real devices, operationally reviewed, and explicitly released, the
product must not claim instant takeover, priority override, guaranteed delivery,
or emergency broadcasting. Even after release, it must not be positioned as a
replacement for a certified alarm, siren, public-address system, or the
customer's emergency procedures.

## Context and repository evidence

The current Alert app is useful, offline-capable, high-contrast content, but it
is an ordinary rotation item:

1. Its manifest is a static embed with visual fields only. It has no targeting,
   activation, priority, expiry, or audit contract
   (`packages/apps/src/alert/manifest.ts:20-74`).
2. A playlist app item stores only an app-instance ID, order, duration, and
   disabled flag (`apps/be/src/modules/playlists/schemas/playlist.schema.ts:4-40`).
   Alert therefore has the same rotation semantics as every other app item.
3. `PlayerSnapshot` contains ordered `items`, availability, and optional
   overlays; it has no priority override
   (`packages/player-contract/src/renderable.ts:54-72`).
4. `PlaybackController.load` loads the ordered items, starts at the first
   playable item, and advances the normal loop
   (`apps/player/src/engine/playback-controller.ts:186-215`). There is no
   interrupt layer.
5. The player persists the last normal snapshot in IndexedDB for offline boot
   (`apps/player/src/persistence/idb.ts:12-46`) and receives ordinary
   `content:update` messages over Socket.IO
   (`apps/player/src/sync/socket.ts:40-107`). These are useful foundations, not
   proof that an offline device can receive a new emergency message.
6. Countdown is already a static count-up/count-down app and explicitly supports
   days since an incident (`packages/apps/src/countdown/manifest.ts:8-26`). The
   safety pilot must reuse it instead of adding date arithmetic to OpsBoard.

## Decision

Emergency takeover will be a separate organization-owned core aggregate and a
player-owned priority layer. It will reuse Alert's constrained content shape and
visual language, but it will not add organization-wide controls to an Alert app
instance and it will not insert a synthetic item into an ordinary playlist.

An effective takeover covers the entire viewport, hides every layout zone and
overlay, pauses ordinary playback and audio, and resumes the locally available
normal snapshot when the takeover ends or expires. The renderer must ship inside
the player bundle so rendering the already-received takeover never depends on a
network fetch or a separately cached app embed.

### Aggregate and wire contract

The implementation should preserve this logical shape even if persistence DTOs
use different names:

```ts
type EmergencyPriority = 10 | 50 | 100 // notice, urgent, critical
type EmergencySeverity = 'info' | 'warning' | 'critical'

interface EmergencyTargetSelector {
  screenIds?: string[]
  siteIds?: string[]
  screenGroupIds?: string[]
  allScreens?: true
}

interface EmergencyTakeover {
  id: string
  organizationId: string
  status: 'draft' | 'active' | 'ended' | 'expired'
  content: {
    headline: string
    message?: string
    severity: EmergencySeverity
    showIcon: boolean
    pulse: boolean
  }
  priority: EmergencyPriority
  targetSelector: EmergencyTargetSelector
  resolvedScreenIds: string[]
  reason: string
  activatedAt?: string
  expiresAt?: string
  endedAt?: string
  revision: string
  createdBy: string
  activatedBy?: string
  endedBy?: string
}

interface ActiveTakeoverEnvelope {
  id: string
  revision: string
  priority: EmergencyPriority
  content: EmergencyTakeover['content']
  activatedAt: string
  expiresAt: string
  serverNow: string
}
```

The player contract gets an optional `activeTakeover` envelope at the snapshot
top level for cold boot/reconnect reconciliation. A dedicated
`takeover:update` socket event provides the low-latency path. Both paths use the
same validated contract and revision. The normal content `revision` remains
independent so a signature renewal or takeover state change does not reset the
ordinary rotation unnecessarily.

No access token, signed asset URL, arbitrary HTML, script, iframe, external
image, or general app config is allowed in takeover content. Text length,
severity, icon, and reduced-motion-safe pulse are a closed allowlist.

### Targets

Every selector and resolved screen is checked with `organizationId`; a foreign
or missing ID fails the activation without disclosing which case occurred.
Empty target resolution and an empty selector are invalid. `allScreens=true`
is a distinct, explicitly confirmed action and cannot be inferred from an empty
list.

Site and saved-group targeting depend on CORE-02. Dynamic saved groups are
resolved once during activation, consistent with CORE-01. The immutable
`resolvedScreenIds` list is the audit truth: moving a screen or changing a group
after activation neither adds nor removes a target, and a newly paired screen is
not silently enrolled. The CMS shows the resolved target count and names before
the final activation confirmation.

The existing 100-screen content-assignment limit does not silently truncate an
emergency activation. CORE-04 must implement bounded, batched fan-out with an
operator-visible organization limit; if the complete target set cannot be
accepted, activation fails before any target becomes active.

### Priority and conflict resolution

Priorities are fixed, not arbitrary numbers:

- `10` — operational notice;
- `50` — urgent safety instruction;
- `100` — critical emergency message.

At most one takeover is effective per screen. Activation is atomic from the
control-plane perspective: for every overlapping screen, a higher-priority
takeover supersedes the lower one. An equal-priority takeover may supersede an
older one only after an explicit confirmation. A lower-priority activation is
rejected for screens already under a higher priority; it is never queued.
Superseded assignments are terminal and cannot reappear when the newer takeover
ends. This prevents an old warning from unexpectedly resurfacing.

The aggregate retains the whole resolved target list while a per-target record
tracks `effective`, `superseded`, delivery, display, and end state. Partial
target overlap therefore stays deterministic and auditable.

### Activation and expiry

Activation is a dedicated mutation, not an app-instance save:

1. Validate organization, `emergency.activate` permission, closed content
   schema, target ownership, exact resolved count, reason, priority, and expiry.
2. Require a unique idempotency key and the expected draft revision so a double
   click cannot broadcast twice.
3. Require an explicit UTC expiry between one minute and 24 hours after
   activation. Default the CMS picker to 15 minutes. “Never expires” is invalid.
4. In one database transaction, mark the takeover active, persist immutable
   resolved targets, settle priority conflicts, append activation audit events,
   and enqueue one durable fan-out job. Do not rely only on the current
   in-process event emitter for this safety-sensitive transition.
5. The worker pushes `takeover:update` in bounded batches. Reconnect and REST
   cold-boot resolution return the same currently effective envelope until
   expiry.
6. The player validates the envelope, durably persists it, switches to the
   bundled takeover renderer, and then acknowledges `persisted` and `displayed`
   with the takeover revision. A socket emit alone is not proof of display.

Changing content, targets, or priority after activation is prohibited. Create a
new takeover that supersedes it. Extending expiry is a separate, permissioned,
idempotent action that creates a new revision and audit event; every extension
is again limited to 24 hours from the extension time.

Ending is also explicit and idempotent. An operator may end one takeover or all
effective takeovers in the confirmed target set. Online players receive an end
revision immediately; disconnected players cannot receive it and retain the
message only until their already-known expiry.

### Local offline behavior and fail-safe rules

“Offline” has three materially different cases:

| Situation | Required behavior |
|---|---|
| Player received and persisted an active takeover, then disconnected | Continue the takeover locally, with all ordinary audio/playback paused, only until `expiresAt`. |
| Player was disconnected before activation | Continue its last normal snapshot. Mark the target `pending/offline`; never report it delivered or imply it received the emergency. |
| Player reconnects before expiry | Resolve and display the currently effective takeover, then acknowledge its revision. |
| Player reconnects after expiry | Do not deliver the expired takeover. Reconcile target history for audit only. |
| Operator ends while player is disconnected | The player cannot learn the end event; it stops at its original local expiry. The CMS must show this limitation. |

On receipt, the player stores `serverNow`, `activatedAt`, `expiresAt`, receipt
wall time, and the remaining TTL. During one process session it evaluates expiry
against a monotonic timer derived from that remaining TTL, not repeated wall
clock reads. On reboot it may reconstruct remaining time from persisted wall
time only when the clock is plausible. If the clock is before `activatedAt`
beyond an allowed small skew, the player treats time as untrusted, removes the
takeover, resumes ordinary content, and reports `clock_untrusted` after
reconnect. It must never extend an emergency message indefinitely because it is
disconnected, because time is uncertain, or because the server cannot be
reached.

Expiry is locally authoritative for removal. At expiry the player atomically
clears the takeover record, tears down its renderer, restores the previous
volume, and resumes the already-persisted normal snapshot. It records a pending
`expired_locally` acknowledgement for the next connection. A delayed server end
or an older activation revision cannot resurrect it.

If takeover persistence fails, the player may display it for the current
session but must acknowledge `displayed_volatile`, not `persisted`; the CMS
shows degraded delivery. If takeover rendering fails validation, the player
keeps normal content, reports `rejected`, and must not render partial or raw
operator input.

These rules prefer a bounded false negative over an indefinitely stale safety
instruction. The short mandatory expiry is the mitigation for disconnected
players that miss an early end. The product must never call this “guaranteed
offline delivery”: a device already offline cannot receive new information.

### Audit and operator feedback

Use an append-only, organization-scoped `EmergencyTakeoverAudit` collection.
Records are never edited in place and include:

- event ID, takeover ID/revision, organization ID, UTC timestamp;
- event type: draft created, activated, expiry extended, superseded, end
  requested, ended, expired server-side, fan-out retried, or player ack;
- actor type and ID (`user`, `device`, or `service`) and the operator's required
  reason for control actions;
- immutable requested selector, resolved target count, and affected screen ID
  for per-device events;
- delivery/display outcome (`pending`, `offline`, `persisted`, `displayed`,
  `displayed_volatile`, `rejected`, `expired_locally`) and safe error code;
- correlation/idempotency key and client/player version where relevant.

Do not log message bodies, tokens, socket auth, or arbitrary exception payloads.
Audit records are exportable and remain organization-owned data, included in
the existing account-erasure flow. Product UI distinguishes “targeted”,
“socket sent”, “persisted”, and “displayed”; only the last player acknowledgement
may be labeled displayed. Unknown/offline must remain visible, never rolled into
a success percentage.

### Authorization and abuse controls

CORE-04 introduces distinct permissions: `emergency.view`,
`emergency.create`, `emergency.activate`, `emergency.extend`, and
`emergency.end`. Until site RBAC is implemented, activation/extension/end are
organization-admin only. A later site-scoped role may act only on targets fully
inside its allowed sites. Creation and preview never confer activation rights.

Activation, extension, and end endpoints are rate limited, CSRF-protected by the
existing authenticated API pattern, organization-scoped, and require recent
authentication. All mutations use optimistic concurrency and idempotency. The
CMS displays the exact target set, priority, expiry, and message in the final
confirmation rather than a generic “publish” button.

## Implementation slices for CORE-04

1. Add shared takeover envelope/ack schemas and exhaustive runtime validation to
   `packages/player-contract`; keep Alert app contracts unchanged.
2. Add organization-scoped takeover, per-target, audit, and durable-outbox
   persistence with compound indexes for active target lookup, expiry, and
   idempotency.
3. Add draft/activate/extend/end/read endpoints, permissions, target resolution,
   atomic conflict handling, and server-expiry worker.
4. Extend snapshot resolution and player socket handshake with the effective
   takeover; add durable batched fan-out and acknowledgements.
5. Add a player-owned full-viewport renderer, IndexedDB state, monotonic expiry,
   cold-boot reconciliation, pause/resume behavior, and stale-revision defense.
6. Add CMS authoring, target preview, explicit confirmation, live per-target
   delivery state, end/extend controls, and boundary copy.
7. Register takeover collections in organization erasure and audit export.
8. Ship behind an organization feature flag. Run the verification matrix below
   on browser and supported Android hardware before enabling any customer.

## Required verification before release

- contract tests reject unknown fields, invalid severity/priority, empty target,
  missing expiry, expiry outside 1 minute–24 hours, and stale revisions;
- tenancy tests cover every read/write, foreign screen/site/group IDs, audit,
  acknowledgement, and reconnect path;
- activation idempotency and concurrent equal/higher/lower priority races are
  deterministic, with no partial target activation after validation failure;
- player tests cover receive/persist/display/ack order, full-viewport takeover,
  paused audio, expiry restoration, end restoration, reboot while active,
  reboot after expiry, clock rollback, storage failure, malformed envelope, and
  stale/reordered socket events;
- disconnected-before-activation, disconnected-after-activation,
  disconnected-during-end, reconnect-before-expiry, and reconnect-after-expiry
  are exercised on a real device;
- CMS never labels socket fan-out as display acknowledgement and exposes every
  offline/unknown target;
- organization deletion removes takeover, target, audit, and outbox data;
- alert regression tests still prove a normal `alert` app instance follows its
  playlist order/duration and does not acquire takeover controls;
- product/security/HSE reviewers approve the operational runbook and the
  non-replacement disclaimer;
- only after all gates pass may product copy mention “emergency takeover”, and
  then only with the exact offline and certification limitations above.

## Consequences

The design adds more persistence and a dedicated delivery protocol instead of
turning Alert into a global button. That cost buys deterministic target scope,
bounded offline behavior, proof that distinguishes send from display, and an
audit trail. A player that is already offline remains unreachable; mandatory
expiry makes that limitation explicit and prevents stale instructions from
surviving forever.

The ordinary safety pilot remains sellable before CORE-04 as a planned
information board. Its value does not depend on representing the product as an
emergency control system.

## Open product questions (not implementation ambiguity)

1. Which customer role names should map to the five emergency permissions once
   CORE-06 site RBAC exists?
2. What organization screen-count ceiling and fan-out latency SLO will the first
   signed pilot require? Activation must fail visibly above the supported limit;
   it must never truncate.
3. Does the first pilot require two-person approval for priority 100, or is
   recent admin re-authentication sufficient? This changes governance, not the
   player expiry contract.
4. What audit-export and retention policy does the customer's legal/HSE process
   require before production enablement?
5. Which supported Android device/OS combinations must be included in the
   offline clock-change and reboot certification matrix?
