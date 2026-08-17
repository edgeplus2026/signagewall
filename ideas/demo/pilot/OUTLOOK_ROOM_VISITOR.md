# Outlook Room & Visitor Board · postojeći workflow

Outlook aplikacija je read-only prikaz jednog Microsoft 365 kalendara. Isti tehnički tok podržava dve uske ponude: raspored sobe i recepcijski raspored poseta. „Visitor board” ovde znači pažljivo formatirani calendar event, ne visitor-management sistem.

## Preduslovi

- Microsoft OAuth i `ENCRYPTION_KEY` podešeni na backend-u.
- Povezani Microsoft nalog ima `Calendars.Read` pristup namenskom kalendaru.
- Javno dostupan Graph callback za push demonstraciju; polling fallback je 1 800 sekundi.
- Namenski demo kalendar sa sintetičkim podacima.

## A. Room schedule, korak po korak

1. U Outlook-u napraviti namenski kalendar `DEMO · Sala Dunav`.
2. Dodati tri sintetička događaja u narednim satima:
   - `Jutarnji operativni sastanak`, lokacija `Sala Dunav`;
   - `Plan smene 2`, lokacija `Sala Dunav`;
   - `Servis projektora`, lokacija `Sala Dunav`.
3. Unapred kreirati Outlook app instance i povezati Microsoft nalog.
4. Izabrati kalendar `DEMO · Sala Dunav`.
5. Za ekran ispred sobe izabrati `day` ili `schedule`; za centralni lobby po potrebi `week`.
6. U `schedule` prikazu uključiti `onlyUpcoming`; `autoScroll` uključiti samo ako test pokaže da sadržaj prelazi visinu ekrana.
7. Izabrati `sr`/`en` i svetlu/tamnu temu.
8. Dodeliti item ekranu i proveriti naslov, početak, kraj i lokaciju svakog događaja.
9. Pomeriti jedan događaj u Outlook-u, zabeležiti oba timestamp-a i sačekati stvarni update bez tvrdnje o fiksnom vremenu.

## B. Visitor board, korak po korak

1. Napraviti odvojen kalendar `DEMO · Recepcija`; ne mešati ga sa privatnim kalendarima zaposlenih.
2. Koristiti neutralne sintetičke naslove bez ličnih podataka, npr. `Poseta DEMO-101 · domaćin Prodaja`.
3. U `location` upisati mesto prijave, npr. `Recepcija A`, jer connector prenosi samo location display name.
4. Ne stavljati kontakt podatke, beleške o posetiocu, listu attendee-ja ili osetljivu svrhu sastanka; connector ih ne prikazuje, ali source i dalje treba da bude demo-safe.
5. Izabrati `schedule`, `onlyUpcoming: true`, `autoScroll` po potrebi i odgovarajući jezik/temu.
6. Dodeliti namenskom recepcijskom demo ekranu.
7. Tokom pilota observer poredi Outlook događaje sa ekranom i beleži pogrešne/zastarele stavke i broj pitanja recepciji.

## Šta trenutni connector stvarno prenosi

- `subject` kao naslov;
- start i, ako postoji, end;
- `isAllDay`;
- `location.displayName`;
- label izabranog kalendara.

Fetch prozor je sedam dana unazad i 60 dana unapred, uz najviše 500 događaja. Prikaz može biti `day`, `week`, `month` ili `schedule`, sa `onlyUpcoming`, `autoScroll`, `en`/`sr` i light/dark opcijama.

## Šta ne nudimo

- kreiranje, izmenu ili brisanje događaja iz SignageWall-a;
- room booking, konflikt resolution ili panel dugme `Book now`;
- visitor pre-registration, dokumenta, check-in, badge printing ili host notification;
- occupancy senzore ili prisustvo;
- prikaz attendee-ja, organizatora, opisa ili privatnih beleški;
- garantovani trenutni update bez realne Graph subscription/proxy provere na tenant-u.

## Ručna pilot merenja

- `calendar_edit_at -> screen_observed_at` za najmanje 10 izmena;
- broj pitanja „da li je sala slobodna?” ili „gde ide poseta?” po danu, pre i tokom pilota;
- broj pogrešnih/zastarelih događaja pronađenih u tri dnevne provere;
- vreme koje facilities/recepcija troši na ručno ažuriranje postojećeg display-a;
- reconnect i backend-refresh greške.

Tek nakon baseline/pilot poređenja može se govoriti o smanjenju pitanja ili administracije.
