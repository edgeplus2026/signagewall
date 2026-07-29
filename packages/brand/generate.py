#!/usr/bin/env python3
"""
SignageWall brand pack generator.

Every shipped brand asset — the files under apps/*/public/brand plus the mark in
apps/web/src/components/brand/logo.tsx — comes from the MARK constant below.
Change the geometry in one place, rerun this, and nothing can drift.

    pip install fonttools brotli pillow
    python3 packages/brand/generate.py

Output lands in packages/brand/out/ (git-ignored) and is copied into the apps by
hand — see the instructions the script prints when it finishes. The apps' copies
are the tracked ones; this folder only holds the source of truth and the guide.

The wordmark is cut from the same Inter that the site serves: the script finds the
variable woff2 in apps/web/.next/static/media/, so `pnpm --filter @edge/web build`
must have run at least once. brotli is what lets fontTools open a woff2.
"""
import pathlib
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = HERE / "out"
FONT_CACHE = REPO / "apps/web/.next/static/media"

INK, CREAM, CORAL = "#141413", "#F2F0EA", "#D85A30"

# ---------------------------------------------------------------- geometry
# Four screens in two staggered courses, like brickwork. The wide upper-right
# one is lit. (x, y, w, h, lit) on a 60x60 canvas.
MARK = [
    (2.0, 10.0, 22.0, 18.0, False),
    (28.0, 10.0, 30.0, 18.0, True),
    (2.0, 32.0, 30.0, 18.0, False),
    (36.0, 32.0, 22.0, 18.0, False),
]
MARK_RX, MARK_SW = 3.5, 4.0

# The favicon is a different drawing on purpose. At 16 px a 1.5 px stroke closes
# up and every screen becomes a smudge, so the icon drops the outlines and runs
# all four screens solid. Coral throughout, so it reads on light and dark tabs.
FAVI = [
    (1.0, 6.0, 23.0, 22.0, True),
    (28.0, 6.0, 31.0, 22.0, True),
    (1.0, 32.0, 31.0, 22.0, True),
    (36.0, 32.0, 23.0, 22.0, True),
]
FAVI_RX, FAVI_SW = 4.0, 5.5

# ---------------------------------------------------------------- wordmark
CAP_H = 34.0     # cap height in canvas units
BASELINE = 47.0  # baseline y
TEXT_X = 74.0    # mark ends at x=58; 16 units of air before the word
TRACKING = -0.02
RUNS = [("Signage", 400), ("Wall", 500)]


def find_inter():
    """The Inter variable face the site actually ships, by name and coverage."""
    if not FONT_CACHE.is_dir():
        sys.exit(f"no font cache at {FONT_CACHE} — build @edge/web once first")
    for p in sorted(FONT_CACHE.glob("*.woff2")):
        try:
            f = TTFont(p, lazy=True)
        except Exception:
            continue
        name = f["name"].getDebugName(16) or f["name"].getDebugName(1) or ""
        if not name.startswith("Inter") or "fvar" not in f:
            continue
        cmap = f.getBestCmap()
        if all(ord(c) in cmap for _t, _w in RUNS for c in _t):
            return p
    sys.exit("no Inter variable woff2 with full coverage found in the font cache")


FONT_SRC = find_inter()
_probe = TTFont(FONT_SRC, lazy=True)
UPEM = _probe["head"].unitsPerEm
CAP = _probe["OS/2"].sCapHeight
SCALE = CAP_H / CAP
EM = UPEM * SCALE
LETTERSPACE = TRACKING * EM


def instance(wght):
    return instancer.instantiateVariableFont(
        TTFont(FONT_SRC), {"wght": wght}, inplace=True, updateFontNames=False
    )


def word_paths():
    paths, pen_x = [], 0.0
    for text, wght in RUNS:
        font = instance(wght)
        gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
        for ch in text:
            gname = cmap[ord(ch)]
            pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
            gs[gname].draw(pen)
            if pen.getCommands():
                paths.append((pen.getCommands(), pen_x))
            pen_x += hmtx[gname][0] * SCALE + LETTERSPACE
    return paths, pen_x - LETTERSPACE


# ---------------------------------------------------------------- svg
def rects_svg(cells, rx, sw, outline, accent):
    out = []
    for x, y, w, h, lit in cells:
        if lit:
            out.append(
                f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" '
                f'rx="{rx:.2f}" fill="{accent}"/>'
            )
        else:
            i = sw / 2
            out.append(
                f'<rect x="{x+i:.2f}" y="{y+i:.2f}" width="{w-sw:.2f}" '
                f'height="{h-sw:.2f}" rx="{max(rx-i,0.5):.2f}" fill="none" '
                f'stroke="{outline}" stroke-width="{sw:.2f}"/>'
            )
    return out


def mark_svg(outline, accent, cells=MARK, rx=MARK_RX, sw=MARK_SW):
    body = "\n  ".join(rects_svg(cells, rx, sw, outline, accent))
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" '
        f'viewBox="0 0 60 60" fill="none">\n  {body}\n</svg>\n'
    )


def horizontal_svg(outline, accent):
    paths, width = word_paths()
    total_w = TEXT_X + width
    body = rects_svg(MARK, MARK_RX, MARK_SW, outline, accent)
    for d, dx in paths:
        body.append(
            f'<path transform="translate({TEXT_X+dx:.2f} {BASELINE:.2f}) '
            f'scale({SCALE:.6f} {-SCALE:.6f})" fill="{outline}" d="{d}"/>'
        )
    inner = "\n  ".join(body)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w:.0f}" height="60" '
        f'viewBox="0 0 {total_w:.2f} 60" fill="none">\n  {inner}\n</svg>\n'
    ), total_w


# ---------------------------------------------------------------- raster
def ttf_for(wght):
    p = OUT / f".inter-{wght}.ttf"
    if not p.exists():
        f = instance(wght)
        f.flavor = None
        f.save(p)
    return str(p)


def draw_cells(d, cells, rx, sw, outline, accent, k):
    for x, y, w, h, lit in cells:
        box = [x * k, y * k, (x + w) * k, (y + h) * k]
        if lit:
            d.rounded_rectangle(box, radius=rx * k, fill=accent)
        else:
            d.rounded_rectangle(box, radius=rx * k, outline=outline, width=max(1, round(sw * k)))


def png_mark(path, size, outline, accent, bg=None, cells=MARK, rx=MARK_RX, sw=MARK_SW):
    ss = 4
    img = Image.new("RGBA", (size * ss, size * ss), bg or (0, 0, 0, 0))
    draw_cells(ImageDraw.Draw(img), cells, rx, sw, outline, accent, size * ss / 60.0)
    img.resize((size, size), Image.LANCZOS).save(path)


def png_horizontal(path, height, outline, accent):
    _, total_w = horizontal_svg(outline, accent)
    ss = 3
    k = height * ss / 60.0
    img = Image.new("RGBA", (round(total_w * k), height * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_cells(d, MARK, MARK_RX, MARK_SW, outline, accent, k)
    px = TEXT_X * k
    for text, wght in RUNS:
        font = ImageFont.truetype(ttf_for(wght), size=EM * k)
        for ch in text:
            d.text((px, BASELINE * k), ch, font=font, fill=outline, anchor="ls")
            px += font.getlength(ch) + LETTERSPACE * k
    img.resize((round(img.width / ss), height), Image.LANCZOS).save(path)


# ---------------------------------------------------------------- emit
def main():
    svg_dir, png_dir, ico_dir = OUT / "svg", OUT / "png", OUT / "favicon"
    for p in (svg_dir, png_dir, ico_dir):
        p.mkdir(parents=True, exist_ok=True)

    for name, content in {
        "signagewall-mark.svg": mark_svg(INK, CORAL),
        "signagewall-mark-light.svg": mark_svg(CREAM, CORAL),
        "signagewall-mark-mono-black.svg": mark_svg(INK, INK),
        "signagewall-mark-mono-white.svg": mark_svg(CREAM, CREAM),
        "signagewall-favicon.svg": mark_svg(CORAL, CORAL, FAVI, FAVI_RX, FAVI_SW),
    }.items():
        (svg_dir / name).write_text(content)

    h_ink, width = horizontal_svg(INK, CORAL)
    (svg_dir / "signagewall-logo-horizontal.svg").write_text(h_ink)
    (svg_dir / "signagewall-logo-horizontal-light.svg").write_text(horizontal_svg(CREAM, CORAL)[0])

    png_mark(png_dir / "signagewall-mark-512.png", 512, INK, CORAL)
    png_mark(png_dir / "signagewall-mark-1024.png", 1024, INK, CORAL)
    png_mark(png_dir / "signagewall-mark-light-1024.png", 1024, CREAM, CORAL)
    png_mark(png_dir / "signagewall-mark-mono-black-1024.png", 1024, INK, INK)
    png_mark(png_dir / "signagewall-mark-mono-white-1024.png", 1024, CREAM, CREAM)
    png_horizontal(png_dir / "signagewall-logo-horizontal-1600.png", 250, INK, CORAL)
    png_horizontal(png_dir / "signagewall-logo-horizontal-light-1600.png", 250, CREAM, CORAL)

    for s in (16, 32, 48):
        png_mark(ico_dir / f"favicon-{s}.png", s, CORAL, CORAL, cells=FAVI, rx=FAVI_RX, sw=FAVI_SW)
    png_mark(ico_dir / "apple-touch-icon-180.png", 180, CREAM, CORAL, bg=INK)
    Image.open(ico_dir / "favicon-48.png").save(
        ico_dir / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )

    for p in LOGOS.glob(".inter-*.ttf"):
        p.unlink()

    print(f"font:   {FONT_SRC.name}")
    print(f"lockup: {width:.1f} units wide")
    print("regenerated. now copy into the apps:")
    print("  b=packages/brand/out")
    print("  for a in web cms player; do")
    print("    cp $b/svg/*.svg $b/png/signagewall-{mark-512,logo-horizontal-1600,logo-horizontal-light-1600}.png apps/$a/public/brand/")
    print("    cp $b/svg/signagewall-favicon.svg apps/$a/public/favicon.svg")
    print("    cp $b/favicon/favicon.ico apps/$a/public/favicon.ico")
    print("    cp $b/favicon/apple-touch-icon-180.png apps/$a/public/apple-touch-icon.png")
    print("  done")


if __name__ == "__main__":
    main()
