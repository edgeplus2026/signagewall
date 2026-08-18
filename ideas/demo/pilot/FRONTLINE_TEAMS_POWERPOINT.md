> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../../README.md).

# Frontline Communications · postojeći Teams + PowerPoint workflow

Ovo je paketiranje dve postojeće aplikacije u jednu buyer priču. Nema novog kombinovanog konektora: Teams i PowerPoint ostaju odvojeni content item-i koje stavljamo u istu playlistu.

## Kada odgovara kupcu

- Kratke promene smene, podsetnici i announcements već se objavljuju u jednom Teams kanalu.
- Dizajnirani sadržaj već postoji kao `.pptx` u OneDrive-u ili SharePoint-u.
- Deskless publika ima zajedničke ekrane, ali nema pouzdan pristup intranetu ili Teams-u tokom rada.

Ne nuditi kao emergency komunikaciju, dokaz da je poruka pročitana, approval sistem ili poverljivu distribuciju prezentacija.

## Preduslovi

- Microsoft work/school nalog i backend Microsoft OAuth konfiguracija.
- Admin consent za Teams delegirane scope-ove `Team.ReadBasic.All`, `Channel.ReadBasic.All` i `ChannelMessage.Read.All`.
- Za PowerPoint source mode `microsoft`: read-only `Files.Read.All` i `Sites.Read.All`.
- R2 public media konfiguracija i `poppler-utils` (`pdftoppm`) na backend hostu za render `.pptx -> PDF -> WebP`.
- Javno dostupan Graph callback ako se demonstrira push update; bez njega se oslanjamo na polling fallback.
- Namenski demo kanal i demo deck bez poverljivog sadržaja.

## Korak po korak: Teams item

1. Unapred napraviti Teams app instance; pred kupcem ne otvarati katalog.
2. Povezati work/school Microsoft nalog i završiti admin consent.
3. Izabrati jedan `Team · Channel` iz picker-a. Picker prikazuje kanale timova čiji je povezani korisnik član.
4. Izabrati `spotlight` za jednu poruku u rotaciji ili `grid` za pregled više poruka.
5. Podesiti `slideSeconds` samo za spotlight; dozvoljen opseg je 2–120 sekundi.
6. Po potrebi uključiti ime autora i svetlu/tamnu temu.
7. U demo kanalu pripremiti tri tekstualne poruke i jedan announcement sa naslovom.
8. Dodeliti item demo playlisti i proveriti da se prikazuje tekst, ne Microsoft UI.

Trenutna granica: konektor traži do 20 poruka jednog kanala, odbacuje system/tombstone događaje i image-only objave. Teams-hosted slike se ne šalju player-u jer zahtevaju bearer token. Manifest cadence je 120 sekundi i nema Teams `webhookResource`; zato ne opisivati update kao instant.

## Korak po korak: PowerPoint private-file source

1. Unapred napraviti PowerPoint app instance.
2. Izabrati `Microsoft account (private file)`, ne javni embed mode.
3. Povezati Microsoft nalog read-only i izabrati `.pptx` iz OneDrive-a ili SharePoint-a.
4. Podesiti 3–120 sekundi po slajdu, `contain`/`cover` i letterbox boju.
5. Sačekati prvi render. Backend preuzima PDF konverziju preko Graph-a, rasterizuje stranice i čuva WebP slajdove na R2.
6. Dodeliti item istoj demo playlisti posle Teams item-a.
7. Izmeniti jedan nepoverljiv slajd, zabeležiti vreme i dokazati stvarni update. Konektor ima Graph file subscription put i fallback polling od 900 sekundi.
8. Posle uspešnog prikaza odraditi offline checklist za renderovane slajdove na ciljnom uređaju.

### Bezbednosna granica koja blokira prodajnu tvrdnju „private”

Izbor izvora jeste private-file workflow: Microsoft konekcija može da čita nejavni `.pptx`. Međutim, trenutni PowerPoint connector pretvara R2 object key-eve u javne URL-ove i payload ih šalje kao `slides: string[]`. To znači:

- dozvoljeno: „Povežemo Microsoft nalog i biramo nejavni dokument bez javnog PowerPoint embed linka”;
- nije dozvoljeno: „Renderovani slajdovi su dostupni samo autorizovanom player-u”;
- za demo koristiti sintetičke, nepoverljive slajdove;
- poverljiv HR, finansijski, bezbednosni ili kupčev materijal čeka migraciju PowerPoint-a na provereni private-asset tok.

## Predložena demo playlista

| Red | Item                           |      Trajanje | Uloga                                               |
| --- | ------------------------------ | ------------: | --------------------------------------------------- |
| 1   | Teams `spotlight`              |          24 s | tri kratke operativne poruke po 8 s                 |
| 2   | PowerPoint private-file source | najmanje 45 s | tri dizajnirana slajda po 15 s                      |
| 3   | OpsBoard Shift ili Safety      |          30 s | operativno stanje, odvojeno od komunikacione poruke |

Tačno trajanje rotacije je pilot odluka. Ne predstavljati ovu tabelu kao preporučeni SLA ili potvrdu da je svaka osoba videla sadržaj.

## Šta observer ručno meri

- minute od spremne poruke/deck izmene do opaženog prikaza;
- broj ručnih eksportovanja, USB kopiranja ili poziva osobi koja održava ekran pre i tokom pilota;
- broj provera u kojima je na ekranu bila očekivana verzija;
- broj image-only Teams objava koje su operatori očekivali, ali nisu prikazane;
- neuspehe OAuth consent-a, rendera, source refresh-a i player reconnect-a.

Sistem trenutno nema proof-of-play/reach metriku. Observer može da beleži šta je video na konkretnoj proveri, ali to nije dokaz da je svaki radnik poruku pročitao.
