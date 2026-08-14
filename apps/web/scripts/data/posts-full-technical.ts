// @ts-nocheck
/*
 * Capability-safe technical Blog packages.
 *
 * `links` contains repository keys: Serbian source post slugs, stable Solution
 * keys and app-manifest slugs. Relationship resolution belongs to the seed.
 */

export const POSTS_FULL_TECHNICAL = {
  'ekran-u-izlogu-citljivost': {
    links: {
      posts: [
        'tipografija-za-ekrane',
        'vertikalni-ili-horizontalni-ekran',
        'sta-pitati-dobavljaca',
      ],
      solutions: ['retail'],
      apps: ['text', 'canva'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako proveriti čitljivost ekrana u izlogu',
        intentType: 'commercial-investigation',
        audience: 'Vlasnici radnji i projektanti koji biraju ekran za izlog',
        jobToBeDone:
          'Izmeriti uslove u izlogu i proveriti čitljivost pre konačne kupovine i montaže.',
        uniquePromise:
          'Postupak na licu mesta koji odvaja specifikacije panela od stvarnih SignageWall kontrola.',
        notTargeting:
          'Univerzalni prag svetline, lista modela displeja, tipografski vodič ili upravljanje svetlinom kroz SignageWall.',
      },
      takeaways: [
        'Izmerite uslove i tražite specifikaciju proizvođača.',
        'Probajte finalni dizajn u najtežem delu dana.',
        'SignageWall radno vreme nije kontrola svetline.',
      ],
      content: [
        [
          'p',
          'Ekran u izlogu ne bira se samo po dijagonali. Između panela i prolaznika stoje staklo, odsjaj, promenljivo dnevno svetlo i često dodatna toplota. Zbog toga ekran koji izgleda odlično u salonu može biti nečitljiv na konkretnoj lokaciji. Umesto univerzalnog praga u nitima, zabeležite uslove, uporedite ih sa specifikacijama proizvođača i tražite probu na mestu gde će panel stvarno raditi.',
        ],
        ['h', 'Napravite mapu najtežih uslova'],
        [
          'p',
          'Posmatrajte izlog u nekoliko karakterističnih termina: kada direktno svetlo pada na staklo, kada se na njemu ogledaju nebo ili zgrade, i posle mraka. Zabeležite položaj sunca, smer prolaska publike, udaljenost čitanja i izvor odsjaja. Ako imate merač ambijentalnog osvetljenja, sačuvajte rezultat zajedno sa vremenom i mestom merenja; ako ga nemate, fotografije iz iste tačke i probni panel daju korisniji dokaz od generičkog internet pravila.',
        ],
        ['fig', 0],
        ['h', 'Proverite panel, staklo i temperaturu zajedno'],
        [
          'p',
          'Od dobavljača tražite deklarisanu svetlinu, način rada za planirani broj sati, dozvoljenu orijentaciju, antirefleksna svojstva i radni temperaturni opseg. Pitajte da li je specifikacija održiva ili samo vršna vrednost. Izlog iza zatvorenog stakla može se zagrejati znatno više od prostorije, pa ventilacija i razmak od stakla moraju pratiti uputstvo proizvođača. Softver ne može da nadoknadi panel van sopstvenih termičkih granica.',
        ],
        ['h', 'Dizajn proverite u realnom kadru'],
        [
          'p',
          'Napravite jednu probnu scenu sa glavnim naslovom, cenom ili pozivom na akciju. Koristite jasnu hijerarhiju, dovoljno debeo rez slova i pozadinu koja drži kontrast i preko odsjaja. Zatim je prikažite preko celog ekrana i prođite pored izloga normalnim tempom. Ako morate da zastanete, priđete ili pogađate šta piše, prvo skratite poruku i povećajte ključni element; ne rešavajte problem dodavanjem još svetline napamet.',
        ],
        [
          'ul',
          [
            'Proverite naslov sa najudaljenije relevantne tačke.',
            'Pogledajte da li refleksija prelazi preko cene ili lica.',
            'Ponovite test u najjačem dnevnom svetlu i posle mraka.',
            'Snimite rezultat iz ugla iz kog publika zaista prilazi.',
          ],
        ],
        ['h', 'Odvojite tri različite kontrole'],
        [
          'p',
          'Svetlina panela podešava se na samom displeju ili kroz njegov operativni sistem, ako proizvođač to podržava. Automatsko prigušivanje, senzor i fizičko gašenje takođe pripadaju hardveru ili njegovom upravljačkom sistemu. SignageWall trenutno ne kontroliše svetlinu i ne isključuje televizor. Njegovo radno vreme određuje kada ceo player prikazuje sadržaj, a van perioda prikazuje crni standby.',
        ],
        [
          'p',
          'Crni standby nije isto što i prigušen ili ugašen panel. Isto tako, SignageWall trenutno ne zakazuje svetliju dnevnu i tamniju noćnu scenu kao pojedinačne stavke. Ako su automatska promena svetline ili kreativnog materijala uslov projekta, proverite ih kao zasebne zahteve kod displeja i softvera pre kupovine.',
        ],
        ['h', 'Pilot je završna specifikacija'],
        [
          'p',
          'Najbezbednija odluka je kratka proba sa tačnim modelom, nosačem, staklom i finalnim sadržajem. Dogovorite unapred šta znači prolaz: glavna poruka čita se u hodu iz definisane tačke, panel ostaje u dozvoljenoj temperaturi i noću ne stvara neprihvatljiv odsjaj. Sačuvajte fotografije, podešavanja i model kao standard za sledeći izlog. Tako kupujete prema izmerenom prostoru, a ne prema obećanju da jedan broj rešava svaku fasadu.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to test shop window screen readability',
        intentType: 'commercial-investigation',
        audience: 'Shop owners and designers selecting a display for a window',
        jobToBeDone:
          'Measure window conditions and verify readability before final purchase and installation.',
        uniquePromise:
          'An on-site method separating display specifications from controls SignageWall actually provides.',
        notTargeting:
          'A universal brightness threshold, display model list, typography guide, or SignageWall brightness control.',
      },
      takeaways: [
        'Measure the site and request manufacturer specifications.',
        'Test final creative during the hardest part of the day.',
        'SignageWall working hours are not brightness control.',
      ],
      content: [
        [
          'p',
          'A shop-window display cannot be selected by diagonal size alone. Glass, reflections, changing daylight and often additional heat sit between the panel and the passer-by. A screen that looks excellent in a showroom can therefore be unreadable at the actual site. Instead of relying on one universal nit threshold, document the conditions, compare them with manufacturer specifications, and request a trial where the panel will really operate.',
        ],
        ['h', 'Map the most difficult conditions'],
        [
          'p',
          'Observe the window at several representative times: when direct light reaches the glass, when the sky or nearby buildings are reflected, and after dark. Record the sun position, direction of foot traffic, viewing distance and source of glare. If you have an ambient-light meter, save the result with its time and measurement point. If not, photographs from one fixed position and a trial panel are more useful evidence than a generic rule found online.',
        ],
        ['fig', 0],
        ['h', 'Evaluate the panel, glass and heat together'],
        [
          'p',
          'Ask the supplier for stated brightness, duty-cycle guidance, permitted orientation, anti-reflection properties and operating-temperature range. Ask whether the number is sustained or only a peak value. A closed window can become much hotter than the room behind it, so ventilation and distance from the glass must follow the manufacturer’s instructions. Software cannot compensate for a panel operating outside its thermal limits.',
        ],
        ['h', 'Test the design in the real sight line'],
        [
          'p',
          'Create one trial scene containing the main heading, price or call to action. Use a clear hierarchy, a sufficiently robust letterform and a background that holds contrast through reflections. Show it full-screen and walk past at a normal pace. If you have to stop, step closer or guess the message, shorten the copy and enlarge the key element first. Do not solve the problem by adding arbitrary brightness.',
        ],
        [
          'ul',
          [
            'Check the heading from the furthest relevant point.',
            'See whether a reflection crosses the price or a face.',
            'Repeat the test in difficult daylight and after dark.',
            'Record the result from the direction people actually approach.',
          ],
        ],
        ['h', 'Separate three different controls'],
        [
          'p',
          'Panel brightness is configured on the display or through its operating system when the manufacturer supports it. Automatic dimming, a light sensor and physical power control also belong to the hardware or its management system. SignageWall currently does not control brightness or switch off the television. Its working-hours feature determines when the entire player shows content and renders black standby outside that window.',
        ],
        [
          'p',
          'Black standby is not the same as a dimmed or powered-off panel. Current SignageWall also does not schedule a brighter daytime scene and a darker nighttime scene as individual items. If automatic brightness or creative changes are project requirements, evaluate them separately against the display and software before purchasing.',
        ],
        ['h', 'Treat the pilot as the final specification'],
        [
          'p',
          'The safest decision is a short trial using the exact model, mount, glass and final content. Define a pass in advance: the main message is readable while walking from a named point, the panel remains within its permitted temperature, and nighttime glare is acceptable. Save photographs, settings and the model as a standard for the next window. You are then buying for a measured site rather than trusting a claim that one number solves every façade.',
        ],
      ],
    },
  },

  'zaglavljena-slika-burn-in': {
    links: {
      posts: ['ekran-u-izlogu-citljivost', 'video-na-ekranima', 'koliko-dugo-treba-da-traje-slajd'],
      solutions: ['retail'],
      apps: ['ticker', 'clock'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako smanjiti rizik od OLED burn-in-a na signage ekranu',
        intentType: 'informational',
        audience: 'Operateri koji dugo prikazuju statične elemente na poslovnim ekranima',
        jobToBeDone:
          'Prepoznati tip problema i napraviti bezbedan plan prevencije prema uputstvu proizvođača.',
        uniquePromise:
          'Razdvaja trajni OLED burn-in od privremene LCD retencije bez kućnih popravki i lažnih rokova.',
        notTargeting:
          'Garancija panela, formula životnog veka, servisno uputstvo ili preporuka konkretnog modela ekrana.',
      },
      takeaways: [
        'OLED burn-in i LCD retencija nisu isti problem.',
        'Smanjite trajno nepomične elemente i pratite pixel-care smernice.',
        'SignageWall standby ne znači fizički ugašen panel.',
      ],
      content: [
        [
          'p',
          'Izraz „zaglavljena slika” često se koristi za dva različita problema. OLED burn-in je trajna neujednačenost nastala različitim habanjem piksela. LCD može pokazati privremenu retenciju slike koja se povlači, dok trajni kvarovi imaju drugačije uzroke i dijagnostiku. Ne određujte terapiju samo po fotografiji sa interneta: proverite tehnologiju panela, model i opis proizvođača pre bilo kakve intervencije.',
        ],
        ['h', 'Prvo utvrdite šta gledate'],
        [
          'p',
          'Prikažite neutralnu jednobojnu scenu kroz ugrađeni test panela, ako ga proizvođač nudi. Zabeležite da li se vidi obris logotipa, trake, sata ili ivice pogrešno formatiranog videa. Zatim pogledajte uputstvo za image retention, panel refresh, pixel shift ili sličnu funkciju tačnog modela. Ne pokrećite nasumične trepćuće snimke, dugo belo polje ili servisni meni bez izričitog uputstva proizvođača; takav pokušaj nije univerzalna popravka.',
        ],
        ['fig', 0],
        ['h', 'Rizik stvara obrazac sadržaja, ne samo jedna slika'],
        [
          'p',
          'Na signage ekranu statičan može biti samo deo scene: logo u uglu, ticker na istoj visini, sat, navigaciona traka ili crne ivice. Čak i kada se fotografije menjaju, taj element ostaje na istim pikselima. SignageWall može rotirati medije, plejliste i aplikacije sa redosledom i trajanjem, ali sama rotacija ne pomera element koji je ugrađen na isto mesto u svakom dizajnu.',
        ],
        [
          'ul',
          [
            'Pregledajte šta ostaje nepomično kroz celu petlju.',
            'Pripremite varijante sa drugačijim položajem i pozadinom.',
            'Uskladite odnos videa sa ekranom da izbegnete stalne trake.',
            'Proverite da ticker ili sat nisu nepotrebno prisutni ceo dan.',
          ],
        ],
        ['h', 'Koristite zaštitu koju panel već ima'],
        [
          'p',
          'Mnogi displeji imaju sopstvene pixel-shift, screen-saver ili refresh postupke. Njihovi nazivi i dozvoljena učestalost razlikuju se, pa ih uključujte i pokrećite isključivo prema dokumentaciji. Nemojte isključiti zaštitu zato što kratko pomeranje slike izgleda neobično. Ako je panel namenjen za definisan duty cycle ili traži period odmora, to je hardverski zahtev koji CMS ne može da promeni.',
        ],
        ['h', 'Šta radno vreme SignageWall-a radi'],
        [
          'p',
          'Za ekran možete podesiti always, weekly ili special radno vreme. Van aktivnog perioda player prikazuje crni standby. To uklanja statičnu aplikaciju iz prikaza, ali ne šalje komandu za fizičko gašenje televizora i ne obećava određeno produženje životnog veka. Kod OLED-a crni pikseli imaju drugačije ponašanje od osvetljenih, ali odluke o panelu i napajanju i dalje treba zasnivati na uputstvu proizvođača.',
        ],
        ['h', 'Napravite rutinu, ne formulu'],
        [
          'ol',
          [
            'Popišite sve stalne elemente i tehnologiju svakog panela.',
            'Pripremite nekoliko rasporeda koji ne koriste iste piksele za isti element.',
            'Podesite trajanja i proverite celu petlju na ciljnom ekranu.',
            'Uključite dozvoljene panel-care funkcije prema dokumentaciji.',
            'Periodično pregledajte neutralan test i evidentirajte promenu.',
          ],
        ],
        [
          'p',
          'Ne postoji poštena formula tipa „manje sati jednako tačno toliko duži vek”, jer svetlina, temperatura, sadržaj, panel i zaštitni algoritmi rade zajedno. Ako se trag ne povuče postupkom koji proizvođač propisuje, prijavite problem ovlašćenom servisu. Za SEO savet je dovoljno obećati dobru praksu: manje trajno statičnih elemenata, tačan format sadržaja i poštovanje panel-care smernica, ne kućni lek.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to reduce OLED burn-in risk on a signage screen',
        intentType: 'informational',
        audience: 'Operators showing static elements for long periods on business displays',
        jobToBeDone:
          'Identify the problem type and create a safe prevention plan using manufacturer guidance.',
        uniquePromise:
          'Separates permanent OLED burn-in from temporary LCD retention without DIY fixes or invented lifespans.',
        notTargeting:
          'Panel warranty advice, a lifespan formula, repair instructions, or a specific display recommendation.',
      },
      takeaways: [
        'OLED burn-in and LCD retention are different problems.',
        'Reduce fixed elements and follow panel pixel-care guidance.',
        'SignageWall standby does not mean physical power-off.',
      ],
      content: [
        [
          'p',
          '“Stuck image” is often used for two different problems. OLED burn-in is permanent unevenness caused by pixels wearing differently. An LCD can show temporary image retention that clears, while permanent LCD faults have different causes and diagnosis. Do not choose a treatment from an online photograph alone. Confirm the panel technology and model, then read the manufacturer’s description before attempting any intervention.',
        ],
        ['h', 'Identify what you are seeing first'],
        [
          'p',
          'Show a neutral solid-color scene through the panel’s built-in test when one is available. Record whether you can see the outline of a logo, ticker, clock or the edge of mismatched video. Then consult the instructions for image retention, panel refresh, pixel shift or the equivalent feature on that exact model. Do not run random flashing clips, prolonged white fields or a service menu without explicit manufacturer guidance; none is a universal repair.',
        ],
        ['fig', 0],
        ['h', 'A content pattern creates risk, not only one image'],
        [
          'p',
          'Only part of a signage scene may be static: a corner logo, ticker at one height, clock, navigation rail or black border. Photographs may change while that element remains on the same pixels. SignageWall can rotate media, playlists and apps with order and duration, but rotation alone does not move an element embedded in the same position in every design.',
        ],
        [
          'ul',
          [
            'Inspect what remains fixed throughout the complete loop.',
            'Create variants with different positions and backgrounds.',
            'Match video aspect ratio to avoid permanent border areas.',
            'Check whether a ticker or clock really needs to stay all day.',
          ],
        ],
        ['h', 'Use the protection built into the panel'],
        [
          'p',
          'Many displays provide pixel shifting, screen savers or refresh procedures. Their names and permitted frequency differ, so enable or run them only as the documentation directs. Do not disable protection merely because a subtle movement looks unusual. If a display has a defined duty cycle or requires rest, that is a hardware condition the CMS cannot change.',
        ],
        ['h', 'What SignageWall working hours do'],
        [
          'p',
          'A screen can use always, weekly or special working hours. Outside the active period, the player renders black standby. This removes a static app from view, but it does not send a physical power-off command and does not promise a particular increase in panel life. Black pixels behave differently on OLED from illuminated pixels, yet power and panel decisions still belong with the manufacturer’s guidance.',
        ],
        ['h', 'Build a routine, not a formula'],
        [
          'ol',
          [
            'List every persistent element and the technology of each display.',
            'Prepare layouts that do not reuse the same pixels for the same element.',
            'Set durations and inspect the complete loop on the target screen.',
            'Enable permitted panel-care functions according to the manual.',
            'Review a neutral test periodically and record any change.',
          ],
        ],
        [
          'p',
          'There is no honest formula saying fewer hours produces an exact extension of lifespan. Brightness, temperature, content, panel construction and protective algorithms interact. If a mark does not clear through the manufacturer’s documented process, contact authorized service. A responsible guide promises only good practice: fewer permanently static elements, correctly fitted content and compliance with panel-care instructions, not a home remedy.',
        ],
      ],
    },
  },

  'tipografija-za-ekrane': {
    links: {
      posts: [
        'greske-na-digitalnim-ekranima',
        'koliko-dugo-treba-da-traje-slajd',
        'vertikalni-ili-horizontalni-ekran',
      ],
      solutions: ['office'],
      apps: ['text', 'menu'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako testirati tipografiju za digital signage ekran',
        intentType: 'informational',
        audience: 'Dizajneri i urednici sadržaja za ekrane u fizičkom prostoru',
        jobToBeDone:
          'Izabrati i proveriti tekst koji ostaje čitljiv u stvarnom prostoru i kretanju.',
        uniquePromise:
          'Heuristike povezane sa fizičkim testom umesto jedne lažno univerzalne formule veličine slova.',
        notTargeting:
          'Izbor brend fonta, WCAG pravni audit, trajanje slajda ili kupovina displeja.',
      },
      takeaways: [
        'Hijerarhiju gradite prema odluci gledaoca.',
        'Kontrast proverite na svim stvarnim pozadinama.',
        'Veličinu potvrdite na ciljnom ekranu i udaljenosti.',
      ],
      content: [
        [
          'p',
          'Tipografija na digital signage ekranu nije uvećana tipografija za veb. Gledalac je dalje, često se kreće, može da uđe u petlju na sredini i nema kursor kojim će otvoriti detalj. Zbog toga veličina fonta nije jedina odluka. Potrebni su jasna hijerarhija, kratak tekst, stabilan kontrast i proba na ciljnom displeju pod stvarnim svetlom.',
        ],
        ['h', 'Prvo definišite šta gledalac treba da sazna'],
        [
          'p',
          'Napišite glavnu informaciju u jednoj rečenici pre dizajniranja. Na sceni zatim odvojite naslov, ključni podatak kao što su cena ili vreme, i eventualno kratko objašnjenje. Ako tri elementa izgledaju podjednako važno, pogled ne zna gde da počne. Povećavanje svega ne rešava hijerarhiju; razlika u veličini, težini, prostoru i položaju treba da pokaže red čitanja.',
        ],
        ['fig', 0],
        ['h', 'Koristite heuristike kao početak'],
        [
          'p',
          'Za glavnu poruku birajte jednostavne oblike slova, umerenu ili jaču težinu i dovoljno razmaka da se znakovi ne spoje u odsjaju. Višeredni tekst obično je lakše pratiti kada je poravnat ulevo, dok centriranje bolje služi kratkoj samostalnoj poruci. Dugi redovi i pasusi povećavaju verovatnoću da gledalac ode pre kraja. To su smernice, ne univerzalni zakoni za svaku udaljenost i svaki panel.',
        ],
        [
          'ul',
          [
            'Jedna dominantna informacija po sceni.',
            'Razumljiv font pre dekorativnog karaktera.',
            'Vidljiva razlika između naslova i pomoćnog teksta.',
            'Dovoljno praznog prostora oko cene i poziva na akciju.',
          ],
        ],
        ['h', 'Kontrast procenjujte na finalnom materijalu'],
        [
          'p',
          'Crni tekst na belom u editoru ne dokazuje da će tekst preko fotografije biti čitljiv. Proverite najsvetliji i najtamniji kadar, uključujući video. Ako pozadina varira, koristite stabilnu plohu, zatamnjenje ili izdvojen tekstualni region. Boja nije zamena za tonalni kontrast, a tanka slova mogu nestati pod odsjajem i kada kombinacija izgleda elegantno na laptopu.',
        ],
        [
          'p',
          'Kod srpskog i engleskog sadržaja proverite da izabrani rez pravilno prikazuje sva slova i znakove, uključujući č, ć, š, ž i đ. Rezervni font može promeniti širinu reda i pokvariti prelom koji je u editoru izgledao dobro.',
        ],
        ['h', 'Ne računajte veličinu jednom formulom'],
        [
          'p',
          'Čitljivost zavisi od fizičke visine slova, rezolucije, veličine panela, udaljenosti, ugla, vida publike, kretanja i ambijentalnog svetla. Pravilo preuzeto iz drugog prostora može dati pogrešan rezultat. Napravite probu sa nekoliko veličina, prikažite je preko celog ciljnog ekrana i označite najbližu i najudaljeniju tačku sa koje poruka mora da radi.',
        ],
        ['h', 'Testirajte kao posetilac, ne kao autor'],
        [
          'ol',
          [
            'Objavite probnu scenu na uređaju i ekranu koji ćete koristiti.',
            'Priđite iz pravca iz kog dolazi publika.',
            'Pogledajte poruku samo koliko traje realan kontakt.',
            'Sklonite pogled i ponovite naslov i ključni podatak.',
            'Skratite tekst ili promenite hijerarhiju pre prostog uvećavanja.',
          ],
        ],
        [
          'p',
          'SignageWall Text aplikacija omogućava rich-text sadržaj, boje i stilska polja, a Menu Board ima sopstvene teme i stilove. To nisu globalni brand kit ni garancija čitljivosti. Pregled u CMS-u pomaže da uočite grešku, ali završna odluka pripada fizičkom displeju. Sačuvajte uspešnu probu kao internu polaznu tačku za taj tip ekrana, udaljenost i prostor, a ne kao univerzalnu formulu za sve lokacije.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to test typography for a digital signage screen',
        intentType: 'informational',
        audience: 'Designers and editors creating content for displays in physical spaces',
        jobToBeDone:
          'Choose and validate text that remains readable in the real space and in motion.',
        uniquePromise:
          'Heuristics tied to a physical test instead of one falsely universal type-size formula.',
        notTargeting:
          'Brand-font selection, a legal WCAG audit, slide duration, or display purchasing.',
      },
      takeaways: [
        'Build hierarchy around the viewer’s decision.',
        'Check contrast across every real background.',
        'Validate size on the target display and distance.',
      ],
      content: [
        [
          'p',
          'Typography for digital signage is not web typography enlarged. The viewer is further away, often moving, may enter a loop halfway through, and has no cursor for opening detail. Font size is therefore only one decision. You need a clear hierarchy, concise copy, stable contrast and a trial on the target display under the real lighting conditions.',
        ],
        ['h', 'Define what the viewer needs to learn first'],
        [
          'p',
          'Write the main information in one sentence before designing. Separate the heading, a key fact such as price or time, and any short explanation. If three elements look equally important, the eye has no starting point. Enlarging everything does not create hierarchy. Differences in size, weight, space and position should reveal the intended reading order.',
        ],
        ['fig', 0],
        ['h', 'Use heuristics as a starting point'],
        [
          'p',
          'For the primary message, choose straightforward letterforms, a moderate or heavier weight, and enough spacing that characters do not merge through glare. Multi-line copy is often easier to follow when aligned left, while centering better suits a short standalone message. Long lines and paragraphs make it more likely that the viewer leaves before finishing. These are guidelines, not universal laws for every distance and panel.',
        ],
        [
          'ul',
          [
            'One dominant piece of information per scene.',
            'A comprehensible typeface before decorative character.',
            'A visible distinction between heading and supporting copy.',
            'Enough clear space around a price and call to action.',
          ],
        ],
        ['h', 'Judge contrast on the final asset'],
        [
          'p',
          'Black copy on white in an editor does not establish that text over a photograph will read. Check the lightest and darkest frames, including video. When a background changes, use a stable panel, scrim or separate text region. Color is not a substitute for tonal contrast, and thin strokes can disappear in reflections even when the combination looks elegant on a laptop.',
        ],
        ['h', 'Do not calculate size from one formula'],
        [
          'p',
          'Readability depends on physical letter height, resolution, panel size, distance, angle, audience vision, movement and ambient light. A rule borrowed from another site can produce the wrong result. Create a trial with several sizes, show it full-screen on the target display, and mark the nearest and furthest points from which the message has to work.',
        ],
        ['h', 'Test like a visitor rather than the author'],
        [
          'ol',
          [
            'Publish a trial scene to the player and display you will use.',
            'Approach from the same direction as the audience.',
            'Look only for the realistic duration of contact.',
            'Look away and repeat the heading and key fact.',
            'Shorten the copy or change hierarchy before merely enlarging it.',
          ],
        ],
        [
          'p',
          'The SignageWall Text app provides rich text, colors and style fields, while Menu Board has its own themes and styling. These are not a global brand kit or a guarantee of readability. The CMS preview helps catch mistakes, but the physical display owns the final decision. Save a successful trial as an internal starting point for that screen type, distance and room, not as a universal formula for every location.',
        ],
      ],
    },
  },

  'vise-lokacija-jedan-tim': {
    links: {
      posts: [
        'sta-pitati-dobavljaca',
        'digital-signage-za-pocetnike',
        'kako-meriti-da-li-ekran-radi-posao',
      ],
      solutions: ['retail', 'office'],
      apps: ['text', 'ticker'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako organizovati digital signage na više lokacija',
        intentType: 'informational',
        audience: 'Centralni timovi koji održavaju ekrane u više poslovnih objekata',
        jobToBeDone:
          'Uvesti dosledno imenovanje, ponovnu upotrebu sadržaja i proveru uređaja bez izmišljenih grupa.',
        uniquePromise:
          'Operativni model zasnovan na eksplicitnom izboru ekrana i stvarnim admin-member ulogama.',
        notTargeting:
          'Enterprise screen groups, lokalne dozvole, dokaz prikazivanja, broj podržanih lokacija ili SLA.',
      },
      takeaways: [
        'Imenovanje nadoknađuje odsustvo screen groups funkcije.',
        'Plejliste ponovo koristite na ručno izabranim ekranima.',
        'Uloge su organizacione admin i member, ne lokacione.',
      ],
      content: [
        [
          'p',
          'Više lokacija ne traži samo više uređaja; traži precizniji način rada. Ako su ekrani nazvani „TV 1” i „Novi ekran”, pogrešan sadržaj postaje verovatan čim lista poraste. Trenutni SignageWall nema sačuvane screen groups, lokacione tagove ni dugme za objavu celoj regiji. Organizacija zato treba da počne jasnim imenima, sadržajem za ponovnu upotrebu i kontrolisanim eksplicitnim izborom ekrana.',
        ],
        ['h', 'Uvedite naziv koji nosi kontekst'],
        [
          'p',
          'Dogovorite redosled delova naziva, na primer grad–objekat–pozicija–orijentacija. „NS-Centar-Izlog-P” govori više od serijskog broja i ostaje razumljiv kada se fizički plejer zameni. Opis ekrana koristite za detalj koji ne staje u naziv, a zasebnu internu evidenciju za kontakt na lokaciji, model panela i datum instalacije. Ne predstavljajte takvu evidenciju kao ugrađenu SignageWall lokacionu bazu.',
        ],
        ['fig', 0],
        ['h', 'Ponovo koristite plejlistu, ne kopiju'],
        [
          'p',
          'Plejlista može da sadrži medije i aplikacije sa redosledom, trajanjem i enabled stanjem. Napravite je oko stabilnog zadatka, na primer informacije za prijem ili sadržaj za izlog, umesto oko jedne kratke kampanje. SignageWall dozvoljava da isti medij, plejlistu ili aplikaciju dodate na više eksplicitno izabranih ekrana. Izbor je lista konkretnih screen ID-jeva; nije sačuvana grupa po gradu, ulozi ili franšizi.',
        ],
        [
          'p',
          'Pre bulk izmene filtrirajte sopstveni spisak po konvenciji naziva i pročitajte izabrane ekrane još jednom. Za lokalnu razliku napravite zasebnu stavku na konkretnom ekranu ili posebnu plejlistu čiji naziv jasno opisuje opseg. Nemojte obećati automatsko nasleđivanje ili objavu „svim lokacijama jednim klikom”.',
        ],
        ['h', 'Uloge planirajte prema stvarnom modelu dozvola'],
        [
          'p',
          'Trenutne organizacione uloge su admin i member. Ne postoje per-screen ili per-location dozvole, granularno odobravanje ni uloga lokalnog menadžera ograničena samo na njegov objekat. Ako organizacija mora da razdvoji pristup lokacijama, nemojte ga simulirati imenima ekrana. Ograničite uređivanje na centralni tim ili uvedite spoljašnji proces zahteva dok proizvod nema potreban permission model.',
        ],
        ['h', 'Podesite svaki ekran prema njegovom prostoru'],
        [
          'p',
          'Radno vreme se čuva po ekranu i može biti always, weekly ili special sa vremenskom zonom. To pomaže lokacijama sa različitim periodima rada, ali ne zakazuje pojedinačne kampanje. Jedan ekran se vezuje za jedan uređaj preko ručno unetog šestokarakternog koda. Zabeležite ko na lokaciji može da proveri fizički ulaz, napajanje i panel kada centralni CMS pokaže da je uređaj povezan.',
        ],
        ['h', 'Nadzor pretvorite u rutinu'],
        [
          'ol',
          [
            'Pregledajte online/offline status i last-seen po dogovorenom ritmu.',
            'Otvorite live preview pojedinačnog ekrana kada proveravate izmenu.',
            'Eskalirajte lokaciji ako je uređaj offline ili dugo nije viđen.',
            'Na uzorku fizički proverite HDMI ulaz, čitljivost i tačnost sadržaja.',
            'Vodite spoljašnju evidenciju incidenta i završene provere.',
          ],
        ],
        [
          'p',
          'Presence i preview nisu proof-of-play istorija: ne dokazuju svaki prikazani frejm niti daju automatski izveštaj kampanje. Njihova vrednost je brža dijagnostika trenutnog stanja. Pre širenja testirajte proces na nekoliko jasno imenovanih ekrana i izmerite koliko vremena tim troši na izbor, objavu i proveru. Proizvod ne treba opisivati neproverenim maksimumom lokacija; održiv obim zavisi i od organizacione discipline.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to organize digital signage across multiple locations',
        intentType: 'informational',
        audience: 'Central teams maintaining screens across several business sites',
        jobToBeDone:
          'Introduce consistent naming, reusable content and device reviews without inventing screen groups.',
        uniquePromise:
          'An operating model based on explicit screen selection and actual admin-member roles.',
        notTargeting:
          'Enterprise screen groups, local permissions, proof of play, supported-location counts, or an SLA.',
      },
      takeaways: [
        'Naming compensates for the absence of screen groups.',
        'Reuse playlists across explicitly selected screens.',
        'Roles are organization admin and member, not location-scoped.',
      ],
      content: [
        [
          'p',
          'Multiple locations require more than additional devices; they require a more precise operating method. If screens are called “TV 1” and “New screen”, incorrect assignment becomes likely as soon as the list grows. Current SignageWall has no saved screen groups, location tags or button for publishing to an entire region. Organization should therefore begin with meaningful names, reusable content and controlled explicit screen selection.',
        ],
        ['h', 'Adopt a name that carries context'],
        [
          'p',
          'Agree on an order for name components, such as city–site–position–orientation. “LDN-Centre-Window-P” says more than a serial number and still works when the physical player is replaced. Use the screen description for detail that does not fit the name, and keep an external register for the site contact, panel model and installation date. Do not present that register as a built-in SignageWall location database.',
        ],
        ['fig', 0],
        ['h', 'Reuse a playlist rather than a copy'],
        [
          'p',
          'A playlist can contain media and apps with order, duration and enabled state. Build it around a stable job, such as reception information or window content, rather than one short campaign. SignageWall lets the same media, playlist or app be added to several explicitly selected screens. The selection is a list of concrete screen IDs; it is not a saved group by city, role or franchise.',
        ],
        [
          'p',
          'Before a bulk change, filter your own register using the naming convention and read the selected screens once more. For a local variation, add a separate item to the individual screen or create a playlist whose name clearly states its scope. Do not promise inheritance or publishing to every location in one click.',
        ],
        ['h', 'Plan roles around the real permission model'],
        [
          'p',
          'The current organization roles are admin and member. There are no per-screen or per-location permissions, granular approval workflow, or local-manager role limited to one site. When an organization must separate site access, do not simulate security with screen names. Restrict editing to a central team or use an external request process until the product has the required permission model.',
        ],
        ['h', 'Configure each screen for its own site'],
        [
          'p',
          'Working hours are stored per screen and can use always, weekly or special mode with a time zone. This helps sites with different opening windows, but it does not schedule individual campaigns. One screen binds to one device through a manually entered six-character code. Record who on site can check the physical input, power and panel when the central CMS says the device is connected.',
        ],
        ['h', 'Turn monitoring into a routine'],
        [
          'ol',
          [
            'Review online/offline state and last-seen time on an agreed cadence.',
            'Open the individual live preview when checking a content change.',
            'Escalate to the site when a device is offline or has not reported.',
            'Physically sample the HDMI input, readability and content accuracy.',
            'Keep an external record of the incident and completed check.',
          ],
        ],
        [
          'p',
          'Presence and preview are not proof-of-play history. They do not establish every displayed frame or generate a campaign report. Their value is faster diagnosis of current state. Before expanding, test the process on several clearly named screens and measure the team time needed for selection, publishing and review. Do not describe the product with an unverified maximum location count; sustainable scale also depends on operating discipline.',
        ],
      ],
    },
  },

  'video-na-ekranima': {
    links: {
      posts: [
        'ekran-mora-da-radi-i-bez-interneta',
        'android-boks-ili-mini-pc',
        'vertikalni-ili-horizontalni-ekran',
      ],
      solutions: ['retail'],
      apps: ['youtube', 'stream'],
    },
    sr: {
      intent: {
        primaryQuery: 'koji video format i veličinu prihvata SignageWall',
        intentType: 'informational',
        audience: 'Urednici koji pripremaju video datoteke za SignageWall ekrane',
        jobToBeDone:
          'Izvesti podržan video ispod limita i proveriti ga na stvarnom player uređaju.',
        uniquePromise:
          'Tačno objašnjenje prihvaćenih formata, limita i uslovnog transcoding ponašanja trenutnog proizvoda.',
        notTargeting:
          'Univerzalni bitrate, idealna dužina videa, filmska produkcija ili izbor player hardvera.',
      },
      takeaways: [
        'Upload prima MP4, WebM i QuickTime do 10 MB.',
        'Manji transcode se čuva; inače ostaje original.',
        'Finalni fajl proverite na ciljnom uređaju i mreži.',
      ],
      content: [
        [
          'p',
          'Video koji radi na laptopu nije automatski spreman za digital signage. Upload servis proverava tip i stvarni potpis datoteke, zatim je player prikazuje na drugom uređaju, često u drugačijem odnosu stranica i bez zvuka. Najbezbedniji tok je da izvezete jednu finalnu datoteku, proverite njen MIME tip i veličinu, sačekate obradu i pustite je na tačnom uređaju pre dodele na više ekrana.',
        ],
        ['h', 'Tačni ulazni uslovi'],
        [
          'p',
          'Trenutni SignageWall upload prihvata video/mp4, video/webm i video/quicktime. To u praksi pokriva MP4, WebM i QuickTime/MOV datoteke kada njihov sadržaj odgovara prijavljenom MIME tipu. Limit je tačno 10 MB po datoteci, odnosno 10 × 1024 × 1024 bajtova, a jedan upload može sadržati najviše deset fajlova. Promena ekstenzije ne pretvara nepodržan ili oštećen fajl u podržan format.',
        ],
        ['fig', 0],
        ['h', 'Šta se dešava posle uploada'],
        [
          'p',
          'Video prvo ulazi u processing stanje. Backend pokušava da ga prekodira u H.264/AAC MP4, sa visinom do 1080 piksela bez uvećavanja manjeg izvora i sa postavkom pogodnom za veb pokretanje. Nova MP4 verzija zamenjuje original samo ako je zaista manja. Ako obrada ne smanji fajl ili transcode ne uspe, original ostaje sačuvan i stavka može postati ready u originalnom podržanom formatu.',
        ],
        [
          'p',
          'Zato nije tačno obećati da će svaki WebM ili QuickTime obavezno postati MP4, niti da će svaki kodek raditi identično na svakom player uređaju. Sačekajte status obrade i pregledajte rezultat. Ako datoteka prelazi 10 MB, smanjite je pre uploada kroz sopstveni editor; server ne prima prevelik fajl da bi ga tek kasnije kompresovao.',
        ],
        ['h', 'Ne koristite univerzalni bitrate ili trajanje'],
        [
          'p',
          'Pravi izvoz zavisi od trajanja, količine pokreta, odnosa stranica i kvaliteta koji je potreban na konkretnoj udaljenosti. Kratak kadar sa mnogo detalja može tražiti drugačiju raspodelu podataka od duže, mirne animacije. Umesto preporuke jednog bitrate-a za sve, napravite nekoliko izvoznih proba ispod limita i uporedite tekst, gradijente, brzo kretanje i veličinu na ciljnom panelu.',
        ],
        ['h', 'Pripremite kadar za ekran'],
        [
          'ul',
          [
            'Izvozite u odnosu stranica ciljnog portretnog ili landscape ekrana.',
            'Držite važan tekst dalje od ivice i proverite njegovo vreme čitanja.',
            'Ako će ton biti isključen, prenesite smisao slikom i natpisima.',
            'Ne pretpostavljajte da duži video odgovara vremenu prolaska publike.',
          ],
        ],
        ['h', 'Upload i streaming nisu isto'],
        [
          'p',
          'Uploadovani media video player unapred preuzima i može ga reprodukovati iz keša nakon što je uspešno sinhronizovan. To ne znači da je svaka aplikacija offline. YouTube prikaz zahteva mrežu i podržava jedan video, ne YouTube playlistu, dok live stream zavisi od dostupnog udaljenog izvora. Za važnu rotaciju testirajte prekid mreže i zadržite lokalno keširanu stavku.',
        ],
        ['h', 'Završna kontrola'],
        [
          'ol',
          [
            'Proverite veličinu, MIME tip i odnos stranica finalnog fajla.',
            'Uploadujte ga i sačekajte da processing završi.',
            'Pustite ceo video na ciljnom playeru sa realnim podešavanjem zvuka.',
            'Proverite prelaz na prethodnu i sledeću stavku u petlji.',
            'Isključite mrežu tek kada je medij preuzet i ponovite reprodukciju.',
          ],
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'what video format and size does SignageWall accept',
        intentType: 'informational',
        audience: 'Editors preparing video files for SignageWall displays',
        jobToBeDone:
          'Export a supported video below the limit and validate it on the real player device.',
        uniquePromise:
          'An exact explanation of accepted formats, limits and conditional transcoding in the current product.',
        notTargeting:
          'A universal bitrate, ideal video duration, film production, or player hardware selection.',
      },
      takeaways: [
        'Uploads accept MP4, WebM and QuickTime up to 10 MB.',
        'A smaller transcode replaces the source; otherwise the original remains.',
        'Test the final file on the target device and network.',
      ],
      content: [
        [
          'p',
          'A video that works on a laptop is not automatically ready for digital signage. The upload service checks its type and actual file signature, then the player renders it on different hardware, often at another aspect ratio and without sound. The safest workflow is to export one final file, verify its MIME type and size, wait for processing, and play it on the exact device before assigning it to more screens.',
        ],
        ['h', 'The exact input rules'],
        [
          'p',
          'Current SignageWall uploads accept video/mp4, video/webm and video/quicktime. In practice this covers MP4, WebM and QuickTime/MOV files when their contents match the declared MIME type. The limit is exactly 10 MB per file, or 10 × 1024 × 1024 bytes, and one upload can contain at most ten files. Renaming an extension does not turn an unsupported or damaged file into a supported format.',
        ],
        ['fig', 0],
        ['h', 'What happens after upload'],
        [
          'p',
          'A video first enters processing. The backend attempts to re-encode it as an H.264/AAC MP4, with a maximum height of 1080 pixels without enlarging a smaller source, and settings suitable for web startup. The new MP4 replaces the original only when it is actually smaller. If processing does not reduce the file or transcoding fails, the supported original remains and the item can become ready in its source format.',
        ],
        [
          'p',
          'It is therefore incorrect to promise that every WebM or QuickTime upload will become MP4, or that every codec behaves identically on every player device. Wait for processing status and inspect the output. If a file exceeds 10 MB, reduce it before uploading in your own editor; the server does not accept an oversized source in order to compress it later.',
        ],
        ['h', 'Avoid a universal bitrate or duration'],
        [
          'p',
          'The right export depends on duration, motion, aspect ratio and the quality needed at the real viewing distance. A short sequence with complex detail can allocate data differently from a longer, calm animation. Instead of prescribing one bitrate for everything, create several exports below the limit and compare text, gradients, fast movement and file size on the target panel.',
        ],
        ['h', 'Prepare the frame for the display'],
        [
          'ul',
          [
            'Export for the aspect ratio of the target portrait or landscape screen.',
            'Keep important text away from edges and test its reading time.',
            'When sound will be off, convey meaning with pictures and captions.',
            'Do not assume a longer video fits the audience’s passing time.',
          ],
        ],
        ['h', 'Upload and streaming are different'],
        [
          'p',
          'The player prefetches uploaded media video and can play it from cache after successful synchronization. This does not make every app offline. YouTube requires networking and supports one video rather than a YouTube playlist, while a live stream depends on its remote source remaining available. For an important rotation, test a network interruption and retain a locally cached item.',
        ],
        ['h', 'The final check'],
        [
          'ol',
          [
            'Verify size, MIME type and aspect ratio of the final file.',
            'Upload it and wait for processing to complete.',
            'Play the whole video on the target player with realistic sound settings.',
            'Check transitions to the previous and next items in the loop.',
            'Disconnect networking only after media is prefetched, then replay it.',
          ],
        ],
      ],
    },
  },

  'sta-pitati-dobavljaca': {
    links: {
      posts: [
        'koliko-kosta-digital-signage',
        'ekran-mora-da-radi-i-bez-interneta',
        'vise-lokacija-jedan-tim',
      ],
      solutions: ['office', 'retail'],
      apps: ['web', 'powerbi'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako oceniti digital signage dobavljača kroz pilot',
        intentType: 'commercial-investigation',
        audience: 'Kupci koji porede digital signage dobavljače pre ugovora i širenja',
        jobToBeDone: 'Pretvoriti zahteve u bodovan pilot i proveriti tvrdnje na sopstvenom ekranu.',
        uniquePromise:
          'Eliminaciona matrica koja otvoreno navodi šta trenutni SignageWall može i ne može.',
        notTargeting:
          'Rang-lista dobavljača, aktuelne cene, pravni savet, bezbednosni audit ili hardverski katalog.',
      },
      takeaways: [
        'Obavezni zahtev je eliminacioni uslov, ne dodatni bod.',
        'Pilot koristite sa svojim hardverom, sadržajem i mrežom.',
        'Ograničenja tražite napismeno uz ponudu i plan podrške.',
      ],
      content: [
        [
          'p',
          'Demo pokazuje najbolji slučaj; pilot treba da pokaže običan i loš dan. Pre razgovora sa dobavljačem podelite zahteve na obavezne, važne i poželjne. Ako sistem nema obaveznu funkciju, zbir drugih bodova to ne popravlja. Zatim iste testove izvedite na svakom kandidatu, sa svojim ekranom, finalnom datotekom, stvarnim nalogom i kontrolisanim prekidom mreže.',
        ],
        ['h', 'Najpre postavite eliminacione uslove'],
        [
          'p',
          'Napišite ono bez čega projekat ne može da radi: podržan operativni sistem, tačan format sadržaja, potreban permission model, offline ponašanje ili ugovorni izlaz. Tražite demonstraciju, dokumentaciju i pisanu potvrdu da je funkcija uključena u ponuđeni plan. Roadmap, backlog i „možemo uskoro” ocenite kao da funkcije nema. Tako izbegavate kupovinu na osnovu prezentacije budućeg proizvoda.',
        ],
        ['fig', 0],
        ['h', 'Koristite jednostavno bodovanje'],
        [
          'p',
          'Za svaki važan test dodelite 0 ako nije demonstriran ili ne radi, 1 ako radi delimično ili uz ručni workaround, i 2 ako prolazi kako je zahtev napisano. Uz broj zapišite dokaz: snimak, screenshot, dokumentaciju ili rezultat testa. Ne sabirajte stavke različite važnosti bez težine. Obavezni zahtev ostaje pass/fail čak i kada kandidat ima najbolji ukupan rezultat.',
        ],
        [
          'ul',
          [
            'Objava: koliko koraka traži izmena na konkretnim ekranima.',
            'Offline: šta ostaje tokom prekida, a šta se preskače.',
            'Monitoring: online/offline, last seen i način eskalacije.',
            'Oporavak: šta se dešava posle greške, ažuriranja i nestanka struje.',
            'Izlaz: vlasništvo nad sadržajem, izvoz, otkaz i hardver.',
          ],
        ],
        ['h', 'Pilot koji razotkriva svakodnevni rad'],
        [
          'ol',
          [
            'Uparite novi uređaj bez pomoći prodavca i zabeležite postupak.',
            'Uploadujte realnu sliku i video, pa napravite plejlistu.',
            'Izmenite sadržaj i potvrdite novu verziju na fizičkom ekranu.',
            'Prekinite mrežu tokom cele petlje i zabeležite preskočene aplikacije.',
            'Podesite radno vreme i proverite stanje unutar i van perioda.',
            'Simulirajte odlazak korisnika i proverite dozvole i izlazne podatke.',
          ],
        ],
        ['h', 'Kako pošteno oceniti SignageWall danas'],
        [
          'p',
          'Trenutni proizvod rotira medije, plejliste i aplikacije; šalje izmene povezanom playeru; prikazuje online/offline, last-seen i profil uređaja; ima live preview pojedinačnog ekrana; i podržava radno vreme celog ekrana. Uparivanje koristi šestokarakterni kod koji se ručno unosi. Keširani mediji mogu nastaviti bez mreže, dok se network-only aplikacije preskaču.',
        ],
        [
          'p',
          'Istovremeno, SignageWall nema per-item dayparting ili automatski istek, sačuvane screen groups i location tags, proizvoljne zone, per-location uloge i approval workflow, QR pairing, rollback, proof-of-play, brightness ili fizičku TV power kontrolu. Power BI zahteva javni Publish to web URL, a Web aplikacija javnu stranicu koja dozvoljava iframe. Ako je bilo koja od tih odsutnih funkcija eliminacioni uslov, trenutni proizvod nije odgovarajući izbor za taj projekat.',
        ],
        ['h', 'Ponudu ocenjujte kao celinu'],
        [
          'p',
          'Tražite pisanu cenu za isti broj ekrana i isti period, uključujući hardver, montažu, onboarding, pretplatu, podršku, put, zamenu i uslove otkaza. Ne unosite tržišne proseke kada imate konkretnu ponudu. Zabeležite kanal i radno vreme podrške, vlasnika incidenta i šta se smatra rešenjem. Ne tražite pristup tuđem korisničkom dashboardu; tražite anonymizovan postupak ili demonstraciju u dobavljačevom test okruženju.',
        ],
        ['h', 'Odluka mora ostaviti trag'],
        [
          'p',
          'Na kraju čuvajte matricu, dokaze, verziju proizvoda, datum pilota i otvorene rizike. Pobednik nije kandidat sa najviše funkcija, već onaj koji prolazi obavezne testove uz prihvatljiv trošak i jasan operativni teret. Ako workaround zavisi od jedne osobe ili spoljnog sistema, unesite i taj trošak. Tako odluka može da se proveri kasnije, umesto da ostane sećanje na ubedljiv demo.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to evaluate a digital signage vendor with a pilot',
        intentType: 'commercial-investigation',
        audience: 'Buyers comparing digital signage vendors before contract and expansion',
        jobToBeDone:
          'Turn requirements into a scored pilot and verify claims on the buyer’s own screen.',
        uniquePromise:
          'An elimination matrix openly stating what current SignageWall can and cannot do.',
        notTargeting:
          'Vendor rankings, current prices, legal advice, a security audit, or a hardware catalog.',
      },
      takeaways: [
        'A mandatory requirement is a gate, not an extra point.',
        'Pilot with your own hardware, content and network.',
        'Request written limitations alongside pricing and support terms.',
      ],
      content: [
        [
          'p',
          'A demo shows the best case; a pilot should expose an ordinary and a bad day. Before speaking to a vendor, divide requirements into mandatory, important and desirable. When a system lacks a mandatory capability, points elsewhere do not repair the gap. Run the same tests on every candidate using your display, final asset, real account and a controlled network interruption.',
        ],
        ['h', 'Set elimination gates first'],
        [
          'p',
          'Write down what the project cannot operate without: a supported operating system, exact content format, required permission model, offline behavior or contractual exit. Request a demonstration, documentation and written confirmation that the feature is included in the quoted plan. Treat a roadmap, backlog or “coming soon” as absence. This prevents a purchase based on a presentation of a future product.',
        ],
        ['fig', 0],
        ['h', 'Use simple scoring'],
        [
          'p',
          'For every important test, award 0 when it was not demonstrated or fails, 1 when it is partial or needs a manual workaround, and 2 when it passes as written. Store evidence beside the score: a recording, screenshot, documentation or test result. Do not sum items with different importance without weighting. A mandatory requirement remains pass/fail even when one candidate has the highest total.',
        ],
        [
          'ul',
          [
            'Publishing: steps required to change content on named screens.',
            'Offline: what remains during an outage and what is skipped.',
            'Monitoring: online/offline, last seen and escalation flow.',
            'Recovery: behavior after errors, updates and a power interruption.',
            'Exit: content ownership, export, cancellation and hardware.',
          ],
        ],
        ['h', 'A pilot that reveals daily work'],
        [
          'ol',
          [
            'Pair a new device without vendor help and record the process.',
            'Upload a real image and video, then build a playlist.',
            'Edit content and confirm the new version on the physical display.',
            'Disconnect networking for a complete loop and record skipped apps.',
            'Set working hours and inspect behavior inside and outside the window.',
            'Simulate a departing user and review permissions and export options.',
          ],
        ],
        ['h', 'How to score SignageWall honestly today'],
        [
          'p',
          'The current product rotates media, playlists and apps; sends changes to a connected player; shows online/offline, last-seen and device profile; provides an individual live preview; and supports whole-screen working hours. Pairing uses a manually entered six-character code. Cached media can continue without networking, while network-only apps are skipped.',
        ],
        [
          'p',
          'SignageWall does not currently provide per-item dayparting or automatic expiry, saved screen groups and location tags, arbitrary zones, per-location roles and approvals, QR pairing, rollback, proof of play, brightness control or physical TV power control. Power BI requires a public Publish to web URL, and the Web app requires a public page that permits iframe embedding. If any missing item is an elimination gate, the current product is not the right choice for that project.',
        ],
        ['h', 'Score the whole offer'],
        [
          'p',
          'Request written pricing for the same screen count and period, including hardware, mounting, onboarding, subscription, support, travel, replacement and cancellation terms. Do not insert market averages when you have actual quotes. Record support channel and hours, incident ownership and the definition of resolution. Do not request access to another customer’s dashboard; ask for an anonymized process or a demonstration in the vendor’s test environment.',
        ],
        ['h', 'Leave an evidence trail'],
        [
          'p',
          'Keep the matrix, evidence, product version, pilot date and open risks. The winner is not the candidate with the most features, but the one that passes mandatory tests at an acceptable cost and operating burden. When a workaround depends on one person or an external system, include that cost too. The decision can then be reviewed later instead of remaining a memory of a persuasive demo.',
        ],
      ],
    },
  },
}
