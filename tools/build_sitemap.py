#!/usr/bin/env python3
"""Rebuild sitemap.xml from every page in the site.

Usage (from anywhere):  python3 tools/build_sitemap.py

- Lists every .html page except 404.html, grouped into the site's sections.
- Each entry has the standard sitemap fields search engines read (loc, lastmod, changefreq,
  priority, image) plus extra fields in the "xr" namespace (section, title, description)
  that search engines ignore. Those, the xhtml link and sitemap.css let a person who opens
  sitemap.xml in a browser read it as a styled map of the site with working links.
- lastmod is kept from the existing sitemap; pages that are new to it get today's date.
  Herald posts use the date in their file name, and news.html / herald.html use the newest Herald date.
new_post.py calls this after every Herald post.
"""
import os, re, html, glob, datetime
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://jcali0351.github.io/xal-reth/"

# (section heading, blurb, pages in order). Pages not listed fall into the blog or Herald by prefix.
SECTIONS = [
    ("The Sanctum", "Where every egg begins.", ["index.html", "join.html", "contact.html"]),
    ("The Story", "How the Coil came to hold the world.", ["lore.html", "legends.html", "triangle.html", "teachings-of-the-triangle.html", "wiki.html"]),
    ("The Teaching", "The Canon, and what to do with it.", ["canon.html", "teachings.html", "scripture.html", "begging.html", "litany.html"]),
    ("The Faithful", "Rites, relics of devotion and the people who keep them.",
     ["rites.html", "altar.html", "priesthood.html", "testimonials.html", "codex.html", "library.html"]),
    ("Relics and Addons", "Free roleplay addons for the guild, and merch that is coming soon.", ["addons.html", "addon-xalreth-rp.html", "addon-vyrenna-rp.html", "addon-disciples-of-devotion.html", "devotion.html", "addon-litany-of-begging.html",
      "addon-paranoid-rp.html", "addon-brain-rotter-pro.html", "addon-edgelord-pro.html", "addon-drama-queen-pro.html", "addon-full-support.html", "merch.html"]),
    ("The Daily Coil", "Long-form posts from the Wardens of the Void.", ["blog.html"]),
    ("The Coil Herald", "Official news, three times a day. Newest first.", ["news.html", "herald.html"]),
]
PRIORITY = {"index.html": "1.0", "join.html": "0.9", "lore.html": "0.9", "canon.html": "0.9", "addons.html": "0.9",
            "blog.html": "0.7", "addon-xalreth-rp.html": "0.9", "addon-vyrenna-rp.html": "0.8", "addon-disciples-of-devotion.html": "0.8", "addon-litany-of-begging.html": "0.8", "addon-paranoid-rp.html": "0.8", "addon-brain-rotter-pro.html": "0.8", "addon-edgelord-pro.html": "0.8", "addon-drama-queen-pro.html": "0.8", "addon-full-support.html": "0.8", "news.html": "0.7", "herald.html": "0.6"}
CHANGEFREQ = {"news.html": "daily", "herald.html": "daily", "blog.html": "weekly", "index.html": "weekly", "addons.html": "weekly"}
SKIP = {"404.html"}
TITLES = {"wiki.html": "The Encyclopedia of the Coil", "merch.html": "Official Merch (Coming Soon)", "addons.html": "Free World of Warcraft RP Addons", "devotion.html": "Disciples of Devotion: the Live Reader"}

def esc(s): return html.escape(s, quote=False)

def page_info(name):
    t = open(os.path.join(ROOT, name), encoding="utf-8").read()
    def meta(attr):
        m = re.search(r'<meta\s+' + attr + r'\s+content="([^"]*)"', t)
        return html.unescape(m.group(1)).strip() if m else ""
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S)
    title = html.unescape(re.sub(r"<[^>]+>", "", h1.group(1))).strip() if h1 else ""
    if not title:
        m = re.search(r"<title>(.*?)</title>", t, re.S)
        title = html.unescape(m.group(1)).split(" · ")[0].strip() if m else name
    title = TITLES.get(name) or re.sub(r"\s+", " ", title)
    desc = meta('name="description"') or meta('property="og:description"')
    img = meta('property="og:image"')
    return title, desc, img

def main():
    os.chdir(ROOT)
    today = datetime.datetime.now(ZoneInfo("America/Chicago")).strftime("%Y-%m-%d")
    old = {}
    if os.path.exists("sitemap.xml"):
        for loc, lm in re.findall(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>", open("sitemap.xml", encoding="utf-8").read()):
            old[loc.replace(BASE, "") or "index.html"] = lm
    pages = sorted(p for p in glob.glob("*.html") if p not in SKIP)
    herald = sorted((p for p in pages if p.startswith("herald-")), reverse=True)
    posts = sorted(p for p in pages if p.startswith("post-"))
    def hdate(p): m = re.match(r"herald-(\d{4})(\d\d)(\d\d)", p); return f"{m[1]}-{m[2]}-{m[3]}"
    newest = hdate(herald[0]) if herald else today

    groups = [(h, b, list(ps)) for h, b, ps in SECTIONS]
    groups[5][2].extend(posts); groups[6][2].extend(herald)
    placed = {p for _, _, ps in groups for p in ps}
    extra = [p for p in pages if p not in placed]
    if extra: groups[3][2].extend(extra)  # anything new and unsorted joins The Faithful until it gets a home

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<?xml-stylesheet type="text/css" href="sitemap.css"?>',
           '<!-- Sitemap of the Cult of Xal\'Reth. Rebuilt by tools/build_sitemap.py; edit that, not this file. -->',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
           '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
           '        xmlns:xr="https://jcali0351.github.io/xal-reth/ns/sitemap">']
    count = 0
    for heading, blurb, ps in groups:
        first = True
        for p in ps:
            if p not in pages: continue
            title, desc, img = page_info(p)
            loc = BASE if p == "index.html" else BASE + p
            if p.startswith("herald-"): lm = hdate(p)
            elif p in ("news.html", "herald.html"): lm = newest
            else: lm = old.get(p, today)
            pr = PRIORITY.get(p, "0.5" if p.startswith("herald-") else "0.6" if p.startswith("post-") else "0.8")
            cf = CHANGEFREQ.get(p, "yearly" if p.startswith("herald-") else "monthly")
            out.append("  <url>")
            out.append(f"    <loc>{esc(loc)}</loc>")
            out.append(f"    <lastmod>{lm}</lastmod>")
            out.append(f"    <changefreq>{cf}</changefreq>")
            out.append(f"    <priority>{pr}</priority>")
            imgs = [BASE + "xalreth.jpg"] if p == "index.html" else []
            if img and img not in imgs: imgs.append(img)
            for i in imgs: out.append(f"    <image:image><image:loc>{esc(i)}</image:loc></image:image>")
            if first:
                out.append(f"    <xr:section><xr:name>{esc(heading)}</xr:name><xr:blurb>{esc(blurb)}</xr:blurb></xr:section>")
                first = False
            out.append(f'    <xhtml:a href="{html.escape(loc, quote=True)}"><xr:title>{esc(title)}</xr:title>'
                       + (f"<xr:desc>{esc(desc)}</xr:desc>" if desc else "") + "</xhtml:a>")
            out.append("  </url>")
            count += 1
    out.append("</urlset>")
    open("sitemap.xml", "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"sitemap.xml: {count} pages")

if __name__ == "__main__":
    main()
