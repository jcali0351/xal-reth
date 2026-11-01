/* Merch page: the Summoning. Sparks, a starfield, cursor parallax and staggered letters. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Staggered shimmering letters
  document.querySelectorAll("[data-letters]").forEach((el) => {
    const t = el.textContent; el.textContent = ""; el.setAttribute("aria-label", t);
    [...t].forEach((ch, i) => {
      const s = document.createElement("span"); s.textContent = ch === " " ? " " : ch;
      s.setAttribute("aria-hidden", "true"); s.style.animationDelay = (i * 0.07) + "s"; el.appendChild(s);
    });
  });
  const stage = document.querySelector(".summon"); if (!stage) return;
  const c = stage.querySelector("canvas"); const ctx = c.getContext("2d");
  let w, h, dpr, parts = [], stars = [];
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(w * h / 2600) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28 }));
  }
  const spawn = (burst) => {
    const a = Math.random() * Math.PI * 2, rad = burst ? 20 : Math.min(w, h) * (0.18 + Math.random() * 0.3);
    return { x: w / 2 + Math.cos(a) * rad, y: h / 2 + Math.sin(a) * rad, vx: (Math.random() - .5) * (burst ? 4 : .4), vy: burst ? (Math.random() - .5) * 4 : -(.2 + Math.random() * .8),
      r: .6 + Math.random() * 2.4, life: 0, max: 160 + Math.random() * 260, hue: 255 + Math.random() * 50, star: Math.random() < .2 };
  };
  size(); window.addEventListener("resize", size);
  for (let i = 0; i < 140; i++) { const p = spawn(); p.life = Math.random() * p.max; parts.push(p); }
  let t = 0;
  function frame() {
    t += 1; ctx.clearRect(0, 0, w, h);
    for (const s of stars) { const a = .25 + .35 * Math.sin(t * .02 + s.p); ctx.fillStyle = `rgba(224,196,255,${a})`; ctx.fillRect(s.x, s.y, s.r, s.r); }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]; p.life++; p.x += p.vx; p.y += p.vy; p.vx *= .995;
      const k = p.life / p.max, a = Math.sin(Math.PI * k) * .95;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      g.addColorStop(0, `hsla(${p.hue},100%,92%,${a})`); g.addColorStop(.35, `hsla(${p.hue},100%,70%,${a * .5})`); g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 6.283); ctx.fill();
      if (p.star && a > .45) { const s = p.r * 9 * a; ctx.strokeStyle = `hsla(${p.hue},100%,92%,${a * .8})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s); ctx.stroke(); }
      if (p.life >= p.max) parts[i] = spawn(false);
    }
    ctx.globalCompositeOperation = "source-over";
    if (!reduce) requestAnimationFrame(frame);
  }
  frame();
  // Click / tap the portrait: a burst of sparks and a flash
  const portrait = stage.querySelector(".summon-portrait");
  portrait.addEventListener("click", () => {
    for (let i = 0; i < 90; i++) parts.push(spawn(true));
    if (parts.length > 500) parts.splice(0, parts.length - 500);
    stage.classList.remove("flash"); void stage.offsetWidth; stage.classList.add("flash");
  });
  // Cursor parallax
  if (!reduce) stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    stage.style.setProperty("--px", (x * 18).toFixed(1) + "px"); stage.style.setProperty("--py", (y * 18).toFixed(1) + "px");
  });
})();
