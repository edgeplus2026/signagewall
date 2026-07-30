// @ts-nocheck
/* Seed content for the `solutions` collection — 20 industries, sr + en.
   Consumed by scripts/seed-solutions.ts. Copy is deliberately specific: a page
   that could describe any business ranks for nothing and convinces no one. */

export const SOLUTIONS = [
  {
    slug: 'hospitality',
    srSlug: 'ugostiteljstvo',
    icon: 'utensils',
    order: 10,
    sr: {
      name: 'Ugostiteljstvo',
      tagline:
        'Meni koji menjate za nekoliko sekundi, a ne za nedelju dana. Cene, ponuda dana i sezonske promocije stižu na sve ekrane odjednom — bez ponovne štampe i bez nalepnica preko starih cena.',
      title: 'Digitalni meniji za restorane, kafiće i barove.',
      subtitle:
        'Zamenite štampani meni ekranima koje ažurirate iz telefona. Doručak ujutru, ručak u podne, koktel karta uveče — zakazano unapred i uvek tačno.',
      metaTitle: 'Digitalni meni za restorane i kafiće',
      metaDescription:
        'Digitalni meniji za ugostiteljstvo: menjajte cene i ponudu dana za nekoliko sekundi, zakazujte doručak i večernju kartu, bez troška ponovne štampe.',
      scenarios: [
        { title: 'Digitalni meni', body: 'Jela, cene i ponuda dana bez ponovne štampe i lepljenja nalepnica preko starih cena.' },
        { title: 'Dnevni raspored', body: 'Doručak, ručak i večernja karta se smenjuju same, po satnici koju postavite jednom.' },
        { title: 'Promocije i atmosfera', body: 'Happy hour, sezonske akcije i preporuke šefa, uz vizuale koji drže identitet prostora.' },
      ],
      benefits: [
        'Bez troška ponovne štampe',
        'Izmena cene za nekoliko sekundi',
        'Veći prosečan račun kroz istaknute preporuke',
      ],
      faq: [
        {
          q: 'Da li mi treba poseban ekran za meni?',
          a: 'Ne. Radi na običnom televizoru koji već imate — potreban je samo mali Android boks ili računar sa SignageWall plejerom.',
        },
        {
          q: 'Koliko traje izmena cene?',
          a: 'Nekoliko sekundi. Izmenite je u kontrolnoj tabli i promena stigne na sve ekrane odmah, na jednoj ili na svim lokacijama.',
        },
        {
          q: 'Šta se dešava ako padne internet?',
          a: 'Plejer nastavlja da prikazuje poslednji preuzet sadržaj. Ekran ne ostaje prazan, a nove izmene stižu čim se veza vrati.',
        },
      ],
    },
    en: {
      name: 'Hospitality',
      tagline:
        'A menu you change in seconds, not in a week. Prices, daily specials and seasonal promotions reach every screen at once — no reprints, no stickers over yesterday’s prices.',
      title: 'Digital menus for restaurants, cafés and bars.',
      subtitle:
        'Replace the printed menu with screens you update from your phone. Breakfast in the morning, lunch at noon, a cocktail list at night — scheduled ahead and always right.',
      metaTitle: 'Digital menu boards for restaurants and cafés',
      metaDescription:
        'Digital menus for hospitality: change prices and daily specials in seconds, schedule breakfast and evening menus, and stop paying to reprint.',
      scenarios: [
        { title: 'Digital menu', body: 'Dishes, prices and the daily special without reprinting or taping stickers over old prices.' },
        { title: 'Dayparting', body: 'Breakfast, lunch and the evening list rotate on their own, on a schedule you set once.' },
        { title: 'Promotions and mood', body: 'Happy hour, seasonal offers and the chef’s picks, with visuals that hold the room’s identity.' },
      ],
      benefits: [
        'No reprinting costs',
        'Price changes in seconds',
        'Higher average spend from featured picks',
      ],
      faq: [
        {
          q: 'Do I need a special menu display?',
          a: 'No. It runs on an ordinary TV you already own — all it needs is a small Android box or PC running the SignageWall player.',
        },
        {
          q: 'How long does a price change take?',
          a: 'Seconds. Edit it in the dashboard and it lands on every screen straight away, at one location or across all of them.',
        },
        {
          q: 'What happens if the internet drops?',
          a: 'The player keeps showing the last content it downloaded. The screen never goes blank, and new edits arrive as soon as the connection is back.',
        },
      ],
    },
  },
  {
    slug: 'retail',
    srSlug: 'maloprodaja',
    icon: 'shopping-bag',
    order: 20,
    sr: {
      name: 'Maloprodaja',
      tagline:
        'Prodajni prostor koji prati zalihe i sezonu. Akcije, novi artikli i brend poruke menjaju se po lokaciji ili svuda odjednom, iz iste kontrolne table.',
      title: 'Ekrani koji prodaju, na svakoj lokaciji.',
      subtitle:
        'Kampanja koja kreće u ponedeljak ne mora da čeka kurira sa posterima. Postavite je jednom i pustite na jednu radnju, na grad ili na celu mrežu.',
      metaTitle: 'Digital signage za maloprodaju i radnje',
      metaDescription:
        'Digitalni ekrani za maloprodaju: akcije i novi artikli na svim lokacijama odjednom, kampanje zakazane unapred, bez štampe postera.',
      scenarios: [
        { title: 'Akcije i sniženja', body: 'Cene i popusti idu na ekrane u trenutku kada kampanja kreće, ne dan kasnije.' },
        { title: 'Novo u ponudi', body: 'Novi artikli i preporuke na izlogu i uz police, tamo gde se odluka zaista donosi.' },
        { title: 'Brend na svim lokacijama', body: 'Ista poruka i isti izgled u svakoj radnji, bez obzira ko je te nedelje u smeni.' },
      ],
      benefits: [
        'Kampanja na svim lokacijama u istom trenutku',
        'Nema štampe ni distribucije postera',
        'Poruka na mestu odluke o kupovini',
      ],
      faq: [
        {
          q: 'Mogu li da prikažem različit sadržaj po lokaciji?',
          a: 'Da. Ekrane grupišete po lokaciji, gradu ili tipu radnje i svakoj grupi šaljete svoj sadržaj — ili jedan sadržaj svima odjednom.',
        },
        {
          q: 'Ko može da menja sadržaj?',
          a: 'Vi dodeljujete pristup. Centrala može da drži brend kampanje, a lokalni menadžer da menja samo ono što mu je dozvoljeno.',
        },
        {
          q: 'Koliko ekrana mogu da povežem?',
          a: 'Od jednog do cele mreže. Isti sistem radi za jednu radnju i za stotine lokacija.',
        },
      ],
    },
    en: {
      name: 'Retail',
      tagline:
        'A shop floor that keeps up with stock and season. Offers, new arrivals and brand messages change per location or everywhere at once, from one dashboard.',
      title: 'Screens that sell, in every store.',
      subtitle:
        'A campaign that starts on Monday shouldn’t wait for a courier with posters. Build it once and push it to one shop, one city, or the whole network.',
      metaTitle: 'Digital signage for retail stores',
      metaDescription:
        'Digital screens for retail: run offers and new arrivals across every location at once, schedule campaigns ahead, and stop printing posters.',
      scenarios: [
        { title: 'Offers and sales', body: 'Prices and discounts hit the screens the moment a campaign starts, not a day later.' },
        { title: 'New arrivals', body: 'New products and picks in the window and at the shelf, where the decision is actually made.' },
        { title: 'One brand everywhere', body: 'The same message and the same look in every store, whoever happens to be on shift.' },
      ],
      benefits: [
        'Every location updated in the same moment',
        'No printing or poster logistics',
        'The message sits at the point of decision',
      ],
      faq: [
        {
          q: 'Can I show different content per location?',
          a: 'Yes. Group screens by location, city or store type and send each group its own content — or one message to all of them at once.',
        },
        {
          q: 'Who can change the content?',
          a: 'You assign access. Head office can own brand campaigns while a local manager edits only what you allow.',
        },
        {
          q: 'How many screens can I connect?',
          a: 'One or a whole network. The same system runs a single shop and hundreds of locations.',
        },
      ],
    },
  },
  {
    slug: 'office',
    srSlug: 'kancelarije',
    icon: 'building',
    order: 30,
    sr: {
      name: 'Kancelarije',
      tagline:
        'Informacije koje tim zaista pogleda. Najave, ključni brojevi, rasporedi sala i dobrodošlica gostima — na ekranima u prijemu, hodniku i kuhinji.',
      title: 'Interna komunikacija koja ne završi u nepročitanoj pošti.',
      subtitle:
        'Mejl se preskače, oglasna tabla se ne čita. Ekran u hodniku i kuhinji vidi svako, svaki dan, bez ijednog klika.',
      metaTitle: 'Digitalni ekrani za kancelarije i radna mesta',
      metaDescription:
        'Interna komunikacija na ekranima: najave, KPI dashboardi, rasporedi sala i dobrodošlica gostima — vidljivo celom timu bez otvaranja mejla.',
      scenarios: [
        { title: 'Najave i obaveštenja', body: 'Vesti iz kompanije, novi kolege i podsetnici — tamo gde tim svakako prolazi.' },
        { title: 'Brojevi koji se prate', body: 'Prodajni ciljevi, status projekata i dashboardi uživo iz alata koje već koristite.' },
        { title: 'Prijem i sale', body: 'Dobrodošlica gostu po imenu i raspored zauzetosti ispred svake sale za sastanke.' },
      ],
      benefits: [
        'Poruka koju ne treba otvarati da bi se videla',
        'Brojevi uživo, bez ručnog prekucavanja',
        'Profesionalan prvi utisak na prijemu',
      ],
      faq: [
        {
          q: 'Može li da prikaže naše postojeće dashboarde?',
          a: 'Da. Power BI, Google Sheets i bilo koja web stranica se prikazuju direktno, uz automatsko osvežavanje.',
        },
        {
          q: 'Da li može da čita naš kalendar?',
          a: 'Da — Google Calendar i Microsoft 365. SignageWall samo čita raspored i nikada ga ne menja.',
        },
        {
          q: 'Treba li nam IT tim za postavljanje?',
          a: 'Ne. Uređaj se upari skeniranjem QR koda sa ekrana, a dalje se sve radi iz pregledača.',
        },
      ],
    },
    en: {
      name: 'Offices',
      tagline:
        'The information a team actually looks at. Announcements, key numbers, room schedules and visitor welcomes — on the screens in reception, corridors and the kitchen.',
      title: 'Internal comms that don’t die in an unread inbox.',
      subtitle:
        'Email gets skipped and the noticeboard goes unread. A screen in the corridor and the kitchen is seen by everyone, every day, without a single click.',
      metaTitle: 'Digital signage for offices and workplaces',
      metaDescription:
        'Internal communication on screens: announcements, live KPI dashboards, meeting-room schedules and visitor welcomes — seen by the whole team, no inbox required.',
      scenarios: [
        { title: 'Announcements', body: 'Company news, new joiners and reminders — where the team already walks past.' },
        { title: 'Numbers that matter', body: 'Sales targets, project status and live dashboards from the tools you already use.' },
        { title: 'Reception and rooms', body: 'A guest welcomed by name, and room availability shown outside every meeting room.' },
      ],
      benefits: [
        'A message nobody has to open to see',
        'Live numbers with no retyping',
        'A professional first impression at reception',
      ],
      faq: [
        {
          q: 'Can it show our existing dashboards?',
          a: 'Yes. Power BI, Google Sheets and any web page render directly, refreshing on their own.',
        },
        {
          q: 'Can it read our calendar?',
          a: 'Yes — Google Calendar and Microsoft 365. SignageWall only reads the schedule and never changes it.',
        },
        {
          q: 'Do we need IT to set it up?',
          a: 'No. Pair a device by scanning the QR code on screen; everything after that happens in a browser.',
        },
      ],
    },
  },
  {
    slug: 'healthcare',
    srSlug: 'zdravstvo',
    icon: 'heart-pulse',
    order: 40,
    sr: {
      name: 'Zdravstvo',
      tagline:
        'Mirnija čekaonica i pacijent koji zna šta sledi. Redovi, uputstva, radno vreme i zdravstveni saveti — jasno, tiho i bez papira zalepljenih po zidovima.',
      title: 'Čekaonica u kojoj pacijent zna šta ga čeka.',
      subtitle:
        'Najveći deo nervoze u čekaonici dolazi od neizvesnosti. Ekran koji pokazuje red i procenu čekanja rešava to bez ijedne dodatne reči osoblja.',
      metaTitle: 'Digitalni ekrani za ordinacije i klinike',
      metaDescription:
        'Ekrani za zdravstvene ustanove: prikaz reda i procene čekanja, uputstva za pacijente, radno vreme lekara i zdravstveni saveti u čekaonici.',
      scenarios: [
        { title: 'Red i pozivanje', body: 'Broj koji je na redu i procena čekanja, da pacijent ne mora da pita na svakih pet minuta.' },
        { title: 'Uputstva i priprema', body: 'Kako se pripremiti za analizu ili pregled, objašnjeno mirno i sa dovoljno vremena za čitanje.' },
        { title: 'Radno vreme i tim', body: 'Ko danas radi, u kojoj ordinaciji i do kada — bez papira zalepljenog na vrata.' },
      ],
      benefits: [
        'Manje pitanja na recepciji',
        'Mirnija čekaonica',
        'Uputstva koja pacijent stigne da pročita',
      ],
      faq: [
        {
          q: 'Da li se prikazuju podaci o pacijentima?',
          a: 'Ne morate ih prikazivati. Najčešće se prikazuje samo broj ili šifra termina, tako da nijedan lični podatak ne ide na ekran.',
        },
        {
          q: 'Može li ekran da radi bez zvuka?',
          a: 'Da. Sadržaj je napravljen da se razume i potpuno nem, što je u čekaonici obično i poželjno.',
        },
        {
          q: 'Možemo li brzo da objavimo hitno obaveštenje?',
          a: 'Da. Hitna poruka preuzima ceo ekran na svim uređajima odjednom i sklanja se jednako brzo.',
        },
      ],
    },
    en: {
      name: 'Healthcare',
      tagline:
        'A calmer waiting room, and a patient who knows what comes next. Queues, instructions, opening hours and health guidance — clear, quiet, and with nothing taped to the walls.',
      title: 'A waiting room where patients know where they stand.',
      subtitle:
        'Most of the tension in a waiting room comes from not knowing. A screen showing the queue and an estimated wait settles it without staff saying a word.',
      metaTitle: 'Digital signage for clinics and practices',
      metaDescription:
        'Screens for healthcare: show the queue and estimated wait, patient preparation instructions, doctor hours and health guidance in the waiting room.',
      scenarios: [
        { title: 'Queue and calling', body: 'The number being seen and the estimated wait, so nobody has to ask every five minutes.' },
        { title: 'Instructions and prep', body: 'How to prepare for a test or a visit, explained calmly and left up long enough to read.' },
        { title: 'Hours and team', body: 'Who is in today, in which room, and until when — with no paper taped to the door.' },
      ],
      benefits: [
        'Fewer questions at the desk',
        'A calmer waiting room',
        'Instructions patients have time to read',
      ],
      faq: [
        {
          q: 'Does it display patient data?',
          a: 'It doesn’t have to. Most practices show only a number or appointment code, so no personal data reaches the screen at all.',
        },
        {
          q: 'Can the screen run without sound?',
          a: 'Yes. Content is built to be understood completely silent, which in a waiting room is usually what you want.',
        },
        {
          q: 'Can we post an urgent notice quickly?',
          a: 'Yes. An emergency message takes over every screen at once and clears just as fast.',
        },
      ],
    },
  },
  {
    slug: 'hotels',
    srSlug: 'hoteli',
    icon: 'hotel',
    order: 50,
    sr: {
      name: 'Hoteli',
      tagline:
        'Recepcija koja odgovara pre nego što gost pita. Dobrodošlica, program dana, vremenska prognoza, letovi i preporuke iz okoline — na jeziku gosta.',
      title: 'Gost koji se snalazi sam, od dolaska do odlaska.',
      subtitle:
        'Ista pitanja se ponavljaju svakog dana: kad je doručak, kakvo je vreme, kako do centra. Ekran na njih odgovara pre nego što gost priđe pultu.',
      metaTitle: 'Digitalni ekrani za hotele i apartmane',
      metaDescription:
        'Ekrani za hotele: dobrodošlica gostima, program dana, radno vreme doručka i spa, vremenska prognoza, dolasci letova i preporuke iz okoline.',
      scenarios: [
        { title: 'Dobrodošlica i događaji', body: 'Ime grupe ili konferencije na ekranu u lobiju i smer do sale, bez štampanih tabli.' },
        { title: 'Servis i radno vreme', body: 'Doručak, spa, bazen i restoran — kada rade i gde se nalaze, na više jezika.' },
        { title: 'Vreme, letovi i okolina', body: 'Prognoza, dolasci i polasci i preporuke šta videti u blizini, osveženo automatski.' },
      ],
      benefits: [
        'Manje ponavljajućih pitanja na recepciji',
        'Sadržaj na jeziku gosta',
        'Prilika za prodaju sopstvenih usluga',
      ],
      faq: [
        {
          q: 'Može li sadržaj da bude na više jezika?',
          a: 'Da. Ekran može da smenjuje jezike u ciklusu ili da različiti ekrani u hotelu prikazuju različit jezik.',
        },
        {
          q: 'Da li može da prikaže dolaske letova?',
          a: 'Da, uz automatsko osvežavanje — korisno u lobiju i u zoni za transfer.',
        },
        {
          q: 'Možemo li da promovišemo spa ili restoran?',
          a: 'Da. Sopstvene ponude se smenjuju sa korisnim informacijama, pa reklama ne deluje nametljivo.',
        },
      ],
    },
    en: {
      name: 'Hotels',
      tagline:
        'A front desk that answers before the guest asks. Welcomes, the day’s program, weather, flights and local recommendations — in the guest’s own language.',
      title: 'Guests who find their own way, from arrival to checkout.',
      subtitle:
        'The same questions come every day: when is breakfast, what’s the weather, how do I get to the centre. A screen answers them before anyone reaches the desk.',
      metaTitle: 'Digital signage for hotels and apartments',
      metaDescription:
        'Screens for hotels: guest welcomes, the day’s program, breakfast and spa hours, weather, flight arrivals and local recommendations.',
      scenarios: [
        { title: 'Welcomes and events', body: 'A group or conference name in the lobby and the way to the room, with no printed boards.' },
        { title: 'Services and hours', body: 'Breakfast, spa, pool and restaurant — when they open and where they are, in several languages.' },
        { title: 'Weather, flights, nearby', body: 'Forecast, departures and arrivals, and what to see close by, refreshed automatically.' },
      ],
      benefits: [
        'Fewer repeat questions at the desk',
        'Content in the guest’s language',
        'A place to sell your own services',
      ],
      faq: [
        {
          q: 'Can content run in several languages?',
          a: 'Yes. A screen can cycle through languages, or different screens around the hotel can each show a different one.',
        },
        {
          q: 'Can it show flight arrivals?',
          a: 'Yes, refreshed automatically — useful in the lobby and the transfer area.',
        },
        {
          q: 'Can we promote the spa or the restaurant?',
          a: 'Yes. Your own offers alternate with useful information, so the promotion never feels pushy.',
        },
      ],
    },
  },
  {
    slug: 'gyms',
    srSlug: 'teretane',
    icon: 'dumbbell',
    order: 60,
    sr: {
      name: 'Teretane',
      tagline:
        'Raspored koji je uvek tačan i članovi koji ga zaista vide. Grupni treninzi, izmene termina, motivacija i najave — u sali i na recepciji.',
      title: 'Raspored treninga koji niko ne mora da traži.',
      subtitle:
        'Štampani raspored zastari čim se jedan termin pomeri. Ekran se menja u trenutku, a član vidi tačno stanje pre nego što pita.',
      metaTitle: 'Digitalni ekrani za teretane i fitnes centre',
      metaDescription:
        'Ekrani za teretane: raspored grupnih treninga uživo, izmene termina u trenutku, najave i motivacioni sadržaj u sali i na recepciji.',
      scenarios: [
        { title: 'Raspored grupnih treninga', body: 'Šta je sledeće, u kojoj sali i sa kojim trenerom — uvek aktuelno.' },
        { title: 'Izmene i zamene', body: 'Otkazan termin ili zamena trenera vide se odmah, bez poruka u grupi.' },
        { title: 'Članarine i motivacija', body: 'Paketi, izazovi meseca i rezultati članova, u pauzi između serija.' },
      ],
      benefits: [
        'Raspored koji je uvek tačan',
        'Manje pitanja na recepciji',
        'Prostor za promociju paketa i izazova',
      ],
      faq: [
        {
          q: 'Možemo li da povučemo raspored iz tabele?',
          a: 'Da. Google Sheets ili Excel se učitavaju direktno, pa raspored menjate tamo gde ste navikli.',
        },
        {
          q: 'Kako izgleda otkazivanje termina?',
          a: 'Izmena u izvoru se vidi na ekranima za nekoliko sekundi, na svim uređajima u objektu.',
        },
        {
          q: 'Radi li na više lokacija?',
          a: 'Da. Svaka lokacija može imati svoj raspored, uz zajedničke najave za celu mrežu.',
        },
      ],
    },
    en: {
      name: 'Gyms',
      tagline:
        'A schedule that is always right, and members who actually see it. Group classes, time changes, motivation and announcements — on the floor and at the desk.',
      title: 'A class schedule nobody has to go looking for.',
      subtitle:
        'A printed timetable is out of date the moment one class moves. A screen changes instantly, and members see the truth before they ask.',
      metaTitle: 'Digital signage for gyms and fitness clubs',
      metaDescription:
        'Screens for gyms: live group-class schedules, instant timetable changes, announcements and motivation on the floor and at reception.',
      scenarios: [
        { title: 'Class schedule', body: 'What’s next, in which studio and with which trainer — always current.' },
        { title: 'Changes and cover', body: 'A canceled class or a stand-in trainer shows immediately, with no group chat needed.' },
        { title: 'Memberships and motivation', body: 'Packages, the month’s challenge and member results, read between sets.' },
      ],
      benefits: [
        'A schedule that is always correct',
        'Fewer questions at the desk',
        'Room to promote packages and challenges',
      ],
      faq: [
        {
          q: 'Can we pull the schedule from a spreadsheet?',
          a: 'Yes. Google Sheets or Excel load directly, so you edit the timetable where you already do.',
        },
        {
          q: 'What does cancelling a class look like?',
          a: 'A change at the source reaches every screen in the club within seconds.',
        },
        {
          q: 'Does it work across several clubs?',
          a: 'Yes. Each location can run its own schedule alongside announcements shared across the network.',
        },
      ],
    },
  },
  {
    slug: 'education',
    srSlug: 'obrazovanje',
    icon: 'graduation-cap',
    order: 70,
    sr: {
      name: 'Obrazovanje',
      tagline:
        'Raspored, izmene i obaveštenja koja stignu do đaka i studenata na vreme. Ekrani u holu i hodnicima nose ono što se do sada gubilo na oglasnoj tabli.',
      title: 'Škola u kojoj svi znaju šta je danas.',
      subtitle:
        'Zamena časa objavljena u zbornici ne stigne do đaka. Ekran u holu je jedino mesto koje svi prođu i svi pogledaju.',
      metaTitle: 'Digitalni ekrani za škole i fakultete',
      metaDescription:
        'Ekrani za obrazovne ustanove: raspored časova i zamene, obaveštenja, ispitni rokovi, dešavanja i rezultati — vidljivo svima u holu i hodnicima.',
      scenarios: [
        { title: 'Raspored i zamene', body: 'Časovi, sale i zamene nastavnika, izmenjeni u trenutku kada se odluka donese.' },
        { title: 'Obaveštenja i rokovi', body: 'Ispitni rokovi, prijave i podsetnici, umesto papira koji se otkine sa table.' },
        { title: 'Život ustanove', body: 'Takmičenja, priredbe i uspesi učenika — razlog da se zastane i pogleda.' },
      ],
      benefits: [
        'Obaveštenje koje stvarno stigne',
        'Manje gužve oko oglasne table',
        'Prostor za isticanje uspeha',
      ],
      faq: [
        {
          q: 'Ko može da objavljuje sadržaj?',
          a: 'Vi određujete. Sekretarijat može da drži zvanična obaveštenja, a profesor ili đačka organizacija samo svoju sekciju.',
        },
        {
          q: 'Može li da prikaže raspored iz našeg sistema?',
          a: 'Da, ako je dostupan kao tabela ili web stranica — učitava se direktno i osvežava sam.',
        },
        {
          q: 'Koliko ekrana obično treba školi?',
          a: 'Najčešće se počinje sa jednim u glavnom holu, pa se dodaju hodnici i zbornica kada se navika uhvati.',
        },
      ],
    },
    en: {
      name: 'Education',
      tagline:
        'Timetables, changes and notices that reach students in time. Screens in the hall and corridors carry what used to get lost on a noticeboard.',
      title: 'A school where everyone knows what’s on today.',
      subtitle:
        'A cover lesson announced in the staff room never reaches the students. The screen in the hall is the one place everyone walks past and everyone reads.',
      metaTitle: 'Digital signage for schools and universities',
      metaDescription:
        'Screens for education: timetables and cover lessons, notices, exam dates, events and results — visible to everyone in halls and corridors.',
      scenarios: [
        { title: 'Timetables and cover', body: 'Lessons, rooms and staff changes, updated the moment the decision is made.' },
        { title: 'Notices and deadlines', body: 'Exam dates, sign-ups and reminders, instead of paper torn off a board.' },
        { title: 'Life of the school', body: 'Competitions, performances and student achievements — a reason to stop and look.' },
      ],
      benefits: [
        'Notices that actually arrive',
        'No crowd around the noticeboard',
        'A place to celebrate achievement',
      ],
      faq: [
        {
          q: 'Who can publish content?',
          a: 'You decide. The office can own official notices while a teacher or student body edits only their own section.',
        },
        {
          q: 'Can it show the timetable from our system?',
          a: 'Yes, if it is available as a spreadsheet or a web page — it loads directly and refreshes on its own.',
        },
        {
          q: 'How many screens does a school usually need?',
          a: 'Most start with one in the main hall, then add corridors and the staff room once the habit takes.',
        },
      ],
    },
  },
  {
    slug: 'banking',
    srSlug: 'banke-i-finansije',
    icon: 'landmark',
    order: 80,
    sr: {
      name: 'Banke i finansije',
      tagline:
        'Kursna lista koja je uvek tačna i ponude koje klijent stigne da pročita dok čeka. Ekspozitura u kojoj čekanje radi za vas, a ne protiv vas.',
      title: 'Ekspozitura u kojoj čekanje nije izgubljeno vreme.',
      subtitle:
        'Klijent u redu ionako gleda oko sebe. Kursna lista, uslovi kredita i digitalni servisi na ekranu pretvaraju to u priliku.',
      metaTitle: 'Digitalni ekrani za banke i menjačnice',
      metaDescription:
        'Ekrani za banke i finansijske ekspoziture: kursna lista uživo, uslovi kredita i štednje, redovi na šalteru i promocija digitalnih servisa.',
      scenarios: [
        { title: 'Kursna lista', body: 'Kursevi osveženi automatski, bez ručnog prekucavanja i bez greške u broju.' },
        { title: 'Proizvodi i uslovi', body: 'Krediti, štednja i naknade objašnjeni jasno, dok klijent ima vremena da čita.' },
        { title: 'Red i usmeravanje', body: 'Koji broj je na redu i na kom šalteru, da se red kreće bez pitanja.' },
      ],
      benefits: [
        'Kursna lista bez ručnog unosa',
        'Vreme čekanja iskorišćeno za informisanje',
        'Ista poruka u svim ekspoziturama',
      ],
      faq: [
        {
          q: 'Odakle dolaze kursevi?',
          a: 'Iz izvora koji vi odredite — vaše interne tabele ili javnog izvora — uz automatsko osvežavanje.',
        },
        {
          q: 'Možemo li da razlikujemo sadržaj po ekspozituri?',
          a: 'Da. Zajednička kampanja ide svima, a lokalne informacije samo tamo gde su relevantne.',
        },
        {
          q: 'Kako se kontroliše ko šta objavljuje?',
          a: 'Kroz uloge i dozvole — objavljivanje može da zahteva odobrenje pre nego što izađe na ekran.',
        },
      ],
    },
    en: {
      name: 'Banking',
      tagline:
        'Exchange rates that are always right, and offers a client has time to read while waiting. A branch where the queue works for you rather than against you.',
      title: 'A branch where waiting isn’t wasted time.',
      subtitle:
        'A client in the queue is already looking around. Rates, loan terms and digital services on screen turn that into an opportunity.',
      metaTitle: 'Digital signage for banks and exchange offices',
      metaDescription:
        'Screens for bank branches: live exchange rates, loan and savings terms, counter queues and promotion of digital services.',
      scenarios: [
        { title: 'Exchange rates', body: 'Rates refreshed automatically, with no retyping and no wrong digit.' },
        { title: 'Products and terms', body: 'Loans, savings and fees explained clearly, while the client has time to read.' },
        { title: 'Queue and wayfinding', body: 'Which number is up and at which counter, so the queue moves without questions.' },
      ],
      benefits: [
        'Rates without manual entry',
        'Waiting time turned into information',
        'One message across every branch',
      ],
      faq: [
        {
          q: 'Where do the rates come from?',
          a: 'From a source you choose — your own internal sheet or a public feed — refreshed automatically.',
        },
        {
          q: 'Can content differ per branch?',
          a: 'Yes. A shared campaign goes to everyone, while local information appears only where it is relevant.',
        },
        {
          q: 'How is publishing controlled?',
          a: 'Through roles and permissions — publishing can require approval before anything reaches a screen.',
        },
      ],
    },
  },
  {
    slug: 'pharmacy',
    srSlug: 'apoteke',
    icon: 'pill',
    order: 90,
    sr: {
      name: 'Apoteke',
      tagline:
        'Saveti, sezonske akcije i dežurstva na jednom mestu. Ekran koji informiše dok se čeka na red i preuzima deo posla sa farmaceuta.',
      title: 'Apoteka koja savetuje i kad je gužva.',
      subtitle:
        'Farmaceut ne stigne da svakom objasni isto pitanje. Ekran preuzima ponavljajuće savete i oslobađa vreme za ono što je zaista stručno.',
      metaTitle: 'Digitalni ekrani za apoteke',
      metaDescription:
        'Ekrani za apoteke: zdravstveni saveti, sezonske akcije i promocije, radno vreme i dežurstva, uz jasnu poruku dok se čeka na red.',
      scenarios: [
        { title: 'Zdravstveni saveti', body: 'Sezonske teme — alergije, imunitet, sunce — objašnjene kratko i tačno.' },
        { title: 'Akcije i preporuke', body: 'Ponuda meseca i preporučeni proizvodi, uz cenu koja se menja bez štampe.' },
        { title: 'Radno vreme i dežurstva', body: 'Ko je dežuran i do kada, uključujući praznike i vikende.' },
      ],
      benefits: [
        'Manje ponavljajućih pitanja',
        'Sezonske teme uvek na vreme',
        'Jasno istaknuta dežurstva',
      ],
      faq: [
        {
          q: 'Možemo li da pripremimo sadržaj unapred?',
          a: 'Da. Sezonske teme se zakazuju mesecima unapred i pale se same na datum koji odredite.',
        },
        {
          q: 'Da li ekran mora da bude velik?',
          a: 'Ne. Manji ekran iznad pulta često radi bolje od velikog na zidu, jer je u liniji pogleda.',
        },
        {
          q: 'Radi li za lanac apoteka?',
          a: 'Da. Centrala drži zajedničke kampanje, a svaka apoteka svoje radno vreme i dežurstva.',
        },
      ],
    },
    en: {
      name: 'Pharmacies',
      tagline:
        'Advice, seasonal offers and duty hours in one place. A screen that informs while people wait and takes repetitive work off the pharmacist.',
      title: 'A pharmacy that still advises when it’s busy.',
      subtitle:
        'A pharmacist can’t answer the same question for everyone. A screen takes the repeatable advice and frees the counter for what genuinely needs expertise.',
      metaTitle: 'Digital signage for pharmacies',
      metaDescription:
        'Screens for pharmacies: health advice, seasonal offers and promotions, opening hours and duty rotas — clear while customers wait.',
      scenarios: [
        { title: 'Health advice', body: 'Seasonal topics — allergies, immunity, sun care — explained briefly and accurately.' },
        { title: 'Offers and picks', body: 'The month’s offer and recommended products, with prices that change without printing.' },
        { title: 'Hours and duty rota', body: 'Who is on duty and until when, holidays and weekends included.' },
      ],
      benefits: [
        'Fewer repeat questions',
        'Seasonal topics always on time',
        'Duty hours clearly displayed',
      ],
      faq: [
        {
          q: 'Can we prepare content in advance?',
          a: 'Yes. Seasonal topics can be scheduled months ahead and switch themselves on at the date you set.',
        },
        {
          q: 'Does the screen need to be large?',
          a: 'No. A smaller screen above the counter often works better than a big one on the wall, because it sits in the line of sight.',
        },
        {
          q: 'Does it work for a pharmacy chain?',
          a: 'Yes. Head office owns shared campaigns while each pharmacy keeps its own hours and duty rota.',
        },
      ],
    },
  },
  {
    slug: 'automotive',
    srSlug: 'auto-industrija',
    icon: 'car',
    order: 100,
    sr: {
      name: 'Auto industrija',
      tagline:
        'Modeli, uslovi finansiranja i status servisa na ekranima u salonu i prijemu. Kupac koji čeka dobija razlog da gleda upravo vašu ponudu.',
      title: 'Salon i servis koji rade dok kupac čeka.',
      subtitle:
        'Odluka o kupovini automobila traje nedeljama. Ekran u salonu drži ponudu, uslove i modele pred očima baš u trenucima kada kupac razmišlja.',
      metaTitle: 'Digitalni ekrani za auto salone i servise',
      metaDescription:
        'Ekrani za auto industriju: prikaz modela i opreme, uslovi finansiranja i lizinga, status vozila u servisu i akcije u salonu.',
      scenarios: [
        { title: 'Modeli i oprema', body: 'Galerija modela, paketi opreme i cene, prikazani u punom formatu na velikom ekranu.' },
        { title: 'Finansiranje', body: 'Rate, lizing i akcije objašnjene brojkama koje se menjaju bez novog kataloga.' },
        { title: 'Servis i prijem', body: 'Status vozila i procena završetka, da klijent ne mora da zove i pita.' },
      ],
      benefits: [
        'Ponuda vidljiva dok kupac razmišlja',
        'Uslovi bez zastarelog kataloga',
        'Mirniji prijem u servisu',
      ],
      faq: [
        {
          q: 'Možemo li da prikazujemo video materijal proizvođača?',
          a: 'Da. Video se pušta lokalno ili sa stream izvora, u punoj rezoluciji i bez oglasa.',
        },
        {
          q: 'Da li može da povuče stanje iz našeg sistema?',
          a: 'Da, ako je dostupno kao tabela ili web stranica — prikazuje se direktno i osvežava sam.',
        },
        {
          q: 'Radi li na velikim ekranima u izlogu?',
          a: 'Da, uključujući vertikalne i spojene ekrane, uz podešavanje osvetljenja za dnevnu svetlost.',
        },
      ],
    },
    en: {
      name: 'Automotive',
      tagline:
        'Models, finance terms and service status on screens in the showroom and at the service desk. A waiting customer gets a reason to look at your offer.',
      title: 'A showroom and workshop that work while the customer waits.',
      subtitle:
        'Buying a car takes weeks to decide. A screen in the showroom keeps the range, the terms and the models in view exactly when the customer is weighing them up.',
      metaTitle: 'Digital signage for dealerships and workshops',
      metaDescription:
        'Screens for automotive: model and trim displays, finance and leasing terms, vehicle service status and showroom promotions.',
      scenarios: [
        { title: 'Models and trims', body: 'A model gallery, trim packages and prices, shown full-size on a large screen.' },
        { title: 'Finance', body: 'Instalments, leasing and offers explained with numbers that change without a new brochure.' },
        { title: 'Service desk', body: 'Vehicle status and estimated completion, so the customer doesn’t have to call and ask.' },
      ],
      benefits: [
        'The offer visible while the customer decides',
        'Terms without an out-of-date brochure',
        'A calmer service reception',
      ],
      faq: [
        {
          q: 'Can we show manufacturer video?',
          a: 'Yes. Video plays locally or from a stream, at full resolution and with no advertising.',
        },
        {
          q: 'Can it pull status from our system?',
          a: 'Yes, if it is available as a spreadsheet or a web page — it renders directly and refreshes itself.',
        },
        {
          q: 'Does it work on large window displays?',
          a: 'Yes, including portrait and video-wall setups, with brightness tuned for daylight.',
        },
      ],
    },
  },
  {
    slug: 'real-estate',
    srSlug: 'nekretnine',
    icon: 'key-round',
    order: 110,
    sr: {
      name: 'Nekretnine',
      tagline:
        'Ponuda u izlogu koja se menja istog dana kad se stan proda. Fotografije, cene i kvadrature uvek tačne, i po danu i po noći.',
      title: 'Izlog koji nikad ne prikazuje prodat stan.',
      subtitle:
        'Odštampan oglas u izlogu stoji dok ga neko ne skine. Ekran skida prodatu nekretninu istog trenutka i pušta sledeću.',
      metaTitle: 'Digitalni ekrani za agencije za nekretnine',
      metaDescription:
        'Ekrani za agencije za nekretnine: ponuda u izlogu sa fotografijama, cenama i kvadraturama, ažurirana istog dana i vidljiva 24 sata.',
      scenarios: [
        { title: 'Ponuda u izlogu', body: 'Fotografije, cena, kvadratura i lokacija, u rotaciji koja radi i kad je agencija zatvorena.' },
        { title: 'Novo i sniženo', body: 'Nove nekretnine i korekcije cena istaknute odmah, bez novog štampanja.' },
        { title: 'Poverenje i tim', body: 'Reference, prodati objekti i lica iz tima — ono što odlučuje kome se javlja.' },
      ],
      benefits: [
        'Nema prodatih nekretnina u izlogu',
        'Vidljivost i van radnog vremena',
        'Bez troška štampe oglasa',
      ],
      faq: [
        {
          q: 'Možemo li da povučemo ponudu iz naše baze?',
          a: 'Da, ako je dostupna kao tabela ili web stranica — ekran je onda uvek u koraku sa sistemom.',
        },
        {
          q: 'Vidi li se ekran po dnevnoj svetlosti u izlogu?',
          a: 'Za izlog se koriste ekrani visoke svetline; softver na njima radi isto kao na običnom televizoru.',
        },
        {
          q: 'Može li da radi noću?',
          a: 'Da. Zakazuje se paljenje i gašenje, pa ekran radi baš u satima kada ima prolaznika.',
        },
      ],
    },
    en: {
      name: 'Real estate',
      tagline:
        'A window display that changes the day a property sells. Photos, prices and floor areas always correct, by day and by night.',
      title: 'A window that never shows a sold property.',
      subtitle:
        'A printed listing stays in the window until somebody takes it down. A screen removes a sold property the moment it goes and moves the next one up.',
      metaTitle: 'Digital signage for estate agencies',
      metaDescription:
        'Screens for estate agents: window displays with photos, prices and floor areas, updated the same day and visible around the clock.',
      scenarios: [
        { title: 'Window listings', body: 'Photos, price, floor area and location, rotating even when the office is closed.' },
        { title: 'New and reduced', body: 'New properties and price corrections highlighted at once, with nothing reprinted.' },
        { title: 'Trust and team', body: 'References, completed sales and the faces behind them — what decides who gets the call.' },
      ],
      benefits: [
        'No sold properties left in the window',
        'Visible outside opening hours',
        'No printing costs for listings',
      ],
      faq: [
        {
          q: 'Can we pull listings from our database?',
          a: 'Yes, if they are available as a spreadsheet or a web page — the screen then stays in step with your system.',
        },
        {
          q: 'Is a window screen readable in daylight?',
          a: 'Window installations use high-brightness displays; the software runs on them exactly as it does on an ordinary TV.',
        },
        {
          q: 'Can it run at night?',
          a: 'Yes. Power on and off are scheduled, so the screen runs during the hours that actually have passers-by.',
        },
      ],
    },
  },
  {
    slug: 'salons',
    srSlug: 'saloni-lepote',
    icon: 'scissors',
    order: 120,
    sr: {
      name: 'Saloni lepote',
      tagline:
        'Cenovnik koji se menja bez novog štampanja i usluge koje klijent otkrije dok čeka. Mali ekran koji tiho prodaje dodatne tretmane.',
      title: 'Cenovnik i ponuda koji rade umesto vas.',
      subtitle:
        'Klijent u stolici ima petnaest minuta i ništa da radi. To je najbolji trenutak da sazna za tretman za koji nije znao da ga nudite.',
      metaTitle: 'Digitalni ekrani za frizerske i kozmetičke salone',
      metaDescription:
        'Ekrani za salone lepote: digitalni cenovnik, promocija tretmana i paketa, radovi iz salona i slobodni termini — bez ponovnog štampanja.',
      scenarios: [
        { title: 'Digitalni cenovnik', body: 'Usluge i cene koje menjate iz telefona, bez novog štampanja i precrtavanja.' },
        { title: 'Tretmani i paketi', body: 'Ono što klijent ne zna da nudite, prikazano baš dok ima vremena da razmisli.' },
        { title: 'Radovi i termini', body: 'Fotografije radova iz salona i slobodni termini za ovu nedelju.' },
      ],
      benefits: [
        'Cenovnik bez ponovnog štampanja',
        'Prodaja dodatnih tretmana',
        'Popunjeni prazni termini',
      ],
      faq: [
        {
          q: 'Treba li nam veliki ekran?',
          a: 'Ne. Jedan manji ekran u zoni čekanja ili nasuprot stolice obično je sasvim dovoljan.',
        },
        {
          q: 'Možemo li da prikazujemo fotografije radova?',
          a: 'Da, uključujući objave sa Instagrama, tako da se sadržaj obnavlja bez dodatnog posla.',
        },
        {
          q: 'Koliko traje postavljanje?',
          a: 'Uređaj se upari za nekoliko minuta, a prvi cenovnik se napravi isto tako brzo.',
        },
      ],
    },
    en: {
      name: 'Salons',
      tagline:
        'A price list that changes without reprinting, and treatments clients discover while they wait. A small screen that quietly sells the add-on.',
      title: 'A price list and an offer that work for you.',
      subtitle:
        'A client in the chair has fifteen minutes and nothing to do. That is the best moment to learn about a treatment they didn’t know you offered.',
      metaTitle: 'Digital signage for hair and beauty salons',
      metaDescription:
        'Screens for salons: digital price lists, treatment and package promotion, portfolio work and free appointment slots — with no reprinting.',
      scenarios: [
        { title: 'Digital price list', body: 'Services and prices you edit from your phone, with nothing reprinted or crossed out.' },
        { title: 'Treatments and packages', body: 'What clients don’t know you offer, shown exactly when they have time to consider it.' },
        { title: 'Portfolio and slots', body: 'Photos of work from the salon and the free appointments left this week.' },
      ],
      benefits: [
        'A price list with no reprinting',
        'More add-on treatments sold',
        'Empty slots filled',
      ],
      faq: [
        {
          q: 'Do we need a big screen?',
          a: 'No. One smaller screen in the waiting area or facing the chair is usually plenty.',
        },
        {
          q: 'Can we show photos of our work?',
          a: 'Yes, including Instagram posts, so the content refreshes itself with no extra work.',
        },
        {
          q: 'How long does setup take?',
          a: 'A device pairs in a couple of minutes, and the first price list takes about as long to build.',
        },
      ],
    },
  },
  {
    slug: 'bakeries',
    srSlug: 'pekare',
    icon: 'croissant',
    order: 130,
    sr: {
      name: 'Pekare',
      tagline:
        'Ponuda koja se menja tri puta dnevno, koliko i sama pekara. Ujutru pecivo, u podne obroci, uveče ono što je ostalo — bez ijedne nalepnice.',
      title: 'Ekran iznad pulta koji prati tempo pekare.',
      subtitle:
        'Ponuda u pekari se menja brže nego bilo gde. Ekran to prati sam, po satnici koju postavite jednom.',
      metaTitle: 'Digitalni ekrani za pekare',
      metaDescription:
        'Ekrani za pekare: ponuda i cene iznad pulta, jutarnja i popodnevna karta, akcije na kraju dana i alergeni — bez štampanja i nalepnica.',
      scenarios: [
        { title: 'Ponuda po satima', body: 'Jutarnji asortiman, podnevni obroci i večernja akcija, smenjeni automatski.' },
        { title: 'Cene i alergeni', body: 'Tačna cena i obavezne informacije o alergenima, čitljivo i uvek aktuelno.' },
        { title: 'Ono što je toplo', body: 'Šta je upravo izašlo iz pećnice — informacija koja najbrže pokreće kupovinu.' },
      ],
      benefits: [
        'Ponuda koja prati smenu',
        'Nema nalepnica preko cena',
        'Brža odluka u redu',
      ],
      faq: [
        {
          q: 'Može li ponuda da se menja automatski po satu?',
          a: 'Da. Postavite satnicu jednom i ekran sam prelazi sa jutarnje na podnevnu i večernju ponudu.',
        },
        {
          q: 'Kako prikazujemo alergene?',
          a: 'Kao deo iste kartice proizvoda, tako da informacija stoji uz cenu i ne može da se izgubi.',
        },
        {
          q: 'Da li radi u vlažnom i toplom prostoru?',
          a: 'Ekran birate po prostoru; softver radi na svakom televizoru ili monitoru koji izaberete.',
        },
      ],
    },
    en: {
      name: 'Bakeries',
      tagline:
        'An offer that changes three times a day, as the bakery does. Pastries in the morning, meals at noon, what’s left in the evening — without a single sticker.',
      title: 'A screen above the counter that keeps the bakery’s pace.',
      subtitle:
        'A bakery’s offer changes faster than almost anywhere. The screen keeps up on its own, on a schedule you set once.',
      metaTitle: 'Digital signage for bakeries',
      metaDescription:
        'Screens for bakeries: counter menus and prices, morning and afternoon ranges, end-of-day offers and allergen information — no printing, no stickers.',
      scenarios: [
        { title: 'Offer by the hour', body: 'The morning range, midday meals and the evening offer, switching automatically.' },
        { title: 'Prices and allergens', body: 'The right price and the required allergen information, legible and always current.' },
        { title: 'What’s just out', body: 'What has come out of the oven — the fastest thing there is to move a queue.' },
      ],
      benefits: [
        'An offer that follows the shift',
        'No stickers over prices',
        'Faster decisions in the queue',
      ],
      faq: [
        {
          q: 'Can the offer change automatically by hour?',
          a: 'Yes. Set the schedule once and the screen moves from the morning to the midday and evening range on its own.',
        },
        {
          q: 'How do we show allergens?',
          a: 'As part of the same product card, so the information sits beside the price and can’t get separated from it.',
        },
        {
          q: 'Does it work in a warm, humid room?',
          a: 'You choose the display to suit the space; the software runs on whichever TV or monitor you pick.',
        },
      ],
    },
  },
  {
    slug: 'cinema',
    srSlug: 'bioskopi-i-zabava',
    icon: 'clapperboard',
    order: 140,
    sr: {
      name: 'Bioskopi i zabava',
      tagline:
        'Repertoar, termini i najave koji se menjaju svake nedelje bez ijednog odštampanog plakata. Foaje koji izgleda kao deo filma, a ne kao oglasna tabla.',
      title: 'Repertoar koji se menja brže od plakata.',
      subtitle:
        'Novi termini svake srede, rasprodate projekcije i najave koje treba skloniti — sve to ekran radi sam, dok se plakat još štampa.',
      metaTitle: 'Digitalni ekrani za bioskope i zabavne sadržaje',
      metaDescription:
        'Ekrani za bioskope: repertoar i termini, najave i trejleri, statusi rasprodatih projekcija i ponuda iz kafea — ažurirano bez štampe.',
      scenarios: [
        { title: 'Repertoar i termini', body: 'Šta se igra danas i sutra, sa terminima koji se menjaju bez novog plakata.' },
        { title: 'Najave i trejleri', body: 'Video najave u punoj rezoluciji, tamo gde publika ionako čeka.' },
        { title: 'Ponuda i dodaci', body: 'Kokice, paketi i članske pogodnosti, prikazani baš u redu ispred kase.' },
      ],
      benefits: [
        'Repertoar bez štampe plakata',
        'Video najave u punom kvalitetu',
        'Veća prodaja iz kafea',
      ],
      faq: [
        {
          q: 'Može li da prikaže rasprodate projekcije?',
          a: 'Da, ako podaci dolaze iz tabele ili web izvora — status se onda menja sam.',
        },
        {
          q: 'Kako se pušta video najava?',
          a: 'Lokalno ili sa stream izvora, u punoj rezoluciji i bez oglasa ispred sadržaja.',
        },
        {
          q: 'Radi li na više ekrana u foajeu?',
          a: 'Da. Svaki ekran može imati svoju ulogu — repertoar, najave ili ponuda iz kafea.',
        },
      ],
    },
    en: {
      name: 'Cinema & entertainment',
      tagline:
        'Listings, showtimes and trailers that change every week with no printed poster. A foyer that looks like part of the film, not like a noticeboard.',
      title: 'Listings that change faster than a poster can print.',
      subtitle:
        'New showtimes every Wednesday, sold-out screenings and trailers to pull — the screen handles all of it while the poster is still at the printer.',
      metaTitle: 'Digital signage for cinemas and venues',
      metaDescription:
        'Screens for cinemas: listings and showtimes, trailers, sold-out status and concession offers — updated without printing.',
      scenarios: [
        { title: 'Listings and times', body: 'What’s on today and tomorrow, with showtimes that change without a new poster.' },
        { title: 'Trailers', body: 'Full-resolution video where the audience is already waiting.' },
        { title: 'Concessions', body: 'Popcorn, bundles and member perks, shown right in the queue at the till.' },
      ],
      benefits: [
        'Listings without printed posters',
        'Trailers at full quality',
        'Higher concession sales',
      ],
      faq: [
        {
          q: 'Can it show sold-out screenings?',
          a: 'Yes, if the data comes from a spreadsheet or a web source — the status then updates itself.',
        },
        {
          q: 'How does trailer playback work?',
          a: 'Locally or from a stream, at full resolution and with no pre-roll advertising.',
        },
        {
          q: 'Does it run on several foyer screens?',
          a: 'Yes. Each screen can have its own role — listings, trailers or concessions.',
        },
      ],
    },
  },
  {
    slug: 'transport',
    srSlug: 'saobracaj-i-terminali',
    icon: 'bus',
    order: 150,
    sr: {
      name: 'Saobraćaj i terminali',
      tagline:
        'Polasci, peroni i kašnjenja koji se menjaju u trenutku. Putnik koji vidi tačnu informaciju ne pravi red na šalteru.',
      title: 'Informacija koja stigne pre nego što putnik pita.',
      subtitle:
        'Na stanici sve zavisi od jednog broja — kada i sa kog perona. Ekran ga drži tačnim, i onda kada se sve pomeri.',
      metaTitle: 'Digitalni ekrani za stanice i terminale',
      metaDescription:
        'Ekrani za saobraćaj: polasci i dolasci, peroni i kašnjenja, obaveštenja o izmenama i informacije za putnike u realnom vremenu.',
      scenarios: [
        { title: 'Polasci i dolasci', body: 'Vreme, linija i peron, osveženo automatski iz izvora koji već koristite.' },
        { title: 'Izmene i kašnjenja', body: 'Kašnjenje i promena perona vidljivi odmah, na svim ekranima u objektu.' },
        { title: 'Uputstva i sigurnost', body: 'Smerovi, pravila i hitna obaveštenja koja preuzimaju ceo ekran kada treba.' },
      ],
      benefits: [
        'Manje gužve na šalteru',
        'Izmene vidljive u trenutku',
        'Hitna poruka na svim ekranima odjednom',
      ],
      faq: [
        {
          q: 'Odakle dolaze podaci o polascima?',
          a: 'Iz vašeg sistema, tabele ili web izvora — prikazuju se direktno i osvežavaju sami.',
        },
        {
          q: 'Šta ako uređaj izgubi vezu?',
          a: 'Nastavlja da prikazuje poslednje preuzeto stanje i sam se vraća čim se veza uspostavi.',
        },
        {
          q: 'Može li ekran da radi 24 sata?',
          a: 'Da. Plejer je napravljen za neprekidan rad, uz nadzor koji ga sam ponovo pokreće ako zatreba.',
        },
      ],
    },
    en: {
      name: 'Transport & terminals',
      tagline:
        'Departures, platforms and delays that change the moment they change. A passenger who can see the right number doesn’t queue at the desk.',
      title: 'Information that arrives before the passenger asks.',
      subtitle:
        'At a station everything rides on one number — when, and from which platform. The screen keeps it true, including when everything shifts.',
      metaTitle: 'Digital signage for stations and terminals',
      metaDescription:
        'Screens for transport: departures and arrivals, platforms and delays, service change notices and real-time passenger information.',
      scenarios: [
        { title: 'Departures and arrivals', body: 'Time, service and platform, refreshed automatically from the source you already use.' },
        { title: 'Delays and changes', body: 'A delay or platform change visible at once, on every screen in the building.' },
        { title: 'Wayfinding and safety', body: 'Directions, rules and emergency notices that take over the full screen when they need to.' },
      ],
      benefits: [
        'Shorter queues at the desk',
        'Changes visible instantly',
        'One emergency message on every screen',
      ],
      faq: [
        {
          q: 'Where does departure data come from?',
          a: 'From your own system, a spreadsheet or a web source — rendered directly and refreshed on its own.',
        },
        {
          q: 'What if a device loses connection?',
          a: 'It keeps showing the last state it downloaded and recovers by itself as soon as the link is back.',
        },
        {
          q: 'Can a screen run 24 hours?',
          a: 'Yes. The player is built for continuous operation, with a watchdog that restarts it if anything stalls.',
        },
      ],
    },
  },
  {
    slug: 'manufacturing',
    srSlug: 'proizvodnja',
    icon: 'factory',
    order: 160,
    sr: {
      name: 'Proizvodnja',
      tagline:
        'Učinak smene, zastoji i pravila bezbednosti tamo gde se radi. Ekran u hali nosi brojeve koje niko neće otvarati na računaru.',
      title: 'Brojevi smene na mestu gde se smena odvija.',
      subtitle:
        'Izveštaj koji stoji u sistemu ne menja ponašanje. Isti broj na ekranu u hali menja ga svakog sata.',
      metaTitle: 'Digitalni ekrani za proizvodnju i magacine',
      metaDescription:
        'Ekrani za proizvodnju: učinak smene i ciljevi, zastoji i status linija, dani bez povrede i bezbednosna pravila — vidljivo u hali.',
      scenarios: [
        { title: 'Učinak i ciljevi', body: 'Plan protiv ostvarenog, po liniji i po smeni, osveženo automatski.' },
        { title: 'Zastoji i status', body: 'Šta stoji i koliko dugo — informacija koja skraćuje reakciju.' },
        { title: 'Bezbednost', body: 'Dani bez povrede, pravila i podsetnici, na jeziku svih smena.' },
      ],
      benefits: [
        'Brojevi vidljivi bez računara',
        'Brža reakcija na zastoj',
        'Bezbednosna pravila stalno pred očima',
      ],
      faq: [
        {
          q: 'Može li da prikaže podatke iz našeg MES ili ERP sistema?',
          a: 'Da, ako su dostupni kao web stranica ili tabela — prikazuju se direktno, uz automatsko osvežavanje.',
        },
        {
          q: 'Da li se vidi sa udaljenosti?',
          a: 'Prikaz se podešava za daljinu čitanja, sa krupnim brojevima i visokim kontrastom.',
        },
        {
          q: 'Radi li u prašnjavom okruženju?',
          a: 'Uređaj i ekran birate po uslovima u hali; softver ostaje isti bez obzira na hardver.',
        },
      ],
    },
    en: {
      name: 'Manufacturing',
      tagline:
        'Shift output, downtime and safety rules where the work happens. A screen on the floor carries the numbers nobody is going to open on a PC.',
      title: 'Shift numbers where the shift actually is.',
      subtitle:
        'A report sitting in a system changes nothing. The same number on a screen on the floor changes behaviour every hour.',
      metaTitle: 'Digital signage for manufacturing and warehouses',
      metaDescription:
        'Screens for manufacturing: shift output against target, downtime and line status, days without injury and safety rules — visible on the floor.',
      scenarios: [
        { title: 'Output and targets', body: 'Plan against actual, by line and by shift, refreshed automatically.' },
        { title: 'Downtime and status', body: 'What has stopped and for how long — the information that shortens response.' },
        { title: 'Safety', body: 'Days without injury, rules and reminders, in the language every shift reads.' },
      ],
      benefits: [
        'Numbers visible without a computer',
        'Faster response to a stoppage',
        'Safety rules permanently in view',
      ],
      faq: [
        {
          q: 'Can it show data from our MES or ERP?',
          a: 'Yes, if it is available as a web page or spreadsheet — it renders directly and refreshes on its own.',
        },
        {
          q: 'Is it readable from a distance?',
          a: 'Layouts are tuned for viewing distance, with large figures and high contrast.',
        },
        {
          q: 'Does it work in a dusty environment?',
          a: 'You choose the device and display to match the floor; the software is the same whatever the hardware.',
        },
      ],
    },
  },
  {
    slug: 'coworking',
    srSlug: 'koworking',
    icon: 'laptop',
    order: 170,
    sr: {
      name: 'Koworking',
      tagline:
        'Slobodne sale, dnevni događaji i pravila prostora bez ijednog papira na vratima. Prostor koji se objašnjava sam, i novom članu i gostu.',
      title: 'Prostor koji novi član razume iz prve.',
      subtitle:
        'U koworkingu se ljudi menjaju svakog dana. Ekran preuzima uvod u prostor koji biste inače ponavljali svakom ponaosob.',
      metaTitle: 'Digitalni ekrani za koworking prostore',
      metaDescription:
        'Ekrani za koworking: dostupnost sala za sastanke, dnevni događaji i radionice, pravila prostora i predstavljanje članova.',
      scenarios: [
        { title: 'Sale i dostupnost', body: 'Ko je u kojoj sali i do kada, ispred vrata i na centralnom ekranu.' },
        { title: 'Događaji dana', body: 'Radionice, meetup-ovi i gosti — razlog da se ostane duže.' },
        { title: 'Pravila i zajednica', body: 'Wi-Fi, tiha zona, kuhinja i predstavljanje novih članova.' },
      ],
      benefits: [
        'Manje pitanja na recepciji',
        'Bolja iskorišćenost sala',
        'Zajednica koja se vidi',
      ],
      faq: [
        {
          q: 'Može li da prikaže zauzetost sala iz kalendara?',
          a: 'Da — Google Calendar i Microsoft 365. Prikaz je isključivo za čitanje, rezervacije ostaju u vašem sistemu.',
        },
        {
          q: 'Treba li poseban ekran ispred svake sale?',
          a: 'Manji ekran ispred vrata radi najbolje, ali može i jedan centralni sa pregledom svih sala.',
        },
        {
          q: 'Mogu li članovi da objavljuju svoje događaje?',
          a: 'Da, ako im date pristup — uz odobrenje pre objave ako tako želite.',
        },
      ],
    },
    en: {
      name: 'Coworking',
      tagline:
        'Free rooms, the day’s events and house rules without a single sheet of paper on a door. A space that explains itself to new members and visitors alike.',
      title: 'A space a new member understands on the first pass.',
      subtitle:
        'In coworking the people change daily. A screen takes over the induction you would otherwise repeat to each of them.',
      metaTitle: 'Digital signage for coworking spaces',
      metaDescription:
        'Screens for coworking: meeting-room availability, daily events and workshops, house rules and member introductions.',
      scenarios: [
        { title: 'Rooms and availability', body: 'Who is in which room and until when, outside the door and on a central screen.' },
        { title: 'Today’s events', body: 'Workshops, meetups and guests — a reason to stay longer.' },
        { title: 'Rules and community', body: 'Wi-Fi, the quiet zone, the kitchen, and introductions for new members.' },
      ],
      benefits: [
        'Fewer questions at the desk',
        'Better room utilisation',
        'A community that is visible',
      ],
      faq: [
        {
          q: 'Can it show room bookings from a calendar?',
          a: 'Yes — Google Calendar and Microsoft 365. The display is read-only; bookings stay in your system.',
        },
        {
          q: 'Do we need a screen outside every room?',
          a: 'A small display by the door works best, but a single central screen listing all rooms also works.',
        },
        {
          q: 'Can members post their own events?',
          a: 'Yes, if you give them access — with approval before publishing if you prefer.',
        },
      ],
    },
  },
  {
    slug: 'veterinary',
    srSlug: 'veterina',
    icon: 'paw-print',
    order: 180,
    sr: {
      name: 'Veterina',
      tagline:
        'Saveti o nezi, raspored vakcinacija i mirnija čekaonica. Vlasnik koji ima šta da čita manje je nervozan — a takav je i njegov ljubimac.',
      title: 'Čekaonica u kojoj su i vlasnik i ljubimac mirniji.',
      subtitle:
        'Nervoza u veterinarskoj čekaonici prenosi se sa vlasnika na životinju. Ekran koji objašnjava i skreće pažnju smiruje obojicu.',
      metaTitle: 'Digitalni ekrani za veterinarske ambulante',
      metaDescription:
        'Ekrani za veterinarske ambulante: saveti o nezi i ishrani, raspored vakcinacija i preventive, radno vreme i dežurstva.',
      scenarios: [
        { title: 'Nega i preventiva', body: 'Vakcinacija, parazitska zaštita i ishrana — objašnjeno pre nego što se uđe u ordinaciju.' },
        { title: 'Usluge i cene', body: 'Šta ambulanta radi i koliko traje, bez neprijatnog pitanja na pultu.' },
        { title: 'Radno vreme i hitno', body: 'Dežurstva i broj za hitne slučajeve, uvek na vidljivom mestu.' },
      ],
      benefits: [
        'Mirnija čekaonica',
        'Manje pitanja o cenama',
        'Preventiva koja se stvarno pročita',
      ],
      faq: [
        {
          q: 'Da li ekran ometa životinje?',
          a: 'Sadržaj se prikazuje bez zvuka i bez naglih prelaza, pa deluje smirujuće umesto suprotno.',
        },
        {
          q: 'Možemo li da menjamo sadržaj po sezoni?',
          a: 'Da. Sezonske teme — krpelji, vrućine, vatromet — zakazuju se unapred i pale se same.',
        },
        {
          q: 'Koliko ekrana treba ambulanti?',
          a: 'Jedan u čekaonici je obično dovoljan; veće ambulante dodaju drugi na prijemu.',
        },
      ],
    },
    en: {
      name: 'Veterinary',
      tagline:
        'Care advice, vaccination schedules and a calmer waiting room. An owner with something to read is less anxious — and so is the animal with them.',
      title: 'A waiting room that settles owner and animal alike.',
      subtitle:
        'Anxiety in a vet’s waiting room travels from the owner to the animal. A screen that explains and distracts calms both.',
      metaTitle: 'Digital signage for veterinary practices',
      metaDescription:
        'Screens for veterinary clinics: care and nutrition advice, vaccination and prevention schedules, opening hours and emergency contacts.',
      scenarios: [
        { title: 'Care and prevention', body: 'Vaccination, parasite protection and diet — explained before the consult begins.' },
        { title: 'Services and prices', body: 'What the practice does and how long it takes, without an awkward question at the desk.' },
        { title: 'Hours and emergencies', body: 'Out-of-hours cover and the emergency number, always somewhere visible.' },
      ],
      benefits: [
        'A calmer waiting room',
        'Fewer questions about pricing',
        'Prevention advice that gets read',
      ],
      faq: [
        {
          q: 'Does the screen disturb the animals?',
          a: 'Content runs silent and without abrupt transitions, so it reads as calming rather than the opposite.',
        },
        {
          q: 'Can we change content by season?',
          a: 'Yes. Seasonal topics — ticks, heat, fireworks — are scheduled ahead and switch themselves on.',
        },
        {
          q: 'How many screens does a practice need?',
          a: 'One in the waiting room is usually enough; larger practices add a second at reception.',
        },
      ],
    },
  },
  {
    slug: 'supermarkets',
    srSlug: 'supermarketi',
    icon: 'shopping-cart',
    order: 190,
    sr: {
      name: 'Supermarketi',
      tagline:
        'Cene, akcije i informacije o poreklu robe na policama i kasama. Sistem koji podnese hiljade artikala i menja ih na svim objektima odjednom.',
      title: 'Akcija koja kreće u isto vreme u svakoj prodavnici.',
      subtitle:
        'Kada kampanja kreće u ponedeljak u šest, ekrani moraju da se prebace u šest — u svim objektima, bez ijednog telefonskog poziva.',
      metaTitle: 'Digitalni ekrani za supermarkete',
      metaDescription:
        'Ekrani za supermarkete: akcije i cene po odeljenjima, kampanje sinhronizovane na svim objektima, informacije o poreklu i sezonskoj ponudi.',
      scenarios: [
        { title: 'Akcije po odeljenjima', body: 'Različita poruka na mesu, u pekari i na voću — svaka tamo gde ima smisla.' },
        { title: 'Sinhronizovane kampanje', body: 'Start i kraj akcije u isti minut u svim objektima, zakazano unapred.' },
        { title: 'Poreklo i sezona', body: 'Odakle je roba i šta je sada u sezoni — informacija koja gradi poverenje.' },
      ],
      benefits: [
        'Kampanje bez ručnog obilaska objekata',
        'Manje grešaka u ceni na ekranu',
        'Poruka prilagođena odeljenju',
      ],
      faq: [
        {
          q: 'Koliko ekrana sistem podnosi?',
          a: 'Od jednog objekta do cele mreže. Ekrani se grupišu po objektu i odeljenju, pa se upravlja grupama a ne uređajima.',
        },
        {
          q: 'Možemo li da povučemo cene iz našeg sistema?',
          a: 'Da, ako su dostupne kao tabela ili web izvor — tada se cena na ekranu menja zajedno sa izvorom.',
        },
        {
          q: 'Šta ako jedan uređaj otkaže?',
          a: 'Vidite ga kao offline u kontrolnoj tabli, a plejer se sam ponovo pokreće i nastavlja gde je stao.',
        },
      ],
    },
    en: {
      name: 'Supermarkets',
      tagline:
        'Prices, promotions and provenance at the shelf and the till. A system that carries thousands of lines and changes them across every store at once.',
      title: 'A promotion that starts at the same minute in every store.',
      subtitle:
        'When a campaign starts at six on Monday, the screens have to turn at six — in every store, without a single phone call.',
      metaTitle: 'Digital signage for supermarkets',
      metaDescription:
        'Screens for supermarkets: aisle-level promotions and prices, campaigns synchronised across every store, provenance and seasonal information.',
      scenarios: [
        { title: 'Aisle-level offers', body: 'A different message at the butcher, the bakery and the produce aisle — each where it makes sense.' },
        { title: 'Synchronised campaigns', body: 'Start and end at the same minute across every store, scheduled ahead.' },
        { title: 'Provenance and season', body: 'Where the produce is from and what is in season now — information that builds trust.' },
      ],
      benefits: [
        'Campaigns without touring the stores',
        'Fewer wrong prices on screen',
        'A message tuned to each aisle',
      ],
      faq: [
        {
          q: 'How many screens can it handle?',
          a: 'From one store to a whole chain. Screens group by store and aisle, so you manage groups rather than devices.',
        },
        {
          q: 'Can we pull prices from our system?',
          a: 'Yes, if they are available as a spreadsheet or a web source — the shelf price then moves with the source.',
        },
        {
          q: 'What if one device fails?',
          a: 'You see it as offline in the dashboard, and the player restarts itself and picks up where it left off.',
        },
      ],
    },
  },
  {
    slug: 'events',
    srSlug: 'dogadjaji-i-sale',
    icon: 'party-popper',
    order: 200,
    sr: {
      name: 'Događaji i sale',
      tagline:
        'Program, smerovi i sponzori na ekranima koji se menjaju iz sata u sat. Sala koja se prekonfiguriše za sledeći događaj bez ijednog novog panoa.',
      title: 'Sala koja se prilagodi svakom događaju za pet minuta.',
      subtitle:
        'Isti prostor ujutru drži konferenciju, uveče svadbu. Ekrani se prebace na novi program dok se stolovi još raspoređuju.',
      metaTitle: 'Digitalni ekrani za konferencije i evente',
      metaDescription:
        'Ekrani za događaje i sale: program i raspored sesija, smerovi i dobrodošlica, prikaz sponzora i najave — izmenjeno u trenutku.',
      scenarios: [
        { title: 'Program i sesije', body: 'Šta je sledeće i u kojoj sali, sa izmenama koje stižu odmah kada se program pomeri.' },
        { title: 'Dobrodošlica i smerovi', body: 'Ime događaja, put do sale i garderobe, bez štampanih strelica po hodnicima.' },
        { title: 'Sponzori i partneri', body: 'Logotipi i poruke sponzora u rotaciji, sa merljivim brojem prikaza.' },
      ],
      benefits: [
        'Prekonfiguracija bez novih panoa',
        'Izmene programa u trenutku',
        'Dodatna vrednost za sponzore',
      ],
      faq: [
        {
          q: 'Koliko brzo možemo da promenimo sadržaj između dva događaja?',
          a: 'Prebacivanje na pripremljen raspored traje nekoliko sekundi na svim ekranima odjednom.',
        },
        {
          q: 'Možemo li da pripremimo sve unapred?',
          a: 'Da. Raspored se pravi danima ranije i pali se sam na datum i sat koji odredite.',
        },
        {
          q: 'Da li može da prikaže sponzorske materijale u petlji?',
          a: 'Da, uz kontrolu koliko dugo i koliko puta se svaki sponzor prikazuje.',
        },
      ],
    },
    en: {
      name: 'Events & venues',
      tagline:
        'Program, wayfinding and sponsors on screens that change hour by hour. A venue that reconfigures for the next event without a single new board.',
      title: 'A venue that adapts to any event in five minutes.',
      subtitle:
        'The same room hosts a conference in the morning and a wedding at night. The screens switch to the new program while the tables are still being moved.',
      metaTitle: 'Digital signage for conference and event venues',
      metaDescription:
        'Screens for events and venues: programs and session schedules, wayfinding and welcomes, sponsor displays and announcements — changed instantly.',
      scenarios: [
        { title: 'Program and sessions', body: 'What’s next and in which room, with changes landing the moment the program moves.' },
        { title: 'Welcome and wayfinding', body: 'The event name, the way to the hall and the cloakroom, with no printed arrows in corridors.' },
        { title: 'Sponsors and partners', body: 'Sponsor logos and messages in rotation, with a countable number of impressions.' },
      ],
      benefits: [
        'Reconfiguration without new boards',
        'Program changes in an instant',
        'Extra value to offer sponsors',
      ],
      faq: [
        {
          q: 'How fast can we switch between two events?',
          a: 'Switching to a prepared schedule takes seconds, across every screen at once.',
        },
        {
          q: 'Can we prepare everything in advance?',
          a: 'Yes. A schedule can be built days ahead and switches itself on at the date and hour you set.',
        },
        {
          q: 'Can it loop sponsor material?',
          a: 'Yes, with control over how long and how often each sponsor appears.',
        },
      ],
    },
  },
]
