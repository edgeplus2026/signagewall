> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../../README.md).

# {{Kupac}} — operativni ekran za jednu zonu

**Predlog pilota:** {{Live Shift Board / Dock & Dispatch Board}}  
**Zona:** {{pogon / smena / magacin / rampa}}  
**Planirani početak:** {{datum}}  
**Trajanje merenja:** 7 dana

## Problem koji proveravamo

{{Ko danas menja informaciju, gde je menja, ko kasno sazna i koji ručni poziv,
prepisivanje ili odlazak želimo da smanjimo.}}

## Šta SignageWall radi

Ovlašćeni operator nastavlja da održava postojeći read-only Google Sheet ili
Excel workflow. SignageWall ga pretvara u čitljivu operativnu tablu na jednom
dogovorenom ekranu. Kada je izvor ili veza privremeno nedostupna, sistem čuva
poslednje uspešno dostavljeno stanje umesto da prazni tablu.

## Uključeno

- jedan Shift ili Dispatch workflow;
- jedan postojeći Sheet/Excel izvor;
- jedan kompatibilan ekran/player;
- mapiranje do sedam standardnih kolona bez razvoja posebnog konektora;
- konfiguracija i obuka jednog operatora;
- sedam dana praćenja i završni pregled rezultata.

## Kriterijum prolaza

**Tehnički:** {{npr. dogovorena izmena iz izvora stigne na ekran u izmerenom
roku, reconnect vrati tablu i poslednje dobro stanje radi po checklisti}}.  
**Poslovni signal:** {{npr. broj statusnih poziva/odlazaka ili minuti ručnog
prepisivanja pre i tokom pilota}}.

Ne garantujemo unapred određeni poslovni procenat; rezultat merimo iz početnog
baseline-a koji kupac potvrđuje.

## Cena i granice

**750 EUR jednokratno.** Ako se godišnji rollout potpiše u roku od sedam dana po
završetku pilota, ceo iznos se uračunava u dogovoreni rollout onboarding.

Hardver, montaža, kabliranje, terenski rad koji nije izričito naveden, ERP/MES
write-back, custom integracija i nove funkcije nisu uključeni. Ako SignageWall ne
ispuni unapred dogovoreni tehnički kriterijum, primenjuje se ovde upisan uslov:
{{ograničen refund/ponavljanje testa}}.

## Sledeći korak

Kupac do {{datum}} potvrđuje buyer-a, source owner-a, sanitizovan primer kolona,
kompatibilan ekran/player i termin. SignageWall zatim šalje order form i instrukciju
za uplatu, a kickoff je {{datum i vreme}}.

**Buyer:** {{ime, funkcija}}  
**Source owner:** {{ime, funkcija}}  
**Odobreno:** {{ime / datum / potpis ili referenca narudžbenice}}
