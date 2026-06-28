# 08 — Native-shell auto-update (Tauri)

## Context

Player se vrti na ~500 **unattended** uređaja. Trenutno postoji samo restart i
daily-reload — što osvežava *web* sadržaj (PWA), ali **ne menja verziju native
shell-a**. Bez OTA update-a nemaš kontrolu nad flotom: bug fix ili nova feature ne
mogu da stignu do uređaja bez ručnog obilaska. Biramo **Tauri** kao native shell.

## Trenutno stanje (grounded)

- **Tauri shell ne postoji** u repou (nema `src-tauri/`, `tauri.conf.json`, `Cargo.toml`).
- [restart.ts](../apps/player/src/restart.ts) **anticipira** Tauri:
  `window.__TAURI__?.process?.relaunch()` — postoji grana, ali host ne postoji.
- [device.ts](../apps/player/src/device.ts) `getPlatform()` već detektuje `'tauri'`.
- [daily-reload.ts](../apps/player/src/sync/daily-reload.ts) — postoji prozor van radnog
  vremena (default 03:00) idealan da se update primeni kad ekran ionako restartuje.

## Cilj

OTA auto-update Tauri shell-a: potpisan, periodičan, primenjen u off-hours prozoru,
sa sigurnom degradacijom (nikad da uređaj ostane "cigla").

## Pristup

### 1. Tauri shell (preduslov)
- Dodaj `apps/player/src-tauri/` (Tauri v2) koji učitava buildovani web player
  (dev: `VITE` URL; prod: bundlovani `dist` ili remote URL — odlučiti, videti pitanja).
- Konfiguriši kiosk/fullscreen, autostart, onemogući kontekst meni/zoom.
- Implementiraj `window.__TAURI__.process.relaunch` putanju koju restart.ts već zove.

### 2. Updater plugin
- `@tauri-apps/plugin-updater` + `tauri-plugin-updater` (Rust).
- `tauri.conf.json` → `plugins.updater`: `endpoints` (URL ka update manifestu) i
  `pubkey` (minisign public key).
- Generiši keypair: `tauri signer generate`; **privatni ključ u CI secret**, javni u conf.

### 3. CI/CD release pipeline
- Na tag/release: `tauri build` → installer + `.sig` potpisi po platformi.
- Generiši `latest.json` (verzija, notes, per-platform url + signature) i upload na
  S3/CDN (već koristimo `@aws-sdk/client-s3`).
- Update endpoint servira `latest.json` (može static sa CDN-a).

### 4. Runtime update logika (player ili Rust side)
- Na startu **i** periodično (npr. svaka 6h) pozovi `check()`.
- Ako ima update → `downloadAndInstall()` → relaunch. **Vezati primenu za off-hours
  prozor** (reuse [daily-reload.ts](../apps/player/src/sync/daily-reload.ts) tajming) da
  se ekran ne restartuje usred radnog dana. Predlog: preuzmi odmah, instaliraj u
  sledećem daily-reload prozoru.
- Status (trenutna verzija, poslednja provera, rezultat) šalji u heartbeat profile
  ([socket.ts](../apps/player/src/sync/socket.ts) već nosi `profile.appVersion`) → vidljivo u CMS-u.

### 5. Sigurnosna degradacija / rollback
- Potpis verifikacija (minisign) je obavezna — neuspeh = preskoči update, ostani na staroj.
- Watchdog: ako nova verzija ne digne web UI u N sekundi posle boot-a, loguj + ostani
  na reload-u (Tauri nema auto-rollback; mitigacija health-check-om pre nego što se
  stara verzija obriše — ostaviti prethodni installer keširan).
- Staged rollout / pin verzije po org-u → **post-MVP**.

## Fajlovi (orijentir)
- Novo: `apps/player/src-tauri/` (`tauri.conf.json`, `Cargo.toml`, `src/main.rs`).
- Player: mali `apps/player/src/native/updater.ts` (check/install + off-hours gating);
  proširiti `getProfile()` u [device.ts](../apps/player/src/device.ts) update statusom.
- CI: release workflow (`tauri build` + `latest.json` + S3 upload).
- BE: opciono endpoint koji servira `latest.json` ako ne koristimo čist CDN.

## Odluke (potvrđeno)
- **Web u shell-u**: **remote web + Tauri OTA samo za shell**. Shell učitava remote player URL;
  web update ide preko PWA/reload (instant), Tauri OTA samo za retke promene shell-a.
- **Platforme**: **Windows, Android, Linux, macOS** (sve). Napomene: **Windows** = WebView2
  (najbolji); **Android** (Tanix i sl.) = Android System WebView / Tauri v2 mobile ili tanak
  WebView wrapper; **Linux/Pi** → koristi **Chromium kiosk** umesto Tauri/WebKitGTK (WebKitGTK je
  slaba karika); **macOS** uglavnom dev/test. CI mora da builduje **na svakom OS-u** (Tauri ne
  cross-compile-uje) → matrix runneri.
- **Update endpoint**: **čist CDN / S3** (`latest.json`), bez BE logike. Staged rollout kroz BE → kasnije ako flota naraste.

## Verifikacija
- Objaviš v(N+1) → uređaj na v(N) detektuje, preuzme, verifikuje potpis, primeni u
  off-hours prozoru, javi novu verziju u heartbeat-u (vidljivo u CMS-u).
- Pokvaren/nepotpisan update → odbijen, uređaj ostaje funkcionalan na staroj verziji.
- Mid-day: update se ne primenjuje dok ne dođe daily-reload prozor.

## Procena
Srednje-velik (Tauri shell od nule + CI signing pipeline su glavnina). Updater logika je mala.
