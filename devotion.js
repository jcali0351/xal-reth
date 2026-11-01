/* Disciples of Devotion: the Verse Engine (identical to the addon's Engine.lua) and the page's live reader. */
(function () {
  const D = window.DOD; if (!D) return;
  const PER = 10000, P = 1000003, CH = 100;
  const cache = {};
  function pools(c) {
    if (cache[c]) return cache[c];
    const b = Math.floor((c - 1) / 10) + 1, pl = {};
    for (const k of Object.keys(D.G)) pl[k] = D.G[k].concat((D.B[b] && D.B[b][k]) || []);
    let t = D.chapters[c - 1].t; if (t.startsWith("The ")) t = "the" + t.slice(3);
    pl.focus = [t];
    const sizes = D.templates.map(tp => tp.s.reduce((n, s) => n * pl[s].length, 1));
    return (cache[c] = { pl, sizes });
  }
  function verse(c, v) {
    const ch = D.chapters[c - 1]; const k = ch.v.length;
    if (v <= k) return { text: ch.v[v - 1], canon: true };
    const i = v - k - 1, d = pools(c), nt = D.templates.length;
    const t = (i + c) % nt, tp = D.templates[t];
    let j = (Math.floor(i / nt) * P + c * 7919) % d.sizes[t];
    const vals = {};
    for (const s of tp.s) { const L = d.pl[s].length; vals[s] = d.pl[s][j % L]; j = Math.floor(j / L); }
    let text = tp.t.replace(/\{(\w+)\}/g, (m, n) => (n in vals ? vals[n] : m));
    return { text: text[0].toUpperCase() + text.slice(1), canon: false };
  }
  function votd(dateNum) {
    const x = ((dateNum % 100003) * 48271 + 12345) % 2147483647;
    return [(x % CH) + 1, (Math.floor(x / 100) % PER) + 1];
  }
  window.DoDEngine = { verse, votd };
  const clean = s => s.replace(/\{target\}/g, "faithful one");
  const icon = c => "img/dod/c" + String(c).padStart(3, "0") + ".png";
  const $ = s => document.querySelector(s);

  // Verse of the Day
  const now = new Date();
  const dn = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const [vc, vv] = votd(dn);
  const vd = $("#dod-votd");
  if (vd) {
    vd.querySelector(".ref").textContent = `Devotion ${vc}:${vv} · ${D.chapters[vc - 1].t}`;
    vd.querySelector("blockquote").textContent = "“" + clean(verse(vc, vv).text) + "”";
    vd.querySelector("img").src = icon(vc);
    vd.querySelector("code").textContent = `/dod read ${vc}:${vv}`;
  }

  // Reader
  const R = $("#dod-reader"); if (!R) return;
  let cur = { c: 1, v: 1 };
  const grid = R.querySelector(".dod-grid"), tabs = R.querySelector(".dod-tabs");
  let book = 1;
  function drawTabs() {
    tabs.innerHTML = "";
    D.books.forEach((name, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "dod-tab" + (book === i + 1 ? " on" : "");
      b.innerHTML = `<span>${["I","II","III","IV","V","VI","VII","VIII","IX","X"][i]}</span>${name.replace("The Book of ", "")}`;
      b.setAttribute("aria-pressed", book === i + 1);
      b.onclick = () => { book = i + 1; drawTabs(); drawGrid(); };
      tabs.appendChild(b);
    });
  }
  function drawGrid() {
    grid.innerHTML = "";
    for (let k = 1; k <= 10; k++) {
      const c = (book - 1) * 10 + k, ch = D.chapters[c - 1];
      const b = document.createElement("button");
      b.type = "button"; b.className = "dod-ch" + (cur.c === c ? " on" : "");
      b.innerHTML = `<img src="${icon(c)}" alt="" width="48" height="48" loading="lazy"><span class="n">${c}</span><span class="t">${ch.t}</span><span class="k">${ch.v.length} hand-written</span>`;
      b.onclick = () => { cur = { c, v: 1 }; show(); drawGrid(); };
      grid.appendChild(b);
    }
  }
  function show() {
    const ch = D.chapters[cur.c - 1], r = verse(cur.c, cur.v);
    R.querySelector(".dod-icon").src = icon(cur.c);
    R.querySelector(".dod-book").textContent = `Book ${["I","II","III","IV","V","VI","VII","VIII","IX","X"][ch.b - 1]} · ${D.books[ch.b - 1]}`;
    R.querySelector(".dod-title").textContent = `Chapter ${cur.c}: ${ch.t}`;
    R.querySelector(".dod-ref").textContent = `Devotion ${cur.c}:${cur.v}`;
    R.querySelector(".dod-kind").textContent = r.canon ? "Hand-written scripture" : "Verse Engine";
    R.querySelector(".dod-kind").className = "dod-kind " + (r.canon ? "canon" : "engine");
    R.querySelector(".dod-text").textContent = clean(r.text);
    R.querySelector(".dod-cmd").textContent = `/dod read ${cur.c}:${cur.v}`;
    R.querySelector("#dod-c").value = cur.c; R.querySelector("#dod-v").value = cur.v;
    const pct = (cur.v / PER) * 100; R.querySelector(".dod-bar span").style.width = pct + "%";
  }
  const step = n => { let { c, v } = cur; v += n; if (v > PER) { c = c % CH + 1; v = 1; } if (v < 1) { c = c === 1 ? CH : c - 1; v = PER; } cur = { c, v }; if (Math.ceil(c / 10) !== book) { book = Math.ceil(c / 10); drawTabs(); } show(); drawGrid(); };
  R.querySelector("[data-act=prev]").onclick = () => step(-1);
  R.querySelector("[data-act=next]").onclick = () => step(1);
  R.querySelector("[data-act=back10]").onclick = () => step(-100);
  R.querySelector("[data-act=fwd10]").onclick = () => step(100);
  R.querySelector("[data-act=random]").onclick = () => { cur = { c: 1 + Math.floor(Math.random() * CH), v: 1 + Math.floor(Math.random() * PER) }; book = Math.ceil(cur.c / 10); drawTabs(); show(); drawGrid(); };
  R.querySelector("[data-act=votd]").onclick = () => { cur = { c: vc, v: vv }; book = Math.ceil(vc / 10); drawTabs(); show(); drawGrid(); };
  R.querySelector("form").onsubmit = e => {
    e.preventDefault();
    const c = Math.min(CH, Math.max(1, parseInt(R.querySelector("#dod-c").value, 10) || 1));
    const v = Math.min(PER, Math.max(1, parseInt(R.querySelector("#dod-v").value, 10) || 1));
    cur = { c, v }; book = Math.ceil(c / 10); drawTabs(); show(); drawGrid();
  };
  R.querySelector("[data-act=copy]").onclick = async (e) => {
    try { await navigator.clipboard.writeText(R.querySelector(".dod-cmd").textContent); e.target.textContent = "Copied"; setTimeout(() => (e.target.textContent = "Copy command"), 1200); } catch (_) {}
  };
  drawTabs(); drawGrid(); show();
})();
