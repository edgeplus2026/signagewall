# 04 — CMS notifikacije (super-admin → korisnici)

## Context

Treba kanal kojim super-admin šalje obaveštenja svim CMS korisnicima (najave,
održavanje, nove feature). Super-admin CRUD (po jeziku en+sr: Title + Content rich
text), a korisnici vide bell ikonicu u header-u sa listom + "Mark all as read", i
sheet sa punim sadržajem na klik.

> Napomena: ovo je tvoj plan — u nastavku su tvoje stavke + moje **korekcije/dopune**
> (pošto si tražio da te ispravim gde grešiš).

## Trenutno stanje (grounded)

- **Nema notifikacione infrastrukture** nigde (grep prazan).
- super-admin = `admin` modul (BE) + `super-admin` feature (CMS).
- Header: [AppLayout.tsx:39](../apps/cms/src/components/layout/AppLayout.tsx#L39) — trenutno
  samo `SidebarTrigger` + breadcrumb levo; **nema desnog prostora** za bell (dodaje se).
- **Nema rich-text editora** u CMS-u (grep prazan) → treba dodati (predlog **Tiptap**).
- Postoji **`cms.gateway.ts`** (WS gateway za presence) → reuse za **live push** bell count-a.
- i18n već postoji (en + sr lokali).

## Tvoj plan (kako si ga opisao)
- super-admin CRUD: po jeziku (en+sr) Title + Content (rich text).
- Korisnik: bell desno u header-u → meni sa listom + dole flat "Mark all as read".
- Klik na stavku → sheet sa punim info + dole "Mark as read".

## Moje korekcije / dopune (bitno)

1. **Read-state per korisnik, ne kopije po korisniku.** Notifikacija je globalna
   (jedna, autorisana od super-admina); pročitanost je per-user. Model:
   `Notification` (global) + `NotificationReceipt { userId, notificationId, readAt }`.
   Unread = objavljene notifikacije **bez** receipt-a za tog korisnika (i novije od
   datuma kreiranja naloga / ne istekle). Kopiranje po korisniku se ne skalira.

2. **Draft vs Published + opcioni schedule.** Notifikacija ne sme da bude vidljiva dok
   se ne objavi. Polja: `status: draft|published`, `publishedAt`, opciono `publishAt`
   (zakazano) i `expiresAt` (sakrij posle). Super-admin uređuje draft pa "Publish".

3. **Audience (targeting).** "Svim korisnicima" je OK za MVP, ali ostavi
   `audience: { type: 'all' | 'orgs' | 'users', ids?: [] }` u schemi da kasnije možeš
   ciljati org/usera bez migracije. MVP renderuje samo `all`.

4. **Rich text bezbednost (XSS).** Super-admin piše HTML koji se prikazuje SVIM
   korisnicima → **mora sanitizacija**. Predlog: Tiptap čuva **JSON** (struktura) i
   render kroz kontrolisani renderer; ako čuvaš HTML → **DOMPurify** na renderu.
   Nikako sirov `dangerouslySetInnerHTML` bez sanitizacije.

5. **i18n fallback.** Title+Content po jeziku (en, sr). Ako sr fali → fallback en.
   Prikaži u jeziku korisnika.

6. **Live push (nice-to-have).** Na publish → `cms.gateway` emituje event org/korisnicima
   da bell count poraste bez refresh-a. Reuse postojećeg presence gateway-a.

## Pristup

### BE (`modules/notifications`)
- Scheme: `Notification { translations: { [lang]: { title, content } }, status,
  publishedAt?, publishAt?, expiresAt?, audience }`, `NotificationReceipt { userId,
  notificationId, readAt }`.
- super-admin endpoints (admin guard): CRUD + publish.
- korisnik endpoints: `GET /notifications` (objavljene & vidljive za mene, sa `read`
  flag-om, paginirano), `GET /notifications/unread-count`, `POST /notifications/:id/read`,
  `POST /notifications/read-all`.
- Reuse mail? Ne — ovo su **in-app** notifikacije (ne mejl).

### CMS
- **Rich text**: dodaj Tiptap (`@tiptap/react` + starter-kit), editor u super-admin formi
  sa en/sr tabovima.
- super-admin stranica: lista + create/edit (Title + Tiptap Content po jeziku) + Publish.
- Header bell: dodaj **desni slot** u [AppLayout.tsx](../apps/cms/src/components/layout/AppLayout.tsx)
  header (`ml-auto`); `NotificationBell` (badge sa unread count) → Popover lista
  (najnovije, unread istaknute) + dole flat **"Mark all as read"**.
- Klik na stavku → **Sheet** sa punim (sanitizovanim) sadržajem + dole **"Mark as read"**.
- Hook: `useNotifications` (paginirano), `useUnreadCount` (+ live preko cms socket-a opciono).

## Fajlovi (orijentir)
- BE: `modules/notifications/*` (controller za admin + za usera, service, 2 scheme, dto).
- CMS: `features/notifications/*` (api, hooks, `NotificationBell`, `NotificationSheet`),
  super-admin `NotificationsPage` + Tiptap editor (`components/RichTextEditor`),
  header slot u AppLayout.

## Odluke / otvorena pitanja
- Audience za MVP: samo `all`? (predlog da, ali schema spremna za targeting).
- Tiptap JSON vs sanitizovani HTML za skladištenje? (predlog JSON).
- Treba li i mejl kopija za "važne" notifikacije? (predlog: ne za MVP).
- Retencija/expiry default?

## Verifikacija
- super-admin kreira sr+en notifikaciju, Publish → svim korisnicima badge +1 (live ako uključeno).
- Korisnik na sr jeziku vidi sr verziju; bez sr → en fallback.
- "Mark as read" (pojedinačno i all) → badge se ažurira, persistuje po useru.
- XSS pokušaj u Content-u (npr. `<script>`/`onerror`) → sanitizovan, ne izvršava se.
- Draft nije vidljiv korisnicima; tek posle Publish.

## Procena
Srednja. BE je standardan CRUD + receipts; CMS najviše posla oko Tiptap editora + header bell/sheet.
