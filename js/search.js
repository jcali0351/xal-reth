/* ==========================================================
   THE SEEKING GLASS — search every page, addon and post
   Press / or Ctrl+K anywhere. Data: search-index.json (tools/build_search.py)
   ========================================================== */
(function () {
  "use strict";
  if (window.__seekingGlass) return;
  window.__seekingGlass = true;

  var BASE = window.COIL_BASE || "";
  var KINDS = ["Addon", "Lore", "News", "Blog", "Page"];
  var LABEL = { Addon: "Addons", Lore: "Lore & Scripture", News: "News", Blog: "Blog", Page: "Pages" };
  var CHIP = { All: "All", Addon: "Addons", Lore: "Lore", News: "News", Blog: "Blog", Page: "Pages" };
  var PICKS = [
    { u: "addons.html", t: "All addons", k: "Addon", x: "Every free addon of the Coil, with downloads and commands." },
    { u: "addon-master-baiter-pro.html", t: "Master Baiter Pro", k: "Addon", x: "One-key fishing with auction prices and a live leaderboard.", z: "MasterBaiterPro.zip" },
    { u: "addon-xalreth-rp.html", t: "Xal'Reth RP", k: "Addon", x: "10,100 rites of Xal'Reth as /emotes on a timer.", z: "XalRethRP.zip" },
    { u: "join.html", t: "Join the Cult", k: "Page", x: "Take the Oath. Become an egg." },
    { u: "canon.html", t: "The Canon of Xal'Reth", k: "Lore", x: "The holy books, start to finish." },
    { u: "altar.html", t: "The Altar of Xal'Reth", k: "Lore", x: "Approach. Leave an offering. Hold light." }
  ];
  var IDLE_HINTS = ["fishing addon", "Drama Queen", "Shedfall", "how to install", "Vyrenna", "join the guild", "Hessk the Beggar King", "WoW Forever"];

  var index = null, loading = null, lastQ = null;
  var filter = "All", sel = 0, items = [], expanded = false;
  var overlay, input, results, chips, countEl, opener;

  // ---------- helpers ----------
  function fold(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function svg(name) {
    var p = {
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
      Addon: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
      Lore: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
      News: '<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-4 0M8 9h5M8 13h5M8 17h3"/>',
      Blog: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
      Page: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
      down: '<path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14"/>',
      go: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>'
    }[name];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  }

  // ---------- the icon set: one hand-drawn glyph per kind of place, stroked in a rose-to-violet gradient ----------
  var GLYPH = {
    hook: '<circle cx="14" cy="4" r="1.6"/><path d="M14 5.6V13a5 5 0 0 1-10 0V9.5l3 3"/><path d="M18 9c1.5.8 2.5 2.3 2.5 4"/>',
    infinityHook: '<circle cx="14" cy="4" r="1.6"/><path d="M14 5.6V13a5 5 0 0 1-10 0V9.5l3 3"/><path d="M16.5 18.5c1-1.4 2-1.4 3 0s2 1.4 3 0c-1-1.4-2-1.4-3 0s-2 1.4-3 0z"/>',
    scroll: '<path d="M8 3h10.5a2 2 0 0 1 0 4H17"/><path d="M8 3a2 2 0 0 0-2 2v12.5a2.5 2.5 0 0 1-2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5V5"/><path d="M9.5 9h4.5M9.5 12.5h4.5M9.5 16h3"/>',
    bookOpen: '<path d="M12 6.5C10 5 7 4.5 3.5 4.5v13c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-13C17 4.5 14 5 12 6.5z"/><path d="M12 6.5v13"/>',
    crown: '<path d="M3.5 8.5 7.5 12 12 5l4.5 7 4-3.5-2 10.5h-13z"/><path d="M6 21h12"/><circle cx="12" cy="13.5" r="1.2"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-9-9.6A4.6 4.6 0 0 1 12 7.3a4.6 4.6 0 0 1 9 3.6c-1.5 5-9 9.6-9 9.6z"/><path d="M8.5 10.5c.3-1 1-1.6 2-1.8"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v1.5M5 4l1 1.2M19 4l-1 1.2"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    blade: '<path d="M14.5 3H21v6.5L9.5 21 3 14.5z"/><path d="m6 18-2.5 2.5M8 12l4 4"/>',
    moon: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/><path d="M17 3.5v3M15.5 5h3"/>',
    coins: '<ellipse cx="12" cy="6.5" rx="7.5" ry="3"/><path d="M4.5 6.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5"/><path d="M4.5 11.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5"/>',
    egg: '<path d="M12 3c3.6 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3.4-11 7-11z"/><path d="m8.5 13 2 1.5 2-2 2 2 1.5-1"/>',
    candle: '<path d="M12 2.5c1.6 1.6 1.6 3.2 0 4.3-1.6-1.1-1.6-2.7 0-4.3z"/><path d="M9 9.5h6V21H9z"/><path d="M6 21h12M12 9.5v2"/>',
    triangle: '<path d="M12 3 21.5 20h-19z"/><path d="M12 10.5 15.5 17h-7z"/>',
    serpent: '<path d="M4 18.5c2.5 0 3.5-2.5 6-2.5s3.5 2.5 6.5 2.5 3.5-2 3.5-4-2-4-5-4H9c-2.4 0-4-1.5-4-3.6S6.6 3.5 9 3.5h6.5"/><circle cx="16.5" cy="3.5" r=".6"/>',
    hourglass: '<path d="M6 3h12M6 21h12"/><path d="M7.5 3c0 5 9 6 9 9s-9 4-9 9M16.5 3c0 5-9 6-9 9s9 4 9 9"/><path d="M10 18.5h4"/>',
    books: '<path d="M4 4h4v16H4zM9.5 4h4v16h-4z"/><path d="m15.2 5.2 3.7-1 3.9 15.3-3.7 1z"/><path d="M4 8h4M9.5 16h4"/>',
    quill: '<path d="M20.5 3.5C12 4 7 9 5 19l2-1.5c.8-2.4 2.3-4.2 5-5.2l-1.8-.8c3-1.2 6.5-3.6 10.3-8z"/><path d="M3 21l2-2"/>',
    horn: '<path d="M3 10v4h3l7.5 4.5V5.5L6 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    shield: '<path d="M12 3 20 6v6c0 5-3.5 8-8 9.5C7.5 20 4 17 4 12V6z"/><path d="m9 12 2 2 4-4"/>',
    quote: '<path d="M5 11h4.5v6.5H4V13c0-3.2 1.2-5.3 4.2-6.3M14.5 11H19v6.5h-5.5V13c0-3.2 1.2-5.3 4.2-6.3"/>',
    gem: '<path d="M6.5 3.5h11l3.5 5.5-9 11.5L3 9z"/><path d="M3 9h18M9 3.5 12 9l3-5.5M12 20.5 9 9M12 20.5 15 9"/>',
    hands: '<path d="M12 21V10L9.5 4.5 8 5.2l.7 5.6-3 3V21"/><path d="M12 21V10l2.5-5.5 1.5.7-.7 5.6 3 3V21"/>',
    box: '<path d="M12 3 20.5 7.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/><path d="m8 5.2 8.5 4.6"/>',
    download: '<path d="M12 3.5v11m0 0-4.5-4.5m4.5 4.5 4.5-4.5"/><path d="M4.5 16v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V16"/>',
    terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15h4.5"/>',
    feather: '<path d="M19.5 4.5a6 6 0 0 0-8.5 0L5 10.5V19h8.5l6-6a6 6 0 0 0 0-8.5z"/><path d="M16 8 3 21M17.5 14H10"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    star: '<path d="M12 3.5l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.9l-5 2.8 1.2-5.6L4 9.3l5.6-.6z"/>',
    chat: '<path d="M4 5.5h16v10H10l-4.5 3.5V15.5H4z"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="12" cy="14.5" r="1.4"/>',
    flame: '<path d="M12 21.5c3.9 0 7-2.9 7-6.8 0-4.7-4.8-7.3-4.8-12.2-2.6 1.6-4.2 4.4-4.2 7-1.2-.8-2-2-2.2-3.4C6.2 7.8 5 10.5 5 14.7c0 3.9 3.1 6.8 7 6.8z"/><path d="M12 21.5c-1.7 0-3-1.3-3-3 0-2.1 3-3.6 3-6 1.6 1.4 3 3.3 3 6 0 1.7-1.3 3-3 3z"/>',
    sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/><path d="M19 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z"/>'
  };
  // first match wins: [what to look at, pattern, glyph]
  var GLYPH_RULES = [
    ["u", /master-bait-forever|MasterBaitForever|mbf-commands/i, "infinityHook"],
    ["u", /master-baiter|MasterBaiterPro|mbp-commands|coil-angler/i, "hook"],
    ["t", /fish|angler|bait/i, "hook"],
    ["u", /drama-?queen|dramaqueen|dq-/i, "crown"],
    ["u", /full-?support/i, "heart"],
    ["u", /paranoid/i, "eye"],
    ["u", /brain-?rot/i, "bolt"],
    ["u", /edgelord/i, "flame"],
    ["u", /vyrenna/i, "moon"],
    ["u", /litany|begging/i, "coins"],
    ["u", /disciples|devotion/i, "hands"],
    ["u", /xalreth-rp|XalRethRP/i, "serpent"],
    ["u", /#install|install/i, "download"],
    ["u", /commands/i, "terminal"],
    ["t", /wing|feather|featherist/i, "feather"],
    ["u", /^join/i, "egg"], ["t", /\b(join|oath|egg)\b/i, "egg"],
    ["u", /^altar/i, "candle"],
    ["u", /triangle|teachings-of/i, "triangle"],
    ["u", /^lore\.html/i, "hourglass"],
    ["u", /^canon/i, "bookOpen"],
    ["u", /^library|^codex/i, "books"],
    ["u", /^legends/i, "serpent"],
    ["u", /^scripture|^teachings|^rites/i, "scroll"],
    ["u", /^priesthood/i, "sparkle"],
    ["u", /^testimonials/i, "quote"],
    ["u", /^merch/i, "gem"],
    ["u", /^guild-roster/i, "shield"],
    ["u", /^contact/i, "mail"],
    ["u", /^index/i, "home"],
    ["u", /^addons\.html$/i, "box"],
    ["t", /hymn|song|proverb|saying/i, "quill"],
    ["t", /holy-day|holy day|shedfall|calendar/i, "calendar"],
    ["t", /question|q&a|inner scale/i, "chat"],
    ["t", /saint/i, "star"],
    ["t", /bestiary|gripper|hurrymoth/i, "eye"],
    ["t", /legend/i, "serpent"],
    ["t", /relic|release|addon/i, "box"],
    ["k", /^Addon$/, "box"], ["k", /^Lore$/, "scroll"], ["k", /^News$/, "horn"], ["k", /^Blog$/, "quill"], ["k", /^Page$/, "sparkle"]
  ];
  function glyphFor(e) {
    for (var i = 0; i < GLYPH_RULES.length; i++) {
      var r = GLYPH_RULES[i], v = r[0] === "u" ? e.u : r[0] === "t" ? (e.t + " " + (e.p || "")) : e.k;
      if (r[1].test(v || "")) return r[2];
    }
    return "sparkle";
  }
  function icon(e) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="url(#ss-rose)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + GLYPH[glyphFor(e)] + "</svg>";
  }
  function addGradient() {
    if (document.getElementById("ss-rose")) return;
    var d = document.createElement("div");
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    d.innerHTML = '<svg width="0" height="0"><defs><linearGradient id="ss-rose" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ffb3e6"/><stop offset=".5" stop-color="#e07bff"/><stop offset="1" stop-color="#a66bff"/></linearGradient></defs></svg>';
    document.body.appendChild(d);
  }

  function href(u) { return /^(https?:|\/)/.test(u) ? u : BASE + u; }

  // ---------- data ----------
  function load() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    loading = fetch(BASE + "search-index.json", { cache: "default" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        index = data.map(function (e) {
          e._t = fold(e.t); e._d = fold(e.d); e._x = fold(e.x); e._p = fold(e.p);
          return e;
        });
        return index;
      })
      .catch(function () { loading = null; index = null; return []; });
    return loading;
  }

  // ---------- ranking ----------
  function wordStart(hay, tok) {
    var i = hay.indexOf(tok);
    while (i !== -1) {
      if (i === 0 || /[^a-z0-9]/.test(hay.charAt(i - 1))) return true;
      i = hay.indexOf(tok, i + 1);
    }
    return false;
  }
  function score(e, toks, q, anyMode) {
    var s = 0, hits = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], ts = 0;
      if (e._t.indexOf(t) !== -1) ts += wordStart(e._t, t) ? 14 : 8;
      if (e._p && e._p.indexOf(t) !== -1) ts += 3;
      if (e._d && e._d.indexOf(t) !== -1) ts += wordStart(e._d, t) ? 5 : 3;
      if (e._x.indexOf(t) !== -1) ts += wordStart(e._x, t) ? 2 : 1;
      if (!ts) { if (!anyMode) return 0; continue; }
      hits++; s += ts;
    }
    if (!hits) return 0;
    var inTitle = toks.every(function (t) { return e._t.indexOf(t) !== -1; });
    if (inTitle && toks.length > 1) s += 15;
    if (e._t === q) s += 40; else if (e._t.indexOf(q) === 0) s += 18; else if (toks.length > 1 && e._t.indexOf(q) !== -1) s += 12;
    if (toks.length > 1 && e._x.indexOf(q) !== -1) s += 6;
    if (e.u.indexOf("#") === -1) s += 2;
    if (e.k === "Addon") s += e.u.indexOf("#") === -1 ? 9 : 4;
    if (e.n) s += Math.max(0, 2 - (Date.now() - Date.parse(e.n)) / 864e6);
    return anyMode ? s * hits / toks.length : s;
  }
  function search(q) {
    var fq = fold(q).trim();
    var toks = fq.split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1 || /\d/.test(t); });
    if (!toks.length && fq) toks = [fq];
    if (!toks.length) return { list: [], fuzzy: false };
    var run = function (anyMode) {
      var out = [];
      for (var i = 0; i < index.length; i++) {
        var e = index[i], s = score(e, toks, fq, anyMode);
        if (s > 0) out.push({ e: e, s: s });
      }
      return out.sort(function (a, b) { return b.s - a.s; });
    };
    var list = run(false), fuzzy = false;
    if (!list.length && toks.length > 1) { list = run(true); fuzzy = true; }
    // one result per page section: drop sections whose page already ranks higher with the same title
    var seen = {};
    list = list.filter(function (r) {
      // an addon card and that addon's own page are the same thing: keep whichever ranks higher
      var key = r.e.k === "Addon" ? "addon|" + r.e._t : r.e.u.split("#")[0] + "|" + r.e._t;
      if (seen[key]) return false; seen[key] = 1; return true;
    });
    return { list: list, toks: toks, fuzzy: fuzzy };
  }

  function mark(text, toks) {
    var out = esc(text);
    if (!toks || !toks.length) return out;
    var src = toks.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").split("").join("['’]?"); }).join("|");
    try { return out.replace(new RegExp("(" + src + ")", "gi"), "<mark>$1</mark>"); } catch (e) { return out; }
  }
  function snippet(e, toks) {
    var text = e.x || e.d || "";
    if (!toks || !toks.length) return text.slice(0, 150);
    var f = fold(text), at = -1;
    for (var i = 0; i < toks.length && at === -1; i++) at = f.indexOf(toks[i]);
    if (at === -1) return (e.d || text).slice(0, 160);
    // folding removes apostrophes, so map the position back approximately
    var start = Math.max(0, at - 60);
    var s = text.slice(start, start + 170);
    return (start > 0 ? "…" : "") + s.replace(/^\S*\s/, start > 0 ? "" : "$&") + (start + 170 < text.length ? "…" : "");
  }

  // ---------- rendering ----------
  function itemHTML(e, toks, n) {
    var crumb = e.p ? '<span class="ss-crumb">' + esc(e.p) + "</span>" : (e.n ? '<span class="ss-crumb">' + esc(new Date(e.n + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })) + "</span>" : "");
    var dl = e.z ? '<span class="ss-dl" role="button" data-dl="' + esc(href(e.z)) + '" tabindex="-1" title="Download ' + esc(e.z) + '">' + svg("down") + "<span>Download</span></span>" : '<span class="ss-go">' + svg("go") + "</span>";
    return '<a class="ss-item ss-k-' + e.k + '" role="option" id="ss-opt-' + n + '" href="' + esc(href(e.u)) + '" aria-selected="false" style="animation-delay:' + Math.min(n, 12) * 18 + 'ms">' +
      '<span class="ss-ico">' + icon(e) + "</span>" +
      '<span class="ss-main"><span class="ss-title">' + mark(e.t, toks) + "</span>" + crumb +
      '<span class="ss-snip">' + mark(snippet(e, toks), toks) + "</span></span>" + dl + "</a>";
  }

  function counts(list) {
    var c = { All: list.length };
    list.forEach(function (r) { c[r.e.k] = (c[r.e.k] || 0) + 1; });
    return c;
  }

  function renderChips(c) {
    chips.innerHTML = ["All"].concat(KINDS).map(function (k) {
      if (k !== "All" && c && !c[k]) return "";
      return '<button class="ss-chip" type="button" data-k="' + k + '" aria-pressed="' + (filter === k) + '">' + CHIP[k] + (c && c[k] ? "<i>" + c[k] + "</i>" : "") + "</button>";
    }).join("");
  }

  function renderIdle() {
    var recent = store("ss-recent") || [];
    var h = "";
    if (recent.length) {
      h += '<div class="ss-group">Recent searches</div><div class="ss-recent">' +
        recent.map(function (r) { return '<button type="button" data-q="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") + "</div>";
    }
    h += '<div class="ss-group">Quick picks</div>' + PICKS.map(function (e, n) { return itemHTML(e, null, n); }).join("");
    results.innerHTML = h;
    renderChips(null);
    items = Array.prototype.slice.call(results.querySelectorAll(".ss-item"));
    select(0, true);
    countEl.textContent = index ? index.filter(function (e) { return e.u.indexOf("#") === -1; }).length + " pages · " + index.length + " places to look" : "";
  }

  function render() {
    var q = input.value;
    if (!q.trim()) { renderIdle(); return; }
    if (!index) { overlay.classList.add("ss-loading"); load().then(function () { overlay.classList.remove("ss-loading"); render(); }); return; }
    var r = search(q), list = r.list, c = counts(list);
    if (filter !== "All" && !c[filter]) filter = "All";
    renderChips(c);
    var shown = filter === "All" ? list : list.filter(function (x) { return x.e.k === filter; });
    try { document.dispatchEvent(new CustomEvent("xr:search", { detail: { q: q.trim(), n: list.length } })); } catch (e) {}   // js/counter.js counts settled searches
    if (!shown.length) {
      results.innerHTML = '<div class="ss-empty"><span class="ss-glyph">▽</span>The Coil holds nothing for <b>' + esc(q) + '</b>.<br>Try fewer words, or one of these.</div>' +
        '<div class="ss-recent" style="justify-content:center">' + IDLE_HINTS.slice(0, 6).map(function (h) { return '<button type="button" data-q="' + esc(h) + '">' + esc(h) + "</button>"; }).join("") + "</div>";
      items = []; countEl.textContent = "0 results"; return;
    }
    var h = "", n = 0;
    if (r.fuzzy) h += '<div class="ss-group">No page has every word. Closest matches</div>';
    if (filter === "All" && !r.fuzzy && shown.length > 6) {
      // grouped: best group first, a few from each
      var groups = {};
      shown.forEach(function (x) { (groups[x.e.k] = groups[x.e.k] || []).push(x); });
      // addons get a head start: they are what most visitors came for
      var weight = function (k) { return groups[k][0].s * (k === "Addon" ? 1.6 : 1); };
      var order = Object.keys(groups).sort(function (a, b) { return weight(b) - weight(a); });
      order.forEach(function (k) {
        var g = groups[k], lim = expanded ? 25 : (k === order[0] ? 5 : 3);
        h += '<div class="ss-group">' + LABEL[k] + "</div>";
        g.slice(0, lim).forEach(function (x) { h += itemHTML(x.e, r.toks, n++); });
        if (g.length > lim) h += '<button class="ss-more" type="button" data-k="' + k + '">See all ' + g.length + " in " + LABEL[k] + "</button>";
      });
    } else {
      shown.slice(0, 40).forEach(function (x) { h += itemHTML(x.e, r.toks, n++); });
    }
    results.innerHTML = h;
    results.scrollTop = 0;
    items = Array.prototype.slice.call(results.querySelectorAll(".ss-item"));
    select(0, true);
    countEl.textContent = shown.length + " result" + (shown.length === 1 ? "" : "s");
  }

  function select(i, quiet) {
    if (!items.length) { input.removeAttribute("aria-activedescendant"); return; }
    sel = (i + items.length) % items.length;
    items.forEach(function (el, k) { el.setAttribute("aria-selected", k === sel ? "true" : "false"); });
    input.setAttribute("aria-activedescendant", items[sel].id);
    if (!quiet) items[sel].scrollIntoView({ block: "nearest" });
  }

  function remember(q) {
    q = (q || "").trim();
    if (q.length < 2) return;
    var r = (store("ss-recent") || []).filter(function (x) { return fold(x) !== fold(q); });
    r.unshift(q);
    store("ss-recent", r.slice(0, 6));
  }

  // ---------- open / close ----------
  function build() {
    addGradient();
    overlay = document.createElement("div");
    overlay.className = "ss-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="ss-backdrop" data-close></div>' +
      '<div class="ss-dialog" role="dialog" aria-modal="true" aria-label="Search the site">' +
      '<div class="ss-bar">' + svg("search") +
      '<input type="search" autocomplete="off" spellcheck="false" placeholder="Search addons, lore, scripture, news…" role="combobox" aria-expanded="true" aria-controls="ss-results" aria-autocomplete="list">' +
      '<span class="ss-spin" aria-hidden="true"></span><button class="ss-close" type="button" data-close aria-label="Close search"><kbd>Esc</kbd></button></div>' +
      '<div class="ss-chips" role="toolbar" aria-label="Filter results"></div>' +
      '<div class="ss-results" id="ss-results" role="listbox" aria-label="Results"></div>' +
      '<div class="ss-foot"><span class="ss-keys"><kbd>↑</kbd> <kbd>↓</kbd> move &nbsp; <kbd>Enter</kbd> open &nbsp; <kbd>Esc</kbd> close</span><span class="ss-count"></span></div>' +
      "</div>";
    document.body.appendChild(overlay);
    input = overlay.querySelector("input");
    results = overlay.querySelector(".ss-results");
    chips = overlay.querySelector(".ss-chips");
    countEl = overlay.querySelector(".ss-count");

    var timer;
    input.addEventListener("input", function () {
      expanded = false;
      clearTimeout(timer);
      timer = setTimeout(render, 60);
    });
    overlay.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { ev.preventDefault(); close(); return; }
      if (ev.target !== input && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) input.focus();
      if (ev.key === "ArrowDown") { ev.preventDefault(); select(sel + 1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); select(sel - 1); }
      else if (ev.key === "Enter") {
        if (items[sel]) { ev.preventDefault(); remember(input.value); go(items[sel]); }
      } else if (ev.key === "Tab" && !ev.shiftKey && chips.firstChild) {
        // Tab cycles the filters, which is what you want here
        ev.preventDefault();
        var ks = Array.prototype.map.call(chips.querySelectorAll(".ss-chip"), function (b) { return b.dataset.k; });
        filter = ks[(ks.indexOf(filter) + 1) % ks.length] || "All";
        render();
      }
    });
    overlay.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t.closest("[data-close]")) { close(); return; }
      var chip = t.closest(".ss-chip");
      if (chip) { filter = chip.dataset.k; expanded = false; render(); input.focus(); return; }
      if (t.closest(".ss-item")) { /* links handle themselves below */ } else if (!t.closest("input")) { setTimeout(function () { input.focus(); }, 0); }
      var more = t.closest(".ss-more");
      if (more) { filter = more.dataset.k; render(); input.focus(); return; }
      var qb = t.closest("[data-q]");
      if (qb) { input.value = qb.dataset.q; render(); input.focus(); return; }
      var dl = t.closest("[data-dl]");
      if (dl) {
        ev.preventDefault(); ev.stopPropagation(); remember(input.value);
        var a = document.createElement("a"); a.href = dl.dataset.dl; a.download = ""; document.body.appendChild(a); a.click(); a.remove();
        input.focus();
        return;
      }
      var it = t.closest(".ss-item");
      if (it) { remember(input.value); if (sameHashPage(it)) { ev.preventDefault(); go(it); } }
    });
    overlay.addEventListener("mousemove", function (ev) {
      var it = ev.target.closest(".ss-item");
      if (it) { var i = items.indexOf(it); if (i !== -1 && i !== sel) select(i, true); }
    });
  }

  function sameHashPage(a) {
    var url = new URL(a.href, location.href);
    return url.pathname === location.pathname && url.hash;
  }
  function go(a) {
    var url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash) {
      var el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      close(function () {
        if (!el) { location.href = a.href; return; }
        history.pushState(null, "", url.hash);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    location.href = a.href;
  }

  function open(q) {
    if (!overlay) build();
    opener = document.activeElement;
    load();
    overlay.hidden = false;
    overlay.classList.remove("ss-closing");
    document.documentElement.classList.add("ss-lock");
    input.value = q || "";
    filter = "All"; expanded = false;
    render();
    setTimeout(function () { input.focus(); if (q) input.setSelectionRange(q.length, q.length); }, 10);
  }
  function close(then) {
    if (!overlay || overlay.hidden) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    overlay.classList.add("ss-closing");
    setTimeout(function () {
      overlay.hidden = true;
      overlay.classList.remove("ss-closing");
      document.documentElement.classList.remove("ss-lock");
      if (typeof then === "function") then();
      else if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) {}
    }, reduce ? 0 : 150);
  }
  window.CoilSearch = { open: open, close: close };

  // ---------- the header button, on every page ----------
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  function addTrigger() {
    var wrap = document.querySelector(".site-header .wrap");
    if (!wrap || wrap.querySelector(".ss-trigger")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ss-trigger";
    b.setAttribute("aria-label", "Search the site");
    b.title = "Search (" + (mac ? "⌘K" : "Ctrl+K") + " or /)";
    b.innerHTML = svg("search") + '<span class="ss-label">Search</span><kbd>' + (mac ? "⌘K" : "/") + "</kbd>";
    b.addEventListener("click", function () { open(""); });
    b.addEventListener("mouseenter", load, { once: true });
    b.addEventListener("focus", load, { once: true });
    wrap.appendChild(b);
  }

  // ---------- the homepage hero bar ----------
  function wireHero() {
    var bar = document.querySelector("[data-search-hero]");
    if (!bar) return;
    bar.addEventListener("click", function () { open(""); });
    bar.addEventListener("keydown", function (ev) {
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); open(ev.key); }
    });
    bar.addEventListener("mouseenter", load, { once: true });
    document.querySelectorAll("[data-search-try]").forEach(function (b) {
      b.addEventListener("click", function () { open(b.dataset.searchTry); });
    });
    // a ghost typing example searches into the bar
    var typed = bar.querySelector(".ss-typed");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!typed || reduce) return;
    var h = 0, c = 0, dir = 1;
    (function tick() {
      var word = IDLE_HINTS[h % IDLE_HINTS.length];
      c += dir;
      typed.textContent = word.slice(0, c);
      var wait = 70 + Math.random() * 60;
      if (dir > 0 && c >= word.length) { dir = -1; wait = 1600; }
      else if (dir < 0 && c <= 0) { dir = 1; h++; wait = 380; }
      else if (dir < 0) wait = 32;
      setTimeout(tick, wait);
    })();
  }

  // ---------- keyboard: / and Ctrl/Cmd+K open it from anywhere ----------
  document.addEventListener("keydown", function (ev) {
    var t = ev.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((ev.key === "k" || ev.key === "K") && (ev.ctrlKey || ev.metaKey) && !ev.altKey) {
      ev.preventDefault();
      if (overlay && !overlay.hidden) close(); else open("");
    } else if (ev.key === "/" && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      ev.preventDefault(); open("");
    }
  });

  function init() { addTrigger(); wireHero(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
