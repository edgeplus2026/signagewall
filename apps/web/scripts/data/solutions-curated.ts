// @ts-nocheck
/**
 * The six publishable solution pages.
 *
 * Unlike the retired industry inventory, every page below has a separate job
 * to be done and is grounded in functionality present in the product. The
 * `links` values are stable repository keys: Serbian source slugs for posts,
 * English solution slugs, and technical app slugs.
 */
export const SOLUTIONS = [
  {
    slug: 'hospitality',
    srSlug: 'ugostiteljstvo',
    icon: 'utensils',
    order: 10,
    recommendedApps: 'menu,qr,text,weather,clock,ticker',
    links: {
      posts: [
        'digitalni-meni-povecava-prodaju',
        'tipografija-za-ekrane',
        'ekran-mora-da-radi-i-bez-interneta',
      ],
      solutions: ['hotels', 'retail'],
      apps: ['menu', 'qr', 'text', 'weather', 'clock', 'ticker'],
    },
    sr: {
      name: 'Restorani i kafići',
      tagline:
        'Digitalni meni za jela, pića i cene koji se uređuje iz pregledača. Stavke možete unositi ručno, uvesti iz CSV fajla ili povezati sa Google Sheets i Excel tabelom.',
      title: 'Digitalni meni za restorane i kafiće',
      subtitle:
        'Prikažite čitljivu ponudu na televizoru ili komercijalnom displeju, izmenite isti meni na povezanim ekranima i zadržite već preuzet sadržaj kada veza nije dostupna.',
      metaTitle: 'Digitalni meni za restorane i kafiće',
      metaDescription:
        'Napravite meni tablu sa jelima i cenama, ručnim unosom, CSV uvozom ili povezivanjem sa Google Sheets i Excel tabelom, za sve povezane ekrane.',
      intro: `Digitalni meni ima smisla kada uklanja konkretan operativni problem: cena ili opis ne treba da se štampaju ponovo svaki put kada se ponuda promeni. SignageWall Menu board aplikacija prikazuje naziv, cenu, opis, kategoriju i fotografiju stavke u nekoliko gotovih dizajna. Podatke možete održavati direktno u kontrolnoj tabli, jednokratno uvesti iz CSV fajla ili povezati sa Google Sheets odnosno Microsoft Excel tabelom. Kod povezane tabele birate kolone koje odgovaraju nazivu, ceni, opisu, kategoriji i slici, pa ekran dobija podatke iz izvora koji tim već koristi.

Ovo nije POS sistem, sistem zaliha niti alat za poručivanje. SignageWall ne zna da li je jelo rasprodato i ne menja ponudu po dobu dana. Ako je informacija važna, osoba koja održava meni menja je u ručnom unosu ili u povezanoj tabeli. Promena konfiguracije iste aplikacije šalje se povezanim plejerima koji je koriste, bez obilaska televizora. Različiti ekrani mogu koristiti različite instance menija: na primer, jedna za hranu i jedna za piće.

Ekran može da kombinuje meni sa QR kodom, tekstualnim obaveštenjem, vremenskom prognozom, satom ili trakom sa kratkom porukom. Fotografije, video i druge aplikacije mogu se složiti u plejlistu sa trajanjem svake stavke. Za ponudu koja mora neprekidno da bude vidljiva, jednostavniji meni sa krupnim tekstom obično je sigurniji izbor od dugačke rotacije.`,
      scenarios: [
        {
          title: 'Meni koji se održava ručno',
          body: 'Za kraću ponudu unesite stavke direktno u Menu board aplikaciju. Svaki red može imati naziv, cenu, opis, kategoriju i fotografiju, a izabrana valuta i položaj simbola primenjuju se na celu tablu.',
        },
        {
          title: 'Uvoz postojeće ponude',
          body: 'Ako je ponuda već u CSV fajlu, uvezite redove umesto ponovnog kucanja. Uvoz je jednokratan: kasnije izmene radite u kontrolnoj tabli ili prelazite na povezanu tabelu ako želite da izvor ostane spolja.',
        },
        {
          title: 'Meni iz Google Sheets ili Excel tabele',
          body: 'Povežite nalog, izaberite dokument i mapirajte njegove kolone. SignageWall čita podatke u režimu samo za čitanje i osvežava prikaz; ne uređuje originalnu tabelu i ne povezuje se sa kasom.',
        },
        {
          title: 'Poziv koji gost nosi na telefonu',
          body: 'QR aplikacija može da otvori stranicu sa rezervacijom, Wi-Fi mrežu, broj telefona, imejl ili Google recenziju. Kod i poziv na akciju su zasebna stavka koju možete dodati meniju ili plejlisti.',
        },
        {
          title: 'Informacije uz ponudu',
          body: 'Sat, prognoza, kratka tekstualna poruka i ticker pokrivaju praktične informacije poput radnog vremena, terase ili preuzimanja. Koristite ih samo kada pomažu gostu da odluči, a ne kao ukras.',
        },
      ],
      benefits: [
        'Jedno mesto za uređivanje naziva, opisa i cena',
        'Ručni unos, CSV uvoz ili čitanje povezane tabele',
        'Isti sadržaj može se dodeliti većem broju izabranih ekrana',
      ],
      proof: {
        title: 'Ilustrativan tok rada, ne rezultat korisnika',
        body: 'Zamislite kafić sa menijem u Google Sheets tabeli i dva ekrana iza pulta. Vlasnik povezuje tabelu, mapira pet potrebnih kolona i istu Menu board instancu dodaje na oba ekrana. Kada promeni cenu u tabeli, konektor preuzima novu vrednost, a povezani plejeri dobijaju osvežene podatke. Primer pokazuje način rada sistema; ne obećava rast prodaje, uštedu niti vreme osvežavanja u svakoj mreži.',
      },
      faq: [
        {
          q: 'Da li SignageWall može da povuče meni iz Google Sheets ili Excel dokumenta?',
          a: 'Može. Menu board podržava ručni izvor, CSV uvoz, Google Sheets i Microsoft Excel. Za povezane izvore potreban je odgovarajući Google ili Microsoft nalog i serverska OAuth konfiguracija. Birate dokument, list i mapiranje kolona; pristup je namenjen čitanju sadržaja.',
        },
        {
          q: 'Da li se meni automatski menja između doručka, ručka i večere?',
          a: 'Ne. Trenutna verzija nema zakazivanje pojedinačnih sadržaja po dobu dana. Možete pripremiti više menija i ručno izabrati koji je dodeljen ekranu, ali stranica ne predstavlja to kao automatski dayparting.',
        },
        {
          q: 'Može li aplikacija sama da označi rasprodato jelo?',
          a: 'Ne postoji ugrađena veza sa POS sistemom ili zalihama niti poseban status „rasprodato“. Stavku menjate ili uklanjate ručno, odnosno menjate vrednost u povezanoj tabeli. Tako ekran prikazuje ono što ste eksplicitno uneli u izvor.',
        },
        {
          q: 'Šta ostaje na ekranu ako internet privremeno nije dostupan?',
          a: 'Plejer čuva poslednji snimak sadržaja i unapred preuzima podržane medije. Ručni meni i poslednji sinhronizovani podaci mogu nastaviti da se prikazuju. Aplikacije koje zahtevaju mrežu, kao Web page ili YouTube, preskaču se dok se veza ne vrati.',
        },
        {
          q: 'Da li je potreban poseban televizor?',
          a: 'Softver nije vezan za određenu marku displeja. Potreban je ekran i uređaj koji pokreće SignageWall plejer. Izbor običnog televizora ili komercijalnog panela zavisi od radnih sati, svetline prostora, montaže i uslova u kojima će hardver raditi.',
        },
        {
          q: 'Kako se plejer povezuje sa kontrolnom tablom?',
          a: 'Plejer na novom uređaju prikazuje kratak registracioni kod. Operater taj kod unosi u deo za ekrane u kontrolnoj tabli, čime se fizički uređaj povezuje sa jednim logičkim ekranom. Postupak ne koristi skeniranje QR koda.',
        },
      ],
      intent: {
        primaryQuery: 'digitalni meni za restorane i kafiće',
        intentType: 'commercial-investigation',
        audience: 'Vlasnici restorana, kafića i manjih ugostiteljskih lanaca',
        jobToBeDone:
          'Procene kako da zamene štampanu meni tablu sadržajem koji mogu pouzdano da održavaju iz pregledača ili postojeće tabele.',
        uniquePromise:
          'Objašnjava tačan tok održavanja menija, uključujući ručni unos, CSV i povezane tabele, bez tvrdnji o POS funkcijama.',
        notTargeting:
          'Hotelska signalizacija, maloprodajne kampanje, POS sistemi, onlajn poručivanje i automatsko zakazivanje dnevnih menija.',
      },
    },
    en: {
      name: 'Restaurants and cafés',
      tagline:
        'A digital menu for dishes, drinks and prices, edited from a browser. Enter items manually, import a CSV, or connect a Google Sheets or Excel workbook.',
      title: 'Digital menu boards for restaurants and cafés',
      subtitle:
        'Put a readable menu on a television or commercial display, update the same menu on connected screens, and retain downloaded content when the connection is unavailable.',
      metaTitle: 'Digital menu boards for restaurants and cafés',
      metaDescription:
        'Build a menu board with dishes and prices using manual entry, CSV import, Google Sheets or Microsoft Excel, and show it across connected screens.',
      intro: `A digital menu is useful when it removes a specific operational problem: a price or description should not require another print run whenever the offer changes. The SignageWall Menu board app displays an item name, price, description, category and image in a choice of purpose-built designs. You can maintain the rows in the dashboard, import an existing CSV once, or connect a Google Sheets or Microsoft Excel workbook. With a connected workbook, you choose which columns represent the name, price, description, category and image, so the screen reads from a source the team already understands.

This is not a point-of-sale system, stock system or ordering tool. SignageWall does not know that a dish has sold out, and it does not swap menus by time of day. When information matters, the person responsible for the menu changes it in the manual editor or the connected workbook. Editing the same app instance pushes its new configuration to connected players that use it, without visiting the television. Different screens can use different menu instances, such as a food board and a separate drinks board.

A menu can sit alongside a QR code, a short text notice, weather, a clock or a ticker. Images, video and other apps can also be arranged in a playlist with a duration for each item. Where prices must remain visible, a simple board with large type is usually more dependable than a long rotation. The purpose of the page is to help a restaurant assess that workflow, not to imply sales results that the software cannot measure.`,
      scenarios: [
        {
          title: 'A menu maintained in the dashboard',
          body: 'For a short offer, enter items directly in the Menu board app. Each row can include a name, price, description, category and image, while the selected currency and symbol position apply consistently to the full board.',
        },
        {
          title: 'Importing an existing offer',
          body: 'If the offer already lives in a CSV file, import its rows instead of typing them again. CSV import is a starting point; later changes happen in the dashboard unless you switch to a connected spreadsheet source.',
        },
        {
          title: 'Google Sheets or Excel as the source',
          body: 'Connect an account, choose the document and map its columns. SignageWall reads the selected data and refreshes the display; it does not edit the source workbook and it does not connect the workbook to a till.',
        },
        {
          title: 'A call to action guests can take away',
          body: 'The QR app can open a reservation page, join Wi-Fi, call a number, compose an email or lead to a Google review. The code and its caption are a separate content item that can be placed with a menu.',
        },
        {
          title: 'Practical information around the offer',
          body: 'A clock, forecast, text notice or ticker can cover opening hours, terrace information or collection instructions. Use each one to answer a real guest question rather than filling space around the menu.',
        },
      ],
      benefits: [
        'One place to maintain item names, descriptions and prices',
        'Manual entry, CSV import or a connected spreadsheet source',
        'One content instance can be assigned to multiple selected screens',
      ],
      proof: {
        title: 'Illustrative workflow, not a customer result',
        body: 'Consider a café whose source menu is a Google Sheet and whose counter has two screens. The owner connects the sheet, maps the five relevant columns and adds the same Menu board instance to both screens. When a value changes in the sheet, the connector fetches it and connected players receive the refreshed payload. This example describes the product workflow; it does not promise revenue growth, savings or a fixed refresh time on every network.',
      },
      faq: [
        {
          q: 'Can SignageWall read a menu from Google Sheets or Microsoft Excel?',
          a: 'Yes. Menu board supports manual rows, CSV import, Google Sheets and Microsoft Excel. Connected sources require the relevant Google or Microsoft account and OAuth configuration on the service. You select the document, worksheet and column mapping, with access intended for reading menu data.',
        },
        {
          q: 'Can it change automatically between breakfast, lunch and dinner?',
          a: 'No. The current product does not schedule individual content items by daypart. You can prepare separate menu instances and manually choose which one is assigned to a screen, but this page does not present that as automatic dayparting.',
        },
        {
          q: 'Can the app mark a dish as sold out on its own?',
          a: 'There is no built-in POS or stock integration and no dedicated sold-out state. Remove or edit the item manually, or change the corresponding value in the connected workbook. The board displays the information explicitly supplied by its configured source.',
        },
        {
          q: 'What remains on screen if the internet connection drops?',
          a: 'The player persists its last content snapshot and prefetches supported media. A manual menu and last-synchronised data can continue to render. Network-only apps such as Web page and YouTube are skipped until connectivity returns, so offline behaviour depends on the content selected.',
        },
        {
          q: 'Does the menu require a special television?',
          a: 'The software is not tied to a display brand. You need a screen and a device that runs the SignageWall player. Choosing a consumer television or commercial panel depends on operating hours, ambient light, mounting and the physical conditions at the site.',
        },
        {
          q: 'How is a player connected to the dashboard?',
          a: 'A new player shows a short registration code. An operator enters that code in the Screens area of the dashboard, binding the physical device to one logical screen. The current pairing flow uses code entry rather than scanning a QR code.',
        },
      ],
      intent: {
        primaryQuery: 'digital menu boards for restaurants and cafes',
        intentType: 'commercial-investigation',
        audience: 'Owners and operators of restaurants, cafés and small hospitality groups',
        jobToBeDone:
          'Evaluate how to replace a printed menu board with content maintained reliably in a browser or an existing spreadsheet.',
        uniquePromise:
          'Explains the exact manual, CSV and spreadsheet menu workflow without implying point-of-sale functionality or automated dayparting.',
        notTargeting:
          'Hotel signage, retail campaign management, point-of-sale systems, online ordering and automatic daypart menu scheduling.',
      },
    },
  },
  {
    slug: 'retail',
    srSlug: 'maloprodaja',
    icon: 'shopping-bag',
    order: 20,
    recommendedApps: 'text,qr,countdown,menu,pdf,powerpoint',
    links: {
      posts: [
        'ekrani-u-maloprodaji-od-izloga-do-kase',
        'ekran-u-izlogu-citljivost',
        'vise-lokacija-jedan-tim',
      ],
      solutions: ['hospitality', 'office'],
      apps: ['text', 'qr', 'countdown', 'menu', 'pdf', 'powerpoint'],
    },
    sr: {
      name: 'Maloprodaja',
      tagline:
        'Promotivni sadržaj za izlog, prodajni prostor i kasu, sa centralnim pregledom povezanih uređaja. Odabrani mediji, plejliste i aplikacije mogu se dodati na više eksplicitno izabranih ekrana.',
      title: 'Digital signage za maloprodajne objekte',
      subtitle:
        'Pripremite različite poruke za različite tačke prodajnog puta, daljinski izmenite sadržaj i proverite da li je plejer povezan, bez tvrdnji o POS ili zalihama.',
      metaTitle: 'Digital signage za maloprodaju',
      metaDescription:
        'Upravljajte promotivnim ekranima u izlogu, prodajnom prostoru i kod kase koristeći medije, plejliste, QR kod, PDF i cenovnike sa jednog naloga.',
      intro: `Ekran u izlogu, ekran uz policu i ekran kod kase nemaju isti zadatak. Izlog traži kratku poruku koja se čita u prolazu. Uz policu ima smisla objasniti proizvod ili prikazati nekoliko detalja. Kod kase publika već čeka, ali sadržaj i dalje mora da bude jasan i koristan. SignageWall omogućava da svaki logički ekran dobije sopstvenu listu medija, plejlista i aplikacija, sa redosledom i trajanjem stavki. Isti postojeći sadržaj možete dodati na više ekrana koje izaberete u kontrolnoj tabli.

Sistem ne pravi trajne grupe po gradu, tipu radnje ili poziciji u objektu. Ne pokreće kampanju u zakazanom trenutku i ne čita zalihe ili cene iz POS sistema. Za podatke koji već postoje u tabeli možete koristiti Google Sheets aplikaciju, Menu board sa povezanim Google Sheets ili Excel izvorom, ili javnu stranicu koja dozvoljava prikaz u okviru. To je prikaz postojećeg izvora, a ne gotova integracija sa poslovnim sistemom.

Operater vidi da li je uređaj povezan i kada je poslednji put viđen. Izmena sadržaja ili konfiguracije aplikacije proizvodi novu verziju snimka koju server šalje povezanom plejeru. Plejer čuva poslednji snimak i preuzima podržane slike i video unapred, dok aplikacije koje zavise od interneta nisu dostupne bez mreže. Ove granice su važne za izlog koji treba da nastavi da prikazuje osnovnu kampanju i tokom kratkog prekida veze.`,
      scenarios: [
        {
          title: 'Izlog sa jednom jasnom porukom',
          body: 'Koristite fotografiju ili video sa kratkim tekstom koji je čitljiv kroz staklo. Svetlina, odsjaj i veličina slova rešavaju se izborom hardvera i dizajnom; softver ne može da nadoknadi panel koji nije dovoljno svetao za direktno sunce.',
        },
        {
          title: 'Detalji uz policu ili proizvod',
          body: 'PDF, PowerPoint, tekst i QR kod mogu da objasne karakteristike, poreklo ili uputstvo i odvedu kupca na detaljnu stranicu. Prikazujte samo informacije koje vaš tim održava i može da potvrdi.',
        },
        {
          title: 'Cenovnik iz tabele',
          body: 'Za kraću listu koristite Menu board sa ručnim unosom, CSV uvozom ili povezanim Google Sheets odnosno Excel izvorom. To nije POS sinhronizacija: tabela ostaje izvor koji vaš tim uređuje.',
        },
        {
          title: 'Isti materijal na odabranim ekranima',
          body: 'Kontrolna tabla podržava dodavanje istih medija, plejlista ili aplikacija na više konkretno označenih ekrana. Svaki ekran i dalje ostaje zaseban zapis sa sopstvenim sadržajem i stanjem uređaja.',
        },
        {
          title: 'Sadržaj koji preživi kratak prekid veze',
          body: 'Slike, video i aplikacije koje rade iz lokalne konfiguracije mogu ostati dostupni iz keša. Javni veb sajt, YouTube i drugi mrežni izvori preskaču se dok plejer ponovo ne dobije pristup internetu.',
        },
      ],
      benefits: [
        'Različit sadržaj za izlog, policu i kasu',
        'Daljinska izmena bez obilaska svakog displeja',
        'Pregled povezanosti i poslednjeg javljanja plejera',
      ],
      proof: {
        title: 'Ilustrativan tok rada, ne rezultat prodavnice',
        body: 'Primer je lanac sa četiri ekrana: dva izloga, jednim ekranom u prodajnom prostoru i jednim kod kase. Tim priprema tri plejliste, zatim isti izložni materijal dodaje na oba izloga eksplicitnim izborom ta dva ekrana. Ekran kod kase dobija zasebnu plejlistu sa QR kodom. Tok pokazuje kako se sadržaj raspoređuje; ne tvrdi da postoje sačuvane grupe, zakazivanje kampanje ili merljiv rast prodaje.',
      },
      faq: [
        {
          q: 'Mogu li isti sadržaj da dodam na više ekrana?',
          a: 'Da. Operater može izabrati više konkretnih ekrana i na njih dodati medije, plejliste ili aplikacije. To je grupna radnja nad izabranim ID-jevima, a ne sistem trajnih grupa po lokaciji, regionu ili ulozi ekrana.',
        },
        {
          q: 'Može li kampanja sama da krene u ponedeljak u određeno vreme?',
          a: 'Ne. Trenutni model sadržaja nema datum početka, datum isteka niti vremenski prozor po stavci ili plejlisti. Postoji raspored radnih sati celog ekrana koji uključuje crni standby prikaz, ali on ne zakazuje pojedinačnu kampanju.',
        },
        {
          q: 'Da li SignageWall čita cene i zalihe iz kase?',
          a: 'Ne postoji gotova POS ili stock integracija. Menu board može da čita mapirane kolone iz Google Sheets ili Excel tabele, Google Sheets aplikacija prikazuje izabrani raspon, a Web page može da prikaže javnu stranicu koja dozvoljava iframe.',
        },
        {
          q: 'Kako proveravam da li je uređaj povezan?',
          a: 'CMS dobija stanje prisutnosti sa plejera i prikazuje da li je uređaj onlajn, uz vreme poslednjeg javljanja. To potvrđuje vezu sa plejerom; nije senzor koji može da potvrdi da je fizički panel uključen ili da je slika vidljiva.',
        },
        {
          q: 'Mogu li lokalni menadžeri da uređuju samo jedan ekran uz odobrenje centrale?',
          a: 'Ne na tom nivou. Organizacija razlikuje administratore i članove, ali trenutni screen content endpointi nisu ograničeni na pojedinačne ekrane i nemaju tok odobravanja pre objave. Zato ova stranica ne obećava granularna prava.',
        },
        {
          q: 'Šta treba proveriti za ekran u izlogu?',
          a: 'Najpre svetlinu u realnim uslovima, odsjaj, smer gledanja, radne sate i bezbednu montažu. Za direktno sunce obično je potreban displej visoke svetline. Orijentacija i skaliranje mogu se podesiti na plejeru, ali hardver određuje vidljivost.',
        },
      ],
      intent: {
        primaryQuery: 'digital signage za maloprodaju',
        intentType: 'commercial-investigation',
        audience: 'Vlasnici prodavnica i timovi koji održavaju sadržaj na više prodajnih ekrana',
        jobToBeDone:
          'Razumeju kako da rasporede promotivne medije po tačkama prodajnog prostora i daljinski održavaju odabrane ekrane.',
        uniquePromise:
          'Razdvaja uloge izloga, police i kase i opisuje stvarni model izbora ekrana bez izmišljanja grupa ili POS integracije.',
        notTargeting:
          'Digitalni restoranski meniji, elektronske etikete na rafovima, POS platforme, upravljanje zalihama i automatsko zakazivanje kampanja.',
      },
    },
    en: {
      name: 'Retail',
      tagline:
        'Promotional content for the window, shop floor and checkout, with a central view of connected devices. Media, playlists and apps can be added to multiple explicitly selected screens.',
      title: 'Digital signage for retail stores',
      subtitle:
        'Prepare different messages for different points in the shopping journey, edit content remotely and check player connectivity without implying POS or inventory functionality.',
      metaTitle: 'Digital signage for retail stores',
      metaDescription:
        'Manage promotional screens in windows, on the shop floor and at checkout with media, playlists, QR codes, PDFs and price lists from one dashboard.',
      intro: `A window screen, a shelf-side screen and a checkout screen do not have the same job. The window needs a short message that survives a passing glance. Beside a product, there is room to explain or compare. At the checkout, the audience is waiting, but the content still needs to be useful and easy to read. SignageWall lets each logical screen carry its own ordered list of media, playlists and apps, with a duration for each applicable item. Existing content can also be added to several screens explicitly selected in the dashboard.

The system does not create persistent target groups by city, store type or position. It does not launch a campaign at a scheduled moment and it does not read stock or prices from a point-of-sale system. Where data already exists in a spreadsheet, you can use the Google Sheets app, a Menu board connected to Google Sheets or Excel, or a public web page that permits embedding. That displays a source your team maintains; it is not a packaged integration with a retail business system.

An operator can see whether a player is connected and when it was last seen. A content or app-configuration change creates a new snapshot revision that the server pushes to a connected player. The player persists its last snapshot and prefetches supported image and video assets, while network-dependent apps are unavailable without connectivity. Those boundaries matter for a window where core campaign media should remain available through a short network interruption.`,
      scenarios: [
        {
          title: 'A window with one clear message',
          body: 'Use an image or video with a short line that remains readable through glass. Brightness, reflections and type size are hardware and design decisions; software cannot compensate for a panel that is too dim in direct sun.',
        },
        {
          title: 'Product detail at the shelf',
          body: 'A PDF, PowerPoint, text item or QR code can explain a feature, provenance or instructions and lead to a longer product page. Show only information the business maintains and can verify.',
        },
        {
          title: 'A price list sourced from a workbook',
          body: 'For a compact list, use Menu board with manual rows, CSV import, Google Sheets or Excel. This is not POS synchronisation: the workbook remains a source maintained by your team.',
        },
        {
          title: 'The same asset on selected screens',
          body: 'The dashboard can add the same media, playlists or app instances to multiple specifically selected screens. Each screen remains a separate record with its own content list and device presence.',
        },
        {
          title: 'Content through a short outage',
          body: 'Images, video and apps based on local configuration can remain available from cache. Public web pages, YouTube and other network-only sources are skipped until the player is online again.',
        },
      ],
      benefits: [
        'Different content for the window, shelf and checkout',
        'Remote edits without visiting every display',
        'Visibility into player connectivity and last-seen time',
      ],
      proof: {
        title: 'Illustrative workflow, not a store result',
        body: 'Consider a store network with four screens: two windows, one shop-floor screen and one checkout display. The team prepares three playlists, then adds the same window material to the two window screens by explicitly selecting both. The checkout receives a separate playlist with a QR code. The example describes content assignment; it does not claim saved target groups, campaign scheduling or a measured sales increase.',
      },
      faq: [
        {
          q: 'Can I add the same content to several screens?',
          a: 'Yes. An operator can select several specific screens and add media, playlists or app instances to them. This is a bulk action over selected screen identifiers, not a persistent grouping system by location, region or screen role.',
        },
        {
          q: 'Can a campaign start automatically at a set time on Monday?',
          a: 'No. The current content model has no start date, expiry date or time window for an item or playlist. A whole screen can enter black standby outside configured working hours, but that does not schedule an individual campaign.',
        },
        {
          q: 'Does SignageWall read prices and inventory from a till?',
          a: 'There is no packaged POS or inventory integration. Menu board can read mapped columns from Google Sheets or Excel, the Google Sheets app can display a selected range, and Web page can show a public URL that permits iframe embedding.',
        },
        {
          q: 'How can I check whether a device is connected?',
          a: 'The CMS receives player presence and shows online state together with the last-seen time. This confirms communication with the player; it is not a physical sensor and cannot prove that the panel itself is powered or visibly displaying an image.',
        },
        {
          q: 'Can a local manager edit only one screen with head-office approval?',
          a: 'Not at that level. An organisation has administrator and member roles, but current screen-content endpoints are not scoped to individual screens and there is no pre-publication approval workflow. This page therefore does not promise granular permissions.',
        },
        {
          q: 'What should I check for a shop-window display?',
          a: 'Check real-world brightness, reflections, viewing direction, operating hours and safe mounting first. Direct sunlight usually calls for a high-brightness panel. Player orientation and scaling can be configured, but the hardware determines whether the image is visible.',
        },
      ],
      intent: {
        primaryQuery: 'digital signage for retail stores',
        intentType: 'commercial-investigation',
        audience:
          'Store owners and teams maintaining promotional content across several retail displays',
        jobToBeDone:
          'Understand how to place promotional media at different points in a store and maintain selected screens remotely.',
        uniquePromise:
          'Separates the jobs of window, shelf and checkout screens while describing real multi-screen selection without invented groups or POS integration.',
        notTargeting:
          'Restaurant menu boards, electronic shelf labels, point-of-sale platforms, inventory management and automatic campaign scheduling.',
      },
    },
  },
  {
    slug: 'office',
    srSlug: 'kancelarije',
    icon: 'building',
    order: 30,
    recommendedApps: 'text,gcal,outlook,powerbi,gsheets,teams',
    links: {
      posts: [
        'interna-komunikacija-ekran-umesto-mejla',
        'google-sheets-na-ekranu',
        'vise-lokacija-jedan-tim',
      ],
      solutions: ['manufacturing', 'education', 'hotels'],
      apps: ['text', 'gcal', 'outlook', 'powerbi', 'gsheets', 'teams'],
    },
    sr: {
      name: 'Kancelarije',
      tagline:
        'Ekrani za interna obaveštenja, kalendare sala i postojeće poslovne pokazatelje. Prikažite sadržaj iz Text, Google Calendar, Outlook, Power BI, Google Sheets i Teams aplikacija.',
      title: 'Digitalni ekrani za internu komunikaciju',
      subtitle:
        'Postavite kratke poruke u zajednički prostor, prikažite kalendar u režimu samo za čitanje i donesite postojeći dashboard na ekran uz jasno definisane uslove pristupa.',
      metaTitle: 'Ekrani za internu komunikaciju u kancelariji',
      metaDescription:
        'Prikažite obaveštenja, Google ili Outlook kalendar, Power BI javni izveštaj, Google Sheets KPI i Teams poruke na ekranima u kancelariji.',
      intro: `Kancelarijski ekran je kanal za informacije koje treba videti u prolazu, bez otvaranja još jedne poruke. Najbolje radi sa kratkim obaveštenjima, današnjim događajima, raspoloživošću sale i malim brojem pokazatelja koji su već odobreni za širu publiku. Text aplikacija pokriva uredničke poruke, dok Google Calendar i Outlook Calendar čitaju događaje iz izabranog kalendara. Kalendar ostaje izvor istine: SignageWall ga prikazuje, ali ne pravi, pomera niti otkazuje rezervacije.

Za brojke postoje tri različita puta. Google Sheets prikazuje izabrani raspon kao tabelu ili jedan KPI. Power BI prikazuje izveštaj objavljen opcijom Publish to web i može periodično ponovo da ga učita. Web page učitava javnu stranicu u iframe samo ako njen vlasnik to dozvoljava. To znači da privatni dashboard koji traži interaktivnu prijavu nije automatski podržan. Pre postavljanja bilo kog poslovnog podatka na zid, tim treba da proveri ko prolazi pored ekrana i da koristi izvor namenjen takvom prikazu.

Teams aplikacija može da prikaže poruke i objave iz povezanog kanala, uz Microsoft nalog i odgovarajuću OAuth konfiguraciju. Ona nije alat za slanje poruka niti zamena za razgovor u Teams-u. Kancelarijska stranica zato ne obećava „angažovanost zaposlenih“ ili stopu čitanja. Njena svrha je jednostavnija: objasniti kako se postojeći, provereni izvori mogu pretvoriti u tih, deljen prikaz u recepciji, kuhinji ili ispred sale.`,
      scenarios: [
        {
          title: 'Kratko interno obaveštenje',
          body: 'Text aplikacija prikazuje naslov i prateći tekst u odabranim bojama i tipografiji. Koristite je za poruku koja se razume bez zvuka i bez dodatnog konteksta, a ne za sadržaj koji traži odgovor ili poverljivu diskusiju.',
        },
        {
          title: 'Kalendar ispred sale',
          body: 'Google Calendar ili Outlook može da prikaže dan, nedelju, mesec ili listu narednih događaja. Prikaz je samo za čitanje: rezervacije se i dalje uređuju u Google ili Microsoft kalendaru.',
        },
        {
          title: 'Jedan KPI iz Google Sheets-a',
          body: 'Povežite Google nalog, izaberite tabelu i A1 raspon, pa prikažite tabelu ili jednu vrednost. Konektor čita podatke; ne računa KPI i ne menja dokument iz kog ih preuzima.',
        },
        {
          title: 'Power BI izveštaj namenjen javnom prikazu',
          body: 'Power BI aplikacija koristi Publish to web adresu. Takav link je javno dostupan svakome ko ga zna, pa nije pogodan za poverljive finansijske, personalne ili korisničke podatke.',
        },
        {
          title: 'Poruke iz Teams kanala',
          body: 'Povezana Teams aplikacija prikazuje sadržaj iz odabranog tima i kanala u spotlight ili grid izgledu. Potrebna je Microsoft konfiguracija, a ekran služi za čitanje, ne za uređivanje ili odgovaranje.',
        },
      ],
      benefits: [
        'Poruke i izvori prikazani tamo gde tim prolazi',
        'Kalendari se čitaju bez menjanja rezervacija',
        'Jasna razlika između javnih i privatnih dashboarda',
      ],
      proof: {
        title: 'Ilustrativan tok rada, ne dokaz dosega',
        body: 'Primer kancelarije koristi tri ekrana. Recepcija dobija Text poruku i vremensku prognozu, ekran ispred sale prikazuje izabrani Outlook kalendar, a ekran u kuhinji jedan KPI iz Google Sheets-a. Operater pravi tri aplikacijske instance i dodeljuje ih odgovarajućim ekranima. Primer pokazuje podelu izvora i publike; ne tvrdi koliko zaposlenih je poruku videlo niti da je komunikacija time postala uspešnija.',
      },
      faq: [
        {
          q: 'Može li SignageWall da menja rezervacije sale?',
          a: 'Ne. Google Calendar i Outlook Calendar su prikazi u režimu samo za čitanje. Događaj pravite, menjate ili brišete u originalnom kalendaru, a konektor kasnije preuzima podatke za ekran. To sprečava da displej postane drugi sistem za rezervacije.',
        },
        {
          q: 'Da li mogu da prikažem privatni Power BI izveštaj?',
          a: 'Ugrađena Power BI aplikacija očekuje Publish to web URL, koji je javni način deljenja. Ne predstavlja bezbedan authenticated embed za poverljive izveštaje. Ako podaci nisu namenjeni javnom linku i svima u prostoriji, nemojte ih prikazivati ovom metodom.',
        },
        {
          q: 'Da li svaka veb stranica može da se prikaže?',
          a: 'Ne. Web page aplikacija koristi iframe, a mnogi sajtovi blokiraju takav prikaz bezbednosnim zaglavljima. Najpouzdanija je stranica koju kontrolišete ili zvaničan javni share link dashboarda koji eksplicitno dozvoljava ugrađivanje.',
        },
        {
          q: 'Radi li Google Sheets prikaz bez interneta?',
          a: 'Poslednji sinhronizovani payload putuje u snimku sadržaja i može ostati prikazan, uz podatak o svežini. Nova vrednost ne može stići dok server i plejer nemaju vezu, pa vremenski osetljiv KPI treba da prikazuje i vreme poslednjeg osvežavanja.',
        },
        {
          q: 'Može li ekran da šalje ili menja Teams poruke?',
          a: 'Ne. Teams aplikacija je prikaz povezanog izvora. Ona čita odabrani kanal i renderuje podržani sadržaj na ekranu; pisanje, odgovaranje, moderacija i radni tok ostaju u Microsoft Teams-u.',
        },
        {
          q: 'Ko treba da uređuje kancelarijski ekran?',
          a: 'Organizacija ima administratore i članove, ali nema granularno pravo na jedan ekran niti tok odobravanja sadržaja. Interno odredite vlasnika kanala i pravilo šta sme na zajednički ekran, posebno kada prostor vide posetioci.',
        },
      ],
      intent: {
        primaryQuery: 'digitalni ekrani za internu komunikaciju',
        intentType: 'commercial-investigation',
        audience: 'Timovi interne komunikacije, office menadžeri i IT administratori',
        jobToBeDone:
          'Procene kako da na zajedničkim ekranima prikažu proverene poruke, kalendare i postojeće poslovne pokazatelje.',
        uniquePromise:
          'Razdvaja uredničke poruke, read-only kalendare i javne dashboard izvore uz jasna upozorenja za poverljive podatke.',
        notTargeting:
          'Školska obaveštenja, fabrički KPI displeji, sistemi za rezervaciju sala, analitika čitanosti i HR intranet platforme.',
      },
    },
    en: {
      name: 'Offices',
      tagline:
        'Screens for internal notices, room calendars and existing business metrics. Display content from Text, Google Calendar, Outlook, Power BI, Google Sheets and Teams apps.',
      title: 'Digital signage for internal communications',
      subtitle:
        'Put concise messages in shared spaces, show a calendar in read-only mode and bring an existing dashboard to a screen with clearly defined access conditions.',
      metaTitle: 'Digital signage for internal communications',
      metaDescription:
        'Show notices, Google or Outlook calendars, a public Power BI report, Google Sheets KPIs and Teams messages on screens in shared office spaces.',
      intro: `An office screen is a channel for information that should be visible in passing, without asking somebody to open another message. It works best for concise notices, today’s events, room availability and a small set of metrics already approved for a broad audience. The Text app covers editorial messages, while Google Calendar and Outlook Calendar read events from a selected calendar. The calendar remains the source of truth: SignageWall displays it but does not create, move or cancel bookings.

There are three distinct routes for metrics. Google Sheets shows a selected range as a table or a single KPI. Power BI displays a report shared with Publish to web and can reload it at a chosen interval. Web page loads a public URL in an iframe only when the site owner permits framing. A private dashboard that depends on an interactive sign-in is therefore not automatically supported. Before putting any business figure on a wall, the team should consider who walks past the display and use a source intended for that audience.

The Teams app can display posts and announcements from a connected channel when Microsoft OAuth is configured. It is not a tool for sending messages and it does not replace discussion inside Teams. This page consequently makes no promise about employee engagement or message readership. Its narrower purpose is to explain how existing, verified sources can become a quiet shared display in reception, a kitchen or outside a meeting room.`,
      scenarios: [
        {
          title: 'A concise internal notice',
          body: 'The Text app presents a heading and supporting copy with configurable colours and typography. Use it for a message understood without sound or extra context, not for content that needs a reply or a confidential discussion.',
        },
        {
          title: 'A calendar outside a room',
          body: 'Google Calendar or Outlook can show a day, week, month or upcoming-event schedule. The display is read-only: bookings continue to be managed in the original Google or Microsoft calendar.',
        },
        {
          title: 'One KPI from Google Sheets',
          body: 'Connect a Google account, choose a spreadsheet and A1 range, then show a table or one value. The connector reads the data; it does not calculate the KPI or edit the source document.',
        },
        {
          title: 'A Power BI report intended for public display',
          body: 'The Power BI app uses a Publish to web address. Anyone with that URL can access it, so the method is unsuitable for confidential finance, employee or customer information.',
        },
        {
          title: 'Posts from a Teams channel',
          body: 'The connected Teams app displays content from a selected team and channel in a spotlight or grid layout. Microsoft configuration is required, and the screen is a reading surface rather than an editor.',
        },
      ],
      benefits: [
        'Messages and sources shown where the team already passes',
        'Calendars displayed without changing bookings',
        'A clear distinction between public and private dashboards',
      ],
      proof: {
        title: 'Illustrative workflow, not evidence of reach',
        body: 'Consider an office with three screens. Reception receives a Text notice and weather, a room display reads one Outlook calendar, and the kitchen screen shows a single Google Sheets KPI. The operator creates three app instances and assigns them to the relevant screens. The example demonstrates audience and source separation; it does not claim how many employees noticed the message or that communication outcomes improved.',
      },
      faq: [
        {
          q: 'Can SignageWall change a meeting-room booking?',
          a: 'No. Google Calendar and Outlook Calendar are read-only displays. Create, edit or delete an event in the original calendar, after which the connector fetches it for the screen. The display does not become a second booking system.',
        },
        {
          q: 'Can I show a private Power BI report?',
          a: 'The built-in Power BI app expects a Publish to web URL, which is a public sharing method. It is not an authenticated embed for confidential reports. If the data is unsuitable for a public link or everyone in the room, do not display it by this route.',
        },
        {
          q: 'Can every website be embedded?',
          a: 'No. Web page uses an iframe, and many sites block framing with security headers. A page you control or an official public dashboard share link that explicitly permits embedding is the most reliable source.',
        },
        {
          q: 'Does a Google Sheets display work without internet?',
          a: 'The last synchronised payload travels in the content snapshot and can remain visible with freshness metadata. A new value cannot arrive without connectivity, so a time-sensitive KPI should include its own last-updated time.',
        },
        {
          q: 'Can the screen send or edit Teams messages?',
          a: 'No. The Teams app is a display for a connected source. It reads a selected channel and renders supported content; writing, replying, moderation and workflow remain in Microsoft Teams.',
        },
        {
          q: 'Who should be allowed to edit an office screen?',
          a: 'An organisation has administrators and members, but there is no per-screen permission or content-approval workflow. Define an internal owner and a rule for what belongs on the shared display, particularly where visitors can see it.',
        },
      ],
      intent: {
        primaryQuery: 'digital signage for internal communications',
        intentType: 'commercial-investigation',
        audience: 'Internal communications teams, office managers and IT administrators',
        jobToBeDone:
          'Evaluate how to place verified notices, calendars and existing business metrics on screens in shared office spaces.',
        uniquePromise:
          'Separates editorial messages, read-only calendars and public dashboard sources while stating the confidentiality boundaries for each.',
        notTargeting:
          'School announcements, factory KPI boards, room-booking systems, readership analytics and human-resources intranet software.',
      },
    },
  },
  {
    slug: 'hotels',
    srSlug: 'hoteli',
    icon: 'hotel',
    order: 40,
    recommendedApps: 'text,weather,clock,gcal,qr,menu',
    links: {
      posts: [
        'digital-signage-za-pocetnike',
        'tipografija-za-ekrane',
        'ekran-mora-da-radi-i-bez-interneta',
      ],
      solutions: ['hospitality', 'office'],
      apps: ['text', 'weather', 'clock', 'gcal', 'qr', 'menu'],
    },
    sr: {
      name: 'Hoteli',
      tagline:
        'Informacije za hotelski hol, konferencijski deo i zajedničke prostore. Kombinujte tekst, prognozu, sat, kalendar događaja, QR kod i cenovnik usluga.',
      title: 'Digitalni ekrani za hotelski hol i goste',
      subtitle:
        'Prikažite informacije koje hotel već održava (vreme usluga, događaje, prognozu i korisne linkove) bez predstavljanja SignageWall-a kao hotelskog ili in-room TV sistema.',
      metaTitle: 'Digitalni ekrani za hotele i hotelski hol',
      metaDescription:
        'Prikažite hotelske informacije, vremensku prognozu, kalendar događaja, QR linkove i cenovnik usluga na ekranima u holu i konferencijskom delu.',
      intro: `Hotelski ekran treba da odgovori na praktično pitanje u prostoru u kom ono nastaje. U holu su to vreme doručka, lokacija sale, prognoza i uputstvo za Wi-Fi ili lokalnu stranicu. Ispred konferencijske sale to je naziv i vreme događaja iz kalendara. Kod spa centra ili restorana to može biti kratak cenovnik koji osoblje održava ručno ili u povezanoj tabeli. SignageWall obezbeđuje aplikacije za te prikaze i plejlistu koja kombinuje medije i aplikacije na jednom logičkom ekranu.

Proizvod nije property-management sistem, sistem za prijavu gostiju, hotelska televizija u sobama niti izvor podataka o letovima. Flight informacije mogu se prikazati samo ako hotel već ima javnu stranicu ili feed pogodan za jednu od postojećih aplikacija; takav izvor nije uključen u proizvod. Isto važi za transfer, status sobe i druge podatke iz hotelskog poslovnog sistema. Ova stranica se zato zadržava na sadržaju koji je proverljivo podržan.

Za više jezika hotel može napraviti zasebne tekstualne ili medijske stavke i staviti ih u istu rotaciju, ili dodeliti različit sadržaj različitim ekranima. Ne postoji pravilo koje automatski prevodi sadržaj ili bira jezik gosta. Raspored radnih sati može staviti ceo plejer u crni standby van izabranih radnih prozora, ali ne gasi fizički panel i ne menja pojedinačne poruke po dobu dana. Jasno razdvajanje tih mogućnosti pomaže hotelu da planira sadržaj koji će zaista moći da održava.`,
      scenarios: [
        {
          title: 'Dnevne informacije u holu',
          body: 'Text aplikacija može da prikaže vreme doručka, lokaciju recepcije ili kratko uputstvo. Vreme i prognoza dolaze iz zasebnih Clock i Weather aplikacija, pa se dinamični podaci ne prekucavaju u sliku.',
        },
        {
          title: 'Program konferencijskih sala',
          body: 'Google Calendar prikazuje izabrani kalendar kao dan, nedelju, mesec ili listu događaja. Hotel održava događaje u Google kalendaru; ekran ih samo čita i ne upravlja rezervacijama.',
        },
        {
          title: 'QR kod za uslugu ili lokalni vodič',
          body: 'QR može da otvori hotelsku stranicu, Wi-Fi, broj telefona ili imejl. Ciljna stranica i njena tačnost ostaju odgovornost hotela, dok SignageWall generiše i prikazuje kod sa kratkim natpisom.',
        },
        {
          title: 'Cenovnik spa ili restoranske usluge',
          body: 'Menu board može da prikaže naziv, cenu, opis, kategoriju i fotografiju. Podaci se unose ručno, uvoze iz CSV-a ili čitaju iz Google Sheets odnosno Excel dokumenta.',
        },
        {
          title: 'Osnovni sadržaj tokom prekida veze',
          body: 'Plejer čuva poslednji snimak, a podržani mediji se unapred preuzimaju. Prognoza ili kalendar mogu prikazati poslednje sinhronizovane podatke, dok mrežni iframe i streaming sadržaj čekaju povratak interneta.',
        },
      ],
      benefits: [
        'Jednostavne informacije tamo gde ih gost traži',
        'Kalendar i prognoza iz postojećih izvora',
        'Jasna granica između signage-a i hotelskih poslovnih sistema',
      ],
      proof: {
        title: 'Ilustrativan tok rada, ne hotelska studija slučaja',
        body: 'Primer hotela koristi ekran u holu i ekran ispred konferencijske sale. Hol vrti Text poruku, prognozu i QR kod ka lokalnom vodiču. Drugi ekran prikazuje jedan Google kalendar sa događajima u sali. Recepcija održava tekst i ciljnu stranicu, a event tim kalendar. Primer pokazuje podelu odgovornosti; ne obećava manje pitanja gostiju, prihod od usluga ili integraciju sa PMS-om.',
      },
      faq: [
        {
          q: 'Može li SignageWall da prikaže raspored konferencijske sale?',
          a: 'Da, ako je raspored u Google Calendar ili Outlook Calendar izvoru koji ste povezali. Aplikacija prikazuje događaje u režimu samo za čitanje. Kreiranje i promena rezervacije ostaju u originalnom kalendaru.',
        },
        {
          q: 'Da li aplikacija sadrži podatke o dolascima i odlascima letova?',
          a: 'Ne postoji ugrađen flight-data konektor. Hotel može pokušati da prikaže postojeću javnu veb stranicu ili feed samo ako izvor dozvoljava ugrađivanje i format odgovara podržanoj aplikaciji. SignageWall ne nabavlja niti garantuje te podatke.',
        },
        {
          q: 'Može li ekran automatski da prepozna jezik gosta?',
          a: 'Ne. Možete pripremiti zasebne sadržaje na više jezika i staviti ih u rotaciju, ili različitim ekranima dodeliti različite verzije. Prevod, redosled jezika i provera tačnosti ostaju urednički posao hotela.',
        },
        {
          q: 'Da li je ovo sistem za televizore u hotelskim sobama?',
          a: 'Ne. SignageWall je namenjen upravljanim signage ekranima u zajedničkim prostorima, poput hola, hodnika i prostora događaja. Ne pruža TV kanale, interaktivni portal gosta, naplatu sadržaja niti integraciju sa statusom sobe.',
        },
        {
          q: 'Može li ekran da se ugasi van radnog vremena?',
          a: 'Van definisanih radnih prozora raspored dostupnosti stavlja plejer u crni standby i zaustavlja reprodukciju. Ne šalje komandu fizičkom televizoru da se isključi, pa potrošnja i životni vek zavise od hardvera i njegovih podešavanja.',
        },
        {
          q: 'Da li mogu da prikažem hotelski cenovnik iz Excel-a?',
          a: 'Menu board može da čita mapirane kolone iz povezanog Microsoft Excel dokumenta kada je Microsoft OAuth podešen. Alternativno koristite Google Sheets, CSV uvoz ili ručni unos. To prikazuje cenovnik i nije veza sa PMS ili naplatnim sistemom.',
        },
      ],
      intent: {
        primaryQuery: 'digitalni ekrani za hotele',
        intentType: 'commercial-investigation',
        audience: 'Hotelski operateri, recepcija i timovi koji organizuju događaje u objektu',
        jobToBeDone:
          'Odrede koje proverene informacije mogu da prikažu u holu i konferencijskom delu koristeći postojeće izvore sadržaja.',
        uniquePromise:
          'Fokusira se na hotelski hol, kalendar događaja i informacije za gosta uz eksplicitno isključenje PMS i in-room televizije.',
        notTargeting:
          'Restoranski meni kao primarna namera, hotelski PMS, rezervacioni sistem, in-room TV, flight-data platforma i automatski prevod.',
      },
    },
    en: {
      name: 'Hotels',
      tagline:
        'Information for hotel lobbies, conference areas and shared spaces. Combine text, weather, a clock, event calendars, QR codes and service price lists.',
      title: 'Digital signage for hotel lobbies and guests',
      subtitle:
        'Display information the hotel already maintains (service times, events, weather and useful links) without presenting SignageWall as a hotel-management or in-room TV system.',
      metaTitle: 'Digital signage for hotels and lobbies',
      metaDescription:
        'Show hotel information, weather, event calendars, QR links and service price lists on managed screens in lobbies, shared spaces and conference areas.',
      intro: `A hotel screen should answer a practical question where that question arises. In the lobby, that may be breakfast hours, the location of a room, the forecast or a route to Wi-Fi and a local guide. Outside a conference room, it can be the name and time of an event read from a calendar. Beside a spa or restaurant, it can be a compact price list maintained manually or in a connected workbook. SignageWall provides apps for those displays and a playlist that combines media and apps on one logical screen.

The product is not a property-management system, guest check-in system, in-room television platform or source of flight data. Flight information can only be shown where a hotel already has a public page or feed suitable for an existing app; no such data source is included with the product. The same constraint applies to transfers, room status and other records held in hotel operational software. This page stays with content that is demonstrably supported.

For several languages, a hotel can create separate text or media items and place them in one rotation, or assign different content to different screens. There is no rule that automatically translates a message or selects a guest’s language. Screen working hours can put the whole player into black standby outside configured working windows, but they do not switch off the physical panel and do not change individual messages by daypart. Keeping these boundaries explicit helps a hotel plan content its staff can actually maintain.`,
      scenarios: [
        {
          title: 'Daily lobby information',
          body: 'The Text app can display breakfast times, reception location or a short instruction. Current time and forecast come from separate Clock and Weather apps, so dynamic data does not have to be typed into an image.',
        },
        {
          title: 'A conference-room programme',
          body: 'Google Calendar displays a selected calendar as a day, week, month or upcoming-event list. The hotel maintains events in Google Calendar; the screen reads them and does not manage bookings.',
        },
        {
          title: 'A QR code for a service or local guide',
          body: 'QR can open a hotel page, join Wi-Fi, call a number or compose an email. The destination and its accuracy remain the hotel’s responsibility, while SignageWall generates and displays the code with a caption.',
        },
        {
          title: 'A spa or restaurant service list',
          body: 'Menu board can show a name, price, description, category and image. Rows can be entered manually, imported from CSV or read from Google Sheets or Microsoft Excel.',
        },
        {
          title: 'Core content through a connection interruption',
          body: 'The player persists its last snapshot and prefetches supported media. Weather or calendars can retain last-synchronised data, while network-only iframes and streams wait for internet access to return.',
        },
      ],
      benefits: [
        'Practical information where guests look for it',
        'Calendars and weather from existing sources',
        'A clear boundary between signage and hotel operating systems',
      ],
      proof: {
        title: 'Illustrative workflow, not a hotel case study',
        body: 'Consider a hotel with one lobby screen and one conference-room display. The lobby rotates a Text notice, weather and a QR code to a local guide. The second screen reads one Google calendar for that room. Reception owns the text and destination page, while the events team owns the calendar. The example shows responsibility boundaries; it promises neither fewer guest questions, service revenue nor a PMS integration.',
      },
      faq: [
        {
          q: 'Can SignageWall display a conference-room schedule?',
          a: 'Yes, when the schedule is held in a connected Google Calendar or Outlook Calendar source. The app displays events in read-only mode. Creating or changing a reservation still happens in the original calendar.',
        },
        {
          q: 'Does the product include airport arrivals and departures?',
          a: 'There is no built-in flight-data connector. A hotel may show an existing public page or feed only when the source permits embedding and its format matches a supported app. SignageWall does not source or guarantee that data.',
        },
        {
          q: 'Can a screen detect a guest’s language automatically?',
          a: 'No. You can prepare separate items in several languages and put them in a rotation, or assign different versions to different screens. Translation, language order and accuracy remain editorial responsibilities for the hotel.',
        },
        {
          q: 'Is this an in-room television system?',
          a: 'No. SignageWall manages signage screens in shared areas such as lobbies, corridors and event spaces. It does not provide television channels, an interactive guest portal, paid content or room-status integration.',
        },
        {
          q: 'Can the display switch off outside working hours?',
          a: 'Outside configured working windows, the availability schedule puts the player into a black standby view and stops playback. It does not command the physical television to power down, so energy use and panel life depend on the hardware and its settings.',
        },
        {
          q: 'Can I show a hotel service price list from Excel?',
          a: 'Menu board can read mapped columns from a connected Microsoft Excel workbook when Microsoft OAuth is configured. Google Sheets, CSV import and manual entry are alternatives. This displays a price list and is not a connection to a PMS or billing system.',
        },
      ],
      intent: {
        primaryQuery: 'digital signage for hotels',
        intentType: 'commercial-investigation',
        audience: 'Hotel operators, front-desk teams and staff coordinating events at a property',
        jobToBeDone:
          'Decide which verified information can be shown in lobbies and conference areas using content sources the hotel already maintains.',
        uniquePromise:
          'Focuses on lobby information and event calendars while explicitly excluding property-management and in-room television functionality.',
        notTargeting:
          'Restaurant menu boards as the primary intent, hotel PMS software, booking systems, in-room television, flight-data platforms and automatic translation.',
      },
    },
  },
  {
    slug: 'education',
    srSlug: 'obrazovanje',
    icon: 'graduation-cap',
    order: 50,
    recommendedApps: 'text,gcal,gsheets,gslides,pdf,powerpoint',
    links: {
      posts: [
        'google-sheets-na-ekranu',
        'tipografija-za-ekrane',
        'koliko-dugo-treba-da-traje-slajd',
      ],
      solutions: ['office', 'manufacturing'],
      apps: ['text', 'gcal', 'gsheets', 'gslides', 'pdf', 'powerpoint'],
    },
    sr: {
      name: 'Obrazovanje',
      tagline:
        'Školska i univerzitetska obaveštenja, kalendari, tabele i prezentacije na ekranima u zajedničkim prostorima. Koristite izvore koje ustanova već održava.',
      title: 'Digitalni ekrani za škole i fakultete',
      subtitle:
        'Prikažite urednička obaveštenja, događaje, izabrani raspon tabele, PDF i povezane prezentacije bez predstavljanja sistema kao elektronskog dnevnika ili platforme za hitna upozorenja.',
      metaTitle: 'Digitalni ekrani za škole i fakultete',
      metaDescription:
        'Prikažite školska obaveštenja, kalendar, Google Sheets tabelu, PDF, Google Slides i PowerPoint na ekranima u zajedničkim prostorima škole ili fakulteta.',
      intro: `Ekran u školi ili na fakultetu ima vrednost kada sadržaj dolazi iz izvora koji osoblje već održava. Kratko obaveštenje može se napisati u Text aplikaciji. Događaji mogu doći iz Google Calendar-a. Izabrani raspon Google Sheets tabele može postati tabela ili jedan istaknut podatak. PDF se učitava kao fajl, dok Google Slides i PowerPoint čitaju prezentaciju sa povezanog naloga, pretvaraju slajdove u slike i prikazuju ih u petlji.

SignageWall nije elektronski dnevnik, sistem rasporeda časova niti integracija sa studentskom službom. Ako takav sistem može da objavi javnu stranicu koja dozvoljava iframe, Web page aplikacija tehnički može da je prikaže, ali to nije namenski konektor i stranica može odbiti ugrađivanje. Za raspored u tabeli tim može eksplicitno izabrati Google Sheets raspon. U oba slučaja ustanova ostaje odgovorna za tačnost izvora i za to da na javnom ekranu nema ličnih podataka.

Alert aplikacija postoji kao krupna poruka visokog kontrasta koja može da radi iz lokalne konfiguracije. Ona je obična stavka ekrana ili plejliste; ne prekida automatski reprodukciju na svim uređajima i ne zamenjuje sertifikovan sistem za uzbunjivanje, razglas ili proceduru evakuacije. Zbog toga ova stranica fokus drži na svakodnevnim informacijama. Za ustanovu koja razmatra ekrane, najvažnije pitanje nije koliko poruka može da stane, već ko održava svaki izvor i kako se proverava da je sadržaj i dalje tačan.`,
      scenarios: [
        {
          title: 'Obaveštenje za hol ili hodnik',
          body: 'Text aplikacija prikazuje kratak naslov i objašnjenje koje se čita bez zvuka. Jedna poruka treba da ima jednog vlasnika i datum interne provere, iako sam proizvod ne zakazuje njen istek.',
        },
        {
          title: 'Događaji iz Google Calendar-a',
          body: 'Povežite Google nalog i izaberite kalendar za prikaz dana, nedelje, meseca ili narednih događaja. Ekran čita događaje, dok se izmene i dalje prave u Google Calendar-u.',
        },
        {
          title: 'Tabela ili jedan podatak iz Google Sheets-a',
          body: 'Izaberite dokument i A1 raspon, pa ga prikažite kao tabelu ili KPI. Ovo odgovara rasporedu ili zbirnom broju samo ako ustanova već održava taj format bez ličnih podataka.',
        },
        {
          title: 'Prezentacija koju tim već uređuje',
          body: 'Google Slides i PowerPoint aplikacije čitaju povezani privatni dokument, renderuju slajdove kao slike i ponavljaju ih odabranim tempom. Za to su potrebni OAuth i R2 podešavanje na servisu.',
        },
        {
          title: 'PDF koji ostaje dostupan lokalno',
          body: 'PDF Reader prihvata fajl do podržanog limita, prikazuje ga preko celog ekrana i automatski lista više strana odabranom brzinom. Fajl putuje u konfiguraciji i može raditi bez mreže.',
        },
      ],
      benefits: [
        'Ponovna upotreba kalendara, tabela i prezentacija',
        'Prikaz u zajedničkom prostoru bez posebne studentske aplikacije',
        'Jasna upozorenja za privatnost i hitne poruke',
      ],
      proof: {
        title: 'Ilustrativan urednički tok, ne školski rezultat',
        body: 'Primer ustanove koristi jedan ekran u holu. Sekretarijat održava Google Calendar događaje, uprava Text obaveštenje, a nastavnici zajedničku Google Slides prezentaciju sa radovima učenika koji su odobreni za javni prikaz. Operater dodaje tri aplikacije u plejlistu i bira trajanje stavki. Primer opisuje vlasništvo nad sadržajem; ne tvrdi da je obaveštenje stiglo do svakog učenika niti da ekran zamenjuje zvanične kanale.',
      },
      faq: [
        {
          q: 'Može li SignageWall direktno da čita naš školski informacioni sistem?',
          a: 'Ne postoji namenski konektor za elektronski dnevnik, raspored ili studentski sistem. Podatak možete prikazati kroz Google Sheets, kalendar ili javnu veb stranicu koju sistem već nudi i koja dozvoljava iframe, uz odgovornost ustanove za pristup i privatnost.',
        },
        {
          q: 'Da li Google Slides i PowerPoint ostaju ažurni?',
          a: 'Povezane aplikacije prate izabrani dokument i ponovo renderuju slajdove kada konektor otkrije novu verziju. Potrebna je odgovarajuća Google ili Microsoft OAuth konfiguracija i R2 skladište za preslikane slike. Uvek računajte na period obrade i mrežne uslove.',
        },
        {
          q: 'Da li PDF može da radi bez interneta?',
          a: 'Da. PDF Reader je statična aplikacija; učitani dokument se čuva u konfiguraciji i renderuje na plejeru. Višestrane dokumente lista brzinom koju odaberete. Ipak, proverite čitljivost jer stranica projektovana za A4 često ima presitan tekst za zidni ekran.',
        },
        {
          q: 'Može li hitna poruka da preuzme sve ekrane jednim klikom?',
          a: 'Ne. Alert je sadržaj visokog kontrasta, ali se ponaša kao obična stavka ekrana ili plejliste. Nema platformsko globalno preuzimanje svih uređaja. Ne treba ga opisivati niti koristiti kao zamenu za propisani alarmni sistem i školske procedure.',
        },
        {
          q: 'Kako da zaštitimo podatke učenika i zaposlenih?',
          a: 'Na zajedničkom ekranu koristite samo sadržaj odobren za publiku koja prolazi pored. Ne objavljujte ocene, identifikatore, privatne rasporede ili kontakte. SignageWall prikazuje izvor koji mu date; ne klasifikuje automatski njegove podatke.',
        },
        {
          q: 'Mogu li različiti ekrani da imaju različit sadržaj?',
          a: 'Da. Svaki logički ekran ima sopstvenu listu sadržaja, a postojeće stavke možete dodati na više eksplicitno izabranih ekrana. Sistem trenutno nema trajne grupe po zgradi, odeljenju ili hodniku niti granularna urednička prava po ekranu.',
        },
      ],
      intent: {
        primaryQuery: 'digitalni ekrani za škole i fakultete',
        intentType: 'commercial-investigation',
        audience: 'Školske uprave, sekretarijati, fakultetske službe i IT administratori',
        jobToBeDone:
          'Procene kako da postojeća obaveštenja, događaje, tabele i prezentacije prikažu u zajedničkim obrazovnim prostorima.',
        uniquePromise:
          'Opisuje praktično vlasništvo nad izvorima i privatnost uz eksplicitno ograničenje za školske sisteme i hitna upozorenja.',
        notTargeting:
          'Kancelarijska interna komunikacija, elektronski dnevnik, studentski informacioni sistem, sertifikovani alarmi i platformsko hitno preuzimanje ekrana.',
      },
    },
    en: {
      name: 'Education',
      tagline:
        'School and university notices, calendars, tables and presentations on screens in shared spaces. Reuse sources the institution already maintains.',
      title: 'Digital signage for schools and universities',
      subtitle:
        'Display editorial notices, events, a selected spreadsheet range, PDFs and connected presentations without presenting the system as a student-information or emergency-alert platform.',
      metaTitle: 'Digital signage for schools and universities',
      metaDescription:
        'Show school notices, calendars, Google Sheets, PDFs, Google Slides and PowerPoint presentations on screens across a school, university or campus.',
      intro: `A school or university screen is useful when content comes from a source that staff already maintain. A concise notice can be written in the Text app. Events can come from Google Calendar. A selected Google Sheets range can become a table or one prominent value. PDF accepts an uploaded file, while Google Slides and PowerPoint read a presentation from a connected account, render its slides as images and loop them on screen.

SignageWall is not a student information system, class-timetable engine or integration with a school administration platform. Where such a system publishes a public page that permits iframe embedding, the Web page app may technically display it, but that is not a purpose-built connector and the source may refuse framing. A timetable already maintained in a workbook can be shown by explicitly selecting a Google Sheets range. In either case, the institution remains responsible for source accuracy and ensuring that no personal information reaches a public display.

The Alert app is a high-contrast message that can run from local configuration. It is an ordinary screen or playlist item; it does not automatically interrupt every device and it does not replace a certified warning system, public address system or evacuation procedure. This page therefore concentrates on everyday information. For an institution evaluating screens, the key question is not how many messages can fit. It is who owns each source and how staff verify that the displayed content is still correct.`,
      scenarios: [
        {
          title: 'A notice for a hall or corridor',
          body: 'The Text app displays a short heading and explanation understood without sound. One notice should have a clear owner and internal review date, even though the product itself does not schedule an expiry.',
        },
        {
          title: 'Events from Google Calendar',
          body: 'Connect a Google account and select a calendar for day, week, month or upcoming-event views. The screen reads events, while all event changes continue to happen in Google Calendar.',
        },
        {
          title: 'A table or one value from Google Sheets',
          body: 'Choose a document and A1 range, then display it as a table or KPI. This can represent a timetable or aggregate figure only when the institution already maintains that format without personal data.',
        },
        {
          title: 'A presentation the team already edits',
          body: 'Google Slides and PowerPoint read a connected private document, render slides as images and repeat them at a selected pace. The service requires OAuth and R2 configuration for these connected workflows.',
        },
        {
          title: 'A PDF retained locally',
          body: 'PDF Reader accepts a file within its supported limit, displays it full-screen and advances multi-page documents at a chosen speed. The file travels in app configuration and can work without a network connection.',
        },
      ],
      benefits: [
        'Reuse of calendars, spreadsheets and presentations',
        'Shared-space display without a separate student application',
        'Explicit privacy and emergency-message boundaries',
      ],
      proof: {
        title: 'Illustrative editorial workflow, not an education result',
        body: 'Consider an institution with one hall screen. The office owns a Google Calendar, administration owns a Text notice, and teachers maintain a shared Google Slides deck containing work approved for public display. An operator adds the three apps to a playlist and chooses item durations. The example describes content ownership; it does not claim that every student saw the notice or that the screen replaces official communication channels.',
      },
      faq: [
        {
          q: 'Can SignageWall read our school information system directly?',
          a: 'There is no dedicated connector for a gradebook, timetable or student system. You may display data through Google Sheets, a calendar or a public page the source already provides and permits in an iframe, with the institution responsible for access and privacy.',
        },
        {
          q: 'Do Google Slides and PowerPoint stay up to date?',
          a: 'The connected apps monitor the chosen document and render slides again after the connector detects a new revision. They require Google or Microsoft OAuth configuration and R2 storage for mirrored images. Allow for processing time and network conditions.',
        },
        {
          q: 'Can a PDF work without internet access?',
          a: 'Yes. PDF Reader is a static app; its uploaded document is stored in configuration and rendered by the player. Multi-page documents advance at the selected speed. Check legibility, because a page designed for A4 paper often has text that is too small for a wall display.',
        },
        {
          q: 'Can an urgent message take over every screen with one click?',
          a: 'No. Alert is high-contrast content, but it behaves as a normal screen or playlist item. There is no platform-wide emergency takeover. It should not be described or used as a replacement for a regulated alarm system and institutional procedures.',
        },
        {
          q: 'How should we protect student and staff information?',
          a: 'Use only content approved for everyone who can walk past the display. Do not expose grades, identifiers, private schedules or contact details. SignageWall renders the source it is given and does not automatically classify its information.',
        },
        {
          q: 'Can different screens carry different content?',
          a: 'Yes. Each logical screen has its own content list, and existing items can be added to several explicitly selected screens. There are currently no persistent groups by building or department and no granular editing permission per screen.',
        },
      ],
      intent: {
        primaryQuery: 'digital signage for schools and universities',
        intentType: 'commercial-investigation',
        audience:
          'School leaders, administrative offices, university services and IT administrators',
        jobToBeDone:
          'Evaluate how to display existing notices, events, spreadsheets and presentations in shared spaces across an education institution.',
        uniquePromise:
          'Explains practical source ownership and privacy while stating the limits around student systems and emergency alerting.',
        notTargeting:
          'Office internal communications, student information systems, electronic gradebooks, certified alarms and platform-wide emergency screen takeover.',
      },
    },
  },
  {
    slug: 'manufacturing',
    srSlug: 'proizvodnja',
    icon: 'factory',
    order: 60,
    recommendedApps: 'powerbi,gsheets,web,text,alert,clock',
    links: {
      posts: [
        'google-sheets-na-ekranu',
        'ekran-mora-da-radi-i-bez-interneta',
        'sta-pitati-dobavljaca',
        'kako-meriti-da-li-ekran-radi-posao',
      ],
      solutions: ['office', 'education'],
      apps: ['powerbi', 'gsheets', 'web', 'text', 'alert', 'clock'],
    },
    sr: {
      name: 'Proizvodnja',
      tagline:
        'Prikažite postojeći Power BI javni izveštaj, Google Sheets KPI, dozvoljenu veb stranicu i uredničke bezbednosne poruke na ekranima u pogonu.',
      title: 'KPI i informativni ekrani za proizvodnju',
      subtitle:
        'Donesite već pripremljene pokazatelje u zajednički prostor uz vidljivo vreme osvežavanja, plan za gubitak veze i jasnu granicu prema MES, ERP i alarmnim sistemima.',
      metaTitle: 'KPI ekrani za proizvodnju i pogone',
      metaDescription:
        'Prikažite javni Power BI izveštaj, Google Sheets KPI, veb dashboard, tekst i bezbednosne poruke na ekranima u pogonu, uz jasna ograničenja izvora.',
      intro: `Ekran u proizvodnom prostoru ne treba da izmišlja novi izvor podataka. Njegov zadatak je da prikaže mali broj već definisanih pokazatelja ili poruka na mestu gde se rade. SignageWall može da prikaže jedan KPI ili tabelu iz Google Sheets-a, Power BI izveštaj objavljen metodom Publish to web, kao i javnu stranicu koja dozvoljava iframe. Text, Clock i Alert aplikacije pokrivaju uredničku poruku, vreme i krupan vizuelni format za upozorenje.

Ne postoji ugrađena MES, ERP, SCADA, OEE ili warehouse integracija. Ako poslovni sistem može da napravi tabelu ili javni web prikaz, taj izlaz može postati izvor za jednu od postojećih aplikacija, ali SignageWall ne potvrđuje njegovu tačnost, ne upravlja linijom i ne piše podatke nazad. Power BI Publish to web link je javno dostupan i zato nije pogodan za poverljive proizvodne ili korisničke podatke. Web stranica zavisi od mreže i može odbiti iframe prikaz.

Za Google Sheets i druge data-backed aplikacije poslednji sinhronizovani payload može ostati u snimku plejera. To je korisno za kontinuitet prikaza, ali star podatak može da dovede do pogrešne odluke. Svaki vremenski osetljiv dashboard zato treba u samom dizajnu da prikaže vreme izvora ili poslednje obrade. Alert aplikacija ne predstavlja platformsko preuzimanje ekrana: ona se reprodukuje kao stavka koju ste prethodno dodelili. Za evakuaciju, zastoj i druge bezbednosno kritične događaje ustanova mora zadržati sertifikovane sisteme i procedure.`,
      scenarios: [
        {
          title: 'Jedan KPI iz Google Sheets-a',
          body: 'Izaberite tabelu i A1 raspon, pa prikažite jednu vrednost ili tabelu. Google Sheets konektor čita podatke sa povezanog naloga; formula, definicija KPI-ja i provera kvaliteta ostaju u originalnom dokumentu.',
        },
        {
          title: 'Javni Power BI izveštaj',
          body: 'Power BI aplikacija prihvata Publish to web adresu i ponovo učitava prikaz u konfigurisanom intervalu. Pošto je link javni, koristite samo podatke odobrene za takav način deljenja.',
        },
        {
          title: 'Postojeći veb dashboard',
          body: 'Web page prikazuje HTTPS stranicu u iframe-u kada izvor dozvoljava ugrađivanje. Potrebna je stalna mreža, a stranice sa prijavom ili zaštitnim zaglavljima često neće raditi na unattended plejeru.',
        },
        {
          title: 'Urednička bezbednosna poruka',
          body: 'Text ili Alert mogu prikazati kratko pravilo, obaveznu opremu ili planiranu informaciju visokog kontrasta. Alert je obična sadržajna stavka i ne prekida druge ekrane automatski.',
        },
        {
          title: 'Radni sati i stanje uređaja',
          body: 'Ekran može imati nedeljni ili poseban prozor dostupnosti koji izvan njega stavlja plejer u crni standby. CMS takođe prikazuje prisutnost uređaja; nijedno od toga ne potvrđuje fizičko stanje panela.',
        },
      ],
      benefits: [
        'Ponovna upotreba već odobrenih KPI izvora',
        'Vidljiva ograničenja svežine i mrežne zavisnosti',
        'Bez mešanja signage prikaza sa upravljanjem proizvodnjom',
      ],
      proof: {
        title: 'Ilustrativan tehnički tok, ne proizvodni rezultat',
        body: 'Primer pogona ima jedan ekran sa Google Sheets KPI-jem, satom i kratkom Text porukom. Tabela sadrži vrednost i sopstveni vremenski pečat. Operater bira odgovarajući raspon i dodaje aplikacije na ekran. Kada nema mreže, poslednji payload može ostati vidljiv, pa vremenski pečat otkriva da podatak nije nov. Primer ne tvrdi rast učinka, kraći zastoj niti direktnu vezu sa MES-om.',
      },
      faq: [
        {
          q: 'Da li se SignageWall direktno povezuje sa MES ili ERP sistemom?',
          a: 'Ne. Nema ugrađen MES, ERP, SCADA, OEE ili warehouse konektor. Možete prikazati Google Sheets raspon, javni Power BI link ili veb stranicu koju sistem već objavljuje i koja dozvoljava iframe. To je prikaz izlaza, ne dvosmerna integracija.',
        },
        {
          q: 'Možemo li da prikažemo privatni Power BI dashboard?',
          a: 'Ugrađena aplikacija koristi Publish to web i zato očekuje javni link. Ne podržava authenticated embed token za privatne izveštaje. Za proizvodne tajne, lične ili korisničke podatke koristite drugi bezbedan kanal umesto javnog Power BI prikaza.',
        },
        {
          q: 'Šta se dešava kada ekran izgubi mrežu?',
          a: 'Plejer čuva poslednji snimak, a slike, video i podržane aplikacije mogu koristiti unapred preuzete podatke. Web i Power BI zahtevaju mrežu i preskaču se bez nje. Data-backed vrednost može biti zastarela, pa na dashboard stavite vreme izvora.',
        },
        {
          q: 'Može li Alert poruka odmah da preuzme svaki ekran u pogonu?',
          a: 'Ne. Alert je full-screen dizajn unutar svoje stavke, ali nema globalno prioritetno preuzimanje uređaja. Mora već biti dodeljen ekranu ili plejlisti i reprodukuje se po toj konfiguraciji. Ne zamenjuje sirenu, razglas ili bezbednosnu proceduru.',
        },
        {
          q: 'Da li CMS pokazuje da ekran stvarno emituje sliku?',
          a: 'CMS pokazuje status veze i poslednje javljanje plejera, a može pratiti stavku koju plejer prijavi kao trenutno aktivnu u odgovarajućem prikazu. To nije kamera niti električni senzor, pa ne dokazuje da je panel uključen, svetao ili fizički neoštećen.',
        },
        {
          q: 'Koji hardver je potreban u prašini, toploti ili vlazi?',
          a: 'To je odluka o industrijskom hardveru, kućištu, hlađenju, napajanju i montaži. SignageWall softver ne daje panelu IP ocenu niti otpornost koju nema. Uslove lokacije treba da proceni odgovorna stručna osoba pre instalacije.',
        },
      ],
      intent: {
        primaryQuery: 'KPI ekrani za proizvodnju',
        intentType: 'commercial-investigation',
        audience: 'Rukovodioci proizvodnje, continuous-improvement timovi i industrijski IT',
        jobToBeDone:
          'Procene kako da već odobrene pokazatelje i uredničke poruke prikažu na zajedničkom ekranu u pogonu.',
        uniquePromise:
          'Objašnjava javne dashboard izvore, svežinu podataka i offline ponašanje bez tvrdnje o MES integraciji ili upravljanju linijom.',
        notTargeting:
          'Kancelarijska interna komunikacija, MES i ERP softver, SCADA kontrola, OEE računanje, alarmni sistemi i globalno hitno preuzimanje ekrana.',
      },
    },
    en: {
      name: 'Manufacturing',
      tagline:
        'Display an existing public Power BI report, Google Sheets KPI, permitted web page and editorial safety messages on screens in a production space.',
      title: 'Manufacturing KPI and information displays',
      subtitle:
        'Bring prepared metrics into shared view with a visible source timestamp, an outage plan and a clear boundary from MES, ERP and alarm systems.',
      metaTitle: 'Manufacturing KPI and information displays',
      metaDescription:
        'Show a public Power BI report, Google Sheets KPI, web dashboard, text and safety messages on managed screens in production spaces, with source caveats.',
      intro: `A screen on a production floor should not invent a new data source. Its job is to make a small number of already defined metrics or messages visible where work happens. SignageWall can display one KPI or a table from Google Sheets, a Power BI report shared with Publish to web, and a public web page that permits iframe embedding. Text, Clock and Alert cover an editorial message, time and a high-contrast visual format for a warning.

There is no built-in MES, ERP, SCADA, OEE or warehouse integration. If an operational system can produce a workbook or public web view, that output may become a source for an existing app, but SignageWall does not verify its accuracy, control a line or write data back. A Power BI Publish to web link is publicly accessible and is therefore unsuitable for confidential production or customer information. A web page depends on the network and may reject iframe display.

For Google Sheets and other data-backed apps, the last synchronised payload can remain in the player snapshot. That supports display continuity, but an old figure can lead to a bad decision. Every time-sensitive board should therefore include its source time or last-processing time in the design itself. Alert does not provide platform-wide takeover: it plays as a content item already assigned to that screen. Evacuation, line-stop and other safety-critical events must continue to rely on certified systems and established procedures.`,
      scenarios: [
        {
          title: 'One KPI from Google Sheets',
          body: 'Select a spreadsheet and A1 range, then show one value or a table. The connector reads data from a connected Google account; the formula, KPI definition and quality checks remain in the original document.',
        },
        {
          title: 'A public Power BI report',
          body: 'The Power BI app accepts a Publish to web address and reloads the view at a configured interval. Because that link is public, use only information approved for that method of sharing.',
        },
        {
          title: 'An existing web dashboard',
          body: 'Web page displays an HTTPS page in an iframe when the source permits embedding. It needs continuous connectivity, and pages with sign-in flows or restrictive security headers often fail on an unattended player.',
        },
        {
          title: 'An editorial safety message',
          body: 'Text or Alert can show a concise rule, required equipment or a planned high-contrast notice. Alert is a normal content item and does not automatically interrupt other screens.',
        },
        {
          title: 'Working hours and device presence',
          body: 'A screen can use weekly or special availability windows that put the player into black standby outside them. The CMS also shows device presence; neither mechanism proves the physical panel state.',
        },
      ],
      benefits: [
        'Reuse of metrics already approved for display',
        'Visible freshness and network-dependency boundaries',
        'No confusion between signage display and production control',
      ],
      proof: {
        title: 'Illustrative technical workflow, not a production result',
        body: 'Consider a production area with one screen showing a Google Sheets KPI, a clock and a short Text notice. The spreadsheet includes both the value and its source timestamp. An operator selects the relevant range and adds the apps to the screen. During an outage, the last payload may remain visible, so its timestamp reveals that it is old. The example claims neither higher output, shorter downtime nor a direct MES connection.',
      },
      faq: [
        {
          q: 'Does SignageWall connect directly to an MES or ERP?',
          a: 'No. There is no built-in MES, ERP, SCADA, OEE or warehouse connector. You may show a Google Sheets range, public Power BI link or web page that the source already publishes and permits in an iframe. That is output display, not a two-way integration.',
        },
        {
          q: 'Can we display a private Power BI dashboard?',
          a: 'The built-in app uses Publish to web and therefore expects a public link. It does not support an authenticated embed token for a private report. Use another secured channel for trade secrets, personal information or customer data.',
        },
        {
          q: 'What happens when a screen loses network access?',
          a: 'The player persists its last snapshot, while images, video and supported apps can use prefetched assets or data. Web and Power BI require connectivity and are skipped offline. A data-backed value may be stale, so include a source timestamp on the board.',
        },
        {
          q: 'Can Alert immediately take over every screen on the floor?',
          a: 'No. Alert is a full-screen design within its own item, but there is no global priority takeover. It must already be assigned to a screen or playlist and plays according to that configuration. It does not replace sirens, public address or safety procedures.',
        },
        {
          q: 'Does the CMS prove that a display is visibly showing an image?',
          a: 'The CMS shows connection state and last-seen time, and an appropriate view can follow the item reported as currently playing. This is not a camera or electrical sensor, so it cannot prove that the panel is powered, bright or physically undamaged.',
        },
        {
          q: 'What hardware is needed around dust, heat or moisture?',
          a: 'That is an industrial hardware, enclosure, cooling, power and mounting decision. SignageWall software cannot give a panel an environmental rating it does not have. A qualified person should assess site conditions before installation.',
        },
      ],
      intent: {
        primaryQuery: 'manufacturing KPI display',
        intentType: 'commercial-investigation',
        audience: 'Production leaders, continuous-improvement teams and industrial IT staff',
        jobToBeDone:
          'Evaluate how to put approved metrics and editorial messages on a shared screen within a production environment.',
        uniquePromise:
          'Explains public dashboard sources, data freshness and offline behaviour without claiming MES integration or production-line control.',
        notTargeting:
          'Office internal communications, MES and ERP software, SCADA control, OEE calculation, alarm systems and platform-wide emergency takeover.',
      },
    },
  },
] as const
