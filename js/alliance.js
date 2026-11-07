/* FOR THE ALLIANCE — splits the battle cry into letters and plays it in when the banner scrolls into view */
(function () {
  "use strict";
  var sec = document.querySelector("[data-alliance]");
  if (!sec) return;
  var cry = sec.querySelector(".al-cry"), i = 0;
  cry.innerHTML = cry.textContent.trim().split(/\s+/).map(function (w) {
    return '<span class="al-word" aria-hidden="true">' + w.split("").map(function (c) {
      return '<span class="al-ch" style="--i:' + (i++) + '">' + c + "</span>";
    }).join("") + "</span>";
  }).join(" ");
  function play() { sec.classList.add("in"); }
  if (!("IntersectionObserver" in window)) { play(); return; }
  var io = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); }
  }, { threshold: 0.25 });
  io.observe(sec);
})();
