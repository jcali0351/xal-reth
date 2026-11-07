#!/usr/bin/env python3
"""The site's own web fonts (fonts/) and the font choice the Sanctum Editor makes (css/site-fonts.css).

  fonts/<slug>/*.woff2 + LICENSE   one folder per font (Latin set; weights 300/400/700/900, upright and italic where the font has them)
  fonts/fonts.json                 the catalog the editor's Fonts tab reads: name, slug, category, faces
  fonts/catalog.css                @font-face for every font (only the editor loads it, for its previews)
  css/site-fonts.css               what every page loads after style.css: @font-face for just the chosen fonts and the
                                   --fat (headings), --serif-body (body) and --serif-display (menu, labels, buttons) variables.
                                   The editor rewrites it; its first line holds the choice as JSON.

  python3 tools/build_fonts.py                       rebuild catalog.css, write site-fonts.css if missing, link it from every page
  python3 tools/build_fonts.py --import DIR          copy fonts from a Fontsource font-files checkout (DIR/fonts/google/<slug>/files)
  python3 tools/build_fonts.py --reset               put site-fonts.css back to Abril Fatface + Lato
Every page with style.css gets <link rel="stylesheet" href="css/site-fonts.css"> right after it, and loses the old
Google Fonts links. wiki.html keeps its own fonts. Run tools/stamp_assets.py afterwards."""
import glob, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# slug -> (family name, category). Categories: sans, serif, display, script, mono
FONTS = {
    "abril-fatface": ("Abril Fatface", "display"), "lato": ("Lato", "sans"),
    "roboto": ("Roboto", "sans"), "open-sans": ("Open Sans", "sans"), "montserrat": ("Montserrat", "sans"),
    "poppins": ("Poppins", "sans"), "inter": ("Inter", "sans"), "raleway": ("Raleway", "sans"), "nunito": ("Nunito", "sans"),
    "oswald": ("Oswald", "sans"), "source-sans-3": ("Source Sans 3", "sans"), "work-sans": ("Work Sans", "sans"),
    "rubik": ("Rubik", "sans"), "noto-sans": ("Noto Sans", "sans"), "pt-sans": ("PT Sans", "sans"), "ubuntu": ("Ubuntu", "sans"),
    "fira-sans": ("Fira Sans", "sans"), "barlow": ("Barlow", "sans"), "quicksand": ("Quicksand", "sans"),
    "josefin-sans": ("Josefin Sans", "sans"), "mulish": ("Mulish", "sans"), "dm-sans": ("DM Sans", "sans"), "kanit": ("Kanit", "sans"),
    "archivo": ("Archivo", "sans"), "manrope": ("Manrope", "sans"), "space-grotesk": ("Space Grotesk", "sans"),
    "outfit": ("Outfit", "sans"), "libre-franklin": ("Libre Franklin", "sans"),
    "merriweather": ("Merriweather", "serif"), "playfair-display": ("Playfair Display", "serif"), "lora": ("Lora", "serif"),
    "pt-serif": ("PT Serif", "serif"), "libre-baskerville": ("Libre Baskerville", "serif"), "eb-garamond": ("EB Garamond", "serif"),
    "cormorant-garamond": ("Cormorant Garamond", "serif"), "cormorant": ("Cormorant", "serif"), "crimson-text": ("Crimson Text", "serif"),
    "noto-serif": ("Noto Serif", "serif"), "roboto-slab": ("Roboto Slab", "serif"), "bitter": ("Bitter", "serif"),
    "spectral": ("Spectral", "serif"), "bodoni-moda": ("Bodoni Moda", "serif"),
    "cinzel": ("Cinzel", "display"), "cinzel-decorative": ("Cinzel Decorative", "display"), "marcellus": ("Marcellus", "display"),
    "bebas-neue": ("Bebas Neue", "display"), "righteous": ("Righteous", "display"), "uncial-antiqua": ("Uncial Antiqua", "display"),
    "medievalsharp": ("MedievalSharp", "display"), "pirata-one": ("Pirata One", "display"),
    "unifrakturmaguntia": ("UnifrakturMaguntia", "display"), "metamorphous": ("Metamorphous", "display"),
    "im-fell-english": ("IM Fell English", "display"), "almendra": ("Almendra", "display"), "lobster": ("Lobster", "display"),
    "pacifico": ("Pacifico", "script"), "dancing-script": ("Dancing Script", "script"), "great-vibes": ("Great Vibes", "script"),
    "caveat": ("Caveat", "script"), "permanent-marker": ("Permanent Marker", "script"),
    "roboto-mono": ("Roboto Mono", "mono"), "source-code-pro": ("Source Code Pro", "mono"), "jetbrains-mono": ("JetBrains Mono", "mono"),
}
FALLBACK = {"sans": '"Segoe UI", Helvetica, Arial, sans-serif', "serif": "Georgia, \"Times New Roman\", serif",
            "display": "Georgia, serif", "script": "cursive", "mono": "Consolas, Menlo, monospace"}
WEIGHTS = ("300", "400", "700", "900")
DEFAULT = {"heading": "abril-fatface", "body": "lato", "labels": "", "headingBold": False}
SKIP_PAGES = {"wiki.html"}   # keeps its own look and fonts

def do_import(src):
    for slug in FONTS:
        d = os.path.join(src, "fonts", "google", slug)
        files = sorted(glob.glob(os.path.join(d, "files", f"{slug}-latin-*.woff2")))
        files = [f for f in files if re.search(r"-latin-(\d+)-", f).group(1) in WEIGHTS]
        if not files: print("missing", slug); continue
        out = os.path.join("fonts", slug); os.makedirs(out, exist_ok=True)
        for f in files: shutil.copyfile(f, os.path.join(out, os.path.basename(f).replace("-latin", "")))
        if os.path.isfile(os.path.join(d, "LICENSE")): shutil.copyfile(os.path.join(d, "LICENSE"), os.path.join(out, "LICENSE"))

def catalog():
    out = []
    for slug, (name, cat) in FONTS.items():
        faces = []
        for f in sorted(glob.glob(f"fonts/{slug}/*.woff2")):
            m = re.search(r"-(\d+)-(normal|italic)\.woff2$", f)
            faces.append({"w": int(m.group(1)), "s": m.group(2), "f": os.path.basename(f)})
        if faces: out.append({"slug": slug, "name": name, "cat": cat, "fallback": FALLBACK[cat], "faces": faces})
    return out

def face_css(font, prefix):
    return "".join(f'@font-face{{font-family:"{font["name"]}";font-style:{x["s"]};font-weight:{x["w"]};font-display:swap;'
                   f'src:url("{prefix}{font["slug"]}/{x["f"]}") format("woff2")}}\n' for x in font["faces"])

def stack(font): return f'"{font["name"]}", {font["fallback"]}'

def site_fonts_css(choice, cat):
    """Same output as fontsCss() in js/cms.js: keep the two in step."""
    by = {f["slug"]: f for f in cat}
    h, b = by.get(choice.get("heading")) or by["abril-fatface"], by.get(choice.get("body")) or by["lato"]
    l = by.get(choice.get("labels") or "") or b
    used = []
    for f in (h, b, l):
        if f not in used: used.append(f)
    s = "/* xr-fonts " + json.dumps(choice, separators=(",", ":")) + " */\n"
    s += ("/* The site's fonts, chosen in the Sanctum Editor (admin.html, Fonts tab), which rewrites this file.\n"
          "   Headings use --fat, body text --serif-body, menu, labels and buttons --serif-display. Font files live in fonts/. */\n")
    s += "".join(face_css(f, "../fonts/") for f in used)
    s += f":root{{--fat:{stack(h)};--serif-body:{stack(b)};--serif-display:{stack(l)}}}\n"
    if choice.get("headingBold"): s += "h1,h2{font-weight:700}\n"
    return s

GOOGLE = re.compile(r'[ \t]*<link (?:rel="preconnect" href="https://fonts\.(?:googleapis|gstatic)\.com"(?: crossorigin(?:="")?)?|href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet")>\n?')
STYLE = re.compile(r'(<link rel="stylesheet" href="((?:/xal-reth/)?)style\.css(?:\?v=[^"]*)?">)')

def link_pages():
    n = 0
    for page in sorted(glob.glob("*.html")):
        if page in SKIP_PAGES: continue
        s = open(page, encoding="utf-8").read()
        m = STYLE.search(s)
        if not m: continue
        t = GOOGLE.sub("", s)
        if "css/site-fonts.css" not in t:
            t = STYLE.sub(lambda m: m.group(1) + f'\n<link rel="stylesheet" href="{m.group(2)}css/site-fonts.css">', t, count=1)
        if t != s: open(page, "w", encoding="utf-8").write(t); n += 1
    return n

def main():
    args = sys.argv[1:]
    if "--import" in args: do_import(args[args.index("--import") + 1])
    cat = catalog()
    json.dump(cat, open("fonts/fonts.json", "w"), indent=1); open("fonts/fonts.json", "a").write("\n")
    open("fonts/catalog.css", "w").write("/* Every font in fonts/, for the Sanctum Editor's previews. Built by tools/build_fonts.py. */\n" +
                                         "".join(face_css(f, "") for f in cat))
    if "--reset" in args or not os.path.isfile("css/site-fonts.css"):
        open("css/site-fonts.css", "w").write(site_fonts_css(DEFAULT, cat))
    print(f"{len(cat)} fonts, {sum(len(f['faces']) for f in cat)} files; {link_pages()} pages linked")

if __name__ == "__main__":
    main()
