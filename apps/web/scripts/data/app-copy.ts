// @ts-nocheck
/**
 * Editorial copy for the App Pages, keyed by the manifest slug.
 *
 * Written against each app's manifest — its data source, refresh interval and
 * config fields — rather than paraphrasing the one-line tagline, because a page
 * that only restates the catalogue is the thin page the SEO gate exists to keep
 * out. Requirements in particular are factual: they have to match what the
 * connector actually does, since a visitor plans around them.
 *
 * Primary queries have to stay distinct from every Blog post, Solution and
 * other App page — the indexing gate compares them and refuses near-duplicates.
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
        'Povežete Microsoft nalog, izaberete prezentaciju sa OneDrive-a ili SharePointa, i ona se vrti na ekranima. Izmenite slajd — ekran se osveži sam.',
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
          body: 'Podešava se koliko sekundi slajd stoji i kako se uklapa u ekran — po širini, po visini ili preko cele površine.',
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
        dataSource: 'Prezentacija se čita sa OneDrive-a ili SharePointa i pretvara u slike slajdova.',
        network: 'Veza je potrebna za preuzimanje izmenjene verzije.',
        refreshBehavior: 'Proverava se na svakih petnaest minuta.',
        offlineBehavior: 'Poslednja preuzeta verzija ostaje na ekranu i bez mreže.',
        limitations:
          'Animacije i prelazi se ne prikazuju — slajdovi se pretvaraju u slike. Za animaciju koristite video.',
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
          body: 'Set how long a slide holds and how it fits the screen — by width, by height, or filling it.',
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
          'Animations and transitions are not shown — slides are rendered as images. For motion, use video.',
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
        'Radi bez ijednog naloga — otpremite fajl i gotovo',
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
        refreshBehavior: 'Nema osvežavanja — dokument stoji dok ne otpremite nov.',
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
        'Needs no account at all — upload the file and you are done',
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
          body: 'A multi-page document advances by itself — slow, medium or fast, depending on how much text a page carries.',
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
        refreshBehavior: 'There is no refresh — the document stands until you upload a new one.',
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
} as const
