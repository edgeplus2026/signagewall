# 03 — Availability u playeru (standby/on-off scheduling)

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

## Pristup (preporuka: server računa, player tajmira)

Ključna odluka je **gde se evaluira**. Predlog: **BE precomputuje** raspored, player
samo tajmira — jer (a) evaluator (luxon+rrule) je težak za player bundle, (b) ne
želimo duplu implementaciju DST logike, (c) reuse postojećeg evaluatora.

### BE
- U `PlayerSnapshot` (i `paired` payload) dodaj:
  ```ts
  availability?: {
    currentlyOn: boolean
    // Precomputed apsolutni prelazi za horizont (npr. narednih 14 dana),
    // iz evaluator.getWindows(...). Prazno/odsutno = always-on.
    upcoming: { at: string /* ISO */; to: 'on' | 'off' }[]
  }
  ```
- Popuni iz `AvailabilityEvaluator` (`isOnAt(now)` + izvedeni prelazi iz `getWindows`
  preko horizonta). Horizont (npr. 14 dana) pokriva offline period.
- Re-push: kad se availability promeni (već postoji update endpoint) ili na content
  refresh → novi snapshot sa svežim `upcoming`. Player na reconnect ionako dobija fresh.

### Player
- Dodaj `availabilityOn` signal + mali `AvailabilityScheduler` po uzoru na
  [daily-reload.ts](../apps/player/src/sync/daily-reload.ts): drži listu `upcoming`
  apsolutnih prelaza, re-evaluira protiv wall clock-a (chunked timeri), flipuje
  `availabilityOn` na svakom prelazu. Offline-safe dok ima horizonta.
- `store.view`: dodaj `'standby'` → kad `!availabilityOn`, renderuj **Standby** UI
  (crno/branded splash, reuse `splashscreen.jpg`), a **NE** mount-uj Stage (ili
  pauziraj engine) da se mediji ne vrte i ne troše resurse.
- Kad horizont ističe a player je online → sledeći content:update donosi nove prelaze.
  Ako je offline i potroši horizont → fallback na `currentlyOn` poslednje poznato
  (bezbedno: ostani u poslednjem stanju dok ne dođe mreža).

### Opciono (server nudge)
- Iskoristi rezervisani `'sleep'` event kao **dopunski** push na granici prozora
  (za momentalni flip bez čekanja lokalnog tajmera). Lokalni scheduler ostaje izvor
  istine (offline-safe); sleep je samo nudge.

## Fajlovi (orijentir)
- BE: `PlayerContentService.resolveByScreenId` → dodaj availability blok (inject
  `AvailabilityEvaluator`); `player-contract` `PlayerSnapshot` + ICMS mirror.
- Player: `sync/availability.ts` (scheduler, blizanac daily-reload-a) + `availabilityOn`
  signal u [store.ts](../apps/player/src/store.ts); `ui/Standby.tsx`; grana u
  [app.tsx](../apps/player/src/app.tsx)/[Stage.tsx](../apps/player/src/ui/Stage.tsx);
  `view` computed `+ 'standby'`.

## Moja procena (gde bih odstupio)
- **Ne** stavljati luxon/rrule u player — server precompute je čistiji i lakši.
- **Offline-first je obavezan**: ne oslanjaj se na `'sleep'` push kao primarni
  mehanizam (ekran van mreže bi ostao upaljen/ugašen pogrešno). Lokalni tajmer iz
  precomputed prelaza je izvor istine — `'sleep'` samo nudge.
- Standby mora da **pauzira engine** (ne samo da prekrije crnim), inače video i dalje
  dekodira u pozadini 24/7.

## Odluke / otvorena pitanja
- Horizont prelaza (14 dana?) vs veličina payload-a — 14 dana je sitno.
- Standby izgled: čisto crno (najmanje burn-in/struja) vs branded splash? Predlog: crno
  noću, opciono branded.
- Da li availability vredi izdvojiti evaluator u shared paket (kao player-contract) za
  buduće potrebe — za sada NE, server-precompute izbegava potrebu.

## Verifikacija
- Weekly raspored 09–17 → u 16:59 vrti, u 17:00 standby; u 09:00 opet vrti (test sa
  fake clock-om, kao daily-reload.test).
- DST dan: prozor ostaje na ispravnom wall-clock vremenu (evaluator to već pokriva).
- Offline preko granice prozora → flip se i dalje desi iz precomputed prelaza.
- Standby → engine pauziran (nema video dekodiranja), brz povratak na sadržaj.

## Procena
Mala-srednja. Najveći deo logike (evaluator) već postoji; player scheduler je klon daily-reload-a.
