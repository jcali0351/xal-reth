/* THE SANCTUM SKY — parallax for the homepage backdrop.
   Scrolling: the sky sinks slower than the page and swells a little, so the sanctum seems far away.
   Mouse: the sky leans gently away from the pointer. Header: see-through at the very top, solid once you scroll. */
(function () {
  "use strict";
  var sky = document.querySelector(".hero-sky");
  if (!sky) return;
  var img = sky.querySelector(".hero-sky-img");
  var root = document.documentElement;
  root.classList.add("has-sky");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mx = 0, my = 0, tx = 0, ty = 0, sy = window.scrollY, ticking = false, visible = true;

  function top() { root.classList.toggle("at-top", window.scrollY < 40); }
  top();
  window.addEventListener("scroll", function () { sy = window.scrollY; top(); kick(); }, { passive: true });
  if (reduce) return;

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
    kick();
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(sky);
  }
  function kick() { if (!ticking && visible) { ticking = true; requestAnimationFrame(frame); } }
  function frame() {
    ticking = false;
    tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;
    var h = sky.offsetHeight || 1, p = Math.min(1, sy / h);
    var y = sy * 0.42 - ty * 10;
    var x = -tx * 16;
    var s = 1.08 + p * 0.12;
    img.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")";
    if (Math.abs(mx - tx) > 0.002 || Math.abs(my - ty) > 0.002) kick();
  }
  kick();
})();
