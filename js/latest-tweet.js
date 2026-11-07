/* ==========================================================
   THE SERPENT SPEAKS — the latest post from @xalrethrp
   Reads data/latest-tweet.json (kept current by .github/workflows/latest-tweet.yml) and embeds that one post.
   Single-post embeds show for everyone, logged in to X or not; X's whole-timeline widget no longer does.
   X's script only loads when the card scrolls near the screen, with Do Not Track on.
   ========================================================== */
(function () {
  "use strict";
  var card = document.querySelector("[data-x-card]");
  if (!card) return;
  var slot = card.querySelector(".xpost-slot");
  var HANDLE = "xalrethrp";   // only this account's posts are ever shown
  var handle = HANDLE;
  var started = false;

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function when(d) {
    if (!d) return "";
    var t = Date.parse(d); if (isNaN(t)) return "";
    var s = (Date.now() - t) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  // Our own card, shown at once and kept if X's script is blocked
  function fallback(post) {
    var url = post && post.url ? post.url : "https://x.com/" + handle;
    var body = post && post.text
      ? '<p class="xpost-text">' + esc(post.text) + "</p>"
      : post && post.id
        ? '<p class="xpost-text muted">The Serpent has spoken. Open it on X to read the words.</p>'
        : '<p class="xpost-text muted">The Serpent is still choosing his words. Follow along on X and be the first to hear them.</p>';
    slot.innerHTML =
      '<a class="xpost-fallback" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      '<span class="xpost-head"><img src="img/xalreth-mark.png" alt="" width="40" height="40"><span><b>Cult of Xal\'Reth</b><i>@' + esc(handle) + "</i></span>" +
      '<svg class="xpost-x" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.3L1 2h6.3l4.3 5.7zm-1.1 18h1.7L6.3 3.9H4.5z"/></svg></span>' +
      body + '<span class="xpost-foot">' + (post && post.date ? esc(when(post.date)) + " · " : "") + "View on X →</span></a>";
  }

  function loadWidgets() {
    if (window.twttr && window.twttr.widgets) return Promise.resolve(window.twttr);
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://platform.twitter.com/widgets.js";
      s.async = true; s.charset = "utf-8";
      s.onload = function () {
        var tries = 0;
        (function wait() {
          if (window.twttr && window.twttr.widgets && window.twttr.widgets.createTweet) return resolve(window.twttr);
          if (++tries > 50) return reject(new Error("widgets not ready"));
          setTimeout(wait, 100);
        })();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function start() {
    if (started) return; started = true;
    card.classList.add("is-loading");
    fetch("data/latest-tweet.json?h=" + Math.floor(Date.now() / 6e5), { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (post) {
        // anything not posted by @xalrethrp is ignored
        var mine = post && post.id && String(post.handle || "").toLowerCase() === HANDLE &&
          (!post.url || new RegExp("^https://(x|twitter)\\.com/" + HANDLE + "/status/\\d+$", "i").test(post.url));
        if (!mine) post = {};
        fallback(post);
        if (!post.id) { card.classList.remove("is-loading"); return; }
        var holder = document.createElement("div");
        holder.className = "xpost-embed";
        slot.appendChild(holder);
        var giveUp = setTimeout(function () { card.classList.remove("is-loading"); }, 9000);
        loadWidgets()
          .then(function (twttr) {
            return twttr.widgets.createTweet(post.id, holder, { theme: "dark", dnt: true, conversation: "none", align: "center", width: 550 });
          })
          .then(function (el) {
            clearTimeout(giveUp);
            card.classList.remove("is-loading");
            if (el) card.classList.add("is-embedded");   // X's own card is in; ours steps aside
          })
          .catch(function () { clearTimeout(giveUp); card.classList.remove("is-loading"); });
      });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: "400px 0px" });
    io.observe(card);
  } else start();
})();
