/* The Guild Bank page (guild-bank.html, css/guild-bank.css).
   Reads data/guild-bank.json (written by the Sanctum Editor from the Coil Ledger addon's export) and
   data/item-cache.json (item icons from the Blizzard API, filled by tools/sync_bank_items.mjs).
   The page never calls Blizzard itself. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var QUALITY = ["Poor", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Artifact", "Heirloom"];
  var DAY = 86400;

  function getJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  /* ------------------------------------------------------------ coins */
  function split(c) { c = Math.max(0, Math.round(c || 0)); return { g: Math.floor(c / 10000), s: Math.floor(c / 100) % 100, c: c % 100 }; }
  function coins(copper, opts) {
    var p = split(copper), out = [];
    if (p.g || (opts && opts.always)) out.push('<span class="gb-c g">' + p.g.toLocaleString("en-US") + "<i>g</i></span>");
    if (p.s || (!p.g && p.c && !(opts && opts.short))) out.push('<span class="gb-c s">' + p.s + "<i>s</i></span>");
    if ((p.c && !(opts && opts.short)) || !out.length) out.push('<span class="gb-c c">' + p.c + "<i>c</i></span>");
    return out.join(" ");
  }
  function shortGold(copper) {
    var g = (copper || 0) / 10000;
    if (g >= 1e6) return (g / 1e6).toFixed(g >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "M g";
    if (g >= 1e4) return (g / 1e3).toFixed(1).replace(/\.0$/, "") + "k g";
    return Math.floor(g).toLocaleString("en-US") + " g";
  }

  /* ------------------------------------------------------------ dates */
  function ago(t) {
    var s = Date.now() / 1000 - t;
    if (s < 3600) return "within the hour";
    if (s < DAY) return Math.round(s / 3600) + " hours ago";
    if (s < 2 * DAY) return "yesterday";
    if (s < 30 * DAY) return Math.round(s / DAY) + " days ago";
    return new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function dayLabel(t) {
    var d = new Date(t * 1000), now = new Date();
    var same = function (a, b) { return a.toDateString() === b.toDateString(); };
    var y = new Date(now); y.setDate(now.getDate() - 1);
    if (same(d, now)) return "Today";
    if (same(d, y)) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  /* ------------------------------------------------------------ state */
  var bank = null, items = {}, tab = 0, query = "", filter = "all", shown = 40;

  Promise.all([getJson("data/guild-bank.json").catch(function () { return "err"; }), getJson("data/item-cache.json").catch(function () { return null; })])
    .then(function (r) {
      if (r[0] === "err") return fail("The Ledger could not be opened just now. Please refresh in a moment.");
      if (!r[0]) return empty();
      bank = r[0]; items = (r[1] && r[1].items) || {};
      render();
    });

  function fail(msg) { var n = $("[data-notice]"); n.textContent = msg; n.hidden = false; $("[data-synced]").textContent = ""; $("[data-gold]").innerHTML = ""; }
  function empty() {
    $("[data-gold]").innerHTML = '<span class="gb-empty-gold">The Ledger awaits its first page</span>';
    $("[data-synced]").textContent = "No banker has brought the Ledger here yet.";
    $$("[data-stat]").forEach(function (b) { b.textContent = "—"; });
    $("[data-chart]").innerHTML = '<p class="gb-blank">The Hoard\'s history begins with the first record.</p>';
    $("[data-grid]").innerHTML = '<p class="gb-blank">The vault is not yet written down. When a banker of the Coil opens the guild bank with the Coil Ledger addon and brings the record here, every tab will appear.</p>';
    $("[data-entries]").innerHTML = '<li class="gb-blank">No offerings recorded yet. Patience is also an offering.</li>';
    $("[data-givers]").innerHTML = '<li class="gb-blank">The board is empty. Be the first.</li>';
  }

  /* ------------------------------------------------------------ render */
  function render() {
    // the purse, counted up
    var gold = bank.gold || 0, box = $("[data-gold]");
    var when = bank.scannedAt ? new Date(bank.scannedAt * 1000) : null;
    $("[data-synced]").innerHTML = when ? "Recorded " + esc(ago(bank.scannedAt)) + (bank.scannedBy ? " by " + esc(bank.scannedBy) : "") +
      ' · <time datetime="' + when.toISOString() + '">' + when.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + "</time>" : "";
    if (reduce) box.innerHTML = coins(gold, { always: true });
    else {
      var t0 = performance.now(), dur = 1800;
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        box.innerHTML = coins(gold * e, { always: true });
        if (k < 1) requestAnimationFrame(step); else box.classList.add("done");
      })(t0);
    }

    // stats
    var all = [], stacks = 0, count = 0;
    (bank.tabs || []).forEach(function (t) { (t.slots || []).forEach(function (s) { stacks++; count += s.count || 1; all.push(s); }); });
    var uniq = new Set(all.map(function (s) { return s.id || s.name; })).size;
    setStat("items", count.toLocaleString("en-US"), stacks + " stacks · " + uniq + " kinds");
    var viewable = (bank.tabs || []).filter(function (t) { return t.viewable !== false; }).length;
    setStat("tabs", String((bank.tabs || []).length), viewable < (bank.tabs || []).length ? viewable + " visible to the banker" : "all recorded");
    var month = Date.now() / 1000 - 30 * DAY, gin = 0, gout = 0, nin = 0, nout = 0;
    (bank.ledger || []).forEach(function (e) {
      if (e.log !== "money" || e.t < month) return;
      if (e.type === "deposit" || e.type === "depositSummary") { gin += e.amount || 0; nin++; }
      else { gout += e.amount || 0; nout++; }
    });
    setStat("in", shortGold(gin), nin + " offering" + (nin === 1 ? "" : "s"));
    setStat("out", shortGold(gout), nout + " withdrawal" + (nout === 1 ? "" : "s") + " and repairs");

    chart(); tabs(); grid(); ledger(); givers();
  }
  function setStat(k, v, sub) { $('[data-stat="' + k + '"]').textContent = v; $('[data-stat-sub="' + k + '"]').textContent = sub || ""; }

  /* ------------------------------------------------------------ gold over time */
  function chart() {
    var box = $("[data-chart]"), pts = (bank.history || []).slice().sort(function (a, b) { return a.t - b.t; });
    if (!pts.length) pts = [{ t: bank.scannedAt, gold: bank.gold }];
    if (pts.length === 1) pts = [{ t: pts[0].t - 7 * DAY, gold: pts[0].gold, ghost: true }, pts[0]];
    var W = Math.max(280, box.clientWidth || 1000), H = Math.max(160, box.clientHeight || 260), P = { l: W < 500 ? 54 : 70, r: 16, t: 18, b: 30 };
    var t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
    var max = Math.max.apply(null, pts.map(function (p) { return p.gold; })) || 1, min = Math.min.apply(null, pts.map(function (p) { return p.gold; }));
    var lo = Math.max(0, min - (max - min) * 0.25), hi = max + (max - lo) * 0.12 || 1;
    if (hi - lo < max * 0.05) { lo = Math.max(0, min * 0.8); hi = max * 1.2 || 1; }   // a flat hoard sits in the middle, not on the floor
    var x = function (t) { return P.l + (t - t0) / Math.max(1, t1 - t0) * (W - P.l - P.r); };
    var y = function (g) { return P.t + (1 - (g - lo) / Math.max(1, hi - lo)) * (H - P.t - P.b); };
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + x(p.t).toFixed(1) + " " + y(p.gold).toFixed(1); }).join(" ");
    var area = line + " L" + x(t1).toFixed(1) + " " + (H - P.b) + " L" + x(t0).toFixed(1) + " " + (H - P.b) + " Z";
    var grid = "", ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var g = lo + (hi - lo) * i / ticks, yy = y(g).toFixed(1);
      grid += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + yy + '" y2="' + yy + '" class="gl"/><text x="' + (P.l - 10) + '" y="' + yy + '" class="gy">' + esc(shortGold(g)) + "</text>";
    }
    var labels = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]].filter(function (p, i, a) { return a.indexOf(p) === i; })
      .map(function (p) { return '<text x="' + x(p.t).toFixed(1) + '" y="' + (H - 10) + '" class="gx">' + esc(new Date(p.t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })) + "</text>"; }).join("");
    var dots = pts.filter(function (p) { return !p.ghost; }).map(function (p) { return '<circle cx="' + x(p.t).toFixed(1) + '" cy="' + y(p.gold).toFixed(1) + '" r="4" class="pt"/>'; }).join("");
    box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" aria-hidden="true"><defs>' +
      '<linearGradient id="gbFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c35a" stop-opacity=".45"/><stop offset=".6" stop-color="#a66bff" stop-opacity=".16"/><stop offset="1" stop-color="#a66bff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="gbLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b98cff"/><stop offset="1" stop-color="#f3d98f"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#gbFill)" class="ar"/><path d="' + line + '" class="ln" pathLength="1"/>' + dots + labels +
      '<line class="cur" y1="' + P.t + '" y2="' + (H - P.b) + '" x1="-10" x2="-10"/></svg>';
    var read = $("[data-chart-read]"), svg = box.querySelector("svg"), cur = svg.querySelector(".cur");
    read.innerHTML = "Now " + coins(bank.gold, { short: true });
    if (box.__wired) { box.__move = move; return; }
    box.__wired = true; box.__move = move;
    var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(chart, 200); });
    box.addEventListener("pointermove", function (e) { box.__move(e); });
    box.addEventListener("pointerleave", function () { var c = box.querySelector(".cur"); c.setAttribute("x1", -10); c.setAttribute("x2", -10); read.innerHTML = "Now " + coins(bank.gold, { short: true }); });
    function move(e) {
      var r = svg.getBoundingClientRect(), tx = t0 + ((e.clientX - r.left) / r.width * W - P.l) / (W - P.l - P.r) * (t1 - t0);
      var best = pts.filter(function (p) { return !p.ghost; }).reduce(function (a, b) { return Math.abs(b.t - tx) < Math.abs(a.t - tx) ? b : a; });
      cur.setAttribute("x1", x(best.t)); cur.setAttribute("x2", x(best.t));
      read.innerHTML = esc(new Date(best.t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) + " · " + coins(best.gold, { short: true });
    }
  }

  /* ------------------------------------------------------------ tabs and the vault grid */
  var TAB_GLYPHS = ["◆", "▲", "●", "✦", "❖", "⬟", "✶", "◈"];
  function tabs() {
    var box = $("[data-tabs]");
    box.innerHTML = (bank.tabs || []).map(function (t, i) {
      var n = (t.slots || []).length, hits = query ? (t.slots || []).filter(match).length : 0;
      return '<button type="button" role="tab" id="gb-tab-' + i + '" aria-selected="' + (i === tab) + '" tabindex="' + (i === tab ? 0 : -1) + '" data-tab="' + i + '"' +
        (t.viewable === false ? ' class="locked"' : "") + '><span class="gl" aria-hidden="true">' + TAB_GLYPHS[i % TAB_GLYPHS.length] + "</span>" +
        "<span class=\"nm\">" + esc(t.name || "Tab " + (i + 1)) + '</span><span class="ct">' + (query ? hits + " found" : n + "/98") + "</span></button>";
    }).join("");
  }
  $("[data-tabs]").addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) { tab = +b.dataset.tab; tabs(); grid(); } });
  $("[data-tabs]").addEventListener("keydown", function (e) {
    var n = (bank && bank.tabs || []).length; if (!n || !/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) return;
    e.preventDefault(); tab = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (tab + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    tabs(); grid(); $("#gb-tab-" + tab).focus();
  });
  function info(s) { var c = items[s.id] || {}; return { name: s.name || c.name || "Unknown item", quality: s.quality != null ? s.quality : (c.quality != null ? c.quality : 1), icon: c.icon || null }; }
  function match(s) { return !query || info(s).name.toLowerCase().indexOf(query) >= 0; }
  function grid() {
    var box = $("[data-grid]"), t = (bank.tabs || [])[tab];
    box.setAttribute("aria-labelledby", "gb-tab-" + tab);
    if (!t) { box.innerHTML = ""; return; }
    if (t.viewable === false) { box.innerHTML = '<p class="gb-blank">This tab is sealed to the banker who kept the Ledger. Its contents are known only to the Coil.</p>'; $("[data-grid-note]").textContent = ""; return; }
    var bySlot = {}; (t.slots || []).forEach(function (s) { bySlot[s.slot] = s; });
    var html = "";
    for (var i = 1; i <= 98; i++) {
      var s = bySlot[i];
      if (!s) { html += '<div class="gb-slot empty" style="--d:' + (i % 14 + Math.floor(i / 14)) + '"></div>'; continue; }
      var f = info(s), dim = query && !match(s);
      html += '<button type="button" class="gb-slot q' + f.quality + (dim ? " dim" : query ? " hit" : "") + '" style="--d:' + (i % 14 + Math.floor(i / 14)) + '" data-slot="' + i + '" aria-label="' +
        esc(f.name + (s.count > 1 ? ", " + s.count : "") + ", " + (QUALITY[f.quality] || "")) + '">' +
        (f.icon ? '<img src="' + esc(f.icon) + '" alt="" loading="lazy" decoding="async" width="56" height="56">' : '<span class="gb-noicon" aria-hidden="true">' + esc(f.name.charAt(0)) + "</span>") +
        (s.count > 1 ? '<span class="gb-count">' + (s.count > 999 ? Math.round(s.count / 100) / 10 + "k" : s.count) + "</span>" : "") + "</button>";
    }
    box.innerHTML = html;
    box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
    var n = (t.slots || []).length, units = (t.slots || []).reduce(function (a, s) { return a + (s.count || 1); }, 0);
    $("[data-grid-note]").textContent = (t.name || "") + ": " + n + " of 98 slots filled, " + units.toLocaleString("en-US") + " items." + (query ? " Matching items glow." : " Hover or tap an item for details.");
  }
  $("[data-q]").addEventListener("input", function () { query = this.value.trim().toLowerCase(); if (!bank) return;
    if (query) { var first = (bank.tabs || []).findIndex(function (t) { return (t.slots || []).some(match); }); if (first >= 0 && !(bank.tabs[tab].slots || []).some(match)) tab = first; }
    tabs(); grid(); });

  /* the tooltip, in the game's own manner */
  var tip = $("[data-tip]");
  function showTip(el) {
    var t = bank.tabs[tab], s = (t.slots || []).filter(function (x) { return x.slot === +el.dataset.slot; })[0]; if (!s) return;
    var f = info(s);
    tip.className = "gb-tip q" + f.quality;
    tip.innerHTML = '<b>' + esc(f.name) + '</b><span class="ql">' + esc(QUALITY[f.quality] || "") + "</span>" + (s.count > 1 ? '<span>Stack of ' + s.count.toLocaleString("en-US") + "</span>" : "") +
      '<span class="where">' + esc(t.name || "") + " · slot " + s.slot + "</span>" + (s.id ? '<span class="wh">Click to open on Wowhead</span>' : "");
    tip.hidden = false;
    var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = Math.min(innerWidth - tw - 10, Math.max(10, r.left + r.width / 2 - tw / 2)), top = r.top - th - 12;
    if (top < 70) top = r.bottom + 12;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  $("[data-grid]").addEventListener("pointerover", function (e) { var el = e.target.closest("[data-slot]"); if (el) showTip(el); });
  $("[data-grid]").addEventListener("focusin", function (e) { var el = e.target.closest("[data-slot]"); if (el) showTip(el); });
  $("[data-grid]").addEventListener("pointerleave", function () { tip.hidden = true; });
  $("[data-grid]").addEventListener("focusout", function () { tip.hidden = true; });
  addEventListener("scroll", function () { tip.hidden = true; }, { passive: true });
  $("[data-grid]").addEventListener("click", function (e) {
    var el = e.target.closest("[data-slot]"); if (!el) return;
    var s = (bank.tabs[tab].slots || []).filter(function (x) { return x.slot === +el.dataset.slot; })[0];
    if (s && s.id && (e.pointerType === "mouse" || !e.pointerType)) window.open("https://www.wowhead.com/item=" + s.id, "_blank", "noopener");
    else showTip(el);
  });

  /* ------------------------------------------------------------ the ledger */
  var VERB = { deposit: "gave", withdraw: "took", repair: "repaired with", withdrawForTab: "drew for a tab", buyTab: "bought a tab for", depositSummary: "gave (summary)", move: "moved" };
  function ledger() {
    var list = (bank.ledger || []).filter(function (e) { return filter === "all" || e.log === filter; }).sort(function (a, b) { return b.t - a.t; });
    var box = $("[data-entries]");
    if (!list.length) { box.innerHTML = '<li class="gb-blank">Nothing of this kind in the Ledger yet.</li>'; $("[data-more]").hidden = true; return; }
    var html = "", lastDay = "";
    list.slice(0, shown).forEach(function (e, i) {
      var d = dayLabel(e.t); if (d !== lastDay) { html += '<li class="gb-day">' + esc(d) + "</li>"; lastDay = d; }
      var give = e.type === "deposit" || e.type === "depositSummary", take = e.type === "withdraw" || e.type === "repair" || e.type === "withdrawForTab" || e.type === "buyTab";
      var cls = give ? "in" : take ? "out" : "mv", what, icon;
      if (e.log === "money") {
        icon = '<span class="gb-coin" aria-hidden="true"></span>';
        what = '<span class="who">' + esc(e.name || "Someone") + "</span> " + esc(VERB[e.type] || e.type) + " " + '<span class="amt">' + coins(e.amount, { short: true }) + "</span>";
      } else {
        var c = items[e.id] || {}, q = e.quality != null ? e.quality : (c.quality != null ? c.quality : 1);
        icon = c.icon ? '<img src="' + esc(c.icon) + '" alt="" loading="lazy" width="36" height="36" class="q' + q + '">' : '<span class="gb-noicon sm q' + q + '" aria-hidden="true">' + esc((e.item || "?").charAt(0)) + "</span>";
        var where = e.type === "move" ? " from " + tabName(e.fromTab) + " to " + tabName(e.toTab) : e.tab ? (give ? " into " : " from ") + tabName(e.tab) : "";
        what = '<span class="who">' + esc(e.name || "Someone") + "</span> " + esc(VERB[e.type] || e.type) + " " + (e.count > 1 ? e.count + " × " : "") +
          '<span class="it q' + q + '">' + esc(e.item || c.name || "an item") + "</span>" + '<span class="where">' + esc(where) + "</span>";
      }
      html += '<li class="gb-entry ' + cls + '" style="--i:' + Math.min(i, 12) + '">' + icon + '<p>' + what + '</p><time datetime="' + new Date(e.t * 1000).toISOString() + '">' + esc(ago(e.t)) + "</time></li>";
    });
    box.innerHTML = html;
    $("[data-more]").hidden = list.length <= shown;
  }
  function tabName(i) { var t = (bank.tabs || [])[(i || 1) - 1]; return t ? t.name : "tab " + i; }
  $("[data-filters]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]"); if (!b || !bank) return;
    filter = b.dataset.f; shown = 40;
    $$("[data-f]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    ledger();
  });
  $("[data-more]").addEventListener("click", function () { shown += 40; ledger(); });

  /* ------------------------------------------------------------ the generous */
  function givers() {
    var since = Date.now() / 1000 - 30 * DAY, by = {};
    (bank.ledger || []).forEach(function (e) {
      if (e.log === "money" && (e.type === "deposit") && e.t >= since && e.name) by[e.name] = (by[e.name] || 0) + (e.amount || 0);
    });
    var top = Object.keys(by).map(function (k) { return [k, by[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 7);
    var max = top.length ? top[0][1] : 1, box = $("[data-givers]");
    box.innerHTML = top.length ? top.map(function (g, i) {
      return '<li style="--w:' + (g[1] / max * 100).toFixed(1) + '%;--i:' + i + '"><span class="rk">' + (i + 1) + '</span><span class="nm">' + esc(g[0]) + '</span><span class="v">' + coins(g[1], { short: true }) + '</span><span class="bar" aria-hidden="true"></span></li>';
    }).join("") : '<li class="gb-blank">No gold given in the last 30 days. Hessk is not angry. Hessk is disappointed.</li>';
  }
})();
