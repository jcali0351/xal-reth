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
    var mo = document.createElement("script"); mo.src = base + "js/motion.js?v=20261107b"; document.head.appendChild(mo);
  }
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
      "background:#120a20;color:#e0c4ff;border:1px solid #8a4dff;font:600 12px Cinzel,Georgia,serif;letter-spacing:.12em;" +
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
// dropdown, and a one-time fade-in of the menu on the first page of a visit. Styles: "THE GLOWING MENU" in style.css.
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
  try {
    if (!sessionStorage.getItem("xr-nav-in")) {
      sessionStorage.setItem("xr-nav-in", "1");
      document.documentElement.classList.add("nav-intro");
      setTimeout(() => document.documentElement.classList.remove("nav-intro"), 2200);
    }
  } catch (e) {}

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
  items.forEach((li) => {
    li.addEventListener("pointerenter", () => place(li));
    li.addEventListener("focusin", () => place(li));
  });
  top.addEventListener("pointerleave", rest);
  nav.addEventListener("focusout", (e) => { if (!nav.contains(e.relatedTarget)) rest(); });
  window.addEventListener("resize", rest);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
  rest();
  requestAnimationFrame(() => requestAnimationFrame(() => glow.classList.add("ready")));
})();
