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
TABLE_MBF = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/mbf</code>.*?</table>')
TABLE_SC = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/story</code>.*?</table>')
TABLE_NH = grab(r'<table class="ranks cmds"><thead><tr><th>Command</th><th>What it does</th></tr></thead><tbody><tr><td><code>/nh</code>.*?</table>')
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
  curseforge="https://www.curseforge.com/wow/addons/xalrethrp",
  cf_text="Let the rites come to you. Install Xal'Reth RP with the CurseForge app and every new edition of the Book arrives by itself, patiently, the way the Coil prefers. Following it there, or leaving a word for the faithful, helps other roleplayers find the Coil.",
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

 dict(slug="addon-storycaster.html", name="StoryCaster", folder="StoryCaster", zip="StoryCaster.zip", version="1.2.0", game="Retail · Midnight",
  slash="/story", short="Paste your own roleplay and perform it as emotes with animations",
  tagline="Write your own roleplay and perform it: /emotes on a timer, with real character animations.",
  desc="StoryCaster is a free World of Warcraft roleplay addon for Midnight and WoW Forever: paste your own story and it becomes /emote lines performed on a timer, with animated emotes, 18 animation buttons, random timing, a test mode and a Lore Library of ready-made roleplay for every class, race and faction.",
  lede="Paste a story, a speech or a whole scene, alone or as a duet, and StoryCaster turns it into /emote lines that play out on a timer while your character acts it out: a bow, a wave, a laugh, a kneel. Your words, your timing, no typing in the middle of the moment. Eighteen animated emote buttons on the panel cover everything in between.",
  stats=[("41", "ready-made lore scripts"), ("18", "animated emote buttons"), ("/story", "to open the panel")],
  art='<picture><source srcset="img/addons/storycaster-logo.webp" type="image/webp"><img class="dq-logo mbp-logo" src="img/addons/storycaster-logo.png" alt="StoryCaster logo: a glowing open hand reaching out of violet smoke, in a round frame" width="140" height="140"></picture>',
  features=[
   ("The Lore Library", "Ready-made roleplay for every character", "<p>Not sure what to say? Open <strong>Lore</strong> on the panel (or <code>/story lore</code>) and pick from three dropdowns: <strong>Class</strong> (all 13), <strong>Faction</strong> (Alliance, Horde or unaligned) and <strong>Race</strong> (all 25). Each one starts on your own character. Every choice is an original script of 50 lines or more, in scenes, with animations and a few lines said aloud: a paladin's vigil, a death knight remembering being alive, a goblin's first deal, a dracthyr's first sunrise.</p><p><strong>Perform</strong> saves it to your scripts and plays it on your timer, <strong>Preview</strong> shows it in your own chat only, and <strong>Edit</strong> opens a copy in Write a Script to make it yours. <code>/story lore blood elf</code> performs one straight away. Target someone first and lines that mention them use their name.</p>"),
   ("Duets and Group Scenes", "Everyone plays their part", "<p>Start a line with a character's name, like <code>[Brannoc] draws his blade.</code>, and that line belongs to them. Press Play and your StoryCaster invites the others (through your party or raid, or a whisper), then runs the scene: each player's own StoryCaster performs their lines on cue, with their own animations. Everyone needs StoryCaster and presses Join.</p>"),
   ("Deliver, Scenes and Sharing", "Live RP, on cue", "<p><code>/s</code>, <code>/y</code>, <code>/p</code>, <code>/ra</code> and <code>/g</code> lines are spoken in that chat; /say and /yell wait for the <strong>Deliver</strong> button or key, because the game only allows them from a key press. <em>Manual</em> mode makes every line wait for Deliver, like a teleprompter. <code>## Act Two</code> starts a scene you can jump to. <strong>Share</strong> copies a script as text for friends, and <strong>Edit Lines</strong> lets you start from, test, move or delete any line.</p>"),
   ("Placeholders and Pacing", "Never the same twice", "<p><code>{target}</code>, <code>{name}</code>, <code>{class}</code>, <code>{race}</code>, <code>{zone}</code>, <code>{subzone}</code> and <code>{time}</code> fill themselves in, and <code>{smiles|grins|smirks}</code> picks one at random. <em>Auto pace</em> gives longer lines more time. <strong>Ambient</strong> runs a quiet loop of small idle actions for standing RP, and five starter scripts show what is possible. Compact mode and key bindings (Key Bindings &gt; AddOns &gt; StoryCaster) keep it out of your way.</p><p><strong>Never spam:</strong> on its own StoryCaster never posts faster than one line every 15 seconds, or more than 4 lines a minute, whatever the timer or a <code>/pause</code> says. Only your own Deliver presses go faster.</p>"),
   ("Write a Script", "Paste it, it becomes emotes", "<p>Paste or type your roleplay. StoryCaster cuts it into emotes one per sentence, one per line, or packed as full as chat allows, splits anything too long for the 255-character limit, and removes your name, <code>/e</code> and numbering for you. A live count and a private <em>Preview in Chat</em> show exactly what will be said.</p><p>Macro-style lines work too: <code>/pause 4</code> on its own line waits four seconds before the next emote, <code>/bow</code> or <code>/wave</code> plays the animation, and <code>/s</code> or <code>/y</code> lines become <em>says, \"...\"</em> emotes. A slash command is never posted as words.</p>"),
   ("Animations", "Act it out", "<p>Write <code>[bow]</code>, <code>[wave]</code> or <code>[kneel]</code> anywhere in a line and your character plays it as the line is posted; a line with only <code>[nod]</code> just plays the animation. With <em>Auto animate</em> on, lines that say bows, waves, laughs, cries or cheers animate on their own.</p>"),
   ("The Panel", "Play, pause, timing", "<p>Play, Pause, Next and Stop, your saved scripts, a 15 to 60 second timer, random timing, Loop, Shuffle and a Test mode that shows the emotes only to you. It holds during combat and boss fights and picks up where it stopped.</p>"),
   ("Eighteen Buttons", "Emotes on demand", "<p>Wave, Bow, Nod, Shake head, Talk, Point, Laugh, Chuckle, Cheer, Clap, Salute, Kneel, Cry, Shrug, Dance, Roar, Flex and Gasp, one click each, aimed at your target. <code>{target}</code> in a script becomes your target's name.</p>")],
  commands=TABLE_SC + '<p class="muted center">Write in the third person, the way emotes read: the game puts your name first, so <em>walks to the door.</em> becomes <em>YourName walks to the door.</em></p>',
  install_extra=["Playing WoW Forever? Download <a href=\"StoryCaster-Forever.zip\" download>StoryCaster for Forever</a> instead and move its <code>StoryCaster</code> folder into <code>_forever_\\Interface\\AddOns</code>."],
  restart="Restart World of Warcraft or type <code>/reload</code>.",
  last="Type <code>/story</code>, press <strong>Write a Script</strong>, paste your scene and press <strong>Save and Perform</strong>.",
  faq=[("Why does a second line appear when my character bows?", "That is the game: every animated emote prints its own line (\"YourName bows.\"). Turn animations off in scripts with <code>/story animations</code> if you only want your own words."),
       ("Can I rehearse without anyone seeing?", "Yes. Test mode shows every emote only in your own chat window, and <code>/story preview</code> reads a whole script to you."),
       ("Can I edit a script later?", "Yes. Type its name in the Write a Script window and press Load: every emote comes back one per line, with its [animation] tag.")]),

 dict(slug="addon-no-hablo.html", name="No Hablo", folder="NoHablo", zip="NoHablo.zip", version="1.0", game="Retail · Midnight",
  slash="/nh", short="One red button that hides Spanish text chat from your own screen",
  tagline="A language filter for your own chat: one red button hides text chat written in Spanish.",
  desc="No Hablo is a free World of Warcraft chat filter for Midnight and WoW Forever: one red Block Spanish button hides text chat written in Spanish from your own chat windows and mutes Spanish speakers for the session.",
  lede="Busy trade chat on a bilingual realm, and you only read English? Click the red <strong>Block Spanish</strong> button and every line written in Spanish disappears from your chat windows. Anyone who writes in Spanish is muted for the rest of your session, so the conversation does not come back half-translated. Click it again and everything shows. It only changes your own screen.",
  stats=[("1", "red button"), ("16", "kinds of chat filtered"), ("/nh", "to show the button")],
  features=[
   ("The Red Button", "Block Spanish", "<p>A small box you can drag anywhere. Click <strong>Block Spanish</strong> and it lights up as <strong>Blocking Spanish</strong>, with a count of the lines hidden and the players muted. Click again to switch it off. <code>/nh</code> hides or shows the box.</p>"),
   ("Every Text Chat", "Sixteen kinds", "<p>Say, yell and emotes, trade, general and every other channel, whispers and Battle.net whispers, guild and officer, party, raid, raid warnings, instance chat and communities. Your own lines are never touched.</p>"),
   ("How It Knows", "Words and spelling, weighed", "<p>It looks for words that are Spanish and not English (hola, gracias, alguien, quiero, porfa, jaja) and Spanish spelling (ñ, ¿, ¡, accents), and weighs them against the English in the line. \"No problem amigo\", \"nada much\" and \"taco tuesday\" stay put. <code>/nh test</code> shows what it would do with any line.</p>"),
   ("Only Your Screen", "Nobody is reported", "<p>Nothing is sent anywhere, nobody is reported or put on your ignore list, and nobody knows you are using it. <code>/nh list</code> shows who is muted, <code>/nh allow Name</code> lets someone back, and <code>/nh speakers</code> hides only the Spanish lines instead of the whole speaker.</p>")],
  commands=TABLE_NH + '<p class="muted center">The setting is remembered between sessions; the list of muted players starts fresh each time you log in.</p>',
  install_extra=["Playing WoW Forever? Download <a href=\"NoHablo-Forever.zip\" download>No Hablo for Forever</a> instead and move its <code>NoHablo</code> folder into <code>_forever_\\Interface\\AddOns</code>."],
  restart="Restart World of Warcraft or type <code>/reload</code>.",
  last="Click the red <strong>Block Spanish</strong> button near the top of your screen.",
  note='<div class="notice"><strong>Etiquette of the Coil:</strong> No Hablo is for your own reading comfort. Plenty of the faithful speak Spanish; be kind in chat, and never tell anyone you have filtered them.</div>',
  faq=[("Does anyone know I am filtering them?", "No. It only changes what your own chat windows show. Nothing is sent, reported or added to your ignore list."),
       ("It hid an English line, or missed a Spanish one. Why?", "It reads words and spelling, so a line with a quoted Spanish phrase (\"mi casa es su casa\") can be hidden, and very short slang can slip through. <code>/nh allow Name</code> lets a player back, and <code>/nh test</code> shows what it would do."),
       ("Some lines in a boss fight were not filtered.", "In Midnight, Blizzard hides some chat text from addons during encounters. No Hablo leaves those lines exactly as they arrive.")]),

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

 dict(slug="addon-master-baiter-pro.html", name="Master Baiter Pro", folder="MasterBaiterPro", zip="MasterBaiterPro.zip", version="2.3.1", game="Retail · Midnight",
  curseforge="https://www.curseforge.com/wow/addons/master-baiter-pro",
  cf_text="Rather it kept itself up to date? Install Master Baiter Pro with the CurseForge app and every new version arrives on its own: no zips, no dragging folders, just more fish. A follow, a thumbs-up or a comment there helps more anglers find the one key.",
  slash="/mbp", short="One-key fishing with live auction house prices for every catch",
  tagline="One key casts, the same key hooks, and every fish tells you exactly what it is worth.",
  desc="Master Baiter Pro is a free World of Warcraft fishing addon for Midnight: one key casts and hooks, live auction house prices for every catch, your top five catches as icons, a live leaderboard of every angler running it, gold per hour, jackpot alerts and records.",
  lede="Master Baiter Pro turns fishing into one key and turns every fish into a number. Press the key to cast, press it again when the bobber splashes, and the catch pops up with its icon and its auction house price while a gold counter rolls up your haul. It is a helper, not a bot: you press every key, so it plays by Blizzard's rules. Formerly Coil Angler, rebuilt for every angler in Azeroth.",
  stats=[("1", "key to cast and hook"), ("Top 5", "catches, priced live"), ("Live", "leaderboard of every angler")],
  note='<div class="divider"><span>WATCH IT WORK</span></div><section id="watch"><figure class="addon-shot addon-video"><video src="media/master-baiter-pro-cast-and-catch.mp4" poster="media/master-baiter-pro-cast-and-catch.jpg" controls autoplay muted loop playsinline preload="metadata" width="1280" height="720" aria-label="Master Baiter Pro in game: one key casts, the bobber splashes, the same key hooks the fish and the panel adds it to the top catches"></video><figcaption>One key casts, one key hooks, and every catch lands in the panel with its price. Recorded in game on Moon Guard.</figcaption></figure></section>',
  art='<picture><source srcset="img/addons/master-baiter-pro-logo.webp" type="image/webp"><img class="dq-logo mbp-logo" src="img/addons/master-baiter-pro-logo.png" alt="Master Baiter Pro logo: a grinning one-eyed worm beside a golden fish hook" width="140" height="140"></picture>',
  features=[
   ("The Glow", "New in 2.3", "<p>The panel shines like deep water at night. A soft aura round the glass follows your session: dim while you rest, green when you are ready, bright fast water while your line is out, red in combat and gold when you are on record pace. A spark with a comet tail races round the rim, bubbles rise through the glass, stars twinkle over the title and a band of light sweeps the buttons. Every catch throws a burst of coins out of the haul counter; rare catches and jackpots light up the whole window, the catch card glows in the fish's quality colour, and the session summary opens in a shower of gold. The leaderboard glows too.</p><p>Prefer it calm? <code>/mbp glow off</code> stops the moving lights and keeps a still glow.</p>"),
   ("The One Key", "Cast, hook, repeat", "<p>While a session runs, your chosen key (F by default) casts Fishing when you are idle. The moment your line is in the water, the same key becomes Interact, which reaches the bobber through the game's soft-interact targeting, so there is nothing to aim. Loot it and the key turns back into a cast. Outside a session your key is exactly what it always was.</p><p>Sessions begin when you press Start, type <code>/mbp start</code>, or simply cast Fishing. Loud splash mode turns sound effects up and music down while you fish, and gives every setting back when you stop.</p>"),
   ("Auction House Prices", "Every fish, priced", "<p>Open the auction house and Master Baiter Pro quietly looks up the current lowest price of every fish you have caught, one at a time at the game's own pace, and remembers it. A <em>Price my fish</em> button sits on the auction house window too. If you run <strong>Auctionator</strong> or <strong>TSM</strong> it uses their prices between visits, and vendor value only until it knows better. <code>/mbp prices</code> lists them all.</p>"),
   ("The Haul", "Gold you can watch grow", "<p>Every catch slides in as a toast with Blizzard's own icon for the fish and its price. A big gold counter rolls up your session haul, gold per hour races a meter against your best hour ever, and anything worth your jackpot amount (100 gold by default) sets off a golden burst and a raid-warning shout.</p>"),
   ("Top Five Catches", "Icons with prices on hover", "<p>Your five most valuable catches sit on the panel as their item icons, framed in their quality color, with a count, a value and a bar showing their share of the haul. Hover one for its auction price each, how many you caught, the total and where the price came from. Switch between this session and all time. The summary card at the end of a session shows them too.</p>"),
   ("The Leaderboard", "Compete with every angler", "<p>Every copy of Master Baiter Pro quietly finds the others, so the panel shows how many anglers are online right now. Open the leaderboard to rank everyone by fish caught, by most valuable catch or by this week's catches. Each row shows who is online or fishing this very moment, their count, and the icon and value of their best fish; hover it for the item and its price. Gold, silver and bronze for the top three, and your own row is highlighted.</p><p>It works over a hidden chat channel that carries only addon messages and never appears in your chat windows, so it reaches everyone on your realm and its connected realms. Players you have seen stay on the board (greyed out) when they log off. Since 2.2 each angler also shares their best gold per hour. Prefer to stay hidden? <code>/mbp network off</code>.</p>"),
   ("The Export", "Your records, on a website", "<p>New in 2.2: <code>/mbp export</code> opens a window with your records (fish caught, gold caught, best catch, best gold per hour, streaks, your ten most valuable catches and your latest jackpots) and every angler your game has heard on the network, ready to copy with Ctrl+C. The same export is kept in your SavedVariables file after a <code>/reload</code>.</p><p>That is what fills <a href=\"fishing.html\">the Anglers of the Coil</a>, our fishing leaderboard, where every catch is priced at this hour's Moon Guard auction house. Send your export to an officer to join it.</p>")],
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
       ("How do I get onto the website's fishing leaderboard?", "Type <code>/mbp export</code>, copy it, and send it to an officer; they add it to <a href=\"fishing.html\">the Anglers of the Coil</a>. Anyone your export has heard on the network shows up there too, with the numbers they shared. Ask through the contact page to be left off."),
       ("I had Coil Angler. Do my records carry over?", "No. Master Baiter Pro starts a fresh record book. Delete the old CoilAngler folder so the two do not fight over your key.")]),

 dict(slug="addon-master-bait-forever.html", name="Master Bait Forever", folder="MasterBaitForever", zip="MasterBaitForever.zip", version="1.1.1", game="WoW Forever",
  client="_forever_", slash="/mbf", short="Master Baiter Pro, rebuilt for World of Warcraft: Forever",
  tagline="One key casts, the same key hooks, and every fish tells you what it is worth, now in World of Warcraft: Forever.",
  desc="Master Bait Forever is a free fishing addon for World of Warcraft: Forever (interface 16001): one-key cast and hook, auction house prices for every catch, top five catch icons, a live leaderboard, jackpot alerts and records.",
  lede="Master Bait Forever is Master Baiter Pro rebuilt for World of Warcraft: Forever. Press one key to cast, press it again on the splash, and every catch pops up with its icon and auction price while the haul counter rolls up. It is a helper, not a bot: you press every key.",
  stats=[("1", "key to cast and hook"), ("16001", "Forever interface"), ("Live", "leaderboard of Forever anglers")],
  features=[
   ("The Glow", "New in 1.1", "<p>The panel shines like deep water at night. A soft aura round the glass follows your session: dim while you rest, green when you are ready, bright fast water while your line is out, red in combat and gold when you are on record pace. A spark with a comet tail races round the rim, bubbles rise through the glass, stars twinkle over the title and a band of light sweeps the buttons. Every catch throws a burst of coins out of the haul counter; rare catches and jackpots light up the whole window, the catch card glows in the fish's quality colour, and the session summary opens in a shower of gold. The leaderboard glows too.</p><p>Prefer it calm? <code>/mbf glow off</code> stops the moving lights and keeps a still glow.</p>"),
   ("Built for Forever", "Same addon, new world", "<p>It loads in the Forever client (interface 16001), recognises the original Fishing spell and its ranks, and scales everything to Forever's leaner economy: the haul shows silver until you are into real gold, the jackpot starts at 5 gold, and the gold achievements are 100 and 1,000 gold.</p>"),
   ("Auction House Prices", "Either kind of auction house", "<p>Open the auction house and it prices every fish you have caught. It understands both the modern item-key auction house and the original browse-and-page one, so it works whichever Forever uses, and it reads Auctionator's Forever prices between visits. Vendor value fills in until then.</p>"),
   ("The One Key", "Cast, hook, repeat", "<p>Your chosen key (F by default) casts Fishing while you are idle and becomes Interact while your line is in the water, reaching the bobber through soft interact. Loud splash mode turns effects up and music down, and gives everything back when you stop.</p>"),
   ("Top Five and the Leaderboard", "Icons, prices, rivals", "<p>Your five most valuable catches sit on the panel as their item icons with prices on hover. The leaderboard finds every other Master Bait Forever angler your game can reach, shows how many are online, and ranks them by fish caught, best catch or this week. It runs on its own Forever network, separate from Master Baiter Pro.</p>")],
  more=('<div class="divider"><span>A NOTE ON FAIR PLAY</span></div>'
        '<section class="prose"><h2>One key, never zero</h2><p>Every action still starts with your own key press, exactly like Master Baiter Pro. It never presses anything for you. An auto-clicker or a weighted key is botting, and that is what gets accounts banned.</p></section>'),
  commands=TABLE_MBF + '<p class="muted center">Bind <em>Begin or end a fishing session</em> under Key Bindings &gt; AddOns &gt; Master Bait Forever.</p>',
  install_extra=["This is the Forever version. For Midnight, get <a href=\"addon-master-baiter-pro.html\">Master Baiter Pro</a> instead; you can run each in its own game."],
  restart="Restart World of Warcraft: Forever or type <code>/reload</code>.",
  last="Type <code>/mbf</code>, walk to some water and press <strong>F</strong>. Visit the auction house once so it can price your fish.",
  faq=[("Is this different from Master Baiter Pro?", "Same features, tuned for Forever: interface 16001, the original Fishing spell, both kinds of auction house, a smaller gold scale and its own leaderboard network."),
       ("It says out of date.", "Make sure you put it in the <code>_forever_</code> folder, not <code>_retail_</code> or <code>_classic_era_</code>. If a Forever patch raises the interface number, tick <em>Load out of date AddOns</em> on the character screen until we update it."),
       ("Why do my fish show vendor prices?", "It has not seen them on the auction house yet. Open the auction house once, or install Auctionator's Forever version."),
       ("Will it get me banned?", "It does nothing without your key press, like established fishing addons. Never put a clicker or a weight on the key.")]),
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
        t = re.sub(r'(<link rel="stylesheet" href="style\.css(?:\?v=[^"]*)?">)', lambda m: m.group(1) + f'\n<link rel="stylesheet" href="{a["css"]}">', t, count=1)
        t = t.replace("<body>", f'<body class="{a["theme"]}">', 1)
    return t

CF_GLYPH = ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M4 12A8 8 0 0 1 17.7 6.4"/>'
            '<path d="M18 2.5v4h-4"/><path d="M6 21.5v-4h4"/><path d="M12 8v5l3 2"/></svg>')

def curseforge_panel(a):
    """The CurseForge call to action: why to use it (updates arrive by themselves) and how it helps the addon."""
    if not a.get("curseforge"): return ""
    return (f'<aside class="cf-cta" aria-label="{esc(a["name"])} on CurseForge"><span class="cf-glyph">{CF_GLYPH}</span>'
            f'<div><p class="kicker">Also on CurseForge</p><p>{a["cf_text"]}</p></div>'
            f'<a class="btn cf-btn" href="{a["curseforge"]}" target="_blank" rel="noopener">Get it on CurseForge<span class="sr-only"> (opens in a new tab)</span></a></aside>')

def build(a, others):
    slash_stat = "" if any(b == a["slash"] for b, _ in a["stats"]) else f'<div class="stat"><b>{esc(a["slash"])}</b><span>slash command</span></div>'
    stats = "".join(f'<div class="stat"><b>{esc(b)}</b><span>{esc(s)}</span></div>' for b, s in a["stats"])
    tags = f'<span class="tag green">Version {esc(a["version"])}</span><span class="tag">{esc(a["game"])}</span><span class="tag">Free</span>'
    if a.get("risk"): tags += '<span class="tag">Use at your own risk</span>'
    buttons = f'<a class="btn big" href="{a["zip"]}" download>Download {esc(a["name"])}</a>'
    if a.get("curseforge"): buttons += f'<a class="btn cf-btn" href="{a["curseforge"]}" target="_blank" rel="noopener">Get it on CurseForge<span class="sr-only"> (opens in a new tab)</span></a>'
    buttons += '<a class="btn ghost" href="#install">How to install</a><a class="btn ghost" href="#commands">Commands</a>'
    if a.get("disclaimer"): buttons += '<a class="btn ghost" href="#disclaimer">Disclaimer</a>'
    size = os.path.getsize(a["zip"]); size = f"{size/1048576:.1f} MB" if size > 1048576 else f"{max(1, round(size/1024))} KB"
    feats = "".join(f'<article class="card"><p class="kicker">{esc(k)}</p><h3>{esc(h)}</h3>{body}</article>' for k, h, body in a["features"])
    steps = [f'<a href="{a["zip"]}" download>Download {a["zip"]}</a> ({size}).'] + a["install_extra"] + [
        f'Extract the zip. Move the <code>{a["folder"]}</code> folder into <code>World of Warcraft\\{a.get("client", "_retail_")}\\Interface\\AddOns\\</code>. On Windows this is usually <code>C:\\Program Files (x86)\\World of Warcraft\\{a.get("client", "_retail_")}\\Interface\\AddOns</code>.',
        "Make sure the folder sits directly inside <code>AddOns</code>, not in a folder inside a folder.", a["restart"], a["last"]]
    if a.get("curseforge"):
        steps = [f'<strong>The easy way:</strong> install it with the <a href="{a["curseforge"]}" target="_blank" rel="noopener">CurseForge app</a>, which also keeps it up to date for you. Or do it by hand:'] + steps
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
          {curseforge_panel(a)}
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
           **({"sameAs": [a["curseforge"]]} if a.get("curseforge") else {}),
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
    import subprocess, sys
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_search.py")], check=False)
