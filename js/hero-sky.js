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

  /* THE SLIDESHOW: data-slides="a.webp|b.webp|…" on .hero-sky (set in the Sanctum Editor's Homepage sky tab).
     Each picture is loaded before it is shown; the show pauses while the sky is off screen or the tab is hidden. */
  var slides = (sky.getAttribute("data-slides") || "").split("|").map(function (s) { return s.trim(); }).filter(Boolean);
  if (slides.length > 1) (function () {
    var every = Math.min(60, Math.max(4, +sky.getAttribute("data-interval") || 8)) * 1000;
    var mode = /^(fade|slide|both)$/.test(sky.getAttribute("data-transition")) ? sky.getAttribute("data-transition") : "both";
    var flash = sky.getAttribute("data-flash") !== "off";
    // start with whichever picture the sky already shows, so the first change is a real change
    var shown = (getComputedStyle(img).backgroundImage.match(/url\(["']?([^"')]+)/) || [, ""])[1];
    var first = slides.findIndex(function (s) { return shown && shown.indexOf(s.replace(/^\.?\//, "")) >= 0; });
    if (first > 0) slides = slides.slice(first).concat(slides.slice(0, first));
    sky.classList.add("show-" + mode);
    sky.style.setProperty("--sky-drift", (every / 1000 + 4) + "s");
    var layers = slides.map(function (src) { var d = document.createElement("div"); d.className = "hero-sky-slide"; d.setAttribute("data-src", src); img.appendChild(d); return d; });
    var fl = document.createElement("span"); fl.className = "hero-sky-flash"; sky.insertBefore(fl, img.nextSibling);
    var cur = -1, timer = 0, onScreen = true;
    function load(i) {
      var d = layers[i];
      if (!d.__ready) d.__ready = new Promise(function (res) {
        var im = new Image();
        im.onload = function () { d.style.backgroundImage = "url('" + d.getAttribute("data-src") + "')"; (im.decode ? im.decode().catch(function () {}) : Promise.resolve()).then(function () { res(true); }); };
        im.onerror = function () { res(false); };
        im.src = d.getAttribute("data-src");
      });
      return d.__ready;
    }
    function show(n) {
      return load(n).then(function (ok) {
        if (!ok) { layers.splice(n, 1); return layers.length > 1 ? show(n % layers.length) : null; }   // a missing picture is skipped
        var old = layers[cur];
        if (old) { old.classList.remove("on"); old.classList.add("off"); setTimeout(function () { old.classList.remove("off"); }, 2800); }
        layers[n].classList.add("on"); cur = n;
        if (flash && old) { fl.classList.remove("go"); void fl.offsetWidth; fl.classList.add("go"); }
        load((n + 1) % layers.length);
        schedule();
      });
    }
    function schedule() { clearTimeout(timer); if (onScreen && !document.hidden && layers.length > 1) timer = setTimeout(function () { show((cur + 1) % layers.length); }, every); }
    show(0);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; schedule(); }).observe(sky);
    document.addEventListener("visibilitychange", schedule);
  })();

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
