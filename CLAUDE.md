# Xal'Reth website (jcali0351/xal-reth)

Static GitHub Pages site for the Cult of Xal'Reth, a World of Warcraft roleplay guild led by John.
Live at https://jcali0351.github.io/xal-reth/ (deploys from the root of `main`).

## Hard rules
- Never mention "Draco Reptilian Elite" anywhere on the site.
- No prices, shop links or fake purchase links. Merch is "coming soon".
- Tone: deadpan, warm, satirical holy-text voice. Funny, never mean. No real-world politics, no real people.
- Don't edit the generated pages by hand except through `tools/new_post.py`.
  The rest of the site is generated elsewhere and copied in.

## Hourly Coil Herald post (scheduled task)
1. `git pull --ff-only origin main`
2. Read `news.json` (the top 30 or so items) so you don't repeat a recent title, topic or angle.
3. Pick material from the lore files below. Rotate kinds over the day: hymn, teaching, legend retold,
   saint profile, rite how-to, Bestiary of the Void entry, Sacred Triangle reflection, guild-life dispatch,
   Canon commentary, proverbs, Q&A from the Inner Scale, holy-day notes, Ministry of Spare Change notice.
4. Write ONE new post, 250-450 words, as JSON: title, category, summary, body_html (<p>, <h2>, <blockquote>, <ul>).
   It should feel new and specific: a fresh hymn stanza, a new minor saint, an invented-but-consistent detail.
   Stay consistent with the established lore. Link one or two relevant pages (canon.html, legends.html, etc.).
5. `python3 tools/new_post.py /tmp/post.json` (writes the page, news.json, herald.html, sitemap.xml).
6. `git add -A && git commit -m "Coil Herald: <title>" && git push origin main`. If the push is rejected, pull --rebase and push again.

## Lore sources in this repo (read for material)
- `lore.html` (the Chronicle), `canon.html`, `legends.html`, `triangle.html`, `teachings.html`, `rites.html`,
  `priesthood.html`, `codex.html`, `scripture.html`, `begging.html` (Politics of Begging), `post-*.html` (blog posts).
- `hourly-data.js` holds about 2,000 extracted passages from all of these (JSON array: text, heading, source, link).

## Lore essentials
- Xal'Reth the Eternal: a vast serpent beneath the world, name means "the one who is still hungry". Hatched from the
  Primordial Egg that nobody laid. Awakened by the Four Sights. On the Night of Stillness he stood before the Open Door,
  chose to stay, and wrapped the world three times. The First Vow: hold the world until every creature has learned to let go.
  The Unwrapping is the gentle end of days. He has NO wings (the Featherist Heresy says he does).
- Loosely Buddhist/Taoist: holding lightly, letting go, patience, the low place, water, the middle path.
- Sacred Triangle: Xal'Reth holds, Vyrenna the Ember-Scale gives, Nhalor the Hollow Wing releases. "Hold, give, release."
- People and places: High Priestess Xalrathiel (Dream Pages), the Inner Scale (ruling circle), Hessk the Beggar King
  ("What did you give today?"), Khaedara the Accuser (Tribunal of Accusation), the Ministry of Spare Change,
  eggs (new members), the Wardens of the Void, Grippers (Bestiary creatures that feed on clutching), Shedfall (autumn holy season),
  basking, the Warm Ridge, the Ledger. Greeting: "Hold light." Reply: "And let go well." Sign-off: "Glory to Xal'Reth."
- Addons: Xal'Reth RP, Disciples of Devotion, Litany of Begging (the Litany is deliberately the most boring text ever written;
  it carries a distress warning, so never encourage reading it all).
- Discord: https://discord.gg/wYakHBHPz
