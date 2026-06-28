# 09 — Legal (ToS / Privacy) + GDPR brisanje podataka

## Context

Za javni SaaS launch trebaju Uslovi korišćenja (ToS) i Politika privatnosti, plus
GDPR prava korisnika: pristup/eksport podataka i **pravo na brisanje** (right to
erasure). Bez ovoga ne smeš da primaš realne korisnike/plaćanja u EU.

## Trenutno stanje (grounded)

- Auth/users/organizations/members/invitations postoje; **nema audit modula** (grep
  potvrdio), nema zapisa o prihvatanju ToS-a, nema flow-a za brisanje naloga/org-a.
- Media na S3 (`@aws-sdk/client-s3`); brisanje S3 objekata pri erasure mora da se pokrije.
- Mail modul sa template-ima postoji ([modules/mail](../apps/be/src/modules/mail)).

## Cilj

ToS/Privacy + zabeleženo prihvatanje, GDPR eksport i potpuno brisanje (user i org/tenant),
uz audit za osetljive akcije.

## Pristup

### 1. Pravni dokumenti + prihvatanje
- ToS i Privacy stranice (CMS public + marketing), **verzionisane** (`version`, `effectiveDate`).
- Na signup/invite: obavezan checkbox; zabeleži `{ userId, docType, version, acceptedAt }`.
- Re-consent: kad se objavi nova verzija → traži ponovno prihvatanje na sledećem loginu.

### 2. GDPR — pravo na pristup/eksport
- Endpoint `GET /me/data-export` → JSON sa svim ličnim podacima korisnika (profil,
  članstva, prihvatanja, audit). Asinhrono + mejl sa linkom ako je veliko.

### 3. GDPR — pravo na brisanje (erasure)
- **Brisanje naloga**: ukloni/anonimizuj PII (ime, email → tombstone), opozovi sesije.
  - Edge case **owner org-a**: ne sme da ostavi org bez vlasnika → primoraj transfer
    vlasništva ili brisanje org-a pre brisanja naloga.
- **Brisanje organizacije (tenant)**: kaskadno — screens, **devices (unpair + revoke)**,
  playlists, app instances, media (+ **S3 purge**), play-logovi. Reuse postojeće
  `unpairScreenDevice`/revoke putanje ([player.service.ts](../apps/be/src/modules/player/player.service.ts))
  i obrazac čišćenja medija (player već ima `clearMediaCaches`; server-side dodaj S3 delete).
- Soft-delete grace period (npr. 30 dana) pre fizičkog brisanja — zaštita od greške.

### 4. Audit log (osetljive akcije)
- Novi `audit` modul: `{ orgId, actorId, action, target, at, ip }` za login, pairing,
  unpair, brisanje, promene rola, izmene podešavanja. Potreban i za compliance i za support.

### 5. Sitno ali obavezno
- Cookie consent na marketing sajtu (ako ima analytics).
- Unsubscribe/footer u mejlovima (mail modul).
- Data Processing/retention zapis (dokument).

## Fajlovi (orijentir)
- BE: `modules/legal/*` (dokumenti + prihvatanja), `modules/audit/*`,
  `modules/users` (data-export + delete-account), `modules/organizations` (delete-org kaskada),
  media S3 purge helper.
- CMS: ToS/Privacy stranice, consent checkbox, "Obriši nalog"/"Obriši organizaciju" flow,
  data-export dugme.
- Mail: template-i (export-ready, account-deletion-confirm).

## Odluke / otvorena pitanja
- **Anonimizacija vs hard-delete** za korisnika koji ima istorijske zapise (npr. audit,
  play-log): predlog anonimizacija PII + zadržavanje ne-ličnih agregata.
- Grace period dužina (30 dana?).
- Ko piše pravni tekst (advokat) — ovde planiramo samo tehnički deo (verzionisanje,
  prihvatanje, eksport, brisanje, audit).
- Hosting jurisdikcija / data residency (EU region za Mongo+S3?) — potvrditi za privacy policy.

## Verifikacija
- Novi user mora da prihvati ToS; prihvatanje zabeleženo sa verzijom.
- Data-export vrati kompletan JSON ličnih podataka.
- Brisanje naloga: PII anonimizovan, sesije opozvane; owner mora prvo da transferuje/obriše org.
- Brisanje org-a: svi ekrani/uređaji/mediji (uklj. **S3 objekte**) obrisani; uređaji unpair-ovani.
- Audit beleži pairing/unpair/brisanje/role-change.

## Procena
Srednje. Tehnički deo (consent + eksport + kaskadno brisanje + audit) je jasan;
najviše pažnje traži erasure kaskada (owner/tenant edge case-ovi + S3 purge).
