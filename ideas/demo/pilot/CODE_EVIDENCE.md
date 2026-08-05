# Current-code evidence za demo tvrdnje

Ovaj dokument je pregled stanja koda na dan pripreme DEMO-01. On nije zamena za realni OAuth, webhook, uređaj ili offline smoke test; služi da demonstrator ne obeća nešto što source ne podržava.

## OpsBoard

| Tvrdnja u runbook-u                                                                  | Dokaz u kodu                                                                                                  | Posledica za demo                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Preseti su `shift`, `dispatch`, `kpi`, `safety`, `custom`                            | `packages/apps/src/opsboard/manifest.ts:9-29`                                                                 | Pokazujemo jedan buyer preset, ne katalog.                        |
| Izvor može biti manual, Google Sheets ili Excel                                      | `packages/apps/src/_shared/tabular-source.ts:29-114`; `packages/apps/src/opsboard/manifest.ts:64-84`          | Tri CSV-a mogu u Sheet/Excel; manual ima CSV import.              |
| Target-i su label/primary/secondary/status/note/group/sortOrder                      | `packages/apps/src/opsboard/manifest.ts:64-75`                                                                | Mapiranja u ovom paketu koriste tačne target ključeve.            |
| Connected mapping je target -> header i čita prikazani tekst                         | `apps/be/src/modules/apps/connectors/_shared/tabular/apply-mapping.ts:1-51`                                   | Nazivi zaglavlja moraju ostati tačni; formula engine ne postoji.  |
| Najviše 200 connected redova                                                         | `apps/be/src/modules/apps/connectors/_shared/tabular/apply-mapping.ts:12-14`; `opsboard.connector.ts:166-185` | Ne nudimo veći connected board bez promene koda.                  |
| Google/Excel koriste odvojene read-only OAuth scope-ove                              | `apps/be/src/modules/apps/connectors/opsboard.connector.ts:111-128`                                           | Sistem čita, ne upisuje nazad.                                    |
| Google Drive i Microsoft webhook resource putanje postoje; fallback cadence je 300 s | `opsboard.connector.ts:130-141`; `packages/apps/src/opsboard/manifest.ts:36-46`                               | Merimo stvarno vreme; ne tvrdimo garantovani instant update.      |
| Blank label red se odbacuje; nepoznat status je neutralan                            | `opsboard.connector.ts:55-65`; `_shared/tabular/opsboard-status.ts:95-118`                                    | Loš status ne ruši board; red bez identiteta se ne vidi.          |
| Brojčani sortOrder upravlja redosledom                                               | `opsboard.connector.ts:75-100`                                                                                | Queue fixture koristi 10, 20, 30…                                 |
| Layout-i su status-table/cards/queue i paginiraju                                    | `packages/apps/embeds/opsboard/main.ts:121-160,212-320,343-408`                                               | Script može da pokaže buyer-specifičan format i duže liste.       |
| Offline footer se prikazuje samo za `meta.stale`                                     | `packages/apps/embeds/_shared/freshness.ts:22-27`; `opsboard/main.ts:343-383,411-418`                         | Player network disconnect sam po sebi ne mora pokazati `Offline`. |

Napomena za manual CSV: CSV importer ostavlja select vrednost kao običan string (`apps/cms/src/features/apps/config-form/tabular/csv.ts:118-143`), dok manual OpsBoard embed prihvata samo canonical `neutral/planned/active/warning/blocked/done` (`opsboard/main.ts:22-55`). Srpski statusi iz demo CSV-a normalizuju se u povezanom connector-u; za manual demo operator mora posle importa da izabere canonical status u CMS polju ili unapred pripremi normalizovanu instancu.

## Last-known-good, offline i reconnect

| Tvrdnja                                                                    | Dokaz u kodu                                                                                         | Granica                                                                                                                                                   |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player čuva snapshot pri content update-u                                  | `apps/player/src/sync/socket.ts:103-108`                                                             | Snapshot save je async/best-effort, pa se cold boot ručno proverava.                                                                                      |
| Snapshot se čuva u IndexedDB i može se učitati                             | `apps/player/src/persistence/idb.ts:25-49`; `apps/player/src/app.tsx:125-135`                        | Dokazuje implementaciju, ne svaki browser/uređaj.                                                                                                         |
| Socket automatski pokušava reconnect                                       | `apps/player/src/sync/socket.ts:48-81`                                                               | Delay je podešen 1 s do 15 s između pokušaja; source freshness je zaseban faktor.                                                                         |
| Network-only app se offline uklanja, ostali ostaju                         | `packages/apps-contract/src/manifest.ts:35-46`; `apps/player/src/engine/network-apps.ts:11-31`       | OpsBoard nema `requiresNetwork`, ali remote iframe apps mogu imati drugačije ponašanje.                                                                   |
| Cache error ne briše last-known payload, a PlayerContent ga čita kao stale | `apps/be/src/modules/apps/app-data-cache.repository.ts:104-132`; `player-content.service.ts:167-180` | `refreshOne` na grešci vraća `false`, pa nema automatskog fan-out-a; player mora dobiti novi snapshot, npr. reconnect-om (`app-data.service.ts:281-319`). |

## Zajednička playlista

Više app instance-i mogu da se dodaju kao uređene playlist stavke (`apps/be/src/modules/playlists/playlists.service.ts:273-324`), a PlayerContent ih redom širi u app renderables (`apps/be/src/modules/player/player-content.service.ts:507-529`). Zato je Teams + PowerPoint workflow ista postojeća playlista, a ne izmišljeni kombinovani app.

## Teams

| Tvrdnja                                                         | Dokaz                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Work/school Microsoft + admin consent, read-only channel scopes | `packages/apps/src/teams/manifest.ts:6-18,32-49`; `apps/be/src/modules/apps/connectors/teams.connector.ts:112-127` |
| Spotlight/grid, 2–120 s, author toggle, theme                   | `packages/apps/src/teams/manifest.ts:50-85`                                                                        |
| Do 20 poruka; system/deleted/image-only se odbacuju             | `apps/be/src/modules/apps/connectors/teams.connector.ts:20-21,75-100,147-170`                                      |
| Cadence je 120 s i nema `webhookResource` u connector-u         | `packages/apps/src/teams/manifest.ts:20-30`; `teams.connector.ts:116-171`                                          |

Zato workflow ne tvrdi instant Teams update, slike, posting niti proof-of-read.

## PowerPoint

| Tvrdnja                                                           | Dokaz                                                                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public embed i Microsoft private-file source su odvojeni mode-ovi | `packages/apps/src/powerpoint/manifest.ts:12-23,39-100`                                              |
| Microsoft source je read-only Files/Sites, bira `.pptx`           | `powerpoint/manifest.ts:79-100`; `apps/be/src/modules/apps/connectors/powerpoint.connector.ts:56-64` |
| File webhook resource + 900 s fallback                            | `powerpoint.connector.ts:79-87`; `powerpoint/manifest.ts:33-36`                                      |
| Backend renderuje Graph PDF u WebP preko `pdftoppm` i R2          | `apps/be/src/modules/media/storage/pptx-render.service.ts:31-46,68-111,127-161`                      |
| Slajdovi se trenutno pretvaraju u javne URL-ove                   | `powerpoint.connector.ts:39-46,146-169,191-195`; `packages/apps/src/powerpoint/payload.ts:1-14`      |
| Player rotira lokalno renderovane slike samo dok je item aktivan  | `packages/apps/embeds/powerpoint/main.ts:94-126,165-192`                                             |

Zato „private” opisujemo samo kao private source selection. Poverljivost izvedenih slajdova nije trenutna prodajna tvrdnja.

## Outlook

| Tvrdnja                                                       | Dokaz                                                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Read-only `Calendars.Read`, izbor jednog kalendara            | `packages/apps/src/outlook/manifest.ts:32-50`; `apps/be/src/modules/apps/connectors/outlook.connector.ts:87-99` |
| Day/week/month/schedule, upcoming, scroll, en/sr, tema        | `packages/apps/src/outlook/manifest.ts:51-100`                                                                  |
| Graph subscription na create/update/delete + 1 800 s fallback | `outlook.connector.ts:101-117`; `outlook/manifest.ts:24-30`                                                     |
| Prenosi title, start/end, allDay i location                   | `outlook.connector.ts:42-64,128-160`                                                                            |
| Prozor je -7/+60 dana, max 500                                | `outlook.connector.ts:17-21,66-71,128-134`                                                                      |

Zato visitor workflow ne tvrdi attendee podatke, booking, check-in ili occupancy.

## Tvrdnje koje ostaju zabranjene do nove implementacije i testa

- OpsBoard write-back, approvals, per-shift schedule ili site/saved-group targeting.
- Safety emergency takeover, alarm, audit trail, potvrda usklađenosti ili „sprečeni incidenti”.
- Teams media feed, slanje poruka, instant update ili dokaz čitanja.
- End-to-end private PowerPoint slajdovi na autorizovanom player-u.
- Outlook booking, visitor management, check-in, attendee detalji ili occupancy.
- Garantovani update SLA za bilo koji provider bez merenja konkretnog tenant-a i webhook konfiguracije.
- Bilo koji procenat uštede ili poslovni ishod bez baseline i capture podataka.
