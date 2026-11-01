/* ==========================================================
   THE COIL OF XAL'RETH — sanctum scripts
   ========================================================== */

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
