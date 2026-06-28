# 06 — Zone / Layouts (podeljen ekran)

## Context

Najveći **core** gap u odnosu na zrele DS konkurente (ScreenCloud, Yodeck, Xibo…):
naš player pušta **jedan item preko celog ekrana**. Konkurenti dele ekran na **zone**
(npr. glavni video + bočni panel + donji ticker + sat), gde svaka zona vrti svoj
sadržaj nezavisno. Ovo je table-stakes za veliki deo kupaca.

Dobra vest: arhitektura playera je već pripremljena — `PlaybackController` je **per-root
element** (uzima `root` + `items`), pa je multi-zone = **N kontrolera u N pozicioniranih
div-ova**, bez rewrite-a engine-a.

## Trenutno stanje (grounded)

- **Screen.items** je ravna lista ([screen.schema.ts](../apps/be/src/modules/screens/schemas/screen.schema.ts)
  `ScreenItemSubdocument[]` — type/refs/order/duration/disabled). Nema layout/zona.
- **Snapshot** je ravan: `PlayerSnapshot.items: Renderable[]`
  ([player-content.service.ts](../apps/be/src/modules/player/player-content.service.ts)).
- **Player**: jedan `PlaybackController` nad jednim root-om
  ([Stage.tsx](../apps/player/src/ui/Stage.tsx) + [playback-controller.ts](../apps/player/src/engine/playback-controller.ts)),
  A/B slotovi preko cele površine. Orientation/scale se primenjuju na **ceo stage**.

## Cilj

Screen ima **layout sa zonama**; svaka zona je nezavisan content loop. Potpuna
backward-kompatibilnost: postojeći ekran = layout sa **jednom full-screen zonom**.

## Pristup (po fazama)

### Faza 1 — Model + snapshot + player render (srž)
- **Data model**: Screen dobija `layout` sa zonama:
  ```ts
  layout: {
    zones: { id, name, rect: { x, y, w, h /* % */ }, z?, fit?, items: ScreenItem[] }[]
  }
  ```
  Content se seli iz ravnog `screen.items` u **per-zone items**.
- **Migracija (backward-compat)**: svaki postojeći ekran → layout sa jednom zonom
  `{0,0,100,100}` i postojećim items. Stari ekrani rade bez promene ponašanja.
- **Snapshot** ([player-content.service.ts](../apps/be/src/modules/player/player-content.service.ts)):
  `PlayerSnapshot.zones: { id, rect, items: Renderable[] }[]` (zadrži `items` kao
  deprecated dok player ne pređe; ili mapiraj single-zone → items radi tranzicije).
- **Player** ([Stage.tsx](../apps/player/src/ui/Stage.tsx)): renderuj N pozicioniranih
  div-ova (rect u %) i instanciraj **N `PlaybackController`-a**, po jedan po zoni.
  Engine se ne menja. `now-playing` / proof-of-play postaje **per-zona** (zoneId + itemId).
- **Contract**: proširi `PlayerSnapshot` u [player-contract](../packages/player-contract/src)
  zonama.

### Faza 2 — CMS layout editor
- **Presets**: full / split 50–50 (H/V) / main+sidebar / main+ticker / quad — + custom
  (drag/resize zona na % gridu). Po zoni dodeljuješ content (media/playlist/app), isto
  kao danas content editor, ali scoped na zonu.
- **Saved layouts / templejti** (reuse kroz org).

### Faza 3 — polish
- **Ticker / sat = app u tankoj zoni** → reuse apps platforme (todo 01). Elegantno: donja
  thin zona vrti RSS/clock app umesto posebnog "ticker" koncepta.
- Overlay/z-index zone (logo preko sadržaja), per-zone transitions.

## Fajlovi (orijentir)
- BE: [screen.schema.ts](../apps/be/src/modules/screens/schemas/screen.schema.ts) (layout/zones + migracija),
  [player-content.service.ts](../apps/be/src/modules/player/player-content.service.ts) (zone snapshot).
- Contract: `PlayerSnapshot.zones` u [player-contract](../packages/player-contract/src).
- Player: [Stage.tsx](../apps/player/src/ui/Stage.tsx) (N kontrolera + pozicionirani div-ovi);
  `now-playing` postaje per-zona u [socket.ts](../apps/player/src/sync/socket.ts).
- CMS: content editor → layout editor (`features/content` / `features/screens`).

## Odluke (potvrđeno)
- **Layout scope (MVP)**: **samo preset-i** — full / split (H/V) / main+sidebar / main+ticker / quad. Custom drag/resize editor → **v1.1**.
- **Video zone — bez hard limita**: operater može i 2+ video zona. Perf rizik je na operateru. **Napomena (ostaje):** na slabom HW-u (Tanix) više istovremenih video zona zaguši dekodiranje → player mora da **degradira graciozno** (ne da krahira). Soft upozorenje u editoru je opciono (nije blocker).
- **Backward-compat** preko single-zone layout-a — bez "big bang" migracije (postojeći ekran = jedna full-screen zona).
- **Scale po zoni** (object-fit po zoni); **orientation po stage-u** (CSS transform na root-u rotira ceo layout — već radi).
- Zone u **%** → responsive na bilo koju rezoluciju.
- **Engine se NE prepisuje** — multi-zone = N `PlaybackController`-a u N div-ova (bez rizika po stabilnost playera).

## Verifikacija
- Split layout (video levo, RSS app desno, clock app dole) → tri nezavisna loopa rade istovremeno.
- Rotacija ekrana rotira ceo layout (zone se rotiraju zajedno).
- Legacy ekran (bez layout-a) i dalje radi kao single full-screen zona.
- Na slabom HW: 1 video zona + 2 lake zone — glatko; 3 video zone — vidljiv throttle (potvrda caveat-a).
- now-playing/proof-of-play beleži zoneId + itemId.

## Procena
**Velik.** Faza 1 (model + player N-kontrolera) je srž i nije rizična po engine.
Faza 2 (layout editor) je najviše UI posla. Faza 3 je nadgradnja.
