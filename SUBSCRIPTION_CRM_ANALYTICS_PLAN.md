# SignageWall: subscription, CRM i funnel lifecycle

## Izvršni sažetak

SignageWall trenutno ima dobru osnovu za trial, ograničavanje broja ekrana, upgrade zahteve, email komunikaciju i osnovnu web analitiku. Međutim, tri poslovno važna toka nisu povezana u jednu celinu:

1. trial, pretplata, faktura, uplata i prestanak korišćenja;
2. marketinški lead, komunikacija, registracija i prelazak u kupca;
3. funnel od prvog marketinškog klika do prvog aktivnog ekrana i prve uplate.

Predlog je da se u postojećem Nest backendu napravi centralni, provider-neutralan **revenue lifecycle**:

```text
marketinški klik
  → lead ili registracija
  → trial
  → prvi stvarno aktivan ekran
  → zahtev za pretplatu
  → ručna faktura
  → evidentirana uplata
  → aktivna pretplata
  → obnova / kašnjenje / suspenzija / otkazivanje
```

MongoDB i backend treba da budu izvor istine. Email, interni ili eksterni CRM, Google Analytics i Vercel Analytics treba da budu projekcije potvrđenih backend događaja, a ne mesta na kojima se čuva poslovno stanje.

Fakturisanje se u prvoj fazi radi ručno. Poslovna logika se ipak projektuje kroz `BillingProvider` interfejs, tako da se nakon osnivanja LLC-a može dodati Stripe bez redizajna aplikacije.

---

## Status implementacije — 4. avgust 2026.

Implementiran je prvi bezbedan vertikalni presek ručnog billing lifecycle-a:

- novi backend `BillingModule` sa billing account i manual invoice kolekcijama;
- super-admin Billing tab na `/super-admin?tab=billing`;
- ručni tok `draft → sent → paid`, kao i `overdue` i `void` statusi;
- nepotpun draft je dozvoljen, ali se automatski prikazuje u Billing Exceptions;
- `mark sent` zahteva broj, iznos, valutu, billing email, rok i period usluge;
- `mark paid` zahteva bankarsku/reconciliation referencu i tada aktivira postojeću
  `User.plan/screenLimit` entitlement projekciju;
- dnevni founderski email digest u 08:00 i badge u Billing tabu upozoravaju na
  upgrade zahtev bez nacrta fakture, nepotpune nacrte, neplaćene fakture, legacy
  plaćene planove bez billing zapisa i period koji ističe bez renewal fakture;
- overdue stanje **ne menja entitlement i ne blokira player**; suspenzija nije
  automatska akcija;
- trial sweep više ne briše nalog ili podatke: samo upisuje `trialExpiredAt`, dok
  uređaji i poslednji sadržaj ostaju netaknuti;
- downgrade više ne pokreće novi 21-dnevni trial;
- dodat je regresioni test za `SuperAdminGuard` i lifecycle testovi za billing i
  bezbedan trial expiry.

Za uključivanje email upozorenja u okruženju treba postaviti
`MAIL_BILLING_ALERTS_TO`; ako nije postavljen, koristi se support/registration
inbox. Zvanična faktura se i dalje pravi i šalje izvan SignageWall-a, a aplikacija
čuva operativno stanje i audit događaje.

Još nije implementirano: korisnička `/settings/billing` strana, upload/link PDF-a,
poseban payment/subscription history model, CRM intake, attribution/funnel, MFA,
Redis rate limiting, Turnstile, aggregate trial resource kvote i Stripe adapter.

---

## 1. Zatečeno stanje i najvažniji rizici

### 1.1. Trial brisanje — rešeno u prvom implementacionom preseku

Pre prvog preseka backend je po isteku 21-dnevnog triala trajno brisao korisnika i
organizacije koje poseduje:

- `apps/be/src/modules/plans/trial.service.ts`
- `apps/be/src/modules/users/schemas/user.schema.ts`

Marketing stranica istovremeno obećava da sadržaj i podešavanja ostaju u nalogu, a da ekrani samo prestaju da preuzimaju nov sadržaj:

- `apps/web/src/i18n/messages/sr/pricing.json`
- `apps/web/src/i18n/messages/en/pricing.json`

Automatsko brisanje je uklonjeno. Cron sada trajno beleži `trialExpiredAt`, bez
deaktivacije naloga, brisanja sadržaja ili menjanja playera. `trialConsumedAt`
sprečava da downgrade automatski dodeli novi trial; fraud tombstone za potpuno
obrisan/anonymized nalog ostaje zaseban privacy zadatak.

### 1.2. Plan je vezan za korisnika, ne za kupca koji plaća

Trenutni `User` model ima `plan`, `screenLimit` i `trialEndsAt`. To radi za jednostavan slučaj, ali postaje problem kada:

- više korisnika pripada istoj organizaciji;
- vlasništvo organizacije bude preneto;
- jedan kupac plaća više organizacija;
- treba sačuvati istoriju pretplata, faktura i promena količine;
- Stripe kasnije postane billing provider.

Plan proizvoda, status pretplate i pravo korišćenja treba razdvojiti i vezati za poseban billing account.

### 1.3. Quote i contact forme nemaju trajan CRM zapis

Javne forme trenutno samo pokušavaju da pošalju email preko Resenda:

- `apps/web/src/components/quote/actions.ts`
- `apps/web/src/app/[locale]/contact/actions.ts`

Ako email konfiguracija nedostaje, forme vraćaju uspeh bez trajnog zapisa. Ako slanje zakaže, lead može biti izgubljen. Ne postoje status, owner, istorija komunikacije, source/campaign podaci ili veza sa kasnijom registracijom.

Authenticated upgrade zahtev jeste trajan zapis, ali ima samo `open/resolved` lifecycle i odvojen je od javnih leadova:

- `apps/be/src/modules/plans/schemas/upgrade-request.schema.ts`
- `apps/cms/src/features/plans/components/UpgradePlanDialog.tsx`

### 1.4. Funnel se prekida između marketing sajta i aplikacije

Marketing sajt koristi GA4, Vercel Analytics i Speed Insights:

- `apps/web/src/app/[locale]/layout.tsx`
- `apps/web/src/components/consent/consent-analytics.tsx`

CMS je zaseban origin. Link ka registraciji trenutno prenosi samo `/register`, dok register forma čita samo invite token:

- `apps/web/src/lib/app-url.ts`
- `apps/cms/src/features/auth/components/RegisterForm.tsx`
- `apps/be/src/modules/auth/dto/register.dto.ts`

Zbog toga se marketinški izvor, kampanja i anonimna poseta ne mogu pouzdano povezati sa korisnikom, aktivacijom i uplatom.

### 1.5. Postoji dobar signal za stvarnu aktivaciju ekrana

Player već emituje `now-playing` kada je konkretan sadržaj zaista stavljen na ekran, a backend ga prima u player gateway-u:

- `apps/player/src/sync/socket.ts`
- `apps/be/src/modules/player/player.gateway.ts`

To je mnogo pouzdaniji activation signal od klika u CMS-u, kreiranja Screen dokumenta ili samog uparivanja uređaja.

---

## 2. Arhitektonski principi

### Backend je izvor istine

Kritični događaji nastaju tek nakon uspešne i trajne backend promene:

- lead je generisan tek kada je upisan;
- trial je počeo tek kada billing account postoji;
- ekran je aktiviran tek kada player prikaže sadržaj;
- kupovina postoji tek kada je uplata evidentirana;
- pretplata je otkazana tek kada je promena sačuvana.

GA, Vercel i email ne smeju da odlučuju o pravima korisnika.

### Proizvod, naplata i entitlement su odvojeni

- **Plan** opisuje šta kupac kupuje: `basic` ili `enterprise`.
- **Subscription status** opisuje komercijalno stanje: `trialing`, `active`, `past_due` itd.
- **Entitlement** opisuje šta sistem trenutno dozvoljava: broj ekrana, kreiranje organizacija, novi player snapshotovi i write pristup CMS-u.

### Provider-neutralan billing

Poslovna pravila ne treba pisati direktno oko Stripe objekata. Uvodi se interfejs, na primer:

```ts
interface BillingProvider {
  issueInvoice(input: IssueInvoiceInput): Promise<ProviderInvoice>
  voidInvoice(invoiceId: string): Promise<void>
  recordPayment(input: RecordPaymentInput): Promise<ProviderPayment>
  changeQuantity(input: ChangeQuantityInput): Promise<void>
  cancelSubscription(input: CancelSubscriptionInput): Promise<void>
}
```

Prva implementacija je `ManualBillingProvider`. Kasnije se dodaje `StripeBillingProvider`.

### Pouzdanost kroz outbox

Upis poslovnog objekta i odgovarajućeg outbox događaja treba da budu deo iste transakcije. Worker zatim asinhrono radi:

- slanje emaila;
- CRM sinhronizaciju;
- GA Measurement Protocol;
- interne notifikacije;
- eventualne webhook pozive.

Kvar jedne destinacije ne sme da izgubi lead, uplatu ili promenu pretplate.

---

## 3. Predloženi model podataka

### `billing_accounts`

Predstavlja kupca koji plaća, nezavisno od pojedinačnog korisnika.

Ključna polja:

- `payerUserId`;
- `organizationIds` ili referenca sa organizacije;
- naziv kupca, adresa, država, poreski i registracioni broj;
- kontakt za fakturisanje;
- `trialStartedAt`, `trialEndsAt`, `activatedAt`;
- `firstTouch` i `lastTouch` attribution podaci;
- `leadId` ako je account nastao iz postojećeg leada;
- timestamps i audit podaci.

### `subscriptions`

Ključna polja:

- `billingAccountId`;
- `plan: basic | enterprise`;
- `status: trialing | trial_expired | pending_invoice | active | past_due | suspended | canceled`;
- `screenQuantity`;
- `unitPrice`, `currency`, `billingInterval`;
- `currentPeriodStart`, `currentPeriodEnd`;
- `cancelAtPeriodEnd`, `canceledAt`;
- `provider: manual | stripe`;
- opcioni provider ID-jevi;
- poslednji primenjeni provider/webhook događaj;
- istorija ili audit promena.

### `invoices`

Ključna polja:

- `billingAccountId`, `subscriptionId`;
- broj fakture iz zvaničnog računovodstvenog sistema;
- `status: draft | open | paid | overdue | void`;
- snapshot billing podataka kupca;
- stavke, količine, jedinične cene, subtotal, porez i total;
- valuta;
- datum izdavanja, dospeća i plaćanja;
- URL/PDF ili referenca ka zvaničnoj fakturi;
- `providerInvoiceId` za budući Stripe;
- timestamps.

Faktura mora čuvati snapshot kupca i cene. Kasnija promena adrese ili cenovnika ne sme menjati staru fakturu.

### `payments`

Ključna polja:

- `invoiceId`, `billingAccountId`;
- iznos i valuta;
- `method: bank_transfer | stripe`;
- datum uplate;
- referenca sa bankarskog izvoda;
- `recordedByUserId` za ručni unos;
- `providerPaymentId` za budući Stripe;
- idempotency key.

### `leads`

Ključna polja:

- normalizovan email i kontakt podaci;
- kompanija, grad, država i traženi broj ekrana;
- `type: contact | quote | signup | upgrade`;
- `status: new | contacted | qualified | proposal_sent | won | lost`;
- sales owner;
- `firstTouch`, `lastTouch`;
- povezani `userId`, `billingAccountId` i `subscriptionId`;
- eksterni CRM ID ako se kasnije uvede;
- razlog gubitka;
- timestamps.

Više form submissiona ne treba slepo praviti više nepovezanih leadova. Canonical lead može biti deduplikovan po normalizovanom emailu, dok se svaki submission čuva kao `lead_activity`.

### `lead_activities`

Primeri aktivnosti:

- quote/contact forma poslata;
- registracija započeta i završena;
- email verifikovan;
- poziv ili email evidentiran;
- ponuda poslata;
- trial aktiviran ili istekao;
- prvi ekran aktiviran;
- faktura poslata;
- uplata evidentirana;
- lead dobijen ili izgubljen.

### `funnel_events` i `outbox_events`

Ključna polja:

- jedinstven `eventId`;
- `eventName`, `occurredAt`;
- `anonymousId`, `leadId`, `userId`, `billingAccountId`, `organizationId`;
- source/campaign snapshot;
- ravne event properties bez PII-ja za analitičke destinacije;
- delivery status po destinaciji;
- retry count i poslednja greška.

Za jednokratne milestone događaje treba imati jedinstveni indeks, na primer:

```text
(billingAccountId, eventName = first_screen_activated)
```

---

## 4. Trial i entitlement lifecycle

### Početak triala

Trial treba da pripada billing accountu, ne svakom pozvanom korisniku.

Preporučeni trenutak početka:

- nakon potvrde emaila i kreiranja prve organizacije za standardnu registraciju;
- odmah za verifikovan Google signup kada se kreira billing account;
- ne kreirati novi trial za korisnika koji se samo pridružuje postojećoj organizaciji.

Time se sprečava da invite članovi dobijaju sopstvene, nevezane trial rokove.

### Tok stanja

```text
trialing
  ├─→ active                    uplata potvrđena pre isteka
  └─→ trial_expired           trial istekao bez uplate
          └─→ pending_invoice korisnik zatražio nastavak
                  └─→ active  faktura plaćena

active
  ├─→ past_due                 faktura nije plaćena do roka
  ├─→ canceled                 završen period nakon otkazivanja
  └─→ active                   uredna mesečna obnova

past_due
  ├─→ active                   uplata stigla u grace periodu
  └─→ suspended                grace period istekao

suspended
  └─→ active                   dug izmiren / reaktivacija
```

### Entitlement matrica

| Status | CMS | Kreiranje/izmene | Novi player snapshotovi | Keširan sadržaj na ekranu |
|---|---|---|---|---|
| `trialing` | pun pristup | dozvoljeno u okviru trial limita | da | da |
| `trial_expired` | read-only + billing CTA | ne | ne | da |
| `pending_invoice` | read-only ili grace | prema poslovnoj odluci | prema poslovnoj odluci | da |
| `active` | pun pristup | prema plaćenoj količini | da | da |
| `past_due` | pun ili ograničen tokom grace perioda | opciono ograničeno | da tokom grace perioda | da |
| `suspended` | read-only | ne | ne | da |
| `canceled` | read-only | ne | ne | da |

Preporuka je da ekran nastavi da prikazuje poslednji lokalno keširan sadržaj, u skladu sa postojećim javnim obećanjem, ali da više ne dobija nove snapshotove.

### Trial komunikacija

Umesto jednog emaila 24 sata pre brisanja:

- D-7: trial se približava kraju;
- D-3: CTA za unos billing podataka i količine ekrana;
- D-1: poslednji podsetnik;
- D0: trial istekao, podaci sačuvani, sync pauziran;
- D+3/D+14: nurture poruke, ako postoji odgovarajući marketing pristanak.

---

## 5. Ručni subscription i billing lifecycle

### Basic, jedan do pet ekrana

1. Korisnik u CMS-u bira **Nastavi korišćenje**.
2. Unosi ili potvrđuje billing podatke i broj ekrana.
3. Sistem prikazuje cenu i zahteva eksplicitnu potvrdu.
4. Kreira se `subscription_request` i pretplata prelazi u `pending_invoice`.
5. Admin izdaje zvaničnu fakturu u računovodstvenom sistemu.
6. Broj fakture, rok plaćanja i PDF/link se upisuju u CMS.
7. Sistem šalje fakturu i postavlja je na `open`.
8. Kada novac legne, admin evidentira bank transfer i njegovu referencu.
9. Jedna idempotentna backend operacija:
   - kreira `Payment`;
   - postavlja fakturu na `paid`;
   - postavlja pretplatu na `active`;
   - aktivira entitlement za kupljeni broj ekrana;
   - postavlja lead/opportunity na `won`;
   - emituje `purchase` i `subscription_activated`.

### Enterprise, više od pet ekrana

1. Quote ili upgrade zahtev kreira/obnavlja lead.
2. Sales proces vodi lead kroz `contacted`, `qualified` i `proposal_sent`.
3. Prihvatanje ponude kreira `pending_invoice` pretplatu sa dogovorenom cenom i količinom.
4. Dalji tok fakture i uplate isti je kao za Basic.

### Mesečna obnova

Scheduler može unapred kreirati draft renewal zapise, ali zvanična faktura u prvoj fazi ostaje ručna.

Predloženi tok:

- nekoliko dana pre period end datuma kreira se admin task/draft;
- admin izdaje fakturu i unosi njen broj;
- faktura se šalje kupcu;
- po dospeću bez uplate prelazi na `overdue`, a subscription na `past_due`;
- nakon definisanog grace perioda subscription prelazi na `suspended`;
- evidentiranje naknadne uplate vraća subscription na `active`.

### Promena broja ekrana

- **Povećanje:** zahtev odmah kreira doplatnu ili novu fakturu; entitlement raste tek posle potvrđene uplate, osim ako sales ručno odobri drugačije.
- **Smanjenje:** zakazuje se za naredni billing period kako stara faktura i istorija korišćenja ne bi bili retroaktivno promenjeni.
- **Enterprise promena:** može zahtevati novu ponudu pre fakture.

### Otkazivanje i reaktivacija

- otkazivanje podrazumevano postavlja `cancelAtPeriodEnd`;
- do kraja plaćenog perioda kupac zadržava entitlement;
- ne kreira se sledeća faktura;
- po isteku pretplata prelazi na `canceled` i CMS na read-only;
- reaktivacija koristi postojeće organizacije, sadržaj i ekrane;
- nova faktura i uplata vraćaju `active` status.

### Zvanična faktura i legal podaci

Aplikacija u prvoj fazi treba da bude billing ogledalo i workflow, ne proizvoljni poreski/fiskalni sistem. Zvanični broj, poreski tretman i PDF dolaze iz procesa koji je odobrio račovođa.

Pre puštanja naplate moraju se popuniti pravni naziv, adresa, matični broj i PIB koji trenutno nedostaju u:

- `apps/web/src/lib/company.ts`

---

## 6. Buduća Stripe integracija

Nakon osnivanja LLC-a u podržanoj jurisdikciji dodaje se `StripeBillingProvider`.

Postojeći domen ostaje isti:

- `billing_accounts` se mapira na Stripe Customer;
- `subscriptions` se mapira na Stripe Subscription;
- broj ekrana postaje subscription item quantity;
- `invoices` i `payments` dobijaju Stripe ID-jeve;
- Stripe webhook menja provider mirror, a entitlement se i dalje izračunava u SignageWall backendu.

Potrebna infrastruktura:

- `/billing/webhooks/stripe` sa verifikacijom potpisa nad raw body-jem;
- `webhook_inbox` sa jedinstvenim Stripe event ID-jem;
- idempotentni handleri;
- podrška za događaje pretplate, fakture, uspešne/neuspešne uplate i refund;
- periodični reconciliation job koji poredi lokalno stanje sa Stripe-om;
- customer portal ili sopstveni UI, prema konačnom payment modelu.

Stripe podržava subscription fakture sa `send_invoice`, rokom dospeća i bank-transfer reconciliationom. Srbija trenutno nije na zvaničnoj listi podržanih Stripe merchant jurisdikcija, pa je razumno sačekati LLC u podržanoj jurisdikciji.

Reference:

- [Stripe: subscriptions with bank transfers](https://docs.stripe.com/billing/subscriptions/bank-transfer)
- [Stripe global availability](https://stripe.com/global)

---

## 7. CRM i lead intake

### Jedinstveni intake endpoint

Javne Next server actions treba da pozivaju potpisani backend endpoint, na primer:

```text
POST /api/v1/public/leads/intake
```

Endpoint se ne poziva direktno iz browsera sa tajnim servisnim tokenom. Next server action validira podatke i zatim server-to-server poziva backend.

Tok:

1. validacija i normalizacija;
2. anti-spam/rate-limit provera;
3. deduplikacija ili pronalaženje canonical leada;
4. upis/izmena `Lead` dokumenta;
5. dodavanje `LeadActivity` zapisa;
6. upis outbox događaja u istoj transakciji;
7. vraćanje uspeha tek kada je trajan zapis napravljen;
8. asinhrono slanje email notifikacije.

### Zaštita od duplikata i spama

- klijentski generisan `submissionId` kao idempotency key;
- honeypot polje;
- minimalno vreme popunjavanja;
- IP rate limit;
- opcioni Turnstile/CAPTCHA kada se pojavi realan spam;
- normalizacija emaila i telefona;
- ograničenje veličine poruke;
- nikakav PII u logovima ili analytics event properties.

### Interni CRM pre spoljnog CRM-a

Za prvu fazu dovoljan je super-admin CRM ekran sa:

- pipeline kolonama/statusima;
- ownerom i SLA indikatorom;
- source/campaign filterima;
- kompletnim activity timeline-om;
- povezanim korisnikom, billing accountom, ekranima, ponudama, fakturama i uplatama;
- beleškama i razlozima dobijenog/izgubljenog leada.

Kasnije se može dodati adapter za HubSpot, Salesforce ili drugi CRM. Interni zapis ostaje izvor istine kako promena CRM provajdera ne bi menjala proizvodni domen.

### Automatske CRM tranzicije

| Događaj | CRM promena |
|---|---|
| Contact/quote submission | kreiraj lead kao `new` |
| Registracija povezana sa leadom | poveži `userId`, lifecycle `trial` |
| Prvi aktivni ekran | označi PQL/activated milestone |
| Upgrade ili subscription zahtev | kreiraj/otvori opportunity |
| Ponuda poslata | `proposal_sent` |
| Uplata evidentirana | `won/customer` |
| Odbijena ponuda | `lost` uz razlog |
| Trial istekao bez aktivacije | nurture segment, ne automatski `lost` |

---

## 8. Attribution od marketing klika do kupca

### Podaci koji se čuvaju

Za prvi i poslednji relevantni touch:

- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_term`;
- `utm_content`;
- `gclid`, `gbraid`, `wbraid`;
- `fbclid`, `msclkid`;
- landing path i URL;
- referrer;
- locale;
- timestamp;
- interni nasumični `anonymousId`;
- opcioni GA `client_id/session_id`, samo kada consent to dozvoljava.

`firstTouch` se ne prepisuje. `lastTouch` se ažurira pri novoj relevantnoj kampanji.

### Prelazak sa sajta na CMS

Pošto su marketing i CMS odvojeni origin-i:

1. marketing sloj generiše ili učitava `anonymousId`;
2. capture servis pravi kratkotrajan, potpisani `acquisitionToken` bez PII-ja;
3. CTA ka `/register` dodaje token;
4. register forma ga prosleđuje backendu;
5. backend validira potpis i upisuje attribution na lead/billing account;
6. nakon registracije anonimni journey se aliasuje na `userId` i `billingAccountId`.

Ako je `www.signagewall.com` i app poddomen istog root domena, first-party cookie može pojednostaviti prenos. Potpisani query token ipak ostaje eksplicitniji i radi i ako se domeni kasnije razdvoje.

### Consent i privatnost

- campaign parametri potrebni za obradu konkretnog leada čuvaju se uz transparentno obaveštenje u politici privatnosti;
- GA identifikatori i client-side analytics poštuju izbor iz consent bannera;
- odbijanje analytics pristanka ne sme sprečiti registraciju, quote ili contact formu;
- email, ime, telefon, poreski broj i drugi PII ne smeju se slati u GA ili Vercel;
- backend operativni događaji i eksterni marketing analytics treba da budu jasno razdvojeni.

Google preporučuje isti GA web stream/tag ID i cross-domain konfiguraciju za povezivanje journey-a kroz više domena:

- [GA4 cross-domain measurement](https://support.google.com/analytics/answer/10071811?hl=en-AT)

---

## 9. Funnel event taksonomija

### Glavni događaji

| Faza | Događaj | Autoritativni trenutak | Destinacije |
|---|---|---|---|
| Acquisition | `marketing_landing` | validan landing/campaign capture | first-party, GA |
| Acquisition | `marketing_cta_clicked` | korisnik kliknuo CTA | Vercel, GA |
| Lead | `quote_started` | otvorena quote forma | Vercel, GA |
| Lead | `generate_lead` | lead trajno upisan | first-party, GA, CRM |
| Signup | `registration_started` | register forma prikazana/aktivirana | GA/Vercel |
| Signup | `sign_up` | korisnik trajno kreiran | first-party, GA, CRM |
| Signup | `email_verified` | verifikacija završena | first-party, CRM |
| Trial | `trial_started` | billing account/trial kreiran | first-party, CRM, GA custom |
| Onboarding | `organization_created` | organizacija kreirana | first-party |
| Onboarding | `screen_created` | Screen dokument kreiran | first-party |
| Onboarding | `content_published` | prvi sadržaj dodat ekranu | first-party |
| Onboarding | `device_paired` | uređaj uspešno uparen | first-party |
| Activation | `first_screen_activated` | prvi realni `now-playing` | first-party, CRM, GA custom |
| Revenue | `subscription_requested` | prihvaćeni cena i količina | first-party, CRM |
| Revenue | `invoice_issued` | zvanična faktura poslata | first-party, CRM |
| Revenue | `payment_received` | uplata evidentirana | first-party, CRM |
| Revenue | `purchase` | invoice `paid` i subscription `active` | first-party, GA |
| Retention | `subscription_renewed` | renewal uplata evidentirana | first-party, GA |
| Retention | `payment_overdue` | rok fakture prošao | first-party, CRM |
| Retention | `subscription_suspended` | grace period istekao | first-party, CRM |
| Retention | `subscription_canceled` | otkazivanje zakazano ili završeno | first-party, CRM |
| Retention | `subscription_reactivated` | pretplata ponovo aktivna | first-party, CRM, GA |

### Definicija activation milestone-a

`first_screen_activated` ne treba emitovati kada:

- korisnik samo kreira screen;
- otvori player tab;
- dobije pairing code;
- upari uređaj bez sadržaja;
- CMS preview emituje prikaz.

Događaj se emituje jednom kada pravi, upareni player prvi put prijavi validan `itemId` kroz postojeći `now-playing` kanal. Backend zatim pronalazi organization/billing account i atomarno upisuje milestone.

### GA4 i Vercel uloge

GA4 standardni događaji koje treba koristiti kada semantika odgovara:

- `generate_lead`;
- `sign_up`;
- `login`;
- `purchase`, sa `transaction_id`, `value` i `currency`;
- ostali product lifecycle milestone-i kao custom events.

Server-side activation i payment događaji mogu se poslati GA Measurement Protocol-om uz consent-compatible `client_id/session_id`. Measurement Protocol dopunjuje, a ne zamenjuje browser tag.

Reference:

- [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/recommended-events)
- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [Sending Measurement Protocol events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events)

Vercel custom events su korisni za anonimne UI metrike, kao što su CTA klikovi i otvaranje forme. Ne treba ih koristiti kao CRM ili revenue ledger jer su namenjeni agregiranoj analitici i ne prate identitet preko više aplikacija.

Reference:

- [Vercel custom events](https://vercel.com/docs/analytics/custom-events)
- [Vercel Analytics privacy model](https://vercel.com/docs/analytics/privacy-policy)

---

## 10. API površina

### Lead/attribution

```text
POST /public/leads/intake
POST /attribution/capture
GET  /admin/leads
GET  /admin/leads/:id
PATCH /admin/leads/:id
POST /admin/leads/:id/activities
```

### Billing za kupca

```text
GET  /billing/me
PATCH /billing/profile
POST /billing/subscription-request
POST /billing/quantity-change-request
POST /billing/cancel
POST /billing/reactivate
GET  /billing/invoices
GET  /billing/invoices/:id
```

### Billing administracija

```text
GET  /admin/billing/accounts
GET  /admin/billing/accounts/:id
POST /admin/billing/invoices
POST /admin/billing/invoices/:id/send
POST /admin/billing/invoices/:id/mark-paid
POST /admin/billing/invoices/:id/void
POST /admin/billing/subscriptions/:id/change-quantity
POST /admin/billing/subscriptions/:id/suspend
POST /admin/billing/subscriptions/:id/reactivate
```

### Budući Stripe

```text
POST /billing/stripe/customer-portal
POST /billing/webhooks/stripe
```

Svaki mutation endpoint treba da podržava idempotency key gde ponovljeni zahtev može imati finansijsku ili lifecycle posledicu.

---

## 11. UI promene

### CMS za korisnika

Dodati `/settings/billing` stranicu dostupnu vlasniku billing accounta ili eksplicitnoj
`billing_admin` ulozi. Običan član organizacije ne treba da vidi poreske podatke,
fakture ni akcije koje menjaju pretplatu.

Stranica sadrži:

- trenutnim planom, statusom i brojem licenci;
- trial countdownom i jasnim objašnjenjem šta se dešava po isteku;
- formom za billing podatke;
- zahtevom za nastavak, promenu količine ili Enterprise ponudu;
- listom faktura i statusa;
- otkazivanjem na kraju perioda;
- reaktivacijom;
- read-only bannerom za `trial_expired`, `suspended` i `canceled`.

Postojeći `UpgradePlanDialog` može biti početna tačka, ali treba da postane deo jedinstvenog subscription workflow-a.

### Super-admin

Globalni pregled plaćenih planova pripada postojećem founderskom backoffice-u na
`/super-admin`, ne korisničkom delu aplikacije. To je trenutno najjednostavnije i
najbezbednije mesto jer već postoji i frontend gate i backend `SuperAdminGuard`.
Kasnije, ako operacije prerastu jedan ekran, isti API može dobiti zasebnu internu
admin aplikaciju ili poddomen bez menjanja billing domena.

Pre prvog billing preseka `/super-admin` je imao samo kartice **Users**,
**Upgrade Requests**, **Apps** i **Notifications**
(`apps/cms/src/features/super-admin/pages/SuperAdminPage.tsx`).
`Users → Change Plan` ručno menja `free/enterprise` i broj ekrana, ali ne prikazuje
subscription period, fakture, uplate, dospeće, MRR ili istoriju promena. Zato je to
privremena kontrola entitlementa, a ne kompletan billing backoffice.

Sada je dodat **Billing** tab sa overview karticama, Billing Exceptions i manual
invoice tabelom. Users → Change Plan ostaje samo legacy/emergency override; normalna
aktivacija plaćenog plana nastaje preko `mark paid` akcije.

Dodati dve glavne celine:

1. **CRM** — pipeline, lead detalj, aktivnosti, source/campaign i povezani account;
2. **Billing** — pretplata, količina, fakture, uplate, dospeća i audit log.

`/super-admin?tab=billing` u prvoj verziji treba da ima:

- **Overview:** MRR, aktivni triali, aktivni plaćeni accounti, otvorene i overdue
  fakture, broj plaćenih ekrana i triali koji uskoro ističu;
- **Customers:** billing account, firma, owner, povezane organizacije i korisnici;
- **Subscriptions:** plan, količina, status, period, sledeće fakturisanje i provider;
- **Invoices:** `draft/open/paid/overdue/void`, iznos, valuta, rok i PDF/reference;
- **Payments:** ručno evidentirane uplate, datum, iznos, bank reference i ko ih je
  uneo;
- **Exceptions:** triali za review, `past_due`, suspenzije, neusaglašene uplate i
  billing/entitlement mismatch.

Klik na kupca otvara jedinstven customer detail: firma i kontakti, subscription,
ekrani/licence, fakture, uplate, lead attribution i audit timeline. Postojeći
**Users** tab ostaje za identitet, status naloga, role i impersonation; ne treba da
bude primarni ekran za naplatu.

Admin akcije koje menjaju finansijsko stanje treba da traže potvrdu i upisuju ko je i kada napravio promenu.

### Matrica pristupa

| Uloga | Sopstveni billing | Globalni billing | Super-admin akcije |
|---|---:|---:|---:|
| Običan registrovani korisnik/član | ne | ne | ne |
| Billing admin/vlasnik accounta | da, samo svoj account | ne | ne |
| Support | read-only po potrebi | ograničeno | bez plan/payment promena |
| Founder/super-admin | da | da | da, uz audit i step-up zaštitu |

Founder nalog treba da bude zaseban privilegovani nalog sa MFA. Dugoročno treba
razdvojiti `billing_admin`, `support/impersonate` i `super_admin`, umesto da svaka
operativna osoba dobije sva ovlašćenja.

### Marketing sajt

- instrumentirani CTA linkovi;
- attribution capture;
- quote/contact success tek posle trajnog backend upisa;
- `generate_lead` tek nakon uspešnog upisa;
- prenos acquisition tokena na aplikaciju;
- usklađene poruke o trial isteku, fakturisanju i otkazivanju.

---

## 12. Super-admin bezbednost i zaštita novih naloga

### Provera pristupa super-adminu

Na osnovu statičkog pregleda koda, običan registrovani korisnik trenutno **ne može
da izvršava super-admin operacije**:

- frontend ruta `/super-admin` je iza `SuperAdminGate`, koji traži
  `user.isSuperAdmin === true` i odbija impersonated session
  (`apps/cms/src/features/super-admin/components/SuperAdminGate.tsx`);
- frontend provera je samo UX sloj i može se lažirati iz browsera, ali backend ne
  veruje toj vrednosti;
- svi `/admin/*` endpointi u `AdminController` su zaštićeni klasnim
  `SuperAdminGuard`-om (`apps/be/src/modules/admin/admin.controller.ts`);
- guard ponovo učitava korisnika iz baze, zahteva `isActive` i
  `role === SUPER_ADMIN`, i eksplicitno odbija impersonated token
  (`apps/be/src/modules/admin/guards/super-admin.guard.ts`);
- registracioni DTO uopšte ne prihvata `role` ili `isSuperAdmin`, a globalni
  `ValidationPipe` koristi `whitelist` i `forbidNonWhitelisted`, pa pokušaj mass
  assignmenta dobija grešku;
- endpoint za promociju u super-admina je i sam iza istog backend guarda.

Zaključak: menjanje local storage-a može eventualno otkriti admin UI shell, ali
pozivi ka admin API-ju treba da vrate `403`. Ovo je potvrda dizajna pregledom koda,
ne izvršen penetration ili end-to-end test. Sada je dodat regresioni unit test za
`SuperAdminGuard` koji pokriva:

- bez JWT-a → `401`;
- aktivan običan korisnik → `403`;
- neaktivan super-admin → `403`;
- impersonated token → `403`;
- aktivan pravi super-admin → uspeh.

Pre produkcije još dodati HTTP/e2e testove da registracija sa
`role`/`isSuperAdmin` vraća `400` i da običan korisnik dobija `403` na promote,
change-plan, mark-paid i delete endpointima.

Za founderski nalog dodati MFA ili step-up potvrdu za promociju administratora,
impersonation, brisanje, promenu plana, evidentiranje uplate i void fakture. Svaka
takva promena mora imati trajan audit zapis, ne samo aplikacioni log. Kao dodatno
ojačanje privilegovanih sesija, izbegavati dugovečne admin tokene u `localStorage`;
preferirati kraći session i `HttpOnly`, `Secure`, `SameSite` cookie ili obavezni
step-up za kritične akcije.

### Da li je potrebna „New account fraud“ zaštita?

**Da, pre javnog lansiranja ili većeg marketing saobraćaja, ali nije potreban skup
enterprise fraud sistem.** Trenutni glavni rizik nije payment fraud, jer se plaćanje
obavlja ručno, već masovno pravljenje trial naloga radi trošenja storage-a,
thumbnail/video procesiranja, AI poziva, stock importa i drugih provider resursa.
OWASP ovu klasu zloupotrebe eksplicitno vodi kao
[OAT-019 Account Creation](https://owasp.org/www-project-automated-threats-to-web-applications/assets/oats/EN/OAT-019_Account_Creation).

Postojeća dobra osnova:

- lokalni signup zahteva potvrdu emaila pre prijave;
- email je normalizovan i jedinstven;
- register/login i drugi osetljivi auth endpointi imaju limit 10 zahteva u 60
  sekundi (`apps/be/src/common/decorators/auth-throttle.decorator.ts`);
- trial je ograničen na jednu organizaciju i jedan ekran;
- AI trenutno ima dnevni limit po korisniku;
- pojedinačni upload ima limit veličine i proveru tipa/signature.

Najvažnije rupe:

- trial se sada zadržava i dobija `trialExpiredAt`; `trialConsumedAt` postoji na
  novim user/billing account zapisima, ali privacy-safe tombstone nakon potpunog
  brisanja naloga još nije implementiran;
- email aliasi, disposable domeni i više Google naloga zaobilaze jedinstven email;
- postoji limit pojedinačnog fajla, ali nije pronađena ukupna storage/file-count
  kvota po trial accountu;
- AI kvota je po useru, pa je više naloga multiplicira;
- rate limiter koristi podrazumevani procesni storage; kod više backend instanci
  limit nije zajednički. NestJS navodi da je ugrađeni storage in-memory i da se za
  distribuirano okruženje koristi custom storage, na primer Redis
  ([NestJS rate limiting](https://docs.nestjs.com/security/rate-limiting));
- nema CAPTCHA/Turnstile step-a, signup risk događaja, flag/review statusa ni
  alerta na neuobičajenu signup ili resource velocity;
- obavezni broj telefona nije verifikovan, pa trenutno ne predstavlja stvarnu
  zaštitu od zloupotrebe.

### Minimalna zaštita za prvu verziju

1. **Jedan trial po billing accountu.** Osnovni `trialConsumedAt` i bezbedan expiry
   su implementirani; downgrade ga ne resetuje. Još dodati privacy-safe detekciju
   ponovne registracije posle potpunog brisanja. Ako se čuva hash/tombstone,
   definisati pravni osnov, minimalne podatke i rok čuvanja sa privacy/legal savetom.
2. **Kvote na nivou billing accounta:** ukupni storage i broj fajlova, AI trial
   budžet, stock import i ostali plaćeni resursi. Početne brojeve odrediti prema
   stvarnom trošku i normalnom activation journey-u, pa prvo meriti u shadow modu.
3. **Redis-backed rate limiting:** signup, verification resend, upload, AI i import;
   tracker vezati za account/user i pouzdano dobijen client IP. Iza proxy-ja
   eksplicitno podesiti trusted proxy/header da napadač ne može sam da bira IP.
4. **Managed Turnstile na registraciji**, uz server-side proveru svakog tokena.
   Cloudflare navodi da je server validation obavezan, a token single-use i važi pet
   minuta
   ([Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)).
   Istu zaštitu vredi primeniti na quote/contact forme ako se pojavi spam.
5. **Fraud telemetry i review:** meriti signup velocity po IP/subnetu/domenu,
   verifikaciju, više naloga i potrošnju u prvom satu; suspicious account staviti u
   `review/restricted`, ne automatski brisati. U super-admin Billing tabu prikazati
   flagove i omogućiti suspend/restore sa auditom.
6. **Disposable email kao signal, ne automatski hard block.** Kombinovati domen,
   velocity i ranu potrošnju; time se smanjuje broj legitimnih korisnika koji bi
   bili pogrešno odbijeni.

Za sada ne uvoditi obaveznu SMS verifikaciju ili karticu za trial: dodaju trošak i
frikciju, a postojeće resurse je jeftinije prvo zaštititi kvotama, rate limitom i
risk signalima. Kada Stripe bude uveden, dodati njegove kontrole protiv card testing
i payment fraud napada; Stripe ima poseban vodič za
[sprečavanje card testing-a](https://docs.stripe.com/disputes/prevention/card-testing).

---

## 13. Migracija postojećih podataka

### Billing backfill

Za postojeće vlasnike organizacija:

- kreirati jedan billing account po postojećem payer/owner modelu;
- povezati organizacije;
- postojeći `enterprise` korisnik postaje `manual/active` subscription;
- `screenLimit` postaje `screenQuantity` ili entitlement projekcija;
- postojeći free korisnik sa važećim rokom postaje `trialing`;
- korisnik sa isteklim trialom postaje `trial_expired`, bez brisanja;
- sponsored/invited korisnici ne dobijaju zasebnu pretplatu.

### Upgrade request migracija

Postojeći `UpgradeRequest` zapisi mogu postati:

- lead activity;
- opportunity/subscription request;
- otvoren ili zatvoren CRM status prema trenutnom `open/resolved` stanju.

### Bezbedan rollout

1. prvo zaustaviti trial delete cron;
2. pokrenuti dry-run migraciju i izveštaj;
3. backfill billing accounta;
4. paralelno računati stare i nove entitlement rezultate u shadow modu;
5. prijaviti razlike bez blokiranja korisnika;
6. tek posle usklađivanja prebaciti read/write gate na novi servis;
7. stare `User.plan/screenLimit/trialEndsAt` vrednosti privremeno zadržati kao compatibility projekciju;
8. ukloniti ih tek posle stabilnog perioda.

---

## 14. Testovi i operativne garancije

### Obavezni testovi

- trial expiry ne briše korisnika, organizaciju, sadržaj ili uređaj;
- invited/sponsored korisnik nasleđuje entitlement billing accounta;
- email kvar ne gubi lead ili fakturu;
- dvostruki form submit pravi jednu activity posledicu;
- dvostruki klik na `mark paid` ne pravi dve uplate;
- istovremene promene količine ne mogu prepisati jedna drugu;
- faktura zadržava istorijski snapshot cene i kupca;
- payment aktivira tačno kupljeni broj ekrana;
- `first_screen_activated` nastaje jednom, samo za pravi player;
- CMS preview ne aktivira account;
- suspendovan account ne dobija nove snapshotove;
- keširan player nastavlja poslednji sadržaj;
- otkazivanje zadržava pristup do kraja plaćenog perioda;
- reaktivacija vraća postojeći sadržaj i konfiguraciju;
- attribution token sa lošim ili isteklim potpisom se odbacuje bez pada registracije;
- PII nikada ne ulazi u GA/Vercel payload.

### Observability

Pratiti:

- broj neuspelih outbox delivery pokušaja;
- lead intake greške i duplikate;
- overdue fakture;
- subscription/entitlement mismatch;
- event delivery lag;
- broj Stripe webhook grešaka kada se integracija uvede;
- funnel razlike između first-party baze i GA izveštaja.

GA brojevi se neće potpuno poklapati sa backendom zbog consent-a, blokera i atribucije. Finansijski i lifecycle izveštaji moraju se oslanjati na backend.

---

## 15. Redosled implementacije

### Faza 0 — integritet i usklađivanje obećanja

- zaustaviti automatsko trial brisanje;
- uvesti `trialConsumedAt` i onemogućiti automatsko ponovno dobijanje triala;
- dodati ukupne trial kvote za storage, broj fajlova, AI i import resurse;
- pre javnog acquisition-a uvesti Redis rate limiting, Turnstile i osnovni fraud
  telemetry/review;
- dodati negativne authorization testove za sve `/admin/*` endpoint-e;
- definisati lifecycle i entitlement matrice;
- popuniti legal/company podatke;
- potvrditi sa računovođom proces zvanične fakture;
- uskladiti marketing, Terms i email copy.

### Faza 1 — revenue domen

- dodati billing account, subscription, invoice, payment i outbox modele;
- implementirati `ManualBillingProvider`;
- napraviti migraciju postojećih planova;
- prebaciti plan gate na novi entitlement servis.

### Faza 2 — CRM i attribution

- dodati lead/activity modele i intake endpoint;
- prebaciti quote/contact forme sa email-only toka;
- spojiti postojeće upgrade zahteve sa CRM pipeline-om;
- implementirati first/last touch i acquisition token;
- povezati registraciju sa leadom.

### Faza 3 — manual billing UI i operacije

- korisnička Billing stranica;
- admin billing ekran;
- MFA/step-up za founderske finansijske i permission akcije;
- trajni audit log za svaku admin promenu;
- izdavanje/slanje fakture;
- ručno evidentiranje uplate;
- obnove, dospeća, grace period, suspenzija, otkazivanje i reaktivacija;
- email lifecycle.

### Faza 4 — kompletan funnel

- first-party funnel event servis;
- CTA, lead, signup, onboarding i billing događaji;
- `first_screen_activated` preko `now-playing` signala;
- GA4 cross-domain i Measurement Protocol;
- Vercel custom UI events;
- funnel i cohort dashboardi.

### Faza 5 — Stripe posle LLC-a

- Stripe customer/subscription/invoice mapiranje;
- webhook inbox i reconciliation;
- provider migracija account po account;
- customer portal ili odgovarajući billing UI;
- paralelni manual fallback tokom tranzicije.

---

## 16. KPI-jevi i izveštaji

### Acquisition funnel

```text
landing
→ trial CTA click
→ registration started
→ sign_up
→ email verified
→ trial started
```

### Activation funnel

```text
trial started
→ organization created
→ screen created
→ content published
→ device paired
→ first screen activated
```

### Revenue funnel

```text
first screen activated
→ subscription requested
→ invoice issued
→ payment received
→ active subscription
```

### Retention

- trial-to-activation conversion;
- activation-to-paid conversion;
- median time do prvog aktivnog ekrana;
- median time od aktivacije do uplate;
- lead-to-trial i lead-to-paid konverzija po source/campaign;
- MRR i broj plaćenih ekrana;
- renewal rate;
- overdue i recovery rate;
- logo churn i screen churn;
- reactivation rate;
- cohort retention po mesecu registracije i akvizicionom kanalu.

---

## 17. Definition of done

Rešenje se može smatrati kompletnim kada važi sve sledeće:

- nijedan validan quote/contact submission ne može biti izgubljen zbog email kvara;
- svaki lead ima source/campaign, status i activity timeline;
- registracija može biti povezana sa prethodnim anonimnim marketing journey-em;
- trial expiry nikada automatski ne briše podatke;
- entitlement se izračunava iz billing accounta i subscription statusa;
- korisnik vidi stanje triala, pretplate i faktura;
- admin može izdati fakturu i idempotentno evidentirati uplatu;
- uplata automatski aktivira tačan broj licenci;
- upgrade, downgrade, renewal, overdue, suspenzija, otkazivanje i reaktivacija imaju definisane tranzicije;
- prvi stvarno aktivan ekran se beleži jednom i server-side;
- `generate_lead`, `sign_up`, activation i `purchase` mogu se povezati u jedan funnel;
- backend revenue izveštaj može da se pomiri sa fakturama i uplatama;
- GA/Vercel ne dobijaju PII i nisu izvor finansijske istine;
- običan ili impersonated korisnik ne može da izvrši nijednu `/admin/*` operaciju;
- svaka privilegovana billing/role promena ima actor, timestamp, razlog i audit zapis;
- jedan billing account ne može automatski dobiti drugi trial;
- trial account ne može prekoračiti server-side storage, AI i import kvote;
- prelazak na Stripe zahteva novu provider implementaciju, a ne redizajn domena.

---

## Zaključak

Najvažnija promena nije dodavanje payment dugmeta, već uvođenje jedinstvenog poslovnog domena koji povezuje marketing, CRM, trial, aktivaciju proizvoda, fakturu, uplatu i entitlement.

Ručno fakturisanje nije prepreka kompletnom subscription lifecycle-u. Ako su subscription, invoice, payment i entitlement pravilno modelovani sada, budući Stripe postaje novi adapter za naplatu, dok proizvodni tok, CRM i analitika ostaju isti.
