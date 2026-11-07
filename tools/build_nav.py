#!/usr/bin/env python3
"""Write the main menu into every page from one definition.

Usage (from anywhere):  python3 tools/build_nav.py

Each page keeps whichever menu item it already marked as the current page (aria-current); a submenu
holding the current page is highlighted. 404.html uses /xal-reth/ links so it works from any URL.
Pages without the main menu (wiki.html) are left alone. new_post.py and build_addon_pages.py copy
the menu from news.html and addons.html, so they pick up changes after this runs.
"""
import glob, html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (label, href) for a plain link, or (label, id, [(label, href), ...]) for a submenu
MENU = [
    ("Home", "index.html"),
    ("About", "sub-about", [("The Sacred Triangle", "triangle.html"), ("The Chronicle", "lore.html"), ("The Canon", "canon.html"),
                            ("The Legends", "legends.html"), ("The Library", "library.html")]),
    ("Community", "sub-community", [("News", "news.html"), ("Blog", "blog.html"),
                                    ("Testimonials", "testimonials.html"), ("Merch", "merch.html"), ("Guild Bank", "guild-bank.html")]),
    ("Faith", "sub-faith", [("Devotion", "devotion.html"), ("The Altar", "altar.html")]),
    ("Addons", "addons.html"),
    ("Guild Roster", "guild-roster.html"),
    ("Join", "join.html"),
    ("Sitemap", "sitemap.xml"),
    ("Contact", "contact.html"),
]

def build(current, prefix):
    def a(label, href):
        cur = ' aria-current="page"' if href == current else ""
        return f'<li><a href="{prefix}{href}"{cur}>{html.escape(label, quote=False)}</a></li>'
    out = []
    for item in MENU:
        if len(item) == 2:
            out.append(a(*item))
        else:
            label, sid, kids = item
            here = any(h == current for _, h in kids)
            cls = "sub-toggle current" if here else "sub-toggle"
            out.append(f'<li class="has-sub"><button class="{cls}" type="button" aria-expanded="false" aria-controls="{sid}">{label}</button>'
                       f'<ul class="sub" id="{sid}">' + "".join(a(l, h) for l, h in kids) + "</ul></li>")
    return "<ul>" + "".join(out) + "</ul>"

def main():
    os.chdir(ROOT)
    done, skipped = 0, []
    for f in sorted(glob.glob("*.html")):
        s = open(f, encoding="utf-8").read()
        m = re.search(r'(<nav class="site-nav"[^>]*>)(.*?)(</nav>)', s, re.S)
        if not m: skipped.append(f); continue
        c = re.findall(r'href="(?:/xal-reth/)?([^"]+)" aria-current="page"', m.group(2))
        prefix = "/xal-reth/" if f == "404.html" else ""
        new = m.group(1) + build(c[0] if c else None, prefix) + m.group(3)
        if new != m.group(0):
            s = s[:m.start()] + new + s[m.end():]
            open(f, "w", encoding="utf-8").write(s)
        done += 1
    print(f"menu written to {done} pages; no menu: {', '.join(skipped) or 'none'}")

if __name__ == "__main__":
    main()
