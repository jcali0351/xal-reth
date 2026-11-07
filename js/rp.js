/* The Faces of the Coil (rp.html): every roleplay profile the officers keep in data/rp-profiles.json, as cards that
   open each faithful's page in the Armory (character.html). */
(function () {
  "use strict";
  var root = document.querySelector("[data-rp]");
  if (!root || !window.CoilFaces) return;
  var F = window.CoilFaces, esc = F.esc;
  var grid = root.querySelector("[data-rp-grid]"), q = root.querySelector("[data-rp-q]"), count = root.querySelector("[data-rp-count]");
  var all = [];
  function paint() {
    var t = (q.value || "").trim().toLowerCase();
    var list = all.filter(function (c) { return !t || c.s.indexOf(t) >= 0; });
    count.textContent = list.length + (list.length === 1 ? " face" : " faces");
    grid.innerHTML = list.map(function (c) {
      var m = c.m, p = c.p, pic = p.portrait || (m && m.media && (m.media.inset || m.media.avatar)) || "";
      return '<li class="rp-card" style="--cc:' + esc(F.color(m)) + '"><a href="' + esc(F.url(c.key)) + '">' +
        '<span class="rp-pic"' + (pic ? ' style="background-image:url(' + esc(pic) + ')"' : "") + "></span>" +
        '<span class="rp-text"><b>' + esc(p.icName || (m && m.name) || c.key) + "</b>" + (p.title ? "<small>" + esc(p.title) + "</small>" : "") +
        (p.quote ? "<q>" + esc(p.quote) + "</q>" : "") +
        '<span class="rp-meta">' + esc(m ? [m.race, F.className(m)].filter(Boolean).join(" ") : "Not on the roster right now") + "</span></span></a></li>";
    }).join("") || '<li class="rp-empty">' + (all.length ? "Nobody by that name. Try fewer letters." : "No profiles yet. The first faithful to send one gets the honour of being first.") + "</li>";
  }
  F.load().then(function (d) {
    all = Object.keys(d.profiles).map(function (k) {
      var p = d.profiles[k], m = d.byKey[k] || null;
      return { key: k, p: p, m: m, s: [p.icName, p.title, p.quote, m && m.name, m && m.race, m && F.className(m)].join(" ").toLowerCase() };
    }).sort(function (a, b) { return (a.p.icName || a.key).localeCompare(b.p.icName || b.key); });
    paint();
  });
  q.addEventListener("input", paint);
})();
