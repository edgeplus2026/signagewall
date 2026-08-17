# OpsBoard mapiranje za pilot podatke

Sva tri CSV-a su sintetička: ne sadrže OAuth tokene, identifikatore konekcija, stvarne registracije vozila, lična imena ni podatke kupca. Namenjeni su za import u Google Sheets ili Microsoft Excel, odnosno za jednokratni CSV import u ručni OpsBoard.

Kod povezanog izvora konfiguracija čuva mapiranje u smeru `OpsBoard target -> tačan naziv kolone`. Prvi red se čita kao zaglavlje. Premeštanje kolona ne kvari mapiranje, ali promena teksta zaglavlja zahteva novo mapiranje.

## Shift production

Fajl: [`datasets/shift-production.csv`](datasets/shift-production.csv)

Preporučena konfiguracija:

- `preset`: `shift`
- `heading`: `Smena 1 · Plan i realizacija`
- `layout`: `status-table`
- `showHeader`: `true`
- `pageSeconds`: `12`
- `theme`: `dark`

Tačno mapiranje:

```json
{
  "label": "Linija / radni centar",
  "primary": "Plan",
  "secondary": "Realizacija",
  "status": "Status",
  "note": "Blokada / instrukcija",
  "group": "Zona / smena",
  "sortOrder": "Redosled"
}
```

## Dock dispatch

Fajl: [`datasets/dock-dispatch.csv`](datasets/dock-dispatch.csv)

Preporučena konfiguracija:

- `preset`: `dispatch`
- `heading`: `Otprema · Raspored rampi`
- `layout`: `queue`
- `showHeader`: `true`
- `pageSeconds`: `12`
- `theme`: `dark`

Tačno mapiranje:

```json
{
  "label": "Kamion / rampa",
  "primary": "Termin",
  "secondary": "Prevoznik",
  "status": "Status",
  "note": "Instrukcija",
  "group": "Zona",
  "sortOrder": "Redosled"
}
```

## Safety board

Fajl: [`datasets/safety-board.csv`](datasets/safety-board.csv)

Preporučena konfiguracija:

- `preset`: `safety`
- `heading`: `Bezbednost · Trenutno stanje`
- `layout`: `cards`
- `showHeader`: `true`
- `pageSeconds`: `12`
- `theme`: `dark`

Tačno mapiranje:

```json
{
  "label": "Bezbednosna stavka",
  "primary": "Cilj",
  "secondary": "Trenutno",
  "status": "Status",
  "note": "Bezbednosna poruka",
  "group": "Zona",
  "sortOrder": "Redosled"
}
```

## Pravila koja demonstrator mora da sačuva

- `label` je jedino obavezno mapirano polje. Red bez njega se ne prikazuje.
- `sortOrder` je broj. Redovi sa validnim brojem idu prvi, rastuće; ostali zadržavaju redosled iz izvora i idu posle njih.
- Vrednosti su prikazani tekst iz ćelije; nema formula ili računanja unutar OpsBoard-a.
- Statusi u fixture-ima su namerno među trenutno podržanim srpskim aliasima. Nepoznat ili prazan status postaje `neutral`, a ne greška.
- Povezani čitač je ograničen na 200 redova. Za duže tabele ne obećavati prikaz preko tog limita.
- `status-table`, `cards` i `queue` automatski dele duži sadržaj na stranice. Rotacija stranica radi samo dok je stavka aktivna na ekranu.

## Deterministički demo naspram integracionog dokaza

Za tačno 60 sekundi koristite unapred kreirane instance i već sinhronizovane podatke. Ako je neophodno da promena bude vidljiva unutar kratkog razgovora, napravite posebnu ručnu demo instancu i sačuvajte izmenu kroz postojeći content flow.

CSV importer u manual režimu ne poziva backend status normalizer. Posle importa zato kroz CMS status polje zamenite srpske source vrednosti canonical izborima `planned`, `active`, `warning`, `blocked` ili `done`; u suprotnom ih manual embed namerno prikazuje kao `neutral`. Ovo ograničenje ne važi za povezani Sheet/Excel tok.

Google Sheets i Excel koristite kao zaseban integracioni dokaz: izmenite jednu ćeliju, zabeležite vreme i sačekajte stvarni update. OpsBoard ima provider push putanje i polling fallback od 300 sekundi, ali ovaj runbook ne izmišlja SLA i ne garantuje da će promena stići u preostalih 60 sekundi.
