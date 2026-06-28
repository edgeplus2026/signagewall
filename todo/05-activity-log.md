# 05 — Activity log (org-level audit: ko je šta menjao)

## Context

Na nivou organizacije treba da se vidi ko je šta menjao (CREATE/UPDATE/DELETE):
čitljiv naslov, šta je promenjeno, ko, kada — vidljivo svim članovima org-a.
Header dugme otvara meni sa **današnjim**, "see all" otvara stranicu sa po danu
grupisanim collapsible sekcijama; filteri po useru i datumu; paginacija 20 +
React Virtuoso infinite scroll.

> Napomena: tvoj plan + moje **korekcije**, posebno oko arhitekture hvatanja
> (tražio si "ne u svakom kontroleru, nego na nivou modula, reusable").

## Trenutno stanje (grounded)

- **Nema audit modula.** BE `common` ima **globalne interceptore**
  (response-transform, logging) → postoji obrazac za cross-cutting.
- **EventEmitter2 se već koristi** u više modula (player/playlists/screens/media).
- **Nema base repository** (repos ne dele zajedničku osnovu).
- **React Virtuoso je već dependency** u CMS-u (ima `GroupedVirtuoso` — idealan za
  po-danu grupisan infinite scroll).
- Org scoping već postoji (`OrgMembershipGuard`, `RequiredOrganizationId`).

## Ključna arhitektonska odluka (gde te najviše ispravljam)

Tvoj zahtev je tačan: **ne sme da se zove ručno u svakoj controller funkciji.**
Tri opcije, sa trade-off-ovima:

| Opcija | Kako | + | − |
|---|---|---|---|
| **A. Mongoose plugin + CLS** | `schema.plugin(auditPlugin, {...})` na audited schemama; hooks na save/update/delete računaju **diff**; actor/org iz AsyncLocalStorage | Najbliže tvojoj viziji: "module level", auto na data sloju, hvata **pravi diff**, redakcija per-schema | `updateMany`/`bulkWrite`/pipeline zaobilaze doc middleware; treba CLS; "before" state za diff |
| B. Global interceptor + `@Audit()` | Globalni `AuditInterceptor` čita route config | Zna actor/org iz request-a lako | Ne zna precizan field diff; ipak anotiraš rute |
| C. Domain events | Servisi emituju `entity.updated` (već koriste EventEmitter2) | Eksplicitno, bogat kontekst | Diraš svaki service mutation metod |

### Preporuka: **Opcija A (Mongoose plugin + nestjs-cls)** kao kičma

- Audited schemu uključiš **jednom linijom**:
  ```ts
  PlaylistSchema.plugin(auditPlugin, {
    entity: 'Playlist',
    nameField: 'name',          // za čitljiv naslov: Playlist "Summer"
    sensitive: ['password'],    // vrednosti se NE upisuju, samo "changed"
    ignore: ['updatedAt', '__v', 'revision'],
  })
  ```
- Plugin na `save` / `findOneAndUpdate` / `deleteOne` / `findOneAndDelete`:
  - izračuna **changedFields** (diff pre/posle; za `findOneAndUpdate` koristi pre-hook
    fetch ili `{ new: false }`),
  - **redaktuje** `sensitive` (npr. password → `{ field: 'password', changed: true }` bez vrednosti),
  - preskoči `ignore`,
  - upiše `AuditLog { orgId, actorId, action, entity, entityId, entityName, changedFields[], at, ip }`.
- **Actor/org/ip** iz **`nestjs-cls`** (AsyncLocalStorage), postavljeni jednom u
  middleware/guard-u → dostupni u plugin-u bez prosleđivanja kroz servise. Pozadinski
  job (bez request-a) → actor = `system`.
- **Čitljiv naslov se NE skladišti kao string** — čuvaš strukturu (entity/action/name)
  i renderuješ "Playlist «Summer» updated" na API/UI sloju → **i18n (en/sr)**, konzistentno
  sa notifikacijama. (Tvoj primer 'Playlist "NAME" is updated' = render iz strukture.)

### Caveat-i (svesno)
- **Bulk/raw operacije** (`updateMany`, `bulkWrite`, aggregation update) zaobilaze
  document middleware → neće biti audit-ovane. Mitigacija: za audited entitete koristi
  doc-based operacije, ili dodaj i query-middleware. Dokumentovati koje su audit-ovane.
- CLS setup je jednokratan (mali).
- Diff "pre" stanje traži pre-hook fetch (mali overhead na write-ovima audited entiteta).

## Pristup

### BE (`modules/audit`)
- `audit-log.schema.ts` (+ indeksi: `{orgId, at}`, `{orgId, actorId, at}` za filtere),
  `audit.plugin.ts` (Mongoose plugin), `cls` setup (nestjs-cls middleware), 
  `audit.service.ts` (write iz plugin-a + read sa filterima/paginacijom),
  `audit.controller.ts` (`GET /audit?from&to&userId&cursor&limit=20`, org-scoped, svaki član vidi).
- Uključi plugin na izabrane scheme (Playlist, Screen, Media, AppInstance, Membership,
  Organization, Settings…) — **lista koju biraš**, ne sve.

### CMS (`features/activity-log`)
- **Header dugme** (pored bell-a) → Popover/Sheet sa **današnjim** aktivnostima + dole
  flat **"See all"** → ruta `/activity`.
- `/activity` stranica: **`GroupedVirtuoso`** (react-virtuoso) — grupe = dani
  (collapsible sekcije), stavke = aktivnosti; **infinite scroll** (endReached → next
  page, limit 20). Svaka stavka: ikonica akcije (CREATE/UPDATE/DELETE boja), čitljiv
  naslov, "šta je promenjeno" (lista polja, sensitive prikazani kao "changed"), ko, kada.
- Filteri: **po useru** (member select) i **po datumu** (range). Čist dizajn po vašem
  design sistemu (shadcn/ui komponente kao i ostatak).

## Fajlovi (orijentir)
- BE: `modules/audit/*` (schema, plugin, service, controller), CLS middleware u
  `common`, `schema.plugin(auditPlugin, …)` na izabranim schemama.
- CMS: `features/activity-log/*` (api, hooks, `ActivityHeaderButton`, `ActivityTodayMenu`,
  `ActivityPage` sa `GroupedVirtuoso`, filteri), ruta u
  [router/index.tsx](../apps/cms/src/router/index.tsx), header slot u
  [AppLayout.tsx](../apps/cms/src/components/layout/AppLayout.tsx).

## Moje korekcije tvog plana
- **Paginacija**: za infinite scroll koristi **cursor-based** (`at < lastSeen`) umesto
  offset `skip(20*n)` — offset puca/duplira kad stižu novi zapisi tokom skrola.
- **Naslov**: čuvaj strukturu, renderuj string (i18n), ne hardkoduj engleski string u bazu.
- **"Šta je promenjeno"**: za UPDATE prikaži listu polja; za sensitive (password, token)
  samo "changed" bez vrednosti (tvoj zahtev — rešeno `sensitive` listom u plugin-u).
- **Ko sme da vidi**: svi članovi org-a (tvoj zahtev) — org-scoped read, bez admin gate-a.
- `GroupedVirtuoso` (ne obična lista) za po-danu grupisan + infinite scroll.

## Odluke / otvorena pitanja
- Koje scheme audit-ovati u MVP-u (predlog: Playlist, Screen, Media, AppInstance, Membership, Settings)?
- Retencija audit logova (npr. 180 dana TTL)?
- Da li loginovati i auth događaje (login/logout/pairing)? Ti su izvan Mongoose-write
  obrasca → eventualno dodaj eksplicitnim `auditService.record(...)` za njih (mali izuzetak).
- CLS biblioteka: `nestjs-cls` (standard).

## Verifikacija
- Update playliste → tačno jedan AuditLog sa entity=Playlist, action=UPDATE, changedFields,
  actor=ja, naslov "Playlist «X» updated".
- Promena passworda → audit kaže "changed" bez vrednosti.
- Bulk operacija (ako se negde koristi na audited entitetu) → dokumentovano da se ne hvata.
- `/activity`: dani grupisani, collapsible, scroll dovlači sledećih 20 (cursor), filteri po useru/datumu rade.
- Drugi član iste org-e vidi iste zapise; član druge org-e ne vidi ništa.

## Procena
Srednje-velika. Najveći deo je audit plugin + CLS (jednom, pa skoro besplatno po schemi);
CMS strana je standardna uz `GroupedVirtuoso`.
