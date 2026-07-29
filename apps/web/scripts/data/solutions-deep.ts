// @ts-nocheck
/* Expansion content for the industry pages — the fields added in the Solutions
   schema: `intro`, extra `scenarios`, a worked `proof` example, and
   `recommendedApps`, plus a longer `faq`.

   Merged over `SOLUTIONS` by seed-solutions.ts, so the base file stays the
   single source for the short copy and this one carries the depth. Keyed by the
   English slug.

   First wave: the six industries with the most English search volume. The
   remaining fourteen keep their original short pages until written — a stub is
   better than a page padded to length. */

export const SOLUTIONS_DEEP = {
  hospitality: {
    recommendedApps: 'menu,text,qr,weather,clock,ticker',
    en: {
      intro: `A printed menu is a decision you make once and then live with. The price of an ingredient moves, a dish sells out, a supplier lets you down on a Friday — and the board on the wall keeps saying otherwise until somebody reprints it. Most kitchens solve this with a strip of tape over yesterday's price, which is the single fastest way to tell a guest that nothing here is quite under control.

A screen changes that economics. Not because it looks better — though it does — but because the cost of being right drops to nothing. The soup that ran out at one o'clock comes off the board at one o'clock. The evening list appears at six without anybody remembering to change it. And the item carrying the best margin sits in the place the eye lands first, which on a printed menu is a decision you make in January and cannot revisit.

The other half is what a guest does while waiting. A queue is dead time you already own. Somebody standing in it for ninety seconds will read whatever is in front of them, and what is in front of them is either a considered suggestion or a blank wall.`,
      scenarios: [
        { title: 'Dayparting that runs itself', body: 'Breakfast until eleven, lunch until four, the evening list after that. Set the schedule once and the board moves through the day on its own, including on the days you are not in.' },
        { title: 'The item you want to sell', body: 'Eye tracking on a menu board is not subtle: the top-left third does most of the work. Rotate what sits there by daypart, by stock, or by margin, and you are steering the order rather than reporting it.' },
        { title: 'Allergens and provenance', body: 'The information that has to be on the menu but never fits. On a screen it sits in the product card, next to the price, where it cannot get separated from the dish it belongs to.' },
      ],
      proof: {
        title: 'What reprinting actually costs',
        body: 'A café with three menu boards reprinting quarterly at $80 a board spends $960 a year, plus the day somebody spends laying it out — and the menu is still wrong for the two weeks between a price change and the next print run. Three screens on SignageWall cost $27 a month, and the price is right the same afternoon it changes.',
      },
      faq: [
        { q: 'Do I need a special menu display?', a: 'No. It runs on an ordinary TV you already own — all it needs is a small Android box or PC running the SignageWall player. Purpose-built displays are worth it if the screen faces a window or runs sixteen hours a day; for a wall behind the counter, a consumer television lasts years.' },
        { q: 'How long does a price change take?', a: 'Seconds. Edit it in the dashboard and it lands on every screen straight away, at one location or across all of them. There is no publish queue and nothing to approve unless you have set up approvals yourself.' },
        { q: 'What happens if the internet drops?', a: 'The player keeps showing the last content it downloaded. The screen never goes blank, and new edits arrive as soon as the connection is back. This matters more in hospitality than most places — a blank board above a counter at lunch is not a small problem.' },
        { q: 'Can I show a different menu in each room?', a: 'Yes. Screens group however you want — bar and restaurant, inside and terrace, or per location for a group. Each group gets its own content and its own schedule.' },
        { q: 'Can the screen be vertical?', a: 'Yes, and for a narrow menu column it usually reads better. Layouts work in portrait and landscape, and you can mix orientations across the same site.' },
        { q: 'How do I handle a dish selling out?', a: 'Mark it out on the menu app and it disappears, or greys out if you would rather guests still see it was on. Either takes a few seconds from a phone in the kitchen.' },
        { q: 'Can I put my prices in from a spreadsheet?', a: 'Yes. The menu app reads directly from a Google Sheet or an Excel file, so whoever already maintains the price list carries on maintaining it and the boards follow.' },
        { q: 'Will it look like my restaurant or like a template?', a: 'Your typeface, your colors, your photography, no watermark on any plan. The layouts are a starting point, not a house style you are stuck inside.' },
      ],
    },
    sr: {
      intro: `Štampani meni je odluka koju donesete jednom i onda sa njom živite. Cena namirnice se pomeri, jelo se rasproda, dobavljač vas iznevari u petak — a tabla na zidu i dalje tvrdi suprotno dok je neko ne preštampa. Većina kuhinja to reši trakom preko jučerašnje cene, što je najbrži način da gostu kažete da ovde ništa nije baš pod kontrolom.

Ekran menja tu računicu. Ne zato što lepše izgleda — mada izgleda — nego zato što cena toga da budete u pravu pada na nulu. Supa koja se rasprodala u jedan silazi sa table u jedan. Večernja karta se pojavi u šest a da niko ne mora da se seti. A jelo sa najboljom maržom stoji na mestu gde oko prvo padne — što je na štampanom meniju odluka koju donesete u januaru i ne možete da je preispitate.

Druga polovina je ono što gost radi dok čeka. Red je mrtvo vreme koje već posedujete. Onaj ko u njemu stoji devedeset sekundi pročitaće ono što mu je pred očima, a to je ili promišljena preporuka ili prazan zid.`,
      scenarios: [
        { title: 'Dnevni raspored koji se vrti sam', body: 'Doručak do jedanaest, ručak do četiri, večernja karta posle. Podesite raspored jednom i tabla prolazi kroz dan sama, uključujući i dane kad vas nema.' },
        { title: 'Jelo koje želite da prodate', body: 'Kretanje pogleda po meni tabli nije suptilno: gornja leva trećina radi najveći deo posla. Rotirajte šta tu stoji po dobu dana, po zalihama ili po marži, i vi upravljate porudžbinom umesto da je beležite.' },
        { title: 'Alergeni i poreklo', body: 'Informacija koja mora da bude na meniju a nikad ne staje. Na ekranu stoji u kartici proizvoda, pored cene, gde ne može da se odvoji od jela na koje se odnosi.' },
      ],
      proof: {
        title: 'Koliko preštampavanje stvarno košta',
        body: 'Kafić sa tri meni table koje preštampava kvartalno po 80 € troši 960 € godišnje, plus dan koji neko provede na prelomu — a meni je i dalje pogrešan one dve nedelje između izmene cene i sledećeg štampanja. Tri ekrana na SignageWall-u koštaju 24 € mesečno, a cena je tačna istog popodneva kad se promeni.',
      },
      faq: [
        { q: 'Da li mi treba poseban ekran za meni?', a: 'Ne. Radi na običnom televizoru koji već imate — potreban je samo mali Android boks ili računar sa SignageWall plejerom. Namenski displeji se isplate ako ekran gleda u izlog ili radi šesnaest sati dnevno; za zid iza pulta, običan televizor traje godinama.' },
        { q: 'Koliko traje izmena cene?', a: 'Nekoliko sekundi. Izmenite je u kontrolnoj tabli i stigne na sve ekrane odmah, na jednoj ili na svim lokacijama. Nema reda čekanja za objavu i nema odobravanja osim ako ga sami ne uvedete.' },
        { q: 'Šta ako padne internet?', a: 'Plejer nastavlja da prikazuje poslednji preuzeti sadržaj. Ekran nikad ne ostaje prazan, a nove izmene stižu čim se veza vrati. U ugostiteljstvu je to važnije nego drugde — prazna tabla iznad pulta u vreme ručka nije mali problem.' },
        { q: 'Mogu li različit meni u svakoj prostoriji?', a: 'Da. Ekrani se grupišu kako želite — šank i restoran, unutra i bašta, ili po lokaciji za grupu objekata. Svaka grupa dobija svoj sadržaj i svoj raspored.' },
        { q: 'Može li ekran da bude vertikalan?', a: 'Da, i za uzak stubac menija obično se bolje čita. Rasporedi rade i vertikalno i horizontalno, a možete mešati orijentacije na istom mestu.' },
        { q: 'Kako da rešim kad se jelo rasproda?', a: 'Označite ga kao rasprodato u meni aplikaciji i nestane, ili posivi ako vam je draže da gosti vide da ga je bilo. Oboje traje nekoliko sekundi sa telefona u kuhinji.' },
        { q: 'Mogu li da unesem cene iz tabele?', a: 'Da. Meni aplikacija čita direktno iz Google tabele ili Excel datoteke, pa onaj ko već održava cenovnik nastavlja da ga održava, a table prate.' },
        { q: 'Da li će izgledati kao moj restoran ili kao šablon?', a: 'Vaš font, vaše boje, vaše fotografije, bez vodenog žiga na bilo kom planu. Rasporedi su polazna tačka, a ne kućni stil iz kog ne možete da izađete.' },
      ],
    },
  },

  retail: {
    recommendedApps: 'text,qr,ticker,instagram,countdown,weather',
    en: {
      intro: `The most expensive mistake in retail signage is one piece of content pushed to every screen in the shop. A customer at the window has not decided to come in. A customer in the aisle has. A customer at the till has already bought and is deciding whether to buy one more thing. Those are three different people, and a single campaign speaking to all of them speaks to none.

The second mistake is treating a campaign as a print job. Head office designs it, a courier delivers it, and somebody in each store is trusted to put it up on the right Monday. In practice half the network is a week late and nobody knows which half — because the only way to check is to drive there. A screen network tells you what every store is showing right now, which turns a campaign from a hope into a fact.

What makes this pay is not the screen. It is that the marginal cost of a campaign drops to zero. Once the content exists, running it in forty stores costs the same as running it in one, and the decision to change it stops being a budget conversation.`,
      scenarios: [
        { title: 'Three zones, three jobs', body: 'The window stops a passer-by, the aisle answers a question, the till suggests one more item. Group screens by role rather than by store, and each one gets content written for the decision being made in front of it.' },
        { title: 'Campaigns that start on time', body: 'Schedule the change for six on Monday and every screen turns at six on Monday, in every store, without a phone call. The dashboard shows which screens have it and which have gone quiet.' },
        { title: 'Local without losing control', body: 'Head office owns the brand campaign; a store manager edits only their own opening hours and local offers. Roles decide who can publish what, so autonomy does not mean losing the campaign.' },
      ],
      proof: {
        title: 'What a print campaign costs to change',
        body: 'A twelve-store chain running monthly window posters at $40 a store in print and courier spends about $5,800 a year, and a mid-month change means eating the cost or living with the old poster. Twelve screens cost $108 a month — and a change mid-campaign costs nothing but the decision.',
      },
      faq: [
        { q: 'Can I show different content per location?', a: 'Yes. Group screens by location, city, store format or position in the shop, and send each group its own content — or one message to all of them at once. A group is a saved target, so you set it up once and publish to it forever after.' },
        { q: 'Who can change the content?', a: 'You assign it. Head office can own brand campaigns while a local manager edits only what you allow, and publishing can require approval before anything reaches a screen if that is how your marketing team works.' },
        { q: 'How many screens can I connect?', a: 'One or a whole network. The same system runs a single shop and hundreds of locations; what changes above roughly ten screens is that you start publishing to groups rather than to devices, which the dashboard is built around.' },
        { q: 'Is a window screen bright enough?', a: 'A consumer television is not, in direct sun. Window installations need a high-brightness display — the software is identical, but the hardware is where the money goes. We do not sell hardware, so we have no reason to push you either way.' },
        { q: 'Can I schedule around opening hours?', a: 'Yes, and you should — a screen that powers down overnight lasts longer and costs less to run. Schedules handle both the content and the on/off, per store.' },
        { q: 'Can it pull stock or price data?', a: 'If your system can produce a spreadsheet or a web page, the screen can read it directly and refresh on its own. That covers most price lists without touching your POS.' },
        { q: 'How do I know a screen has gone dark?', a: 'The dashboard shows the last time each player checked in and what it is playing. A screen that stops reporting is visible to you before it is visible to a customer.' },
        { q: 'What about the store that has no IT support?', a: 'Nothing is installed locally beyond the player, and pairing is scanning a code on the screen. If a device needs replacing, the new one is paired the same way and picks up the store\u2019s content automatically.' },
      ],
    },
    sr: {
      intro: `Najskuplja greška u maloprodajnom signage-u je jedan sadržaj poslat na sve ekrane u radnji. Kupac u izlogu nije odlučio da uđe. Kupac u rafu jeste. Kupac na kasi je već kupio i odlučuje da li da uzme još nešto. To su tri različite osobe, a jedna kampanja koja se obraća svima ne obraća se nikome.

Druga greška je tretiranje kampanje kao štamparskog posla. Centrala je osmisli, kurir je dostavi, i neko u svakoj radnji treba da je okači u pravi ponedeljak. U praksi je pola mreže nedelju dana u zakašnjenju i niko ne zna koja polovina — jer jedini način da se proveri je da se ode kolima. Mreža ekrana vam kaže šta svaka radnja upravo prikazuje, čime kampanja od nade postaje činjenica.

Ono što ovo isplati nije ekran. To je što granični trošak kampanje pada na nulu. Kad sadržaj jednom postoji, puštanje u četrdeset radnji košta isto kao u jednoj, a odluka da se nešto promeni prestaje da bude razgovor o budžetu.`,
      scenarios: [
        { title: 'Tri zone, tri posla', body: 'Izlog zaustavlja prolaznika, raf odgovara na pitanje, kasa predlaže još jedan artikal. Grupišite ekrane po ulozi umesto po radnji, i svaki dobija sadržaj pisan za odluku koja se donosi ispred njega.' },
        { title: 'Kampanje koje kreću na vreme', body: 'Zakažite izmenu za šest u ponedeljak i svaki ekran se okrene u šest u ponedeljak, u svakoj radnji, bez ijednog poziva. Kontrolna tabla pokazuje koji ekrani je imaju, a koji su utihnuli.' },
        { title: 'Lokalno bez gubitka kontrole', body: 'Centrala drži brend kampanju; menadžer radnje menja samo svoje radno vreme i lokalne ponude. Uloge odlučuju ko šta može da objavi, pa samostalnost ne znači gubitak kampanje.' },
      ],
      proof: {
        title: 'Koliko košta izmena štampane kampanje',
        body: 'Lanac od dvanaest radnji sa mesečnim plakatima u izlogu po 35 € za štampu i dostavu troši oko 5.000 € godišnje, a izmena usred meseca znači ili progutati trošak ili živeti sa starim plakatom. Dvanaest ekrana košta 96 € mesečno — a izmena usred kampanje ne košta ništa osim odluke.',
      },
      faq: [
        { q: 'Mogu li različit sadržaj po lokaciji?', a: 'Da. Grupišite ekrane po lokaciji, gradu, formatu radnje ili poziciji u prodavnici, i pošaljite svakoj grupi svoj sadržaj — ili jednu poruku svima odjednom. Grupa je sačuvana meta, pa je podesite jednom i posle uvek objavljujete na nju.' },
        { q: 'Ko može da menja sadržaj?', a: 'Vi dodeljujete. Centrala može da drži brend kampanje dok lokalni menadžer menja samo ono što dozvolite, a objavljivanje može da traži odobrenje pre nego što bilo šta stigne na ekran, ako vaš marketing tako radi.' },
        { q: 'Koliko ekrana mogu da povežem?', a: 'Jedan ili celu mrežu. Isti sistem vodi jednu radnju i stotine lokacija; iznad otprilike deset ekrana menja se to što počinjete da objavljujete grupama umesto uređajima — a kontrolna tabla je oko toga i građena.' },
        { q: 'Da li je ekran u izlogu dovoljno svetao?', a: 'Običan televizor nije, na direktnom suncu. Izlog traži displej visoke svetline — softver je isti, ali novac ide u hardver. Ne prodajemo hardver, pa nemamo razlog da vas guramo ni na jednu stranu.' },
        { q: 'Mogu li da zakažem po radnom vremenu?', a: 'Da, i trebalo bi — ekran koji se gasi preko noći duže traje i manje troši. Raspored pokriva i sadržaj i paljenje/gašenje, po radnji.' },
        { q: 'Može li da povuče zalihe ili cene?', a: 'Ako vaš sistem ume da izbaci tabelu ili veb stranicu, ekran to čita direktno i sam osvežava. To pokriva većinu cenovnika bez diranja kase.' },
        { q: 'Kako da znam da je ekran ugašen?', a: 'Kontrolna tabla pokazuje kad se svaki plejer poslednji put javio i šta pušta. Ekran koji prestane da se javlja vidljiv je vama pre nego kupcu.' },
        { q: 'Šta sa radnjom koja nema IT podršku?', a: 'Lokalno se ne instalira ništa osim plejera, a uparivanje je skeniranje koda sa ekrana. Ako uređaj treba zameniti, novi se upari isto tako i sam pokupi sadržaj te radnje.' },
      ],
    },
  },

  healthcare: {
    recommendedApps: 'text,alert,clock,weather,wisdom,qr',
    en: {
      intro: `Most of the tension in a waiting room comes from not knowing. Not from the wait itself — people will sit for forty minutes without complaint if they can see where they are in the queue. What they will not tolerate is forty minutes with no information, because in the absence of a number the mind assumes it has been forgotten.

A screen solves the cheapest version of this problem: show the queue, show an estimate, and the reception desk stops answering the same question every four minutes. That alone usually pays for the installation. What it also does, once it is there, is take over the repeatable half of what a clinician explains all day — seasonal advice, how to prepare for a procedure, what the practice does and does not treat — and leave the counter free for the parts that genuinely need a person.

The constraint that shapes everything here is sound. A waiting-room screen runs silent, always, which means the content has to be legible rather than narrated. That is a design decision, not a limitation, and it rules out most of what stock signage templates are built for.`,
      scenarios: [
        { title: 'The queue, visibly', body: 'A number or an appointment code and an estimated wait. No personal data has to reach the screen for this to work, which keeps it outside the scope of most of what worries a practice manager.' },
        { title: 'The advice you give twenty times a day', body: 'Preparation instructions, seasonal warnings, what to bring. The repeatable half of a consultation, on the wall, so the counter handles the half that is not repeatable.' },
        { title: 'An urgent notice, instantly', body: 'A full-screen message that takes over every display at once and clears just as fast — a closure, an evacuation, a change of room. Set up before you need it, not during.' },
      ],
      proof: {
        title: 'What the reception desk gets back',
        body: 'A practice where reception fields "how much longer?" thirty times a day at roughly forty seconds each loses about twenty minutes of staff time daily — some eighty hours a year. A queue screen removes most of that. The software for two screens costs $18 a month.',
      },
      faq: [
        { q: 'Does it display patient data?', a: 'It does not have to. Most practices show only a number or an appointment code, so no personal data reaches the screen at all. What you show is entirely your decision, and the safest design is usually the simplest one.' },
        { q: 'Can the screen run without sound?', a: 'Yes, and in a waiting room it should. Content is built to be understood completely silent — which is why legibility and pacing matter more here than in any other setting.' },
        { q: 'Can we post an urgent notice quickly?', a: 'Yes. An emergency message takes over every screen at once and clears just as fast. It is worth setting the message up before you need it, so that in the moment it is one click rather than a writing exercise.' },
        { q: 'Can it connect to our practice management system?', a: 'If the system can output a spreadsheet or a web page, the screen reads it directly. A deeper integration is not something we offer out of the box, and we would rather say that than imply otherwise.' },
        { q: 'How many screens does a practice need?', a: 'One in the waiting room covers most of the value. A second at reception, showing something different, is the usual next step — and a third only when there is a second waiting area.' },
        { q: 'Is this suitable for a pharmacy counter?', a: 'Yes, though the content differs: a pharmacy screen usually works harder as advice and seasonal promotion than as a queue. Pharmacies have their own page under solutions.' },
        { q: 'Does the screen need to be large?', a: 'No. A smaller screen in the line of sight beats a larger one on a wall people do not face. Position matters more than size in a room where everybody is seated.' },
        { q: 'What happens during a power cut?', a: 'The player restarts on its own and resumes the content it was showing, without anybody logging in. That matters in a setting where nobody has time to troubleshoot a screen.' },
      ],
    },
    sr: {
      intro: `Najveći deo napetosti u čekaonici dolazi od toga što se ne zna. Ne od samog čekanja — ljudi će sedeti četrdeset minuta bez prigovora ako vide gde su u redu. Ono što ne podnose je četrdeset minuta bez ijedne informacije, jer u odsustvu broja um pretpostavi da je zaboravljen.

Ekran rešava najjeftiniju verziju tog problema: prikažite red, prikažite procenu, i recepcija prestaje da odgovara na isto pitanje svaka četiri minuta. To samo po sebi obično isplati postavljanje. Ono što uz to radi, kad već stoji, jeste da preuzme ponovljivu polovinu onoga što lekar objašnjava po ceo dan — sezonske savete, pripremu za pregled, šta ordinacija radi a šta ne — i ostavi pult za ono što stvarno traži čoveka.

Ograničenje koje ovde sve oblikuje je zvuk. Ekran u čekaonici radi bez tona, uvek, što znači da sadržaj mora da bude čitljiv a ne ispričan. To je dizajnerska odluka, ne mana, i isključuje većinu onoga za šta su gotovi signage šabloni pravljeni.`,
      scenarios: [
        { title: 'Red, vidljivo', body: 'Broj ili šifra termina i procena čekanja. Nijedan lični podatak ne mora da stigne do ekrana da bi ovo radilo, što celu stvar drži van dometa većine onoga što brine upravnika ordinacije.' },
        { title: 'Savet koji dajete dvadeset puta dnevno', body: 'Uputstva za pripremu, sezonska upozorenja, šta poneti. Ponovljiva polovina pregleda, na zidu, da bi pult radio onu koja nije ponovljiva.' },
        { title: 'Hitno obaveštenje, odmah', body: 'Poruka preko celog ekrana koja preuzme sve displeje odjednom i isto tako brzo nestane — zatvaranje, evakuacija, promena ordinacije. Podesite je pre nego što vam zatreba, ne u trenutku.' },
      ],
      proof: {
        title: 'Šta recepcija dobija nazad',
        body: 'Ordinacija u kojoj recepcija trideset puta dnevno odgovori na „koliko još?" po četrdesetak sekundi gubi oko dvadeset minuta osoblja dnevno — nekih osamdeset sati godišnje. Ekran sa redom uklanja najveći deo toga. Softver za dva ekrana košta 16 € mesečno.',
      },
      faq: [
        { q: 'Da li prikazuje podatke o pacijentima?', a: 'Ne mora. Većina ordinacija prikazuje samo broj ili šifru termina, pa nijedan lični podatak ne stiže do ekrana. Šta prikazujete je isključivo vaša odluka, a najbezbedniji dizajn je obično i najjednostavniji.' },
        { q: 'Može li ekran da radi bez zvuka?', a: 'Da, i u čekaonici bi trebalo. Sadržaj je pravljen da se razume potpuno nemo — zbog čega su čitljivost i ritam ovde važniji nego bilo gde drugde.' },
        { q: 'Možemo li brzo da objavimo hitno obaveštenje?', a: 'Da. Hitna poruka preuzme sve ekrane odjednom i isto tako brzo nestane. Vredi je pripremiti pre nego što zatreba, da bi u trenutku bila jedan klik a ne pisanje.' },
        { q: 'Može li da se poveže sa našim sistemom za zakazivanje?', a: 'Ako sistem ume da izbaci tabelu ili veb stranicu, ekran to čita direktno. Dublju integraciju ne nudimo gotovu, i radije to kažemo nego da nagoveštavamo suprotno.' },
        { q: 'Koliko ekrana treba ordinaciji?', a: 'Jedan u čekaonici pokriva najveći deo vrednosti. Drugi na recepciji, sa drugačijim sadržajem, je uobičajen sledeći korak — a treći tek kad postoji druga čekaonica.' },
        { q: 'Odgovara li ovo apotekarskom pultu?', a: 'Da, mada se sadržaj razlikuje: ekran u apoteci obično više radi kao savet i sezonska ponuda nego kao red. Apoteke imaju svoju stranicu među rešenjima.' },
        { q: 'Mora li ekran da bude veliki?', a: 'Ne. Manji ekran u liniji pogleda pobeđuje veći na zidu prema kom niko nije okrenut. U prostoriji gde svi sede, pozicija je važnija od veličine.' },
        { q: 'Šta se dešava pri nestanku struje?', a: 'Plejer se sam restartuje i nastavlja sadržaj koji je prikazivao, bez ijedne prijave. To je bitno tamo gde niko nema vremena da rešava problem sa ekranom.' },
      ],
    },
  },

  office: {
    recommendedApps: 'text,gcal,outlook,teams,weather,clock',
    en: {
      intro: `Fewer than half of staff open the all-company email. That is not a failure of writing — it is what happens when a message competes with forty others in a queue somebody is already behind on. The corridor by the kitchen has no queue. Everyone walks past it, every day, and reads whatever is there without deciding to.

That makes a screen the right medium for exactly one class of message: the kind that has to reach everybody and does not need a reply. Safety numbers, this week's priorities, who joined on Monday, the production figure the floor is chasing. Not the kind that needs a thread — a screen is broadcast, and pretending otherwise is how internal comms screens end up ignored.

The other job is quieter. A room-booking display outside a meeting room settles an argument before it starts, and a lobby screen means reception is not repeating directions all morning.`,
      scenarios: [
        { title: 'The number the team is chasing', body: 'One figure, updated automatically from the sheet or dashboard that already holds it. A target on a wall changes behaviour in a way the same target in a monthly report does not.' },
        { title: 'Room booking at the door', body: 'A small display outside each room, reading Google Calendar or Microsoft 365. It is read-only — the booking stays in your system, and the screen just stops the argument about whether the room is free.' },
        { title: 'New starters and small wins', body: 'The things that never justify an email but build a place to work. Who joined, what shipped, which team hit their number.' },
      ],
      proof: {
        title: 'What an unread email costs',
        body: 'A company of 80 sending two all-staff emails a week at a 45% open rate leaves roughly 90 people-notifications unread every week. A screen in the two rooms everybody passes reaches all of them, for $18 a month.',
      },
      faq: [
        { q: 'Can it show our existing dashboards?', a: 'Yes. Power BI, Google Sheets and any web page render directly and refresh on their own, so the number on the wall is the number in the system rather than a screenshot somebody pasted last month.' },
        { q: 'Can it read our calendar?', a: 'Yes — Google Calendar and Microsoft 365. SignageWall only reads the schedule and never writes to it, which is usually what IT wants to hear first.' },
        { q: 'Do we need IT to set it up?', a: 'No. Pair a device by scanning the code on screen; everything after that happens in a browser. Nothing is installed on your network and no ports need opening.' },
        { q: 'Who decides what goes on the screens?', a: 'You do, through roles. Internal comms can own the company-wide content while a team lead posts only to their own floor, with approval before publishing if you want it.' },
        { q: 'Is this suitable for a factory floor?', a: 'Yes, and shift numbers are one of the strongest uses there is — manufacturing has its own page under solutions, because the content and the hardware both differ.' },
        { q: 'Can we show confidential figures?', a: 'You can, but think about who walks past. A screen is broadcast to everyone in the room including visitors, so the safest rule is that anything on it is public inside the building.' },
      ],
    },
    sr: {
      intro: `Manje od pola zaposlenih otvori mejl svima. To nije neuspeh pisanja — to je ono što se dešava kad se poruka takmiči sa još četrdeset u redu koji je neko ionako u zaostatku. Hodnik pored kuhinje nema red. Svi prođu pored njega, svakog dana, i pročitaju ono što je tu bez odluke da to urade.

Zbog toga je ekran pravi medij za tačno jednu vrstu poruke: onu koja mora da stigne do svih i ne traži odgovor. Brojevi o bezbednosti, prioriteti ove nedelje, ko je počeo u ponedeljak, cifra koju proizvodnja juri. Ne i onu koja traži prepisku — ekran je emitovanje, a pretvaranje da nije je način na koji ekrani za internu komunikaciju završe ignorisani.

Drugi posao je tiši. Ekran za rezervaciju sale ispred vrata rešava raspravu pre nego što počne, a ekran u holu znači da recepcija ne ponavlja uputstva celo prepodne.`,
      scenarios: [
        { title: 'Broj koji tim juri', body: 'Jedna cifra, automatski osvežena iz tabele ili dashboard-a koji je već drži. Cilj na zidu menja ponašanje na način na koji isti cilj u mesečnom izveštaju ne menja.' },
        { title: 'Rezervacija sale na vratima', body: 'Mali ekran ispred svake sale, čita Google Calendar ili Microsoft 365. Samo za čitanje — rezervacija ostaje u vašem sistemu, a ekran samo prekida raspravu o tome da li je sala slobodna.' },
        { title: 'Novi ljudi i mali uspesi', body: 'Stvari koje nikad ne opravdavaju mejl ali grade mesto na kom se radi. Ko je počeo, šta je isporučeno, koji tim je pogodio svoj broj.' },
      ],
      proof: {
        title: 'Koliko košta nepročitan mejl',
        body: 'Firma od 80 ljudi koja šalje dva mejla svima nedeljno uz 45% otvaranja ostavlja oko 90 nepročitanih obaveštenja svake nedelje. Ekran u dve prostorije kroz koje svi prolaze stiže do svih, za 16 € mesečno.',
      },
      faq: [
        { q: 'Može li da prikaže naše postojeće dashboard-e?', a: 'Da. Power BI, Google Sheets i bilo koja veb stranica prikazuju se direktno i sami se osvežavaju, pa je broj na zidu broj iz sistema, a ne screenshot koji je neko nalepio prošlog meseca.' },
        { q: 'Može li da čita naš kalendar?', a: 'Da — Google Calendar i Microsoft 365. SignageWall samo čita raspored i nikad ne piše u njega, što je obično prvo što IT želi da čuje.' },
        { q: 'Treba li nam IT za postavljanje?', a: 'Ne. Uparite uređaj skeniranjem koda sa ekrana; sve posle toga se dešava u pregledaču. Ništa se ne instalira na vašoj mreži i nijedan port ne mora da se otvara.' },
        { q: 'Ko odlučuje šta ide na ekrane?', a: 'Vi, preko uloga. Interna komunikacija može da drži sadržaj za celu firmu dok vođa tima objavljuje samo na svom spratu, uz odobrenje pre objave ako to želite.' },
        { q: 'Odgovara li ovo proizvodnom pogonu?', a: 'Da, i brojevi po smeni su jedna od najjačih primena uopšte — proizvodnja ima svoju stranicu među rešenjima, jer se razlikuju i sadržaj i hardver.' },
        { q: 'Možemo li da prikazujemo poverljive cifre?', a: 'Možete, ali razmislite ko prolazi pored. Ekran emituje svima u prostoriji uključujući posetioce, pa je najbezbednije pravilo da je sve na njemu javno unutar zgrade.' },
      ],
    },
  },

  hotels: {
    recommendedApps: 'text,weather,clock,gcal,qr,menu',
    en: {
      intro: `The same questions arrive at a hotel desk every morning: when does breakfast finish, what is the weather, how do I get to the old town, is the spa open. None of them need a receptionist. All of them get one, because the alternative has always been a laminated card that nobody updates and a folder in the room that nobody opens.

A screen in the lobby answers the repeatable half before anyone reaches the desk, which leaves the desk for check-in, complaints and the things that actually need judgement. The measure of whether it is working is not engagement — it is how many fewer times a day somebody asks.

Language is the other half. A hotel serves guests who do not share one, and a screen can cycle through three of them in the time it takes to walk across the lobby. A printed card cannot.`,
      scenarios: [
        { title: 'The day, at a glance', body: 'Breakfast hours, the weather, today’s conference rooms, the shuttle time. The four things asked most often, in the place people stand while waiting to check in.' },
        { title: 'Rotating languages', body: 'The same content in two or three languages, cycling automatically — or a different language on each screen if the floors serve different groups.' },
        { title: 'Selling the spa without the pitch', body: 'Your own offers alternating with useful information, so the promotion arrives while somebody is already reading rather than as an interruption.' },
      ],
      proof: {
        title: 'What the front desk gets back',
        body: 'A 60-room hotel fielding the same four questions 40 times a day at half a minute each spends about 20 minutes of desk time daily, or 120 hours a year. Two lobby screens cost $18 a month.',
      },
      faq: [
        { q: 'Can content run in several languages?', a: 'Yes. A screen can cycle through languages on a timer, or different screens around the hotel can each hold a different one — useful when a floor or a wing serves a particular group.' },
        { q: 'Can it show flight arrivals?', a: 'Yes, if the data is available as a feed or a web page, refreshed automatically. It is most useful in the lobby and by the transfer desk.' },
        { q: 'Can we promote the spa or the restaurant?', a: 'Yes, and it works better mixed into useful content than run as a block of adverts. A guest reading the weather will read the next panel; a guest who recognises a commercial will look away.' },
        { q: 'What about screens in the rooms?', a: 'Possible, but usually a different product — in-room television is its own system with its own contracts. Lobby, corridor, lift and conference signage is where this fits cleanly.' },
        { q: 'Do the screens need to run overnight?', a: 'Only where there is footfall. Schedules handle power on and off per screen, so the lobby can run 24 hours while the conference floor sleeps.' },
        { q: 'Can each conference room show its own programme?', a: 'Yes, from a calendar or a spreadsheet. A small screen at each door and one summary board in the lobby is the usual setup for a hotel doing events.' },
      ],
    },
    sr: {
      intro: `Ista pitanja stižu na hotelsku recepciju svakog jutra: do kada je doručak, kakvo je vreme, kako do starog grada, da li spa radi. Nijedno ne traži recepcionera. Sva ga dobijaju, jer je alternativa oduvek bila plastificirana kartica koju niko ne ažurira i fascikla u sobi koju niko ne otvara.

Ekran u holu odgovara na ponovljivu polovinu pre nego što iko stigne do pulta, čime pult ostaje za prijavu, žalbe i ono što stvarno traži procenu. Merilo da li radi nije angažovanost — nego koliko puta dnevno manje neko pita.

Jezik je druga polovina. Hotel ugošćuje goste koji ga ne dele, a ekran može da prođe kroz tri jezika za vreme koje treba da se pređe hol. Štampana kartica ne može.`,
      scenarios: [
        { title: 'Dan, na jedan pogled', body: 'Vreme doručka, prognoza, današnje sale, polazak transfera. Četiri stvari koje se najčešće pitaju, na mestu gde ljudi stoje čekajući prijavu.' },
        { title: 'Smena jezika', body: 'Isti sadržaj na dva ili tri jezika, sa automatskom smenom — ili različit jezik na svakom ekranu, ako spratovi opslužuju različite grupe.' },
        { title: 'Prodaja spa centra bez prodaje', body: 'Vaše ponude naizmenično sa korisnim informacijama, tako da promocija stigne dok neko već čita, a ne kao prekid.' },
      ],
      proof: {
        title: 'Šta recepcija dobija nazad',
        body: 'Hotel sa 60 soba koji odgovara na ista četiri pitanja 40 puta dnevno po pola minuta troši oko 20 minuta recepcije dnevno, ili 120 sati godišnje. Dva ekrana u holu koštaju 16 € mesečno.',
      },
      faq: [
        { q: 'Može li sadržaj na više jezika?', a: 'Da. Ekran može da smenjuje jezike po tajmeru, ili različiti ekrani po hotelu mogu da drže različit — korisno kad sprat ili krilo opslužuje određenu grupu.' },
        { q: 'Može li da prikaže dolaske letova?', a: 'Da, ako su podaci dostupni kao feed ili veb stranica, uz automatsko osvežavanje. Najkorisnije je u holu i kod pulta za transfere.' },
        { q: 'Možemo li da promovišemo spa ili restoran?', a: 'Da, i bolje radi umešano u koristan sadržaj nego kao blok reklama. Gost koji čita prognozu pročitaće i sledeći panel; gost koji prepozna reklamu skreće pogled.' },
        { q: 'Šta sa ekranima u sobama?', a: 'Moguće je, ali je to obično drugi proizvod — televizija u sobi je sopstveni sistem sa svojim ugovorima. Hol, hodnik, lift i konferencijski deo su mesto gde ovo čisto naleže.' },
        { q: 'Moraju li ekrani da rade preko noći?', a: 'Samo tamo gde ima prolaza. Raspored upravlja paljenjem i gašenjem po ekranu, pa hol može da radi 24 sata dok konferencijski sprat spava.' },
        { q: 'Može li svaka sala da prikaže svoj program?', a: 'Da, iz kalendara ili tabele. Mali ekran na svakim vratima i jedna zbirna tabla u holu je uobičajena postavka za hotel koji radi događaje.' },
      ],
    },
  },

  education: {
    recommendedApps: 'text,alert,gcal,clock,weather,countdown',
    en: {
      intro: `A cover lesson announced in the staff room never reaches the students. A timetable change pinned to a corkboard reaches whoever happens to look at the corkboard. The hall everybody walks through twice a day reaches everybody, which is why a screen there does more work than any noticeboard in the building.

What makes school signage different from every other kind is who maintains it. There is rarely a communications team; there is a school secretary with an already full week. So the content has to come from where it already lives — the timetable spreadsheet, the calendar, the letter that went out anyway — rather than being authored twice.

The other thing worth planning for is the message you hope never to send. A lockdown or an evacuation notice has to take over every screen in seconds, which means it needs to exist before the day you need it.`,
      scenarios: [
        { title: 'Today, in the hall', body: 'Cover lessons, room changes, what is on after school. The information that currently reaches whoever reads the noticeboard, reaching everybody instead.' },
        { title: 'The timetable that maintains itself', body: 'Read straight from the spreadsheet or calendar the office already keeps. Nobody retypes anything, which is the only way school signage survives past the first term.' },
        { title: 'Emergency takeover', body: 'A full-screen notice on every display at once, set up in advance so that in the moment it is one click. Worth doing on the calm day.' },
      ],
      proof: {
        title: 'What it replaces',
        body: 'A school printing a weekly notice sheet for 30 classrooms at 5 cents a page spends about $60 a year in paper alone, and the sheet is wrong the moment a lesson moves. Three hall screens cost $27 a month — and the value is not the paper, it is that the information is right.',
      },
      faq: [
        { q: 'Who can publish content?', a: 'You decide. The office can own official notices while a teacher or the student council edits only their own section, with approval before anything goes live if that is the policy.' },
        { q: 'Can it show the timetable from our system?', a: 'Yes, if the system can produce a spreadsheet or a web page — it loads directly and refreshes on its own. That covers most school management systems without an integration project.' },
        { q: 'How many screens does a school need?', a: 'Most start with one in the main hall, then add the corridor and the staff room once the habit takes. There is no reason to buy for the whole building on day one.' },
        { q: 'Can we run an emergency message?', a: 'Yes, and you should set it up before you need it. A full-screen notice takes over every display at once and clears just as fast.' },
        { q: 'Will students just ignore it?', a: 'They will ignore a screen that says the same thing all term. They will read one that changes — which is why the timetable feed matters more than the design.' },
        { q: 'What about screens in classrooms?', a: 'Possible, but a classroom already has a projector or a board and a teacher directing attention. Signage earns its place in shared space, where nobody is directing anything.' },
      ],
    },
    sr: {
      intro: `Zamena časa objavljena u zbornici nikad ne stigne do đaka. Izmena rasporeda zakačena na oglasnu tablu stigne do onoga ko slučajno pogleda oglasnu tablu. Hol kroz koji svi prođu dvaput dnevno stiže do svih — zbog čega ekran tamo radi više posla nego bilo koja tabla u zgradi.

Ono što školski signage razlikuje od svakog drugog je ko ga održava. Retko postoji tim za komunikaciju; postoji sekretar škole sa već punom nedeljom. Zato sadržaj mora da dolazi odande gde već živi — iz tabele sa rasporedom, iz kalendara, iz dopisa koji je ionako poslat — a ne da se piše dvaput.

Druga stvar koju vredi isplanirati je poruka koju se nadate da nikad nećete poslati. Obaveštenje o evakuaciji mora da preuzme sve ekrane za nekoliko sekundi, što znači da mora da postoji pre dana kad zatreba.`,
      scenarios: [
        { title: 'Danas, u holu', body: 'Zamene, izmene učionica, šta ima posle nastave. Informacija koja sad stiže do onoga ko čita oglasnu tablu, stiže umesto toga do svih.' },
        { title: 'Raspored koji se sam održava', body: 'Čita se direktno iz tabele ili kalendara koje kancelarija već vodi. Niko ništa ne prekucava — a to je jedini način da školski signage preživi prvo polugodište.' },
        { title: 'Preuzimanje u hitnom slučaju', body: 'Obaveštenje preko celog ekrana na svim displejima odjednom, pripremljeno unapred da bi u trenutku bilo jedan klik. Vredi uraditi mirnog dana.' },
      ],
      proof: {
        title: 'Šta zamenjuje',
        body: 'Škola koja štampa nedeljni list obaveštenja za 30 učionica po 5 dinara po strani troši oko 6.000 dinara godišnje samo na papir, a list je pogrešan čim se čas pomeri. Tri ekrana u holu koštaju 24 € mesečno — a vrednost nije papir, nego to što je informacija tačna.',
      },
      faq: [
        { q: 'Ko može da objavljuje sadržaj?', a: 'Vi odlučujete. Kancelarija može da drži zvanična obaveštenja dok nastavnik ili đački parlament menja samo svoj deo, uz odobrenje pre objave ako je takva politika.' },
        { q: 'Može li da prikaže raspored iz našeg sistema?', a: 'Da, ako sistem ume da izbaci tabelu ili veb stranicu — učitava se direktno i sam osvežava. To pokriva većinu školskih sistema bez projekta integracije.' },
        { q: 'Koliko ekrana treba školi?', a: 'Većina počne sa jednim u holu, pa dodaju hodnik i zbornicu kad se navika uhvati. Nema razloga da se prvog dana kupuje za celu zgradu.' },
        { q: 'Možemo li da pustimo hitnu poruku?', a: 'Da, i trebalo bi da je pripremite pre nego što zatreba. Obaveštenje preko celog ekrana preuzme sve displeje odjednom i isto tako brzo nestane.' },
        { q: 'Hoće li đaci prosto da ga ignorišu?', a: 'Ignorisaće ekran koji celo polugodište govori isto. Čitaće onaj koji se menja — zbog čega je veza sa rasporedom važnija od dizajna.' },
        { q: 'Šta sa ekranima u učionicama?', a: 'Moguće je, ali učionica već ima projektor ili tablu i nastavnika koji usmerava pažnju. Signage zarađuje svoje mesto u zajedničkom prostoru, gde niko ništa ne usmerava.' },
      ],
    },
  },

  gyms: {
    recommendedApps: 'gsheets,text,clock,countdown,instagram,weather',
    en: {
      intro: `A printed class timetable is out of date the moment one class moves, and the person who moved it is not the person who prints it. So the sheet on the wall says spin at seven while the app says yoga, and the member who trusted the wall is annoyed with the club rather than with the sheet.

The fix is not a nicer sheet. It is that the timetable on the wall and the timetable in the system are the same object — read from the spreadsheet the manager already maintains, so a change made once shows up everywhere within seconds. That removes the entire category of complaint.

Beyond the timetable, a gym screen does something a poster cannot: it fills the dead minutes. Somebody waiting for a machine will read whatever is in front of them, which is the cheapest promotional slot in the building and the one most clubs leave blank.`,
      scenarios: [
        { title: 'The timetable, from the source', body: 'Read live from Google Sheets or Excel. Edit where you already edit and every screen in every club follows — no second system to keep in step.' },
        { title: 'A cancelled class, immediately', body: 'A change at the source reaches every screen within seconds, which is the difference between a member who is informed and a member who drove over for nothing.' },
        { title: 'The dead minutes by the machines', body: 'Personal training offers, a challenge board, class spaces left. The audience is already standing still and already looking somewhere.' },
      ],
      proof: {
        title: 'What a wrong timetable costs',
        body: 'A club with 900 members where ten a week turn up for a moved class loses roughly 500 wasted visits a year, each one a small reason to cancel. Four screens fed from the existing spreadsheet cost $36 a month.',
      },
      faq: [
        { q: 'Can we pull the schedule from a spreadsheet?', a: 'Yes. Google Sheets or Excel load directly and refresh on their own, so you edit the timetable where you already edit it and the screens follow.' },
        { q: 'What does cancelling a class look like?', a: 'You change it at the source. Every screen in the club — and in every other club, if you run several — has the new version within seconds.' },
        { q: 'Does it work across several clubs?', a: 'Yes. Each location can run its own timetable while a shared announcement goes to all of them at once, and you can see which screens have which.' },
        { q: 'Can we show class spaces remaining?', a: 'If your booking system can output that as a spreadsheet or a web page, yes. If it cannot, the timetable alone still removes most of the complaints.' },
        { q: 'Where should the screens go?', a: 'Reception and the studio door earn their place first. The gym floor is worth it once you have something to say there that changes — a static motivational quote stops being read in a week.' },
        { q: 'Can members see it on their phones too?', a: 'That is your app’s job, not ours. What the screen fixes is the gap between the app and the wall, which is where the annoyance lives.' },
      ],
    },
    sr: {
      intro: `Štampan raspored treninga je zastareo onog trenutka kad se jedan termin pomeri, a osoba koja ga je pomerila nije osoba koja ga štampa. Pa list na zidu kaže spinning u sedam dok aplikacija kaže jogu, i član koji je verovao zidu ljut je na klub, a ne na list.

Rešenje nije lepši list. Rešenje je da raspored na zidu i raspored u sistemu budu isti objekat — čitan iz tabele koju menadžer ionako održava, pa se izmena napravljena jednom pojavi svuda za nekoliko sekundi. To uklanja celu kategoriju prigovora.

Van rasporeda, ekran u teretani radi nešto što plakat ne može: popunjava mrtve minute. Onaj ko čeka spravu pročitaće ono što mu je pred očima — a to je najjeftiniji promotivni prostor u objektu i onaj koji većina klubova ostavi prazan.`,
      scenarios: [
        { title: 'Raspored, sa izvora', body: 'Čita se uživo iz Google Sheets-a ili Excel-a. Menjate tamo gde već menjate i svaki ekran u svakom klubu prati — nema drugog sistema koji treba držati u koraku.' },
        { title: 'Otkazan trening, odmah', body: 'Izmena na izvoru stiže na sve ekrane za nekoliko sekundi — što je razlika između člana koji je obavešten i člana koji je došao uzalud.' },
        { title: 'Mrtvi minuti kraj sprava', body: 'Ponude za personalni trening, tabla izazova, slobodna mesta na treningu. Publika već stoji i već negde gleda.' },
      ],
      proof: {
        title: 'Koliko košta pogrešan raspored',
        body: 'Klub sa 900 članova gde desetoro nedeljno dođe na pomeren trening gubi oko 500 uzaludnih dolazaka godišnje, a svaki je mali razlog za otkazivanje. Četiri ekrana napajana iz postojeće tabele koštaju 32 € mesečno.',
      },
      faq: [
        { q: 'Možemo li da povučemo raspored iz tabele?', a: 'Da. Google Sheets ili Excel se učitavaju direktno i sami osvežavaju, pa raspored menjate tamo gde ga već menjate, a ekrani prate.' },
        { q: 'Kako izgleda otkazivanje treninga?', a: 'Promenite na izvoru. Svaki ekran u klubu — i u svakom drugom klubu, ako ih vodite više — ima novu verziju za nekoliko sekundi.' },
        { q: 'Radi li kroz više klubova?', a: 'Da. Svaka lokacija može da vodi svoj raspored dok zajedničko obaveštenje ide na sve odjednom, a vi vidite koji ekran ima šta.' },
        { q: 'Možemo li da prikažemo slobodna mesta?', a: 'Ako vaš sistem rezervacija ume to da izbaci kao tabelu ili veb stranicu, može. Ako ne ume, sam raspored i dalje uklanja najveći deo prigovora.' },
        { q: 'Gde ekrani treba da stoje?', a: 'Recepcija i vrata sale prvi zarađuju svoje mesto. Sala se isplati kad tamo imate nešto što se menja — statična motivaciona poruka prestane da se čita za nedelju dana.' },
        { q: 'Mogu li članovi to da vide i na telefonu?', a: 'To je posao vaše aplikacije, ne naš. Ono što ekran rešava je jaz između aplikacije i zida — a tu jaz i živi.' },
      ],
    },
  },

  manufacturing: {
    recommendedApps: 'powerbi,gsheets,alert,text,clock,web',
    en: {
      intro: `A report sitting in a system changes nothing. The same number on a screen above the line changes behaviour every hour, because it is visible to the people whose work produces it at the moment they are producing it. That is the entire argument for signage on a factory floor, and it is a stronger one than in any other setting.

The constraints are unusual. Viewing distance is long, so type has to be sized for it. Lighting is either poor or industrial. Nobody is going to log in to fix a frozen display, and a screen showing yesterday's shift is worse than a blank wall because it teaches the floor to stop looking.

That last point is why the reliability side matters more here than the design side. A player that caches locally, restarts itself after a power cut and reports when it goes quiet is not a nice-to-have on a floor with no IT presence.`,
      scenarios: [
        { title: 'Shift numbers where the shift is', body: 'Output against target, downtime, quality rate — read straight from the MES or the spreadsheet that already holds them, sized to be read from across the floor.' },
        { title: 'Days since the last incident', body: 'The oldest sign on any factory wall, and still one of the most effective. It works because it updates itself and everybody can see it.' },
        { title: 'An alert that takes over', body: 'A line stop, an evacuation, a safety notice — full screen, every display, instantly, and cleared just as fast.' },
      ],
      proof: {
        title: 'What a visible target changes',
        body: 'The reason to put the number on the wall is not reporting — the report already exists. It is that a line running to a target it can see corrects within the hour rather than at the end of the shift. Six floor screens cost $54 a month.',
      },
      faq: [
        { q: 'Can it show data from our MES or ERP?', a: 'Yes, if the system can output a web page or a spreadsheet — it renders directly and refreshes on its own. That covers most shop-floor dashboards without a bespoke integration.' },
        { q: 'Is it readable from a distance?', a: 'It has to be, and that is a layout decision as much as a hardware one. One inch of cap height for every 25 feet of viewing distance is the working rule; on a floor that usually means very few numbers, very large.' },
        { q: 'Does it work in a dusty or humid environment?', a: 'You choose a display rated for the floor; the software is identical whatever the hardware. This is where a purpose-built panel genuinely earns its price over a consumer television.' },
        { q: 'What happens when a player loses network?', a: 'It keeps showing the last data it received and reconnects on its own. Worth knowing: a cached number is a stale number, so anything time-critical should show its own timestamp.' },
        { q: 'Can different lines show different figures?', a: 'Yes. Screens group by line, cell or building, and each group gets its own content on its own schedule.' },
        { q: 'Who maintains it once it is up?', a: 'Whoever maintains the spreadsheet or dashboard behind it — which is the point. Nobody should be authoring content for a factory screen twice a day.' },
      ],
    },
    sr: {
      intro: `Izveštaj u sistemu ne menja ništa. Isti broj na ekranu iznad linije menja ponašanje svakog sata, jer je vidljiv ljudima čiji ga rad proizvodi u trenutku dok ga proizvode. To je ceo argument za signage u pogonu, i jači je nego bilo gde drugde.

Ograničenja su neobična. Udaljenost gledanja je velika, pa tipografija mora da bude dimenzionisana za nju. Osvetljenje je ili loše ili industrijsko. Niko neće da se prijavljuje da popravi zamrznut ekran, a ekran koji prikazuje jučerašnju smenu gori je od praznog zida, jer uči pogon da prestane da gleda.

Ta poslednja tačka je razlog zašto je ovde pouzdanost važnija od dizajna. Plejer koji kešira lokalno, sam se restartuje posle nestanka struje i javi kad utihne nije luksuz u pogonu bez IT prisustva.`,
      scenarios: [
        { title: 'Brojevi smene tamo gde je smena', body: 'Učinak naspram cilja, zastoji, kvalitet — čitano direktno iz MES-a ili tabele koja ih već drži, dimenzionisano da se čita preko cele hale.' },
        { title: 'Dana od poslednje povrede', body: 'Najstariji znak na svakom fabričkom zidu, i dalje jedan od najefikasnijih. Radi zato što se sam ažurira i što ga svi vide.' },
        { title: 'Uzbuna koja preuzme ekran', body: 'Zastoj linije, evakuacija, bezbednosno obaveštenje — preko celog ekrana, na svim displejima, odmah, i isto tako brzo skinuto.' },
      ],
      proof: {
        title: 'Šta menja vidljiv cilj',
        body: 'Razlog da broj ide na zid nije izveštavanje — izveštaj već postoji. Razlog je što se linija koja vidi cilj koriguje u toku sata, a ne na kraju smene. Šest ekrana u pogonu košta 48 € mesečno.',
      },
      faq: [
        { q: 'Može li da prikaže podatke iz našeg MES-a ili ERP-a?', a: 'Da, ako sistem ume da izbaci veb stranicu ili tabelu — prikazuje se direktno i sam osvežava. To pokriva većinu pogonskih dashboard-a bez namenske integracije.' },
        { q: 'Da li je čitljivo sa daljine?', a: 'Mora da bude, i to je koliko odluka o rasporedu toliko i o hardveru. Jedan inč visine slova na svakih 25 stopa udaljenosti je radno pravilo; u pogonu to obično znači vrlo malo brojeva, vrlo krupno.' },
        { q: 'Radi li u prašnjavoj ili vlažnoj sredini?', a: 'Birate displej sertifikovan za pogon; softver je isti kakav god hardver bio. Ovde namenski panel stvarno zarađuje svoju cenu naspram običnog televizora.' },
        { q: 'Šta kad plejer izgubi mrežu?', a: 'Nastavlja da prikazuje poslednje primljene podatke i sam se ponovo poveže. Vredi znati: keširan broj je star broj, pa sve vremenski osetljivo treba da prikazuje i svoj vremenski pečat.' },
        { q: 'Mogu li različite linije da prikazuju različite cifre?', a: 'Da. Ekrani se grupišu po liniji, ćeliji ili hali, i svaka grupa dobija svoj sadržaj po svom rasporedu.' },
        { q: 'Ko ga održava kad jednom stoji?', a: 'Onaj ko održava tabelu ili dashboard iza njega — u tome i jeste poenta. Niko ne bi trebalo da piše sadržaj za fabrički ekran dvaput dnevno.' },
      ],
    },
  },

  supermarkets: {
    recommendedApps: 'text,ticker,qr,countdown,menu,clock',
    en: {
      intro: `When a campaign starts at six on Monday, the screens have to turn at six on Monday — in every store, without a phone call to any of them. That sounds obvious until you have run a print campaign across forty locations and discovered on Wednesday that six of them never put the posters up.

Supermarket signage is mostly a logistics problem wearing a marketing costume. The content is not complicated; getting it identical, on time and verifiable across a network is. A screen network answers the question a print campaign never could: what is actually on the wall right now, in store 23.

The second thing it buys is the aisle. A shelf-edge or aisle screen reaches somebody at the moment of choosing, which is the only moment that matters and the one a leaflet at the door misses completely.`,
      scenarios: [
        { title: 'One campaign, one minute, every store', body: 'Schedule the switch and every screen turns together. The dashboard shows which stores have it, so a missed store is something you see rather than something you discover.' },
        { title: 'Prices that follow the source', body: 'If your system can output a spreadsheet or a feed, the shelf price on screen moves when the price in the system moves — no second place to update and no chance of the two disagreeing.' },
        { title: 'Aisle over entrance', body: 'A screen at the point of choosing beats one at the door. The customer at the shelf has a decision in front of them; the customer at the entrance has a trolley and a list.' },
      ],
      proof: {
        title: 'What a late campaign costs',
        body: 'A 25-store chain where a print campaign lands two days late in a fifth of stores loses ten store-days of a promotion every cycle. At twelve cycles a year that is 120 store-days. Screens turn at the same second everywhere, for $9 per screen.',
      },
      faq: [
        { q: 'How many screens can it handle?', a: 'From one store to a whole chain. Screens group by store, region and position, so you manage groups rather than devices — which is what makes forty stores no harder than four.' },
        { q: 'Can we pull prices from our system?', a: 'If they are available as a spreadsheet or a web source, yes, and the shelf price then moves with the source. A direct ERP integration is not something we ship out of the box.' },
        { q: 'What if one device fails?', a: 'You see it as offline in the dashboard, and the player restarts itself and picks up where it left off. The failure you should worry about is the silent one, which is exactly the one reporting removes.' },
        { q: 'Can a store manager add local content?', a: 'Yes, within whatever limits you set. Head office can own the campaign slots while a store edits only its own opening hours and local notices.' },
        { q: 'Are screens allowed at the checkout?', a: 'That is a decision about queue experience, not a technical one. A checkout screen works well for anything that shortens the perceived wait and badly for anything that feels like being sold to while trapped.' },
        { q: 'What about electronic shelf labels?', a: 'Different product, different problem. ESLs price thousands of individual items; signage screens carry campaigns, categories and messages. Most chains end up with both.' },
      ],
    },
    sr: {
      intro: `Kad kampanja kreće u šest u ponedeljak, ekrani moraju da se okrenu u šest u ponedeljak — u svakoj radnji, bez ijednog poziva. To zvuči očigledno dok ne pustite štampanu kampanju na četrdeset lokacija i u sredu otkrijete da je šest njih nikad nije okačilo.

Signage u supermarketima je uglavnom logistički problem u marketinškom kostimu. Sadržaj nije komplikovan; komplikovano je dobiti ga identičnog, na vreme i proverljivog kroz celu mrežu. Mreža ekrana odgovara na pitanje na koje štampana kampanja nikad nije mogla: šta je stvarno na zidu upravo sada, u radnji 23.

Druga stvar koju kupujete je raf. Ekran na rafu ili u prolazu stiže do nekoga u trenutku biranja — a to je jedini trenutak koji je bitan i onaj koji letak na vratima potpuno promaši.`,
      scenarios: [
        { title: 'Jedna kampanja, jedan minut, sve radnje', body: 'Zakažite prebacivanje i svaki ekran se okrene zajedno. Kontrolna tabla pokazuje koje radnje je imaju, pa je propuštena radnja nešto što vidite, a ne nešto što otkrijete.' },
        { title: 'Cene koje prate izvor', body: 'Ako vaš sistem ume da izbaci tabelu ili feed, cena na rafu se pomeri kad se pomeri cena u sistemu — nema drugog mesta za ažuriranje ni šanse da se ta dva raziđu.' },
        { title: 'Raf pre ulaza', body: 'Ekran na mestu biranja pobeđuje onaj na vratima. Kupac kod rafa ima odluku pred sobom; kupac na ulazu ima korpu i spisak.' },
      ],
      proof: {
        title: 'Koliko košta zakasnela kampanja',
        body: 'Lanac od 25 radnji gde štampana kampanja kasni dva dana u petini radnji gubi deset radnja-dana promocije po ciklusu. Uz dvanaest ciklusa godišnje to je 120 radnja-dana. Ekrani se okreću u istoj sekundi svuda, za 8 € po ekranu.',
      },
      faq: [
        { q: 'Koliko ekrana može da izdrži?', a: 'Od jedne radnje do celog lanca. Ekrani se grupišu po radnji, regionu i poziciji, pa upravljate grupama umesto uređajima — a to je ono što čini četrdeset radnji ne težim od četiri.' },
        { q: 'Možemo li da povučemo cene iz sistema?', a: 'Ako su dostupne kao tabela ili veb izvor, da, i cena na rafu se onda pomera sa izvorom. Direktnu ERP integraciju ne isporučujemo gotovu.' },
        { q: 'Šta ako jedan uređaj otkaže?', a: 'Vidite ga kao offline u kontrolnoj tabli, a plejer se sam restartuje i nastavlja odakle je stao. Kvar o kom treba da brinete je tihi — a njega upravo javljanje uklanja.' },
        { q: 'Može li menadžer radnje da doda lokalni sadržaj?', a: 'Da, u granicama koje postavite. Centrala može da drži kampanjske termine dok radnja menja samo svoje radno vreme i lokalna obaveštenja.' },
        { q: 'Da li ekrani smeju na kasu?', a: 'To je odluka o iskustvu u redu, ne tehnička. Ekran na kasi dobro radi za sve što skraćuje doživljeno čekanje, a loše za sve što deluje kao prodaja dok ste zarobljeni.' },
        { q: 'Šta sa elektronskim etiketama na rafovima?', a: 'Drugi proizvod, drugi problem. ESL etikete cene hiljade pojedinačnih artikala; signage ekrani nose kampanje, kategorije i poruke. Većina lanaca završi sa oba.' },
      ],
    },
  },

  banking: {
    recommendedApps: 'currency,text,qr,clock,ticker,web',
    en: {
      intro: `A client in a branch queue is already looking around. That is three or four minutes of attention you have paid for with the lease and are currently spending on a wall.

What makes banking signage different is that the content is genuinely useful rather than promotional. Rates, terms, what the app can do that saves a visit. A customer who learns they did not need to come in is not a lost visit — they are a customer who comes in less and stays longer.`,
      scenarios: [
        { title: 'Rates that are never wrong', body: 'Read from your own internal sheet or a public feed, refreshed automatically. A printed rate card is a compliance problem the moment it is stale.' },
        { title: 'Teaching the app in the queue', body: 'The transactions that do not need a branch, shown to the person standing in one. This reduces queue length, which is the point.' },
      ],
      proof: { title: 'What the queue is worth', body: 'A branch serving 120 clients a day with a four-minute average wait holds roughly 480 minutes of undivided attention daily. Two screens cost $18 a month.' },
      faq: [
        { q: 'Where do the rates come from?', a: 'From a source you choose — your own internal sheet or a public feed — refreshed automatically, so the number on the wall and the number in the system cannot diverge.' },
        { q: 'Can content differ per branch?', a: 'Yes. A shared campaign goes to everyone while local information appears only where it is relevant, and roles decide who can publish which.' },
        { q: 'How is publishing controlled?', a: 'Through roles and permissions. Publishing can require approval before anything reaches a screen, which is usually a requirement rather than a preference in this sector.' },
        { q: 'Is this suitable for a regulated environment?', a: 'For the content side, yes. For procurement, note that we do not currently offer SSO or compliance certifications — if those are hard requirements, say so early.' },
        { q: 'Can we show queue numbers?', a: 'Yes, if your queue system can output a feed or a web page. Many branches run the queue display and the marketing screen as two separate things, which is also fine.' },
      ],
    },
    sr: {
      intro: `Klijent u redu u ekspozituri već gleda okolo. To su tri-četiri minuta pažnje koje ste platili zakupom i trenutno trošite na zid.

Ono što bankarski signage razlikuje je to što je sadržaj stvarno koristan, a ne promotivan. Kursevi, uslovi, šta aplikacija ume da uštedi dolazak. Klijent koji sazna da nije morao da dođe nije izgubljena poseta — to je klijent koji dolazi ređe a ostaje duže.`,
      scenarios: [
        { title: 'Kursevi koji nikad nisu pogrešni', body: 'Čitani iz vaše interne tabele ili javnog izvora, uz automatsko osvežavanje. Štampana kursna lista je problem usklađenosti čim zastari.' },
        { title: 'Učenje aplikacije u redu', body: 'Transakcije za koje ne treba ekspozitura, prikazane onome ko u njoj stoji. Time se skraćuje red, što i jeste poenta.' },
      ],
      proof: { title: 'Koliko red vredi', body: 'Ekspozitura koja usluži 120 klijenata dnevno uz prosečno čekanje od četiri minuta drži oko 480 minuta nepodeljene pažnje dnevno. Dva ekrana koštaju 16 € mesečno.' },
      faq: [
        { q: 'Odakle dolaze kursevi?', a: 'Iz izvora koji vi odredite — vaše interne tabele ili javnog izvora — uz automatsko osvežavanje, pa broj na zidu i broj u sistemu ne mogu da se raziđu.' },
        { q: 'Može li sadržaj da se razlikuje po ekspozituri?', a: 'Da. Zajednička kampanja ide svima dok se lokalna informacija pojavljuje samo tamo gde je relevantna, a uloge odlučuju ko šta može da objavi.' },
        { q: 'Kako se kontroliše objavljivanje?', a: 'Kroz uloge i prava. Objavljivanje može da traži odobrenje pre nego što bilo šta stigne na ekran — što je u ovom sektoru obično zahtev, a ne preferencija.' },
        { q: 'Odgovara li ovo regulisanom okruženju?', a: 'Za sadržajnu stranu, da. Za nabavku, imajte u vidu da trenutno ne nudimo SSO ni sertifikate usklađenosti — ako su to tvrdi zahtevi, recite to rano.' },
        { q: 'Možemo li da prikažemo brojeve u redu?', a: 'Da, ako vaš sistem za redove ume da izbaci feed ili veb stranicu. Mnoge ekspoziture vode ekran za red i marketinški ekran kao dve odvojene stvari, što je takođe u redu.' },
      ],
    },
  },
  pharmacy: {
    recommendedApps: 'text,wisdom,qr,weather,clock,countdown',
    en: {
      intro: `A pharmacist cannot give the same twenty-second answer to every person who walks in and still have time for the ones who need five minutes. The repeatable advice — what to take with what, when the flu vaccine arrives, what to do about ticks in May — is the half a screen can carry.

The counter then handles the half that needs a person. That is the whole trade, and it is a better one than it sounds, because the advice on the screen also reaches the people who would never have asked.`,
      scenarios: [
        { title: 'Seasonal advice, scheduled months ahead', body: 'Ticks in spring, sun in summer, flu in autumn. Build it once in January and it switches itself on at the right week.' },
        { title: 'The duty rota, always current', body: 'Which pharmacy is open tonight, updated from the source rather than retyped onto a card in the window.' },
      ],
      proof: { title: 'What the counter gets back', body: 'A pharmacy answering the same seasonal question 25 times a day at 20 seconds each spends over 8 minutes daily on it — around 50 hours a year. One screen costs $9 a month.' },
      faq: [
        { q: 'Can we prepare content in advance?', a: 'Yes. Seasonal topics can be scheduled months ahead and switch themselves on at the date you set, which is the only way this survives a busy season.' },
        { q: 'Does the screen need to be large?', a: 'No. A smaller screen above the counter often works better than a big one on the wall, because it sits in the line of sight of somebody already facing you.' },
        { q: 'Does it work for a pharmacy chain?', a: 'Yes. Head office owns shared campaigns while each pharmacy keeps its own hours and duty rota, with roles deciding who edits what.' },
        { q: 'Can we advertise specific medicines?', a: 'That is a regulatory question in your market, not a technical one. The software will show whatever you put on it; what you are allowed to put on it is between you and your regulator.' },
        { q: 'Can it show waiting numbers?', a: 'Yes, if your system outputs them. Many pharmacies find the advice content earns more than the queue display, because the queue is usually short anyway.' },
      ],
    },
    sr: {
      intro: `Farmaceut ne može da da isti dvadesetosekundni odgovor svakome ko uđe i da mu i dalje ostane vremena za one kojima treba pet minuta. Ponovljiv savet — šta se sa čim uzima, kad stiže vakcina protiv gripa, šta sa krpeljima u maju — je polovina koju ekran može da ponese.

Pult onda radi onu polovinu kojoj treba čovek. To je cela razmena, i bolja je nego što zvuči, jer savet na ekranu stiže i do onih koji nikad ne bi pitali.`,
      scenarios: [
        { title: 'Sezonski savet, zakazan mesecima unapred', body: 'Krpelji u proleće, sunce leti, grip u jesen. Napravite jednom u januaru i sam se upali prave nedelje.' },
        { title: 'Dežurstvo, uvek tačno', body: 'Koja apoteka je otvorena večeras, ažurirano sa izvora umesto prekucano na karticu u izlogu.' },
      ],
      proof: { title: 'Šta pult dobija nazad', body: 'Apoteka koja na isto sezonsko pitanje odgovori 25 puta dnevno po 20 sekundi troši preko 8 minuta dnevno — oko 50 sati godišnje. Jedan ekran košta 8 € mesečno.' },
      faq: [
        { q: 'Možemo li da pripremimo sadržaj unapred?', a: 'Da. Sezonske teme se zakazuju mesecima ranije i same se upale na datum koji postavite — a to je jedini način da ovo preživi sezonu.' },
        { q: 'Mora li ekran da bude veliki?', a: 'Ne. Manji ekran iznad pulta često radi bolje od velikog na zidu, jer stoji u liniji pogleda nekoga ko je već okrenut ka vama.' },
        { q: 'Radi li za lanac apoteka?', a: 'Da. Centrala drži zajedničke kampanje dok svaka apoteka zadržava svoje radno vreme i dežurstvo, uz uloge koje određuju ko šta menja.' },
        { q: 'Možemo li da reklamiramo konkretne lekove?', a: 'To je regulatorno pitanje na vašem tržištu, ne tehničko. Softver će prikazati šta god stavite; šta smete da stavite je između vas i regulatora.' },
        { q: 'Može li da prikaže brojeve u redu?', a: 'Da, ako ih vaš sistem izbacuje. Mnoge apoteke otkriju da savetodavni sadržaj donosi više od prikaza reda, jer je red ionako obično kratak.' },
      ],
    },
  },
  bakeries: {
    recommendedApps: 'menu,text,clock,countdown,qr,instagram',
    en: {
      intro: `A bakery's offer changes faster than almost any other retail. The morning range sells out, the midday range replaces it, and by five what is left is a different shop. A printed board describes one of those three moments and lies about the other two.

The screen earns its place on schedule alone. Set the three ranges once and the board moves through the day without anybody behind the counter thinking about it — which matters, because the person behind the counter has both hands full.`,
      scenarios: [
        { title: 'Three ranges, one schedule', body: 'Morning, midday and evening rotate on their own. The board is right at four in the afternoon without anyone having touched it since six.' },
        { title: 'Allergens beside the price', body: 'Part of the same product card, so the information cannot get separated from the item it belongs to — which on a printed board it always eventually does.' },
      ],
      proof: { title: 'What reprinting a board costs', body: 'A bakery reprinting its board six times a year at $60 spends $360 annually and still has the wrong prices between runs. One screen costs $9 a month.' },
      faq: [
        { q: 'Can the offer change automatically by hour?', a: 'Yes. Set the schedule once and the screen moves from the morning to the midday and evening range on its own, every day.' },
        { q: 'How do we show allergens?', a: 'As part of the product card, next to the price. That is both easier to maintain and harder to lose than a separate list.' },
        { q: 'Does it work in a warm, humid room?', a: 'You choose the display to suit the space; the software runs on whichever TV or monitor you pick. Behind a counter with an oven, ventilation matters more than the panel spec.' },
        { q: 'Can we show what is sold out?', a: 'Yes — mark an item out and it disappears or greys out, in a couple of seconds from a phone.' },
        { q: 'Is one screen enough?', a: 'For most bakeries, yes. A second earns its place only when there is a genuinely different message for a different part of the shop.' },
      ],
    },
    sr: {
      intro: `Ponuda pekare menja se brže nego u skoro bilo kojoj drugoj maloprodaji. Jutarnji asortiman se rasproda, podnevni ga zameni, a do pet je ostalo nešto sasvim drugo. Štampana tabla opisuje jedan od ta tri trenutka i laže o druga dva.

Ekran zarađuje svoje mesto samim rasporedom. Postavite tri asortimana jednom i tabla prolazi kroz dan a da niko za pultom ne razmišlja o tome — što je bitno, jer onaj za pultom ima obe ruke pune.`,
      scenarios: [
        { title: 'Tri asortimana, jedan raspored', body: 'Jutarnji, podnevni i večernji se smenjuju sami. Tabla je tačna u četiri popodne a da je niko nije dirao od šest.' },
        { title: 'Alergeni pored cene', body: 'Deo iste kartice proizvoda, pa informacija ne može da se odvoji od artikla na koji se odnosi — što na štampanoj tabli uvek na kraju uradi.' },
      ],
      proof: { title: 'Koliko košta preštampavanje table', body: 'Pekara koja preštampa tablu šest puta godišnje po 50 € troši 300 € godišnje i i dalje ima pogrešne cene između štampanja. Jedan ekran košta 8 € mesečno.' },
      faq: [
        { q: 'Može li ponuda da se menja sama po satu?', a: 'Da. Postavite raspored jednom i ekran prelazi sa jutarnjeg na podnevni pa večernji asortiman sam, svakog dana.' },
        { q: 'Kako da prikažemo alergene?', a: 'Kao deo kartice proizvoda, pored cene. To je i lakše za održavanje i teže za izgubiti nego odvojen spisak.' },
        { q: 'Radi li u toploj i vlažnoj prostoriji?', a: 'Birate displej prema prostoru; softver radi na bilo kom televizoru ili monitoru. Iza pulta sa pećnicom, ventilacija je važnija od specifikacije panela.' },
        { q: 'Možemo li da prikažemo šta je rasprodato?', a: 'Da — označite artikal kao rasprodat i nestane ili posivi, za nekoliko sekundi sa telefona.' },
        { q: 'Da li je jedan ekran dovoljan?', a: 'Za većinu pekara jeste. Drugi zarađuje mesto tek kad postoji stvarno drugačija poruka za drugi deo radnje.' },
      ],
    },
  },
  salons: {
    recommendedApps: 'instagram,menu,text,qr,countdown,clock',
    en: {
      intro: `A client in the chair has fifteen minutes and nothing to do. That is the best moment in the whole appointment to learn about a treatment they did not know you offered — better than a leaflet at reception, because they are already still, already facing a mirror, and already thinking about their hair.

The second job is the price list. A salon price list changes more often than it gets reprinted, and a client discovering a different number at the till than the one on the wall is a bad way to end an otherwise good appointment.`,
      scenarios: [
        { title: 'Your own work, on a loop', body: 'Instagram posts pulled straight through, so the portfolio updates itself every time you post. No second gallery to maintain.' },
        { title: 'The price list that is actually current', body: 'Change it in one place and both the wall and the reception screen follow — no gap between what is displayed and what is charged.' },
      ],
      proof: { title: 'What the chair is worth', body: 'A salon with four chairs running eight hours holds roughly 32 client-hours of undivided attention a day. One screen in front of the chairs costs $9 a month.' },
      faq: [
        { q: 'Do we need a big screen?', a: 'No. One smaller screen in the waiting area or facing the chairs is usually plenty — the viewing distance is short, which is unusual for signage and makes everything easier.' },
        { q: 'Can we show photos of our work?', a: 'Yes, including Instagram posts pulled in automatically, so the content refreshes itself with no extra work.' },
        { q: 'How long does setup take?', a: 'A device pairs in a couple of minutes, and a first price list takes about as long to build. Most salons are running the same afternoon.' },
        { q: 'Can it play music videos?', a: 'It can play video, but think about the room. A screen with sound competes with conversation, and in a salon conversation is most of the service.' },
        { q: 'Can each stylist promote their own services?', a: 'If you give them access, yes — roles let you decide who can edit what, down to a single screen.' },
      ],
    },
    sr: {
      intro: `Klijent u stolici ima petnaest minuta i nema šta da radi. To je najbolji trenutak u celom terminu da sazna za tretman za koji nije znao da ga nudite — bolji od letka na recepciji, jer već miruje, već gleda u ogledalo, i već razmišlja o svojoj kosi.

Drugi posao je cenovnik. Cenovnik u salonu menja se češće nego što se preštampava, a klijent koji na kasi otkrije drugi broj od onog na zidu je loš način da se završi inače dobar termin.`,
      scenarios: [
        { title: 'Vaš rad, u petlji', body: 'Instagram objave se povlače direktno, pa se portfolio ažurira sam svaki put kad nešto objavite. Nema druge galerije za održavanje.' },
        { title: 'Cenovnik koji je stvarno aktuelan', body: 'Promenite na jednom mestu i prate i zid i ekran na recepciji — nema razlike između onoga što piše i onoga što se naplati.' },
      ],
      proof: { title: 'Koliko stolica vredi', body: 'Salon sa četiri stolice koji radi osam sati drži oko 32 klijent-sata nepodeljene pažnje dnevno. Jedan ekran ispred stolica košta 8 € mesečno.' },
      faq: [
        { q: 'Treba li nam veliki ekran?', a: 'Ne. Jedan manji ekran u čekaonici ili okrenut ka stolicama obično je sasvim dovoljan — udaljenost gledanja je mala, što je za signage neobično i sve olakšava.' },
        { q: 'Možemo li da prikazujemo fotografije svog rada?', a: 'Da, uključujući Instagram objave koje se povlače automatski, pa se sadržaj osvežava sam bez dodatnog posla.' },
        { q: 'Koliko traje postavljanje?', a: 'Uređaj se upari za par minuta, a prvi cenovnik se napravi otprilike za isto toliko. Većina salona radi istog popodneva.' },
        { q: 'Može li da pušta muzičke spotove?', a: 'Može da pušta video, ali razmislite o prostoriji. Ekran sa tonom se takmiči sa razgovorom, a u salonu je razgovor najveći deo usluge.' },
        { q: 'Može li svaki frizer da promoviše svoje usluge?', a: 'Ako im date pristup, može — uloge omogućavaju da odlučite ko šta menja, do nivoa jednog ekrana.' },
      ],
    },
  },

  automotive: {
    recommendedApps: 'youtube,text,qr,countdown,web,clock',
    en: {
      intro: `Buying a car takes weeks to decide and one afternoon to sign. Most of those weeks happen away from the showroom, but the afternoon happens in it — and what is on the walls during that afternoon is either working or taking up space.

The workshop is the other half, and it is the half most dealers ignore. A customer waiting two hours for a service is a captive audience with nothing to read, sitting inside the building of the business they already buy from.`,
      scenarios: [
        { title: 'Manufacturer video without the ad breaks', body: 'Full resolution, played locally, no pre-roll and no recommendations panel at the end. That last part is why a YouTube tab on a smart TV is not the same thing.' },
        { title: 'Job status in the waiting area', body: 'If your workshop system can output a list, the screen shows where each car is — which removes the question customers ask most and cannot otherwise answer.' },
      ],
      proof: { title: 'What the waiting room is worth', body: 'A workshop serving 15 cars a day with a 90-minute average wait holds over 22 customer-hours daily. One screen costs $9 a month.' },
      faq: [
        { q: 'Can we show manufacturer video?', a: 'Yes. Video plays locally at full resolution with no advertising and no end-card, which is the difference between a brand asset and a YouTube page.' },
        { q: 'Can it pull status from our system?', a: 'Yes, if the system can output a spreadsheet or a web page — it renders directly and refreshes itself.' },
        { q: 'Does it work on large window displays?', a: 'Yes, including portrait and video-wall setups. A showroom window needs a high-brightness panel; the software is the same on all of them.' },
        { q: 'Can each brand have its own screens?', a: 'Yes. Group screens by brand or by area and each group runs its own content, which matters for a multi-franchise site with contractual brand rules.' },
        { q: 'What about screens over the service desk?', a: 'They work, but keep them to information rather than promotion. Somebody collecting a repair bill is the wrong audience for an upsell.' },
      ],
    },
    sr: {
      intro: `Kupovina automobila traje nedeljama da se odluči i jedno popodne da se potpiše. Najveći deo tih nedelja dešava se van salona, ali se to popodne dešava u njemu — i ono što je na zidovima tokom tog popodneva ili radi ili zauzima mesto.

Servis je druga polovina, i to je polovina koju većina prodavaca ignoriše. Kupac koji dva sata čeka servis je zarobljena publika bez ičega za čitanje, u zgradi firme od koje već kupuje.`,
      scenarios: [
        { title: 'Video proizvođača bez reklama', body: 'Puna rezolucija, pušta se lokalno, bez reklame pre i bez panela sa preporukama na kraju. Taj poslednji deo je razlog zašto YouTube kartica na smart TV-u nije isto.' },
        { title: 'Status posla u čekaonici', body: 'Ako vaš servisni sistem ume da izbaci listu, ekran pokazuje gde je koji auto — što uklanja pitanje koje kupci najčešće postavljaju i inače ne mogu da dobiju.' },
      ],
      proof: { title: 'Koliko čekaonica vredi', body: 'Servis koji dnevno primi 15 vozila uz prosečno čekanje od 90 minuta drži preko 22 kupac-sata dnevno. Jedan ekran košta 8 € mesečno.' },
      faq: [
        { q: 'Možemo li da prikazujemo video proizvođača?', a: 'Da. Video se pušta lokalno u punoj rezoluciji, bez reklama i bez završne kartice — što je razlika između brend materijala i YouTube stranice.' },
        { q: 'Može li da povuče status iz našeg sistema?', a: 'Da, ako sistem ume da izbaci tabelu ili veb stranicu — prikazuje se direktno i sam se osvežava.' },
        { q: 'Radi li na velikim izlozima?', a: 'Da, uključujući vertikalne postavke i video zidove. Izlog salona traži panel visoke svetline; softver je na svima isti.' },
        { q: 'Može li svaki brend da ima svoje ekrane?', a: 'Da. Grupišite ekrane po brendu ili po delu objekta i svaka grupa vrti svoj sadržaj — što je bitno za multi-franšizni objekat sa ugovornim pravilima brenda.' },
        { q: 'Šta sa ekranima iznad servisnog pulta?', a: 'Rade, ali ih držite na informacijama umesto na promociji. Onaj ko preuzima račun za popravku je pogrešna publika za dodatnu prodaju.' },
      ],
    },
  },
  'real-estate': {
    recommendedApps: 'web,text,qr,gsheets,countdown,clock',
    en: {
      intro: `A printed listing stays in the window until somebody takes it down, which means the best property in the window is often one that sold three weeks ago. Every passer-by who stops for it is a lead you have converted into a disappointment.

A window screen removes that failure mode entirely. A sold property comes off the moment the status changes in your system, and the next one moves up — which also means the window is always showing your current stock rather than whatever was printed last month.`,
      scenarios: [
        { title: 'Stock that matches the system', body: 'Read from your listings database, spreadsheet or feed, so what is in the window is what is actually available.' },
        { title: 'A window that works after closing', body: 'Evening is when people walk past estate agents with time to look. Schedule brightness and content for the hours that have footfall, and power down when they do not.' },
      ],
      proof: { title: 'What a sold listing in the window costs', body: 'An agency with eight window slots turning over 30% of stock monthly has roughly two and a half stale listings in the window at any time. Two window screens cost $18 a month.' },
      faq: [
        { q: 'Can we pull listings from our database?', a: 'Yes, if they are available as a spreadsheet, feed or web page — the screen then stays in step with your system rather than being a second place to update.' },
        { q: 'Is a window screen readable in daylight?', a: 'Only if it is built for it. Window installations need high-brightness displays; a consumer television behind glass in the afternoon is unreadable, and that is a hardware problem no software fixes.' },
        { q: 'Can it run at night?', a: 'Yes, and it should run exactly as long as there are people walking past. Power on and off are scheduled per screen.' },
        { q: 'Can we show a QR code per property?', a: 'Yes — a code that opens that listing on a phone turns a passer-by after hours into a lead, which is the single highest-value thing a window screen does.' },
        { q: 'Portrait or landscape?', a: 'Portrait, almost always. A property listing is a tall object, and a portrait window screen fits more of them legibly.' },
      ],
    },
    sr: {
      intro: `Štampan oglas stoji u izlogu dok ga neko ne skine — što znači da je najbolja nekretnina u izlogu često ona koja je prodata pre tri nedelje. Svaki prolaznik koji zbog nje stane je lead koji ste pretvorili u razočaranje.

Ekran u izlogu uklanja taj režim otkaza u potpunosti. Prodata nekretnina silazi onog trenutka kad se status promeni u vašem sistemu, a sledeća se penje — što ujedno znači da izlog uvek prikazuje vaš aktuelni fond, a ne ono što je odštampano prošlog meseca.`,
      scenarios: [
        { title: 'Ponuda koja odgovara sistemu', body: 'Čita se iz vaše baze oglasa, tabele ili feeda, pa je u izlogu ono što je stvarno dostupno.' },
        { title: 'Izlog koji radi posle zatvaranja', body: 'Uveče ljudi prolaze pored agencija sa vremenom da gledaju. Zakažite svetlinu i sadržaj za sate kad ima prolaznika, i ugasite kad ih nema.' },
      ],
      proof: { title: 'Koliko košta prodat oglas u izlogu', body: 'Agencija sa osam mesta u izlogu koja mesečno obrne 30% fonda ima u svakom trenutku oko dva i po zastarela oglasa u izlogu. Dva ekrana u izlogu koštaju 16 € mesečno.' },
      faq: [
        { q: 'Možemo li da povučemo oglase iz baze?', a: 'Da, ako su dostupni kao tabela, feed ili veb stranica — ekran onda ostaje u koraku sa sistemom umesto da bude drugo mesto za ažuriranje.' },
        { q: 'Da li je ekran u izlogu čitljiv po danu?', a: 'Samo ako je za to napravljen. Izlog traži displej visoke svetline; običan televizor iza stakla popodne je nečitljiv, a to je hardverski problem koji softver ne rešava.' },
        { q: 'Može li da radi noću?', a: 'Da, i trebalo bi da radi tačno onoliko dugo koliko ima prolaznika. Paljenje i gašenje se zakazuju po ekranu.' },
        { q: 'Možemo li QR kod po nekretnini?', a: 'Da — kod koji otvara taj oglas na telefonu pretvara prolaznika van radnog vremena u lead, a to je najvrednija stvar koju ekran u izlogu radi.' },
        { q: 'Vertikalno ili horizontalno?', a: 'Vertikalno, gotovo uvek. Oglas za nekretninu je visok objekat, a vertikalan ekran u izlogu smešta više njih čitljivo.' },
      ],
    },
  },
  cinema: {
    recommendedApps: 'youtube,menu,text,countdown,web,ticker',
    en: {
      intro: `Listings change every Wednesday, screenings sell out without warning, and a poster takes days to reach the foyer. That mismatch is why cinema foyers have always had more printed paper than they need and less current information than they want.

The foyer is also a concessions business wearing a cinema's clothes. Margin lives at the counter, and the queue for it is the most reliably attentive audience in the building.`,
      scenarios: [
        { title: 'Listings that change when the schedule does', body: 'Read from the same source your booking system uses. Sold-out marks itself, and a late addition appears without anyone printing anything.' },
        { title: 'Trailers without the platform', body: 'Played locally at full resolution — no pre-roll advertising, no recommendations, no buffering in front of a queue.' },
      ],
      proof: { title: 'What the concessions queue is worth', body: 'A four-screen cinema with 600 admissions a day puts most of them through a concessions queue at some point. One screen above the counter costs $9 a month.' },
      faq: [
        { q: 'Can it show sold-out screenings?', a: 'Yes, if the data comes from a spreadsheet or a web source — the status then updates itself rather than waiting for somebody to notice.' },
        { q: 'How does trailer playback work?', a: 'Locally or from a stream, at full resolution, with no pre-roll advertising and no end-cards.' },
        { q: 'Does it run on several foyer screens?', a: 'Yes, and each should have its own role — listings, trailers, concessions. Running the same content on all three wastes two of them.' },
        { q: 'Can we sell sponsor slots?', a: 'Yes, with control over how long and how often each sponsor appears. That is often what pays for the screens.' },
        { q: 'What about screens inside the auditorium?', a: 'Different problem — that is projection, not signage. This is foyer, corridor and concessions.' },
      ],
    },
    sr: {
      intro: `Repertoar se menja svake srede, projekcije se rasprodaju bez najave, a plakatu treba dana da stigne do foajea. Taj nesklad je razlog zašto bioskopski foajei oduvek imaju više odštampanog papira nego što im treba i manje aktuelnih informacija nego što bi hteli.

Foaje je ujedno i posao sa hranom i pićem u bioskopskom odelu. Marža živi na pultu, a red ispred njega je najpouzdanije pažljiva publika u zgradi.`,
      scenarios: [
        { title: 'Repertoar koji se menja kad i raspored', body: 'Čita se iz istog izvora koji koristi vaš sistem prodaje. Rasprodato se samo označi, a naknadno dodat termin se pojavi a da niko ništa ne štampa.' },
        { title: 'Najave bez platforme', body: 'Puštaju se lokalno u punoj rezoluciji — bez reklame pre, bez preporuka, bez baferovanja pred redom.' },
      ],
      proof: { title: 'Koliko red za hranu vredi', body: 'Bioskop sa četiri sale i 600 ulaznica dnevno provuče većinu njih kroz red za hranu u nekom trenutku. Jedan ekran iznad pulta košta 8 € mesečno.' },
      faq: [
        { q: 'Može li da prikaže rasprodate projekcije?', a: 'Da, ako podaci dolaze iz tabele ili veb izvora — status se onda sam ažurira umesto da čeka da neko primeti.' },
        { q: 'Kako radi puštanje najava?', a: 'Lokalno ili sa strima, u punoj rezoluciji, bez reklama pre i bez završnih kartica.' },
        { q: 'Radi li na više ekrana u foajeu?', a: 'Da, i svaki bi trebalo da ima svoju ulogu — repertoar, najave, ponuda. Isti sadržaj na sva tri baca dva od njih.' },
        { q: 'Možemo li da prodajemo sponzorske termine?', a: 'Da, uz kontrolu koliko dugo i koliko često se koji sponzor pojavljuje. To često i plati ekrane.' },
        { q: 'Šta sa ekranima u samoj sali?', a: 'Drugi problem — to je projekcija, ne signage. Ovo je foaje, hodnik i pult.' },
      ],
    },
  },

  'transport': {
    recommendedApps: 'web,gsheets,alert,clock,ticker,weather',
    en: {
      intro: `At a station everything rides on one number: when, and from which platform. Get it right and nobody notices the screen. Get it wrong — or show nothing at all during a disruption — and the screen becomes the thing people photograph and complain about.

That asymmetry is why transport signage is judged entirely on reliability. A display that is beautiful for 364 days and blank on the day of a strike has failed at the only moment that mattered.`,
      scenarios: [
        { title: 'Departures from your own source', body: 'Read from the system that already holds them, refreshed continuously. The screen is a view of the data, never a second copy of it.' },
        { title: 'Disruption, immediately', body: 'When everything shifts, the screens shift with it — and a full-screen notice can take over every display at once when the normal layout is not enough.' },
      ],
      proof: { title: 'Why the offline behaviour matters here', body: 'A player that caches shows the last known state during an outage instead of an error. On a platform, a stale departure with a visible timestamp is far better than a blank screen — and far better than a spinner.' },
      faq: [
        { q: 'Where does departure data come from?', a: 'From your own system, a spreadsheet or a web source — rendered directly and refreshed on its own. We do not hold the data; we display it.' },
        { q: 'What if a device loses connection?', a: 'It keeps showing the last state it downloaded and recovers by itself as soon as the link is back. For live data, show a timestamp so a stale figure cannot be mistaken for a current one.' },
        { q: 'Can a screen run 24 hours?', a: 'Yes. The player is built for continuous operation, with a watchdog that restarts it if anything stalls — which on an unattended platform is the whole point.' },
        { q: 'Can we run different content per platform?', a: 'Yes. Screens group however you need — by platform, concourse, or entrance — and each group carries its own layout.' },
        { q: 'Is this suitable for safety-critical information?', a: 'For passenger information, yes. For anything with a regulatory certification requirement, check the requirement first — we do not hold transport-specific certifications.' },
      ],
    },
    sr: {
      intro: `Na stanici sve visi o jednom broju: kada, i sa kog perona. Ako je tačan, ekran niko ne primeti. Ako je pogrešan — ili ako tokom poremećaja ne pokazuje ništa — ekran postane ono što ljudi slikaju i na šta se žale.

Ta asimetrija je razlog zašto se signage u saobraćaju ocenjuje isključivo po pouzdanosti. Displej koji je lep 364 dana a prazan na dan štrajka podbacio je u jedinom trenutku koji je bio bitan.`,
      scenarios: [
        { title: 'Polasci iz vašeg izvora', body: 'Čitaju se iz sistema koji ih već drži, uz stalno osvežavanje. Ekran je pogled na podatke, nikad druga kopija.' },
        { title: 'Poremećaj, odmah', body: 'Kad se sve pomeri, ekrani se pomere sa tim — a obaveštenje preko celog ekrana može da preuzme sve displeje odjednom kad uobičajen raspored nije dovoljan.' },
      ],
      proof: { title: 'Zašto je ovde offline ponašanje presudno', body: 'Plejer koji kešira prikazuje poslednje poznato stanje tokom prekida umesto greške. Na peronu je zastareo polazak sa vidljivim vremenskim pečatom daleko bolji od praznog ekrana — i daleko bolji od vrteške.' },
      faq: [
        { q: 'Odakle dolaze podaci o polascima?', a: 'Iz vašeg sistema, tabele ili veb izvora — prikazuju se direktno i sami osvežavaju. Mi ne držimo podatke; mi ih prikazujemo.' },
        { q: 'Šta ako uređaj izgubi vezu?', a: 'Nastavlja da prikazuje poslednje preuzeto stanje i sam se oporavi čim se veza vrati. Za žive podatke prikažite vremenski pečat, da zastarela cifra ne bi bila zamenjena za aktuelnu.' },
        { q: 'Može li ekran da radi 24 sata?', a: 'Da. Plejer je pravljen za neprekidan rad, sa watchdog-om koji ga restartuje ako se nešto zaglavi — što je na peronu bez posade cela poenta.' },
        { q: 'Možemo li različit sadržaj po peronu?', a: 'Da. Ekrani se grupišu kako treba — po peronu, holu ili ulazu — i svaka grupa nosi svoj raspored.' },
        { q: 'Odgovara li ovo bezbednosno kritičnim informacijama?', a: 'Za putničke informacije, da. Za bilo šta sa regulatornim zahtevom za sertifikaciju, prvo proverite zahtev — nemamo sertifikate specifične za saobraćaj.' },
      ],
    },
  },
  'coworking': {
    recommendedApps: 'gcal,outlook,text,teams,clock,weather',
    en: {
      intro: `In coworking the people change daily. Somebody who joined this morning does not know where the quiet room is, which meeting rooms are bookable, or that there is a talk on Thursday — and the person who could tell them is on a call.

A screen takes over the induction you would otherwise repeat to each of them. That is not a marketing job; it is an operations one, and it shows up as fewer interruptions rather than as engagement.`,
      scenarios: [
        { title: 'Room availability at the door', body: 'A small display outside each room reading your calendar. Read-only — the booking stays in your system and the screen just settles the question.' },
        { title: 'What is on this week', body: 'Talks, workshops, the Friday thing. Members find out without being emailed, which is the only way it reaches the ones who joined yesterday.' },
      ],
      proof: { title: 'What it replaces', body: 'A space with 60 members turning over 15% a month is inducting nine new people every month, each asking roughly the same five questions. A lobby screen and two door displays cost $27 a month.' },
      faq: [
        { q: 'Can it show room bookings from a calendar?', a: 'Yes — Google Calendar and Microsoft 365. The display is read-only; bookings stay in your system, which is the arrangement most operators want.' },
        { q: 'Do we need a screen outside every room?', a: 'No. A small display by the door works best, but a single central screen listing all rooms also works and costs a great deal less.' },
        { q: 'Can members post their own events?', a: 'Yes, if you give them access — with approval before publishing if you prefer. Roles go down to a single screen.' },
        { q: 'Can it show desk availability?', a: 'If your booking system outputs it as a spreadsheet or web page, yes. Otherwise the room displays cover most of the friction.' },
        { q: 'Is a screen better than a Slack channel?', a: 'It reaches different people. The channel reaches members who read it; the screen reaches everybody who walks past, including the ones who joined this morning.' },
      ],
    },
    sr: {
      intro: `U koworkingu se ljudi menjaju svakodnevno. Neko ko je počeo jutros ne zna gde je tiha soba, koje sale mogu da se rezervišu, ni da u četvrtak ima predavanje — a osoba koja bi mu rekla je na sastanku.

Ekran preuzima uvođenje koje biste inače ponavljali svakome od njih. To nije marketinški posao nego operativni, i vidi se kao manje prekidanja, a ne kao angažovanost.`,
      scenarios: [
        { title: 'Dostupnost sale na vratima', body: 'Mali ekran ispred svake sale čita vaš kalendar. Samo za čitanje — rezervacija ostaje u vašem sistemu, a ekran samo rešava pitanje.' },
        { title: 'Šta ima ove nedelje', body: 'Predavanja, radionice, ono petkom. Članovi saznaju bez mejla, što je jedini način da stigne do onih koji su počeli juče.' },
      ],
      proof: { title: 'Šta zamenjuje', body: 'Prostor sa 60 članova i mesečnim obrtom od 15% uvodi devet novih ljudi svakog meseca, a svaki postavlja otprilike istih pet pitanja. Ekran u holu i dva na vratima koštaju 24 € mesečno.' },
      faq: [
        { q: 'Može li da prikaže rezervacije iz kalendara?', a: 'Da — Google Calendar i Microsoft 365. Ekran je samo za čitanje; rezervacije ostaju u vašem sistemu, što je aranžman koji većina operatera i želi.' },
        { q: 'Treba li nam ekran ispred svake sale?', a: 'Ne. Mali ekran kod vrata radi najbolje, ali i jedan centralni sa spiskom svih sala radi — i košta znatno manje.' },
        { q: 'Mogu li članovi da objavljuju svoje događaje?', a: 'Da, ako im date pristup — uz odobrenje pre objave ako vam je tako draže. Uloge idu do nivoa jednog ekrana.' },
        { q: 'Može li da prikaže slobodne stolove?', a: 'Ako vaš sistem rezervacija to izbacuje kao tabelu ili veb stranicu, može. U suprotnom ekrani na salama pokrivaju najveći deo trenja.' },
        { q: 'Je li ekran bolji od Slack kanala?', a: 'Stiže do drugih ljudi. Kanal stiže do članova koji ga čitaju; ekran stiže do svih koji prođu pored, uključujući one koji su počeli jutros.' },
      ],
    },
  },
  'veterinary': {
    recommendedApps: 'text,wisdom,weather,clock,qr,countdown',
    en: {
      intro: `Anxiety in a vet's waiting room travels from the owner down the lead. A dog reads the person holding it long before it reads the room, so anything that settles the owner settles the animal — and a screen that gives them something to look at other than the door is doing more than it appears to.

That sets the design constraint: calm. No abrupt transitions, no sound, nothing flashing. It is the opposite of what signage templates are usually built for, and it is the whole job here.`,
      scenarios: [
        { title: 'Seasonal advice, on schedule', body: 'Ticks in spring, heat in summer, fireworks in autumn. Written once, scheduled to appear the week it becomes relevant.' },
        { title: 'Something to look at other than the door', body: 'Slow, quiet content that gives an anxious owner somewhere else to put their attention. This is the part that is hard to justify on a spreadsheet and obvious in the room.' },
      ],
      proof: { title: 'What it replaces', body: 'A practice answering the same seasonal question 15 times a day at half a minute each spends about 45 hours a year on it. One waiting-room screen costs $9 a month.' },
      faq: [
        { q: 'Does the screen disturb the animals?', a: 'Not if the content is built for the room. Silent, no abrupt transitions, low contrast movement — it reads as calming rather than as another thing to react to.' },
        { q: 'Can we change content by season?', a: 'Yes. Seasonal topics — ticks, heat, fireworks — are scheduled ahead and switch themselves on at the week you set.' },
        { q: 'How many screens does a practice need?', a: 'One in the waiting room is usually enough. A second at reception only if reception is a separate room people wait in.' },
        { q: 'Can we show the vet on duty?', a: 'Yes, from a spreadsheet or by editing it directly. Out-of-hours cover is one of the most-asked questions and the easiest to answer permanently.' },
        { q: 'Should it have sound?', a: 'No. A waiting room with animals is the one setting where sound is unambiguously wrong.' },
      ],
    },
    sr: {
      intro: `Nervoza u veterinarskoj čekaonici putuje od vlasnika niz povodac. Pas čita osobu koja ga drži mnogo pre nego što pročita prostoriju, pa sve što smiruje vlasnika smiruje i životinju — a ekran koji im daje nešto drugo da gledaju osim vrata radi više nego što deluje.

To postavlja dizajnersko ograničenje: mir. Bez naglih prelaza, bez zvuka, bez treperenja. To je suprotno od onoga za šta se signage šabloni obično prave, a ovde je ceo posao.`,
      scenarios: [
        { title: 'Sezonski savet, po rasporedu', body: 'Krpelji u proleće, vrućina leti, petarde u jesen. Napisano jednom, zakazano da se pojavi one nedelje kad postane važno.' },
        { title: 'Nešto drugo da se gleda osim vrata', body: 'Spor, tih sadržaj koji nervoznom vlasniku daje gde drugde da usmeri pažnju. To je deo koji je teško opravdati u tabeli a očigledan je u prostoriji.' },
      ],
      proof: { title: 'Šta zamenjuje', body: 'Ambulanta koja na isto sezonsko pitanje odgovori 15 puta dnevno po pola minuta troši oko 45 sati godišnje. Jedan ekran u čekaonici košta 8 € mesečno.' },
      faq: [
        { q: 'Da li ekran uznemirava životinje?', a: 'Ne ako je sadržaj pravljen za tu prostoriju. Bez zvuka, bez naglih prelaza, sa kretanjem niskog kontrasta — čita se kao umirujuć, a ne kao još nešto na šta treba reagovati.' },
        { q: 'Možemo li da menjamo sadržaj po sezoni?', a: 'Da. Sezonske teme — krpelji, vrućina, petarde — zakazuju se unapred i same se upale one nedelje koju postavite.' },
        { q: 'Koliko ekrana treba ambulanti?', a: 'Jedan u čekaonici obično je dovoljan. Drugi na recepciji samo ako je recepcija odvojena prostorija u kojoj se čeka.' },
        { q: 'Možemo li da prikažemo dežurnog veterinara?', a: 'Da, iz tabele ili direktnim unosom. Dežurstvo van radnog vremena je jedno od najčešćih pitanja i najlakše za trajno odgovoriti.' },
        { q: 'Treba li da ima zvuk?', a: 'Ne. Čekaonica sa životinjama je jedino mesto gde je zvuk nedvosmisleno pogrešan.' },
      ],
    },
  },
  'events': {
    recommendedApps: 'text,gcal,countdown,qr,ticker,clock',
    en: {
      intro: `The same room hosts a conference in the morning and a wedding at night. Printed signage cannot do that — somebody has to take one set down and put another up, and the gap between the two is when guests are arriving.

A screen switches in seconds. Build the schedule for both events in advance, and the room relabels itself while the tables are still being moved. That is the entire argument, and for a venue turning rooms over twice a day it is not a small one.`,
      scenarios: [
        { title: 'Two events, one switch', body: 'Prepared schedules that swap on a timer or on a click. Every screen in the building relabels at once, including the ones nobody would have remembered.' },
        { title: 'Sponsor slots you can sell', body: 'Controlled rotation with a defined share of screen time — which turns the screens from a cost into a line item you can invoice.' },
      ],
      proof: { title: 'What a room turnover costs in signage', body: "A venue turning four rooms twice a day reprints or reprints-and-swaps eight signs daily. At even five minutes each that is 40 minutes a day of somebody's time. Eight screens cost $72 a month." },
      faq: [
        { q: 'How fast can we switch between two events?', a: 'Seconds. Switching to a prepared schedule happens across every screen at once, so the building is never half-relabelled.' },
        { q: 'Can we prepare everything in advance?', a: 'Yes. A schedule can be built days ahead and switches itself on at the date and hour you set, which is how a busy weekend gets survivable.' },
        { q: 'Can it loop sponsor material?', a: 'Yes, with control over how long and how often each sponsor appears. Being able to prove the share of screen time is usually what makes it sellable.' },
        { q: 'Can each room show its own programme?', a: 'Yes — a small screen at each door plus a summary board at the entrance is the standard setup, and both read from the same schedule.' },
        { q: 'What about outdoor screens?', a: 'Possible, but that is a hardware question: outdoor and semi-outdoor displays are a different category with different brightness and weather ratings. The software is the same.' },
      ],
    },
    sr: {
      intro: `Ista sala ujutru ugosti konferenciju a uveče svadbu. Štampana signalizacija to ne može — neko mora da skine jedan set i okači drugi, a razmak između to dvoje je upravo kad gosti stižu.

Ekran se prebaci za nekoliko sekundi. Napravite raspored za oba događaja unapred, i sala se sama preimenuje dok se stolovi još pomeraju. To je ceo argument, a za objekat koji sale obrne dvaput dnevno nije mali.`,
      scenarios: [
        { title: 'Dva događaja, jedno prebacivanje', body: 'Pripremljeni rasporedi koji se menjaju po tajmeru ili na klik. Svaki ekran u zgradi se preimenuje odjednom, uključujući i one kojih se niko ne bi setio.' },
        { title: 'Sponzorski termini koje možete da prodate', body: 'Kontrolisana rotacija sa definisanim udelom u vremenu ekrana — čime ekrani od troška postaju stavka koju fakturišete.' },
      ],
      proof: { title: 'Koliko obrt sale košta u signalizaciji', body: 'Objekat koji obrne četiri sale dvaput dnevno menja osam oznaka dnevno. I po pet minuta po oznaci to je 40 minuta nečijeg vremena dnevno. Osam ekrana košta 64 € mesečno.' },
      faq: [
        { q: 'Koliko brzo možemo da prebacimo između dva događaja?', a: 'Za nekoliko sekundi. Prelazak na pripremljen raspored dešava se na svim ekranima odjednom, pa zgrada nikad nije upola preimenovana.' },
        { q: 'Možemo li sve da pripremimo unapred?', a: 'Da. Raspored se pravi danima ranije i sam se upali na datum i sat koji postavite — tako preživljava pun vikend.' },
        { q: 'Može li da vrti sponzorski materijal?', a: 'Da, uz kontrolu koliko dugo i koliko često se koji sponzor pojavljuje. Mogućnost da se dokaže udeo u vremenu ekrana je obično ono što ga čini prodajivim.' },
        { q: 'Može li svaka sala da prikaže svoj program?', a: 'Da — mali ekran na svakim vratima plus zbirna tabla na ulazu je standardna postavka, a oboje čitaju isti raspored.' },
        { q: 'Šta sa ekranima napolju?', a: 'Moguće je, ali je to hardversko pitanje: spoljni i poluspoljni displeji su druga kategorija sa drugim svetlinama i otpornošću. Softver je isti.' },
      ],
    },
  },
}
