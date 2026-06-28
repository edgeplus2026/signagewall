# 07 — Proof-of-play / istorija reprodukcije

## Context

Signage kupci i oglašivači traže dokaz "šta je pušteno, kada, na kom ekranu, koliko
dugo" — za fakturisanje oglasa, compliance i izveštaje. Player **već javlja** koji
item je na ekranu, ali se to nigde ne persistuje ni ne izveštava.

## Trenutno stanje (grounded)

- Player emituje `now-playing { itemId }` na svaku tranziciju
  ([socket.ts](../apps/player/src/sync/socket.ts) `stopNowPlaying` effect) + nosi
  `playingItemId` u heartbeat-u.
- Gateway `handleNowPlaying` **relejuje** u screen sobu (za preview), ali **ne snima**
  ([player.gateway.ts](../apps/be/src/modules/player/player.gateway.ts)).
- Snapshot/item ima `id`, a stavka zna `mediaId`/`playlistId`/`appInstanceId`
  ([screen.types.ts](../apps/cms/src/features/screens/types/screen.types.ts) `ScreenItem`).

## Cilj

Pouzdan zapis reprodukcije po ekranu/itemu/vremenu, sa upitima i CSV/PDF izveštajem,
otporan i na offline periode.

## Pristup

### Faza 1 — Server-side play log (MVP)
- Na `now-playing` (samo realan uređaj) snimi `PlayLog { orgId, screenId, deviceId,
  itemId, mediaId?/appInstanceId?, startedAt }`.
- Trajanje: izvedi iz sledećeg `now-playing` (start sledećeg = kraj prethodnog), ili
  zatvori poslednji interval na heartbeat/disconnect. Čuvaj start; `endedAt`/`durationMs`
  popuni lenjivo.
- Write volumen na 500 playera: tranzicije na ~svakih 10–60s → desetine upisa/s.
  Bufferuj u memoriji i flush-uj batch-evima (npr. svakih 5s) da ne tučeš Mongo po eventu.
- Retention: TTL indeks (npr. 90 dana sirovih logova) + opciono dnevna agregacija
  (`PlayLogDaily { screenId, mediaId, date, plays, totalMs }`) za brze izveštaje.

### Faza 2 — Offline tačnost (player-side buffering)
- Dok je uređaj offline, `now-playing` ne stiže → rupa u logu. Rešenje: player drži
  **ring buffer** odigranih intervala (idb) i **flush-uje batch** na reconnect
  (`now-playing:batch` event). Time je proof-of-play tačan i bez mreže.
- Idempotencija: svaki interval ima `(deviceId, startedAt)` ključ da reconnect ne duplira.

### Faza 3 — Izveštaji
- API: upit po `screenId`/`mediaId`/`appInstanceId`/period → lista + agregati.
- CMS: izveštaj view (po ekranu / po sadržaju), CSV export; PDF opciono.

## Fajlovi (orijentir)
- BE: `modules/player/play-log.service.ts` (+ buffer/flush), `play-log.schema.ts`
  (+ TTL), `play-log.controller.ts` (izveštaji), handler u
  [player.gateway.ts](../apps/be/src/modules/player/player.gateway.ts) za `now-playing(:batch)`.
- Player: `apps/player/src/sync/play-log-buffer.ts` (Faza 2) + emit na reconnect.
- CMS: `features/reports/*` (proof-of-play view + export).

## Odluke (potvrđeno)
- **Šta je "play"**: **svaka tranzicija** = jedan zapis (start + trajanje). Bez `completed`
  flag-a u MVP-u (može kasnije za striktni ad-compliance).
- **Tačnost (scope)**: **Faza 1 + Faza 2** — server-side log **+ offline buffering** na
  playeru (ring buffer u idb → flush batch na reconnect, idempotentno po `(deviceId, startedAt)`).
  Znači: dokaz je tačan **i** za offline periode. (Diže napor u odnosu na samo Fazu 1.)
- **Retencija**: **90 dana** TTL na sirove zapise (bez dnevnog agregata u MVP-u; doda se ako zatreba duži izveštaj).

## Verifikacija
- Pusti 3 itema → 3 PlayLog zapisa sa korektnim trajanjima.
- Offline period (Faza 2) → po reconnect-u se intervali doflush-uju, bez duplikata.
- Izveštaj po ekranu za period vraća tačne sume; CSV export se otvara.

## Procena
Faza 1 mala-srednja; Faza 2 (offline buffer + idempotencija) srednja; izveštaji srednja.
Preporuka: Faza 1 + izveštaji za MVP, Faza 2 po potrebi.
