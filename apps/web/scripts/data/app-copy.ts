// @ts-nocheck
/**
 * Editorial copy for the App Pages, keyed by the manifest slug.
 *
 * Written against each app's manifest (its data source, refresh interval and
 * config fields) rather than paraphrasing the one-line tagline, because a page
 * that only restates the catalogue is the thin page the SEO gate exists to keep
 * out. Requirements in particular are factual: they have to match what the
 * connector actually does, since a visitor plans around them.
 *
 * Primary queries have to stay distinct from every Blog post, Solution and
 * other App page. The indexing gate compares them and refuses near-duplicates.
 * PowerPoint is framed around the OneDrive link and PDF around a file you
 * upload, which is the actual difference a visitor is choosing between.
 *
 * Filled in batches; `seed-app-copy.ts` only touches the keys present here, so
 * a finished app keeps its copy when a later batch runs.
 */

export const APP_COPY = {
  powerpoint: {
    sr: {
      heroTitle: 'PowerPoint sa OneDrive-a, osvežen čim izmenite slajd',
      intent: {
        primaryQuery: 'powerpoint prezentacija na ekranu sa onedrive naloga',
        intentType: 'commercial-investigation',
        audience: 'firme koje prezentacije već drže na OneDrive-u ili SharePointu',
        jobToBeDone:
          'Pustiti postojeću prezentaciju u krug na ekranima, tako da izmena u fajlu sama stigne do ekrana.',
        uniquePromise:
          'Objašnjava vezu sa OneDrive-om i SharePointom i šta se dešava kad se deck izmeni dok se prikazuje.',
        notTargeting: 'Izrada prezentacija; Google Slides.',
      },
      summary:
        'Povežete Microsoft nalog, izaberete prezentaciju sa OneDrive-a ili SharePointa, i ona se vrti na ekranima. Izmenite slajd. Ekran se osveži sam.',
      benefits: [
        'Prezentacija ostaje tamo gde već stoji, na OneDrive-u ili SharePointu',
        'Izmena slajda stiže na ekran bez ponovnog otpremanja',
        'Ceo tim menja isti fajl, umesto da neko šalje nove verzije',
      ],
      features: [
        {
          title: 'Veza sa fajlom, ne kopija',
          body: 'Prikazuje se onaj isti fajl koji vaš tim uređuje. Kod otpremanja bi svaka ispravka značila nov fajl i novo objavljivanje.',
        },
        {
          title: 'Tempo i uklapanje',
          body: 'Podešava se koliko sekundi slajd stoji i kako se uklapa u ekran: po širini, po visini ili preko cele površine.',
        },
        {
          title: 'Pozadina uz slajd',
          body: 'Kada odnos stranica slajda ne odgovara ekranu, boja pozadine popunjava ivice umesto crnih traka.',
        },
      ],
      useCases: [
        {
          title: 'Rezultati u kancelariji',
          body: 'Mesečni pregled koji uprava ionako pravi u PowerPointu, na ekranu u zajedničkom prostoru.',
        },
        {
          title: 'Uputstva u pogonu',
          body: 'Deck sa procedurama koji se menja kad se procedura promeni, bez obilaska ekrana.',
        },
        {
          title: 'Prezentacija na štandu',
          body: 'Ista prezentacija na svim ekranima štanda, izmenjena sa laptopa u toku dana.',
        },
      ],
      setupSteps: [
        {
          title: 'Povežite Microsoft nalog',
          body: 'Prijavite se jednom. Tražimo dozvolu za čitanje fajlova, ne za izmenu.',
        },
        {
          title: 'Izaberite prezentaciju',
          body: 'Sa OneDrive-a ili SharePointa izaberite fajl koji ide na ekran.',
        },
        {
          title: 'Podesite tempo i objavite',
          body: 'Odredite koliko slajd stoji i kako se uklapa u ekran, pa objavite.',
        },
      ],
      requirements: {
        account:
          'Potreban je Microsoft nalog sa pristupom fajlu, povezan jednom. Traži se dozvola samo za čitanje.',
        dataSource:
          'Prezentacija se čita sa OneDrive-a ili SharePointa i pretvara u slike slajdova.',
        network: 'Veza je potrebna za preuzimanje izmenjene verzije.',
        refreshBehavior: 'Proverava se na svakih petnaest minuta.',
        offlineBehavior: 'Poslednja preuzeta verzija ostaje na ekranu i bez mreže.',
        limitations:
          'Animacije i prelazi se ne prikazuju, slajdovi se pretvaraju u slike. Za animaciju koristite video.',
      },
      faq: [
        {
          q: 'Da li se animacije vide?',
          a: 'Ne. Slajdovi se pretvaraju u slike, pa se prelazi i animacije gube. Ako su bitni, izvezite prezentaciju kao video.',
        },
        {
          q: 'Da li SignageWall menja moj fajl?',
          a: 'Ne. Dozvola je isključivo za čitanje.',
        },
        {
          q: 'Koliko brzo se izmena slajda vidi?',
          a: 'U roku od petnaest minuta.',
        },
      ],
    },
    en: {
      heroTitle: 'A PowerPoint deck from OneDrive, updated as you edit it',
      intent: {
        primaryQuery: 'powerpoint deck on a screen from onedrive',
        intentType: 'commercial-investigation',
        audience: 'companies already keeping decks on OneDrive or SharePoint',
        jobToBeDone:
          'Loop an existing deck on the screens so an edit to the file reaches them on its own.',
        uniquePromise:
          'Explains the OneDrive and SharePoint link and what happens when the deck changes while it is showing.',
        notTargeting: 'Building presentations; Google Slides.',
      },
      summary:
        'Connect a Microsoft account, pick a deck from OneDrive or SharePoint, and it loops on the screens. Edit a slide and the screen follows.',
      benefits: [
        'The deck stays where it already lives, on OneDrive or SharePoint',
        'A slide edit reaches the screen with no re-upload',
        'The whole team edits one file instead of passing new versions around',
      ],
      features: [
        {
          title: 'A link to the file, not a copy',
          body: 'The screen shows the same file your team edits. With an upload, every correction would mean a new file and a new publish.',
        },
        {
          title: 'Pace and fit',
          body: 'Set how long a slide holds and how it fits the screen, by width, by height, or filling it.',
        },
        {
          title: 'A background behind the slide',
          body: 'When the slide ratio does not match the screen, a background colour fills the edges instead of black bars.',
        },
      ],
      useCases: [
        {
          title: 'Results in the office',
          body: 'The monthly review management already builds in PowerPoint, on a screen in the shared space.',
        },
        {
          title: 'Instructions on the floor',
          body: 'A procedures deck that changes when the procedure does, with nobody walking round the screens.',
        },
        {
          title: 'A trade-show stand',
          body: 'The same deck on every screen on the stand, edited from a laptop during the day.',
        },
      ],
      setupSteps: [
        {
          title: 'Connect a Microsoft account',
          body: 'Sign in once. We ask for permission to read files, not to change them.',
        },
        {
          title: 'Pick the deck',
          body: 'Choose the file from OneDrive or SharePoint.',
        },
        {
          title: 'Set the pace and publish',
          body: 'Decide how long a slide holds and how it fits the screen, then publish.',
        },
      ],
      requirements: {
        account:
          'A Microsoft account with access to the file, connected once. Only read permission is requested.',
        dataSource: 'The deck is read from OneDrive or SharePoint and rendered to slide images.',
        network: 'A connection is needed to fetch a changed version.',
        refreshBehavior: 'Checked every fifteen minutes.',
        offlineBehavior: 'The last fetched version stays on screen without a network.',
        limitations:
          'Animations and transitions are not shown, slides are rendered as images. For motion, use video.',
      },
      faq: [
        {
          q: 'Do animations play?',
          a: 'No. Slides are rendered as images, so transitions and animations are lost. If they matter, export the deck as video.',
        },
        {
          q: 'Does SignageWall modify my file?',
          a: 'No. The permission is read-only.',
        },
        {
          q: 'How quickly does a slide edit appear?',
          a: 'Within fifteen minutes.',
        },
      ],
    },
  },

  pdf: {
    sr: {
      heroTitle: 'PDF preko celog ekrana, bez alatki pregledača',
      intent: {
        primaryQuery: 'prikaz pdf dokumenta preko celog ekrana',
        intentType: 'commercial-investigation',
        audience: 'firme koje dokument već imaju gotov i hoće ga na ekranu',
        jobToBeDone:
          'Prikazati gotov dokument na ekranu bez trake sa alatkama i bez ikoga ko lista stranice.',
        uniquePromise:
          'Objašnjava zašto PDF radi bez naloga i bez mreže, i gde je granica veličine fajla.',
        notTargeting: 'Uređivanje PDF-a; prezentacije sa OneDrive-a.',
      },
      summary:
        'Otpremite PDF i prikazuje se preko celog ekrana, bez traka i dugmadi. Višestranični dokument sam lista stranice, tempom koji odredite.',
      benefits: [
        'Radi bez ijednog naloga, otpremite fajl i gotovo',
        'Nastavlja da radi i kad mreža padne, jer je fajl na uređaju',
        'Bez traka i dugmadi pregledača preko sadržaja',
      ],
      features: [
        {
          title: 'Bez okvira pregledača',
          body: 'Prikazuje se samo dokument. Otvoren PDF u pregledaču bi doneo traku sa alatkama koja kvari utisak i zbunjuje gledaoca.',
        },
        {
          title: 'Automatsko listanje',
          body: 'Višestranični dokument sam prelazi na sledeću stranicu, sporo, srednje ili brzo, u zavisnosti od toga koliko teksta stranica nosi.',
        },
        {
          title: 'Radi lokalno',
          body: 'Fajl se čuva na plejeru, pa prikaz ne zavisi od veze. Za ekran u prostoru sa slabim internetom to je često presudno.',
        },
      ],
      useCases: [
        {
          title: 'Cenovnik u radnji',
          body: 'Dokument koji već postoji za štampu ide na ekran bez prepravke.',
        },
        {
          title: 'Obaveštenje u zgradi',
          body: 'Odluka skupštine ili raspored radova, prikazan u ulazu umesto zalepljen na staklo.',
        },
        {
          title: 'Brošura u čekaonici',
          body: 'Višestranična brošura se sama lista dok pacijent ili klijent čeka.',
        },
      ],
      setupSteps: [
        {
          title: 'Otpremite fajl',
          body: 'Izaberite PDF do 10 MB. Veći fajl skratite ili podelite na dva dokumenta.',
        },
        {
          title: 'Podesite tempo listanja',
          body: 'Sporo za stranice sa dosta teksta, brzo za one koje su uglavnom slika.',
        },
        {
          title: 'Proverite čitljivost',
          body: 'Pogledajte ekran sa mesta gde stoji gledalac. Dokument napravljen za A4 papir često ima presitna slova za zid.',
        },
      ],
      requirements: {
        account: 'Nije potreban nijedan nalog.',
        dataSource: 'Prikazuje se fajl koji ste otpremili; ništa se ne povlači spolja.',
        network: 'Veza je potrebna samo za otpremanje i objavu.',
        refreshBehavior: 'Nema osvežavanja, dokument stoji dok ne otpremite nov.',
        offlineBehavior: 'Radi u potpunosti bez mreže, jer je fajl na uređaju.',
        limitations:
          'Fajl može da bude do 10 MB. Dokument pravljen za štampu često treba prelomiti krupnije da bi se čitao sa udaljenosti.',
      },
      faq: [
        {
          q: 'Koliko veliki fajl mogu da otpremim?',
          a: 'Do 10 MB. Ako je veći, smanjite rezoluciju slika u dokumentu ili ga podelite na dva.',
        },
        {
          q: 'Da li radi bez interneta?',
          a: 'Radi. Fajl se čuva na plejeru, pa prekid veze ne prekida prikaz.',
        },
        {
          q: 'Mogu li da zaustavim listanje na jednoj stranici?',
          a: 'Jednostranični dokument stoji sam po sebi. Za jednu stranicu iz većeg dokumenta izvezite samo nju.',
        },
      ],
    },
    en: {
      heroTitle: 'A PDF full-screen, with no viewer controls',
      intent: {
        primaryQuery: 'display a pdf document full screen on a tv',
        intentType: 'commercial-investigation',
        audience: 'businesses with a finished document that needs to be on a screen',
        jobToBeDone:
          'Show a finished document on a screen without a toolbar and without anyone turning the pages.',
        uniquePromise:
          'Explains why a PDF needs no account and survives an outage, and where the file size limit sits.',
        notTargeting: 'Editing PDFs; decks from OneDrive.',
      },
      summary:
        'Upload a PDF and it fills the screen, with no bars or buttons. A multi-page document turns its own pages at the speed you choose.',
      benefits: [
        'Needs no account at all. Upload the file and you are done',
        'Keeps working when the network drops, because the file is on the device',
        'No viewer toolbar sitting over the content',
      ],
      features: [
        {
          title: 'No browser frame',
          body: 'Only the document is shown. Opening a PDF in a browser would bring a toolbar that spoils the look and confuses the viewer.',
        },
        {
          title: 'Turns its own pages',
          body: 'A multi-page document advances by itself: slow, medium or fast, depending on how much text a page carries.',
        },
        {
          title: 'Runs locally',
          body: 'The file is stored on the player, so display does not depend on the connection. On a site with poor internet that is often the deciding factor.',
        },
      ],
      useCases: [
        {
          title: 'A price list in a shop',
          body: 'The document that already exists for print goes on the screen without being rebuilt.',
        },
        {
          title: 'A building notice',
          body: 'A residents’ decision or works schedule shown in the entrance instead of taped to the glass.',
        },
        {
          title: 'A brochure in a waiting room',
          body: 'A multi-page brochure turns its own pages while a patient or client waits.',
        },
      ],
      setupSteps: [
        {
          title: 'Upload the file',
          body: 'Choose a PDF up to 10 MB. Shrink or split anything larger.',
        },
        {
          title: 'Set the page speed',
          body: 'Slow for pages heavy with text, fast for pages that are mostly image.',
        },
        {
          title: 'Check it reads',
          body: 'Look at the screen from where the viewer stands. A document laid out for A4 often has type far too small for a wall.',
        },
      ],
      requirements: {
        account: 'No account of any kind is needed.',
        dataSource: 'The file you upload is shown; nothing is fetched externally.',
        network: 'A connection is needed only to upload and publish.',
        refreshBehavior: 'There is no refresh. The document stands until you upload a new one.',
        offlineBehavior: 'Works fully without a network, because the file lives on the device.',
        limitations:
          'Files up to 10 MB. A document laid out for print usually needs setting larger to read from a distance.',
      },
      faq: [
        {
          q: 'How large a file can I upload?',
          a: 'Up to 10 MB. If it is bigger, reduce the image resolution inside the document or split it in two.',
        },
        {
          q: 'Does it work without internet?',
          a: 'Yes. The file is stored on the player, so an outage does not interrupt the display.',
        },
        {
          q: 'Can I hold it on one page?',
          a: 'A single-page document holds by itself. For one page out of a larger file, export just that page.',
        },
      ],
    },
  },
  teams: {
    sr: {
      heroTitle: 'Teams kanal na ekranu, za one koji ga ne otvaraju',
      intent: {
        primaryQuery: 'microsoft teams kanal na ekranu u firmi',
        intentType: 'commercial-investigation',
        audience: 'firme koje internu komunikaciju već vode kroz Microsoft Teams',
        jobToBeDone:
          'Izneti objave iz jednog Teams kanala na ekrane, da ih vide i zaposleni koji aplikaciju ne otvaraju.',
        uniquePromise:
          'Objašnjava zašto je potrebna saglasnost Azure AD administratora i zašto lični Microsoft nalog ne prolazi.',
        notTargeting: 'Slanje poruka u Teams; Outlook kalendar.',
      },
      summary:
        'Povežete Microsoft nalog, izaberete jedan kanal, i poslednje objave iz njega se smenjuju na ekranu, jedna po jedna ili u mreži.',
      benefits: [
        'Obaveštenja vide i ljudi koji nemaju Teams ni na telefonu ni za stolom',
        'Kanal ostaje jedino mesto gde se piše. Ekran samo prikazuje',
        'Više ekrana na istom kanalu troši jedno povlačenje podataka',
      ],
      features: [
        {
          title: 'Jedan kanal, ne ceo Teams',
          body: 'Birate tačno jedan kanal iz timova kojima pripadate. Ekran u hodniku ne treba da iznosi sve što se u firmi dopisuje.',
        },
        {
          title: 'Jedna poruka ili više njih',
          body: 'Spotlight prikazuje poruku preko celog ekrana i čita se iz prolaza; mreža ima smisla tamo gde ljudi zastanu.',
        },
        {
          title: 'Ime autora uz objavu',
          body: 'Uz svaku poruku stoji ko ju je napisao, pa se zna kome se obratiti. Može i da se sakrije.',
        },
      ],
      useCases: [
        {
          title: 'Pogon i magacin',
          body: 'Radnici bez računara i službenog naloga vide obaveštenja koja tim inače razmenjuje u kanalu.',
        },
        {
          title: 'Hodnik ka kantini',
          body: 'Objave iz kanala „Opšte" na putu kojim svi prolaze bar jednom dnevno.',
        },
        {
          title: 'Smenski rad',
          body: 'Druga i treća smena dobijaju isto obaveštenje kao i prva, bez prepričavanja pri primopredaji.',
        },
      ],
      setupSteps: [
        {
          title: 'Povežite Microsoft nalog',
          body: 'Prijavite se poslovnim nalogom. Prvi put vaš Microsoft administrator mora da odobri čitanje poruka.',
        },
        {
          title: 'Izaberite kanal',
          body: 'U listi se pojavljuju samo timovi čiji ste član. Izaberite jedan kanal.',
        },
        {
          title: 'Podesite prikaz i objavite',
          body: 'Spotlight ili mreža, koliko sekundi poruka stoji i da li se vidi ime autora.',
        },
      ],
      requirements: {
        account: 'Poslovni ili školski Microsoft nalog. Lični Microsoft nalozi nisu podržani.',
        dataSource:
          'Poruke se čitaju iz izabranog kanala preko Microsoft Graph-a. SignageWall nikada ne objavljuje u kanal.',
        network: 'Veza je potrebna za povlačenje novih poruka.',
        refreshBehavior: 'Proverava se na svaka dva minuta.',
        offlineBehavior: 'Poslednje povučene poruke ostaju na ekranu dok se veza ne vrati.',
        limitations:
          'Čitanje poruka iz kanala traži saglasnost Azure AD administratora, bez nje povezivanje ne prolazi. Prikazuju se samo kanali timova; lične prepiske nisu u ponudi.',
      },
      faq: [
        {
          q: 'Može li SignageWall da piše u kanal?',
          a: 'Ne. Tražena dozvola je isključivo za čitanje poruka.',
        },
        {
          q: 'Radi li sa ličnim Microsoft nalogom?',
          a: 'Ne. Potreban je poslovni ili školski nalog, jer se dozvola za čitanje kanala odobrava kroz Azure AD.',
        },
        {
          q: 'Koliko brzo se nova objava pojavi na ekranu?',
          a: 'U roku od dva minuta.',
        },
      ],
    },
    en: {
      heroTitle: 'A Teams channel on the wall, for the people who never open it',
      intent: {
        primaryQuery: 'microsoft teams channel on a workplace screen',
        intentType: 'commercial-investigation',
        audience: 'companies already running internal communication through Microsoft Teams',
        jobToBeDone:
          'Carry posts from one Teams channel onto the screens so staff who never open the app still read them.',
        uniquePromise:
          'Explains why an Azure AD admin has to approve the connection and why a personal Microsoft account will not work.',
        notTargeting: 'Posting into Teams; the Outlook calendar.',
      },
      summary:
        'Connect a Microsoft account, pick one channel, and its recent posts rotate on the screen, one at a time or several at once.',
      benefits: [
        'Announcements reach people with no Teams on a phone or a desk',
        'The channel stays the only place anyone writes. The screen only shows',
        'Many screens on one channel cost a single fetch',
      ],
      features: [
        {
          title: 'One channel, not all of Teams',
          body: 'You pick exactly one channel from the teams you belong to. A screen in a corridor should not carry everything the company says.',
        },
        {
          title: 'One message or several',
          body: 'Spotlight fills the screen with a single post and reads from a walkway; a grid makes sense where people stop.',
        },
        {
          title: 'A name against each post',
          body: 'Every message carries who wrote it, so a reader knows who to ask. It can also be hidden.',
        },
      ],
      useCases: [
        {
          title: 'Production and the warehouse',
          body: 'Staff with no computer and no work account see the notices the team already exchanges in the channel.',
        },
        {
          title: 'The corridor to the canteen',
          body: 'Posts from the general channel on the route everyone walks at least once a day.',
        },
        {
          title: 'Shift work',
          body: 'The second and third shift get the same notice as the first, without it being retold at handover.',
        },
      ],
      setupSteps: [
        {
          title: 'Connect a Microsoft account',
          body: 'Sign in with a work account. The first time, your Microsoft admin has to approve reading messages.',
        },
        {
          title: 'Pick the channel',
          body: 'Only teams you belong to appear in the list. Choose one channel.',
        },
        {
          title: 'Set the layout and publish',
          body: 'Spotlight or grid, how long a message holds, and whether the author name shows.',
        },
      ],
      requirements: {
        account:
          'A work or school Microsoft account. Personal Microsoft accounts are not supported.',
        dataSource:
          'Messages are read from the chosen channel through Microsoft Graph. SignageWall never posts into the channel.',
        network: 'A connection is needed to fetch new messages.',
        refreshBehavior: 'Checked every two minutes.',
        offlineBehavior: 'The last fetched messages stay on screen until the connection returns.',
        limitations:
          'Reading channel messages needs Azure AD admin consent, without it the connection cannot be made. Only team channels are offered; private chats are not.',
      },
      faq: [
        {
          q: 'Can SignageWall post into the channel?',
          a: 'No. The permission requested is read-only.',
        },
        {
          q: 'Does it work with a personal Microsoft account?',
          a: 'No. A work or school account is required, because channel read access is granted through Azure AD.',
        },
        {
          q: 'How quickly does a new post appear?',
          a: 'Within two minutes.',
        },
      ],
    },
  },

  outlook: {
    sr: {
      heroTitle: 'Outlook kalendar pored vrata sale',
      intent: {
        primaryQuery: 'outlook kalendar na ekranu sale za sastanke',
        intentType: 'commercial-investigation',
        audience: 'kancelarije koje rade na Microsoft 365 i zakazuju sale kroz Outlook',
        jobToBeDone:
          'Pokazati raspored jedne sale ili tima na ekranu, bez prepisivanja termina rukom.',
        uniquePromise:
          'Objašnjava koje prikaze kalendara birate i zašto se sa ekrana ne može rezervisati termin.',
        notTargeting: 'Rezervacija sale sa ekrana; Google kalendar.',
      },
      summary:
        'Povežete Microsoft nalog, izaberete kalendar, i termini se prikazuju kao dan, nedelja, mesec ili spisak koji se sam pomera.',
      benefits: [
        'Raspored dolazi iz kalendara koji tim ionako popunjava',
        'Nema prepisivanja termina na tablu ni papir na vratima',
        'Isti kalendar može da stoji na više ekrana istovremeno',
      ],
      features: [
        {
          title: 'Četiri prikaza',
          body: 'Dan za vrata sale, nedelja za tim, mesec za pregled, spisak za ekran u holu koji čita samo šta sledi.',
        },
        {
          title: 'Samo ono što dolazi',
          body: 'Prošli termini mogu da se sakriju, pa ekran ne troši prostor na sastanak koji je završen u devet ujutru.',
        },
        {
          title: 'Sam se pomera',
          body: 'Kada dan ima više termina nego što stane, spisak se polako pomera umesto da odseče ostatak.',
        },
      ],
      useCases: [
        {
          title: 'Vrata sale za sastanke',
          body: 'Mali ekran pokazuje da li je sala slobodna i ko je sledeći, pa niko ne otvara vrata da proveri.',
        },
        {
          title: 'Recepcija',
          body: 'Spisak dolazećih sastanaka pomaže onome ko dočekuje da zna koga očekuje i kada.',
        },
        {
          title: 'Zajednički prostor tima',
          body: 'Nedeljni prikaz timskog kalendara na zidu, da se vidi kada je ko odsutan.',
        },
      ],
      setupSteps: [
        {
          title: 'Povežite Microsoft nalog',
          body: 'Prijavite se jednom. Tražimo dozvolu za čitanje kalendara, ne za izmenu.',
        },
        {
          title: 'Izaberite kalendar',
          body: 'Iz liste kalendara kojima nalog ima pristup izaberite onaj koji ide na ekran.',
        },
        {
          title: 'Izaberite prikaz i objavite',
          body: 'Dan, nedelja, mesec ili spisak, uz jezik prikaza i temu.',
        },
      ],
      requirements: {
        account:
          'Microsoft nalog sa pristupom kalendaru, povezan jednom. Traži se dozvola samo za čitanje.',
        dataSource: 'Termini se čitaju iz izabranog Outlook ili Microsoft 365 kalendara.',
        network: 'Veza je potrebna za povlačenje izmenjenog rasporeda.',
        refreshBehavior: 'Proverava se na svakih trideset minuta.',
        offlineBehavior: 'Poslednji povučeni raspored ostaje na ekranu i bez mreže.',
        limitations:
          'Ekran prikazuje, ne rezerviše, termin se i dalje zakazuje u Outlooku. Izmena zakazana u poslednjem trenutku vidi se tek pri sledećoj proveri.',
      },
      faq: [
        {
          q: 'Može li neko da rezerviše salu preko ekrana?',
          a: 'Ne. Prikaz je samo za čitanje; termini se zakazuju u Outlooku kao i do sada.',
        },
        {
          q: 'Vide li se detalji sastanka?',
          a: 'Prikazuju se naslov i vreme. Ako naslovi sadrže poverljive podatke, preimenujte ih ili koristite poseban kalendar za ekran.',
        },
        {
          q: 'Koliko brzo se nov termin pojavi?',
          a: 'U roku od trideset minuta.',
        },
      ],
    },
    en: {
      heroTitle: 'An Outlook calendar beside the meeting room door',
      intent: {
        primaryQuery: 'outlook calendar on a meeting room display',
        intentType: 'commercial-investigation',
        audience: 'offices running on Microsoft 365 that book rooms through Outlook',
        jobToBeDone:
          'Show one room or team schedule on a screen without anyone copying the bookings out by hand.',
        uniquePromise:
          'Explains which calendar views you choose between and why a room cannot be booked from the screen.',
        notTargeting: 'Booking a room from the screen; Google Calendar.',
      },
      summary:
        'Connect a Microsoft account, pick a calendar, and the bookings show as a day, week, month or a schedule that scrolls itself.',
      benefits: [
        'The schedule comes from the calendar the team already fills in',
        'No bookings copied onto a whiteboard or a sheet taped to the door',
        'One calendar can stand on several screens at once',
      ],
      features: [
        {
          title: 'Four views',
          body: 'Day for a room door, week for a team, month for an overview, schedule for a lobby screen that only needs what is next.',
        },
        {
          title: 'Only what is coming',
          body: 'Past bookings can be hidden, so the screen spends no room on a meeting that ended at nine.',
        },
        {
          title: 'Scrolls itself',
          body: 'When a day holds more bookings than fit, the list moves slowly instead of cutting the rest off.',
        },
      ],
      useCases: [
        {
          title: 'A meeting room door',
          body: 'A small screen shows whether the room is free and who has it next, so nobody opens the door to check.',
        },
        {
          title: 'Reception',
          body: 'A schedule of arriving meetings tells whoever greets people who is expected and when.',
        },
        {
          title: 'A team area',
          body: 'The weekly view of a team calendar on the wall, so absences are visible without asking.',
        },
      ],
      setupSteps: [
        {
          title: 'Connect a Microsoft account',
          body: 'Sign in once. We ask for permission to read the calendar, not to change it.',
        },
        {
          title: 'Pick the calendar',
          body: 'Choose the calendar the account can reach that should go on the screen.',
        },
        {
          title: 'Choose the view and publish',
          body: 'Day, week, month or schedule, along with the display language and theme.',
        },
      ],
      requirements: {
        account:
          'A Microsoft account with access to the calendar, connected once. Only read permission is requested.',
        dataSource: 'Bookings are read from the chosen Outlook or Microsoft 365 calendar.',
        network: 'A connection is needed to fetch a changed schedule.',
        refreshBehavior: 'Checked every thirty minutes.',
        offlineBehavior: 'The last fetched schedule stays on screen without a network.',
        limitations:
          'The screen displays, it does not book, meetings are still made in Outlook. A last-minute change appears at the next check, not instantly.',
      },
      faq: [
        {
          q: 'Can someone book the room from the screen?',
          a: 'No. The display is read-only; bookings are still made in Outlook.',
        },
        {
          q: 'Are meeting details visible?',
          a: 'The title and time are shown. If titles carry anything confidential, rename them or use a separate calendar for the screen.',
        },
        {
          q: 'How quickly does a new booking appear?',
          a: 'Within thirty minutes.',
        },
      ],
    },
  },

  powerbi: {
    sr: {
      heroTitle: 'Power BI izveštaj na zidu, bez prijave na ekranu',
      intent: {
        primaryQuery: 'power bi izveštaj na tv ekranu',
        intentType: 'commercial-investigation',
        audience: 'timovi koji izveštaje već prave u Power BI-ju i hoće ih vidljive u prostoriji',
        jobToBeDone:
          'Držati objavljen Power BI izveštaj stalno na ekranu, bez čoveka koji se prijavljuje.',
        uniquePromise:
          'Objašnjava razliku između „Publish to web" izveštaja i privatnog, i zašto privatni ne može na ekran.',
        notTargeting: 'Izrada izveštaja; privatni izveštaji sa prijavom.',
      },
      summary:
        'Objavite izveštaj kroz Power BI opciju „Publish to web", nalepite link, i izveštaj stoji na ekranu i sam se ponovo učitava.',
      benefits: [
        'Brojevi su u prostoriji, umesto da ih neko otvara na zahtev',
        'Ne traži nalog ni prijavu na samom ekranu',
        'Sami zadajete koliko često se izveštaj ponovo učitava',
      ],
      features: [
        {
          title: 'Radi bez ikoga za tastaturom',
          body: 'Izveštaj objavljen za javni prikaz nema ekran za prijavu, pa se učitava sam kada se plejer upali posle nestanka struje.',
        },
        {
          title: 'Osvežavanje po vašoj meri',
          body: 'Zadajete na koliko minuta se izveštaj ponovo učitava, često za dnevni pregon, retko za mesečni pregled.',
        },
        {
          title: 'Izolovan prikaz',
          body: 'Izveštaj se prikazuje u ograđenom okviru, pa ne može da dira ostatak ekrana ni ostale aplikacije u rasporedu.',
        },
      ],
      useCases: [
        {
          title: 'Prodajni tim',
          body: 'Mesečni plan i ostvarenje na zidu kancelarije, isti brojevi koje uprava gleda u Power BI-ju.',
        },
        {
          title: 'Kontrolna soba',
          body: 'Izveštaj o zastojima i iskorišćenosti mašina na velikom ekranu iznad pogona.',
        },
        {
          title: 'Podrška korisnicima',
          body: 'Broj otvorenih tiketa i vreme odgovora, vidljivi celom timu bez otvaranja alata.',
        },
      ],
      setupSteps: [
        {
          title: 'Objavite izveštaj',
          body: 'U Power BI-ju izaberite „Publish to web" i sačuvajte dobijenu adresu.',
        },
        {
          title: 'Nalepite link',
          body: 'Adresa mora da počinje sa app.powerbi.com i vodi na prikaz izveštaja, ne na uređivanje.',
        },
        {
          title: 'Odredite osvežavanje',
          body: 'Podesite na koliko minuta se izveštaj ponovo učitava, pa objavite.',
        },
      ],
      requirements: {
        account:
          'Na ekranu nije potreban nalog. Izveštaj mora biti objavljen kroz „Publish to web".',
        dataSource: 'Prikazuje se javno objavljen Power BI izveštaj sa adrese koju nalepite.',
        network: 'Stalna veza je obavezna, izveštaj se učitava sa Microsoftovih servera.',
        refreshBehavior: 'Ponovo se učitava na interval koji sami zadate.',
        offlineBehavior:
          'Bez veze izveštaj ne može da se učita, pa se ta stavka preskače u rotaciji dok se mreža ne vrati.',
        limitations:
          'Radi samo sa izveštajem objavljenim kroz „Publish to web". Obična adresa izveštaja traži prijavu i na ekranu bez čoveka se neće učitati. Imajte u vidu da „Publish to web" čini izveštaj dostupnim svakome ko ima link, nemojte ga koristiti za poverljive podatke.',
      },
      faq: [
        {
          q: 'Zašto moj izveštaj prikazuje ekran za prijavu?',
          a: 'Zato što je nalepljena obična adresa izveštaja. Potrebna je adresa dobijena kroz „Publish to web".',
        },
        {
          q: 'Da li su podaci tada javni?',
          a: 'Jesu. „Publish to web" objavljuje izveštaj svakome ko ima link. Za poverljive brojeve napravite poseban izveštaj bez njih.',
        },
        {
          q: 'Radi li bez interneta?',
          a: 'Ne. Izveštaj se učitava sa Microsoftovih servera, pa ova stavka izlazi iz rotacije dok nema veze.',
        },
      ],
    },
    en: {
      heroTitle: 'A Power BI report on the wall, with nobody signing in',
      intent: {
        primaryQuery: 'power bi report on a tv screen',
        intentType: 'commercial-investigation',
        audience: 'teams already building reports in Power BI who want them visible in the room',
        jobToBeDone:
          'Keep a published Power BI report on a screen permanently, with nobody signing in to it.',
        uniquePromise:
          'Explains the difference between a publish-to-web report and a private one, and why the private one cannot go on a screen.',
        notTargeting: 'Building reports; private reports behind a login.',
      },
      summary:
        'Publish the report with Power BI’s “Publish to web”, paste the link, and it holds the screen and reloads itself.',
      benefits: [
        'The numbers live in the room instead of being opened on request',
        'No account and no sign-in on the screen itself',
        'You set how often the report reloads',
      ],
      features: [
        {
          title: 'Runs with nobody at a keyboard',
          body: 'A report published for public viewing has no login screen, so it loads on its own when the player comes back after a power cut.',
        },
        {
          title: 'A refresh you choose',
          body: 'Set how many minutes between reloads, often for a daily operations board, rarely for a monthly review.',
        },
        {
          title: 'Kept in its own frame',
          body: 'The report renders inside a sandboxed frame, so it cannot reach the rest of the screen or the other apps in the layout.',
        },
      ],
      useCases: [
        {
          title: 'A sales team',
          body: 'Target against actual on the office wall, the same figures management reads in Power BI.',
        },
        {
          title: 'A control room',
          body: 'Downtime and machine utilisation on a large screen above the floor.',
        },
        {
          title: 'Customer support',
          body: 'Open tickets and response times, visible to the whole team without opening the tool.',
        },
      ],
      setupSteps: [
        {
          title: 'Publish the report',
          body: 'In Power BI choose “Publish to web” and keep the address it gives you.',
        },
        {
          title: 'Paste the link',
          body: 'The address has to start with app.powerbi.com and point at the view of the report, not the editor.',
        },
        {
          title: 'Set the reload',
          body: 'Decide how many minutes between reloads, then publish.',
        },
      ],
      requirements: {
        account:
          'No account is needed on the screen. The report must be published with “Publish to web”.',
        dataSource: 'A publicly published Power BI report is loaded from the address you paste.',
        network: 'A permanent connection is required. The report loads from Microsoft’s servers.',
        refreshBehavior: 'Reloaded on the interval you set.',
        offlineBehavior:
          'Without a connection the report cannot load, so the item is skipped in rotation until the network returns.',
        limitations:
          'Only works with a report published through “Publish to web”. A normal report address asks for a login and will not load on an unattended screen. Note that “Publish to web” makes the report readable by anyone with the link, do not use it for confidential data.',
      },
      faq: [
        {
          q: 'Why does my report show a login screen?',
          a: 'Because a normal report address was pasted. You need the address produced by “Publish to web”.',
        },
        {
          q: 'Does that make the data public?',
          a: 'Yes. “Publish to web” exposes the report to anyone with the link. For confidential figures, build a separate report without them.',
        },
        {
          q: 'Does it work without internet?',
          a: 'No. The report loads from Microsoft’s servers, so this item drops out of rotation while the connection is down.',
        },
      ],
    },
  },

  gslides: {
    sr: {
      heroTitle: 'Google Slides sa vašeg Drive-a, izmena se vidi odmah',
      intent: {
        primaryQuery: 'google slides prezentacija na ekranu sa drive naloga',
        intentType: 'commercial-investigation',
        audience: 'timovi koji prezentacije drže u Google Drive-u i ne žele da ih izvoze',
        jobToBeDone:
          'Vrteti privatnu Google Slides prezentaciju na ekranima, tako da izmena stigne sama.',
        uniquePromise:
          'Objašnjava zašto se izmena vidi odmah preko Drive obaveštenja i zašto slajdovi rade bez mreže.',
        notTargeting: 'PowerPoint sa OneDrive-a; izrada prezentacija.',
      },
      summary:
        'Povežete Google nalog, izaberete prezentaciju sa Drive-a, i ona se vrti na ekranima. Kada je izmenite, ekrani pređu na novu verziju.',
      benefits: [
        'Prezentacija ostaje privatna, ne mora da se objavljuje na vebu',
        'Izmena u Drive-u stiže na ekran u trenutku, ne pri sledećoj proveri',
        'Slajdovi se čuvaju na uređaju, pa prikaz preživi prekid veze',
      ],
      features: [
        {
          title: 'Izmena stiže sama',
          body: 'Drive javlja da je prezentacija promenjena, pa se slajdovi ponovo izvoze i ekrani pređu na novu verziju bez ijednog klika.',
        },
        {
          title: 'Slajdovi žive na uređaju',
          body: 'Izvezene slike se čuvaju kod nas i preuzimaju na plejer, umesto da se svaki put povlače sa Google-a. Zato prikaz radi i kad veza padne.',
        },
        {
          title: 'Ograničenje broja slajdova',
          body: 'Zadajete koliko prvih slajdova ide na ekran, pa dugačak deck ne mora da se cepa u zaseban fajl.',
        },
      ],
      useCases: [
        {
          title: 'Nedeljni pregled tima',
          body: 'Deck koji tim ionako popunjava pred sastanak ostaje na ekranu do sledeće nedelje.',
        },
        {
          title: 'Škola i fakultet',
          body: 'Obaveštenja pripremljena u Slides-u idu na ekrane u hodniku, bez izvoza u PDF.',
        },
        {
          title: 'Dobrodošlica gostima',
          body: 'Slajd sa imenom gosta se izmeni u Drive-u ujutru i na ekranu u holu je istog trena.',
        },
      ],
      setupSteps: [
        {
          title: 'Povežite Google nalog',
          body: 'Prijavite se jednom. Tražimo dozvolu za čitanje fajlova, ne za izmenu.',
        },
        {
          title: 'Izaberite prezentaciju',
          body: 'Sa Drive-a izaberite deck koji ide na ekran.',
        },
        {
          title: 'Podesite tempo i objavite',
          body: 'Odredite koliko sekundi slajd stoji i koliko slajdova se prikazuje.',
        },
      ],
      requirements: {
        account:
          'Google nalog sa pristupom prezentaciji, povezan jednom. Traži se dozvola samo za čitanje.',
        dataSource: 'Slajdovi se izvoze iz izabrane Google Slides prezentacije kao slike.',
        network: 'Veza je potrebna za preuzimanje novih slajdova posle izmene.',
        refreshBehavior:
          'Izmena u Drive-u pokreće ponovni izvoz odmah; kao rezerva, proverava se i na svakih petnaest minuta.',
        offlineBehavior: 'Preuzeti slajdovi ostaju na uređaju i prikazuju se bez mreže.',
        limitations:
          'Animacije i prelazi se ne prikazuju, slajdovi se izvoze kao slike. Za pokret koristite video.',
      },
      faq: [
        {
          q: 'Mora li prezentacija da bude javna?',
          a: 'Ne. Ostaje privatna u vašem Drive-u; čita se kroz povezani nalog.',
        },
        {
          q: 'Koliko brzo se izmena vidi?',
          a: 'Gotovo odmah, Drive javi da je fajl promenjen, pa se slajdovi ponovo izvoze.',
        },
        {
          q: 'Radi li bez interneta?',
          a: 'Radi. Slajdovi su preuzeti na plejer, pa prekid veze ne prekida prikaz.',
        },
      ],
    },
    en: {
      heroTitle: 'Google Slides from your Drive, updated the moment you edit',
      intent: {
        primaryQuery: 'google slides deck on a screen from drive',
        intentType: 'commercial-investigation',
        audience: 'teams keeping decks in Google Drive who do not want to export them',
        jobToBeDone:
          'Loop a private Google Slides deck on the screens so an edit reaches them on its own.',
        uniquePromise:
          'Explains why an edit shows almost at once through a Drive notification and why the slides survive an outage.',
        notTargeting: 'PowerPoint from OneDrive; building presentations.',
      },
      summary:
        'Connect a Google account, pick a deck from Drive, and it loops on the screens. Edit it and the screens move to the new version.',
      benefits: [
        'The deck stays private, nothing has to be published to the web',
        'An edit in Drive reaches the screen at once, not at the next check',
        'Slides are stored on the device, so the display survives an outage',
      ],
      features: [
        {
          title: 'Edits arrive on their own',
          body: 'Drive reports that the deck changed, the slides are exported again and the screens move to the new version with nobody clicking anything.',
        },
        {
          title: 'Slides live on the device',
          body: 'Exported images are kept by us and downloaded to the player instead of being pulled from Google each time. That is why the display keeps running when the link drops.',
        },
        {
          title: 'A cap on slides',
          body: 'Set how many of the leading slides go to the screen, so a long deck need not be split into a separate file.',
        },
      ],
      useCases: [
        {
          title: 'A weekly team review',
          body: 'The deck the team already fills in before the meeting stays on the screen until the next one.',
        },
        {
          title: 'Schools and universities',
          body: 'Notices prepared in Slides go to the corridor screens with no export to PDF.',
        },
        {
          title: 'Welcoming visitors',
          body: 'A slide with the visitor’s name is edited in Drive in the morning and is on the lobby screen immediately.',
        },
      ],
      setupSteps: [
        {
          title: 'Connect a Google account',
          body: 'Sign in once. We ask for permission to read files, not to change them.',
        },
        {
          title: 'Pick the deck',
          body: 'Choose the presentation from Drive that should go on the screen.',
        },
        {
          title: 'Set the pace and publish',
          body: 'Decide how long a slide holds and how many slides are shown.',
        },
      ],
      requirements: {
        account:
          'A Google account with access to the deck, connected once. Only read permission is requested.',
        dataSource: 'Slides are exported as images from the chosen Google Slides presentation.',
        network: 'A connection is needed to download new slides after an edit.',
        refreshBehavior:
          'A change in Drive triggers an immediate re-export; as a fallback it is also checked every fifteen minutes.',
        offlineBehavior: 'Downloaded slides stay on the device and play without a network.',
        limitations:
          'Animations and transitions are not shown, slides are exported as images. For motion, use video.',
      },
      faq: [
        {
          q: 'Does the deck have to be public?',
          a: 'No. It stays private in your Drive and is read through the connected account.',
        },
        {
          q: 'How quickly does an edit show?',
          a: 'Almost immediately, Drive reports the file changed and the slides are exported again.',
        },
        {
          q: 'Does it work without internet?',
          a: 'Yes. The slides are downloaded to the player, so an outage does not interrupt the display.',
        },
      ],
    },
  },
  instagram: {
    sr: {
      heroTitle: 'Instagram profil na ekranu u lokalu',
      intent: {
        primaryQuery: 'instagram objave na ekranu u lokalu',
        intentType: 'commercial-investigation',
        audience: 'lokali i brendovi koji već redovno objavljuju na Instagramu',
        jobToBeDone:
          'Preneti poslednje objave sa profila na ekran u prostoru, bez ijednog ručnog otpremanja slike.',
        uniquePromise:
          'Objašnjava zašto je potreban profesionalni nalog povezan sa Facebook stranicom, a lični ne prolazi.',
        notTargeting: 'Objavljivanje na Instagram; Facebook stranica.',
      },
      summary:
        'Povežete nalog, izaberete profil, i poslednje objave se smenjuju na ekranu, jedna preko celog ekrana ili više njih u mreži.',
      benefits: [
        'Ono što ionako objavljujete vidi i gost koji vas ne prati',
        'Nema drugog posla, objavite na Instagramu i ekran se sam menja',
        'Više ekrana sa istim profilom troši jedno povlačenje',
      ],
      features: [
        {
          title: 'Spotlight ili mreža',
          body: 'Jedna slika preko celog ekrana zaustavlja pogled u prolazu; mreža pokazuje da profil živi i da objava ima puno.',
        },
        {
          title: 'Opis uz sliku',
          body: 'Tekst objave može da stoji uz sliku ili da se sakrije kada je ekran daleko od gledaoca i tekst se ionako ne čita.',
        },
        {
          title: 'Tempo smenjivanja',
          body: 'Zadajete koliko sekundi objava stoji, pa se ritam uklapa u to koliko se gost zadržava.',
        },
      ],
      useCases: [
        {
          title: 'Kafić i restoran',
          body: 'Fotografije jela sa profila na ekranu iznad šanka, iste one koje već objavljujete.',
        },
        {
          title: 'Salon i teretana',
          body: 'Radovi, treninzi i najave na ekranu u čekaonici, bez posebne pripreme sadržaja.',
        },
        {
          title: 'Izlog radnje',
          body: 'Nova kolekcija sa profila u izlogu, vidljiva i kad je radnja zatvorena.',
        },
      ],
      setupSteps: [
        {
          title: 'Povežite Facebook nalog',
          body: 'Prijavite se nalogom koji upravlja stranicom povezanom sa vašim Instagram profilom.',
        },
        {
          title: 'Izaberite profil',
          body: 'Iz liste povezanih naloga izaberite onaj čije objave idu na ekran.',
        },
        {
          title: 'Podesite prikaz i objavite',
          body: 'Spotlight ili mreža, koliko sekundi objava stoji i da li se vidi opis.',
        },
      ],
      requirements: {
        account:
          'Facebook nalog koji upravlja stranicom sa povezanim profesionalnim (Business ili Creator) Instagram nalogom.',
        dataSource: 'Povlače se poslednje objave sa izabranog Instagram naloga.',
        network: 'Stalna veza je obavezna, slike se preuzimaju sa Meta servera.',
        refreshBehavior: 'Proverava se na svaka dva minuta.',
        offlineBehavior:
          'Bez veze slike ne mogu da se učitaju, pa ova stavka izlazi iz rotacije dok se mreža ne vrati.',
        limitations:
          'Lični Instagram nalog nije podržan: mora profesionalni, povezan sa Facebook stranicom. Za tuđe naloge potrebno je i odobrenje kroz Meta proveru aplikacije.',
      },
      faq: [
        {
          q: 'Radi li sa običnim, ličnim profilom?',
          a: 'Ne. Nalog mora biti prebačen u Business ili Creator i povezan sa Facebook stranicom. To je besplatno i radi se u podešavanjima Instagrama.',
        },
        {
          q: 'Mogu li da prikažem tuđi profil?',
          a: 'Samo uz odobrenje kroz Meta proveru aplikacije. Sopstveni nalog radi odmah po povezivanju.',
        },
        {
          q: 'Koliko brzo nova objava stigne na ekran?',
          a: 'U roku od dva minuta.',
        },
      ],
    },
    en: {
      heroTitle: 'An Instagram profile on the screen in your space',
      intent: {
        primaryQuery: 'instagram posts on a screen in a venue',
        intentType: 'commercial-investigation',
        audience: 'venues and brands already posting regularly on Instagram',
        jobToBeDone:
          'Carry the latest posts from a profile onto a screen in the room without uploading a single image by hand.',
        uniquePromise:
          'Explains why a professional account linked to a Facebook Page is required and a personal one is not enough.',
        notTargeting: 'Posting to Instagram; a Facebook Page feed.',
      },
      summary:
        'Connect an account, pick the profile, and its recent posts rotate on the screen, one filling it, or several in a grid.',
      benefits: [
        'What you post anyway reaches the guest who does not follow you',
        'No second job, post to Instagram and the screen changes itself',
        'Several screens on one profile cost a single fetch',
      ],
      features: [
        {
          title: 'Spotlight or grid',
          body: 'One image filling the screen stops a passer-by; a grid shows the profile is alive and posts often.',
        },
        {
          title: 'The caption, or not',
          body: 'The post text can sit beside the image or be hidden where the screen is too far away for anyone to read it.',
        },
        {
          title: 'A pace you set',
          body: 'Choose how long a post holds, so the rhythm matches how long a guest actually stays.',
        },
      ],
      useCases: [
        {
          title: 'A café or restaurant',
          body: 'The food photography from the profile on a screen above the bar, the same pictures you already publish.',
        },
        {
          title: 'A salon or gym',
          body: 'Work, sessions and announcements on a waiting-area screen, with no separate content to prepare.',
        },
        {
          title: 'A shop window',
          body: 'The new collection from the profile in the window, visible after closing time too.',
        },
      ],
      setupSteps: [
        {
          title: 'Connect a Facebook account',
          body: 'Sign in with the account that manages the Page linked to your Instagram profile.',
        },
        {
          title: 'Pick the profile',
          body: 'Choose the connected account whose posts should go to the screen.',
        },
        {
          title: 'Set the layout and publish',
          body: 'Spotlight or grid, how long a post holds, and whether the caption shows.',
        },
      ],
      requirements: {
        account:
          'A Facebook account managing a Page with a linked professional (Business or Creator) Instagram account.',
        dataSource: 'Recent posts are fetched from the chosen Instagram account.',
        network: 'A permanent connection is required, images stream from Meta’s servers.',
        refreshBehavior: 'Checked every two minutes.',
        offlineBehavior:
          'Without a connection the images cannot load, so this item drops out of rotation until the network returns.',
        limitations:
          'A personal Instagram account is not supported. It must be professional and linked to a Facebook Page. Accounts you do not own also need clearance through Meta App Review.',
      },
      faq: [
        {
          q: 'Does it work with an ordinary personal profile?',
          a: 'No. The account has to be switched to Business or Creator and linked to a Facebook Page. That is free and done in Instagram’s settings.',
        },
        {
          q: 'Can I show someone else’s profile?',
          a: 'Only with clearance through Meta App Review. Your own account works as soon as it is connected.',
        },
        {
          q: 'How quickly does a new post reach the screen?',
          a: 'Within two minutes.',
        },
      ],
    },
  },

  facebook: {
    sr: {
      heroTitle: 'Objave sa Facebook stranice, na ekranu u prostoriji',
      intent: {
        primaryQuery: 'facebook stranica na ekranu u ustanovi',
        intentType: 'commercial-investigation',
        audience: 'ustanove i lokalne firme čija publika prati zvaničnu Facebook stranicu',
        jobToBeDone:
          'Pokazati obaveštenja sa stranice ljudima koji su fizički došli, a stranicu ne prate.',
        uniquePromise:
          'Objašnjava koje objave sa stranice stižu na ekran i koja dozvola je za to potrebna.',
        notTargeting: 'Objavljivanje na Facebook; Instagram profil.',
      },
      summary:
        'Povežete Facebook nalog, izaberete stranicu kojom upravljate, i njene poslednje objave se smenjuju na ekranu.',
      benefits: [
        'Isto obaveštenje stiže i onlajn publici i onome ko je došao lično',
        'Objava se piše jednom, na mestu na kome se ionako piše',
        'Nema zasebnog sadržaja koji treba održavati za ekran',
      ],
      features: [
        {
          title: 'Samo objave stranice',
          body: 'Prikazuje se ono što je stranica objavila, ne komentari i ne tuđe objave na njoj. Ekran u ustanovi ne treba da prenosi raspravu.',
        },
        {
          title: 'Spotlight ili mreža',
          body: 'Jedna objava preko celog ekrana za obaveštenje koje mora da se pročita, mreža za utisak da se stalno nešto dešava.',
        },
        {
          title: 'Tekst uz objavu',
          body: 'Tekst može da stoji uz sliku ili da se skloni kada je ekran predaleko da bi se čitao.',
        },
      ],
      useCases: [
        {
          title: 'Mesna zajednica i opština',
          body: 'Obaveštenja o radovima i rasporedu na ekranu u šalter sali, ista ona sa zvanične stranice.',
        },
        {
          title: 'Sportski klub',
          body: 'Najave utakmica i rezultati na ekranu u hali, bez posebne pripreme.',
        },
        {
          title: 'Prodavnica u komšiluku',
          body: 'Akcije objavljene na stranici vide i kupci koji su ušli, ne samo oni koji prate.',
        },
      ],
      setupSteps: [
        {
          title: 'Povežite Facebook nalog',
          body: 'Prijavite se nalogom koji upravlja stranicom. Tražimo dozvolu za čitanje objava.',
        },
        {
          title: 'Izaberite stranicu',
          body: 'Iz liste stranica kojima upravljate izaberite onu koja ide na ekran.',
        },
        {
          title: 'Podesite prikaz i objavite',
          body: 'Spotlight ili mreža, koliko sekundi objava stoji i da li se vidi tekst.',
        },
      ],
      requirements: {
        account: 'Facebook nalog koji upravlja stranicom, povezan jednom.',
        dataSource: 'Povlače se poslednje objavljene objave sa izabrane stranice.',
        network: 'Stalna veza je obavezna: slike se preuzimaju sa Meta servera.',
        refreshBehavior: 'Proverava se na svaka dva minuta.',
        offlineBehavior:
          'Bez veze slike ne mogu da se učitaju, pa ova stavka izlazi iz rotacije dok se mreža ne vrati.',
        limitations:
          'Prikazuju se samo objave same stranice. Za stranice kojima ne upravljate potrebno je odobrenje kroz Meta proveru aplikacije.',
      },
      faq: [
        {
          q: 'Vide li se komentari?',
          a: 'Ne. Prikazuju se samo objave stranice, pa na ekran ne može da dospe tuđi komentar.',
        },
        {
          q: 'Može li SignageWall da objavi nešto umesto mene?',
          a: 'Ne. Tražena dozvola je isključivo za čitanje objava.',
        },
        {
          q: 'Koliko brzo nova objava stigne na ekran?',
          a: 'U roku od dva minuta.',
        },
      ],
    },
    en: {
      heroTitle: 'Posts from your Facebook Page, on the screen in the room',
      intent: {
        primaryQuery: 'facebook page posts on an indoor screen',
        intentType: 'commercial-investigation',
        audience: 'institutions and local businesses whose audience follows an official Page',
        jobToBeDone:
          'Show notices from the Page to the people who walked in and do not follow it online.',
        uniquePromise:
          'Explains which posts from a Page reach the screen and which permission that requires.',
        notTargeting: 'Posting to Facebook; an Instagram profile.',
      },
      summary:
        'Connect a Facebook account, pick a Page you manage, and its recent posts rotate on the screen.',
      benefits: [
        'The same notice reaches the online audience and the person who came in',
        'A post is written once, where it is already written',
        'No separate content to maintain for the screen',
      ],
      features: [
        {
          title: 'Only the Page’s own posts',
          body: 'What the Page published is shown, not comments, not what others posted to it. A screen in a public building should not carry an argument.',
        },
        {
          title: 'Spotlight or grid',
          body: 'One post filling the screen for a notice that has to be read; a grid for the sense that something is always happening.',
        },
        {
          title: 'The text, or not',
          body: 'Post text can sit with the image or be dropped where the screen is too far away to read.',
        },
      ],
      useCases: [
        {
          title: 'A council or public office',
          body: 'Notices about works and opening hours on a screen in the service hall, the same ones on the official Page.',
        },
        {
          title: 'A sports club',
          body: 'Fixtures and results on a screen in the hall, with nothing extra to prepare.',
        },
        {
          title: 'A neighbourhood shop',
          body: 'Offers posted to the Page reach the customers who walked in, not only the ones who follow.',
        },
      ],
      setupSteps: [
        {
          title: 'Connect a Facebook account',
          body: 'Sign in with the account that manages the Page. We ask for permission to read posts.',
        },
        {
          title: 'Pick the Page',
          body: 'Choose which of the Pages you manage should go to the screen.',
        },
        {
          title: 'Set the layout and publish',
          body: 'Spotlight or grid, how long a post holds, and whether the text shows.',
        },
      ],
      requirements: {
        account: 'A Facebook account that manages the Page, connected once.',
        dataSource: 'Recently published posts are fetched from the chosen Page.',
        network: 'A permanent connection is required, images stream from Meta’s servers.',
        refreshBehavior: 'Checked every two minutes.',
        offlineBehavior:
          'Without a connection the images cannot load, so this item drops out of rotation until the network returns.',
        limitations:
          'Only the Page’s own posts are shown. Pages you do not manage also need clearance through Meta App Review.',
      },
      faq: [
        {
          q: 'Are comments shown?',
          a: 'No. Only the Page’s own posts are displayed, so no one else’s comment can reach the screen.',
        },
        {
          q: 'Can SignageWall post on my behalf?',
          a: 'No. The permission requested is read-only.',
        },
        {
          q: 'How quickly does a new post reach the screen?',
          a: 'Within two minutes.',
        },
      ],
    },
  },

  linkedin: {
    sr: {
      heroTitle: 'Kompanijska LinkedIn stranica na ekranu u kancelariji',
      intent: {
        primaryQuery: 'linkedin objave kompanije na ekranu u kancelariji',
        intentType: 'commercial-investigation',
        audience: 'firme koje grade poslodavački brend i redovno objavljuju na LinkedIn stranici',
        jobToBeDone:
          'Izneti objave kompanijske stranice na ekrane u kancelariji i recepciji, da ih zaposleni i posetioci vide.',
        uniquePromise:
          'Objašnjava zašto se objave prikazuju kao tekst bez slika i šta to znači za izgled ekrana.',
        notTargeting: 'Objavljivanje na LinkedIn; lični LinkedIn profil.',
      },
      summary:
        'Povežete nalog koji administrira stranicu, izaberete kompaniju, i njene poslednje objave se smenjuju na ekranu kao tekst.',
      benefits: [
        'Zaposleni vide šta firma javno govori o sebi',
        'Kandidat u recepciji čita iste vesti koje vidi i tržište',
        'Objava se piše jednom i stiže i na zid, ne samo u feed',
      ],
      features: [
        {
          title: 'Tekst koji se čita iz prolaza',
          body: 'Pošto nema slika, tekst dobija ceo ekran i postavlja se krupno, što je zapravo bolje za objavu koja se čita u hodu.',
        },
        {
          title: 'Jedna objava ili više njih',
          body: 'Spotlight za najnoviju vest, mreža kada je poenta pokazati da se na stranici stalno nešto dešava.',
        },
        {
          title: 'Samo zvanična stranica',
          body: 'Prikazuju se objave kompanijske stranice, ne lični profili zaposlenih.',
        },
      ],
      useCases: [
        {
          title: 'Recepcija',
          body: 'Kandidat koji čeka razgovor čita objave o projektima i zapošljavanju umesto da gleda u zid.',
        },
        {
          title: 'Zajednički prostor',
          body: 'Zaposleni vide vesti o firmi u isto vreme kad i tržište, bez internog mejla.',
        },
        {
          title: 'Ekran na konferenciji',
          body: 'Objave sa stranice na štandu pokazuju čime se tim bavio poslednjih meseci.',
        },
      ],
      setupSteps: [
        {
          title: 'Povežite LinkedIn nalog',
          body: 'Prijavite se nalogom koji je administrator kompanijske stranice.',
        },
        {
          title: 'Izaberite stranicu',
          body: 'Iz liste organizacija kojima ste administrator izaberite onu koja ide na ekran.',
        },
        {
          title: 'Podesite prikaz i objavite',
          body: 'Spotlight ili mreža, koliko sekundi objava stoji, i tema.',
        },
      ],
      requirements: {
        account: 'LinkedIn nalog koji je administrator kompanijske stranice, povezan jednom.',
        dataSource: 'Povlače se poslednje objave sa izabrane kompanijske stranice.',
        network: 'Veza je potrebna za povlačenje novih objava.',
        refreshBehavior: 'Proverava se na svakih trideset minuta.',
        offlineBehavior: 'Poslednje povučene objave ostaju na ekranu i bez mreže.',
        limitations:
          'Objave se prikazuju bez slika. Slika u LinkedIn objavi dostupna je samo uz dozvolu za pisanje po vašoj stranici, koju namerno ne tražimo, pa se prikazuje tekst. Lični profili nisu podržani.',
      },
      faq: [
        {
          q: 'Zašto se ne vide slike iz objava?',
          a: 'Zato što LinkedIn otključava slike tek uz dozvolu za pisanje po vašoj stranici. Ne tražimo pristup koji nam ne treba, pa se prikazuje tekst objave.',
        },
        {
          q: 'Može li da prikaže lični profil?',
          a: 'Ne. Podržane su samo kompanijske stranice kojima ste administrator.',
        },
        {
          q: 'Koliko brzo nova objava stigne?',
          a: 'U roku od trideset minuta.',
        },
      ],
    },
    en: {
      heroTitle: 'Your company LinkedIn Page on an office screen',
      intent: {
        primaryQuery: 'company linkedin posts on an office screen',
        intentType: 'commercial-investigation',
        audience: 'companies building an employer brand and posting regularly on a LinkedIn Page',
        jobToBeDone:
          'Carry company Page posts onto office and reception screens so staff and visitors read them.',
        uniquePromise:
          'Explains why posts are shown as text with no images and what that means for how the screen looks.',
        notTargeting: 'Posting to LinkedIn; a personal LinkedIn profile.',
      },
      summary:
        'Connect the account that administers the Page, pick the company, and its recent posts rotate on the screen as text.',
      benefits: [
        'Staff see what the company says about itself in public',
        'A candidate in reception reads the same news the market does',
        'A post is written once and reaches the wall, not only the feed',
      ],
      features: [
        {
          title: 'Text that reads from a walkway',
          body: 'With no images, the text gets the whole screen and is set large, which suits a post read while walking past.',
        },
        {
          title: 'One post or several',
          body: 'Spotlight for the latest news, a grid when the point is that the Page is constantly active.',
        },
        {
          title: 'The official Page only',
          body: 'Posts come from the company Page, not from employees’ personal profiles.',
        },
      ],
      useCases: [
        {
          title: 'Reception',
          body: 'A candidate waiting for an interview reads about projects and hiring instead of staring at a wall.',
        },
        {
          title: 'A shared area',
          body: 'Staff learn company news at the same moment the market does, with no internal email.',
        },
        {
          title: 'A conference stand',
          body: 'Page posts on the stand show what the team has been working on for the past months.',
        },
      ],
      setupSteps: [
        {
          title: 'Connect a LinkedIn account',
          body: 'Sign in with the account that administers the company Page.',
        },
        {
          title: 'Pick the Page',
          body: 'Choose which of the organisations you administer should go to the screen.',
        },
        {
          title: 'Set the layout and publish',
          body: 'Spotlight or grid, how long a post holds, and the theme.',
        },
      ],
      requirements: {
        account: 'A LinkedIn account that administers the company Page, connected once.',
        dataSource: 'Recent posts are fetched from the chosen company Page.',
        network: 'A connection is needed to fetch new posts.',
        refreshBehavior: 'Checked every thirty minutes.',
        offlineBehavior: 'The last fetched posts stay on screen without a network.',
        limitations:
          'Posts are shown without images. LinkedIn only releases post images to an app holding write access to your Page, which we deliberately do not request. So the text is shown instead. Personal profiles are not supported.',
      },
      faq: [
        {
          q: 'Why are the images from posts missing?',
          a: 'Because LinkedIn only releases them to an app with write access to your Page. We do not ask for access we do not need, so the post text is shown.',
        },
        {
          q: 'Can it show a personal profile?',
          a: 'No. Only company Pages you administer are supported.',
        },
        {
          q: 'How quickly does a new post arrive?',
          a: 'Within thirty minutes.',
        },
      ],
    },
  },
  crypto: {
    sr: {
      heroTitle: 'Cene kriptovaluta na ekranu, u vašoj valuti',
      intent: {
        primaryQuery: 'cene kriptovaluta na ekranu',
        intentType: 'commercial-investigation',
        audience: 'menjačnice, kancelarije i prostori kojima je tabla sa cenama deo ponude',
        jobToBeDone:
          'Držati listu izabranih kriptovaluta sa dnevnom promenom stalno vidljivom na ekranu.',
        uniquePromise:
          'Objašnjava odakle cene dolaze, koliko često se osvežavaju i zašto nisu za trgovanje.',
        notTargeting: 'Trgovanje kriptovalutama; kursna lista deviza.',
      },
      summary:
        'Izaberete valute i valutu prikaza, i tabla sa cenama i promenom u poslednja 24 sata stoji na ekranu, osvežena sama.',
      benefits: [
        'Bez naloga i bez ključa, izaberete valute i tabla radi',
        'Promena u 24 sata odmah pokazuje da li je dan bio zelen ili crven',
        'Više ekrana sa istom listom troši jedan poziv ka izvoru',
      ],
      features: [
        {
          title: 'Vi birate listu',
          body: 'Prikazuje se tačno ono što ste izabrali. Tabla sa pet valuta koje vaši klijenti traže korisnija je od duge liste kroz koju niko ne gleda.',
        },
        {
          title: 'Cena u valuti koju gledaju',
          body: 'Vrednosti se prikazuju u valuti koju izaberete, pa gledalac ne mora ništa da preračunava.',
        },
        {
          title: 'Promena u 24 sata',
          body: 'Uz cenu stoji dnevna promena u procentima, obojena, i može da se sakrije kada je ekran namenjen samo informisanju.',
        },
      ],
      useCases: [
        {
          title: 'Menjačnica',
          body: 'Tabla sa cenama najtraženijih valuta pored šaltera, bez ručnog prepisivanja.',
        },
        {
          title: 'Kancelarija',
          body: 'Ekran sa listom valuta u prostoru tima koji ih prati kroz dan.',
        },
        {
          title: 'Kafić uz koledž',
          body: 'Tabla sa cenama kao deo ambijenta, uz ostali sadržaj u rotaciji.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite valute',
          body: 'Dodajte one koje vaši gosti zaista prate. Kratka lista se čita iz prolaza.',
        },
        {
          title: 'Izaberite valutu prikaza',
          body: 'Odredite u kojoj valuti se cene prikazuju.',
        },
        {
          title: 'Podesite izgled i objavite',
          body: 'Odlučite da li se prikazuje dnevna promena, pa izaberite temu.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog ni ključ ka berzi.',
        dataSource: 'Cene dolaze sa CoinGecko-vog javnog servisa.',
        network: 'Veza je potrebna za povlačenje novih cena.',
        refreshBehavior: 'Osvežava se na svakih pet minuta.',
        offlineBehavior: 'Poslednje povučene cene ostaju na ekranu dok se veza ne vrati.',
        limitations:
          'Cene se osvežavaju na pet minuta i informativne su, nisu berzanski prikaz u realnom vremenu i ne treba da budu osnov za trgovanje.',
      },
      faq: [
        {
          q: 'Treba li mi nalog na berzi?',
          a: 'Ne. Cene se povlače sa javnog servisa, bez naloga i bez ključa.',
        },
        {
          q: 'Koliko su cene sveže?',
          a: 'Osvežavaju se na pet minuta, što je namerno, izvor je besplatan i ima ograničenje broja poziva.',
        },
        {
          q: 'Koliko valuta mogu da prikažem?',
          a: 'Koliko izaberete, ali kratka lista se čita mnogo bolje sa udaljenosti.',
        },
      ],
    },
    en: {
      heroTitle: 'Crypto prices on the screen, in the currency you read',
      intent: {
        primaryQuery: 'live crypto prices on a display',
        intentType: 'commercial-investigation',
        audience: 'exchange desks, offices and venues where a price board is part of the service',
        jobToBeDone:
          'Keep a board of chosen coins with the daily change permanently visible on a screen.',
        uniquePromise:
          'Explains where the prices come from, how often they refresh and why they are not for trading.',
        notTargeting: 'Trading crypto; a foreign exchange rate board.',
      },
      summary:
        'Pick the coins and the display currency, and a board of prices with the 24-hour change holds the screen, refreshed on its own.',
      benefits: [
        'No account and no API key. Pick the coins and the board runs',
        'The 24-hour change shows at a glance whether the day was green or red',
        'Many screens on one list cost a single call upstream',
      ],
      features: [
        {
          title: 'You choose the list',
          body: 'Exactly what you selected is shown. A board of five coins your customers ask about beats a long list nobody scans.',
        },
        {
          title: 'Priced in what they read',
          body: 'Values appear in the currency you choose, so the viewer converts nothing in their head.',
        },
        {
          title: 'The 24-hour change',
          body: 'The daily move sits beside the price in colour, and can be hidden where the screen is purely informational.',
        },
      ],
      useCases: [
        {
          title: 'An exchange desk',
          body: 'A board of the most requested coins beside the counter, with nothing rewritten by hand.',
        },
        {
          title: 'An office',
          body: 'A screen listing the coins a team follows through the day.',
        },
        {
          title: 'A campus café',
          body: 'A price board as part of the ambience, alongside the rest of the rotation.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the coins',
          body: 'Add the ones your audience actually follows. A short list reads from a walkway.',
        },
        {
          title: 'Pick the display currency',
          body: 'Decide which currency the prices are shown in.',
        },
        {
          title: 'Set the look and publish',
          body: 'Decide whether the daily change shows, then choose a theme.',
        },
      ],
      requirements: {
        account: 'No account and no exchange API key are needed.',
        dataSource: 'Prices come from CoinGecko’s public service.',
        network: 'A connection is needed to fetch new prices.',
        refreshBehavior: 'Refreshed every five minutes.',
        offlineBehavior: 'The last fetched prices stay on screen until the connection returns.',
        limitations:
          'Prices refresh every five minutes and are informational. This is not a real-time trading display and should not be the basis for a trade.',
      },
      faq: [
        {
          q: 'Do I need an exchange account?',
          a: 'No. Prices are pulled from a public service, with no account and no key.',
        },
        {
          q: 'How fresh are the prices?',
          a: 'They refresh every five minutes, deliberately. The source is free and rate-limited.',
        },
        {
          q: 'How many coins can I show?',
          a: 'As many as you pick, though a short list reads far better from a distance.',
        },
      ],
    },
  },

  currency: {
    sr: {
      heroTitle: 'Kursna lista na ekranu, osvežena svakog dana',
      intent: {
        primaryQuery: 'kursna lista na ekranu u menjačnici',
        intentType: 'commercial-investigation',
        audience: 'menjačnice, hoteli i recepcije koje gostima pokazuju odnos valuta',
        jobToBeDone:
          'Prikazati odnos osnovne valute prema izabranim valutama, bez ručnog unosa svakog jutra.',
        uniquePromise: 'Objašnjava da su kursevi informativni i pokriva i dinar, marku i denar.',
        notTargeting: 'Zvanična kursna lista za obračun; cene kriptovaluta.',
      },
      summary:
        'Izaberete osnovnu valutu i one koje se prate, i lista kurseva stoji na ekranu i sama se osvežava kada izađu novi.',
      benefits: [
        'Niko ne prepisuje kurseve na tablu svakog jutra',
        'Pokriveni su i dinar, konvertibilna marka i denar, ne samo velike valute',
        'Bez naloga i bez ključa, izaberete valute i lista radi',
      ],
      features: [
        {
          title: 'Osnovna valuta po vašem izboru',
          body: 'Postavljate valutu iz koje se gleda, pa lista odgovara tome kako vaši gosti razmišljaju o ceni.',
        },
        {
          title: 'Regionalne valute uključene',
          body: 'Skup podataka pokriva mnogo više od evropske korpe, pa dinar, marka i denar stoje uz evro i dolar.',
        },
        {
          title: 'Osvežava se kad ima šta',
          body: 'Kursevi se objavljuju jednom dnevno, pa se proverava na sat vremena, dovoljno da nov dan stigne brzo, bez uzaludnih poziva.',
        },
      ],
      useCases: [
        {
          title: 'Recepcija hotela',
          body: 'Gost odmah vidi odnos svoje valute prema domaćoj, bez pitanja na recepciji.',
        },
        {
          title: 'Menjačnica',
          body: 'Informativna lista na ekranu iznad šaltera, uz zvanične kurseve na samom mestu.',
        },
        {
          title: 'Turistička agencija',
          body: 'Odnos valuta destinacija koje prodajete, kao deo izloga.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite osnovnu valutu',
          body: 'Ona iz koje se gleda odnos. Obično domaća.',
        },
        {
          title: 'Dodajte valute koje se prate',
          body: 'Izaberite one koje vaši gosti stvarno traže.',
        },
        {
          title: 'Izaberite temu i objavite',
          body: 'Uklopite izgled u ostatak ekrana, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog ni ključ.',
        dataSource: 'Kursevi dolaze iz otvorenog skupa podataka o valutama.',
        network: 'Veza je potrebna za povlačenje novih kurseva.',
        refreshBehavior: 'Proverava se na sat vremena; sami kursevi se objavljuju jednom dnevno.',
        offlineBehavior: 'Poslednji povučeni kursevi ostaju na ekranu dok se veza ne vrati.',
        limitations:
          'Kursevi su informativni. Nisu zvanična kursna lista Narodne banke i ne treba ih koristiti kao osnov za obračun ili naplatu.',
      },
      faq: [
        {
          q: 'Da li je ovo zvanična kursna lista?',
          a: 'Nije. Kursevi su informativni, iz otvorenog skupa podataka. Za obračun koristite zvaničnu listu.',
        },
        {
          q: 'Ima li dinara?',
          a: 'Ima. Skup podataka pokriva i dinar, konvertibilnu marku i denar, pored velikih valuta.',
        },
        {
          q: 'Koliko često se menjaju?',
          a: 'Kursevi se objavljuju jednom dnevno, a ekran proverava na sat vremena.',
        },
      ],
    },
    en: {
      heroTitle: 'An exchange rate board, refreshed every day',
      intent: {
        primaryQuery: 'exchange rate board on a screen',
        intentType: 'commercial-investigation',
        audience:
          'exchange offices, hotels and receptions that show guests what currencies are worth',
        jobToBeDone:
          'Show a base currency against chosen currencies without anyone typing rates in each morning.',
        uniquePromise:
          'Explains that the rates are indicative and that regional currencies are covered, not only the major ones.',
        notTargeting: 'An official rate list for accounting; crypto prices.',
      },
      summary:
        'Pick a base currency and the ones to track, and the rate board holds the screen, refreshing itself when new rates are published.',
      benefits: [
        'Nobody copies rates onto a board each morning',
        'Regional currencies are covered, not only the major ones',
        'No account and no API key. Pick the currencies and it runs',
      ],
      features: [
        {
          title: 'A base you choose',
          body: 'You set the currency the rates are read from, so the board matches how your guests think about price.',
        },
        {
          title: 'Beyond the major basket',
          body: 'The dataset reaches well past the usual European set, so smaller regional currencies sit beside the euro and the dollar.',
        },
        {
          title: 'Refreshed when there is something to refresh',
          body: 'Rates publish once a day, so it checks hourly, quick to pick up the new day without hammering the source.',
        },
      ],
      useCases: [
        {
          title: 'A hotel reception',
          body: 'A guest sees what their currency is worth locally without asking at the desk.',
        },
        {
          title: 'An exchange office',
          body: 'An indicative board above the counter, alongside the official rates posted on site.',
        },
        {
          title: 'A travel agency',
          body: 'The currencies of the destinations you sell, as part of the window display.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the base currency',
          body: 'The one the rates are read from, usually the local one.',
        },
        {
          title: 'Add the currencies to track',
          body: 'Choose the ones your guests actually ask about.',
        },
        {
          title: 'Choose a theme and publish',
          body: 'Match the look to the rest of the screen, then publish.',
        },
      ],
      requirements: {
        account: 'No account and no key are needed.',
        dataSource: 'Rates come from an open currency dataset.',
        network: 'A connection is needed to fetch new rates.',
        refreshBehavior: 'Checked hourly; the rates themselves publish once a day.',
        offlineBehavior: 'The last fetched rates stay on screen until the connection returns.',
        limitations:
          'The rates are indicative. They are not a central bank’s official list and should not be used as the basis for accounting or for charging a customer.',
      },
      faq: [
        {
          q: 'Is this an official rate list?',
          a: 'No. The rates are indicative, from an open dataset. Use your central bank’s list for accounting.',
        },
        {
          q: 'Are smaller currencies included?',
          a: 'Yes. The dataset covers far more than the major basket, including regional currencies.',
        },
        {
          q: 'How often do they change?',
          a: 'Rates publish once a day, and the screen checks hourly.',
        },
      ],
    },
  },

  airquality: {
    sr: {
      heroTitle: 'Kvalitet vazduha za vašu lokaciju, na ekranu',
      intent: {
        primaryQuery: 'kvalitet vazduha na ekranu za lokaciju',
        intentType: 'commercial-investigation',
        audience: 'škole, ordinacije, teretane i kancelarije kojima je vazduh tema za goste',
        jobToBeDone:
          'Pokazati trenutni indeks kvaliteta vazduha i glavne zagađivače za jedno mesto.',
        uniquePromise:
          'Objašnjava razliku između evropske i američke skale i zašto broj nije isti.',
        notTargeting: 'Merenje vazduha u prostoriji; vremenska prognoza.',
      },
      summary:
        'Izaberete lokaciju i skalu, i na ekranu stoji trenutni indeks kvaliteta vazduha sa glavnim zagađivačima, osvežen sam.',
      benefits: [
        'Broj koji ljudi traže na telefonu stoji na zidu',
        'Ista lokacija na više ekrana troši jedno povlačenje',
        'Uklapa se uz vremensku prognozu, jer podaci dolaze od istog izvora',
      ],
      features: [
        {
          title: 'Evropska ili američka skala',
          body: 'Obe stižu u podacima, a vi birate koja se prikazuje. Za publiku u Evropi evropska skala je ona koju ljudi prepoznaju.',
        },
        {
          title: 'Glavni zagađivači uz indeks',
          body: 'Pored ukupnog broja vide se i vrednosti koje ga čine, pa se zna da li dan kvare čestice ili ozon.',
        },
        {
          title: 'Bilo koja lokacija',
          body: 'Postavlja se mesto po izboru, ne najbliži grad, što je bitno kada je ekran u naselju van centra.',
        },
      ],
      useCases: [
        {
          title: 'Škola',
          body: 'Ekran u holu pokazuje da li je dan za boravak napolju, pre nego što se odluči o velikom odmoru.',
        },
        {
          title: 'Ordinacija',
          body: 'Pacijentima sa disajnim tegobama podatak koji ih se direktno tiče, u čekaonici.',
        },
        {
          title: 'Teretana',
          body: 'Uz raspored treninga, podatak koji odlučuje da li se trči napolju ili unutra.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite lokaciju',
          body: 'Postavite mesto za koje se prikazuje vazduh.',
        },
        {
          title: 'Izaberite skalu',
          body: 'Evropska ili američka, u zavisnosti od toga koju vaša publika čita.',
        },
        {
          title: 'Izaberite temu i objavite',
          body: 'Uklopite izgled u ostatak ekrana, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog ni ključ.',
        dataSource:
          'Podaci dolaze sa Open-Meteo servisa za kvalitet vazduha, istog izvora koji koristi i aplikacija za vreme.',
        network: 'Veza je potrebna za povlačenje novih vrednosti.',
        refreshBehavior: 'Osvežava se na svakih petnaest minuta.',
        offlineBehavior: 'Poslednje povučene vrednosti ostaju na ekranu dok se veza ne vrati.',
        limitations:
          'Prikazuje vazduh napolju, na osnovu modela za izabranu lokaciju: ne meri vazduh u prostoriji i ne zamenjuje senzor.',
      },
      faq: [
        {
          q: 'Meri li ovo vazduh u mojoj prostoriji?',
          a: 'Ne. Prikazuje spoljašnji vazduh za izabranu lokaciju. Za vazduh unutra potreban je senzor.',
        },
        {
          q: 'Zašto se broj razlikuje od aplikacije na telefonu?',
          a: 'Najčešće zato što aplikacija koristi drugu skalu. Evropska i američka daju različite brojeve za isto stanje vazduha.',
        },
        {
          q: 'Mogu li da prikažem i vreme na istom ekranu?',
          a: 'Možete. Podaci dolaze od istog izvora, pa se dve aplikacije prirodno uklapaju u isti raspored.',
        },
      ],
    },
    en: {
      heroTitle: 'Air quality for your location, on the wall',
      intent: {
        primaryQuery: 'air quality index on a screen for a location',
        intentType: 'commercial-investigation',
        audience: 'schools, clinics, gyms and offices where outdoor air is a question guests ask',
        jobToBeDone:
          'Show the current air quality index and the main pollutants for one chosen place.',
        uniquePromise:
          'Explains the difference between the European and US scales and why the number is not the same.',
        notTargeting: 'Measuring indoor air; a weather forecast.',
      },
      summary:
        'Pick a location and a scale, and the current air quality index with its main pollutants holds the screen, refreshed on its own.',
      benefits: [
        'The number people reach for their phone to check sits on the wall',
        'One location across many screens costs a single fetch',
        'Pairs with the weather app, because the data comes from the same source',
      ],
      features: [
        {
          title: 'European or US scale',
          body: 'Both travel in the data and you choose which is shown. For a European audience the European scale is the one people recognise.',
        },
        {
          title: 'Pollutants beside the index',
          body: 'The values behind the headline number are shown too, so it is clear whether particulates or ozone are spoiling the day.',
        },
        {
          title: 'Any location',
          body: 'You set the place itself rather than the nearest city, which matters for a screen outside the centre.',
        },
      ],
      useCases: [
        {
          title: 'A school',
          body: 'A hall screen shows whether it is a day for outdoor break, before anyone decides.',
        },
        {
          title: 'A clinic',
          body: 'For patients with respiratory trouble, the figure that concerns them directly, in the waiting room.',
        },
        {
          title: 'A gym',
          body: 'Beside the class timetable, the number that decides whether a run happens outdoors or in.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the location',
          body: 'Set the place the reading is for.',
        },
        {
          title: 'Pick the scale',
          body: 'European or US, depending on which one your audience reads.',
        },
        {
          title: 'Choose a theme and publish',
          body: 'Match the look to the rest of the screen, then publish.',
        },
      ],
      requirements: {
        account: 'No account and no key are needed.',
        dataSource:
          'Readings come from the Open-Meteo air quality service, the same source the weather app uses.',
        network: 'A connection is needed to fetch new readings.',
        refreshBehavior: 'Refreshed every fifteen minutes.',
        offlineBehavior: 'The last fetched readings stay on screen until the connection returns.',
        limitations:
          'It shows modelled outdoor air for the chosen location. It does not measure the air in the room and does not replace a sensor.',
      },
      faq: [
        {
          q: 'Does this measure the air in my room?',
          a: 'No. It shows outdoor air for the chosen location. Indoor air needs a sensor.',
        },
        {
          q: 'Why does the number differ from my phone app?',
          a: 'Usually because the app uses the other scale. European and US indices give different numbers for the same air.',
        },
        {
          q: 'Can I show weather on the same screen?',
          a: 'Yes. The data comes from the same source, so the two apps sit naturally in one layout.',
        },
      ],
    },
  },

  'power-prices': {
    sr: {
      heroTitle: 'Berzanska cena struje i satna kriva za danas',
      intent: {
        primaryQuery: 'berzanska cena struje na ekranu',
        intentType: 'commercial-investigation',
        audience: 'proizvodnja, energetske firme i kancelarije koje potrošnju pomeraju po ceni',
        jobToBeDone:
          'Držati današnju berzansku cenu struje i satnu krivu vidljivom timu koji planira potrošnju.',
        uniquePromise:
          'Objašnjava da je reč o veleprodajnoj dan-unapred ceni, a ne o računu za struju.',
        notTargeting: 'Obračun računa za struju; praćenje potrošnje po brojilu.',
      },
      summary:
        'Izaberete tržišnu oblast i na ekranu stoji trenutna dan-unapred cena struje sa krivom po satima za danas.',
      benefits: [
        'Tim vidi kada je struja skupa, a kada jeftina, bez otvaranja portala',
        'Pokrivena je Srbija uz glavna evropska tržišta',
        'Bez naloga i bez ključa, izaberete oblast i radi',
      ],
      features: [
        {
          title: 'Kriva po satima',
          body: 'Pored trenutne cene vidi se i kako izgleda ceo dan, pa se odmah zna da li jeftin sat tek dolazi ili je prošao.',
        },
        {
          title: 'Vaša tržišna oblast',
          body: 'Cena se vezuje za oblast koju izaberete, jer se tržišta razlikuju i tuđa cena ne znači ništa za vaš pogon.',
        },
        {
          title: 'Vreme te oblasti',
          body: 'Sati se računaju u vremenskoj zoni same oblasti, pa se kriva poklapa sa satima na koje se planira rad.',
        },
      ],
      useCases: [
        {
          title: 'Proizvodni pogon',
          body: 'Smena vidi kada je struja najjeftinija, pa se energetski zahtevni poslovi pomeraju u te sate.',
        },
        {
          title: 'Energetska firma',
          body: 'Cena i kriva na ekranu u kancelariji, pored ostalih pokazatelja.',
        },
        {
          title: 'Hladnjača ili sušara',
          body: 'Tamo gde potrošnja može da se pomeri po satu, cena na zidu je razlog da se pomeri.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite tržišnu oblast',
          body: 'Srbija ili neko od evropskih tržišta koje pratite.',
        },
        {
          title: 'Proverite prikaz',
          body: 'Pogledajte da li se kriva čita sa mesta na kome ljudi stoje.',
        },
        {
          title: 'Izaberite temu i objavite',
          body: 'Uklopite izgled u ostatak ekrana, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog ni ključ.',
        dataSource:
          'Cene dolaze iz otvorenih podataka o dan-unapred tržištu sa energy-charts.info.',
        network: 'Veza je potrebna za povlačenje novih cena.',
        refreshBehavior: 'Osvežava se na svakih trideset minuta.',
        offlineBehavior: 'Poslednje povučene cene ostaju na ekranu dok se veza ne vrati.',
        limitations:
          'Prikazuje veleprodajnu dan-unapred cenu u evrima. To nije cena sa vašeg računa za struju, ona uključuje mrežarinu, takse i maržu snabdevača.',
      },
      faq: [
        {
          q: 'Je li ovo cena koju plaćam na računu?',
          a: 'Nije. Ovo je veleprodajna berzanska cena. Na računu su još mrežarina, takse i marža snabdevača.',
        },
        {
          q: 'Ima li Srbije?',
          a: 'Ima. Pokrivena je uz glavna evropska tržišta.',
        },
        {
          q: 'U kojoj valuti je cena?',
          a: 'Podaci stižu u evrima i prikazuju se po kilovat-satu.',
        },
      ],
    },
    en: {
      heroTitle: 'Today’s spot electricity price and hourly curve',
      intent: {
        primaryQuery: 'day-ahead electricity spot price on a screen',
        intentType: 'commercial-investigation',
        audience: 'manufacturers, energy firms and offices that shift consumption by price',
        jobToBeDone:
          'Keep today’s spot electricity price and hourly curve visible to the team planning consumption.',
        uniquePromise:
          'Explains that this is the wholesale day-ahead price and not what appears on an electricity bill.',
        notTargeting: 'Calculating an electricity bill; metering consumption.',
      },
      summary:
        'Pick a market area and the screen holds the current day-ahead electricity price with today’s hourly curve.',
      benefits: [
        'The team sees when power is expensive without opening a portal',
        'Serbia is covered alongside the main European markets',
        'No account and no key. Pick the area and it runs',
      ],
      features: [
        {
          title: 'The hourly curve',
          body: 'Beside the current price sits the shape of the whole day, so it is obvious whether the cheap hour is still coming or already gone.',
        },
        {
          title: 'Your market area',
          body: 'The price is tied to the area you pick, because markets differ and another country’s price says nothing about your plant.',
        },
        {
          title: 'That area’s clock',
          body: 'Hours are computed in the area’s own timezone, so the curve lines up with the hours you schedule work against.',
        },
      ],
      useCases: [
        {
          title: 'A production plant',
          body: 'The shift sees when power is cheapest and moves energy-hungry work into those hours.',
        },
        {
          title: 'An energy company',
          body: 'Price and curve on an office screen, beside the other indicators.',
        },
        {
          title: 'Cold storage or drying',
          body: 'Where consumption can move by the hour, the price on the wall is the reason to move it.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the market area',
          body: 'Serbia or one of the European markets you follow.',
        },
        {
          title: 'Check it reads',
          body: 'Look at whether the curve is legible from where people actually stand.',
        },
        {
          title: 'Choose a theme and publish',
          body: 'Match the look to the rest of the screen, then publish.',
        },
      ],
      requirements: {
        account: 'No account and no key are needed.',
        dataSource: 'Prices come from open day-ahead market data published by energy-charts.info.',
        network: 'A connection is needed to fetch new prices.',
        refreshBehavior: 'Refreshed every thirty minutes.',
        offlineBehavior: 'The last fetched prices stay on screen until the connection returns.',
        limitations:
          'It shows the wholesale day-ahead price in euros. That is not the price on your electricity bill, which also carries network charges, taxes and a supplier margin.',
      },
      faq: [
        {
          q: 'Is this the price I pay on my bill?',
          a: 'No. This is the wholesale market price. A bill adds network charges, taxes and the supplier’s margin.',
        },
        {
          q: 'Is Serbia covered?',
          a: 'Yes, alongside the main European market areas.',
        },
        {
          q: 'What currency is the price in?',
          a: 'The data arrives in euros and is shown per kilowatt-hour.',
        },
      ],
    },
  },
  stream: {
    sr: {
      heroTitle: 'Prenos uživo na ekranu, sa linka koji već imate',
      intent: {
        primaryQuery: 'prenos uzivo na ekranu u prostoru',
        intentType: 'commercial-investigation',
        audience: 'kladionice, kafići, hale i prostori koji puštaju prenos gostima',
        jobToBeDone:
          'Pustiti prenos uživo na ekranima sa jednog linka, bez računara i bez čoveka koji ga pokreće.',
        uniquePromise:
          'Nabraja koji formati i platforme rade i objašnjava zašto RTMP i RTSP linkovi ne mogu.',
        notTargeting: 'Snimljeni video fajlovi; YouTube video u petlji.',
      },
      summary:
        'Nalepite link prenosa, HLS, DASH, video fajl, WebRTC ili kanal sa Twitch-a, Kick-a, YouTube-a, Vimeo-a, Facebook-a ili Dailymotion-a, i ekran ga pušta.',
      benefits: [
        'Jedan link pokriva i tehničke prenose i platforme, bez posebnih podešavanja',
        'Format se prepoznaje sam, a može i ručno da se izabere',
        'Prenos se sam pokreće kada se plejer upali posle nestanka struje',
      ],
      features: [
        {
          title: 'Prepoznaje format sam',
          body: 'Iz linka se zaključuje o kom formatu je reč. Kada procena promaši, izvor se bira ručno.',
        },
        {
          title: 'Uklapanje u ekran',
          body: 'Slika može da popuni ekran ili da stane cela unutar njega, u zavisnosti od toga da li smete da isečete ivice.',
        },
        {
          title: 'Zvuk pod kontrolom',
          body: 'Zvuk je isključen dok ga ne uključite, jer prenos koji sam progovori u prostoriji retko kad prija.',
        },
      ],
      useCases: [
        {
          title: 'Kafić i kladionica',
          body: 'Prenos meča na ekranima u sali, pušten sa jednog mesta za sve ekrane odjednom.',
        },
        {
          title: 'Sportska hala',
          body: 'Slika sa kamere sa terena na ekranima u holu, da se vidi i iz hodnika.',
        },
        {
          title: 'Konferencija',
          body: 'Prenos iz glavne sale na ekranima u predvorju, za one koji nisu ušli.',
        },
      ],
      setupSteps: [
        {
          title: 'Nalepite link prenosa',
          body: 'Adresa mora da počinje sa http ili https. RTMP i RTSP adrese se ne prihvataju.',
        },
        {
          title: 'Proverite izvor',
          body: 'Ako se prenos ne pokrene sam, izaberite izvor ručno umesto automatskog prepoznavanja.',
        },
        {
          title: 'Podesite sliku i zvuk',
          body: 'Odredite kako se slika uklapa u ekran i da li zvuk ide, pa objavite.',
        },
      ],
      requirements: {
        account:
          'Nije potreban nalog za tehničke prenose. Za platforme važe njihova pravila prikazivanja.',
        dataSource:
          'Pušta se prenos sa adrese koju nalepite, HLS, DASH, video fajl, WebRTC, ili kanal sa podržane platforme.',
        network: 'Stalna veza je obavezna, jer se prenos preuzima u trenutku gledanja.',
        refreshBehavior: 'Prenos ide uživo; nema intervala osvežavanja.',
        offlineBehavior:
          'Bez veze prenosa nema, pa ova stavka izlazi iz rotacije dok se mreža ne vrati.',
        limitations:
          'RTMP i RTSP adrese ne mogu da se puštaju u pregledaču, pretvorite ih u HLS ili WebRTC na izvoru. Prenos se zaustavlja dok stavka nije na ekranu, da ne troši vezu i ne pušta zvuk u pozadini.',
      },
      faq: [
        {
          q: 'Zašto mi RTSP adresa sa kamere ne radi?',
          a: 'Zato što pregledač ne ume da pusti RTSP. Kameru propustite kroz pretvarač koji daje HLS ili WebRTC, pa nalepite tu adresu.',
        },
        {
          q: 'Ide li zvuk?',
          a: 'Ide, ali je podrazumevano isključen. Uključuje se u podešavanjima aplikacije.',
        },
        {
          q: 'Šta se dešava kad prenos prestane?',
          a: 'Stavka izlazi iz rotacije, a ostatak rasporeda nastavlja da se prikazuje.',
        },
      ],
    },
    en: {
      heroTitle: 'A live stream on the screen, from the link you already have',
      intent: {
        primaryQuery: 'live video stream on a venue screen',
        intentType: 'commercial-investigation',
        audience: 'bars, betting shops, halls and venues that show a live feed to guests',
        jobToBeDone:
          'Play a live stream on the screens from one link, with no computer and nobody starting it.',
        uniquePromise:
          'Lists which formats and platforms play and explains why RTMP and RTSP links cannot.',
        notTargeting: 'Recorded video files; a looping YouTube video.',
      },
      summary:
        'Paste a stream link, HLS, DASH, a video file, WebRTC, or a channel on Twitch, Kick, YouTube, Vimeo, Facebook or Dailymotion, and the screen plays it.',
      benefits: [
        'One link covers both technical streams and platforms, with no special setup',
        'The format is detected on its own, and can be set by hand',
        'The stream restarts itself when the player comes back after a power cut',
      ],
      features: [
        {
          title: 'Works out the format',
          body: 'The link tells it which format is in play. When the guess is wrong, the source can be set by hand.',
        },
        {
          title: 'How it fits',
          body: 'The picture can fill the screen or sit entirely inside it, depending on whether you can afford to crop the edges.',
        },
        {
          title: 'Sound under control',
          body: 'Audio stays off until you turn it on, because a stream that starts talking in a room is rarely welcome.',
        },
      ],
      useCases: [
        {
          title: 'A bar or betting shop',
          body: 'The match on every screen in the room, set once for all of them.',
        },
        {
          title: 'A sports hall',
          body: 'The camera feed from the court on the screens in the foyer, visible from the corridor.',
        },
        {
          title: 'A conference',
          body: 'The main room’s stream on the screens outside, for the people who did not get in.',
        },
      ],
      setupSteps: [
        {
          title: 'Paste the stream link',
          body: 'The address has to start with http or https. RTMP and RTSP addresses are rejected.',
        },
        {
          title: 'Check the source',
          body: 'If the stream does not start on its own, set the source by hand instead of leaving detection to guess.',
        },
        {
          title: 'Set picture and sound',
          body: 'Decide how the picture fits the screen and whether audio plays, then publish.',
        },
      ],
      requirements: {
        account:
          'No account is needed for technical streams. Platform channels follow that platform’s own rules.',
        dataSource:
          'The stream is played from the address you paste, HLS, DASH, a video file, WebRTC, or a channel on a supported platform.',
        network: 'A permanent connection is required, because the stream is fetched as it plays.',
        refreshBehavior: 'The stream runs live; there is no refresh interval.',
        offlineBehavior:
          'With no connection there is no stream, so the item drops out of rotation until the network returns.',
        limitations:
          'RTMP and RTSP addresses cannot play in a browser, convert them to HLS or WebRTC at the source. The stream is torn down while the item is off-screen, so it does not hold a connection or make noise in the background.',
      },
      faq: [
        {
          q: 'Why does my camera’s RTSP address not work?',
          a: 'Because a browser cannot play RTSP. Run the camera through a converter that produces HLS or WebRTC and paste that address.',
        },
        {
          q: 'Does audio play?',
          a: 'It can, but it is off by default. Turn it on in the app’s settings.',
        },
        {
          q: 'What happens when the stream ends?',
          a: 'The item drops out of rotation and the rest of the schedule keeps playing.',
        },
      ],
    },
  },

  ticker: {
    sr: {
      heroTitle: 'Traka sa obaveštenjima preko svega što ekran prikazuje',
      intent: {
        primaryQuery: 'traka sa obavestenjima preko ekrana',
        intentType: 'commercial-investigation',
        audience: 'firme kojima poruka mora da stoji stalno, a ne da čeka svoj red u rotaciji',
        jobToBeDone:
          'Držati kratku poruku vidljivom preko celog rasporeda, na tačno određenim ekranima.',
        uniquePromise:
          'Objašnjava zašto traka nije stavka u rotaciji i kako se bira na kojim ekranima stoji.',
        notTargeting: 'Hitno obaveštenje preko celog ekrana; RSS kao zasebna stavka.',
      },
      summary:
        'Traka sa porukama ili RSS naslovima stoji pri vrhu ili dnu ekrana, preko svega ostalog, na ekranima koje sami izaberete.',
      benefits: [
        'Poruka je stalno vidljiva, ne čeka svoj red u rotaciji',
        'Bira se tačno na kojim ekranima traka stoji',
        'Poruke se kucaju ručno ili stižu same iz RSS izvora',
      ],
      features: [
        {
          title: 'Stoji preko sadržaja',
          body: 'Traka nije stavka u rasporedu nego sloj iznad njega, pa ostaje na ekranu dok se ispod nje sadržaj smenjuje.',
        },
        {
          title: 'Ručno ili iz RSS-a',
          body: 'Poruke se unose kao spisak, ili se povlače kao naslovi iz RSS izvora. Prikaz je isti, bez obzira odakle stižu.',
        },
        {
          title: 'Brzina, smer i mesto',
          body: 'Podešava se koliko brzo klizi, na koju stranu i da li stoji gore ili dole, uz boju pozadine i teksta.',
        },
      ],
      useCases: [
        {
          title: 'Radno vreme i obaveštenja',
          body: 'Izmena radnog vremena stoji ceo dan preko redovnog sadržaja u izlogu.',
        },
        {
          title: 'Vesti u čekaonici',
          body: 'Naslovi iz RSS izvora kliznu ispod glavnog sadržaja, bez posebne stavke u rasporedu.',
        },
        {
          title: 'Poruka za jednu lokaciju',
          body: 'Obaveštenje koje se tiče samo jedne poslovnice, postavljeno tačno na njene ekrane.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite ekrane',
          body: 'Traka se pojavljuje samo na ekranima koje ovde izaberete, a ne svuda.',
        },
        {
          title: 'Unesite poruke ili RSS adresu',
          body: 'Ukucajte spisak poruka, ili nalepite adresu izvora čiji naslovi idu u traku.',
        },
        {
          title: 'Podesite izgled i objavite',
          body: 'Brzina, smer, položaj gore ili dole, pa boje koje se uklapaju sa sadržajem ispod.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog. Za RSS je potrebna javno dostupna adresa izvora.',
        dataSource: 'Poruke koje unesete, ili naslovi povučeni sa RSS adrese.',
        network: 'Veza je potrebna samo kada poruke stižu iz RSS izvora.',
        refreshBehavior: 'RSS naslovi se proveravaju na svakih pet minuta.',
        offlineBehavior: 'Poslednje poruke ostaju u traci i bez mreže.',
        limitations:
          'Traka je namenjena kratkim porukama, dugačak tekst prođe presporo da bi ga iko ispratio. Za poruku koja mora da zaustavi sve koristite hitno obaveštenje preko celog ekrana.',
      },
      faq: [
        {
          q: 'Da li traka zauzima svoj termin u rasporedu?',
          a: 'Ne. Ona je sloj iznad rasporeda i stoji dok se sadržaj ispod nje smenjuje.',
        },
        {
          q: 'Može li da stoji samo na nekim ekranima?',
          a: 'Može. Ekrani se biraju u samoj aplikaciji, pa poruka za jednu poslovnicu ne ide na sve.',
        },
        {
          q: 'Koliko poruka može da stane?',
          a: 'Koliko unesete, ali imajte u vidu da ceo krug mora da prođe pre nego što se prva poruka ponovi.',
        },
      ],
    },
    en: {
      heroTitle: 'A ticker across everything the screen is playing',
      intent: {
        primaryQuery: 'scrolling announcement ticker across a screen',
        intentType: 'commercial-investigation',
        audience: 'businesses whose message must stay up rather than wait its turn in a rotation',
        jobToBeDone:
          'Keep a short message visible across the whole schedule, on exactly the screens you choose.',
        uniquePromise:
          'Explains why the band is not a rotation item and how you pick which screens carry it.',
        notTargeting: 'A full-screen emergency alert; RSS as its own rotation item.',
      },
      summary:
        'A band of messages or RSS headlines sits at the top or bottom of the screen, over everything else, on the screens you pick.',
      benefits: [
        'The message is always visible, never waiting its turn',
        'You choose exactly which screens carry the band',
        'Messages are typed in, or arrive on their own from an RSS feed',
      ],
      features: [
        {
          title: 'Sits over the content',
          body: 'The band is a layer above the schedule rather than an item in it, so it stays while the content underneath changes.',
        },
        {
          title: 'Typed or from RSS',
          body: 'Messages come from a list you enter, or as headlines pulled from a feed. The band looks the same either way.',
        },
        {
          title: 'Speed, direction and place',
          body: 'Set how fast it moves, which way it runs and whether it sits at the top or the bottom, plus its background and text colour.',
        },
      ],
      useCases: [
        {
          title: 'Opening hours and notices',
          body: 'A change of hours stays up all day over the regular window content.',
        },
        {
          title: 'News in a waiting room',
          body: 'Headlines from a feed run under the main content, with no separate slot in the schedule.',
        },
        {
          title: 'A message for one site',
          body: 'A notice that concerns a single branch, put on exactly that branch’s screens.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the screens',
          body: 'The band appears only on the screens you select here, not everywhere.',
        },
        {
          title: 'Enter messages or an RSS address',
          body: 'Type a list of messages, or paste the address of a feed whose headlines fill the band.',
        },
        {
          title: 'Set the look and publish',
          body: 'Speed, direction, top or bottom, and colours that sit well over the content beneath.',
        },
      ],
      requirements: {
        account: 'No account is needed. RSS requires a publicly reachable feed address.',
        dataSource: 'The messages you enter, or headlines pulled from an RSS address.',
        network: 'A connection is needed only when the messages come from a feed.',
        refreshBehavior: 'RSS headlines are checked every five minutes.',
        offlineBehavior: 'The last messages stay in the band without a network.',
        limitations:
          'The band is meant for short messages, a long one crawls past too slowly for anyone to follow. For a message that must stop everything, use the full-screen emergency alert.',
      },
      faq: [
        {
          q: 'Does the band take a slot in the schedule?',
          a: 'No. It is a layer above the schedule and stays up while the content underneath changes.',
        },
        {
          q: 'Can it show on only some screens?',
          a: 'Yes. Screens are chosen inside the app, so a message for one branch does not reach all of them.',
        },
        {
          q: 'How many messages fit?',
          a: 'As many as you enter, but remember the whole loop has to pass before the first one repeats.',
        },
      ],
    },
  },

  alert: {
    sr: {
      heroTitle: 'Hitno obaveštenje preko celog ekrana, radi i bez mreže',
      intent: {
        primaryQuery: 'hitno obavestenje preko celog ekrana',
        intentType: 'commercial-investigation',
        audience: 'ustanove i pogoni kojima ekrani moraju da posluže i u vanrednoj situaciji',
        jobToBeDone:
          'Prekinuti sve na ekranima jednom porukom koja se čita sa druge strane prostorije.',
        uniquePromise:
          'Objašnjava zašto poruka radi i kada nema interneta i kako stepen hitnosti menja izgled.',
        notTargeting: 'Traka sa obaveštenjima; redovna obaveštenja u rotaciji.',
      },
      summary:
        'Krupan naslov, opis po potrebi i boja koja odgovara stepenu hitnosti, preko celog ekrana, čitljivo iz daljine.',
      benefits: [
        'Radi i kada internet ne radi, jer ništa ne povlači spolja',
        'Stepen hitnosti bira ceo izgled, pa niko ne bira boje u žurbi',
        'Postavlja se za nekoliko sekundi, kada nema vremena za nameštanje',
      ],
      features: [
        {
          title: 'Stepen hitnosti bira izgled',
          body: 'Umesto da u vanrednoj situaciji birate boje, birate stepen, boja i znak dolaze uz njega, već usklađeni.',
        },
        {
          title: 'Postavljeno da se čita iz daljine',
          body: 'Naslov dobija ceo ekran i postavlja se krupno, jer poruku treba pročitati u prolazu, a ne prići joj bliže.',
        },
        {
          title: 'Blago pulsiranje ivice',
          body: 'Ivica može polako da pulsira da privuče pogled. Ritam je namerno spor, znatno ispod praga koji izaziva tegobe, i sam se gasi kada je na uređaju uključeno smanjenje animacija.',
        },
      ],
      useCases: [
        {
          title: 'Evakuacija',
          body: 'Svi ekrani u zgradi prelaze na isto uputstvo, i onda kada je veza pala zajedno sa strujom.',
        },
        {
          title: 'Zatvaranje objekta',
          body: 'Obaveštenje o prekidu rada na ulazu, umesto papira zalepljenog na vrata.',
        },
        {
          title: 'Upozorenje u pogonu',
          body: 'Zastoj na liniji ili zabrana pristupa delu hale, vidljivi svima u smeni odjednom.',
        },
      ],
      setupSteps: [
        {
          title: 'Napišite naslov',
          body: 'Nekoliko reči koje se čitaju iz daljine. Detalji idu u opis ispod.',
        },
        {
          title: 'Izaberite stepen hitnosti',
          body: 'Stepen određuje boju i znak, pa ništa ne morate da usklađujete ručno.',
        },
        {
          title: 'Objavite na ekrane',
          body: 'Uključite pulsiranje ako poruka mora da otme pažnju, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nijedan nalog.',
        dataSource: 'Prikazuje se tekst koji ste uneli; ništa se ne povlači spolja.',
        network: 'Veza je potrebna samo da bi poruka stigla do ekrana.',
        refreshBehavior: 'Nema osvežavanja, poruka stoji dok je ne sklonite.',
        offlineBehavior:
          'Kada je jednom na ekranu, radi u potpunosti bez mreže, što je i poenta ove aplikacije.',
        limitations:
          'Poruka mora da stigne do ekrana dok veza postoji. Ekran koji je već bio bez mreže neće primiti novo obaveštenje dok se veza ne vrati.',
      },
      faq: [
        {
          q: 'Radi li kada padne internet?',
          a: 'Radi. Poruka koja je stigla na ekran ostaje i bez mreže, jer se ništa ne povlači spolja.',
        },
        {
          q: 'Da li pulsiranje može da izazove tegobe?',
          a: 'Ritam je namerno spor i znatno ispod praga koji se povezuje sa fotosenzitivnošću, a gasi se i sam kada je na uređaju uključeno smanjenje animacija.',
        },
        {
          q: 'Kako se obaveštenje sklanja?',
          a: 'Uklonite ga sa ekrana i raspored se vraća na redovan sadržaj.',
        },
      ],
    },
    en: {
      heroTitle: 'A full-screen alert that still works with the internet down',
      intent: {
        primaryQuery: 'full screen emergency alert on a display',
        intentType: 'commercial-investigation',
        audience: 'institutions and plants whose screens must be useful in an emergency',
        jobToBeDone:
          'Interrupt everything on the screens with one message readable from across a room.',
        uniquePromise:
          'Explains why the message survives an outage and how the severity setting drives the whole look.',
        notTargeting: 'A scrolling ticker; ordinary notices in the rotation.',
      },
      summary:
        'A large headline, details if needed, and a colour that matches the severity, full-screen and readable from a distance.',
      benefits: [
        'Works when the internet does not, because nothing is fetched',
        'Severity picks the whole look, so nobody chooses colours in a hurry',
        'Set up in seconds, when there is no time to arrange anything',
      ],
      features: [
        {
          title: 'Severity picks the look',
          body: 'Instead of choosing colours during an emergency, you choose a severity. The colour and icon come with it, already matched.',
        },
        {
          title: 'Set to read from a distance',
          body: 'The headline gets the whole screen and is set large, because the message has to be read while walking past, not up close.',
        },
        {
          title: 'A slow pulsing edge',
          body: 'The edge can fade slowly to pull the eye. The rhythm is deliberately slow, well under the threshold associated with photosensitivity, and it switches itself off when the device has reduced motion enabled.',
        },
      ],
      useCases: [
        {
          title: 'Evacuation',
          body: 'Every screen in the building carries the same instruction, including when the link went down with the power.',
        },
        {
          title: 'Closing the premises',
          body: 'A notice about a closure at the entrance, instead of a sheet taped to the door.',
        },
        {
          title: 'A warning on the floor',
          body: 'A line stoppage or a restricted area, visible to the whole shift at once.',
        },
      ],
      setupSteps: [
        {
          title: 'Write the headline',
          body: 'A few words that read from a distance. Detail goes in the message below.',
        },
        {
          title: 'Pick the severity',
          body: 'Severity sets the colour and the icon, so nothing has to be matched by hand.',
        },
        {
          title: 'Publish to the screens',
          body: 'Turn the pulse on if the message has to seize attention, then publish.',
        },
      ],
      requirements: {
        account: 'No account of any kind is needed.',
        dataSource: 'The text you enter is shown; nothing is fetched externally.',
        network: 'A connection is needed only for the message to reach the screen.',
        refreshBehavior: 'There is no refresh. The message holds until you remove it.',
        offlineBehavior:
          'Once it is on the screen it runs entirely without a network, which is the whole point of this app.',
        limitations:
          'The message still has to reach the screen while the connection exists. A screen that was already offline will not receive a new alert until it is back.',
      },
      faq: [
        {
          q: 'Does it work when the internet is down?',
          a: 'Yes. A message that reached the screen stays up without a network, because nothing is fetched.',
        },
        {
          q: 'Could the pulse cause discomfort?',
          a: 'The rhythm is deliberately slow and well under the threshold associated with photosensitivity, and it disables itself when the device has reduced motion enabled.',
        },
        {
          q: 'How is the alert cleared?',
          a: 'Remove it from the screens and the schedule returns to its normal content.',
        },
      ],
    },
  },

  countdown: {
    sr: {
      heroTitle: 'Odbrojavanje do datuma, ili brojanje dana od njega',
      intent: {
        primaryQuery: 'odbrojavanje do datuma na ekranu',
        intentType: 'commercial-investigation',
        audience: 'pogoni, prodavnice i timovi kojima jedan datum drži pažnju',
        jobToBeDone:
          'Držati broj dana do događaja ili od njega stalno vidljivim, bez ičijeg ažuriranja.',
        uniquePromise:
          'Objašnjava oba smera brojanja i zašto radi i na ekranu koji je mesecima van mreže.',
        notTargeting: 'Sat i tačno vreme; kalendar sa terminima.',
      },
      summary:
        'Postavite datum i aplikacija odbrojava do njega, ili broji dane od njega, kada je poenta koliko dugo nešto traje.',
      benefits: [
        'Broji sama, bez ijedne izmene posle postavljanja',
        'Radi mesecima na ekranu koji nema vezu',
        'Isti alat pokriva i najavu i brojanje dana bez incidenta',
      ],
      features: [
        {
          title: 'Oba smera',
          body: 'Odbrojava do trenutka koji dolazi, ili broji od onog koji je prošao, „N dana bez povrede" je isti alat kao i najava otvaranja.',
        },
        {
          title: 'Poruka za kraj',
          body: 'Zadajete šta piše kada odbrojavanje istekne, pa ekran ne ostane na nuli bez objašnjenja.',
        },
        {
          title: 'Boje po vašoj meri',
          body: 'Pozadina, tekst i istaknuta boja biraju se odvojeno, pa se brojač uklapa u raspored umesto da se otima.',
        },
      ],
      useCases: [
        {
          title: 'Bezbednost u pogonu',
          body: 'Broj dana bez povrede na radu, na ekranu koji vidi cela smena.',
        },
        {
          title: 'Otvaranje objekta',
          body: 'Odbrojavanje u izlogu dok se radovi privode kraju.',
        },
        {
          title: 'Rok u kancelariji',
          body: 'Dani do isporuke ili do kraja kvartala, vidljivi timu bez otvaranja alata.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite datum i vreme',
          body: 'Postavite trenutak do kog se broji, ili od kog se broji.',
        },
        {
          title: 'Izaberite smer',
          body: 'Odbrojavanje unapred ili brojanje unazad, u zavisnosti od toga šta merite.',
        },
        {
          title: 'Napišite poruku za kraj i objavite',
          body: 'Odredite šta stoji na ekranu kada odbrojavanje istekne, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nijedan nalog.',
        dataSource: 'Broji se prema datumu koji ste uneli; ništa se ne povlači spolja.',
        network: 'Veza je potrebna samo za postavljanje i objavu.',
        refreshBehavior: 'Broji neprekidno, na samom uređaju.',
        offlineBehavior: 'Radi neograničeno bez mreže, i posle mesec dana bez veze i dalje broji.',
        limitations:
          'Vreme se računa po satu samog uređaja. Ekran sa pogrešno podešenim vremenom pokazaće pogrešan broj.',
      },
      faq: [
        {
          q: 'Radi li bez interneta?',
          a: 'Radi. Sve se računa na uređaju, pa brojač nastavlja i posle dužeg prekida veze.',
        },
        {
          q: 'Šta se prikazuje kada odbrojavanje istekne?',
          a: 'Poruka koju sami zadate, pa ekran ne ostaje na nuli bez objašnjenja.',
        },
        {
          q: 'Može li da broji unazad, od datuma?',
          a: 'Može. To je drugi smer iste aplikacije, koji se koristi za „N dana bez incidenta".',
        },
      ],
    },
    en: {
      heroTitle: 'Count down to a date, or up since one',
      intent: {
        primaryQuery: 'countdown timer to a date on a screen',
        intentType: 'commercial-investigation',
        audience: 'plants, shops and teams where one date holds everyone’s attention',
        jobToBeDone:
          'Keep the number of days to an event, or since one, visible without anyone updating it.',
        uniquePromise:
          'Explains both directions of counting and why it keeps running on a screen offline for months.',
        notTargeting: 'A clock and the current time; a calendar of bookings.',
      },
      summary:
        'Set a date and it counts down to it, or counts the days since it, when the point is how long something has held.',
      benefits: [
        'Counts on its own, with nothing to change after setup',
        'Runs for months on a screen with no connection',
        'One app covers both an announcement and a days-without-incident board',
      ],
      features: [
        {
          title: 'Both directions',
          body: 'Count down to a moment ahead, or up from one behind, “N days without an injury” is the same app as a launch announcement.',
        },
        {
          title: 'A message for the end',
          body: 'Set what appears once the countdown expires, so the screen does not sit on zero with no explanation.',
        },
        {
          title: 'Colours you choose',
          body: 'Background, text and accent are set separately, so the counter fits the layout instead of fighting it.',
        },
      ],
      useCases: [
        {
          title: 'Safety on the floor',
          body: 'Days without a workplace injury, on a screen the whole shift passes.',
        },
        {
          title: 'An opening',
          body: 'A countdown in the window while the fit-out is finishing.',
        },
        {
          title: 'A deadline in the office',
          body: 'Days to delivery or to quarter end, visible to the team without opening a tool.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the date and time',
          body: 'Set the moment being counted to, or counted from.',
        },
        {
          title: 'Pick the direction',
          body: 'Counting down or counting up, depending on what you are measuring.',
        },
        {
          title: 'Write the end message and publish',
          body: 'Decide what stands on the screen once the countdown expires, then publish.',
        },
      ],
      requirements: {
        account: 'No account of any kind is needed.',
        dataSource: 'It counts against the date you entered; nothing is fetched externally.',
        network: 'A connection is needed only to set it up and publish.',
        refreshBehavior: 'It counts continuously, on the device itself.',
        offlineBehavior:
          'Runs indefinitely without a network, still counting after a month offline.',
        limitations:
          'Time is taken from the device’s own clock. A screen set to the wrong time will show the wrong number.',
      },
      faq: [
        {
          q: 'Does it work without internet?',
          a: 'Yes. Everything is computed on the device, so it keeps counting through a long outage.',
        },
        {
          q: 'What shows when the countdown expires?',
          a: 'A message you set, so the screen does not sit on zero unexplained.',
        },
        {
          q: 'Can it count up from a date?',
          a: 'Yes. That is the other direction of the same app, used for “N days without an incident”.',
        },
      ],
    },
  },

  holidays: {
    sr: {
      heroTitle: 'Naredni državni praznici, na ekranu',
      intent: {
        primaryQuery: 'spisak državnih praznika na ekranu',
        intentType: 'commercial-investigation',
        audience: 'kancelarije, ustanove i firme sa zaposlenima iz više zemalja',
        jobToBeDone:
          'Pokazati naredne neradne dane za jednu zemlju, da se planiranje ne oslanja na sećanje.',
        uniquePromise: 'Objašnjava odakle spisak praznika dolazi i koliko unapred se prikazuje.',
        notTargeting: 'Kalendar sastanaka; raspored smena.',
      },
      summary:
        'Izaberete zemlju i na ekranu stoji spisak narednih državnih praznika, sa datumima, osvežen sam.',
      benefits: [
        'Niko ne proverava kada je sledeći neradni dan',
        'Radi za bilo koju zemlju, korisno kada tim nije samo domaći',
        'Bez naloga i bez ključa, izaberete zemlju i radi',
      ],
      features: [
        {
          title: 'Zemlja po izboru',
          body: 'Spisak se vezuje za zemlju koju izaberete, pa firma sa ljudima u više država može da drži po jedan ekran za svaku.',
        },
        {
          title: 'Koliko praznika se vidi',
          body: 'Zadajete koliko narednih praznika stoji na ekranu, nekoliko za pregled, više kada se planira unapred.',
        },
        {
          title: 'Sam se pomera dalje',
          body: 'Kada praznik prođe, sam ispada sa spiska i na njegovo mesto dolazi sledeći.',
        },
      ],
      useCases: [
        {
          title: 'Kancelarija',
          body: 'Spisak neradnih dana u zajedničkom prostoru, da se planiranje ne oslanja na sećanje.',
        },
        {
          title: 'Firma sa više zemalja',
          body: 'Ekran po zemlji, pa tim zna kada kolege u drugoj državi ne rade.',
        },
        {
          title: 'Recepcija',
          body: 'Gost odmah vidi kada objekat neće raditi.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite zemlju',
          body: 'Postavite zemlju čiji praznici idu na ekran.',
        },
        {
          title: 'Odredite koliko ih se vidi',
          body: 'Kratak spisak se čita iz prolaza; duži ima smisla tamo gde se planira unapred.',
        },
        {
          title: 'Izaberite temu i objavite',
          body: 'Uklopite izgled u ostatak ekrana, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog ni ključ.',
        dataSource: 'Spisak praznika dolazi sa javnog Nager.Date servisa.',
        network: 'Veza je potrebna za povlačenje spiska.',
        refreshBehavior:
          'Proverava se nekoliko puta dnevno: spisak praznika se ionako menja retko.',
        offlineBehavior: 'Poslednji povučeni spisak ostaje na ekranu i bez mreže.',
        limitations:
          'Prikazuju se državni praznici zemlje. Verski i lokalni neradni dani koji nisu na zvaničnom spisku neće se pojaviti, kao ni interni neradni dani vaše firme.',
      },
      faq: [
        {
          q: 'Koje zemlje su pokrivene?',
          a: 'Izvor pokriva veliki broj zemalja, pa se ekran može postaviti i za tim koji radi iz druge države.',
        },
        {
          q: 'Vide li se interni neradni dani firme?',
          a: 'Ne. Prikazuju se zvanični državni praznici. Za interne dane koristite tekstualnu aplikaciju ili kalendar.',
        },
        {
          q: 'Šta se dešava kada praznik prođe?',
          a: 'Sam ispada sa spiska, a na njegovo mesto dolazi sledeći.',
        },
      ],
    },
    en: {
      heroTitle: 'The next public holidays, on the wall',
      intent: {
        primaryQuery: 'upcoming public holidays on a screen',
        intentType: 'commercial-investigation',
        audience: 'offices, institutions and companies with staff across more than one country',
        jobToBeDone:
          'Show the next non-working days for a country so planning does not rely on memory.',
        uniquePromise: 'Explains where the holiday list comes from and how far ahead it reaches.',
        notTargeting: 'A meeting calendar; a shift rota.',
      },
      summary:
        'Pick a country and the screen holds a list of the next public holidays with their dates, refreshed on its own.',
      benefits: [
        'Nobody looks up when the next day off falls',
        'Works for any country, which matters when the team is not all local',
        'No account and no key. Pick the country and it runs',
      ],
      features: [
        {
          title: 'A country you choose',
          body: 'The list is tied to the country you pick, so a company with people in several can keep one screen for each.',
        },
        {
          title: 'How many are shown',
          body: 'Set how many upcoming holidays stand on the screen, a few for an overview, more where planning runs ahead.',
        },
        {
          title: 'Moves along by itself',
          body: 'Once a holiday passes it drops off the list and the next one takes its place.',
        },
      ],
      useCases: [
        {
          title: 'An office',
          body: 'The list of days off in the shared space, so planning does not rely on memory.',
        },
        {
          title: 'A company across borders',
          body: 'One screen per country, so a team knows when colleagues elsewhere are away.',
        },
        {
          title: 'Reception',
          body: 'A visitor sees at once when the building will be closed.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the country',
          body: 'Set whose public holidays go on the screen.',
        },
        {
          title: 'Choose how many show',
          body: 'A short list reads from a walkway; a longer one suits a place that plans ahead.',
        },
        {
          title: 'Choose a theme and publish',
          body: 'Match the look to the rest of the screen, then publish.',
        },
      ],
      requirements: {
        account: 'No account and no key are needed.',
        dataSource: 'The holiday list comes from the public Nager.Date service.',
        network: 'A connection is needed to fetch the list.',
        refreshBehavior: 'Checked a few times a day, a holiday list changes slowly anyway.',
        offlineBehavior: 'The last fetched list stays on screen without a network.',
        limitations:
          'It shows a country’s public holidays. Religious or local days off that are not on the official list will not appear, and neither will your own company’s closures.',
      },
      faq: [
        {
          q: 'Which countries are covered?',
          a: 'The source covers a large number of countries, so a screen can be set for a team working from another one.',
        },
        {
          q: 'Are our own company closures shown?',
          a: 'No. Official public holidays are shown. For internal days off, use the text app or a calendar.',
        },
        {
          q: 'What happens once a holiday passes?',
          a: 'It drops off the list on its own and the next one takes its place.',
        },
      ],
    },
  },

  onthisday: {
    sr: {
      heroTitle: 'Šta se dogodilo na današnji dan, na ekranu',
      intent: {
        primaryQuery: 'na današnji dan istorijski događaji na ekranu',
        intentType: 'commercial-investigation',
        audience: 'čekaonice, holovi i prostori u kojima se čeka i traži se šta da se gleda',
        jobToBeDone: 'Dati gledaocu koji čeka nešto da pročita, bez ikakvog održavanja sadržaja.',
        uniquePromise:
          'Objašnjava da su događaji na engleskom i odakle dolaze, pre nego što se aplikacija uključi.',
        notTargeting: 'Vesti iz zemlje; citati i misli dana.',
      },
      summary:
        'Spisak poznatih događaja koji su se desili na današnji datum kroz istoriju, osvežen sam kad svane novi dan.',
      benefits: [
        'Sadržaj koji se menja svakog dana, a niko ga ne priprema',
        'Ispunjava prazninu u rotaciji kada nema ničeg novog za objaviti',
        'Bez naloga i bez ključa',
      ],
      features: [
        {
          title: 'Menja se sam u ponoć',
          body: 'Datum se određuje na našoj strani i spisak se sam pomera na nov dan, bez ijednog klika.',
        },
        {
          title: 'Koliko događaja se vidi',
          body: 'Zadajete koliko ih stoji na ekranu, nekoliko za kratak pogled, više za prostor u kome se duže čeka.',
        },
        {
          title: 'Jedno povlačenje za sve ekrane',
          body: 'Datum je isti za sve, pa ceo sistem ekrana troši jedno povlačenje dnevno.',
        },
      ],
      useCases: [
        {
          title: 'Čekaonica',
          body: 'Pacijent ili stranka ima šta da pročita dok čeka, umesto da gleda u zid.',
        },
        {
          title: 'Škola',
          body: 'Ekran u hodniku kao mala dnevna zanimljivost između obaveštenja.',
        },
        {
          title: 'Hol kancelarije',
          body: 'Sadržaj koji popunjava rotaciju u danima kada nema novih objava.',
        },
      ],
      setupSteps: [
        {
          title: 'Dodajte aplikaciju',
          body: 'Nema šta da se povezuje ni podešava da bi proradila.',
        },
        {
          title: 'Odredite broj događaja',
          body: 'Prilagodite koliko ih stoji tome koliko se gledalac zadržava.',
        },
        {
          title: 'Izaberite temu i objavite',
          body: 'Uklopite izgled u ostatak ekrana, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog ni ključ.',
        dataSource: 'Događaji dolaze iz rubrike „On This Day" engleske Vikipedije.',
        network: 'Veza je potrebna za povlačenje događaja za novi dan.',
        refreshBehavior: 'Proverava se nekoliko puta dnevno, pa sam prelazi na nov datum.',
        offlineBehavior: 'Poslednji povučeni događaji ostaju na ekranu i bez mreže.',
        limitations:
          'Događaji su na engleskom jeziku. Ta rubrika postoji samo za mali broj izdanja Vikipedije i srpsko nije među njima, pa prevod nije moguć. Za publiku koja ne čita engleski ovo nije prava aplikacija.',
      },
      faq: [
        {
          q: 'Može li na srpskom?',
          a: 'Ne može. Rubrika postoji samo za nekoliko izdanja Vikipedije, a srpsko nije među njima.',
        },
        {
          q: 'Menja li se sadržaj svakog dana?',
          a: 'Menja. Datum se određuje na našoj strani i spisak sam prelazi na nov dan.',
        },
        {
          q: 'Treba li nešto da se održava?',
          a: 'Ne. Aplikacija se doda jednom i dalje radi sama.',
        },
      ],
    },
    en: {
      heroTitle: 'What happened on today’s date, on the screen',
      intent: {
        primaryQuery: 'on this day historical events on a screen',
        intentType: 'commercial-investigation',
        audience:
          'waiting rooms, lobbies and places where people wait and look for something to read',
        jobToBeDone:
          'Give a waiting viewer something to read, with no content for anyone to maintain.',
        uniquePromise:
          'Explains where the events come from and that they are shown in English only.',
        notTargeting: 'Local news; daily quotes.',
      },
      summary:
        'A list of notable things that happened on today’s date through history, rolling over on its own each day.',
      benefits: [
        'Content that changes daily with nobody preparing it',
        'Fills a gap in the rotation on days with nothing new to announce',
        'No account and no key',
      ],
      features: [
        {
          title: 'Rolls over by itself',
          body: 'Today is resolved on our side and the list moves to the new day on its own, with nobody clicking anything.',
        },
        {
          title: 'How many events show',
          body: 'Set how many stand on the screen: a few for a glance, more for a place where people wait longer.',
        },
        {
          title: 'One fetch for every screen',
          body: 'The date is the same for everyone, so a whole estate of screens costs one fetch a day.',
        },
      ],
      useCases: [
        {
          title: 'A waiting room',
          body: 'A patient or client has something to read while waiting, instead of staring at the wall.',
        },
        {
          title: 'A school',
          body: 'A corridor screen with a small daily curiosity between the notices.',
        },
        {
          title: 'An office lobby',
          body: 'Content that fills the rotation on days with nothing new to publish.',
        },
      ],
      setupSteps: [
        {
          title: 'Add the app',
          body: 'There is nothing to connect and nothing to configure for it to work.',
        },
        {
          title: 'Set the number of events',
          body: 'Match how many show to how long a viewer actually stays.',
        },
        {
          title: 'Choose a theme and publish',
          body: 'Match the look to the rest of the screen, then publish.',
        },
      ],
      requirements: {
        account: 'No account and no key are needed.',
        dataSource: 'Events come from the English Wikipedia “On This Day” feed.',
        network: 'A connection is needed to fetch the new day’s events.',
        refreshBehavior: 'Checked a few times a day, so it rolls over to the new date on its own.',
        offlineBehavior: 'The last fetched events stay on screen without a network.',
        limitations:
          'The events are in English. The feed exists for only a small set of Wikipedia editions, so other languages are not available. For an audience that does not read English, this is not the right app.',
      },
      faq: [
        {
          q: 'Is another language available?',
          a: 'No. The feed exists for only a few Wikipedia editions, so the events are shown in English.',
        },
        {
          q: 'Does the content change every day?',
          a: 'Yes. Today is resolved on our side and the list moves to the new day on its own.',
        },
        {
          q: 'Is there anything to maintain?',
          a: 'No. The app is added once and keeps running by itself.',
        },
      ],
    },
  },

  wisdom: {
    sr: {
      heroTitle: 'Citat dana, u kategorijama koje vi birate',
      intent: {
        primaryQuery: 'citat dana na ekranu',
        intentType: 'commercial-investigation',
        audience: 'teretane, ordinacije i kancelarije kojima ekran služi i za raspoloženje',
        jobToBeDone:
          'Držati na ekranu misao koja odgovara prostoru, bez ijednog dana pripreme sadržaja.',
        uniquePromise:
          'Objašnjava zašto su kategorije suština aplikacije i zašto ništa ne dolazi spolja.',
        notTargeting: 'Istorijski događaji; obaveštenja zaposlenima.',
      },
      summary:
        'Izaberete kategorije koje odgovaraju prostoru i svakog dana dobijate nekoliko citata, svaki u drugačijem izgledu.',
      benefits: [
        'Kategorije biraju ton, teretana i čekaonica ne dobijaju iste misli',
        'Ništa se ne povlači sa strane, pa ne može da presuši',
        'Svaki citat dolazi u drugom izgledu, pa se ekran ne ponavlja',
      ],
      features: [
        {
          title: 'Kategorije su suština',
          body: 'Teretana bira motivaciju i sport, čekaonica zdravlje i život. Bez toga bi ovo bila nasumična aplikacija sa citatima.',
        },
        {
          title: 'Drugi izgled za svaki citat',
          body: 'Nema biranja dizajna, jer je poenta da svaki citat stigne u svom izgledu. Ekran tako ostaje živ i posle mesec dana.',
        },
        {
          title: 'Koliko citata i koliko traju',
          body: 'Zadajete koliko ih se smenjuje dnevno i koliko sekundi svaki stoji.',
        },
      ],
      useCases: [
        {
          title: 'Teretana',
          body: 'Motivacija i sport na ekranu uz raspored treninga.',
        },
        {
          title: 'Čekaonica',
          body: 'Mirnije kategorije, zdravlje i život, tamo gde ljudi čekaju sa nelagodom.',
        },
        {
          title: 'Kancelarija',
          body: 'Misao dana u zajedničkom prostoru, kao predah između radnih ekrana.',
        },
      ],
      setupSteps: [
        {
          title: 'Izaberite kategorije',
          body: 'Ovo je najvažniji korak, kategorije određuju ton svega što se pojavi.',
        },
        {
          title: 'Odredite broj citata',
          body: 'Koliko ih se smenjuje u toku dana.',
        },
        {
          title: 'Podesite trajanje i objavite',
          body: 'Koliko sekundi citat stoji, pa objavite.',
        },
      ],
      requirements: {
        account: 'Nije potreban nalog ni ključ.',
        dataSource:
          'Citati dolaze iz naše sopstvene zbirke od oko 4.900 razvrstanih citata. Ništa se ne povlači od trećih strana.',
        network: 'Veza je potrebna za povlačenje dnevnog izbora.',
        refreshBehavior: 'Nov izbor jednom dnevno.',
        offlineBehavior: 'Poslednji povučeni citati ostaju na ekranu i bez mreže.',
        limitations:
          'Citati su iz unapred pripremljene zbirke, ne mogu se dodavati sopstveni. Za svoju poruku koristite tekstualnu aplikaciju.',
      },
      faq: [
        {
          q: 'Mogu li da dodam svoje citate?',
          a: 'Ne u ovoj aplikaciji. Za sopstvenu poruku koristite tekstualnu aplikaciju, koja je za to i namenjena.',
        },
        {
          q: 'Odakle citati dolaze?',
          a: 'Iz zbirke koju sami održavamo, oko 4.900 razvrstanih citata. Ne zavisimo od tuđeg servisa koji može da nestane.',
        },
        {
          q: 'Zašto ne mogu da izaberem dizajn?',
          a: 'Zato što je poenta da svaki citat stigne u svom izgledu. Jedan izabrani dizajn bi posle nedelju dana postao nevidljiv.',
        },
      ],
    },
    en: {
      heroTitle: 'A daily quote, in the categories you choose',
      intent: {
        primaryQuery: 'daily quote on a screen',
        intentType: 'commercial-investigation',
        audience: 'gyms, clinics and offices where the screen also sets the mood',
        jobToBeDone:
          'Keep a line on the screen that suits the room, with no day spent preparing content.',
        uniquePromise:
          'Explains why the categories are the whole app and why nothing is fetched from a third party.',
        notTargeting: 'Historical events; staff announcements.',
      },
      summary:
        'Pick the categories that suit the room and each day brings a handful of quotes, every one in a different design.',
      benefits: [
        'Categories set the tone. A gym and a waiting room do not get the same lines',
        'Nothing is pulled from a third party, so it cannot dry up',
        'Every quote arrives in a different design, so the screen never looks repeated',
      ],
      features: [
        {
          title: 'The categories are the app',
          body: 'A gym picks motivation and sport, a waiting room health and life. Without that, this would be a random quote app.',
        },
        {
          title: 'A different design each time',
          body: 'There is no design picker, because the point is that each quote arrives in its own look, which is what keeps the screen alive after a month.',
        },
        {
          title: 'How many, and how long',
          body: 'Set how many rotate through the day and how many seconds each one holds.',
        },
      ],
      useCases: [
        {
          title: 'A gym',
          body: 'Motivation and sport on the screen beside the class timetable.',
        },
        {
          title: 'A waiting room',
          body: 'Calmer categories (health and life) where people wait uneasily.',
        },
        {
          title: 'An office',
          body: 'A line of the day in the shared space, as a pause between working screens.',
        },
      ],
      setupSteps: [
        {
          title: 'Pick the categories',
          body: 'This is the step that matters. The categories set the tone of everything that appears.',
        },
        {
          title: 'Set how many quotes',
          body: 'Decide how many rotate through the day.',
        },
        {
          title: 'Set the timing and publish',
          body: 'How many seconds a quote holds, then publish.',
        },
      ],
      requirements: {
        account: 'No account and no key are needed.',
        dataSource:
          'Quotes come from our own corpus of around 4,900 categorised lines. Nothing is fetched from a third party.',
        network: 'A connection is needed to fetch the day’s selection.',
        refreshBehavior: 'A new selection once a day.',
        offlineBehavior: 'The last fetched quotes stay on screen without a network.',
        limitations:
          'Quotes come from a prepared corpus, your own cannot be added. For your own words, use the text app.',
      },
      faq: [
        {
          q: 'Can I add my own quotes?',
          a: 'Not in this app. For your own words, use the text app, which exists for exactly that.',
        },
        {
          q: 'Where do the quotes come from?',
          a: 'From a corpus we maintain ourselves, around 4,900 categorised lines. We do not depend on someone else’s service that might disappear.',
        },
        {
          q: 'Why can I not choose the design?',
          a: 'Because the point is that each quote arrives in its own look. One chosen design would go invisible within a week.',
        },
      ],
    },
  },
} as const
