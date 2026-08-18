> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../../README.md).

# DEMO-01 · Sellable pilot paket

Ovaj direktorijum pretvara trenutne funkcije u ponovljiv, pošten demo koji osnivač može da vodi bez otvaranja app kataloga pred kupcem. Primarni cilj nije prikaz broja aplikacija, već jedan tok rada kupca i jedna merljiva promena.

## Šta je spremno

| Ponuda                   | Buyer                                     | Izvor za demo                                           | Ekranski format                            |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Live Shift Board         | direktor proizvodnje / rukovodilac pogona | [`shift-production.csv`](datasets/shift-production.csv) | OpsBoard `shift` + `status-table`          |
| Dock & Dispatch Board    | rukovodilac logistike / magacina          | [`dock-dispatch.csv`](datasets/dock-dispatch.csv)       | OpsBoard `dispatch` + `queue`              |
| Digital Safety Board     | HSE / plant manager                       | [`safety-board.csv`](datasets/safety-board.csv)         | OpsBoard `safety` + `cards`                |
| Frontline Communications | HR / interne komunikacije / operacije     | postojeći Teams kanal + PowerPoint private-file source  | dva postojeća app item-a u istoj playlisti |
| Room & Visitor Board     | facilities / office manager               | postojeći Outlook kalendar                              | Outlook `schedule` ili `day` view          |

## Jednokratna priprema, korak po korak

1. U internoj/demo organizaciji omogućite `opsboard`; nemojte ga javno uključiti samo zbog demonstracije.
2. Importujte tri CSV-a u tri worksheet-a ili tri odvojena dokumenta. Ne koristite pravi korisnički ili proizvodni podatak.
3. Napravite tri unapred imenovane OpsBoard instance i primenite mapiranja iz [`OPSBOARD_MAPPING.md`](OPSBOARD_MAPPING.md).
4. Svaku instancu unapred dodelite namenskom demo ekranu ili playlisti: `DEMO · Shift`, `DEMO · Dispatch`, `DEMO · Safety`.
5. Sačekajte da se svaki board jednom uspešno prikaže na uparenom player-u. Time je snapshot dostavljen; lokalni cold-boot oporavak smatrajte dokazanim tek kada prođe offline reload iz checkliste.
6. Na laptopu otvorite samo izvor podataka i odgovarajući CMS content item. Na drugom prozoru ili fizičkom ekranu ostavite player. App katalog ne treba da bude deo poziva.
7. Pripremite po jednu reverzibilnu izmenu: status A2, status rampe 04 i broj potvrda za HSE obuku. Posle razgovora vratite fixture vrednosti.
8. Pre kupca prođite [`OFFLINE_RECONNECT_CHECKLIST.md`](OFFLINE_RECONNECT_CHECKLIST.md) na istom uređaju i istoj mreži.
9. Za Microsoft ponude pripremite zasebne, nepoverljive demo resurse prema [`FRONTLINE_TEAMS_POWERPOINT.md`](FRONTLINE_TEAMS_POWERPOINT.md) i [`OUTLOOK_ROOM_VISITOR.md`](OUTLOOK_ROOM_VISITOR.md).
10. Otvorite [`pilot-capture-sheet.csv`](pilot-capture-sheet.csv) i unesite baseline pre prvog dana pilota. Bez baseline-a nema tvrdnje o uštedi ili poboljšanju.
11. Kopirajte [`OFFER_TEMPLATE_OPS.md`](OFFER_TEMPLATE_OPS.md), popunite buyer-ov
    problem, acceptance kriterijum i datum, pa izvezite samo popunjenu kopiju u PDF.

## Tok sastanka

1. Izaberite samo jedan script iz [`DEMO_SCRIPTS_60S.md`](DEMO_SCRIPTS_60S.md), prema ulozi sagovornika.
2. Posle 60 sekundi pitajte: „Ko danas menja ovu informaciju, gde je menja i ko je poslednji sazna?”
3. Ako odgovor odgovara ponuđenom toku, dogovorite jedan ekran, jedan izvor i jednog operatora za sedmodnevni pilot.
4. Dogovorite metriku i baseline iz [`PILOT_METRICS.md`](PILOT_METRICS.md) pre instalacije.
5. Ne obećavajte uštedu, smanjenje čekanja, bolju bezbednost ili reach dok capture sheet to ne pokaže.

## Granice koje se izgovaraju naglas

- OpsBoard prikazuje i sinhronizuje operativni tekst; ne piše nazad u Sheet/Excel i nema workflow odobravanja.
- Promena izvora ide preko provider push putanje gde je ona podešena, uz polling fallback. Merimo stvarno `edit -> screen` vreme; ne nudimo nepostojeći SLA.
- Player pokušava da sačuva poslednji snapshot i OpsBoard nema network-only oznaku. Sam prekid mreže na player-u, međutim, ne postavlja automatski OpsBoard `Offline` bedž; taj bedž zahteva novi snapshot sa backend `stale` podatkom posle neuspelog upstream fetch-a.
- Safety preset nije emergency takeover, alarmni sistem ni dokaz usklađenosti. Stavka „Dani bez povrede” u ovom pilotu je obična ručno održavana vrednost.
- Teams je read-only tekstualni feed; ne prikazuje image-only objave i nema slanje poruka.
- PowerPoint `Microsoft account (private file)` bira nejavni izvor iz OneDrive/SharePoint-a, ali trenutni konektor vraća renderovane slajdove preko javnih R2 URL-ova. Koristiti samo nepoverljiv demo sadržaj dok privatna asset isporuka ne bude uvedena i proverena.
- Outlook prikazuje naslov, početak/kraj i lokaciju događaja. Nema booking, check-in, occupancy niti visitor-management funkcije.

Detaljna veza između ovih rečenica i trenutnog koda je u [`CODE_EVIDENCE.md`](CODE_EVIDENCE.md).
