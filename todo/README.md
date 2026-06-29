# TODO — MVP task planovi

Planovi za zaokruživanje signage proizvoda. Fajlovi su **poređani po redosledu
implementacije (zavisnost-svesno)** — idi 02 → 09 (01 je **isporučen**, videti
"Završeno" niže). Svi su prioritet pre MVP-a; broj fajla = redosled, ne "važnost".

Skala: ~5 playera/user × ~50 usera → **~500 online playera** (bez Redisa / horizontalnog
skaliranja — videti event seam u `player.events.ts` za daleku budućnost).

---

## ⚠️ Za implementera (bez konteksta) — PROČITAJ PRVO

Ovi planovi se predaju agentu/developeru zajedno sa ovim README-om. Pre koda:

**Stack (pnpm + turbo monorepo):**
- `apps/be` — NestJS + Mongoose/MongoDB (modul = controller + service + repository + schemas + dto + mappers).
- `apps/cms` — React + Vite + shadcn/ui + TanStack Query + i18n (en/sr). Feature folder = `api/hooks/components/pages/types`.
- `apps/player` — Preact + Vite, **offline-first**, `@preact/signals`, custom imperativni playback engine.
- `packages/*` — deljeni: **`@edge/player-contract`** (tipovi/validatori player↔BE↔CMS), `@edge/apps-contract`, `@edge/apps`.

**Konvencije (poštuj postojeće):**
- Org-scoping: `OrgMembershipGuard` + `@RequiredOrganizationId()`. i18n: `nestjs-i18n`.
- Cross-module realtime: in-process **`EventEmitter2`** (event seam) → gateway `@OnEvent` fanout. Ne importuj gateway iz domena.
- Deljeni player tipovi idu u **`@edge/player-contract`** (ne dupliraj po app-ovima).
- Player: server precompute + lokalni wall-clock scheduler obrazac (vidi `daily-reload.ts`); ne stavljaj teške libove (luxon/rrule) u player bundle.

**Kako verifikovati (uvek pre "gotovo"):**
- `pnpm type-check` (turbo, ceo workspace) i `pnpm build` moraju biti zeleni.
- Testovi: `pnpm --filter @edge/player test`; BE `jest`. Player lint: `--max-warnings 0`.
- (Postoji **pre-existing** CMS lint/type debt VAN scope-a — ne diraj nepovezane fajlove; ne meri svoj rad po njemu.)

**Pravila rada:**
1. **"Odluke / otvorena pitanja" u svakom fajlu = produktne odluke** — POTVRDI ih sa vlasnikom pre implementacije, **ne pogađaj**.
2. **Veliki epovi (01 apps, 06 zones) su višenedeljni** — radi **fazu po fazu** (faze su u fajlu), ne sve odjednom.
3. Radi na grani; ne commit-uj bez dozvole; ne diraj nepovezane delove.

---

## Završeno (shipped)

- **01 — Apps (iframe host + connector runtime + kategorije + MVP app set).** Player je
  sad generički iframe host (nula per-app logike); connector runtime sa CRON dedup fan-out-om
  (`weather`/`rss`/`fx`), `AppDataCache` (global, coarse cacheKey), kategorije + super-admin CRUD,
  katalog filter. MVP app set radi: clock, text (sa color/bold), qr, countdown, web, youtube,
  weather, rss, fx. Server appovi nose `dataMeta` (fetchedAt + stale "as of …" indikator),
  offline iz poslednjeg keša, error-retry backoff. SSRF-hardened fetch za RSS.
  - ⚠️ **Connected/OAuth (gcal, onedrive, slides + `connections` modul, Graph webhooks) je
    KODIRAN ali van MVP-a (bila v1.1):** nije validiran protiv živih Google/Microsoft providera.
    Drži ga **feature-flag-ovan/skriven** (degradira čisto kad `ENCRYPTION_KEY` nije setovan)
    dok se ne odradi live OAuth round-trip end-to-end. NE računati ga u MVP launch surface.

## Redosled implementacije

| # | Task | Zavisi od | Otključava |
|---|---|---|---|
| [02](./02-cms-notifications.md) | CMS notifikacije (super-admin → korisnici) | — | In-app kanal za 03 |
| [03](./03-device-offline-alerting.md) | Device-offline alerting operateru | 02 (in-app inbox) | — |
| [04](./04-activity-log.md) | Activity log (org audit) — Mongoose plugin + CLS | — (uvodi CLS) | GDPR audit (09) |
| [05](./05-player-availability.md) | Availability u playeru (standby) | — (uvodi player `Intl`-evaluator + standby scheduler) | — |
| [06](./06-zones-layouts.md) | Zone / Layouts (podeljen ekran) | — | Zone-aware proof-of-play (07) |
| [07](./07-proof-of-play.md) | Proof-of-play / istorija reprodukcije | now-playing (postoji); zone-aware posle 06 | — |
| [08](./08-native-shell-auto-update-tauri.md) | Native-shell auto-update (Tauri) | — (nezavisno) | OTA update fleete |
| [09](./09-legal-tos-privacy-gdpr.md) | Legal (ToS/Privacy) + GDPR brisanje | **04** (audit) | Javni launch |

**Logika redosleda:** 01 (Apps) je bio keystone i sad je isporučen — otključao je sve appove
i ticker-zonu za 06. 02→03 (alerting reuse-uje
notifikacioni inbox). 04 uvodi CLS (cross-cutting, treba i za 09). 05 postavlja player
`Intl`-evaluator + standby scheduler obrazac (offline-safe, stojeće pravilo). 06 širi content
model (zone) → proof-of-play (07) postaje zone-aware. 08 (Tauri) je nezavisno — uradi kad se
player feature-i stabilizuju. 09 ide poslednje (pre launcha, zavisi od 04 audita).

### Zones (06) — skok ka "kompletan DS"
**06 (zones/layouts)** je najveći feature-gap vs velike konkurente; ostaje u roadmap-u kao
najveći post-MVP ROI, ali nije blocker za launch fokusiranog full-screen MVP-a.

## Deferred (van MVP-a, "za sada ne radimo")
- [`deferred/content-scheduling-dayparting.md`](./deferred/content-scheduling-dayparting.md) —
  **Content scheduling / day-parting** (raspored po sadržaju: date range, dayparts, prioritet).
  Svesno odložen. Kad se vrati: par sa zonama (06) i koristi isti `Intl`-evaluator obrazac kao
  availability (05) — **stojeće pravilo, ne horizont** (videti korekciju u 05).
