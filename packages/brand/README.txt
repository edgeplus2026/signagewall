SignageWall — brand pack
========================

generate.py  the source of everything. Draws the SVGs, PNGs and icons into
             out/ (git-ignored) from a single geometry definition.
README.txt   this guide: what the mark means and what must not be done to it.

The files actually in use do not live here. They live in the apps:
  apps/{web,cms,player}/public/brand/   logos and mark, SVG + PNG
  apps/{web,cms,player}/public/         favicon.svg, favicon.ico, apple-touch-icon.png

THE MARK
  Four screens stacked in two courses, like bricks in a wall. The top-right
  one is lit. The gaps between screens carry the meaning: these are separate
  screens in separate places, not one seamless video wall. Do not close them up.

COLOURS
  ink     #141413   primary, for light backgrounds
  cream   #F2F0EA   for dark backgrounds
  coral   #D85A30   accent, the lit screen

WHICH FILE WHEN
  signagewall-logo-horizontal        site header, invoices, email signature
  signagewall-logo-horizontal-light  the same, on a dark background
  signagewall-mark                   avatar, app icon, player boot screen
  signagewall-mark-mono-*            single colour: stamp, engraving, fax, one-colour print
  signagewall-favicon                browser tab
  favicon/favicon.ico                older browsers
  favicon/apple-touch-icon-180       home-screen shortcut on phones

THE FAVICON IS DIFFERENT ON PURPOSE
  At 16 px the outlined screens close up and the whole thing turns to mush, so
  the favicon uses solid shapes instead of outlines and all four screens are
  coral. The arrangement stays the same. Never swap the favicon for the plain mark.

CLEAR SPACE
  Leave space around the logo equal to the height of one screen in the mark
  (18 units on the 60-unit canvas). Nothing enters that zone.

MINIMUM SIZE
  mark        20 px  (below that use the favicon version)
  horizontal  120 px wide

WHAT NOT TO DO
  Do not separate the mark from the wordmark, or change the gap between them.
  Do not rotate, stretch, or add a shadow or an outline.
  Do not recolour the coral, except in the mono versions.
  Do not light more than one screen.
  Do not put the ink version on a dark background — use the light one.

TYPOGRAPHY
  The wordmark is Inter: Regular for "Signage", Medium for "Wall", tracking -2%.
  The site loads it through next/font (--font-wordmark); the pack carries the
  outlines for anywhere the font is not available.

REGENERATING
  The whole pack derives from one geometry definition (MARK in generate.py).
  If you change the mark, change it in that one place and regenerate everything,
  so the SVGs, the PNGs and the React component
  (apps/web/src/components/brand/logo.tsx) cannot drift apart.

    pip install fonttools brotli pillow
    pnpm --filter @edge/web build     # the script reads Inter from the .next cache
    python3 packages/brand/generate.py

  It prints the copy commands from out/ into apps/*/public when it finishes.
