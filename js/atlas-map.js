/* The Atlas of the Coil (map.html): the holy places from the Legends and the Codex as pins on an original map.
   Visiting a place counts toward the Path (window.CoilPath, js/coil-path.js). */
(function () {
  "use strict";
  var root = document.querySelector("[data-atlas]");
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };

  function go() {
    var P = window.CoilPath, byId = {};
    P.PLACES.forEach(function (p) { byId[p.id] = p; });
    var pins = root.querySelectorAll(".am-pin");

    function paint() {
      var S = P.state, n = Object.keys(S.places || {}).length;
      pins.forEach(function (g) { g.classList.toggle("seen", !!S.places[g.getAttribute("data-place")]); });
      $("[data-am-count]").textContent = n + " of " + P.PLACES.length + " places visited";
      $("[data-am-bar]").style.width = Math.round(n / P.PLACES.length * 100) + "%";
      $("[data-am-list]").innerHTML = P.PLACES.map(function (p) {
        return '<li><button type="button" data-goto="' + p.id + '" class="' + (S.places[p.id] ? "seen" : "") + '">' + p.name + "</button></li>";
      }).join("");
    }
    function open(id) {
      var p = byId[id];
      if (!p) return;
      pins.forEach(function (g) { g.classList.toggle("on", g.getAttribute("data-place") === id); });
      $("[data-am-tag]").textContent = p.tag;
      $("[data-am-name]").textContent = p.name;
      $("[data-am-text]").textContent = p.text;
      var a = $("[data-am-link]"); a.href = p.link; a.hidden = false;
      a.textContent = /^legends/.test(p.link) ? "Read the Legend" : /^codex/.test(p.link) ? "Read the Codex" : "Visit the Fields";
      if (P.place(id)) P.toast("A place visited", p.name, "Added to your Atlas. The Path remembers.", P.glyph("eye"));
      paint();
    }
    pins.forEach(function (g) {
      g.addEventListener("click", function () { open(g.getAttribute("data-place")); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(g.getAttribute("data-place")); } });
    });
    $("[data-am-list]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-goto]"); if (b) open(b.getAttribute("data-goto"));
    });
    paint();
    P.on(paint);
  }
  if (window.CoilPath) go(); else document.addEventListener("coilpath:ready", go);
})();
