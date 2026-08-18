> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../../README.md).

# Offline i reconnect checklist

Ovaj test odvaja dve različite greške: prekid mreže na player-u i neuspeh backend-a da pročita Sheet/Excel. One nisu ista stvar i trenutno ne daju isti vizuelni signal.

## A. Preduslovi

- [ ] Upareni test player ima samo ili prvenstveno proveravani OpsBoard item.
- [ ] OpsBoard je jednom dobio validan snapshot i prikazuje očekivane redove.
- [ ] Zabeleženi su screen ID, content item, izvor, worksheet i početno vreme.
- [ ] U source-u postoji jedna očigledna, reverzibilna test vrednost, npr. `NM-DEMO-OFFLINE`.
- [ ] Otvoren je [`pilot-capture-sheet.csv`](pilot-capture-sheet.csv).
- [ ] Test se radi na demo podacima; ne opozivati produkcioni OAuth nalog.

## B. Player ostaje bez mreže

1. Zabeležiti sadržaj najmanje dva reda i trenutnu reviziju ako je vidljiva u dijagnostici.
2. Isključiti mrežu samo na player uređaju. Backend i spreadsheet ostaju online.
3. Proveriti da li postojeći OpsBoard ostaje vidljiv i da li njegova paginacija/playlist rotacija nastavlja da radi.
4. Sačekati najmanje dva `pageSeconds` intervala ako board ima više stranica.
5. Reload/reboot player-a dok je i dalje offline.
6. Proveriti da li se poslednji snapshot vraća bez prazne table. Ovo je obavezna ručna provera; IndexedDB save je best-effort i sama implementacija nije dokaz da konkretan uređaj radi.
7. Dok je player offline, promeniti test ćeliju u Sheet/Excel i zabeležiti `source_edit_at`.
8. Potvrditi da ekran ostaje na prethodnoj vrednosti; offline player ne može da primi novu reviziju.

**Očekivanje prema kodu:** snapshot se čuva pri `content:update` i učitava pri cold boot-u. OpsBoard manifest nema `requiresNetwork`, pa ga offline filter ne uklanja iz rotacije. Ipak, sam browser `offline` događaj ne menja `AppDataMeta.stale`; zato OpsBoard možda neće pokazati bedž `Offline` pri ovom testu.

## C. Reconnect player-a

1. Vratiti mrežu na player-u i zabeležiti `player_online_at`.
2. Posmatrati bez ručnog reload-a. Socket ima automatski reconnect sa rastućim kašnjenjem od 1 do najviše 15 sekundi između pokušaja.
3. Proveriti da li stiže vrednost iz koraka B7 i zabeležiti `screen_observed_at`.
4. Izračunati dve odvojene mere:
   - `reconnect_to_screen_seconds = screen_observed_at - player_online_at`
   - `edit_to_screen_seconds = screen_observed_at - source_edit_at`
5. Ponoviti tri puta. Jedan uspešan reconnect nije dovoljan za pilot tvrdnju.
6. Ako promena ne stiže, sačuvati revision/error podatak i proveriti backend source refresh; ne pripisivati automatski grešku player-u.

## D. Backend ne može da osveži izvor

Ovaj scenario testirati samo u kontrolisanom staging okruženju.

1. Početi od uspešno keširanog payload-a.
2. Simulirati neuspešan upstream fetch bez brisanja instance i bez uništavanja jedine test konekcije.
3. Sačekati da backend zabeleži fetch grešku. Trenutni scheduler čuva poslednji payload i postavlja cache error, ali sama greška ne pokreće fan-out novog snapshot-a.
4. Naterati player da ponovo razreši snapshot kontrolisanim reconnect-om. Novi revision tada uključuje `stale: true`.
5. Proveriti da redovi ostaju prikazani i da se pojavljuje `Offline` freshness footer.
6. Vratiti izvor i sačekati uspešan refresh. Ako je payload sadržajno isti, ni oporavak ne mora pokrenuti fan-out; uraditi još jedan reconnect i proveriti da bedž nestaje bez gubitka redova.

**Važno:** freshness footer reaguje na backend `meta.stale`, ne direktno na mrežni status uređaja. Ako novi snapshot posle cache error-a nije razrešen, odsustvo bedža je očekivano. Ova potreba za reconnect-om je trenutni gap koji pilot mora da zabeleži, ne da ga sakrije.

## E. Restart backend-a

1. Sa validnim poslednjim payload-om restartovati staging backend.
2. Ne dirati player niti source.
3. Proveriti da player nastavlja lokalni prikaz tokom prekida.
4. Po povratku backend-a proveriti reconnect i da prvi sledeći snapshot ne prazni payload.
5. Promeniti jednu source vrednost i dokazati novi uspešan fetch.

## F. Kriterijum prolaza

- [ ] Tri od tri player offline/reconnect ciklusa sačuvaju poslednju tablu.
- [ ] Jedan offline reload/reboot uspešno vrati poslednji snapshot na ciljnom uređaju.
- [ ] Promena napravljena tokom offline perioda stigne nakon reconnect-a.
- [ ] Stvarni latencies su upisani; nema unapred izmišljenog SLA-a.
- [ ] Staging upstream failure zadrži poslednji payload i posle kontrolisanog snapshot re-resolve-a pokaže `Offline` kada je `stale: true`.
- [ ] Backend restart ne briše poslednji dobar prikaz.

Ako bilo koja stavka padne, pilot se može nastaviti samo uz jasno ograničenje i plan popravke; ne koristiti formulaciju „radi offline” kao bezuslovnu tvrdnju.
