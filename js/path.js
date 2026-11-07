/* The Path of the Coil (path.html): your rank, Grip, the prophecy, artifacts, secrets, achievements, the Three Tablets
   and settings, all from window.CoilPath (js/coil-path.js, loaded by site.js). Nothing leaves this browser. */
(function () {
  "use strict";
  var root = document.querySelector("[data-path]");
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var KIND = { fragment: "Fragment", relic: "Relic", seal: "Seal", tablet: "Tablet", eye: "Ancient Eye" };

  function emblem(i) {   // one more coil for every rank, around the unblinking eye
    var rings = "";
    for (var k = 0; k <= i; k++) {
      var r = 18 + k * 5.2, a = 300 - k * 12;
      rings += '<circle cx="60" cy="60" r="' + r.toFixed(1) + '" fill="none" stroke="url(#pa-g)" stroke-width="' + (2.6 - k * 0.15).toFixed(2) +
        '" stroke-linecap="round" stroke-dasharray="' + a + ' 400" transform="rotate(' + (k * 47) + ' 60 60)" opacity="' + (1 - k * 0.06).toFixed(2) + '"/>';
    }
    return '<svg class="pa-emblem" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="pa-g" x1="0" x2="1"><stop offset="0" stop-color="#4b2386"/>' +
      '<stop offset=".5" stop-color="#e0c4ff"/><stop offset="1" stop-color="#a66bff"/></linearGradient></defs>' + rings +
      '<path d="M44 60q16-14 32 0-16 14-32 0Z" fill="#120a20" stroke="#e0c4ff" stroke-width="1.6"/><ellipse cx="60" cy="60" rx="2.2" ry="6" fill="#e0c4ff"/></svg>';
  }

  function render(P) {
    var S = P.state, r = P.rank(), n = function (o) { return Object.keys(o || {}).length; };
    // rank
    var span = r.next ? r.next.at - r.at : 1, into = r.next ? S.rep - r.at : 1;
    $("[data-emblem]").innerHTML = emblem(r.i);
    $("[data-rank]").textContent = r.name;
    $("[data-title]").textContent = P.titleName() ? P.titleName() : "";
    $("[data-says]").textContent = r.says;
    $("[data-bar]").style.width = Math.min(100, Math.round(into / span * 100)) + "%";
    $("[data-bar-note]").textContent = r.next ? S.rep + " reputation · " + (r.next.at - S.rep) + " more to " + r.next.name : S.rep + " reputation · the last rank. There is nowhere higher. Try lower.";
    // stats
    var stats = { rep: S.rep, rooms: n(S.seen), read: n(S.read), art: n(S.art) + "/" + P.ARTIFACTS.length, sec: n(S.sec) + "/" + P.SECRETS.length, streak: S.streak || 0 };
    Object.keys(stats).forEach(function (k) { var el = $('[data-stat="' + k + '"]'); if (el) el.textContent = stats[k]; });
    // grip
    var g = S.grip || 0;
    $("[data-grip]").textContent = g;
    $("[data-grip-bar]").style.width = Math.min(100, g * 2) + "%";
    $("[data-letgo]").disabled = g <= 0;
    $("[data-grip-note]").textContent = g ? "Letting go turns it into " + g * 2 + " reputation." : "Nothing held. The Grippers are bored. Good.";
    // prophecy
    $("[data-proph]").textContent = P.prophecy();
    var past = Object.keys(S.proph || {}).sort().reverse().filter(function (d) { return d !== P.today(); }).slice(0, 7);
    $("[data-proph-past]").innerHTML = past.length ? past.map(function (d) { return "<li><span>" + esc(d) + "</span>" + esc(S.proph[d]) + "</li>"; }).join("") :
      "<li>The prophecies you read are kept here. Come back tomorrow for another.</li>";
    // artifacts
    $("[data-arts]").innerHTML = P.ARTIFACTS.map(function (a) {
      var got = S.art[a.id];
      return '<li class="pa-card' + (got ? " got" : "") + '"><span class="kind">' + KIND[a.kind] + '</span><span class="g">' + P.glyph(a.kind) + "</span>" +
        "<b>" + (got ? esc(a.name) : "Not yet found") + "</b><small>" + (got ? esc(a.text) : "Something glints on <a href=\"" + esc(a.page) + "\">" + esc(pageName(a.page)) + "</a>.") + "</small></li>";
    }).join("");
    // secrets
    $("[data-secrets]").innerHTML = P.SECRETS.map(function (x) {
      var got = S.sec[x.id];
      return '<li class="pa-card' + (got ? " got" : "") + '"><span class="g">' + P.glyph("secret") + "</span><b>" + (got ? esc(x.name) : "A secret") + "</b><small>" +
        esc(got ? x.text : x.hint) + "</small></li>";
    }).join("");
    // achievements
    var done = P.ACH.filter(function (a) { return S.ach[a.id]; }).length;
    $("[data-ach-count]").textContent = done + " of " + P.ACH.length;
    $("[data-ach]").innerHTML = P.ACH.map(function (a) {
      return '<li class="' + (S.ach[a.id] ? "got" : "") + '"><span class="g">' + P.glyph("ach") + "</span><span><b>" + esc(a.name) + "</b><small>" + esc(a.desc) +
        (a.title ? " Title: " + esc(P.TITLES[a.title]) + "." : "") + "</small></span></li>";
    }).join("");
    // titles and options
    var sel = $("[data-title-select]"), have = P.unlockedTitles();
    sel.innerHTML = '<option value="">No title</option>' + have.map(function (t) { return '<option value="' + t + '"' + (S.title === t ? " selected" : "") + ">" + esc(P.TITLES[t]) + "</option>"; }).join("");
    sel.disabled = !have.length;
    $("[data-opt=whispers]").checked = S.opts.whispers !== false;
    $("[data-opt=anomalies]").checked = S.opts.anomalies !== false;
    // the tablets
    var words = P.ARTIFACTS.filter(function (a) { return a.kind === "tablet"; });
    var known = words.filter(function (a) { return S.art[a.id]; }).length;
    $("[data-tablet-note]").textContent = S.sec.tablets ? "The door is open. It was always open. It is just lower than the others." :
      known === 3 ? "You hold all three tablets. Speak their words, in order." : "You have found " + known + " of the three tablets.";
    $("[data-low-door]").hidden = !S.sec.tablets;
  }

  function pageName(p) {
    return ({ "lore.html": "the Chronicle", "legends.html": "the Legends", "teachings-of-the-triangle.html": "the Teachings of the Triangle", "begging.html": "the Politics of Begging",
      "guild-bank.html": "the Guild Bank", "codex.html": "the Codex", "priesthood.html": "the Priesthood", "rites.html": "the Rites", "canon.html": "the Canon",
      "fishing.html": "the Fishing Leaderboard", "altar.html": "the Altar", "triangle.html": "the Sacred Triangle" })[p] || p;
  }

  function go() {
    var P = window.CoilPath;
    P.readProphecy();
    render(P);
    P.on(function () { render(P); });
    $("[data-letgo]").addEventListener("click", function () { P.letGo(); });
    $("[data-title-select]").addEventListener("change", function () { P.setTitle(this.value); });
    root.querySelectorAll("[data-opt]").forEach(function (c) { c.addEventListener("change", function () { P.setOpt(c.getAttribute("data-opt"), c.checked); }); });
    $("[data-reset]").addEventListener("click", function () {
      if (confirm("Forget everything the sanctum remembers about you on this device? Your rank, artifacts and secrets will be gone. (Very in keeping with the teaching. Still.)")) P.reset();
    });
    $("[data-tablet-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var said = this.querySelector("input").value.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).join(" ");
      var msg = $("[data-tablet-msg]");
      if (said === "still hungry loosen") {
        P.secret("tablets"); msg.textContent = "Something below the page gives way. A door, lower than the others.";
      } else if (/still|hungry|loosen/.test(said)) {
        msg.textContent = "The right words, perhaps, but not in the right order. The tablets are numbered for a reason.";
      } else {
        msg.textContent = "Nothing happens. The tablets are patient. Find them first.";
      }
    });
  }
  if (window.CoilPath) go(); else document.addEventListener("coilpath:ready", go);
})();
