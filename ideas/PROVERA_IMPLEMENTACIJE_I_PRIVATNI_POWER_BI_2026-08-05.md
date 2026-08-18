> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](README.md).

# Provera nove implementacije i vodič za privatni Power BI

**Datum provere:** 5. avgust 2026.  
**Zaključak:** implementacija je funkcionalno povezana i nema otkrivenu regresiju u automatizovanim testovima i produkcionim buildovima, ali privatni Power BI još nije spreman za javnu prodaju. Produkcioni kod nije mock, dok su Microsoft, Power BI i R2 pozivi u automatizovanim testovima mockovani. Neophodna je provera na stvarnom Microsoft tenant-u, stvarnom kapacitetu, privatnom R2 bucket-u i fizičkom player uređaju.

## Kratak odgovor

- Novi kod se kompajlira i glavne postojeće funkcionalnosti prolaze testove.
- Privatni Power BI poziva stvarni Entra OAuth i stvarni `api.powerbi.com` API kada su uneti pravi kredencijali.
- Sistem nije interaktivni Power BI embed. On asinhrono izvozi izveštaj u PNG, čuva snimke u privatnom R2 bucket-u i player-u daje kratkotrajne potpisane URL-ove. To je dobar model za signage, offline rad i kontrolisano izlaganje podataka.
- Bez pravog tenant-a i kapaciteta trenutno imamo potvrdu ugovora i ponašanja koda, ali ne i end-to-end dokaz da Microsoft za konkretan izveštaj prihvata export.
- Pre javne prodaje postoje četiri važna razvojna zadatka: životni ciklus privatnih objekata, obnova potpisanih URL-ova, kontrolisano beta pravo pristupa i filtriranje nepodržanih paginated izveštaja.

## Rezultati provere regresije

| Provera | Rezultat | Značenje |
| --- | --- | --- |
| Backend unit/integracioni testovi sa mockovanim spoljnim servisima | 34/34 suite-a, 397/397 testova prošlo | Nije otkrivena regresija u backend funkcijama pokrivenim testovima |
| Player testovi | 25/25 fajlova, 234/234 testa prošlo | Playback, offline mehanizmi i privatni cache nisu pokazali regresiju |
| Zajednički player ugovor | 32/32 testa prošlo | Dodavanje `pending` metapodataka ostalo je kompatibilno sa postojećim ugovorom |
| Backend produkcioni build | Prošao | Nest aplikacija se kompajlira |
| CMS produkcioni build i TypeScript provera | Prošli | Nova konfiguracija i preview tok se kompajliraju |
| Player produkcioni build i TypeScript provera | Prošli | PWA i privatni cache se grade |
| Paket aplikacija i embedova | Prošao | `opsboard` i `powerbi-secure` ulaze u produkcioni izlaz |
| `git diff --check` | Prošao | Nema whitespace grešaka u diff-u |
| Backend E2E health test | Nije izvršen do kraja | Izolovano okruženje je odbilo pristup lokalnom Redis-u na `127.0.0.1:6379`; ovo nije dokaz aplikacionog kvara |
| Monorepo `type-check` | Pao na starom fajlu | `packages/apps/vite.embeds.config.ts` ima postojeći `node:module/createRequire` problem; pojedinačni produkcioni buildovi prolaze |
| Ciljani lint nove implementacije | Dve greške | Jedan neiskorišćen `catch` parametar i jedno Prettier formatiranje testa; nisu runtime kvarovi, ali moraju biti očišćeni pre merge-a |

Ukupno je prošlo **663 automatizovana testa**. To daje visok stepen sigurnosti da prethodno pokriveno ponašanje nije narušeno, ali nije isto što i test na realnoj infrastrukturi.

## Šta je stvarno, a šta je mockovano

| Deo sistema | Produkcioni put | Stanje provere |
| --- | --- | --- |
| Microsoft prijava | Stvarni Entra OAuth v2 authorize/token endpoint | Kod je stvaran; pravi consent nije izvršen |
| Power BI workspace/report/page izbor | Stvarni `https://api.powerbi.com/v1.0/myorg` REST API | Kod je stvaran; odgovori su mockovani u testovima |
| Power BI export | Stvarni asinhroni `ExportTo`, polling i download pozivi | Kod je stvaran; nije proveren na stvarnom kapacitetu |
| Privatno skladište | Stvarni Cloudflare R2 S3 klijent i AWS v4 potpisivanje URL-a | Kod je stvaran; u testovima je skladište lažno/in-memory |
| Player prikaz | Stvarni PNG payload, PWA prefetch i offline cache | Testirano lokalno; nije provereno na fizičkom signage uređaju i pravom R2 CORS-u |
| Demo podaci | Koriste se za demo/automatizovane testove | Ne zamenjuju stvarni Power BI tenant |

Važna razlika: postojeća javna `powerbi` aplikacija i nova `powerbi-secure` aplikacija nisu isti proizvodni režim. Privatni režim ne šalje Microsoft token player-u i ne otvara interaktivni izveštaj u browser-u. Player dobija samo renderovane stranice izveštaja.

## Nalazi koje treba rešiti

### Prioritet 0 — pre javnog puštanja

1. **Pouzdan životni ciklus privatnih objekata.** Direktno brisanje postoji za promenu konfiguracije, reconnect, disconnect, brisanje instance i uninstall, ali nema trajnog reda za retry, tombstone zapisa, distribuiranog lease/fencing mehanizma ni owner-prefix sweeper-a. Export koji je već u toku može da upiše objekat nakon brisanja instance.
2. **Obnova potpisanih URL-ova.** R2 potpis ističe, a logička revizija sadržaja može ostati ista. Online player mora dobiti nov potpis pre isteka čak i kada PNG nije promenjen. Offline cache treba da zadrži isti stabilni ključ.
3. **Kontrolisano beta pravo pristupa.** `powerbi-secure` treba da ostane non-public. Potreban je super-admin grant/revoke za tačno određenu organizaciju, bez objavljivanja aplikacije celom katalogu.
4. **Stvarni tenant/capacity test.** Jedna i više stranica, throttling, restart procesa, istek URL-a, offline prikaz i revoke moraju biti provereni sa realnim servisima.

### Prioritet 1 — pre pilot kupca

1. **Filtrirati tip izveštaja.** Microsoft lista vraća `PowerBIReport` i `PaginatedReport`, ali trenutni picker ne čita `reportType`, dok export uvek koristi `powerBIReportConfiguration`. Paginated izveštaj zato može biti ponuđen, a zatim neuspešno izvezen. Za prvi pilot prikazivati samo `reportType === "PowerBIReport"` ili implementirati poseban paginated tok.
2. **Bezbedna operator dijagnostika.** CMS trenutno dobro prikazuje `pending/stale`, ali operatoru treba dozvoljena lista bezbednih kodova i instrukcija: consent, permission, capacity, throttle, unsupported report i storage problem.
3. **Očistiti lint.** Preimenovati neiskorišćeni `catch (error)` parametar i formatirati test za nebezbedan export ID.
4. **Microsoft nalepnica naloga.** Power BI access token ima Power BI audience, a pomoćni `/me` poziv ide ka Graph-u; neuspeh je bezbedno progutan, ali korisnik može videti generičko „Microsoft account“. Ovo nije blokator exporta, ali je slabiji UX.

### Ograničenja koja se moraju jasno prodavati

- Trenutna verzija prikazuje bezbedne snimke, ne interaktivni Power BI.
- Izvozi se pogled delegiranog povezanog korisnika. Nije implementirana proizvoljna `effectiveIdentity`/RLS persona po ekranu.
- PNG export ne podržava sensitivity labels.
- PPU nije podržan; potreban je Premium, Embedded ili Fabric capacity.
- Maksimum je 50 stranica/visual export jedinica po poslu. Kod dodatno koristi strože limite veličine radi zaštite sistema.
- Neki custom, R, Python, PowerApps, Power Automate, paginated-report visual, Visio i ArcGIS vizuali se ne renderuju kroz ovaj API.

## Implementacija stvarnog privatnog Power BI-ja — korak po korak

### 1. Završiti kodne blokatore

1. Implementirati filtriranje `reportType` u picker-u i test za `PaginatedReport`.
2. Uvesti trajni cleanup posao: tombstone, idempotentni retry, dead-letter vidljivost i periodični sweeper.
3. Uvesti distribuirani lease/fencing po Power BI cache ključu. Dok to ne postoji, kontrolisani pilot sme koristiti samo jednu backend repliku.
4. Uvesti obnovu R2 potpisa pre isteka kroz reconnect, REST `since` polling ili heartbeat, bez promene stabilnog cache ključa.
5. Implementirati super-admin beta grant/revoke i bezbedne CMS poruke greške.
6. Očistiti dve lint greške i dodati E2E konfiguraciju koja podiže ili mockuje Redis/Mongo zavisnosti deterministički.

### 2. Podesiti Microsoft Entra aplikaciju

1. U Entra Admin Center-u napraviti App registration.
2. Za prvi pilot koristiti single-tenant registraciju i sačuvati Directory/Tenant ID.
3. Pod **Authentication → Web** registrovati potpuno tačan redirect URI:

   ```text
   https://<API-DOMEN>/api/v1/connections/oauth/microsoft/callback
   ```

4. Napraviti client secret, čuvati ga samo u backend secret store-u i evidentirati datum isteka.
5. Pod **API permissions → Power BI Service → Delegated permissions** dodati:

   ```text
   Workspace.Read.All
   Report.Read.All
   Dataset.Read.All
   ```

6. Odobriti admin consent za tenant. Aplikacija u toku prijave dodatno traži `openid`, `email` i `offline_access`.
7. Povezani korisnik mora imati pristup izabranom workspace-u, izveštaju i njegovim semantičkim modelima.

### 3. Podesiti Power BI tenant i sadržaj

1. Workspace i svi povezani semantic modeli moraju biti na Premium, Embedded ili Fabric capacity-ju. PPU nije dovoljan.
2. U Power BI Admin portalu omogućiti tenant opciju **Export reports as image files**, jer je za PNG podrazumevano isključena.
3. Proveriti i opštu export opciju za PowerPoint/PDF koju Microsoft navodi kao preduslov, iako trenutni tok koristi PNG.
4. Za prvi pilot napraviti mali običan `PowerBIReport` bez nepodržanih vizuala, do 5 stranica.
5. Testirati export istim korisnikom koji će povezati aplikaciju. Ako se koristi RLS, prvo potvrditi da njegov delegirani pogled daje očekivane podatke.
6. Izmeriti stvarno trajanje exporta i podesiti refresh na realnu potrebu; ne obećavati sekundu-po-sekundu prikaz.

### 4. Podesiti odvojeni privatni Cloudflare R2 bucket

1. Napraviti poseban bucket, različit od javnog media bucket-a.
2. Ne uključivati `r2.dev` niti javni custom domain za taj bucket.
3. Napraviti R2 token ograničen samo na taj bucket, sa Object Read & Write pravima potrebnim backend-u.
4. Sačuvati Account ID, Access Key ID i Secret Access Key u backend secret store-u.
5. Dodati CORS samo za tačno poreklo player-a. Minimalni primer:

   ```json
   [
     {
       "AllowedOrigins": ["https://<PLAYER-DOMEN>"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

6. Preporučeni potpis za pilot je 900 sekundi. Potpisani URL je bearer kredencijal do isteka i ne sme se logovati.
7. Trenutni kod automatski koristi standardni R2 endpoint. Ako se zahteva EU ili FedRAMP jurisdikcioni endpoint, prvo dodati eksplicitnu konfiguraciju endpoint-a/jurisdikcije.

### 5. Podesiti backend promenljive

```dotenv
MICROSOFT_CLIENT_ID=<entra-client-id>
MICROSOFT_CLIENT_SECRET=<entra-client-secret>
MICROSOFT_TENANT=<directory-tenant-id>

ENCRYPTION_KEY=<stabilan AES-256-GCM ključ od tačno 32 bajta>
PUBLIC_API_URL=https://<API-DOMEN>

PRIVATE_R2_ACCOUNT_ID=<cloudflare-account-id>
PRIVATE_R2_ACCESS_KEY_ID=<bucket-scoped-access-key-id>
PRIVATE_R2_SECRET_ACCESS_KEY=<bucket-scoped-secret-access-key>
PRIVATE_R2_BUCKET=<naziv-privatnog-bucket-a>
PRIVATE_R2_SIGNED_URL_TTL_SECONDS=900
```

`ENCRYPTION_KEY` mora biti stabilan i bekapovan u bezbednom secret store-u. Promena ili gubitak ključa čini već sačuvane OAuth tokene nečitljivim. `PUBLIC_API_URL` je samo origin API-ja; aplikacija sama dodaje `/api/v1/connections/oauth/microsoft/callback`.

### 6. Podesiti i ponovo izgraditi player

```dotenv
VITE_PRIVATE_ASSET_ORIGIN=https://<ACCOUNT-ID>.r2.cloudflarestorage.com
VITE_PRIVATE_ASSET_PATH_PREFIX=/<PRIVATNI-BUCKET>/private-assets/v1
```

Obe promenljive moraju biti podešene zajedno i ugrađuju se pri build-u, pa je posle izmene potreban novi player build/deploy. Origin mora koristiti HTTPS.

### 7. Aktivirati samo kontrolisanu organizaciju

1. Kreirati ili seed-ovati non-public katalošku stavku `powerbi-secure`.
2. Dodeliti beta pravo samo internoj/pilot organizaciji.
3. Kreirati instancu, pokrenuti Microsoft povezivanje i izabrati workspace, običan report i stranicu ili sve stranice.
4. Ne menjati aplikaciju na public dok svi acceptance testovi ne prođu.

### 8. Obavezni acceptance testovi

1. OAuth callback radi sa tačnim redirect URI-jem, admin consent-om i Power BI audience tokenom.
2. Picker prikazuje samo dozvoljene workspaces i samo podržane obične izveštaje.
3. Jednostrani PNG export prolazi od Microsoft-a do fizičkog ekrana.
4. Višestrani PNG vraća ZIP i sve stranice se bezbedno raspakuju i prikažu.
5. Restart backend-a tokom exporta nastavlja posao iz sačuvanog job ID-ja.
6. `429` poštuje `Retry-After`, a poslednji dobar snimak ostaje na ekranu.
7. Istek Microsoft sesije traži reconnect bez curenja tokena.
8. Potpisani R2 URL se obnavlja pre isteka; istekli URL ne pravi crn ekran.
9. Player radi offline iz cache-a, a po povratku mreže dobija novu verziju.
10. Brisanje instance, disconnect i revoke uklanjaju cache i privatne objekte, uključujući slučaj exporta koji je bio u toku.
11. Snapshot, CMS odgovor, IndexedDB i logovi ne sadrže OAuth/refresh tokene niti R2 secret.
12. Testirati bar jedan neuspeh zbog permission/capacity/storage problema i potvrditi da CMS prikazuje bezbednu, korisnu instrukciju.

## Predlog rada više agenata

| Agent | Zadatak | Nezavisni izlaz | Uslov prihvatanja |
| --- | --- | --- | --- |
| PBI-A | `reportType` filtriranje, picker testovi i operator poruke | Backend/CMS patch i testovi | Paginated report se ne može slučajno izabrati; korisnik dobija bezbednu poruku |
| PBI-B | Tombstone, cleanup queue, retry i distributed lease/fencing | Backend lifecycle patch i testovi konkurentnosti | Nema upisa nakon tombstone-a; svaki neuspešan delete je ponovljiv i vidljiv |
| PBI-C | Obnova potpisa, reconnect i offline cache | Backend/player patch i testovi isteka | Online player uvek dobija važeći URL, a offline stabilni cache ostaje dostupan |
| PBI-D | Beta entitlement, deployment checklist i realni smoke scenario | Admin/backend patch i evidencija testa | Samo izabrana organizacija vidi aplikaciju; realni one-page/multi-page test prolazi |

Koordinator treba da zadrži izmene zajedničkih ugovora i Nest modula, zatim integriše agente redom PBI-A, PBI-B, PBI-C i PBI-D, uz punih 663+ testova i sve produkcione buildove posle svake integracije.

## Odluka o puštanju

| Okruženje | Odluka | Uslov |
| --- | --- | --- |
| Lokalni demo sa mockovima | Dozvoljeno | Jasno označiti da nije dokaz realne integracije |
| Interni realni smoke test | Dozvoljeno | Pravi Entra, capacity i privatni R2; jedna backend replika |
| Jedan kontrolisani design-partner pilot | Uslovno | PBI-A, PBI-B, PBI-C i beta entitlement završeni; realni acceptance testovi prošli |
| Javna prodaja / public katalog | Nije dozvoljeno | Svi P0 zadaci i svih 12 acceptance testova moraju proći |

## Zvanične reference

- [Microsoft: Export Power BI report to file](https://learn.microsoft.com/en-us/power-bi/developer/embedded/export-to)
- [Microsoft: Export To File REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/export-to-file-in-group)
- [Microsoft: Get Reports In Group i `reportType`](https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group)
- [Cloudflare: R2 potpisani URL-ovi](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare: R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare: R2 API tokeni](https://developers.cloudflare.com/r2/api/tokens/)
