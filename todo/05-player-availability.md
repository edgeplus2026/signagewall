# 05 — Availability u playeru (standby/on-off scheduling)

## Context

Availability (radno vreme ekrana: always / weekly / special) je **odrađena na BE i
u CMS-u**, ali **player je nesvestan toga** — vrti sadržaj 24/7 bez obzira na
raspored. Treba ga integrisati u player: kad je ekran van radnog vremena → standby
(crn/branded ekran, pauzirana reprodukcija), pa nazad na sadržaj kad uđe u prozor.

## Trenutno stanje (grounded)

- **`AvailabilityEvaluator`** ([availability.evaluator.ts](../apps/be/src/modules/screens/availability/availability.evaluator.ts))
  je **stateless, DB-free, DST-aware** (luxon + rrule) i nudi `isOnAt`, `nextTransition`,
  `currentWindow`, `getWindows(range)`. Komentar eksplicitno kaže: *"reused by a future
  device-sync endpoint"* — tj. baš za ovo.
- **Snapshot** ([player-content.service.ts](../apps/be/src/modules/player/player-content.service.ts)
  `PlayerSnapshot`) **ne nosi** availability.
- Player: nema standby/sleep. **`PlayerSocketEvents.Sleep='sleep'` je rezervisan ali
  neiskorišćen** ([player.events.ts](../apps/be/src/modules/player/player.events.ts)).
- Player **već ima** wall-clock scheduler obrazac za ovakve stvari:
  [daily-reload.ts](../apps/player/src/sync/daily-reload.ts) (chunked timeri, DST/sleep-safe).
- `store.view` computed već bira `pairing` vs `playing` — lako proširiti `standby`.

## Cilj

Player ulazi/izlazi iz standby-ja po rasporedu, **offline-safe**, bez dupliranja
teške luxon/rrule logike u player bundle, i bez trošenja CPU/struje dok je off.

## Pristup (pošalji PRAVILO, player evaluira lokalno — neograničeno)

**Ključni princip (potvrđeno):** availability je **stojeće pravilo** koje važi **dok se
ne promeni** — `always` / `weekly` (recurring) / `special` (date-range). NIJE forecast na
par dana. Zato BE šalje **samo pravilo**, a player ga evaluira lokalno i **neograničeno**
→ offline-safe bez obzira koliko je dugo offline (nema "horizonta" koji istekne).

Player **NE** treba luxon/rrule: native **`Intl.DateTimeFormat`** je timezone- i DST-aware
(nula bundle troška) i pokriva i tz konverziju (screen tz vs device tz) i DST.

### BE
- U `PlayerSnapshot` (i `paired` payload) dodaj **config** (ne prelaze):
  ```ts
  availability?: {
    mode: 'always' | 'weekly' | 'special'
    timezone: string
    weekly?: { day: WeekdayKey; enabled: boolean; start: string; end: string }[]
    special?: { startDate: string; endDate: string; start: string; end: string }
  }
  // odsutno = always-on
  ```
- Re-push **samo kad se availability promeni** (postoji update endpoint) ili na content refresh.

### Player
- Mali **availability evaluator** (Intl-based, bez luxon/rrule): za "now" u screen tz
  računa `isOnNow` + `nextBoundaryAt`. Weekly = match day-of-week + HH:mm prozor; special =
  date-range + HH:mm; always = uvek on.
- `AvailabilityScheduler` (klon [daily-reload.ts](../apps/player/src/sync/daily-reload.ts)
  chunked-timer obrasca): arm-uje timer do `nextBoundaryAt`, na granici flipuje
  `availabilityOn` signal i **rekalkuliše** sledeću granicu. Radi **neograničeno** (pravilo
  je stojeće) i potpuno **offline**.
- `store.view`: dodaj `'standby'` → kad `!availabilityOn`, renderuj **Standby** (čisto
  crno) i **pauziraj engine** (ne mount-uj Stage / pauziraj kontrolere) da mediji ne
  dekodiraju i ne troše struju.

### Anti-drift (BE ↔ player)
- Da se logika ne duplira/driftuje: izdvoj **core `isOnAt` / `nextBoundary`** (Intl-based)
  u **shared modul** (npr. `@edge/player-contract`) koji koriste **i player i BE** (BE za
  quiet-hours proveru iz fajla 03). BE zadržava postojeći luxon/rrule
  [AvailabilityEvaluator](../apps/be/src/modules/screens/availability/availability.evaluator.ts)
  **samo** za CMS window-listing/"next transition" prikaz.

### Opciono (server nudge)
- Rezervisani `'sleep'` event kao **dopunski** push na granici (momentalni flip); lokalni
  scheduler ostaje izvor istine (offline-safe).

## Fajlovi (orijentir)
- BE: `PlayerContentService.resolveByScreenId` → mapiraj `screen.availability` u snapshot
  (samo config); `player-contract` `PlayerSnapshot.availability` + CMS mirror; shared
  `isOnAt`/`nextBoundary` u `player-contract`.
- Player: `sync/availability.ts` (Intl evaluator + scheduler, blizanac daily-reload-a) +
  `availabilityOn` signal u [store.ts](../apps/player/src/store.ts); `ui/Standby.tsx` (čisto
  crno); grana u [app.tsx](../apps/player/src/app.tsx)/[Stage.tsx](../apps/player/src/ui/Stage.tsx);
  `view` computed `+ 'standby'`.

## Moja procena (gde bih odstupio)
- **Ne** stavljati luxon/rrule u player — ali rešenje je **`Intl` + stojeće pravilo**, NE
  server-precompute sa horizontom (horizont bi istekao na dugom offline-u; availability je
  stojeće pravilo "dok se ne promeni").
- **Offline-first je obavezan**: lokalni Intl evaluator + scheduler su izvor istine;
  `'sleep'` push je samo dopunski nudge.
- Standby mora da **pauzira engine** (ne samo crni overlay), inače video dekodira 24/7.

## Odluke (potvrđeno)
- **Model isporuke**: BE šalje **availability pravilo (config)**, NE precomputovane prelaze
  ni horizont. Player evaluira **lokalno i neograničeno** (`Intl`), jer pravilo važi dok se
  ne promeni (always / weekly / special).
- **Standby izgled**: **čisto crno** + **engine pauziran** (najmanje burn-in/struja).
- **Anti-drift**: core `isOnAt`/`nextBoundary` (Intl) u **shared modulu** (`player-contract`),
  reuse na player i BE-runtime (quiet-hours iz 03); BE luxon/rrule evaluator ostaje samo za CMS prikaz.

## Verifikacija
- Weekly raspored 09–17 → u 16:59 vrti, u 17:00 standby; u 09:00 opet vrti (test sa fake clock-om).
- DST dan: prozor ostaje na ispravnom wall-clock vremenu (`Intl` to pokriva).
- **Offline 30 dana** pa preko granice → flip se i dalje desi (pravilo se evaluira lokalno, bez horizonta).
- Special date-range istekne → posle `endDate` se ponaša po default-u (always-on / sledeći mode).
- Standby → engine pauziran (nema video dekodiranja), brz povratak na sadržaj.

## Procena
Mala-srednja. Najveći deo logike (evaluator) već postoji; player scheduler je klon daily-reload-a.
