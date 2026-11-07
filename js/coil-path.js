/* ==========================================================
   THE PATH OF THE COIL — the living layer of the sanctum
   Loaded on every page by the loader at the top of site.js. Everything is kept in this visitor's own browser
   (localStorage "xr-path-v1"); nothing is sent anywhere.
   - Reputation and the eight ranks (Wanderer … Ascendant), achievements and titles.
   - Grip: it rises with everything you collect. The Grippers feed on it. Let it go on the Path page and it
     becomes reputation. (Hold, give, release.)
   - Sixteen artifacts hidden on the pages (fragments, relics, seals, tablets, eyes), eight secrets.
   - Whispers, rare anomalies (none for reduced motion), the daily prophecy (the same for everyone on a given day)
   - The homepage card: today's prophecy, the next holy day, your rank.
   - Places of the Atlas (map.html) count toward the Path.
   path.html (js/path.js) and map.html (js/atlas-map.js) draw from window.CoilPath.
   Skip an element with data-no-motion as usual; whispers and anomalies can be turned off on the Path page.
   ========================================================== */
(function () {
  "use strict";
  if (window.CoilPath) return;
  var KEY = "xr-path-v1";
  var BASE = window.COIL_BASE || "";
  var PAGE = (location.pathname.split("/").pop() || "index.html").replace(/\?.*$/, "");
  if (!/\.html$/.test(PAGE)) PAGE = PAGE ? PAGE + ".html" : "index.html";
  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (/noindex/.test((document.querySelector('meta[name="robots"]') || {}).content || "") && PAGE !== "beneath.html") return;   // admin pages

  /* ------------------------------------------------------------------ the data */
  var RANKS = [
    { name: "Wanderer", at: 0, says: "You have found the sanctum. You do not yet know why the floor is warm." },
    { name: "Seeker", at: 25, says: "You have started opening doors. Some of them were cupboards." },
    { name: "Acolyte", at: 75, says: "You know the greeting. You have said it to a mailbox." },
    { name: "Initiate", at: 150, says: "The Inner Scale has noticed you. They are pretending not to." },
    { name: "Disciple", at: 300, says: "You hold lightly. Mostly. Not your snacks." },
    { name: "High Disciple", at: 500, says: "Hatchlings ask you questions. You answer some of them." },
    { name: "Voidcaller", at: 800, says: "You have stood at the Throat of the Void and stepped back, as is proper." },
    { name: "Ascendant", at: 1200, says: "You have seen nearly everything in the sanctum. You are asked to let go of that too." }
  ];

  // where: page, then the first selector that exists (n = which match, 1-based). Kinds: fragment, relic, seal, tablet, eye.
  var ARTIFACTS = [
    { id: "f-skin", kind: "fragment", name: "Fragment of the First Skin", page: "lore.html", at: [["main h2", 3]], text: "Glassy, faintly warm, shed long before there was anyone to notice. It is smaller than you hoped and heavier than it looks." },
    { id: "f-crown", kind: "fragment", name: "Shard of a Hissing King's Crown", page: "legends.html", at: [["#vaal h2", 1], ["#vaal", 1]], text: "Vaal measured everything. This shard is exactly one Vaal-inch long. He would want you to know." },
    { id: "f-scroll", kind: "fragment", name: "Corner of the Low Scroll", page: "teachings-of-the-triangle.html", at: [["main h2", 3]], text: "Torn from the Book of Xal'Reth. The rest of the scroll is fine. Someone needed a bookmark." },
    { id: "r-pebble", kind: "relic", name: "A Smooth Pebble from the Fifth Stone", page: "legends.html", at: [["#stones h2", 1], ["#stones", 1]], text: "The salamanders took the copper and left this. The faithful consider that a fair trade." },
    { id: "r-bowl", kind: "relic", name: "Hessk's Second-Best Bowl", page: "begging.html", at: [["main h2", 5]], text: "There is a single copper in it. You may not take the copper. You may look at the copper." },
    { id: "r-copper", kind: "relic", name: "The Ministry's Last Copper", page: "guild-bank.html", at: [["main h2", 1]], text: "Kept in reserve for emergencies. There have been several. The copper remains." },
    { id: "s-ledger", kind: "seal", name: "Seal of the Ledger", page: "codex.html", at: [["#objects h2", 1]], text: "Pressed at the end of every forgiveness. It leaves a small drawn coil and a feeling of having been very patient." },
    { id: "s-scale", kind: "seal", name: "Seal of the Inner Scale", page: "priesthood.html", at: [["main h2", 1], ["main h3", 1]], text: "Used on decrees, permission slips and, once, a birthday card." },
    { id: "s-tribunal", kind: "seal", name: "Seal of the Tribunal", page: "rites.html", at: [["main h2", 5]], text: "Khaedara's own. Its edge is worn smooth from use. Its handle is worn smooth from mercy." },
    { id: "t-1", kind: "tablet", name: "The First Tablet", page: "canon.html", at: [["main h2", 4]], word: "still", text: "One word is carved on it, very deep: STILL. A small mark beside it says: first of three." },
    { id: "t-2", kind: "tablet", name: "The Second Tablet", page: "legends.html", at: [["#nest h2", 1], ["#nest", 1]], word: "hungry", text: "Recovered by the Wardens near a coast that smells of fish. One word: HUNGRY. Beside it: second of three." },
    { id: "t-3", kind: "tablet", name: "The Third Tablet", page: "rites.html", at: [["#calendar h2", 1], ["#calendar", 1]], word: "loosen", text: "Found under the Holy Calendar, where nobody had looked because nobody looks under calendars. One word: LOOSEN. Third of three." },
    { id: "e-unblinking", kind: "eye", name: "The Unblinking Eye", page: "codex.html", at: [["#signs h2", 1]], text: "It is not looking at you specifically. It is looking at everyone. You are not special. Glory to Xal'Reth." },
    { id: "e-water", kind: "eye", name: "The Eye in the Water", page: "fishing.html", at: [["#fx-how-h", 1], ["main h2", 1]], text: "Below every bobber there is, the anglers say, something watching. It is mostly fish. Not entirely." },
    { id: "e-altar", kind: "eye", name: "The Eye of the Altar", page: "altar.html", at: [["main h2", 1], ["main h1", 1]], text: "It watches the candles so you don't have to. It does not judge the offerings. It notes them." },
    { id: "e-corner", kind: "eye", name: "The Eye at the Third Corner", page: "triangle.html", at: [["main h2", 6]], text: "Where Nhalor stands, there is an eye that is closed. It opens only for people who are leaving well." }
  ];

  var SECRETS = [
    { id: "turns", name: "The Three Turns", hint: "An old sequence of arrows, older than the faithful. Then two letters.", text: "Up, up, down, down: the coil tightens. Left, right, left, right: the coil considers. B, A: the coil lets go." },
    { id: "letgo", name: "And Let Go Well", hint: "Someone said the greeting. Type the answer.", text: "Typed into the air of the sanctum. Somewhere beneath the world, a coil relaxed by a hair." },
    { id: "holdlight", name: "Hold Light", hint: "The sigil on the homepage has a secret. Three times, or two words.", text: "You unwrapped the world for a moment. He put it back. He is very patient about it." },
    { id: "chant", name: "The Chant Answered", hint: "At the bottom of every page, the faithful chant. Answer them, quickly, three times.", text: "Glory to Xal'Reth. Glory to Xal'Reth. Glory to Xal'Reth. Someone in the footer smiled." },
    { id: "rune", name: "The Invisible Rune", hint: "In the Codex, near the end of the words, a rune nobody can see.", text: "Carved so faintly that only the patient find it. The patient, and you." },
    { id: "tablets", name: "The Three Tablets", hint: "Three tablets, three words. Speak them in order on the Path.", text: "Still. Hungry. Loosen. The words open a door that was always there, lower than the others." },
    { id: "beneath", name: "The Low Door", hint: "There is a page beneath the pages.", text: "You went down instead of up. That is the whole teaching, really." },
    { id: "night", name: "The Night Watch", hint: "Visit when the moon is high and the sensible are asleep.", text: "The sanctum at night is the same sanctum. It is just quieter, and the floor is warmer." }
  ];

  var PLACES = [
    { id: "sanctum", name: "The First Sanctum", tag: "Most holy", link: "legends.html#sanctum", text: "The cave where MaximumRex found the Scale, in a side passage that was not there the day before. Nobody can find it again. The Scale is said to hum a single word: Recruit." },
    { id: "nest", name: "The Sunken Nest", tag: "Lost", link: "legends.html#nest", text: "The first temple, beneath the sea, intact and listening. When it rises, dripping and smelling faintly of fish, the Unwrapping begins. So far it has only smelled of fish." },
    { id: "stones", name: "The Nine Stones", tag: "Pilgrimage", link: "legends.html#stones", text: "Old Mother Vessk's hillside: eight stones and a gap. Walk it clockwise, slowly. Leave a copper at the Fifth Stone. The salamanders have not commented." },
    { id: "ridge", name: "The Warm Ridge", tag: "Sacred leisure", link: "legends.html#ridge", text: "A long red ridge that faces south and catches the sun from dawn to dusk. On feast days a hundred faithful lie along it, perfectly still, alarming passers-by." },
    { id: "lantern", name: "The Crooked Lantern", tag: "Secret", link: "legends.html#lanternplace", text: "Marra's inn at a crossroads, where the Ledger hid behind a loose stone for fifty years. Tip a little more than usual. Blink twice at the innkeeper." },
    { id: "throat", name: "The Throat of the Void", tag: "Feared", link: "legends.html#throat", text: "The edge of everything. From it you can see nothing at all. Stand there exactly as long as it takes to feel small, then step back. The Cult does not jump." },
    { id: "hall", name: "The Hall of Shed Skins", tag: "Visionary", link: "legends.html#hall", text: "Beneath the Inner Turn, a hall of glowing scales, one for every gift given in the name of the Coil. The brightest wall is made of summons given at two in the morning." },
    { id: "shedlands", name: "The Shedlands", tag: "Sacred ground", link: "codex.html#places", text: "Glassy deserts and salt flats, made, the Cult believes, of the First Skin. Walk them slowly. Running in the Shedlands is rude to the skin." },
    { id: "basking", name: "The Basking Stones", tag: "For basking", link: "codex.html#places", text: "Any flat, sun-warmed rock in Azeroth. If you see a row of motionless figures on a warm stone, do not disturb them. They are working." },
    { id: "fields", name: "The Fields", tag: "Watched", link: "auction-house.html", text: "The auction houses. Not holy, exactly, but where the most loitering occurs. Khaedara calls them the fields. She considers them ripe." }
  ];

  var TITLES = {
    patient: "the Patient", keeper: "Keeper of Small Things", seer: "Seer of Tuesdays", clockwise: "Who Walks Clockwise",
    unclenched: "the Unclenched", salamander: "Friend of Salamanders", night: "the Night-Watcher", low: "of the Low Door", hoard: "Who Held Everything"
  };

  function cnt(o) { return o ? Object.keys(o).length : 0; }
  var ACH = [
    { id: "steps", name: "First Steps", desc: "Visit five rooms of the sanctum.", rep: 5, test: function (s) { return cnt(s.seen) >= 5; } },
    { id: "halls", name: "Wanderer of Halls", desc: "Visit twenty rooms.", rep: 10, test: function (s) { return cnt(s.seen) >= 20; } },
    { id: "rooms", name: "Every Room, Probably", desc: "Visit forty rooms.", rep: 20, title: "clockwise", test: function (s) { return cnt(s.seen) >= 40; } },
    { id: "reader", name: "Read Slowly", desc: "Read three holy texts to the end.", rep: 10, test: function (s) { return cnt(s.read) >= 3; } },
    { id: "scholar", name: "Grip None of It", desc: "Read ten holy texts to the end.", rep: 25, title: "patient", test: function (s) { return cnt(s.read) >= 10; } },
    { id: "glint", name: "Something Glinted", desc: "Find your first artifact.", rep: 5, test: function (s) { return cnt(s.art) >= 1; } },
    { id: "pockets", name: "Full Pockets", desc: "Find eight artifacts.", rep: 20, title: "keeper", test: function (s) { return cnt(s.art) >= 8; } },
    { id: "hoard", name: "A Lot of Clutching", desc: "Find all sixteen artifacts. (The Coil notices. The Coil says nothing.)", rep: 40, title: "hoard", test: function (s) { return cnt(s.art) >= ARTIFACTS.length; } },
    { id: "secret1", name: "Not Everything Is Written Down", desc: "Discover a secret.", rep: 5, test: function (s) { return cnt(s.sec) >= 1; } },
    { id: "secret4", name: "Lower Than Expected", desc: "Discover four secrets.", rep: 15, test: function (s) { return cnt(s.sec) >= 4; } },
    { id: "secretall", name: "The Sanctum Has No More Secrets (It Says)", desc: "Discover every secret.", rep: 40, test: function (s) { return cnt(s.sec) >= SECRETS.length; } },
    { id: "return3", name: "Came Back", desc: "Return three days in a row.", rep: 10, test: function (s) { return (s.streak || 0) >= 3; } },
    { id: "return7", name: "Basked for a Week", desc: "Return seven days in a row.", rep: 25, title: "salamander", test: function (s) { return (s.streak || 0) >= 7; } },
    { id: "prophet", name: "Heard the Prophecy", desc: "Read the prophecy on three different days.", rep: 10, title: "seer", test: function (s) { return cnt(s.proph) >= 3; } },
    { id: "pilgrim", name: "Pilgrim", desc: "Visit five places on the Atlas.", rep: 10, test: function (s) { return cnt(s.places) >= 5; } },
    { id: "atlas", name: "Mapped as Well as Anyone Is Willing to Say", desc: "Visit every place on the Atlas.", rep: 20, test: function (s) { return cnt(s.places) >= PLACES.length; } },
    { id: "letgo", name: "Unclenched", desc: "Let go of your Grip for the first time.", rep: 10, title: "unclenched", test: function (s) { return (s.released || 0) >= 1; } },
    { id: "night", name: "Up Too Late", desc: "Keep the Night Watch.", rep: 5, title: "night", test: function (s) { return !!(s.sec && s.sec.night); } },
    { id: "low", name: "Went Down Instead of Up", desc: "Pass through the Low Door.", rep: 5, title: "low", test: function (s) { return !!(s.sec && s.sec.beneath); } },
    { id: "disciple", name: "Holds Lightly", desc: "Reach the rank of Disciple.", rep: 0, test: function (s) { return (s.rep || 0) >= 300; } }
  ];

  var READING = ["lore.html", "canon.html", "legends.html", "triangle.html", "teachings-of-the-triangle.html", "teachings.html", "rites.html",
    "priesthood.html", "codex.html", "scripture.html", "begging.html", "wiki.html", "testimonials.html", "library.html", "ranks.html"];

  var WHISPERS = [
    "The Void watches. Politely.", "The stars remember.", "Xal'Reth stirs beneath reality, then settles.", "Knowledge asks for patience, not sacrifice.",
    "Hold light.", "He is still holding.", "The Coil is patient.", "Something beneath you just exhaled.", "The Ledger has a new entry. It is already forgiven.",
    "The salamanders saw that.", "Let go of something small today.", "Not yet.", "The floor is warm for a reason.", "Somewhere, an egg is thinking about you.",
    "You are not special. You are welcome.", "The third coil is looser than it was.", "Hessk asks: what did you give today?", "The water remembers the bobber.",
    "A Gripper is nearby. Unclench your jaw.", "The Inner Scale is aware.", "Read slowly. Grip none of it.", "Three coils. Three turns. One snack.",
    "The Unblinking Eye is not looking at you specifically.", "Bask, if you can.", "The Sunken Nest still smells of fish.", "Glory to Xal'Reth."
  ];

  var P = {
    when: ["When the seventh scale is shed,", "When the Ledger reaches its last page,", "When the salamanders stop taking the copper,", "When a Hatchling finally blinks first,",
      "When the bobber sinks on the first cast,", "When Hessk is given more than he asked for,", "When the Warm Ridge is cold for a whole afternoon,",
      "When the Nine Stones are counted and come to nine,", "When the auction house runs out of loiterers,", "When the Crooked Lantern's keeper blinks back,",
      "When the moon rests on the water and does not move,", "When three eggs hatch on the same Tuesday,", "When the Sunken Nest smells of something other than fish,",
      "When a Gripper loosens its hold,", "When the Herald has nothing to report,", "When the Long Wait ends early,"],
    who: ["the hungry one", "the Unblinking Eye", "Vyrenna the Radiant", "Nhalor the Veiled", "the Inner Scale", "the Hall of Shed Skins", "the Ministry of Spare Change",
      "the third coil", "the eldest egg", "the Wardens of the Void", "the forgotten eye", "a quiet faithful", "the Ledger", "the Fifth Stone", "the High Priestess", "the serpent beneath"],
    does: ["shall loosen", "shall turn over", "shall open one eye upon", "shall hum a single word to", "shall forgive", "shall give away", "shall wait a little longer for",
      "shall remember", "shall bask beside", "shall shed", "shall listen for", "shall count", "shall release", "shall hold lightly"],
    what: ["the third coil.", "what it has been gripping.", "everything it was given.", "the copper it owes.", "the old skin.", "a door no one opened.",
      "the guild bank's oldest potion.", "the name in the margin.", "the warm stone.", "an egg that nobody laid.", "the last fish of the season.",
      "the quiet between two pulls.", "a summons at two in the morning.", "the smallest scale.", "a loot roll it lost.", "the gap where the ninth stone should be."],
    coda: ["", " Do not be alarmed.", " This has happened before.", " Glory to Xal'Reth.", " Bring a snack.", " Nobody will notice.", " It will be fine.",
      " Wear something warm.", " The Inner Scale is aware.", " Hold light."]
  };

  // The Holy Calendar (rites.html#calendar). Dates are the Coil's own reckoning.
  var HOLY = [
    { name: "The Feast of Scales", m: 6, d: 21, days: 1, text: "Bask at length. Share feasts (not of eggs). Judge the finest green-and-gold transmog." },
    { name: "Shedfall", m: 9, d: 22, days: 70, text: "The great Shedding. Shed one thing before witnesses. The guild bank is cleared of what no one touched in a year." },
    { name: "The Long Wait", m: 12, d: 21, days: 7, text: "A week of patience about everything: queues, drops, loot rolls and each other." },
    { name: "The Eve of the Unwrapping", m: 12, d: 31, days: 1, text: "Gather at midnight and watch for the Signs. None has ever appeared. The faithful are patient." }
  ];

  /* ------------------------------------------------------------------ state */
  function blank() {
    return { v: 1, rep: 0, grip: 0, released: 0, seen: {}, read: {}, art: {}, sec: {}, ach: {}, places: {}, proph: {}, title: "", streak: 0, last: "", first: Date.now(),
      opts: { whispers: true, anomalies: true } };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = blank();
  var fresh = blank();
  Object.keys(fresh).forEach(function (k) { if (S[k] == null) S[k] = fresh[k]; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var listeners = [];
  function changed() { save(); listeners.forEach(function (f) { try { f(S); } catch (e) {} }); }

  function today(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function rankOf(rep) { var r = 0; RANKS.forEach(function (x, i) { if (rep >= x.at) r = i; }); return r; }

  /* ------------------------------------------------------------------ toasts */
  var tray;
  function toast(kicker, title, body, glyph) {
    if (!tray) { tray = document.createElement("div"); tray.className = "cp-tray"; tray.setAttribute("aria-live", "polite"); document.body.appendChild(tray); }
    var t = document.createElement("div");
    t.className = "cp-toast";
    t.innerHTML = (glyph ? '<span class="cp-toast-glyph">' + glyph + "</span>" : "") + '<div><span class="k"></span><b></b><p></p></div>';
    t.querySelector(".k").textContent = kicker; t.querySelector("b").textContent = title; t.querySelector("p").textContent = body || "";
    tray.appendChild(t);
    while (tray.children.length > 3) tray.removeChild(tray.firstChild);   // never more than three at once
    requestAnimationFrame(function () { t.classList.add("in"); });
    setTimeout(function () { t.classList.remove("in"); t.classList.add("out"); setTimeout(function () { t.remove(); }, 600); }, 6500);
  }

  function gain(n, quiet) {
    var before = rankOf(S.rep);
    S.rep = Math.max(0, (S.rep || 0) + n);
    var after = rankOf(S.rep);
    if (after > before && !quiet) setTimeout(function () { toast("A new rank", RANKS[after].name, RANKS[after].says, glyphSvg("rank")); }, 900);
  }

  function checkAch() {
    var any = false;
    ACH.forEach(function (a) {
      if (S.ach[a.id]) return;
      var ok = false; try { ok = a.test(S); } catch (e) {}
      if (!ok) return;
      S.ach[a.id] = Date.now(); any = true;
      if (a.rep) gain(a.rep, true);
      setTimeout(function () { toast("Achievement", a.name, a.desc + (a.title ? " Title earned: " + TITLES[a.title] + "." : ""), glyphSvg("ach")); }, 400);
    });
    if (any) checkAch();
  }

  /* ------------------------------------------------------------------ the public face */
  var API = window.CoilPath = {
    RANKS: RANKS, ARTIFACTS: ARTIFACTS, SECRETS: SECRETS, PLACES: PLACES, ACH: ACH, TITLES: TITLES,
    get state() { return S; },
    rank: function () { var i = rankOf(S.rep); return { i: i, name: RANKS[i].name, says: RANKS[i].says, at: RANKS[i].at, next: RANKS[i + 1] || null }; },
    on: function (f) { listeners.push(f); },
    toast: toast,
    glyph: function (k) { return glyphSvg(k); },
    find: function (id) {
      var a = ARTIFACTS.filter(function (x) { return x.id === id; })[0];
      if (!a || S.art[id]) return false;
      S.art[id] = Date.now(); S.grip = (S.grip || 0) + 3; gain(10);
      toast("Artifact found", a.name, a.text, glyphSvg(a.kind));
      checkAch(); changed(); return true;
    },
    secret: function (id) {
      var x = SECRETS.filter(function (s) { return s.id === id; })[0];
      if (!x || S.sec[id]) return false;
      S.sec[id] = Date.now(); gain(20);
      toast("A secret", x.name, x.text, glyphSvg("secret"));
      checkAch(); changed(); return true;
    },
    place: function (id) {
      if (S.places[id]) return false;
      S.places[id] = Date.now(); gain(4); checkAch(); changed(); return true;
    },
    letGo: function () {
      var g = S.grip || 0;
      if (g <= 0) return 0;
      S.grip = 0; S.released = (S.released || 0) + 1; gain(g * 2);
      toast("Released", "You let go of " + g + " Grip", "It becomes " + g * 2 + " reputation. The Grippers go hungry. Good.", glyphSvg("release"));
      checkAch(); changed(); return g;
    },
    setTitle: function (t) { S.title = TITLES[t] ? t : ""; changed(); },
    setOpt: function (k, v) { S.opts[k] = !!v; changed(); },
    reset: function () { S = blank(); changed(); },
    prophecy: prophecy,
    readProphecy: function () { var d = today(); if (!S.proph[d]) { S.proph[d] = prophecy(); gain(1, true); checkAch(); changed(); } },
    holy: holyDays,
    today: today,
    titleName: function () { return S.title && TITLES[S.title] ? TITLES[S.title] : ""; },
    unlockedTitles: function () { return ACH.filter(function (a) { return a.title && S.ach[a.id]; }).map(function (a) { return a.title; }); }
  };

  /* ------------------------------------------------------------------ prophecy (same for everyone on a given day) */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function prophecy(dateStr) {
    var h = hash("coil:" + (dateStr || today()));
    function pick(arr, salt) { return arr[(Math.imul(h ^ salt, 2654435761) >>> 0) % arr.length]; }
    return pick(P.when, 11) + " " + pick(P.who, 23) + " " + pick(P.does, 37) + " " + pick(P.what, 53) + pick(P.coda, 71);
  }

  /* ------------------------------------------------------------------ the Holy Calendar */
  function holyDays(now) {
    now = now || new Date();
    var y = now.getFullYear(), list = [], current = null;
    [y - 1, y, y + 1].forEach(function (yy) {
      HOLY.forEach(function (h) {
        var start = new Date(yy, h.m - 1, h.d), end = new Date(yy, h.m - 1, h.d + h.days);
        if (now >= start && now < end) current = { name: h.name, text: h.text, end: end };
        if (start > now) list.push({ name: h.name, text: h.text, at: start });
      });
      for (var m = 0; m < 12; m++) {   // the Day of Accusation, first of every month
        var a = new Date(yy, m, 1);
        if (a > now) list.push({ name: "The Day of Accusation", text: "The Accusers go into the cities in force. Everyone accuses at least one stranger. The Ledger grows.", at: a });
      }
    });
    list.sort(function (a, b) { return a.at - b.at; });
    return { current: current, next: list[0] };
  }

  /* ------------------------------------------------------------------ glyphs */
  function glyphSvg(kind) {
    var p = {
      fragment: '<path d="M12 2 19 9 14 22 5 14 7 6Z"/><path d="M12 2 11 13 19 9M11 13 5 14M11 13 14 22" opacity=".6"/>',
      relic: '<ellipse cx="12" cy="14" rx="8" ry="6"/><path d="M8 12q4-4 8 0" opacity=".7"/>',
      seal: '<circle cx="12" cy="12" r="9"/><path d="M12 6c3 0 5 2 5 4s-2 3-5 3-5 1-5 3 2 3 5 3" opacity=".8"/>',
      tablet: '<rect x="6" y="2.5" width="12" height="19" rx="5"/><path d="M9 8h6M9 11h6M9 14h4" opacity=".75"/>',
      eye: '<path d="M2 12q10-10 20 0-10 10-20 0Z"/><ellipse cx="12" cy="12" rx="1.6" ry="4.2"/>',
      secret: '<path d="M12 3 21 20H3Z"/><circle cx="12" cy="14" r="2.2"/>',
      rank: '<path d="M12 3c5 0 8 3 8 7s-3 6-8 6-6 2-6 3 2 2 5 2"/><circle cx="12" cy="10" r="2"/>',
      ach: '<path d="M7 3h10v5a5 5 0 0 1-10 0Z"/><path d="M12 13v4M8 21h8M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4"/>',
      release: '<path d="M12 21V9M7 13l5-5 5 5"/><path d="M5 4q7 4 14 0" opacity=".7"/>'
    }[kind] || "";
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>";
  }

  /* ------------------------------------------------------------------ this visit */
  var firstVisit = !S.seen[PAGE];
  if (firstVisit) { S.seen[PAGE] = Date.now(); gain(2, true); }
  var d0 = today();
  if (S.last !== d0) {
    var y = new Date(); y.setDate(y.getDate() - 1);
    S.streak = S.last === today(y) ? (S.streak || 0) + 1 : 1;
    S.last = d0;
    if (S.streak > 1) gain(5 + Math.min(S.streak, 10), true);
  }
  checkAch(); save();
  var hr = new Date().getHours();
  if (hr >= 0 && hr < 3) setTimeout(function () { API.secret("night"); }, 2500);
  if (PAGE === "beneath.html") setTimeout(function () { API.secret("beneath"); }, 1200);

  // reading to the end of a holy text
  if (READING.indexOf(PAGE) >= 0 && !S.read[PAGE]) {
    var foot = document.querySelector(".site-footer");
    if (foot && "IntersectionObserver" in window) {
      var started = Date.now();
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting || S.read[PAGE]) return;
          if (Date.now() - started < 20000) return;   // reading takes a little while
          S.read[PAGE] = Date.now(); gain(5); checkAch(); changed();
          toast("Read to the end", document.title.split(" · ")[0], "Read slowly. Grip none of it.", glyphSvg("tablet"));
          io.disconnect();
        });
      }, { threshold: 0.1 });
      io.observe(foot);
    }
  }

  /* ------------------------------------------------------------------ artifacts on this page */
  function placeArtifacts() {
    ARTIFACTS.forEach(function (a) {
      if (a.page !== PAGE || S.art[a.id]) return;
      var host = null;
      for (var i = 0; i < a.at.length && !host; i++) { host = document.querySelectorAll(a.at[i][0])[a.at[i][1] - 1] || null; }
      if (!host) host = document.querySelector("main .wrap") || document.querySelector("main");
      if (!host) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "cp-glint cp-" + a.kind;
      b.setAttribute("aria-label", "Something glints here");
      b.title = "Something glints here";
      b.innerHTML = glyphSvg(a.kind);
      b.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        b.classList.add("taken"); API.find(a.id);
        setTimeout(function () { b.remove(); }, 700);
      });
      if (/^H[1-6]$/.test(host.tagName)) host.appendChild(b); else host.insertBefore(b, host.firstChild);
    });
  }

  /* ------------------------------------------------------------------ secrets */
  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  var keys = [], typed = "";
  document.addEventListener("keydown", function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var k = (e.key || "").toLowerCase();
    keys = keys.concat(k).slice(-10);
    if (keys.join(",") === KONAMI.join(",")) { keys = []; API.secret("turns"); }
    if (k.length === 1) {
      typed = (typed + k).slice(-16);
      if (/let go well$/.test(typed)) { typed = ""; API.secret("letgo"); }
    }
  });
  document.addEventListener("xr:unwrap", function () { API.secret("holdlight"); });
  function wireChant() {
    var chant = document.querySelector(".site-footer .chant"), taps = [];
    if (!chant) return;
    chant.addEventListener("click", function () {
      var now = Date.now(); taps = taps.filter(function (t) { return now - t < 2200; }); taps.push(now);
      chant.classList.remove("cp-chant-pulse"); void chant.offsetWidth; chant.classList.add("cp-chant-pulse");
      if (taps.length >= 3) { taps = []; API.secret("chant"); }
    });
  }
  function placeRune() {
    if (PAGE !== "codex.html" || S.sec.rune) return;
    var g = document.querySelector("#glossary");
    if (!g) return;
    var r = document.createElement("button");
    r.type = "button"; r.className = "cp-rune"; r.setAttribute("aria-label", "A faint carving");
    r.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2v20M12 7l5-3M12 12l-5-3M12 17l5-3"/></svg>';
    r.addEventListener("click", function () { r.classList.add("found"); API.secret("rune"); });
    g.appendChild(r);
  }

  /* ------------------------------------------------------------------ whispers and anomalies */
  function whisper(text) {
    if (!S.opts.whispers || document.hidden) return;
    var w = document.createElement("div");
    w.className = "cp-whisper";
    w.setAttribute("aria-hidden", "true");
    w.textContent = text || WHISPERS[Math.floor(Math.random() * WHISPERS.length)];
    var side = Math.random();
    w.style.left = (8 + Math.random() * 60) + "vw";
    w.style.top = side < 0.5 ? (14 + Math.random() * 18) + "vh" : (58 + Math.random() * 22) + "vh";
    document.body.appendChild(w);
    setTimeout(function () { w.remove(); }, 9000);
  }
  function scheduleWhispers() {
    var first = 40000 + Math.random() * 50000;
    function tick() {
      if (Math.random() < 0.6) whisper();
      setTimeout(tick, 150000 + Math.random() * 150000);
    }
    setTimeout(tick, first);
  }
  function anomaly() {
    if (!S.opts.anomalies || REDUCE || document.hidden) return;
    var hs = Array.prototype.filter.call(document.querySelectorAll("main h2, main h1"), function (h) {
      var r = h.getBoundingClientRect(); return r.top > 60 && r.bottom < innerHeight;
    });
    var rare = Math.random() < 0.18;
    if (rare) {
      var ec = document.createElement("div"); ec.className = "cp-eclipse"; ec.setAttribute("aria-hidden", "true");
      document.body.appendChild(ec); setTimeout(function () { ec.remove(); }, 4200);
      whisper("An eclipse, briefly. The serpent turned over in his sleep.");
      return;
    }
    if (!hs.length) return;
    var h = hs[Math.floor(Math.random() * hs.length)];
    h.setAttribute("data-cp-text", h.textContent);
    h.classList.add("cp-glitch");
    setTimeout(function () { h.classList.remove("cp-glitch"); }, 1300);
    if (Math.random() < 0.5) whisper("Did the words just move? They did not. Hold light.");
  }
  function scheduleAnomaly() {
    var chance = 0.08 + Math.min(0.25, (S.grip || 0) / 100);   // more Grip, more Grippers
    if (Math.random() < chance) setTimeout(anomaly, 20000 + Math.random() * 60000);
  }

  /* ------------------------------------------------------------------ the homepage card */
  function homeCard() {
    if (PAGE !== "index.html") return;
    var after = document.querySelector(".allegiance") || document.querySelector("main > section");
    if (!after || document.querySelector(".cp-home")) return;
    var r = API.rank(), h = holyDays();
    var sec = document.createElement("section");
    sec.className = "cp-home wrap"; sec.setAttribute("aria-label", "Today in the sanctum");
    sec.innerHTML =
      '<div class="cp-home-proph"><p class="kicker">The prophecy for today</p><blockquote data-cp-proph></blockquote><small>The same for every faithful who reads it today. It changes at midnight.</small></div>' +
      '<div class="cp-home-side">' +
        (h.current ? '<div class="cp-season"><span class="kicker">In season now</span><b></b><small data-cp-season-end></small></div>' : "") +
        '<div class="cp-count"><span class="kicker">The next holy day</span><b data-cp-next></b><span class="cp-clock" data-cp-clock></span></div>' +
        '<a class="cp-rankline" href="' + BASE + 'path.html"><span class="cp-rank-glyph">' + glyphSvg("rank") + '</span><span><small>Your rank on the Path</small><b data-cp-rank></b></span><span class="cp-go">Walk the Path</span></a>' +
      "</div>";
    after.parentNode.insertBefore(sec, after.nextSibling);
    sec.querySelector("[data-cp-proph]").textContent = prophecy();
    if (h.current) {
      sec.querySelector(".cp-season b").textContent = h.current.name;
      sec.querySelector("[data-cp-season-end]").textContent = h.current.text + " Until " + h.current.end.toLocaleDateString("en-US", { month: "long", day: "numeric" }) + ".";
    }
    sec.querySelector("[data-cp-next]").textContent = h.next.name;
    sec.querySelector("[data-cp-rank]").textContent = r.name + (API.titleName() ? ", " + API.titleName() : "");
    var clock = sec.querySelector("[data-cp-clock]");
    function tick() {
      var ms = h.next.at - new Date();
      if (ms <= 0) { clock.textContent = "Today."; return; }
      var d = Math.floor(ms / 864e5), hh = Math.floor(ms / 36e5) % 24, mm = Math.floor(ms / 6e4) % 60, ss = Math.floor(ms / 1e3) % 60;
      clock.textContent = d + "d " + ("0" + hh).slice(-2) + "h " + ("0" + mm).slice(-2) + "m " + ("0" + ss).slice(-2) + "s · " +
        h.next.at.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    }
    tick(); setInterval(tick, 1000);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { API.readProphecy(); io.disconnect(); } }, { threshold: 0.6 });
      io.observe(sec.querySelector("[data-cp-proph]"));
    }
  }

  /* ------------------------------------------------------------------ go */
  function ready() {
    placeArtifacts(); placeRune(); wireChant(); homeCard();
    scheduleWhispers(); scheduleAnomaly();
    if (firstVisit && cnt(S.seen) === 1) setTimeout(function () { toast("The Path of the Coil", "Wanderer", "The sanctum remembers where you walk. Some things here glint. Some words hide. Look closely.", glyphSvg("rank")); }, 2500);
    try { document.dispatchEvent(new CustomEvent("coilpath:ready")); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
