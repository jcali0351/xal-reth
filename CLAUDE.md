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
  Home · About (The Sacred Triangle, The Chronicle, The Canon, The Legends, The Library) · Community (Recruitment, News, Blog, Testimonials, Merch, Guild Bank, Auction House, Fishing Leaderboard, RP Profiles, Duels, Guild Ranks, Guild Achievements) ·
  Faith (Devotion, The Altar, The Path, The Atlas) · Addons · Guild Roster · Join · Sitemap · Contact. Submenus open on hover on wide screens and on click or tap
  everywhere (script in site.js, styles at the end of style.css); the one holding the current page is highlighted.
  The full menu shows above 860px; at 860px and below it folds into the Menu button.
  The menu glows and moves ("THE GLOWING MENU" at the end of style.css, "Menu FX" at the end of site.js): a soft light glides
  between items, dropdowns swing out in 3D and unblur with a shimmering top edge, a cursor spotlight and items fading in one by
  one; the phone menu unfurls and its submenus slide open; reduced-motion visitors get it still.
  It is frosted reflective glass ("THE FROSTED GLASS MENU" in style.css): a glass header bar with frost grain, the menu in a
  glowing glass capsule with a curved highlight and a passing reflection, a bright block for the gliding light, frosted
  dropdowns and a glass Menu button; about 15% larger than before (the text scales with the window so it stays on one line;
  from 861 to 1060px the header shows the sigil without the wordmark). On every page load the glass condenses out of a blur,
  a flash of light crosses it and the items glow in one by one.
  John wants the highlight rectilinear and bright, not a pill ("THE BRIGHT BLOCK MENU" at the end of style.css): the hover,
  focus and current-page highlight is a bright square-cornered block of violet light with white corner brackets and a
  passing sheen, the bar and dropdowns are squared, dropdown items light up as bright bars, and star sprites burst from the
  block and from dropdown items on hover and focus (spark() in Menu FX, site.js); on phones the current page is a bright
  squared strip; reduced motion: still, no sprites. Keep it if the site is regenerated.
- The logo (the violet triangle sigil, "Observe ▽ Analyze ▽ Transcend") is the site's brand mark: `img/xalreth-mark.png`
  in the header and footer of every page, `img/xalreth-logo.webp`/`.png` at the top of the homepage hero, and the tab icon
  (`favicon.svg` embeds it; `apple-touch-icon.png`). Keep these if the site is regenerated.
  The link preview on X, Discord and Facebook is `img/xalreth-card.jpg` (1200 x 630: the sigil over the violet sanctum
  with "Cult of Xal'Reth"), set as og:image (with og:image:width/height) and twitter:image on every page. Never point
  those at a tall picture again: X crops it to a strip. `xalreth-og.jpg` (the tall portrait) is page art only now.
- The homepage hero opens with the animated sigil (`#xalreth-hero` in index.html; `css/xalreth.css`, `js/xalreth.js`,
  and the WebGL layer `js/xalreth-three.js` using the vendored Three.js r160 in `js/vendor/`): particle coil, fog, energy arcs,
  rotating eclipse halo, signal bursts, typed status messages, a Pause motion button, and an easter egg (click the sigil three
  times or type "hold light"). It lowers its resolution, then drops effects, then falls back to 2D if frames run slow, and
  stays still for reduced-motion visitors. No audio. On phones (700px and narrower) the background stands down (no WebGL
  layer, particles, halos, eclipse, pulses or beams) and the sigil itself is animated instead: it rises in, floats and sways,
  its glow breathes and a violet sheen passes across it (masked to the logo); it all comes back if the window widens.
  Keep it if the site is regenerated.
- Recruitment (`recruit.html`, `css/recruit.css`, `js/recruit.js`; first item under Community in the menu): the recruiting
  pitch for PvE and RP players (Moon Guard US, Alliance), how joining works, a "Request to join" form (character name, server,
  class, role, professions, PvE/RP, a large message box, how to reach them) and, under #officers, a separate officer application
  (rank, availability, officer roles, experience, why them). Both post through FormSubmit to the author's inbox with the
  subjects "Xal'Reth Guild Application" and "Xal'Reth Officer Application", using the same scrambled address as js/contact.js
  (update ALIAS in contact.js, chat.js and recruit.js together), and "Copy for Discord" always works. Every field with
  data-label becomes a row of the email. Don't invent raid schedules or requirements on the page. Keep it if the site is regenerated.
- The Join page (`join.html`, `css/join.css`) opens with a "Now recruiting" call to action (`.rcta`, data-no-motion): a running
  border of light, a pulsing badge, "The Coil Wants You", a bright squared "Request to join" button to recruit.html#apply and a
  link to recruit.html#officers, two plates fanned on the right and twinkling stars; still for reduced motion. Keep it.
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
  CurseForge: Master Baiter Pro (https://www.curseforge.com/wow/addons/master-baiter-pro) and Xal'Reth RP
  (https://www.curseforge.com/wow/addons/xalrethrp) have a "Get it on CurseForge" button beside Download, a panel saying
  why (the app keeps it updated; a follow or comment helps others find it) and an "easy way" first install step, on
  addons.html and on their pages (the `curseforge` and `cf_text` fields in build_addon_pages.py; styles "CURSEFORGE CALLS
  TO ACTION" at the end of style.css). Give any other addon that goes up on CurseForge the same two fields.

- Site-wide search, "the Seeking Glass": `js/search.js` + `css/search.css`, loaded on every page by a small loader at the top
  of `site.js`. It adds a search button to every page header, opens with / or Ctrl+K (Cmd+K), and the homepage has a search
  bar (`.ss-hero`, `data-search-hero`) just above the animated sigil. It reads `search-index.json`, built by
  `tools/build_search.py` from every page and each heading with an id (addon results carry their .zip for a Download
  button). new_post.py and build_addon_pages.py rebuild it; run it by hand after other page changes. Never hand-edit
  search-index.json. Keep all of this if the site is regenerated.
- The homepage sky (`.hero-sky` right after <body>, `css/hero-sky.css`, `js/hero-sky.js`, `img/hero-sanctum.*`, a phone crop
  `img/hero-sanctum-mobile.webp`): a violet sanctum under a swirling sky behind the header and the animated sigil, with
  parallax on scroll, a gentle lean toward the mouse, a breathing swirl and a pulsing eye; the header is see-through at the
  very top of the homepage and solid once you scroll. John changes the picture in the Sanctum Editor's "Homepage sky" tab,
  which writes a `<style id="hero-sky-pics">` just before `.hero-sky` (the picture paths; they must live in the page, since
  a url() in a CSS variable resolves from css/) and `--sky-pos`, `--sky-pos-m`, `--sky-bright`, `--sky-sat`,
  `data-swirl="off"`, `data-eye="off"` on the `.hero-sky` tag. Uploaded skies are `img/uploads/*-sky-*`.
  The sky can be a slideshow: `data-slides="a.webp|b.webp|…"`, `data-interval` (seconds), `data-transition` (fade, slide
  or both) and `data-flash="off"` on the same tag, chosen in the editor's Slideshow section; js/hero-sky.js loads each
  picture before showing it, drifts each one slowly closer, flashes a soft violet glow on each change, and pauses off
  screen, in hidden tabs and for reduced motion. On phones (700px and narrower) the sky holds still: one picture, no
  slideshow, drift, flash, swirl, eye pulse or parallax; it wakes again if the window widens. Keep it if the site is regenerated.
- The homepage's Sacred Triangle section (`.pantheon`, styles "The Pantheon" in style.css) is the Icon of the Three triptych
  (`img/triangle/triptych.webp`, names, virtues and mottos painted in): three linked panels, each cropped from the one
  image by CSS (Vyrenna x 0-260, Xal'Reth 271-529, Nhalor 540-799), entering one by one in a burst of each god's light
  (moon-silver, emerald and gold, violet) with a breathing aura and passing light; on hover a panel lifts, tilts toward
  the pointer and blazes while the other two dim (js/motion.js). Phones show the three side by side. Keep it if the site is regenerated.
- The Coil in motion (`js/motion.js`, loaded by the loader at the top of `site.js`; styles at the end of `style.css`), on every
  page with site.js: every heading, paragraph, list, picture, card and button fades in on its own as it scrolls into view
  (headings written out of mist, text rising out of blur, pictures opening like an eye, cards tumbling up, list items and
  buttons following one another; long lists and grids enter card by card). Sections float at their own depths and trail a
  little behind fast scrolling; a fixed layer of faint sigils, runes, scales and eyes that follow the pointer and blink
  drifts behind the page; a serpent gauge on the right edge grows as you read (wide screens only); the homepage hero
  spreads apart and page headers sink and fade as you scroll. Reduced-motion visitors see everything at once with no
  movement. Skip an element with `data-no-motion`. Bump the `?v=` on motion.js in site.js when it changes. Keep it if
  the site is regenerated.
- "For the Alliance" banner on the homepage, right after the hero (`.allegiance`, `css/alliance.css`, `js/alliance.js`):
  John's Alliance crest image recolored violet (`img/alliance-crest-purple.webp`/`.png`, transparent), floating with a glow,
  and the words "For the Alliance" playing in letter by letter when it scrolls into view. Keep it if the site is regenerated.
- Vessk, the AI herald chat: `js/chat.js` + `css/chat.css`, loaded on every page by the loader at the top of `site.js`
  (bright purple "Ask Vessk" pill bottom right with Vessk's face, `img/vessk-face.jpg`, and a portrait card `img/vessk.jpg`
  that opens each chat; Vessk is drawn from John's own character, a one-time "Hold light" hello, panel full screen on phones; the homepage
  hero's "Speak to an Agent" button opens it via `data-open-chat`). Vessk says plainly he is an AI. Without CHAT.endpoint he
  answers from search-index.json plus straight answers from the FAQ list in chat.js (recruiting and officers via recruit.html, server and faction, raids and Mythic+, RP and rites, ranks, guild bank, roster, achievements, merch, the altar, the Triangle, Hessk, Khaedara, holy days, the greeting, bugs, contacting John, every addon's slash command, addon nicknames like "the fishing addon"; keep it current when pages change), plus wings, who is Xal'Reth, installing, Discord and X;
  with CHAT.endpoint set to the Cloudflare Worker in `tools/chat-worker/` (worker.js + README.md; the Claude API key is a
  Worker secret, never in the repo) he answers with Claude, fed the relevant passages. "Talk to John" posts the visitor's
  name, email, message and (if allowed) the chat transcript through FormSubmit to the author's inbox with the subject
  "Xal'Reth Live Chat", using the same scrambled address as js/contact.js (update ALIAS in both). John replies by email.
  Never write the address in plain text. Keep all of this if the site is regenerated.
  site.js loads search and chat with `?v=…`: bump that version whenever their files change so visitors get the new copy.
- X (Twitter) account: @xalrethrp (https://x.com/xalrethrp). The homepage card "The Serpent Speaks" (`.xcard`, low on the
  page just above the FAQ; `css/latest-tweet.css`, `js/latest-tweet.js`) draws one post from `data/latest-tweet.json` in the
  site's own purple and black (no X script or frame, nothing blue; the post's text comes from X's free oEmbed), which
  `.github/workflows/latest-tweet.yml` / `tools/sync_tweet.mjs` keep current: by hand (Actions > "Latest post from X" >
  Run workflow with the post link, free) or hourly if the X_BEARER_TOKEN secret exists (X API pay-per-use, since_id so
  quiet hours cost nothing). Never put the token in a file. The hero has a "Follow on X" button and every footer's Join
  column has "Follow on X" after "Our Discord". Keep these if the site is regenerated.
- The Guild Roster (`guild-roster.html`, `css/guild-roster.css`, `js/guild-roster.js`) shows the live guild from the
  Blizzard WoW API. The page only reads `data/roster.json` and `data/sync-status.json`; it never calls Blizzard. Those files
  are written by `tools/sync_roster.mjs` (Node 20, no packages), run hourly by `.github/workflows/roster-sync.yml`, which
  commits them as "Guild roster sync …". Never hand-edit `data/roster.json`, `data/sync-status.json` or
  `data/roster-cache.json`. Settings are `data/roster-config.json` (guild, realm, region, sync frequency, rank names,
  hidden characters), edited from `roster-admin.html` (noindex, not in the menu or sitemap), which also stores the
  `BLIZZARD_CLIENT_ID`/`BLIZZARD_CLIENT_SECRET` repository secrets and starts manual syncs and connection tests through the
  GitHub API with the admin's own token (kept in sessionStorage only). Never put Blizzard credentials or tokens in any file.
  Keep it if the site is regenerated.
  The same sync saves the guild crest (the tabard): `data/guild-crest.json` (faction, background colour, emblem and border
  ids and colours) and the guild's emblem and border pictures in `img/crest/`; and the guild's achievements in
  `data/guild-achievements.json` (points, completed with dates, descriptions and icons, and progress). Never hand-edit them.
  The guild crest shown on the site is `img/crest/xalreth-crest.svg`: the tabard (dark banner on a gold rod, magenta
  beaded trim) bearing the guild's real in-game emblem, Blizzard emblem 37 (a slender serpent ringed round in mesh
  scales, two open-jawed heads rearing at the top), embedded as a picture and tinted bright magenta. Don't redraw the
  serpent by hand. When the crest changes, bump `?v=` on it in js/crest.js and style.css.
  `js/crest.js` puts it into any `<div class="crest" data-crest>` (Ranks and Achievements heroes).
  The guild frame (`class="crowned"` on a section, with `<div class="gframe" aria-hidden="true"><span class="gf-crest"></span></div>`
  as its first child; styles "THE GUILD FRAME" in style.css): the gold filigree bar cut from the game's guild window
  (`img/crest/frame-center.png`, `-center-sm`, `-cap-l`, `-cap-r`, `-bar`; it stretches to any width) with the crest
  hanging at its centre. It crowns the Guild Bank's chart, vault and Ledger, The Deeds, the Ranks' powers table, the
  roster stats, and the homepage's Altar invitation and Sacred Triangle. On every other page (except noindex admin pages
  and wiki.html, which has no site.js) site.js crowns the main content under the page title (the first `.wrap` or
  `.altar-page` in <main>) the same way at load, so it is never in the HTML and the Sanctum Editor never saves it; a page
  that already has a `.crowned` section is left alone. Keep these if the site is regenerated.
- The Auction House (`auction-house.html`, `css/auction-house.css`, `js/auction-house.js`; Community menu after Guild Bank):
  every auction on the guild's realm (data/roster-config.json) and every region commodity, one row per item (lowest price,
  quantity-weighted median, quantity, listings), searchable, with Realm / Commodities / Pets tabs, category, quality and
  sorting, 60 rows at a time. `.github/workflows/auctions.yml` runs `tools/sync_auctions.mjs` hourly (same Blizzard secrets
  as the roster) and force-pushes the result as the `ah-data` branch (auctions.json, items.json with names/quality/
  category/icons kept between runs and filled a few thousand per run, status.json): one commit replaced every hour so the
  repository never grows. The page reads it from raw.githubusercontent.com. Never commit auction data to main, and never
  hand-edit the ah-data branch. Until the first run it says the Ministry is counting. Keep it if the site is regenerated.
- The Faces of the Coil, the in-character social network (rp.html hub + every character.html profile; `js/faces-social.js`,
  `css/faces.css`; server `tools/social-worker/`: worker.js, schema.sql, README.md). Members sign in with Battle.net
  (OAuth, scope wow.profile, through the guild's existing Blizzard API client, which needs the Worker's /auth/callback as a
  redirect URL); only their characters on data/roster.json become theirs to post as; nothing about the Battle.net
  account is shown. A Facebook-like profile: cover, avatar (class-colour ring; the Armory portrait until they upload
  one), name, title, live status, Edit profile (name in character, title, pronouns, home, affiliations, relationship,
  likes, dislikes, about), tabs Wall / About / Bonds / Photos / Armory (the old character page lives in the Armory tab).
  The hub: Posting-as switcher, status, composer with a picture, the feed with reactions (Hold light, Basking, Gripped,
  Let go) and comments, bond requests, and the directory of faces. Bonds: kin, friend, rival, mentor, student, sworn,
  beloved (asked and accepted). Posts and comments appear at once and can be reported; pictures wait for an officer.
  Officers moderate in the Sanctum Editor's "Faces" tab (its GitHub token is the officer key, sent as X-Officer-Token):
  approve or reject pictures with previews, hide/show posts, pause or restore a member, close reports. Off until
  ENDPOINT in faces-social.js holds the Worker's address (the editor tab keeps its own copy in localStorage
  "xr-social-worker"); until then the pages show the officer-kept profiles from data/rp-profiles.json, which also stay
  as the About tab's extra content. Limits: 20 posts/h, 60 comments/h, 12 pictures/day per character; all text is plain
  text. counts.html says what the Faces keep. Local testing: README.md (DEV=1 only locally, never deployed).
- The Armory, RP profiles and duels (all three load through `js/coil-faces.js`; styles in `css/armory.css`).
  `character.html?c=<realm-slug>/<name>` (`js/character.js`; out of the sitemap and search because it needs `?c=`):
  one faithful's page in their class colour with the Armory render, rank, item level, Mythic+ rating, achievements,
  mounts, pets, last seen, their RP profile, duel record, equipment (Wowhead links), Mythic+ best runs, raid progress,
  recent deeds and Armory/Raider.IO/Warcraft Logs links. The Guild Roster's profile panel links to it ("Full profile").
  Gear, Mythic+ and raids come from `data/characters.json`, written by `tools/sync_roster.mjs` (fetchExtras: equipment,
  mythic-keystone-profile and encounters/raids, only for characters refreshed in that run, so everyone is filled within
  a day; never hand-edit it). `rp.html` (`js/rp.js`), "The Faces of the Coil": the RP profiles in
  `data/rp-profiles.json`, kept in the Sanctum Editor's "RP Profiles" tab (in-character name, title, pronouns,
  portrait from img/, quote, appearance, personality, history, extra "## Heading" sections, bonds, timeline, OOC);
  members send profiles to an officer, who reads them before they go up (no public self-submission). `duels.html`
  (`js/duels.js`), "The Duelling Ground": the duel ledger in `data/duels.json` (winner, loser, date, place, note),
  kept in the editor's "Duels" tab; leaderboard by wins, win rate (3+ duels) or streak with the last five, head to
  head, recent duels and an SVG web of rivalries. Characters are keyed "realm-slug/name" everywhere. Public lookup of
  characters outside the guild would need a server (the admin Worker could host it); not built. No duel addon exists;
  don't publish one. Keep all of this if the site is regenerated.
- Analytics and X in the Sanctum Editor (plan and decisions: `docs/CMS_ANALYTICS_AND_X.md`). Counting: `js/counter.js`
  (loaded by site.js; off until its CODE holds the site's GoatCounter code) loads GoatCounter's count.js: no cookies, no
  personal data, nothing counted for Do Not Track / Global Privacy Control, noindex pages or localhost. Goals are
  GoatCounter events: `goal/join-request`, `goal/officer-application`, `goal/contact`, `goal/talk-to-john` (recruit.js,
  contact.js and chat.js fire `xr:sent` after a successful send), `download/<zip>` (clicks on .zip links) and settled
  Seeking Glass searches `search/<words>` or `search-none/<words>` (search.js fires `xr:search`). `counts.html`, "What
  the Sanctum Counts", explains it; site.js adds a link to it to every footer's small print. The keys live only in the
  admin Worker, `tools/admin-worker/` (worker.js + README.md; Cloudflare, free plan, KV binding XR, a 5-minute cron):
  it answers only requests carrying a GitHub token that GitHub confirms can push to the repository (the editor's own
  sign-in), proxies the GoatCounter API (cached 5 minutes) and posts to X with OAuth 1.0a user keys (queue, schedule,
  a MAX_POSTS_PER_DAY cap, metrics cached 12 hours). The editor's "Analytics" tab (ranges, cards with change against the
  previous period, chart, sources pie, referrers, top pages, goals, searches incl. failed ones, screens, browsers,
  systems, countries, CSV) and "X" tab (composer with the 280 counter counting links as 23 and a warning that posts with
  links cost much more, pictures from img/, post now, schedule, drafts, queue with edit/duplicate/pause/post now/delete,
  month calendar, suggestions from news.json, performance and top posts, the posting log) keep the Worker address in
  localStorage "xr-admin-worker" (not secret). Never put the GoatCounter, X or Cloudflare keys in a file.
- The Path of the Coil, the living layer (`js/coil-path.js` + `css/coil-path.css`, loaded on every page by the loader at
  the top of site.js with `?v=` in `cpv`: bump it when either changes). Everything lives in the visitor's own browser
  (localStorage "xr-path-v1"), nothing is sent anywhere. Reputation and eight ranks (Wanderer, Seeker, Acolyte, Initiate,
  Disciple, High Disciple, Voidcaller, Ascendant), 20 achievements, titles; "Grip" rises with everything collected (the
  Grippers feed on it; more Grip, more anomalies) and "Let go" on the Path page turns it into reputation. Sixteen artifacts
  (fragments, relics, seals, tablets, eyes) glint faintly beside headings on lore pages (ARTIFACTS in coil-path.js says
  where; a missing heading falls back to the page's main content). Eight secrets: the arrow-key sequence then B A; typing
  "let go well"; the homepage sigil's "hold light" easter egg (js/xalreth.js fires `xr:unwrap`); clicking the footer chant
  three times; an invisible rune at the end of the Codex glossary; the Three Tablets' words (still, hungry, loosen) spoken
  on the Path page, which opens `beneath.html` (the Low Door: noindex, out of the menu, sitemap SKIP and search); visiting
  it; and the Night Watch (midnight to 3 a.m.). Whispers drift by rarely; anomalies (a glitching heading, a rare eclipse)
  never run for reduced motion; both can be turned off on the Path page. The daily prophecy is built from phrase tables
  seeded by the date (the same for everyone that day). The homepage gets a card after the For the Alliance banner (added
  by the script, not in index.html): today's prophecy, the holy day in season, a live countdown to the next one (the Holy
  Calendar in rites.html; dates are the Coil's own: Day of Accusation the 1st of every month, Feast of Scales Jun 21,
  Shedfall Sep 22 to Nov 30, the Long Wait Dec 21-27, the Eve of the Unwrapping Dec 31) and the visitor's rank.
  `path.html` (`js/path.js`): rank emblem, Grip, prophecy and past prophecies, the collection, the Three Tablets,
  secrets with hints, achievements, titles and settings. `map.html` (`js/atlas-map.js`): an original SVG map of the ten
  holy places (PLACES in coil-path.js, linked to legends.html and codex.html); visiting a pin counts toward the Path.
  Keep the voice gentle (holding lightly, letting go), never grimdark. Keep all of this if the site is regenerated.
- The Anglers of the Coil (`fishing.html`, `css/fishing.css`, `js/fishing.js`; Community menu as "Fishing Leaderboard", after
  Auction House): the fishing leaderboard. A moonlit lake over the serpent's coil (inline SVG: bobber with ripples, drifting
  coil with a blinking eye, fish, stars; still for reduced motion), stats, a podium and ranked list with tabs Top catches /
  Most catches / This week / Gold per hour, "The Rich Waters" (every fished item at this hour's Moon Guard auction price),
  Jackpots, Records of the Deep and how to join. Blizzard's API has no fishing data: the anglers' numbers come from
  Master Baiter Pro 2.2+ (`/mbp export`, or the export kept in MasterBaiterPro.lua), which John pastes or uploads in the
  Sanctum Editor's "Fishing" tab; it merges into `data/fishing.json` (newer numbers win per angler, an angler's own
  detailed records only from their own export, notable catches added once, a "hidden" list for anyone who asks to be
  left off). Prices, names and icons come from Blizzard: the hourly ah-data branch plus `data/item-cache.json`, which
  `tools/sync_bank_items.mjs` (bank-items.yml, now also on data/fishing.json changes) fills for fished items. Never
  hand-edit data/fishing.json. For local testing only, `?fish=` and `?ah=` point the page at other data on localhost.
  Until data exists it says the waters are still being counted. Keep it if the site is regenerated.
- The Deeds of the Coil (`achievements.html`, `css/achievements.css`, `js/achievements.js`; Community submenu as "Guild
  Achievements", linked from the Guild Roster header): the crest, the guild's achievement points in a gold shield, stats,
  the completed deeds newest first (Blizzard icon in a gold frame, description, reward, date, points; category filters,
  search; each opens on Wowhead) and the ones in progress with progress bars, all from `data/guild-achievements.json`.
  Until that file exists it says the deeds are being counted. Keep it if the site is regenerated.
- The Ranks of the Coil (`ranks.html`, `css/ranks.css`, `js/ranks.js`; Community submenu as "Guild Ranks", linked from the
  Guild Roster header): the ten in-game ranks, highest first: High Priestess, Unpaid Intern, Hand of Xal (the three officer
  ranks, gold insignia), Inner Scale, Scalekeeper, Venomblade, Coilborn, Scaled Disciple (silver), Hatchling, Egg (bronze).
  Each has original military-style insignia (inline SVG symbols #em-1 … #em-10 at the top of ranks.html: chevrons and rockers
  for members, bars and devices for officers), a motto, description, duties, powers and how one rises; a ladder of all ten and
  a table of powers ("the Coil's doctrine"; the in-game Guild Control panel is the final word). "Download PNG" exports any
  insignia at 512 x 512 (for Discord roles). Rank names must match `data/roster-config.json` rankNames. Keep it if the site
  is regenerated.
- The Guild Bank (`guild-bank.html`, `css/guild-bank.css`, `js/guild-bank.js`; Community submenu): the guild's gold (counting up
  in the hero), gold over time, the bank tabs as 14 x 7 grids of glass slots with quality glows, a search across tabs, item
  tooltips (click opens Wowhead), the Ledger of money and item entries and "The Generous" (top givers, last 30 days).
  Blizzard's API has no guild bank, so the data comes from our Coil Ledger addon (`CoilLedger.zip`, source in it): it records
  the bank whenever it is opened in game; /ledger shows an export. Since 1.3.0 it writes the gold down only once the server
  has sent it (GUILDBANK_UPDATE_MONEY), prefers the bank window's own amount if the two differ, takes `/ledger gold <amount>`
  by hand, and keeps and exports its own gold history; the editor refuses exports older than 1.3.0, and the first 1.3.0
  upload replaces the older history points. John brings it to the site in the Sanctum Editor's
  "Guild Bank" tab (paste the export or upload WTF/.../SavedVariables/CoilLedger.lua), which merges it into
  `data/guild-bank.json` (gold and tabs replaced by the newer record, ledger entries added only if new, gold added to the
  history). `.github/workflows/bank-items.yml` then runs `tools/sync_bank_items.mjs`, which fills `data/item-cache.json`
  with item icons from the Blizzard API (same secrets as the roster). Never hand-edit those two data files. Keep all of
  this if the site is regenerated.
- The Sanctum Editor (`admin.html`, `css/cms.css`, `js/cms.js`; noindex, not in the menu, sitemap or search) is John's CMS.
  He signs in with a fine-grained GitHub token (xal-reth only, Contents: read and write) kept in his browser only
  (sessionStorage, or localStorage if "keep me signed in"); never put a token in a file. Saves are commits through the
  GitHub API whose messages start with "CMS:". Tabs: Pages (tap any text to edit, tap a picture to replace it, page title
  and description, raw HTML), Blog (new post / edit / delete: writes the post-*.html page from the newest post's layout,
  its card and category counts in blog.html, and the older/newer links), Images (replace any image file under its own
  name, plus its .webp/.png twin), Homepage animations (the typed status lines, timing and the Unwrapping message in
  `data/hero-text.json`, read by js/xalreth.js with its built-in lines as a fallback; the "For the Alliance" banner text in
  index.html), Homepage sky (choose, upload or restore the picture behind the header and sigil, its focus point on
  computers and phones, brightness, colour strength, the glow and the eye; see the homepage sky above). Fonts (dropdowns
  for the heading font, the body font and optionally the menu/labels/buttons font, bold headings, a live preview and
  "Put back the original fonts"; writes css/site-fonts.css). In Pages, tapping a picture replaces or removes it (removing
  takes its <picture>, and its <figure> or link if the picture is all they hold), and "+ Picture" adds a new picture
  after the text being edited as `<figure class="illum|illum wide|illum side|illum side left">` with an optional
  `<figcaption><b>title</b>caption</figcaption>`; the blog editor's "+ Picture" adds the same figures where the cursor is,
  and tapping a picture in a post replaces or removes it. Uploaded pictures go to `img/uploads/`. `.github/workflows/cms-rebuild.yml` rebuilds sitemap.xml and
  search-index.json after each page change, and on a page or css/site-fonts.css change also runs build_fonts.py and
  stamp_assets.py, so a font change reaches visitors at once. When signed in, site.js shows an "Edit this page" button bottom left.
  John's CMS edits live in the committed pages, so if the site is ever regenerated, start from the current files
  (or his edits are lost), and keep all of this.

- The illuminated plates (`img/art/*.webp`, cut from John's painted sheets; "THE ILLUMINATIONS" at the end of style.css):
  `<figure class="illum side|side left|wide">` with a `<figcaption><b>Title</b>caption</figcaption>`, `.glyph-grid` for round
  sigils, `.plates` for galleries. The Chronicle has a banner per chapter (`chronicle-*`), and Legends, Rites, Teachings
  ("The Seven Sacred Glyphs"; the tail-eating eighth glyph is the Ouroboran Heresy, shown only in the Codex), the
  Sacred Triangle and the Codex carry plates; the Library ends with every plate ("The Illuminated Plates"). The art's
  serpents never have wings of their own (wings are Nhalor's). On the homepage John wants the pictures in front of the
  content blocks and list items (no slideshows or reels): each "Story of the Eternal" step has its banner on top (`.st-pic`);
  every card (Four Truths, Four Pillars, From the Legends, The Library) has a painting at its front (`.card-pic`, a
  full-height panel on the left, on top on phones); each step of the Path of the Faithful has a sacred glyph before its
  text and each altar step a round plate (`.li-pic`). `html, body { overflow-x: clip }` keeps the drifting layers from making pages scroll sideways.
  Keep these if the site is regenerated.
- Type: by default Abril Fatface (the fat display face: h1, h2, drop caps, big numbers, the wordmark; `--fat`) and Lato (body,
  and labels, nav and buttons in heavy wide-spaced capitals, lead lines and quotes in light italic); "THE FAT AND THE FINE"
  at the end of style.css. The fonts are self-hosted (no Google Fonts): `fonts/<slug>/*.woff2` + LICENSE for 63 popular
  Google Fonts (Latin; weights 300/400/700/900 upright and italic where they exist, from Fontsource's font-files repo),
  catalogued in `fonts/fonts.json` (`fonts/catalog.css` has every @font-face, for the editor's previews only).
  `css/site-fonts.css`, linked right after style.css on every page (except wiki.html, which keeps its own fonts), holds
  @font-face for just the chosen fonts and sets `--fat` (headings), `--serif-body` (body) and `--serif-display` (menu,
  labels, buttons); its first line keeps the choice as JSON. John picks them in the Sanctum Editor's Fonts tab, which
  rewrites that file (fontsCss() in js/cms.js; keep it in step with site_fonts_css() in `tools/build_fonts.py`).
  `python3 tools/build_fonts.py` rebuilds the catalog, links site-fonts.css into any page missing it and strips old Google
  Fonts links (`--import DIR` adds fonts from a font-files checkout after adding them to FONTS; `--reset` restores Abril
  Fatface + Lato). Keep all of this if the site is regenerated.
- Every page links `style.css?v=…`, `site.js?v=…` and its own `css/…` and `js/…` files with `?v=…`, so visitors get changes
  at once instead of a cached copy (GitHub Pages lets browsers keep files for 10 minutes). After changing any of them, run
  `python3 tools/stamp_assets.py` (it stamps every page with each file's content hash).

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
- Addons: Xal'Reth RP, Vyrenna RP (/vrp or /vyrenna; Xal'Reth RP's panel, Book, timer, dice, upload, synth pad and morph in green and gold, with Vyrenna art only (no Xal'Reth imagery) and her "radiant form" morph; its emote script is the Teachings of the Sacred Triangle, 5 books, 77 chapters, 509 verses, built into the addon's Teachings.lua from canon/triangle/*.txt, so re-release it if the Teachings change; its page addon-vyrenna-rp.html has its own green theme, css/addon-vyrenna.css), Disciples of Devotion, Brain Rotter Pro (/rot; 10,000 lines of brain rot), Edgelord Pro (/edge; 1,574 edgy PC-mastery gamer emotes in ten categories, built on Brain Rotter Pro's engine; auto-edge every 20s and an optional Escalation that speeds it up), Full Support (/fs; companion that answers Drama Queen posts with supportive replies in guild chat), Drama Queen Pro 3.3 (/dq; two main switches: Cause drama in guild, Cause drama publicly; logo at img/dramaqueen-logo.svg, an original tearful queen in a pink heart tiara; Queen Detector panel shows who else runs it; deadpan real-sounding personal drama every 5 minutes in guild chat, emote and /say; always point readers to its use-at-your-own-risk disclaimer at addons.html#dramaqueen-disclaimer), Master Baiter Pro (/mbp; formerly Coil Angler, whose old page addon-coil-angler.html now redirects; one-key fishing with auction house prices, top-five catch icons, an animated deep-water panel and a live leaderboard over the hidden MasterBaiterNet channel (since 2.2 it also shares best gold per hour and gold caught, appended to the S:1 message so older copies still read it, and `/mbp export` feeds fishing.html); made for all players, so the addon itself has no Xal'Reth or Coil wording), Master Bait Forever (/mbf; both share Glow.lua since Pro 2.3 / Forever 1.1: the aura, rim spark, bubbles, twinkles, sheens and coin bursts, turned off with `glow off`, so change it in both zips; Master Baiter Pro cloned for World of Warcraft: Forever: interface 16001, _forever_ folder, Fishing spell 7620, modern or original auction house, smaller gold scale, its own MasterBaitForeverNet leaderboard; page addon-master-bait-forever.html), StoryCaster (/story; Midnight and Forever, StoryCaster.zip and StoryCaster-Forever.zip, page addon-storycaster.html, logo img/addons/storycaster-logo.*: a standalone RP scripter with no Xal'Reth or Vyrenna content, keep it that way; paste text and it becomes emotes on a timer or one Deliver key press at a time, 18 animation buttons, [bow] tags, /pause, /s /y /p /ra /g chat lines, [Name] duet parts synced over its hidden addon channel, ## scenes, placeholders, ambient, line editor, share, compact mode, key bindings), No Hablo (/nh; Midnight and Forever, NoHablo.zip and NoHablo-Forever.zip, page addon-no-hablo.html: a chat filter for the user's own screen, one red "Block Spanish" button hides Spanish text chat and mutes Spanish speakers for the session, nothing is reported or sent; keep its copy respectful, a reading-comfort filter, never mocking Spanish speakers), Paranoid RP (/para; target someone, 103 escalating paranoid thoughts as emotes ending in light trash talk), Litany of Begging (the Litany is deliberately the most boring text ever written;
  it carries a distress warning, so never encourage reading it all).
- Discord: https://discord.gg/wYakHBHPz
- X: https://x.com/xalrethrp
