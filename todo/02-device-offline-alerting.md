# 02 — Device-offline alerting operateru

## Context

Presence (online/offline) već postoji i stiže **uživo** u CMS, ali operater ne dobija
**proaktivno obaveštenje** kad ekran padne. Za signage (ekrani na lokacijama bez
osoblja) je "tvoj ekran X je offline 20 min" osnovno očekivanje, ne luksuz — bez
toga problem primetiš tek kad neko fizički prođe pored ekrana.

## Trenutno stanje (grounded)

- Player šalje heartbeat na 30s ([socket.ts](../apps/player/src/sync/socket.ts) `HEARTBEAT_MS`).
- BE: `recordHeartbeat`/`markOffline` → `setPresence` → `DevicePresenceChanged` event
  ([player.service.ts](../apps/be/src/modules/player/player.service.ts)).
- Gateway `handleDisconnect` markira offline tek kad **nijedan** socket uređaja ne ostane
  (anti-flap za brze rekonekcije) — [player.gateway.ts](../apps/be/src/modules/player/player.gateway.ts).
- CMS dobija live presence preko CMS gateway-a → status u UI. **Ali**: nema "offline > N min"
  logike, nema mejla/notifikacije, nema istorije incidenata.
- Mail modul sa template-ima postoji ([modules/mail](../apps/be/src/modules/mail)).

## Cilj

Kad uređaj padne i ostane offline duže od praga → obavesti operatere (mejl + in-app),
jednom po incidentu, sa "recovered" porukom kad se vrati. Bez lažnih alarma na mrežne blip-ove.

## Pristup

### 1. Anti-flap prag
- Uređaj se smatra "DOWN" tek ako je offline neprekidno > **threshold** (default 10 min)
  — mrežni blip (kratak disconnect/reconnect) ne sme da okine alarm.
- Implementacija: na `markOffline`, zakaži proveru na +threshold; ako je u međuvremenu
  opet online, otkaži. Alternativa: periodičan sweep (CRON svakih ~1 min) koji nađe
  uređaje `online=false AND lastSeenAt < now-threshold AND not yet alerted`.

### 2. Alert state (dedup)
- Na uređaju/notifikaciji: `lastOfflineAlertAt`, `offlineAlertActive`. Jedan alert po
  epizodi (ne ponavljati svakih N min). Reset na recovery.

### 3. Kanali
- **Mejl** org članovima (reuse mail template engine) — "Ekran «Naziv» je offline od HH:MM".
- **In-app notifikacija** (CMS) — bell/inbox; reuse CMS gateway za live push.
- Opciono webhook (post-MVP) za eksterne integracije (Slack i sl.).

### 4. Recovery
- Kad uređaj ponovo online (heartbeat/connect) i `offlineAlertActive` → pošalji
  "Ekran «Naziv» je ponovo online (downtime HH:MM)", očisti alert state.

### 5. Operater podešavanja
- Per-org (ili per-screen) toggle alerting + threshold + recipients. MVP: per-org default
  (svi članovi sa rolom), threshold konfigurabilan. Smesti u settings modul.

## Fajlovi (orijentir)
- BE: `modules/player/device-alerts.service.ts` (+ scheduler ili event-debounce),
  `notification.schema.ts` (in-app inbox), nova mail template-a (`device-offline`, `device-recovered`),
  proširiti device schema alert state poljima.
- Event: novi `PlayerEvents.DeviceOfflineAlert` / `DeviceRecovered` → CMS gateway push.
- CMS: notifikacioni inbox/bell + alerting podešavanja u screen/org settings.
- Settings: alert threshold + recipients.

## Odluke / otvorena pitanja
- **Granularnost**: per-org default vs per-screen override? Predlog: per-org default + per-screen mute.
- **Threshold default**: 10 min (signage tolerancija na blip). Potvrditi.
- **Sweep vs scheduled-check** za detekciju: sweep (CRON 1 min) je prostiji i robustan na restart BE-a → predlog sweep.
- Quiet hours: ne slati mejl noću ako je ekran ionako u availability-off prozoru? (reuse screen availability) — lepo imati, opciono.

## Verifikacija
- Ugasi uređaj → posle praga stigne **tačno jedan** mejl + in-app alert.
- Kratak blip (disconnect+reconnect < threshold) → **bez** alarma.
- Vraćanje online → "recovered" poruka, alert state očišćen.
- Restart BE-a tokom incidenta → alert se i dalje detektuje (sweep) i ne duplira.

## Procena
Mala-srednja. Glavni rizik je anti-flap tačnost; sweep + dedup state to rešavaju.
