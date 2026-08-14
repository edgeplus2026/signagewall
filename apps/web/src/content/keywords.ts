/**
 * The search brief for every page this repository owns the copy of.
 *
 * The CMS content already carries one of these per document — `intent` in
 * `scripts/data/solutions-curated.ts` and `app-copy.ts`. The pages people
 * actually land on first did not, and it showed: across 8,561 words of body
 * copy the site said "digital signage" twelve times, "digital signage player"
 * never, and "digital menu board" never, while the title tags promised all
 * three. A search engine reads the whole page, so a title that claims a term
 * the body never uses is a claim the page cannot support.
 *
 * One page owns one primary query. That is the rule the whole file exists to
 * enforce: two pages competing for the same term split their own signal, and
 * `notTargeting` is where each page says out loud which neighbouring term it
 * is deliberately leaving to another page.
 *
 * `secondary` is the vocabulary the page should be able to use without
 * straining — not a quota to hit. If a sentence reads worse for containing the
 * term, the sentence wins; the term belongs somewhere it fits.
 *
 * Deliberately free of imports: `scripts/content-audit.mjs` transpiles this
 * file and imports it as data, without a database or a Next.js runtime.
 */

export type IntentType =
  | 'informational'
  | 'commercial-investigation'
  | 'transactional'
  | 'navigational'

export interface SearchIntent {
  /** The one query this page is written to win. Owned by exactly one page. */
  primaryQuery: string
  intentType: IntentType
  audience: string
  jobToBeDone: string
  uniquePromise: string
  /** Neighbouring queries this page leaves to the page that owns them. */
  notTargeting: string
}

export interface RouteKeywords {
  /** The internal route, spelled as `routing.ts` spells it. */
  route: string
  /** The locale message namespace holding this page's copy. */
  messages: string
  en: SearchIntent
  sr: SearchIntent
  /** Vocabulary the page should carry naturally, per locale. */
  secondary: { en: string[]; sr: string[] }
}

export const ROUTE_KEYWORDS: RouteKeywords[] = [
  {
    route: '/',
    messages: 'home',
    en: {
      primaryQuery: 'digital signage software',
      intentType: 'commercial-investigation',
      audience:
        'Owners and managers of venues that already have screens or a television on the wall',
      jobToBeDone:
        'Decide which software to run their screens on, having understood in one page what the product does and what it costs.',
      uniquePromise:
        'States the whole offer on the landing page: any television, a browser, published per-screen pricing, and playback that survives a dropped connection.',
      notTargeting:
        'The definition of the category, the hardware buying decision, and per-industry set-ups, each of which has its own page.',
    },
    sr: {
      primaryQuery: 'digital signage softver',
      intentType: 'commercial-investigation',
      audience: 'Vlasnici i menadžeri objekata koji već imaju ekrane ili televizor na zidu',
      jobToBeDone:
        'Odaberu softver za svoje ekrane, pošto su na jednoj stranici razumeli šta proizvod radi i koliko košta.',
      uniquePromise:
        'Iznosi celu ponudu na ulaznoj stranici: bilo koji televizor, pregledač, objavljena cena po ekranu i reprodukcija koja preživi prekid veze.',
      notTargeting:
        'Definicija pojma, odluka o kupovini hardvera i podešavanja po delatnostima — svako od toga ima svoju stranicu.',
    },
    secondary: {
      en: [
        'digital signage',
        'digital signage system',
        'screens',
        'remote management',
        'scheduling',
      ],
      sr: ['digital signage', 'digitalni ekrani', 'upravljanje na daljinu', 'zakazivanje sadržaja'],
    },
  },
  {
    route: '/what-is-digital-signage',
    messages: 'whatIsSignage',
    en: {
      primaryQuery: 'what is digital signage',
      intentType: 'informational',
      audience: 'People who have heard the term and are starting from no prior knowledge of it',
      jobToBeDone:
        'Understand what the category is, which three parts it consists of, and whether it applies to their own space at all.',
      uniquePromise:
        'Defines the category in plain language and names the parts, without turning the explanation into a sales page for one product.',
      notTargeting:
        'Choosing between vendors, the price of this particular product, and the step-by-step set-up of a first screen.',
    },
    sr: {
      primaryQuery: 'šta je digital signage',
      intentType: 'informational',
      audience: 'Ljudi koji su čuli za pojam i kreću bez ikakvog predznanja o njemu',
      jobToBeDone:
        'Razumeju šta je ta oblast, od koja tri dela se sastoji i da li se uopšte odnosi na njihov prostor.',
      uniquePromise:
        'Objašnjava pojam običnim jezikom i imenuje njegove delove, bez pretvaranja objašnjenja u prodajnu stranicu jednog proizvoda.',
      notTargeting:
        'Biranje između proizvođača, cena baš ovog proizvoda i korak-po-korak podešavanje prvog ekrana.',
    },
    secondary: {
      en: ['digital signage', 'digital display', 'digital signage screen', 'signage content'],
      sr: ['digital signage', 'digitalni ekran', 'reklamni ekran', 'sadržaj na ekranu'],
    },
  },
  {
    route: '/how-it-works',
    messages: 'howItWorks',
    en: {
      primaryQuery: 'how does digital signage work',
      intentType: 'informational',
      audience:
        'Someone who has decided the category is relevant and wants the mechanics before committing',
      jobToBeDone:
        'Follow the path from an unconnected television to a screen showing scheduled content, and judge how much work it is.',
      uniquePromise:
        'Walks the three operations in order — pair the player, compose the content, publish remotely — with nothing hidden behind an installer visit.',
      notTargeting:
        'What the term means, the catalogue of individual apps, and which device to buy to run the player on.',
    },
    sr: {
      primaryQuery: 'kako radi digital signage',
      intentType: 'informational',
      audience:
        'Neko ko je zaključio da mu oblast odgovara i traži mehaniku pre nego što se obaveže',
      jobToBeDone:
        'Isprate put od nepovezanog televizora do ekrana sa zakazanim sadržajem i procene koliko je to posla.',
      uniquePromise:
        'Prolazi kroz tri radnje redom — uparivanje plejera, sastavljanje sadržaja, objava na daljinu — bez ijednog koraka koji zahteva izlazak tehničara.',
      notTargeting:
        'Značenje pojma, katalog pojedinačnih aplikacija i izbor uređaja na kom će plejer raditi.',
    },
    secondary: {
      en: ['digital signage player', 'pairing code', 'publish content', 'digital signage screen'],
      sr: ['digital signage plejer', 'registracioni kod', 'objava sadržaja', 'ekran'],
    },
  },
  {
    route: '/features',
    messages: 'features',
    en: {
      primaryQuery: 'digital signage cms',
      intentType: 'commercial-investigation',
      audience: 'Buyers comparing what one dashboard can do against another before shortlisting',
      jobToBeDone:
        'Check that the management side covers scheduling, zones, user roles and branding before they trust a network of screens to it.',
      uniquePromise:
        'Names every capability of the management dashboard on one page, including the ones that only matter above ten screens.',
      notTargeting:
        'The price of the product, the individual content apps, and how a first screen is connected.',
    },
    sr: {
      primaryQuery: 'digital signage kontrolna tabla',
      intentType: 'commercial-investigation',
      audience: 'Kupci koji upoređuju mogućnosti jedne kontrolne table sa drugom pre užeg izbora',
      jobToBeDone:
        'Provere da upravljački deo pokriva zakazivanje, zone, korisničke uloge i brendiranje pre nego što mu povere mrežu ekrana.',
      uniquePromise:
        'Imenuje sve mogućnosti upravljačke table na jednoj stranici, uključujući one koje počinju da znače tek iznad deset ekrana.',
      notTargeting:
        'Cena proizvoda, pojedinačne aplikacije za sadržaj i način povezivanja prvog ekrana.',
    },
    secondary: {
      en: [
        'digital signage software',
        'content management',
        'remote management',
        'screen management',
        'multi-screen',
        'playlist',
      ],
      sr: [
        'digital signage softver',
        'upravljanje sadržajem',
        'upravljanje na daljinu',
        'više ekrana',
        'plejlista',
      ],
    },
  },
  {
    route: '/pricing',
    messages: 'pricing',
    en: {
      primaryQuery: 'digital signage software pricing',
      intentType: 'transactional',
      audience:
        'Buyers who have decided on the category and need a number before they can proceed internally',
      jobToBeDone:
        'Find the actual per-screen figure, what it includes, and what happens above the published tier.',
      uniquePromise:
        'Publishes the per-screen monthly figure with every feature included at the low end, rather than routing the question to a sales call.',
      notTargeting:
        'What the software can do, what the hardware costs, and the definition of the category.',
    },
    sr: {
      primaryQuery: 'cena digital signage softvera',
      intentType: 'transactional',
      audience: 'Kupci koji su odlučili za oblast i treba im broj da bi krenuli dalje interno',
      jobToBeDone:
        'Nađu stvarni iznos po ekranu, šta je u njemu uključeno i šta se dešava iznad objavljenog nivoa.',
      uniquePromise:
        'Objavljuje mesečni iznos po ekranu sa svim mogućnostima uključenim na donjem nivou, umesto da pitanje preusmeri na prodajni razgovor.',
      notTargeting: 'Šta softver ume, koliko košta hardver i objašnjenje same oblasti.',
    },
    secondary: {
      en: ['digital signage software', 'per screen', 'free trial', 'no contract'],
      sr: ['digital signage softver', 'po ekranu', 'besplatan probni period', 'bez ugovora'],
    },
  },
  {
    route: '/hardware',
    messages: 'hardware',
    en: {
      primaryQuery: 'digital signage player',
      intentType: 'informational',
      audience: 'Someone sold on the software who now has to buy the box that will run it',
      jobToBeDone:
        'Choose between an Android box, a mini PC and a device they already own, and know roughly what each costs.',
      uniquePromise:
        'Advises on hardware from a vendor that does not sell any, and therefore has no reason to talk the reader upward.',
      notTargeting:
        'The subscription figure, the management dashboard, and the connection procedure itself.',
    },
    sr: {
      primaryQuery: 'digital signage plejer',
      intentType: 'informational',
      audience: 'Neko ko je odlučio za softver i sada mora da kupi uređaj koji će ga pokretati',
      jobToBeDone:
        'Izaberu između Android boksa, mini računara i uređaja koji već imaju, i saznaju koliko koji otprilike košta.',
      uniquePromise:
        'Savetuje o hardveru od proizvođača koji hardver ne prodaje, pa nema razlog da čitaoca gura naviše.',
      notTargeting: 'Iznos pretplate, upravljačka tabla i sam postupak povezivanja.',
    },
    secondary: {
      en: [
        'digital signage player',
        'media player',
        'Android box',
        'mini PC',
        'commercial display',
      ],
      sr: [
        'digital signage plejer',
        'medija plejer',
        'Android boks',
        'mini računar',
        'komercijalni displej',
      ],
    },
  },
  {
    route: '/apps',
    messages: 'apps',
    en: {
      primaryQuery: 'digital signage apps',
      intentType: 'commercial-investigation',
      audience: 'Buyers checking whether a specific source they already use can go on a screen',
      jobToBeDone:
        'Confirm that the source they have in mind — a spreadsheet, a calendar, a social feed — is covered before they commit.',
      uniquePromise:
        'Lists every built-in source by category, so a reader can find their own tool rather than read a promise that integrations exist.',
      notTargeting:
        'The dashboard capabilities as a whole, industry set-ups, and the price of the subscription.',
    },
    sr: {
      primaryQuery: 'aplikacije za digital signage',
      intentType: 'commercial-investigation',
      audience: 'Kupci koji proveravaju da li određeni izvor koji već koriste može na ekran',
      jobToBeDone:
        'Potvrde da je izvor na koji misle — tabela, kalendar, društvena mreža — pokriven pre nego što se obavežu.',
      uniquePromise:
        'Nabraja svaki ugrađeni izvor po kategorijama, da čitalac nađe svoj alat umesto obećanja da integracije postoje.',
      notTargeting:
        'Mogućnosti kontrolne table u celini, podešavanja po delatnostima i cena pretplate.',
    },
    secondary: {
      en: ['digital signage apps', 'digital signage content', 'menu app', 'dashboard app'],
      sr: ['aplikacije za digital signage', 'sadržaj za ekrane', 'aplikacija za meni'],
    },
  },
  {
    route: '/solutions',
    messages: 'solutions',
    en: {
      primaryQuery: 'digital signage solutions',
      intentType: 'commercial-investigation',
      audience:
        'Buyers who want to see the product framed around their own line of work before reading further',
      jobToBeDone: 'Recognise their own industry in the list and move to the page written for it.',
      uniquePromise:
        'Routes by industry rather than by feature, so the reader reaches their own use case in one click instead of translating a feature list.',
      notTargeting:
        'The individual industry pages themselves, the feature inventory, and the definition of the category.',
    },
    sr: {
      primaryQuery: 'digital signage rešenja',
      intentType: 'commercial-investigation',
      audience: 'Kupci koji žele da vide proizvod kroz svoju delatnost pre nego što čitaju dalje',
      jobToBeDone: 'Prepoznaju svoju delatnost u listi i pređu na stranicu pisanu za nju.',
      uniquePromise:
        'Vodi po delatnosti umesto po mogućnostima, pa čitalac stiže do svog slučaja u jednom kliku umesto da prevodi spisak funkcija.',
      notTargeting: 'Same stranice po delatnostima, popis mogućnosti i objašnjenje oblasti.',
    },
    secondary: {
      en: [
        'digital signage',
        'digital signage for retail',
        'digital menu board',
        'workplace screens',
      ],
      sr: ['digital signage', 'digital signage za maloprodaju', 'digitalni meni', 'ekrani u firmi'],
    },
  },
  {
    route: '/download',
    messages: 'download',
    en: {
      primaryQuery: 'digital signage player download',
      intentType: 'transactional',
      audience: 'Existing and trial users installing the player on a device in front of them',
      jobToBeDone: 'Get the right build for the device they are holding and install it.',
      uniquePromise:
        'Offers a build per platform on one page, so nobody has to work out which one their device takes.',
      notTargeting: 'Which device to buy, what the software does, and the price of a subscription.',
    },
    sr: {
      primaryQuery: 'preuzimanje digital signage plejera',
      intentType: 'transactional',
      audience: 'Postojeći i probni korisnici koji instaliraju plejer na uređaj pred sobom',
      jobToBeDone: 'Preuzmu odgovarajuću verziju za uređaj koji drže i instaliraju je.',
      uniquePromise:
        'Nudi verziju po platformi na jednoj stranici, da niko ne mora da zaključuje koja ide na njegov uređaj.',
      notTargeting: 'Koji uređaj kupiti, šta softver radi i cena pretplate.',
    },
    secondary: {
      en: ['digital signage player', 'Android', 'Windows', 'install'],
      sr: ['digital signage plejer', 'Android', 'Windows', 'instalacija'],
    },
  },
  {
    route: '/blog',
    messages: 'blog',
    en: {
      primaryQuery: 'digital signage guides',
      intentType: 'informational',
      audience: 'Readers researching one narrow question rather than evaluating a product',
      jobToBeDone: 'Find the article that answers the single question that brought them here.',
      uniquePromise:
        'Collects the operational questions — slide duration, orientation, screen placement — that vendor pages usually skip.',
      notTargeting:
        'Product capability, pricing, and the introductory explanation of the category.',
    },
    sr: {
      primaryQuery: 'vodiči za digital signage',
      intentType: 'informational',
      audience: 'Čitaoci koji istražuju jedno usko pitanje, a ne procenjuju proizvod',
      jobToBeDone: 'Nađu tekst koji odgovara na jedno pitanje zbog kog su i došli.',
      uniquePromise:
        'Skuplja praktična pitanja — trajanje slajda, orijentacija, mesto ekrana — koja proizvođačke stranice obično preskaču.',
      notTargeting: 'Mogućnosti proizvoda, cena i uvodno objašnjenje oblasti.',
    },
    secondary: {
      en: ['digital signage', 'digital signage content', 'screen placement'],
      sr: ['digital signage', 'sadržaj za ekrane', 'raspored ekrana'],
    },
  },
  {
    route: '/about',
    messages: 'about',
    en: {
      primaryQuery: 'SignageWall company',
      intentType: 'navigational',
      audience:
        'Readers checking who is behind the product before they trust it with a subscription',
      jobToBeDone: 'Decide whether the people behind the software are worth buying from.',
      uniquePromise:
        'Explains the positions the product takes and why, in place of a founding story nobody asked for.',
      notTargeting:
        'Any category or product query — this page exists to be found by name, not by need.',
    },
    sr: {
      primaryQuery: 'SignageWall kompanija',
      intentType: 'navigational',
      audience: 'Čitaoci koji proveravaju ko stoji iza proizvoda pre nego što mu poveri pretplatu',
      jobToBeDone: 'Odluče da li vredi kupovati od ljudi iza softvera.',
      uniquePromise:
        'Objašnjava stavove koje proizvod zauzima i zašto, umesto priče o osnivanju koju niko nije tražio.',
      notTargeting:
        'Bilo koji upit o oblasti ili proizvodu — ova stranica postoji da bude nađena po imenu, ne po potrebi.',
    },
    secondary: { en: ['SignageWall'], sr: ['SignageWall'] },
  },
  {
    route: '/contact',
    messages: 'contact',
    en: {
      primaryQuery: 'contact SignageWall',
      intentType: 'navigational',
      audience:
        'Readers with a question the pages did not answer, and buyers above the published tier',
      jobToBeDone: 'Reach a person, and know when to expect an answer.',
      uniquePromise: 'States the reply window rather than leaving the sender to guess at it.',
      notTargeting:
        'Every product and category query — this page is reached on purpose, not found.',
    },
    sr: {
      primaryQuery: 'kontakt SignageWall',
      intentType: 'navigational',
      audience:
        'Čitaoci sa pitanjem na koje stranice nisu odgovorile i kupci iznad objavljenog nivoa',
      jobToBeDone: 'Dođu do čoveka i znaju kada da očekuju odgovor.',
      uniquePromise: 'Navodi rok za odgovor umesto da pošiljalac nagađa.',
      notTargeting:
        'Svi upiti o proizvodu i oblasti — do ove stranice se dolazi namerno, ne pretragom.',
    },
    secondary: { en: ['SignageWall'], sr: ['SignageWall'] },
  },
]
