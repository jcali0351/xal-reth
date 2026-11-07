#!/usr/bin/env python3
"""Stamp style.css and site.js links in every page with a version (?v=<content hash>), so browsers
fetch the new copy as soon as either file changes instead of showing a cached one.
Run after changing style.css or site.js:  python3 tools/stamp_assets.py"""
import glob, hashlib, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def ver(path):
    return hashlib.sha1(open(path, "rb").read()).hexdigest()[:8]

def main():
    vs, vj = ver("style.css"), ver("site.js")
    changed = 0
    for page in glob.glob("*.html"):
        s = open(page, encoding="utf-8").read()
        t = re.sub(r'href="style\.css(?:\?v=[^"]*)?"', f'href="style.css?v={vs}"', s)
        t = re.sub(r'src="site\.js(?:\?v=[^"]*)?"', f'src="site.js?v={vj}"', t)
        if t != s:
            open(page, "w", encoding="utf-8").write(t); changed += 1
    print(f"style.css v={vs}, site.js v={vj}: {changed} pages updated")

if __name__ == "__main__":
    main()
