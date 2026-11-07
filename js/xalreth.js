/* Xal'Reth animated hero: particles, signal bursts, rotating status messages and the hidden
   Unwrapping (click or tap the sigil three times, or type "hold light"). Scoped to #xalreth-hero. */
(function () {
  "use strict";
  var hero = document.getElementById("xalreth-hero");
  if (!hero) return;
  var SCRIPT_URL = (document.currentScript && document.currentScript.src) || "js/xalreth.js";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var visible = true, pageShown = !document.hidden, userPaused = false, three = null;
  try { userPaused = localStorage.getItem("xr-motion") === "paused"; } catch (e) {}
  function running() { return visible && pageShown && !reduce && !userPaused; }
  function syncMotion() {
    hero.classList.toggle("xr-still", userPaused || reduce);
    if (three && !three.dead) three.setPaused(!running());
  }

  /* ------------------------------------------------------------ particles */
  var canvas = hero.querySelector(".xr-particles");
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var parts = [], W = 0, H = 0, dpr = 1, surge = 0;
  function size() {
    if (!ctx) return;
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var want = Math.round(Math.min(110, Math.max(36, W * H / 4200)));
    while (parts.length < want) parts.push(spawn(true));
    parts.length = want;
  }
  function spawn(anywhere) {
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 8,
      r: 0.6 + Math.random() * 1.9, vy: 0.12 + Math.random() * 0.45,
      sway: Math.random() * Math.PI * 2, swaySpeed: 0.004 + Math.random() * 0.012,
      a: 0.25 + Math.random() * 0.6, hue: 262 + Math.random() * 26, tw: Math.random() * Math.PI * 2
    };
  }
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.5;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!reduce) {
        p.sway += p.swaySpeed; p.tw += 0.05;
        p.y -= p.vy * (1 + surge * 3);
        p.x += Math.sin(p.sway) * 0.25;
        if (surge > 0) { p.x += (p.x - cx) * 0.004 * surge; p.y += (p.y - cy) * 0.004 * surge; }
        if (p.y < -8 || p.x < -10 || p.x > W + 10) parts[i] = p = spawn(false);
      }
      var a = p.a * (0.65 + 0.35 * Math.sin(p.tw));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "hsla(" + p.hue + ",100%,80%," + a.toFixed(3) + ")";
      ctx.shadowColor = "hsla(" + p.hue + ",100%,70%,0.9)"; ctx.shadowBlur = 8;
      ctx.fill();
    }
    surge *= 0.96; if (surge < 0.01) surge = 0;
  }
  function loop() { if (running() && (!three || three.dead)) draw(); requestAnimationFrame(loop); }
  if (ctx) {
    size(); draw();
    window.addEventListener("resize", size);
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------ signal bursts */
  var signals = hero.querySelector(".xr-signals");
  function burst(n) {
    if (!signals || reduce) return;
    n = n || 1 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var b = document.createElement("span");
      b.className = "xr-beam";
      b.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)";
      b.style.animationDelay = (i * 0.12) + "s";
      signals.appendChild(b);
      setTimeout(function (el) { return function () { el.remove(); }; }(b), 1400 + i * 120);
    }
  }
  (function scheduleBurst() {
    setTimeout(function () { if (running()) burst(); scheduleBurst(); }, 2600 + Math.random() * 4200);
  })();

  /* ------------------------------------------------------------ status messages */
  var statusEl = hero.querySelector(".xr-status");
  var MESSAGES = {
    OBSERVE: [
      "Watching the guild bank. Nobody has touched slot 97 since Shedfall.",
      "The Unblinking Eye sees your nameplates are off. It is not angry. It is patient.",
      "Three eggs are hatching in Goldshire. One of them is a warlock.",
      "Monitoring the Warm Ridge. Basking levels: nominal.",
      "Counting the coils beneath the world. Still three.",
      "A Gripper has been sighted near the auction house. Hold your gold lightly."
    ],
    ANALYZE: [
      "Your rotation has been analyzed. It is a journey.",
      "Cross-referencing the Ledger. Hessk asks: what did you give today?",
      "Scanning for wings. None found. The Featherist Heresy remains false.",
      "Comparing your patience to a sleeping lizard. The lizard is winning.",
      "Reading the Litany of Begging. Do not wait up.",
      "Calculating the weight of the world. Rounding down, for mercy."
    ],
    TRANSCEND: [
      "Transcendence pending. Please hold light.",
      "Letting go of 4% of all grudges. Please wait.",
      "The Open Door is open. Xal'Reth is still choosing to stay.",
      "Uploading your worries to the Void. Upload speed: unhurried.",
      "Shedding complete. Your old skin has been placed in the Hall of Shed Skins.",
      "Ascension queued behind the current Mythic+ group. Estimated wait: ten thousand years."
    ]
  };
  var PHASES = ["OBSERVE", "ANALYZE", "TRANSCEND"];
  var UNWRAP = { label: "THE UNWRAPPING", text: "Not yet. He is still holding the world, and you, a little more lightly. Glory to Xal'Reth." };
  var TYPE_MS = 28, HOLD_MS = 4200;
  var phase = 0, typing = null, egg = false;
  // The words are editable in the site editor (admin.html), which saves them to data/hero-text.json.
  // The lines above are the fallback if that file can't be read.
  function applyHeroText(d) {
    if (!d || typeof d !== "object") return;
    var ph = (d.phases || []).filter(function (p) { return p && p.label && p.messages && p.messages.filter(Boolean).length; });
    if (ph.length) {
      MESSAGES = {}; PHASES = [];
      ph.forEach(function (p) { var l = String(p.label); PHASES.push(l); MESSAGES[l] = p.messages.filter(Boolean).map(String); });
    }
    if (d.unwrapping && d.unwrapping.text) UNWRAP = { label: String(d.unwrapping.label || UNWRAP.label), text: String(d.unwrapping.text) };
    if (+d.typeSpeedMs >= 5 && +d.typeSpeedMs <= 400) TYPE_MS = +d.typeSpeedMs;
    if (+d.holdSeconds >= 1 && +d.holdSeconds <= 60) HOLD_MS = +d.holdSeconds * 1000;
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function show(label, text, done) {
    if (!statusEl) return;
    clearInterval(typing);
    var head = '<span class="xr-phase">' + label + '</span> &middot; ';
    if (reduce) { statusEl.innerHTML = head + escapeHtml(text); if (done) setTimeout(done, 6000); return; }
    var i = 0;
    typing = setInterval(function () {
      i++;
      statusEl.innerHTML = head + escapeHtml(text.slice(0, i)) + '<span class="xr-caret"></span>';
      if (i >= text.length) { clearInterval(typing); if (done) setTimeout(done, HOLD_MS); }
    }, TYPE_MS);
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function nextStatus() {
    if (egg) return;
    if (!running() && !reduce) { setTimeout(nextStatus, 1500); return; }
    phase = phase % PHASES.length;
    var label = PHASES[phase]; phase = (phase + 1) % PHASES.length;
    show(label, pick(MESSAGES[label]), nextStatus);
  }
  var started = false;
  function startStatus() { if (!started) { started = true; nextStatus(); } }
  try {
    var textUrl = SCRIPT_URL.replace(/js\/xalreth\.js.*$/, "") + "data/hero-text.json";
    fetch(textUrl, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(applyHeroText).catch(function () {}).then(startStatus);
  } catch (e) {}
  setTimeout(startStatus, 1500);

  /* ------------------------------------------------------------ the hidden easter egg */
  var logo = hero.querySelector(".xr-logo"), clicks = [];
  function pulseOnce() {
    hero.classList.remove("xr-surge"); void hero.offsetWidth; hero.classList.add("xr-surge");
    surge = 1; burst(2); if (three && !three.dead) three.surge(1);
  }
  function unwrap() {
    if (egg) return;
    egg = true; surge = 2; burst(6); if (three && !three.dead) three.unwrap();
    hero.classList.add("xr-unwrapped");
    for (var k = 0; k < 3; k++) {          // he wrapped the world three times
      var ring = document.createElement("span"); ring.className = "xr-unwrap";
      ring.style.animationDelay = (k * 0.35) + "s";
      hero.querySelector(".xr-stage").appendChild(ring);
      setTimeout(function (el) { return function () { el.remove(); }; }(ring), 2600 + k * 350);
    }
    show(UNWRAP.label, UNWRAP.text, function () {
      hero.classList.remove("xr-unwrapped"); egg = false; nextStatus();
    });
    try { console.log("%cHold light. And let go well.", "color:#b98cff;font:16px serif"); } catch (e) {}
  }
  if (logo) logo.addEventListener("click", function () {
    var now = Date.now();
    clicks = clicks.filter(function (t) { return now - t < 1600; }); clicks.push(now);
    if (clicks.length >= 3) { clicks = []; unwrap(); } else pulseOnce();
  });
  var typed = "";
  document.addEventListener("keydown", function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (!e.key || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    if (typed.slice(-10) === "hold light") { typed = ""; unwrap(); }
  });

  /* ------------------------------------------------------------ pause when unseen, or when asked */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; syncMotion(); }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { pageShown = !document.hidden; syncMotion(); });
  var motionBtn = hero.querySelector(".xr-motion");
  function labelMotion() {
    if (!motionBtn) return;
    motionBtn.setAttribute("aria-pressed", userPaused ? "true" : "false");
    motionBtn.textContent = userPaused ? "Resume motion" : "Pause motion";
  }
  if (motionBtn) {
    if (reduce) motionBtn.hidden = true;
    motionBtn.addEventListener("click", function () {
      userPaused = !userPaused;
      try { localStorage.setItem("xr-motion", userPaused ? "paused" : "on"); } catch (e) {}
      labelMotion(); syncMotion();
    });
    labelMotion();
  }
  syncMotion();

  /* ------------------------------------------------------------ the WebGL layer (Three.js) */
  var glCanvas = hero.querySelector(".xr-webgl");
  function webglOK() {
    try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); }
    catch (e) { return false; }
  }
  if (glCanvas && !reduce && webglOK()) {
    var load = function () {
      import(new URL("xalreth-three.js", SCRIPT_URL).href).then(function (mod) {
        three = mod.start(hero, glCanvas);
        if (three) { hero.classList.add("xr-gl"); syncMotion(); }
      }).catch(function (e) { try { console.warn("Xal'Reth WebGL layer unavailable:", e); } catch (x) {} });
    };
    if (document.readyState === "complete") load(); else window.addEventListener("load", load);
  }
})();
