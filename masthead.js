/* Animated mastheads: a unique animation for the header of every page. */
(function () {
  const head = document.querySelector(".page-head, .hero"); if (!head || document.querySelector(".summon")) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const file = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  const key = file.startsWith("post-") ? "post" : file;

  const ring = (r, cls, extra) => `<circle cx="200" cy="200" r="${r}" class="${cls || "l"}" ${extra || ""}/>`;
  const poly = (pts, cls) => `<polygon points="${pts}" class="${cls || "l"}"/>`;
  const spokes = (n, r1, r2, cls) => Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n; return `<line x1="${200 + r1 * Math.cos(a)}" y1="${200 + r1 * Math.sin(a)}" x2="${200 + r2 * Math.cos(a)}" y2="${200 + r2 * Math.sin(a)}" class="${cls || "l"}"/>`; }).join("");
  const runes = "ᚷᛉᛟᚦᛞᚱᛜᛇᚹᛗᛒᚾᛃᛋᛏᚨᛚᚲᛈᛖ";
  const runeText = (r, size) => `<defs><path id="mhrp${r}" d="M200,200 m-${r},0 a${r},${r} 0 1,1 ${2 * r},0 a${r},${r} 0 1,1 -${2 * r},0"/></defs><text class="rune" style="font-size:${size}px"><textPath href="#mhrp${r}">${(runes + runes).split("").join(" ")}</textPath></text>`;
  const spiral = (turns, rMax) => { let d = "M200 200"; for (let t = 0; t <= turns * 64; t++) { const a = t / 64 * 2 * Math.PI, r = rMax * t / (turns * 64); d += ` L${(200 + r * Math.cos(a)).toFixed(1)} ${(200 + r * Math.sin(a)).toFixed(1)}`; } return d; };
  const petals = (n, r) => Array.from({ length: n }, (_, i) => `<ellipse cx="200" cy="${200 - r}" rx="${r * 0.28}" ry="${r * 0.62}" transform="rotate(${i * 360 / n} 200 200)" class="l"/>`).join("");

  // Each theme: SVG layers [markup, animation class], particle mode, hue
  const T = {
    index:     { hue: 270, mode: "rise", layers: [[ring(185, "l d") + runeText(165, 15), "spin-slow"], [spokes(24, 120, 150), "spin-rev"]] },
    lore:      { hue: 280, mode: "rise", layers: [[`<circle cx="200" cy="200" r="150" class="serp"/><path d="M350 200 l18 -10 l-6 10 l6 10z" class="fill"/>`, "spin"], [ring(120, "l d") + ring(178, "l thin"), "spin-rev"]] },
    canon:     { hue: 265, mode: "orbit", layers: [[ring(160) + ring(60) + spokes(8, 60, 160) + ring(20, "fill"), "spin-slow"], [petals(8, 120), "spin-rev pulse"]] },
    legends:   { hue: 225, mode: "stars", layers: [[poly("200,30 220,180 370,200 220,220 200,370 180,220 30,200 180,180") + ring(110, "l thin"), "spin-slow pulse"]] },
    library:   { hue: 40, mode: "fall-runes", layers: [[`<path d="M200 300 C160 270 90 270 50 290 L50 120 C90 100 160 100 200 130 C240 100 310 100 350 120 L350 290 C310 270 240 270 200 300 Z M200 130 L200 300" class="l"/>` + spokes(16, 170, 195, "l thin"), "pulse"], [`<path d="M200 130 C240 100 300 100 340 118 L340 280 C300 264 240 266 200 296 Z" class="page"/>`, "flip"]] },
    news:      { hue: 290, mode: "pings", layers: [[ring(60, "l thin") + ring(110, "l thin") + ring(160, "l thin") + ring(190, "l") + spokes(4, 0, 190, "l thin"), ""], [`<path d="M200 200 L200 10 A190 190 0 0 1 334 66 Z" class="sweep"/>`, "spin"]] },
    blog:      { hue: 255, mode: "fireflies", layers: [[`<circle cx="200" cy="200" r="70" class="moon"/><circle cx="232" cy="185" r="66" class="shadow"/>`, "moonphase"], [ring(150, "l thin") + `<circle cx="350" cy="200" r="7" class="fill"/>`, "spin"]] },
    addons:    { hue: 200, mode: "orbit", layers: [[gear(16, 170, 145), "spin-slow"], [gear(10, 95, 75), "spin-rev-fast"]] },
    devotion:  { hue: 45, mode: "rise", layers: [[ring(120, "l") + ring(150, "l thin") + ring(180, "l d"), "pulse"], [spokes(36, 190, 210, "l thin"), "spin-slow"]] },
    join:      { hue: 275, mode: "converge", layers: [[`<path d="M130 340 L130 170 Q200 70 270 170 L270 340" class="l thick"/><path d="M150 340 L150 175 Q200 100 250 175 L250 340 Z" class="door"/>`, "pulse"], [spokes(20, 120, 200, "l thin"), "spin-slow"]] },
    teachings: { hue: 190, mode: "ripples", layers: [[`<circle cx="200" cy="200" r="130" class="l"/><path d="M200 70 A65 65 0 0 1 200 200 A65 65 0 0 0 200 330 A130 130 0 0 1 200 70 Z" class="fill-soft"/><circle cx="200" cy="135" r="14" class="fill"/><circle cx="200" cy="265" r="14" class="l"/>`, "spin-slow"]] },
    rites:     { hue: 20, mode: "smoke", layers: [[ring(170) + poly("200,50 330,275 70,275") + ring(80, "l d"), "spin-slow"], [`<circle cx="200" cy="50" r="9" class="flame"/><circle cx="330" cy="275" r="9" class="flame"/><circle cx="70" cy="275" r="9" class="flame"/>`, "flicker"]] },
    priesthood:{ hue: 300, mode: "converge", layers: [[poly("200,40 360,320 40,320") + `<path d="M120 215 Q200 150 280 215 Q200 280 120 215 Z" class="l"/><circle cx="200" cy="215" r="24" class="fill"/>`, "pulse"], [spokes(32, 200, 230, "l thin"), "spin-slow"]] },
    codex:     { hue: 150, mode: "fall-runes", layers: [[`<rect x="80" y="80" width="240" height="240" class="l"/><rect x="80" y="80" width="240" height="240" class="l" transform="rotate(45 200 200)"/>` + ring(90, "l d"), "spin-slow"], [runeText(130, 18), "spin-rev"]] },
    scripture: { hue: 260, mode: "stars", layers: [[ring(60, "l d") + ring(100, "l thin") + ring(140, "l d") + ring(180, "l thin"), "spin-slow"], [runeText(160, 13), "spin-rev"]] },
    triangle:  { hue: 270, mode: "orbit", layers: [[poly("200,30 347,285 53,285"), "spin-slow"], [poly("200,370 53,115 347,115", "l gold"), "spin-rev"], [`<circle cx="200" cy="30" r="12" class="orb v"/><circle cx="347" cy="285" r="12" class="orb e"/><circle cx="53" cy="285" r="12" class="orb w"/>`, "spin-slow"]] },
    begging:   { hue: 45, mode: "coins", layers: [[`<path d="M80 250 Q200 360 320 250 Z" class="bowl"/><ellipse cx="200" cy="250" rx="120" ry="16" class="l gold"/>`, "pulse"]] },
    litany:    { hue: 250, mode: "drone", layers: [[`<path d="${spiral(7, 190)}" class="l thin"/>`, "spin-drone"], [ring(195, "l d"), "spin-rev"]] },
    "addon-vyrenna-rp": { hue: 145, mode: "fireflies", layers: [[`<circle cx="200" cy="200" r="70" class="moon"/><circle cx="232" cy="185" r="66" class="shadow"/>` + ring(150, "l thin"), "pulse"], [ring(185, "l d") + spokes(12, 160, 172, "l gold"), "spin-slow"]] },
    ranks:     { hue: 275, mode: "rise", layers: [[poly("200,40 339,280 61,280") + poly("200,360 61,120 339,120", "l gold"), "spin-slow"], [`<path d="M110 250 L200 200 L290 250 L290 270 L200 220 L110 270 Z" class="l"/><path d="M110 210 L200 160 L290 210 L290 230 L200 180 L110 230 Z" class="l"/>` + ring(185, "l d"), "pulse"]] },
    "guild-bank": { hue: 45, mode: "coins", layers: [[ring(185, "l gold") + ring(150, "l d") + spokes(12, 150, 185, "l gold"), "spin-slow"], [ring(70, "l") + spokes(6, 0, 70, "l thin") + ring(18, "fill"), "spin-rev"]] },
    "guild-roster": { hue: 270, mode: "stars", layers: [[ring(185, "l d") + runeText(165, 13), "spin-slow"], [spokes(36, 150, 162, "l thin"), "spin-rev"]] },
    "404":     { hue: 280, mode: "fireflies", layers: [[`<circle cx="200" cy="200" r="150" class="l broken"/>`, "spin-slow"]] },
    post:      { hue: 275, mode: "fireflies", layers: [[`<path d="M0 200 C50 140 100 140 150 200 S250 260 300 200 S400 140 450 200" class="serp wave"/>`, "slither"], [ring(170, "l thin d"), "spin-slow"]] }
  };
  function gear(teeth, ro, ri) {
    let d = ""; for (let i = 0; i < teeth * 2; i++) { const a0 = i * Math.PI / teeth, a1 = (i + 1) * Math.PI / teeth, r = i % 2 ? ri : ro;
      d += (i ? " L" : "M") + `${(200 + r * Math.cos(a0)).toFixed(1)} ${(200 + r * Math.sin(a0)).toFixed(1)} L${(200 + r * Math.cos(a1)).toFixed(1)} ${(200 + r * Math.sin(a1)).toFixed(1)}`; }
    return `<path d="${d} Z" class="l"/><circle cx="200" cy="200" r="${ri * 0.45}" class="l d"/>`;
  }
  const th = T[key] || T.post;

  const fx = document.createElement("div"); fx.className = "mh-fx mh-" + key; fx.setAttribute("aria-hidden", "true"); fx.style.setProperty("--h", th.hue);
  fx.innerHTML = '<canvas></canvas><div class="mh-glow"></div><div class="mh-art">' + th.layers.map(([m, c]) => `<svg viewBox="0 0 400 400" class="mh-layer ${c}" preserveAspectRatio="xMidYMid meet">${m}</svg>`).join("") + "</div>";
  head.classList.add("mh"); head.insertBefore(fx, head.firstChild);

  // Particles
  const c = fx.querySelector("canvas"), ctx = c.getContext("2d"); let w = 0, h = 0, P = [], t = 0;
  const R = Math.random, H = th.hue;
  function size() { const d = Math.min(devicePixelRatio || 1, 2); w = fx.clientWidth; h = fx.clientHeight; c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  function make(init) {
    const m = th.mode, p = { x: R() * w, y: R() * h, vx: 0, vy: 0, r: 0.8 + R() * 2.2, life: 0, max: 200 + R() * 300, hue: H + (R() - .5) * 40 };
    if (m === "rise" || m === "smoke") { p.y = init ? R() * h : h + 10; p.vy = -(.25 + R() * .7); p.vx = (R() - .5) * .3; if (m === "smoke") { p.r = 8 + R() * 18; p.x = w / 2 + (R() - .5) * w * .5; } }
    else if (m === "fall-runes" || m === "drone") { p.y = init ? R() * h : -20; p.vy = m === "drone" ? .15 + R() * .2 : .4 + R() * .8; p.ch = runes[Math.floor(R() * runes.length)]; p.size = 10 + R() * 14; p.max = 9999; }
    else if (m === "coins") { p.y = init ? R() * h * .6 : -20; p.x = w / 2 + (R() - .5) * 200; p.vy = .8 + R() * 1.4; p.spin = R() * 6; p.max = 9999; p.hue = 45; }
    else if (m === "orbit") { p.a = R() * 6.28; p.rad = 60 + R() * Math.min(w, h * 2) * .45; p.sp = (.002 + R() * .006) * (R() < .5 ? 1 : -1); }
    else if (m === "converge") { const a = R() * 6.28, d = Math.max(w, h) * .6; p.x = w / 2 + Math.cos(a) * d; p.y = h / 2 + Math.sin(a) * d; p.max = 9999; }
    else if (m === "ripples" || m === "pings") { p.rr = 0; p.max = 160 + R() * 120; if (m === "pings") { const a = R() * 6.28, d = R() * Math.min(w, h) * .45; p.x = w / 2 + Math.cos(a) * d; p.y = h / 2 + Math.sin(a) * d; p.max = 120; } }
    else { p.vx = (R() - .5) * .5; p.vy = (R() - .5) * .5; } // fireflies, stars
    if (init) p.life = R() * Math.min(p.max, 400);
    return p;
  }
  const counts = { rise: 90, smoke: 26, "fall-runes": 46, drone: 30, coins: 18, orbit: 110, converge: 80, ripples: 7, pings: 9, fireflies: 60, stars: 70 };
  size(); addEventListener("resize", size);
  for (let i = 0; i < (counts[th.mode] || 60) * (w < 600 ? .6 : 1); i++) P.push(make(true));
  const glow = (x, y, r, hue, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, `hsla(${hue},100%,90%,${a})`); g.addColorStop(.4, `hsla(${hue},100%,65%,${a * .45})`); g.addColorStop(1, `hsla(${hue},100%,50%,0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, 6.283); ctx.fill(); };
  function frame() {
    t++; ctx.clearRect(0, 0, w, h); const m = th.mode;
    if (m === "stars") { // constellation lines
      ctx.lineWidth = .6;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d = dx * dx + dy * dy; if (d < 9000) { ctx.strokeStyle = `hsla(${H},90%,80%,${.35 * (1 - d / 9000)})`; ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke(); } }
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < P.length; i++) {
      const p = P[i]; p.life++; const k = p.life / p.max, fade = p.max > 5000 ? 1 : Math.sin(Math.PI * Math.min(k, 1));
      if (m === "orbit") { p.a += p.sp; p.x = w / 2 + Math.cos(p.a) * p.rad; p.y = h / 2 + Math.sin(p.a) * p.rad * .45; glow(p.x, p.y, p.r, p.hue, .7 * fade); }
      else if (m === "converge") { p.x += (w / 2 - p.x) * .012; p.y += (h / 2 - p.y) * .012; const d = Math.hypot(w / 2 - p.x, h / 2 - p.y); glow(p.x, p.y, p.r, p.hue, Math.min(1, d / 60) * .8); if (d < 6) P[i] = make(false); continue; }
      else if (m === "ripples" || m === "pings") { p.rr += m === "pings" ? .5 : .7; const a = (1 - k) * (m === "pings" ? .9 : .5); ctx.strokeStyle = `hsla(${p.hue},100%,75%,${a})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rr, p.rr * (m === "ripples" ? .4 : 1), 0, 0, 6.283); ctx.stroke(); if (m === "pings") glow(p.x, p.y, 2, p.hue, a); }
      else if (m === "fall-runes" || m === "drone") { p.y += p.vy; ctx.font = `${p.size}px serif`; ctx.fillStyle = `hsla(${p.hue},90%,75%,${(m === "drone" ? .3 : .55) * (.5 + .5 * Math.sin(t * .03 + i))})`; ctx.fillText(p.ch, p.x, p.y); if (p.y > h + 20) P[i] = make(false); continue; }
      else if (m === "coins") { p.y += p.vy; p.spin += .08; const sx = Math.abs(Math.cos(p.spin)) * 7 + 1; ctx.fillStyle = `hsla(45,100%,${60 + 20 * Math.cos(p.spin)}%,.9)`; ctx.beginPath(); ctx.ellipse(p.x, p.y, sx, 7, 0, 0, 6.283); ctx.fill(); glow(p.x, p.y, 3, 45, .35); if (p.y > h * .72) { P[i] = make(false); for (let s = 0; s < 3; s++) P.push({ x: p.x, y: h * .72, vx: (R() - .5) * 2, vy: -R() * 2, r: 1, life: 0, max: 40, hue: 45, spark: 1 }); } continue; }
      else { p.x += p.vx; p.y += p.vy; if (m === "fireflies" || m === "stars") { p.vx += (R() - .5) * .04; p.vy += (R() - .5) * .04; p.vx *= .98; p.vy *= .98; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
        if (m === "smoke") { p.r += .05; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `hsla(${p.hue},60%,60%,${.08 * fade})`); g.addColorStop(1, `hsla(${p.hue},60%,40%,0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
        else glow(p.x, p.y, p.r, p.hue, (m === "fireflies" ? (.4 + .4 * Math.sin(t * .05 + i)) : .8) * fade); }
      if (p.spark) { p.x += p.vx; p.y += p.vy; p.vy += .08; glow(p.x, p.y, 1.2, 45, 1 - k); }
      if (p.life >= p.max) { if (p.spark) { P.splice(i, 1); i--; } else P[i] = make(false); }
    }
    ctx.globalCompositeOperation = "source-over";
    if (!reduce && !document.hidden) requestAnimationFrame(frame); else if (!reduce) setTimeout(frame, 500);
  }
  frame();
  if (!reduce) head.addEventListener("pointermove", (e) => { const r = head.getBoundingClientRect(); fx.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5) * 16 + "px"); fx.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5) * 10 + "px"); });
})();
