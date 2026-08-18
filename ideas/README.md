# ideas/ — nacrti, ne odluke / drafts, not decisions

**SR — Ništa u ovom folderu nije obavezujuće.** Ovo su nacrti, hipoteze i
razmišljanja. Cena, datum ili obim koji ovde piše nije odluka i ne sme se
citirati kao da jeste — ni kupcu, ni u kodu, ni u drugom dokumentu.

**EN — Nothing in this folder is binding.** These are drafts, hypotheses and
thinking-out-loud. A price, date or scope written here is not a decision and
must not be quoted as one — not to a customer, not in code, not in another doc.

## Gde je istina / Where the real answer lives

| Pitanje / Question | Merodavno / Authoritative source |
| --- | --- |
| Šta proizvod radi / What the product does | kod / the code |
| Šta se radi sada / What is being worked on | [TODO.md](../TODO.md) |
| Šta košta / What it costs | [`apps/web/src/lib/pricing.ts`](../apps/web/src/lib/pricing.ts) i sajt |
| Šta je kupcu obećano / What a customer was promised | potpisana ponuda / the signed offer |

## Zašto ovaj fajl postoji / Why this file exists

Cene u ovom folderu (750 EUR pilot, 249–499 EUR/site, 29 EUR Menu Starter) su
**hipoteze za testiranje**, i sami dokumenti to kažu. Javna cena je i dalje
8 EUR po ekranu mesečno, iz `pricing.ts`. Ako se te dve stvari razilaze, u pravu
je `pricing.ts` — ne fajl odavde.

The prices in this folder are **hypotheses to be tested**, and the documents say
so themselves. The public price remains €8 per screen per month, from
`pricing.ts`. Where the two disagree, `pricing.ts` wins — not a file in here.

Ovo je zapisano zato što je ovaj folder već jednom pročitan kao da je važeći
plan. Sadržaj je koristan i zato se čuva; samo nije obavezujuć.

This is written down because the folder has already been read once as if it were
the live plan. The content is worth keeping — it just is not binding.
