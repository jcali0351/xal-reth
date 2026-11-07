#!/usr/bin/env python3
"""Build search-index.json, the data behind the site-wide search (js/search.js).

Usage (from anywhere):  python3 tools/build_search.py

Every page becomes one entry (title, type, description, text), and each of its headings that has an id
becomes its own entry too, so a search can jump straight to "addons.html#MasterBaiterPro" or a single
chapter of the Teachings. Addon pages carry their download link. new_post.py and build_addon_pages.py
run this, so new posts and addons are searchable as soon as they go live.
"""
import glob, html, json, os, re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"404.html", "roster-admin.html", "admin.html", "addon-coil-angler.html"}
PAGE_TEXT = 1400       # characters of body text kept per page
SECTION_TEXT = 420     # characters kept per section
MAX_SECTIONS = 60      # per page

LORE = {"lore.html", "canon.html", "legends.html", "triangle.html", "teachings.html", "teachings-of-the-triangle.html",
        "rites.html", "priesthood.html", "codex.html", "scripture.html", "begging.html", "library.html", "litany.html",
        "devotion.html", "altar.html", "wiki.html"}

TITLES = {"index.html": "Home", "news.html": "News", "herald.html": "The Herald Archive", "blog.html": "Blog",
          "addons.html": "Addons", "join.html": "Join the Cult", "contact.html": "Contact"}

def kind(f):
    if f.startswith("addon-") or f == "addons.html": return "Addon"
    if f.startswith("herald-") or f in ("news.html", "herald.html"): return "News"
    if f.startswith("post-") or f == "blog.html": return "Blog"
    if f in LORE: return "Lore"
    return "Page"

class Page(HTMLParser):
    SKIP_TAGS = {"script", "style", "nav", "header", "footer", "noscript", "svg", "template", "button", "select"}
    HEAD = {"h1", "h2", "h3"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""; self.desc = ""; self.download = ""
        self.skip = 0; self.in_title = False
        self.body = []
        self.sections = []          # [id, heading, [text]]
        self.head = None            # (tag, id, [text]) while inside a heading
        self.ids = []               # stack of nearest ids of elements, for headings inside <article id>
        self.stack = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title": self.in_title = True
        if tag == "meta" and a.get("name") == "description": self.desc = a.get("content", "")
        if tag == "a" and "download" in a and a.get("href", "").endswith(".zip") and not self.download:
            self.download = a["href"]
        if tag in ("meta", "link", "img", "br", "hr", "input", "source", "wbr"): return
        self.stack.append((tag, a.get("id")))
        if tag in self.SKIP_TAGS: self.skip += 1
        if tag in self.HEAD and not self.skip:
            sid = a.get("id")
            if not sid:
                # a heading inside an element with an id (an addon card) borrows that id
                for t, i in reversed(self.stack[:-1]):
                    if i: sid = i; break
            self.head = (tag, sid, [])

    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
        # pop to the matching tag (HTML is forgiving; so are we)
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for t, _ in self.stack[i:]:
                    if t in self.SKIP_TAGS: self.skip = max(0, self.skip - 1)
                del self.stack[i:]
                break
        if self.head and tag == self.head[0]:
            t, sid, parts = self.head
            text = norm(" ".join(parts))
            self.head = None
            if text and t != "h1":
                if self.sections and sid and self.sections[-1][0] == sid:
                    pass  # same card, keep the first heading
                else:
                    self.sections.append([sid, text, []])

    def handle_data(self, data):
        if self.in_title: self.title += data; return
        if self.skip: return
        if self.head: self.head[2].append(data); return
        self.body.append(data)
        if self.sections: self.sections[-1][2].append(data)

def norm(s): return re.sub(r"\s+", " ", html.unescape(s)).strip()

def clip(s, n):
    s = norm(s)
    if len(s) <= n: return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut + "…"

def clean_title(t):
    # "Brain Rotter Pro · Free WoW Roleplay Addon" -> "Brain Rotter Pro"; site names after a separator go too
    t = norm(t)
    for sep in (" | ", " · ", " — ", " – "):
        head = t.split(sep)[0].strip()
        if len(head) >= 3: t = head
    return t.strip() or "Untitled"

def main():
    os.chdir(ROOT)
    out = []
    for f in sorted(glob.glob("*.html")):
        if f in SKIP: continue
        src = open(f, encoding="utf-8").read()
        if 'http-equiv="refresh"' in src or 'name="robots" content="noindex"' in src: continue
        p = Page()
        try: p.feed(src)
        except Exception as e: print("skipped", f, e); continue
        title = TITLES.get(f) or clean_title(p.title)
        k = kind(f)
        entry = {"u": f, "t": title, "k": k, "d": clip(p.desc, 220), "x": clip(" ".join(p.body), PAGE_TEXT)}
        if p.download and f.startswith("addon-"): entry["z"] = p.download
        m = re.search(r"herald-(\d{4})(\d{2})(\d{2})", f)
        if m: entry["n"] = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        out.append(entry)
        seen = set()
        for sid, head, parts in p.sections[:MAX_SECTIONS]:
            if not sid or sid in seen: continue
            seen.add(sid)
            text = clip(" ".join(parts), SECTION_TEXT)
            if len(head) < 3: continue
            sk = "Addon" if (f == "addons.html" and len(text) > 40) else k
            sec = {"u": f"{f}#{sid}", "t": head, "k": sk, "p": title, "x": text}
            # addon cards on the addons page carry their own download
            if f == "addons.html":
                card = re.search(r'<article class="card addon[^"]*" id="%s".*?(?:href="([^"]+\.zip)" download|</article>)' % re.escape(sid), src, re.S)
                if card and card.group(1): sec["z"] = card.group(1)
            out.append(sec)
    with open("search-index.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    pages = sum(1 for e in out if "#" not in e["u"])
    print(f"search-index.json: {pages} pages, {len(out) - pages} sections, {os.path.getsize('search-index.json') // 1024} KB")

if __name__ == "__main__":
    main()
