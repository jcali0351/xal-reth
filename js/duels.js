/* The Duelling Ground (duels.html): the duel ledger the officers keep in data/duels.json. A leaderboard (wins,
   losses, win rate, streak, the last five), head to head, a network of who has fought whom, and the latest duels. */
(function () {
  "use strict";
  var root = document.querySelector("[data-duels]");
  if (!root || !window.CoilFaces) return;
  var F = window.CoilFaces, esc = F.esc;
  var $ = function (s) { return root.querySelector(s); };
  var D, S, sort = "wins";

  function name(k) { return F.nameOf(D, k); }
  function link(k) { return '<a href="' + esc(F.url(k)) + '" style="color:' + esc(F.color(D.byKey[k])) + '">' + esc(name(k)) + "</a>"; }

  function board() {
    var rows = Object.keys(S).map(function (k) { return S[k]; });
    rows.sort(function (a, b) {
      if (sort === "rate") return (b.total >= 3) - (a.total >= 3) || b.rate - a.rate || b.wins - a.wins;
      if (sort === "streak") return b.streak - a.streak || b.wins - a.wins;
      return b.wins - a.wins || a.losses - b.losses;
    });
    $("[data-board]").innerHTML = rows.map(function (r, i) {
      return "<tr><td class=\"rk\">" + (i + 1) + "</td><td>" + link(r.key) + "</td><td>" + r.wins + "</td><td>" + r.losses + "</td><td>" + (r.total ? Math.round(r.rate * 100) + "%" : "–") +
        '<i class="bar"><em style="width:' + Math.round(r.rate * 100) + '%"></em></i></td><td class="' + (r.streak > 0 ? "up" : "down") + '">' + (r.streak > 0 ? "W" + r.streak : "L" + -r.streak) + '</td><td class="form">' +
        r.last.map(function (x) { return '<i class="' + x + '">' + x + "</i>"; }).join("") + "</td></tr>";
    }).join("") || '<tr><td colspan="7" class="empty">No duels recorded yet. The ground is raked and waiting.</td></tr>';
    root.querySelectorAll("[data-sort]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.sort === sort ? "true" : "false"); });
  }

  function h2h() {
    var a = $("[data-h2h-a]").value, b = $("[data-h2h-b]").value, out = $("[data-h2h]");
    if (!a || !b || a === b) { out.innerHTML = '<p class="muted">Choose two duelists.</p>'; return; }
    var r = F.headToHead(D.duels, a, b);
    var list = D.duels.filter(function (d) { return (d.w === a && d.l === b) || (d.w === b && d.l === a); }).sort(function (x, y) { return (y.date || "").localeCompare(x.date || ""); });
    out.innerHTML = '<div class="h2h"><span>' + link(a) + "</span><b>" + r.aw + " – " + r.bw + "</b><span>" + link(b) + "</span></div>" +
      (list.length ? '<ul class="dl-list">' + list.map(function (d) { return "<li>" + link(d.w) + " beat " + link(d.l) + "<small>" + esc(d.date || "") + (d.place ? " · " + esc(d.place) : "") + "</small></li>"; }).join("") + "</ul>"
        : '<p class="muted">They have never fought. Perhaps they are friends. Perhaps they are waiting.</p>');
  }

  function network() {
    var keys = Object.keys(S).sort(function (a, b) { return S[b].total - S[a].total; }).slice(0, 24);
    var svg = $("[data-net]");
    if (keys.length < 2) { svg.innerHTML = ""; $("[data-net-wrap]").hidden = true; return; }
    $("[data-net-wrap]").hidden = false;
    var W = 640, H = 640, cx = W / 2, cy = H / 2, R = 240, pos = {};
    keys.forEach(function (k, i) { var a = -Math.PI / 2 + i / keys.length * Math.PI * 2; pos[k] = [cx + R * Math.cos(a), cy + R * Math.sin(a), a]; });
    var pairs = {};
    D.duels.forEach(function (d) { if (!pos[d.w] || !pos[d.l]) return; var p = [d.w, d.l].sort().join("|"); pairs[p] = (pairs[p] || 0) + 1; });
    var edges = Object.keys(pairs).map(function (p) {
      var ab = p.split("|"), A = pos[ab[0]], B = pos[ab[1]];
      return '<path class="edge" data-a="' + esc(ab[0]) + '" data-b="' + esc(ab[1]) + '" d="M' + A[0].toFixed(1) + " " + A[1].toFixed(1) + " Q" + cx + " " + cy + " " + B[0].toFixed(1) + " " + B[1].toFixed(1) +
        '" stroke-width="' + Math.min(8, 1 + pairs[p] * 1.2) + '"><title>' + esc(name(ab[0]) + " and " + name(ab[1]) + ": " + pairs[p] + (pairs[p] === 1 ? " duel" : " duels")) + "</title></path>";
    }).join("");
    var nodes = keys.map(function (k) {
      var p = pos[k], s = S[k], r = 8 + Math.min(14, s.total * 1.4), right = Math.cos(p[2]) >= 0;
      return '<g class="node" tabindex="0" data-k="' + esc(k) + '" transform="translate(' + p[0].toFixed(1) + " " + p[1].toFixed(1) + ')"><circle r="' + r.toFixed(1) + '" fill="' + esc(F.color(D.byKey[k])) +
        '"/><text x="' + (right ? r + 6 : -r - 6) + '" y="4" text-anchor="' + (right ? "start" : "end") + '">' + esc(name(k)) + " " + s.wins + "–" + s.losses + "</text></g>";
    }).join("");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = '<g class="edges">' + edges + "</g>" + nodes;
    svg.querySelectorAll(".node").forEach(function (g) {
      var on = function () { var k = g.dataset.k; svg.classList.add("focus"); svg.querySelectorAll(".edge").forEach(function (e) { e.classList.toggle("lit", e.dataset.a === k || e.dataset.b === k); }); g.classList.add("lit"); };
      var off = function () { svg.classList.remove("focus"); svg.querySelectorAll(".lit").forEach(function (e) { e.classList.remove("lit"); }); };
      g.addEventListener("mouseenter", on); g.addEventListener("focus", on); g.addEventListener("mouseleave", off); g.addEventListener("blur", off);
      g.addEventListener("click", function () { location.href = F.url(g.dataset.k); });
    });
  }

  F.load().then(function (d) {
    D = d; S = F.standings(d.duels);
    var keys = Object.keys(S).sort(function (a, b) { return name(a).localeCompare(name(b)); });
    var opts = '<option value="">Choose…</option>' + keys.map(function (k) { return '<option value="' + esc(k) + '">' + esc(name(k)) + "</option>"; }).join("");
    $("[data-h2h-a]").innerHTML = opts; $("[data-h2h-b]").innerHTML = opts;
    if (keys.length > 1) { $("[data-h2h-a]").value = keys[0]; $("[data-h2h-b]").value = keys[1]; }
    $("[data-total]").textContent = d.duels.length;
    $("[data-duelists]").textContent = keys.length;
    var top = Object.keys(S).sort(function (a, b) { return S[b].wins - S[a].wins; })[0];
    $("[data-champ]").innerHTML = top ? link(top) : "–";
    var recent = d.duels.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || (b.id || "").localeCompare(a.id || ""); }).slice(0, 12);
    $("[data-recent]").innerHTML = recent.map(function (u) { return "<li>" + link(u.w) + " beat " + link(u.l) + "<small>" + esc(u.date || "") + (u.place ? " · " + esc(u.place) : "") + (u.note ? " · " + esc(u.note) : "") + "</small></li>"; }).join("") ||
      '<li class="muted">No duels yet.</li>';
    board(); h2h(); network();
  });
  root.querySelectorAll("[data-sort]").forEach(function (b) { b.addEventListener("click", function () { sort = b.dataset.sort; board(); }); });
  $("[data-h2h-a]").addEventListener("change", h2h); $("[data-h2h-b]").addEventListener("change", h2h);
})();
