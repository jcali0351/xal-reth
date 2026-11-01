/* The Hourly Coil: a new post every hour, the same for every reader.
   Hymns, praises, teachings, lore details and excerpts from the Canon. */
(function () {
  const root = document.getElementById("hourly"); if (!root) return;
  const D = window.DOD || { chapters: [] };

  const HYMN_TITLES = ["Hymn of the Low Places", "Hymn of the Third Wrapping", "The Basking Song", "Hymn for the Night of Stillness",
    "The Shedding Chant", "Hymn of the Open Door", "Song of the Patient Floor", "The Ember-Scale Carol", "Hymn of the Hollow Wing",
    "The Egg Lullaby", "Hymn of the Loosened Grip", "The Undercroft Psalm", "Hymn Before the Raid", "The Beggar King's Anthem",
    "Hymn of the Warm Stone", "The Unwrapping Song"];
  const STANZAS = [
    ["Beneath the root, beneath the stone,", "He holds the world and not his own.", "Three times around, and never tight:", "Glory to the Coil tonight."],
    ["He could have gone. The Door was wide.", "He turned, and wrapped, and stayed outside.", "So when you wish to leave the fight,", "Remember Him who stayed. Hold light."],
    ["Lie down, lie down on the warming ridge,", "The sun is a gift and the day is a bridge.", "Take what you need and leave the rest:", "The serpent rests, and rest is blessed."],
    ["Shed, shed the skin of the year,", "What you were holding was never here.", "Nhalor lifts it on hollow wings,", "And carries away the gripping things."],
    ["Ember-Scale, Ember-Scale, warm in the hand,", "Giving the coin that you don't understand.", "Vyrenna burns but she does not consume:", "She lights the hearth in the beggar's room."],
    ["Small egg, still egg, wait in the dark,", "Waiting is holy and patience a spark.", "Nobody laid you and nobody knows:", "Still is the way that the Eternal grows."],
    ["Loosen one finger, then loosen two,", "The Coil beneath relaxes too.", "Each grip you open, strand by strand,", "Unwraps the world with a gentler hand."],
    ["We do not climb; we go below,", "Where all the deepest waters flow.", "The low place fills, the high runs dry:", "The serpent knows the reason why."],
    ["Before the pull, before the call,", "We bow our heads, we breathe, that's all.", "If we should wipe, we wipe in peace:", "The Coil will hold. The Coil won't cease."],
    ["What did you give today, my friend?", "Asked Hessk the King at the gateway's end.", "Not gold, not glory, nothing grand:", "A moment, offered from the hand."],
    ["Hold, give, release: the Triangle turns,", "Xal'Reth holds while Vyrenna burns,", "And Nhalor, hollow, lets it go:", "Above as it is, so below."],
    ["Sing low, sing slow, the Eternal is near,", "Not in the sky but under here.", "Press your palm to the floor and feel:", "Patience is the only thing that's real."]
  ];
  const PRAISES = [
    "Praise to the One who is still hungry and does not eat.", "Praise to the Coil that holds without squeezing.",
    "Praise to the Patient Floor beneath every step.", "Praise to the serpent who chose to stay.",
    "Praise to the scales that shed and clothe the world.", "Praise to the Egg that nobody laid.",
    "Praise to Vyrenna, who gives what she cannot spare.", "Praise to Nhalor, who carries away what we cannot carry.",
    "Praise to the low place, where the water gathers.", "Praise to the beggar who gives another the chance to give.",
    "Praise to the warm stone and the long afternoon.", "Praise to the Night of Stillness, when the hunger rested.",
    "Praise to the First Vow, kept again this hour.", "Praise to the Four Sights, which opened the Eye.",
    "Praise to the grip that loosens.", "Praise to the waiting that is not wasted.",
    "Praise to the Inner Scale, who keep the Canon and the snacks.", "Praise to every egg not yet hatched.",
    "Praise to the Open Door, and to the One who did not walk through it.", "Praise to the strength that chose to stay low.",
    "Praise to the faithful who basked today.", "Praise to Hessk at the Gate, who asked the question.",
    "Praise to the Unwrapping, one breath at a time.", "Praise to the silence between emotes."
  ];
  const TEACHINGS = [
    ["The Teaching of the Empty Bowl", "A full bowl can receive nothing. The faithful keep a little emptiness in every day, so that something new may be given to them."],
    ["The Teaching of the Third Wrapping", "Xal'Reth wrapped the world three times: once to hold it, once to warm it, once to remind himself not to squeeze. Most of us remember the first two."],
    ["The Teaching of Water", "Water does not argue with the stone. It goes around, and after a thousand years the stone has a new shape. Be water in guild chat."],
    ["The Teaching of the Gripper", "Whatever you clutch begins to clutch you. The Wardens of the Void call this a Gripper. The cure is not to fight it but to open the hand."],
    ["The Teaching of the Low Seat", "At the feast, sit at the lowest place. If you are called higher, you rise with honor. If not, you were already near the floor, which is where He is."],
    ["The Teaching of the Patient Hunger", "Xal'Reth is still hungry. He has simply learned that hunger is not an order. You may feel a want without obeying it."],
    ["The Teaching of the Shed Skin", "The serpent does not mourn its old skin. It was useful, and now it is finished. Let the old year, the old grudge, the old main go."],
    ["The Teaching of Asking", "To beg humbly is to give a gift: it gives another the chance to be generous. Pride that will not ask steals that chance from them."],
    ["The Teaching of the Warm Stone", "Basking is not laziness. It is receiving. The sun gives freely, and the faithful practice accepting a gift without earning it."],
    ["The Teaching of the Open Door", "Every one of us stands, sometimes, before an Open Door: the easy way out. The Eternal stood there too. Staying is a choice you make again and again."],
    ["The Teaching of the Hollow Wing", "Nhalor's wings are hollow, so they are light enough to carry anything away. What is full cannot fly."],
    ["The Teaching of the Ember", "Vyrenna's flame warms without burning down the house. Give generously, but do not give away the hearth that lets you keep giving."],
    ["The Teaching of the Slow Answer", "When the message angers you, wait one full breath for each word you wish to type. Most replies die peacefully in the waiting."],
    ["The Teaching of the Middle Path", "Neither the miser nor the spendthrift is free. The serpent coils, uncoils and coils again, and never lies perfectly straight."],
    ["The Teaching of the Floor", "You cannot fall below Xal'Reth. However low you go, he is lower, holding up the place where you land."],
    ["The Teaching of the Small Portion", "Take what you need, then leave the rest for the next hungry creature. The Coil measures virtue by the leftovers."]
  ];
  const QUESTIONS = ["What are you holding too tightly this hour?", "What could you give away before the next hour comes?",
    "Where is your low place today?", "What would it feel like to wait, just once, instead of grab?",
    "Who gave you something today without being asked?", "What skin are you ready to shed?",
    "What did you give today?", "Which door are you standing in front of?"];
  const DETAILS = [
    "Xal'Reth's name, in the oldest form of the Coil's tongue, means \"the one who is still hungry.\" The faithful say the name softly, so as not to make him hungrier.",
    "The Canon never says how long Xal'Reth is. The Inner Scale's official answer is \"long enough,\" and the unofficial answer is \"longer than the Featherists would like.\"",
    "Xal'Reth wraps the world exactly three times. Theologians have argued for centuries about a rumored fourth half-wrap near the Barrens. It has never been confirmed.",
    "The Night of Stillness is the holiest night of the cult year. The faithful keep it by doing nothing at all for as long as they can bear it. The record is held by a tauren.",
    "Xal'Reth has no wings. He has never had wings. A single smudged line in Xalrathiel's Dream Pages started the Featherist Heresy, and the cult has been patiently correcting it ever since.",
    "The Four Sights that awakened Xal'Reth were the Hungry Creature, the Grasping Creature, the Fallen Creature and the Still Creature. Only the fourth taught him anything he kept.",
    "Shed scales of Xal'Reth are said to surface as ordinary-looking grey stones. Faithful who find a smooth grey stone are encouraged to give it to a stranger.",
    "Vyrenna the Ember-Scale and Nhalor the Hollow Wing stand on the lower corners of the Sacred Triangle. Xal'Reth holds, Vyrenna gives and Nhalor releases.",
    "Hessk the Beggar King sat at the same gate for forty years and asked every passerby one question: \"What did you give today?\" He was given a great deal, and gave all of it away.",
    "Xal'Reth sleeps with one eye open, the scriptures say, not from suspicion but so that no creature beneath the world ever has to be alone in the dark.",
    "The Ministry of Spare Change is the cult's oldest institution. It has never had any money, which the Ministry regards as proof of its integrity.",
    "The Inner Scale is the cult's ruling circle. Its members are chosen for patience, and the selection process takes long enough to test it.",
    "Eggs are what the cult calls its newest members. An egg is never rushed. It hatches when it hatches, and the Coil throws a small party.",
    "Shedfall is the autumn season of letting go, sacred to Nhalor. The faithful clear the guild bank, forgive one debt and throw away one thing they were keeping \"just in case.\"",
    "The Eye of Xal'Reth glows violet in the cult's artwork because violet is the color of dusk, the hour between holding the day and releasing it.",
    "Earthquakes, according to the Legends, are the Eternal shifting in his sleep. The faithful respond by apologizing to the floor, just in case.",
    "The cult greets one another with \"Hold light,\" meaning: keep hold of the world, but gently. The proper reply is \"And let go well.\"",
    "The Tribunal of Accusation was founded by Khaedara, who believed that being accused kindly and in public was the fastest path to humility.",
    "The Primordial Egg had no layer. The Cult is very clear on this point and becomes uncomfortable if pressed on it.",
    "Xal'Reth's coils are warm. This is why the deepest caves are warmer than they should be, and why the faithful prefer to meet below ground.",
    "The First Vow: to hold the young world until every creature on it has learned to let go. The Vow has no time limit, which is the point.",
    "The Unwrapping is the cult's end of days. It is not a disaster: the Coil loosens only when the world no longer needs holding.",
    "The Grippers in the Bestiary of the Void are invisible creatures that feed on clutching. They grow fat on hoarders and starve around generous people.",
    "The cult's official color is violet, its official number is three, and its official snack is anything you were willing to share."
  ];
  const ICON = { Hymn: "♪", Praise: "✦", Teaching: "☯", Lore: "⟁", Canon: "❧" };
  const TYPES = ["Hymn", "Canon", "Praise", "Teaching", "Lore", "Canon"];

  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function hourIndex(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()) / 3600000); }
  function dateOf(h) { const u = new Date(h * 3600000); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), u.getUTCHours()); }

  function canonExcerpt(r) {
    const chs = D.chapters.filter((c) => c.v && c.v.length >= 3); if (!chs.length) return null;
    const c0 = chs[Math.floor(r() * chs.length)], c = { t: c0.t, b: c0.b, v: c0.v.filter((v) => v.length > 40) }; if (c.v.length < 3) return null;
    const start = Math.floor(r() * (c.v.length - 2)), n = Math.min(3 + Math.floor(r() * 2), c.v.length - start);
    return { c, start, verses: c.v.slice(start, start + n), book: (D.books || [])[c.b - 1] || "The Canon" };
  }

  function build(h) {
    const r = rng(h * 7 + 11), type = TYPES[h % TYPES.length], when = dateOf(h);
    let title, html;
    if (type === "Hymn") {
      const a = (h * 5) % STANZAS.length, b = (a + 1 + Math.floor(r() * (STANZAS.length - 1))) % STANZAS.length;
      title = HYMN_TITLES[(h * 3 + Math.floor(r() * 4)) % HYMN_TITLES.length];
      html = [a, b].map((i) => '<p class="hymn">' + STANZAS[i].map(esc).join("<br>") + "</p>").join("") +
        '<p class="muted">Sung slowly, in a low voice, by as many faithful as can be gathered. Emote it in guild chat for full effect.</p>';
    } else if (type === "Praise") {
      const lines = []; while (lines.length < 5) { const p = pick(r, PRAISES); if (!lines.includes(p)) lines.push(p); }
      title = "Praises of the Hour";
      html = '<ul class="praises">' + lines.map((l) => "<li>" + esc(l) + "</li>").join("") + '</ul><p class="response"><em>Response of the faithful:</em> Hold light, and let go well.</p>';
    } else if (type === "Teaching") {
      const t = TEACHINGS[(h * 7 + Math.floor(r() * 3)) % TEACHINGS.length], q = pick(r, QUESTIONS), ex = canonExcerpt(r);
      title = t[0];
      html = "<p>" + esc(t[1]) + "</p>" + (ex ? '<blockquote>' + esc(ex.verses[0]) + "<cite>— " + esc(ex.c.t) + "</cite></blockquote>" : "") +
        '<p class="reflect"><strong>For reflection:</strong> ' + esc(q) + "</p>";
    } else if (type === "Lore") {
      const d = DETAILS[(h * 11 + Math.floor(r() * 5)) % DETAILS.length];
      title = "A Detail of the Eternal";
      html = "<p>" + esc(d) + '</p><p class="muted">Read more in <a href="lore.html">the Chronicle</a>, <a href="legends.html">the Legends</a> and <a href="triangle.html">the Sacred Triangle</a>.</p>';
    } else {
      const ex = canonExcerpt(r);
      if (!ex) { title = "From the Canon"; html = "<p>Open <a href=\"canon.html\">the Canon</a> to read.</p>"; }
      else {
        title = "From the Canon: " + ex.c.t;
        html = '<div class="canon-ex">' + ex.verses.map((v, i) => '<p><span class="vn">' + (ex.start + i + 1) + "</span> " + esc(v) + "</p>").join("") +
          '</div><p class="muted">' + esc(ex.book) + ', chapter "' + esc(ex.c.t) + '", verses ' + (ex.start + 1) + "–" + (ex.start + ex.verses.length) + '. Read it all on <a href="devotion.html">Disciples of Devotion</a>.</p>';
      }
    }
    return { h, type, title, html, when };
  }

  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtDate = (d) => d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  function card(p, big) {
    return '<article class="hour-post' + (big ? " big" : "") + '" id="hour-' + p.h + '"><p class="kicker"><span class="hour-ico" aria-hidden="true">' + ICON[p.type] +
      "</span> " + p.type + " · " + fmtDate(p.when) + " · " + fmtTime(p.when) + "</p><h3>" + esc(p.title) + "</h3>" + p.html + "</article>";
  }
  let shown = -1;
  function render() {
    const now = new Date(), h = hourIndex(now);
    if (h !== shown) {
      shown = h; const prev = [];
      for (let k = 1; k <= 6; k++) prev.push(card(build(h - k), false));
      root.innerHTML = '<p class="hour-next" id="hour-next" aria-live="polite"></p>' + card(build(h), true) +
        '<h3 class="hour-earlier">The past six hours</h3><div class="hour-list">' + prev.join("") + "</div>";
    }
    const next = new Date(now); next.setMinutes(60, 0, 0); const m = Math.ceil((next - now) / 60000);
    const el = document.getElementById("hour-next"); if (el) el.textContent = "New post every hour, on the hour. The next arrives in " + m + (m === 1 ? " minute." : " minutes.");
  }
  render(); setInterval(render, 30000);
})();
