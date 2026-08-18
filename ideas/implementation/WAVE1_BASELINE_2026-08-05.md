> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../README.md).

# Wave 1 implementation baseline — 5 August 2026

This is the coordinator handoff for Wave 1 of
[`../OPS_PRODUCT_IMPLEMENTATION_PLAN.md`](../OPS_PRODUCT_IMPLEMENTATION_PLAN.md).

## Frozen contracts

Until the Wave 1 integration review, use the section 5 planning contracts for:

- `OpsBoardConfig`, including manual `rows`;
- `OpsBoardPayload` and normalized statuses;
- `PrivateAssetRef` and `HydratedPrivateAssetRef`;
- secure Power BI planning payload/state.

Feature agents must report a required contract change to the coordinator rather
than independently changing shared indexes or consumers.

## Repository baseline

Before Wave 1 source edits, the worktree contained only the strategy documents:

- modified `ideas/MARKETING_PLAN.md`;
- untracked `ideas/OPS_PRODUCT_IMPLEMENTATION_PLAN.md`.

`pnpm test` exits successfully. The replayed package results include:

- backend: 25 suites, 282 tests passed;
- player: 24 files, 228 tests passed;
- player contract: 1 file, 32 tests passed.

`pnpm type-check` has a known baseline failure in `@signagewall/apps`:

```text
packages/apps/vite.embeds.config.ts(3,10): TS2305 — node:module has no exported member createRequire
packages/apps/vite.embeds.config.ts(3,31): TS2497 — module import compatibility
```

Do not attribute this existing error to Wave 1. New work must still pass focused
package tests/builds, and the integration pass must prove it introduces no
additional type errors.

## Local integration prerequisites

Only presence/absence was checked; no secret values were printed or recorded.

- public R2 configuration: present;
- Microsoft OAuth configuration: absent in the local backend `.env`;
- `ENCRYPTION_KEY`: absent in the local backend `.env`;
- separate private R2 bucket configuration: not yet defined;
- real Power BI capacity-backed test workspace: not yet confirmed.

Consequences:

- OpsBoard manual mode can be tested locally immediately;
- connected Sheets/Excel needs suitable OAuth configuration or mocked tests;
- SEC-01 can implement and test the private storage abstraction with mocks, but
  a real private-bucket smoke test waits for coordinator configuration;
- Secure Power BI cannot pass its real-tenant release gate in the current local
  configuration.

## Active Wave 1 tickets

- `OPS-01` — end-to-end OpsBoard app/connector/tests;
- `SEC-01` — tenant-private asset delivery foundation/tests;
- `CORE-01` — site/screen-group ADR and repository impact map;
- `INT-01` — coordinator integration after all three handoffs.

