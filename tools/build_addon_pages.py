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
TABLE_PARA = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/para</code>.*?</table>')
TABLE_ROT = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/rot</code>.*?</table>')
TABLE_DQ = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/dq</code>.*?</table>')
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
       ("Does it work with the other relics?", "Yes. Every addon has its own commands: <code>/xrp</code>, <code>/dod</code>, <code>/litany</code>, <code>/para</code>, <code>/rot</code>, <code>/dq</code> and <code>/fs</code>.")]),

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
  {a.get("warn", "")}
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
  </section>
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
