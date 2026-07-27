# Edge Apps — Integration Backlog

> How to add new signage "apps", plus a prioritized catalog of apps to build.
> Companion to [`README.md`](./README.md) (the package layout) and
> [`OPERATOR.md`](./OPERATOR.md) (what an operator must set up per app — env, keys, OAuth,
> approvals) — this file is the *roadmap*.

## 0. Current state

EdgeRize is a digital-signage platform (edge-be NestJS + edge-cms React + edge-player Preact PWA).
"Apps" are the content-widget plugins that play on screens. The system is **fully data-driven**: the
CMS and player contain **zero per-app code**. Adding an app is done almost entirely in this package
(`edge/packages/apps/`) plus an optional backend connector.

**37 apps ship today** (all `runtimeKind: 'embed'`):
- `static` (config only, no server): `clock`, `worldclock`, `text`, `ticker`, `qr`, `countdown`,
  `menu`, `alert` (Emergency Alert), `web`, `dashboard`, `powerbi`, `youtube`, `vimeo`, `stream`,
  `livechannel` (Twitch/Kick)
- `server` (backend connector): `weather`, `airquality`, `sunmoon` (all Open-Meteo), `currency`
  (ECB/Frankfurter), `crypto` (CoinGecko), `power-prices` (Energinet), `holidays` (Nager.Date),
  `onthisday` (Wikipedia), `wisdom` (quotes), `sports` (TheSportsDB, free-key default), `rss`, `news`
  (curated RSS presets), and `stocks` (Alpaca — needs `ALPACA_API_KEY_ID` + `ALPACA_API_SECRET_KEY`)
- `connected` (OAuth account): `gcal` (Google Calendar), `gsheets` (Google Sheets), `gslides` (Google
  Slides), `outlook` (Outlook Calendar), `teams` (Microsoft Teams), `instagram` + `facebook`
  (Meta), `canva`

**Shipped in the current push:** all of **Tier 1** (§4) + the keyless **Tier 2** server apps, plus the
`datetime` config field type (enabler E4a). Remaining work is marked below — ✅ = shipped.

**Latest addition — Social tier (E2):** the **Meta OAuth provider** (Facebook Login → long-lived token,
no refresh token — re-extended proactively) plus the first two social apps, **Instagram** and
**Facebook Page**. Both normalize to a shared `SocialPayload` and share one spotlight/grid embed
renderer (`embeds/_shared/social-feed.ts`). Code + mocked tests ship now; using them against accounts
you don't own still requires the operator to clear Meta **App Review + Business verification** (external,
weeks) and set `META_CLIENT_ID`/`SECRET`.

**Also shipped — Microsoft Teams (`teams`):** a channel-messages feed on the already-shipped Microsoft
provider (E1). A channel is a feed of authored posts, so it reuses the same `SocialPayload` + social-feed
renderer (`SocialPost` gained an optional `author` byline). The picker flattens the user's joined teams ×
channels into one "Team · Channel" dropdown. Reading messages needs the `ChannelMessage.Read.All` scope,
which requires **Azure AD admin consent** (documented); no new backend enabler.

## 1. How the app system works (read once)

An app is split across at most three places, joined **only by its `slug`**:

| Layer | Location | Needed for |
|---|---|---|
| Manifest + render bundle | `edge/packages/apps/` (`@edge/apps`) | **every** app |
| Backend connector | `edge/apps/be/src/modules/apps/connectors/` | `server` + `connected` apps |
| OAuth provider | `edge/apps/be/src/modules/connections/providers/` | `connected` apps (only if a *new* provider) |

- **`runtimeKind`** is `'embed'` for every shipped app (a sandboxed iframe HTML/TS bundle). `'native'`
  exists in the type but is unused — ignore it.
- **`dataSource`** decides the work: `static` (no connector), `server` (connector fetches public
  data), `connected` (connector + OAuth).
- The **CMS config form is generic** — it renders from the manifest's `configSchema` and validates with
  the same `buildConfigZod` the backend uses. **No per-app form code.**
- The **CMS live preview and the player renderer both mount the same embed bundle** over a shared
  `postMessage` protocol (`@edge/apps-contract/host-protocol.ts`). **No per-app render component.**
- App data reaches the player inside the **snapshot** (`AppRenderable.data`), populated from a
  **global, cross-org connector cache** keyed by `cacheKey` — so N screens on the same feed cost one
  upstream fetch. The scheduler (`app-data.scheduler.ts`, every 60s) refreshes due cache keys at each
  manifest's `refreshSeconds` cadence.

## 2. The recipe — add an app (canonical steps)

> Every catalog item below only lists what's *app-specific*; the mechanics are here.

### A. Shared package (all apps) — `edge/packages/apps/`
1. **Manifest** `src/<slug>/manifest.ts` — export `const <slug>Manifest: AppManifest` with `slug`,
   `name`, `tagline`, `description`, `runtimeKind: 'embed'`, `dataSource`, `version: 1`, `configSchema`
   (see field types below), inline SVG `icon`, hex `color`. Add `refreshSeconds` for server/connected;
   set `requiresNetwork: true` when the app renders live remote content with nothing cached (iframe,
   video stream). Model it on [`src/weather/manifest.ts`](./src/weather/manifest.ts) (server) /
   [`src/youtube/manifest.ts`](./src/youtube/manifest.ts) (static) / [`src/canva/manifest.ts`](./src/canva/manifest.ts) (connected).
2. **Register** in `src/index.ts` — add to the `APP_MANIFESTS` array **and** the re-export block.
3. **(data apps) Payload type** `src/<slug>/payload.ts` — the normalized shape the connector returns
   and the bundle consumes; export it from `src/index.ts`.
4. **Render bundle** `embeds/<slug>/`:
   - `index.html` — `<div id="app"></div>` + `<script type="module" src="./main.ts">` (copy
     [`embeds/text/index.html`](./embeds/text/index.html)).
   - `main.ts` — call `connectToHost(({config, data, meta}) => render(...))` from
     `../_shared/host-bridge.js`; import `../_shared/base.css` **before** `./style.css` (cascade is
     source-ordered). Media apps that emit audio must gate playback on the `onActive` callback.
   - `style.css` (+ optional `templates/` for multiple layouts selected by a `displayMode` field).
   - Reuse shared helpers: `_shared/style-fields.ts` (typography fields), `_shared/theme.ts`,
     `_shared/freshness.ts` (stale/"updated X ago" footer), `_shared/qr.ts`, `_shared/color.ts`.
   - **No build-config edit** — `vite.embeds.config.ts` auto-discovers any `embeds/<slug>/index.html`.

### B. Backend connector (server / connected only) — `edge/apps/be/src/modules/apps/connectors/`
5. `<slug>.connector.ts` — export `const <slug>Connector: AppConnector<Config, Payload>`:
   - `cacheKey(config)` — **coarse & display-agnostic** for `server` (e.g. `fx:EUR:USD,GBP`); **must
     include `connectionId`** for `connected` (private data must never be shared across accounts).
   - `fetchData(config, ctx)` → `{ playerPayload }`. Use `ctx.signal` for aborts. For async/slow jobs
     return `{ pending: true, secrets }` and resume next tick (see `canva.connector.ts` state machine).
     Keep payloads free of volatile fields (rotating URLs, timestamps) **or** set `version` — else the
     app fans out to every screen on every refresh.
   - Use **`safeFetchText`** (`connectors/safe-fetch.util.ts`) for any operator-supplied URL (SSRF
     guard: blocks private IPs/redirects, caps body). Add `oauth` for connected apps; `timeoutMs` if slow.
6. **Register** in `connectors/connector-registry.ts` — one import + one entry in `CONNECTORS` (keyed by
   slug). No module edit; scheduling/caching become automatic.
7. **(keyed public API)** read the key from `process.env` in the connector and document the env var.
   ⚠️ No connector does this yet — establish the convention first (**Enabler E5**).

### C. Connected-app extras
8. **Reusing `google`** (calendar/sheets/slides/photos): add scopes to `oauth.scopes`; to pick a
   resource add a `remote-select` field (`remoteSource`) + a `case` in
   `ConnectionsService.browseRemoteOptions` + a helper in `providers/google-api.ts`.
9. **New provider** (`microsoft`, `meta`, `slack`, …): see **Enablers E1–E3**.

### D. New config field type (only if `configSchema` needs a type not in the list)
Field types today (`apps-contract/src/field-schema.ts`): `text, textarea, url, number, select,
multiselect, checkbox, switch, image, color, oauth, location, richtext, datetime, remote-select`. To add one:
(1) extend the `FieldType` union + `buildFieldZod` (+ `buildDefaultConfig`); (2) add a control to CMS
`features/apps/config-form/fieldRegistry.ts` + a component. See **Enabler E4**.

### E. Publish, build & verify (per app)
10. **Build embeds:** `pnpm --filter @edge/apps build` (bundles → `apps/player/public/apps` and
    mirrored to `apps/cms/public/apps`).
11. **If backend endpoints changed** (new browse route, etc.): `pnpm --filter be openapi:export` then
    `pnpm --filter cms generate:api-types`.
12. **Publish (super-admin):** `POST /admin/apps { slug }` (technical fields auto-copied from the
    manifest), set `categoryIds`, then `PATCH /admin/apps/:id/visibility { isPublic: true }`.
    `syncManifestDefinitions()` keeps the definition in lockstep on every boot.
13. **Tests:** add a case to `connectors/connectors.spec.ts` (cacheKey invariants + payload shape) for
    data apps.

### F. End-to-end verification
- `pnpm dev` (turbo runs be + cms + player), or per-app: be `start:dev`, cms `dev`, player `dev`, and
  `pnpm --filter @edge/apps build:embeds` after bundle edits.
- CMS → open app → create instance → fill config → **live preview renders** (identical to player); for
  data apps confirm `POST /apps/:slug/preview-data` returns data.
- Publish → org **install** → create instance → **add to a screen/playlist** → open the player → confirm
  it renders and (data apps) refreshes on cadence.
- `pnpm --filter @edge/apps type-check` and `pnpm --filter be test`.

## 3. Enabler tasks (cross-cutting — unblock multiple apps)

| ID | Task | Effort | Unblocks |
|---|---|---|---|
| **E0** ✅ | **Base categories seeded on boot** — `AppCategoriesService.onModuleInit` → `seedBaseCategories()` ensures *Information, Finance, Productivity, Data & Dashboards, Media, Social, Utilities* exist (idempotent by slug, additive, duplicate-key-safe; never overwrites a super-admin's rename/reorder). Assigning apps to categories stays a curation step (`PATCH /admin/apps/:id`) — categories are catalog presentation, not part of a manifest. | S | catalog organization |
| **E1** ✅ | **Microsoft (Azure AD / MS Graph) OAuth provider** — shipped: `ConnectionProvider.MICROSOFT`, `microsoft.oauth.ts` (v2 `common` authority, `offline_access`), `microsoft-api.ts`, `ConnectionsService` wiring (`getProvider` + `PROVIDER_CONFIG_NS` + `ms-calendars` browse), `MICROSOFT_CLIENT_ID`/`SECRET`, CMS provider union. | L | Outlook ✅; Teams, SharePoint/PowerPoint, Power BI now unblocked |
| **E2** ✅ (code) | **Meta (Facebook/Instagram Graph) OAuth provider** — shipped: `ConnectionProvider.META`, `meta.oauth.ts` (Facebook Login; code→short→long-lived token, **no refresh token** so the long-lived token is re-extended proactively), `meta-api.ts` (`me/accounts` page + linked-IG pickers, page-token resolver), `ConnectionsService` wiring (`getProvider` + `PROVIDER_CONFIG_NS` + `meta-pages`/`meta-ig-accounts` browse), `META_CLIENT_ID`/`SECRET`, CMS provider union. **Still needs the operator** to create a Meta app + clear App Review / Business verification (external, weeks). | L (external approval) | Instagram ✅, Facebook Page ✅ |
| **E3** | **Slack OAuth provider** (`conversations.history` scope). | M | Slack channel app |
| **E4a** ✅ | **`datetime` field type** — native date/time picker, stored as a local `YYYY-MM-DDTHH:MM` string. Shipped: contract union + zod (string-like) + CMS `DateTimeControl`; used by the Countdown `target`. | S | Countdown (done) |
| **E4b** ✅ | **`repeater` field type** — an add/remove/reorder row editor (each row a set of typed sub-fields via `field.fields`). Shipped: contract union + zod + CMS `RepeaterControl`. Adopted by Menu, Ticker, World clocks and Stocks (each keeps a legacy string/textarea fallback so saved configs don't break). | M | Menu, Ticker, World clocks, Stocks (done) |
| **E5** ✅ | **Keyed-connector convention** — `requireConnectorKey(name)` in `connectors/env.util.ts` reads a key from the backend env and throws cleanly when it's missing (the host then keeps last-known-good). Keys live in `.env` / `.env.example`. Shipped; used by Stocks. | S–M | sports, transit (keyed) now unblocked |
| **E6** ✅ | Refreshed [`README.md`](./README.md) to current reality (`embeds/<slug>/` bundles, the three app kinds, the build/preview pipeline, a BACKLOG pointer). | S | docs accuracy |
| **E7** | **Connector→R2 asset persistence ✅ shipped** — `AssetMirror` (`connectors/_shared/asset-mirror.registry.ts`, implemented by `AssetMirrorService` in MediaModule) lets a connector hand over a list of image URLs and get back permanent R2 keys/URLs, re-encoded to WebP with https + size + timeout guards. Reached via the same DI service-locator bridge as `PptxRenderer`, so `ConnectorContext` stays provider-neutral. First consumer: Google Slides (18), whose thumbnail URLs expire in ~30 min. Providers that hand back an *authenticated* file (Power BI Export-to-file, SharePoint/PowerPoint export) still need a **binary** variant — `mirrorImages` takes URLs it can fetch anonymously, not a token-authenticated download. | M | private Power BI (21b), SharePoint/PowerPoint (22) |

## 4. App catalog (prioritized)

Effort: **S** ≈ ≤1 day · **M** ≈ 1–3 days · **L** ≈ 1–2 wks (often gated by approvals).
"Depends" references enabler IDs. Priority = build order within the tier.

### Summary

> ✅ = shipped.

| # | App | Slug | dataSource | Category | Effort | Depends |
|---|---|---|---|---|---|---|
| **Tier 1 — static, no backend (ship first)** ||||||
| 1 | Countdown / Timer ✅ | `countdown` | static | Utilities | S | E4a ✅ |
| 2 | Vimeo ✅ | `vimeo` | static | Media | S | — |
| 4 | Dashboard embed (public) ✅ | `dashboard` | static | Data & Dashboards | S | — |
| 5 | Live stream (HLS) ✅ | `stream` | static | Media | S–M | — |
| 6 | Menu board / price list ✅ | `menu` | static | Utilities | M | E4b ✅ |
| 7 | Announcement ticker ✅ | `ticker` | static | Information | S–M | E4b ✅ |
| 8 | World clocks ✅ | `worldclock` | static | Utilities | S–M | E4b ✅ |
| **Tier 2 — server connectors, public/keyless APIs** ||||||
| 9 | Air quality ✅ | `airquality` | server | Information | M | — |
| 10 | Currency / FX ✅ | `currency` | server | Finance | M | — |
| 11 | Crypto prices ✅ | `crypto` | server | Finance | M | — |
| 12 | Electricity spot prices ✅ | `power-prices` | server | Finance | M | — |
| 13 | Stocks ✅ | `stocks` | server | Finance | M–L | E5 ✅ |
| 14 | Sports ✅ | `sports` | server | Information | L | E5 ✅ (free-key default) |
| 15 | Transit departures | `transit` | server | Information | L | E5 (region-specific) |
| 16 | News headlines ✅ | `news` | server | Information | S–M | (RSS-preset variant) |
| **Added since — keyless server apps (shipped)** ||||||
| 30 | Public holidays ✅ | `holidays` | server | Information | M | — |
| 31 | On this day ✅ | `onthisday` | server | Information | M | — |
| 32 | Quotes / wisdom ✅ | `wisdom` | server | Information | M | — |
| 33 | Sun & Moon ✅ | `sunmoon` | server | Information | M | — |
| **Tier 3 — connected, reuse Google provider** ||||||
| 17 | Google Sheets (KPI/table) ✅ | `gsheets` | connected | Data & Dashboards | M | — |
| 18 | Google Slides ✅ | `gslides` | connected | Productivity | M–L | — |
| 19 | Google Photos album ⛔ | `gphotos` | connected | Media | — | blocked (API) |
| **Tier 4 — connected, new providers** ||||||
| 20 | Outlook / M365 Calendar ✅ | `outlook` | connected | Productivity | M | E1 ✅ |
| 21 | Power BI (publish-to-web) ✅ | `powerbi` | static | Data & Dashboards | S | — |
| 21b | Power BI (private, capacity) | `powerbi-embed` | connected | Data & Dashboards | L | E1 + capacity + R2-from-connector enabler |
| 22 | SharePoint / PowerPoint | `sharepoint` | connected | Productivity | L | E1 |
| 23 | Microsoft Teams ✅ | `teams` | connected | Productivity | L | E1 ✅ |
| 24 | Slack channel | `slack` | connected | Productivity | M–L | E3 |
| **Tier 5 — social (approval / cost gated)** ||||||
| 25 | Instagram | `instagram` | connected | Social | L | E2 ✅ (code) |
| 26 | Facebook Page | `facebook` | connected | Social | L | E2 ✅ (code) |
| 27 | LinkedIn company page ✅ | `linkedin` | connected | Social | L | E2 ✅ (code) — new provider |
| 28 | X / Twitter | `twitter` | connected | Social | L | new provider (**paid API**) |
| 29 | TikTok | `tiktok` | connected | Social | L | new provider |

### Tier 1 — static quick wins

**1. Countdown / Timer** (`countdown`, static) — ✅ shipped
Counts down to (or up from) an event. **Config:** `title` (text), `target` (**datetime** — native
picker, E4a ✅), `mode` (select: down/up), `finishedText` (text), `showLabels` (switch), theme +
`styleFields`. **Render:** compute remaining d/h/m/s client-side, drift-free tick (build-once/patch).
`requiresNetwork: false`. Broad appeal (events, "days since incident", launches).

**2. Vimeo** (`vimeo`, static, `requiresNetwork: true`)
Vimeo analogue of YouTube. **Config:** `url` (url, vimeo pattern), `autoplay/loop/muted` (switch).
**Render:** Vimeo player iframe; gate audio on `onActive` (double-buffer safe, like YouTube).

**4. Dashboard embed** (`dashboard`, static, `requiresNetwork: true`)
A hardened, auto-refreshing `web` app tuned for **Grafana / Looker Studio / Power BI "publish to web" /
public dashboards**. **Config:** `url` (url), `refreshMinutes` (number, reload cadence), `fit`
(select: fit-width/contain/actual). **Render:** iframe + periodic reload. (Authed dashboards → #21.)

**5. Live stream (HLS)** (`stream`, static, `requiresNetwork: true`)
Lobby/live camera/event streams. **Config:** `streamUrl` (url, `.m3u8`), `muted` (switch), `fit`
(select). **Render:** native HLS where supported, else bundle `hls.js`; gate audio on `onActive`.

**6. Menu board / price list** (`menu`, static)
High value for retail/hospitality/cafeteria. **Config:** `heading` (text), `items` (repeater:
name/price/description/tag — **MVP:** `textarea`, one `Name | Price | Note` per line), `columns`
(select), theme. **Render:** styled columns. Needs E4b for the nice editor.

**7. Announcement ticker** (`ticker`, static)
Scrolling message band. **Config:** `messages` (repeater — **MVP:** `textarea` lines), `speed`
(select), `direction` (select), `position` (select: bottom/top band), colors. **Render:** CSS marquee.

**8. World clocks** (`worldclock`, static)
Multi-timezone clock (extends `clock`). **Config:** `cities` (repeater: label + IANA timezone — **MVP:**
3 fixed label+select slots), `format` (12/24h), `face` (analog/digital). **Render:** `Intl.DateTimeFormat`
per zone. *(Could instead be a `clock` enhancement — decide at build time.)*

### Tier 2 — server connectors (public APIs)

**9. Air quality** (`airquality`, server) — **Open-Meteo Air Quality API, no key** (pairs with weather).
`cacheKey` `aq:<lat>,<lng>`. `refreshSeconds` 900. **Config:** `location` (location), `pollutants`
(multiselect: PM2.5/PM10/O₃/NO₂), `theme`. **Payload:** AQI + per-pollutant values + band.

**10. Currency / FX** (`currency`, server) — **Frankfurter.app / ECB, no key**. `cacheKey`
`fx:<base>:<symbols>`. `refreshSeconds` 3600. **Config:** `base` (select), `targets` (multiselect),
`layout` (rates board / single pair). **Payload:** base + rates map + as-of date.

**11. Crypto prices** (`crypto`, server) — **CoinGecko free (no key, rate-limited — respect limits)**.
`cacheKey` `crypto:<coins>:<vs>`. `refreshSeconds` 300–600. **Config:** `coins` (multiselect from top
list), `vs` (select fiat), `layout` (ticker/cards), `showChange` (switch). **Payload:** per-coin
price + 24h %.

**12. Electricity spot prices** (`power-prices`, server) — **Energinet `energydataservice.dk`
(Denmark, open, no key)**; ENTSO-E (free token) as multi-country fallback. **Verdo-relevant.**
`cacheKey` `power:<zone>`. `refreshSeconds` 900–3600. **Config:** `area` (select: DK1/DK2/…),
`currency` (select), `includeVat`/`includeTariffs` (switch), `layout` (now + today's hourly curve).
**Payload:** current price + hourly series + unit.

**13. Stocks** (`stocks`, server) — ✅ shipped. **Alpaca** market data (`/v2/stocks/snapshots`;
commercial-friendly, free tier = IEX) via enabler E5 — needs `ALPACA_API_KEY_ID` +
`ALPACA_API_SECRET_KEY`. `cacheKey stocks:<sorted tickers>`, `refreshSeconds` 300; ONE call for all
tickers (capped at 15), change computed vs the previous close, unknown tickers dropped, 401/403
surfaced. **Config:** `symbols` (repeater, E4b), `showChange`, theme. Missing credentials → the
connector throws and the screen holds its last quotes. (Finnhub was dropped — its free tier forbids
commercial use; a keyless CSV source, Stooq, 404'd — hence Alpaca.)

**14. Sports** (`sports`, server) — ✅ shipped. **TheSportsDB** (`THESPORTSDB_API_KEY`, defaults to the
free public test key — works out of the box, upgradeable via E5). Resolves a team by name, then fetches
upcoming fixtures + recent results in parallel; either endpoint failing degrades to an empty section.
`cacheKey sports:<team>` (team-only; `mode`/`count` display-only), `refreshSeconds` 600. **Payload:**
`{team, upcoming[], results[]}` (scores on results).

**15. Transit departures** (`transit`, server) — **region-specific** (Rejseplanen (DK), GTFS-RT,
Nordic transit APIs; some keyed). **Depends E5; advanced.** `cacheKey` `transit:<stop>`.
`refreshSeconds` 30–60. **Config:** stop/station pick, line filter, count. **Payload:** next
departures with delays.

**16. News headlines** (`news`, server) ✅ — the RSS-enhancement route, shipped. A curated `select` of
known publishers (BBC top/world/business/tech/sport, Sky, NPR, Al Jazeera, Fox, CNBC, ESPN, TechCrunch,
The Verge, Hacker News, Guardian) whose option VALUE is the feed URL, stored under the `url` key — so it
rides the **existing `rss` connector unchanged** (registered under the `news` slug) and reuses the `rss`
embed wholesale (`embeds/news/main.ts` = `import '../rss/main.js'`). Same `rss:<hash(url)>` cache key, so
a `news` and an `rss` instance on the same feed share one fetch. Feeds live in `src/news/sources.ts`
(add/retire there; a test asserts they're unique https URLs). A keyed variant (NewsAPI/GNews) remains an
alternative if editorial control is ever needed.

### Added since — keyless server apps (shipped ✅)

**30. Public holidays** (`holidays`, server) — ✅ shipped. **Nager.Date** (`NextPublicHolidays/{country}`,
no key). `cacheKey` `holidays:<country>`. `refreshSeconds` 21600. **Config:** `country` (select),
`count` (display-only), theme + `styleFields`. **Payload:** upcoming holidays `{date, name, localName}`,
soonest-first. **Embed:** list with formatted date + relative "in N days", local name primary.

**31. On this day** (`onthisday`, server) — ✅ shipped. **Wikipedia On This Day feed**
(`/{lang}.wikipedia.org/api/rest_v1/feed/onthisday/events/{MM}/{DD}`, no key; sends a `User-Agent`).
"Today" is resolved server-side, so `cacheKey` is `onthisday:<lang>` (count display-only).
`refreshSeconds` 21600 → rolls to the new day on its own. **Config:** `language` (en/de/es/fr), `count`,
theme + `styleFields`. **Payload:** `{monthDay, events:[{year, text}]}`, most-recent-first.

**32. Daily Wisdom** (`wisdom`, server) — ✅ shipped. A category-driven quote board, **keyless and
offline**: the connector selects from a vendored ~4,900-quote corpus (`connectors/wisdom/quotes.json`,
copied via `nest-cli.json` assets) per category set under one cache key, with a **date-seeded** pick so
the batch is stable within a day and turns over daily (`refreshSeconds` 86400). `cacheKey`
`wisdom:v2:<sorted categories>`; `quoteCount` / `secondsPerQuote` are display-only. The embed rotates
quotes through a set of designs. See `src/wisdom/` + `embeds/wisdom/`.

**33. Sun & Moon** (`sunmoon`, server) — ✅ shipped. **Open-Meteo** daily sun (no key), the same
provider as Weather / Air quality. `cacheKey sun:<lat>,<lng>` (location-only); `refreshSeconds` 21600.
**Payload:** `{location, sunrise, sunset, daylightSeconds, observedAt}` (place-local ISO). **Embed:**
sunrise/sunset, day length, a live sunrise→sunset progress bar, and the current **moon phase** computed
client-side (location-independent, so it isn't in the payload). No fetch timestamp.

### Tier 3 — connected (reuse Google provider)

**17. Google Sheets (KPI / table)** (`gsheets`, connected) — ✅ shipped. Reuses the Google OAuth;
connector scopes `drive.metadata.readonly` + `spreadsheets.readonly`. Browse via `remote-select`
`google-sheets` (a `browseRemoteOptions` case → `listGoogleSpreadsheets` in `google-api.ts`, a Drive
list); reads a range via the Sheets API. `cacheKey gsheets:<connId>:<sheetId>:<range>` (per-connection;
`layout`/`hasHeader` display-only). **Config:** account, spreadsheet, range, `layout` (table / KPI),
`hasHeader`, theme. **Needs** `GOOGLE_CLIENT_ID`/`SECRET` + `ENCRYPTION_KEY` on the backend (same
prerequisite as Calendar).

**18. Google Slides** (`gslides`, connected) — ✅ shipped. Google OAuth; connector scopes
`presentations.readonly` + `drive.metadata.readonly`. `remote-select` `google-presentations` (Drive
list). Reads the deck's page ids, exports each as a thumbnail via the Slides API, then **mirrors the
images to R2 via E7** and serves the permanent URLs; the embed loops them.
`cacheKey gslides:<connId>:<presentationId>`. Change detection keys on the Drive revision (`version`,
falling back to `modifiedTime`), which is also the payload `version` — an unchanged deck costs one
metadata call per poll instead of one export per slide. **Live sync** via a Drive `files.watch` channel
the connector registers itself (`webhookPath: webhooks/google/drive`), with the 900s poll as fallback
and channel renewal. `requiresNetwork: false` — mirrored slides cache and play offline. Needs
`GOOGLE_CLIENT_ID`/`SECRET` + `ENCRYPTION_KEY` + R2.

**19. Google Photos album** (`gphotos`, connected) — ⛔ **blocked, not viable.** Google restricted the
Photos Library API on 2025-03-31: `photoslibrary.readonly` now returns 403 and apps can only read
*app-created* media, not a user's own albums. Accessing a user's library requires the interactive
**Picker API**, which doesn't fit a background-refreshing signage app. Revisit only if Google restores
library read access. (Docs: developers.google.com/photos/support/updates.)

### Tier 4 — connected (new providers)

**20. Outlook / M365 Calendar** (`outlook`, connected) — ✅ shipped (on E1 ✅). Microsoft Graph
`calendarView` (scope `Calendars.Read`), `remote-select` `ms-calendars`. Normalizes Graph events to the
shared `GcalPayload`, so `embeds/outlook` **reuses the gcal embed** wholesale (its config keys mirror
gcal's). `cacheKey outlook:<connId>:<calId>`. Needs `MICROSOFT_CLIENT_ID`/`SECRET` + `ENCRYPTION_KEY`.

**21. Power BI** (`powerbi`, **static**) — ✅ shipped as a **publish-to-web wrapper**, a publish-to-web
wrapper like the `dashboard` app. The operator uses Power BI's "Publish to web", pastes the
`app.powerbi.com/view?r=…` link; the embed validates the `*.powerbi.com` host and renders it in a
sandboxed iframe with an optional reload cadence. No OAuth, no capacity. `url` (pattern-validated) +
`refreshMinutes`. Chosen deliberately (see below): private-report embedding is impossible without a
capacity, and this ships real value today.

**21b. Power BI — private (`powerbi-embed`, connected)** — **not built; deferred.** Embedding a
*private* report needs a Power BI **capacity** (Premium P/EM, Fabric F, or Embedded A SKU) no matter the
route: Export-to-file (`POST /reports/{id}/ExportTo` → PNG, scopes `Report.Read.All` + `Dataset.Read.All`)
is capacity-gated AND needs a new enabler (connectors can't persist a binary to R2 today — Google Slides
sidestepped this with Google's own thumbnail URLs, which Power BI has no equivalent of); the live-embed
route needs a capacity + a service principal and puts a token in the snapshot. Build only for an org that
has a capacity. Until then, `powerbi` (public) + the `dashboard` app cover the no-capacity case.

**22. SharePoint / PowerPoint** (`sharepoint`, connected) — **Depends E1 + E7**. Graph `Files.Read`; show a
PPT/PDF from OneDrive/SharePoint. The file comes back as an *authenticated* download, so — like private
Power BI — it needs the **connector→R2 enabler (E7)** to re-host page images the player can load.
`cacheKey` `sharepoint:<connId>:<fileId>`.

**23. Microsoft Teams** (`teams`, connected) ✅ — Microsoft provider (E1). Reads a channel's recent
messages via Graph `/teams/{team}/channels/{channel}/messages` (scopes `Team.ReadBasic.All`,
`Channel.ReadBasic.All`, `ChannelMessage.Read.All` — the last needs **Azure AD admin consent**; no
personal accounts). The picker (`remote-select` `ms-teams-channels`) flattens joined teams × channels
into one "Team · Channel" list; the composite id is split in the connector. Messages normalize to the
shared `SocialPayload` (HTML stripped, subject folded in, `author` byline; system/deleted messages
dropped) and render through the social-feed embed. `cacheKey` `teams:<connId>:<teamId>:<channelId>`,
`refreshSeconds` 300. Stable payload (no rotating URLs) → no `version`, no fan-out.

**24. Slack channel** (`slack`, connected) — **Depends E3**. `conversations.history`. Show latest
channel messages/announcements. `cacheKey` `slack:<connId>:<channelId>`. `refreshSeconds` 60–300.

### Tier 5 — social (approval / cost gated — schedule opportunistically)

**25. Instagram** (`instagram`, connected) ✅ (code) — Meta provider. Reads a professional (Business/
Creator) IG account's recent media via Graph `/{ig-user-id}/media` (scopes `instagram_basic`,
`pages_show_list`). Picker `remote-select` `meta-ig-accounts`. `cacheKey` `instagram:<connId>:<igId>`,
`refreshSeconds` 900. **No `version`** — `media_url` is a rotating CDN link, so the payload fans out to
keep images live (same deliberate call as `gslides`). Renders via the shared spotlight/grid embed.
Using it against accounts you don't own needs Meta App Review (`instagram_basic`) + Business verification.

**26. Facebook Page** (`facebook`, connected) ✅ (code) — Meta provider. Reads a Page's recent posts via
Graph `/{page-id}/posts` (scopes `pages_show_list`, `pages_read_engagement`). A Page feed needs a **Page
access token**, so the connector resolves it from the long-lived user token each run. Picker
`remote-select` `meta-pages`. `cacheKey` `facebook:<connId>:<pageId>`, `refreshSeconds` 900. Same shared
embed as Instagram (text-only posts render as a text hero). Needs Meta App Review + Business verification.

**27. LinkedIn company page** (`linkedin`, connected) ✅ (code) — **new provider** (`linkedin`), the fourth
OAuth adapter. Reads a Page's recent posts via the versioned Posts API author finder
(`/rest/posts?q=author&author=<orgUrn>`, scopes `rw_organization_admin` + `r_organization_social`, reserved
`r_basicprofile` for the label — all three are what the Community Management product actually grants; the
read-only `r_organization_admin` belongs to the Advertising product and would fail as *invalid scope*).
Picker `remote-select` `linkedin-orgs` = `organizationAcls` (ADMINISTRATOR/APPROVED) titled via a
best-effort `organizationsLookup` with per-Page GET fallback. `cacheKey` `linkedin:<connId>:<orgUrn>`,
`refreshSeconds` 1800 (Development tier allows 100 calls/member/day). Shares the social-feed embed.
**TEXT-ONLY on purpose:** post images are `urn:li:image:…` URNs and GETting the Images API needs a WRITE
scope (`w_organization_social`/`rw_ads`), which we will not ask an operator for — so posts render as text
heroes, article posts fold in title + description, image-only posts are dropped, and there is no
`showCaption` field. Payload is therefore **stable** (no `version` needed, no fan-out) and needs no
`requiresNetwork`. Every versioned call carries `LinkedIn-Version` (pinned `202606`) +
`X-Restli-Protocol-Version: 2.0.0`. **Still partner-gated:** Community Management is approval-only with no
unreviewed dev mode, so an unapproved app cannot read even its own Pages; the Development tier it grants
caps at 500 app calls/day, 100/member/day and **no BATCH_GET** (hence the name-lookup fallbacks). Tokens
last 60 days and a refresh token is only issued to apps approved for Programmatic Refresh Tokens —
otherwise the connection lapses and is reconnected.

**28. X / Twitter** (`twitter`, connected) — API is **paid (~$100+/mo) and restrictive**; flag cost before
committing. Latest tweets from a handle.

**29. TikTok** (`tiktok`, connected) — TikTok Display API (OAuth + review); latest videos.

### Added since — more static apps (shipped ✅)

**Emergency Alert** (`alert`, static) ✅ — a full-screen, high-visibility message for evacuations,
closures and warnings. `headline` + optional `message`, a `severity` (critical/warning/info → colour +
icon), `showIcon`, and a `pulse` (a slow ~0.6 Hz edge fade, under any photosensitivity threshold and off
under `prefers-reduced-motion`). Deliberately **not** `requiresNetwork` — an alert must keep showing on a
screen that's offline. (A true instant *takeover* that overrides whatever is playing on every screen is a
platform feature, not this app — see below.)

**Live channel** (`livechannel`, static, `requiresNetwork: true`) ✅ — embeds a live **Twitch or Kick**
channel from just a channel name (`platform` + `channel` + `audio`). Where `stream` plays a raw HLS
`.m3u8`, Twitch/Kick only expose their own iframe players, so this builds the right embed URL per
platform. Twitch's player requires a `parent` naming the embedding host; the bundle supplies the player's
own `window.location.hostname` at runtime (URL logic in `src/livechannel/embed.ts`, unit-tested).
Torn down off-screen and mounted on activation, like YouTube/Stream. Twitch needs the player served from a
real domain (it rejects bare IPs).

### Requested but NOT apps — platform features

**Split Screen / multi-zone layout** — ✅ **platform core shipped** (backend + wire + player).
A screen now has a `layout` preset (`fullscreen` default, `main-sidebar` 70/30, `main-ticker` 88/12,
`main-sidebar-ticker`) and per-zone rotations: `screen.items` stays the MAIN zone (full backward compat),
secondary zones live in `screen.zones[]` (same item shape — media/playlist/app). Edit a zone with the
existing `PUT /screens/:id/items` + a `zone` field (same validation + optimistic concurrency); set the
preset with `PATCH /screens/:id/layout`. The snapshot carries `layout` + resolved `zones[]` (one batched
DB load for all regions; zone edits change the revision); old players ignore the new fields and play the
main zone fullscreen. The player runs **one `PlaybackController` per zone** (they're instance-scoped) in
CSS-positioned `.player-zone` containers — geometry is pure CSS keyed on `data-layout`, secondary zones
are always muted (audio belongs to the main zone), prefetch warms all zones, and empty zones degrade the
layout (`main-sidebar-ticker` with an empty sidebar plays as `main-ticker`).
**CMS zone editor ✅ shipped** — `ScreenContentTab` gains a layout picker (the four presets) and
Main / Sidebar / Ticker region tabs; each region edits its own rotation through the same content editor
and saves via the zone-aware `PUT /screens/:id/items`. Switching regions or presets is blocked while the
draft is dirty (the draft machinery deliberately preserves unsaved edits across baseline changes, so a
mid-edit switch would leak one region's items into another). Split screen is now end-to-end:
schema → API → snapshot → player compositor → CMS editing.

**Emergency takeover** — a companion to the `alert` app: a broadcast that instantly overrides whatever is
playing on selected screens with an alert, then restores. Also a screens/player feature (priority
override + push), distinct from the `alert` app which is just a playlist item.

## 5. Suggested sequencing (milestones)

- **M1 — Fast value, no auth ✅ done:** all Tier 1 statics + keyless Tier 2 (air quality, currency,
  crypto, power-prices) shipped, plus the `datetime` field (E4a) and the `repeater` field (E4b ✅).
  E0 (base categories, seeded on boot) ✅ and E6 (README refresh) ✅ — this band is now complete.
- **M2 — Google reuse:** Google Sheets ✅, Google Slides ✅. Google Photos ⛔ blocked (Photos
  Library API restricted to app-created media since 2025; a user's library needs the Picker API).
- **M3 — Microsoft (E1 ✅):** Outlook Calendar ✅ (reuses the gcal embed), Microsoft Teams ✅ (reuses the
  social-feed embed); Power BI / SharePoint next — same provider, new connectors.
- **M4 — Keyed feeds (E5 ✅):** stocks ✅ (Alpaca), sports ✅ (TheSportsDB, free-key default), news presets
  ✅ (curated RSS, no key); transit next (same keyed pattern).
- **M5 — Social (E2 ✅ code / E3):** Instagram ✅ + Facebook ✅ ship on the Meta provider (operator still
  clears Meta App Review + Business verification to go live); LinkedIn Page ✅ ships on its own `linkedin`
  provider (operator still clears the Community Management API product; text-only feed — see #27). Slack
  next (E3). X/TikTok only if the API cost/approval is acceptable.

**Recommended next:** **Power BI (public)** ✅ shipped as a static publish-to-web wrapper. The remaining
Microsoft win is **SharePoint / PowerPoint** — but note it hits the SAME wall as private Power BI: showing
a PPT/PDF means server-side export → an image the player can load, which needs the **connector→R2
enabler** (E7, below). That enabler is now the gating item for the whole "export a document/report to an
image" family (private Power BI, SharePoint/PowerPoint). The connected recipe is proven across data-read
(Sheets), image-export (Slides), normalized-payload embed reuse across providers (Outlook → gcal embed;
Teams → social-feed embed), a shared multi-app renderer (Meta → Instagram + Facebook; +Teams) and adding a
whole new provider end-to-end (LinkedIn: OAuth adapter + browse source + connector, no host changes). After
that: **Slack** (E3, new provider) and the remaining cost-gated social platforms (X/TikTok).

## 6. Known caveats to carry into implementation

- **No connector reads env today** — keyed APIs (stocks/sports) need E5 first; prefer keyless providers
  where possible (chosen deliberately above).
- **Payload must be timestamp-free or set `version`** — otherwise the app re-pushes to every screen on
  every refresh (documented in `connectors.spec.ts`).
- **`connected` cacheKeys must include `connectionId`** — never leak private data across accounts.
- **Instance creation gates on `isPublic`, not on org `install`** (`app-instances.service.ts`) — an
  existing quirk; don't rely on install as a hard precondition when speccing.
- **README is stale** (E6) — trust this file's recipe over the README's `player.tsx` note.
