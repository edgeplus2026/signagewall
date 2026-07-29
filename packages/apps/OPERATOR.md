# SignageWall Digital Signage — Operator Setup Guide (Apps)

This guide tells an operator EXACTLY what to do to make each of the 37 signage apps work: which environment variables to set, which OAuth apps/API keys to register externally, which approvals to obtain, and the per-instance steps done in the CMS. Most apps need **zero** backend setup — they are configured entirely per-instance. A small number need an **API key**, and the "connected" apps each need an **OAuth application** registered with the provider plus `ENCRYPTION_KEY` set on the server. Where a fact is not established here, it says **see manifest** rather than guessing.

---

## 0. Platform baseline (do once, before any app)

### 0.1 Baseline infrastructure env

| Key | Required? | Purpose | How to obtain |
|---|---|---|---|
| `MONGODB_URI` | **Yes** | Primary datastore (Mongoose). All catalog, org, instance, connection and cache data live here. | Provision MongoDB (Atlas or self-hosted); use its URI, e.g. `mongodb+srv://user:pass@host/edge`. Joi `.required()` — app will not boot without it. Local default: `mongodb://localhost:27017/edge`. |
| `JWT_ACCESS_SECRET` | **Yes** | Signs short-lived access-token JWTs. Also signs the short-lived OAuth `state` JWT — connection OAuth breaks if missing. | `openssl rand -base64 48`. Joi requires min length 32. Stable per environment. |
| `JWT_REFRESH_SECRET` | **Yes** | Signs refresh-token JWTs. | A second, different `openssl rand -base64 48`. Joi requires min length 32. |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | No | Access/refresh token lifetimes. | Optional; default `15m` / `7d`. |
| `NODE_ENV` | No | Runtime mode; gates Swagger (off in production unless `SWAGGER_ENABLED`) and dev fallbacks. | Set `production` in prod. Default `development`. |
| `PORT` | No | HTTP listen port; localhost fallback base for redirect URIs when `PUBLIC_API_URL` is unset. | Optional; default `3000`. |
| `API_PREFIX` | No | URL path prefix — the `api` segment in every route AND in the OAuth callback path. Changing it changes the redirect URI you must register with every provider. | Optional; default `api`. Keep default unless you deliberately change the public path (then re-register all provider redirect URIs). |
| `FRONTEND_URL` | No | CMS frontend base URL (CORS, email links, OAuth success redirects). | Optional (default `http://localhost:5173`); set to the real CMS origin in production. |
| `PLAYER_URL` | No | Base URL of the signage player app. | Optional; default `http://localhost:5174`. Set to real player origin in production. |
| `R2_ACCOUNT_ID` | No* | Cloudflare R2 account id for the S3-compatible media store (uploaded images/videos served to screens). | *Functionally required for media uploads.* From the Cloudflare dashboard (R2). |
| `R2_ACCESS_KEY_ID` | No* | R2 S3 access key id. | Create an R2 API token in Cloudflare; use the Access Key ID it issues. |
| `R2_SECRET_ACCESS_KEY` | No* | R2 S3 secret access key (or the `cfat_`/`cfut_` token value, hashed automatically). | S3 Secret Access Key from the R2 token screen. Store as a secret. |
| `R2_BUCKET` | No* | R2 bucket name holding uploaded media. | Create a bucket in R2 and use its name. |
| `R2_PUBLIC_URL` | No* | Public base URL for serving uploaded files (custom domain or R2 dev URL). Trailing slash stripped. | Bind a custom domain to the bucket or use the R2 dev URL; player/CMS load media from here. |
| `MEDIA_MAX_FILE_SIZE_BYTES` / `MEDIA_MAX_FILES_PER_UPLOAD` | No | Upload size and count limits. | Optional; defaults `10485760` (10MB) and `10`. |
| `MAIL_ENABLED` | No | Master switch for outbound mail (invites, password reset, notifications). Disabled by default. | Set `true` in production; leave `false` locally. |
| `RESEND_API_KEY` | No | Resend API key for transactional mail when mail is enabled. | Sign up at https://resend.com (free tier ~3000 emails/month) and create an API key. Required when `MAIL_ENABLED=true`. |
| `MAIL_FROM` | No | From header for outbound mail. | Optional; default `SignageWall <onboarding@resend.dev>`. Use a verified sender/domain in production. |
| `MAIL_SUPPORT_TO` | No | Inbox that receives feedback and problem reports. | Optional; set to your support inbox (valid email per Joi). |
| `MAIL_REGISTRATIONS_NOTIFY_TO` | No | Inbox notified on every new-user registration. | Optional; default `edgeplus2026@gmail.com`. Override with your ops inbox. |
| `REDIS_URL` | No* | Full Redis URL backing the BullMQ queue for the AI content generator. Takes precedence over discrete `REDIS_HOST/PORT`. | *Required only if you run the AI content generator (`OPENROUTER_API_KEY` set).* Prefer a full URL e.g. `rediss://:password@host:6379` and set `REDIS_TLS=true`. Locally `docker compose up -d redis`. |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_TLS` | No | Discrete Redis settings used when `REDIS_URL` is unset. | Optional; defaults `localhost` / `6379` / (none) / `false`. Set `REDIS_TLS=true` for managed Redis over TLS. |
| `THROTTLE_TTL_SECONDS` / `THROTTLE_LIMIT` / `THROTTLE_AUTH_TTL_SECONDS` / `THROTTLE_AUTH_LIMIT` | No | Global and auth-route rate limits per client IP. | Optional; defaults `60s`/`120` and `60s`/`10` (stricter on login/register/reset/refresh/invite). |
| `SWAGGER_ENABLED` | No | Forces the OpenAPI/Swagger UI on or off. | Optional; when unset, on in non-production and off in production. |

\* Optional in Joi but functionally required for the feature noted.

### 0.2 Publish flow — how an app reaches an org's catalog

Apps live in code as manifests (`APP_MANIFESTS` from `@signagewall/apps`). A **super-admin** (all `/admin/apps` routes are behind `SuperAdminGuard`) must publish each one before organizations can use it:

1. **Sync on boot.** On every boot `AppsService.onModuleInit()` runs `syncManifestDefinitions()`: for each catalog entry matched to a manifest **by slug**, it keeps the technical fields (`configSchema`, `version`, `runtimeKind`, `dataSource`) in lockstep with code. Editing a manifest (new fields/sections, version bump) reaches the CMS and validation with no manual re-add. Presentation/governance (name, copy, icon, color, visibility, categories) is operator-owned and never overwritten. **New manifests are NOT auto-added.**
2. **Discover addable apps.** `GET /admin/apps/manifests` (`listAvailableManifests`) returns slug/name/tagline/description and an `alreadyInCatalog` flag.
3. **Add to catalog.** `POST /admin/apps` with `CreateAppDto { slug, name, tagline, description, about?, iconSvg?, color?, isPublic?, categoryIds? }`. The technical definition is copied from the manifest by slug (the request carries only presentation + governance). 400s on an unknown slug; 409s if the slug is already in the catalog — so the catalog can never hold a phantom app with no code.
4. **Publish (make visible).** `PATCH /admin/apps/:id/visibility` with `{ isPublic: true }` — or pass `isPublic:true` at create time. Only public apps appear in an org's catalog via `findVisible()`.
5. **(Optional) Categorize.** A base taxonomy — *Information, Finance, Productivity, Data & Dashboards, Media, Social, Utilities* — is **seeded automatically on first boot** (idempotent; the backlog's per-app category column suggests the mapping). Manage categories via `/admin/app-categories` (POST/PATCH/DELETE, `SuperAdminGuard`) — rename, reorder, add or delete freely; the seed never overwrites your changes. Assign apps by attaching `categoryIds` on create or via `PATCH /admin/apps/:id`. Presentation edits also go through `PATCH /admin/apps/:id`.
6. **Org installs.** An organization sees public apps via `listCatalog` (`findVisible` + installed flag) and installs one (`orgAppsRepository.install`), enabling its users to create instances. `getCatalogApp` keeps a non-public app resolvable if the org already installed it, so unpublishing never locks an org out of existing instances.
7. **Uninstall cascades.** `uninstall` (`orgAppsRepository.uninstall` + `instancesService.removeAllForApp`) removes the org's instances of the app and their OAuth connections — no dangling playlist/screen references or orphaned connections. Delete a catalog entry entirely with `DELETE /admin/apps/:id`.

### 0.3 `ENCRYPTION_KEY` and `PUBLIC_API_URL` (required for connected apps)

- **`ENCRYPTION_KEY`** — an AES-256-GCM key (base32/64 of 32 bytes; generate with `openssl rand -base64 32`). Encrypts third-party OAuth access/refresh tokens **at rest** in the `appconnections` collection; tokens are decrypted only in backend memory and never reach the player or a snapshot. It is the **master gate for ALL connected apps**: `ConnectionsService.isEnabled()` returns `encryption.isEnabled()`, and `assertEnabled()` throws *"Connected apps are disabled (ENCRYPTION_KEY not set)."* Without it, OAuth start, callback, and resolve all fail — Google, Microsoft, Meta, and Canva apps are disabled entirely. Optional in Joi (keyless data apps still work) but **required in production for any OAuth-backed app**. It must be **stable** — rotating it makes already-stored tokens undecryptable.
- **`PUBLIC_API_URL`** — the publicly reachable HTTPS base URL of the API. It is the base of the connection OAuth callback built by `redirectUri()`: `${PUBLIC_API_URL (trailing / stripped)}/${API_PREFIX}/v1/connections/oauth/<provider>/callback` (`API_PREFIX` defaults to `api`). When unset it falls back to `http://localhost:${PORT|3000}`, which providers cannot call back into — **localhost is not a substitute**. It is needed for (1) connection OAuth callbacks (the redirect URI you register with each provider must match this exactly) and (2) provider push notifications (e.g. Google Calendar `events.watch`). Leave unset in development (connectors just poll — Google Calendar every 5 min); set it in production. **Re-register every provider redirect URI if you ever change `PUBLIC_API_URL` or `API_PREFIX`.**

---

## 1. At-a-glance (all 37 apps)

| App | Type | Operator setup needed | Env / keys | External approval |
|---|---|---|---|---|
| Clock | Static | None — per-instance only | None | None |
| World clocks | Static | None — per-instance only (need IANA zone names) | None | None |
| Text | Static | None — per-instance only | None | None |
| Ticker | Static | None — per-instance only | None | None |
| QR code | Static | None — per-instance only (Google review type needs a Place ID) | None | None |
| Countdown | Static | None — per-instance only | None | None |
| Menu board | Static | None — per-instance only | None | None |
| Emergency Alert | Static | None — per-instance only (works offline) | None | None |
| Web page | Static (network) | Need an iframe-embeddable public URL | None | None |
| Dashboard | Static (network) | Need a public/embed/anonymous dashboard URL | None | None |
| Power BI | Static (network) | "Publish to web" the report, paste the app.powerbi.com link | None | None (public report only) |
| YouTube | Static (network) | Need a single YouTube video link | None | None |
| Vimeo | Static (network) | Need a single Vimeo video link | None | None |
| Live stream | Static (network) | Need an HLS `.m3u8` source URL | None | None |
| Live channel | Static (network) | Enter a Twitch/Kick channel name | None | Twitch needs the player served from a real domain (not a bare IP) |
| Weather | Keyless | None — per-instance only | None | None |
| Air quality | Keyless | None — per-instance only | None | None |
| Sun & Moon | Keyless | None — per-instance only | None | None |
| Exchange rates | Keyless | None — per-instance only | None | None |
| Crypto prices | Keyless | None — per-instance only | None | None |
| Electricity prices | Keyless | None — per-instance only | None | None |
| Public holidays | Keyless | None — per-instance only | None | None |
| On this day | Keyless | None — per-instance only | None | None |
| Daily Wisdom | Keyless (offline) | None — per-instance only | None | None |
| RSS feed | Keyless | None — per-instance only (supply feed URL) | None | None |
| News headlines | Keyless | None — per-instance only (pick a publisher) | None | None |
| Stocks | Keyed | Set two Alpaca keys once (server) | `ALPACA_API_KEY_ID`, `ALPACA_API_SECRET_KEY` (**both required**) | Alpaca account (commercial-friendly) |
| Sports | Keyed (optional) | Works out of the box; optional key for higher limits | `THESPORTSDB_API_KEY` (**optional**, defaults to test key `3`) | None (optional TheSportsDB key) |
| Google Calendar | Connected (OAuth) | Google OAuth app + `ENCRYPTION_KEY`; per-instance connect + pick calendar | `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth verification for non-test accounts (sensitive scope) |
| Google Sheets | Connected (OAuth) | Reuses Google OAuth app; per-instance connect + pick sheet + range | `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth verification (2 sensitive scopes) |
| Google Slides | Connected (OAuth) | Reuses Google OAuth app; per-instance connect + pick deck; **R2 required** (slides are mirrored) | `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `R2_*` | Google OAuth verification (2 sensitive scopes) |
| Outlook Calendar | Connected (OAuth) | Entra app + `ENCRYPTION_KEY`; per-instance connect + pick calendar | `ENCRYPTION_KEY`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Possible tenant admin consent; publisher verification recommended |
| Microsoft Teams | Connected (OAuth) | Same Entra app; per-instance connect + pick channel | `ENCRYPTION_KEY`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | **Azure AD admin consent** for `ChannelMessage.Read.All`; no personal accounts |
| Instagram | Connected (OAuth) | Meta app + `ENCRYPTION_KEY`; per-instance connect + pick IG account | `ENCRYPTION_KEY`, `META_CLIENT_ID`, `META_CLIENT_SECRET` | **Meta App Review + Business verification** for non-owned accounts |
| Facebook Page | Connected (OAuth) | Same Meta app; per-instance connect + pick Page | `ENCRYPTION_KEY`, `META_CLIENT_ID`, `META_CLIENT_SECRET` | **Meta App Review + Business verification** for non-owned Pages |
| LinkedIn Page | Connected (OAuth) | LinkedIn app + `ENCRYPTION_KEY`; per-instance connect + pick Page | `ENCRYPTION_KEY`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | **Community Management API approval** (no dev mode, even for your own Pages); posts render text-only |
| Canva | Connected (OAuth) | Canva Connect app + `ENCRYPTION_KEY`; per-instance connect + pick design | `ENCRYPTION_KEY`, `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` | Canva review/approval to publish beyond your own team |

---

## 2. Static apps — no backend setup

These render entirely on the player from operator-typed content. No env vars, no keys. Most keep working offline; a few (`requiresNetwork: true`) need internet at play time.

### 2.1 Offline-capable (no network needed)

- **Clock** — `requiresNetwork: false`. Pure client-side; keeps correct time even after a month offline.
  1. Choose **Face** (digital / analogue / split-flap / words; from `faces.ts`, default `DEFAULT_CLOCK_FACE`).
  2. Pick **Theme** (Light / Dark / Midnight) — fills the three colour fields.
  3. Set **Time format** (24h default / 12h).
  4. Toggle **Show seconds** (default off; ignored by the Words face) and **Show date** (default on).
  5. Optionally override **Background / Text / Accent** under Theme Settings.

- **World clocks** — `requiresNetwork: false`. Ticks from the player's own clock via `Intl`; perfect offline. **Prerequisite:** know the **IANA** zone name for each city (e.g. `Europe/London`, `America/New_York`, `Asia/Tokyo`) — the zone field requires the IANA identifier, not a friendly name.
  1. Add one or more **Places** rows (repeater, min 1): each row = **Label** + **Time zone** (IANA name, required).
  2. Set **Time format** (24h/12h), **Show seconds** (default off), **Show date** (default on).
  3. Pick **Theme** (Light / Dark / Midnight); optionally override Background / Text / Accent (accent = place labels).
  4. Adjust shared **Style Settings** (fonts/typography).

- **Text** — `requiresNetwork: false`. Message centered on the surface; image-only slides allowed. **Optional prerequisite:** a publicly reachable image URL for a full-screen background photo.
  1. Enter **Message** (richtext) — optional when a background image is set.
  2. Optionally set **Background image URL**.
  3. Choose **Image overlay** (None / Light / Dark; default Dark) for readability.
  4. Set **Text color** (default `#FFFFFF`) and **Background color** (default `#000000`).

- **Ticker** — `requiresNetwork: false`. Scrolling band of short messages.
  1. Add one or more **Messages** rows (repeater, min 1) — repeat in order.
  2. Set **Speed** (Slow / Normal / Fast; default Normal).
  3. Set **Direction** (Right-to-left / Left-to-right; default left).
  4. Set **Position** (Top / Middle / Bottom; default Middle).
  5. Pick **Theme** (Light / Dark); optionally override Background / Text / Accent (accent = separators). Adjust Style Settings.

- **QR code** — `requiresNetwork: false`. Generated in the browser; option values are named by outcome, not payload format. **Prerequisite:** have the payload ready for the chosen type; for **Leave a Google review** only, get your business's **Google Place ID** from Google's Place ID Finder (the `ChIJ…` code).
  1. Choose **What the code does** (Open a website / Call a phone number / Send a text message / Write an email / Join a Wi-Fi network / Leave a Google review; default url).
  2. Fill the type-specific field(s): Website (url); Phone (phone); Phone + optional Message (sms); Email + optional Subject/Message (email); Wi-Fi name + optional password + Security (WPA/WEP/None) + Hidden toggle (wifi); Google Place ID (review).
  3. Optionally add a **Caption**.
  4. Set **QR code color** (default `#000000`) and **Background color** (default `#FFFFFF`); adjust Style Settings (caption typography, default weight 300).

- **Countdown** — `requiresNetwork: false`. Keeps ticking offline. Target stored as local ISO string `YYYY-MM-DDTHH:MM`.
  1. Optionally set a **Title**.
  2. Set **Date & time** (required; interpreted as the screen's local wall time).
  3. Choose **Direction** (Count down to it / Count up since it; default down).
  4. Set **Message at zero** (ignored by count-up).
  5. Toggle **Show unit labels** (default on).
  6. Pick **Theme** (Light / Dark / Midnight); optionally override Background / Text / Accent (accent = unit labels + message at zero). Adjust Style Settings.

- **Menu board** — `requiresNetwork: false`. Styled list of items and prices.
  1. Optionally set a **Heading**.
  2. Add one or more **Items** rows (repeater, min 1): **Name** (required) + optional **Price** + **Description**.
  3. Choose **Columns** (One / Two; default 1).
  4. Pick **Theme** (Light / Dark); optionally override Background / Text / Accent (accent = heading + prices). Adjust Style Settings.

- **Emergency Alert** — `requiresNetwork` deliberately omitted (**works offline** — the point of an alert). A full-screen, high-visibility message.
  1. Enter a **Headline** (required) — keep it short; it's set in huge type.
  2. Optionally add **Details** (supporting text under the headline).
  3. Pick **Severity** (Critical = red / Warning = amber / Information = blue; default Critical) — sets the colour and icon.
  4. Toggle **Show icon** (default on) and **Pulsing edge** (default on; a slow edge fade, no rapid flashing, and off under reduced-motion).
  > This is a playlist item, not an instant screen takeover — overriding whatever is currently playing on every screen is a separate platform feature (see BACKLOG.md).

### 2.2 Network-dependent (blank/error without internet)

- **Web page** — `requiresNetwork: true`. Loads a live remote page in an iframe. **Prerequisite:** a public URL that permits iframe embedding — a page you own or a dashboard's public share link. Sites that refuse framing (Google, social networks, most banking sites) come up blank.
  1. Enter **Page address** (url, required).

- **Dashboard** — `requiresNetwork: true`, refreshes every 300s. Web-style live embed for **public/anonymous** dashboards; authenticated dashboards are separate connected apps in the backlog. **Prerequisite:** the dashboard's public, embeddable/anonymous link — Grafana share/snapshot, Looker Studio embed, Power BI "publish to web", or a Metabase public dashboard. A private/login/edit URL will not load.
  1. Enter **Dashboard link** (url, required, must match `^https?://.+`).
  2. Set **Reload every (minutes)** (default 5, range 0–1440; 0 = never reload).

- **Power BI** — `requiresNetwork: true`. Embeds a Power BI report **published to the web**; no account, no OAuth, no Power BI capacity. The URL is validated to a real `*.powerbi.com` host. **Prerequisite:** in Power BI open the report → **File → Embed report → Publish to web (public)** and copy the `app.powerbi.com/view?r=…` link. A normal report link (which needs a login) will not load on a screen. Embedding a *private* report is not this app — it requires a Power BI capacity (see BACKLOG.md 21b).
  1. Enter **Power BI embed link** (url, required, must be a `https://…powerbi.com/…` URL).
  2. Set **Reload every (minutes)** (default 0 = never; Power BI refreshes published data on its own, so set this only to force a periodic reload).

- **YouTube** — `requiresNetwork: true`. Streams live from YouTube; nothing offline. One video per app. **Prerequisite:** a single YouTube link (watch, `youtu.be`, shorts, or embed form). Playlists are not supported.
  1. Enter **YouTube link** (url, required, must match the YouTube URL pattern for watch/embed/shorts/v or `youtu.be`).

- **Vimeo** — `requiresNetwork: true`. Streams live and loops. One video per app; a showcase/album link fails the pattern. **Prerequisite:** a single Vimeo link (`vimeo.com` or `player.vimeo.com`).
  1. Enter **Vimeo link** (url, required, must match `^https?://(www.|player.)?vimeo.com/.+`).

- **Live stream** — `requiresNetwork: true`. Plays a live HLS stream (torn down off-screen, mounted on activation) via hls.js on Chromium players. **Prerequisite:** an HLS source URL ending in `.m3u8` (camera feed, TV channel, or live event feed).
  1. Enter **Stream link** (url, required, must match `^https?://.+`).
  2. Choose **Fit** (Contain = whole picture with bars / Cover = fill and may crop; default contain).
  3. Toggle **Play audio** (default off; when on, follows the screen's own volume).

- **Live channel** — `requiresNetwork: true`. Embeds a live **Twitch or Kick** channel (the `stream` app is for raw HLS `.m3u8`; these platforms only expose their own players). Torn down off-screen, mounted on activation. **Prerequisite (Twitch):** Twitch's player only runs when embedded on a real domain — it rejects a bare IP — so the player must be served from a hostname. No prerequisite for Kick.
  1. Pick **Platform** (Twitch / Kick; default Twitch).
  2. Enter **Channel** (required) — the channel name (last part of its URL, e.g. `twitch.tv/shroud` → `shroud`); pasting the full link works too.
  3. Toggle **Play audio** (default off — channels autoplay muted; when on, follows the screen's own volume).

> To show a Google Slides deck, use the connected **Google Slides** app in §5 — it signs into your Google account and works with private decks, so nothing has to be published to the web.

---

## 3. Keyless data apps — no keys

These fetch from public upstream providers on the server. **No API key is required for any of them.** All were confirmed to have no `requireConnectorKey`/`process.env` in their connector. Each shares a coarse cache key so all screens on the same input share one fetch. Refresh cadence is fixed per app.

| App | Upstream source (no key) | Refresh |
|---|---|---|
| Weather | Open-Meteo Forecast API + Open-Meteo geocoding | 900s |
| Air quality | Open-Meteo Air Quality API + Open-Meteo geocoding | 900s |
| Sun & Moon | Open-Meteo Forecast API (daily sunrise/sunset/daylight) + geocoding; moon phase computed in the bundle | 21600s |
| Exchange rates | Frankfurter (`api.frankfurter.dev`, ECB reference rates) | 3600s |
| Crypto prices | CoinGecko free `simple/price` endpoint | 300s |
| Electricity prices | Energinet open energy-data service, Elspotprices dataset (`api.energidataservice.dk`) | 1800s |
| Public holidays | Nager.Date `NextPublicHolidays` (`date.nager.at/api/v3`) | 21600s |
| On this day | Wikipedia "On This Day" REST feed (`<lang>.wikipedia.org/api/rest_v1/feed/onthisday/events`) | 21600s |
| Daily Wisdom | **None — no network.** Vendored local corpus (~4,900 quotes in `wisdom/quotes.json`) | 86400s |
| RSS feed | The operator-supplied feed URL itself (RSS 2.0 / Atom / RSS 1.0-RDF) | 300s |
| News headlines | A curated publisher feed the operator picks from a dropdown (rides the RSS connector) | 300s |

Per-instance config:

- **Weather** — `requiresNetwork: true`. Cache key is rounded lat/lng (~1km) or normalized city.
  1. **Location** (required): type a city and pick from the list (free-text is geocoded).
  2. **Layout** (`displayMode` select).
  3. **Theme**: Weather/auto (default), Light, or Dark.
  4. **Temperature units**: Celsius (default) or Fahrenheit — display-only.
  5. **Language**: English (default) or Serbian — display-only.
  6. **Show the time** (switch, default on). *(No style fields.)*

- **Air quality** — `requiresNetwork: true`. Both EAQI and US AQI plus pollutants travel in the payload.
  1. **Location** (required): search and pick.
  2. **Index scale**: European (EAQI, default) or US (AQI) — display-only, does not split the cache.
  3. **Theme**: Light or Dark (default Dark).
  4. **Style Settings** (optional): Font, Font weight, Font size %, Line height, Letter spacing.

- **Sun & Moon** — `requiresNetwork: true`.
  1. **Location** (required): search and pick.
  2. **Theme**: Light or Dark (default Dark).
  3. **Style Settings** (optional): Font, Font weight, Font size %, Line height, Letter spacing.

- **Exchange rates** — `requiresNetwork: true`. Cache key = base + sorted target set. ECB publishes once per working day; hourly refresh picks up the new day promptly.
  1. **Base currency** (select, default EUR).
  2. **Show rates for / targets** (multiselect, min 1 / max 12; default USD, GBP, DKK).
  3. **Theme**: Light or Dark (default Dark).
  4. **Style Settings** (optional): as above.

- **Crypto prices** — `requiresNetwork: true`. Free tier is rate-limited (hence 5-min refresh + coarse cache key). Display order fixed to the curated `COIN_LIST`.
  1. **Coins** (multiselect, min 1 / max 12; default bitcoin, ethereum).
  2. **Currency / vs** (select): US dollar (default), Euro, British pound, or Danish krone.
  3. **Show 24-hour change** (switch, default on).
  4. **Theme**: Light or Dark (default Dark).
  5. **Style Settings** (optional): as above.

- **Electricity prices** — `requiresNetwork: true`. Area-only cache key; fetches the most recent 48 hourly prices, resolves "now" from server UTC.
  1. **Price area** (select, default DK1) — which Nord Pool market area.
  2. **Currency**: DKK (øre/kWh, default) or EUR (cents/kWh) — display-only, both travel in the payload.
  3. **Theme**: Light or Dark (default Dark).
  4. **Style Settings** (optional): as above.

- **Public holidays** — `requiresNetwork: true`. Country-only cache key; stores up to 12 upcoming holidays soonest-first.
  1. **Country** (select, default DK).
  2. **How many to show / count** (number, min 1 / max 12, default 5) — display-only.
  3. **Theme**: Light or Dark (default Dark).
  4. **Style Settings** (optional): as above.

- **On this day** — `requiresNetwork: true`. Sends a descriptive User-Agent per Wikimedia policy (not a credential). Cache key = language only; up to 20 events stored, most-recent-first.
  1. **Language** (select): English (default), German, Spanish, or French.
  2. **How many to show / count** (number, min 1 / max 12, default 6) — display-only.
  3. **Theme**: Light or Dark (default Dark).
  4. **Style Settings** (optional): as above.

- **Daily Wisdom** — `requiresNetwork` deliberately omitted; **no network by design.** Reads a vendored local corpus once from disk; date+categories-seeded deterministic shuffle turns over daily; ships offline fallback quotes. No theme, no style fields (each quote has its own design).
  1. **Topics / categories** (multiselect, min 1; default `DEFAULT_CATEGORIES`).
  2. **How many quotes / quoteCount** (number) — display-only.
  3. **Seconds per quote / secondsPerQuote** (number) — display-only.

- **RSS feed** — `requiresNetwork: true`. The **only** connector that fetches an operator-typed address, so it routes through the SSRF-guarded `safeFetchText`: http(s)-only; DNS-resolved rejection of private/loopback/link-local/CGNAT/reserved IPs; manual per-hop redirect re-checking (max 5); 5MB body cap; 15s timeout; DOCTYPE stripped before parsing (billion-laughs guard). Cache key is a SHA1 of the normalized feed URL.
  1. **Feed address / url** (required): the RSS or Atom feed URL (usually homepage + `/feed` or `/rss`).
  2. **Layout** (`displayMode` select).
  3. **Theme**: Light or Dark (default Dark).
  4. **Show QR code** (switch, default on) — scannable code beside each story.
  5. **How many stories / itemCount** (number, Feed Settings section).
  6. **Seconds per story / secondsPerStory** (number, Feed Settings section).

- **News headlines** — `requiresNetwork: true`, refresh 300s. A curated front-end to RSS: same connector, same layouts, no key. The operator picks a publisher instead of typing a feed URL. Cache is shared with any RSS instance on the same feed.
  1. **News source / url** (required select): pick a publisher (BBC top/world/business/tech/sport, Sky News, NPR, Al Jazeera, Fox, CNBC, ESPN, TechCrunch, The Verge, Hacker News, The Guardian). For any other feed, use the RSS app.
  2. **Layout / displayMode**, **Theme**, **Show QR code**, **How many stories / itemCount**, **Seconds per story / secondsPerStory** — identical to the RSS app.
  > To add or retire a publisher, edit `packages/apps/src/news/sources.ts` (a test enforces unique https feed URLs); nothing else changes.

---

## 4. Keyed data apps

### 4.1 Stocks (`ALPACA_API_KEY_ID` + `ALPACA_API_SECRET_KEY` — both mandatory)

`requiresNetwork: true`, refresh 300s. `runtimeKind` embed, version 1.

**Server setup (once):**
1. Create an Alpaca account at **https://alpaca.markets** and generate **Market Data API** credentials. (`.env.example`: *"Create keys at https://alpaca.markets (Market Data API); both are required."*)
2. Set **both** env vars — they are **MANDATORY**:
   - `ALPACA_API_KEY_ID`
   - `ALPACA_API_SECRET_KEY`
   The connector (`stocks.connector.ts` lines 101–102) calls `requireConnectorKey('ALPACA_API_KEY_ID')` and `requireConnectorKey('ALPACA_API_SECRET_KEY')`; `requireConnectorKey` (`env.util.ts`) **throws if either is unset/blank**, so the app **fails cleanly** — the screen holds last-known-good quotes, flagged stale — until both are set.
3. **Commercial use:** Alpaca is commercial-friendly. The free tier serves **IEX** data and its terms allow commercial use (documented in `stocks.connector.ts` and `.env.example`).
4. The keys are sent as HTTP headers `APCA-API-KEY-ID` and `APCA-API-SECRET-KEY` to `https://data.alpaca.markets/v2/stocks/snapshots` (`feed=iex`). A 401/403 surfaces as **"Alpaca credentials rejected"**.

**Per-instance steps:**
1. **Tickers** (key `symbols`, repeater, **required**, min 1): one ticker per row (e.g. AAPL, MSFT, TSLA). Each row is a `symbol` text field (required, placeholder `AAPL`). The connector uppercases, de-duplicates, sorts, and caps at **15** symbols (`MAX_SYMBOLS`).
2. **Show daily change** (`showChange`, switch, default true) — display-only.
3. **Theme** (`theme`, select, default `dark`; Light/Dark).
4. Plus shared style fields from `styleFields()`.

> Note: `manifest.ts` still has a stale doc comment referencing "Finnhub" and a "textarea", but the live `configSchema` uses a **repeater** and the connector uses **Alpaca**. Cache key is coarse over the sorted ticker set (`stocks:AAPL,MSFT,…`) so screens on the same tickers share one fetch.

### 4.2 Sports (`THESPORTSDB_API_KEY` — optional)

`requiresNetwork: true`, refresh 600s. `runtimeKind` embed, version 1.

**Server setup:** **Optional — none required to use the app.** `sports.connector.ts` does **NOT** call `requireConnectorKey`; `apiKey()` reads `process.env.THESPORTSDB_API_KEY?.trim() || '3'`, defaulting to TheSportsDB's free public test key `3`. The app works out of the box with zero configuration.
- To **raise rate limits**, optionally obtain your own key from TheSportsDB (**https://www.thesportsdb.com/api**) and set `THESPORTSDB_API_KEY`. (`.env.example`: *"Optional: defaults to the free public test key; set your own for higher limits"*.)
- Because the key is optional and defaulted, a missing/blank `THESPORTSDB_API_KEY` does **not** fail the app — unlike Stocks.

**Per-instance steps:**
1. **Team** (key `team`, text, **required**, placeholder `Arsenal`): e.g. "Arsenal", "FC Copenhagen", "LA Lakers". Resolved by name via `searchteams.php`; an unresolved name throws **"team not found"**.
2. **Show** (`mode`, select, default `upcoming`; Upcoming fixtures / Recent results / Both) — display-only.
3. **How many** (`count`, number, default 5, min 1 / max 10) — per section; connector stores up to `MAX_STORED=10`.
4. **Theme** (`theme`, select, default `dark`; Light/Dark).
5. Plus shared style fields from `styleFields()`.

> Cache key is team-only, lowercased (`sports:arsenal`), so mode/count don't fan out fetches. The connector pulls `eventsnext.php` + `eventslast.php` in parallel; failure of either (e.g. a premium-gated endpoint) degrades to an empty section rather than failing the app.

---

## 5. Connected apps (OAuth)

Every connected app requires **`ENCRYPTION_KEY`** set on the server (see §0.3) — without it, all OAuth flows are disabled. Each also needs **`PUBLIC_API_URL`** set to a real HTTPS origin so providers can call the redirect URI back. First register the OAuth application per provider below; then configure each app instance.

### 5.1 Provider setup (do once per provider)

**The connection redirect URI is DISTINCT from any login-flow callback.** It is always:
```
https://<PUBLIC_API_URL>/api/v1/connections/oauth/<provider>/callback
```
where `<provider>` is one of `google | microsoft | meta | linkedin | canva`, `/v1/` is literal, and `api` is `API_PREFIX`. Register it **exactly**.

#### Google — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Console:** https://console.cloud.google.com/apis/credentials (Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID; configure the OAuth consent screen; enable the Google Calendar / Sheets / Slides APIs the apps use).
- **Redirect URI (register exactly):** `https://<PUBLIC_API_URL>/api/v1/connections/oauth/google/callback`
- **Reserved scopes (auto-prepended):** `openid`, `email` (used to derive the account label).
- **Steps:**
  1. Create an OAuth 2.0 Client ID (**Web application**).
  2. Register the redirect URI above — this is the **connection** callback (`/connections/oauth/google/callback`), **distinct** from the login flow's `GOOGLE_CALLBACK_URL` (`/auth/google/callback`). Register both if you also use Google login.
  3. Put the client id in `GOOGLE_CLIENT_ID`, secret in `GOOGLE_CLIENT_SECRET` (config namespace `google`).
  4. **No PKCE** (confidential client). The code sets `access_type=offline` + `prompt=consent` + `include_granted_scopes=true` so Google returns a refresh token. Auth URL `https://accounts.google.com/o/oauth2/v2/auth`; token URL `https://oauth2.googleapis.com/token`.
- **Approvals:** Configure the OAuth consent screen; enable the corresponding Google APIs. Calendar/Sheets/Slides are **sensitive** scopes — to let users **outside your test-user list** connect (past the 100-user cap and without the "unverified app" warning), the app must **pass Google OAuth verification / app review**. Owner/test accounts work without it.

#### Microsoft — `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
- **Console:** https://entra.microsoft.com (Microsoft Entra admin center → App registrations).
- **Redirect URI (register exactly, under Web):** `https://<PUBLIC_API_URL>/api/v1/connections/oauth/microsoft/callback`
- **Reserved scopes:** `openid`, `email`, `offline_access` (`offline_access` is what makes Microsoft return a refresh token).
- **Steps:**
  1. Register an application in Entra.
  2. Add the redirect URI above under **Web** redirect URIs.
  3. Create a client secret; set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` (config namespace `microsoft`).
  4. **No PKCE** (confidential client). Uses the `common` authority. Auth URL `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`; token URL `.../common/oauth2/v2.0/token` (`response_mode=query`).
- **Approvals:** The `common` authority lets both work/school **and** personal accounts connect. Some Graph delegated scopes (e.g. `Calendars.Read`) **may require tenant admin consent**; multi-tenant use may need **publisher verification** (there is no Meta-style app review). Account label from Graph `/me` (mail or userPrincipalName).

#### Meta — `META_CLIENT_ID`, `META_CLIENT_SECRET`
- **Console:** https://developers.facebook.com (create an app; add the **Facebook Login** product).
- **Redirect URI (register exactly, as a Valid OAuth Redirect URI):** `https://<PUBLIC_API_URL>/api/v1/connections/oauth/meta/callback`
- **Reserved scopes:** `public_profile` (granted implicitly; supplies the account name).
- **Steps:**
  1. Create an app at developers.facebook.com and add Facebook Login.
  2. Add the redirect URI above as a **Valid OAuth Redirect URI**.
  3. Copy App ID → `META_CLIENT_ID`, App Secret → `META_CLIENT_SECRET` (config namespace `meta`).
  4. **No PKCE.** Scopes are sent **comma-separated**. The flow is two-hop: code → short-lived user token → long-lived (~60-day) token. Auth URL `https://www.facebook.com/v22.0/dialog/oauth`; token URL `https://graph.facebook.com/v22.0/oauth/access_token` (Graph pinned to **v22.0**).
- **Approvals — REQUIRED:** **Meta App Review AND Business verification** are required before Page-feed / business-Instagram permissions (e.g. `instagram_basic`, `pages_read_engagement`) work with accounts you do **not** own. Accounts you own / are a tester/role on work in dev mode without review.
- **Token note:** Meta issues **no refresh token**. The long-lived token is stored as both access and "refresh"; the service under-reports expiry (`REPORTED_TTL_SECONDS = 30 days`) so it re-extends via `fb_exchange_token` roughly monthly, inside the ~60-day hard limit. An expired token can only be **re-consented**, not re-extended.

#### LinkedIn — `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- **Console:** https://www.linkedin.com/developers/apps (create an app; it must be **verified against the Company Page that owns it** before any product can be requested).
- **Redirect URI (register exactly, under Auth → Authorized redirect URLs):** `https://<PUBLIC_API_URL>/api/v1/connections/oauth/linkedin/callback`
- **Reserved scopes:** `r_basicprofile` (prepended by the provider; supplies the "Connected as …" name).
- **Steps:**
  1. Create the app **under your company's LinkedIn Page** and complete **Page verification** (a Page super-admin clicks the verification link).
  2. Add the redirect URL above under **Auth → OAuth 2.0 settings**.
  3. Products tab: request **Community Management API**, then fill in the access-request form (see approvals below).
  4. Copy Client ID → `LINKEDIN_CLIENT_ID`, Client Secret → `LINKEDIN_CLIENT_SECRET` (config namespace `linkedin`).
  5. **No PKCE.** Scopes are **space-delimited**. Auth URL `https://www.linkedin.com/oauth/v2/authorization`; token URL `https://www.linkedin.com/oauth/v2/accessToken`. Every data call is the **versioned** REST API and carries `LinkedIn-Version` (pinned to `202606` in `linkedin-api.ts`) plus `X-Restli-Protocol-Version: 2.0.0`.
- **Approvals — REQUIRED:** the **Community Management API** product must be granted before `rw_organization_admin` / `r_organization_social` / `r_basicprofile` exist on the app; requesting a scope the app does not hold fails the whole authorization with *invalid scope*. Unlike Meta there is **no unreviewed dev mode** — even reading a Page you own needs the product. Approval has two tiers, and **both are applied for**:
  - **Development tier** (the default on approval) — for registered legal organizations, commercial use cases, verified business email + verified Page-associated app. Hard limits: **500 app calls / 24h**, **100 calls per member / 24h**, **BATCH_GET disabled entirely**, and the integration is expected to be finished within 12 months.
  - **Standard tier** — production, no limits. Requires a screencast of the OAuth flow and the app's core functionality, plus a valid privacy policy.
  > `rw_organization_admin` is a **read/write-named** scope, which is why the consent screen says "manage your Pages". Community Management offers no read-only admin scope (`r_organization_admin` belongs to the Advertising API product), and it is the only way to enumerate a member's Pages. SignageWall never writes; the config-form help text tells the operator the same thing.
  >
  > BATCH_GET being disabled on the Development tier is why the Page-name lookup is best-effort: the picker retries names one Page at a time (capped at 10) and otherwise labels entries `Page <id>`.
- **Token note:** LinkedIn issues **60-day access tokens** and a **refresh token only for apps approved for "Programmatic Refresh Tokens"**. With one, the scheduler's proactive pass renews the connection indefinitely; without one the connection simply **lapses after 60 days** and the operator reconnects (there is no re-extension trick like Meta's `fb_exchange_token`). Account label from `https://api.linkedin.com/v2/me`.

#### Canva — `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`
- **Console:** https://www.canva.com/developers (Canva Developers → create a Connect API integration).
- **Redirect URI (register exactly):** `https://<PUBLIC_API_URL>/api/v1/connections/oauth/canva/callback`
- **Reserved scopes:** none prepended.
- **Steps:**
  1. Create a Canva **Connect API** integration.
  2. Register the redirect URL above.
  3. Set `CANVA_CLIENT_ID` and `CANVA_CLIENT_SECRET` (config namespace `canva`). They are read by `configuration.ts` and validated in `env.validation.ts`, and are present in `.env.example`.
  4. **PKCE is MANDATORY:** the service generates a `code_verifier`, stashes it in the signed OAuth state, and sends a SHA-256 `code_challenge` (`code_challenge_method=S256`). Scopes are space-joined. Auth URL `https://www.canva.com/api/oauth/authorize`; token URL `https://api.canva.com/rest/v1/oauth/token`.
- **Approvals:** Connect apps start **private/limited to your own team**; to let arbitrary operators (accounts you don't own) connect, submit the integration for **Canva review/approval**. Personal and business Canva accounts are both supported. Refresh tokens are single-use and rotate — the service persists the new one each refresh. Account label from `https://api.canva.com/rest/v1/users/me/profile`.

### 5.2 Per connected app

Each app is: **connect an account** (one sign-in via the OAuth field → `connectionId`) then **pick a resource** from a searchable async dropdown (`remote-select`), then set display-only options.

- **Google Calendar** (`gcal`, provider google) — refresh 300s, `requiresNetwork: false` (push via `events.watch` when `PUBLIC_API_URL` set, else polling).
  - **Scope:** `https://www.googleapis.com/auth/calendar.readonly`
  - **Env:** `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  1. Connect a Google account via the **Google account** OAuth field — SignageWall only reads calendars.
  2. Pick the **Calendar** from the searchable async dropdown (`remoteSource: google-calendars`).
  3. Display-only options: Calendar view (day/week/month/schedule), "Only show upcoming events" (schedule only), Auto scroll, Language (en/sr), Theme (light/dark).

- **Google Sheets** (`gsheets`, provider google) — refresh 900s, `requiresNetwork: false`.
  - **Scopes:** `https://www.googleapis.com/auth/drive.metadata.readonly`, `https://www.googleapis.com/auth/spreadsheets.readonly`
  - **Env:** `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Enable the Sheets API **and** Drive API on the same Google project as Calendar.
  1. Connect a Google account.
  2. Pick the **Spreadsheet** (`remoteSource: google-sheets` — lists your Drive).
  3. Enter the **Range** in A1 notation (**required** text field, e.g. `A1:D20` or `Sheet1!A1:D20`) — this is part of the cache key.
  4. Display-only: Layout (Table / Single value KPI), "First row is a header", Theme, plus shared style fields.

- **Google Slides** (`gslides`, provider google) — refresh 900s, `requiresNetwork: false`.
  - **Scopes:** `https://www.googleapis.com/auth/presentations.readonly`, `https://www.googleapis.com/auth/drive.metadata.readonly`
  - **Env:** `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, **plus R2** (`R2_*`) for the mirrored slides. Enable the Slides API **and** Drive API.
  1. Connect a Google account.
  2. Pick the **Presentation** (`remoteSource: google-presentations` — from your Drive).
  3. Display-only numbers: Seconds per slide (1–120, default 8), Slides to show (0 = all, max 100).
  > **Live sync.** The connector registers a Drive `files.watch` push channel on the deck, so an edit reaches the screens within seconds; the 900s poll is the fallback and also what renews the channel. Push needs `PUBLIC_API_URL` (or `WEBHOOK_PUBLIC_URL`) set to an address Google can reach — without one the app still works, just on the poll cadence.
  >
  > ⚠️ **Google push needs a domain you own.** Beyond being reachable over HTTPS, the callback domain must be **verified in Google Search Console** and listed under **Domain verification** in the Cloud project. An unverified host — notably an ephemeral `*.trycloudflare.com` / `*.ngrok.io` dev tunnel — makes `files.watch` return **403 `Unauthorized WebHook callback channel`**, logged as `drive watch failed`. Nothing breaks: the connector skips the subscription and the poll carries the data. **This applies to every Google push app** (Calendar, Sheets, menu board), not just Slides. Microsoft Graph push (PowerPoint, Outlook) has no such requirement, which is why a plain dev tunnel is enough there.
  >
  > Slides are exported once per deck revision and **mirrored to R2**, so screens play them from cache and keep working offline. An unchanged deck costs one cheap Drive metadata call per poll — not one export per slide. Decks longer than 100 slides are cut at 100 (logged server-side).

- **Outlook Calendar** (`outlook`, provider microsoft) — refresh 300s, `requiresNetwork: false`.
  - **Scope:** `https://graph.microsoft.com/Calendars.Read`
  - **Env:** `ENCRYPTION_KEY`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
  1. Connect a Microsoft account via the **Microsoft account** OAuth field — read-only.
  2. Pick the **Calendar** (`remoteSource: ms-calendars`); an unset calendar falls back to the account's default calendar view.
  3. Display-only (config keys mirror gcal, reusing the Google Calendar embed): Calendar view, "Only show upcoming events", Auto scroll, Language, Theme.

- **Microsoft Teams** (`teams`, provider microsoft) — refresh 300s, `requiresNetwork: false`.
  - **Scopes:** `https://graph.microsoft.com/Team.ReadBasic.All`, `https://graph.microsoft.com/Channel.ReadBasic.All`, `https://graph.microsoft.com/ChannelMessage.Read.All`
  - **Env:** `ENCRYPTION_KEY`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` (same Entra app as Outlook)
  - **Approval — REQUIRED:** `ChannelMessage.Read.All` requires **Azure AD admin consent** (an admin must approve it once for the tenant). `Team.ReadBasic.All` / `Channel.ReadBasic.All` (the picker) do not. **Personal Microsoft accounts are not supported** — only work/school accounts.
  1. Connect a work/school Microsoft account via the **Microsoft account** OAuth field — read-only, never posts.
  2. Pick the **Channel** (`remoteSource: ms-teams-channels` — one flat "Team · Channel" list built from your joined teams and their channels).
  3. Display-only (reuses the social-feed embed, same as Instagram/Facebook): Layout (Spotlight / Grid), Seconds per message (spotlight only, 2–120), "Show author names", Theme. Messages show the sender as a byline; system/deleted messages are dropped; image-only messages (hosted content needs a token) are skipped.

- **Instagram** (`instagram`, provider meta) — refresh 900s, `requiresNetwork: true` (streams images from Meta's CDN). Graph v22.0.
  - **Scopes:** `instagram_basic`, `pages_show_list`
  - **Env:** `ENCRYPTION_KEY`, `META_CLIENT_ID`, `META_CLIENT_SECRET`
  - **Approval — REQUIRED:** Meta App Review for `instagram_basic` (+ `pages_show_list`) plus **Meta Business Verification** are required for IG accounts you do **not** own. Owned/tester accounts work in dev mode. **The target IG account must be a professional (Business or Creator) account linked to a Facebook Page** — only those appear in the picker.
  1. Connect the Facebook account that manages the IG account via the **Facebook account** OAuth field — read-only, never posts.
  2. Pick the **Instagram account** (`remoteSource: meta-ig-accounts` — only pro accounts linked to a Page; `pages_show_list` enumerates the Pages).
  3. Display-only: Layout (Spotlight / Grid), Seconds per post (spotlight only, 2–120), Show captions, Theme.

- **Facebook Page** (`facebook`, provider meta) — refresh 900s, `requiresNetwork: true` (streams images from Meta's CDN).
  - **Scopes:** `pages_show_list`, `pages_read_engagement`
  - **Env:** `ENCRYPTION_KEY`, `META_CLIENT_ID`, `META_CLIENT_SECRET` (same Meta app as Instagram)
  - **Approval — REQUIRED:** Meta App Review for `pages_read_engagement` (+ `pages_show_list`) plus **Meta Business Verification** are required for Pages you do **not** own. Pages you have a role on work in dev mode.
  1. Connect the Facebook account that manages the Page via the **Facebook account** OAuth field — read-only.
  2. Pick the **Page** (`remoteSource: meta-pages` — only Pages your account manages). `pages_show_list` enumerates the Pages; the connector then derives a Page access token (from the long-lived user token) to read the feed with `pages_read_engagement`.
  3. Display-only: Layout (Spotlight / Grid), Seconds per post (spotlight only, 2–120), Show post text, Theme.

- **LinkedIn Page** (`linkedin`, provider linkedin) — refresh 1800s (the Development tier allows only 100 calls per member per 24h), **no** `requiresNetwork` (text-only payload, so it plays from the cached snapshot). Versioned REST API pinned to `202606`.
  - **Scopes:** `rw_organization_admin`, `r_organization_social` (+ reserved `r_basicprofile`)
  - **Env:** `ENCRYPTION_KEY`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
  - **Approval — REQUIRED:** the **Community Management API** product (Development tier at minimum). There is no unreviewed dev mode, so until it is granted this app cannot be used at all — not even on a Page the operator administers. The connected member must be an **APPROVED ADMINISTRATOR** of the Page.
  1. Connect the LinkedIn account that administers the Page via the **LinkedIn account** OAuth field — read-only, never posts (despite the "manage your Pages" wording LinkedIn shows; see the provider note above).
  2. Pick the **Page** (`remoteSource: linkedin-orgs`). The picker reads the member's `ADMINISTRATOR`/`APPROVED` role assignments (`organizationAcls`) and titles them via `organizationsLookup`, falling back to per-Page GETs where that batch call is unavailable (Development tier) and to `Page <id>` labels where both are — the selection still works, since the id is what the connector fetches with.
  3. Display-only: Layout (Spotlight / Grid), Seconds per post (spotlight only, 2–120), Theme.
  > **Text-only, deliberately.** LinkedIn returns post images as `urn:li:image:…` URNs, and resolving one to a URL requires a GET on the Images API — which LinkedIn permits only for tokens holding a **write** scope (`w_organization_social` / `rw_ads`). SignageWall never asks an operator for permission to publish to their Page, so posts render as text heroes (same as Teams messages), article posts fold in their title + description, and image-only posts are skipped. There is therefore no "Show post text" toggle: with no image posts it would toggle nothing.

- **Canva** (`canva`, provider canva) — refresh 900s, `requiresNetwork: true` (renders exported asset from Canva CDN).
  - **Scopes:** `design:meta:read`, `design:content:read`, `profile:read`
  - **Env:** `ENCRYPTION_KEY`, `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`.
  - **Approval:** private to your own team until submitted for Canva review/approval.
  1. Connect a Canva account via the **Canva account** OAuth field — one sign-in; token auto-refreshes each fetch.
  2. Pick the **Design** (`remoteSource: canva-designs` — queries Canva live).
  3. Display-only numbers: Seconds per page (min 1, default 8; multi-page designs only), Pages to show (0 = all).
  > The connector picks the best export format (mp4 > jpg > png) via an async export job state machine (`timeoutMs 20000`).

---

## Appendix — full env checklist

Copy-paste and fill. Grouped by purpose; one-line purpose each.

### Baseline (platform)
```
# Required — app will not boot without these
MONGODB_URI=            # primary datastore (Mongoose) connection URI
JWT_ACCESS_SECRET=      # signs access JWTs + OAuth state JWT (min 32 chars)
JWT_REFRESH_SECRET=     # signs refresh JWTs (min 32 chars, different value)

# Optional — sensible defaults
JWT_ACCESS_EXPIRES_IN=          # default 15m
JWT_REFRESH_EXPIRES_IN=         # default 7d
NODE_ENV=                       # production in prod; gates Swagger/dev fallbacks
PORT=                           # default 3000; localhost fallback for redirect URIs
API_PREFIX=                     # default api; part of every route + OAuth callback path
FRONTEND_URL=                   # CMS origin (CORS, email links, OAuth success)
PLAYER_URL=                     # signage player origin

# Media store (Cloudflare R2) — needed for image/video uploads
R2_ACCOUNT_ID=                  # R2 account id
R2_ACCESS_KEY_ID=               # R2 S3 access key id
R2_SECRET_ACCESS_KEY=           # R2 S3 secret (or cfat_/cfut_ token)
R2_BUCKET=                      # R2 bucket name
R2_PUBLIC_URL=                  # public base URL media is served from
MEDIA_MAX_FILE_SIZE_BYTES=      # default 10485760 (10MB)
MEDIA_MAX_FILES_PER_UPLOAD=     # default 10

# Outbound mail
MAIL_ENABLED=                   # true in prod (default false)
RESEND_API_KEY=                 # Resend key; required when MAIL_ENABLED=true
MAIL_FROM=                      # default "SignageWall <onboarding@resend.dev>"
MAIL_SUPPORT_TO=                # feedback/problem-report inbox
MAIL_REGISTRATIONS_NOTIFY_TO=   # new-registration inbox (default edgeplus2026@gmail.com)

# Redis (only if running the AI content generator)
REDIS_URL=                      # full URL, e.g. rediss://:pass@host:6379 (takes precedence)
REDIS_HOST=                     # default localhost
REDIS_PORT=                     # default 6379
REDIS_PASSWORD=                 # default none
REDIS_TLS=                      # true for managed Redis over TLS

# Rate limiting / docs
THROTTLE_TTL_SECONDS=           # default 60
THROTTLE_LIMIT=                 # default 120
THROTTLE_AUTH_TTL_SECONDS=      # default 60
THROTTLE_AUTH_LIMIT=            # default 10
SWAGGER_ENABLED=                # force Swagger on/off (default: on in non-prod)
```

### Keyed data apps
```
# Stocks — BOTH required; app fails cleanly (holds last quotes) if either is unset
ALPACA_API_KEY_ID=              # Alpaca Market Data API key id (https://alpaca.markets)
ALPACA_API_SECRET_KEY=          # Alpaca Market Data API secret

# Sports — OPTIONAL; defaults to TheSportsDB free test key "3"
THESPORTSDB_API_KEY=            # your own key for higher limits (https://www.thesportsdb.com/api)
```

### OAuth providers (connected apps)
```
# Gate for ALL connected apps — encrypts OAuth tokens at rest; must be STABLE
ENCRYPTION_KEY=                 # AES-256-GCM key: openssl rand -base64 32
PUBLIC_API_URL=                 # public HTTPS API base; builds the OAuth redirect URI

# Google (Calendar, Sheets, Slides-private) — reserved scopes openid,email
GOOGLE_CLIENT_ID=               # OAuth 2.0 Web client id (console.cloud.google.com)
GOOGLE_CLIENT_SECRET=           # OAuth 2.0 client secret
# redirect: https://<PUBLIC_API_URL>/api/v1/connections/oauth/google/callback

# Microsoft (Outlook Calendar) — reserved scopes openid,email,offline_access
MICROSOFT_CLIENT_ID=            # Entra app registration client id (entra.microsoft.com)
MICROSOFT_CLIENT_SECRET=        # Entra client secret
# redirect: https://<PUBLIC_API_URL>/api/v1/connections/oauth/microsoft/callback

# Meta (Instagram, Facebook) — reserved scope public_profile; App Review + Business verification required
META_CLIENT_ID=                 # Facebook app id (developers.facebook.com)
META_CLIENT_SECRET=             # Facebook app secret
# redirect: https://<PUBLIC_API_URL>/api/v1/connections/oauth/meta/callback

# LinkedIn (LinkedIn Page) — reserved scope r_basicprofile; Community Management API approval required
LINKEDIN_CLIENT_ID=             # LinkedIn app client id (linkedin.com/developers)
LINKEDIN_CLIENT_SECRET=         # LinkedIn app client secret
# redirect: https://<PUBLIC_API_URL>/api/v1/connections/oauth/linkedin/callback

# Canva — PKCE mandatory
CANVA_CLIENT_ID=                # Canva Connect integration client id (canva.com/developers)
CANVA_CLIENT_SECRET=            # Canva Connect client secret
# redirect: https://<PUBLIC_API_URL>/api/v1/connections/oauth/canva/callback
```

> Reminders: register each redirect URI **exactly** as shown; the connection callback (`/connections/oauth/google/callback`) is **not** the login callback (`GOOGLE_CALLBACK_URL` → `/auth/google/callback`) — register both if you use Google login. Re-register all provider redirect URIs if you ever change `PUBLIC_API_URL` or `API_PREFIX`.
