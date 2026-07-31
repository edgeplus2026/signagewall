// @ts-nocheck
/*
 * Capability-safe, full-length replacements for the seven foundation posts.
 *
 * `links` stores repository keys, not translated URL segments:
 *   posts     — Serbian source keys from posts.ts / posts-2.ts
 *   solutions — stable solution keys from solutions.ts
 *   apps      — manifest slugs from packages/apps/src
 */

export const POSTS_FULL_FOUNDATIONS = {
  'digitalni-meni-povecava-prodaju': {
    links: {
      posts: ['tipografija-za-ekrane', 'kako-meriti-da-li-ekran-radi-posao'],
      solutions: ['hospitality'],
      apps: ['menu', 'qr'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako napraviti čitljiv digitalni meni',
        intentType: 'informational',
        audience: 'Vlasnici i menadžeri restorana, kafića i kantina',
        jobToBeDone:
          'Osmisliti digitalnu meni tablu koju gosti brzo razumeju i osoblje lako održava.',
        uniquePromise:
          'Praktičan postupak od hijerarhije ponude do poštenog merenja rezultata bez obećanja rasta prodaje.',
        notTargeting:
          'Cenovnik digital signage softvera, izbor plejera, POS integracija ili automatsko zakazivanje menija po dobu dana.',
      },
      takeaways: [
        'Čitljivost i tačnost dolaze pre animacije.',
        'Menu Board podržava ručni unos, CSV i tabele.',
        'Rezultat proveravajte kroz POS ili ručnu evidenciju.',
      ],
      content: [
        [
          'p',
          'Digitalni meni može da olakša poručivanje, ali ekran sam po sebi ne povećava prodaju. Njegova stvarna prednost je urednija prezentacija ponude i mogućnost da se cena, opis ili dostupnost izmene bez nove štampe. Da li će se promeniti broj porudžbina morate proveriti u sopstvenim podacima, jer na rezultat utiču i cena, gužva, sezona, osoblje i pozicija ekrana.',
        ],
        ['h', 'Počnite od odluke koju gost donosi'],
        [
          'p',
          'Gost ispred pulta obično želi da odgovori na tri pitanja: šta postoji, koliko košta i šta može brzo da izabere. Zato meni organizujte po kategorijama koje gost već očekuje, na primer kafa, bezalkoholna pića i hrana. Naziv neka bude najvidljiviji, cena odmah uz njega, a opis samo tamo gde zaista pomaže. Interna šifra artikla, duga priča o brendu i sitni uslovi ne pripadaju glavnoj tabli.',
        ],
        [
          'ul',
          [
            'Jedan dosledan položaj cene u svakoj kategoriji',
            'Dovoljno velik tekst za najudaljenije mesto u redu',
            'Jak kontrast između teksta i pozadine',
            'Ograničen broj istaknutih stavki, bez vizuelnog nadvikivanja',
          ],
        ],
        ['fig', 0],
        ['h', 'Proverite dizajn sa mesta gosta'],
        [
          'p',
          'Otvorite predlog preko celog ekrana i stanite tamo gde red obično počinje. Pročitajte naziv i cenu bez približavanja. Zatim zamolite osobu koja nije pravila meni da za nekoliko sekundi pronađe određenu kategoriju. Ako traži pogledom po celoj tabli, problem nije u gostu nego u hijerarhiji. Fotografija može da pomogne jednoj preporuci, ali deset fotografija sužava prostor za podatke koji moraju ostati čitljivi.',
        ],
        ['h', 'Izaberite održiv izvor podataka'],
        [
          'p',
          'SignageWall Menu Board može da čuva stavke ručno, da ih jednokratno uveze iz CSV datoteke ili da ih sinhronizuje sa Google Sheets odnosno Microsoft Excel izvorom. Ručni unos je dobar za kratku, stabilnu ponudu. CSV pomaže pri prvom unosu duže liste. Povezana tabela ima smisla kada osoba koja održava cene već svakodnevno radi u tabeli. Time se izbegava prekucavanje na dva mesta.',
        ],
        [
          'p',
          'Odredite jednog vlasnika podataka i jednostavno pravilo: izmena cene nije završena dok nije proverena na stvarnom ekranu. Ako je stavka rasprodata, promenite ili uklonite njen prikaz kroz izvor koji ste izabrali. Nemojte obećavati automatsku vezu sa kasom; trenutni proizvod nema nativnu POS integraciju.',
        ],
        ['h', 'Ne planirajte funkciju koja ne postoji'],
        [
          'p',
          'Trenutni SignageWall ne menja pojedinačne stavke ili plejliste automatski po satu ili datumu. Ako imate poseban doručak i ručak, promenu sadržaja trenutno treba urediti ručno ili organizovati izvan proizvoda kroz podatke koje kontrolišete. Radno vreme ekrana je druga funkcija: ono može prebaciti ceo ekran na crni standby van definisanih perioda, ali nije dayparting menija.',
        ],
        ['h', 'Merite jednu promenu, ne utisak'],
        [
          'p',
          'Izaberite jednu hipotezu, na primer da jasniji naziv smanjuje pitanja ili da istaknuta stavka menja njen udeo u porudžbinama. Zabeležite početno stanje u POS izveštaju ili ručnoj evidenciji, promenite samo jedan element i uporedite slične dane. QR aplikacija može otvoriti analitički označen URL, ali SignageWall ne pruža ugrađenu statistiku skeniranja. Zaključak donosite iz spoljnog analitičkog sistema, ne iz pretpostavke da je lepši ekran nužno uspešniji.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to create a readable digital menu board',
        intentType: 'informational',
        audience: 'Restaurant, café and canteen owners and managers',
        jobToBeDone:
          'Design a digital menu guests understand quickly and staff can maintain reliably.',
        uniquePromise:
          'A practical path from offer hierarchy to honest measurement without promising an automatic sales increase.',
        notTargeting:
          'Digital signage pricing, player hardware, POS integrations, or automatic menu scheduling by time of day.',
      },
      takeaways: [
        'Readability and accuracy matter before animation.',
        'Menu Board supports manual, CSV and spreadsheet sources.',
        'Measure outcomes in external POS or manual records.',
      ],
      content: [
        [
          'p',
          'A digital menu can make ordering clearer, but a screen does not increase sales by itself. Its practical advantage is a structured presentation and the ability to change a price, description or available item without printing another board. Whether orders change must be checked in your own data, because price, traffic, season, staff and screen position all influence the result.',
        ],
        ['h', 'Start with the decision a guest is making'],
        [
          'p',
          'A guest at the counter usually wants three answers: what is available, what it costs and what they can choose quickly. Organize the board around categories they already expect, such as coffee, cold drinks and food. Make the item name most visible, keep its price close, and use a description only when it helps the decision. Internal product codes, a long brand story and small-print conditions do not belong on the primary board.',
        ],
        [
          'ul',
          [
            'Keep every price in a consistent position',
            'Size text for the furthest point in the queue',
            'Use strong contrast between copy and background',
            'Limit featured items so they do not compete with one another',
          ],
        ],
        ['fig', 0],
        ['h', 'Test the design from the guest’s position'],
        [
          'p',
          'Open the design full-screen and stand where the queue normally begins. Try to read a name and price without stepping forward. Then ask somebody who did not design it to find one category within a few seconds. If their eyes search the entire board, the hierarchy needs work. A photograph can support one recommendation, but ten photographs remove space from information that must remain readable.',
        ],
        ['h', 'Choose a source your team can maintain'],
        [
          'p',
          'SignageWall Menu Board can keep items as manual rows, import them once from CSV, or synchronize them from Google Sheets or Microsoft Excel. Manual entry suits a short, stable offer. CSV helps with the first entry of a longer list. A connected spreadsheet makes sense when the person responsible for prices already works in one each day. It removes the need to type the same change in two places.',
        ],
        [
          'p',
          'Name one owner for the data and use a simple rule: a price change is not complete until it has been checked on the actual display. When an item sells out, change or remove it through the source you selected. Do not assume a direct till connection; the current product does not provide a native POS integration.',
        ],
        ['h', 'Do not plan around a feature that is not there'],
        [
          'p',
          'Current SignageWall does not switch individual playlist items automatically by hour or date. If breakfast and lunch need different boards, that change currently has to be managed manually or outside the product through a data source you control. Screen working hours are separate: they can put the entire display into black standby outside defined periods, but they are not menu dayparting.',
        ],
        ['h', 'Measure one change, not an impression'],
        [
          'p',
          'Pick one hypothesis, such as clearer names reducing questions or one featured item changing its share of orders. Record a baseline in an external POS report or a manual tally, change only one element, and compare similar days. The QR app can open a URL carrying analytics parameters, but SignageWall does not include scan reporting. Draw the conclusion from the destination analytics or your operational data, not from the assumption that a better-looking display must perform better.',
        ],
      ],
    },
  },

  'digital-signage-za-pocetnike': {
    links: {
      posts: [
        'koliko-kosta-digital-signage',
        'android-boks-ili-mini-pc',
        'ekran-mora-da-radi-i-bez-interneta',
      ],
      solutions: ['office'],
      apps: ['text', 'menu'],
    },
    sr: {
      intent: {
        primaryQuery: 'digital signage za početnike',
        intentType: 'informational',
        audience: 'Mali timovi koji prvi put postavljaju jedan poslovni ekran',
        jobToBeDone: 'Razumeti potrebne delove i bezbedno pokrenuti prvi digital signage ekran.',
        uniquePromise:
          'Početnički vodič koji odvaja osnovni tok rada od funkcija koje trenutni proizvod nema.',
        notTargeting:
          'Detaljna kalkulacija troškova, poređenje Android i mini-PC uređaja ili dizajn menija.',
      },
      takeaways: [
        'Postavku čine ekran, plejer, mreža i sadržaj.',
        'Uparivanje koristi ručno unet šestokarakterni kod.',
        'Offline mogućnosti zavise od vrste sadržaja.',
      ],
      content: [
        [
          'p',
          'Digital signage je ekran u fizičkom prostoru čijim sadržajem upravljate kroz softver. Za prvi pilot ne treba vam velika mreža. Potrebni su ekran, uređaj koji pokreće plejer, internet za uparivanje i izmene, i jedna jasna poruka. Cilj prvog dana nije da iskoristite svaku aplikaciju, već da proverite da li je sadržaj čitljiv i da li tim ume da ga promeni.',
        ],
        ['h', 'Četiri dela osnovne postavke'],
        [
          'ol',
          [
            'Ekran ili monitor odgovarajuće veličine i orijentacije.',
            'Kompatibilan uređaj na kome radi SignageWall plejer.',
            'CMS u pregledaču, gde uređujete ekran, plejlistu i aplikacije.',
            'Stabilno napajanje i mreža za povezivanje, izmene i mrežne izvore.',
          ],
        ],
        [
          'p',
          'Nemojte kupovati hardver samo zato što ima HDMI izlaz. Pre nabavke proverite da li postoji podržan player build za konkretan operativni sistem i testirajte isti model koji planirate da koristite. To je naročito važno kod generičkih Android boksova, čiji se softver i ponašanje mogu razlikovati i kada naziv modela izgleda isto.',
        ],
        ['fig', 0],
        ['h', 'Kako izgleda uparivanje'],
        [
          'p',
          'Kada pokrenete plejer, na ekranu se pojavljuje registracioni kod od šest znakova. Taj kod se ručno unosi u kontrolnoj tabli da bi se uređaj vezao za izabrani ekran. Uparivanje nije skeniranje QR koda. Posle povezivanja ekran dobija snapshot sadržaja koji mu je dodeljen, a izmene se šalju povezanom playeru. Jedan ekran je vezan za jedan uređaj.',
        ],
        ['h', 'Napravite prvu jednostavnu rotaciju'],
        [
          'p',
          'Ekran može imati uređenu listu slika, videa, plejlista i aplikacija. Svakoj stavci možete odrediti redosled, trajanje i da li je uključena. Za probu napravite tri stavke: kratku poruku, jednu sliku i sadržaj koji se redovno ažurira. Pregledajte rezultat na samom uređaju, ne samo u editoru. Tako ćete odmah videti da li su tekst, odnos stranica i trajanje primereni prostoru.',
        ],
        ['h', 'Razlikujte radno vreme od rasporeda sadržaja'],
        [
          'p',
          'SignageWall podržava radno vreme po ekranu, uključujući nedeljne periode, posebne datume i vremensku zonu. Van tog vremena player prikazuje crni standby. To ne gasi fizički televizor i nije raspored pojedinačnih kampanja. Trenutni proizvod ne prebacuje stavke plejliste po satu ili datumu i nema automatski istek sadržaja.',
        ],
        ['h', 'Planirajte šta se dešava bez interneta'],
        [
          'p',
          'Player čuva poslednji snapshot i kešira podržane slike i video, pa taj materijal može nastaviti da se prikazuje tokom prekida. Međutim, aplikacije koje učitavaju javnu veb stranicu, YouTube, Canva ili drugi mrežni izvor zahtevaju vezu. Ako je ceo sadržaj mrežni, nemate korisnu offline rezervu. Zato u pilot uključite bar jednu lokalno keširanu stavku i stvarno isključite mrežu na nekoliko minuta.',
        ],
        ['h', 'Završna provera pre objave'],
        [
          'ul',
          [
            'Pročitajte tekst sa realne udaljenosti.',
            'Proverite da li je cena ili datum tačan.',
            'Potvrdite online status i live preview pojedinačnog ekrana.',
            'Testirajte prekid mreže i povratak veze.',
            'Zapišite ko menja sadržaj i koliko često ga proverava.',
          ],
        ],
        [
          'p',
          'Posle stabilnog pilota možete dodavati aplikacije i nove ekrane. Isti medij, plejlista ili aplikacija mogu se dodati na više ručno izabranih ekrana. To nije sistem grupa po lokaciji ili ulozi, pa planirajte imenovanje ekrana tako da izbor ostane razumljiv.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'digital signage for beginners',
        intentType: 'informational',
        audience: 'Small teams setting up their first business display',
        jobToBeDone:
          'Understand the required parts and launch a first digital signage screen safely.',
        uniquePromise:
          'A beginner guide that separates the core workflow from features the current product does not offer.',
        notTargeting:
          'Detailed cost calculations, Android versus mini-PC comparisons, or digital menu design.',
      },
      takeaways: [
        'A setup needs a display, player, network and content.',
        'Pairing uses a manually entered six-character code.',
        'Offline behavior depends on the content type.',
      ],
      content: [
        [
          'p',
          'Digital signage is a screen in a physical space whose content is managed through software. A first pilot does not need a large network. You need a display, a device running the player, internet for pairing and changes, and one clear message. The first-day goal is not to use every app; it is to prove that the content is readable and that your team can change it.',
        ],
        ['h', 'The four parts of a basic setup'],
        [
          'ol',
          [
            'A display or monitor with a suitable size and orientation.',
            'A compatible device that can run the SignageWall player.',
            'The browser CMS where screens, playlists and apps are managed.',
            'Reliable power and a network for connection, updates and online sources.',
          ],
        ],
        [
          'p',
          'Do not buy hardware merely because it has an HDMI output. Before purchasing, confirm that a supported player build exists for the exact operating system and test the model you intend to deploy. This matters especially with generic Android boxes, whose software and behavior can vary even when two products appear to share a model name.',
        ],
        ['fig', 0],
        ['h', 'What pairing looks like'],
        [
          'p',
          'When the player starts, the screen presents a six-character registration code. You manually enter that code in the dashboard to bind the device to the selected screen. Pairing is not done by scanning a QR code. Once connected, the display receives its assigned content snapshot and subsequent changes are sent to the connected player. One screen is bound to one device.',
        ],
        ['h', 'Build one simple rotation'],
        [
          'p',
          'A screen can hold an ordered list of images, videos, playlists and apps. Each item can have an order, duration and enabled state. For a pilot, create three items: a short announcement, one image and one source that updates regularly. Review the result on the physical device, not only in the editor. That reveals whether the type, aspect ratio and timing suit the room.',
        ],
        ['h', 'Separate working hours from content schedules'],
        [
          'p',
          'SignageWall supports per-screen working hours, including weekly windows, special dates and a time zone. Outside those hours the player shows a black standby view. This does not switch off the physical television, and it is not campaign scheduling. The current product does not switch playlist items by hour or date and does not provide automatic content expiry.',
        ],
        ['h', 'Plan for a lost connection'],
        [
          'p',
          'The player stores the latest snapshot and caches supported images and video, so that material can continue during a network interruption. Apps that load a public web page, YouTube, Canva or another network source still require a connection. If everything in the rotation is network-only, there is no useful offline fallback. Include at least one locally cached item in the pilot and actually disconnect the network for several minutes.',
        ],
        ['h', 'The pre-launch check'],
        [
          'ul',
          [
            'Read the copy from its real viewing distance.',
            'Check every price and date for accuracy.',
            'Confirm online state and the individual screen preview.',
            'Test both network loss and reconnection.',
            'Record who owns updates and how often they are reviewed.',
          ],
        ],
        [
          'p',
          'After the pilot is stable, add apps and more screens. The same media, playlist or app can be added to several explicitly selected screens. That is not a location or role-based grouping system, so use clear screen names to keep manual selection understandable.',
        ],
      ],
    },
  },

  'koliko-kosta-digital-signage': {
    links: {
      posts: [
        'digital-signage-za-pocetnike',
        'android-boks-ili-mini-pc',
        'ekran-mora-da-radi-i-bez-interneta',
      ],
      solutions: ['retail'],
      apps: ['gsheets'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako izračunati trošak digital signage sistema',
        intentType: 'commercial-investigation',
        audience: 'Kupci koji pripremaju budžet za jedan ili više poslovnih ekrana',
        jobToBeDone:
          'Napraviti proverljivu kalkulaciju početnog i tekućeg troška pre izbora dobavljača.',
        uniquePromise:
          'Promenljiv radni list koji radi sa ponudama čitaoca bez izmišljenih tržišnih raspona ili cena.',
        notTargeting:
          'Aktuelni SignageWall cenovnik, cene konkurencije, preporuka konkretnog plejera ili projekcija povrata ulaganja.',
      },
      takeaways: [
        'Odvojite jednokratne i tekuće troškove.',
        'Računajte rad ljudi, ne samo hardver.',
        'Popunite formulu sopstvenim ponudama i obimom.',
      ],
      content: [
        [
          'p',
          'Na pitanje koliko košta digital signage ne postoji pošten univerzalan broj. Dva projekta sa istim brojem ekrana mogu imati različite zahteve za montažu, svetlinu, plejer, mrežu i održavanje. Umesto tržišnog proseka, napravite radni list sa promenljivama iz sopstvenog prostora i pisanih ponuda. Tako možete porediti dobavljače na istoj osnovi i menjati pretpostavke bez prepravljanja celog budžeta. Svaka cifra tada ima izvor koji kasnije možete ponovo proveriti.',
        ],
        ['h', 'Prvo razdvojite vrste troška'],
        [
          'p',
          'Jednokratni troškovi nastaju pri postavljanju: displeji, plejeri, nosači, kablovi, instalacija i početna priprema sadržaja. Tekući troškovi vraćaju se mesečno ili godišnje: softver, konekcija ako je posebna, zamena hardvera, vreme za uređivanje i obilazak lokacije. Porez, transport i rezervni uređaji treba da budu vidljive stavke, a ne fusnota.',
        ],
        [
          'ul',
          [
            'D = broj displeja',
            'P = broj plejera',
            'L = broj fizičkih lokacija',
            'M = broj meseci u periodu poređenja',
            'H = interni sati rada mesečno',
            'R = interna cena jednog sata rada',
          ],
        ],
        ['fig', 0],
        ['h', 'Radni list za početni trošak'],
        [
          'p',
          'Za svaki red unesite količinu, jediničnu cenu iz ponude i eventualni porez. Početni trošak možete zapisati kao: displeji + plejeri + nosači i kablovi + montaža + mrežna priprema + početni dizajn i unos + obuka + rezerva. Ako već posedujete ekran ili računar koji je potvrđeno kompatibilan, njegova nabavna stavka može biti nula, ali zabeležite vreme provere i postavljanja.',
        ],
        [
          'p',
          'Nemojte automatski pretpostaviti da običan televizor ili generički Android boks odgovara prostoru. Izlog, dugo dnevno korišćenje i teško dostupan položaj menjaju hardverske zahteve. Tražite kompatibilnost sa tačnim player buildom i testirajte pilot pre kupovine većeg broja istih uređaja.',
        ],
        ['h', 'Radni list za tekući trošak'],
        [
          'p',
          'Za izabrani period računajte: softver po ekranu × D × M, zatim mreža, održavanje, H × R, planirana zamena uređaja i put do udaljenih lokacija. SignageWall podržava daljinsku izmenu sadržaja, monitoring prisutnosti uređaja i nekoliko komandi, ali to ne uklanja sav operativni rad. Neko i dalje mora da proverava tačnost podataka, kvalitet prikaza i fizičko stanje opreme.',
        ],
        ['h', 'Formula za poređenje ponuda'],
        [
          'p',
          'Ukupan trošak perioda jednak je početnom trošku plus svi tekući troškovi u M meseci. Podelite ga sa D za trošak po ekranu, a zatim sa M za uporediv mesečni iznos po ekranu. Formulu primenite na isti period, isti broj ekrana i iste obavezne funkcije kod svakog dobavljača. Ako jedna ponuda izostavlja montažu ili rad tima, dodajte ih pre poređenja.',
        ],
        ['h', 'Dodajte tri scenarija'],
        [
          'ol',
          [
            'Pilot: jedan ekran, postojeći hardver gde je potvrđeno upotrebljiv i minimalan sadržaj.',
            'Očekivani obim: realan broj lokacija, normalna učestalost izmena i planirana rezerva.',
            'Nepovoljan slučaj: zamena uređaja, dodatni odlazak na lokaciju i više vremena za održavanje.',
          ],
        ],
        [
          'p',
          'Za povraćaj ulaganja prvo odaberite metriku koju zaista možete meriti u spoljnim podacima: trošak štampe, vreme utrošeno na izmene ili prodaju tačno definisane stavke. SignageWall nema ugrađen proof-of-play ili prodajnu atribuciju, pa nemojte popunjavati prihod pretpostavljenim impresijama. Radni list je koristan upravo zato što razdvaja poznate ponude od hipoteza koje tek treba testirati.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to calculate digital signage system cost',
        intentType: 'commercial-investigation',
        audience: 'Buyers budgeting for one or more business displays',
        jobToBeDone:
          'Build a verifiable estimate of setup and operating costs before selecting a vendor.',
        uniquePromise:
          'A variable worksheet using the reader’s quotes without invented market ranges or product prices.',
        notTargeting:
          'Current SignageWall pricing, competitor prices, a specific player recommendation, or a projected return on investment.',
      },
      takeaways: [
        'Separate setup costs from recurring costs.',
        'Budget people’s time as well as hardware.',
        'Fill the formula with your own quotes and scope.',
      ],
      content: [
        [
          'p',
          'There is no honest universal answer to what digital signage costs. Two projects with the same number of screens can have different mounting, brightness, player, networking and maintenance requirements. Instead of using a market average, build a variable worksheet from your own site and written quotes. You can then compare vendors on the same basis and change assumptions without rebuilding the budget.',
        ],
        ['h', 'Separate the cost types first'],
        [
          'p',
          'One-off costs occur during deployment: displays, players, mounts, cables, installation and initial content preparation. Recurring costs return monthly or annually: software, any dedicated connectivity, hardware replacement, editing time and site visits. Tax, shipping and spare devices should be visible lines rather than footnotes.',
        ],
        [
          'ul',
          [
            'D = number of displays',
            'P = number of players',
            'L = number of physical locations',
            'M = months in the comparison period',
            'H = internal labor hours per month',
            'R = internal cost of one labor hour',
          ],
        ],
        ['fig', 0],
        ['h', 'The setup-cost worksheet'],
        [
          'p',
          'For every line, enter a quantity, a unit price from a quote and applicable tax. Write setup cost as: displays + players + mounts and cables + installation + network preparation + initial design and data entry + training + contingency. If you already own a display or computer confirmed to be compatible, its purchase line can be zero, but include the time spent validating and configuring it.',
        ],
        [
          'p',
          'Do not assume automatically that an ordinary television or generic Android box suits the site. A shop window, long daily use and a hard-to-reach position change the hardware requirement. Confirm compatibility with the exact player build and run a pilot before buying a larger quantity of matching devices.',
        ],
        ['h', 'The recurring-cost worksheet'],
        [
          'p',
          'For the selected period, calculate software per screen × D × M, then connectivity, maintenance, H × R, planned device replacement and travel to remote sites. SignageWall supports remote content changes, device-presence monitoring and several remote commands, but it does not remove all operating work. Somebody still has to verify data accuracy, display quality and the physical condition of the equipment.',
        ],
        ['h', 'A formula for comparing quotes'],
        [
          'p',
          'Period cost equals setup cost plus every recurring cost across M months. Divide by D for cost per screen, then by M for a comparable monthly cost per screen. Apply the formula to the same period, same screen count and same mandatory functions for every vendor. If one quote omits installation or staff time, add those before comparing it.',
        ],
        ['h', 'Add three scenarios'],
        [
          'ol',
          [
            'Pilot: one display, existing hardware where confirmed usable, and minimal content.',
            'Expected scope: realistic locations, normal editing frequency and a planned spare.',
            'Adverse case: one device replacement, another site visit and additional maintenance time.',
          ],
        ],
        [
          'p',
          'For return on investment, first choose a metric you can measure in external records: printing spend, time used for updates, or sales of one defined item. SignageWall does not provide built-in proof-of-play or sales attribution, so do not fill the revenue side with assumed impressions. The worksheet is useful precisely because it keeps known quotes separate from hypotheses that still need testing.',
        ],
      ],
    },
  },

  'android-boks-ili-mini-pc': {
    links: {
      posts: [
        'digital-signage-za-pocetnike',
        'ekran-mora-da-radi-i-bez-interneta',
        'video-na-ekranima',
      ],
      solutions: ['retail'],
      apps: ['youtube', 'web'],
    },
    sr: {
      intent: {
        primaryQuery: 'Android boks ili mini-PC za digital signage',
        intentType: 'commercial-investigation',
        audience: 'Tehnički odgovorne osobe koje biraju plejer za poslovni ekran',
        jobToBeDone:
          'Uporediti dve hardverske kategorije i izabrati uređaj za provereni način korišćenja.',
        uniquePromise:
          'Matrica odluke zasnovana na kompatibilnosti i pilot testu umesto neproverenih obećanja o platformi.',
        notTargeting:
          'Lista preporučenih modela, aktuelne cene hardvera, instalacija playera ili opšti početnički vodič.',
      },
      takeaways: [
        'Kompatibilan player build je prvi uslov.',
        'Testirajte tačan model pod realnim opterećenjem.',
        'Mrežni sadržaj traži stabilniju operativnu postavku.',
      ],
      content: [
        [
          'p',
          'Android boks i mini-PC mogu izgledati kao zamene za isti posao: primaju sadržaj i šalju sliku na ekran. Ipak, naziv kategorije ne govori da li će konkretan uređaj pokrenuti vaš player, ostati stabilan tokom radnog dana ili dozvoliti potrebna podešavanja. Zato odluka počinje kompatibilnošću, a završava se pilot testom tačnog modela — ne tabelom procesora.',
        ],
        ['h', 'Prvi filter je softver, ne cena'],
        [
          'p',
          'Tražite eksplicitnu potvrdu za operativni sistem, verziju i način instalacije koji ćete koristiti. Različiti player paketi nisu automatski jednako podržani na svakom uređaju. Ne zaključujte da SignageWall radi na proizvoljnom Android boksu samo zato što uređaj koristi Android. Dostupnost i produkcijska spremnost odgovarajućeg builda moraju se proveriti pre nabavke. Tu potvrdu sačuvajte uz odluku o nabavci.',
        ],
        ['fig', 0],
        ['h', 'Kada Android boks ulazi u uži izbor'],
        [
          'p',
          'Ova kategorija može biti privlačna kada su važni mala dimenzija, jednostavna montaža i jedan lagan tok sadržaja. Rizik je velika razlika između proizvođača: kiosk ponašanje, automatsko pokretanje, sistemska ažuriranja i upravljanje mogu biti drugačiji na dva slična uređaja. Generička oznaka ne garantuje da će hardversko video dekodiranje, orijentacija ili oporavak posle prekida raditi kako očekujete. Sve to proverite na primerku koji ćete stvarno kupiti.',
        ],
        ['h', 'Kada mini-PC ima više smisla'],
        [
          'p',
          'Mini-PC je razuman kandidat kada je potreban standardniji desktop operativni sistem, lakša dijagnostika ili zahtevniji veb i video sadržaj. On može ponuditi više resursa i poznatije administrativne alate, ali to nije garancija pouzdanosti. Ventilacija, način uključivanja, sistemska ažuriranja i kablovi i dalje mogu napraviti problem. Viši kapacitet takođe nema vrednost ako player build nije podržan.',
        ],
        ['h', 'Uporedite svoj stvarni sadržaj'],
        [
          'ul',
          [
            'Slike i lokalni video opterećuju sistem drugačije od javne veb stranice.',
            'YouTube, Web, Canva i live stream zavise od mreže i spoljnog servisa.',
            'Portretna orijentacija mora se probati na displeju i playeru zajedno.',
            'Dug dnevni rad treba testirati u kućištu i temperaturi sličnim stvarnoj lokaciji.',
          ],
        ],
        [
          'p',
          'SignageWall može na vezanom uređaju menjati volume, orientation, scale i kiosk podešavanje, kao i poslati restart, next ili previous komandu. Te mogućnosti ne pretvaraju nepodržan hardver u podržan. Proverite da svaka potrebna komanda zaista stiže do izabranog modela i da se stanje posle nje ponaša predvidivo.',
        ],
        ['h', 'Pilot koji daje upotrebljiv odgovor'],
        [
          'ol',
          [
            'Instalirajte tačan player build na tačan model.',
            'Pustite realnu plejlistu, uključujući najzahtevniji video ili mrežnu aplikaciju.',
            'Ostavite uređaj da radi koliko traje najduži radni dan.',
            'Prekinite i vratite mrežu, pa proverite keširani i mrežni sadržaj.',
            'Ponovite pokretanje i proverite orijentaciju, zvuk, temperaturu i online status.',
          ],
        ],
        ['h', 'Odluku dokumentujte kao standard'],
        [
          'p',
          'Izaberite najmanje složen uređaj koji je prošao test, pa zabeležite tačan model, verziju sistema, adapter, kabl i player build. Kupovina identične rezerve može skratiti zastoj, ali ne treba obećavati automatski oporavak bez testa. Ako nijedan kandidat ne prođe, promenite hardver ili sadržaj pre širenja. Trošak jednog pilota je manji od dijagnostike različitih uređaja na više lokacija.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'Android box or mini PC for digital signage',
        intentType: 'commercial-investigation',
        audience: 'Technical owners choosing a player for a business display',
        jobToBeDone:
          'Compare two hardware categories and select a device for a validated operating pattern.',
        uniquePromise:
          'A decision matrix built around compatibility and pilot testing instead of unverified platform promises.',
        notTargeting:
          'Recommended model lists, current hardware prices, player installation, or a general beginner guide.',
      },
      takeaways: [
        'A compatible player build is the first gate.',
        'Test the exact model under realistic load.',
        'Network content requires a stronger operating setup.',
      ],
      content: [
        [
          'p',
          'An Android box and a mini-PC can look interchangeable: both receive content and send a picture to a display. The category name does not tell you whether a particular device runs your player, stays stable for the working day or exposes the settings you need. The decision should therefore begin with compatibility and end with a pilot on the exact model, not with a processor table.',
        ],
        ['h', 'Software is the first filter, not price'],
        [
          'p',
          'Ask for explicit support for the operating system, version and installation method you will use. Different player packages are not automatically supported equally across devices. Do not conclude that SignageWall runs on an arbitrary Android box merely because the device uses Android. Availability and production readiness of the relevant build must be confirmed before hardware is purchased.',
        ],
        ['fig', 0],
        ['h', 'When an Android box belongs on the shortlist'],
        [
          'p',
          'This category may appeal when small size, simple mounting and one light content stream matter. Its risk is variation between manufacturers: kiosk behavior, startup, system updates and administration can differ across two similar-looking devices. A generic label does not guarantee that video decoding, orientation or recovery after an interruption will behave as expected. Test each of those points on the unit you intend to buy.',
        ],
        ['h', 'When a mini-PC makes more sense'],
        [
          'p',
          'A mini-PC is a reasonable candidate when you need a more standard desktop operating system, familiar diagnostics, or demanding web and video content. It may offer more resources and established administration tools, but that does not guarantee reliability. Ventilation, power behavior, operating-system updates and cabling can still cause failures. Extra capacity is also irrelevant when the required player build is unsupported.',
        ],
        ['h', 'Compare your real content'],
        [
          'ul',
          [
            'Images and local video load a device differently from a public web page.',
            'YouTube, Web, Canva and live streams depend on the network and an external service.',
            'Portrait orientation must be tested across the display and player together.',
            'Long daily operation should be tested in an enclosure and temperature similar to the site.',
          ],
        ],
        [
          'p',
          'SignageWall can change volume, orientation, scale and kiosk settings on a bound device, and can send restart, next or previous commands. Those controls do not turn unsupported hardware into supported hardware. Confirm that every command you require reaches the chosen model and that its resulting state is predictable.',
        ],
        ['h', 'A pilot that produces a useful answer'],
        [
          'ol',
          [
            'Install the exact player build on the exact hardware model.',
            'Run the real playlist, including its heaviest video or network app.',
            'Leave it operating for the length of the longest business day.',
            'Disconnect and restore networking, then inspect cached and online content.',
            'Repeat startup and verify orientation, sound, temperature and online state.',
          ],
        ],
        ['h', 'Document the decision as a standard'],
        [
          'p',
          'Choose the least complex device that passed the test, then record its exact model, operating-system version, power supply, cable and player build. An identical spare may shorten downtime, but do not promise automatic recovery without testing it. If neither candidate passes, change the hardware or the content before expanding. One controlled pilot costs less than diagnosing a mixed fleet across several sites.',
        ],
      ],
    },
  },

  'ekran-mora-da-radi-i-bez-interneta': {
    links: {
      posts: ['digital-signage-za-pocetnike', 'android-boks-ili-mini-pc'],
      solutions: ['hotels'],
      apps: ['pdf', 'youtube', 'web'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako digital signage radi bez interneta',
        intentType: 'informational',
        audience: 'Operateri ekrana kojima je važan nastavak prikaza tokom prekida mreže',
        jobToBeDone:
          'Razumeti koji sadržaj ostaje dostupan offline i napraviti bezbednu rezervnu rotaciju.',
        uniquePromise:
          'Precizna mapa SignageWall offline ponašanja koja odvaja keširane medije od mrežnih aplikacija.',
        notTargeting:
          'Izbor hardvera, garancija rada posle nestanka struje, mrežna dijagnostika ili opšti početnički vodič.',
      },
      takeaways: [
        'Poslednji snapshot i mediji mogu ostati lokalno.',
        'Mrežne aplikacije ne postaju offline keširanjem plejliste.',
        'Rezervu proverite stvarnim testom bez mreže.',
      ],
      content: [
        [
          'p',
          '„Radi offline” nije osobina celog digital signage sistema u jednoj reči. Ona zavisi od toga da li je player već dobio sadržaj, šta je lokalno sačuvano i da li stavka mora da kontaktira spoljni servis. Ta razlika je važna: slika sa lokalnom kopijom i javna veb stranica mogu biti u istoj plejlisti, ali se tokom prekida ne ponašaju isto.',
        ],
        ['h', 'Šta SignageWall čuva lokalno'],
        [
          'p',
          'Player čuva poslednji primljeni snapshot u lokalnoj IndexedDB bazi. Slike i video se unapred preuzimaju i keširaju prema pravilima playera, tako da već sinhronizovan medijski sadržaj može ostati dostupan kada veza nestane. Data-backed aplikacija može imati poslednje uspešno pripremljene podatke sa informacijom o svežini, ali to ne znači da će svaki izvor nastaviti da se osvežava bez mreže.',
        ],
        ['fig', 0],
        ['h', 'Šta i dalje zahteva internet'],
        [
          'p',
          'Aplikacije označene kao network-only preskaču se kada je player offline. Tu spadaju iskustva koja učitavaju udaljenu stranicu ili servis, kao što su Web, YouTube i Canva. Live stream takođe nema izvor bez mreže. Ako se rotacija sastoji samo od takvih stavki, player nema poslovni sadržaj koji može pouzdano da nastavi i može prikazati brendirani rezervni ekran. Zato tvrdnja „ekran nikada ne ostaje bez sadržaja” nije bezuslovno tačna.',
        ],
        ['h', 'Napravite offline jezgro'],
        [
          'p',
          'U svakoj važnoj rotaciji zadržite bar jednu stavku koja je provereno lokalno dostupna: sliku, podržani video ili PDF koji je ranije preuzet. Neka poruka bude korisna i bez aktuelnih podataka, na primer osnovno radno vreme, smernice u prostoru ili kontakt. Ne predstavljajte dinamičnu cenu, raspoloživost ili hitnu informaciju kao offline rezervu ako se ona može promeniti dok je veza prekinuta.',
        ],
        [
          'ul',
          [
            'Lokalno jezgro ne treba da zavisi od iframe stranice.',
            'Vremenski osetljivi podaci treba da pokažu datum ili vreme ažuriranja.',
            'Mrežni izvor treba da ima jasno definisan prihvatljiv period zastarelosti.',
            'Osoba zadužena za lokaciju treba da zna kako prijavljuje prekid.',
          ],
        ],
        ['h', 'Testirajte isti sadržaj koji objavljujete'],
        [
          'ol',
          [
            'Povežite player i sačekajte da primi najnoviji snapshot i medije.',
            'Proverite rotaciju dok je uređaj online.',
            'Prekinite mrežu bez gašenja uređaja.',
            'Posmatrajte ceo ciklus i zabeležite koje su stavke preskočene.',
            'Vratite vezu, izmenite jednu stavku i potvrdite da nova verzija stiže.',
          ],
        ],
        [
          'p',
          'Test ponovite kad dodate novu vrstu aplikacije. Offline ponašanje nije zauvek potvrđeno samo zato što je jedna plejlista jednom radila. Live preview i online status pomažu dok je mreža dostupna, ali nisu proof-of-play izveštaj i ne dokazuju šta je bilo prikazano tokom celog prekida. Za kritičnu lokaciju uvedite zasebnu operativnu evidenciju provere.',
        ],
        ['h', 'Ne mešajte internet i napajanje'],
        [
          'p',
          'Keš rešava deo mrežnog prekida; ne napaja televizor i ne garantuje automatsko pokretanje svakog hardvera posle nestanka struje. To ponašanje zavisi od displeja, uređaja, operativnog sistema i player builda. Testirajte ga odvojeno na tačnom modelu. Tako dobijate dve jasne procedure: jednu za izgubljenu mrežu i drugu za izgubljeno napajanje, bez blanket obećanja koja stvarna postavka možda ne može da ispuni.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how digital signage works without internet',
        intentType: 'informational',
        audience:
          'Screen operators who need displays to remain useful during network interruptions',
        jobToBeDone:
          'Understand which content remains available offline and create a safe fallback rotation.',
        uniquePromise:
          'A precise map of SignageWall offline behavior separating cached media from network-dependent apps.',
        notTargeting:
          'Hardware selection, guarantees after a power cut, network troubleshooting, or a general beginner guide.',
      },
      takeaways: [
        'The latest snapshot and media can remain local.',
        'Network apps do not become offline by joining a playlist.',
        'Validate fallback content with a real disconnection test.',
      ],
      content: [
        [
          'p',
          '“Works offline” is not a single property of an entire digital signage system. It depends on whether the player has already received the content, what was stored locally, and whether an item must contact an external service. That distinction matters: a locally cached image and a public web page can share a playlist but behave differently during the same outage.',
        ],
        ['h', 'What SignageWall stores locally'],
        [
          'p',
          'The player persists its latest received snapshot in local IndexedDB storage. Images and video are prefetched and cached according to player rules, so previously synchronized media can remain available when the connection disappears. A data-backed app may have last successfully prepared data with freshness information, but that does not mean every source continues updating without a network.',
        ],
        ['fig', 0],
        ['h', 'What still needs the internet'],
        [
          'p',
          'Apps marked as network-only are skipped when the player is offline. This includes experiences that load a remote page or service, such as Web, YouTube and Canva. A live stream also has no source without networking. If a rotation contains only those items, the player has no business content it can reliably continue and may show a branded fallback. The claim that a display can never be left without content is therefore not unconditionally true.',
        ],
        ['h', 'Build an offline core'],
        [
          'p',
          'Keep at least one verified local item in every important rotation: an image, supported video or PDF that has already downloaded. Its message should remain useful without current data, such as basic opening information, on-site directions or a contact. Do not use a dynamic price, availability figure or emergency message as a fallback when it may change while the connection is unavailable.',
        ],
        [
          'ul',
          [
            'The local core should not depend on an iframe page.',
            'Time-sensitive data should show when it was last updated.',
            'Every network source needs an agreed tolerance for stale data.',
            'A responsible person at the site should know how to report an outage.',
          ],
        ],
        ['h', 'Test the content you actually publish'],
        [
          'ol',
          [
            'Connect the player and allow it to receive the latest snapshot and media.',
            'Review the full rotation while the device is online.',
            'Disconnect networking without switching off the device.',
            'Watch a complete cycle and record which items are skipped.',
            'Restore the connection, edit one item and confirm the new version arrives.',
          ],
        ],
        [
          'p',
          'Repeat the test whenever you introduce another app type. Offline behavior is not validated forever because one playlist worked once. Live preview and online state help while a connection is available, but they are not proof-of-play reports and do not establish what appeared throughout an outage. For a critical site, keep a separate operational record of checks.',
        ],
        ['h', 'Do not confuse networking with power'],
        [
          'p',
          'Caching addresses part of a network interruption; it does not power a television and does not guarantee that every hardware model restarts automatically after a power cut. That behavior depends on the display, player device, operating system and player build. Test it separately on the exact model. You then have two clear procedures: one for lost networking and another for lost power, without a blanket promise the real setup may not meet.',
        ],
      ],
    },
  },

  'raspored-sadrzaja-koji-se-sam-menja': {
    links: {
      posts: ['google-sheets-na-ekranu', 'ekran-mora-da-radi-i-bez-interneta'],
      solutions: ['office', 'education'],
      apps: ['gsheets', 'gcal', 'rss'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako smanjiti ručno održavanje digital signage sadržaja',
        intentType: 'informational',
        audience: 'Operateri koji žele tačan ekran uz manje ponovljenog unosa',
        jobToBeDone:
          'Organizovati izvore, radno vreme i proveru sadržaja tako da održavanje bude predvidivo.',
        uniquePromise:
          'Pošten low-maintenance postupak koji jasno kaže da SignageWall trenutno nema zakazivanje stavki.',
        notTargeting:
          'Dayparting, zakazivanje kampanja po datumu, automatski istek sadržaja ili raspored zaposlenih.',
      },
      takeaways: [
        'Povežite podatke sa izvorom koji tim već održava.',
        'Radno vreme kontroliše ceo ekran, ne stavke.',
        'SignageWall trenutno nema hour/date playlist switching.',
      ],
      content: [
        [
          'p',
          'Ekran koji traži svakodnevno prekucavanje brzo zastari. Rešenje nije nužno raspored kampanja, već manji broj mesta na kojima podaci nastaju. Kada kalendar ostane u kalendaru, cene u tabeli, a vesti u RSS izvoru, odgovorna osoba nastavlja poznat posao dok ekran čita pripremljeni prikaz. To je sistem sa malo održavanja, ali nije sistem bez vlasnika.',
        ],
        ['h', 'Važno ograničenje pre plana'],
        [
          'p',
          'Trenutni SignageWall ne prebacuje pojedinačne stavke plejliste po satu ili datumu, ne uključuje kampanju na datum početka i ne uklanja je automatski po isteku. Zato ovaj vodič ne obećava dayparting. Ako su vam automatski doručak, ručak i večernji meni obavezan zahtev, trenutna verzija proizvoda ga ne ispunjava bez spoljnog procesa ili ručne promene.',
        ],
        ['fig', 0],
        ['h', 'Automatizujte izvor, ne kalendar kampanje'],
        [
          'p',
          'Izaberite aplikaciju prema mestu gde podatak već postoji. Google Sheets prikaz može pokazati tabelu ili KPI i osvežava povezane podatke u petominutnom ritmu. Menu Board može sinhronizovati stavke iz Google Sheets ili Microsoft Excel izvora. Google i Outlook Calendar daju read-only prikaze kalendara. RSS i ticker mogu povlačiti objavljene feed poruke. Nijedna od tih integracija ne treba da se opisuje kao univerzalno zakazivanje plejliste.',
        ],
        [
          'ul',
          [
            'Cena ili lista stavki: Menu Board sa tabelom.',
            'Događaji i termini: Google ili Outlook Calendar.',
            'Objavljene novosti: RSS ili ticker sa RSS izvorom.',
            'Stabilna uputstva: lokalna slika, video, PDF ili tekst.',
          ],
        ],
        ['h', 'Napravite osnovnu rotaciju koja ne zastareva brzo'],
        [
          'p',
          'Podelite sadržaj na stabilno jezgro i promenljive izvore. Jezgro treba da sadrži informacije koje su korisne nedeljama, dok povezani izvor nosi podatke koji se menjaju češće. Izbegavajte rečenice poput „danas”, „ove nedelje” ili „još tri dana” u statičnoj slici ako niko nema obavezu da ih ukloni. Za vremenski osetljivu tabelu prikažite datum poslednje izmene kada je to moguće.',
        ],
        ['h', 'Podesite radno vreme sa pravim očekivanjem'],
        [
          'p',
          'Za svaki ekran možete definisati always, weekly ili special režim sa vremenskom zonom. Player van aktivnog perioda prikazuje crni standby i ponovo procenjuje dostupnost lokalno. To je korisno kada ekran ne treba da prikazuje sadržaj van radnog vremena. Funkcija ne gasi televizor, ne menja jednu plejlistu drugom i ne bira jutarnje naspram večernjih stavki.',
        ],
        ['h', 'Uvedite kratku uredničku rutinu'],
        [
          'ol',
          [
            'Jednom nedeljno proverite izvorne tabele, kalendare i feedove.',
            'Otvorite live preview pojedinačnog ekrana i proverite redosled.',
            'Potvrdite online status uređaja i poslednju vezu.',
            'Na stvarnom displeju proverite čitljivost i zastarele datume.',
            'Za završenu akciju ručno uklonite ili onemogućite odgovarajuću stavku.',
          ],
        ],
        [
          'p',
          'Live preview i presence monitoring smanjuju potrebu da se svaka izmena proverava naslepo, ali nisu proof-of-play, istorija kampanja ili rollback. Ako je sadržaj regulatorno ili operativno kritičan, vodite spoljašnji zapis odobrenja i datum sledeće provere. SignageWall u trenutnoj verziji ima organizacione admin/member uloge, ne granularni workflow odobravanja po ekranu.',
        ],
        ['h', 'Kako izgleda uspešan low-maintenance sistem'],
        [
          'p',
          'Uspeh znači da se podatak menja jednom, da postoji odgovorna osoba i da je poznato šta se dešava kada izvor kasni ili mreža padne. Povezani izvori smanjuju dupli unos; radno vreme uklanja nepotreban prikaz celog ekrana; redovna provera hvata ono što automatizacija ne može. To je održiviji cilj od obećanja da se sadržaj „sam menja” bez ograničenja.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to reduce manual digital signage content maintenance',
        intentType: 'informational',
        audience: 'Operators who want accurate screens with less repeated data entry',
        jobToBeDone:
          'Organize sources, working hours and reviews so content maintenance becomes predictable.',
        uniquePromise:
          'An honest low-maintenance workflow that states SignageWall currently lacks item scheduling.',
        notTargeting:
          'Dayparting, date-based campaign scheduling, automatic content expiry, or employee shift planning.',
      },
      takeaways: [
        'Connect data to a source the team already maintains.',
        'Working hours control the whole screen, not items.',
        'SignageWall currently lacks hour/date playlist switching.',
      ],
      content: [
        [
          'p',
          'A screen that requires daily retyping soon becomes stale. The answer is not necessarily campaign scheduling; it is reducing the number of places where information originates. When events remain in a calendar, prices in a spreadsheet and news in an RSS source, the responsible person keeps doing familiar work while the display reads a prepared view. That is low maintenance, but it is not ownerless.',
        ],
        ['h', 'The important limitation before planning'],
        [
          'p',
          'Current SignageWall does not switch individual playlist items by hour or date, activate a campaign on a start date, or remove it automatically at expiry. This guide therefore does not promise dayparting. If automatic breakfast, lunch and evening menus are mandatory, the current product does not meet that requirement without an external process or a manual change.',
        ],
        ['fig', 0],
        ['h', 'Automate the source, not the campaign calendar'],
        [
          'p',
          'Choose an app based on where the information already lives. A Google Sheets view can present a table or KPI and refresh connected data on a five-minute cadence. Menu Board can synchronize items from Google Sheets or Microsoft Excel. Google and Outlook Calendar provide read-only calendar views. RSS and ticker can pull published feed messages. None of these integrations should be described as universal playlist scheduling.',
        ],
        [
          'ul',
          [
            'Prices or item lists: Menu Board with a spreadsheet source.',
            'Events and appointments: Google or Outlook Calendar.',
            'Published updates: RSS or ticker with an RSS source.',
            'Stable guidance: a local image, video, PDF or text item.',
          ],
        ],
        ['h', 'Build a base rotation that ages slowly'],
        [
          'p',
          'Divide content into a stable core and variable sources. The core should contain information that remains useful for weeks, while connected sources carry data that changes more often. Avoid phrases such as “today”, “this week” or “three days left” inside a static image unless somebody is responsible for removing it. For time-sensitive tabular data, show the last-updated date where possible.',
        ],
        ['h', 'Set working hours with the right expectation'],
        [
          'p',
          'Each screen can use an always, weekly or special availability mode with a time zone. Outside the active window, the player shows black standby and evaluates availability locally. This is useful when the display should not show content outside opening hours. It does not power off the television, replace one playlist with another, or select morning rather than evening items.',
        ],
        ['h', 'Introduce a short editorial routine'],
        [
          'ol',
          [
            'Review source spreadsheets, calendars and feeds once a week.',
            'Open the individual screen preview and check the order.',
            'Confirm device presence and its last connection.',
            'Inspect readability and stale dates on the physical display.',
            'Manually remove or disable the relevant item when an offer ends.',
          ],
        ],
        [
          'p',
          'Live preview and presence monitoring reduce blind checking, but they are not proof-of-play, campaign history or rollback. If content is operationally or legally critical, keep an external approval record and a next-review date. Current SignageWall has organization-level admin and member roles, not a granular per-screen approval workflow.',
        ],
        ['h', 'What a successful low-maintenance system looks like'],
        [
          'p',
          'Success means a fact changes once, an owner is named, and the team knows what happens when a source is late or the network disappears. Connected sources reduce duplicate entry; working hours stop the entire display showing unnecessarily; a regular review catches what automation cannot. That is a more sustainable goal than claiming content changes itself without limits.',
        ],
      ],
    },
  },

  'vertikalni-ili-horizontalni-ekran': {
    links: {
      posts: ['tipografija-za-ekrane', 'ekran-u-izlogu-citljivost', 'video-na-ekranima'],
      solutions: ['retail'],
      apps: ['menu', 'canva'],
    },
    sr: {
      intent: {
        primaryQuery: 'vertikalni ili horizontalni ekran za digital signage',
        intentType: 'commercial-investigation',
        audience: 'Kupci koji biraju orijentaciju pre montaže poslovnog ekrana',
        jobToBeDone:
          'Izabrati orijentaciju na osnovu prostora, udaljenosti i stvarnog formata sadržaja.',
        uniquePromise:
          'Reverzibilan test odluke koji povezuje montažu, čitljivost i podržano podešavanje playera.',
        notTargeting:
          'Kupovina određenog modela ekrana, tipografski vodič, video produkcija ili multi-zone layout.',
      },
      takeaways: [
        'Orijentaciju određuju prostor i zadatak poruke.',
        'Dizajn pravite u istom odnosu stranica.',
        'SignageWall podržava portrait i landscape podešavanje.',
      ],
      content: [
        [
          'p',
          'Vertikalni ekran nije modernija verzija horizontalnog, niti je horizontalni automatski bezbedniji izbor. Orijentacija određuje koliko prostora poruka ima, kako se uklapa u zid i da li postojeći materijal može da se pročita bez praznih traka ili sitnog teksta. Najbolju odluku donosite pre montaže, sa probnim sadržajem u tačnoj poziciji.',
        ],
        ['h', 'Pođite od oblika prostora'],
        [
          'p',
          'Uski stub, prostor između vrata ili izlog sa ograničenom širinom prirodno favorizuju portret. Širok zid iznad pulta, recepcije ili reda češće odgovara landscape formatu. Izmerite ne samo slobodan zid već i liniju pogleda, prepreke i mesto sa kog se sadržaj čita. Ekran ne treba da tera posmatrača da podiže glavu pod neprijatnim uglom.',
        ],
        ['fig', 0],
        ['h', 'Zatim odredite posao sadržaja'],
        [
          'p',
          'Portret dobro koristi visinu za kratku listu, smernice, jednu osobu ili proizvod i QR poziv. Landscape ostavlja više horizontalnog prostora za meni sa nekoliko kolona, prezentaciju, video i tabelu. To su polazne tačke, ne pravila. Dugačka tabela može biti nečitljiva u oba formata, a jedna jaka fotografija može raditi u oba ako je kadrirana posebno.',
        ],
        [
          'ul',
          [
            'Portret: kratke poruke, navigacija, pojedinačni proizvod i uzak izlog.',
            'Landscape: video 16:9, prezentacije, širi meni i sadržaj iznad pulta.',
            'Oba: tekst, PDF i fotografije kada su pripremljeni u odgovarajućem odnosu.',
          ],
        ],
        ['h', 'Ne rotirajte gotov dizajn na kraju'],
        [
          'p',
          'Landscape grafika postavljena na portretni ekran obično završi sa velikim praznim površinama ili premalim tekstom. Napravite zaseban artboard u ciljnom odnosu stranica i ponovo složite hijerarhiju. Canva aplikacija može prikazati povezani Canva dizajn, ali je mrežna i sam dizajn i dalje mora odgovarati orijentaciji. Menu Board nudi sopstvene šablone i stilove, ali ne stvara multi-zone raspored ekrana.',
        ],
        ['h', 'Šta SignageWall može da podesi'],
        [
          'p',
          'Podešavanja vezanog uređaja podržavaju portrait i landscape orijentaciju, kao i scale opcije. To omogućava da player uskladite sa fizički okrenutim ekranom. Softverska rotacija ne menja bezbednost nosača, garanciju displeja niti smer ventilacije. Pre okretanja proverite dokumentaciju proizvođača i koristite nosač predviđen za težinu i položaj panela.',
        ],
        ['h', 'Napravite probu u punoj veličini'],
        [
          'ol',
          [
            'Napravite po jednu jednostavnu verziju ključne poruke u oba formata.',
            'Prikažite ih preko celog ekrana na uređaju koji planirate da koristite.',
            'Stanite na najbližu i najudaljeniju realnu tačku gledanja.',
            'Proverite naslov, cenu, QR veličinu i vidljivost bez pomeranja.',
            'Tek tada zaključajte orijentaciju i poziciju nosača.',
          ],
        ],
        [
          'p',
          'Ako odluka ostane nejasna, birajte prema dominantnom sadržaju tokom većeg dela godine, ne prema jednoj kampanji. Posebnu promociju je jeftinije redizajnirati nego fizički premeštati ekran. Za mrežu više uređaja dokumentujte odnos stranica uz naziv svakog ekrana, jer SignageWall trenutno nema screen groups ili zone koje automatski štite od slanja pogrešnog formata.',
        ],
        ['h', 'Kratka kontrola pre montaže'],
        [
          'p',
          'Potvrdite da proizvođač dozvoljava željenu orijentaciju, da player build i kablovi rade u tom položaju i da postoji pristup uređaju za servis. Zatim proverite sadržaj na dnevnom svetlu karakterističnom za prostor. Orijentacija je dobra tek kada poruka stane bez sabijanja, može da se pročita sa realne udaljenosti i ostaje jednostavna za održavanje.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'portrait or landscape screen for digital signage',
        intentType: 'commercial-investigation',
        audience: 'Buyers choosing an orientation before mounting a business display',
        jobToBeDone:
          'Select an orientation from the space, viewing distance and real content format.',
        uniquePromise:
          'A reversible decision test connecting mounting, readability and supported player orientation settings.',
        notTargeting:
          'Specific display models, a typography guide, video production, or multi-zone layouts.',
      },
      takeaways: [
        'Space and message purpose determine orientation.',
        'Design in the display’s actual aspect ratio.',
        'SignageWall supports portrait and landscape settings.',
      ],
      content: [
        [
          'p',
          'A portrait screen is not a more modern landscape screen, and landscape is not automatically the safer choice. Orientation determines how much room a message has, how the display fits the wall, and whether existing material can be read without empty bars or tiny text. Make the decision before mounting, using trial content in the exact position.',
        ],
        ['h', 'Start with the shape of the space'],
        [
          'p',
          'A narrow column, the area between doors or a window with limited width naturally favors portrait. A wide wall above a counter, reception desk or queue more often suits landscape. Measure more than empty wall area: include sight lines, obstructions and the place from which people will read. A display should not force viewers to hold their heads at an uncomfortable angle.',
        ],
        ['fig', 0],
        ['h', 'Then define the content’s job'],
        [
          'p',
          'Portrait uses height well for a short list, directions, one person or product, and a QR prompt. Landscape offers horizontal room for a menu with several columns, a presentation, video and a table. These are starting points, not rules. A long table can be unreadable in either format, while one strong photograph can work in both when it is cropped separately.',
        ],
        [
          'ul',
          [
            'Portrait: short messages, wayfinding, one product and a narrow window.',
            'Landscape: 16:9 video, presentations, wider menus and above-counter displays.',
            'Either: text, PDFs and photographs prepared for the correct aspect ratio.',
          ],
        ],
        ['h', 'Do not rotate a finished design at the end'],
        [
          'p',
          'A landscape graphic placed on a portrait display usually ends with large empty areas or text that is too small. Create a separate artboard at the target ratio and rebuild its hierarchy. The Canva app can show a connected Canva design, but it requires networking and the design still has to suit the orientation. Menu Board offers its own templates and styles, but it does not create a multi-zone screen layout.',
        ],
        ['h', 'What SignageWall can configure'],
        [
          'p',
          'Settings for a bound device support portrait and landscape orientation as well as scale options. This lets the player match a physically rotated display. Software rotation does not change mount safety, the panel warranty or ventilation direction. Before rotating, read the manufacturer’s documentation and use a mount rated for the panel’s weight and position.',
        ],
        ['h', 'Run a full-size trial'],
        [
          'ol',
          [
            'Create one simple version of the key message in each orientation.',
            'Show both full-screen on the device you plan to deploy.',
            'Stand at the nearest and furthest realistic viewing points.',
            'Check the heading, price, QR size and visibility without moving.',
            'Only then lock the orientation and bracket position.',
          ],
        ],
        [
          'p',
          'If the choice remains close, decide from the dominant content used for most of the year, not one campaign. Redesigning a special promotion is cheaper than physically moving a display. For a multi-screen estate, record the aspect ratio in every screen name because current SignageWall does not provide screen groups or zones that automatically prevent the wrong format being assigned.',
        ],
        ['h', 'A short pre-mount check'],
        [
          'p',
          'Confirm that the manufacturer allows the desired orientation, the player build and cables work in that position, and the device remains reachable for service. Then inspect the content under the daylight conditions typical of the site. An orientation is right only when the message fits without compression, reads from the real distance, and remains straightforward to maintain.',
        ],
      ],
    },
  },
}
