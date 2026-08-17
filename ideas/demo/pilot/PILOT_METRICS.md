# Pilot metrike i ručni capture plan

Cilj sedmodnevnog pilota nije da „dokaže digital signage”, već da proveri jednu hipotezu kupca: može li zajednički ekran, napajan iz postojećeg workflow-a, da ukloni konkretan ručni korak ili informacioni zastoj.

Sve mere se ručno upisuju u [`pilot-capture-sheet.csv`](pilot-capture-sheet.csv). Trenutni proizvod nema proof-of-play, reach analytics niti telemetriju koja meri poslovni ishod; zato se ništa od toga ne sme izvesti iz običnog online statusa uređaja.

## 1. Pre pilota: zamrznuti hipotezu

Sa buyer-om popuniti:

- use case: samo jedan primarni (`shift`, `dispatch`, `safety`, `frontline` ili `room_visitor`);
- jedan site/zona, jedan source owner, jedan ekran i jedan operator;
- ko donosi ekonomsku odluku i koji problem bi opravdao kupovinu;
- baseline prozor od najmanje dve uporedive smene ili radna dana;
- jedna primarna poslovna metrika;
- prag pouzdanosti za `edit -> screen`, dogovoren nakon realnog smoke testa;
- događaj koji znači „pilot uspešan” i ko ga potpisuje.

## 2. Obavezne tehničke metrike za svaki use case

| Metrika                    | Kako se meri                                                                  |       Minimum dokaza |
| -------------------------- | ----------------------------------------------------------------------------- | -------------------: |
| Source/display podudarnost | Observer poredi očekivanu i prikazanu vrednost                                |     3 provere dnevno |
| `edit_to_screen_seconds`   | Razlika source edit i screen observed timestamp-a                             |   10 namernih izmena |
| Player reconnect           | Razlika player online i screen observed timestamp-a                           |    3 offline ciklusa |
| Poslednji dobar prikaz     | `yes/no` posle offline i offline reload testa                                 | 3 ciklusa + 1 reload |
| Prazan/pogrešan prikaz     | Broj opaženih blank, pogrešnih ili neutralizovanih redova                     |       svaki incident |
| Operativne greške          | `oauth`, `provider`, `mapping`, `webhook/poll`, `player`, `render`, `unknown` |       svaki incident |

Tehnički prolaz za prvi plaćeni pilot:

- 100% proveravanih redova ima očekivanu vrednost ili dokumentovan razlog razlike;
- tri od tri player reconnect drill-a zadrže poslednji dobar prikaz;
- najmanje 10 edit događaja ima kompletna dva timestamp-a;
- procenat izmena unutar unapred dogovorenog latency praga je izračunat, ne prepričan;
- nema neobjašnjenog gubitka payload-a pri jednom staging backend restart testu.

Ovo su release/pilot gates, ne marketinški SLA. Prag latencije se ne upisuje unapred dok stvarni Google/Microsoft tenant i webhook nisu provereni.

## 3. Jedna primarna poslovna metrika po ponudi

### Shift production

Primarno izabrati jedno:

- `prep_minutes`: minuti za pripremu/prekucavanje smenske table;
- `status_questions`: pitanja/pozivi/odlasci radi provere plana i stanja u jednoj smeni;
- `corrections`: broj slučajeva gde je ekran pokazao drugačije stanje od dogovorenog source-a.

Ne pripisivati promenu output-a ili OEE-a ekranu u sedmodnevnom pilotu bez kontrolisanog dokaza.

### Dock dispatch

Primarno izabrati jedno:

- `dispatch_calls_or_walks`: pozivi ili fizički odlasci do dispečera po smeni;
- `corrections`: korekcije pogrešno shvaćene rampe/reda/instrukcije;
- vreme od odluke dispečera do potvrđene vidljivosti na ekranu.

Vreme čekanja vozila može biti kontekstualna metrika, ali ga ne predstavljati kao posledicu sistema bez kontrole drugih uzroka.

### Safety

Primarno izabrati jedno:

- minuti od odobrene HSE promene do proverene objave;
- `successful_content_checks / expected_content_checks` u unapred definisanim obilascima;
- broj zatečenih zastarelih safety poruka.

Ne meriti „sprečene incidente”; takav counter nije dokaziv ovim pilotom. Board nije emergency takeover niti compliance audit.

### Frontline Communications

Primarno izabrati jedno:

- `manual_transfers`: broj USB/export/re-upload koraka po nedelji;
- minuti od odobrene Teams/PowerPoint promene do opaženog ekrana;
- udeo opaženih provera sa očekivanom verzijom.

Ne nazivati proveru ekrana reach-om i ne tvrditi da je zaposleni pročitao poruku.

### Room & Visitor

Primarno izabrati jedno:

- `frontdesk_questions`: pitanja o slobodnoj sobi/lokaciji posete po danu;
- broj zastarelih ili pogrešnih događaja u tri dnevne provere;
- minuti ručnog prekucavanja rasporeda na stari display.

Ne tvrditi booking, occupancy ili visitor check-in vrednost jer te funkcije ne postoje.

## 4. Baseline i pilot poređenje

1. Dve smene/dana beležiti postojeći proces bez SignageWall intervencije.
2. Uvesti jedan ekran i isti observer obrazac narednih pet do sedam dana.
3. Ne menjati definiciju događaja usred pilota. „Pitanje statusa” mora značiti isto pre i posle.
4. Prikazati sirove brojeve, medijanu i raspon po danu. Na malom uzorku ne praviti procente bez apsolutnog broja.
5. Odvojiti tehničku pouzdanost od poslovne promene: board može biti pouzdan bez dokazane uštede i obrnuto.
6. Na kraju buyer potpisuje jedno: `paid rollout`, `extend pilot with named condition`, `stop`.

## 5. Data dictionary za capture sheet

| Kolona                               | Značenje                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `record_id`                          | Jedinstven ručni ID, npr. `PILOT-20260817-001`                                            |
| `record_type`                        | `baseline`, `observation`, `source_edit`, `offline_drill`, `incident`, `daily_summary`    |
| `use_case`                           | `shift`, `dispatch`, `safety`, `frontline`, `room_visitor`                                |
| `source_edit_at`                     | ISO 8601 sa timezone-om; vreme kada je source sačuvan                                     |
| `player_online_at`                   | Vreme kada je player mreža vraćena u reconnect testu                                      |
| `screen_observed_at`                 | Vreme kada observer vidi očekivanu vrednost                                               |
| `edit_to_screen_seconds`             | Ručno izračunata razlika prethodna dva relevantna timestamp-a                             |
| `reconnect_to_screen_seconds`        | `screen_observed_at - player_online_at`                                                   |
| `expected_value` / `displayed_value` | Kratak, neosetljiv test marker ili status; ne unositi PII                                 |
| `value_match`                        | `yes`, `no`, `not_checked`                                                                |
| `offline_phase`                      | `online`, `player_offline`, `reconnecting`, `upstream_stale`, `backend_restart`           |
| `screen_kept_last_good`              | `yes`, `no`, `not_checked`                                                                |
| `backend_stale_badge`                | Da li je prikazan OpsBoard `Offline` footer nakon backend stale stanja                    |
| poslovne count/minute kolone         | Ručno brojanje samo za izabranu pilot metriku                                             |
| `error_category`                     | `oauth`, `provider`, `mapping`, `webhook_poll`, `player`, `render`, `unknown`, ili prazno |
| `evidence_ref`                       | Interni screenshot/log ID bez tokena, signed URL-a ili ličnih podataka                    |

## 6. Finalni pilot zapis

Na poslednjem sastanku zapisati:

- baseline i pilot broj za izabranu primarnu metriku;
- broj/uzorak tehničkih merenja i sve neuspehe;
- median i najsporiji opaženi `edit -> screen`;
- rezultat offline/reconnect checkliste;
- šta je buyer tražio van trenutnog scope-a;
- odluku, odgovornu osobu, komercijalni sledeći korak i datum.

Formulacija rezultata mora ostati činjenična: „u posmatranih pet smena broj statusnih poziva je bio X naspram baseline Y”, a ne „sistem smanjuje pozive” bez šire validacije.
