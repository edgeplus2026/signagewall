// @ts-nocheck
/* Blog seed content — 20 bilingual posts. Consumed by scripts/seed-posts.ts.

   Content is a list of compact block tuples rather than raw lexical JSON, so
   the copy stays readable here and the seed script owns the lexical shape:
     ['p', text]        paragraph
     ['h', text]        h2
     ['h3', text]       h3
     ['ul', [items]]    bullet list
     ['ol', [items]]    numbered list
     ['quote', text]    pull quote
     ['fig', n]         generated figure n (0-based) for this post
*/

export const CATEGORIES = [
  { slug: 'vodici', sr: 'Vodiči', en: 'Guides' },
  { slug: 'saveti', sr: 'Saveti', en: 'Tips' },
  { slug: 'dizajn', sr: 'Dizajn', en: 'Design' },
  { slug: 'tehnika', sr: 'Tehnika', en: 'Technical' },
  { slug: 'industrije', sr: 'Industrije', en: 'Industries' },
]

import { POSTS_2 } from './posts-2'

const POSTS_1 = [
  {
    slug: 'digitalni-meni-povecava-prodaju',
    category: 'saveti',
    publishedAt: '2026-07-22T09:00:00.000Z',
    sr: {
      metaTitle: 'Kako digitalni meni povećava prodaju',
      metaDescription:
        'Šta se menja kad meni tabla postane ekran: redosled kojim gost čita ponudu, šta stoji u gornjoj levoj trećini, i zašto se istaknuto jelo prodaje bolje.',
      title: 'Kako digitalni meni povećava prodaju',
      excerpt:
        'Digitalni meni nije samo lepši od štampanog. Pravilno postavljen, on menja redosled kojim gost čita ponudu — a time i ono što naruči.',
      content: [
        ['p', 'Štampani meni je odluka koju donesete jednom i sa kojom živite nedeljama. Digitalni meni menjate za nekoliko sekundi, i baš ta razlika donosi novac — ne zato što je ekran lepši, nego zato što vam dozvoljava da ponudu prilagodite trenutku.'],
        ['h', 'Gost ne čita meni, gost ga skenira'],
        ['p', 'Pogled se na ekranu zadržava na jednom mestu duže nego bilo gde drugde: gore levo, pa dijagonalno nadole. Ono što stavite u taj ugao prodaje se više. Na štampanom meniju to je fiksno; na ekranu možete da rotirate šta zauzima to mesto — po satu, po danu ili po zalihama.'],
        ['fig', 0],
        ['h', 'Istaknite ono što nosi maržu, ne ono što je najskuplje'],
        ['p', 'Najskuplje jelo retko je i najprofitabilnije. Izračunajte maržu po jelu, pa u udarni termin stavite ona sa najboljim odnosom marže i brzine pripreme. Kuhinja će vam biti zahvalna koliko i knjigovođa.'],
        ['h', 'Menjajte ponudu kroz dan'],
        ['p', 'Doručak ujutru, brzi ručak u podne, koktel karta uveče. Isti ekran, tri različite ponude, sve zakazano unapred. Gost koji u 11h vidi koktele ne naručuje ništa — samo zaključi da je meni zastareo.'],
        ['ul', ['Doručak do 11h — kafa i pecivo u prvom planu', 'Ručak 12–16h — dnevni meni i brza jela', 'Veče od 18h — koktel karta i preporuke šefa']],
        ['h', 'Šta izbeći'],
        ['p', 'Najčešća greška je ekran koji izgleda kao odštampan meni prebačen u PDF. Sitan tekst, trideset stavki i nijedna slika. Ekran ima drugu ergonomiju od papira: manje stavki, veći tekst, i rotacija umesto gomilanja.'],
        ['quote', 'Ako gost mora da priđe bliže da bi pročitao meni, ekran radi protiv vas.'],
      ],
    },
    en: {
      metaTitle: 'How a digital menu increases sales',
      metaDescription:
        'What changes when a menu board becomes a screen: the order guests read the offer in, what sits in the top-left third, and why the item you feature outsells the one you do not.',
      slug: 'digital-menu-increases-sales',
      title: 'How a digital menu increases sales',
      excerpt:
        'A digital menu isn’t just nicer than print. Set up properly, it changes the order in which a guest reads the offer — and therefore what they order.',
      content: [
        ['p', 'A printed menu is a decision you make once and live with for weeks. A digital menu changes in seconds, and that difference is where the money is — not because a screen is prettier, but because it lets you fit the offer to the moment.'],
        ['h', 'Guests don’t read a menu, they scan it'],
        ['p', 'On a screen the eye settles in one place longer than anywhere else: top left, then diagonally down. Whatever sits in that corner sells more. On paper that position is fixed; on a screen you can rotate what occupies it — by hour, by day, or by what’s in stock.'],
        ['fig', 0],
        ['h', 'Feature what carries margin, not what costs most'],
        ['p', 'The most expensive dish is rarely the most profitable one. Work out the margin per dish, then give peak hours to those with the best ratio of margin to preparation time. Your kitchen will thank you as much as your accountant.'],
        ['h', 'Change the offer through the day'],
        ['p', 'Breakfast in the morning, a quick lunch at noon, cocktails at night. One screen, three offers, all scheduled ahead. A guest who sees cocktails at 11am doesn’t order anything — they just conclude the menu is out of date.'],
        ['ul', ['Breakfast until 11 — coffee and pastry up front', 'Lunch 12–4 — the daily menu and fast dishes', 'Evening from 6 — cocktails and the chef’s picks']],
        ['h', 'What to avoid'],
        ['p', 'The most common mistake is a screen that looks like a printed menu exported to PDF. Small type, thirty items and no images. A screen has different ergonomics from paper: fewer items, larger type, and rotation instead of piling everything on at once.'],
        ['quote', 'If a guest has to step closer to read the menu, the screen is working against you.'],
      ],
    },
  },
  {
    slug: 'digital-signage-za-pocetnike',
    category: 'vodici',
    publishedAt: '2026-07-20T09:00:00.000Z',
    sr: {
      metaTitle: 'Digital signage za početnike: šta vam treba',
      metaDescription:
        'Ceo spisak za kupovinu su tri stvari, a jednu verovatno već imate. Šta radi plejer, koliko košta, i šta slobodno možete da preskočite.',
      title: 'Digital signage za početnike: šta vam zaista treba',
      excerpt:
        'Mislite da za digitalne ekrane treba skupa oprema i tehničar? Potrebno je troje, i verovatno već imate dvoje.',
      content: [
        ['p', '„Digital signage" zvuči kao nešto za aerodrome i tržne centre. U praksi je to televizor, mali uređaj i softver — i to je ceo spisak.'],
        ['h', 'Ekran koji već imate'],
        ['p', 'Bilo koji televizor ili monitor je dovoljan za početak. Posebni „signage" ekrani imaju smisla kada radite šesnaest sati dnevno ili kada ekran stoji u izlogu na suncu. Za sve ostalo, običan TV radi posao godinama.'],
        ['h', 'Plejer: mali uređaj iza ekrana'],
        ['p', 'To je Android boks veličine šake, mini-PC ili računar koji ionako stoji negde. Na njemu radi plejer aplikacija koja preuzima sadržaj i prikazuje ga — i nastavlja da ga prikazuje i kada internet padne.'],
        ['fig', 0],
        ['h', 'Softver: mesto sa kog upravljate'],
        ['p', 'Kontrolna tabla u pregledaču. Napravite sadržaj, izaberete ekrane, objavite. Bez instalacije, bez servera kod vas, bez tehničara koji dolazi da promeni cenu.'],
        ['h', 'Koliko traje postavljanje'],
        ['ol', ['Uključite uređaj u ekran i u struju', 'Skenirate QR kod koji se pojavi na ekranu', 'Izaberete šta se prikazuje i objavite']],
        ['p', 'Prvi ekran je uparen za nekoliko minuta. Drugi i svaki sledeći traju kraće, jer sadržaj već postoji — samo ga usmerite na novi uređaj.'],
        ['h', 'Šta ne morate da kupite'],
        ['p', 'Ne treba vam server, ne treba vam poseban internet, i ne treba vam ugovor na tri godine da biste probali jedan ekran. Ako vam neko to prodaje kao neophodno, tražite drugu ponudu.'],
      ],
    },
    en: {
      metaTitle: 'Digital signage for beginners: what you need',
      metaDescription:
        'The whole shopping list is three things, and you probably own one of them. What a player does, what it costs, and what you can safely skip buying.',
      slug: 'digital-signage-for-beginners',
      title: 'Digital signage for beginners: what you actually need',
      excerpt:
        'Think digital screens need expensive kit and a technician? You need three things, and you probably already own two of them.',
      content: [
        ['p', '“Digital signage” sounds like something for airports and shopping centres. In practice it is a television, a small device and some software — and that is the whole list.'],
        ['h', 'The screen you already have'],
        ['p', 'Any TV or monitor is enough to start. Purpose-built signage displays earn their price when you run sixteen hours a day, or when the screen sits in a sunlit window. For everything else an ordinary TV does the job for years.'],
        ['h', 'The player: a small box behind the screen'],
        ['p', 'An Android box the size of your hand, a mini-PC, or a computer that is already sitting there. It runs the player app, which downloads content and shows it — and keeps showing it when the internet drops.'],
        ['fig', 0],
        ['h', 'The software: where you control it all'],
        ['p', 'A dashboard in your browser. Build content, pick screens, publish. No installation, no server on your premises, and no technician driving over to change a price.'],
        ['h', 'How long setup takes'],
        ['ol', ['Plug the device into the screen and the mains', 'Scan the QR code that appears on screen', 'Choose what plays and publish']],
        ['p', 'The first screen is paired in a couple of minutes. Every one after that is faster, because the content already exists — you just point it at a new device.'],
        ['h', 'What you don’t have to buy'],
        ['p', 'You don’t need a server, you don’t need a dedicated internet line, and you don’t need a three-year contract to try one screen. If someone sells you those as mandatory, get a second quote.'],
      ],
    },
  },
  {
    slug: 'koliko-kosta-digital-signage',
    category: 'vodici',
    publishedAt: '2026-07-17T09:00:00.000Z',
    sr: {
      metaTitle: 'Koliko digital signage stvarno košta',
      metaDescription:
        'Tri odvojena broja koja prodavci rado pomešaju: ekran, plejer i pretplata. Stvarne cifre, i gde se novac najčešće baci.',
      title: 'Koliko zaista košta digital signage',
      excerpt:
        'Cena ekrana je najmanji deo priče. Evo gde se novac stvarno troši — i gde se najčešće nepotrebno preplati.',
      content: [
        ['p', 'Pitanje „koliko košta digital signage" ima isti problem kao „koliko košta automobil". Zavisi, ali postoje jasne stavke koje možete da izračunate unapred.'],
        ['h', 'Jednokratni trošak'],
        ['ul', ['Ekran — od običnog TV-a do profesionalnog panela za izlog', 'Plejer — Android boks ili mini-PC', 'Montaža — nosač i kabl, po ekranu']],
        ['p', 'Ako počinjete sa jednim ekranom u prostoru koji već ima TV, jednokratni trošak može biti samo plejer.'],
        ['h', 'Mesečni trošak'],
        ['p', 'Softver se najčešće plaća po ekranu mesečno. To je jedina stavka koja raste sa brojem ekrana, pa je vredi računati na tri godine, ne na mesec dana.'],
        ['fig', 0],
        ['h', 'Trošak koji se ne vidi u ponudi'],
        ['p', 'Vreme. Ako sistem zahteva da neko svake nedelje pravi sadržaj od nule, taj sat rada je skuplji od pretplate. Zato su šabloni i automatski izvori — tabela, kalendar, RSS — najveća ušteda u celoj priči.'],
        ['h', 'Gde se najčešće preplati'],
        ['ol', ['Profesionalni ekrani tamo gde bi običan TV radio isto', 'Plejeri jači nego što je potrebno za prikaz slike i teksta', 'Ugovori na tri godine pre nego što je jedan ekran ispao dobra ideja']],
        ['h', 'Kako da izračunate povraćaj'],
        ['p', 'Uzmite jednu merljivu stvar: prodaju istaknutog artikla, broj pitanja na recepciji, trošak štampe koji nestaje. Ako ekran vraća svoju mesečnu cenu na jednoj od tih stavki, ostalo je čist dobitak.'],
      ],
    },
    en: {
      metaTitle: 'What digital signage actually costs in 2026',
      metaDescription:
        'Three separate numbers vendors tend to blur: the screen, the player and the subscription. Real figures, plus where the money usually gets wasted.',
      slug: 'digital-signage-cost',
      title: 'What digital signage actually costs',
      excerpt:
        'The screen is the smallest part of the bill. Here is where the money really goes — and where it most often gets overspent.',
      content: [
        ['p', 'Asking “what does digital signage cost” has the same problem as asking what a car costs. It depends — but the line items are knowable in advance.'],
        ['h', 'One-off cost'],
        ['ul', ['The display — from an ordinary TV to a professional window panel', 'The player — an Android box or mini-PC', 'Installation — a mount and a cable, per screen']],
        ['p', 'If you are starting with one screen in a room that already has a TV, the one-off cost can be just the player.'],
        ['h', 'Monthly cost'],
        ['p', 'Software is usually priced per screen per month. It is the only line that grows with screen count, so it is worth modelling over three years rather than one.'],
        ['fig', 0],
        ['h', 'The cost that never appears on a quote'],
        ['p', 'Time. If the system needs somebody to build content from scratch every week, that hour costs more than the subscription. This is why templates and automatic sources — a spreadsheet, a calendar, an RSS feed — are the biggest saving in the whole exercise.'],
        ['h', 'Where people overspend'],
        ['ol', ['Professional displays where an ordinary TV would perform identically', 'Players far more powerful than showing text and images requires', 'Three-year contracts signed before one screen has proved itself']],
        ['h', 'How to work out the return'],
        ['p', 'Pick one measurable thing: sales of a featured item, questions asked at reception, printing costs that disappear. If the screen pays its monthly fee back on any one of those, the rest is upside.'],
      ],
    },
  },
  {
    slug: 'android-boks-ili-mini-pc',
    category: 'tehnika',
    publishedAt: '2026-07-15T09:00:00.000Z',
    sr: {
      metaTitle: 'Android boks ili mini-PC za digital signage?',
      metaDescription:
        'Oba rade prvog dana. Razlika se vidi posle šest meseci neprekidnog rada — a tada je zamena hardvera skuplja opcija.',
      title: 'Android boks ili mini-PC: šta izabrati za plejer',
      excerpt:
        'Oba rade. Razlika se vidi tek posle šest meseci neprekidnog rada — i tada je kasno da se menja.',
      content: [
        ['p', 'Plejer je uređaj koji stoji iza ekrana i radi non-stop. Izbor između Android boksa i mini-PC-ja retko je pitanje snage; skoro uvek je pitanje toplote, održavanja i toga ko će ga dirati.'],
        ['h', 'Android boks'],
        ['p', 'Jeftin, mali, tih i troši malo struje. Za prikaz slika, teksta i uobičajenog videa je sasvim dovoljan. Loša strana je što jeftini modeli variraju u kvalitetu — isti model kupljen dva puta ume da bude dva različita uređaja.'],
        ['ul', ['Za: cena, veličina, potrošnja, radi bez ventilatora', 'Protiv: neujednačen kvalitet, slabiji za težak video i više izvora odjednom']],
        ['h', 'Mini-PC'],
        ['p', 'Skuplji, ali predvidiv. Lakše se održava, podnosi zahtevniji sadržaj i obično duže traje. Ako ekran radi šesnaest sati dnevno ili prikazuje video visoke rezolucije, razlika u ceni se vrati kroz to što ne morate da ga menjate.'],
        ['fig', 0],
        ['h', 'Šta zaista odlučuje'],
        ['ol', ['Koliko sati dnevno ekran radi', 'Da li se prikazuje video ili uglavnom slika i tekst', 'Koliko je prostor topao i prašnjav', 'Ko će fizički prići uređaju ako zatreba']],
        ['h', 'Praktičan savet'],
        ['p', 'Šta god izaberete, uzmite dva ista uređaja umesto dva različita. Kada nešto krene naopako, mnogo je lakše zameniti identičan komad nego rešavati problem koji postoji samo na jednom modelu.'],
        ['quote', 'Najbolji plejer je onaj na koji ste zaboravili da postoji.'],
      ],
    },
    en: {
      metaTitle: 'Android box or mini PC for digital signage?',
      metaDescription:
        'Both work on day one. The difference shows after six months of continuous running — and by then swapping the hardware is the expensive option.',
      slug: 'android-box-or-mini-pc',
      title: 'Android box or mini-PC: choosing a player',
      excerpt:
        'Both work. The difference only shows after six months of continuous running — and by then it is too late to change.',
      content: [
        ['p', 'The player is the device behind the screen that runs around the clock. Choosing between an Android box and a mini-PC is rarely about power; it is almost always about heat, maintenance, and who will have to touch it.'],
        ['h', 'Android box'],
        ['p', 'Cheap, small, silent and light on power. For images, text and ordinary video it is plenty. The downside is that budget models vary — buying the same model twice can get you two different devices.'],
        ['ul', ['For: price, size, power draw, runs fanless', 'Against: uneven build quality, weaker with heavy video or several sources at once']],
        ['h', 'Mini-PC'],
        ['p', 'More expensive, but predictable. Easier to maintain, comfortable with demanding content, and usually longer-lived. If a screen runs sixteen hours a day or plays high-resolution video, the price difference comes back in not having to replace it.'],
        ['fig', 0],
        ['h', 'What actually decides it'],
        ['ol', ['How many hours a day the screen runs', 'Whether it plays video or mostly images and text', 'How warm and dusty the room is', 'Who will physically reach the device if it needs attention']],
        ['h', 'One practical tip'],
        ['p', 'Whichever you pick, buy two identical devices rather than two different ones. When something goes wrong it is far easier to swap in a matching unit than to debug a fault that exists on only one model.'],
        ['quote', 'The best player is the one you have forgotten is there.'],
      ],
    },
  },
  {
    slug: 'ekran-mora-da-radi-i-bez-interneta',
    category: 'tehnika',
    publishedAt: '2026-07-12T09:00:00.000Z',
    sr: {
      metaTitle: 'Zašto ekran mora da radi i bez interneta',
      metaDescription:
        'Prazan ekran u izlogu je gori od nikakvog. Šta razdvaja plejer koji kešira sadržaj od onog koji strimuje, i kako to da prepoznate pre kupovine.',
      title: 'Zašto ekran mora da radi i kada padne internet',
      excerpt:
        'Prazan ekran u izlogu gori je od nikakvog ekrana. Evo kako izgleda plejer koji to ne dozvoljava.',
      content: [
        ['p', 'Internet pada. Ruter se resetuje, provajder radi na mreži, neko iskoristi utičnicu za usisivač. Pitanje nije da li će se desiti, nego šta ekran radi u tih dvadeset minuta.'],
        ['h', 'Tri načina da ekran zakaže'],
        ['ul', ['Prikaže poruku o grešci — najgore, jer izgleda pokvareno', 'Ostane crn — deluje kao da je prostor zatvoren', 'Zamrzne se na pola prelaza — deluje kao da niko ne održava']],
        ['h', 'Kako to izgleda kada je urađeno kako treba'],
        ['p', 'Plejer preuzima sadržaj unapred i drži ga lokalno. Kada veza nestane, on nastavlja da vrti ono što već ima — gost ne primeti ništa. Kada se veza vrati, tiho preuzme izmene i nastavi dalje.'],
        ['fig', 0],
        ['h', 'Šta pitati dobavljača'],
        ['ol', ['Da li se sadržaj čuva lokalno ili se učitava svaki put?', 'Šta se prikazuje ako veza padne usred videa?', 'Koliko dugo ekran može da radi potpuno bez mreže?', 'Šta se dešava posle nestanka struje — da li se sam pokrene?']],
        ['h', 'Nestanak struje je druga polovina priče'],
        ['p', 'Uređaj koji ne krene sam posle nestanka struje zahteva da neko dođe i uključi ga. Ako je ekran na lokaciji bez osoblja, to znači dan ili dva praznog izloga. Automatsko pokretanje po napajanju nije luksuz nego osnovna stvar.'],
        ['quote', 'Ekran se ne meri po tome kako izgleda kada sve radi, nego po tome kako izgleda kada nešto ne radi.'],
      ],
    },
    en: {
      metaTitle: 'Why a signage screen must work offline',
      metaDescription:
        'A blank screen in a window is worse than no screen. What separates a player that caches content from one that streams it, and how to tell before you buy.',
      slug: 'screens-that-work-offline',
      title: 'Why a screen has to keep working when the internet drops',
      excerpt:
        'A blank screen in a window is worse than no screen at all. Here is what a player that refuses to go blank looks like.',
      content: [
        ['p', 'Internet connections fail. Routers reboot, providers do maintenance, somebody needs the socket for a vacuum cleaner. The question isn’t whether it happens — it’s what the screen does during those twenty minutes.'],
        ['h', 'Three ways a screen fails'],
        ['ul', ['It shows an error message — the worst, because it reads as broken', 'It goes black — the space looks closed', 'It freezes mid-transition — it looks unmaintained']],
        ['h', 'What it looks like done properly'],
        ['p', 'The player downloads content ahead of time and keeps it locally. When the connection goes, it carries on with what it already has and nobody notices. When the connection returns, it quietly picks up the changes and moves on.'],
        ['fig', 0],
        ['h', 'What to ask a supplier'],
        ['ol', ['Is content cached locally or fetched every time?', 'What shows if the connection drops mid-video?', 'How long can a screen run with no network at all?', 'What happens after a power cut — does it start on its own?']],
        ['h', 'Power cuts are the other half'],
        ['p', 'A device that doesn’t restart itself after a power cut needs someone to go and switch it on. If the screen is at an unstaffed location, that means a day or two of empty window. Auto-start on power is not a luxury; it is table stakes.'],
        ['quote', 'A screen isn’t judged by how it looks when everything works, but by how it looks when something doesn’t.'],
      ],
    },
  },
  {
    slug: 'raspored-sadrzaja-koji-se-sam-menja',
    category: 'vodici',
    publishedAt: '2026-07-10T09:00:00.000Z',
    sr: {
      metaTitle: 'Raspored sadržaja koji se sam menja',
      metaDescription:
        'Najbolji ekran je onaj koji tri nedelje niko nije dirao a i dalje je tačan. Kako da dnevni raspored podesite jednom i prestanete da mislite o njemu.',
      title: 'Kako napraviti raspored sadržaja koji se sam menja',
      excerpt:
        'Najbolji ekran je onaj koji nedeljama radi bez vas. To se postiže rasporedom, ne trudom.',
      content: [
        ['p', 'Većina ekrana umre tiho: prve nedelje se sadržaj menja svakodnevno, treće nedelje niko ga ne dira, a posle mesec dana prikazuje akciju koja je istekla. Rešenje nije disciplina, nego raspored koji radi sam.'],
        ['h', 'Podelite dan na blokove'],
        ['p', 'Ne razmišljajte o sadržaju kao o listi slajdova, nego o tome šta prostor radi u koje doba. Jutro, špic, popodne, veče — svaki blok ima drugu publiku i drugu poruku.'],
        ['fig', 0],
        ['h', 'Pravilo tri izvora'],
        ['p', 'Zdrav raspored ima tri vrste sadržaja u petlji:'],
        ['ol', ['Stalno — ono što uvek važi: ponuda, cene, brend', 'Automatsko — vreme, kurs, kalendar, društvene mreže; menja se samo', 'Povremeno — akcija ili najava sa datumom isteka']],
        ['p', 'Ako su prve dve vrste dobro postavljene, ekran je zanimljiv i kada mesec dana niko ništa ne doda.'],
        ['h', 'Stavite datum isteka na sve'],
        ['p', 'Svaka akcija dobija datum kada nestaje. Ovo je jedina navika koja razdvaja ekran koji izgleda živo od ekrana koji izgleda zaboravljeno.'],
        ['h', 'Napravite jednu reviziju mesečno'],
        ['p', 'Petnaest minuta, jednom mesečno: pogledajte šta se vrti, izbacite jedno i dodajte jedno. To je ceo posao održavanja ako je raspored dobro postavljen.'],
      ],
    },
    en: {
      metaTitle: 'Build a signage schedule that runs itself',
      metaDescription:
        'The best screen is the one nobody has touched in three weeks and is still right. How to set dayparting up once and stop thinking about it.',
      slug: 'content-schedule-that-runs-itself',
      title: 'Building a content schedule that runs itself',
      excerpt:
        'The best screen is the one that runs for weeks without you. That comes from scheduling, not effort.',
      content: [
        ['p', 'Most screens die quietly: content changes daily in week one, nobody touches it in week three, and a month later it is advertising an offer that expired. The fix isn’t discipline — it is a schedule that runs on its own.'],
        ['h', 'Split the day into blocks'],
        ['p', 'Stop thinking about content as a list of slides and start thinking about what the space is doing at each hour. Morning, rush, afternoon, evening — each block has a different audience and a different message.'],
        ['fig', 0],
        ['h', 'The rule of three sources'],
        ['p', 'A healthy rotation has three kinds of content in it:'],
        ['ol', ['Permanent — what is always true: the offer, prices, the brand', 'Automatic — weather, rates, calendar, social; it updates itself', 'Occasional — a promotion or announcement with an expiry date']],
        ['p', 'Get the first two right and the screen stays interesting even if nobody adds anything for a month.'],
        ['h', 'Put an expiry date on everything'],
        ['p', 'Every promotion gets a date when it disappears. This single habit is what separates a screen that looks alive from one that looks forgotten.'],
        ['h', 'Do one review a month'],
        ['p', 'Fifteen minutes, once a month: look at what is playing, remove one thing and add one thing. With a good schedule underneath, that is the entire maintenance job.'],
      ],
    },
  },
  {
    slug: 'vertikalni-ili-horizontalni-ekran',
    category: 'dizajn',
    publishedAt: '2026-07-08T09:00:00.000Z',
    sr: {
      metaTitle: 'Vertikalni ili horizontalni ekran: kada koji',
      metaDescription:
        'Orijentacija nije estetska odluka. Ona određuje koliko staje i sa koje daljine se čita — a menja se skupo, kad je ekran već na zidu.',
      title: 'Vertikalni ili horizontalni ekran: kada koji',
      excerpt:
        'Orijentacija ekrana nije estetska odluka. Ona određuje koliko informacija stane i sa koje udaljenosti se čita.',
      content: [
        ['p', 'Ekran okrenut vertikalno ne izgleda samo drugačije — on nosi drugu vrstu sadržaja. Odluka se donosi jednom, pri montaži, i posle je skupo menjati.'],
        ['h', 'Vertikalno: kada je gledalac blizu i sam'],
        ['p', 'Izlog, ulaz, hodnik, prostor pored kase. Vertikalni format prati oblik čoveka i prirodno privlači pogled u prolazu. Idealan je za jednu poruku, jedan proizvod, jedan poziv na akciju.'],
        ['ul', ['Izlog i ulaz u radnju', 'Meni sa malim brojem stavki', 'Dobrodošlica i smerovi']],
        ['h', 'Horizontalno: kada je gledalac dalje i ima vremena'],
        ['p', 'Čekaonica, restoran, sala, recepcija. Širi format podnosi tabele, rasporede i više kolona odjednom — sve gde gledalac čita nekoliko sekundi, a ne pola sekunde.'],
        ['fig', 0],
        ['h', 'Greška koju vidimo najčešće'],
        ['p', 'Horizontalni sadržaj prikazan na vertikalnom ekranu, sa crnim trakama gore i dole. Trećina ekrana je izgubljena, a tekst je manji nego što bi bio na upola manjem ekranu postavljenom kako treba.'],
        ['h', 'Kako da proverite pre montaže'],
        ['p', 'Odštampajte sadržaj na papiru u istom odnosu stranica i zalepite ga na zid gde ekran treba da stoji. Stanite tamo gde će stajati gost. Ako morate da priđete, format ili tipografija nisu dobri — a to je mnogo jeftinije saznati sa papirom nego sa nosačem na zidu.'],
      ],
    },
    en: {
      metaTitle: 'Portrait or landscape: screen orientation',
      metaDescription:
        'Orientation is not an aesthetic call. It decides how much fits and from how far away it can be read — and it is expensive to change after mounting.',
      slug: 'portrait-or-landscape-screen',
      title: 'Portrait or landscape: choosing screen orientation',
      excerpt:
        'Orientation isn’t an aesthetic decision. It determines how much information fits and from how far away it can be read.',
      content: [
        ['p', 'A screen turned portrait doesn’t just look different — it carries a different kind of content. The decision is made once, at installation, and is expensive to reverse.'],
        ['h', 'Portrait: when the viewer is close and alone'],
        ['p', 'Windows, entrances, corridors, the space beside a till. A portrait format follows the shape of a person and naturally catches the eye in passing. It suits one message, one product, one call to action.'],
        ['ul', ['Shop windows and entrances', 'A menu with few items', 'Welcomes and wayfinding']],
        ['h', 'Landscape: when the viewer is further away and has time'],
        ['p', 'Waiting rooms, restaurants, halls, reception. The wider format carries tables, schedules and several columns at once — anywhere the viewer reads for a few seconds rather than half a second.'],
        ['fig', 0],
        ['h', 'The mistake we see most'],
        ['p', 'Landscape content shown on a portrait screen, with black bars above and below. A third of the display is wasted, and the text ends up smaller than it would be on a screen half the size mounted properly.'],
        ['h', 'How to check before you mount anything'],
        ['p', 'Print the content on paper at the same aspect ratio and tape it to the wall where the screen will go. Stand where the customer will stand. If you have to step closer, the format or the typography is wrong — and that is far cheaper to learn with paper than with a bracket already on the wall.'],
      ],
    },
  },
  {
    slug: 'greske-na-digitalnim-ekranima',
    category: 'saveti',
    publishedAt: '2026-07-05T09:00:00.000Z',
    sr: {
      metaTitle: 'Sedam grešaka na ekranima koje odbijaju kupce',
      metaDescription:
        'Svaka se popravlja besplatno i svaka košta više od ekrana. Spisak koji vam dobavljač neće dati pre prodaje.',
      title: 'Sedam grešaka na digitalnim ekranima koje odbijaju kupce',
      excerpt:
        'Svaka od njih je besplatna za popraviti, a svaka košta više nego što ekran vredi.',
      content: [
        ['p', 'Loš ekran ne izgleda neutralno — izgleda kao da prostor nije održavan. Evo sedam grešaka koje vidimo najčešće, poređanih po tome koliko štete.'],
        ['h', '1. Previše teksta'],
        ['p', 'Gost gleda ekran tri do pet sekundi. To je prostor za jednu rečenicu i jedan broj, ne za pasus.'],
        ['h', '2. Sadržaj koji je istekao'],
        ['p', 'Novogodišnja akcija u martu govori kupcu sve što treba da zna o tome kako vodite radnju.'],
        ['h', '3. Preveliki broj prelaza'],
        ['p', 'Vrtenje, okretanje i odskakanje odvlače pažnju sa poruke. Jednostavno pretapanje je skoro uvek bolje.'],
        ['fig', 0],
        ['h', '4. Sitan tekst'],
        ['p', 'Pravilo palca: visina slova treba da bude bar jedan santimetar na svaka tri metra udaljenosti gledaoca.'],
        ['h', '5. Slab kontrast'],
        ['p', 'Sivi tekst na svetloj slici izgleda dobro na monitoru dizajnera i nečitko je u prostoru sa prozorom.'],
        ['h', '6. Slajd koji traje predugo'],
        ['p', 'Ako gost stigne da pročita dvaput, slajd je predug i ekran deluje zamrznuto.'],
        ['h', '7. Ekran koji radi kada nema nikoga'],
        ['p', 'Ekran koji svetli u praznom prostoru u tri ujutru samo troši svoj životni vek. Zakazano gašenje produžava trajanje panela i smanjuje račun.'],
        ['quote', 'Ako morate da objašnjavate šta je na ekranu, ekran nije uradio svoj posao.'],
      ],
    },
    en: {
      metaTitle: '7 digital signage mistakes to avoid',
      metaDescription:
        'Every one is free to fix and every one costs more than the screen. The list a supplier will not hand you before the sale.',
      slug: 'digital-signage-mistakes',
      title: 'Seven digital signage mistakes that push customers away',
      excerpt:
        'Every one of them is free to fix, and every one costs more than the screen is worth.',
      content: [
        ['p', 'A bad screen doesn’t read as neutral — it reads as a space nobody looks after. Here are the seven mistakes we see most, ordered by how much damage they do.'],
        ['h', '1. Too much text'],
        ['p', 'A customer looks at a screen for three to five seconds. That is room for one sentence and one number, not a paragraph.'],
        ['h', '2. Expired content'],
        ['p', 'A New Year offer still running in March tells a customer everything they need to know about how the place is run.'],
        ['h', '3. Too many transitions'],
        ['p', 'Spinning, flipping and bouncing pull attention away from the message. A simple crossfade is almost always better.'],
        ['fig', 0],
        ['h', '4. Type that is too small'],
        ['p', 'Rule of thumb: about one inch of letter height for every three feet of viewing distance.'],
        ['h', '5. Weak contrast'],
        ['p', 'Gray text on a light photograph looks fine on a designer’s monitor and is unreadable in a room with a window.'],
        ['h', '6. Slides that linger'],
        ['p', 'If a customer can read it twice, the slide is too long and the screen looks frozen.'],
        ['h', '7. Screens running with nobody there'],
        ['p', 'A screen glowing in an empty room at three in the morning is only spending its own lifespan. A scheduled off-time extends panel life and cuts the bill.'],
        ['quote', 'If you have to explain what is on the screen, the screen hasn’t done its job.'],
      ],
    },
  },
  {
    slug: 'koliko-dugo-treba-da-traje-slajd',
    category: 'dizajn',
    publishedAt: '2026-07-03T09:00:00.000Z',
    sr: {
      metaTitle: 'Koliko dugo treba da traje jedan slajd',
      metaDescription:
        'Odgovor nije deset sekundi. Zavisi od toga koliko gledalac uopšte stoji tu — a to je broj koji možete da izmerite ove nedelje.',
      title: 'Koliko dugo treba da traje jedan slajd',
      excerpt:
        'Odgovor nije „deset sekundi". Zavisi od toga koliko dugo gledalac uopšte stoji ispred ekrana.',
      content: [
        ['p', 'Trajanje slajda je najčešće podešavanje koje se postavi jednom i nikada ne preispita. A ono direktno određuje da li iko išta pročita.'],
        ['h', 'Krenite od gledaoca, ne od sadržaja'],
        ['p', 'Prvo pitanje nije „koliko teksta imam", nego „koliko sekundi ovaj čovek stoji ovde".'],
        ['ul', ['Prolaz kroz hodnik — dve do tri sekunde', 'Red na kasi — pet do osam sekundi', 'Čekaonica — petnaest sekundi i više']],
        ['h', 'Pravilo za proveru'],
        ['p', 'Pročitajte slajd naglas, normalnim tempom. Dodajte dve sekunde. To je minimum. Ako ste probili raspoloživo vreme gledaoca, problem nije trajanje nego količina teksta.'],
        ['fig', 0],
        ['h', 'Dužina cele petlje je važnija'],
        ['p', 'Gost koji čeka pet minuta ne sme da vidi istu petlju šest puta. Ako je petlja kraća od pola prosečnog čekanja, ekran postaje dosadan pre nego što je red došao.'],
        ['h', 'Video je izuzetak'],
        ['p', 'Video zadržava pažnju duže od statične slike, ali samo ako ima šta da se gleda. Video bez zvuka koji zavisi od govora je izgubljen — u prostoru se skoro nikad ne pušta ton.'],
      ],
    },
    en: {
      metaTitle: 'How long should a signage slide stay on screen?',
      metaDescription:
        'The answer is not ten seconds. It depends on how long the viewer stands there at all — which is a number you can measure this week.',
      slug: 'how-long-should-a-slide-last',
      title: 'How long should a slide stay on screen',
      excerpt:
        'The answer isn’t “ten seconds”. It depends on how long the viewer stands in front of the screen at all.',
      content: [
        ['p', 'Slide duration is the setting most often chosen once and never revisited. It also directly determines whether anybody reads anything.'],
        ['h', 'Start from the viewer, not the content'],
        ['p', 'The first question isn’t “how much text do I have” but “how many seconds is this person standing here”.'],
        ['ul', ['Walking down a corridor — two to three seconds', 'Queuing at a till — five to eight seconds', 'A waiting room — fifteen seconds and up']],
        ['h', 'A test that works'],
        ['p', 'Read the slide aloud at a normal pace. Add two seconds. That is your minimum. If that overruns the time the viewer actually has, the problem isn’t duration — it is the amount of text.'],
        ['fig', 0],
        ['h', 'Loop length matters more'],
        ['p', 'Someone waiting five minutes must not see the same loop six times. If the loop is shorter than half the average wait, the screen becomes boring before their turn comes.'],
        ['h', 'Video is the exception'],
        ['p', 'Video holds attention longer than a static image, but only if there is something to watch. Silent video that depends on speech is wasted — sound is almost never on in a public space.'],
      ],
    },
  },
  {
    slug: 'kako-meriti-da-li-ekran-radi-posao',
    category: 'saveti',
    publishedAt: '2026-07-01T09:00:00.000Z',
    sr: {
      metaTitle: 'Kako izmeriti da li ekran radi posao',
      metaDescription:
        'Ekran nema stopu klikova, ali nije nemerljiv. Četiri broja koja vam kažu istinu, i jedan koji ne kaže.',
      title: 'Kako izmeriti da li ekran uopšte radi posao',
      excerpt:
        'Ekran nema klik i nema konverziju. Ali ima nekoliko merenja koja su iznenađujuće pouzdana.',
      content: [
        ['p', 'Najčešći razlog zašto se digital signage ugasi posle godinu dana nije loš sadržaj — nego to što niko nije umeo da dokaže da vredi. Merenje treba postaviti pre nego što ekran krene, ne posle.'],
        ['h', 'Merenje jedan: istaknuti artikal'],
        ['p', 'Izaberite jedan proizvod i istaknite ga nedelju dana. Uporedite prodaju sa nedeljom pre i nedeljom posle. Ovo je najbliže kontrolisanom eksperimentu što ćete dobiti u realnom prostoru.'],
        ['fig', 0],
        ['h', 'Merenje dva: pitanja koja su prestala'],
        ['p', 'Zamolite osoblje da nedelju dana beleži koliko puta ih neko pita isto pitanje — radno vreme, gde je toalet, kada je sledeći termin. Postavite odgovor na ekran i ponovite brojanje mesec dana kasnije.'],
        ['h', 'Merenje tri: trošak koji je nestao'],
        ['p', 'Poster, meni, cenovnik, oglas u izlogu — sve što se više ne štampa je merljiva stavka. Ovo je obično najbrži deo povraćaja i najlakši za odbranu pred upravom.'],
        ['h', 'Merenje četiri: QR kod'],
        ['p', 'Jedini pravi digitalni trag koji ekran ostavlja. Poseban QR po ekranu ili po kampanji pokazuje ne samo koliko ljudi je skeniralo, nego i koji ekran u prostoru zapravo radi.'],
        ['h', 'Šta ne merite'],
        ['p', 'Ne pokušavajte da izmerite „broj prikaza". Broj ljudi koji su prošli pored ekrana nije broj ljudi koji su ga pogledali, i svaka odluka doneta na osnovu tog broja biće pogrešna.'],
      ],
    },
    en: {
      metaTitle: 'How to measure whether a screen is working',
      metaDescription:
        'A screen has no click-through rate, but it is not unmeasurable. Four numbers that tell you the truth, and one that does not.',
      slug: 'measuring-digital-signage-results',
      title: 'How to measure whether a screen is doing its job',
      excerpt:
        'A screen has no clicks and no conversion rate. It does have a few measurements that are surprisingly reliable.',
      content: [
        ['p', 'The most common reason digital signage gets switched off after a year isn’t bad content — it is that nobody could prove it was worth keeping. Set up the measurement before the screen goes live, not after.'],
        ['h', 'Measurement one: the featured item'],
        ['p', 'Pick one product and feature it for a week. Compare sales with the week before and the week after. This is as close to a controlled experiment as a real space will give you.'],
        ['fig', 0],
        ['h', 'Measurement two: questions that stopped'],
        ['p', 'Ask staff to tally, for one week, how often they are asked the same question — opening hours, where the toilet is, when the next slot is. Put the answer on the screen and count again a month later.'],
        ['h', 'Measurement three: cost that disappeared'],
        ['p', 'Posters, menus, price lists, window ads — anything no longer printed is a countable line. This is usually the fastest part of the return and the easiest to defend to a finance director.'],
        ['h', 'Measurement four: a QR code'],
        ['p', 'The one genuine digital trace a screen leaves. A distinct code per screen or per campaign shows not just how many people scanned, but which screen in the space is actually working.'],
        ['h', 'What not to measure'],
        ['p', 'Don’t try to measure “impressions”. The number of people who walked past a screen is not the number who looked at it, and every decision built on that number will be wrong.'],
      ],
    },
  },
]

/* Split across two files so neither becomes unreadable; order here is the
   order they appear in the seed log, not on the site (that sorts by date). */
export const POSTS = [...POSTS_1, ...POSTS_2]
