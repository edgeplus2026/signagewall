# Edge Apps — Integration Backlog

> How to add new signage "apps", plus a prioritized catalog of apps to build.
> Companion to [`README.md`](./README.md) (the package layout) — this file is the *roadmap*.

## 0. Current state

Edge-plus is a digital-signage platform (edge-be NestJS + edge-cms React + edge-player Preact PWA).
"Apps" are the content-widget plugins that play on screens. The system is **fully data-driven**: the
CMS and player contain **zero per-app code**. Adding an app is done almost entirely in this package
(`edge/packages/apps/`) plus an optional backend connector.

**28 apps ship today** (all `runtimeKind: 'embed'`):
- `static` (config only, no server): `clock`, `worldclock`, `text`, `ticker`, `qr`, `countdown`,
  `menu`, `web`, `dashboard`, `youtube`, `vimeo`, `stream`, `gslides-public`
- `server` (backend connector): `weather`, `airquality`, `sunmoon` (all Open-Meteo), `currency`
  (ECB/Frankfurter), `crypto` (CoinGecko), `power-prices` (Energinet), `holidays` (Nager.Date),
  `onthisday` (Wikipedia), `wisdom` (quotes), `sports` (TheSportsDB, free-key default), `rss`, and
  `stocks` (Alpaca — needs `ALPACA_API_KEY_ID` + `ALPACA_API_SECRET_KEY`)
- `connected` (OAuth account): `gcal` (Google Calendar), `gsheets` (Google Sheets), `canva`

**Shipped in the current push:** all of **Tier 1** (§4) + the keyless **Tier 2** server apps, plus the
`datetime` config field type (enabler E4a). Remaining work is marked below — ✅ = shipped.

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
| **E0** | Seed a base set of `AppCategory` records (none exist today): *Information, Finance, Productivity, Data & Dashboards, Media, Social, Utilities*. Super-admin via `POST /admin/app-categories`. | S | catalog organization |
| **E1** | **Microsoft (Azure AD / MS Graph) OAuth provider**: extend `ConnectionProvider` enum (be `schemas/app-connection.schema.ts` + cms `features/apps/types/connection.types.ts`), add `providers/microsoft.oauth.ts` (`OAuthProvider`), register in `ConnectionsService.getProvider` + `PROVIDER_CONFIG_NS`, add `microsoft-api.ts`, add client-id/secret env. | L | Outlook Calendar, Teams, SharePoint/PowerPoint, Power BI |
| **E2** | **Meta (Facebook/Instagram Graph) OAuth provider** + create a Meta app + app review/business verification. | L (external approval) | Instagram, Facebook Page |
| **E3** | **Slack OAuth provider** (`conversations.history` scope). | M | Slack channel app |
| **E4a** ✅ | **`datetime` field type** — native date/time picker, stored as a local `YYYY-MM-DDTHH:MM` string. Shipped: contract union + zod (string-like) + CMS `DateTimeControl`; used by the Countdown `target`. | S | Countdown (done) |
| **E4b** ✅ | **`repeater` field type** — an add/remove/reorder row editor (each row a set of typed sub-fields via `field.fields`). Shipped: contract union + zod + CMS `RepeaterControl`. Adopted by Menu, Ticker, World clocks and Stocks (each keeps a legacy string/textarea fallback so saved configs don't break). | M | Menu, Ticker, World clocks, Stocks (done) |
| **E5** ✅ | **Keyed-connector convention** — `requireConnectorKey(name)` in `connectors/env.util.ts` reads a key from the backend env and throws cleanly when it's missing (the host then keeps last-known-good). Keys live in `.env` / `.env.example`. Shipped; used by Stocks. | S–M | sports, transit (keyed) now unblocked |
| **E6** ✅ | Refreshed [`README.md`](./README.md) to current reality (`embeds/<slug>/` bundles, the three app kinds, the build/preview pipeline, a BACKLOG pointer). | S | docs accuracy |

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
| 3 | Google Slides (published) ✅ | `gslides-public` | static | Productivity | S | — |
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
| 16 | News headlines | `news` | server | Information | S–M | (RSS-preset variant) |
| **Added since — keyless server apps (shipped)** ||||||
| 30 | Public holidays ✅ | `holidays` | server | Information | M | — |
| 31 | On this day ✅ | `onthisday` | server | Information | M | — |
| 32 | Quotes / wisdom ✅ | `wisdom` | server | Information | M | — |
| 33 | Sun & Moon ✅ | `sunmoon` | server | Information | M | — |
| **Tier 3 — connected, reuse Google provider** ||||||
| 17 | Google Sheets (KPI/table) ✅ | `gsheets` | connected | Data & Dashboards | M | — |
| 18 | Google Slides (private) | `gslides` | connected | Productivity | M–L | — |
| 19 | Google Photos album | `gphotos` | connected | Media | M | — |
| **Tier 4 — connected, new providers** ||||||
| 20 | Outlook / M365 Calendar | `outlook` | connected | Productivity | M | E1 |
| 21 | Power BI | `powerbi` | connected | Data & Dashboards | L | E1 |
| 22 | SharePoint / PowerPoint | `sharepoint` | connected | Productivity | L | E1 |
| 23 | Microsoft Teams | `teams` | connected | Productivity | L | E1 |
| 24 | Slack channel | `slack` | connected | Productivity | M–L | E3 |
| **Tier 5 — social (approval / cost gated)** ||||||
| 25 | Instagram | `instagram` | connected | Social | L | E2 |
| 26 | Facebook Page | `facebook` | connected | Social | L | E2 |
| 27 | LinkedIn company page | `linkedin` | connected | Social | L | new provider |
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

**3. Google Slides — published** (`gslides-public`, static, `requiresNetwork: true`)
Zero-OAuth: operator uses Google's "Publish to web". **Config:** `publishedUrl` (url,
`docs.google.com/presentation/.../pub` pattern), `slideSeconds` (number), `loop` (switch). **Render:**
embed the `/embed?start=true&loop=…&delayms=…` URL in an iframe. (Private decks → #18.)

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

**16. News headlines** (`news`, server) — **recommended as an RSS enhancement first**: curated
feed presets (a `select` of known feeds) + category, reusing the existing RSS connector/embed — near-zero
cost. A keyed variant (NewsAPI/GNews) is an alternative if editorial control is needed.

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

**18. Google Slides (private)** (`gslides`, connected) — google + `presentations.readonly` /
`drive.readonly`. `remote-select` `google-presentations`. Connector exports slide images (or embeds).
`cacheKey` `gslides:<connId>:<fileId>`. Async export → `pending` state machine (like canva).

**19. Google Photos album** (`gphotos`, connected) — google + `photoslibrary.readonly`. `remote-select`
album → photo slideshow. `cacheKey` `gphotos:<connId>:<albumId>`. **Config:** album, `slideSeconds`,
`shuffle`. *(Optional / lower priority.)*

### Tier 4 — connected (new providers)

**20. Outlook / M365 Calendar** (`outlook`, connected) — **Depends E1**. MS Graph `Calendars.Read`.
`remote-select` `ms-calendars`. **Reuse the gcal embed + `GcalPayload`** — near-parity with Google
Calendar. `cacheKey` `outlook:<connId>:<calId>`. Highest-value connected app after the enabler lands.

**21. Power BI** (`powerbi`, connected) — **Depends E1**. Embed token via Power BI REST; pick
report/dashboard. `cacheKey` `powerbi:<connId>:<reportId>`. (Public reports → use #4 instead.)

**22. SharePoint / PowerPoint** (`sharepoint`, connected) — **Depends E1**. Graph `Files.Read`; show a
PPT/PDF from OneDrive/SharePoint (export to images). `cacheKey` `sharepoint:<connId>:<fileId>`.

**23. Microsoft Teams** (`teams`, connected) — **Depends E1**. Graph `ChannelMessage.Read.All` (admin
consent — heavy). Show channel announcements. `cacheKey` `teams:<connId>:<teamId>:<channelId>`.

**24. Slack channel** (`slack`, connected) — **Depends E3**. `conversations.history`. Show latest
channel messages/announcements. `cacheKey` `slack:<connId>:<channelId>`. `refreshSeconds` 60–300.

### Tier 5 — social (approval / cost gated — schedule opportunistically)

**25. Instagram** (`instagram`, connected) — **Depends E2**. Instagram Graph API (Business/Creator
linked to an FB Page); latest posts. Requires Meta app review + business verification.

**26. Facebook Page** (`facebook`, connected) — **Depends E2**. `pages_read_engagement`; latest posts/events.

**27. LinkedIn company page** (`linkedin`, connected) — LinkedIn OAuth is **partner-gated**; latest company
posts. Mark risky.

**28. X / Twitter** (`twitter`, connected) — API is **paid (~$100+/mo) and restrictive**; flag cost before
committing. Latest tweets from a handle.

**29. TikTok** (`tiktok`, connected) — TikTok Display API (OAuth + review); latest videos.

## 5. Suggested sequencing (milestones)

- **M1 — Fast value, no auth ✅ done:** all Tier 1 statics + keyless Tier 2 (air quality, currency,
  crypto, power-prices) shipped, plus the `datetime` field (E4a) and the `repeater` field (E4b ✅).
  Still open in this band: **E0** (seed categories). (E6 README refresh ✅.)
- **M2 — Google reuse:** Google Sheets ✅ (shipped); Google Slides (private) and Google Photos next —
  same pattern (existing `google` connection + connector scopes + a `remote-select` browse endpoint).
- **M3 — Microsoft (E1):** Outlook Calendar (reuse gcal embed), then Power BI / SharePoint / Teams.
- **M4 — Keyed feeds (E5 ✅):** stocks ✅ (Alpaca), sports ✅ (TheSportsDB, free-key default); transit
  next (same keyed pattern); news presets.
- **M5 — Social (E2/E3):** Slack, Instagram, Facebook; X/TikTok/LinkedIn only if the API cost/approval
  is acceptable.

**Recommended next:** more `connected` reuse — **Google Slides** / **Google Photos** (same Google OAuth
+ a browse endpoint), then **E1 (Microsoft provider)** to unlock Outlook / Teams / Power BI. Google
Sheets ✅ has proved the connected recipe end to end (OAuth field → browse endpoint → per-connection fetch).

## 6. Known caveats to carry into implementation

- **No connector reads env today** — keyed APIs (stocks/sports) need E5 first; prefer keyless providers
  where possible (chosen deliberately above).
- **Payload must be timestamp-free or set `version`** — otherwise the app re-pushes to every screen on
  every refresh (documented in `connectors.spec.ts`).
- **`connected` cacheKeys must include `connectionId`** — never leak private data across accounts.
- **Instance creation gates on `isPublic`, not on org `install`** (`app-instances.service.ts`) — an
  existing quirk; don't rely on install as a hard precondition when speccing.
- **README is stale** (E6) — trust this file's recipe over the README's `player.tsx` note.
