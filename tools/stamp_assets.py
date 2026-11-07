#!/usr/bin/env python3
"""Stamp style.css, site.js and every local css/ and js/ file that a page links with a version (?v=<content hash>),
so browsers fetch the new copy as soon as a file changes instead of showing a cached one for up to 10 minutes.
Run after changing any of them:  python3 tools/stamp_assets.py"""
import glob, hashlib, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

_cache = {}
def ver(path):
    if path not in _cache:
        # hashed with Unix line endings, so a Windows checkout (CRLF) stamps the same as GitHub's workflow (LF)
        _cache[path] = hashlib.sha1(open(path, "rb").read().replace(b"\r\n", b"\n")).hexdigest()[:8] if os.path.isfile(path) else None
    return _cache[path]

ASSET = re.compile(r'(href|src)="((?:css|js)/[^"?#]+\.(?:css|js)|style\.css|site\.js)(?:\?v=[^"]*)?"')

def main():
    changed = 0
    for page in glob.glob("*.html"):
        s = open(page, encoding="utf-8").read()
        def stamp(m):
            v = ver(m.group(2))
            return f'{m.group(1)}="{m.group(2)}?v={v}"' if v else m.group(0)
        t = ASSET.sub(stamp, s)
        if t != s:
            open(page, "w", encoding="utf-8").write(t); changed += 1
    print(f"style.css v={ver('style.css')}, site.js v={ver('site.js')}, {len(_cache)} files stamped: {changed} pages updated")

if __name__ == "__main__":
    main()
