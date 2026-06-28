# TODO — MVP task planovi

Planovi za zaokruživanje signage proizvoda do MVP-a. Svaki fajl je samostalan
task plan (Context → trenutno stanje → pristup → fajlovi → verifikacija).

Realna skala: ~5 playera po useru, ~50 usera → **~500 online playera**. Sve niže
je dimenzionisano za tu skalu (bez Redisa / bez horizontalnog skaliranja —
videti raniju analizu; event seam u `player.events.ts` ostaje za daleku
budućnost).

| # | Task | Prioritet | Zašto |
|---|---|---|---|
| [00](./00-apps-architecture-rework.md) | Apps arhitektura — generic iframe host + connector runtime + kategorije | 🔴 keystone | Apps su najkorišćeniji deo signage-a; trenutna implementacija ima logiku u playeru i radi samo `static`. |
| [01](./01-native-shell-auto-update-tauri.md) | Native-shell auto-update (Tauri) | 🔴 blocker | 500 unattended uređaja mora da dobija nove verzije OTA. |
| [02](./02-device-offline-alerting.md) | Device-offline alerting operateru | 🔴 blocker | Presence postoji uživo, ali nema proaktivnog obaveštenja kad ekran padne. |
| [03](./03-player-availability.md) | Availability u playeru (standby scheduling) | 🟡 MVP | Evaluator postoji na BE, ali player vrti 24/7 — ne poštuje radno vreme ekrana. |
| [04](./04-cms-notifications.md) | CMS notifikacije (super-admin → korisnici) | 🟡 MVP | In-app obaveštenja korisnicima (bell + rich text + read-state). |
| [05](./05-activity-log.md) | Activity log (org audit: ko je šta menjao) | 🟡 MVP | Auto-capture preko Mongoose plugin + CLS (ne per-controller). |
| [08](./08-proof-of-play.md) | Proof-of-play / istorija reprodukcije | 🟢 post-MVP | "Šta je puštano kada" — traže oglašivači/kupci; player već javlja `now-playing`. |
| [09](./09-legal-tos-privacy-gdpr.md) | Legal (ToS/Privacy) + GDPR brisanje podataka | 🟡 pre-launch | Uslov za javni SaaS launch. |

## Preporučeni redosled
1. **00 (apps)** — otključava polovinu vrednosti proizvoda; sve ostalo je nezavisno.
2. **01 + 02** paralelno — operativna pouzdanost fleeta.
3. **09** pre javnog launcha.
4. **08** posle MVP-a (može faza 1: server-side log; faza 2: offline buffering).
