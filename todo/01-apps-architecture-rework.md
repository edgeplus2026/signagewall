# 01 — Apps arhitektura (rework): generic iframe host + connector runtime + kategorije

## Context

Apps su najkorišćeniji deo digital signage-a, a trenutna implementacija je slaba:
logika aplikacija živi i u **playeru** (per-slug native registry), pa svaki novi
app traži izmenu player koda; runtime postoji **samo za `static`** aplikacije
(weather/RSS/kalendar — koji su zapravo najkorisniji — ne rade); nema kategorija;
i nema rešenja za rate-limit free API-ja kad 100 playera traži isti podatak.

Vizija (potvrđena sa vlasnikom proizvoda):
- **Player je glup**: jedan generički iframe host za SVE aplikacije, bez logike i
  bez definisanja pojedinačnih apps u playeru. App = samostalan web bundle koji se
  učita u sandbox-ovani iframe; config + podaci stižu preko `postMessage`.
- **Real-live aplikacije** (weather, vesti, kursna lista) uz **static** i
  **live-sync preko webhook-ova** (npr. OneDrive konekcija → dokument uvek sync na ekranu).
- **CRON + dedup po identifikatoru**: free API se zove **jednom po lokaciji/ključu**
  (npr. `weather:belgrade`) na ~15 min i rezultat se fan-out-uje svim playerima —
  umesto 100 zasebnih poziva.
- **Kategorije aplikacija** + super-admin koji bira/kreira proizvoljne kategorije.

Dobra vest: kontrakt je **već dizajniran za ovo** — `AppConnector.cacheKey()` u
[connector.ts](../packages/apps-contract/src/connector.ts) doslovno opisuje dedup
fan-out, a `RuntimeKind='embed'` anticipira iframe runtime. Fali **runtime**.

## Trenutno stanje (grounded)

- Player: per-slug native registry [registry.tsx](../apps/player/src/apps/registry.tsx)
  (`REGISTRY = { youtube: YouTubeApp }`) — svaki app je Preact komponenta
  ukompajlirana u player. Nema embed/iframe putanje (komentar: *"sandboxed iframes — a later addition"*).
- Kontrakt: [packages/apps-contract](../packages/apps-contract/src) — `manifest`,
  `field-schema`, `connector`, `instance` (zreo). `dataSource: static|server|connected`,
  `runtimeKind: native|embed`.
- BE apps modul: katalog, app-instances, org-apps, admin (CRUD zreo), ali
  `app-instances.service` **ne izvršava connector-e** (nema `fetchData`, nema scheduler-a,
  nema connections/OAuth store-a). Schema [app.schema.ts](../apps/be/src/modules/apps/schemas/app.schema.ts)
  nema `category` ni cache polja.
- CMS apps feature: schema-driven config forme ([config-form](../apps/cms/src/features/apps/config-form)),
  katalog, instance, live preview — solidno.

## Cilj

1. Player: **jedan generički iframe app-host**, bez per-app logike.
2. BE: **connector runtime** sa CRON dedup fan-out-om (rešava API rate-limit).
3. **`connected` apps** (OAuth) + **webhook live-sync** (OneDrive i sl.).
4. **Kategorije** + super-admin upravljanje kategorijama.
5. Konsolidacija: sva app logika van playera.

## Pristup

### Faza 1 — Generic iframe app-host u playeru (uklanja player logiku)
- Zameni `REGISTRY` + per-app komponente jednim `AppHost` koji renderuje
  `<iframe sandbox="allow-scripts" referrerpolicy="no-referrer">` i učita app bundle po
  URL-u: `${APPS_BASE}/<slug>/index.html`.
- App dobija `config` (iz `AppRenderable`) + connector `data` (payload) preko
  **postMessage handshake-a** — reuse obrasca iz [preview-handshake.ts](../apps/player/src/sync/preview-handshake.ts)
  (iframe javi `app-ready` → host pošalje `{config, data}` adresirano na app origin).
- App bundle-i: svaki app je folder u `packages/apps/<slug>/` koji se builduje u
  statički bundle i servira sa poznatog origin-a (za MVP: isti origin kao player,
  pod `/apps/<slug>/`). Native YouTube postaje običan bundle.
- `slot.ts`: `prepareApp` više ne zove `renderApp` (Preact) već montira `AppHost`
  iframe i čeka `app-ready` pre `show()` (readiness gating — rešava i raniji nedostatak).
- Sandbox/izolacija: 3rd-party apps → cross-origin + strogi sandbox; first-party →
  same-origin dozvoljen. Postojeća YouTube CSP/`allow` pravila se prenose na host.

### Faza 2 — Connector runtime (server apps) + CRON dedup fan-out
- Implementiraj registry konektora u BE (`AppConnector` po slug-u) — npr.
  `weather`, `rss`, `exchange-rate`. Svaki ima `cacheKey(config)` i `fetchData()`.
- **Scheduler (CRON, ~15 min / per-manifest cadence)**: za svaki **distinct cacheKey**
  koji bar jedna instanca koristi → pozovi `fetchData` **jednom**, snimi `playerPayload`
  u keš kolekciju (`AppDataCache { cacheKey, slug, payload, fetchedAt, expiresAt }`).
  → 100 × `weather:belgrade` = **1 upstream poziv** / 15 min.
- Fan-out: kad payload za cacheKey promeni → push svim ekranima čije instance
  koriste taj key. Reuse postojećeg event seam-a: novi `PlayerEvents.AppDataChanged`
  → gateway emituje `app:data` (ili ugradi payload u `content:update` snapshot).
- Player: app payload se nosi u snapshot-u (`AppRenderable.data`) i persistuje u idb,
  pa app radi i **offline** (poslednji poznati payload). Host ga prosledi iframe-u.
- Dedup mapiranje: indeks `app-instance → cacheKey` da scheduler zna koje keyeve da
  osvežava i koje ekrane da obavesti.

### Faza 3 — `connected` apps (OAuth) + webhook live-sync
- `Connections` modul: OAuth flow + enkriptovano čuvanje tokena (`secrets` nikad ne
  napuštaju BE — već propisano u connector kontraktu).
- Webhook ingress: provider subscriptions (npr. Microsoft Graph change notifications za
  OneDrive) → na promenu pozovi `fetchData` za taj cacheKey → fan-out (kao Faza 2).
  Time je "dokument uvek sync" bez pollinga.

### Faza 4 — Kategorije + super-admin
- `AppCategory` entitet (`{ id, name, slug, order }`) + super-admin CRUD (kreiraj/preimenuj/obriši
  proizvoljnu kategoriju). App dobija `categoryIds` (više kategorija). Katalog filter po kategoriji.
- CMS: super-admin tab za kategorije; katalog ([AppCatalogTab.tsx](../apps/cms/src/features/apps/components/AppCatalogTab.tsx)) dobija filter.

## MVP set aplikacija (šta napraviti na ovoj platformi)

Cilj nije broj, nego ~9 aplikacija koje pokrivaju 80%+ realnih signage potreba — bez
API-rate problema (server appovi su read-only feedovi sa cacheKey fan-out-om).

### Tier 1 — must (svaki ozbiljan DS ovo ima)
| App | Tip | Napomena |
|---|---|---|
| Clock / Date (digital+analog) | `static` | Najčešća app; ide u svaku zonu |
| Text / Announcement (rich text) | `static` | Brze poruke/najave |
| QR code (iz URL/teksta) | `static` | Meniji, promo, contactless |
| Countdown / Counter | `static` | Eventi/promo |
| YouTube | embed | Već postoji |
| **Web page / URL embed** | embed | Bilo koji sajt/dashboard — skoro besplatno kad player postane iframe host (Faza 1) |
| **Weather** | `server` | Flagship live app; `cacheKey = weather:<grad / zaokr. koord>` (grubo, da playeri dele fetch); free API (npr. Open-Meteo — bez ključa/limita) |
| **RSS / News ticker** | `server` | `cacheKey = rss:<hash(url)>`; idealan kao ticker zona |

### Tier 2 — jako preporučeno (čim radi connector/OAuth)
| App | Tip | Napomena |
|---|---|---|
| Kursna lista / Exchange rate | `server` | Regionalno korisno; `cacheKey = fx:<base>`; free API (npr. exchangerate.host / NBS) |
| Google Calendar / Office 365 | `connected` | Kancelarije/meeting-room; OAuth (Faza 3) |
| Google Slides / PDF | `connected` | Sadržaj u alatima koje korisnik zna; OAuth (Faza 3) |

### Preskoči u MVP-u (svesno)
- Društvene mreže (Instagram/X/FB) — API restrikcije + OAuth muka, nizak ROI.
- Stocks/crypto, mape, transit, letovi, IPTV/HLS — niše.
- Google Sheets / KPI dashboard — korisno ali kasnije (data-heavy `connected`).

### Redosled gradnje appova (mapira na faze gore)
1. **Faza 1 (static + embed):** Clock, Text, QR, Countdown, Web page (+ YouTube postoji) → ~6 odmah.
2. **Faza 2 (connector):** Weather, RSS, Exchange rate → prva tri `server` appa preko CRON dedup-a.
3. **Faza 3 (connected):** Calendar, Slides → v1.1 (nose OAuth flow).

> cacheKey strategija je ključ protiv API-limita: 100 playera sa "Weather Belgrade" →
> **1 upstream poziv / refresh ciklus**, fan-out svima (videti Faza 2).

## Fajlovi (orijentir)
- Player: novi `apps/player/src/apps/AppHost.tsx` (+ host bridge), izmena
  [registry.tsx](../apps/player/src/apps/registry.tsx) (ukinuti per-slug) i
  [slot.ts](../apps/player/src/engine/slot.ts) (`prepareApp` → iframe + readiness).
- Contract: dodati `data`/payload nosač u `AppRenderable` (player-contract) i
  `AppCategory` tip.
- BE: novi `modules/apps/connectors/*` (registry + weather/rss/...), `app-data.scheduler.ts`,
  `app-data-cache.schema.ts`, `AppDataChanged` event; `modules/connections/*` (Faza 3);
  `category` u [app.schema.ts](../apps/be/src/modules/apps/schemas/app.schema.ts) + `app-category.schema.ts`.
- CMS: super-admin kategorije; katalog filter.

## Odluke (potvrđeno)
- **App bundle hosting**: **same-origin** pod `/apps/<slug>/` (deploy zajedno sa playerom; bez cross-origin muke). Poseban CDN/origin tek ako se otvore 3rd-party appovi ili se ode globalno.
- **Keš storage**: **Mongo kolekcija** (`AppDataCache`) — dovoljno za ~500 playera; Redis tek pri skaliranju.
- **Refresh cadence**: **po app-u u manifestu** (`refreshSeconds`; npr. RSS 5min, weather 15min, fx 1h). Osvežava **interni NestJS `@nestjs/schedule` CRON**: tik ~1min bira "due" cacheKey-eve (`lastFetchedAt` + cadence), dedup `fetchData` jednom po cacheKey-u, pa `AppDataChanged` fan-out. Pri >1 BE instanci: distributed lock / dedicated scheduler rola (kasnije, uz Redis).
- **Native vs embed (1st-party)**: **sve embed (iframe)** — jedan generički handler, bez per-app logike u playeru.
- **Connected/OAuth appovi** (Calendar, Slides, OneDrive webhook live-sync): **v1.1, NE MVP**. MVP app set = static (clock/text/QR/countdown) + server (weather/RSS/fx) + web embed.
- **Skaliranje connector-a (poluge)**: opterećenje = **#distinct cacheKey × cadence**, NE #playera × #appova. Zato: (1) `cacheKey` mora biti **grub/deljen** (po gradu/zaokruženim koordinatama, feed URL-u, baznoj valuti) da playeri klasterišu fetch; (2) CRON tik koristi **bounded concurrency** (npr. max ~10 paralelnih fetch-eva); (3) static appovi = **0** server poziva; (4) playeri ne pituju server — dobijaju push + keširaju lokalno. Realno (300 playera, ~50 gradova + 30 feedova) ≈ ~10 fetch/min — trivijalno.

## Verifikacija
- 100 simuliranih instanci `weather:belgrade` → tačno **1** upstream poziv po ciklusu (log/metric).
- Novi app dodaješ **bez ijedne izmene player koda** (samo bundle + manifest + opciono connector).
- App radi offline iz poslednjeg keširanog payload-a.
- Super-admin kreira kategoriju → app se filtrira po njoj u katalogu.
- Cross-origin app ne može da pristupi parent prozoru (sandbox).

## Procena
Velik task — raditi po fazama. Faza 1 (iframe host) i Faza 2 (connector+CRON) su MVP-vredne;
Faza 3 (OAuth/webhook) i deo kategorija mogu u v1.1.
