# Demo skripte od 60 sekundi

Svaka skripta počinje sa već otvorenim izvorom na laptopu i već dodeljenim content item-om na player-u. Ne otvarati katalog i ne prebacivati razgovor na listu funkcija. Rečenice u navodnicima su dozvoljene tvrdnje; tekst u zagradama je radnja demonstratora.

## 1. Live Shift Board · direktor proizvodnje

**Pre timera:** otvoriti `shift-production.csv` kao povezani Sheet/Excel i ekran `DEMO · Shift`. Red `Punjenje A2` mora biti na oba.

| Vreme   | Radnja i tekst                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–10 s  | „Ovo je tabla smene napravljena od tabele koju planer već održava — bez posebnog dizajniranja ekrana.”                                              |
| 10–22 s | (Pokazati red A2 u izvoru.) „Linija je naziv reda; plan, realizacija, status, instrukcija i smena su tačno mapirane kolone.”                        |
| 22–38 s | (Pokazati isti red na ekranu.) „Status se normalizuje u šest jasnih stanja. Nepoznata vrednost ne ruši tablu, već ostaje neutralna.”                |
| 38–50 s | (Pokazati A1, A2 i C1.) „Rukovodilac za nekoliko sekundi vidi šta je u toku, šta kasni i gde je blokada; sistem ne menja vaš Sheet, samo ga čita.”  |
| 50–60 s | „Predlog je sedam dana, jedan ekran i jedna smena. Merimo vreme pripreme table, broj statusnih pitanja i stvarno vreme od izmene ćelije do ekrana.” |

**Posle timera, ako postoji interesovanje:** promeniti `Punjenje A2 / Status` iz `Kašnjenje` u `U toku`, zabeležiti oba timestamp-a u capture sheet i sačekati stvarni update. Ne obećavati vreme pre merenja.

## 2. Dock & Dispatch · direktor logistike ili magacina

**Pre timera:** otvoriti `dock-dispatch.csv` kao povezani Sheet/Excel i ekran `DEMO · Dispatch`. Red `Rampa 04 · TRK-DEMO-331` mora biti vidljiv.

| Vreme   | Radnja i tekst                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–9 s   | „Dispečer zadržava tabelu koju već koristi; ekran pretvara tu tabelu u red rampi koji se čita sa distance.”                                       |
| 9–22 s  | (Pokazati source red Rampa 04.) „Termin, prevoznik, status, instrukcija i zona su obične kolone, bez custom integracije po kupcu.”                |
| 22–38 s | (Pokazati queue layout.) „Redosled dolazi iz kolone `Redosled`; svaka rampa dobija stabilnu poziciju, status i kratku instrukciju.”               |
| 38–50 s | (Pokazati kašnjenje i blokadu.) „Vozač i magacin vide isti trenutni plan. Ovo ne dodeljuje rampu niti šalje poruke — prikazuje odluku dispečera.” |
| 50–60 s | „Pilot je jedna izlazna zona sedam dana. Merimo pozive i odlaske do dispečera, korekcije dodele i `edit -> screen` vreme.”                        |

**Posle timera:** ukloniti dokumentacionu blokadu na Rampi 04, promeniti status na `U toku`, zabeležiti update. Ne tvrditi da sistem smanjuje vreme čekanja dok pilot ne pokaže podatak.

## 3. Digital Safety Board · HSE ili plant manager

**Pre timera:** otvoriti `safety-board.csv` i ekran `DEMO · Safety`. Kartice za PPE, PP izlaz i LOTO moraju biti vidljive.

| Vreme   | Radnja i tekst                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–10 s  | „HSE održava jednu tabelu, a zajednički ekran prikazuje samo trenutno stanje, cilj i sledeću bezbednosnu poruku.”                                   |
| 10–24 s | (Pokazati tri source reda.) „Isti ugovor pokriva PPE, otvorenu prepreku, LOTO proveru i sledeću obuku.”                                             |
| 24–39 s | (Pokazati cards layout.) „Upozorenje i blokada su uočljivi; duža lista automatski prelazi na sledeću stranicu dok je board aktivan.”                |
| 39–50 s | „Ovo je informativna safety tabla. Nije emergency takeover, alarmni sistem, audit dokaz niti zamena za vašu HSE proceduru.”                         |
| 50–60 s | „Za pilot merimo vreme objave, podudarnost source-a i ekrana i broj smena u kojima je poruka proverena — ne obećavamo manje incidenata bez dokaza.” |

**Posle timera:** ukloniti prepreku iz source-a, promeniti `Protivpožarni izlazi` na `Gotovo`, a observer beleži kada je promena stigla. `Dani bez povrede` je u ovom fixture-u ručno održavana vrednost.

## 4. Frontline Communications · HR / interne komunikacije

**Pre timera:** na istoj demo playlisti pripremiti jedan Teams item i jedan PowerPoint item u `Microsoft account (private file)` režimu. Koristiti isključivo nepoverljive demo objave i slajdove.

| Vreme   | Radnja i tekst                                                                                                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–10 s  | „Ne tražimo od HR-a novi editor: kratke operativne poruke dolaze iz izabranog Teams kanala, a dizajnirani sadržaj iz PowerPoint-a.”                                    |
| 10–25 s | (Pokazati Teams spotlight.) „Teams konektor samo čita tekstualne poruke i announcements jednog kanala; može da prikaže spotlight ili grid i ime autora.”               |
| 25–42 s | (Sačekati PowerPoint item.) „Za PowerPoint se bira `.pptx` iz OneDrive-a ili SharePoint-a; backend ga pretvara u slajdove, a player ih rotira sa podešenim trajanjem.” |
| 42–51 s | „To su dve obične stavke iste playliste, ne poseban novi komunikacioni sistem.”                                                                                        |
| 51–60 s | „Pilot meri vreme objave i broj ručnih prebacivanja sadržaja. Reach i proof-of-play danas ne tvrdimo jer ih ovaj tok ne meri.”                                         |

**Obavezna bezbednosna napomena pre spoljne demonstracije:** izvorni `.pptx` može biti nejavan, ali trenutni renderovani slajdovi izlaze na javne R2 URL-ove. Ne koristiti poverljiv HR, finansijski ili kupčev sadržaj i ne govoriti „end-to-end private”.

## 5. Room & Visitor Board · facilities / office manager

**Pre timera:** otvoriti namenski demo Outlook kalendar sa sintetičkim događajima i ekran u `schedule` view-u, `onlyUpcoming: true`, jezik `sr`.

| Vreme   | Radnja i tekst                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0–10 s  | „Recepcija ili facilities zadržava Outlook kalendar koji već održava; ekran samo čita izabrani kalendar.”                                                                      |
| 10–25 s | (Pokazati Outlook događaj.) „Na ekran stižu naslov, početak, kraj i lokacija. Ovde je naslov neutralna oznaka posete, bez ličnih ili poverljivih detalja.”                     |
| 25–42 s | (Pokazati schedule/day prikaz.) „Možemo da biramo day, week, month ili schedule prikaz, samo buduće događaje, automatski scroll, srpski ili engleski i svetlu ili tamnu temu.” |
| 42–51 s | „Aplikacija je read-only: ne rezerviše sobu, ne radi check-in i ne meri zauzetost.”                                                                                            |
| 51–60 s | „Pilot meri broj pitanja na recepciji, pogrešne ili zastarele stavke i vreme od izmene kalendara do ekrana.”                                                                   |

**Posle timera:** pomeriti jedan sintetički događaj u Outlook-u i zabeležiti stvarno vreme update-a. Graph subscription path postoji, a 30-minutni poll je fallback; brzina se dokazuje na konkretnom tenant-u.

## Kada prekinuti demo

- Ako kupac traži emergency override, site-based bulk publish, approval workflow, dokaz prikazivanja ili write-back, zabeležiti zahtev; ne predstavljati ga kao postojeću funkciju.
- Ako povezana promena ne stigne tokom razgovora, ne osvežavati nasumično i ne izmišljati objašnjenje. Sačuvati timestamp, proveriti konekciju/webhook posle poziva i demonstrirati već sinhronizovan rezultat.
- Ako su potrebni stvarni podaci kupca, preći na dogovoreni pilot i obradu bezbednosti/podataka; ne kopirati ih u javne demo fajlove.
