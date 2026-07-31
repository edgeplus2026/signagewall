// @ts-nocheck
/* Imagery for each post: a Pexels search term plus bilingual alt and caption.

   Kept apart from the copy files so the text stays readable, and keyed by post
   slug so `['fig', n]` in the content still resolves by index.

   The figure query is chosen for the section the figure actually sits in — a
   generic "office" shot dropped anywhere is exactly the problem this replaces.
   Captions add a point rather than restating the picture; an image that only
   repeats the paragraph above it is decoration. */

export const POST_IMAGES = {
  'digitalni-meni-povecava-prodaju': {
    cover: {
      query: 'cafe counter chalkboard menu interior',
      alt: { sr: 'Meni iznad pulta u kafiću', en: 'A menu above a café counter' },
    },
    figures: [
      {
        query: 'cafe menu board customer choosing',
        alt: { sr: 'Gost čita meni u kafiću', en: 'A guest reading a menu in a café' },
        caption: {
          sr: 'Raspored treba proveriti sa mesta na kom gost zaista čita meni, ne samo na laptopu.',
          en: 'Check the layout from where a guest actually reads the menu, not only on a laptop.',
        },
      },
    ],
  },
  'digital-signage-za-pocetnike': {
    cover: {
      query: 'television screen mounted on wall office',
      alt: { sr: 'Televizor montiran na zid', en: 'A television mounted on a wall' },
    },
    figures: [
      {
        query: 'mini pc small computer hdmi cable',
        alt: { sr: 'Mali uređaj povezan HDMI kablom', en: 'A small device connected over HDMI' },
        caption: {
          sr: 'Plejer je uređaj veličine šake iza ekrana. To je sav hardver koji dodajete.',
          en: 'The player is a hand-sized box behind the screen. That is all the hardware you add.',
        },
      },
    ],
  },
  'koliko-kosta-digital-signage': {
    cover: {
      query: 'calculator budget planning desk business',
      alt: { sr: 'Planiranje budžeta za stolom', en: 'Budget planning at a desk' },
    },
    figures: [
      {
        query: 'person reviewing spreadsheet costs laptop',
        alt: { sr: 'Pregled troškova u tabeli', en: 'Reviewing costs in a spreadsheet' },
        caption: {
          sr: 'Odvojite jednokratne i ponavljajuće stavke, pa ceo sistem računajte za isti vremenski period.',
          en: 'Separate one-off and recurring lines, then model the whole system over the same time period.',
        },
      },
    ],
  },
  'android-boks-ili-mini-pc': {
    cover: {
      query: 'mini pc computer device desk',
      alt: { sr: 'Mini računar na stolu', en: 'A mini PC on a desk' },
    },
    figures: [
      {
        query: 'android tv box streaming device',
        alt: { sr: 'Android boks povezan na televizor', en: 'An Android box connected to a TV' },
        caption: {
          sr: 'Pilot na stvarnom ekranu pokazuje da li uređaj pouzdano dekodira vaš najzahtevniji sadržaj.',
          en: 'A pilot on the real display shows whether the device reliably decodes your heaviest content.',
        },
      },
    ],
  },
  'ekran-mora-da-radi-i-bez-interneta': {
    cover: {
      query: 'blank black screen display in shop',
      alt: { sr: 'Prazan ekran u prostoru', en: 'A blank screen in a shop' },
    },
    figures: [
      {
        query: 'wifi router network cables office',
        alt: { sr: 'Mrežna oprema', en: 'Network equipment' },
        caption: {
          sr: 'Keširani mediji nastavljaju da rade bez mreže; web, YouTube i druge mrežne aplikacije ne mogu.',
          en: 'Cached media keeps playing offline; Web, YouTube and other network-only apps cannot.',
        },
      },
    ],
  },
  'raspored-sadrzaja-koji-se-sam-menja': {
    cover: {
      query: 'weekly planner calendar schedule desk',
      alt: { sr: 'Nedeljni plan na stolu', en: 'A weekly planner on a desk' },
    },
    figures: [
      {
        query: 'calendar week planning hand writing',
        alt: { sr: 'Planiranje nedelje u kalendaru', en: 'Planning a week in a calendar' },
        caption: {
          sr: 'Radno vreme pali i gasi prikaz celog ekrana; aplikacije sa podacima osvežavaju svoj sadržaj odvojeno.',
          en: 'Working hours control the whole screen; data-backed apps refresh their own content separately.',
        },
      },
    ],
  },
  'vertikalni-ili-horizontalni-ekran': {
    cover: {
      query: 'vertical digital display shopping mall',
      alt: { sr: 'Vertikalni ekran u tržnom centru', en: 'A portrait screen in a shopping centre' },
    },
    figures: [
      {
        query: 'wide screen menu display restaurant counter',
        alt: { sr: 'Široki ekran iznad pulta', en: 'A wide screen above a counter' },
        caption: {
          sr: 'Orijentaciju birajte prema prostoru, putanji pogleda i materijalu koji će se stvarno prikazivati.',
          en: 'Choose orientation from the space, viewing path and assets that will actually be shown.',
        },
      },
    ],
  },
  'greske-na-digitalnim-ekranima': {
    cover: {
      query: 'digital advertising screen city street',
      alt: { sr: 'Reklamni ekran na ulici', en: 'An advertising screen on a street' },
    },
    figures: [
      {
        query: 'bright led screen display close up',
        alt: { sr: 'Svetao LED ekran izbliza', en: 'A bright LED screen up close' },
        caption: {
          sr: 'Sitan tekst i slab kontrast su najčešći razlog zašto niko ne pročita poruku.',
          en: 'Small type and weak contrast are the usual reason nobody reads the message.',
        },
      },
    ],
  },
  'koliko-dugo-treba-da-traje-slajd': {
    cover: {
      query: 'people waiting in queue at counter',
      alt: { sr: 'Ljudi čekaju u redu', en: 'People waiting in a queue' },
    },
    figures: [
      {
        query: 'airport departure board travellers reading',
        alt: {
          sr: 'Putnici čitaju tablu sa polascima',
          en: 'Travellers reading a departure board',
        },
        caption: {
          sr: 'Trajanje slajda krenite od toga koliko sekundi gledalac uopšte stoji ispred ekrana.',
          en: 'Start slide duration from how many seconds the viewer actually stands there.',
        },
      },
    ],
  },
  'kako-meriti-da-li-ekran-radi-posao': {
    cover: {
      query: 'business analytics chart laptop desk',
      alt: { sr: 'Analitika na ekranu laptopa', en: 'Analytics on a laptop screen' },
    },
    figures: [
      {
        query: 'retail shelf products customer choosing',
        alt: {
          sr: 'Kupac bira proizvod sa police',
          en: 'A customer choosing a product from a shelf',
        },
        caption: {
          sr: 'Pre promene zabeležite početno stanje i spoljne faktore, pa rezultat tumačite kao signal, ne kao dokaz uzročnosti.',
          en: 'Record a baseline and outside factors first, then treat the result as a signal rather than proof of causation.',
        },
      },
    ],
  },
  'ekrani-u-maloprodaji-od-izloga-do-kase': {
    cover: {
      query: 'retail shop window display street',
      alt: { sr: 'Izlog prodavnice', en: 'A retail shop window' },
    },
    figures: [
      {
        query: 'supermarket aisle shopping customer',
        alt: { sr: 'Kupac u prolazu među policama', en: 'A shopper in a supermarket aisle' },
        caption: {
          sr: 'Kupac u izlogu i kupac na kasi nisu ista publika — razdvaja ih već doneta odluka.',
          en: 'The window shopper and the queuing customer aren’t the same audience.',
        },
      },
    ],
  },
  'sta-prikazati-u-cekaonici': {
    cover: {
      query: 'clinic waiting room chairs empty',
      alt: { sr: 'Čekaonica sa stolicama', en: 'A clinic waiting room' },
    },
    figures: [
      {
        query: 'hospital reception desk patients waiting',
        alt: { sr: 'Pacijenti čekaju na recepciji', en: 'Patients waiting at a reception desk' },
        caption: {
          sr: 'Ekran može da prikaže opšte informacije, ali SignageWall nema integraciju za red čekanja ili podatke pacijenata.',
          en: 'A screen can show general information, but SignageWall has no queue or patient-data integration.',
        },
      },
    ],
  },
  'google-sheets-na-ekranu': {
    cover: {
      query: 'spreadsheet data on laptop screen',
      alt: { sr: 'Tabela sa podacima na ekranu', en: 'A spreadsheet on a laptop screen' },
    },
    figures: [
      {
        query: 'person working spreadsheet office desk',
        alt: { sr: 'Rad u tabeli za radnim stolom', en: 'Working in a spreadsheet at a desk' },
        caption: {
          sr: 'Jedan red — jedna stavka, bez spojenih ćelija. Zaključano zaglavlje rešava većinu kvarova.',
          en: 'One row, one item, no merged cells. A locked header row prevents most breakages.',
        },
      },
    ],
  },
  'interna-komunikacija-ekran-umesto-mejla': {
    cover: {
      query: 'modern office corridor employees walking',
      alt: { sr: 'Hodnik u kancelariji', en: 'An office corridor' },
    },
    figures: [
      {
        query: 'office kitchen coffee break colleagues talking',
        alt: { sr: 'Kolege na pauzi za kafu', en: 'Colleagues on a coffee break' },
        caption: {
          sr: 'Ekran dopunjuje mejl i timske kanale kratkim porukama koje se čitaju u prolazu.',
          en: 'A screen complements email and team channels with short messages read in passing.',
        },
      },
    ],
  },
  'ekran-u-izlogu-citljivost': {
    cover: {
      query: 'shop window reflection sunlight street',
      alt: { sr: 'Odsjaj sunca na izlogu', en: 'Sunlight reflecting off a shop window' },
    },
    figures: [
      {
        query: 'storefront window display at night',
        alt: { sr: 'Izlog uveče', en: 'A storefront window at night' },
        caption: {
          sr: 'Svetlinu podešavate na displeju ili operativnom sistemu; SignageWall zakazuje samo radno vreme prikaza.',
          en: 'Brightness is set on the display or operating system; SignageWall schedules display working hours only.',
        },
      },
    ],
  },
  'zaglavljena-slika-burn-in': {
    cover: {
      query: 'old television screen damaged display',
      alt: { sr: 'Oštećen ekran televizora', en: 'A damaged television screen' },
    },
    figures: [
      {
        query: 'television screen pixels macro close up',
        alt: { sr: 'Pikseli ekrana izbliza', en: 'Screen pixels up close' },
        caption: {
          sr: 'Dugotrajni statični elementi povećavaju rizik na OLED panelu; pratite pixel-care uputstvo proizvođača.',
          en: 'Long-running static elements increase OLED risk; follow the panel maker’s pixel-care guidance.',
        },
      },
    ],
  },
  'tipografija-za-ekrane': {
    cover: {
      query: 'large typography sign lettering wall',
      alt: { sr: 'Krupna tipografija na zidu', en: 'Large lettering on a wall' },
    },
    figures: [
      {
        query: 'airport signage direction typography',
        alt: { sr: 'Aerodromska signalizacija', en: 'Airport wayfinding signage' },
        caption: {
          sr: 'Ne oslanjajte se na jednu formulu: pregledajte ekran sa najudaljenijeg stvarnog mesta čitanja.',
          en: 'Do not trust one formula: inspect the screen from the farthest real reading position.',
        },
      },
    ],
  },
  'vise-lokacija-jedan-tim': {
    cover: {
      query: 'team meeting office laptops discussion',
      alt: { sr: 'Tim na sastanku', en: 'A team in a meeting' },
    },
    figures: [
      {
        query: 'network connection map technology abstract',
        alt: { sr: 'Mreža povezanih tačaka', en: 'A network of connected points' },
        caption: {
          sr: 'Dosledna imena i zajedničke plejliste olakšavaju rad kada sadržaj dodeljujete izabranim ekranima.',
          en: 'Consistent names and reusable playlists help when assigning content to selected screens.',
        },
      },
    ],
  },
  'video-na-ekranima': {
    cover: {
      query: 'video editing timeline computer screen',
      alt: { sr: 'Montaža videa na računaru', en: 'Video editing on a computer' },
    },
    figures: [
      {
        query: 'video camera filming production screen',
        alt: { sr: 'Snimanje video materijala', en: 'Filming video content' },
        caption: {
          sr: 'Video bez zvuka mora da se razume bez zvuka — u prostoru se ton skoro nikad ne pušta.',
          en: 'Silent video has to work silently — sound is almost never on in a public space.',
        },
      },
    ],
  },
  'sta-pitati-dobavljaca': {
    cover: {
      query: 'business meeting contract discussion office',
      alt: { sr: 'Poslovni sastanak', en: 'A business meeting' },
    },
    figures: [
      {
        query: 'business people reviewing documents together',
        alt: { sr: 'Pregled dokumentacije na sastanku', en: 'Reviewing documents in a meeting' },
        caption: {
          sr: 'Pilot radite na svom ekranu i sa svojim sadržajem, uz unapred zapisane kriterijume prolaza.',
          en: 'Run the pilot on your own screen and content, with pass criteria written down in advance.',
        },
      },
    ],
  },
}
