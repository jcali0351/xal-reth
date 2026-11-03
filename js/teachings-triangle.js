/* Teachings of the Sacred Triangle: search across every verse, with highlighted matches. */
(function () {
  "use strict";
  var input = document.getElementById("tt-q"), note = document.getElementById("tt-n");
  if (!input) return;
  var verses = [].slice.call(document.querySelectorAll(".tt-v"));
  verses.forEach(function (v) { var n = v.querySelector(".tt-vn"); v._num = n; v._text = v.textContent.slice(n.textContent.length); });
  var timer;
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function run() {
    var q = input.value.trim().toLowerCase();
    document.body.classList.toggle("tt-searching", !!q);
    var hits = 0;
    verses.forEach(function (v) {
      var txt = v._text, i = q ? txt.toLowerCase().indexOf(q) : -1;
      v.classList.toggle("tt-miss", !!q && i < 0);
      var html = esc(txt);
      if (q && i >= 0) {
        hits++;
        html = esc(txt).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), function (m) { return '<mark class="tt-hit">' + m + "</mark>"; });
      }
      v.innerHTML = ""; v.appendChild(v._num); v.insertAdjacentHTML("beforeend", html);
    });
    document.querySelectorAll(".tt-ch").forEach(function (ch) { ch.classList.toggle("tt-miss", !!q && !ch.querySelector(".tt-v:not(.tt-miss)")); });
    document.querySelectorAll(".tt-book").forEach(function (b) { b.classList.toggle("tt-miss", !!q && !b.querySelector(".tt-ch:not(.tt-miss)")); });
    note.textContent = !q ? "" : hits ? hits + (hits === 1 ? " verse speaks of it." : " verses speak of it.") : "The Teachings are silent on this. Nhalor approves.";
  }
  input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 120); });
})();
