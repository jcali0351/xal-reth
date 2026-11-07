/* THE COIL IN MOTION — scroll entrances and the strange parallax, on every page that loads site.js.
   Styles live at the end of style.css ("Scroll entrances + parallax").

   1. Entrances: every heading, paragraph, list, picture, card and button fades in on its own as it
      scrolls into view, each kind in its own way (headings condense out of mist, text rises out of blur,
      pictures open like an eye, cards tumble up, list items and buttons follow one after another).
   2. The body of the serpent: each section floats at its own depth and trails a little behind fast
      scrolling, then settles back, as if the page were one long coil catching up with itself.
   3. The Deep: a fixed layer of faint sigils, scales and runes drifting at different depths behind
      the page, and a few eyes that open, follow the pointer and blink.
   4. The Coil gauge: a serpent along the right edge that grows as you read down the page.
   5. Headers: the homepage hero separates into layers as you scroll; page headers sink and fade.

   Nothing moves for visitors who prefer reduced motion: everything is simply shown. */
(function () {
  "use strict";
  if (window.__coilMotion) return; window.__coilMotion = true;
  var doc = document, root = doc.documentElement;
  if (doc.body && /\bcms\b/.test(doc.body.className)) return;              // the Sanctum Editor
  if (/roster-admin\.html$/.test(location.pathname)) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;               // content is visible by default

  var main = doc.querySelector("main");
  if (!main) return;
  var foot = doc.querySelector(".site-footer");

  /* ---------------------------------------------------------------- 1. entrances */
  // the things that fade in. The outermost match wins, so a card enters as one piece.
  var UNIT = [
    ".card", "article.card", ".post-card", ".story-step", ".grid > *", ".rr-stat", ".notice", ".callout",
    "figure", "img", "video", "iframe", "canvas:not([aria-hidden])", "table", "details", "blockquote", "pre",
    ".divider", ".btn-row", ".cta-row", ".stat-strip", ".cta-steps", "form",
    "h1", "h2", "h3", "h4", "h5", "p", "ul", "ol", "dl", ".chant", ".foot-grid > *"
  ].join(",");
  var SKIP = ".hero, .page-head, .hero-sky, nav, dialog, [role=dialog], [data-no-motion], .ss-hero, .news-ticker, script, style, template";
  var LISTISH = /^(UL|OL|DL)$/;

  function kindOf(el) {
    var t = el.tagName, c = el.classList;
    if (c.contains("divider")) return "veil";
    if (/^H[1-5]$/.test(t)) return "mist";
    if (t === "IMG" || t === "PICTURE" || t === "FIGURE" || t === "VIDEO" || t === "IFRAME" || t === "CANVAS") return "eye";
    if (t === "BLOCKQUOTE" || c.contains("chant")) return "breath";
    if (c.contains("btn-row") || c.contains("cta-row") || c.contains("stat-strip") || c.contains("cta-steps") || LISTISH.test(t)) return "chain";
    if (t === "P" || t === "PRE" || t === "TABLE" || t === "DETAILS" || t === "FORM") return "rise";
    return "tumble";                                                         // cards and the rest
  }

  var units = [], splits = [];
  function add(el, kind) {
    if (el.__rv || (!el.offsetParent && getComputedStyle(el).position !== "fixed")) return;   // hidden for now
    el.__rv = kind; units.push(el);
  }
  function collect(scope) {
    if (!scope) return;
    var all = scope.querySelectorAll(UNIT);
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.__rv || el.__rvSplit || el.closest(SKIP)) continue;
      var p = el.parentElement, inside = false;
      while (p && p !== scope) { if (p.__rv) { inside = true; break; } p = p.parentElement; }
      if (inside) continue;
      if (!el.offsetParent && getComputedStyle(el).position !== "fixed") { continue; } // hidden for now
      // long lists and card grids: every item enters on its own as it scrolls into view
      if (LISTISH.test(el.tagName) || el.classList.contains("stat-strip") || el.classList.contains("cta-steps")) {
        var disp = getComputedStyle(el).display;
        if (el.children.length > 8 || el.offsetHeight > innerHeight * 0.9 || /grid/.test(disp) || /grid/.test(el.className)) {
          el.__rvSplit = true; splits.push(el); continue;
        }
      }
      el.__rv = kindOf(el);
      // clips only work on real boxes: an inline wrapper would cut away what spills out of it
      if (el.__rv !== "rise" && el.tagName !== "IMG" && /^inline/.test(getComputedStyle(el).display) && getComputedStyle(el).display !== "inline-block") el.__rv = "rise";
      units.push(el);
    }
    splits.forEach(function (s) {
      var big = /grid/.test(getComputedStyle(s).display) || /grid/.test(s.className);
      Array.prototype.forEach.call(s.children, function (k) { add(k, big ? "tumble" : "rise"); });
    });
  }
  collect(main); collect(foot);

  root.classList.add("rv-on");
  var seed = 0;
  units.forEach(arm);
  function arm(el) {
    el.classList.add("rv", "rv-" + el.__rv);
    seed = (seed * 9301 + 49297) % 233280;
    el.style.setProperty("--rv-tilt", ((seed / 233280 - 0.5) * 5).toFixed(2) + "deg");  // each card tumbles a little differently
    if (el.__rv === "chain") {
      var kids = el.children;
      for (var k = 0; k < kids.length; k++) {
        kids[k].classList.add("rv-kid");
        kids[k].style.setProperty("--rv-k", (Math.min(k, 14) * 0.075 + 0.08).toFixed(3) + "s");
      }
    }
  }

  function show(el, delay) {
    el.style.setProperty("--rv-d", delay.toFixed(3) + "s");
    el.classList.add("rv-in");
    // once the entrance is over, take the entrance classes off so the element's own transitions and hovers return
    setTimeout(function () {
      el.classList.remove("rv", "rv-in", "rv-" + el.__rv);
      el.style.removeProperty("--rv-d"); el.style.removeProperty("--rv-tilt");
      Array.prototype.forEach.call(el.querySelectorAll(":scope > .rv-kid"), function (k) { k.classList.remove("rv-kid"); k.style.removeProperty("--rv-k"); });
    }, 1700 + delay * 1000 + (el.__rv === "chain" ? Math.min(el.children.length, 15) * 75 : 0));
  }
  var io = new IntersectionObserver(function (entries) {
    var hits = entries.filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left); });
    hits.forEach(function (e, i) { io.unobserve(e.target); show(e.target, Math.min(i, 8) * 0.085); });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
  units.forEach(function (el) { io.observe(el); });
  // safety net: anything on screen that somehow hasn't entered after a moment is brought in
  setInterval(function () {
    if (doc.hidden) return;
    var n = 0;
    for (var i = 0; i < units.length; i++) {
      var el = units[i];
      if (!el.classList.contains("rv") || el.classList.contains("rv-in")) continue;
      var r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight * 0.92 && (r.width || r.height)) { io.unobserve(el); show(el, Math.min(n++, 6) * 0.08); }
    }
  }, 900);

  // content that arrives later (news, blog cards, roster) fades in too
  if ("MutationObserver" in window) {
    var pend = false;
    new MutationObserver(function () {
      if (pend) return; pend = true;
      setTimeout(function () {
        pend = false;
        var before = units.length; collect(main);
        for (var i = before; i < units.length; i++) { arm(units[i]); io.observe(units[i]); }
        units = units.filter(function (el) { return el.isConnected; });   // forget what was removed (re-rendered lists)
        measure();
      }, 120);
    }).observe(main, { childList: true, subtree: true });
  }
  // following a #link straight into the page: show what's there at once
  window.addEventListener("hashchange", function () { var t = doc.getElementById(location.hash.slice(1)); if (t) { var u = t.closest(".rv"); if (u && !u.classList.contains("rv-in")) show(u, 0); } });
  window.addEventListener("beforeprint", function () { units.forEach(function (el) { el.classList.add("rv-in", "rv-done"); }); });

  /* ---------------------------------------------------------------- 2. the body of the serpent */
  var blocks = [];
  var DEPTHS = [0.55, 0.2, 0.8, 0.35, 0.65, 0.1, 0.45, 0.9];
  (function () {
    var list = [];
    Array.prototype.forEach.call(main.children, function (c) {
      if (c.matches(".hero, .page-head, script, style")) return;
      if (c.classList.contains("wrap")) Array.prototype.forEach.call(c.children, function (cc) { list.push(cc); });
      else list.push(c);
    });
    list.forEach(function (el, i) {
      if (el.matches(SKIP) || el.offsetHeight < 8) return;
      // a moved box takes fixed and sticky things inside it along; leave those boxes still
      var cs = getComputedStyle(el);
      if (cs.position === "sticky" || cs.position === "fixed" || (cs.translate && cs.translate !== "none")) return;
      var inner = el.querySelectorAll("*");
      for (var j = 0; j < inner.length && j < 4000; j++) { var p = getComputedStyle(inner[j]).position; if (p === "fixed" || p === "sticky") return; }
      blocks.push({ el: el, d: DEPTHS[i % DEPTHS.length], top: 0, h: 0, lag: 0, y: null });
    });
  })();

  /* ---------------------------------------------------------------- 3. the Deep */
  var deep = doc.createElement("div");
  deep.className = "coil-deep"; deep.setAttribute("aria-hidden", "true");
  var SVG = function (vb, body) { return '<svg viewBox="' + vb + '" focusable="false">' + body + "</svg>"; };
  var GLYPHS = {
    tri:   SVG("0 0 100 100", '<polygon points="50,6 95,86 5,86" class="g-l"/><polygon points="50,30 74,72 26,72" class="g-l g-thin"/>'),
    tri2:  SVG("0 0 100 100", '<polygon points="50,94 95,14 5,14" class="g-l"/><circle cx="50" cy="42" r="9" class="g-l g-thin"/>'),
    scale: SVG("0 0 100 100", '<path d="M10 40 Q50 -4 90 40 Q50 60 10 40Z M20 62 Q50 26 80 62 Q50 80 20 62Z" class="g-l"/>'),
    ring:  SVG("0 0 100 100", '<circle cx="50" cy="50" r="42" class="g-l g-dash"/><circle cx="50" cy="50" r="26" class="g-l g-thin"/>'),
    coil:  SVG("0 0 100 100", '<path d="M50 50 m0 -6 a6 6 0 1 1 -6 6 a12 12 0 1 1 12 12 a20 20 0 1 1 -20 -20 a30 30 0 1 1 30 30" class="g-l"/>'),
    rune:  SVG("0 0 100 100", '<text x="50" y="68" text-anchor="middle" class="g-rune">ᛟ</text>'),
    rune2: SVG("0 0 100 100", '<text x="50" y="68" text-anchor="middle" class="g-rune">ᛉ</text>'),
    eye:   SVG("0 0 120 70", '<path d="M6 35 Q60 -10 114 35 Q60 80 6 35Z" class="g-l"/><g class="g-pupil"><circle cx="60" cy="35" r="15" class="g-iris"/><ellipse cx="60" cy="35" rx="3.2" ry="12" class="g-slit"/></g><path d="M6 35 Q60 -10 114 35 Q60 80 6 35Z" class="g-lid"/>')
  };
  var PLAN = [ // kind, x (vw %), y (fraction of the drift band), size px, depth, spin
    ["tri", 6, 0.05, 120, 0.15, 0.02], ["eye", 84, 0.1, 110, 0.35, 0], ["rune", 18, 0.22, 70, 0.6, -0.05],
    ["scale", 72, 0.3, 90, 0.25, 0.03], ["ring", 90, 0.42, 160, 0.1, 0.04], ["coil", 4, 0.48, 130, 0.45, -0.06],
    ["tri2", 60, 0.58, 80, 0.7, 0.05], ["eye", 12, 0.66, 80, 0.55, 0], ["rune2", 80, 0.72, 60, 0.85, 0.04],
    ["scale", 30, 0.82, 70, 0.3, -0.03], ["tri", 92, 0.9, 70, 0.5, -0.04], ["eye", 44, 0.95, 64, 0.75, 0], ["ring", 26, 0.38, 90, 0.8, -0.05]
  ];
  var glyphs = PLAN.map(function (g, i) {
    var el = doc.createElement("span");
    el.className = "coil-glyph g-" + g[0] + (i % 3 === 0 ? " g-warm" : "");
    el.style.width = g[3] + "px"; el.style.left = g[1] + "vw";
    el.style.setProperty("--g-o", (0.10 + g[4] * 0.16).toFixed(3));
    el.innerHTML = GLYPHS[g[0]];
    el.firstChild.style.animationDelay = (-i * 1.7).toFixed(1) + "s";
    if (g[0] === "eye") el.querySelector(".g-lid").style.animationDelay = (i * 1.3 % 7).toFixed(1) + "s";
    deep.appendChild(el);
    return { el: el, x: g[1], y: g[2], size: g[3], d: g[4], spin: g[5], eye: g[0] === "eye" ? el.querySelector(".g-pupil") : null };
  });
  doc.body.insertBefore(deep, doc.body.firstChild);

  /* ---------------------------------------------------------------- 4. the Coil gauge */
  var gauge = doc.createElement("div");
  gauge.className = "coil-gauge"; gauge.setAttribute("aria-hidden", "true");
  var wave = "M13 0"; for (var s = 1; s <= 40; s++) wave += " Q" + (s % 2 ? 24 : 2) + " " + (s * 25 - 12.5) + " 13 " + (s * 25);
  gauge.innerHTML = '<svg viewBox="0 0 26 1000" preserveAspectRatio="none"><path d="' + wave + '" class="cg-track"/><path d="' + wave + '" class="cg-body" pathLength="1"/></svg><span class="cg-head"></span>';
  doc.body.appendChild(gauge);
  var gBody = gauge.querySelector(".cg-body"), gHead = gauge.querySelector(".cg-head"), gPath = gauge.querySelector(".cg-track");
  var gLen = 0; try { gLen = gPath.getTotalLength(); } catch (e) {}

  /* ---------------------------------------------------------------- 5. headers */
  var hero = main.querySelector(".hero"), head = main.querySelector(".page-head");
  var heroLayers = [];
  // each layer rises a little faster than the one below it, so the hero unwinds and spreads apart as you
  // scroll (layers never overlap, and nothing is pushed down into the hero's bottom edge)
  if (hero) {
    var hk = Array.prototype.filter.call(hero.children, function (c) { return !c.classList.contains("mh-fx"); });
    hk.forEach(function (c, i) { heroLayers.push({ el: c, k: -0.022 * (hk.length - 1 - i) }); });
  }
  var headKids = head ? Array.prototype.filter.call(head.children, function (c) { return !c.classList.contains("mh-fx"); }) : [];
  var headArt = head ? head.querySelector(".mh-art") : null;

  /* ---------------------------------------------------------------- the loop */
  var vh = innerHeight, vw = innerWidth, sy = scrollY, last = scrollY, vel = 0;
  var mx = 0.5, my = 0.4, emx = 0.5, emy = 0.4, docH = 1, running = false, band = 1;

  function absTop(el) { var t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; }
  function measure() {
    vh = innerHeight; vw = innerWidth; band = vh * 2.4;
    docH = Math.max(1, root.scrollHeight - vh);
    blocks.forEach(function (b) { b.top = absTop(b.el); b.h = b.el.offsetHeight; });
    gauge.classList.toggle("on", root.scrollHeight > vh * 2.2 && vw > 1240);   // only where the margin is free
    kick();
  }
  var mq = 0;
  function remeasure() { cancelAnimationFrame(mq); mq = requestAnimationFrame(measure); }
  addEventListener("resize", remeasure);
  addEventListener("load", remeasure);
  if ("ResizeObserver" in window) new ResizeObserver(remeasure).observe(main);

  addEventListener("scroll", kick, { passive: true });
  addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    mx = e.clientX / vw; my = e.clientY / vh; kick();
  }, { passive: true });
  doc.addEventListener("visibilitychange", function () { if (!doc.hidden) kick(); });

  function kick() { if (!running && !doc.hidden) { running = true; requestAnimationFrame(frame); } }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function frame() {
    sy = scrollY;
    var dv = sy - last; last = sy;
    vel += (dv - vel) * 0.18;                      // smoothed scroll speed, px per frame
    emx += (mx - emx) * 0.08; emy += (my - emy) * 0.08;
    var busy = Math.abs(vel) > 0.05 || Math.abs(mx - emx) > 0.001 || Math.abs(my - emy) > 0.001;

    // sections float at their depth and trail behind fast scrolling
    var mid = sy + vh / 2;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.top + b.h < sy - vh || b.top > sy + vh * 2) continue;
      // distance of the section from the middle of the screen (zero while it spans the middle, so tall ones stay put)
      var rel = b.top > mid ? (b.top - mid) / vh : b.top + b.h < mid ? (b.top + b.h - mid) / vh : 0;
      rel = clamp(rel, -1.3, 1.3);
      b.lag += (clamp(-vel * (0.6 + b.d), -38, 38) - b.lag) * (0.10 + b.d * 0.06);
      if (Math.abs(b.lag) > 0.05) busy = true;
      var y = Math.round((rel * b.d * 46 + b.lag) * 10) / 10;
      if (y !== b.y) { b.y = y; b.el.style.translate = "0 " + y + "px"; }
    }

    // the Deep drifts at its own depths, wraps around, and turns a little as you scroll
    for (var g = 0; g < glyphs.length; g++) {
      var G = glyphs[g];
      var yy = ((G.y * band - sy * G.d) % band + band) % band - G.size;
      var tx = (emx - 0.5) * -40 * G.d, ty = (emy - 0.5) * -24 * G.d;
      G.el.style.transform = "translate3d(" + tx.toFixed(1) + "px," + (yy + ty).toFixed(1) + "px,0) rotate(" + (sy * G.spin).toFixed(1) + "deg)";
      if (G.eye) {
        // the eyes follow the pointer, and widen when you scroll fast
        var cx = G.x * vw / 100 + G.size / 2 + tx, cy = yy + ty + G.size * 0.29;
        var ax = clamp((emx * vw - cx) / vw * 60, -22, 22), ay = clamp((emy * vh - cy) / vh * 30, -9, 9);
        G.eye.style.transform = "translate(" + ax.toFixed(1) + "px," + ay.toFixed(1) + "px) scaleX(" + (1 + clamp(Math.abs(vel) / 30, 0, 1.6)).toFixed(2) + ")";
      }
    }

    // the Coil gauge grows with reading
    if (gLen) {
      var p = clamp(sy / docH, 0, 1);
      gBody.style.strokeDashoffset = (1 - p).toFixed(4);
      var pt = gPath.getPointAtLength(p * gLen), gh = gauge.clientHeight;
      gHead.style.transform = "translate(" + (pt.x - 13).toFixed(1) + "px," + (pt.y / 1000 * gh).toFixed(1) + "px) rotate(" + (vel * 2).toFixed(1) + "deg)";
    }

    // headers: the hero comes apart into layers; page headers sink and fade
    if (hero && sy < vh * 1.6) {
      for (var h = 0; h < heroLayers.length; h++) heroLayers[h].el.style.translate = "0 " + (sy * heroLayers[h].k).toFixed(1) + "px";
    }
    if (head && sy < vh * 1.4) {
      var hp = clamp(sy / Math.max(200, head.offsetHeight), 0, 1);
      for (var k = 0; k < headKids.length; k++) {
        headKids[k].style.translate = "0 " + (sy * (0.22 + k * 0.07)).toFixed(1) + "px";
        headKids[k].style.opacity = (1 - hp * 0.85).toFixed(3);
        headKids[k].style.filter = hp > 0.02 ? "blur(" + (hp * 5).toFixed(1) + "px)" : "";
      }
      if (headArt) { headArt.style.rotate = (sy * 0.09).toFixed(1) + "deg"; headArt.style.scale = (1 + hp * 0.35).toFixed(3); }
    }

    if (busy) requestAnimationFrame(frame); else running = false;
  }
  measure();
})();
