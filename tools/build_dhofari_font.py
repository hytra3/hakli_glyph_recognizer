"""Build the Dhofari Script 1a font from Hakli_glyphs JSON (KMG 120-126 primaries,
KMD 28-31 alternates). Usage: python3 build.py <glyphs.json> <kmd_d.png> <outdir>"""
import sys, json, base64, io, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import potrace
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

src, kmd_d_path, outdir = sys.argv[1:4]
os.makedirs(outdir, exist_ok=True)
data = json.load(open(src))

# halḥam order (Al-Jallad 2025, Chart 1). (json name, glyph name, primary ONA cp, extra cps)
LETTERS = [
    ("h", "heh", 0x10A80, []), ("l", "lam", 0x10A81, []), ("ḥ", "hah", 0x10A82, []),
    ("m", "meem", 0x10A83, []), ("q", "qaf", 0x10A84, []), ("w", "waw", 0x10A85, []),
    ("s²", "es2", 0x10A86, []), ("r", "reh", 0x10A87, []), ("b", "beh", 0x10A88, []),
    ("t", "teh", 0x10A89, []), ("s¹", "es1", 0x10A8A, []), ("k", "kaf", 0x10A8B, []),
    ("n", "noon", 0x10A8C, []), ("ḫ", "khah", 0x10A8D, []), ("f", "feh", 0x10A90, []),
    ("ʾ", "alef", 0x10A91, []), ("ʿ", "ain", 0x10A92, []), ("ḍ", "dad", 0x10A93, []),
    ("g", "geem", 0x10A94, []), ("d", "dal", 0x10A95, []), ("ġ", "ghain", 0x10A96, []),
    ("ṭ", "tah", 0x10A97, []),
    ("ḏ", "thal", 0x10A99, [0x10A98]),   # ḏ/z merged glyph (H-shape)
    ("y", "yeh", 0x10A9A, []),
    ("ṯ", "theh", 0x10A9B, [0x10A8F]),   # ṯ <> s³
    ("ẓ", "zah", 0x10A9C, [0x10A8E]),    # ẓ <> ṣ
]
NO_KMD = {"ḫ", "f", "ʾ"}  # 'NA' in the KMD 28-31 column

def decode(uri):
    return Image.open(io.BytesIO(base64.b64decode(uri.split(",", 1)[1])))

def to_ink(im, trim_left=0):
    im = im.convert("RGBA")
    bg = Image.new("RGBA", im.size, "white"); bg.alpha_composite(im)
    g = np.asarray(bg.convert("L"), dtype=float)
    if trim_left: g[:, :trim_left] = 255
    return g

def trace(gray, src_px_h):
    """gray: 2-D array, ink dark. Returns list of contours in source-pixel units (y up)."""
    S = 10 if gray.shape[0] < 150 else 1
    im = Image.fromarray(gray.astype(np.uint8)).resize(
        (gray.shape[1] * S, gray.shape[0] * S), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(S * 0.7 if S > 1 else 3))
    ink = np.asarray(im) < 140
    lab, n = ndimage.label(ink)
    if n:
        sizes = ndimage.sum(ink, lab, range(1, n + 1))
        keep = sizes >= max(sizes.max() * 0.02, (S * 1.2) ** 2)
        ink = keep[lab - 1] & (lab > 0)
    # fill pin-holes but keep real counters
    holes = ndimage.binary_fill_holes(ink) & ~ink
    hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(holes, hl, range(1, hn + 1))
        small = hs < (S * 1.5) ** 2
        ink |= small[hl - 1] & (hl > 0)
    ys, xs = np.nonzero(ink)
    ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    ink = np.pad(ink, 2); path = potrace.Bitmap(~ink).trace(turdsize=int((S * 1.5) ** 2), alphamax=1.0,
                                     opticurve=True, opttolerance=0.3)
    H = ink.shape[0]
    f = 1.0 / S * (S if S == 1 else 1)  # back to source px
    def P(p): return (p.x * f, (H - p.y) * f)
    contours = []
    for c in path:
        segs = [("M", P(c.start_point))]
        for s in c.segments:
            if s.is_corner: segs += [("L", P(s.c)), ("L", P(s.end_point))]
            else: segs.append(("C", P(s.c1), P(s.c2), P(s.end_point)))
        contours.append(segs)
    return contours, ink.shape[1] * f, H * f

def collect(which):
    out = {}
    for g in data["glyphs"]:
        im = g["images"]
        if which == "kmg" and isinstance(im.get("primary"), str):
            out[g["name"]] = (to_ink(decode(im["primary"])), 1.0)
        if which == "kmd" and im.get("variants") and g["name"] not in NO_KMD | {"ʾ", "d"}:
            out[g["name"]] = (to_ink(decode(im["variants"][0])), 1.0)
    if which == "kmd":
        # KMD 'd' cropped from 600-dpi render of Chart 1 (JSON variant is a photo crop)
        out["d"] = (to_ink(Image.open(kmd_d_path), trim_left=45), 600 / 200)
    return out

UNIT_PER_PX = None
def glyphs_for(which):
    raw = collect(which)
    traced = {k: trace(v[0], 0) + (v[1],) for k, v in raw.items()}
    # scale: median source height -> 620 units, preserve relative sizes, clamp
    hs = sorted(t[2] / t[3] for t in traced.values())
    upp = 620 / hs[len(hs) // 2]
    res = {}
    for k, (cont, w, h, pxscale) in traced.items():
        s = upp / pxscale
        s = min(s, 860 / h, 1150 / w)
        res[k] = (cont, w * s, h * s, s)
    return res

def draw(pen, cont, s, dx, dy):
    for segs in cont:
        for seg in segs:
            if seg[0] == "M": pen.moveTo((seg[1][0] * s + dx, seg[1][1] * s + dy))
            elif seg[0] == "L": pen.lineTo((seg[1][0] * s + dx, seg[1][1] * s + dy))
            else: pen.curveTo(*[(x * s + dx, y * s + dy) for x, y in seg[1:]])
        pen.closePath()

kmg = glyphs_for("kmg"); kmd = glyphs_for("kmd")
SB = 70; MID = 330
order = [".notdef", "space", "uni200C"]; cmap = {0x20: "space", 0xA0: "space", 0x200C: "uni200C"}
charstrings, metrics = {}, {}

def add(name, item):
    cont, w, h, s = item
    pen = T2CharStringPen(int(w + 2 * SB), None)
    draw(pen, cont, s, SB, MID - h / 2)
    charstrings[name] = pen.getCharString(); metrics[name] = (int(round(w + 2 * SB)), SB)
    order.append(name)

for i, (jn, gn, cp, extra) in enumerate(LETTERS):
    add(gn, kmg[jn]); cmap[cp] = gn; cmap[0xE000 + i] = gn
    for e in extra: cmap[e] = gn
for i, (jn, gn, cp, extra) in enumerate(LETTERS):
    if jn in kmd:
        add(gn + ".kmd", kmd[jn]); cmap[0xE020 + i] = gn + ".kmd"

for n, w in ((".notdef", 500), ("space", 300), ("uni200C", 0)):
    p = T2CharStringPen(w, None)
    if n == ".notdef":
        for (a, b, c, d) in ((50, 0, 450, 700), (100, 50, 400, 650)):
            pts = [(a, b), (c, b), (c, d), (a, d)] if a == 50 else [(a, b), (a, d), (c, d), (c, b)]
            p.moveTo(pts[0]); [p.lineTo(q) for q in pts[1:]]; p.closePath()
    charstrings[n] = p.getCharString(); metrics[n] = (w, 0)

def build(family, style, path):
    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap)
    fb.setupCFF(family.replace(" ", "") + "-" + style, {"FullName": f"{family} {style}"},
                charstrings, {})
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=900, descent=-250)
    fb.setupNameTable({"familyName": family, "styleName": style,
        "copyright": "Glyph outlines traced from sign forms published in A. Al-Jallad (2025), "
                     "'The Decipherment of the Dhofari Script', JEOL 49, Chart 1.",
        "version": "Version 0.1", "designer": "Marty Heaton / Hoopoe Holdings",
        "description": "Dhofari Script 1a. Encoded on Old North Arabian (U+10A80) by phonemic "
                       "value; PUA mirror U+E000-E019 (KMG forms), U+E020-E039 (KMD forms). "
                       "ss01 = KMD 28-31 forms."})
    fb.setupOS2(sTypoAscender=900, sTypoDescender=-250, usWinAscent=950, usWinDescent=300,
                sxHeight=500, sCapHeight=700)
    fb.setupPost()
    subs = "\n".join(f"  sub {gn} by {gn}.kmd;" for jn, gn, _, _ in LETTERS if jn in kmd)
    addOpenTypeFeaturesFromString(fb.font, f"""
languagesystem DFLT dflt;
languagesystem narb dflt;
feature ss01 {{
  featureNames {{ name "KMD 28-31 letter forms"; }};
{subs}
}} ss01;
""")
    fb.save(path)
    f = fb.font; f.flavor = "woff2"; f.save(path.replace(".otf", ".woff2"))

build("Dhofari Hakli", "Regular", os.path.join(outdir, "DhofariHakli-Regular.otf"))
json.dump({"letters": [{"translit": jn, "glyph": gn, "ona": f"U+{cp:04X}",
                        "also": [f"U+{e:04X}" for e in extra], "pua": f"U+{0xE000+i:04X}",
                        "pua_kmd": (f"U+{0xE020+i:04X}" if jn in kmd else None)}
                       for i, (jn, gn, cp, extra) in enumerate(LETTERS)]},
          open(os.path.join(outdir, "mapping.json"), "w"), ensure_ascii=False, indent=1)
print("built", len(order), "glyphs;", len(kmd), "KMD alternates")
