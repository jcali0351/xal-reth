/* What the sanctum counts (counts.html explains it to visitors): page views and a few goals, through GoatCounter,
   which uses no cookies and keeps no personal data. Loaded on every page by the loader at the top of site.js.
   Off until CODE is set (the site's GoatCounter code, e.g. "xalreth" for https://xalreth.goatcounter.com). Not counted:
   visitors who send Do Not Track or Global Privacy Control, noindex pages (the Sanctum Editor), and localhost.
   Goals are GoatCounter events: forms sent (xr:sent from recruit.js, contact.js, chat.js), addon downloads (.zip links)
   and settled searches in the Seeking Glass (xr:search from search.js; the words only, nothing about who searched). */
(function () {
  "use strict";
  var CODE = "";   // the GoatCounter code; set it once John has made the GoatCounter site
  var queue = [];
  window.coilCount = function (name, title) { queue.push([name, title]); };
  if (!CODE) return;
  var dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.msDoNotTrack === "1" || navigator.globalPrivacyControl === true;
  var noindex = /noindex/.test((document.querySelector('meta[name="robots"]') || {}).content || "");
  if (dnt || noindex || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;

  function flush() {
    if (!(window.goatcounter && window.goatcounter.count)) return;
    queue.splice(0).forEach(function (e) {
      try { window.goatcounter.count({ path: e[0], title: e[1] || e[0], event: true }); } catch (x) {}
    });
  }
  window.coilCount = function (name, title) { queue.push([String(name).slice(0, 200), title]); flush(); };
  var s = document.createElement("script");
  s.async = true; s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + CODE + ".goatcounter.com/count");
  s.onload = function () { setTimeout(flush, 200); };
  document.head.appendChild(s);

  // goals
  document.addEventListener("xr:sent", function (e) { window.coilCount("goal/" + ((e.detail && e.detail.form) || "form"), "Form sent"); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href$=".zip"]');
    if (a) window.coilCount("download/" + a.getAttribute("href").split("/").pop(), "Addon download");
  }, true);
  var timer = null, last = "";
  document.addEventListener("xr:search", function (e) {
    var q = ((e.detail && e.detail.q) || "").toLowerCase().replace(/\s+/g, " ").trim(), n = (e.detail && e.detail.n) || 0;
    clearTimeout(timer);
    if (q.length < 3) return;
    timer = setTimeout(function () {   // count a search once the visitor stops typing
      if (q === last) return; last = q;
      window.coilCount((n ? "search/" : "search-none/") + q.slice(0, 60), n ? "Search" : "Search with no results");
    }, 2500);
  });
})();
