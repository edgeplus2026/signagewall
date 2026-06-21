🎯 Web Player — 10/10 Arhitektura (Node + MongoDB + Socket.IO v4)
1. Pregled sistema (3 sloja)

┌─────────────┐         ┌──────────────────────┐         ┌──────────────┐
│   CMS/API   │ ──REST──▶                      │         │  WEB PLAYER  │
│ (Dashboard) │         │   REALTIME GATEWAY    │◀──WS────▶  (browser)   │
│  Node+Mongo │◀──WS────│   Socket.IO v4 + Redis│         │  PWA/React   │
└─────────────┘         └──────────────────────┘         └──────────────┘
       │                          │                              │
       └────────► MongoDB ◀───────┘                              │
                  (source of truth)                              │
                                                          IndexedDB cache
                                                          (offline-first)
Ključna razlika od starog Castita: umesto da CMS notifikuje relay preko HTTP GET-a, koristiš MongoDB Change Streams → realtime gateway sluša promene direktno iz baze i push-uje samo pogođenim playerima. Nema polling-a, nema shared-secret query stringova.

2. Data model (MongoDB kolekcije)

// screens — ono što si već napravio
{
  _id, name, orientation, resolution,
  activePlaylistId,           // ref → playlists
  scheduleId,                 // ref → schedules (sleep mode itd.)
  pairedPlayerId,             // ref → players (null dok se ne uveže)
  ownerId, tenantId,
}

// players — NOVA kolekcija (umesto Castit PlayerRegistered)
{
  _id,
  pairingCode: "ABCD-2931",   // kratak kod prikazan na ekranu
  pairingCodeExpiresAt,       // TTL — kod ističe za npr. 10 min
  status: "unpaired" | "paired",
  deviceId,                   // stabilan UUID iz playera (localStorage)
  screenId,                   // ref → screen kad se uveže
  token,                      // dugovečni JWT/opaque token za reconnect
  lastSeenAt, online: bool,
  platform, userAgent, appVersion, resolution,  // hardware profile
}

// playerEvents (capped collection ili TTL) — proof-of-play, watchdog, heartbeat log
Indeksi koji su obavezni:
	•	players.pairingCode (unique, sparse) + TTL index na pairingCodeExpiresAt
	•	players.deviceId (unique), players.screenId, players.token

3. Activation flow (kod na ekranu → uneseš u CMS)
Ovo je bolji flow od starog Castita (gde si morao da kucaš kod na samom TV-u, što je pakao bez tastature).

PLAYER (browser na TV-u)              GATEWAY/API                    CMS DASHBOARD
─────────────────────────            ─────────────                  ─────────────
1. Boot. Čita deviceId iz
   localStorage (ili kreira uuid)
        │
        ├── WS connect (anonymous) ──▶ 2. Nema token? Kreira
        │                                player {status:unpaired,
        │                                pairingCode, expiresAt}
        │◀── emit "pairing:code" ──────  vrati kod "ABCD-2931"
3. Prikaže "ABCD-2931" na ekranu
   + QR (opciono, deep-link)
                                                                4. User u CMS-u:
                                                                   "Add player" →
                                                                   ukuca ABCD-2931 →
                                                                   izabere koji screen
                                              5. POST /api/players/pair ◀──────┘
                                              { code, screenId }
                                              → validira kod (ne istekao,
                                                unpaired)
                                              → player.status=paired
                                              → player.token = <opaque>
                                              → screen.pairedPlayerId
        │◀── emit "paired" {token, ─────  6. Push playeru preko
        │     screenId, snapshot}          njegovog deviceId socket-a
7. Sačuva token u localStorage
   → od sada reconnect sa tokenom
   → renderuje playlist
Generisanje koda: ne rand(10000,99999) kao Castit (kolizije + brute-force). Koristi:

// 6 karaktera, bez zbunjujućih (0/O, 1/I/L), grupiši radi čitljivosti
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCode() {
  const c = Array.from(crypto.randomBytes(6))
    .map(b => ALPHABET[b % ALPHABET.length]).join("");
  return `${c.slice(0,3)}-${c.slice(3)}`;  // "ABC-D29"
}
// retry na duplicate key error (unique index), ne rekurzija na SELECT
Zašto je ovo 10/10:
	•	Kod ističe (TTL index ga briše automatski) → nema zombi kodova
	•	Opaque token za reconnect → player se ne re-paruje na svaki refresh
	•	deviceId u localStorage → preživi reload, ali ne i clear-storage (tada novi pairing — tačno što hoćeš)

4. Realtime protokol (Socket.IO v4)
Zašto Socket.IO v4 a ne raw ws: dobiješ besplatno auto-reconnect sa backoff-om, rooms (savršeno za "svi playeri jednog screena"), ack callbacks (request/response sa requestId — Castit je ovo ručno radio sa 10s timeout-om), i fallback na long-polling kroz restriktivne korporativne firewall-ove (digital signage je često iza takvih mreža).
Rooms (zamena za Castit namespace haos):

socket.join(`screen:${screenId}`)   // svi playeri ovog screena
socket.join(`player:${playerId}`)   // konkretan uređaj
socket.join(`tenant:${tenantId}`)   // za broadcast komande
Events — clean, tipizirani (bez string↔number coercion bugova iz Castita):
Smer
Event
Payload
player→server
player:hello
{ deviceId, token?, profile }
server→player
pairing:code
{ code, expiresAt }
server→player
paired
{ token, screenId, snapshot }
server→player
content:update
{ playlist, revision }
server→player
command
{ type:"restart"|"screenshot"|"reload"|"clearCache", requestId }
player→server
command:ack
{ requestId, result }
player→server
heartbeat
{ playingItemId, fps, mem } (svakih 30s)
server→player
sleep
{ on: bool } (sleep mode schedule)
Heartbeat / presence: Socket.IO ima ugrađen ping/pong, ali za aplikativni status (šta se trenutno pušta) koristi 30s heartbeat. Online/offline drži u Redis (ne u JSON fajlovima kao Castit), sa TTL ključem player:online:<id> koji se obnavlja na heartbeat. Istekne → offline. Ovo skalira horizontalno (Castit-ov in-memory state ne može preko više instanci).

5. Kako player čita podatke sa screena (offline-first)
Pozajmi najbolju ideju iz RN playera — React Query sa Infinity staleTime kao in-memory store + dodaj perzistenciju:

content:update event  ──▶  queryClient.setQueryData(["screen", id], data)
                              │
                              ├─▶ render (React komponente čitaju iz cache-a)
                              └─▶ persist u IndexedDB (preživi reload/offline)

Boot bez mreže  ──▶  učitaj iz IndexedDB  ──▶  render odmah  ──▶  WS connect u pozadini
Media (slike/video) → Service Worker + Cache API precache. Player nikad ne sme da pokaže crn ekran zato što je internet pao — to je #1 zahtev za signage. Castit je ovo radio preko offline-data u WebView-u; ti to radiš nativno kroz SW.
Revision/versioning: svaki content:update nosi revision broj. Player šalje svoj trenutni revision na player:hello; server pošalje pun snapshot samo ako se razlikuje (delta sync, štedi bandwidth na hiljadu ekrana).

6. Svi scenariji (kako se ponaša u svakom slučaju)
Scenario
Ponašanje
Prvi boot
Nema token → prikaže pairing kod → čeka paired
Reload posle pairinga
Token u localStorage → player:hello{token} → odmah dobije snapshot, bez koda
Internet pao
Render iz IndexedDB/SW cache-a, Socket.IO retry-uje sa backoff-om, "offline" badge
Internet se vratio
Auto-reconnect → player:hello{revision} → delta sync ako se sadržaj menjao
CMS promeni playlist
Mongo Change Stream → gateway → content:update u screen:<id> room → svi playeri tog ekrana update-uju
CMS restart/screenshot komanda
command event sa requestId → player izvrši → command:ack (Socket.IO ack timeout 10s)
Sleep mode (radno vreme)
Schedule u bazi → gateway šalje sleep{on:true} → crn ekran / standby, bez gašenja konekcije
Više playera za isti screen
Svi u istom screen:<id> room-u → sinhron sadržaj (npr. video wall)
Server restart/deploy
Playeri reconnect-uju (Redis pamti presence), Socket.IO sticky sessions preko load balancera
Token istekao/povučen
paired:revoked → player obriše token → vrati se na pairing kod
Clear browser storage
deviceId nestao → tretira se kao nov uređaj → novi pairing

7. Skaliranje (ono što stari Castit NE može)

              ┌──────────┐
   players ──▶│   LB      │ (sticky session / IP hash)
              └────┬─────┘
         ┌─────────┼─────────┐
    ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐
    │Gateway1│ │Gateway2│ │Gateway3│  ← stateless, horizontalno
    └────┬───┘ └───┬────┘ └──┬─────┘
         └─────────┼─────────┘
              ┌────▼─────┐
              │  Redis   │ ← Socket.IO adapter (cross-instance broadcast)
              │ pub/sub  │   + presence (online/offline)
              └────┬─────┘
              ┌────▼─────┐
              │ MongoDB  │ ← Change Streams → push
              └──────────┘
@socket.io/redis-adapter omogućava da player na Gateway1 dobije broadcast koji je pokrenut na Gateway3. Ovo je presudno — Castit-ov globalni in-memory sockets[][] radi samo na jednoj instanci.

8. Preporučeni stack (konkretno)
Sloj
Tehnologija
Zašto
Realtime gateway
Node + Socket.IO v4 + @socket.io/redis-adapter
rooms, ack, reconnect, horizontalno skaliranje
Presence/pub-sub
Redis
zamena za Castit JSON fajlove, TTL presence
DB → push
MongoDB Change Streams
nema polling, nema HTTP notify hack
Player UI
React + Vite (PWA)
tvoj postojeći React stack
Player cache
React Query (persist) + IndexedDB + Service Worker
offline-first, nikad crn ekran
Auth player
Opaque token (Redis-backed) ili JWT kratak + refresh
sigurnije od Castit shared-secret query stringova
Komande
Socket.IO ack (requestId+timeout)
request/response bez ručnog Castit timeout koda

Ovo je kompletan referentni dizajn. Sledeći korak — reci mi šta hoćeš da uradimo:
	1	Da skiciram konkretan kod za realtime gateway (Socket.IO setup + pairing handler + Change Stream listener)?
	2	Da napravim player skeleton (React PWA: pairing screen → socket connect → render playlist + offline cache)?
	3	Da dizajniram Mongo šeme + indekse (players/screens kolekcije, TTL, pairing)?