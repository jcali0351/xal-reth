#!/usr/bin/env python3
"""Publish one Coil Herald post to the Xal'Reth site.

Usage (from the repo root):
  python3 tools/new_post.py post.json

post.json fields:
  title     (required) headline, under ~80 characters
  category  (required) e.g. Lore, Hymn, Teaching, Legend, Guild News, Rites, Saints, The Void
  summary   (required) one or two sentences, used for the news list and meta description
  body_html (required) the article body as HTML paragraphs (<p>, <h2>, <blockquote>, <ul>)
  slug      (optional) short kebab-case words; derived from the title if missing

What it does:
  1. Writes herald-YYYYMMDD-HHMM-<slug>.html, a full page cloned from news.html's layout.
  2. Adds the item to the top of news.json (shown under Official News on news.html).
  3. Rebuilds herald.html, the archive of every Herald post.
  4. Rebuilds sitemap.xml (tools/build_sitemap.py) and search-index.json (tools/build_search.py).
Times use America/Chicago.
"""
import json, re, sys, html, datetime, os
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://jcali0351.github.io/xal-reth/"
os.chdir(ROOT)

def esc(s): return html.escape(s, quote=True)

def shell(title, desc, url_name, main_html):
    """Clone news.html's head, header, nav and footer around new <main> content."""
    t = open("news.html", encoding="utf-8").read()
    t = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", t, flags=re.S)
    t = re.sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>", t, count=1, flags=re.S)
    for attr in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        t = re.sub(rf'(<meta {attr} content=")[^"]*(")', lambda m: m.group(1) + esc(desc) + m.group(2), t, count=1)
    for attr in ('property="og:title"', 'name="twitter:title"'):
        t = re.sub(rf'(<meta {attr} content=")[^"]*(")', lambda m: m.group(1) + esc(title) + m.group(2), t, count=1)
    t = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + BASE + url_name + m.group(2), t, count=1)
    t = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + BASE + url_name + m.group(2), t, count=1)
    t = re.sub(r"<main>.*?</main>", lambda m: "<main>\n" + main_html + "\n</main>", t, count=1, flags=re.S)
    t = t.replace('<script src="news.js"></script>', "")
    return t

def rebuild_sitemap():
    """Regenerate sitemap.xml from every page (see tools/build_sitemap.py)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("build_sitemap", os.path.join(ROOT, "tools", "build_sitemap.py"))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); mod.main()
    # and the site-wide search index, so the new post is searchable at once
    spec = importlib.util.spec_from_file_location("build_search", os.path.join(ROOT, "tools", "build_search.py"))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); mod.main()

def build_archive(items):
    rows = "".join(
        f'<article class="news-item official"><div class="news-meta"><span class="desk">{esc(n.get("category","Official"))}</span>'
        f'<time datetime="{esc(n["date"])}">{esc(n["date"])}{" · " + esc(n["time"]) if n.get("time") else ""}</time></div>'
        f'<h3><a href="{esc(n.get("link","news.html"))}">{esc(n["title"])}</a></h3><p>{esc(n.get("body",""))}</p></article>'
        for n in items)
    main = ('<header class="page-head"><p class="eyebrow">Every Dispatch, Kept</p><h1>The Herald Archive</h1>'
            '<p>Every official post of the Coil Herald, newest first. Nothing is shed from the archive.</p></header>\n'
            f'<div class="wrap"><section class="news-list official-list">{rows}</section>'
            '<p class="center"><a class="btn ghost" href="news.html">Back to the Coil Herald</a></p></div>')
    open("herald.html", "w", encoding="utf-8").write(shell("The Herald Archive · Cult of Xal'Reth",
        "Every official post of the Coil Herald, the news page of the Cult of Xal'Reth, a World of Warcraft roleplay guild.", "herald.html", main))

def main():
    post = json.load(open(sys.argv[1], encoding="utf-8"))
    for k in ("title", "category", "summary", "body_html"):
        if not post.get(k): sys.exit(f"missing field: {k}")
    now = datetime.datetime.now(ZoneInfo("America/Chicago"))
    slug = post.get("slug") or post["title"]
    slug = re.sub(r"[^a-z0-9]+", "-", slug.lower()).strip("-")[:48].strip("-")
    name = f"herald-{now:%Y%m%d-%H%M}-{slug}.html"
    when = now.strftime("%B %-d, %Y · %-I:%M %p")
    full_title = post["title"] + (" · The Coil Herald" if len(post["title"]) < 50 else "")
    main_html = (f'<header class="page-head post-head"><p class="eyebrow">{esc(post["category"])} · The Coil Herald · {esc(when)}</p>'
                 f'<h1>{esc(post["title"])}</h1><p>{esc(post["summary"])}</p></header>\n'
                 f'<div class="wrap"><article class="prose post-body">{post["body_html"]}'
                 '<p class="muted">Glory to Xal\'Reth.</p></article>'
                 '<div class="btn-row" style="margin:32px 0"><a class="btn" href="news.html">More from the Coil Herald</a>'
                 '<a class="btn ghost" href="herald.html">The Herald Archive</a>'
                 '<a class="btn ghost" href="https://discord.gg/wYakHBHPz" target="_blank" rel="noopener">Join our Discord</a></div></div>')
    open(name, "w", encoding="utf-8").write(shell(full_title, post["summary"], name, main_html))
    items = json.load(open("news.json", encoding="utf-8"))
    items.insert(0, {"date": now.strftime("%Y-%m-%d"), "time": now.strftime("%H:%M"), "category": post["category"],
                     "title": post["title"], "body": post["summary"], "link": name})
    json.dump(items, open("news.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    build_archive(items)
    rebuild_sitemap()
    print(name)

if __name__ == "__main__":
    main()
