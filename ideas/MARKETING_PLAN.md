> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](README.md).

# SignageWall marketing i prodajni plan

> **Strategic update — 5 August 2026:** The primary Zero-to-One direction is **SignageWall Ops** for factories, warehouses and logistics. Its founding offer is a 750 EUR paid pilot, followed by site pricing and onboarding from 900 EUR only when real consulting/integration work is included. The menu/QSR work below is retained as a separate secondary experiment, now standardized as **Menu Starter** for bakeries, cafés and other small firms: no setup fee, one location/one to three screens, standard templates and a sustainable subscription. Custom design, unstructured migration, field work and hardware are outside the standard subscription. See [`OPS_PRODUCT_IMPLEMENTATION_PLAN.md`](./OPS_PRODUCT_IMPLEMENTATION_PLAN.md) for product scope and release gates.
>
> The concrete 17–23 August sales sprint targets the first **paid factory/logistics Ops pilot**. Menu Starter has its own lightly staffed funnel and must not distract from that sprint: [`ZERO_TO_ONE_SALES_SPRINT_2026-08-17.md`](./ZERO_TO_ONE_SALES_SPRINT_2026-08-17.md).

**Verzija:** 1.0  
**Datum:** 2. avgust 2026.  
**Period plana:** narednih 90 dana, sa smernicama za narednih 12 meseci  
**Vlasnici:** dva osnivača/developera SignageWall-a

---

## 1. Izvršni sažetak

SignageWall ne treba u početnoj fazi prodavati kao „digital signage softver za svaki ekran i svaku industriju“. To ga stavlja u direktno poređenje sa znatno većim platformama koje imaju više funkcija, više šablona, besplatne planove i razvijene prodajne kanale.

Primarna tržišna pozicija je SignageWall Ops za fabrike, skladišta i logistiku: postojeći Sheet/Excel workflow postaje pouzdana tabla jedne smene ili zone. Sekundarna, jasno odvojena ponuda je:

> **Menu Starter postavlja standardizovan digitalni meni ili cenovnik na postojeći kompatibilan ekran/player pekare, kafića ili drugog malog lokala, a vlasnik ga održava iz browsera ili podržane tabele — bez USB-a i bez setup naknade.**

Primarni cilj narednih 90 dana nije broj pratilaca niti veliki saobraćaj na sajtu. Cilj je dokazati ponovljiv sistem kojim SignageWall:

1. pronalazi kvalifikovanog kupca;
2. dovodi ga do kratkog demoa;
3. pušta prvi ekran u rad;
4. pretvara pilot u plaćenu pretplatu;
5. dobija preporuku ili dodatne ekrane.

Preporučeni početni model za sekundarni SMB eksperiment:

- **Jedan do tri menijska ekrana na jednoj lokaciji:** Menu Starter bez setup naknade, uz standardizovan self-service ili concierge-light onboarding.
- **Više od tri ekrana ili više lokacija:** individualna kvalifikacija; ne širiti standardni paket dok economics i support nisu dokazani.
- **Custom dizajn, nestrukturisana migracija, POS integracija ili terenski rad:** samo uz posebnu ponudu ili partnera.
- **Početno SMB tržište:** Srbija, zatim Bosna i Hercegovina, Crna Gora, Hrvatska i Severna Makedonija.
- **SMB vertikala:** counter-service kafići, pekare, poslastičarnice, fast-food i mali restoranski lanci.
- **SMB CTA:** „Pošaljite strukturisan meni i podatke o ekranu — proverićemo da li Menu Starter odgovara.“

Funneli se ne sabiraju:

| Track | Primarni signal uspeha | Prodajni model | Ograničenje fokusa |
| --- | --- | --- | --- |
| Ops | plaćen pilot od 750 EUR za jednu fabričku/logističku zonu | founder-led discovery, demo i merena isporuka | jedini cilj sprinta 17–23. avgusta |
| Menu Starter | aktivirana SMB lokacija koja prelazi u pretplatu | self-service/concierge-light, bez setup naknade | najviše dva termina ili lista čekanja dok Ops sprint traje |

Ops onboarding od 900+ EUR nudi se samo kada postoje stvarni consulting/integration zadaci. Menu Starter ima sopstvene metrike: conversion u pretplatu, activation vreme, support minuti i churn; njegov lead se ne računa kao Ops opportunity.

Hormozi princip koji vodi plan: prvo napraviti ponudu koja povećava verovatnoću uspeha i smanjuje vreme i trud kupca; zatim sistematski povećavati broj leadova; potom ubrzati naplatu, kontinuitet i ekspanziju. Zero to One princip: osvojiti mali, precizno definisan segment pre širenja na široko tržište.

---

## 2. Trenutno stanje proizvoda

### 2.1. Ono što se može prodavati danas

Implementacija trenutno podržava sledeće dokazive vrednosti:

- Upravljanje ekranima, medijima, plejlistama i app instancama iz centralnog CMS-a.
- Dodeljivanje istog postojećeg sadržaja na više eksplicitno izabranih ekrana.
- Slanje nove verzije sadržaja povezanom plejeru nakon izmene.
- Prikaz online/offline statusa, vremena poslednjeg javljanja i profila povezanog uređaja.
- Uparivanje plejera pomoću kratkog registracionog koda koji se unosi u CMS.
- Čuvanje poslednjeg snapshot-a i unapred preuzetih podržanih medija za rad tokom prekida veze.
- Podešavanje radnog vremena ekrana: stalno, nedeljno ili za posebne datume.
- Menu board sa ručnim unosom, jednokratnim CSV uvozom ili sinhronizacijom iz Google Sheets/Excel dokumenta.
- Google Sheets, Google i Outlook kalendari, PDF, PowerPoint, Google Slides, Canva, QR kod, vreme, vesti, društvene mreže i druge aplikacije.
- Katalog od 31 aplikacije u trenutnoj verziji repozitorijuma.
- Player za više tipova uređaja i mehanizmi oporavka/ažuriranja.

Najprodajniji trenutni workflow nije „31 aplikacija“, već:

> Postojeći meni/cenovnik → unos ili povezivanje tabele → vizuelno prilagođen prikaz → jedan ili više odabranih ekrana → daljinska izmena.

### 2.2. Tvrdnje koje se ne smeju koristiti dok se ne implementiraju

Prema `apps/web/CONTENT-CLAIMS.md`, trenutno se ne sme obećavati:

- automatska smena doručka, ručka i večere;
- per-item scheduling, početak/kraj kampanje ili automatski dayparting;
- sačuvane grupe ekrana i objavljivanje celoj lokaciji jednim klikom;
- proizvoljne zone ili split-screen layout;
- granularne dozvole po ekranu ili lokaciji;
- approval workflow;
- rollback sadržaja;
- proof-of-play, impressions ili ugrađena analitika QR skeniranja;
- QR skeniranje za uparivanje uređaja;
- nativna POS/PMS/ERP/MES/SIS/booking/queue integracija;
- fizičko paljenje televizora ili kontrola njegove svetline;
- white-label platforma;
- offline rad svake mrežne aplikacije;
- garantovan rast prodaje ili drugi rezultat koji nije izmeren kod stvarnog kupca.

Na sajtu trenutno postoje formulacije koje ulaze u ovu zabranjenu grupu, posebno za scheduling, zone, grupe, dozvole, rollback i QR pairing. To je **P0 problem pre većeg outreach-a**. Demo koji ne može da potvrdi obećanje sa landing stranice ruši poverenje i povećava broj izgubljenih prodaja.

### 2.3. Poslovne rupe koje treba zatvoriti

- Ne postoji kompletan subscription/trial/billing lifecycle u aplikaciji.
- Ručno fakturisanje malih SMB pretplata stvara nesrazmeran administrativni trošak; mesečna naplata mora biti automatizovana ili zamenjena godišnjom.
- Quote i contact forme šalju email, ali ne grade CRM zapis niti čuvaju izvor, kampanju i status leada.
- Postoji GA/Vercel analitika, ali nema kompletnih funnel događaja od marketinškog klika do prvog aktivnog ekrana i plaćanja.
- Brojevi „200+ ekrana“, „40+ organizacija“ i „6+ zemalja“ na sajtu moraju biti potvrđeni iz stvarnih podataka i precizno definisani.
- Nema dovoljno stvarnog social proof-a: imenovani kupci, fotografije instalacija, izjave i merljivi case studies.

---

## 3. Strateški izbor tržišta — Zero to One pristup

### 3.1. Sekundarni ICP za Menu Starter eksperiment

**Vrsta firme**

- Kafić, pekara, poslastičarnica, fast-food ili casual restoran.
- Jedna lokacija.
- Jedan do tri menijska ekrana ukupno.
- Postojeći TV/displeji ili konkretan plan da ih postave u narednih 30 dana.

**Operativna situacija**

- Meni ili cenovnik već postoji u Excel-u, Google Sheets-u, CSV-u, PDF-u ili Canvi.
- Cene, proizvodi ili promocije menjaju se najmanje jednom mesečno, idealno nedeljno.
- Trenutni proces uključuje USB, ponovno eksportovanje dizajna, štampu ili odlazak do uređaja.
- Vlasnik ili menadžer lično oseća problem i dostupan je za kratak razgovor.

**Uloge u kupovini**

- Ekonomski kupac je najčešće vlasnik ili operativni menadžer.
- Svakodnevni korisnik može biti menadžer lokala ili osoba zadužena za meni.
- Pilot nije kvalifikovan ako nema imenovanu osobu koja može da odobri nastavak plaćanja.

**Kupovna sposobnost i signal namere**

- Firma posluje dovoljno dugo da ima stabilnu lokaciju i budžet za ekran/hardver.
- Ima više tačaka na kojima kupac donosi odluku: izlog, pult, red, kasa.
- Aktivno održava ponudu i brend na Instagramu ili sajtu.
- Ima konkretan rok: nova lokacija, renoviranje, promena cenovnika ili sezonska ponuda.

### 3.2. Segmenti koje ne treba aktivno juriti u prvih 90 dana

- Kupci sa jednim ekranom kojima treba custom dizajn, nestrukturisana migracija ili višesatna pomoć koju ne žele posebno da plate.
- Jedan statičan ekran čiji se sadržaj menja jednom ili dva puta godišnje.
- Veliki enterprise sistemi sa zahtevima za SSO, audit log, approval, granularne dozvole i formalni SLA.
- Digitalne advertising mreže koje zahtevaju proof-of-play i impressions.
- Kupci kojima su POS integracija, automatski dayparting ili multi-zone obavezni za pilot.
- Bolnice, aerodromi i kritični sistemi sa zahtevima za emergency takeover i formalnu usklađenost.
- Kupci koji traže kompletno white-label rešenje.

Ovi segmenti nisu zauvek odbačeni. Oni su odloženi dok proizvod i prodajni sistem ne budu spremni.

### 3.3. Zašto baš ova niša

- Menu board je jedan od najkompletnijih i najkonkretnijih postojećih workflow-a.
- Problem je vizuelan i lako se demonstrira u 30–60 sekundi.
- Vlasnik je često direktno dostupan preko telefona, Instagrama ili na lokaciji.
- Kupac već razume vrednost menija i televizora; ne treba ga prvo edukovati o internim komunikacionim platformama.
- Lokalna podrška, jezik i pomoć oko hardvera mogu biti značajniji od broja funkcija.
- Svaki uspešan kupac daje fotografiju, testimonial, preporuku i potencijal za dodatne ekrane/lokacije.

---

## 4. Pozicioniranje i poruke

### 4.1. Kategorija

Ne: „kompletna digital signage platforma za sve industrije“.

Da:

> **Najlakši način da lokal sa postojećih fajlova i televizora pređe na digitalni meni koji se održava na daljinu.**

### 4.2. Jedna rečenica

> SignageWall pretvara postojeći TV u digitalni meni ili cenovnik koji menjate iz browsera, Google Sheets-a ili Excel-a, bez USB-a i odlaska do svakog ekrana.

### 4.3. Kratki pitch

> Izaberete postojeći šablon, unesete strukturisan meni ili povežete podržanu tabelu i uparite svoj kompatibilan ekran/player. Dajemo vodič i jedan kratak activation poziv; posle toga sami menjate cene. Počinjemo jednom lokacijom, bez setup naknade i bez kupovine zatvorenog hardverskog sistema.

### 4.4. Glavne poruke po problemu

| Problem kupca                               | Poruka                                                                | Dokaz u demou                                     |
| ------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| Svaka promena traži USB ili odlazak u lokal | Menjajte sadržaj iz browsera                                          | Izmeniti cenu i poslati novu verziju ekranu       |
| Meni već postoji u tabeli                   | Ne prepisujte ga u još jedan sistem                                   | Povezati/importovati Google Sheets, Excel ili CSV |
| Ne zna koji hardver treba                   | Dobija tačnu listu, bez obaveze da hardver kupi od nas                | Pokazati preporučeni player i način povezivanja   |
| Plaši se crnog ekrana kada padne internet   | Podržani preuzeti sadržaj ostaje dostupan iz lokalnog keša            | Kontrolisani offline demo sa statičkim sadržajem  |
| Ima više ekrana                             | Isti postojeći sadržaj može se dodeliti konkretnim odabranim ekranima | Objaviti na dva test ekrana                       |
| Ne želi tuđi watermark                      | Prikaz nema SignageWall watermark                                     | Pokazati podržane boje, font i čist gotov ekran   |

### 4.5. Poruke koje treba izbegavati

- „Povećava prodaju za X%.“
- „Ekran nikada neće stati.“
- „Radi offline sa svim aplikacijama.“
- „Menja meni trenutno“ ako vreme nije izmereno i stabilno za dati izvor.
- „Objavite svim poslovnicama jednim klikom“ dok ne postoje sačuvane grupe.
- „Sve automatizujete“ dok se pojedinačni sadržaj ne može zakazivati.
- „Radi na svakom smart TV-u“ bez potvrđene kompatibilnosti konkretnog uređaja/player-a.

---

## 5. Grand Slam ponuda

### 5.1. Lead magnet: besplatan „Screen Preview“

Kvalifikovani potencijalni kupac šalje:

- trenutni meni/cenovnik ili link do javnog dokumenta;
- fotografiju prostora ili postojećeg ekrana;
- broj lokacija i ekrana;
- grad i željeni rok.

SignageWall vraća:

- jedan vizuelno prilagođen preview u okviru mogućnosti postojećeg šablona;
- preporuku orijentacije i čitljivosti;
- minimalnu listu potrebnog hardvera;
- okvirnu cenu i realan sledeći korak.

**Ograničenje:** preview se radi samo za kvalifikovane firme sa stvarnim ekranom ili planom nabavke u narednih 30 dana. Ne nuditi neograničen besplatan dizajn svima.

### 5.2. Osnovna SMB ponuda: SignageWall Menu Starter

**Ishod**

Prvi digitalni meni radi na jednoj lokaciji, a kupac zna samostalno da promeni bar jednu cenu ili stavku.

**Šta ulazi u pretplatu bez setup naknade**

- Jedna lokacija i jedan do tri ekrana.
- Jedan od postojećih Menu Board šablona, sa podržanim bojama, fontom i logotipom.
- Standardni obrazac/CSV unos ili podržano povezivanje Google Sheets/Excel izvora.
- Vodič za povezivanje sopstvenog kompatibilnog ekrana/player-a.
- Najviše jedan kratak remote activation poziv.
- Kupac zatim sam održava meni i cene.

**Granice standardnog paketa**

Bez dodatne ponude nisu uključeni custom dizajn, nestrukturisana migracija menija, obrada fotografija, POS integracija, nova funkcionalnost, hardver, dolazak na lokaciju, montaža ni kabliranje. Eventualni hardver ili terenski rad je pass-through ili posebna partnerska ponuda. Ovo nije garancija rasta prodaje.

### 5.3. Cena koju treba testirati

| Ponuda                         | Hipoteza cene                                  | Kome je namenjena                                           |
| ------------------------------ | ----------------------------------------------: | ----------------------------------------------------------- |
| Menu Starter mesečno           | 29 €/lokacija za prvi ekran + 8 €/dodatni ekran | Jedna lokacija i najviše tri ekrana                         |
| Menu Starter godišnje          | 290 €/lokacija za prvi ekran unapred             | Kupac koji želi jednostavniju godišnju naplatu              |
| Dodatna usluga ili više lokacija | Individualno                                   | Samo posle jasnog obima; ne menja standardni paket          |

Nema setup naknade za standardni Menu Starter. Hardver i terenski rad nisu uključeni. Sve cene su hipoteze za razgovore i prve aktivacije, ne javni konačni cenovnik.

### 5.4. Predlog naplate za male naloge

Ručna faktura za veoma mali iznos je administrativno neefikasna. Testirati godišnju naplatu od 290 EUR za prvi ekran/lokaciju ili automatizovanu mesečnu naplatu od 29 EUR. Dodatni ekrani ostaju 8 EUR mesečno po ekranu u okviru limita standardnog paketa.

Tačnu poresku i fakturacionu primenu potvrditi sa računovođom. Marketinška cena i stvarni proces naplate moraju govoriti isto.

---

## 6. Money Model

Hormozi logika za SignageWall treba da bude sekvenca, ne jedna pretplata:

1. **Acquisition offer:** besplatan Screen Preview ili kratak audit postojećeg ekrana.
2. **Core offer:** Menu Starter pretplata bez setup naknade.
3. **Continuity:** godišnja ili kvartalna licenca po aktivnom ekranu.
4. **Expansion:** dodatni ekran, nova lokacija ili dodatni sadržaj/app workflow.
5. **Service upsell:** dodatni dizajn/import, samo ako je standardizovan ili isporučuje partner.
6. **Referral:** nagrada postojećem kupcu za novu aktivnu lokaciju.
7. **Partner channel:** instalater ili agencija dovodi i onboarduje kupca, a SignageWall isporučuje softver.

### 6.1. Osnovna ekonomija

Pri početnoj hipotezi:

- jedna lokacija/jedan ekran = 348 EUR godišnje uz mesečno plaćanje ili 290 EUR unapred;
- jedna lokacija/tri ekrana = 540 EUR godišnje uz mesečno plaćanje;
- 5.000 EUR MRR zahteva približno 173 lokacije sa jednim ekranom ili oko 112 lokacija sa tri ekrana.

Pošto nema setup prihoda, direktna prodaja i onboarding moraju biti strogo standardizovani. Jedna lokacija ne sme zahtevati višesatni custom rad; takav zahtev se posebno nudi, predaje partneru ili diskvalifikuje.

Za svaki posao beležiti:

```text
Prihod prve godine
- direktni troškovi
- (sati prodaje + sati onboardinga + sati podrške) × interna satnica
= doprinos poslu
```

Pretplata mora da pokrije prodaju, standardni activation, infrastrukturu, podršku i profit. Posebno ponuđene usluge moraju same pokriti svoj rad i direktne troškove.

Dodatne formule za praćenje:

```text
Bruto mesečni doprinos = MRR - hosting - storage - podrška - fakturisanje

CAC = oglasi + alati + put + provizije
      + (sales sati osnivača × interna satnica)

CAC payback u mesecima = CAC / bruto mesečni doprinos novog kupca
```

Početni ekonomski pragovi koje treba validirati:

- prosečan prihod po lokaciji i support minuti daju održivu maržu;
- standardni activation ne prelazi 30–45 minuta founder vremena;
- CAC payback nije duži od šest meseci;
- nijedan standardni Menu Starter activation ne preraste u custom onboarding;
- podrška ne prelazi dva sata po kupcu tokom prvih 30 dana;
- pretplata i posebno ugovorene usluge se u izveštajima vode odvojeno;
- LTV/CAC se ne proglašava pouzdanim dok ne postoje dovoljno stare kohorte i stvarni churn podaci.

### 6.2. Referral model

Početni test:

- Postojeći kupac dobija jedan besplatan mesec za svoje aktivne ekrane kada preporučena firma postane plaćeni kupac.
- Novi kupac dobija besplatan Screen Preview i prioritetni onboarding termin.
- Nagrada se daje tek posle prve uplate preporučenog kupca.

Ne davati velike trajne popuste koji smanjuju recurring prihod.

---

## 7. Prioritet kanala

Kanale uvoditi redosledom kojim daju najbrže učenje i najniži rizik.

| Prioritet | Kanal                                | Uloga u prvih 90 dana                            | Udeo GTM vremena |
| --------: | ------------------------------------ | ------------------------------------------------ | ---------------: |
|         1 | Postojeći nalozi i poznanstva        | Intervjui, aktivacija, prvi proof i preporuke    |              20% |
|         2 | Personalizovani outbound             | Glavni izvor novih razgovora i demoa             |              40% |
|         3 | Partneri i preporuke                 | Distribucija bez proporcionalnog founder vremena |              15% |
|         4 | Founder content + Instagram/LinkedIn | Poverenje i podrška outbound-u                   |              15% |
|         5 | Bottom-of-funnel SEO                 | Hvatanje aktivne tražnje                         |              10% |
|         6 | Plaćeni oglasi                       | Tek kada je funnel dokazan                       |    0% na početku |

Ne pokušavati da se svi kanali vode istim intenzitetom.

---

## 8. Postojeći korisnici — najbrži izvor učenja i prodaje

Sajt navodi 40+ organizacija i 200+ ekrana. Pre nove kampanje napraviti stvarni segmentirani izveštaj:

| Segment       | Definicija                                             | Akcija                                            |
| ------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Aktivni       | Player viđen u poslednjih 7 dana i ima sadržaj         | Intervju, ponuda, testimonial, referral           |
| Aktivirani    | Upario ekran i objavio sadržaj, ali nije skoro aktivan | Razgovor o razlogu zastoja i reaktivacija         |
| Stalled trial | Registrovan, nije upario prvi ekran                    | Concierge onboarding i pomoć oko hardvera         |
| Neaktivan     | Nema značajnu aktivnost 30+ dana                       | Kratka anketa sa jednim pitanjem zašto je odustao |
| Interni/test  | Demo i razvojni nalozi                                 | Isključiti iz marketinških brojki                 |

### Intervju sa postojećim korisnikom

Ne pitati „Da li vam se sviđa proizvod?“. Pitati:

1. Šta ste pokušavali da rešite kada ste otvorili nalog?
2. Kako ste taj problem rešavali pre SignageWall-a?
3. Koji događaj vas je naterao da tražite rešenje baš tada?
4. Šta je bilo najteže do prvog živog ekrana?
5. Koju funkciju stvarno koristite, a koju ste očekivali i niste našli?
6. Ko još učestvuje u odluci ili održavanju ekrana?
7. Šta bi vas navelo da platite danas?
8. Koga poznajete sa istim problemom?

Reči koje korisnici spontano koriste ulaze u oglase, outreach i landing stranicu.

---

## 9. Founder-led outbound sistem

### 9.1. Izgradnja liste

Izvori:

- Google Maps i fotografije lokala;
- Instagram profili i objave prostora;
- sajtovi lanaca i stranice „lokacije“;
- lokalni poslovni imenici;
- dostavne platforme kao izvor informacija o meniju i broju lokacija;
- preporuke postojećih korisnika;
- lokalni AV, POS i ugostiteljski partneri.

Minimalna CRM polja:

- naziv firme;
- delatnost;
- grad;
- broj lokacija;
- procenjeni broj ekrana;
- signal problema;
- ime decision maker-a;
- email, telefon, Instagram i LinkedIn;
- izvor;
- datum prvog kontakta;
- poslednji kontakt;
- sledeći korak i datum;
- lifecycle stage;
- izgubljeni razlog;
- procenjena vrednost prve godine.

Standardna taksonomija izgubljenih razloga:

- problem nije dovoljno bolan;
- nema budžeta;
- sagovornik nema autoritet;
- pogrešan timing;
- hardver ili instalacija;
- nedostajuća funkcija;
- cena;
- konkurent;
- status quo/USB je „dovoljno dobar“;
- nema odgovora posle kompletne sekvence.

### 9.2. Kvalifikacioni score

Dodati po jedan poen za svaki signal:

- 2+ ekrana;
- 2+ lokacije;
- meni/cenovnik se vidi na fotografijama;
- često menja ponudu ili cene;
- koristi tabelu/PDF/Canva;
- decision maker je direktno dostupan;
- planira otvaranje ili renoviranje;
- aktivan je na Instagramu;
- nema vidljivo centralizovano digital signage rešenje.

Prvo kontaktirati firme sa 6+ poena. Personalizacija se zasniva na jednom stvarnom opažanju, ne na generičkom komplimentu.

### 9.3. Nedeljni obim

Početni operativni cilj za jednog sales owner-a sa deset zaštićenih sati nedeljno:

- 25–30 novih kvalifikovanih naloga dodato u bazu;
- oko 30 kvalitetnih prvih kontakata;
- 25–30 follow-up kontakata;
- 2–4 discovery razgovora;
- 1–2 završena demoa;
- najviše dva aktivna pilota u bilo kom trenutku;
- nakon što pipeline proradi, jedan novi plaćeni kupac na jednu do dve nedelje.

Ovo su dijagnostički ciljevi, ne obećani tržišni rezultati.

### 9.4. Sekvenca kontakta

**Dan 1 — personalizovana poruka**  
Problem koji je primećen + jedna rečenica vrednosti + dozvola da se pošalje demo.

**Dan 3 — dokaz**  
Kratak video, preview ili relevantna fotografija; bez dugog opisa funkcija.

**Dan 7 — pitanje o procesu**  
„Kako danas menjate cenu ili ponudu na tim ekranima?“

**Dan 14 — zatvaranje petlje**  
Kratko obavestiti da se kontakt neće dalje ponavljati i ostaviti lak način da se jave kasnije.

Ne slati više od četiri kontakta bez odgovora u jednoj sekvenci.

---

## 10. Prodajni razgovor i demo

### 10.1. Discovery pitanja

1. Šta se trenutno prikazuje i na koliko ekrana/lokacija?
2. Kako danas menjate cenu, proizvod ili promociju?
3. Koliko često to radite?
4. Ko priprema sadržaj, a ko ga fizički postavlja?
5. Šta se dešava kada informacija ostane zastarela?
6. Gde se trenutno nalazi izvor istine: Excel, Google Sheets, POS, PDF ili Canva?
7. Koji hardver već postoji?
8. Šta mora da bude moguće da bi pilot bio uspešan?
9. Ko osim sagovornika odobrava kupovinu?
10. Postoji li datum do kojeg ekran mora da proradi?

Diskvalifikovati ili jasno odložiti kupca ako mu je obavezna funkcija koju SignageWall nema.

### 10.2. Demo od 15 minuta

| Minut | Sadržaj                                                                       |
| ----: | ----------------------------------------------------------------------------- |
|   0–3 | Ponoviti problem kupca njegovim rečima                                        |
|   3–7 | Pokazati meni ili najbliži relevantni primer                                  |
|  7–10 | Izmeniti jednu stavku/cenu i objaviti novu verziju                            |
| 10–12 | Pokazati status uređaja i kontrolisano offline ponašanje relevantnog sadržaja |
| 12–15 | Predložiti pilot sa konkretnim datumom, ekranima i cenom                      |

Ne pokazivati ceo katalog aplikacija osim ako kupac pita. Demo treba da potvrdi ishod, ne da bude obilazak proizvoda.

### 10.3. Pilot success criteria

Pilot je uspešan kada:

- bar jedan ekran radi na realnoj lokaciji;
- prikazuje stvarni sadržaj kupca;
- odgovorna osoba samostalno promeni jednu stavku ili cenu;
- tokom pilota su izvršene najmanje dve realne izmene bez USB workflow-a;
- ekran radi tokom dogovorenog perioda bez ručnog USB workflow-a;
- kupac i SignageWall imaju dogovoren datum odluke pre isteka probe.

Review zakazati sedmog dana, a komercijalnu odluku između 14. i 18. dana. Ne čekati da 21-dnevni trial tiho istekne.

---

## 11. Outreach skripte

### 11.1. Instagram DM ili kratak email

> Zdravo, video sam da **[lokal]** ima **[konkretno opažanje: dva TV menija / više lokacija / štampani cenovnik]**. Napravili smo SignageWall, sistem kojim se meni i cene na TV ekranima održavaju iz browsera, Google Sheets-a ili Excel-a, bez USB-a i odlaska do svakog ekrana. Ako pošaljete trenutni meni i fotografiju prostora, napravićemo vam besplatan prikaz u vašem brendu i reći tačno koji hardver je potreban. Da li da pošaljem kratak primer od 45 sekundi?

### 11.2. Prvi follow-up

> Samo da proverim da li sam se javio pravoj osobi. Ko kod vas menja sadržaj ili cene na ekranima? Mogu da pošaljem kratak primer bez prezentacije i prodajnog poziva.

### 11.3. Drugi follow-up

> Konkretno pitanje: kada promenite cenu, da li neko ponovo izvozi dizajn/koristi USB ili već imate centralni sistem? Ako je postojeći proces dovoljno lak, neću vas dalje gnjaviti.

### 11.4. Poslednja poruka

> Zatvoriću ovo da ne zatrpavam inbox. Ako budete menjali menije, otvarali novu lokaciju ili postavljali dodatne ekrane, pošaljite samo „MENI“ i napravićemo preview na vašem sadržaju.

### 11.5. Otvaranje telefonskog razgovora

> Zdravo, ne zovem zbog sajta ili marketing agencije. Imam jedno kratko pitanje: kako trenutno menjate cene ili ponudu na TV meniju? Pitam jer pravimo sistem koji taj proces radi iz browsera ili postojeće tabele.

### 11.6. Zatvaranje demoa

> Na osnovu onoga što ste rekli, predlažem Menu Starter za jednu lokaciju i **[broj]** ekrana. Standardni paket nema setup naknadu; hipoteza je 29 € mesečno za lokaciju/prvi ekran i 8 € za svaki dodatni ekran do ukupno tri. Koristite svoj kompatibilan ekran/player, a custom dizajn, migracija, hardver i terenski rad nisu u toj ceni. Ako krenemo **[datum]**, prvi korak je da nam pošaljete strukturisan meni i podatke o uređaju. Da li da rezervišemo activation termin?

### 11.7. Poruka partneru

> Zdravo, vidim da radite instalaciju/opremanje **[tip objekata]**. Mi razvijamo SignageWall, CMS i player za poslovne ekrane. Tražimo nekoliko lokalnih partnera koji bi zadržali prihod od hardvera, montaže, dizajna i podrške, dok mi isporučujemo softver i tehnički onboarding. Trenutni fokus su digitalni meniji iz Google Sheets/Excel-a. Da li ima smisla da vam pokažem demo i partnerski model za 15 minuta?

---

## 12. Instagram plan

### 12.1. Uloga Instagrama

Instagram nije primarni izvor volumena na početku. Njegov posao je da potencijalni kupac nakon DM-a ili poziva vidi:

- stvaran proizvod;
- ekran na stvarnoj lokaciji;
- ljude koji stoje iza proizvoda;
- cenu i potreban hardver;
- dokaz da onboarding nije komplikovan.

### 12.2. Profil

**Predlog bio teksta**

> Digitalni meniji na postojećem TV-u  
> Google Sheets / Excel / browser  
> 21 dan probe · lokalna podrška  
> Pošalji „MENI“ za besplatan preview

**Highlights**

- Kako radi
- Demo
- Cena
- Hardver
- Klijenti
- FAQ
- Kontakt

### 12.3. Content pillars

1. **Problem:** USB, zastarela cena, obilazak lokacija, nečitljiv meni.
2. **Demo:** promena stavke, uparivanje, rad ekrana, uređaj iza TV-a.
3. **Proof:** instalacija, kupac, testimonial, pre/posle.
4. **Edukacija:** izbor televizora/player-a, font i kontrast, priprema tabele.
5. **Founder journey:** šta ste naučili iz realnog onboardinga i zašto ste nešto napravili.
6. **Ponuda:** Screen Preview, ograničena mesta za rane Menu Starter korisnike i jasan CTA.

### 12.4. Održiv ritam

- 2 Reels-a nedeljno.
- 3–5 Stories-a sa stvarnog rada, demoa ili instalacije.
- 1 carousel ili fotografija nedeljno.
- 15 minuta dnevno za odgovore i ciljane interakcije.
- Jedan isti glavni CTA tokom najmanje četiri nedelje: „Pošalji MENI.“

Ne meriti uspeh prvenstveno followerima. Meriti kvalifikovane DM razgovore, preview zahteve, demo termine i plaćene ekrane iz Instagrama.

### 12.5. Prvih 12 tema

1. Kako se jedna cena menja bez USB-a.
2. Šta tačno stoji iza televizora.
3. Postojeći TV ili profesionalni displej?
4. Kako izgleda meni iz Google Sheets-a.
5. Tri greške zbog kojih se meni ne čita sa tri metra.
6. Pairing pomoću registracionog koda.
7. Šta se stvarno dešava kada padne internet.
8. Pre/posle prikaz istog cenovnika.
9. Koliko košta softver i šta hardver nije uključen.
10. Kako pripremiti Excel/CSV za uvoz.
11. Jedan dan rada na onboarding-u stvarnog klijenta.
12. Poziv za jedno od pet mesta za rane Menu Starter korisnike.

---

## 13. LinkedIn plan

### 13.1. Uloga LinkedIn-a

LinkedIn je važniji za:

- vlasnike malih lanaca;
- operations i marketing menadžere;
- AV instalatere i integratore;
- IT/MSP firme;
- agencije;
- kasniju office/hospitality prodaju.

Lični profili osnivača imaju prioritet nad company page-om. Company page je dokaz i arhiva; osnivači nose distribuciju i razgovore.

### 13.2. Nedeljni ritam

- Dve originalne objave po osnivaču.
- Jedna company page objava ili repurpose najboljeg founder posta.
- Deset relevantnih konekcija dnevno sa kratkim personalizovanim razlogom.
- Pet kvalitetnih komentara dnevno na objavama ciljnih kupaca i partnera.
- Jedan partner outreach blok nedeljno.

### 13.3. Teme

- „Zašto ekran od 500 € često i dalje radi kao USB ram za slike.“
- „Šta smo pogrešno obećavali na sopstvenom sajtu i kako smo to ispravili.“
- „Kako izgleda digitalni meni iz Google Sheets-a — bez POS integracije.“
- „Zašto ne prodajemo zatvoren hardver.“
- „Šta smo naučili iz deset razgovora sa vlasnicima lokala.“
- „Koliko founder vremena sme da košta kupac od jednog ekrana.“
- Case study sa stvarnim tokom, vremenom i izjavom kupca.

Iskrenost oko ograničenja može biti prednost brenda, ali objava uvek treba da završi korisnim zaključkom za kupca, ne internim tehničkim detaljem.

---

## 14. Website i conversion plan

### 14.1. Prioritetne izmene pre kampanje

1. Uskladiti sve tvrdnje sa `CONTENT-CLAIMS.md`.
2. Zameniti QR pairing formulacije unosom registracionog koda.
3. Ukloniti scheduling, dayparting, zones, saved groups, rollback i granular permissions dok ne postoje.
4. Proveriti svaku brojčanu trust tvrdnju i definisati šta znači „online“, „organizacija“ i „zemlja“.
5. Dodati stvarni video demoa iz proizvoda.
6. Dodati najmanje tri stvarne fotografije ekrana/instalacija.
7. Dodati imenovani testimonial samo uz dozvolu kupca.
8. Jasno označiti granicu između standardnog Menu Starter activation-a i dodatnih usluga.

### 14.2. Landing stranica za outbound

Predložena struktura `/sr/digitalni-meni` ili postojeće odgovarajuće solution stranice:

1. **Hero:** „Digitalni meni koji menjate iz Google Sheets-a ili Excel-a.“
2. **Podnaslov:** postojeći TV, pomoć pri postavljanju, bez USB-a.
3. **Primarni CTA:** „Pošaljite meni — dobijte besplatan preview.“
4. **Video:** 45–60 sekundi, promena jedne cene do prikaza na ekranu.
5. **Kako radi:** pošaljete sadržaj → povežemo ekran → sami održavate.
6. **Šta je uključeno:** tačan Menu Starter stack i limit pomoći.
7. **Šta nije:** hardver, POS, automatski dayparting ako još ne postoji.
8. **Cena:** pretplata bez setup naknade, uz jasno odvojene dodatne usluge; objaviti je tek kada hipoteza bude potvrđena.
9. **Proof:** fotografije, testimonial, proces i merljivi podaci.
10. **FAQ:** hardver, internet, izvor podataka, rok, podrška.
11. **Finalni CTA:** isti Screen Preview, bez novog poziva na akciju.

### 14.3. Forme

Za Screen Preview tražiti samo:

- ime;
- email ili telefon;
- naziv firme;
- broj ekrana;
- meni/link/upload;
- grad;
- očekivani rok.

Forma mora sačuvati:

- UTM source/medium/campaign/content;
- landing stranicu;
- referrer;
- locale;
- vreme kreiranja;
- status obrade;
- vlasnika leada.

Automatski email treba da potvrdi prijem i kaže šta se dešava sledeće i u kom roku.

---

## 15. Funnel i analitika

### 15.1. Lifecycle faze

```text
Prospect
→ Contacted
→ Replied
→ Qualified
→ Demo booked
→ Demo completed
→ Pilot agreed
→ First screen paired
→ First content published
→ 7-day active
→ Paid
→ Expanded
→ Referred
→ Churned / Lost
```

Svaka prilika mora imati sledeći korak, datum i vlasnika. „Čekamo odgovor“ nije sledeći korak bez datuma follow-up-a.

### 15.2. Product/marketing događaji

Minimalni događaji:

- `landing_viewed`
- `primary_cta_clicked`
- `screen_preview_started`
- `screen_preview_submitted`
- `registration_started`
- `registration_completed`
- `organization_created`
- `screen_created`
- `player_paired`
- `first_content_published`
- `screen_active_day_7`
- `trial_expiring`
- `subscription_started`
- `additional_screen_added`
- `subscription_cancelled`

Marketing identitet i product identitet treba povezati kada se korisnik registruje, uz poštovanje consent i privacy pravila.

### 15.3. North Star i pomoćne metrike

**North Star:** broj plaćenih aktivnih ekrana koji su se javili i prikazivali validan sadržaj u prethodnih sedam dana.

**Prodajne metrike**

- broj kvalifikovanih naloga;
- reply/conversation rate;
- qualified → demo;
- demo → pilot;
- pilot → paid;
- prosečan broj ekrana po novom kupcu;
- prihod prve godine po kupcu;
- founder sati po plaćenom kupcu;
- izgubljeni razlog.

Početni dijagnostički pragovi, uz obavezno prikazivanje apsolutnih brojeva kod malog uzorka:

- pozitivni odgovori / prvi kontakti: najmanje 5%;
- show rate zakazanih discovery poziva: najmanje 70%;
- kvalifikovani discovery → pilot: najmanje 30%;
- aktivacija dogovorenog pilota u sedam dana: najmanje 80%;
- pilot → paid: cilj najmanje 50%;
- medijana vremena do prvog živog ekrana: najviše tri radna dana nakon što su hardver i materijali spremni.

Primer: pisati `3/5 pilota postala su paid (60%)`, a ne samo `60%`.

**Aktivacione metrike**

- registration → first screen created;
- screen created → player paired;
- player paired → first content published;
- vreme do prvog živog ekrana;
- procenat aktivan sedmog dana;
- broj support kontakata do aktivacije.

**Retention metrike**

- 30/90-dnevno zadržavanje;
- churn po lokaciji i po ekranu;
- broj dodatih ekrana;
- broj preporuka;
- korišćeni workflow-i/aplikacije, bez predstavljanja usage-a kao poslovnog rezultata.

---

## 16. Partner channel

### 16.1. Idealni partneri

- AV instalateri;
- firme za video nadzor i mrežnu opremu;
- lokalni IT/MSP pružaoci usluga;
- dobavljači POS i ugostiteljske opreme, bez obećanja gotove integracije;
- marketing/dizajn agencije koje rade sa lokalima;
- prodavci i instalateri komercijalnih displeja.

### 16.2. Podela vrednosti

Partner može da zadrži prihod od:

- hardvera i marže na hardver;
- montaže;
- instalacije i izlaska na teren;
- dizajna sadržaja;
- obuke i lokalne podrške;
- managed content usluge.

SignageWall zadržava prihod od softvera i tehničku kontrolu platforme.

### 16.3. Početni komercijalni test

- Referral partner: 20% prve godišnje softverske licence, isplata posle naplate.
- Reseller/wholesale model: razmatrati tek kada partner dovede najmanje 20 aktivnih ekrana i preuzme jasno definisan prvi nivo podrške.
- Ne obećavati partner portal, white-label ili automatizovani obračun dok ne postoje.

### 16.4. Partner kit

- 60-sekundni demo video;
- jedna PDF/landing ponuda;
- hardware compatibility checklist;
- demo nalog;
- cenovnik i granice popusta;
- ko rešava koji tip problema;
- pravila za registraciju leada;
- tri gotova primera za ugostiteljstvo.

---

## 17. SEO i sadržaj sajta

Repozitorijum već ima blog, solution i app sadržaj. U prvih 90 dana ne povećavati broj generičkih članaka samo radi volumena.

Prioritet su bottom-of-funnel teme:

- digitalni meni za restoran;
- digitalni meni za kafić;
- digitalni cenovnik za pekaru;
- TV meni iz Google Sheets-a;
- softver za meni na televizoru;
- digital signage cena;
- koji player za digitalni meni;
- Android box za digital signage;
- zamena za USB sadržaj na TV-u.

Svaka stranica treba da vodi ka Screen Preview-u ili relevantnom trial-u, ne samo ka sledećem članku.

Prvi case studies treba da budu vredniji od još deset generičkih blog tekstova. Struktura case study-ja:

1. ko je kupac i koliko ima ekrana/lokacija;
2. kako je proces izgledao pre;
3. šta je postavljeno;
4. koliko je trajala aktivacija;
5. šta korisnik sada samostalno radi;
6. realna izjava kupca;
7. ograničenja i šta nije deo sistema;
8. CTA za sličan objekat.

---

## 18. Plaćeni oglasi

Ne pokretati ozbiljne oglase dok ne postoje:

- najmanje pet plaćenih kupaca iz istog ili vrlo sličnog segmenta;
- najmanje tri upotrebljiva proof asset-a;
- stabilan landing page;
- poznat demo → pilot i pilot → paid odnos;
- praćenje izvora do plaćenog ekrana;
- onboarding koji ne zahteva neograničeno founder vreme.

Kada uslovi postoje, prvi test:

- Meta/Instagram lokalna kampanja;
- budžet 300–500 €;
- jedan grad ili vrlo uska geografija;
- jedan ICP;
- jedan video dokaz;
- jedan CTA: Screen Preview;
- bez kampanje „probajte našu digital signage platformu“.

Test se ocenjuje po trošku kvalifikovanog razgovora, demoa, pilota i plaćenog ekrana — ne po CPM-u, lajkovima ili jeftinim form leadovima.

---

## 19. Organizacija rada za dva osnivača

### 19.1. Jasno vlasništvo

**Osnivač A — GTM owner, najmanje prvih 8 nedelja**

- lista i CRM;
- outbound i follow-up;
- discovery i komercijalni deo demoa;
- ponude i naplata;
- intervjui i partneri;
- nedeljni izveštaj.

**Osnivač B — Product/Onboarding owner**

- demo okruženje;
- tehnička kvalifikacija hardvera;
- onboarding i aktivacija;
- rešavanje P0 claim/billing/tracking problema;
- beleženje ponavljajućih blokera;
- pretvaranje naučenog u standardan proces.

Istovremeno se vode najviše dva pilota koji zahtevaju ličnu pomoć osnivača. Novi pilot se ne otvara bez dostupnog kapaciteta ili partnera koji preuzima deo isporuke.

Obojica razumeju prodaju, ali jedna osoba je odgovorna za to da pipeline ne stane. Uloge se mogu zameniti posle 8–12 nedelja, ali ne menjati svakog dana.

### 19.2. Primer nedelje

| Dan        | GTM owner                         | Product/Onboarding owner                |
| ---------- | --------------------------------- | --------------------------------------- |
| Ponedeljak | 15 novih kontakata, pipeline plan | P0 product/website rad                  |
| Utorak     | Follow-up i demoi                 | Demo podrška i onboarding               |
| Sreda      | 15 novih kontakata, intervju      | Product rad i jedan sadržaj/demo snimak |
| Četvrtak   | Follow-up, demoi, partneri        | Pilot aktivacije                        |
| Petak      | Ponude, zatvaranje i KPI review   | Funnel/bug analiza i prioriteti         |

Minimalan zaštićeni sales blok: dva sata svakog radnog dana. Ne pomerati ga zbog rada na novoj funkciji osim za incident koji pogađa aktivne korisnike.

---

## 20. Plan po fazama — prvih 90 dana

### Faza 1: Sales readiness — dani 1–14

**Cilj:** istinita poruka, jasna ponuda, početni proof i merljiv funnel.

- [ ] Odabrati jednog GTM owner-a.
- [ ] Uskladiti sajt sa `CONTENT-CLAIMS.md`.
- [ ] Potvrditi ili ukloniti 200+/40+/6+ trust brojke.
- [ ] Definisati tačan Menu Starter scope, hipotezu pretplate i granice pomoći.
- [ ] Napraviti Screen Preview formu/proces.
- [ ] Napraviti jednu vertikalnu landing stranicu.
- [ ] Snimiti demo od 45–60 sekundi.
- [ ] Napraviti CRM i lifecycle faze.
- [ ] Uvesti minimalne CTA, lead i activation događaje.
- [ ] Segmentirati postojeće naloge.
- [ ] Obaviti najmanje 10 intervjua.
- [ ] Pozvati tri kvalifikovana rana Menu Starter korisnika.

**Gate za sledeću fazu:** najmanje tri kvalifikovana kupca prihvataju da vide demo ili preview iste ponude.

### Faza 2: Direktna prodaja i piloti — dani 15–45

**Cilj:** potvrditi da isti ICP, poruka i demo mogu ponovljeno da proizvedu pilot.

- [ ] Dodati najmanje 75–100 kvalifikovanih firmi u bazu tokom faze.
- [ ] Voditi nedeljni outbound ritam.
- [ ] Održati najmanje 4–6 demoa tokom faze.
- [ ] Pokrenuti najmanje 2–3 pilota bez prelaska limita paralelnih onboardinga.
- [ ] Napraviti standardni onboarding checklist.
- [ ] Zabeležiti svaki izgubljeni razlog.
- [ ] Objaviti samo sadržaj koji podržava aktivni outreach.
- [ ] Tražiti referral posle uspešne aktivacije, ne pre.

**Gate za sledeću fazu:** najmanje dva plaćena kupca iz odabranog segmenta, aktivna posle prvog meseca, i jasan razlog zašto su kupili.

### Faza 3: Proof i partneri — dani 46–75

**Cilj:** smanjiti zavisnost od tvrdnji osnivača i otvoriti kanal preko drugih ljudi.

- [ ] Napraviti najmanje jedan kompletan case study i dva kratka testimonial/proof asset-a.
- [ ] Potvrditi ili korigovati pretplatu na osnovu aktivacije, support vremena i retention signala; ne uvoditi standardni setup fee.
- [ ] Kontaktirati 20–30 potencijalnih partnera.
- [ ] Održati najmanje tri partner demoa.
- [ ] Aktivirati najmanje jednog partnera sa stvarnim leadom.
- [ ] Standardizovati hardware checklist i support granice.
- [ ] Rangirati product zahteve po broju izgubljenih/otežanih poslova.

**Gate za sledeću fazu:** isti onboarding može da se isporuči bez improvizacije, a bar jedan kanal daje ponovljene kvalifikovane razgovore.

### Faza 4: Odluka o skaliranju — dani 76–90

**Cilj:** udvostručiti ono što radi ili promeniti hipotezu pre trošenja većeg novca.

- [ ] Analizirati funnel po segmentu, poruci i kanalu.
- [ ] Izabrati jedan dominantan segment za naredni kvartal.
- [ ] Odlučiti da li se povećava outbound, partneri ili testira paid.
- [ ] Postaviti subscription/billing proces za sledeći nivo volumena.
- [ ] Odabrati najvažniju product investiciju na osnovu prodajnih dokaza.
- [ ] Napraviti plan za narednih 90 dana sa realnim CAC i capacity podacima.

---

## 21. Ciljevi do kraja 90. dana

Ovo su operativni ciljevi, ne poslovna prognoza:

- 10+ razgovora sa postojećim korisnicima;
- 200–250 kontaktiranih kvalifikovanih firmi;
- 15–20 discovery razgovora;
- 8–12 završenih demoa;
- 5–7 pokrenutih pilota;
- 3–5 novih plaćenih lokacija;
- 10–20 novih plaćenih ekrana;
- 2 kompletna upotrebljiva case study-ja i dodatni kratki proof materijali;
- 2 partnera koja su donela bar jedan kvalifikovan lead;
- izmereno vreme do prvog ekrana;
- poznati demo → pilot i pilot → paid odnosi;
- lista top pet izgubljenih razloga sa brojem slučajeva;
- jedan dokazani ICP i jedna poruka koju tržište razume.

Ako postojeći nalozi zaista uključuju veliki broj aktivnih i neplaćenih ekrana, prioritet može biti konverzija te baze umesto novih 200–250 firmi.

---

## 22. Decision rules

Brojevi služe da se prepozna ograničenje sistema:

| Signal posle dovoljnog uzorka                    | Verovatan problem                             | Sledeća akcija                                              |
| ------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| Manje od 5 odgovora na 100 kvalitetnih kontakata | ICP, lista ili prva poruka                    | Uži segment, jača personalizacija, drugačiji problem        |
| Odgovori postoje, ali nema demoa                 | CTA ili kvalifikacija                         | Ponuditi Screen Preview ili kraći konkretan razgovor        |
| Demo postoji, ali nema pilota                    | Ponuda, poverenje ili pogrešan demo           | Prikaz kupčevog sadržaja i jasniji activation proces        |
| Pilot postoji, ali nema plaćanja                 | Vrednost, aktivacija ili success criteria     | Intervju, ukloniti onboarding trenje, precizirati problem   |
| Kupci plaćaju, ali podrška je velika             | Delivery model                                | Smanjiti standardni obim, dodatni rad posebno ponuditi ili prebaciti partneru |
| Kupci ostaju, ali ne dodaju ekrane               | Pogrešan segment ili nema expansion trigger-a | Fokus na firme sa više lokacija i planom širenja            |
| Isti feature blokira 3+ kvalifikovana posla      | Mogući product prioritet                      | Izmeriti prihod, složenost i alternativu pre razvoja        |
| Različiti kupci traže potpuno različite stvari   | ICP je preširok                               | Vratiti se na uži beachhead                                 |

Ne menjati ICP, cenu, landing, CTA i demo u isto vreme. Menjati jednu veću hipotezu po ciklusu da bi rezultat bio razumljiv.

---

## 23. Product prioriteti vođeni prodajom

### P0 — pre skaliranja

- Ispravne marketinške tvrdnje.
- Trial/subscription status i kontrolisan lifecycle.
- Funnel i activation tracking.
- Pouzdan demo nalog i demo ekran.
- Standardan onboarding i hardware compatibility proces.
- CRM zapis za svaki lead i izvor.

### Verovatni P1 za ugostiteljski ICP — potvrditi razgovorima

- Dayparting i zakazivanje menija/sadržaja.
- Jednostavno kopiranje/postavljanje sadržaja na više konkretnih lokacija.
- Saved screen groups ili location tags.
- Brže kreiranje doslednih varijanti menija za više ekrana.
- Jasniji activation/onboarding unutar aplikacije.

### Ne graditi bez ponovljenog dokaza

- širok POS marketplace;
- enterprise SSO i formalni approval workflow;
- napredni proof-of-play;
- proizvoljni multi-zone editor;
- white-label;
- veliki broj novih aplikacija samo da bi katalog bio veći.

Pravilo: najmanje tri kvalifikovana kupca sa istim problemom, procenjen prihod i potvrda da workaround nije dovoljan pre velike feature investicije.

---

## 24. Budžet

### Dani 1–30

- Oglasi: 0 €.
- CRM: postojeća tabela ili jednostavan besplatan alat.
- Demo hardver: jedan pouzdan standardni komplet.
- Content: sopstveni snimci i realan proizvod.
- Eventualni trošak: mikrofon/stalak/svetlo samo ako postojeći snimci nisu dovoljno jasni.

### Dani 31–60

- Budžet usmeriti na onboarding, put do kvalitetnog lokalnog pilota i case study asset.
- Ne plaćati generičnu agenciju za objave.
- Ne kupovati veliku bazu email adresa.

### Dani 61–90

- Maksimalno 300–500 € za prvi paid test samo ako su ispunjeni gate uslovi.
- Partner materijali i jedan demo kit mogu imati prioritet nad oglasima.

Najskuplji resurs su sati osnivača. Njih pratiti kao trošak, čak i kada nema odliva novca.

---

## 25. Šta ne raditi u prvih 90 dana

- Ne targetirati šest industrija paralelno.
- Ne graditi Instagram kao estetski katalog bez prodajnog CTA-a.
- Ne očekivati da company LinkedIn page organski stvori pipeline.
- Ne kupovati oglase pre dokazanog demo/pilot procesa.
- Ne nuditi neograničen besplatan dizajn i podršku.
- Ne snižavati cenu samo zato što konkurent ima više funkcija.
- Ne praviti funkcije na osnovu jednog glasnog prospekta.
- Ne koristiti lažne testimonials, lažne instalacije ili ilustrativne rezultate kao customer proof.
- Ne slati masovni generički outreach.
- Ne ostaviti prodaju kao posao „kad završi development“.
- Ne meriti uspeh followerima, impressions ili brojem registrovanih naloga bez aktivnog ekrana.

---

## 26. Prvih deset konkretnih akcija

|   # | Akcija                                                      | Vlasnik | Rok | Status |
| --: | ----------------------------------------------------------- | ------- | --- | ------ |
|   1 | Imenovati GTM owner-a za narednih osam nedelja              |         |     |        |
|   2 | Izvući stvarne podatke o aktivnim organizacijama i ekranima |         |     |        |
|   3 | Ispraviti sve claim konflikte na srpskom i engleskom sajtu  |         |     |        |
|   4 | Zaključati Menu Starter scope, hipotezu pretplate i granice |         |     |        |
|   5 | Napraviti Screen Preview formu i proces odgovora            |         |     |        |
|   6 | Snimiti jedan 60-sekundni realan demo                       |         |     |        |
|   7 | Pozvati deset postojećih korisnika na intervju              |         |     |        |
|   8 | Napraviti listu prvih 100 kvalifikovanih lokala             |         |     |        |
|   9 | Poslati prvih 25 personalizovanih poruka                    |         |     |        |
|  10 | Zakazati petkom prvi 30-minutni pipeline/KPI review         |         |     |        |

---

## 27. Nedeljni GTM sastanak — 30 minuta

### Scoreboard

- novi kvalifikovani nalozi;
- prvi kontakti;
- odgovori;
- demoi;
- piloti;
- prvi upareni ekrani;
- plaćeni kupci i ekrani;
- dodatni ekrani;
- referrals;
- founder sati.

### Pitanja

1. Gde je najveći pad u funnel-u?
2. Koje reči su kupci koristili ove nedelje?
3. Koji razlog za gubitak se ponovio?
4. Koji kupac je najbliži sledećem konkretnom koraku?
5. Šta treba ukloniti iz onboardinga?
6. Koji jedan eksperiment radimo sledeće nedelje?
7. Ko je vlasnik i koji je datum odluke?

Sastanak se završava jednim prioritetom, ne listom od deset paralelnih marketinških ideja.

---

## 28. Izvori i napomene

Interni izvori istine:

- `apps/web/CONTENT-CLAIMS.md`
- `apps/web/src/lib/pricing.ts`
- `apps/web/src/i18n/messages/sr/home.json`
- `apps/web/src/i18n/messages/sr/pricing.json`
- `packages/apps/src/menu/manifest.ts`
- `apps/be/src/modules/screens/`
- `apps/be/src/modules/player/`
- `apps/player/src/`

Spoljni kontekst pregledan prilikom izrade strategije:

- [SignageWall](https://www.signagewall.com/)
- [Yodeck pricing](https://www.yodeck.com/pricing/)
- [PosterBooking pricing](https://posterbooking.com/digital-signage-price)
- [Acquisition.com — $100M Offers](https://shop.acquisition.com/products/100m-offers-hardcover)
- [Acquisition.com — $100M Leads](https://shop.acquisition.com/products/single-hardback)
- Alex Hormozi, _$100M Money Models_
- Peter Thiel i Blake Masters, _Zero to One_

Konkurentske cene i funkcije su vremenski promenljive i treba ih proveriti pre javnog poređenja. Interni ciljevi, conversion pragovi i finansijski primeri u ovom dokumentu predstavljaju radne hipoteze i ilustracije, ne garantovane rezultate.
