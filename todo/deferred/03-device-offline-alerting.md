# 03 — Device-offline alerting operateru

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

Kad uređaj padne i ostane offline duže od praga → obavesti operatere **in-app**
(bell/inbox), jednom po incidentu, sa "recovered" porukom kad se vrati. Bez lažnih
alarma na mrežne blip-ove.

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

### 3. Kanal (MVP: samo in-app)
- **In-app notifikacija** (CMS) — bell/inbox; **reuse inbox-a iz fajla 02** (+ CMS gateway live push). Device-alert je system-generated, **org-scoped**.
- Poruka tipa: "Ekran «Naziv» je offline od HH:MM".
- Email i webhook (Slack i sl.) → **post-MVP / v1.1** (nisu u scope-u).

### 4. Recovery
- Kad uređaj ponovo online (heartbeat/connect) i `offlineAlertActive` → pošalji
  "Ekran «Naziv» je ponovo online (downtime HH:MM)", očisti alert state.

### 5. Operater podešavanja
- Per-org (ili per-screen) toggle alerting + threshold + recipients. MVP: per-org default
  (svi članovi sa rolom), threshold konfigurabilan. Smesti u settings modul.

## Fajlovi (orijentir)
- BE: `modules/player/device-alerts.service.ts` (+ sweep scheduler), reuse notifikacionog
  inboxa iz fajla 02 (system-generated, org-scoped zapis), proširiti device schema alert
  state poljima (`offlineAlertActive`, `lastOfflineAlertAt`, per-screen `alertMuted`).
- Event: novi `PlayerEvents.DeviceOfflineAlert` / `DeviceRecovered` → CMS gateway push.
- CMS: notifikacioni inbox/bell + alerting podešavanja u screen/org settings.
- Settings: alert threshold + recipients.

## Odluke (potvrđeno)
- **Kanal**: **samo in-app** (bell/inbox) — reuse infrastrukture iz fajla 02 (inbox + receipt + CMS gateway live push). **Bez email-a** u MVP-u (email kanal eventualno v1.1). → 03 **zavisi od 02**. Device-alert je **system-generated, org-scoped** notifikacija (za razliku od super-admin broadcast-a iz 02, koji je global) — deli isti bell/inbox UI.
- **Threshold**: **10 min** offline neprekidno pre alarma (anti-flap na mrežni blip).
- **Detekcija**: **sweep CRON ~1 min** (nađe `online=false AND lastSeenAt < now-threshold AND not yet alerted`) — robusno na restart BE-a, prostije od per-event tajmera.
- **Granularnost**: **per-org default + per-screen mute** (org-level recipients/threshold uključeno; pojedini ekran može da se utiša).
- **Quiet hours**: **ne alarmira** kad je ekran u **availability-off** prozoru — koristi postojeći BE `AvailabilityEvaluator` (nezavisno od fajla 05; to je player-side standby).

## Verifikacija
- Ugasi uređaj → posle praga (10 min) stigne **tačno jedan** in-app alert.
- Kratak blip (disconnect+reconnect < threshold) → **bez** alarma.
- Vraćanje online → "recovered" poruka, alert state očišćen.
- Restart BE-a tokom incidenta → alert se i dalje detektuje (sweep) i ne duplira.

## Procena
Mala-srednja. Glavni rizik je anti-flap tačnost; sweep + dedup state to rešavaju.
