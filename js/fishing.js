/* The Anglers of the Coil (fishing.html). The anglers' numbers come from the Master Baiter Pro addon: its exports are
   brought to data/fishing.json in the Sanctum Editor (Fishing tab). Blizzard's API has no fishing data. Prices, names
   and pictures come from Blizzard through the hourly auction house count (the ah-data branch, tools/sync_auctions.mjs)
   and data/item-cache.json (tools/sync_bank_items.mjs). */
(function () {
  "use strict";
  var root = document.querySelector(".fx-page");
  if (!root) return;
  var AH = "https://raw.githubusercontent.com/jcali0351/xal-reth/ah-data/";
  var q0 = new URLSearchParams(location.search);
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (q0.get("ah") && local) AH = q0.get("ah");                                   // local testing only
  var FISH = (local && q0.get("fish")) || "data/fishing.json";                     // local testing only
  var ICON = "https://render.worldofwarcraft.com/us/icons/56/";
  var PAGE = 25;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var fmt = function (n) { return Math.round(n || 0).toLocaleString("en-US"); };

  var data = null, items = {}, prices = {}, ahAt = null, mode = "best", shown = PAGE;

  function gold(c, full) {
    var g = (c || 0) / 10000;
    if (!c) return "–";
    if (!full && g >= 1e6) return (g / 1e6).toFixed(1).replace(/\.0$/, "") + "m g";
    if (!full && g >= 1e4) return Math.round(g / 1e3) + "k g";
    if (g >= 1) return fmt(Math.floor(g)) + " g";
    return Math.floor(c / 100) + " s";
  }
  function weekId() { return Math.floor((Date.now() / 1000 - 4 * 86400) / (7 * 86400)); }
  function nameOf(full) { var m = String(full).match(/^([^-]+)-?(.*)$/); return { name: m ? m[1] : full, realm: m && m[2] ? m[2].replace(/([a-z])([A-Z])/g, "$1 $2") : "" }; }
  function item(id) {
    var it = items[id] || {};
    return { id: id, name: it.name || "Item " + id, q: it.q == null ? 1 : it.q, icon: it.icon || "", url: "https://www.wowhead.com/item=" + id };
  }
  function iconHtml(it, cls) {
    var src = it.icon ? (/^https?:/.test(it.icon) ? it.icon : ICON + it.icon + ".jpg") : "";
    return '<span class="fx-ico q' + it.q + (cls ? " " + cls : "") + '"' + (src ? ' style="background-image:url(' + esc(src) + ')"' : "") + "></span>";
  }
  function ago(t) {
    var s = Date.now() / 1000 - t;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    var d = Math.round(s / 86400); return d + (d === 1 ? " day ago" : " days ago");
  }
  function when(t) { return new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

  function getJson(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function load() {
    var bust = "?h=" + Math.floor(Date.now() / 600000);
    var base = window.COIL_BASE || "";
    return Promise.all([
      getJson(base + FISH + bust).catch(function () { return null; }),
      getJson(base + "data/item-cache.json" + bust).catch(function () { return {}; }),
      getJson(AH + "items.json" + bust).catch(function () { return {}; }),
      getJson(AH + "auctions.json" + bust).catch(function () { return null; })
    ]).then(function (r) {
      var cache = (r[1] && r[1].items) || {}, ah = (r[2] && r[2].items) || {};
      Object.keys(cache).forEach(function (id) { var c = cache[id]; items[id] = { name: c.name, q: c.quality, icon: c.icon }; });
      Object.keys(ah).forEach(function (id) { var a = ah[id]; items[id] = { name: a[0], q: a[1], icon: a[4] || (items[id] && items[id].icon) }; });
      if (r[3]) {
        ahAt = r[3].updatedAt;
        (r[3].rows || []).forEach(function (row) { if (typeof row[0] === "number") prices[row[0]] = { min: row[2], med: row[3], qty: row[4] }; });
      }
      data = r[0];
      render();
    });
  }

  function hiddenSet() {
    var hidden = {};
    ((data && data.hidden) || []).forEach(function (h) { hidden[String(h).toLowerCase()] = 1; });
    return hidden;
  }

  function anglers() {
    var hidden = hiddenSet(), wid = weekId();
    return ((data && data.anglers) || []).filter(function (a) { return !hidden[a.name.toLowerCase()]; }).map(function (a) {
      var o = Object.assign({}, a);
      o.weekNow = a.wid === wid ? a.week || 0 : 0;
      return o;
    });
  }

  var MODES = {
    best: { score: function (a) { return a.bestValue || 0; }, note: "Ranked by the single most valuable catch each angler has landed, at the price on the day they caught it." },
    fish: { score: function (a) { return a.catches || 0; }, note: "Ranked by every fish ever caught with Master Baiter Pro. Quantity is its own kind of holiness." },
    week: { score: function (a) { return a.weekNow || 0; }, note: "This week's catches. The week turns on Tuesday, as all weeks in Azeroth eventually do." },
    gph: { score: function (a) { return a.gph || 0; }, note: "Ranked by each angler's best gold per hour over a session of ten minutes or more. Anglers on versions before 2.2 show here once they export or update." }
  };

  function value(a) {
    if (mode === "best") return { big: gold(a.bestValue), small: fmt(a.catches) + " fish" };
    if (mode === "fish") return { big: fmt(a.catches), small: "fish" };
    if (mode === "week") return { big: fmt(a.weekNow), small: "this week" };
    return { big: gold(a.gph), small: "per hour" };
  }

  function card(a, rank, podium) {
    var n = nameOf(a.name), v = value(a), it = a.best ? item(a.best) : null;
    var catchLine = it ? '<a class="fx-catch" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + iconHtml(it) +
      '<span><span class="nm q' + it.q + '">' + esc(it.name) + '</span><small>best catch · ' + gold(a.bestValue) + "</small></span></a>" : '<span class="fx-catch none">No catch reported yet</span>';
    if (podium) {
      return '<li class="fx-pod p' + rank + '"><span class="medal" aria-label="Rank ' + rank + '">' + rank + "</span>" +
        '<div class="who"><b>' + esc(n.name) + "</b>" + (n.realm ? "<small>" + esc(n.realm) + "</small>" : "") + "</div>" +
        '<div class="score"><b>' + esc(v.big) + "</b><small>" + esc(v.small) + "</small></div>" + catchLine + "</li>";
    }
    return '<li class="fx-row"><span class="rk">' + rank + '</span><div class="who"><b>' + esc(n.name) + "</b>" + (n.realm ? "<small>" + esc(n.realm) + "</small>" : "") + "</div>" +
      catchLine + '<div class="score"><b>' + esc(v.big) + "</b><small>" + esc(v.small) + "</small></div></li>";
  }

  function renderBoard() {
    var m = MODES[mode];
    var list = anglers().filter(function (a) { return m.score(a) > 0; }).sort(function (a, b) {
      return m.score(b) - m.score(a) || (b.catches || 0) - (a.catches || 0) || a.name.localeCompare(b.name);
    });
    $("[data-mode-note]").textContent = m.note;
    $("[data-podium]").innerHTML = list.slice(0, 3).map(function (a, i) { return card(a, i + 1, true); }).join("") ||
      '<li class="fx-empty">Nobody here yet. The water is very still.</li>';
    $("[data-list]").innerHTML = list.slice(3, shown).map(function (a, i) { return card(a, i + 4, false); }).join("");
    $("[data-more]").hidden = list.length <= shown;
  }

  function renderRich() {
    var caught = {};
    anglers().forEach(function (a) {
      (a.top || []).forEach(function (t) {
        var c = caught[t.id] || (caught[t.id] = { id: t.id, n: 0, by: {}, unit: 0 });
        c.n += t.n || 0; c.by[a.name] = (c.by[a.name] || 0) + (t.n || 0);
        if (t.unit > c.unit) c.unit = t.unit;
      });
      if (a.best && !caught[a.best]) caught[a.best] = { id: a.best, n: 0, by: {}, unit: 0 };
    });
    var rows = Object.keys(caught).map(function (id) {
      var c = caught[id], p = prices[id];
      c.now = p ? p.min : 0; c.qty = p ? p.qty : 0;
      return c;
    }).filter(function (c) { return c.now > 0 || c.unit > 0; }).sort(function (a, b) { return (b.now || b.unit) - (a.now || a.unit); }).slice(0, 18);
    $("[data-rich-section]").hidden = !rows.length;
    $("[data-rich]").innerHTML = rows.map(function (c) {
      var it = item(c.id), top = Object.keys(c.by).sort(function (x, y) { return c.by[y] - c.by[x]; })[0];
      return '<li class="fx-fish q' + it.q + '"><a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + iconHtml(it, "big") + "</a>" +
        '<div><a class="nm q' + it.q + '" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.name) + "</a>" +
        '<span class="px">' + (c.now ? gold(c.now, true) + " <small>now" + (c.qty ? " · " + fmt(c.qty) + " listed" : "") + "</small>" : gold(c.unit, true) + " <small>when caught</small>") + "</span>" +
        (top && c.by[top] ? "<small>Most caught by " + esc(nameOf(top).name) + " (" + fmt(c.by[top]) + ")</small>" : "") + "</div></li>";
    }).join("");
  }

  function renderJack() {
    var hidden = hiddenSet();
    var rows = ((data && data.notable) || []).filter(function (n) { return !hidden[n.angler.toLowerCase()]; }).slice(0, 12);
    $("[data-jack-section]").hidden = !rows.length;
    $("[data-jack]").innerHTML = rows.map(function (n) {
      var it = item(n.id);
      return '<li><a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + iconHtml(it) + "</a><div>" +
        '<span class="nm q' + it.q + '">' + esc(it.name) + (n.n > 1 ? " ×" + n.n : "") + "</span>" +
        "<small>" + esc(nameOf(n.angler).name) + " · " + esc(ago(n.t)) + "</small></div><b>" + gold(n.v) + "</b></li>";
    }).join("");
  }

  function renderRecords(list) {
    function top(key) { return list.filter(function (a) { return a[key] > 0; }).sort(function (a, b) { return b[key] - a[key]; })[0]; }
    var recs = [
      ["Longest streak without a miss", top("streak"), function (a) { return fmt(a.streak) + " in a row"; }],
      ["Most fish in one session", top("session"), function (a) { return fmt(a.session) + " fish"; }],
      ["Longest at the water", top("seconds"), function (a) { return fmt(a.seconds / 3600) + " hours"; }],
      ["Most waters fished", top("zones"), function (a) { return fmt(a.zones) + " zones"; }],
      ["Most gold caught in all", top("copper"), function (a) { return gold(a.copper); }],
      ["Most sessions", top("sessions"), function (a) { return fmt(a.sessions) + " sessions"; }]
    ].filter(function (r) { return r[1]; });
    $("[data-rec-section]").hidden = !recs.length;
    $("[data-recs]").innerHTML = recs.map(function (r) {
      return "<li><span class=\"lbl\">" + esc(r[0]) + "</span><b>" + esc(r[2](r[1])) + "</b><small>" + esc(nameOf(r[1].name).name) + "</small></li>";
    }).join("");
  }

  function render() {
    var list = anglers();
    if (!list.length) {
      var w = $("[data-wait]");
      w.hidden = false;
      w.innerHTML = "<b>The waters are still being counted.</b>No angler has brought their records to the Ministry yet. When the first Master Baiter Pro export arrives, the board fills itself. Until then, the fish are winning.";
      $("[data-board-section]").hidden = true;
      ["anglers", "fish", "gold", "best"].forEach(function (k) { $('[data-stat="' + k + '"]').textContent = "–"; });
      return;
    }
    var fish = 0, coin = 0, best = null;
    list.forEach(function (a) { fish += a.catches || 0; coin += a.copper || 0; if (!best || (a.bestValue || 0) > (best.bestValue || 0)) best = a; });
    $('[data-stat="anglers"]').textContent = fmt(list.length);
    $('[data-stat="fish"]').textContent = fmt(fish);
    $('[data-stat="gold"]').textContent = coin ? gold(coin) : "–";
    $('[data-stat="best"]').textContent = best && best.bestValue ? gold(best.bestValue) : "–";
    renderBoard(); renderRich(); renderJack(); renderRecords(list);
    var last = (data.exports || [])[0];
    var credit = $("[data-credit]");
    if (last && !credit.querySelector(".fx-fresh")) {
      credit.insertAdjacentHTML("afterbegin", '<span class="fx-fresh">Last export ' + esc(when(last.at)) + " from " + esc(nameOf(last.by).name) +
        (ahAt ? "; prices from the auction house as of " + esc(new Date(ahAt).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })) : "") + ".</span> ");
    }
  }

  document.querySelectorAll(".fx-tabs [data-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-mode"); shown = PAGE;
      document.querySelectorAll(".fx-tabs [data-mode]").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
      if (data) renderBoard();
    });
  });
  $("[data-more]").addEventListener("click", function () { shown += PAGE; renderBoard(); });
  load();
})();
