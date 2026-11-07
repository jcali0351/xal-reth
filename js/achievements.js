/* The Deeds of the Coil (achievements.html, css/achievements.css): the guild's achievements from
   data/guild-achievements.json (written hourly by tools/sync_roster.mjs from the Blizzard API) and the founding date
   from data/roster.json. The page never calls Blizzard itself. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var get = function (u) { return fetch(u, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
  var day = function (ms) { return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };
  var ago = function (ms) {
    var d = (Date.now() - ms) / 86400000;
    return d < 1 ? "today" : d < 2 ? "yesterday" : d < 30 ? Math.round(d) + " days ago" : d < 365 ? Math.round(d / 30) + " months ago" : Math.round(d / 365) + " years ago";
  };
  var all = [], done = [], path = [], cat = "", q = "", shown = 24;

  Promise.all([get("data/guild-achievements.json"), get("data/roster.json")]).then(function (r) {
    var a = r[0], roster = r[1];
    var founded = roster && roster.guild && roster.guild.created;
    if (founded) { $('[data-stat="founded"]').textContent = new Date(founded).toLocaleDateString("en-US", { month: "short", year: "numeric" }); $('[data-stat-sub="founded"]').textContent = ago(founded); }
    else $('[data-stat="founded"]').textContent = "—";
    if (!a) return waiting(roster);
    all = a.achievements || [];
    done = all.filter(function (x) { return x.completedAt; }).sort(function (x, y) { return y.completedAt - x.completedAt; });
    path = all.filter(function (x) { return !x.completedAt && x.progress; });
    points(a.totalPoints != null ? a.totalPoints : done.reduce(function (s, x) { return s + (x.points || 0); }, 0));
    $("[data-points-sub]").textContent = done.length + " deeds done" + (a.updatedAt ? " · counted " + ago(Date.parse(a.updatedAt)) : "");
    $('[data-stat="done"]').textContent = done.length.toLocaleString("en-US");
    $('[data-stat="path"]').textContent = path.length.toLocaleString("en-US");
    if (done[0]) { $('[data-stat="latest"]').textContent = done[0].name; $('[data-stat-sub="latest"]').textContent = ago(done[0].completedAt); }
    else $('[data-stat="latest"]').textContent = "—";
    cats(); list(); onPath();
  });

  function waiting(roster) {
    var p = roster && roster.guild && roster.guild.achievementPoints;
    points(p || 0);
    $("[data-points-sub]").textContent = "The deeds are being counted: the full list arrives with the next roster sync.";
    $('[data-stat="done"]').textContent = $('[data-stat="path"]').textContent = $('[data-stat="latest"]').textContent = "—";
    $("[data-done]").innerHTML = '<li class="ac-blank">The Armory is still reading out the guild\'s deeds. They will appear here within the hour.</li>';
  }
  function points(n) {
    var b = $("[data-points]");
    if (reduce || !n) { b.textContent = Number(n).toLocaleString("en-US"); return; }
    var t0 = performance.now();
    (function step(t) { var k = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - k, 4); b.textContent = Math.round(n * e).toLocaleString("en-US"); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function cats() {
    var counts = {};
    done.forEach(function (x) { var c = x.category || "General"; counts[c] = (counts[c] || 0) + 1; });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    $("[data-cats]").innerHTML = names.length > 1 ? '<button type="button" aria-pressed="true" data-cat="">All <span>' + done.length + "</span></button>" +
      names.map(function (n) { return '<button type="button" aria-pressed="false" data-cat="' + esc(n) + '">' + esc(n) + " <span>" + counts[n] + "</span></button>"; }).join("") : "";
  }
  $("[data-cats]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]"); if (!b) return;
    cat = b.getAttribute("data-cat"); shown = 24;
    $$("[data-cat]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    list();
  });
  $("[data-q]").addEventListener("input", function () { q = this.value.trim().toLowerCase(); shown = 24; list(); });
  $("[data-more]").addEventListener("click", function () { shown += 24; list(); });

  function icon(x) {
    var none = '<span class="ac-noicon" aria-hidden="true">▲</span>';
    return x.icon ? '<img src="' + esc(x.icon) + '" alt="" loading="lazy" decoding="async" width="56" height="56" onerror="this.outerHTML=\'' + none.replace(/"/g, "&quot;") + '\'">' : none;
  }
  function list() {
    var box = $("[data-done]");
    var rows = done.filter(function (x) {
      return (!cat || (x.category || "General") === cat) && (!q || (x.name + " " + (x.description || "")).toLowerCase().indexOf(q) >= 0);
    });
    if (!done.length) { box.innerHTML = '<li class="ac-blank">No deeds yet. Every great guild begins with zero points and a strong sense of purpose.</li>'; $("[data-more]").hidden = true; return; }
    if (!rows.length) { box.innerHTML = '<li class="ac-blank">No deeds match.</li>'; $("[data-more]").hidden = true; return; }
    box.innerHTML = rows.slice(0, shown).map(function (x, i) {
      return '<li class="ac-card" style="--i:' + Math.min(i, 12) + '">' +
        '<div class="ac-icon">' + icon(x) + "</div>" +
        '<div class="ac-body"><p class="ac-cat">' + esc(x.category || "General") + '</p><h3>' + esc(x.name) + "</h3>" +
        (x.description ? "<p>" + esc(x.description) + "</p>" : "") +
        (x.reward ? '<p class="ac-reward">' + esc(x.reward) + "</p>" : "") +
        '<time datetime="' + new Date(x.completedAt).toISOString() + '">' + esc(day(x.completedAt)) + " · " + esc(ago(x.completedAt)) + "</time></div>" +
        (x.points ? '<span class="ac-shield" title="' + x.points + ' points"><b>' + x.points + "</b></span>" : '<span class="ac-shield feat" title="Feat of Strength"><b>★</b></span>') +
        '<a class="ac-wh" href="https://www.wowhead.com/achievement=' + x.id + '" target="_blank" rel="noopener" aria-label="' + esc(x.name) + ' on Wowhead"></a></li>';
    }).join("");
    $("[data-more]").hidden = rows.length <= shown;
  }
  function onPath() {
    if (!path.length) return;
    $("[data-path-section]").hidden = false;
    var withPct = path.map(function (x) { var p = x.progress || {}; return { x: x, pct: p.of ? p.done / p.of : 0 }; })
      .sort(function (a, b) { return b.pct - a.pct; }).slice(0, 12);
    $("[data-path]").innerHTML = withPct.map(function (o, i) {
      var x = o.x, p = x.progress || {};
      return '<li class="ac-step" style="--p:' + Math.round(o.pct * 100) + "%;--i:" + i + '"><div class="ac-icon sm">' + icon(x) + "</div>" +
        '<div class="ac-body"><h3>' + esc(x.name) + "</h3>" + (x.description ? "<p>" + esc(x.description) + "</p>" : "") +
        '<div class="ac-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + (p.of || 1) + '" aria-valuenow="' + (p.done || 0) + '"><span></span></div>' +
        '<small>' + (p.of ? p.done + " of " + p.of + " steps" : "In progress") + "</small></div>" +
        (x.points ? '<span class="ac-shield dim"><b>' + x.points + "</b></span>" : "") + "</li>";
    }).join("");
  }
})();
