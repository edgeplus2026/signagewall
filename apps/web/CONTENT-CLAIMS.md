# SEO content claim policy

Repository code is the source of truth for product capabilities. Marketing copy
must describe what a user can do in the current implementation, not what appears
in a backlog, an old operator note, or a generic digital-signage feature list.

## Safe product claims

| Capability                  | Safe wording                                                                                                            | Source of truth                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Screen content              | A screen can rotate media, playlists and app instances. Items have an order, duration and enabled state.                | `apps/be/src/modules/screens/schemas/screen.schema.ts`                                                                   |
| Multiple screens            | The same content can be assigned to multiple explicitly selected screens.                                               | `apps/be/src/modules/screens/screens.controller.ts`                                                                      |
| Live updates                | A content change sends a new snapshot to a connected player.                                                            | `apps/be/src/modules/player/player.gateway.ts`                                                                           |
| Device health               | The CMS exposes online/offline state, last seen and the paired device profile.                                          | `apps/be/src/modules/player/player.service.ts`                                                                           |
| Working hours               | A screen can use always-on, weekly or special-date working hours. Outside that window the player renders black standby. | `apps/be/src/modules/screens/schemas/screen.schema.ts`, `apps/player/src/sync/availability.ts`                           |
| Offline media               | The last snapshot is persisted and media is prefetched. Apps marked as network-only are skipped while offline.          | `apps/player/src/persistence/idb.ts`, `apps/player/src/sync/prefetch.ts`, `apps/player/src/engine/network-apps.ts`       |
| Pairing                     | A player shows a six-character registration code that an operator enters in the CMS.                                    | `apps/player/src/ui/PairingScreen.tsx`                                                                                   |
| Menu board                  | Menu items can be entered manually, imported once from CSV, or synced from Google Sheets or Excel.                      | `packages/apps/src/menu/manifest.ts`                                                                                     |
| Google Sheets               | A connected Google Sheet can be shown as an A1 range in table or KPI form and is refreshed by the connector.            | `packages/apps/src/gsheets/manifest.ts`                                                                                  |
| Calendars                   | Connected Google and Outlook calendars are read-only and support day, week, month and schedule views.                   | `packages/apps/src/gcal/manifest.ts`, `packages/apps/src/outlook/manifest.ts`                                            |
| Public dashboards           | Power BI requires a public “Publish to web” URL; the Web app requires a public page that permits iframe embedding.      | `packages/apps/src/powerbi/manifest.ts`, `packages/apps/src/web/manifest.ts`                                             |
| Documents and presentations | PDF, Google Slides and PowerPoint content can be displayed using their documented upload or account connection flow.    | `packages/apps/src/pdf/manifest.ts`, `packages/apps/src/gslides/manifest.ts`, `packages/apps/src/powerpoint/manifest.ts` |

App-specific copy must also be checked against the matching manifest in
`packages/apps/src/<app>/manifest.ts`.

## Claims that are not allowed

Do not claim that SignageWall currently provides:

- content dayparting, per-item schedules, campaign start/end dates or automatic
  breakfast/lunch/evening playlist switching;
- saved screen groups, location tags or “publish to every branch in one click”;
- arbitrary multi-zone or split-screen layouts;
- emergency takeover behavior for the Alert app;
- per-screen or per-location roles, approval workflows or granular permissions;
- QR-code device pairing;
- content rollback, proof-of-play, impressions or built-in QR scan analytics;
- native POS, PMS, ERP, MES, SIS, booking, queue or flight-data integrations;
- brightness control or physical TV power control;
- a global brand-kit or white-label system;
- offline support for every app;
- a guaranteed business result, customer result, hardware lifespan or capacity
  that has not been measured and documented.

Examples and calculations must be labelled as illustrative. A suggested
workflow is not a customer case study, and an outcome to measure is not a result
the product promises.
