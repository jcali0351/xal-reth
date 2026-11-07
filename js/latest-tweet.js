/* ==========================================================
   THE SERPENT SPEAKS — the latest post from @xalrethrp, drawn in the Coil's own purple and black
   Reads data/latest-tweet.json (kept current by .github/workflows/latest-tweet.yml, which also fetches the post's
   text from X's public oEmbed). No X script and no X frame: nothing blue, nothing tracking, works for everyone.
   ========================================================== */
(function () {
  "use strict";
  var card = document.querySelector("[data-x-card]");
  if (!card) return;
  var slot = card.querySelector(".xpost-slot");
  var HANDLE = "xalrethrp";   // only this account's posts are ever shown
  var PROFILE = "https://x.com/" + HANDLE;

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function when(post) {
    var t = Date.parse(post.date || "");
    if (isNaN(t)) return post.dateText || "";
    var s = (Date.now() - t) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  // links, @mentions and #tags in the post become purple links; everything else stays plain text
  function rich(text) {
    return esc(text)
      .replace(/https?:\/\/[^\s<]+/g, function (u) {
        var clean = u.replace(/[.,!?)]+$/, ""), rest = u.slice(clean.length);
        var label = clean.replace(/^https?:\/\/(www\.)?/, "");
        if (label.length > 32) label = label.slice(0, 30) + "…";
        return '<a href="' + clean + '" target="_blank" rel="noopener nofollow">' + label + "</a>" + rest;
      })
      .replace(/(^|[^\w&])@(\w{1,15})/g, '$1<a href="https://x.com/$2" target="_blank" rel="noopener nofollow">@$2</a>')
      .replace(/(^|[^\w&])#(\w{1,60})/g, '$1<a href="https://x.com/hashtag/$2" target="_blank" rel="noopener nofollow">#$2</a>');
  }
  var XLOGO = '<svg class="xpost-x" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.3L1 2h6.3l4.3 5.7zm-1.1 18h1.7L6.3 3.9H4.5z"/></svg>';

  function render(post) {
    var mine = post && post.id && String(post.handle || "").toLowerCase() === HANDLE;
    var url = mine ? "https://x.com/" + HANDLE + "/status/" + post.id : PROFILE;
    var body = mine && post.text
      ? '<p class="xpost-text">' + rich(post.text) + "</p>"
      : mine
        ? '<p class="xpost-text muted">The Serpent has spoken. His latest words wait on X.</p>'
        : '<p class="xpost-text muted">The Serpent is still choosing his words. Follow along on X and be the first to hear them.</p>';
    var stamp = mine ? when(post) : "";
    slot.innerHTML =
      '<article class="xpost">' +
      '<header class="xpost-head"><span class="xpost-ava"><img src="img/xalreth-mark.png" alt="" width="40" height="40"></span>' +
      '<span class="xpost-name"><b>Cult of Xal\'Reth</b><a href="' + PROFILE + '" target="_blank" rel="noopener">@' + HANDLE + "</a></span>" +
      '<a class="xpost-xlink" href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="Open on X">' + XLOGO + "</a></header>" +
      body +
      '<footer class="xpost-foot">' + (stamp ? "<time>" + esc(stamp) + "</time><span>·</span>" : "") +
      '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + (mine ? "Read on X" : "Visit @" + HANDLE) + ' <span aria-hidden="true">→</span></a></footer>' +
      "</article>";
  }

  function start() {
    fetch("data/latest-tweet.json?h=" + Math.floor(Date.now() / 6e5), { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(render);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: "600px 0px" });
    io.observe(card);
  } else start();
})();
