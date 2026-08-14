// @ts-nocheck
/*
 * Full bilingual editorial packages for the seven middle-funnel Blog posts.
 *
 * `links` use repository slugs: Serbian Blog source slugs, English Solution
 * slugs and app-manifest slugs. The seed owns the relationship lookup.
 */

export const POSTS_FULL_EDITORIAL = {
  'greske-na-digitalnim-ekranima': {
    links: {
      posts: [
        'ekran-mora-da-radi-i-bez-interneta',
        'koliko-dugo-treba-da-traje-slajd',
        'tipografija-za-ekrane',
      ],
      solutions: ['retail'],
      apps: ['text', 'clock'],
    },
    sr: {
      intent: {
        primaryQuery: 'digital signage kontrolna lista pre objave',
        intentType: 'informational',
        audience: 'Osoba koja prvi put objavljuje sadržaj na poslovnom ekranu',
        jobToBeDone: 'Proveriti sadržaj, uređaj i lokaciju pre nego što ekran vide posetioci.',
        uniquePromise:
          'Jedna praktična provera zasnovana na stvarnim SignageWall podešavanjima i ograničenjima.',
        notTargeting:
          'Ne objašnjava detaljno tipografiju, trajanje slajda, izbor hardvera ili offline arhitekturu.',
      },
      takeaways: [
        'Proverite poruku sa mesta na kom publika zaista stoji.',
        'Testirajte prekid mreže i radno vreme pre javnog puštanja.',
        'Online status potvrđuje vezu, ali ne zamenjuje pogled na ekran.',
      ],
      content: [
        [
          'p',
          'Najskuplja greška na digitalnom ekranu obično nije tehnička. To je poruka koju niko ne može da pročita, stara akcija koja je ostala u petlji ili uređaj koji je na mreži, ali na pogrešnom ulazu televizora. Zato je korisnije imati kratku proveru pre objave nego dugačak spisak navodnih „pravila". Sledećih sedam tačaka možete proći na jednom ekranu, u stvarnom prostoru, pre nego što isti sadržaj pošaljete dalje.',
        ],
        ['h', '1. Da li jedna scena nosi jednu jasnu poruku?'],
        [
          'p',
          'Stanite na mesto posetioca i pogledajte scenu samo nekoliko sekundi. Zatim sklonite pogled i recite sebi šta je bila glavna informacija. Ako pamtite tri naslova, dve cene i četiri poziva na akciju, hijerarhija nije jasna. Uklonite ono što nije potrebno za odluku koju gledalac donosi baš na tom mestu. Detaljno objašnjenje može da sačeka sledeću scenu, PDF ili odredišnu stranicu iza QR koda.',
        ],
        ['h', '2. Da li je tekst čitljiv sa stvarne udaljenosti?'],
        [
          'p',
          'Pregled na laptopu vara jer je lice blizu ekrana. Objavite probnu verziju, stanite tamo gde ljudi prolaze ili čekaju i proverite naslov, cenu i sitniji red odvojeno. Obratite pažnju na odsjaj, svetlu fotografiju iza teksta i tanke rezove fonta. Ako morate da priđete, prvo skratite tekst, zatim povećajte slova. Precizniji postupak pripada posebnom vodiču o tipografiji; ovde je dovoljno da provera bude urađena u prostoru, a ne samo u editoru.',
        ],
        ['h', '3. Da li su format i orijentacija usklađeni?'],
        [
          'p',
          'Horizontalna fotografija na vertikalnom panelu može da izgubi važan deo kadra ili da ostavi veliki prazan prostor. SignageWall plejer podržava orijentaciju i načine uklapanja sadržaja, ali podešavanje ne može da popravi loše kadriran original. Proverite svaku sliku i video u odnosu stranica koji će stvarno biti na zidu. Nemojte pretpostaviti da ista datoteka jednako dobro radi na izlogu, meniju iznad pulta i ekranu u hodniku.',
        ],
        ['fig', 0],
        ['h', '4. Da li će datoteke proći kroz stvarni tok objave?'],
        [
          'p',
          'Za lokalni medij trenutni sistem prihvata slike i video u podržanim formatima, uz ograničenje od 10 MB po datoteci. Video može biti MP4, WebM ili QuickTime, a obrada ga po potrebi priprema za reprodukciju. Učitajte baš finalnu datoteku; naziv formata na računaru nije dovoljan test. Sačekajte da obrada bude završena i otvorite pregled pre nego što sadržaj dodate na više ekrana.',
        ],
        ['h', '5. Da li trajanje odgovara mestu?'],
        [
          'p',
          'Ne postoji jedna dobra vrednost za svaki slajd. Prolaznik ima manje vremena od osobe u čekaonici, a kratka cena se čita brže od uputstva u tri koraka. Izgovorite tekst normalnim tempom, dodajte vreme da pogled pronađe naslov i zatim proverite celu petlju. Ako scena mora da ostane dugo samo zato što ima previše reči, skraćivanje je bolja popravka od produžavanja trajanja.',
        ],
        ['h', '6. Šta se vidi kada mreža nestane?'],
        [
          'p',
          'SignageWall čuva poslednji snimak sadržaja i unapred preuzima slike i video, pa offline-bezbedne stavke mogu da nastave. Aplikacije koje zavise od žive udaljene stranice ili strima preskaču se bez mreže. Isključite mrežu tokom probe i prođite celu petlju. Test treba ponoviti i posle ponovnog pokretanja plejera. Ako je sav sadržaj mrežni, planirajte makar jednu lokalnu ili keširanu stavku umesto da očekujete da strim radi bez interneta.',
        ],
        ['h', '7. Ko je odgovoran da sadržaj ostane tačan?'],
        [
          'p',
          'Podesite radno vreme ekrana tako da bude u stanju pripravnosti kada prostor ne radi, a za kampanje zapišite vlasnika i datum sledeće provere. Trenutni raspored upravlja time kada ekran reprodukuje, ne automatskim istekom pojedinačnog slajda, zato istekla ponuda i dalje zahteva uredničku odluku. U kontrolnoj tabli proverite online status i poslednje javljanje uređaja. Ti podaci potvrđuju vezu, ali ne dokazuju da je televizor uključen na pravi HDMI ulaz ili da je poruka čitljiva.',
        ],
        ['h', 'Završna provera traje koliko jedna puna petlja'],
        [
          'p',
          'Pustite sadržaj od početka do kraja na ciljnom ekranu, bez preskakanja. Zabeležite samo ono što bi posetilac stvarno primetio: praznu scenu, nagli prelaz, nečitku cenu, mrežnu aplikaciju koja nestane ili poruku koja se ponovi prerano. Popravite te stavke, ponovite petlju i tek tada je dodelite ostalim izabranim ekranima. Kontrolna lista ne zamenjuje vodiče o dizajnu i tehnici; ona sprečava da očigledna greška stigne do zida.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'digital signage pre-launch checklist',
        intentType: 'informational',
        audience: 'A first-time operator preparing content for a business display',
        jobToBeDone:
          'Check the content, device and physical location before visitors see the screen.',
        uniquePromise:
          'One practical review grounded in real SignageWall settings and current limitations.',
        notTargeting:
          'Does not teach typography, slide timing, hardware selection or offline architecture in depth.',
      },
      takeaways: [
        'Review the message from the place where the audience actually stands.',
        'Test a network outage and working hours before the public launch.',
        'Online status confirms connectivity, not the picture on the panel.',
      ],
      content: [
        [
          'p',
          'A costly digital-screen mistake is often a message nobody can read, an expired offer left in the loop, or an online player connected to a television on the wrong input. Run the seven checks below on one display in the real space before assigning its content anywhere else.',
        ],
        ['h', '1. Does one scene carry one clear message?'],
        [
          'p',
          'Stand where a visitor stands, look for a few seconds, then look away and name the main information. If you remember three headlines, two prices and four calls to action, the hierarchy is unclear. Remove anything not needed for the decision made in that place. Detail can live on a later scene, in a PDF, or behind a QR code.',
        ],
        ['h', '2. Is the text readable at the real viewing distance?'],
        [
          'p',
          'A laptop preview is deceptive. Publish a test, stand where people pass or wait, and check the headline and price. Look for glare, bright photography behind text and thin letterforms. If you must step closer, shorten the copy and then enlarge it. Make the final decision in the room; use the typography guide for a detailed calculation.',
        ],
        ['h', '3. Do the asset and display share an orientation?'],
        [
          'p',
          'A landscape photograph on a portrait panel can lose the important part of the frame or leave a large empty area. The SignageWall player supports orientation and content-fit settings, but a setting cannot rescue a badly framed original. Check every image and video in the aspect ratio that will actually be mounted. Do not assume one file works equally well in a window, above a counter and in a corridor.',
        ],
        ['fig', 0],
        ['h', '4. Will the final files pass through the real publishing flow?'],
        [
          'p',
          'For uploaded media, the current system accepts supported image and video formats with a 10 MB limit per file. Video can be MP4, WebM or QuickTime, and processing prepares it for playback when needed. Upload the exact final file; the extension shown by your computer is not a sufficient test. Wait for processing to finish and open the preview before adding the item to several screens.',
        ],
        ['h', '5. Does the duration fit the location?'],
        [
          'p',
          'There is no single correct duration for every slide. A passer-by has less time than somebody in a waiting room, while a short price is read faster than a three-step instruction. Read the words aloud at a normal pace, add time for the eye to find the headline, and then inspect the whole loop. If a scene has to remain for a long time only because it contains too many words, shortening the message is a better fix than extending its duration.',
        ],
        ['h', '6. What remains visible when the network disappears?'],
        [
          'p',
          'SignageWall persists the last content snapshot and prefetches images and video, so offline-safe items can continue. Apps that depend on a live remote page or stream are skipped without a connection. Disconnect the network during the test and watch the whole loop. Repeat the check after restarting the player. If every item needs a network, add at least one local or cached item instead of expecting a stream to work offline.',
        ],
        ['h', '7. Who keeps the content accurate?'],
        [
          'p',
          'Set screen working hours so the player enters standby when the space is closed, and give campaigns an owner and a review date. The current schedule controls when the screen plays; it does not expire one slide automatically, so an old promotion still needs an editorial decision. In the dashboard, check online status and the last time the device reported. Those signals confirm connectivity, but they do not prove that the television is on the correct HDMI input or that the message is readable.',
        ],
        ['h', 'The final check lasts one complete loop'],
        [
          'p',
          'Play the content from beginning to end on the target display without skipping. Record only what a visitor could notice: an empty scene, a harsh transition, an unreadable price, a network app that vanishes, or a message that repeats too soon. Fix those points, run the loop again, and only then assign it to the other selected screens. The checklist does not replace specialist design and technical guides; it stops an obvious fault from reaching the wall.',
        ],
      ],
    },
  },
  'koliko-dugo-treba-da-traje-slajd': {
    links: {
      posts: ['tipografija-za-ekrane', 'video-na-ekranima', 'sta-prikazati-u-cekaonici'],
      solutions: ['retail'],
      apps: ['rss', 'gslides'],
    },
    sr: {
      intent: {
        primaryQuery: 'koliko sekundi treba da traje digital signage slajd',
        intentType: 'informational',
        audience: 'Urednik plejliste koji podešava trajanje scena na poslovnom ekranu',
        jobToBeDone: 'Izračunati trajanje svake scene prema poruci i vremenu pažnje publike.',
        uniquePromise:
          'Metod merenja koji polazi od prostora umesto od univerzalnog broja sekundi.',
        notTargeting: 'Ne bira font, video kodek, hardver ili kompletnu strategiju sadržaja.',
      },
      takeaways: [
        'Počnite od vremena koje publika provodi ispred ekrana.',
        'Pročitajte scenu naglas i dodajte vreme za orijentaciju pogleda.',
        'Proverite i pojedinačnu scenu i dužinu cele petlje.',
      ],
      content: [
        [
          'p',
          'Pitanje „koliko dugo treba da traje slajd" zvuči kao da ima jedan broj kao odgovor. Nema ga. Ista poruka može biti prekratka u čekaonici, sasvim dobra u redu za kasu i beskorisno duga u hodniku kroz koji ljudi samo prođu. Pravo trajanje nastaje iz tri podatka: koliko se gledalac zadržava, koliko mu treba da razume scenu i koliko dugo mora da čeka da bi se važna poruka ponovo pojavila.',
        ],
        ['h', 'Prvo izmerite vreme kontakta'],
        [
          'p',
          'Posmatrajte mesto, ne ekran. Zabeležite kada prosečan gledalac ulazi u zonu čitljivosti i kada iz nje izlazi. U prolazu to može biti samo nekoliko sekundi; u redu ili čekaonici mnogo duže. Nemojte prepisivati tuđe vrednosti bez provere. Širina hodnika, smer kretanja, udaljenost od ekrana i posao koji osoba tada obavlja menjaju rezultat više nego vrsta industrije.',
        ],
        [
          'p',
          'Za početnu procenu napravite raspon, na primer „većina ima između četiri i sedam sekundi", umesto lažne preciznosti od tačno pet. Taj raspon je budžet za celu scenu: vreme da se uoči naslov, pročita poruka i odluči da li treba nešto uraditi.',
        ],
        ['h', 'Zatim izmerite vreme čitanja'],
        [
          'p',
          'Pročitajte sav vidljiv tekst naglas normalnim tempom. Dodajte kratku rezervu da pogled pronađe početak i razume sliku ili cenu. To je donja granica trajanja. Ako dobijeni broj prelazi vreme kontakta, nije rešenje da slajd ostane duže; gledalac će ionako otići. Skratite rečenicu, uklonite sporedni detalj ili podelite poruku na dve samostalne scene koje imaju smisla i kada se vide odvojeno.',
        ],
        ['fig', 0],
        ['h', 'Vrsta sadržaja menja način računanja'],
        [
          'p',
          'Fotografija sa jednom cenom obično traži manje vremena od rasporeda sa više redova. Video ima sopstveni ritam i treba da prenese smisao bez tona ako će ekran biti utišan. Aplikacija kao RSS može da menja priče unutar svog prikaza, dok Google Slides ima posebno podešavanje sekundi po slajdu. U tim slučajevima postoje dva tajmera: koliko dugo aplikacija ostaje u glavnoj petlji i koliko dugo ona prikazuje jednu svoju stavku. Proverite oba, jer dobro podešen unutrašnji ritam ne pomaže ako cela aplikacija nestane prerano.',
        ],
        ['h', 'Izračunajte dužinu cele petlje'],
        [
          'p',
          'Saberite trajanja svih aktivnih stavki. To je najraniji trenutak kada se prva poruka ponavlja. Zatim uporedite broj sa vremenom boravka publike. Ako osoba obično vidi samo polovinu petlje, najvažnija informacija ne sme da postoji samo jednom na njenom kraju. Ako čeka dovoljno dugo da petlju vidi mnogo puta, previše kratka rotacija brzo počinje da izgleda kao kvar ili ponavljanje.',
        ],
        [
          'p',
          'Ne rešavajte petlju dodavanjem nasumičnog sadržaja. Bolje je imati nekoliko relevantnih scena sa pažljivo različitim zadacima: odgovor na često pitanje, jedna ponuda, jedna praktična informacija i miran vizual. Redosled treba da radi bez obzira na to na kojoj tački gledalac počne.',
        ],
        ['h', 'Podesite, pregledajte, pa proverite na zidu'],
        [
          'p',
          'U SignageWall editoru trajanje se čuva po medijskoj ili aplikacionoj stavci, dok plejlista pušta aktivne stavke redom. Napravite pregled cele petlje, ali završnu odluku donesite na ciljnom uređaju. Stanite na početak zone gledanja, uđite u nju u nasumičnom trenutku i proverite šta uspevate da razumete pre izlaska. Ponovite nekoliko puta, jer publika ne dolazi uvek kada petlja počne.',
        ],
        ['h', 'Jednostavan postupak za svaku novu scenu'],
        [
          'ol',
          [
            'Zapišite raspon vremena kontakta na lokaciji.',
            'Izmerite čitanje i dodajte rezervu za orijentaciju.',
            'Skratite sadržaj ako ne staje u raspoloživo vreme.',
            'Saberite petlju i proverite koliko je publika zaista vidi.',
            'Objavite probu na jednom ekranu i posmatrajte je iz prostora.',
          ],
        ],
        [
          'p',
          'Trajanje nije dizajnerski ukras, nego dogovor između poruke i mesta. Kada se okolnosti promene (ekran se preseli, red postane kraći ili se doda aplikacija sa sopstvenom rotacijom) ponovite merenje. Dobar broj je onaj koji gledalac može da iskoristi, ne onaj koji lepo izgleda u podešavanjima.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how long should a digital signage slide last',
        intentType: 'informational',
        audience: 'A playlist editor setting scene duration on a business display',
        jobToBeDone:
          'Calculate each scene duration from the message and the audience attention window.',
        uniquePromise:
          'A measurement method that starts with the location instead of one universal number.',
        notTargeting:
          'Does not choose fonts, video codecs, hardware or a complete content strategy.',
      },
      takeaways: [
        'Start with the time people actually spend near the display.',
        'Read the scene aloud and add time for visual orientation.',
        'Test both the individual scene and the complete loop.',
      ],
      content: [
        [
          'p',
          'The question “how long should a slide last?” sounds as if one number will answer it. It will not. The same message may be too brief in a waiting room, appropriate in a checkout queue and pointlessly long in a corridor where people keep moving. A useful duration comes from three facts: how long the viewer remains nearby, how long the scene takes to understand, and how long somebody must wait before an important message returns.',
        ],
        ['h', 'Measure the contact window first'],
        [
          'p',
          'Observe the location rather than the display. Note when an average viewer enters readable range and when they leave it. That may be only a few seconds in a passage and much longer in a queue or waiting area. Do not copy a value from another installation without testing it. Corridor width, direction of travel, viewing distance and what the person is doing at that moment change the answer more than the industry label does.',
        ],
        [
          'p',
          'For the first estimate, write a range such as “most people have between four and seven seconds” instead of pretending the answer is exactly five. That range is the budget for the whole scene: noticing the headline, reading the message and deciding whether to act.',
        ],
        ['h', 'Then measure the reading time'],
        [
          'p',
          'Read every visible word aloud at a normal pace. Add a short allowance for the eye to find the beginning and understand the photograph or price. The result is the lower limit. If it exceeds the contact window, leaving the slide up longer is not a solution because the viewer will already have gone. Shorten the sentence, remove a secondary detail, or split it into two self-contained scenes that still make sense when seen separately.',
        ],
        ['fig', 0],
        ['h', 'Content type changes the calculation'],
        [
          'p',
          'A photograph with one price usually takes less time than a timetable with several rows. Video has its own pace and should still communicate without audio when the screen is muted. An app such as RSS may rotate stories inside its view, while Google Slides has a separate seconds-per-slide setting. Those cases introduce two timers: how long the app remains in the main loop and how long it shows one internal item. Check both, because a well-paced internal rotation is useless if the whole app leaves the stage too soon.',
        ],
        ['h', 'Calculate the complete loop'],
        [
          'p',
          'Add the duration of every active item. That total is the earliest point at which the first message returns. Compare it with the audience dwell time. If a person normally sees only half the loop, essential information cannot appear once at the very end. If they remain long enough to see the loop many times, an excessively short rotation soon feels repetitive or even looks like a fault.',
        ],
        [
          'p',
          'Do not repair a short loop by adding random filler. A few relevant scenes with different jobs are stronger: one answer to a common question, one offer, one practical notice and one calm visual. Their order should make sense regardless of the point at which a viewer arrives.',
        ],
        ['h', 'Set it, preview it, then test it on the wall'],
        [
          'p',
          'In the SignageWall editor, duration belongs to each media or app item, while a playlist plays its active items in order. Preview the complete loop, but make the final decision on the target device. Stand at the start of the viewing zone, enter it at a random moment and note what you understand before leaving. Repeat the test several times because the audience does not always arrive when the loop begins.',
        ],
        ['h', 'A repeatable method for every new scene'],
        [
          'ol',
          [
            'Record the contact-time range for the location.',
            'Measure reading and add an allowance for orientation.',
            'Shorten the message if it does not fit the available time.',
            'Total the loop and check how much the audience really sees.',
            'Publish to one display and observe it in the physical space.',
          ],
        ],
        [
          'p',
          'Duration is not a decorative design setting. It is an agreement between a message and a place. When the circumstances change (the display moves, the queue becomes shorter, or an app with its own rotation is added) measure again. The right number is the one a viewer can use, not the one that looks tidy in a settings field.',
        ],
      ],
    },
  },
  'kako-meriti-da-li-ekran-radi-posao': {
    links: {
      posts: [
        'digitalni-meni-povecava-prodaju',
        'ekrani-u-maloprodaji-od-izloga-do-kase',
        'koliko-kosta-digital-signage',
      ],
      solutions: ['retail'],
      apps: ['qr', 'menu'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako meriti rezultate digital signage ekrana',
        intentType: 'informational',
        audience: 'Vlasnik ili marketing menadžer koji mora da opravda ulaganje u ekran',
        jobToBeDone: 'Postaviti pošten test i povezati promenu sadržaja sa poslovnim ishodom.',
        uniquePromise:
          'Metod bez izmišljenih impresija i bez obećanja ugrađene marketinške analitike.',
        notTargeting: 'Ne računa ukupnu cenu sistema i ne daje opšte prodajne procente.',
      },
      takeaways: [
        'Izaberite jedan ishod i zabeležite početno stanje pre izmene.',
        'POS, ručno brojanje i spoljni QR analitički alat daju merljive signale.',
        'Online i poslednje javljanje mere isporuku, ne pažnju publike.',
      ],
      content: [
        [
          'p',
          'Ekran nema klik koji automatski govori da je poruka uspela. To ne znači da rezultat ne može da se meri; znači da merenje mora da počne u poslovnom procesu koji ekran pokušava da promeni. Prodaja artikla živi u kasi, broj ponovljenih pitanja kod osoblja, a skeniranje linka u analitici odredišne stranice. SignageWall prikazuje sadržaj i stanje veze uređaja, ali ne tvrdi da prepoznaje pogled prolaznika ili da sam pripisuje kupovinu jednom slajdu.',
        ],
        ['h', 'Odaberite jedan ishod pre objave'],
        [
          'p',
          'Napišite jednu rečenicu: „Ako ova poruka radi, očekujemo da se promeni ___." Prazno mesto može biti broj prodatih dodataka, broj pitanja o radnom vremenu, skeniranja posebnog linka ili trošak materijala koji se više ne štampa. Jedan test sa pet ciljeva ne daje pet odgovora; daje dovoljno prostora da se posle izabere broj koji izgleda najbolje.',
        ],
        [
          'p',
          'Zabeležite početno stanje istim načinom kojim ćete meriti kraj. Ako zaposleni ručno beleže pitanja, neka ista smena i ista definicija pitanja važe pre i posle. Ako koristite POS izveštaj, zabeležite broj transakcija, ne samo broj prodatih komada, jer promet lokacije može da se promeni.',
        ],
        ['h', 'Napravite poređenje koje smanjuje druge uticaje'],
        [
          'p',
          'Najjednostavniji dizajn je ista lokacija, slični dani i samo jedna veća izmena sadržaja. Izbegavajte praznike, veliku promenu cene i vremenski period koji se ne može porediti. Vodite kratak dnevnik smetnji: nestanak zalihe, radovi u ulici, posebno vreme ili promocija u drugom kanalu. Rezultat nije laboratorijski dokaz, ali postaje dovoljno pošten za poslovnu odluku.',
        ],
        ['fig', 0],
        ['h', 'Četiri izvora podataka koji su zaista dostupni'],
        ['h3', '1. POS ili drugi prodajni izveštaj'],
        [
          'p',
          'Za istaknuti artikal posmatrajte udeo u uporedivim računima, ne samo ukupan broj. SignageWall nema POS integraciju koja ovu vezu računa umesto vas. Podatak izvezite iz sistema koji već koristite i jasno zapišite period u kom je scena bila aktivna.',
        ],
        ['h3', '2. Ručno brojanje ponovljenih pitanja'],
        [
          'p',
          'Na recepciji ili pultu jednostavna crtica po pitanju može biti korisnija od složenog izveštaja. Unapred definišite šta se broji i ograničite probu na jednu temu. Smanjenje može da ukaže da je informacija uočena, ali proverite i da li se radno vreme, red ili osoblje promenilo.',
        ],
        ['h3', '3. Poseban link ili QR kod sa spoljnom analitikom'],
        [
          'p',
          'QR aplikacija u SignageWall-u generiše kod, ali ne broji skeniranja. Ako želite merenje, kod mora da vodi na URL koji kontrolišete: odredišnu stranicu sa UTM oznakama ili pouzdan skraćeni link sa analitikom. Ne koristite isti URL na svim mestima ako želite da razlikujete lokacije. Skeniranje pokazuje radnju na telefonu; ne govori koliko je ljudi pročitalo ekran i nije isto što i prodaja.',
        ],
        ['h3', '4. Trošak koji se može dokumentovati'],
        [
          'p',
          'Broj izbegnutih štampi, sati potrebnih za promenu cenovnika ili izlazaka tehničara može se zabeležiti računom i vremenom. Nemojte unapred proglasiti svu staru štampu uštedom. Uporedite stvarne troškove iz prethodnog perioda sa onim što je zaista nestalo nakon uvođenja ekrana.',
        ],
        ['h', 'Proverite isporuku pre tumačenja ishoda'],
        [
          'p',
          'Kontrolna tabla pokazuje da li je uređaj online i kada se poslednji put javio. To je signal zdravlja isporuke: ako je uređaj bio offline, test možda nije tekao po planu. Nije dokaz da je televizor bio uključen na pravi ulaz, da je panel bio vidljiv ili da je određena scena zaista privukla pažnju. Za malu probu fotografija sa lokacije i kratka fizička provera ostaju najpoštenija potvrda.',
        ],
        ['h', 'Zaključite samo ono što podaci podržavaju'],
        [
          'p',
          'Uporedite promenu sa početnim stanjem, pogledajte dnevnik smetnji i zapišite šta biste sledeće testirali. Nemojte koristiti unapred zadat „normalan" procenat rasta; različita cena, publika i lokacija čine takav reper nepouzdanim. Ako se signal ponovi kada promenite poruku ili artikal, imate bolji razlog za odluku. Ako se ne ponovi, ekran možda nije uzrok, i to je koristan rezultat.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to measure digital signage results without built-in analytics',
        intentType: 'informational',
        audience: 'An owner or marketing manager who must justify a screen investment',
        jobToBeDone: 'Run a fair test and connect one content change with a business outcome.',
        uniquePromise:
          'A method without invented impressions or promises of built-in marketing attribution.',
        notTargeting: 'Does not calculate total system cost or promise generic sales percentages.',
      },
      takeaways: [
        'Choose one outcome and record a baseline before changing the screen.',
        'POS, manual counts and external QR analytics provide measurable signals.',
        'Online and last-seen data measure delivery health, not audience attention.',
      ],
      content: [
        [
          'p',
          'A screen has no click that automatically proves its message worked. That does not make the result unmeasurable. It means measurement must begin in the business process the display is meant to change. Item sales live in the till, repeated questions with the staff, and link scans in the landing-page analytics. SignageWall presents content and device connectivity; it does not claim to detect a passer-by’s gaze or attribute a purchase to one slide.',
        ],
        ['h', 'Choose one outcome before publishing'],
        [
          'p',
          'Write one sentence: “If this message works, we expect ___ to change.” The blank might be sales of an add-on, questions about opening hours, visits to a distinct link, or the documented cost of material that is no longer printed. A test with five goals does not produce five answers. It creates enough freedom to select whichever number looks best afterwards.',
        ],
        [
          'p',
          'Record the baseline in the same way you will measure the result. If staff make a manual tally, use the same shift and the same definition of a question before and after. If the source is a POS report, record transaction count as well as units sold because the location’s overall traffic may change.',
        ],
        ['h', 'Build a comparison that reduces other influences'],
        [
          'p',
          'The simplest design uses the same location, comparable days and one substantial content change. Avoid holidays, a major price change and periods that cannot reasonably be compared. Keep a short log of disturbances: an item going out of stock, street works, unusual weather or a promotion in another channel. The result is not a laboratory proof, but it becomes honest enough to support a business decision.',
        ],
        ['fig', 0],
        ['h', 'Four data sources you can actually use'],
        ['h3', '1. A POS or another sales report'],
        [
          'p',
          'For a featured item, examine its share of comparable orders rather than only total units. SignageWall does not include a POS integration that calculates this relationship for you. Export the data from the system you already use and record the exact period during which the scene was active.',
        ],
        ['h3', '2. A manual tally of repeated questions'],
        [
          'p',
          'At a reception desk or counter, one mark per question can be more useful than an elaborate report. Define the question in advance and keep the trial to one topic. A reduction may indicate that the information was noticed, but check whether hours, queue conditions or staffing also changed.',
        ],
        ['h3', '3. A distinct link or QR code with external analytics'],
        [
          'p',
          'The SignageWall QR app generates a code; it does not count scans. To measure them, the code must lead to a URL you control, such as a landing page with UTM parameters or a reputable short link with analytics. Do not use one identical address everywhere if you need location-level results. A scan records an action on a phone. It does not reveal how many people read the display, and it is not the same as a sale.',
        ],
        ['h3', '4. A cost you can document'],
        [
          'p',
          'Avoided print runs, staff time spent replacing a price list, or technician visits can be supported by invoices and time records. Do not declare every historical print expense a saving in advance. Compare the real cost from an earlier period with the work that genuinely disappeared after the screen was introduced.',
        ],
        ['h', 'Check delivery before interpreting the outcome'],
        [
          'p',
          'The dashboard shows whether a device is online and when it last reported. That is a delivery-health signal: if the player was offline, the test may not have run as planned. It is not proof that the television was on the correct input, that the panel was visible, or that a particular scene earned attention. For a small pilot, a location photograph and a brief physical check remain the most honest confirmation.',
        ],
        ['h', 'Conclude only what the data supports'],
        [
          'p',
          'Compare the result with the baseline, review the disturbance log and write down what you would test next. Do not start with a supposedly normal percentage increase; different prices, audiences and locations make that benchmark unreliable. If the signal repeats when you change the message or item, you have a stronger basis for action. If it does not repeat, the screen may not have caused it, and that is useful information too.',
        ],
      ],
    },
  },
  'ekrani-u-maloprodaji-od-izloga-do-kase': {
    links: {
      posts: [
        'ekran-u-izlogu-citljivost',
        'digitalni-meni-povecava-prodaju',
        'kako-meriti-da-li-ekran-radi-posao',
      ],
      solutions: ['retail'],
      apps: ['menu', 'qr', 'weather'],
    },
    sr: {
      intent: {
        primaryQuery: 'gde postaviti digitalne ekrane u prodavnici',
        intentType: 'informational',
        audience: 'Retail operativac koji planira pozicije ekrana u jednoj ili više prodavnica',
        jobToBeDone:
          'Dodeliti svakom mestu u prodavnici jasan komunikacioni posao pre montaže ekrana.',
        uniquePromise:
          'Mapa pozicija koja povezuje trenutak kupovine, poruku i praktičnu proveru prostora.',
        notTargeting: 'Ne predstavlja opštu retail ponudu proizvoda niti obećava rast prodaje.',
      },
      takeaways: [
        'Izlog, ulaz, prolaz i kasa traže različite odluke od kupca.',
        'Montažu proverite u stvarnom svetlu, uglu i smeru kretanja.',
        'Počnite jednom pozicijom i merite njen konkretan zadatak.',
      ],
      content: [
        [
          'p',
          'Najbolje mesto za digitalni ekran nije ono gde ima slobodan zid, već ono gde kupac ima jasno pitanje ili donosi odluku. Prolaznik ispred izloga još bira da li će ući. Osoba na ulazu traži smer. Kupac pored police poredi, a onaj kod kase već završava kupovinu. Zbog toga jedna ista petlja na svim pozicijama obično razvodni poruku. Ovaj vodič služi za izbor mesta i uloge ekrana; detaljna poslovna primena za maloprodaju pripada posebnoj Solutions stranici.',
        ],
        ['h', 'Izlog: razlog da se zastane'],
        [
          'p',
          'Izlog se takmiči sa dnevnim svetlom, odsjajem stakla, drugim natpisima i kretanjem prolaznika. Dodelite mu jednu kratku poruku koja može da se razume bez ulaska: šta je novo, koja kategorija je unutra ili kada radnja radi. Čitljivost proverite u podne i uveče, iz oba smera prilaska. SignageWall podešava sadržaj i orijentaciju, ali ne upravlja svetlinom televizora i ne može softverom da nadoknadi panel koji nije dovoljno čitljiv iza stakla.',
        ],
        ['h', 'Ulaz: potvrda i orijentacija'],
        [
          'p',
          'Na ulazu kupac je već prešao prvi prag. Ekran tada ne mora ponovo da ga ubeđuje da uđe; korisnije je da pokaže sprat, odeljenje, radno vreme usluge ili jednu aktuelnu novost. Postavite ga posle prirodne tačke usporavanja, ne tamo gde vrata ili red zaklanjaju pogled. Ako informacija zahteva mapu sa mnogo detalja, neka ekran pokaže samo sledeći korak i po potrebi QR kod ka stranici prilagođenoj telefonu.',
        ],
        ['fig', 0],
        ['h', 'Prolaz ili polica: odgovor u trenutku poređenja'],
        [
          'p',
          'Ekran uz kategoriju ima užu publiku, pa poruka može biti konkretnija: razlika između dve opcije, način upotrebe ili nekoliko stavki iz ponude. I dalje mora da se čita bez zaustavljanja prolaza. Ne prikazujte interne šifre, nabavne podatke ili tabelu koju niko nije uredio za javnost. Za cene koje se često menjaju odredite ko potvrđuje podatke pre objave; ekran ne proverava sam da li se prikazana cena slaže sa kasom.',
        ],
        ['h', 'Kasa: korisna poruka tokom kratkog čekanja'],
        [
          'p',
          'Kod kase publika ima više vremena, ali ne i više strpljenja. Praktične informacije o računu, preuzimanju, povratu ili programu lojalnosti često su primerenije od niza agresivnih ponuda. Dodatni artikal može imati smisla samo ako je poruka kratka i ponuda stvarno dostupna. Zvuk ne treba da bude uslov za razumevanje, jer više kasa i ponavljanje petlje brzo stvaraju buku.',
        ],
        ['h', 'Kako rasporediti sadržaj bez izmišljenih grupa ekrana'],
        [
          'p',
          'Napravite po jednu ponovo upotrebljivu plejlistu za ulogu koju ste zaista testirali, na primer „izlog" i „kasa", pa je dodelite izabranim ekranima. Trenutni proizvod nema trajne grupe ekrana po zoni ili lokaciji; masovna dodela i dalje polazi od konkretno izabranih screen ID-jeva. Uloge admin i member važe na nivou organizacije, pa nemojte planirati da sistem sam ograniči urednika samo na jednu prodavnicu. Vlasništvo nad lokalnim izmenama zato definišite operativnim pravilom.',
        ],
        ['h', 'Pilot pre mreže prodavnica'],
        [
          'ol',
          [
            'Izaberite jednu poziciju i zapišite odluku koju treba da podrži.',
            'Fotografišite pogled iz pravca kupca u različito doba dana.',
            'Napravite kratku plejlistu i dodelite je jednom ciljnom ekranu.',
            'Proverite ceo krug na zidu, uključujući prekid interneta.',
            'Merite jedan ishod kroz POS, ručno brojanje ili spoljnu analitiku.',
          ],
        ],
        [
          'p',
          'Tek kada pilot pokaže da su mesto, hardver i poruka razumljivi, prenesite isti obrazac na slične pozicije. Nemojte automatski kopirati sadržaj u prodavnicu sa drugačijim izlogom ili tokom kretanja. Online status i poslednje javljanje pomažu da vidite da li je plejer povezan, ali fizička provera potvrđuje da panel radi, da nije zaklonjen i da je poruka čitljiva. Dobra mreža nastaje ponavljanjem dokazanih uloga, ne popunjavanjem svakog praznog zida.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'where to place digital signage in a retail store',
        intentType: 'informational',
        audience: 'A retail operator planning screen positions in one or several stores',
        jobToBeDone:
          'Give each store position a clear communication job before mounting a display.',
        uniquePromise:
          'A placement map connecting the shopping moment, message and physical site check.',
        notTargeting: 'Does not present the broad retail product offer or promise sales growth.',
      },
      takeaways: [
        'A window, entrance, aisle and till support different customer decisions.',
        'Test the mount in real light, at real angles and approach paths.',
        'Begin with one position and measure its specific communication job.',
      ],
      content: [
        [
          'p',
          'The best position for a digital screen is not the wall that happens to be empty. It is the point where a customer has a clear question or decision. A passer-by at the window is still deciding whether to enter. Somebody at the entrance needs direction, a shopper by a shelf is comparing, and a customer at the till has already chosen. The same loop across every position therefore weakens the message. This guide is about screen placement and purpose; the broader retail use case belongs on the dedicated Solutions page.',
        ],
        ['h', 'Window: give somebody a reason to pause'],
        [
          'p',
          'A window competes with daylight, reflections, other signs and a moving audience. Give it one short message that makes sense without entering: what is new, which category is available, or when the store opens. Check readability at midday and after dark from both directions of approach. SignageWall controls content and orientation, but it does not control television brightness and cannot compensate in software for a panel that is not readable behind glass.',
        ],
        ['h', 'Entrance: confirm and orient'],
        [
          'p',
          'At the entrance, the customer has already crossed the first threshold. The screen does not have to persuade them to enter again. It is more useful for a floor, department, service hours or one current update. Mount it after a natural slowing point, not where a door or queue blocks the view. If the answer needs a detailed map, show only the next step on the screen and, when useful, add a QR code leading to a mobile-friendly page.',
        ],
        ['fig', 0],
        ['h', 'Aisle or shelf: answer at the comparison point'],
        [
          'p',
          'A category display serves a narrower audience, so its message can be more specific: the difference between two options, an instruction, or a small selection from the range. It still needs to be legible without blocking the aisle. Do not expose internal codes, cost data or a working spreadsheet that was never prepared for public view. For prices that change often, name the person who confirms them before publishing; the screen does not verify that a displayed price agrees with the till.',
        ],
        ['h', 'Till: useful information during a short wait'],
        [
          'p',
          'People at the till have more time but not necessarily more patience. Practical information about receipts, collection, returns or a loyalty programme can be more appropriate than a chain of aggressive offers. An add-on item only makes sense when the message is brief and the item is actually available. Audio should not be required for understanding because several tills and a repeating loop quickly create noise.',
        ],
        ['h', 'Organise content without imaginary screen groups'],
        [
          'p',
          'Create one reusable playlist for each role you have genuinely tested, such as “window” and “till”, then assign it to the selected displays. The current product does not have persistent screen groups by zone or store; bulk assignment still starts from explicitly selected screen IDs. Admin and member roles apply across the organisation, so do not design a workflow that assumes the system restricts an editor to one branch. Define ownership of local changes as an operating rule instead.',
        ],
        ['h', 'Pilot before rolling out to a store network'],
        [
          'ol',
          [
            'Choose one position and write down the decision it should support.',
            'Photograph the customer view at different times of day.',
            'Build a short playlist and assign it to one target display.',
            'Watch the full loop on the wall, including a network interruption.',
            'Measure one outcome through POS, manual counting or external analytics.',
          ],
        ],
        [
          'p',
          'Only after the pilot shows that the position, hardware and message work together should you repeat the pattern elsewhere. Do not automatically copy content into a store with a different window or customer route. Online status and last seen help confirm that the player is connected, but a physical check confirms that the panel is on, unobstructed and readable. A useful network grows by repeating proven screen roles, not by filling every empty wall.',
        ],
      ],
    },
  },
  'sta-prikazati-u-cekaonici': {
    links: {
      posts: [
        'koliko-dugo-treba-da-traje-slajd',
        'tipografija-za-ekrane',
        'ekran-mora-da-radi-i-bez-interneta',
      ],
      solutions: ['education'],
      apps: ['text', 'pdf', 'weather', 'gcal', 'qr'],
    },
    sr: {
      intent: {
        primaryQuery: 'šta prikazati na ekranu u čekaonici',
        intentType: 'informational',
        audience: 'Menadžer ordinacije ili uslužnog prostora koji uređuje čekaonicu',
        jobToBeDone: 'Napraviti mirnu i korisnu petlju bez izlaganja ličnih podataka posetilaca.',
        uniquePromise:
          'Plan sadržaja koji razdvaja stvarne mogućnosti ekrana od sistema za redove.',
        notTargeting:
          'Ne nudi medicinske savete, queue management, EHR povezivanje ili procenu čekanja.',
      },
      takeaways: [
        'Prvo odgovorite na praktična pitanja koja važe za sve posetioce.',
        'Ne prikazujte ime, termin, dijagnozu ili druge lične podatke.',
        'SignageWall nije sistem za redove niti izvor procenjenog čekanja.',
      ],
      content: [
        [
          'p',
          'Ekran u čekaonici treba da smanji broj nejasnoća, a da ne postane još jedan izvor buke. Najkorisnije teme su one koje važe za svaku osobu u prostoru: gde je prijava, koja dokumenta pripremiti, kako prostor radi i gde se nalazi dodatno objašnjenje. To je drugačiji zadatak od pozivanja pacijenata ili računanja reda. SignageWall trenutno nema integraciju sa queue sistemom ili EHR-om i ne generiše broj na redu ni procenjeno vreme čekanja.',
        ],
        ['h', 'Počnite informacijama koje osoblje stalno ponavlja'],
        [
          'p',
          'Napravite spisak pitanja koja recepcija dobija svakog dana. Ulaz, sprat, toalet, način prijave, plaćanje i radno vreme obično su bolji prvi sadržaj od opšte reklame. Jedna scena treba da odgovori na jedno pitanje i da bude razumljiva bez tona. Za duži postupak prikažite samo tri kratka koraka ili QR kod ka stranici koju organizacija kontroliše.',
        ],
        ['h', 'Dokumenti i uputstva moraju imati vlasnika'],
        [
          'p',
          'Odobrena uputstva možete prikazati kao kratku Text scenu ili PDF, ali ekran nije mesto za neprovereni medicinski savet. Zabeležite ko potvrđuje sadržaj i kada ga ponovo pregleda. Ako se pravilo promeni, uklanjanje stare stavke je urednički posao: radno vreme plejera ne zakazuje automatski istek pojedinačne poruke. Za obaveštenja koja su vremenski osetljiva napišite datum važenja u samom sadržaju.',
        ],
        ['fig', 0],
        ['h', 'Kalendar, vreme i miran sadržaj kao dopuna'],
        [
          'p',
          'Google Calendar može da prikaže povezani kalendar, ali u čekaonici koristite samo javno bezbedne operativne događaje, nikada termine sa imenima ljudi. Weather aplikacija i odobrene fotografije mogu dati mirniji predah između praktičnih poruka. RSS koristite samo sa izvorom koji redovno proveravate; udaljeni feed može da promeni naslov bez uredničke intervencije. Sadržaj treba da ima smisla i kada je ekran utišan.',
        ],
        ['h', 'Privatnost je uslov, ne dizajnerska opcija'],
        [
          'ul',
          [
            'Ne prikazujte ime, datum rođenja, dijagnozu ili razlog dolaska.',
            'Ne povezujte lični raspored zaposlenih ili pacijenata na javni ekran.',
            'Ne stavljajte osetljiv podatak iza QR koda bez odgovarajuće prijave.',
            'Proverite kadar i odsjaj da poruka nije vidljiva izvan namenjenog prostora.',
          ],
        ],
        [
          'p',
          'Čak i kada drugi sistem dodeljuje anonimne brojeve, taj signal se ne pojavljuje u SignageWall-u bez podržane integracije. Nemojte ručno imitirati živi red tekstualnim slajdom: zastarela informacija može biti gora od toga da je nema. Za pozivanje i procenu čekanja zadržite namenski sistem, a signage petlju koristite za opšte informacije.',
        ],
        ['h', 'Petlja treba da odgovara stvarnom boravku'],
        [
          'p',
          'Izmerite koliko ljudi približno ostaju i koliko često moraju da vide najvažniju poruku. Kratka uputstva mogu da se ponove češće, dok PDF sa više detalja traži dovoljno vremena ili mobilnu alternativu. Izbegnite brze prelaze, treperenje i video koji zavisi od dijaloga. Pustite celu petlju sa mesta na kom ljudi sede, a ne samo sa recepcijskog računara.',
        ],
        ['h', 'Planirajte i prekid mreže'],
        [
          'p',
          'Plejer čuva poslednji snimak sadržaja i unapred preuzima podržane slike i video, pa offline-bezbedne stavke mogu da nastave. Mrežne aplikacije ne dobijaju nove podatke dok veza ne postoji, a neke se bez mreže preskaču. Zato u petlji zadržite makar osnovnu lokalnu poruku sa smernicama i kontaktom recepcije. Online i last-seen status potvrđuju vezu uređaja, ne tačnost informacije niti ono što se fizički vidi na panelu.',
        ],
        ['h', 'Jednostavan urednički raspored'],
        [
          'p',
          'Dodelite vlasnika za praktične informacije, vlasnika za odobreni stručni sadržaj i datum mesečne provere cele petlje. Posle izmene pogledajte jedan puni krug na ciljnom ekranu. Dobra čekaonica ne pokušava da izgleda kao televizijski kanal: nekoliko jasnih odgovora, smiren ritam i stroga granica privatnosti vredniji su od velike količine sadržaja.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'waiting room screen content ideas',
        intentType: 'informational',
        audience: 'A clinic or service-space manager responsible for a waiting area',
        jobToBeDone:
          'Build a calm, useful content loop without exposing visitor personal information.',
        uniquePromise:
          'A content plan that separates real display features from queue-management systems.',
        notTargeting:
          'Does not provide medical advice, queue management, EHR connections or wait estimates.',
      },
      takeaways: [
        'Answer practical questions that apply to everybody in the room first.',
        'Never show a name, appointment, diagnosis or other personal data.',
        'SignageWall is not a queue system or a source of wait estimates.',
      ],
      content: [
        [
          'p',
          'A waiting-room display should remove uncertainty without becoming another source of noise. The most useful topics apply to everybody in the room: where to check in, which documents to prepare, how the space works and where to find a longer explanation. That is a different task from calling patients or calculating a queue. SignageWall currently has no queue-system or EHR integration, and it does not generate a now-serving number or estimated waiting time.',
        ],
        ['h', 'Begin with information staff repeat every day'],
        [
          'p',
          'List the questions reception answers most often. Entrance, floor, toilets, check-in, payment and opening hours are usually stronger first content than a general promotion. One scene should answer one question and make sense without sound. For a longer procedure, show only three short steps or use a QR code leading to a page the organisation controls.',
        ],
        ['h', 'Documents and instructions need an owner'],
        [
          'p',
          'Approved instructions can be presented as a short Text scene or PDF, but the display is not a place for unreviewed medical advice. Record who approves the information and when they will review it again. When a rule changes, removing the old item is an editorial task: player working hours do not schedule the expiry of an individual message. Put a visible validity date inside time-sensitive content.',
        ],
        ['fig', 0],
        ['h', 'Calendar, weather and calm supporting material'],
        [
          'p',
          'Google Calendar can show a connected calendar, but a waiting area should use only publicly safe operational events, never appointments carrying people’s names. The Weather app and approved photographs can provide a calmer interval between practical notices. Use RSS only with a source you review regularly because a remote feed can change its headline without editorial action. Every scene should still communicate when the display is muted.',
        ],
        ['h', 'Privacy is a condition, not a design preference'],
        [
          'ul',
          [
            'Do not display a name, date of birth, diagnosis or reason for visiting.',
            'Do not connect a personal staff or patient calendar to a public display.',
            'Do not put sensitive data behind a QR code without suitable authentication.',
            'Check sight lines so information is not exposed beyond the intended space.',
          ],
        ],
        [
          'p',
          'Even if another system assigns anonymous numbers, that signal will not appear in SignageWall without a supported integration. Do not imitate a live queue manually with a text slide: stale information may be worse than no information. Keep calling and wait estimates in the dedicated system, and use the signage loop for general guidance.',
        ],
        ['h', 'Fit the loop to the actual stay'],
        [
          'p',
          'Estimate how long people remain and how often they need to encounter the most important message. Short instructions can return more frequently, while a detailed PDF needs enough reading time or a mobile alternative. Avoid rapid transitions, flashing and video that depends on dialogue. Watch the whole loop from the seats people use, not only from the reception computer.',
        ],
        ['h', 'Plan for a network interruption'],
        [
          'p',
          'The player persists the latest content snapshot and prefetches supported images and video, so offline-safe items can continue. Network apps receive no fresh data without a connection, and some are skipped while offline. Keep at least one local essential notice with basic directions and a reception contact in the loop. Online and last-seen status confirm device connectivity, not the accuracy of a message or the picture physically visible on the panel.',
        ],
        ['h', 'A simple editorial routine'],
        [
          'p',
          'Assign an owner to practical information, another to approved specialist content, and a date for a monthly review of the complete loop. After every meaningful edit, watch one full cycle on the target display. A good waiting-room screen does not try to resemble a television channel: a few clear answers, a calm pace and a strict privacy boundary are more valuable than a large volume of content.',
        ],
      ],
    },
  },
  'google-sheets-na-ekranu': {
    links: {
      posts: [
        'digitalni-meni-povecava-prodaju',
        'ekran-mora-da-radi-i-bez-interneta',
        'interna-komunikacija-ekran-umesto-mejla',
      ],
      solutions: ['office', 'retail'],
      apps: ['gsheets', 'menu'],
    },
    sr: {
      intent: {
        primaryQuery: 'kako prikazati Google Sheets na TV ekranu',
        intentType: 'transactional',
        audience: 'SignageWall korisnik koji već održava podatke u Google tabeli',
        jobToBeDone: 'Povezati tačan opseg ćelija i objaviti čitljiv prikaz na ekranu.',
        uniquePromise:
          'Tačan tok podešavanja prema postojećem OAuth povezivanju i Sheets aplikaciji.',
        notTargeting:
          'Ne objašnjava javne linkove, Excel uvoz, proizvoljno mapiranje kolona ili izradu menija.',
      },
      takeaways: [
        'Povežite Google nalog, izaberite tabelu i unesite A1 opseg.',
        'Izaberite tabelu ili jednu KPI vrednost, ne proizvoljan šablon.',
        'Podaci se osvežavaju na pet minuta dok mreža radi.',
      ],
      content: [
        [
          'p',
          'Google Sheets aplikacija prikazuje jedan izabrani opseg kao tabelu ili jednu veliku KPI vrednost. Namenjena je podacima koji već žive u Google tabeli: rasporedu, kratkom cenovniku, rezultatu smene ili drugoj javno bezbednoj vrednosti. Ne zahteva da objavite dokument kao javni link. Umesto toga, SignageWall koristi povezani Google nalog sa read-only pristupom za Drive metapodatke i Sheets sadržaj. Administrator instalacije prethodno mora da podesi Google OAuth podatke na backendu.',
        ],
        ['h', '1. Pripremite poseban opseg za ekran'],
        [
          'p',
          'U tabeli napravite kompaktan pravougaoni opseg bez privatnih beleški i nepotrebnih kolona. Prvi red može biti zaglavlje. Ne računajte na skrolovanje: na zidu se najbolje vidi onoliko redova koliko može da stane u jedan kadar sa čitljivim tekstom. Ako su formule već u tabeli, aplikacija prikazuje njihove dobijene vrednosti; uređivanje i poslovna pravila ostaju u Google Sheets-u.',
        ],
        ['h', '2. Povežite Google nalog i izaberite datoteku'],
        [
          'p',
          'Dodajte Google Sheets aplikaciju i u polju Google account pokrenite OAuth prijavu. SignageWall traži pristup za čitanje, ne menja ćelije. Zatim u pretraživom Spreadsheet polju pronađite datoteku iz Google Drive-a. Picker prikazuje tabele dostupne povezanom nalogu, zato koristite nalog koji zaista ima pravo da otvori željeni dokument.',
        ],
        ['h', '3. Unesite opseg u A1 notaciji'],
        [
          'p',
          'Polje Range je obavezno i očekuje A1 zapis. `A1:D20` bira ćelije od prve do četvrte kolone i do dvadesetog reda na podrazumevanom listu. Pouzdaniji zapis uključuje ime taba, na primer `Sheet1!A1:D20`. Ako ime lista sadrži razmake, proverite zapis u samom Sheets-u. Aplikacija trenutno ne nudi picker pojedinačnih kolona niti mapiranje polja; prikazuje upravo pravougaonik koji ste naveli.',
        ],
        ['fig', 0],
        ['h', '4. Izaberite tabelu ili jednu KPI vrednost'],
        [
          'p',
          'Layout ima dve mogućnosti. Table prikazuje ceo opseg u redovima i kolonama. Single value (KPI) namenjen je jednoj glavnoj vrednosti i njenoj oznaci. Prekidač First row is a header stilizuje prvi red kao nazive kolona u tabeli, odnosno koristi ga kao KPI oznaku. Na kraju izaberite svetlu ili tamnu temu. To su postojeće opcije; nema proizvoljnog dizajnera šablona u ovoj aplikaciji.',
        ],
        ['h', '5. Dodajte aplikaciju u plejlistu i objavite'],
        [
          'p',
          'Sačuvajte instancu, dodajte je kao stavku u željenu plejlistu, podesite njeno trajanje u petlji i dodelite plejlistu ciljnom ekranu. Pregledajte rezultat na stvarnoj udaljenosti. Ako tabela deluje sitno, smanjite opseg ili napravite zaseban tab za ekran umesto da smanjujete font do granice čitljivosti.',
        ],
        ['h', 'Kada se izmene pojavljuju na ekranu'],
        [
          'p',
          'Sheets konektor ima fiksni interval osvežavanja od 300 sekundi, odnosno pet minuta. To nije trenutno ažuriranje i korisnik trenutno ne podešava taj interval. Dok je plejer bez mreže, poslednji isporučeni i keširani prikaz može ostati dostupan, ali nove vrednosti ne stižu. Za vremenski kritične brojeve dodajte u samom opsegu ćeliju „ažurirano u" kako bi publika mogla da prepozna star podatak.',
        ],
        ['h', 'Ako se pojavi prazan ili pogrešan prikaz'],
        [
          'ul',
          [
            'Proverite da povezani nalog i dalje ima pristup datoteci.',
            'Potvrdite tačno ime lista i A1 granice, uključujući znak uzvika.',
            'Proverite da izabrani opseg zaista sadrži dobijene vrednosti.',
            'Za KPI svedite opseg na oznaku i jednu glavnu vrednost.',
            'Sačekajte početno preuzimanje i potom proverite mrežu plejera.',
          ],
        ],
        ['h', 'Sheets prikaz nije isto što i Menu board sync'],
        [
          'p',
          'Google Sheets aplikacija verno prikazuje opseg kao tabelu ili KPI. Ako želite dizajnirani meni sa nazivom, cenom, opisom, kategorijom i fotografijom, koristite Menu board. Ta aplikacija podržava ručni unos, jednokratni CSV import ili sinhronizaciju iz Google Sheets-a i Microsoft Excel-a sa mapiranjem kolona na navedena polja. Sheets aplikacija sama ne čita Excel, ne mapira kolone i ne pretvara radnu tabelu u meni šablon. Izbor između njih zavisi od ishoda: veran prikaz podataka ili namenski cenovnik.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'how to display Google Sheets on a TV with SignageWall',
        intentType: 'transactional',
        audience: 'A SignageWall user who already maintains data in a Google spreadsheet',
        jobToBeDone: 'Connect an exact cell range and publish a readable view on a screen.',
        uniquePromise: 'The exact setup path for the current OAuth connection and Sheets app.',
        notTargeting:
          'Does not cover public links, Excel import, arbitrary column mapping or menu design.',
      },
      takeaways: [
        'Connect Google, choose the spreadsheet and enter an A1 range.',
        'Choose a table or one KPI value, not an arbitrary template.',
        'Data refreshes every five minutes while the network is available.',
      ],
      content: [
        [
          'p',
          'The Google Sheets app displays one selected range as a table or one large KPI value. It is intended for data that already lives in a spreadsheet: a timetable, short price list, shift result or another value that is safe for its audience. You do not publish the document as a public link. Instead, SignageWall uses a connected Google account with read-only access to Drive metadata and Sheets content. The deployment administrator must have configured Google OAuth credentials on the backend first.',
        ],
        ['h', '1. Prepare a dedicated on-screen range'],
        [
          'p',
          'Create a compact rectangular range without private notes or unnecessary working columns. Its first row can be a header. Do not rely on scrolling: a wall display works best with only the rows that fit in one readable frame. Existing spreadsheet formulas can remain in Google Sheets and the app presents their resulting values; editing and business logic stay in the source document.',
        ],
        ['h', '2. Connect Google and choose the file'],
        [
          'p',
          'Add the Google Sheets app and start OAuth sign-in from the Google account field. SignageWall requests read access and does not edit cells. Next, use the searchable Spreadsheet picker to find a file from Google Drive. The picker lists spreadsheets available to the connected account, so connect an account that genuinely has permission to open the document you need.',
        ],
        ['h', '3. Enter the range in A1 notation'],
        [
          'p',
          'Range is required and expects A1 notation. `A1:D20` selects the first four columns through row twenty on the default sheet. A more reliable form includes the tab name, such as `Sheet1!A1:D20`. If the tab name contains spaces, verify its notation in Sheets. The app does not currently include a separate column picker or field mapping; it displays the rectangle you specify.',
        ],
        ['fig', 0],
        ['h', '4. Choose a table or one KPI value'],
        [
          'p',
          'Layout has two options. Table presents the range as rows and columns. Single value (KPI) is for one prominent value and its label. The First row is a header switch styles that row as column headings in a table or uses it as the KPI label. Finally, choose a light or dark theme. Those are the current presentation choices; this app does not contain a free-form template designer.',
        ],
        ['h', '5. Put the app in a playlist and publish'],
        [
          'p',
          'Save the instance, add it as an item in the appropriate playlist, set its duration within the loop and assign that playlist to the target display. Review the result from the actual viewing distance. If the table is too small, reduce the range or build a dedicated display tab instead of shrinking text below a readable size.',
        ],
        ['h', 'When edits reach the display'],
        [
          'p',
          'The Sheets connector has a fixed refresh interval of 300 seconds, or five minutes. It is not an instant update and the operator does not currently configure that interval. While the player is offline, the last delivered, cached view can remain available, but new values cannot arrive. For time-sensitive figures, include an “updated at” cell in the selected range so viewers can recognise stale data.',
        ],
        ['h', 'If the result is empty or incorrect'],
        [
          'ul',
          [
            'Check that the connected account can still access the file.',
            'Confirm the exact tab name and A1 bounds, including the exclamation mark.',
            'Make sure the selected range contains resulting values.',
            'For KPI layout, reduce the range to a label and one main value.',
            'Allow the initial fetch to finish, then check player connectivity.',
          ],
        ],
        ['h', 'A Sheets view is not Menu board sync'],
        [
          'p',
          'The Google Sheets app faithfully shows a range as a table or KPI. For a designed menu with name, price, description, category and photograph, use Menu board instead. That app supports manual rows, a one-time CSV import, or synchronisation from Google Sheets and Microsoft Excel with columns mapped to those fields. The Sheets app itself does not read Excel, map columns or turn a working spreadsheet into a menu template. Choose between them by the desired outcome: a direct data view or a purpose-built price list.',
        ],
      ],
    },
  },
  'interna-komunikacija-ekran-umesto-mejla': {
    links: {
      posts: [
        'vise-lokacija-jedan-tim',
        'koliko-dugo-treba-da-traje-slajd',
        'google-sheets-na-ekranu',
      ],
      solutions: ['office'],
      apps: ['teams', 'gcal', 'gslides', 'powerpoint', 'rss', 'text', 'powerbi'],
    },
    sr: {
      intent: {
        primaryQuery: 'šta prikazati na ekranima za internu komunikaciju',
        intentType: 'informational',
        audience: 'HR ili internal communications tim koji uvodi ekrane u kancelariji',
        jobToBeDone: 'Raspodeliti poruke između ekrana, mejla i timskih kanala bez dupliranja.',
        uniquePromise:
          'Operativni model kanala zasnovan na stvarnim aplikacijama i njihovim granicama.',
        notTargeting: 'Ne tvrdi da ekran zamenjuje mejl niti obećava merenje pažnje zaposlenih.',
      },
      takeaways: [
        'Ekran je za kratku zajedničku poruku, ne lični zadatak.',
        'Svaki izvor mora imati urednika, publiku i ritam provere.',
        'Povezani kanali na javnom zidu moraju biti bezbedni za tu publiku.',
      ],
      content: [
        [
          'p',
          'Ekran, mejl i Teams ne rešavaju isti komunikacioni posao. Ekran je dobar za kratku poruku koju ljudi mogu da razumeju u prolazu: bezbednosni podsetnik, događaj ove nedelje, dobrodošlicu ili jednu zajedničku brojku. Mejl čuva detalj i trag za osobu koja treba da reaguje, dok timski kanal nosi razgovor. Ekran zato nije zamena za inbox; on je dodatni zajednički sloj za informacije koje ne traže privatni odgovor.',
        ],
        ['h', 'Odredite šta sme da stane u jedan pogled'],
        [
          'p',
          'Pre objave završite rečenicu: „Posle ove scene kolega treba da zna ___." Ako odgovor zahteva dokument, komentar ili ličnu akciju, ekran treba da prikaže samo sažetak i put do bezbednog internog izvora. Naslov, jedna činjenica, datum i kratak poziv dovoljni su za većinu scena. Ne merite uspeh izmišljenim „open rate-om" ekrana; proverite poslovni signal, na primer manje ponovljenih pitanja ili više prijava kroz postojeći sistem.',
        ],
        ['h', 'Izaberite izvor prema vrsti poruke'],
        [
          'ul',
          [
            'Text za kratko obaveštenje koje urednik piše u SignageWall-u.',
            'Google Calendar za povezani kalendar događaja bez privatnih detalja.',
            'Google Slides ili PowerPoint za prezentaciju koju tim već održava.',
            'RSS za odobreni feed čiji naslovi smeju na interni ekran.',
            'PDF za kontrolisani dokument koji je čitljiv sa ciljne udaljenosti.',
          ],
        ],
        ['fig', 0],
        ['h', 'Microsoft Teams zahteva namenski, bezbedan kanal'],
        [
          'p',
          'Teams aplikacija povezuje poslovni ili školski Microsoft nalog i prikazuje skorašnje poruke jednog izabranog Team kanala kao spotlight ili grid. SignageWall ih samo čita i ne objavljuje poruke. Pristup zahteva Microsoft organizaciju i administratorsku saglasnost za čitanje channel poruka; lični Microsoft nalozi nisu podržani. Nemojte povezati kanal sa poverljivim razgovorima. Napravite namenski broadcast kanal čiji je svaki novi post bezbedan za sve koji vide ekran.',
        ],
        ['h', 'Dashboard može biti javan i kada zid nije'],
        [
          'p',
          'Power BI aplikacija trenutno prihvata samo Publish to web link. Takav izveštaj je javno dostupan svakome ko ima adresu, zahteva mrežu i nije rešenje za privatni poslovni dashboard. Običan Power BI link koji traži prijavu neće raditi na unattended ekranu. Za osetljive brojke koristite drugi odobreni izvor ili pripremite sažetak bez poverljivih podataka. Javna dostupnost izvora mora biti svesna odluka, ne posledica zgodnog embed-a.',
        ],
        ['h', 'Jedan kalendar ili deck ne rešava uredništvo'],
        [
          'p',
          'Za svaki izvor zapišite vlasnika, ciljnu publiku, ritam provere i pravilo uklanjanja. SignageWall ima radno vreme na nivou ekrana, ali ne zakazuje automatsko objavljivanje ili istek pojedinačnog slajda. Zato vremenski ograničena poruka treba da nosi vidljiv datum, a urednik mora da je ukloni. Google Slides i PowerPoint prate povezani deck, pa promena izvornog dokumenta menja i ono što će ekran dobiti; pregled pre izmene ostaje odgovornost autora.',
        ],
        ['h', 'Organizujte više ekrana bez pretpostavljenih lokalnih uloga'],
        [
          'p',
          'Napravite ponovo upotrebljivu plejlistu za jednu publiku, zatim je dodelite konkretno izabranim ekranima. Proizvod trenutno nema trajne screen grupe ni ulogu ograničenu na jednu kancelariju: admin i member pristup važe kroz organizaciju. Ako lokalni tim šalje predloge, centralni urednički proces mora da definiše ko ih odobrava. To je organizaciona kontrola, ne automatska lokacijska dozvola u proizvodu.',
        ],
        ['h', 'Dizajnirajte za prolaz i prekid veze'],
        [
          'p',
          'Postavite ekran tamo gde ljudi prirodno uspore, ali ga ne oslanjajte na zvuk. Proverite kontrast i veličinu teksta sa stvarnog puta kroz prostor. Mrežni izvori ne dobijaju nove podatke bez veze, a Power BI se bez mreže ne prikazuje; zato u petlji zadržite makar jednu lokalnu Text, sliku ili drugu offline-bezbednu stavku. Online i last-seen signal pomažu operateru, ali ne dokazuju da je zaposleni pročitao poruku.',
        ],
        ['h', 'Sedmični ritam koji ostaje održiv'],
        [
          'p',
          'Jednom sedmično uklonite prošle događaje, proverite povezane izvore i izaberite najviše nekoliko poruka za naredni period. Posle objave odgledajte punu petlju na jednom ciljnom ekranu. Ako se ključna informacija pojavi tek posle vremena koje ljudi provode u prostoru, skratite petlju. Vrednost internog ekrana dolazi iz doslednog uređivanja i jasne uloge kanala, ne iz količine objavljenih slajdova.',
        ],
      ],
    },
    en: {
      intent: {
        primaryQuery: 'what to show on internal communications screens',
        intentType: 'informational',
        audience: 'An HR or internal communications team introducing office displays',
        jobToBeDone:
          'Divide messages between screens, email and team channels without duplicating them.',
        uniquePromise:
          'A channel operating model grounded in real apps and their current boundaries.',
        notTargeting: 'Does not claim screens replace email or measure employee attention.',
      },
      takeaways: [
        'Use a screen for a brief shared message, not a personal task.',
        'Every source needs an editor, audience and review cadence.',
        'Connected channels on a shared wall must be safe for that audience.',
      ],
      content: [
        [
          'p',
          'A screen, email and Teams do not solve the same communication job. A display suits a brief message people can understand in passing: a safety reminder, this week’s event, a welcome or one shared figure. Email keeps detail and an audit trail for the person expected to act, while a team channel carries discussion. The screen is therefore not a replacement for the inbox. It is an additional shared layer for information that does not require a private reply.',
        ],
        ['h', 'Decide what can fit into one glance'],
        [
          'p',
          'Before publishing, complete the sentence: “After this scene, a colleague should know ___.” If the answer needs a document, comment or personal action, show only a summary and a route to the secure internal source. A headline, one fact, a date and a short prompt are enough for most scenes. Do not invent an email-style open rate for a screen. Measure a business signal instead, such as fewer repeated questions or more registrations in the existing system.',
        ],
        ['h', 'Choose a source that matches the message'],
        [
          'ul',
          [
            'Text for a short notice written directly in SignageWall.',
            'Google Calendar for a connected event calendar without private details.',
            'Google Slides or PowerPoint for a deck the team already maintains.',
            'RSS for an approved feed whose headlines are safe on the wall.',
            'PDF for a controlled document readable at the intended distance.',
          ],
        ],
        ['fig', 0],
        ['h', 'Microsoft Teams needs a dedicated, safe channel'],
        [
          'p',
          'The Teams app connects a work or school Microsoft account and presents recent messages from one selected Team channel as a spotlight or grid. SignageWall only reads those messages and never posts. Access requires a Microsoft organisation and administrator consent for reading channel messages; personal Microsoft accounts are not supported. Do not connect a channel containing confidential discussion. Create a broadcast channel where every new post is suitable for everybody who can see the display.',
        ],
        ['h', 'A dashboard can be public even when the wall is not'],
        [
          'p',
          'The current Power BI app accepts only a Publish to web link. Such a report is publicly accessible to anybody with the address, requires a network connection and is not a solution for a private business dashboard. A normal Power BI report link that requires sign-in will not work on an unattended screen. Use another approved source for sensitive figures or prepare a summary without confidential data. Public access must be a deliberate decision, not an accidental consequence of a convenient embed.',
        ],
        ['h', 'A calendar or deck does not replace editorial ownership'],
        [
          'p',
          'For every source, record an owner, intended audience, review cadence and removal rule. SignageWall provides working hours at screen level, but it does not schedule publication or expiry for an individual slide. A time-limited notice therefore needs a visible date and an editor who removes it. Google Slides and PowerPoint follow their connected decks, so changing the source document changes what the screen will receive; reviewing that edit remains the author’s responsibility.',
        ],
        ['h', 'Organise several displays without assumed local roles'],
        [
          'p',
          'Build one reusable playlist for an audience and assign it to explicitly selected displays. The product currently has no persistent screen groups or role limited to one office: admin and member access applies across the organisation. If a local team submits material, the central editorial process must define who approves it. That is an organisational control, not an automatic location permission in the product.',
        ],
        ['h', 'Design for passing attention and a lost connection'],
        [
          'p',
          'Mount the screen where people naturally slow down, but do not make audio essential. Check contrast and type size from the actual route through the space. Network sources receive no fresh data without connectivity, and Power BI does not render offline, so keep at least one local Text, image or other offline-safe item in the loop. Online and last-seen signals help the operator, but they do not prove an employee read the message.',
        ],
        ['h', 'A weekly rhythm that remains maintainable'],
        [
          'p',
          'Weekly, remove past events, check connected sources and choose only a few messages for the next period. After publishing, watch a full loop on one target display. If essential information appears later than people remain in the area, shorten the loop. An internal screen earns value through consistent editing and a clear channel role, not the number of slides published.',
        ],
      ],
    },
  },
}
