#!/usr/bin/env python3
"""Build the Teachings of the Sacred Triangle from canon/triangle/*.txt.

Usage:  python3 tools/build_triangle_canon.py

Writes:
  sacred-triangle-canon.txt         the whole Canon as a plain text file (downloadable)
  teachings-of-the-triangle.html    the reading page (shell copied from triangle.html)

Source format (canon/triangle/N-name.txt):
  # <book number> | <book title> | <scroll name> | <one-line description>
  ## <chapter number> | <chapter title>
  one verse per line
Edit the source files, then run this and tools/build_sitemap.py.
"""
import glob, html, os, re, textwrap

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://jcali0351.github.io/xal-reth/"
os.chdir(ROOT)
def esc(s): return html.escape(s, quote=True)

THEME = {  # book number -> (css class, corner, hour, sigil svg)
    "0": ("bk-front", "The Preface", "", ""),
    "I": ("bk-vyrenna", "The Left Corner · She Gives", "Noon",
          '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M26 6a14 14 0 1 0 0 28 11 11 0 1 1 0-28z"/></svg>'),
    "II": ("bk-xalreth", "The Apex, Pointing Down · He Holds", "Midnight",
           '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke-width="2"/><path d="M8 12h24L20 33z" fill="none" stroke-width="2.4"/></svg>'),
    "III": ("bk-nhalor", "The Right Corner · He Releases", "Dusk",
            '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="13" fill="none" stroke-width="2.6"/></svg>'),
    "IV": ("bk-turning", "The Three Together", "Dawn", ""),
}

def parse():
    books = []
    for path in sorted(glob.glob("canon/triangle/*.txt")):
        book = None
        for raw in open(path, encoding="utf-8"):
            line = raw.rstrip("\n").strip()
            if not line: continue
            if line.startswith("# "):
                num, title, scroll, blurb = [x.strip() for x in line[2:].split("|")]
                book = {"num": num, "title": title, "scroll": scroll, "blurb": blurb, "chapters": []}
                books.append(book)
            elif line.startswith("## "):
                n, t = [x.strip() for x in line[3:].split("|", 1)]
                book["chapters"].append({"n": int(n), "title": t, "verses": []})
            else:
                book["chapters"][-1]["verses"].append(line)
    return books

def slug(book): return {"0": "preface", "I": "vyrenna", "II": "xalreth", "III": "nhalor", "IV": "turning"}[book["num"]]

def write_text(books, total_ch, total_v):
    out = ["THE TEACHINGS OF THE SACRED TRIANGLE", "The Canon of Vyrenna, Xal'Reth and Nhalor",
           "Kept by the Cult of Xal'Reth · " + BASE + "teachings-of-the-triangle.html", "",
           f"{len(books)} books · {total_ch} chapters · {total_v} verses", "",
           "A fan-made World of Warcraft roleplay faith. Xal'Reth is fictional. Please stop asking him for gold.", "", "=" * 72, ""]
    for b in books:
        head = b["title"] if b["num"] == "0" else f"BOOK {b['num']}: {b['title'].upper()}"
        out += [head, b["scroll"], "", textwrap.fill(b["blurb"], 72), "", "-" * 72, ""]
        for c in b["chapters"]:
            out += [f"Chapter {c['n']}. {c['title']}", ""]
            for i, v in enumerate(c["verses"], 1):
                out.append(textwrap.fill(v, 72, initial_indent=f"{i:>2}  ", subsequent_indent="    "))
            out.append("")
        out += ["=" * 72, ""]
    out.append("Glory to Xal'Reth.")
    open("sacred-triangle-canon.txt", "w", encoding="utf-8").write("\n".join(out) + "\n")

def write_page(books, total_ch, total_v):
    src = open("triangle.html", encoding="utf-8").read()
    t = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", src, flags=re.S)
    title = "Teachings of the Sacred Triangle · The Canon of Vyrenna, Xal'Reth and Nhalor"
    desc = (f"The Teachings of the Sacred Triangle: {total_ch} chapters of scripture for Vyrenna who gives, Xal'Reth who holds "
            "and Nhalor who releases. A World of Warcraft roleplay faith from the Cult of Xal'Reth.")
    url = BASE + "teachings-of-the-triangle.html"
    t = re.sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>", t, count=1, flags=re.S)
    for attr in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        t = re.sub(rf'(<meta {attr} content=")[^"]*(")', lambda m: m.group(1) + esc(desc) + m.group(2), t, count=1)
    for attr in ('property="og:title"', 'name="twitter:title"'):
        t = re.sub(rf'(<meta {attr} content=")[^"]*(")', lambda m: m.group(1) + "Teachings of the Sacred Triangle" + m.group(2), t, count=1)
    t = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), t, count=1)
    t = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), t, count=1)
    t = re.sub(r'<link rel="stylesheet" href="css/[^"]*triangle[^"]*">\n?', "", t)
    t = t.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="css/teachings-triangle.css">', 1)
    t = re.sub(r'<script src="(?:js/)?triangle[^"]*"></script>\n?', "", t)
    ld = ('<script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"The Teachings of the Sacred Triangle",'
          '"author":{"@type":"Organization","name":"The Cult of Xal\'Reth"},"url":"' + url + '","numberOfPages":' + str(total_ch) +
          ',"isPartOf":{"@type":"WebSite","name":"The Cult of Xal\'Reth","url":"' + BASE + '"}}</script>\n')
    t = t.replace('<link rel="sitemap"', ld + '<link rel="sitemap"', 1)

    cards, sections = [], []
    for b in books:
        cls, corner, hour, sigil = THEME[b["num"]]
        sid = slug(b)
        if b["num"] not in ("0", "IV"):
            cards.append(f'<a class="tt-card {cls}" href="#{sid}">{sigil}<span class="tt-card-k">Book {b["num"]} · {esc(hour)}</span>'
                         f'<b>{esc(b["title"])}</b><span class="tt-card-s">{esc(b["scroll"])}</span>'
                         f'<span class="tt-card-n">{len(b["chapters"])} chapters</span></a>')
        toc = "".join(f'<li><a href="#{sid}-{c["n"]}"><span>{c["n"]}</span>{esc(c["title"])}</a></li>' for c in b["chapters"])
        chs = []
        for c in b["chapters"]:
            vs = "".join(f'<p class="tt-v" id="{sid}-{c["n"]}-{i}"><a class="tt-vn" href="#{sid}-{c["n"]}-{i}" aria-label="Verse {i}">{i}</a>{esc(v)}</p>'
                         for i, v in enumerate(c["verses"], 1))
            label = "" if b["num"] == "0" else f'Book {b["num"]} · '
            chs.append(f'<article class="tt-ch" id="{sid}-{c["n"]}"><header><p class="tt-ch-k">{label}Chapter {c["n"]}</p>'
                       f'<h3>{esc(c["title"])}</h3></header>{vs}<a class="tt-up" href="#{sid}">Back to {esc(b["scroll"])}</a></article>')
        heading_k = esc(corner) + (f" · {esc(hour)}" if hour else "")
        bookno = "" if b["num"] == "0" else f'Book {b["num"]}'
        sections.append(f'''<section class="tt-book {cls}" id="{sid}" aria-labelledby="{sid}-h">
  <header class="tt-book-head">{sigil}<p class="tt-book-k">{heading_k}</p><h2 id="{sid}-h">{esc(b["title"])}</h2>
  <p class="tt-book-s">{esc(bookno + (" · " if bookno else "") + b["scroll"])}</p><p class="tt-book-blurb">{esc(b["blurb"])}</p></header>
  <details class="tt-toc"{" open" if b["num"] in ("0", "IV") else ""}><summary>Contents · {len(b["chapters"])} chapters</summary><ol>{toc}</ol></details>
  {"".join(chs)}
</section>''')

    main = f'''<main>
<header class="page-head tt-head"><p class="eyebrow">The Canon of the Three</p><h1>Teachings of the Sacred Triangle</h1>
<p>Hold, give, release. The scripture of Vyrenna who gives, Xal'Reth who holds, and Nhalor who releases, gathered from the Dream Pages of the High Priestess.</p></header>
<div class="wrap">
  <ul class="tt-stats" aria-label="The Canon at a glance"><li><b>{len(books)}</b><span>books</span></li><li><b>{total_ch}</b><span>chapters</span></li><li><b>{total_v:,}</b><span>verses</span></li></ul>
  <div class="tt-actions"><a class="btn" href="#vyrenna">Begin reading</a><a class="btn ghost" href="sacred-triangle-canon.txt" download>Download the text</a><a class="btn ghost" href="triangle.html">Back to the Sacred Triangle</a></div>
  <nav class="tt-cards" aria-label="The three books">{"".join(cards)}</nav>
  <div class="tt-search"><label for="tt-q">Search the Teachings</label><input id="tt-q" type="search" placeholder="Try: lizard, door, soup, wings" autocomplete="off"><p class="tt-search-n" id="tt-n" aria-live="polite"></p></div>
  {"".join(sections)}
  <p class="center tt-end"><a class="btn ghost" href="#top">Back to the top</a> <a class="btn ghost" href="sacred-triangle-canon.txt" download>Download the text</a></p>
</div>
</main>'''
    t = re.sub(r"<main>.*?</main>", lambda m: main, t, count=1, flags=re.S)
    t = t.replace("</body>", '<script src="js/teachings-triangle.js"></script>\n</body>', 1)
    t = t.replace('<body>', '<body id="top">', 1) if '<body>' in t else t
    open("teachings-of-the-triangle.html", "w", encoding="utf-8").write(t)

def main():
    books = parse()
    total_ch = sum(len(b["chapters"]) for b in books)
    total_v = sum(len(c["verses"]) for b in books for c in b["chapters"])
    write_text(books, total_ch, total_v)
    write_page(books, total_ch, total_v)
    words = sum(len(v.split()) for b in books for c in b["chapters"] for v in c["verses"])
    print(f"{len(books)} books, {total_ch} chapters, {total_v} verses, {words:,} words")
    for b in books: print(f"  {b['num']:>3} {b['title']}: {len(b['chapters'])} chapters")

if __name__ == "__main__":
    main()
