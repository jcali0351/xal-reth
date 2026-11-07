/* ==========================================================
   THE COIL OF XAL'RETH — sanctum scripts
   ========================================================== */

// The Seeking Glass (site-wide search) and Vessk (chat): load their styles and scripts on every page that loads site.js.
(function () {
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/site\.js(\?.*)?$/, "") : "";
  window.COIL_BASE = base;
  var v = "?v=20261106h"; // bump when search or chat change, so visitors get the new copy at once
  if (!document.querySelector('link[href*="css/search.css"]')) {
    var l = document.createElement("link"); l.rel = "stylesheet"; l.href = base + "css/search.css" + v; document.head.appendChild(l);
  }
  if (!document.querySelector('script[src*="js/search.js"]')) {
    var sc = document.createElement("script"); sc.src = base + "js/search.js" + v; sc.defer = true; document.head.appendChild(sc);
  }
  // Vessk, the AI herald (chat): css/chat.css + js/chat.js
  if (!document.querySelector('link[href*="css/chat.css"]')) {
    var lc = document.createElement("link"); lc.rel = "stylesheet"; lc.href = base + "css/chat.css" + v; document.head.appendChild(lc);
  }
  if (!document.querySelector('script[src*="js/chat.js"]')) {
    var cs = document.createElement("script"); cs.src = base + "js/chat.js" + v; cs.defer = true; document.head.appendChild(cs);
  }
  // The Coil in motion: scroll entrances and parallax (js/motion.js; its styles are at the end of style.css)
  if (!document.querySelector('script[src*="js/motion.js"]')) {
    var mo = document.createElement("script"); mo.src = base + "js/motion.js?v=20261107c"; document.head.appendChild(mo);
  }
})();

// The guild frame on every page: the gold filigree bar with the crest crowns the main content under each page's title
// (the first .wrap in <main>; THE GUILD FRAME in style.css). Pages that already place their own frames (homepage, Guild
// Bank, Roster, Deeds, Ranks) and noindex admin pages are left as they are. Added here, not in the HTML, so the Sanctum
// Editor never saves it into a page and newly generated pages get it too.
(function () {
  if (document.querySelector(".crowned") || document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  var main = document.querySelector("main");
  var box = main && main.querySelector(":scope > .wrap, :scope > .altar-page");
  if (!box) return;
  var f = document.createElement("div");
  f.className = "gframe"; f.setAttribute("aria-hidden", "true");
  f.innerHTML = '<span class="gf-crest"></span>';
  box.classList.add("crowned");
  box.insertBefore(f, box.firstChild);
})();

// Sanctum Editor: when you're signed in to admin.html on this device, every page gets an "Edit this page" button.
(function () {
  var t = "";
  try { t = sessionStorage.getItem("xr-cms-token") || localStorage.getItem("xr-cms-token") || ""; } catch (e) {}
  if (!t || /admin\.html$/.test(location.pathname)) return;
  function add() {
    var file = location.pathname.split("/").pop() || "index.html";
    if (!/\.html$/.test(file)) file += ".html";
    var a = document.createElement("a");
    a.href = (window.COIL_BASE || "") + "admin.html#edit=" + encodeURIComponent(file);
    a.textContent = "\u270E Edit this page";
    a.setAttribute("style", "position:fixed;left:16px;bottom:16px;z-index:9998;padding:10px 16px;border-radius:999px;" +
      "background:#120a20;color:#e0c4ff;border:1px solid #8a4dff;font:700 12px Lato,Arial,sans-serif;letter-spacing:.12em;" +
      "text-transform:uppercase;text-decoration:none;box-shadow:0 0 22px rgba(138,77,255,.45)");
    document.body.appendChild(a);
  }
  if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
})();

// Where the addon downloads live. Each addon's .zip is attached to a
// GitHub Release in this repo. Set `ready: true` once its zip is uploaded.
const COIL = {
  repo: "jcali0351/xal-reth",
  addons: {
    "XalRethRP":          { ready: false },
    "XalRethTheAccuser":  { ready: false },
    "DisciplesOfDevotion":{ ready: false },
    "GuildSocial":        { ready: false },
    "BrainRotterPro":     { ready: false },
    "NemesisPro":         { ready: false },
    "CoilVoice":          { ready: false },
    "CoilServant":        { ready: false }
  }
};

// Verses for the Oracle come from verses.js (generated from the scripture page).
const VERSES = window.VERSES || [["The Book of Shedding 1:1", "In the beginning there was the Coil, and the Coil was tight, and it was good."]];

(function () {
  // Mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Oracle: random verse
  const oracle = document.querySelector("[data-oracle]");
  if (oracle) {
    const q = oracle.querySelector("blockquote");
    const c = oracle.querySelector("cite");
    const btn = oracle.querySelector("button, .btn");
    let last = -1;
    const draw = () => {
      let i;
      do { i = Math.floor(Math.random() * VERSES.length); } while (i === last && VERSES.length > 1);
      last = i;
      q.textContent = "“" + VERSES[i][1] + "”";
      c.textContent = VERSES[i][0];
    };
    draw();
    if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); draw(); });
  }

  // Addon download buttons
  document.querySelectorAll("[data-addon]").forEach((el) => {
    const name = el.getAttribute("data-addon");
    const info = COIL.addons[name];
    if (info && info.ready) {
      el.href = `https://github.com/${COIL.repo}/releases/latest/download/${name}.zip`;
      el.textContent = "Download";
    } else {
      el.removeAttribute("href");
      el.classList.add("ghost");
      el.setAttribute("aria-disabled", "true");
      el.textContent = "Being Consecrated";
      el.title = "This addon has not been uploaded yet.";
    }
  });

  // Year in footer
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();

// Dazzle: drifting void sparks around the portrait of Xal'Reth the Eternal
(function () {
  const c = document.querySelector(".portal canvas");
  if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = c.getContext("2d");
  let w, h, dpr, parts = [];
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = () => ({
    x: Math.random() * w, y: h * (0.3 + Math.random() * 0.75),
    r: 0.6 + Math.random() * 2.2, vy: -(0.15 + Math.random() * 0.55), vx: (Math.random() - 0.5) * 0.25,
    life: 0, max: 220 + Math.random() * 260, hue: 262 + Math.random() * 30, star: Math.random() < 0.18
  });
  resize(); window.addEventListener("resize", resize);
  for (let i = 0; i < 70; i++) { const p = spawn(); p.life = Math.random() * p.max; parts.push(p); }
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      p.life++; p.x += p.vx; p.y += p.vy;
      const t = p.life / p.max, a = Math.sin(Math.PI * t) * 0.9;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.hue},100%,92%,${a})`);
      g.addColorStop(0.4, `hsla(${p.hue},100%,70%,${a * 0.5})`);
      g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      if (p.star && a > 0.4) {
        ctx.strokeStyle = `hsla(${p.hue},100%,90%,${a * 0.7})`; ctx.lineWidth = 0.8;
        const s = p.r * 7 * a;
        ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s); ctx.stroke();
      }
      if (p.life >= p.max) Object.assign(p, spawn());
    }
    requestAnimationFrame(tick);
  };
  tick();
})();

// Litany warning gate
document.querySelectorAll("[data-reveal]").forEach((b) => {
  b.addEventListener("click", () => {
    const el = document.getElementById(b.getAttribute("data-reveal"));
    if (el) { el.hidden = false; el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});

// About submenu: click or tap to open, Escape or a click elsewhere to close; hover also opens it on wide screens (CSS).
(function () {
  const subs = document.querySelectorAll(".site-nav .has-sub");
  if (!subs.length) return;
  const closeAll = (except) => subs.forEach((li) => {
    if (li === except) return;
    li.classList.remove("open");
    const b = li.querySelector(".sub-toggle"); if (b) b.setAttribute("aria-expanded", "false");
  });
  subs.forEach((li) => {
    const btn = li.querySelector(".sub-toggle");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !li.classList.contains("open");
      closeAll(li);
      li.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && li.classList.contains("open")) { closeAll(); btn.focus(); }
    });
    li.addEventListener("focusout", (e) => { if (!li.contains(e.relatedTarget)) { li.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".site-nav .has-sub")) closeAll(); });
})();

// Menu FX: the gliding light behind the menu, stagger order for the fly-out items, the cursor spotlight in each
// dropdown, and the glass menu's entrance on every page load. Styles: "THE GLOWING MENU" and "THE FROSTED GLASS MENU" in style.css.
(function () {
  const nav = document.querySelector(".site-nav");
  const top = nav && nav.querySelector(":scope > ul");
  if (!top) return;
  Array.from(top.children).forEach((li, i) => li.style.setProperty("--i", i));
  nav.querySelectorAll("ul.sub").forEach((ul) => {
    Array.from(ul.children).forEach((li, i) => li.style.setProperty("--i", i));
    ul.addEventListener("pointermove", (e) => {
      const r = ul.getBoundingClientRect();
      ul.style.setProperty("--mx", (e.clientX - r.left) + "px"); ul.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
    ul.addEventListener("pointerleave", () => { ul.style.removeProperty("--mx"); ul.style.removeProperty("--my"); });
  });
  // on every page load the glass menu condenses, flashes and glows in (styles: "THE FROSTED GLASS MENU")
  document.documentElement.classList.add("nav-intro");
  setTimeout(() => document.documentElement.classList.remove("nav-intro"), 2600);

  const glow = document.createElement("li");
  glow.className = "nav-glow"; glow.setAttribute("aria-hidden", "true"); glow.setAttribute("role", "presentation");
  top.appendChild(glow);
  const wide = window.matchMedia("(min-width: 861px)");
  const items = Array.from(top.children).filter((li) => li !== glow);
  function place(li) {
    if (!wide.matches || !li) { glow.style.opacity = "0"; return; }
    const r = li.getBoundingClientRect(), p = top.getBoundingClientRect();
    glow.style.width = r.width + "px"; glow.style.transform = "translateX(" + (r.left - p.left) + "px)"; glow.style.opacity = "1";
  }
  function rest() {
    const cur = items.find((li) => li.querySelector(':scope > a[aria-current="page"], :scope > .sub-toggle.current'));
    place(cur || null);
  }
  // star sprites that burst from the bright block on hover and focus ("THE BRIGHT BLOCK MENU" in style.css)
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SPARK = ["#ffffff", "#f3e8ff", "#e0c4ff", "#c9a2ff", "#ffe9b0"];
  function spark(host, n, spread) {
    if (calm.matches || !wide.matches || !host) return;
    const w = host.offsetWidth, h = host.offsetHeight;
    for (let k = 0; k < n; k++) {
      const s = document.createElement(host === glow ? "i" : "span");
      s.className = "nav-spark" + (Math.random() < .3 ? " dot" : ""); s.setAttribute("aria-hidden", "true");
      const edge = Math.random() < .55;   // most hug the block's edges, a few land inside it
      const x = edge ? (Math.random() < .5 ? -spread * Math.random() : w + spread * Math.random()) : Math.random() * w;
      const y = edge ? Math.random() * h : (Math.random() < .5 ? -spread * .6 * Math.random() : h + spread * .6 * Math.random());
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.setProperty("--s", (.45 + Math.random() * .95).toFixed(2));
      s.style.setProperty("--dx", ((x < w / 2 ? -1 : 1) * (6 + Math.random() * 16)).toFixed(1) + "px");
      s.style.setProperty("--dy", ((Math.random() - .5) * 26).toFixed(1) + "px");
      s.style.setProperty("--t", (.65 + Math.random() * .6).toFixed(2) + "s");
      s.style.setProperty("--c", SPARK[(Math.random() * SPARK.length) | 0]);
      s.style.animationDelay = (Math.random() * .18).toFixed(2) + "s";
      s.addEventListener("animationend", () => s.remove());
      host.appendChild(s);
    }
  }
  let dazzle = null;
  function startDazzle() {
    clearInterval(dazzle);
    // let the block glide into place, then keep it sparkling while the pointer stays
    setTimeout(() => spark(glow, 9, 14), 140);
    dazzle = setInterval(() => { if (glow.childElementCount < 26) spark(glow, 2, 14); }, 170);
  }
  function stopDazzle() { clearInterval(dazzle); dazzle = null; }
  items.forEach((li) => {
    li.addEventListener("pointerenter", () => { place(li); startDazzle(); });
    li.addEventListener("focusin", () => { place(li); setTimeout(() => spark(glow, 8, 12), 140); });
  });
  top.addEventListener("pointerleave", () => { stopDazzle(); rest(); });
  nav.querySelectorAll("ul.sub a").forEach((a) => {
    a.addEventListener("pointerenter", () => spark(a, 5, 8));
    a.addEventListener("focus", () => spark(a, 4, 8));
  });
  nav.addEventListener("focusout", (e) => { if (!nav.contains(e.relatedTarget)) rest(); });
  window.addEventListener("resize", rest);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
  rest();
  // the menu's entrance stretches it for a moment, so measure again once it has settled (unless the pointer is on it)
  [1100, 2700].forEach((ms) => setTimeout(() => { if (!top.matches(":hover")) rest(); }, ms));
  requestAnimationFrame(() => requestAnimationFrame(() => glow.classList.add("ready")));
})();
