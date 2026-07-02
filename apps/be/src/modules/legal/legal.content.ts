import type { LegalDocType, LegalLocale } from './legal.constants';

export interface LegalBody {
  title: string;
  /** Markdown body, rendered read-only by the CMS. */
  body: string;
}

/**
 * Legal copy for Edge, served by `GET /legal/documents`. Comprehensive draft
 * covering the standard sections; **have it reviewed by legal counsel and fill
 * the bracketed company details before public launch.** When the wording changes
 * materially, bump the matching `version` in `legal.constants.ts` so users are
 * asked to re-consent. Rendered with a tiny Markdown subset (`#`/`##` headings,
 * paragraphs, `-` bullets, `_italics_`).
 */

const TOS_EN = `# Terms of Service

_Last updated: 1 July 2026._

These Terms of Service ("Terms") govern your access to and use of the Edge
digital-signage platform, including the content-management dashboard, the player
application and related APIs and services (together, the "Service"), operated by
[Company legal name, address and registration number] ("Edge", "we", "us"). By
creating an account or using the Service you agree to these Terms. If you do not
agree, do not use the Service.

## 1. Definitions
- "Account" means your registered user account.
- "Organization" means a workspace that owns screens, playlists, media and app instances, and to which one or more users belong.
- "Content" means media, playlists, text, configuration and other material you upload or create in the Service.
- "Player" means a device or application that displays Content on a screen.

## 2. Eligibility
You must be at least 18 years old and able to form a binding contract. If you use
the Service on behalf of an organization, you represent that you are authorized to
bind that organization to these Terms.

## 3. Accounts and registration
You must provide accurate registration information and keep it up to date. You are
responsible for safeguarding your credentials and for all activity under your
Account. Notify us promptly of any unauthorized use. You are responsible for the
acts and omissions of every user you invite to your Organization.

## 4. The Service
Edge lets you manage screens, build playlists, upload media, configure apps and
publish Content to Players. Features may change, improve or be discontinued over
time. We may set reasonable technical limits (for example on file size, storage or
request rate).

## 5. Acceptable use
You agree not to:
- upload or display Content that is unlawful, infringing, defamatory, obscene, or that violates the rights of others;
- use the Service to distribute malware or to attempt to gain unauthorized access to any system or data;
- interfere with or disrupt the integrity or performance of the Service;
- reverse engineer, resell or provide the Service to third parties except as expressly permitted;
- use the Service in violation of any applicable law or third-party terms.
You are solely responsible for ensuring you have the rights to display all Content
on your screens, including any public-performance or licensing rights.

## 6. Your Content
You retain all rights to your Content. You grant us a worldwide, non-exclusive,
royalty-free license to host, store, process, reproduce and display your Content
solely to operate and provide the Service to you (including delivering it to your
Players and generating thumbnails and previews). You are responsible for the
legality of your Content and for having all necessary rights and consents.

## 7. Third-party services and integrations
The Service may integrate with third-party providers (for example Google Calendar
or Canva) that you choose to connect. Your use of those integrations is subject to
the third party's terms and privacy practices. We are not responsible for
third-party services, and connecting them is at your discretion. You may disconnect
an integration at any time.

## 8. Intellectual property
The Service, including its software, design and trademarks, is owned by Edge and
its licensors and is protected by intellectual-property laws. Except for the rights
expressly granted to you, no rights are transferred. You may not use our trademarks
without our prior written consent.

## 9. Fees
If any part of the Service is offered for a fee, the applicable pricing and payment
terms will be presented to you before purchase. Unless stated otherwise, fees are
non-refundable except where required by law.

## 10. Availability and support
We strive to keep the Service available but do not guarantee uninterrupted or
error-free operation. We may perform maintenance, updates and changes. Support is
provided on a commercially reasonable basis.

## 11. Suspension and termination
We may suspend or terminate your access if you materially breach these Terms, if
required by law, or to protect the Service or other users. You may stop using the
Service and delete your Account at any time (see Section 12).

## 12. Account and organization deletion
You may delete your Account or an Organization from the Service settings. Deletion
starts a 30-day grace period during which access is disabled; if you log back in
within that period your Account is restored. After the grace period we permanently
delete or anonymize the associated data as described in the Privacy Policy. Deleting
an Organization permanently removes its screens, devices, playlists, app instances
and media after the grace period.

## 13. Disclaimers
The Service is provided "as is" and "as available" without warranties of any kind,
whether express, implied or statutory, including warranties of merchantability,
fitness for a particular purpose and non-infringement, to the maximum extent
permitted by law.

## 14. Limitation of liability
To the maximum extent permitted by law, Edge will not be liable for any indirect,
incidental, special, consequential or punitive damages, or for any loss of profits,
revenue, data or goodwill. Our aggregate liability arising out of or relating to the
Service will not exceed the amounts you paid to us for the Service in the twelve
months preceding the event giving rise to the claim, or, where the Service is
provided free of charge, a nominal amount permitted by law.

## 15. Indemnification
You agree to indemnify and hold Edge harmless from claims, damages and expenses
(including reasonable legal fees) arising out of your Content, your use of the
Service, or your breach of these Terms.

## 16. Changes to the Terms
We may update these Terms from time to time. When we make material changes we will
update the version and ask you to accept the new Terms before continuing to use the
Service. Your continued use after changes take effect constitutes acceptance.

## 17. Governing law and disputes
These Terms are governed by the laws of the Republic of Serbia, without regard to
conflict-of-law rules. The courts of Serbia have exclusive jurisdiction over any
dispute, unless mandatory law provides otherwise.

## 18. Miscellaneous
If any provision is held unenforceable, the remaining provisions remain in effect.
Our failure to enforce a provision is not a waiver. You may not assign these Terms
without our consent; we may assign them in connection with a merger, acquisition or
sale of assets.

## 19. Contact
Questions about these Terms: [legal@yourdomain]. [Company legal name and registered
address].`;

const PRIVACY_EN = `# Privacy Policy

_Last updated: 1 July 2026._

This Privacy Policy explains how the Edge digital-signage platform ("Edge", "we",
"us") collects, uses and protects personal data, and the rights you have. The data
controller is [Company legal name, registered address and contact]. We process data
in accordance with the Serbian Law on Personal Data Protection (ZZPL) and, where it
applies to you, the EU General Data Protection Regulation (GDPR).

## 1. Data we collect
- Account data: your name, email address, phone number, optional company name, password (stored only as a secure hash) and, if you sign in with Google, your Google account identifier.
- Organization and membership data: the organizations you belong to and your role.
- Content data: media, playlists, screen and app configuration you upload or create.
- Player and device data: pairing information, device identifiers, versions and online/offline status of your screens.
- Usage and technical data: log data, IP address, timestamps and actions performed (for security and to operate the Service).
- Consent records: which version of these documents you accepted, when, and the IP address used, to evidence your consent.
- Communications: messages you send us (support, feedback, problem reports).

## 2. How we use data
We use personal data to:
- provide, operate, maintain and secure the Service;
- authenticate you and manage accounts, organizations and permissions;
- deliver your Content to your Players;
- communicate with you about the Service, including verification and security notices;
- provide support and respond to your requests;
- comply with legal obligations and enforce our Terms.

## 3. Legal bases
Where GDPR/ZZPL applies, we rely on: performance of a contract (to provide the
Service); our legitimate interests (to secure and improve the Service); your consent
(where requested, e.g. for the legal documents); and compliance with legal
obligations.

## 4. Sharing and processors
We do not sell your personal data. We share data only with service providers
("processors") who act on our behalf under appropriate agreements, including:
- cloud object storage (Cloudflare R2) for your media;
- our email delivery provider for transactional emails;
- third-party integrations you explicitly connect (for example Google or Canva), limited to what those integrations require.
We may also disclose data where required by law or to protect our rights, users or
the public.

## 5. Data residency and international transfers
We host data in Serbia. Where data is processed by providers outside your country,
we take steps to ensure an adequate level of protection as required by applicable
law.

## 6. Retention
We retain personal data for as long as your Account is active and as needed to
provide the Service. When you delete your Account, we begin a 30-day grace period,
after which we anonymize your personal data (your name and email are replaced with a
non-identifying placeholder) and delete your consent records; non-personal
operational records may be retained. When you delete an Organization, its content
(including stored media and files) is permanently deleted after the grace period.

## 7. Your rights
Subject to applicable law, you have the right to:
- access the personal data we hold about you;
- rectify inaccurate data;
- erase your data ("right to be forgotten");
- restrict or object to certain processing;
- data portability (receive your data in a machine-readable format);
- withdraw consent at any time, without affecting prior processing;
- lodge a complaint with the competent supervisory authority (in Serbia, the Commissioner for Information of Public Importance and Personal Data Protection).

## 8. How to exercise your rights
You can export a copy of your personal data at any time from Settings ("Your data")
and delete your Account from Settings. For other requests, contact us at
[privacy@yourdomain]. We will respond within the timeframes required by law.

## 9. Cookies and local storage
We use strictly necessary cookies and browser local storage to keep you signed in
and to remember your preferences (such as language and theme). We do not use them
for third-party advertising.

## 10. Security
We use technical and organizational measures to protect personal data, including
encryption of third-party access tokens at rest, hashed passwords and access
controls. No system is completely secure; please use a strong, unique password.

## 11. Children
The Service is not directed to children under 16, and we do not knowingly collect
their personal data.

## 12. Changes to this Policy
We may update this Policy from time to time. When we make material changes we will
update the version and ask you to review and accept the updated documents.

## 13. Contact
Privacy questions or requests: [privacy@yourdomain]. [Company legal name and
registered address]. If we have appointed a data protection officer, their contact
details will be provided here.`;

const TOS_SR = `# Uslovi korišćenja

_Poslednje ažuriranje: 1. jul 2026._

Ovi Uslovi korišćenja ("Uslovi") uređuju pristup i korišćenje Edge platforme za
digitalnu signalizaciju, uključujući kontrolnu tablu za upravljanje sadržajem,
plejer aplikaciju i povezane API-je i usluge (zajedno, "Usluga"), kojom upravlja
[pun pravni naziv društva, adresa i matični broj] ("Edge", "mi"). Kreiranjem naloga
ili korišćenjem Usluge prihvatate ove Uslove. Ako se ne slažete, nemojte koristiti
Uslugu.

## 1. Definicije
- "Nalog" je vaš registrovani korisnički nalog.
- "Organizacija" je radni prostor koji poseduje ekrane, plejliste, medije i instance aplikacija, i kojem pripada jedan ili više korisnika.
- "Sadržaj" su mediji, plejliste, tekst, konfiguracija i drugi materijal koji otpremite ili kreirate u Usluzi.
- "Plejer" je uređaj ili aplikacija koja prikazuje Sadržaj na ekranu.

## 2. Uslovi za korišćenje
Morate imati najmanje 18 godina i sposobnost za zaključenje obavezujućeg ugovora.
Ako Uslugu koristite u ime organizacije, izjavljujete da ste ovlašćeni da tu
organizaciju obavežete ovim Uslovima.

## 3. Nalozi i registracija
Morate dati tačne podatke pri registraciji i održavati ih ažurnim. Odgovorni ste za
čuvanje pristupnih podataka i za sve aktivnosti na vašem Nalogu. Odmah nas obavestite
o svakoj neovlašćenoj upotrebi. Odgovorni ste za postupke svih korisnika koje
pozovete u svoju Organizaciju.

## 4. Usluga
Edge vam omogućava da upravljate ekranima, pravite plejliste, otpremate medije,
konfigurišete aplikacije i objavljujete Sadržaj na Plejerima. Funkcionalnosti se
vremenom mogu menjati, unapređivati ili ukidati. Možemo postaviti razumna tehnička
ograničenja (npr. veličinu fajla, prostor za skladištenje ili učestalost zahteva).

## 5. Prihvatljivo korišćenje
Saglasni ste da nećete:
- otpremati ili prikazivati Sadržaj koji je nezakonit, kojim se povređuju prava, koji je klevetnički, nepristojan ili krši prava drugih;
- koristiti Uslugu za distribuciju malicioznog softvera ili pokušaj neovlašćenog pristupa bilo kom sistemu ili podacima;
- ometati ili narušavati integritet ili performanse Usluge;
- vršiti reverzni inženjering, preprodavati ili pružati Uslugu trećim licima osim ako je izričito dozvoljeno;
- koristiti Uslugu suprotno važećim propisima ili uslovima trećih strana.
Isključivo ste odgovorni da posedujete prava za prikazivanje svakog Sadržaja na
svojim ekranima, uključujući prava javnog prikazivanja ili licenciranja.

## 6. Vaš Sadržaj
Zadržavate sva prava na svoj Sadržaj. Dajete nam svetsku, neisključivu licencu bez
naknade da hostujemo, skladištimo, obrađujemo, umnožavamo i prikazujemo vaš Sadržaj
isključivo radi pružanja Usluge (uključujući isporuku na vaše Plejere i generisanje
sličica i pregleda). Odgovorni ste za zakonitost Sadržaja i za posedovanje svih
potrebnih prava i saglasnosti.

## 7. Usluge i integracije trećih strana
Usluga se može povezivati sa provajderima trećih strana (npr. Google Calendar ili
Canva) koje sami odaberete da povežete. Korišćenje tih integracija podleže uslovima
i praksama privatnosti te treće strane. Nismo odgovorni za usluge trećih strana, a
povezivanje je po vašem izboru. Integraciju možete prekinuti u svakom trenutku.

## 8. Intelektualna svojina
Usluga, uključujući softver, dizajn i žigove, vlasništvo je Edge-a i njegovih
davalaca licenci i zaštićena je propisima o intelektualnoj svojini. Osim izričito
datih prava, nikakva prava se ne prenose. Ne smete koristiti naše žigove bez naše
prethodne pisane saglasnosti.

## 9. Naknade
Ako se neki deo Usluge nudi uz naknadu, primenljive cene i uslovi plaćanja biće vam
prikazani pre kupovine. Osim ako nije drugačije navedeno, naknade se ne vraćaju,
osim kada to zakon zahteva.

## 10. Dostupnost i podrška
Trudimo se da Usluga bude dostupna, ali ne garantujemo neprekidan rad bez grešaka.
Možemo vršiti održavanje, ažuriranja i izmene. Podrška se pruža u razumnoj
komercijalnoj meri.

## 11. Suspenzija i raskid
Možemo suspendovati ili ukinuti vaš pristup ako bitno prekršite ove Uslove, ako to
zakon zahteva, ili radi zaštite Usluge ili drugih korisnika. Uslugu možete prestati
da koristite i obrisati Nalog u svakom trenutku (vidi tačku 12).

## 12. Brisanje naloga i organizacije
Nalog ili Organizaciju možete obrisati u podešavanjima. Brisanje pokreće period od
30 dana tokom kojeg je pristup onemogućen; ako se ponovo prijavite u tom roku, Nalog
se vraća. Nakon isteka roka trajno brišemo ili anonimizujemo povezane podatke kako
je opisano u Politici privatnosti. Brisanje Organizacije trajno uklanja njene
ekrane, uređaje, plejliste, instance aplikacija i medije po isteku roka.

## 13. Odricanje od garancija
Usluga se pruža "kakva jeste" i "kako je dostupna", bez garancija bilo koje vrste,
izričitih, podrazumevanih ili zakonskih, uključujući garancije pogodnosti za
prodaju, pogodnosti za određenu svrhu i nepovrede prava, u najvećoj meri dozvoljenoj
zakonom.

## 14. Ograničenje odgovornosti
U najvećoj meri dozvoljenoj zakonom, Edge neće biti odgovoran za posrednu, slučajnu,
posebnu ili posledičnu štetu, niti za gubitak dobiti, prihoda, podataka ili ugleda.
Naša ukupna odgovornost neće preći iznose koje ste nam platili za Uslugu u dvanaest
meseci pre događaja koji je doveo do zahteva, ili, kada je Usluga besplatna,
simboličan iznos dozvoljen zakonom.

## 15. Obeštećenje
Saglasni ste da obeštetite Edge od zahteva, štete i troškova (uključujući razumne
pravne troškove) koji proizilaze iz vašeg Sadržaja, korišćenja Usluge ili kršenja
ovih Uslova.

## 16. Izmene Uslova
Ove Uslove možemo povremeno ažurirati. Kod bitnih izmena ažuriraćemo verziju i
zatražiti da prihvatite nove Uslove pre nastavka korišćenja Usluge. Nastavak
korišćenja nakon stupanja izmena na snagu predstavlja prihvatanje.

## 17. Merodavno pravo i sporovi
Na ove Uslove primenjuje se pravo Republike Srbije, bez primene kolizionih pravila.
Sudovi u Srbiji imaju isključivu nadležnost za svaki spor, osim ako prinudni propisi
ne predviđaju drugačije.

## 18. Ostalo
Ako se neka odredba oglasi neizvršivom, preostale odredbe ostaju na snazi. Propust
da izvršimo neku odredbu nije odricanje od prava. Ne možete preneti ove Uslove bez
naše saglasnosti; mi ih možemo preneti u vezi sa spajanjem, pripajanjem ili prodajom
imovine.

## 19. Kontakt
Pitanja o ovim Uslovima: [legal@vasdomen]. [Pun pravni naziv i sedište društva].`;

const PRIVACY_SR = `# Politika privatnosti

_Poslednje ažuriranje: 1. jul 2026._

Ova Politika privatnosti objašnjava kako Edge platforma za digitalnu signalizaciju
("Edge", "mi") prikuplja, koristi i štiti lične podatke, kao i prava koja imate.
Rukovalac podacima je [pun pravni naziv, sedište i kontakt društva]. Podatke
obrađujemo u skladu sa Zakonom o zaštiti podataka o ličnosti Republike Srbije
(ZZPL) i, kada se na vas primenjuje, Opštom uredbom EU o zaštiti podataka (GDPR).

## 1. Podaci koje prikupljamo
- Podaci o nalogu: ime, imejl adresa, broj telefona, opcioni naziv kompanije, lozinka (čuva se samo kao bezbedan heš) i, ako se prijavite putem Google-a, identifikator vašeg Google naloga.
- Podaci o organizaciji i članstvu: organizacije kojima pripadate i vaša uloga.
- Podaci o sadržaju: mediji, plejliste, konfiguracija ekrana i aplikacija koje otpremate ili kreirate.
- Podaci o plejeru i uređaju: podaci o uparivanju, identifikatori uređaja, verzije i status (online/offline) ekrana.
- Podaci o korišćenju i tehnički podaci: logovi, IP adresa, vremenske oznake i izvršene radnje (radi bezbednosti i rada Usluge).
- Evidencija saglasnosti: koju verziju ovih dokumenata ste prihvatili, kada i sa koje IP adrese, radi dokazivanja saglasnosti.
- Komunikacija: poruke koje nam pošaljete (podrška, povratne informacije, prijave problema).

## 2. Kako koristimo podatke
Lične podatke koristimo da:
- pružamo, održavamo i obezbeđujemo Uslugu;
- autentifikujemo vas i upravljamo nalozima, organizacijama i dozvolama;
- isporučujemo vaš Sadržaj na vaše Plejere;
- komuniciramo sa vama o Usluzi, uključujući verifikaciju i bezbednosna obaveštenja;
- pružamo podršku i odgovaramo na vaše zahteve;
- ispunjavamo zakonske obaveze i sprovodimo naše Uslove.

## 3. Pravni osnovi
Kada se primenjuju GDPR/ZZPL, oslanjamo se na: izvršenje ugovora (pružanje Usluge);
naše legitimne interese (bezbednost i unapređenje Usluge); vašu saglasnost (kada se
traži, npr. za pravne dokumente); i ispunjenje zakonskih obaveza.

## 4. Deljenje i obrađivači
Ne prodajemo vaše lične podatke. Podatke delimo samo sa pružaocima usluga
("obrađivačima") koji postupaju u naše ime po odgovarajućim ugovorima, uključujući:
- skladištenje objekata u oblaku (Cloudflare R2) za vaše medije;
- pružaoca usluge slanja imejlova za transakcione poruke;
- integracije trećih strana koje izričito povežete (npr. Google ili Canva), ograničeno na ono što te integracije zahtevaju.
Podatke možemo otkriti i kada to zakon zahteva ili radi zaštite naših prava,
korisnika ili javnosti.

## 5. Lokacija podataka i međunarodni prenos
Podatke čuvamo u Srbiji. Kada podatke obrađuju pružaoci van vaše zemlje, preduzimamo
mere da obezbedimo odgovarajući nivo zaštite u skladu sa važećim propisima.

## 6. Čuvanje podataka
Lične podatke čuvamo dok je vaš Nalog aktivan i koliko je potrebno za pružanje
Usluge. Kada obrišete Nalog, pokreće se period od 30 dana, nakon kojeg anonimizujemo
vaše lične podatke (ime i imejl se zamenjuju neidentifikujućim oznakama) i brišemo
evidenciju saglasnosti; ne-lični operativni zapisi mogu se zadržati. Kada obrišete
Organizaciju, njen sadržaj (uključujući sačuvane medije i fajlove) trajno se briše
po isteku roka.

## 7. Vaša prava
U skladu sa važećim propisima, imate pravo da:
- pristupite ličnim podacima koje čuvamo o vama;
- ispravite netačne podatke;
- obrišete svoje podatke ("pravo na zaborav");
- ograničite ili se usprotivite određenoj obradi;
- prenesete podatke (dobijete ih u mašinski čitljivom formatu);
- povučete saglasnost u svakom trenutku, bez uticaja na prethodnu obradu;
- podnesete pritužbu nadležnom organu (u Srbiji: Poverenik za informacije od javnog značaja i zaštitu podataka o ličnosti).

## 8. Kako da ostvarite svoja prava
Kopiju svojih ličnih podataka možete izvesti u svakom trenutku iz Podešavanja
("Vaši podaci"), a Nalog obrisati iz Podešavanja. Za ostale zahteve kontaktirajte
nas na [privatnost@vasdomen]. Odgovorićemo u rokovima koje propisuje zakon.

## 9. Kolačići i lokalno skladište
Koristimo isključivo neophodne kolačiće i lokalno skladište pregledača da biste
ostali prijavljeni i da bismo zapamtili vaše postavke (npr. jezik i temu). Ne
koristimo ih za oglašavanje trećih strana.

## 10. Bezbednost
Primenjujemo tehničke i organizacione mere za zaštitu ličnih podataka, uključujući
šifrovanje pristupnih tokena trećih strana u mirovanju, heširane lozinke i kontrolu
pristupa. Nijedan sistem nije potpuno bezbedan; koristite jaku, jedinstvenu lozinku.

## 11. Deca
Usluga nije namenjena deci mlađoj od 16 godina i svesno ne prikupljamo njihove lične
podatke.

## 12. Izmene ove Politike
Ovu Politiku možemo povremeno ažurirati. Kod bitnih izmena ažuriraćemo verziju i
zatražiti da pregledate i prihvatite ažurirane dokumente.

## 13. Kontakt
Pitanja ili zahtevi u vezi sa privatnošću: [privatnost@vasdomen]. [Pun pravni naziv
i sedište društva]. Ako smo imenovali lice za zaštitu podataka, njegovi kontakt
podaci biće navedeni ovde.`;

export const LEGAL_CONTENT: Record<
  LegalDocType,
  Record<LegalLocale, LegalBody>
> = {
  tos: {
    en: { title: 'Terms of Service', body: TOS_EN },
    sr: { title: 'Uslovi korišćenja', body: TOS_SR },
  },
  privacy: {
    en: { title: 'Privacy Policy', body: PRIVACY_EN },
    sr: { title: 'Politika privatnosti', body: PRIVACY_SR },
  },
};
