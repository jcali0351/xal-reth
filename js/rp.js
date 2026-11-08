/* The Faces of the Coil (rp.html): the guild's in-character social hub. Sign in with Battle.net, post and set a
   status as your characters, the feed of everyone's posts with reactions and comments, and the directory of faces.
   Social parts come from js/faces-social.js (the social Worker); profiles the officers keep in data/rp-profiles.json
   are listed too. Until the Worker is set up, only the directory shows. */
(function () {
  "use strict";
  var root = document.querySelector("[data-rp]");
  if (!root || !window.CoilFaces || !window.CoilSocial) return;
  var F = window.CoilFaces, S = window.CoilSocial, esc = F.esc;
  var $ = function (s) { return root.querySelector(s); };
  var D = null, dir = [], oldest = null;

  function paintDir() {
    var t = ($("[data-rp-q]").value || "").trim().toLowerCase();
    var list = dir.filter(function (c) { return !t || c.s.indexOf(t) >= 0; });
    $("[data-rp-count]").textContent = list.length + (list.length === 1 ? " face" : " faces");
    $("[data-rp-grid]").innerHTML = list.map(function (c) {
      return '<li class="rp-card" style="--cc:' + esc(c.color) + '"><a href="' + esc(F.url(c.key)) + '">' +
        '<span class="rp-pic"' + (c.pic ? ' style="background-image:url(' + esc(c.pic) + ')"' : "") + "></span>" +
        '<span class="rp-text"><b>' + esc(c.name) + "</b>" + (c.title ? "<small>" + esc(c.title) + "</small>" : "") +
        (c.status ? '<q class="rp-status">' + esc(c.status) + "</q>" : c.quote ? "<q>" + esc(c.quote) + "</q>" : "") +
        '<span class="rp-meta">' + esc(c.meta) + (c.active ? " · active " + esc(S.ago(c.active)) : "") + "</span></span></a></li>";
    }).join("") || '<li class="rp-empty">' + (dir.length ? "Nobody by that name. Try fewer letters." : "No faces yet. The first to sign in gets the honour of being first.") + "</li>";
  }
  function buildDir(social) {
    var seen = {}, out = [];
    function add(key, extra) {
      if (seen[key]) { Object.assign(seen[key], extra); return; }
      var m = D.byKey[key], legacy = D.profiles[key] || {};
      var c = { key: key, name: legacy.icName || (m ? m.name : F.nameOf(D, key)), title: legacy.title || "", quote: legacy.quote || "", status: "",
        pic: legacy.portrait || (m && m.media && (m.media.inset || m.media.avatar)) || "", color: F.color(m), active: 0,
        meta: m ? [m.race, F.className(m)].filter(Boolean).join(" ") : "Not on the roster right now" };
      Object.assign(c, extra); seen[key] = c; out.push(c);
    }
    Object.keys(D.profiles).forEach(function (k) { add(k, {}); });
    (social || []).forEach(function (p) {
      var x = { active: p.active || 0 };
      if (p.icName) x.name = p.icName; if (p.title) x.title = p.title; if (p.status) x.status = p.status;
      if (p.avatar) x.pic = S.picUrl(p.avatar);
      add(p.key, x);
    });
    out.forEach(function (c) { c.s = [c.name, c.title, c.status, c.quote, c.meta, (D.byKey[c.key] || {}).name].join(" ").toLowerCase(); });
    out.sort(function (a, b) { return (b.active || 0) - (a.active || 0) || a.name.localeCompare(b.name); });
    dir = out; paintDir();
  }
  function loadFeed(more) {
    var feed = $("[data-feed]");
    if (!more) { feed.innerHTML = '<p class="fs-loading">Listening to the Coil…</p>'; oldest = null; }
    return S.api("/feed?limit=15" + (more && oldest ? "&before=" + oldest : "")).then(function (r) {
      if (!more) feed.innerHTML = "";
      r.posts.forEach(function (p) { feed.appendChild(S.renderPost(D, r.faces, p)); oldest = p.created; });
      if (!more && !r.posts.length) feed.innerHTML = '<p class="fs-empty">The feed is quiet. Say something, in character. The first words are always the hardest, and also the easiest.</p>';
      $("[data-more]").hidden = !r.more;
    }).catch(function (e) { feed.innerHTML = '<p class="fs-empty">' + esc(e.message) + "</p>"; });
  }

  F.load().then(function (d) {
    D = d;
    buildDir([]);
    if (!S.on) { $("[data-social]").hidden = true; S.bar($("[data-bar]"), d); return; }
    S.wire($("[data-feed]"), d);
    S.bar($("[data-bar]"), d, function () { S.composer($("[data-compose]"), d, null, function () { loadFeed(false); }); }).then(function () {
      S.composer($("[data-compose]"), d, null, function () { loadFeed(false); refreshDir(); });
    });
    loadFeed(false);
    refreshDir();
  });
  function refreshDir() { S.api("/directory").then(function (r) { buildDir(r.profiles); }).catch(function () {}); }
  $("[data-rp-q]").addEventListener("input", paintDir);
  $("[data-more]").addEventListener("click", function () { loadFeed(true); });
})();
