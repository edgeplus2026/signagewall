# TODO — MVP task planovi

Planovi za zaokruživanje signage proizvoda. Fajlovi su **poređani po redosledu
implementacije (zavisnost-svesno)**. Svi su prioritet pre MVP-a; broj fajla =
redosled, ne "važnost". (Numeracija je istorijska — premeštene/isporučene stavke
zadržavaju svoj broj radi lakšeg praćenja.)

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
2. **Veliki epovi su višenedeljni** — radi **fazu po fazu** (faze su u fajlu), ne sve odjednom.
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

- **02 — CMS notifikacije (super-admin → korisnici).** In-app inbox (zvono + popover),
  per-jezik sadržaj (en/sr, fallback na en po polju), read-receipts (per-user, bez kopiranja
  dokumenta), realtime `notifications:changed` preko `CmsGateway` (unread refetch), super-admin
  authoring kao **tab u super-admin stranici** (create/edit/publish/unpublish/expiry, Tiptap
  rich-text). Authoring iza `SuperAdminGuard`; inbox za sve autentifikovane korisnike.

## Redosled implementacije (MVP)

| # | Task | Zavisi od | Otključava |
|---|---|---|---|
| [05](./05-player-availability.md) | Availability u playeru (standby) | — (uvodi player `Intl`-evaluator + standby scheduler) | — |
| [08](./08-native-shell-auto-update-tauri.md) | Native-shell auto-update (Tauri) | — (nezavisno) | OTA update fleete |
| [09](./09-legal-tos-privacy-gdpr.md) | Legal (ToS/Privacy) + GDPR brisanje | ~~04 (audit)~~ → deferred, videti napomenu | Javni launch |

**Napomena o 09 ⟶ 04:** 09 je originalno računao na activity-log audit (04) za GDPR trag.
Pošto je **04 premešten u deferred**, GDPR brisanje treba da stoji **samostalno** (bez audit
loga) — ili odblokirati 04 iz deferred-a ako se ispostavi kao tvrd preduslov. Potvrditi sa
vlasnikom pre 09.

**Logika redosleda:** 05 postavlja player `Intl`-evaluator + standby scheduler obrazac
(offline-safe, stojeće pravilo). 08 (Tauri) je nezavisno — uradi kad se player feature-i
stabilizuju. 09 ide poslednje (pre launcha).

## Deferred (van MVP-a, "za sada ne radimo")

Svesno odloženo — **ništa od ovog ne ide u MVP.**

- [`deferred/03-device-offline-alerting.md`](./deferred/03-device-offline-alerting.md) —
  **Device-offline alerting** operateru (in-app upozorenje kad player padne). Reuse-uje
  notifikacioni inbox (02).
- [`deferred/04-activity-log.md`](./deferred/04-activity-log.md) —
  **Activity log** (org audit) — Mongoose plugin + CLS. Uvodi CLS (cross-cutting); bio preduslov za 09.
- [`deferred/06-zones-layouts.md`](./deferred/06-zones-layouts.md) —
  **Zone / Layouts** (podeljen ekran). Najveći feature-gap vs velike konkurente i najveći
  post-MVP ROI, ali nije blocker za fokusiran full-screen MVP.
- [`deferred/07-proof-of-play.md`](./deferred/07-proof-of-play.md) —
  **Proof-of-play / istorija reprodukcije** (now-playing postoji; zone-aware tek posle 06).
- [`deferred/content-scheduling-dayparting.md`](./deferred/content-scheduling-dayparting.md) —
  **Content scheduling / day-parting** (date range, dayparts, prioritet). Kad se vrati: par sa
  zonama (06) i isti `Intl`-evaluator obrazac kao availability (05).
