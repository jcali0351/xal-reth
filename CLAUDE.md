# Xal'Reth website (jcali0351/xal-reth)

Static GitHub Pages site for the Cult of Xal'Reth, a World of Warcraft roleplay guild led by John.
Live at https://jcali0351.github.io/xal-reth/ (deploys from the root of `main`).

## Hard rules
- Never mention "Draco Reptilian Elite" anywhere on the site.
- No prices, shop links or fake purchase links. Merch is "coming soon".
- Tone: deadpan, warm, satirical holy-text voice. Funny, never mean. No real-world politics, no real people.
- Don't edit the generated pages by hand except through `tools/new_post.py`.
  The rest of the site is generated elsewhere and copied in.
- The footer includes an Altar link (`altar.html`, the interactive altar) and the homepage has an "Approach the Altar"
  call to action. The footer links Testimonials (after The Priesthood) and the Encyclopedia (`wiki.html`, after The Sacred
  Triangle). Keep these if the site is regenerated.
- The main menu ends with Sitemap (`sitemap.xml`) then Contact (`contact.html`), and the footer's Join column ends with
  Contact us then Sitemap.
  Keep both if the site is regenerated. `sitemap.xml` is rebuilt from every page by `tools/build_sitemap.py`
  (new_post.py runs it); don't hand-edit it. `sitemap.css` styles it for people (CSS, not XSLT: Chrome drops XSLT in Nov 2026).
- The main menu is written into every page by `tools/build_nav.py` (edit MENU there, then run it):
  Home · About (The Sacred Triangle, The Chronicle, The Canon, The Legends, The Library) · Community (News, Blog, Testimonials, Merch) ·
  Faith (Devotion, The Altar) · Addons · Guild Roster · Join · Sitemap · Contact. Submenus open on hover on wide screens and on click or tap
  everywhere (script in site.js, styles at the end of style.css); the one holding the current page is highlighted.
  The full menu shows above 860px; at 860px and below it folds into the Menu button. Keep it if the site is regenerated.
- The logo (the violet triangle sigil, "Observe ▽ Analyze ▽ Transcend") is the site's brand mark: `img/xalreth-mark.png`
  in the header and footer of every page, `img/xalreth-logo.webp`/`.png` at the top of the homepage hero, and the tab icon
  (`favicon.svg` embeds it; `apple-touch-icon.png`). Keep these if the site is regenerated.
- The homepage hero opens with the animated sigil (`#xalreth-hero` in index.html; `css/xalreth.css`, `js/xalreth.js`,
  and the WebGL layer `js/xalreth-three.js` using the vendored Three.js r160 in `js/vendor/`): particle coil, fog, energy arcs,
  rotating eclipse halo, signal bursts, typed status messages, a Pause motion button, and an easter egg (click the sigil three
  times or type "hold light"). It lowers its resolution, then drops effects, then falls back to 2D if frames run slow, and
  stays still for reduced-motion visitors. No audio. Keep it if the site is regenerated.
- The Contact page (`contact.html`, `css/contact.css`, `js/contact.js`) is a form for bug reports, addon help, website
  issues and messages to the author. Send posts it through FormSubmit to the author's inbox with the subject
  "Xal'Reth Website Submission". The address is stored scrambled in js/contact.js; once the author has activated the
  form, put FormSubmit's random alias in ALIAS there so the address leaves the site entirely. Never write the address
  in plain text anywhere on the site. Copy message works for pasting into Discord.
- The Teachings of the Sacred Triangle (`teachings-of-the-triangle.html`, downloadable `sacred-triangle-canon.txt`) are built
  by `tools/build_triangle_canon.py` from `canon/triangle/*.txt` (a preface; Book I Vyrenna, the Radiant Scroll; Book II
  Xal'Reth, the Low Scroll; Book III Nhalor, the Veiled Scroll, 24 chapters each; Book IV the Turning). Edit the source
  files, never the built page, then run the builder and `tools/build_sitemap.py`. triangle.html links to it with the
  "Read the Teachings of the Sacred Triangle" button just below the image panels, above the intro text. Herald posts may quote it as "the Teachings".
- Every released addon has its own page (`addon-*.html`), built by `tools/build_addon_pages.py` from the data in that script
  (commands tables and the Drama Queen disclaimer are copied from addons.html). Each addon's title on addons.html links to
  its page, with a "Full page" button. When an addon changes or a new one is released, update addons.html and the script,
  run `python3 tools/build_addon_pages.py` and then `python3 tools/build_sitemap.py`. Coming-soon addons get no page yet.

- The Guild Roster (`guild-roster.html`, `css/guild-roster.css`, `js/guild-roster.js`) shows the live guild from the
  Blizzard WoW API. The page only reads `data/roster.json` and `data/sync-status.json`; it never calls Blizzard. Those files
  are written by `tools/sync_roster.mjs` (Node 20, no packages), run hourly by `.github/workflows/roster-sync.yml`, which
  commits them as "Guild roster sync …". Never hand-edit `data/roster.json`, `data/sync-status.json` or
  `data/roster-cache.json`. Settings are `data/roster-config.json` (guild, realm, region, sync frequency, rank names,
  hidden characters), edited from `roster-admin.html` (noindex, not in the menu or sitemap), which also stores the
  `BLIZZARD_CLIENT_ID`/`BLIZZARD_CLIENT_SECRET` repository secrets and starts manual syncs and connection tests through the
  GitHub API with the admin's own token (kept in sessionStorage only). Never put Blizzard credentials or tokens in any file.
  Keep it if the site is regenerated.

## Hourly Coil Herald post (scheduled task)
1. `git pull --ff-only origin main`
2. Read `news.json` (the top 30 or so items) so you don't repeat a recent title, topic or angle.
3. Pick material from the lore files below. Rotate kinds over the day: hymn, teaching, legend retold,
   saint profile, rite how-to, Bestiary of the Void entry, Sacred Triangle reflection, guild-life dispatch,
   Canon commentary, proverbs, Q&A from the Inner Scale, holy-day notes, Ministry of Spare Change notice.
4. Write ONE new post, 250-450 words, as JSON: title, category, summary, body_html (<p>, <h2>, <blockquote>, <ul>).
   It should feel new and specific: a fresh hymn stanza, a new minor saint, an invented-but-consistent detail.
   Stay consistent with the established lore. Link one or two relevant pages (canon.html, legends.html, etc.).
5. `python3 tools/new_post.py /tmp/post.json` (writes the page, news.json, herald.html, and rebuilds sitemap.xml).
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
  Since Nov 2026 they are painted in the Icon of the Three (triangle.html, art in img/triangle/): Vyrenna the Radiant
  (moon-silver and gold, lilies, crescent sigil; Wisdom, Balance, Compassion, Guidance; "Through endless light"),
  Xal'Reth the Eternal (violet, gold triangle, emerald; Transformation, Power, Evolution, Dominion, meaning dominion over
  his own claw; "Beyond all things"), Nhalor the Veiled (hooded, eclipse, empty-circle sigil, hollow wings folded inside
  his cloak; Secrets, Destiny, Silence, Knowledge; "In all things ends renewal"). Old titles still stand alongside.
- People and places: High Priestess Xalrathiel (Dream Pages), the Inner Scale (ruling circle), Hessk the Beggar King
  ("What did you give today?"), Khaedara the Accuser (Tribunal of Accusation), the Ministry of Spare Change,
  eggs (new members), the Wardens of the Void, Grippers (Bestiary creatures that feed on clutching), Shedfall (autumn holy season),
  basking, the Warm Ridge, the Ledger. Greeting: "Hold light." Reply: "And let go well." Sign-off: "Glory to Xal'Reth."
- Addons: Xal'Reth RP, Vyrenna RP (/vrp or /vyrenna; Xal'Reth RP's panel, Book, timer, dice, upload, synth pad and morph in green and gold, with Vyrenna art only (no Xal'Reth imagery) and her "radiant form" morph; its emote script is the Teachings of the Sacred Triangle, 5 books, 77 chapters, 509 verses, built into the addon's Teachings.lua from canon/triangle/*.txt, so re-release it if the Teachings change; its page addon-vyrenna-rp.html has its own green theme, css/addon-vyrenna.css), Disciples of Devotion, Brain Rotter Pro (/rot; 10,000 lines of brain rot), Edgelord Pro (/edge; 1,574 edgy PC-mastery gamer emotes in ten categories, built on Brain Rotter Pro's engine; auto-edge every 20s and an optional Escalation that speeds it up), Full Support (/fs; companion that answers Drama Queen posts with supportive replies in guild chat), Drama Queen Pro 3.3 (/dq; two main switches: Cause drama in guild, Cause drama publicly; logo at img/dramaqueen-logo.svg, an original tearful queen in a pink heart tiara; Queen Detector panel shows who else runs it; deadpan real-sounding personal drama every 5 minutes in guild chat, emote and /say; always point readers to its use-at-your-own-risk disclaimer at addons.html#dramaqueen-disclaimer), Master Baiter Pro (/mbp; formerly Coil Angler, whose old page addon-coil-angler.html now redirects; one-key fishing with auction house prices, top-five catch icons, an animated deep-water panel and a live leaderboard over the hidden MasterBaiterNet channel; made for all players, so the addon itself has no Xal'Reth or Coil wording), Master Bait Forever (/mbf; Master Baiter Pro cloned for World of Warcraft: Forever: interface 16001, _forever_ folder, Fishing spell 7620, modern or original auction house, smaller gold scale, its own MasterBaitForeverNet leaderboard; page addon-master-bait-forever.html), Paranoid RP (/para; target someone, 103 escalating paranoid thoughts as emotes ending in light trash talk), Litany of Begging (the Litany is deliberately the most boring text ever written;
  it carries a distress warning, so never encourage reading it all).
- Discord: https://discord.gg/wYakHBHPz
