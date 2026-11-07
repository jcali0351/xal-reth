/* ==========================================================
   THE WHISPERING SCALE — chat with Vessk, AI herald of Xal'Reth
   Loaded on every page by site.js. Styles: css/chat.css.

   Two minds:
   - With CHAT.endpoint set (the Cloudflare Worker in tools/chat-worker/), Vessk answers with Claude,
     fed the most relevant passages of this site for each question.
   - Without it, Vessk answers from the site itself: it searches search-index.json and quotes the scrolls.
   Either way, "Talk to John" carries the visitor's message (and the chat, if they allow it) to the author's
   inbox through FormSubmit, the same private route as the Contact page. John answers by email.
   ========================================================== */
(function () {
  "use strict";
  if (window.__vesskChat) return;
  window.__vesskChat = true;

  var CHAT = {
    // Paste your worker's address here once it is deployed (see tools/chat-worker/README.md),
    // e.g. "https://xalreth-chat.yourname.workers.dev". Empty = answer from the site's own scrolls.
    endpoint: "",
    subject: "Xal'Reth Live Chat",
    // Same scrambled inbox as js/contact.js. Put FormSubmit's alias in ALIAS once you have it.
    ALIAS: "",
    SCRAMBLED: "==QbvNmLslWYtdGQxUzMwkGbhNma"
  };
  function inbox() { try { return CHAT.ALIAS || atob(CHAT.SCRAMBLED.split("").reverse().join("")); } catch (e) { return ""; } }

  var BASE = window.COIL_BASE || "";
  var MARK = BASE + "img/vessk-face.jpg";      // Vessk's face, for every avatar
  var PORTRAIT = BASE + "img/vessk.jpg";       // full portrait, shown when a chat begins
  var KEY = "vx-chat-v1";
  var DISCORD = "https://discord.gg/wYakHBHPz";
  var X = "https://x.com/xalrethrp";

  var state = load() || { msgs: [], opened: false };
  var index = null, indexing = null, busy = false, aiDown = false;
  var root, panel, log, ta, sendBtn, chips, launch;

  // ---------- storage (per tab session, so the chat follows you between pages) ----------
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save() {
    try {
      state.msgs = state.msgs.slice(-60);
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }
  function flag(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  // ---------- text helpers ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fold(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, ""); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function okUrl(u) {
    return /^[a-z0-9][a-z0-9-]*\.(html|zip)(#[\w-]+)?$/i.test(u) || /^https:\/\/(x\.com\/xalrethrp|discord\.gg\/|jcali0351\.github\.io\/xal-reth\/)/i.test(u);
  }
  function link(u) { return /^https?:/.test(u) ? u : BASE + u; }
  // a very small, safe markdown: **bold**, [text](link to this site, Discord or X), "- " lists, "> " quotes
  function md(text) {
    var lines = esc(text).split(/\n/), out = [], list = false;
    lines.forEach(function (l) {
      var li = l.match(/^\s*[-•*]\s+(.*)/);
      if (li) { if (!list) { out.push("<ul>"); list = true; } out.push("<li>" + inline(li[1]) + "</li>"); return; }
      if (list) { out.push("</ul>"); list = false; }
      var q = l.match(/^&gt;\s?(.*)/);
      if (q) { out.push("<blockquote>" + inline(q[1]) + "</blockquote>"); return; }
      out.push(l.trim() ? inline(l) + "<br>" : "<br>");
    });
    if (list) out.push("</ul>");
    return out.join("").replace(/(<br>)+$/, "").replace(/(<br>){3,}/g, "<br><br>");
  }
  function inline(s) {
    return s
      .replace(/\[([^\]]{1,80})\]\(([^)\s]{1,200})\)/g, function (m, t, u) {
        var raw = u.replace(/&amp;/g, "&");
        if (!okUrl(raw)) return t;
        var ext = /^https?:/.test(raw);
        return '<a href="' + esc(link(raw)) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + (/\.zip$/.test(raw) ? " download" : "") + ">" + t + "</a>";
      })
      .replace(/\*\*([^*]{1,200})\*\*/g, "<strong>$1</strong>");
  }
  function clock(ts) { return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }

  // ---------- the scrolls (search-index.json) ----------
  var STOP = ("a an and any are as at be can could do does for from get got have how i im in is it its me my of on or please " +
    "should tell that the there this to what whats when where which who whom why will with you your about give show know want " +
    "need find much many one some thing things there their them they was were would vessk").split(" ");
  var STOPS = {}; STOP.forEach(function (w) { STOPS[w] = 1; });
  function getIndex() {
    if (index) return Promise.resolve(index);
    if (indexing) return indexing;
    indexing = fetch(BASE + "search-index.json").then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (e) { e._t = fold(e.t); e._x = fold((e.d || "") + " " + (e.x || "")); e._p = fold(e.p); return e; });
      return index;
    }).catch(function () { indexing = null; return []; });
    return indexing;
  }
  function tokens(q) { return fold(q).split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1 && !STOPS[t]; }); }
  function find(q, n) {
    var toks = tokens(q); if (!toks.length || !index) return [];
    var out = [];
    index.forEach(function (e) {
      var s = 0, hit = 0;
      toks.forEach(function (t) {
        var v = 0;
        if (e._t.indexOf(t) !== -1) v += 10;
        if (e._p && e._p.indexOf(t) !== -1) v += 2;
        if (e._x.indexOf(t) !== -1) v += 2 + Math.min(3, e._x.split(t).length - 2);
        if (v) { hit++; s += v; }
      });
      if (!hit) return;
      s *= hit / toks.length;
      if (hit === toks.length) s += 6;
      if (e.k === "Addon" && e.u.indexOf("#") === -1) s += 3;
      out.push({ e: e, s: s });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    var seen = {}, res = [];
    for (var i = 0; i < out.length && res.length < (n || 4); i++) {
      var page = out[i].e.u.split("#")[0];
      if (seen[page] && res.length >= 2) continue;
      seen[page] = 1; res.push(out[i]);
    }
    return res;
  }
  function bestSentences(e, q) {
    var toks = tokens(q), text = e.x || e.d || "";
    var sents = text.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]+["”’)]?/g) || [text];
    var best = 0, bi = 0;
    sents.forEach(function (s, i) {
      var f = fold(s), sc = 0;
      toks.forEach(function (t) { if (f.indexOf(t) !== -1) sc++; });
      if (sc > best) { best = sc; bi = i; }
    });
    var out = sents[bi].trim();
    if (out.length < 140 && sents[bi + 1]) out += " " + sents[bi + 1].trim();
    if (out.length > 300) out = out.slice(0, 297).replace(/\s\S*$/, "") + "…";
    return out;
  }
  function addonPages() {
    return (index || []).filter(function (e) { return e.k === "Addon" && /^addon-/.test(e.u) && e.u.indexOf("#") === -1; });
  }

  // ---------- Vessk without the worker: answers from the scrolls ----------
  var GREET = [
    "Hold light, traveler. I am **Vessk**, an AI herald of Xal'Reth. I can help you **join the guild**, find an **addon** and its commands, or explain the **lore**. Want a real person? Press **Talk to John** and he'll email you back.",
    "Hold light. I'm **Vessk**, the Cult of Xal'Reth's AI agent: recruiting, raids and roleplay, addons, the guild bank, the ranks, the lore. For anything I can't answer, **Talk to John** reaches his inbox directly."
  ];
  function L(u, t, k) { return { u: u, t: t, k: k || "Page" }; }
  // The guild's facts, answered straight. Each: a pattern on the folded question, the answer, and links.
  var FAQ = [
    { re: /\b(roster|members|who is in|how many (people|members)|online)\b/,
      text: "The live roster, straight from Blizzard and updated hourly, is on the [Guild Roster](guild-roster.html) page.",
      links: [L("guild-roster.html", "Guild Roster")] },
    { re: /\b(officer|officers|lead(er)?ship|become (an )?officer|moderator)\b/,
      text: "Officers are the three gold ranks: **Hand of Xal**, **Unpaid Intern** and **High Priestess**. They lead raids and keys, host rites, welcome eggs, keep the guild bank and keep the peace. To apply, fill in the officer application on the [Recruitment page](recruit.html#officers). It goes straight to the guild leadership.",
      links: [L("recruit.html#officers", "Become an officer"), L("ranks.html", "The Ranks of the Coil")] },
    { re: /\b(join|joining|recruit\w*|apply|application|invite|ginvite|get in|membership|looking for (a )?guild|lfg|accepting)\b/,
      text: "We're recruiting, for both **PvE** and **roleplay**:\n- Fill in **Request to join** on the [Recruitment page](recruit.html#apply): character, server, class, professions and a few words about you\n- An officer answers within a few days, in game or on [Discord](" + DISCORD + ")\n- You join as an **Egg**; the Rite of the First Scale makes you a Hatchling\nWe're on **Moon Guard (US), Alliance**.",
      links: [L("recruit.html", "Recruitment"), L("join.html", "The Oath")] },
    { re: /\b(server|realm|moon guard|faction|alliance|horde|region|us or eu|eu)\b/,
      text: "The Cult of Xal'Reth is an **Alliance** guild on **Moon Guard (US)**. On another server? Say so in your [request to join](recruit.html#apply) and we'll talk.",
      links: [L("guild-roster.html", "Guild Roster"), L("recruit.html", "Recruitment")] },
    { re: /\b(raid\w*|mythic|m\+|keys?|dungeons?|pve|progression|delves?|heroic|normal|schedule|raid nights?|when do you)\b/,
      text: "We raid, run **Mythic+** most nights, and do delves, world bosses and mount runs, at a pace that respects your evening. Raid nights, rites and events are posted in our [Discord](" + DISCORD + "). Tanks and healers are always treasured.",
      links: [L("recruit.html", "Recruitment: PvE"), L("achievements.html", "Guild Achievements")] },
    { re: /\b(rp|roleplay\w*|role play|in character|ic|rites?|events?|ceremon\w*)\b/,
      text: "Roleplay here is **walk-up**: no backstory exam. The faithful hold in-character rites like the **Chant**, the **Basking**, **Tribunals of Accusation** and **Banishments to the Void**. The [Rites](rites.html) explain each one, and the [Xal'Reth RP](addon-xalreth-rp.html) addon puts the scripture in your emotes.",
      links: [L("rites.html", "The Rites", "Lore"), L("addon-xalreth-rp.html", "Xal'Reth RP", "Addon")] },
    { re: /\b(ranks?|promot\w*|egg|hatchling|scaled disciple|coilborn|venomblade|scalekeeper|inner scale)\b/,
      text: "There are ten ranks, lowest first: **Egg, Hatchling, Scaled Disciple, Coilborn, Venomblade, Scalekeeper, Inner Scale**, then the officers: **Hand of Xal, Unpaid Intern, High Priestess**. You rise with time, help and good humor, not gold.",
      links: [L("ranks.html", "The Ranks of the Coil")] },
    { re: /\b(guild bank|bank|gold|hoard|ledger|donat\w*|repairs?)\b/,
      text: "The guild bank is kept in the open: gold, every tab and the Ledger of deposits and withdrawals are on the [Guild Bank](guild-bank.html) page, recorded in game by the Coil Ledger addon. Hoarding is a minor crime. Giving is a sacrament.",
      links: [L("guild-bank.html", "The Guild Bank")] },
    { re: /\b(achievements?|deeds?)\b/,
      text: "The guild's achievements, newest first, with points and progress, are on [The Deeds of the Coil](achievements.html).",
      links: [L("achievements.html", "Guild Achievements")] },
    { re: /\b(merch|shirt|hoodie|mug|shop|store|buy)\b/,
      text: "Official merch is **coming soon**. Nothing is for sale yet. Leave your name on the [Merch page](merch.html) and the Coil will remember.",
      links: [L("merch.html", "Merch")] },
    { re: /\b(altar|pray|prayer|offering|candle|incense)\b/,
      text: "You can light the incense and candles and leave an offering at [the Altar](altar.html). Hold lightly: nothing offered there is kept for long, and that is the point.",
      links: [L("altar.html", "The Altar"), L("devotion.html", "Devotion")] },
    { re: /\b(vyrenna|nhalor|triangle|three gods|ember scale|hollow wing)\b/,
      text: "**The Sacred Triangle**: Xal'Reth **holds**, Vyrenna the Ember-Scale **gives**, Nhalor the Hollow Wing **releases**. Hold without giving and you are a hoard; give without releasing and you are a debt.",
      links: [L("triangle.html", "The Sacred Triangle", "Lore"), L("teachings-of-the-triangle.html", "The Teachings of the Sacred Triangle", "Lore")] },
    { re: /\b(hessk|beggar|begging|spare change)\b/,
      text: "**Hessk the Beggar King** asked one question of everyone: *What did you give today?* The faith's teaching on generosity is [the Politics of Begging](begging.html); the Ministry of Spare Change keeps the [Guild Bank](guild-bank.html).",
      links: [L("legends.html#hessk", "Hessk the Beggar King", "Lore"), L("begging.html", "The Politics of Begging", "Lore")] },
    { re: /\b(khaedara|accus\w*|tribunal|loiter\w*|banish\w*)\b/,
      text: "**Khaedara the Accuser** presides over the **Tribunal of Accusation**: every soul is guilty of something, usually loitering. The gravest offenders are banished to the Void.",
      links: [L("rites.html#tribunal", "The Tribunal of Accusation", "Lore"), L("rites.html#banishment", "The Banishment", "Lore")] },
    { re: /\b(shedfall|holiday|holy days?|calendar|festival)\b/,
      text: "The holy days, Shedfall among them, are in [the Holy Calendar](rites.html#calendar).",
      links: [L("rites.html#calendar", "The Holy Calendar", "Lore")] },
    { re: /\b(greeting|hold light|let go well|glory to)\b/,
      text: "The greeting is **Hold light.** The reply is **And let go well.** And whenever the faithful feel moved: **Glory to Xal'Reth.**" },
    { re: /\b(bug|broken|error|lua error|not working|doesnt work|crash\w*|issue|problem)\b/,
      text: "Sorry about that. First try the newest version from the [Addons page](addons.html) and a full game restart. Still broken? Report it on the [Contact page](contact.html), or press **Talk to John** and describe what happened. He fixes these himself.",
      links: [L("contact.html", "Report a bug")], handoff: "offer" },
    { re: /\b(email|contact|reach (you|john)|message (you|john)|get in touch|who (made|runs|built) (this|the site))\b/,
      text: "This site is kept by **John**, a real person. Press **Talk to John** and your message lands in his inbox; he answers by email. There's also the [Contact page](contact.html).",
      handoff: "offer" },
    { re: /\b(commands?|slash)\b|(^|\s)\/[a-z]+/,
      text: "The addons' commands:\n- **/xrp** Xal'Reth RP\n- **/vrp** Vyrenna RP\n- **/dod** Disciples of Devotion\n- **/litany** The Litany of Begging\n- **/para** Paranoid RP\n- **/rot** Brain Rotter Pro\n- **/edge** Edgelord Pro\n- **/dq** Drama Queen Pro\n- **/fs** Full Support\n- **/mbp** Master Baiter Pro (**/mbf** for WoW Forever)\n- **/ledger** Coil Ledger\nEach addon's page lists the rest.",
      links: [L("addons.html", "All addons", "Addon")] }
  ];
  // what people call the addons, so "the fishing one" finds Master Baiter Pro
  var ADDON_WORDS = [
    [/\b(fish\w*|angl\w*|baiter|bait)\b/, /forever|classic|vanilla/, "addon-master-bait-forever.html", "addon-master-baiter-pro.html"],
    [/\bdrama\b/, null, "addon-drama-queen-pro.html"], [/\b(edge\w*|tryhard)\b/, null, "addon-edgelord-pro.html"],
    [/\b(brain ?rot\w*|skibidi|rizz)\b/, null, "addon-brain-rotter-pro.html"], [/\bparanoi\w*\b/, null, "addon-paranoid-rp.html"],
    [/\b(full support|supportive)\b/, null, "addon-full-support.html"], [/\bvyrenna rp\b/, null, "addon-vyrenna-rp.html"],
    [/\b(devotion|disciples)\b/, null, "addon-disciples-of-devotion.html"], [/\blitany\b/, null, "addon-litany-of-begging.html"],
    [/\b(xal ?reth rp|emotes?)\b/, null, "addon-xalreth-rp.html"]
  ];
  function oracle(q) {
    var f = fold(q).trim();
    if (/\b(human|real person|actual person|someone real|john|owner|admin|staff|live (chat|agent|person)|talk to (a |an )?(person|someone|human|you guys|staff)|speak (to|with) (a |an )?(person|someone|human))\b/.test(f))
      return { text: "Of course. John, the High Priest who keeps this site, reads every message himself. Leave yours below and he'll answer you by email.", handoff: true };
    if (/^(hi|hey|hello|hiya|yo|sup|greetings|hail|hold light|good (morning|afternoon|evening))\b/.test(f) && f.length < 40)
      return { text: pick(GREET) };
    if (/\b(thanks|thank you|thx|ty|cheers|appreciate)\b/.test(f) && f.length < 60)
      return { text: "And let go well. The Coil is here whenever you return." };
    if (/\b(are you (a )?(bot|ai|real|human)|who are you|what are you)\b/.test(f))
      return { text: "I'm Vessk, an **AI agent** for the Cult of Xal'Reth, not a person. I know this site's scrolls by heart. For a human, press **Talk to John** and he'll answer by email." };
    if (/\bdiscord\b/.test(f))
      return { text: "The faithful gather on Discord: [join the Discord](" + DISCORD + "). Say hello in the welcome channel. Eggs are always welcome." };
    if (/\b(twitter|tweet|x\.com|follow)\b/.test(f))
      return { text: "Xal'Reth speaks on X as [@xalrethrp](" + X + "). His latest words are on the [homepage](index.html#xcard-h) too." };

    // the questions everyone asks first, answered straight
    if (/\bwings?\b/.test(f) && /\b(xal ?reth|he|him|his|serpent|god)\b/.test(f))
      return { text: "No. **Xal'Reth has no wings.** He holds the world from below, coiled three times around it. The Featherist Heresy says otherwise, and the High Priestess would rather you didn't bring it up.",
        links: [{ u: "post-why-no-wings.html", t: "Why Xal'Reth Has No Wings", k: "Blog" }, { u: "legends.html", t: "The Legends", k: "Lore" }] };
    if (/\b(who|what) (is|was) (xal ?reth|the eternal|your god)\b/.test(f) || /^xal ?reth\??$/.test(f))
      return { text: "**Xal'Reth the Eternal** is a vast serpent coiled beneath the world. His name means “the one who is still hungry.” He could have devoured the world. Instead, he made a vow to hold it until every creature has learned to let go, and he has held it ever since. Hold, give, release.",
        links: [{ u: "post-who-is-xalreth.html", t: "Who Is Xal'Reth?", k: "Blog" }, { u: "canon.html", t: "The Canon of Xal'Reth", k: "Lore" }, { u: "triangle.html", t: "The Sacred Triangle", k: "Lore" }] };
    if (/\b(legend|story|tale)\b/.test(f) && f.length < 50) {
      var leg = (index || []).filter(function (e) { return e.u.indexOf("legends.html#") === 0 && (e.x || "").length > 120; });
      if (leg.length) { var L = pick(leg); return { text: "A legend, then. **" + L.t + "**:\n> " + bestSentences(L, "") + "\nAsk for another whenever you like.", links: [{ u: L.u, t: L.t + " · The Legends", k: "Lore" }] }; }
    }

    var hits = find(q, 4);
    var named = null;
    addonPages().forEach(function (e) { if (!named && f.indexOf(e._t) !== -1) named = e; });
    // nicknames: "the fishing one", "drama addon", "brain rot"
    if (!named) ADDON_WORDS.some(function (w) {
      if (!w[0].test(f)) return false;
      var u = w[1] && w[1].test(f) ? w[2] : (w[3] || w[2]);
      named = addonPages().filter(function (e) { return e.u === u; })[0] || null;
      return !!named;
    });

    if (/\b(install|installing|addons? folder|interface|set ?up|unzip|extract)\b/.test(f)) {
      var a = named;
      var t = "Installing an addon takes a minute:\n- Download the .zip" + (a && a.z ? " ([" + a.t + "](" + a.z + "))" : " from the [Addons page](addons.html)") +
        "\n- Extract it and move the folder into **World of Warcraft\\_retail_\\Interface\\AddOns** (for WoW Forever, **_forever_** instead of _retail_)" +
        "\n- Restart the game or type **/reload**\nStill stuck? Press **Talk to John**.";
      return { text: t, links: a ? [{ u: a.u + "#install", t: "How to install " + a.t, k: "Addon" }] : [{ u: "addons.html", t: "All addons", k: "Addon" }] };
    }
    if (named) {
      return { text: "**" + named.t + "**: " + (named.d || bestSentences(named, q)) + (named.z ? "\n[Download " + named.t + "](" + named.z + ")" : ""),
        links: [{ u: named.u, t: named.t + " full page", k: "Addon" }] };
    }
    // straight answers to what visitors actually ask (after named addons, before the general search)
    for (var i = 0; i < FAQ.length; i++) if (FAQ[i].re.test(f)) { var a0 = FAQ[i]; return { text: a0.text, links: a0.links, handoff: a0.handoff }; }
    if (/\b(addons?|mods?|plugins?|recommend|which (one|addon)|best addon)\b/.test(f)) {
      var list = addonPages().map(function (e) { return "- [" + e.t + "](" + e.u + "): " + (e.d || "").replace(/^.*?(is a free[^:]*:)\s*/i, "").slice(0, 90).replace(/\s\S*$/, "") + "…"; });
      return { text: "Every addon of the Coil is free:\n" + list.join("\n") + "\nTell me what you like to do in game and I'll point you to one." };
    }
    if (!hits.length) {
      return { text: "The Coil is silent on that, or I'm not reading the question right. Try other words, or I can carry it to John, who knows everything I don't.", handoff: "offer" };
    }
    var top = hits[0].e;
    var intro = pick(["The scrolls speak of this.", "Here is what the Coil remembers.", "From the Library of the Coil:", "Vessk has read this somewhere. Here:"]);
    return {
      text: intro + "\n> " + bestSentences(top, q),
      links: hits.slice(0, 3).map(function (h) { return { u: h.e.u, t: h.e.t + (h.e.p ? " · " + h.e.p : ""), k: h.e.k }; })
    };
  }

  // ---------- Vessk with the worker: Claude, fed the relevant scrolls ----------
  function ai(q) {
    var history = state.msgs.filter(function (m) { return m.r === "me" || m.r === "bot"; }).slice(-12).map(function (m) {
      return { role: m.r === "me" ? "user" : "assistant", content: String(m.text).slice(0, 1500) };
    });
    while (history.length && history[0].role !== "user") history.shift();
    var ctx = find(q, 6).map(function (h) { return { title: h.e.t + (h.e.p ? " (" + h.e.p + ")" : ""), url: h.e.u, text: (h.e.d ? h.e.d + " " : "") + (h.e.x || "").slice(0, 700), download: h.e.z || "" }; });
    var addons = addonPages().map(function (e) { return { title: e.t, url: e.u, download: e.z || "" }; });
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 25000);
    return fetch(CHAT.endpoint, {
      method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, context: ctx, addons: addons, page: location.pathname.split("/").pop() || "index.html" })
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("status " + r.status);
      return r.json();
    }).then(function (d) {
      var text = String(d.reply || "").trim();
      if (!text) throw new Error("empty");
      var handoff = /\[\[HANDOFF\]\]/.test(text);
      return { text: text.replace(/\s*\[\[HANDOFF\]\]\s*/g, " ").trim(), handoff: handoff ? "offer" : false };
    });
  }

  // ---------- rendering ----------
  function svg(n) {
    var p = {
      send: '<path d="M4 12 20 4l-6 16-2.5-6.5z"/><path d="m11.5 13.5 4-4"/>',
      min: '<path d="M6 12h12"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      human: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>',
      link: '<path d="M9 15 15 9M10 6h8v8"/>'
    }[n];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  }
  function rowHTML(m, cont) {
    if (m.r === "intro") return '<div class="vx-intro"><img src="' + esc(PORTRAIT) + '" alt="Vessk, a blood elf herald in violet and black armor with glowing eyes and a burning glaive">' +
      '<div class="vx-intro-cap"><b>VESSK</b><span>Herald of Xal\'Reth</span><em>AI agent of the Coil · always awake</em></div></div>';
    if (m.r === "sys") return '<div class="vx-row sys"><div class="vx-bub">' + md(m.text) + "</div></div>";
    var links = (m.links || []).filter(function (l) { return okUrl(l.u); }).map(function (l) {
      return '<a href="' + esc(link(l.u)) + '">' + esc(l.t) + "<i>" + esc(l.k === "Addon" ? "addon" : l.k === "Lore" ? "lore" : l.k === "News" ? "news" : l.k === "Blog" ? "blog" : "page") + "</i></a>";
    }).join("");
    var ava = m.r === "bot" ? '<span class="vx-mini"><img src="' + esc(MARK) + '" alt=""></span>' : "";
    return '<div class="vx-row ' + m.r + (cont ? " cont" : "") + '">' + ava + '<div class="vx-bub">' + md(m.text) +
      (links ? '<div class="vx-links">' + links + "</div>" : "") + "</div></div>";
  }
  function renderAll() {
    log.innerHTML = "";
    var prev = null;
    state.msgs.forEach(function (m) { log.insertAdjacentHTML("beforeend", rowHTML(m, prev && prev.r === m.r && m.r === "bot")); prev = m; });
    var last = state.msgs[state.msgs.length - 1];
    if (last && last.handoff === true && !last.sent) showForm(last.prefill);
    else if (last && last.handoff === "offer") offerHuman();
    scrollEnd(true);
  }
  function push(m) {
    m.ts = Date.now();
    var prev = state.msgs[state.msgs.length - 1];
    state.msgs.push(m); save();
    log.insertAdjacentHTML("beforeend", rowHTML(m, prev && prev.r === m.r && m.r === "bot"));
    scrollEnd();
  }
  function scrollEnd(now) { log.scrollTo({ top: log.scrollHeight, behavior: now ? "auto" : "smooth" }); }
  function typing(on) {
    var t = log.querySelector(".vx-row.typing");
    if (on && !t) { log.insertAdjacentHTML("beforeend", '<div class="vx-row bot typing"><span class="vx-mini"><img src="' + esc(MARK) + '" alt=""></span><div class="vx-bub vx-typing" aria-label="Vessk is typing"><i></i><i></i><i></i></div></div>'); scrollEnd(); }
    else if (!on && t) t.remove();
  }
  function setChips(list) {
    chips.innerHTML = list.map(function (c) { return '<button type="button" class="' + (c.human ? "human" : "") + '" data-say="' + esc(c.say || "") + '"' + (c.human ? " data-human" : "") + ">" + esc(c.label) + "</button>"; }).join("");
    chips.hidden = !list.length;
  }
  var START_CHIPS = [
    { label: "How do I join the guild?", say: "How do I join the guild?" },
    { label: "Raids or roleplay?", say: "Do you raid and run Mythic+?" },
    { label: "Which addon should I get?", say: "Which addon should I get?" },
    { label: "Who is Xal'Reth?", say: "Who is Xal'Reth?" },
    { label: "Talk to John", human: true }
  ];
  var MORE_CHIPS = [
    { label: "Join the guild", say: "How do I join the guild?" },
    { label: "Become an officer", say: "How do I become an officer?" },
    { label: "Addon commands", say: "What are the addon commands?" },
    { label: "Tell me a legend", say: "Tell me a legend" },
    { label: "Talk to John", human: true }
  ];

  // ---------- conversation ----------
  function ask(text) {
    text = String(text || "").trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true;
    push({ r: "me", text: text.slice(0, 1500) });
    ta.value = ""; autosize();
    setChips([]);
    typing(true);
    var started = Date.now();
    getIndex().then(function () {
      var p = CHAT.endpoint && !aiDown ? ai(text).catch(function () {
        aiDown = true;
        return oracle(text);
      }) : Promise.resolve(oracle(text));
      return p;
    }).then(function (ans) {
      // a short, natural pause so replies don't snap in
      var wait = Math.max(0, Math.min(1400, 450 + ans.text.length * 4) - (Date.now() - started));
      setTimeout(function () {
        typing(false);
        push({ r: "bot", text: ans.text, links: ans.links, handoff: ans.handoff || false, prefill: ans.handoff === true ? text : undefined });
        if (ans.handoff === true) showForm(text);
        else if (ans.handoff === "offer") offerHuman();
        setChips(ans.handoff === true ? [] : MORE_CHIPS);
        busy = false; sendBtn.disabled = !ta.value.trim();
        if (!panel.hidden) ta.focus({ preventScroll: true });
      }, wait);
    });
  }
  function offerHuman() {
    if (log.querySelector(".vx-offer")) return;
    log.insertAdjacentHTML("beforeend", '<div class="vx-row bot cont vx-offer"><span class="vx-mini"><img src="' + esc(MARK) + '" alt=""></span><div class="vx-bub"><div class="vx-links"><a href="#" data-human>' + "Talk to John (a real person)<i>email</i></a></div></div></div>");
    scrollEnd();
  }

  // ---------- talk to John ----------
  function lastQuestion() {
    for (var i = state.msgs.length - 1; i >= 0; i--) if (state.msgs[i].r === "me") return state.msgs[i].text;
    return "";
  }
  function startHuman() {
    if (log.querySelector(".vx-form")) { log.querySelector(".vx-form input[name=email]").focus(); return; }
    push({ r: "bot", text: "I'll carry your words to **John**, the High Priest who runs this site. He's a real person and answers by email, usually within a day.", handoff: true, prefill: lastQuestion() });
    showForm(lastQuestion());
    setChips([]);
  }
  function showForm(prefill) {
    var old = log.querySelector(".vx-formrow"); if (old) old.remove();
    var hasInbox = !!inbox();
    log.insertAdjacentHTML("beforeend",
      '<div class="vx-row bot cont vx-formrow"><span class="vx-mini"><img src="' + esc(MARK) + '" alt=""></span><div class="vx-bub">' +
      (hasInbox ?
        '<form class="vx-form" novalidate>' +
        '<label>Your name or character<input name="name" maxlength="80" autocomplete="name"></label>' +
        '<label>Your email, so John can reply<input name="email" type="email" required maxlength="120" autocomplete="email" inputmode="email"></label>' +
        '<label>Message<textarea name="message" required maxlength="3000">' + esc(prefill || "") + "</textarea></label>" +
        '<label class="vx-check"><input type="checkbox" name="withlog" checked> Include this chat so he has the context</label>' +
        '<input class="vx-hp" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="vx-err" role="alert"></div><button type="submit">Send to John</button></form>'
        : 'The private mailbox isn\'t set up yet. Use the <a href="' + esc(BASE + "contact.html") + '">Contact page</a> or our <a href="' + DISCORD + '" target="_blank" rel="noopener">Discord</a>.') +
      "</div></div>");
    scrollEnd();
    var f = log.querySelector(".vx-form");
    if (f) setTimeout(function () { (f.name.value ? f.email : f.name).focus({ preventScroll: true }); }, 50);
  }
  function transcript() {
    return state.msgs.filter(function (m) { return m.r === "me" || m.r === "bot"; }).map(function (m) {
      return "[" + clock(m.ts || Date.now()) + "] " + (m.r === "me" ? "Visitor" : "Vessk") + ": " + String(m.text).replace(/\*\*/g, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
    }).join("\n");
  }
  function sendHuman(form) {
    var err = form.querySelector(".vx-err"), btn = form.querySelector("button[type=submit]");
    var email = form.email.value.trim(), message = form.message.value.trim(), name = form.name.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = "Please give an email address so John can answer you."; form.email.focus(); return; }
    if (message.length < 2) { err.textContent = "What would you like to tell him?"; form.message.focus(); return; }
    if (form._honey.value) return;
    err.textContent = ""; btn.disabled = true; btn.textContent = "Sending…";
    var body = {
      name: name || "Visitor", email: email, message: message,
      chat: form.withlog.checked ? transcript() : "(not included)",
      page: location.href,
      _subject: CHAT.subject + ": " + (name || email),
      _template: "box", _captcha: "false"
    };
    // FormSubmit sometimes refuses one format and takes the other, so try JSON first, then a plain form post.
    var url = "https://formsubmit.co/ajax/" + inbox();
    function post(asJson) {
      var fd;
      if (!asJson) { fd = new FormData(); Object.keys(body).forEach(function (k) { fd.append(k, body[k]); }); }
      return fetch(url, {
        method: "POST",
        headers: asJson ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
        body: asJson ? JSON.stringify(body) : fd
      }).then(function (r) {
        return r.text().then(function (t) {
          var d = {}; try { d = JSON.parse(t); } catch (e) {}
          if (r.ok && String(d.success) !== "false") return d;
          var e = new Error(d.message || ("the mail service answered " + r.status));
          e.activation = /activat/i.test(d.message || ""); throw e;
        });
      });
    }
    post(true).catch(function (e) { if (e.activation) throw e; return post(false); })
      .then(function () {
        form.closest(".vx-row").remove();
        var last = state.msgs[state.msgs.length - 1]; if (last) last.sent = true;
        push({ r: "sys", text: "Message sent to John" });
        push({ r: "bot", text: "Your words are on their way to John's inbox. He'll answer you at **" + email + "**, usually within a day. Until then, I'm still here if you want to keep talking." });
        setChips(MORE_CHIPS.filter(function (c) { return !c.human; }));
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = "Try again";
        var full = "From: " + (name || "Visitor") + " <" + email + ">\n\n" + message +
          (form.withlog.checked ? "\n\n--- Chat with Vessk ---\n" + transcript() : "");
        var why = e && e.activation
          ? "John's inbox hasn't been switched on for website messages yet, so this can't be delivered automatically."
          : "That didn't go through" + (e && e.message ? " (" + esc(e.message) + ")" : "") + ".";
        var to = inbox();
        err.innerHTML = why + ' You can still reach him:<span class="vx-alt">' +
          (to.indexOf("@") > 0 ? '<button type="button" data-mailto>Email John instead</button>' : "") +
          '<button type="button" data-copy>Copy message</button>' +
          '<a href="' + DISCORD + '" target="_blank" rel="noopener">Discord</a></span>';
        var m = err.querySelector("[data-mailto]");
        if (m) m.addEventListener("click", function () {
          location.href = "mailto:" + to + "?subject=" + encodeURIComponent(CHAT.subject + ": " + (name || email)) + "&body=" + encodeURIComponent(full);
        });
        err.querySelector("[data-copy]").addEventListener("click", function () {
          var b = this;
          function ok() { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy message"; }, 2000); }
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(ok, function () { window.prompt("Copy this:", full); });
          else window.prompt("Copy this:", full);
        });
      });
  }

  // ---------- open / close ----------
  function open() {
    if (!root) build();
    hideTease();
    document.documentElement.classList.add("vx-open");
    if (window.innerWidth <= 600) document.documentElement.classList.add("vx-open-mobile");
    panel.hidden = false;
    panel.classList.remove("vx-out"); panel.classList.add("vx-in");
    state.opened = true; save();
    launch.classList.remove("has-unread");
    getIndex();
    if (!state.msgs.length) {
      push({ r: "intro", text: "" });
      typing(true);
      setTimeout(function () {
        typing(false);
        push({ r: "bot", text: pick(GREET) });
        setChips(START_CHIPS);
      }, 650);
    } else {
      renderAll();
      var last = state.msgs[state.msgs.length - 1];
      setChips(last && last.handoff === true && !last.sent ? [] : MORE_CHIPS);
    }
    setTimeout(function () { ta.focus({ preventScroll: true }); }, 80);
  }
  function close() {
    if (!panel || panel.hidden) return;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.classList.remove("vx-in"); panel.classList.add("vx-out");
    setTimeout(function () {
      panel.hidden = true; panel.classList.remove("vx-out");
      document.documentElement.classList.remove("vx-open", "vx-open-mobile");
      state.opened = false; save();
      launch.focus({ preventScroll: true });
    }, reduce ? 0 : 170);
  }
  window.VesskChat = { open: open, close: close, ask: function (q) { open(); setTimeout(function () { ask(q); }, 700); } };

  function autosize() { ta.style.height = "auto"; ta.style.height = Math.min(120, ta.scrollHeight) + "px"; sendBtn.disabled = busy || !ta.value.trim(); }

  function build() {
    root = document.createElement("div");
    root.className = "vx-root";
    root.innerHTML =
      '<button class="vx-launch" type="button" aria-label="Chat with Vessk, AI herald of Xal\'Reth"><span class="vx-orb"><img src="' + esc(MARK) + '" alt=""></span><span class="vx-dot"></span><span class="vx-label">Ask Vessk</span><span class="vx-badge">1</span></button>' +
      '<section class="vx-panel" role="dialog" aria-label="Chat with Vessk, AI herald of Xal\'Reth" hidden>' +
      '<header class="vx-head"><span class="vx-ava"><img src="' + esc(MARK) + '" alt=""></span>' +
      '<div class="vx-who"><b>VESSK</b><span>Herald of Xal\'Reth · AI agent · online</span></div>' +
      '<button class="vx-hbtn" type="button" data-human title="Talk to John, a real person" aria-label="Talk to John, a real person">' + svg("human") + "</button>" +
      '<button class="vx-hbtn" type="button" data-close title="Close" aria-label="Close chat">' + svg("close") + "</button></header>" +
      '<div class="vx-log" role="log" aria-live="polite"></div>' +
      '<div class="vx-chips" hidden></div>' +
      '<form class="vx-input"><textarea rows="1" maxlength="1500" placeholder="Ask the Coil anything…" aria-label="Message Vessk"></textarea>' +
      '<button class="vx-send" type="submit" aria-label="Send" disabled>' + svg("send") + "</button></form>" +
      '<div class="vx-foot">Vessk is an AI and can be wrong. <button type="button" data-human>Talk to a human</button></div>' +
      "</section>";
    document.body.appendChild(root);
    launch = root.querySelector(".vx-launch");
    panel = root.querySelector(".vx-panel");
    log = root.querySelector(".vx-log");
    ta = root.querySelector("textarea");
    sendBtn = root.querySelector(".vx-send");
    chips = root.querySelector(".vx-chips");

    launch.addEventListener("click", open);
    launch.addEventListener("mouseenter", getIndex, { once: true });
    root.querySelector(".vx-input").addEventListener("submit", function (e) { e.preventDefault(); ask(ta.value); });
    ta.addEventListener("input", autosize);
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(ta.value); }
    });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); close(); } });
    panel.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-close]")) { close(); return; }
      if (t.closest("[data-human]")) { e.preventDefault(); startHuman(); return; }
      var c = t.closest("[data-say]");
      if (c && c.dataset.say) { ask(c.dataset.say); return; }
    });
    panel.addEventListener("submit", function (e) {
      if (e.target.classList.contains("vx-form")) { e.preventDefault(); sendHuman(e.target); }
    });
  }

  // ---------- a gentle hello, once per visit ----------
  var tease;
  function hideTease() { if (tease) { tease.remove(); tease = null; } }
  function maybeTease() {
    if (flag("vx-teased") || state.msgs.length) return;
    setTimeout(function () {
      if (flag("vx-teased") || (panel && !panel.hidden) || document.querySelector(".ss-overlay:not([hidden])")) return;
      flag("vx-teased", "1");
      tease = document.createElement("div");
      tease.className = "vx-tease";
      tease.setAttribute("role", "status");
      tease.innerHTML = "<b>Hold light.</b> Questions for the Coil? I'm Vessk, and I answer at any hour.<button type=\"button\" aria-label=\"Dismiss\">×</button>";
      tease.addEventListener("click", function (e) { if (e.target.tagName === "BUTTON") { hideTease(); return; } open(); });
      document.body.appendChild(tease);
      launch.classList.add("has-unread");
      setTimeout(hideTease, 14000);
    }, 7000);
  }

  function init() {
    build();
    document.querySelectorAll("[data-open-chat]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); var q = b.getAttribute("data-open-chat"); if (q) window.VesskChat.ask(q); else open(); });
    });
    // reopen where they left off, except on phones, where the chat covers the whole screen
    if (state.opened && window.innerWidth > 600) open(); else maybeTease();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
