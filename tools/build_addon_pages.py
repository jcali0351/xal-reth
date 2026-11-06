#!/usr/bin/env python3
"""Build one page per released addon (addon-*.html) from the data below.

Usage:  python3 tools/build_addon_pages.py
Pages reuse addons.html's head, menu and footer. Commands tables and the Drama Queen disclaimer
are copied from addons.html, so update them there and re-run this. Then run tools/build_sitemap.py.
To add an addon: add an entry to ADDONS, re-run, and link it from addons.html.
"""
import os, re, html, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://jcali0351.github.io/xal-reth/"
os.chdir(ROOT)
SRC = open("addons.html", encoding="utf-8").read()

def esc(s): return html.escape(s, quote=True)

def grab(pattern):
    m = re.search(pattern, SRC, re.S)
    if not m: raise SystemExit(f"could not find in addons.html: {pattern[:60]}")
    return m.group(0)

TABLE_XRP = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/xrp</code>.*?</table>')
TABLE_VRP = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/vrp</code>.*?</table>')
TABLE_PARA = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/para</code>.*?</table>')
TABLE_ROT = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/rot</code>.*?</table>')
TABLE_EDGE = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/edge</code>.*?</table>')
TABLE_DQ = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/dq</code>.*?</table>')
TABLE_MBP = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/mbp</code>.*?</table>')
DISCLAIMER = grab(r'<section class="warning" id="dramaqueen-disclaimer".*?</section>').replace(' id="dramaqueen-disclaimer"', ' id="disclaimer"')

def table(rows):
    body = "".join(f"<tr><td><code>{c}</code></td><td>{d}</td></tr>" for c, d in rows)
    return f'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody>{body}</tbody></table>'

TABLE_DOD = table([
    ("/dod", "Open or close the Book"), ("/dod read 42:7731", "Perform one verse now"),
    ("/dod play 21:1", "Read aloud verse by verse from 21:1 (or from your place)"),
    ("/dod pause · resume · stop · next · prev", "Control the reading"), ("/dod goto 42:7731", "Turn to a verse without reading it"),
    ("/dod chapter 42", "Turn to the start of a chapter"), ("/dod random", "Perform a random verse from all one million"),
    ("/dod votd", "Show the Verse of the Day"), ("/dod search Hessk", "Search the hand-written verses"),
    ("/dod mark · marks", "Bookmark the current verse · list bookmarks"), ("/dod channel guild", "Speak single verses in emote, say, party or guild"),
    ("/dod interval 15 · dice", "Seconds between verses · random timing"), ("/dod chapters", "List all 100 chapters")])
TABLE_LIT = table([
    ("/litany", "Show or hide the panel"), ("/litany all", "Auto-perform the entire Litany, line by line, to the very end (add a number to start from that line)"),
    ("/litany play 4817", "Perform line by line, starting at line 4817 (or where you left off)"), ("/litany line 4817", "Perform just that one line, right now"),
    ("/litany title 14.3", "Jump to Book XIV, Title 3"), ("/litany goto 4817", "Set your place without performing"),
    ("/litany pause · resume · stop · next · prev", "Control the performance"), ("/litany interval 12", "Seconds between lines, 3 to 60"),
    ("/litany search salamander", "Find lines containing words"), ("/litany random", "Perform one random line")])
TABLE_FS = table([("/fs", "Show Full Support's status"), ("/fs on · off", "Start or stop answering Drama Queen posts"),
                  ("/fs test", "See an example supportive reply, shown only to you")])

STEAM = ('<div class="notice"><strong>Steam Deck faithful:</strong> the AddOns folder is inside the Proton/Wine prefix where Battle.net is installed, '
         'under the same <code>World of Warcraft/_retail_/Interface/AddOns</code> path. Switch to Desktop Mode and move the folder there.</div>')

ADDONS = [
 dict(slug="addon-xalreth-rp.html", name="Xal'Reth RP", folder="XalRethRP", zip="XalRethRP.zip", version="4.1.1", game="Retail · Midnight 12.1",
  slash="/xrp", short="10,100 rites of Xal'Reth, performed as emotes",
  tagline="The Book of Xal'Reth. The rites of the Coil, performed as emotes, while Xal'Reth erupts in light.",
  desc="Xal'Reth RP is a free World of Warcraft roleplay addon for Midnight: 10,100 rites of Xal'Reth performed as /emotes on a timer, a glowing panel, a searchable Book and your own custom rites.",
  lede="The first relic of the Coil. Xal'Reth RP performs the rites of Xal'Reth as /emotes, one line at a time, on a timer, while Xal'Reth himself erupts in light on a glowing panel. Choose a rite, press Play, and lead the faithful.",
  stats=[("10,100", "rites"), ("100", "hand-written canon rites"), ("10 × 20", "Orders × Aspects in the Grand Book")],
  features=[
   ("The Rites", "10,100 rites of Xal'Reth", "<p><strong>The 100 Canon Rites</strong> are hand-written across 10 categories, 1,000 emotes in all. <strong>The Grand Book</strong> holds 10,000 more numbered rites in 200 categories: ten Orders (Gathering, Devotion, Hymnody, the Scale, Passage, Battle, Offering, Divination, Lore, Fellowship), each with twenty Aspects such as Dawnlit, Frostbound, Moonsworn and Star-Crowned.</p><p>Every rite number is the same on every computer, so the faithful can agree: <em>\"Tonight we perform #4817.\"</em></p>"),
   ("The Panel", "Xal'Reth, in glory", "<p>Xal'Reth sits within a rotating sigil. With every emote he erupts in light: a halo, turning rays, shockwave rings, sparkles and a flaring border, with a soft synth pad behind it. Every fifteen seconds he slowly transforms into his dragon form and back.</p><p>Play, pause, next and stop; a 5 to 60 second timer slider; dice for random timing; loop, shuffle and test modes.</p>"),
   ("The Book", "Browse and search every rite", "<p>Open the Book of Xal'Reth to browse by Order and Aspect, or search by number (4817), canon number (c12) or words. Every rite has its own icon built from its Order's colors and its Aspect's rim and gem. Left-click to choose, right-click to begin at once.</p>"),
   ("Your Own Rites", "Upload your own", "<p>Name a rite, paste in your emotes one per line, and save it. Xal'Reth RP tidies them up for you: it strips \"/e\" and numbering, splits lines that are too long for chat, and fills in <code>{target}</code> with your target's name.</p><p>Rites pause automatically in combat and resume on the same line afterward.</p>")],
  commands=TABLE_XRP + '<p class="muted center">You can also open the panel from the addon compartment button on your minimap.</p>',
  install_extra=["If you have an older version, delete your old <code>XalRethRP</code> folder first. Your settings and custom rites carry over."],
  restart="<strong>Fully restart World of Warcraft.</strong> The art only loads on a full restart, not a /reload.",
  last="Type <code>/xrp</code> to summon the panel. Say <em>Glory to Xal'Reth</em>. This step is technically optional.",
  art='<img class="canon-portrait" src="xalreth-og.jpg" alt="Xal\'Reth the Eternal, a vast violet serpent-lord among drifting stones" width="300" height="450" loading="lazy">',
  faq=[("Do I need to know the rite numbers?", "No. Browse the Book by Order and Aspect, search by word, or press the dice for a random rite. Numbers are there so a guild can agree on one."),
       ("Does it work with the other relics?", "Yes. Every addon has its own commands: <code>/xrp</code>, <code>/vrp</code>, <code>/dod</code>, <code>/litany</code>, <code>/para</code>, <code>/rot</code>, <code>/dq</code> and <code>/fs</code>.")]),

 dict(slug="addon-vyrenna-rp.html", name="Vyrenna RP", folder="VyrennaRP", zip="VyrennaRP.zip", version="1.0.0", game="Retail · Midnight 12.1",
  slash="/vrp", short="The Teachings of the Sacred Triangle, read aloud as emotes, in green and gold",
  tagline="Through endless light. The Teachings of the Sacred Triangle, read aloud verse by verse, while Vyrenna the Radiant shines.",
  desc="Vyrenna RP is a free World of Warcraft roleplay addon for Midnight that reads the Teachings of the Sacred Triangle aloud as /emotes: 5 books, 77 chapters, 509 verses, a green and gold panel, search, uploads and Vyrenna's radiant form.",
  lede="Everything <a href=\"addon-xalreth-rp.html\">Xal'Reth RP</a> does, in Vyrenna's green and gold. Choose a chapter of the <a href=\"teachings-of-the-triangle.html\">Teachings of the Sacred Triangle</a>, press Play, and your character reads it to the faithful one verse at a time, while Vyrenna the Radiant pours light across a glowing panel. One verse, one chapter, one book, or all of it.",
  stats=[("509", "verses as emotes"), ("77", "chapters, each with its own icon"), ("5", "books of the Teachings")],
  theme="vyrenna", css="css/addon-vyrenna.css",
  banner='<section class="vy-banner" aria-label="Vyrenna the Radiant"><figure class="vy-art"><img src="img/vyrenna-rp.webp" alt="Vyrenna the Radiant, painted in green and silver, arms open among floating gardens, waterfalls and white lilies" width="600" height="900"></figure>'
         '<div class="vy-words"><p class="vy-k">Book I · The Radiant Scroll · Noon</p><blockquote><p>"Wisdom is knowing what to give. Balance is knowing how much. Compassion is knowing why. Guidance is knowing where."</p><cite>The Teachings, I.4, The Four Lights</cite></blockquote>'
         '<ul class="vy-lights" aria-label="The Four Lights"><li>Wisdom</li><li>Balance</li><li>Compassion</li><li>Guidance</li></ul>'
         '<p class="vy-note">Vyrenna gives. This is her relic: green for the young world she warmed, gold for the light she never keeps.</p></div></section>',
  features=[
   ("The Teachings", "Five books, 77 chapters, 509 verses", "<p>The whole Canon of the Three is inside: the Preface, the <strong>Radiant Scroll</strong> of Vyrenna, the <strong>Low Scroll</strong> of Xal'Reth, the <strong>Veiled Scroll</strong> of Nhalor and the <strong>Turning</strong>. Each chapter opens with its title and closes with its book's own blessing: <em>Through endless light. Beyond all things. In all things ends renewal.</em></p><p>Long verses carry on over a second emote, so nothing is ever cut off mid-sentence.</p>"),
   ("The Panel", "Vyrenna, radiant", "<p>Vyrenna sits within a turning ring of golden crescents. With every verse she erupts in light: a halo, turning rays, shockwave rings, sparkles and a flaring border, with a soft synth pad behind it. Every fifteen seconds she slowly takes her <strong>radiant form</strong>, a crown of gold opening behind her, and returns.</p><p>Play, pause, next and stop; a 5 to 60 second timer; dice for random timing; loop, test and shuffle.</p>"),
   ("The Book", "Browse, search, begin", "<p>Open the Teachings to browse by book and chapter. Every chapter has its own numbered medallion in its book's colors. Pick a whole book, a whole chapter, or any single verse. Search by reference (<code>1.4.2</code>) or by any word in any verse. Left-click to choose, right-click to begin at once.</p>"),
   ("Your Own Readings", "Upload your own", "<p>Name a reading, paste in your own emotes one per line and save it. Vyrenna RP strips \"/e\" and numbering, splits lines too long for chat, and fills in <code>{target}</code> with your target's name. Readings pause in combat and resume on the same verse.</p>")],
  more=('<div class="divider"><span>THE FIVE BOOKS</span></div><section class="vy-books">'
        '<a class="vy-book" href="teachings-of-the-triangle.html#preface"><b>0</b><span>The Preface</span><i>2 chapters</i></a>'
        '<a class="vy-book vy-1" href="teachings-of-the-triangle.html#vyrenna"><b>I</b><span>The Radiant Scroll</span><i>Vyrenna · 24 chapters</i></a>'
        '<a class="vy-book" href="teachings-of-the-triangle.html#xalreth"><b>II</b><span>The Low Scroll</span><i>Xal\'Reth · 24 chapters</i></a>'
        '<a class="vy-book" href="teachings-of-the-triangle.html#nhalor"><b>III</b><span>The Veiled Scroll</span><i>Nhalor · 24 chapters</i></a>'
        '<a class="vy-book" href="teachings-of-the-triangle.html#turning"><b>IV</b><span>The Turning</span><i>The Three Together · 3 chapters</i></a></section>'
        '<p class="center muted">In game, <code>/vrp start 3.7</code> reads Book III, chapter 7. Read along on the <a href="teachings-of-the-triangle.html">Teachings page</a>, or <a href="sacred-triangle-canon.txt" download>download the text</a>.</p>'),
  commands=TABLE_VRP + '<p class="muted center">You can also open the panel from the addon compartment button on your minimap. Vyrenna RP and Xal\'Reth RP run side by side with separate settings.</p>',
  install_extra=[],
  restart="<strong>Fully restart World of Warcraft.</strong> The art only loads on a full restart, not a /reload.",
  last="Type <code>/vrp</code> to summon the panel. Say <em>Hold light</em>. The faithful will answer <em>And let go well</em>.",
  art='<img class="canon-portrait" src="img/vyrenna-rp.webp" alt="Vyrenna the Radiant in green and silver" width="300" height="450" loading="lazy">',
  faq=[("Do I need to know the chapter numbers?", "No. Browse the Teachings by book and chapter, search for any word, or press Random and let Vyrenna choose. Numbers are there so a guild can agree on a reading: <em>\"Tonight, I.4.\"</em>"),
       ("Is Xal'Reth in it?", "His book is, because the Teachings are the scripture of all three, and Book II is the Low Scroll. The art and colors belong to Vyrenna alone."),
       ("Can I run it with Xal'Reth RP?", "Yes. It uses <code>/vrp</code> and keeps its own settings, so the two panels never argue. They are, after all, two corners of the same triangle.")]),

 dict(slug="addon-disciples-of-devotion.html", name="Disciples of Devotion", folder="DisciplesOfDevotion", zip="DisciplesOfDevotion.zip", version="2.0.0",
  game="Retail · Midnight 12.1", slash="/dod", short="A million verses of scripture, read aloud as emotes",
  tagline="The scripture of Xal'Reth, read aloud. One hundred chapters, ten Books, a million verses.",
  desc="Disciples of Devotion is a free WoW roleplay addon for Midnight that reads the scripture of Xal'Reth aloud as emotes: 100 chapters, 1,000,000 verses, Verse of the Day, bookmarks and search.",
  lede="Every word ever written about the Coil, in your chat window, at the pace of devotion. 100 chapters in 10 Books, 10,000 verses each: every hand-written verse of the faith first, then the Verse Engine. Read a whole chapter on a timer, perform any single verse in emote, say, party or guild, bookmark, search, and get a Verse of the Day.",
  stats=[("1,000,000", "verses"), ("2,349", "hand-written verses"), ("100", "chapters, each with its own icon")],
  features=[
   ("The Book", "One hundred chapters", "<p>A panel with all 100 chapters down the left, each with its own hand-painted medallion, grouped into ten Books from the Book of Beginnings to the Book of the Open Palm, and the current verse on the right.</p>"),
   ("Read Aloud", "Scripture on a timer", "<p>Press Play and the addon performs the chapter verse by verse as emotes, every 5 to 60 seconds or at random intervals. Or speak any single verse right now in Emote, Say, Party or Guild chat.</p>"),
   ("The Verse Engine", "A million verses in a megabyte", "<p>After the hand-written verses, the Engine builds each remaining verse from hand-written pieces of the faith, arranged by fourteen sacred forms. No verse repeats within a chapter, and Devotion 42:7731 is the same verse on every computer, forever.</p>"),
   ("Daily Practice", "Verse of the Day, bookmarks and search", "<p>One verse a day, the same for every faithful on the same date, shown when you log in. Bookmark the verses you love, search the hand-written scripture, and target someone to read their name into the verses that call on the faithful.</p>")],
  commands=TABLE_DOD + '<p class="muted center">Also opens from the addon compartment button on your minimap. Reading pauses in combat and during boss chat lockdown, then picks up on the same verse.</p>',
  install_extra=[], restart="<strong>Fully restart World of Warcraft</strong> so the 100 chapter icons load.",
  last="Type <code>/dod</code>. Your Verse of the Day appears when you log in.",
  art='<img class="canon-portrait" src="img/dod/logo.png" alt="The Disciples of Devotion medallion: a violet eye in a ring of metal" width="160" height="160" loading="lazy">',
  more='<p class="center"><a class="btn" href="devotion.html">Open the live Reader and the full table of the Ten Books</a></p>',
  faq=[("Are all one million verses hand-written?", "No. The 2,349 verses that open the chapters are the hand-written scripture of the Coil. The rest are built by the Verse Engine from hand-written pieces, so they read like scripture, never repeat within a chapter, and are the same on every computer."),
       ("Will this slow down my game?", "No. The addon is about a megabyte and builds verses only when you read them."),
       ("Can my guild read together?", "Yes. Agree on a chapter and verse, and everyone's addon shows the same text. One faithful reads aloud; the rest answer the Chant."),
       ("Why does Say only work for single verses?", "World of Warcraft only lets addons speak in /say when you click. Perform This Verse uses your click, so Say works for single verses; timed reading always uses emotes.")]),

 dict(slug="addon-litany-of-begging.html", name="The Litany of Begging", folder="LitanyOfBegging", zip="LitanyOfBegging.zip", version="1.1.0",
  game="Retail · Midnight 12.1", slash="/litany", short="The most boring text of the Coil, 10,000 lines of emotes",
  tagline="Ten thousand lines on the humility and complicated generosity of Xal'Reth. Please read the warning first.",
  desc="The Litany of Begging is a free WoW roleplay addon that performs the deliberately droning 10,000-line Litany of Xal'Reth as emotes, line by line, with search, Titles and a saved place. Read the warning first.",
  lede="The Litany of Begging is, on purpose, the most boring, droning and needlessly complicated text ever written in the name of the Coil. This addon performs it as emotes, one line at a time: start anywhere, perform a single line, jump by Title, search, and read your target into the Litany as the Notional Asker. Or type <code>/litany all</code> and walk away.",
  stats=[("10,000", "lines"), ("20 × 10", "Books × Titles"), ("33 hours", "to perform it all at 12 seconds a line")],
  warn=('<section class="warning" aria-labelledby="lit-warn-h"><p class="kicker">Before you install</p><h2 id="lit-warn-h">A Formal Warning to the Reader</h2>'
        '<p>The Litany is ten thousand lines long. It does not tell a story, does not build to anything, and cross-references itself until it loops. Nothing in it is dark, violent or disturbing. It is simply relentless, and relentless sameness is not good for everyone.</p>'
        '<ul><li>If repetitive, looping or circular text can stir up intrusive thoughts, spiralling anxiety or feeling unwell or unreal for you, please skip it with our blessing. Your wellbeing matters more than any scripture, real or fictional.</li>'
        '<li>You do not need to read it. The addon performs it so nobody has to, and nobody should perform all of it.</li>'
        '<li>If anything here ever leaves you feeling distressed or not yourself, stop, step away, and talk to someone you trust.</li></ul>'
        '<p><a href="litany.html">Read the full warning and the text</a></p></section>'),
  features=[
   ("Perform It", "Line by line, on a timer", "<p>Every line is an emote, every 3 to 60 seconds. <code>/litany all</code> (or the Perform Entire Litany button) posts the whole document from line 1 to line 10,000 without stopping, with a progress bar and time remaining.</p>"),
   ("Find Your Place", "Titles, search and a saved place", "<p>Jump straight to any of the 200 Titles, search the text, or perform one line on demand. Your place is saved across logouts, and the performance pauses in combat and boss chat lockdown, then resumes on the same line.</p>"),
   ("The Notional Asker", "Read someone into the Litany", "<p>Appoint your current target as the Notional Asker, and their name is read into the Litany as it goes, wherever the text calls for one who asks.</p>"),
   ("The Twenty Books", "From Definitions to the Repeal of Nothing", "<p>Twenty Books of ten Titles each, from <em>Of Definitions and Their Interpretation</em> to <em>Of Exceptions to Exceptions</em> and <em>Of the Final Provisions and the Repeal of Nothing</em>.</p>")],
  commands=TABLE_LIT, install_extra=[], restart="Restart World of Warcraft or type <code>/reload</code>.",
  last="Type <code>/litany</code> to open the panel. You have been warned, lovingly.",
  more='<p class="center"><a class="btn ghost" href="litany-of-begging.txt" download>Plain text (10,000 lines)</a></p>',
  faq=[("Should I perform the whole thing?", "No. At the default 12 seconds per line it takes about 33 hours. The option exists because the Litany demands completeness. Nobody should do this."),
       ("Does it contain real-world politics?", "None at all. Despite the word Politics appearing nearby, it is satire of bureaucratic writing, not of any real religion, group or person.")]),

 dict(slug="addon-paranoid-rp.html", name="Paranoid RP", folder="ParanoidRP", zip="ParanoidRP.zip", version="1.0.0", game="Retail · Midnight 12.1",
  slash="/para", short="103 escalating paranoid thoughts about your target",
  tagline="Target someone and slowly, publicly become convinced they are up to something.",
  desc="Paranoid RP is a free WoW roleplay addon: target someone and perform 103 escalating paranoid thoughts as emotes with animations, in five acts that end in light trash talk.",
  lede="Your character glances, takes notes, strings up a conspiracy board, confronts your target, and finally tells them exactly what they think of their rotation. Every thought is an emote with a matching animation (point, gasp, cower, laugh, roar), and their name, class, race, guild and zone are filled in for you.",
  stats=[("103", "paranoid thoughts"), ("5", "acts of growing concern"), ("/para", "to open the panel")],
  features=[
   ("Act I", "The Glance", "<p>It starts small. A look. A second look. Was that a smirk? Your character begins to notice things nobody else would.</p>"),
   ("Acts II and III", "The Evidence and the Theory", "<p>Notes are taken. Timelines are drawn. The conspiracy board goes up, with red string, and the target's class, race, guild and zone are all pinned to it.</p>"),
   ("Acts IV and V", "The Confrontation and the Trash Talk", "<p>Finally your character says it out loud, and then says what they really think of the target's gear and fire-standing. Never about the person, always about the rotation.</p>"),
   ("The Panel", "Timing, animations and quiet mode", "<p>5 to 60 seconds between thoughts, or random timing. Start at any act, skip ahead, turn the animations off, or use <code>/para quiet</code> to keep the thoughts as an inner monologue only you can see. It pauses in combat.</p>")],
  commands=TABLE_PARA, install_extra=[], restart="Restart World of Warcraft or type <code>/reload</code>.",
  last="Target a willing guildmate and type <code>/para start</code>.",
  note='<div class="notice"><strong>Etiquette of the Coil:</strong> the trash talk is light and about gear and fire-standing, never the person, but try it on willing guildmates first, and stop if anyone is not enjoying it.</div>',
  faq=[("Can I keep the thoughts to myself?", "Yes. <code>/para quiet</code> shows the thoughts only in your own chat window, as an inner monologue."),
       ("Can I skip to the confrontation?", "Yes. <code>/para start 4</code> begins at Act IV, and <code>/para skip</code> jumps to the next act.")]),

 dict(slug="addon-brain-rotter-pro.html", name="Brain Rotter Pro", folder="BrainRotterPro", zip="BrainRotterPro.zip", version="1.2", game="Retail · Midnight",
  slash="/rot", short="10,000 lines of Xal'Reth brain rot with emotes",
  tagline="Ten thousand lines of Xal'Reth brain rot, aimed at your target, your group or your online guildies.",
  desc="Brain Rotter Pro is a free WoW addon with 10,000 lines of Xal'Reth brain rot and matching emotes in ten categories, a SAY button, auto-rot, Chaos Mode and key bindings.",
  lede="Every line drops a victim's name into fresh nonsense (\"POV: Lord Xal'Reth just coiled around you in the mailbox line\") with a matching emote: the lizard griddy, the Coil shuffle, aggressive mewing, the forbidden bawk. <strong>New in 1.2:</strong> a SAY button speaks the next line out loud in /say, and auto-rot now starts on Emote so everyone nearby actually sees it.",
  stats=[("10,000", "lines of brain rot"), ("10", "categories"), ("/rot", "to open the panel")],
  features=[
   ("Ten Categories", "From Skibidi Scripture to Final Form", "<p>Skibidi Scripture, Sigma Lizard Grindset, Ohio Swamp Lore, Rizz of the Coil, Aura Farming, Goblin Brain Hours, Molt Mode, Main Character Hiss, Certified Gibberish and Final Form.</p>"),
   ("Auto-rot", "Unhinged or chill", "<p>A speed slider from 1 second (unhinged) to 60 (chill), and Chaos Mode, which shuffles categories, dances and chimes. Auto-rot runs in emote, party, raid and guild chat.</p>"),
   ("The SAY Button", "Out loud, one click at a time", "<p>/say needs a click outside dungeons and raids (Blizzard rule), so on Say the SAY button glows with the waiting line. Inside instances it is automatic.</p>"),
   ("Aim It", "Target, group or guild", "<p>Lines can go to emote, say, party, raid, guild, or only your own chat window. Bind Spew, Auto-rot and the panel to keys for instant rot.</p>")],
  commands=TABLE_ROT, install_extra=[], restart="Restart World of Warcraft or type <code>/reload</code>.",
  last="Type <code>/rot</code> and press Spew. Please rot responsibly: aim it at willing guildmates, not strangers.",
  faq=[("Why do I have to click for /say?", "World of Warcraft only lets addons speak in /say outside instances when you press a key or click. The SAY button (or a key binding) delivers the waiting line with one click."),
       ("Can I see the lines without posting them?", "Yes. Set the channel to your own chat window and the rot stays between you and the Coil.")]),

 dict(slug="addon-edgelord-pro.html", name="Edgelord Pro", folder="EdgelordPro", zip="EdgelordPro.zip", version="1.1", game="Retail · Midnight",
  slash="/edge", short="Edgy PC-mastery gamer emotes that get more annoying over time",
  tagline="Nobody understands you. Your frame rate, your RGB, your pain. Now everyone nearby gets to hear about it.",
  desc="Edgelord Pro is a free WoW roleplay addon with 1,574 edgy PC-mastery gamer emotes in ten categories, aimed at your target, group or guild, with auto-edge, Escalation, poses and keyboard-clack sounds.",
  lede="The brooding cousin of Brain Rotter Pro. Every line is an edgy PC-gamer emote with a matching pose, and your rival's name is filled in for you: <em>sighs darkly: \"Anything under 144 frames is a slideshow, and I didn't come here for a PowerPoint.\"</em> Case fans, frame rates, RGB, mechanical keyboards, energy drinks, damage meters and a tragic backstory nobody asked for. It is charming for about ten minutes. Then it is not. That is the point.",
  stats=[("1,574", "edgy lines"), ("10", "categories"), ("/edge", "to open the panel")],
  features=[
   ("Ten Categories", "From PC Mastery to Final Boss Energy", "<p>PC Mastery, Frame Rate Supremacy, RGB Is a Lifestyle, Mechanical Keyboard Liturgy, Brooding in the Shadows, Nobody Understands Me, Gamer Fuel, Meter Supremacy, Console Peasantry and Final Boss Energy. Every line is unique, and each category plays through before it repeats.</p>"),
   ("Auto-edge", "A line every 20 seconds, forever", "<p>A speed slider from 1 second (unbearable) to 60 (brooding), with Chaos Mode for a random category every line. Auto-edge runs in emote, party, raid and guild chat, and pauses in combat and boss chat lockdowns.</p>"),
   ("Escalation", "It gets worse on purpose", "<p>Tick <strong>Escalation</strong> and each auto line comes one second sooner than the last, down to the channel's minimum (3 seconds in emote, 10 in guild chat). Your guild will notice. That is the feature.</p>"),
   ("The Edge HUD", "New in 1.1: a gaming rig of its own", "<p>A black-glass HUD with a live RGB light strip along the top and bottom, scanlines and a glitching red-and-cyan title. Your categories sit in a <strong>Loadout</strong> down the left, the next line types out in a terminal (<em>C:\\EDGE&gt; next_thought.exe</em>) with a blinking cursor, and an <strong>Edge Level</strong> meter climbs from Mildly Moody to Final Boss as you post. Big POST, SAY, AUTO-EDGE (with a live countdown) and CHAOS buttons, and a floating SAY IT button when a line is waiting and the HUD is closed.</p>"),
   ("The Panel", "Hooded, headset on, RGB ring", "<p>A brooding hooded gamer whose headset ring cycles through every RGB color, with glowing eyes that blink when nobody is looking. Dramatic poses (kneel, roar, flex, salute, glare) every few lines, keyboard-clack and bass-drop sounds, and key bindings for instant edge.</p>")],
  commands=TABLE_EDGE.replace("</table>", "</table>") + '<p class="muted center">/say needs a click outside dungeons and raids (Blizzard rule), so on Say the SAY button glows with the waiting line. Inside instances it is automatic.</p>',
  install_extra=[], restart="<strong>Fully restart World of Warcraft</strong> so the portrait and icons load.",
  last="Type <code>/edge</code>, pick a category, and press EDGE. Please edge responsibly: aim it at willing guildmates, and switch it off when someone asks.",
  note='<div class="notice"><strong>Etiquette of the Coil:</strong> the teasing is about frame rates, keyboards and consoles, never the person. Auto-edge with Escalation in guild chat is a lot. Ask your guild first, and stop the moment anyone asks.</div>',
  faq=[("Is this related to Brain Rotter Pro?", "It is built on the same engine, so it works the same way: categories down the left, a preview of the next line, EDGE, SAY, auto and Chaos. The lines, art, sounds and Escalation are all new."),
       ("How annoying does it get?", "With Escalation on and the speed at 20 seconds, it reaches one line every 3 seconds in emote after about two minutes. We recommend not finding out in a raid."),
       ("Can I keep it to myself?", "Yes. Set the channel to Local and the edge stays in your own chat window, where nobody can understand you.")]),

 dict(slug="addon-master-baiter-pro.html", name="Master Baiter Pro", folder="MasterBaiterPro", zip="MasterBaiterPro.zip", version="2.1", game="Retail · Midnight",
  slash="/mbp", short="One-key fishing with live auction house prices for every catch",
  tagline="One key casts, the same key hooks, and every fish tells you exactly what it is worth.",
  desc="Master Baiter Pro is a free World of Warcraft fishing addon for Midnight: one key casts and hooks, live auction house prices for every catch, your top five catches as icons, a live leaderboard of every angler running it, gold per hour, jackpot alerts and records.",
  lede="Master Baiter Pro turns fishing into one key and turns every fish into a number. Press the key to cast, press it again when the bobber splashes, and the catch pops up with its icon and its auction house price while a gold counter rolls up your haul. It is a helper, not a bot: you press every key, so it plays by Blizzard's rules. Formerly Coil Angler, rebuilt for every angler in Azeroth.",
  stats=[("1", "key to cast and hook"), ("Top 5", "catches, priced live"), ("Live", "leaderboard of every angler")],
  features=[
   ("The One Key", "Cast, hook, repeat", "<p>While a session runs, your chosen key (F by default) casts Fishing when you are idle. The moment your line is in the water, the same key becomes Interact, which reaches the bobber through the game's soft-interact targeting, so there is nothing to aim. Loot it and the key turns back into a cast. Outside a session your key is exactly what it always was.</p><p>Sessions begin when you press Start, type <code>/mbp start</code>, or simply cast Fishing. Loud splash mode turns sound effects up and music down while you fish, and gives every setting back when you stop.</p>"),
   ("Auction House Prices", "Every fish, priced", "<p>Open the auction house and Master Baiter Pro quietly looks up the current lowest price of every fish you have caught, one at a time at the game's own pace, and remembers it. A <em>Price my fish</em> button sits on the auction house window too. If you run <strong>Auctionator</strong> or <strong>TSM</strong> it uses their prices between visits, and vendor value only until it knows better. <code>/mbp prices</code> lists them all.</p>"),
   ("The Haul", "Gold you can watch grow", "<p>Every catch slides in as a toast with Blizzard's own icon for the fish and its price. A big gold counter rolls up your session haul, gold per hour races a meter against your best hour ever, and anything worth your jackpot amount (100 gold by default) sets off a golden burst and a raid-warning shout.</p>"),
   ("Top Five Catches", "Icons with prices on hover", "<p>Your five most valuable catches sit on the panel as their item icons, framed in their quality color, with a count, a value and a bar showing their share of the haul. Hover one for its auction price each, how many you caught, the total and where the price came from. Switch between this session and all time. The summary card at the end of a session shows them too.</p>"),
   ("The Leaderboard", "Compete with every angler", "<p>Every copy of Master Baiter Pro quietly finds the others, so the panel shows how many anglers are online right now. Open the leaderboard to rank everyone by fish caught, by most valuable catch or by this week's catches. Each row shows who is online or fishing this very moment, their count, and the icon and value of their best fish; hover it for the item and its price. Gold, silver and bronze for the top three, and your own row is highlighted.</p><p>It works over a hidden chat channel that carries only addon messages and never appears in your chat windows, so it reaches everyone on your realm and its connected realms. Players you have seen stay on the board (greyed out) when they log off. Prefer to stay hidden? <code>/mbp network off</code>.</p>")],
  more=('<div class="divider"><span>A NOTE ON FAIR PLAY</span></div>'
        '<section class="prose"><h2>Why one key and not none</h2><p>Blizzard lets an addon decide what a button does, but every action has to start with a real key press. Master Baiter Pro lives entirely inside that rule. It never presses anything for you, never moves your character and never reads the game\'s memory. Its auction house lookups are the same searches you could type yourself. Fishing addons that work this way have been used for years.</p>'
        '<p>What gets anglers banned is everything around it: an auto-clicker, a macro keyboard or a weight left on a key. Do not do that. Sit at the water, listen for the splash, press the key.</p></section>'),
  commands=TABLE_MBP + '<p class="muted center">Bind <em>Begin or end a fishing session</em> under Key Bindings &gt; AddOns &gt; Master Baiter Pro. The session pauses in combat, and ends when you mount up or stay idle (3 minutes by default).</p>',
  install_extra=["If you had Coil Angler installed, delete its <code>CoilAngler</code> folder. Master Baiter Pro replaces it."], restart="Restart World of Warcraft or type <code>/reload</code>.",
  last="Type <code>/mbp</code>, walk to some water and press <strong>F</strong>. Then visit the auction house once so it can price your fish.",
  faq=[("Will it get me banned?", "It does nothing without your key press, the same way established fishing addons work. Using an auto-clicker, a macro keyboard or a weighted key to press it for you is botting, and that is what gets caught."),
       ("Why do my fish show vendor prices?", "It has not seen them on the auction house yet. Open the auction house once and it prices everything you have caught. Auctionator or TSM fill in between visits."),
       ("The key does not loot the bobber.", "Make sure soft interact is on (<code>/mbp soft on</code>) and face the water you cast into. If you already use F for something else, pick another key with <code>/mbp key G</code>."),
       ("Does it know when the fish bites?", "No, and that is the point: the splash is yours to hear. Loud splash mode makes sure you do."),
       ("Who is on the leaderboard?", "Everyone running Master Baiter Pro that your game can reach: players on your realm and its connected realms, plus your guild. Blizzard gives addons no way to talk across every realm at once, so someone on a distant realm won't show up. Numbers are reported by each player's own addon."),
       ("I had Coil Angler. Do my records carry over?", "No. Master Baiter Pro starts a fresh record book. Delete the old CoilAngler folder so the two do not fight over your key.")]),

 dict(slug="addon-drama-queen-pro.html", name="Drama Queen Pro", folder="DramaQueen", zip="DramaQueen.zip", version="3.3", game="Retail · Midnight",
  slash="/dq", short="Deadpan fake personal drama every five minutes (use at your own risk)",
  tagline="Every five minutes, a piece of deadpan, real-sounding personal drama, under your name. Read the disclaimer first.",
  desc="Drama Queen Pro is a prank WoW addon that posts deadpan fictional personal drama to guild chat, emote and /say every five minutes, with the Queen Detector. Use at your own risk: read the disclaimer first.",
  lede="Drama Queen posts a piece of deadpan, real-sounding personal drama to guild chat under your name, acts it out as an emote (<em>stares at their phone. \"I think I'm pregnant.\"</em>) and says it out loud in /say. No lizard jokes, no game jokes: pregnancy scares, arrests, a second phone found in the car, eviction notices. It reads like news. That is the point, and also the problem.",
  stats=[("6,000", "dramatic updates"), ("3", "guild, emote and say"), ("Queen Detector", "see who else runs it")],
  risk=True,
  features=[
   ("New in 3.3", "Two simple switches", "<p><em>Cause drama in guild</em> posts the drama in guild chat, and <em>Cause drama publicly</em> emotes it and says it in /say for everyone nearby. Tick either, both or neither.</p>"),
   ("The Drama", "6,000 updates and running storylines", "<p>6,000 one-off updates that never repeat until every one has been used, plus storylines that play out over consecutive posts: the pregnancy test, the second phone, the eviction, \"Kevin Gym\". It never names real people, never asks anyone for gold, money or help, and leaves out self-harm, suicide and abuse.</p>"),
   ("The Queen Detector", "See who else is running it", "<p>Every copy quietly checks in, so a panel shows who else runs Drama Queen Pro and how many of you there are, in your guild, your group or anywhere on the Drama Queen network. You get a notice when a new queen appears.</p>"),
   ("The Queen Herself", "Logo, Say button and Full Support", "<p>The tearful Queen sits on the panel and on the glowing Say it button. Pairs with <a href=\"addon-full-support.html\">Full Support</a>, so guildmates can answer your drama with heartfelt support automatically. Only one copy per guild posts, and it pauses in combat and boss chat lockdowns.</p>")],
  commands=TABLE_DQ, install_extra=[], restart="<strong>Fully restart the game.</strong> You should see \"Drama Queen Pro 3.3 loaded\" in your chat window.",
  last="Type <code>/dq</code>, read the switches, and tell your guild it is running.",
  art='<img class="dq-logo" src="img/dramaqueen-logo.svg" alt="Drama Queen Pro logo: a tearful queen in a rhinestone tiara holding a cracked phone" width="120" height="120">',
  disclaimer=True,
  faq=[("How often does it post?", "Every five minutes by default. Change it from 1 to 60 minutes with <code>/dq every 10</code>."),
       ("Can I hide from the Queen Detector?", "Leave the Drama Queen network in the Settings tab or with <code>/dq network</code>. Copies in your guild and group can still see that you run it.")]),

 dict(slug="addon-full-support.html", name="Full Support", folder="FullSupport", zip="FullSupport.zip", version="1.0", game="Retail · Midnight",
  slash="/fs", short="Automatic supportive replies to Drama Queen posts",
  tagline="Every crisis deserves a friend. Now every crisis gets one, automatically.",
  desc="Full Support is a free WoW addon companion to Drama Queen Pro that answers every Drama Queen post in guild chat with a fitting supportive reply on your behalf. Use at your own risk.",
  lede="Every time a guildmate's Drama Queen posts a new crisis, Full Support answers in guild chat on your behalf, a few seconds later, with a supportive sentence that fits: pregnancy gets pregnancy support, an arrest gets court-date sympathy, a second phone gets \"you deserve SO much better than that.\" The poster's name is filled in for you.",
  stats=[("56", "supportive replies"), ("7", "kinds of crisis"), ("/fs", "on, off and test")],
  risk=True,
  features=[
   ("How It Knows", "Only drama, never ordinary chat", "<p>It recognizes Drama Queen posts by a hidden signal from <a href=\"addon-drama-queen-pro.html\">Drama Queen Pro</a> 3.1 or newer, so it never replies to ordinary guild chat and never answers your own posts.</p>"),
   ("The Replies", "Seven kinds of crisis", "<p>Pregnancy (\"Sending you so much love, Vexa. One day at a time.\"), court and jail, cheating, eviction, work, family and exes, plus a supply of all-purpose comfort.</p>"),
   ("Like a Real Friend", "Typing, waiting, pacing", "<p>It waits 4 to 12 seconds like a real person typing, supports each person at most once a minute, and pauses in combat.</p>"),
   ("You Need Both", "A companion relic", "<p>Full Support answers Drama Queen Pro posts, so someone in your guild needs to be running Drama Queen Pro 3.1 or newer for it to do anything.</p>")],
  commands=TABLE_FS, install_extra=[], restart="Restart World of Warcraft or type <code>/reload</code>.",
  last="Type <code>/fs test</code> to see an example reply.",
  disclaimer=True,
  faq=[("Will people think I mean it?", "Yes. Full Support sounds sincere, because that is the joke, and the person you are \"supporting\" may not have agreed to the bit. Ask first, tell your guild, and switch it off the moment anyone asks."),
       ("Does it reply to real problems?", "No. It only answers posts carrying Drama Queen's hidden signal. If a guildmate shares something real, answer them yourself.")]),
]

# Panel previews (img/shots/<name>.jpg), recreated from each addon's code. slug -> (image, alt text)
SHOTS = {
    "addon-vyrenna-rp.html": ("vyrenna-rp.jpg", "Vyrenna RP panel in green and gold: Vyrenna in a ring of crescents, chapter I.4 The Four Lights being read, and the emotes it produces",
                              "Panel preview, recreated from the addon's own textures. In game it uses your own character, target and guild."),
    "addon-xalreth-rp.html": ("xalreth-rp.jpg", "Xal'Reth RP panel: the glowing gold frame, a rite in progress and the emotes it produces"),
    "addon-disciples-of-devotion.html": ("disciples-of-devotion.jpg", "Disciples of Devotion: the chapter list with medallion icons and the verse reader"),
    "addon-litany-of-begging.html": ("litany-of-begging.jpg", "The Litany of Begging panel performing line 4817, with the Perform Entire Litany progress bar"),
    "addon-paranoid-rp.html": ("paranoid-rp.jpg", "Paranoid RP panel watching a target in Act III, The Theory"),
    "addon-brain-rotter-pro.html": ("brain-rotter-pro.jpg", "Brain Rotter Pro panel with categories, the next brain rot line and the SAY IT button"),
    "addon-edgelord-pro.html": ("edgelord-pro.jpg", "The Edgelord Pro 1.1 HUD: RGB light strip, glitching title, Edge Level meter, the Loadout of ten categories, the terminal with the next edgy thought and the chat it produces"),
    "addon-drama-queen-pro.html": ("drama-queen-pro.jpg", "Drama Queen Pro panel with the two drama switches, the Say it button with the Queen and the resulting chat"),
    "addon-full-support.html": ("full-support.jpg", "Guild chat showing Drama Queen posts answered by Full Support",
                                "Chat preview: Drama Queen posts and Full Support's replies, recreated from the addons' code."),
}

def shot_html(slug):
    if slug not in SHOTS: return ""
    img, alt, *cap = SHOTS[slug]
    cap = cap[0] if cap else "Panel preview, recreated from the addon's code. In game it uses your own character, target and guild."
    return ('\n  <div class="divider"><span>SCREENSHOTS</span></div>\n'
            f'  <section id="screenshots"><figure class="addon-shot"><a href="img/shots/{img}" target="_blank" rel="noopener"><img src="img/shots/{img}" alt="{alt.replace('"', '&quot;')}" loading="lazy"></a>'
            f"<figcaption>{cap}</figcaption></figure></section>")

def shell(a, main_html, ld):
    t = SRC
    t = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", t, flags=re.S)
    title = f"{a['name']} · Free WoW Roleplay Addon · Cult of Xal'Reth"
    t = re.sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>", t, count=1, flags=re.S)
    for attr in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        t = re.sub(rf'(<meta {attr} content=")[^"]*(")', lambda m: m.group(1) + esc(a["desc"]) + m.group(2), t, count=1)
    for attr in ('property="og:title"', 'name="twitter:title"'):
        t = re.sub(rf'(<meta {attr} content=")[^"]*(")', lambda m: m.group(1) + esc(a["name"] + " · WoW Roleplay Addon") + m.group(2), t, count=1)
    t = re.sub(r'(<meta name="keywords" content=")[^"]*(")', lambda m: m.group(1) + esc(f"{a['name']}, {a['name']} addon, WoW roleplay addon, WoW emote addon, RP addon Midnight, free WoW addons, Xal'Reth, Cult of Xal'Reth") + m.group(2), t, count=1)
    url = BASE + a["slug"]
    t = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), t, count=1)
    t = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), t, count=1)
    t = t.replace('<link rel="sitemap"', "".join(f'<script type="application/ld+json">{json.dumps(x)}</script>\n' for x in ld) + '<link rel="sitemap"', 1)
    t = re.sub(r"<main>.*?</main>", lambda m: "<main>\n" + main_html + "\n</main>", t, count=1, flags=re.S)
    if a.get("css"):  # an addon page with its own look (e.g. Vyrenna RP in green and gold)
        t = t.replace('<link rel="stylesheet" href="style.css">', f'<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="{a["css"]}">', 1)
        t = t.replace("<body>", f'<body class="{a["theme"]}">', 1)
    return t

def build(a, others):
    slash_stat = "" if any(b == a["slash"] for b, _ in a["stats"]) else f'<div class="stat"><b>{esc(a["slash"])}</b><span>slash command</span></div>'
    stats = "".join(f'<div class="stat"><b>{esc(b)}</b><span>{esc(s)}</span></div>' for b, s in a["stats"])
    tags = f'<span class="tag green">Version {esc(a["version"])}</span><span class="tag">{esc(a["game"])}</span><span class="tag">Free</span>'
    if a.get("risk"): tags += '<span class="tag">Use at your own risk</span>'
    buttons = f'<a class="btn big" href="{a["zip"]}" download>Download {esc(a["name"])}</a><a class="btn ghost" href="#install">How to install</a><a class="btn ghost" href="#commands">Commands</a>'
    if a.get("disclaimer"): buttons += '<a class="btn ghost" href="#disclaimer">Disclaimer</a>'
    size = os.path.getsize(a["zip"]); size = f"{size/1048576:.1f} MB" if size > 1048576 else f"{max(1, round(size/1024))} KB"
    feats = "".join(f'<article class="card"><p class="kicker">{esc(k)}</p><h3>{esc(h)}</h3>{body}</article>' for k, h, body in a["features"])
    steps = [f'<a href="{a["zip"]}" download>Download {a["zip"]}</a> ({size}).'] + a["install_extra"] + [
        f'Extract the zip. Move the <code>{a["folder"]}</code> folder into <code>World of Warcraft\\_retail_\\Interface\\AddOns\\</code>. On Windows this is usually <code>C:\\Program Files (x86)\\World of Warcraft\\_retail_\\Interface\\AddOns</code>.',
        "Make sure the folder sits directly inside <code>AddOns</code>, not in a folder inside a folder.", a["restart"], a["last"]]
    faq = "".join(f"<details><summary>{esc(q)}</summary><p>{ans}</p></details>" for q, ans in a.get("faq", []))
    rel = "".join(f'<article class="card"><p class="kicker">{esc(o["slash"])}</p><h3><a href="{o["slug"]}">{esc(o["name"])}</a></h3><p class="muted">{esc(o["short"])}.</p></article>' for o in others)
    risk_note = ('<p class="muted"><strong>Use at your own risk.</strong> Read the <a href="#disclaimer">disclaimer</a> before you install it.</p>' if a.get("disclaimer") else "")
    main = f'''<header class="page-head"><p class="eyebrow"><a href="addons.html">Relics of the Coil</a> · World of Warcraft Addon</p><h1>{esc(a["name"])}</h1><p>{esc(a["tagline"])}</p></header>
<div class="wrap">
  {a.get("warn", "")}{a.get("banner", "")}
  <section>
    <article class="card addon featured" id="{a["folder"]}">
      <div class="featured-grid">
        <div>
          {a.get("art", "") if "dq-logo" in a.get("art", "") else ""}
          <p class="kicker">Free WoW Addon · Available Now · {size}</p>
          <div class="meta">{tags}</div>
          <p class="lede">{a["lede"]}</p>
          {risk_note}
          <div class="actions">{buttons}</div>
        </div>
        <div class="stat-col">{stats}{slash_stat}</div>
      </div>
    </article>
  </section>{shot_html(a["slug"])}
  {a.get("note", "")}
  <div class="divider"><span>WHAT IT DOES</span></div>
  <section class="grid two">{feats}</section>
  {a.get("more", "")}
  <div class="divider"><span>COMMANDS</span></div>
  <section class="prose" id="commands">{a["commands"]}</section>
  {DISCLAIMER if a.get("disclaimer") else ""}
  <div class="divider"><span>THE RITE OF INSTALLATION</span></div>
  <section class="prose install" id="install">
    {a.get("art", "") if "canon-portrait" in a.get("art", "") else ""}
    <h2>How to install {esc(a["name"])}</h2>
    <ol>{"".join(f"<li>{s}</li>" for s in steps)}</ol>
    {STEAM}
  </section>
  {f'<div class="divider"><span>QUESTIONS</span></div><section class="prose faq">{faq}</section>' if faq else ""}
  <div class="divider"><span>OTHER RELICS OF THE COIL</span></div>
  <section class="grid three">{rel}</section>
  <p class="center"><a class="btn ghost" href="addons.html">All addons</a> <a class="btn ghost" href="https://discord.gg/wYakHBHPz" target="_blank" rel="noopener">Ask in our Discord</a></p>
</div>'''
    ld = [{"@context": "https://schema.org", "@type": "SoftwareApplication", "name": a["name"], "description": a["desc"],
           "applicationCategory": "GameApplication", "operatingSystem": "World of Warcraft Retail", "softwareVersion": a["version"],
           "downloadUrl": BASE + a["zip"], "url": BASE + a["slug"], "image": BASE + "xalreth-og.jpg", "isAccessibleForFree": True,
           "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "The Cult of Xal'Reth", "item": BASE},
              {"@type": "ListItem", "position": 2, "name": "Addons", "item": BASE + "addons.html"},
              {"@type": "ListItem", "position": 3, "name": a["name"], "item": BASE + a["slug"]}]}]
    open(a["slug"], "w", encoding="utf-8").write(shell(a, main, ld))

if __name__ == "__main__":
    for a in ADDONS:
        build(a, [o for o in ADDONS if o is not a])
        print(a["slug"])
