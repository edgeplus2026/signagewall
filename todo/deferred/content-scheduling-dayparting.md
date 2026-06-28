# Content scheduling / day-parting — DEFERRED (van MVP-a, "za sada ne radimo")

> ⚠️ **Odloženo iz MVP-a.** Kad se oživi: pristup u nastavku još koristi stari
> "server precompute + horizont" model — **revidirati** na isti obrazac kao
> availability (05): **stojeće pravilo + `Intl` lokalna evaluacija**, bez horizonta
> (per-item schedule pravila idu playeru, koji ih evaluira lokalno i neograničeno).
> Kompozabilno sa zonama (06).

## Context

Availability (todo 05) pali/gasi **ceo ekran** po radnom vremenu. Ali zreli DS alati
imaju i **scheduling po sadržaju**: pusti određeni sadržaj samo u nekom periodu
(date range), u određenim satima dana (day-parting), sa prioritetom/kampanjama —
npr. "doručak meni 07–11, ručak 11–16", ili "promo baner samo 1–15. dec". To je
core signage funkcija koju trenutno nemamo.

## Trenutno stanje (grounded)

- **ScreenItem** ([screen.schema.ts](../apps/be/src/modules/screens/schemas/screen.schema.ts))
  ima `order/duration/disabled` — **nema schedule**. Isto i playlist item.
- [player-content.service.ts](../apps/be/src/modules/player/player-content.service.ts)
  resolve-uje **sve** ne-disabled items (ravno).
- **Availability evaluator** ([availability.evaluator.ts](../apps/be/src/modules/screens/availability/availability.evaluator.ts))
  — stateless, DST-aware (luxon/rrule), timezone-aware → **ista logika treba i ovde**.

## Cilj

Po content item-u (i/ili playlisti/zoni): vremenska pravila — date range, recurring
day-parts (dani + HH:mm), opcioni prioritet. Player pušta **samo aktivne sad**,
**offline-safe**, bez treperenja na granicama.

## Pristup (usklađeno sa todo 05: server precompute, player tajmira)

> Namerno **isti obrazac kao availability (05)**: server precomputuje, player samo
> tajmira poređenjem timestamp-ova — luxon/rrule ostaju na serveru, player ostaje lak
> i offline-safe.

### Model
- `ScreenItem` (i opciono `PlaylistItem`) dobija:
  ```ts
  schedule?: {
    startDate?: string   // 'YYYY-MM-DD' (screen timezone)
    endDate?: string
    dayparts?: { days: WeekdayKey[]; start: string; end: string }[]  // 'HH:mm'
    priority?: number
  }
  ```
  U **screen timezone** (reuse `availability.timezone`).

### Snapshot
- Za svaki renderable, BE (reuse evaluator) precomputuje **on/off prelaze unutar
  horizonta** (npr. 14 dana), kao kod availability:
  `Renderable.windows?: { at: string; to: 'on' | 'off' }[]` (odsutno = uvek aktivan).
- Proširi `PlayerSnapshot` / `Renderable` u [player-contract](../packages/player-contract/src).

### Player
- Mali **schedule evaluator** (klon availability scheduler-a iz todo 05): drži pun item
  set + per-item prelaze, računa **aktivni set sad** (puko poređenje wall clock-a sa
  prelazima — bez luxon-a u playeru), re-evaluira na svakoj sledećoj granici i feeduje
  filtriranu listu u **`controller.load(activeItems)`** (engine već podržava load +
  revision dedup → bešavna izmena).
- Prazan aktivni set u toku on-sati → **fallback splash** (nikad crno; availability off je
  posebno stanje iz todo 05).
- Offline preko granice → i dalje radi iz precomputed prelaza (horizont).

### Prioritet / konflikt (MVP → kasnije)
- MVP: bez schedule = uvek eligible; scheduled = samo u prozoru; svi aktivni se vrte po `order`.
- Kasnije: `priority` (viši prioritet ekskluzivno preuzima), pa **kampanje** (grupa sadržaja
  + raspored + prioritet kao viši sloj).

## Interakcije
- **Availability (05)**: on/off ceo ekran; scheduling bira sadržaj **unutar** on-sati.
  Komplementarno; dele timezone + evaluator + player scheduler obrazac.
- **Zones (06)**: schedule je po **zone-item-u** → potpuno kompozabilno (svaka zona ima
  svoj raspored).
- **Apps (01)**: app instance u itemu takođe može da ima schedule (npr. promo app samo praznicima).

## Fajlovi (orijentir)
- BE: [screen.schema.ts](../apps/be/src/modules/screens/schemas/screen.schema.ts) (+ playlist schema) `schedule` polje;
  [player-content.service.ts](../apps/be/src/modules/player/player-content.service.ts) (precompute prelaza preko evaluatora);
  razmotri izdvajanje evaluatora u shared paket ako zatreba i drugde.
- Contract: `Renderable.windows` / schedule u [player-contract](../packages/player-contract/src).
- Player: `sync/content-schedule.ts` (evaluator/scheduler, klon [daily-reload.ts](../apps/player/src/sync/daily-reload.ts) obrasca) →
  feed u [playback-controller.ts](../apps/player/src/engine/playback-controller.ts) `load()`.
- CMS: schedule UI po item-u (date range + dayparts + priority) u content editoru.

## Moje napomene / odluke
- **Server precompute, ne luxon u playeru** — dosledno sa 03; player samo poredi timestamp-ove.
- **Player-side filtriranje (preko precomputed prelaza), ne čist server-filter** — jer
  server-filter puca offline preko granice i traži stalne re-push-eve. Precompute + lokalni
  tajmer je offline-safe i jeftin.
- **Reuse evaluatora** ([availability.evaluator.ts](../apps/be/src/modules/screens/availability/availability.evaluator.ts)) —
  generalizovati `getWindows` za content schedule (dayparts su isti koncept kao weekly).
- **Prazan aktivni set** → splash fallback, nikad crno.

## Verifikacija
- Item sa `endDate` u prošlosti → ne pušta se.
- Daypart 12–14 → pušta se samo tad; u 14:00 player bešavno izbaci iz loop-a (`load(active)`).
- Offline preko granice → flip se i dalje desi iz precomputed prelaza.
- DST dan → prozori na ispravnom wall-clock (evaluator pokriva).
- Svi scheduled istekli u toku on-sati → splash fallback (ne crno).
- (Sa zonama) različit raspored po zoni radi nezavisno.

## Procena
Srednje-velika. Logika (evaluator) postoji; player scheduler je klon availability-ja;
najviše posla je CMS schedule UI po item-u + contract/snapshot proširenje.
