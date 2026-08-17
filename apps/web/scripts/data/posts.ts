// @ts-nocheck
/* Stable metadata for the 20 bilingual Blog posts.

   Full reviewed bodies, intent briefs and link briefs live in posts-full.ts.
   Keeping the base records body-free prevents an older short-form draft from
   becoming a silent fallback in the seed.
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
      metaTitle: 'Kako napraviti digitalni meni koji pomaže prodaji',
      metaDescription:
        'Praktičan postupak za jasan digitalni meni: izbor stavki, izvor podataka, čitljiv dizajn i merenje rezultata bez obećanja o rastu prodaje.',
      title: 'Kako napraviti digitalni meni koji pomaže prodaji',
      excerpt:
        'Digitalni meni može da olakša izbor gostu i održavanje ponude timu. Rezultat zavisi od sadržaja, pa ga treba proveriti podacima.',
    },
    en: {
      metaTitle: 'How to design a digital menu board for sales',
      metaDescription:
        'A practical digital-menu workflow: choose the items, connect the source, design for readability, and measure outcomes without promising a sales lift.',
      slug: 'digital-menu-increases-sales',
      title: 'How to build a digital menu that supports sales',
      excerpt:
        'A digital menu can make choosing easier for guests and updates easier for staff. Its effect still needs to be measured with your own data.',
    },
  },
  {
    slug: 'digital-signage-za-pocetnike',
    category: 'vodici',
    publishedAt: '2026-07-20T09:00:00.000Z',
    sr: {
      metaTitle: 'Digital signage za početnike: šta vam treba',
      metaDescription:
        'Prvi ekran korak po korak: displej, plejer, nalog, šestokarakterni kod, mediji ili aplikacije, provera offline rada i radnog vremena.',
      title: 'Digital signage za početnike: šta vam zaista treba',
      excerpt:
        'Mislite da za digitalne ekrane treba skupa oprema i tehničar? Potrebno je troje, i verovatno već imate dvoje.',
    },
    en: {
      metaTitle: 'Digital signage for beginners: what you need',
      metaDescription:
        'Set up a first screen with a display, player, account, six-character pairing code, media or apps, an offline check and working hours.',
      slug: 'digital-signage-for-beginners',
      title: 'Digital signage for beginners: what you actually need',
      excerpt:
        'Think digital screens need expensive kit and a technician? You need three things, and you probably already own two of them.',
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
        'Cena ekrana je najmanji deo priče. Evo gde se novac stvarno troši, i gde se najčešće nepotrebno preplati.',
    },
    en: {
      metaTitle: 'What digital signage actually costs in 2026',
      metaDescription:
        'Three separate numbers vendors tend to blur: the screen, the player and the subscription. Real figures, plus where the money usually gets wasted.',
      slug: 'digital-signage-cost',
      title: 'What digital signage actually costs',
      excerpt:
        'The screen is the smallest part of the bill. Here is where the money really goes, and where it most often gets overspent.',
    },
  },
  {
    slug: 'android-boks-ili-mini-pc',
    category: 'tehnika',
    publishedAt: '2026-07-15T09:00:00.000Z',
    sr: {
      metaTitle: 'Android boks ili mini-PC za digital signage?',
      metaDescription:
        'Oba rade prvog dana. Razlika se vidi posle šest meseci neprekidnog rada, a tada je zamena hardvera skuplja opcija.',
      title: 'Android boks ili mini-PC: šta izabrati za plejer',
      excerpt:
        'Oba rade. Razlika se vidi tek posle šest meseci neprekidnog rada, i tada je kasno da se menja.',
    },
    en: {
      metaTitle: 'Android box or mini PC for digital signage?',
      metaDescription:
        'Both work on day one. The difference shows after six months of continuous running, and by then swapping the hardware is the expensive option.',
      slug: 'android-box-or-mini-pc',
      title: 'Android box or mini-PC: choosing a player',
      excerpt:
        'Both work. The difference only shows after six months of continuous running, and by then it is too late to change.',
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
    },
    en: {
      metaTitle: 'Why a signage screen must work offline',
      metaDescription:
        'A blank screen in a window is worse than no screen. What separates a player that caches content from one that streams it, and how to tell before you buy.',
      slug: 'screens-that-work-offline',
      title: 'Why a screen has to keep working when the internet drops',
      excerpt:
        'A blank screen in a window is worse than no screen at all. Here is what a player that refuses to go blank looks like.',
    },
  },
  {
    slug: 'raspored-sadrzaja-koji-se-sam-menja',
    category: 'vodici',
    publishedAt: '2026-07-10T09:00:00.000Z',
    sr: {
      metaTitle: 'Kako automatizovati sadržaj na digitalnom ekranu',
      metaDescription:
        'Napravite ekran koji traži manje održavanja uz izvore koji se osvežavaju i radno vreme ekrana, bez obećanja o automatskom dayparting-u.',
      title: 'Kako automatizovati ažuriranje sadržaja na ekranu',
      excerpt:
        'SignageWall trenutno zakazuje radno vreme celog ekrana, ne pojedinačne stavke. Ipak, pravi izbor aplikacija smanjuje ručne izmene.',
    },
    en: {
      metaTitle: 'How to automate digital signage content updates',
      metaDescription:
        'Reduce digital-signage upkeep with self-refreshing sources and whole-screen working hours, without claiming per-item dayparting.',
      slug: 'content-schedule-that-runs-itself',
      title: 'How to automate digital signage content updates',
      excerpt:
        'SignageWall schedules working hours for the whole screen, not individual items. The right data-backed apps can still reduce manual updates.',
    },
  },
  {
    slug: 'vertikalni-ili-horizontalni-ekran',
    category: 'dizajn',
    publishedAt: '2026-07-08T09:00:00.000Z',
    sr: {
      metaTitle: 'Vertikalni ili horizontalni ekran: kada koji',
      metaDescription:
        'Orijentacija nije estetska odluka. Ona određuje koliko staje i sa koje daljine se čita, a menja se skupo, kad je ekran već na zidu.',
      title: 'Vertikalni ili horizontalni ekran: kada koji',
      excerpt:
        'Orijentacija ekrana nije estetska odluka. Ona određuje koliko informacija stane i sa koje udaljenosti se čita.',
    },
    en: {
      metaTitle: 'Portrait or landscape: screen orientation',
      metaDescription:
        'Orientation is not an aesthetic call. It decides how much fits and from how far away it can be read, and it is expensive to change after mounting.',
      slug: 'portrait-or-landscape-screen',
      title: 'Portrait or landscape: choosing screen orientation',
      excerpt:
        'Orientation isn’t an aesthetic decision. It determines how much information fits and from how far away it can be read.',
    },
  },
  {
    slug: 'greske-na-digitalnim-ekranima',
    category: 'saveti',
    publishedAt: '2026-07-05T09:00:00.000Z',
    sr: {
      metaTitle: 'Digital signage kontrolna lista pre objave',
      metaDescription:
        'Sedam provera za orijentaciju, čitljivost, fajlove, trajanje, offline rad, radno vreme i vlasnika sadržaja pre puštanja ekrana.',
      title: 'Digital signage kontrolna lista pre objave',
      excerpt:
        'Jedan kratak QA prolaz otkriva probleme koje je na laptopu lako propustiti, a na zidu teško ignorisati.',
    },
    en: {
      metaTitle: 'Digital signage pre-launch checklist',
      metaDescription:
        'Seven checks for orientation, readability, media, timing, offline behavior, working hours and content ownership before launch.',
      slug: 'digital-signage-mistakes',
      title: 'A digital signage pre-launch checklist',
      excerpt:
        'One short QA pass catches problems that are easy to miss on a laptop and difficult to ignore once the screen is on the wall.',
    },
  },
  {
    slug: 'koliko-dugo-treba-da-traje-slajd',
    category: 'dizajn',
    publishedAt: '2026-07-03T09:00:00.000Z',
    sr: {
      metaTitle: 'Koliko dugo treba da traje jedan slajd',
      metaDescription:
        'Odgovor nije deset sekundi. Zavisi od toga koliko gledalac uopšte stoji tu, a to je broj koji možete da izmerite ove nedelje.',
      title: 'Koliko dugo treba da traje jedan slajd',
      excerpt:
        'Odgovor nije „deset sekundi". Zavisi od toga koliko dugo gledalac uopšte stoji ispred ekrana.',
    },
    en: {
      metaTitle: 'How long should a signage slide stay on screen?',
      metaDescription:
        'The answer is not ten seconds. It depends on how long the viewer stands there at all, which is a number you can measure this week.',
      slug: 'how-long-should-a-slide-last',
      title: 'How long should a slide stay on screen',
      excerpt:
        'The answer isn’t “ten seconds”. It depends on how long the viewer stands in front of the screen at all.',
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
        'SignageWall nema ugrađenu analitiku prikaza. Rezultat zato merite spoljnim podacima, početnim stanjem i pažljivim poređenjem.',
    },
    en: {
      metaTitle: 'How to measure whether a screen is working',
      metaDescription:
        'A screen has no click-through rate, but it is not unmeasurable. Four numbers that tell you the truth, and one that does not.',
      slug: 'measuring-digital-signage-results',
      title: 'How to measure whether a screen is doing its job',
      excerpt:
        'SignageWall has no built-in proof-of-play analytics. Measure outcomes with external data, a baseline and a careful comparison.',
    },
  },
]

/* Split across two files so neither becomes unreadable; order here is the
   order they appear in the seed log, not on the site (that sorts by date). */
export const POSTS = [...POSTS_1, ...POSTS_2]
