> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](README.md).

# SignageWall Ops — Zero-to-One prodajni sprint

**Period prvog sprinta:** 17–23. avgust 2026.  
**Cilj:** jedan plaćen fabrički/logistički Ops pilot u prvoj nedelji, ne veliki ugovor i ne maksimalan broj ekrana.  
**Primarna ponuda:** Live Shift Board ili Dock & Dispatch Board.  
**Status proizvoda:** OpsBoard je implementiran, ali realni Google/Excel tenant, uređaj i prodajni pilot još nisu verifikovani; Secure Power BI nije spreman za prodajnu tvrdnju.

Povezani dokumenti:

- tehnička strategija i agent ticket-i: [`OPS_PRODUCT_IMPLEMENTATION_PLAN.md`](OPS_PRODUCT_IMPLEMENTATION_PLAN.md);
- gotovi demo podaci, skripte i metrike: [`demo/pilot/README.md`](demo/pilot/README.md);
- trenutno integrisano stanje i release blokade: [`implementation/WAVES_0_3_STATUS_2026-08-05.md`](implementation/WAVES_0_3_STATUS_2026-08-05.md).

---

## 1. Odluka: prvi sprint ne vodimo ponudom „digital signage meni”

Generički signage CMS je zasićena kategorija. Veliki konkurenti već imaju biblioteke sadržaja, playliste, rasporede, veliki broj uređaja i brojne integracije. Castit navodi Power BI, scheduling, više player platformi, team permissions i draft/publish workflow; njihova Future Forward prezentacija dodatno pozicionira Castit kao široku interaktivnu platformu koja se povezuje sa velikim brojem izvora. Yodeck već ima Microsoft prijavu za Power BI, a objavio je i service-principal/RLS opcije za enterprise. ScreenCloud direktno prodaje production dashboards, shift schedules, safety updates i secure dashboards. OptiSigns takođe otvoreno nudi Power BI i veliki broj integracija.

Izvori konkurentskih tvrdnji:

- [Future Forward — Castit](https://futureforward.nl/custom-made-software-solutions/interactive-digital-signage-castit/)
- [Castit dokumentacija](https://docs.castitsignage.com/)
- [Yodeck Power BI aplikacija](https://www.yodeck.com/apps/power-bi-app/)
- [Yodeck service principal/RLS update](https://www.yodeck.com/release-notes/yodeck-updates-april-2025/)
- [ScreenCloud production dashboards](https://screencloud.com/use-cases/production-dashboards)
- [ScreenCloud secure dashboards](https://screencloud.com/digital-signage/secure-dashboards)
- [OptiSigns dashboard ponuda](https://www.optisigns.com/product/workplace/display-dashboards)

Zaključak: Power BI, meniji, broj aplikacija, „radi na svim ekranima” i niska cena po ekranu nisu tržišni gap. Ne postoji razumna osnova da obećamo monopol samo na osnovu još jedne funkcije. To ne znači da odbacujemo pekare, kafiće i druge male firme; njima nudimo zaseban, standardizovan **Menu Starter** sa drugačijom ekonomikom i bez setup naknade. Taj eksperiment ne menja cilj ovog sprinta.

### Naš početni wedge

Prodajemo gotov operativni sistem za jednu fizičku zonu:

> Planer ili dispečer promeni red u Excel-u/Google Sheet-u; smena ili magacin dobija jasnu tablu na ekranu, a poslednje ispravno stanje ostaje dostupno kada veza privremeno nestane.

Razlika nije „imamo tabelu na TV-u”. Razlika je paket:

1. jedan unapred definisan workflow — shift ili dispatch;
2. mapiranje postojećeg Sheet/Excel izvora bez razvoja po kupcu;
3. povezan i unapred konfigurisan ekran/player u dogovorenom pilot okruženju;
4. lokalni onboarding na srpskom i osoba odgovorna za ishod;
5. sedmodnevni pilot sa baseline-om i merenjem `edit -> screen`;
6. last-known-good/offline ponašanje koje demonstriramo, ne samo navodimo;
7. komercijalna cena po operativnom site-u/workflow-u, ne trka ka najnižoj ceni po ekranu.

To je dovoljno uska pozicija da je kupac razume, ali nije još monopol. „Mikro-monopol” se gradi kasnije kroz lokalnu distribuciju, implementacione playbook-e, statusne rečnike po vertikali, pouzdanost, partnerstva sa instalaterima i podatke iz stvarnih deployment-a.

---

## 2. ICP za prvog kupca

### Primarni ICP

Firma u Srbiji ili geografski dostupnom regionu koja ima:

- proizvodnju, skladište, distribuciju, hladnjaču ili 3PL operaciju;
- približno 50–500 zaposlenih i najmanje jednu deskless smenu;
- dnevni plan/status koji već živi u Excel-u, Google Sheet-u ili na whiteboard-u;
- jednu zonu u kojoj se ista pitanja ponavljaju više puta dnevno;
- postojeći TV/monitor ili spremnost da postavi jedan;
- operations/plant/warehouse manager-a koji može da odobri pilot bez višemesečne nabavke.

### Prvi use case

Biramo samo jedan:

1. **Dock & Dispatch** kada dispečer ručno saopštava rampu, termin, status ili instrukciju;
2. **Live Shift Board** kada planer/rukovodilac smene prepisuje plan i realizaciju ili odgovara na ponovljena statusna pitanja.

Safety je dobar razgovor i drugi board, ali ga ne koristimo kao emergency/compliance proizvod. Frontline Teams/PowerPoint i Outlook su cross-sell. Secure Power BI ostaje design-partner razgovor dok Gate C ne prođe.

### Dve osobe po firmi

- **Ekonomski buyer:** direktor operacija/pogona/logistike ili vlasnik srednje firme.
- **Champion/source owner:** planer proizvodnje, rukovodilac smene, dispečer ili warehouse supervisor.

Bez oba pogleda često dobijamo lep demo bez budžeta ili budžet bez osobe koja će održavati podatke.

### Kvalifikacioni uslovi

Prospekt ulazi u demo samo ako su najmanje četiri odgovora „da”:

- informacija se menja svakog dana ili više puta dnevno;
- najmanje pet osoba treba da vidi istu promenu;
- danas postoji ručno prepisivanje, poziv, hodanje ili kašnjenje informacije;
- postoji imenovan vlasnik izvora;
- postoji ekran/zidna pozicija za pilot;
- buyer može da odobri 750 EUR za ograničen pilot;
- početak pilota je moguć u naredne dve nedelje.

### Diskvalifikacija iz Ops sprinta

Ne jurimo u prvoj nedelji:

- pekaru, kafić ili restoran koji traži samo standardni meni — preusmeriti u Menu Starter eksperiment, ne u Ops funnel;
- firmu koja želi custom ERP/MES write-back pre pilota;
- tender ili enterprise security proces bez internog champion-a;
- kupca kome je Power BI jedini obavezni sadržaj pre nego što Secure Power BI prođe Gate C;
- projekat sa 20+ lokacija pre dokaza na jednoj zoni.

---

## 3. Ponuda koju kupac može da razume

### Naziv

`Operativni ekran za jednu zonu — instaliran za 7 dana`

### Obim plaćenog pilota

- jedan workflow: Shift ili Dispatch;
- jedan postojeći Sheet/Excel izvor;
- jedan ekran/player;
- mapiranje do sedam standardnih kolona;
- instalacija ili remote setup;
- obuka jednog operatora;
- sedam dana praćenja;
- završni rezultat sa tehničkim i jednom poslovnom metrikom.

### Cena prvog pilota

**750 EUR jednokratno, hardver nije uključen.**

- 100% se uračunava u onboarding godišnjeg rollout-a ako ugovor bude potpisan u roku od sedam dana od završetka pilota.
- Povraćaj se odnosi samo na unapred dogovoreni tehnički kriterijum ako ga mi ne ispunimo; ne garantujemo poslovni rezultat koji zavisi od procesa kupca.
- Ne nuditi besplatan pilot. Ako kupac ne može da rizikuje 750 EUR za imenovan problem, verovatno problem nije dovoljno skup ili buyer nije pravi.

Ovo nije cenovnik za sajt. To je founding-design-partner ponuda za validaciju willingness-to-pay.

### Početna rollout hipoteza — nije javni cenovnik

Za ponudu posle uspešnog pilota testirati:

| Paket              | Obim                                               |                     Hipoteza cene |
| ------------------ | -------------------------------------------------- | --------------------------------: |
| Site Starter       | 1 workflow, do 5 ekrana, standardni support        | 249 EUR/site/mesečno + onboarding |
| Ops Pro            | do 3 workflow-a, do 15 ekrana, prioritetni support | 499 EUR/site/mesečno + onboarding |
| Managed Enterprise | više lokacija, security/procurement/SLA zahtevi    |      individualni godišnji ugovor |

Onboarding za Ops rollout počinje od 900 EUR **samo kada stvarno obuhvata consulting, mapiranje/integraciju izvora, obuku ili koordinaciju više zona/lokacija**. To nije naknada koja se automatski primenjuje na svaki kupčev ekran i ne odnosi se na standardizovani Menu Starter za male firme. Hardver i terenski rad, ako ih kupac posebno traži, navode se odvojeno. Cene ostaju hipoteze dok najmanje tri kvalifikovana Ops buyera ne reaguju na njih.

Zašto site/workflow cena: vrednost nastaje kada je operativni proces pouzdan, ne kada dodamo još jedan panel. Screen limit je zaštita obima, ali nije glavna prodajna jedinica.

### Odvojena SMB ponuda: Menu Starter bez setup naknade

Menu Starter je sekundarni, productized eksperiment za pekare, kafiće i druge male firme sa jednom lokacijom i jednim do tri ekrana. Ne ulazi u Ops ICP, ne dobija Ops cenu i ne ulazi u funnel cilj od 17. do 23. avgusta.

**Standardni obim bez setup naknade:**

- jedna lokacija i jedan standardni Menu Board workflow;
- jedan od postojećih šablona, sa podržanim bojama, fontom i logotipom;
- unos kroz standardni obrazac/CSV ili podržano povezivanje Google Sheets/Excel izvora;
- vodič za uparivanje i najviše jedan kratak remote activation poziv;
- kupac koristi svoj kompatibilan ekran/player kada je tako dogovoreno;
- redovno održavanje sadržaja radi kupac.

**Hipoteza pretplate, ne javni konačni cenovnik:** 29 EUR po lokaciji mesečno sa jednim ekranom, plus 8 EUR mesečno za svaki dodatni ekran do ukupno tri; alternativno 290 EUR godišnje za prvi ekran/lokaciju. Prvih 5–10 razgovora i aktivacija treba da potvrde willingness-to-pay, vreme podrške i bolju jedinicu naplate.

Bez dodatne ponude nisu uključeni: custom dizajn, nestrukturisana migracija menija, obrada fotografija, POS integracija, izrada posebnih funkcija, nabavka hardvera, dolazak na lokaciju, kabliranje ili montaža. Ako kupac traži hardver ili terenski rad, trošak je pass-through ili posebna partnerska ponuda; ne skrivati ga u pretplatu i ne koristiti ga kao glavni margin engine.

**Zaštita fokusa:** do završetka Ops sprinta SMB eksperiment dobija najviše dva unapred određena termina ili listu čekanja. Njegove metrike se vode odvojeno: aktivirana lokacija, vreme pomoći, conversion u pretplatu i support minuti. SMB lead se ne računa kao kvalifikovani Ops lead niti kao ostvarenje cilja prvog plaćenog fabričkog pilota.

---

## 4. Demo od 60 sekundi

Ne otvarati App Store. Otvoriti već pripremljen Sheet i ekran.

> „Ovo je tabla smene/otpreme koju održava ista osoba koja već održava vašu tabelu. Red sadrži plan, status i instrukciju. Kada operator promeni izvor, ekran dobija novi snapshot; sistem ne menja vaš dokument i poslednji dobar prikaz ostaje sačuvan kada player privremeno izgubi vezu. Pilot je jedan ekran sedam dana i merimo koliko treba od izmene do ekrana i koliko ručnih pitanja ili odlazaka ostaje.”

Zatim promeniti jedan unapred pripremljen red samo ako je realni tenant/webhook pre sastanka provereno brz. U suprotnom pokazati već sinhronizovan rezultat i uraditi izmenu kao zaseban mereni test, bez lažnog „instant” obećanja.

Detaljne skripte za pet buyer tokova su u [`demo/pilot/DEMO_SCRIPTS_60S.md`](demo/pilot/DEMO_SCRIPTS_60S.md).

### Discovery pitanja posle demoa

1. Ko danas menja ovu informaciju?
2. Gde je menja — Excel, Sheet, ERP, whiteboard, Teams?
3. Ko poslednji sazna i kako danas proverava status?
4. Koliko puta dnevno neko zove ili odlazi po tu informaciju?
5. Koja jedna zona bi bila najlakši pilot?
6. Ko odobrava 750 EUR i kada može da bude uključen?
7. Šta mora da se desi posle sedam dana da biste nastavili?

---

## 5. Priprema do nedelje, 16. avgusta

Ovo nisu prodajni dani; ovo su exit kriterijumi da ponedeljak ne potrošimo na internu pripremu.

- OpsBoard skripta radi na demo player-u u landscape i portrait režimu.
- Jedan stvarni Google Sheet i jedan stvarni Excel smoke test su evidentirani ili je jasno izabran samo provereni provider za prodaju.
- Offline/reconnect checklist je prošla na uređaju koji nosimo na demo.
- Tri demo instance i njihovi linkovi/ekrani su unapred otvoreni.
- PDF ponuda na jednoj strani je popunjena iz [`demo/pilot/OFFER_TEMPLATE_OPS.md`](demo/pilot/OFFER_TEMPLATE_OPS.md) i sadrži problem, obim, 750 EUR, tehnički kriterijum i sledeći korak.
- Napravljen je spisak od 60 firmi i najmanje dve relevantne osobe po firmi.
- CRM može biti običan sheet sa kolonama: account, use case, buyer, champion, trigger, last touch, next step, status, objection, proposal value.
- Napravljen je kalendar sa najmanje osam slobodnih demo termina od 17. do 20. avgusta.

Ako realni Google/Excel smoke test nije završen, prodajemo samo manual/CSV proof i eksplicitno kažemo da je connected pilot uslovljen integration testom. Ne pretvaramo mock test u prodajni dokaz.

---

## 6. Step-by-step: 17–23. avgust 2026.

### Ponedeljak, 17. avgust — problem interviews i zakazivanje

**08:00–09:00**

- Rangirati 60 firmi: 20 proizvodnja, 20 logistika/3PL/skladišta, 10 distributeri/hladnjače, 10 rezervnih.
- Tier A dobija 15 firmi sa vidljivim signalom: više smena, aktivno skladište/pogon, zapošljavanje planera/dispečera, ISO/HSE kontekst ili postojeći ekrani.
- Za svaku Tier A firmu zapisati jednu hipotezu problema i dve osobe.

**09:00–12:00**

- 20 telefonskih poziva.
- 15 personalizovanih email/LinkedIn poruka.
- Cilj poruke nije „da li želite signage”, već 15-minutni razgovor o jednom postojećem operativnom board-u.

**13:00–17:00**

- 3–4 kratka discovery poziva.
- Diskvalifikovati bez bola/source owner-a/budžeta.
- Zakazati demo za utorak/sredu sa buyer-om i operatorom zajedno.

**Minimalni rezultat dana:** 35 outbound pokušaja, 8 živih razgovora, 3 zakazana demoa.

### Utorak, 18. avgust — kvalifikacija i prvi demo

- Jutro: follow-up svim odgovorima unutar 30 minuta.
- Uraditi 2–3 demoa od najviše 25 minuta: 5 min proces, 1 min demo, 10 min discovery, 5 min pilot ponuda.
- Za zainteresovanog prospekta tražiti anonimizovani screenshot/header-e ili kopiju tabele bez osetljivih podataka.
- U roku od dva sata poslati jednolistnu ponudu sa tačnim datumom instalacije i linkom/instrukcijom za uplatu.
- Nastaviti 25 novih outbound pokušaja; ne čekati odgovor prvog prospekta.

**Minimalni rezultat dana:** 2 završena demoa, 1 konkretan pilot kandidat, 1 pisana ponuda.

### Sreda, 19. avgust — buyer-specific proof

- Od njihovih bezbednih header-a napraviti buyer-specific OpsBoard bez custom source koda.
- Snimiti 60–90 sekundi ekrana ili pokazati live na drugom pozivu.
- Kvantifikovati sadašnji ručni korak: broj poziva/odlazaka, minuti prepisivanja ili učestalost pogrešnog statusa.
- Potvrditi tehnički kriterijum, source owner-a, ekran, datum starta i osobu koja potpisuje rezultat.
- Poslati drugu ponudu ako postoje najmanje dva kvalifikovana prospekta.

**Minimalni rezultat dana:** 1 buyer-specific proof, 2 otvorene ponude, usmeni izbor pilot termina.

### Četvrtak, 20. avgust — zatvaranje, ne još funkcija

- Pozvati oba buyera; ne slati samo „checking in”.
- Pitati: „Šta tačno sprečava odluku danas — tehnički rizik, budžet ili prioritet?”
- Tehnički rizik rešiti ograničenim acceptance kriterijumom i refund uslovom, ne besplatnim razvojem.
- Budžet rešavati smanjenjem obima na jedan ekran/workflow, ne obaranjem cene po ekranu.
- Ako traže novu funkciju, zapisati je, ali pilot potpisati samo ako sadašnji proizvod rešava osnovni problem.
- Poslati finalni order form i fakturu/avansni zahtev istog dana.

**Minimalni rezultat dana:** 1 verbalno „da” sa datumom i komercijalnim sledećim korakom.

### Petak, 21. avgust — plaćen pilot ili jasan razlog neuspeha

- Cilj je potpis/odobrenje i uplata 750 EUR, ne samo „zainteresovani smo”.
- Zakazati kickoff, source-access termin i instalaciju.
- Popuniti baseline, buyer, champion, ekran, metric owner i acceptance kriterijum.
- Ako nema potpisa do 14:00, pozvati sve kvalifikovane razgovore i ponuditi dva konkretna termina, ne popust.
- Do 17:00 napraviti funnel review po brojevima, ne osećaju.

**Uspeh nedelje:** najmanje jedan plaćen pilot sa datumom početka.  
**Prihvatljiv signal bez prodaje:** dva buyera traže isti, imenovani blocker i nude sledeći sastanak sa donosiocem odluke. To nije ostvareni cilj, ali daje precizan sledeći eksperiment.

### Subota–nedelja, 22–23. avgust — priprema isporuke

- Zamrznuti obim potpisanog pilota.
- Napraviti konfiguraciju i mapping na demo/sanitizovanim podacima.
- Proći OAuth, player, offline i rollback checklist.
- Ako je za potpisani pilot dogovoren terenski rad, potvrditi ko obezbeđuje kompatibilan ekran/player, kablove i rezervni player; sve van softvera i dogovorenog Ops onboardinga mora biti eksplicitna posebna stavka.
- Ne implementirati dodatni zahtev koji nije uslov potpisanog acceptance-a.

---

## 7. Outbound poruke

### Telefonski opener

> „Zovem jer radimo sa operativnim timovima koji dnevni plan i status već vode u Excel-u, ali ga zatim prepisuju na tablu ili objašnjavaju telefonom. Napravili smo ekran koji čita taj isti workflow. Ne nudim opšti reklamni signage — tražim jednu smenu ili rampu za sedmodnevni mereni pilot. Ko kod vas poseduje taj proces?”

### Kratak email

**Subject:** Excel plan na ekranu smene — pilot za jednu zonu

> Pozdrav {{ime}},  
> pretpostavka mi je da se kod vas deo plana/statusa smene ili otpreme i dalje deli iz Excel-a, porukom ili usmeno. SignageWall Ops pretvara isti read-only Sheet/Excel u jasnu tablu na jednom ekranu; operator ne uči novi sistem.  
> Predlažemo sedmodnevni plaćen pilot za jednu zonu. Merimo stvarno vreme izmene do ekrana i jedan ručni korak koji želite da smanjite. Demo traje 15 minuta.  
> Da li je za ovo relevantniji {{buyer}} ili osoba koja vodi {{shift/dispatch}}?

### Follow-up posle demoa

> Dogovoreni problem: {{problem}}. Pilot obuhvata {{workflow}}, {{source}}, jedan ekran i sedam dana merenja. Tehnički prolaz znači {{acceptance}}; poslovno pratimo {{metric}} bez unapred obećanog procenta. Cena je 750 EUR i uračunava se u rollout ako nastavimo u roku od sedam dana. Predloženi kickoff: {{date}}.

---

## 8. Funnel tabla i dnevne odluke

### Nedeljni target

| Faza                         | Cilj |
| ---------------------------- | ---: |
| ciljne firme                 |   60 |
| relevantna kontakta          |  120 |
| outbound pokušaji            | 100+ |
| živi razgovori               |   20 |
| kvalifikovani discovery      |    8 |
| demo sa buyer-om/champion-om |    4 |
| buyer-specific proof         |    2 |
| pisane ponude                |    2 |
| plaćen pilot                 |    1 |

### Dijagnostika ako funnel ne radi

- **Mnogo pokušaja, malo razgovora:** lista ili kanal su loši; koristiti lične uvode, instalatere, industrijska udruženja i poziv umesto masovnog email-a.
- **Razgovori bez demoa:** opener govori o software-u umesto o ručnom procesu; suziti se na shift ili dispatch.
- **Demo bez ponude:** nismo kvalifikovali budget owner-a i datum.
- **Ponude bez odluke:** pilot je preširok, acceptance nejasan ili problem nije dovoljno skup.
- **Svi traže Power BI:** pronađen je mogući design-partner segment, ali ne obećavati Secure Power BI pre Gate C i realnog capacity testa.
- **Svi traže scheduling/sites/emergency override:** grupisati zahtev i aktivirati odgovarajući Wave 4 ticket tek kada postoji potpisan kupac/design-partner.

---

## 9. Šta implementirati paralelno, a šta ne

Do prvog kupca prioritet je:

1. realni Google Sheets i Excel smoke test;
2. demo player i offline/reconnect dokaz;
3. katalog/tenant enable samo za demo organizaciju;
4. uklanjanje svakog claim-a koji kod ne podržava;
5. bug koji blokira potpisani pilot.

Power BI private-asset/API/embed/connector rad može da ide paralelno jer testira važan enterprise blocker, ali ne sme da odloži outbound. Sites, groups, scheduling, emergency takeover, approval i proof-of-play čekaju stvarni zahtev prema Wave 4 planu.

### Zero-to-One pravilo

Svaka nova funkcija mora imati jednu od tri ulaznice:

- blokira već potpisani pilot;
- isti problem su nezavisno imenovala najmanje tri kvalifikovana prospekta;
- design partner daje podatke/test okruženje i komercijalni commitment.

U suprotnom ide u backlog. Prvi cilj nije savršen signage proizvod, već dokaz da jedna firma plaća za jedan jasno definisan operativni ishod.
