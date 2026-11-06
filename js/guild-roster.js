/* ==========================================================
   GUILD ROSTER — reads data/roster.json (written hourly by
   .github/workflows/roster-sync.yml) and renders the Ledger.
   No API calls from the browser: visitors only read the cache.
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Class id -> name and colour (Druid is not in the brief; it keeps its classic orange)
  const CLASSES = {
    1: ["Warrior", "#c69b6d"], 2: ["Paladin", "#f48cba"], 3: ["Hunter", "#aad372"], 4: ["Rogue", "#fff468"],
    5: ["Priest", "#ffffff"], 6: ["Death Knight", "#c41e3a"], 7: ["Shaman", "#2f8cff"], 8: ["Mage", "#3fc7eb"],
    9: ["Warlock", "#a173ff"], 10: ["Monk", "#00d98b"], 11: ["Druid", "#ff7c0a"], 12: ["Demon Hunter", "#7cdc2c"],
    13: ["Evoker", "#cd9a4b"],
  };
  const classColor = (m) => (CLASSES[m.classId] || [])[1] || "#a66bff";
  const className = (m) => m.class || (CLASSES[m.classId] || [])[0] || "Unknown";

  const el = {
    grid: $("[data-grid]"), empty: $("[data-empty]"), stats: $("[data-stats]"), tools: $("[data-tools]"),
    count: $("[data-result-count]"), reset: $("[data-reset]"), dir: $("[data-dir]"), initiates: $("[data-initiates]"),
    synced: $("[data-synced]"), notice: $("[data-roster-notice]"), modal: $("[data-modal]"),
  };
  const form = el.tools;
  const F = { q: form.q, class: form.class, role: form.role, realm: form.realm, rank: form.rank, faction: form.faction, sort: form.sort };

  let roster = null, status = null, members = [], rankNames = {}, desc = false, lastFocus = null;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  function ago(t) {
    if (!t) return "never";
    const s = (new Date(t).getTime() - Date.now()) / 1000, a = Math.abs(s);
    if (a < 60) return "just now";
    if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
    if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
    return new Date(t).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
  const fullDate = (t) => (t ? new Date(t).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");
  const rankName = (r) => rankNames[r] || (r === 0 ? "Guild Master" : `Rank ${r}`);
  const keyOf = (m) => `${m.realmSlug}/${m.name.toLowerCase()}`;
  const SIGIL = '<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="20,6 34,30 6,30"/><circle cx="20" cy="22" r="4"/></svg>';

  async function getJson(url, tries = 3) {
    let err;
    for (let i = 0; i < tries; i++) {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) { err = e; await new Promise((r) => setTimeout(r, 400 * 2 ** i)); }
    }
    throw err;
  }

  // ---------- load ----------
  async function load() {
    try {
      [roster, status] = await Promise.all([getJson("data/roster.json"), getJson("data/sync-status.json").catch(() => null)]);
    } catch (e) {
      el.grid.innerHTML = ""; el.grid.removeAttribute("aria-busy");
      showEmpty("The Ledger would not open", "The roster could not be loaded. The Coil is patient; please try again in a moment.", "Try again", () => { location.reload(); });
      el.synced.textContent = "Roster unavailable";
      setStats(null);
      return;
    }
    members = (roster.members || []).map((m) => ({ ...m, _class: className(m), _key: keyOf(m) }));
    rankNames = roster.rankNames || {};
    el.initiates.textContent = members.length ? num(members.length) : "0";
    renderSynced();
    setStats(roster.stats);
    fillFilters();
    readUrl();
    render();
    openFromHash();
  }

  function renderSynced() {
    const last = status?.lastSuccessAt || roster.dataChangedAt;
    if (!last) { el.synced.textContent = "Awaiting the first sync with the Armory"; return; }
    const stale = Date.now() - new Date(last).getTime() > 3 * 3600 * 1000;
    el.synced.innerHTML = `<span class="dot${stale ? " stale" : ""}" aria-hidden="true"></span>Synced with the Armory <time datetime="${esc(last)}" title="${esc(fullDate(last))}">${esc(ago(last))}</time>`;
    if (status && status.ok === false && status.lastAttemptAt) {
      el.notice.hidden = false;
      el.notice.textContent = `The latest sync attempt (${ago(status.lastAttemptAt)}) did not finish, so you are seeing the roster from ${ago(last)}.`;
    }
  }

  function setStats(s) {
    el.stats.removeAttribute("aria-busy");
    $$("[data-stat]", el.stats).forEach((b) => b.classList.remove("sk"));
    const put = (k, v) => { $(`[data-stat="${k}"]`, el.stats).innerHTML = v; };
    const sub = (k, v) => { $(`[data-stat-sub="${k}"]`, el.stats).textContent = v; };
    if (!s) { ["total", "ilvl", "ap", "classes", "topAp", "topIlvl"].forEach((k) => put(k, "—")); return; }
    put("total", num(s.totalMembers));
    put("ilvl", num(s.averageItemLevel));
    put("ap", num(s.averageAchievementPoints));
    put("classes", `${num(s.classesRepresented)}<small style="display:inline;font-size:.5em;color:var(--bone-dim)"> / 13</small>`);
    const champ = (k, c, unit) => {
      if (!c) { put(k, "—"); return; }
      const m = members.find((x) => x.name === c.name && x.realmSlug === c.realmSlug);
      put(k, `<button type="button" data-open="${esc(m ? m._key : "")}" style="--cc:${CLASSES[c.classId]?.[1] || ""}">${esc(c.name)}</button>`);
      sub(k, `${num(c.value)} ${unit}`);
    };
    champ("topAp", s.highestAchievement, "achievement points");
    champ("topIlvl", s.highestItemLevel, "item level");
    $$("[data-open]", el.stats).forEach((b) => b.addEventListener("click", () => { const m = members.find((x) => x._key === b.dataset.open); if (m) openModal(m, b); }));
  }

  function fillFilters() {
    const opts = (sel, values, label = (v) => v) => {
      const keep = sel.options[0];
      sel.replaceChildren(keep, ...values.map((v) => new Option(label(v), v)));
    };
    const uniq = (f) => [...new Set(members.map(f).filter((v) => v != null && v !== ""))];
    opts(F.class, uniq((m) => m._class).sort());
    opts(F.realm, uniq((m) => m.realm).sort());
    opts(F.rank, uniq((m) => m.rank).sort((a, b) => a - b).map(String), (r) => rankName(Number(r)));
    opts(F.faction, uniq((m) => m.faction).sort());
  }

  // ---------- filter, sort, URL state ----------
  const SORTS = {
    rank: (m) => m.rank, name: (m) => m.name.toLowerCase(), class: (m) => m._class,
    level: (m) => m.level, ilvl: (m) => m.ilvl, ap: (m) => m.achievementPoints,
  };
  function current() {
    const q = F.q.value.trim().toLowerCase();
    const f = { class: F.class.value, role: F.role.value, realm: F.realm.value, rank: F.rank.value, faction: F.faction.value };
    let list = members.filter((m) =>
      (!q || m.name.toLowerCase().includes(q)) &&
      (!f.class || m._class === f.class) && (!f.role || m.role === f.role) && (!f.realm || m.realm === f.realm) &&
      (!f.rank || String(m.rank) === f.rank) && (!f.faction || m.faction === f.faction));
    const key = SORTS[F.sort.value] || SORTS.rank, dir = desc ? -1 : 1;
    list.sort((a, b) => {
      const x = key(a), y = key(b);
      if (x == null && y == null) return a.name.localeCompare(b.name);
      if (x == null) return 1; if (y == null) return -1; // unknown values always last
      const c = typeof x === "string" ? x.localeCompare(y) : x - y;
      return c * dir || a.rank - b.rank || a.name.localeCompare(b.name);
    });
    return { list, filtered: !!(q || Object.values(f).some(Boolean)) };
  }
  function writeUrl() {
    const p = new URLSearchParams();
    for (const [k, inp] of Object.entries(F)) if (inp.value && !(k === "sort" && inp.value === "rank")) p.set(k, inp.value);
    if (desc) p.set("dir", "desc");
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }
  function readUrl() {
    const p = new URLSearchParams(location.search);
    for (const [k, inp] of Object.entries(F)) {
      const v = p.get(k); if (v == null) continue;
      if (inp.tagName === "SELECT" && ![...inp.options].some((o) => o.value === v)) continue;
      inp.value = v;
    }
    setDir(p.get("dir") === "desc");
  }
  function setDir(d) {
    desc = d;
    el.dir.dataset.desc = d ? "1" : "0";
    el.dir.querySelector("span").textContent = d ? "Desc" : "Asc";
    el.dir.setAttribute("aria-label", `Sort order: ${d ? "descending" : "ascending"}. Activate to reverse.`);
  }

  // ---------- render ----------
  function card(m, i) {
    const cc = classColor(m);
    const li = document.createElement("li");
    li.className = "rr-card" + (m.available ? "" : " private");
    li.style.setProperty("--cc", cc); li.style.setProperty("--i", i);
    const fac = (m.faction || "").toLowerCase();
    const spec = m.available ? `${esc(m.spec || "")} ${esc(m._class)}${m.role ? `<span class="role">${esc(m.role)}</span>` : ""}` : `${esc(m._class)} <span class="muted">· profile hidden</span>`;
    li.innerHTML = `<button type="button" aria-haspopup="dialog" aria-label="${esc(m.name)}, level ${m.level} ${esc(m.race || "")} ${esc(m.spec || "")} ${esc(m._class)}, ${esc(rankName(m.rank))}. Open profile.">
      <div class="rr-banner">${m.media?.inset ? `<img src="${esc(m.media.inset)}" alt="" loading="lazy" decoding="async" width="460" height="128">` : ""}
        ${fac ? `<span class="rr-faction ${esc(fac)}">${esc(m.faction)}</span>` : ""}<span class="rr-lvl">LVL ${num(m.level)}</span></div>
      <div class="rr-head"><div class="rr-avatar">${m.media?.avatar ? `<img src="${esc(m.media.avatar)}" alt="" loading="lazy" decoding="async" width="64" height="64">` : SIGIL}</div>
        <div class="rr-who"><div class="rr-name">${esc(m.name)}</div><div class="rr-rank">${esc(rankName(m.rank))}</div></div></div>
      <div class="rr-body">
        <p class="rr-spec">${m.race ? esc(m.race) + " " : ""}${spec}<br><span class="rr-realm">${esc(m.realm)}</span></p>
        <dl class="rr-nums"><div><dt>Item Level</dt><dd>${num(m.ilvl)}</dd></div><div><dt>Achievements</dt><dd>${num(m.achievementPoints)}</dd></div></dl>
        <p class="rr-upd">Updated <time datetime="${esc(m.updatedAt)}" title="${esc(fullDate(m.updatedAt))}">${esc(ago(m.updatedAt))}</time></p>
      </div></button>`;
    $$("img", li).forEach((img) => img.addEventListener("error", () => {
      if (img.closest(".rr-avatar")) img.outerHTML = SIGIL; else img.remove();
    }, { once: true }));
    li.firstElementChild.addEventListener("click", (e) => openModal(m, e.currentTarget));
    return li;
  }

  function render() {
    const { list, filtered } = current();
    el.grid.removeAttribute("aria-busy");
    el.grid.classList.remove("ready");
    const frag = document.createDocumentFragment();
    list.forEach((m, i) => frag.append(card(m, i)));
    el.grid.replaceChildren(frag);
    void el.grid.offsetWidth; el.grid.classList.add("ready");
    el.reset.hidden = !filtered;
    el.count.textContent = members.length ? (filtered ? `${num(list.length)} of ${num(members.length)} faithful match` : `${num(members.length)} faithful`) : "";
    if (!members.length) {
      showEmpty("The Ledger is still blank", status?.lastAttemptAt && status.ok === false
        ? "The Armory has not answered yet. The Inner Scale has been notified, and is pretending to be calm."
        : "The roster has not been synced with the Armory yet. The faithful will appear here within the hour. Glory to Xal'Reth.");
    } else if (!list.length) {
      showEmpty("No faithful match these signs", "Loosen your grip on the filters. What is held too tightly is not found.", "Reset filters", resetAll);
    } else el.empty.hidden = true;
  }

  function showEmpty(title, text, btnLabel, onClick) {
    el.empty.hidden = false;
    el.empty.innerHTML = `<h2>${esc(title)}</h2><p>${esc(text)}</p>${btnLabel ? `<button type="button" class="btn ghost">${esc(btnLabel)}</button>` : ""}`;
    if (btnLabel) el.empty.querySelector("button").addEventListener("click", onClick);
  }

  function resetAll() {
    form.reset(); F.sort.value = "rank"; setDir(false); writeUrl(); render(); F.q.focus();
  }

  // ---------- modal ----------
  function openModal(m, opener) {
    lastFocus = opener || document.activeElement;
    const d = el.modal, cc = classColor(m);
    d.style.setProperty("--cc", cc);
    const img = $('[data-m="render"]', d);
    img.classList.remove("loaded"); img.removeAttribute("src");
    if (m.media?.main || m.media?.inset) {
      img.onload = () => img.classList.add("loaded");
      img.onerror = () => { if (m.media.inset && img.src !== m.media.inset) img.src = m.media.inset; };
      img.src = m.media.main || m.media.inset;
      img.alt = `${m.name}, ${m.race || ""} ${m._class}`;
    }
    $('[data-m="rank"]', d).textContent = rankName(m.rank);
    $('[data-m="name"]', d).textContent = m.name;
    $('[data-m="title"]', d).textContent = m.title && m.title !== m.name ? m.title : "";
    $('[data-m="line"]', d).textContent = [`Level ${m.level}`, m.race, [m.spec, m._class].filter(Boolean).join(" "), m.realm].filter(Boolean).join(" · ");
    const fact = (k, v, gold) => `<div><dt>${k}</dt><dd${gold ? ' class="gold"' : ""}>${v}</dd></div>`;
    $('[data-m="facts"]', d).innerHTML = [
      fact("Item Level", num(m.ilvl), true), fact("Avg. Item Level", num(m.avgIlvl), true), fact("Achievements", num(m.achievementPoints), true),
      fact("Race", esc(m.race || "—")), fact("Class", esc(m._class)), fact("Spec", esc(m.spec ? `${m.spec}${m.role ? ` (${m.role})` : ""}` : "—")),
      fact("Realm", esc(m.realm)), fact("Guild Rank", esc(rankName(m.rank))), fact("Faction", esc(m.faction || "—")),
      fact("Level", num(m.level)), fact("Mounts", num(m.mounts)), fact("Pets", num(m.pets)),
    ].join("");
    const recent = (m.recent || []).filter((r) => r.name);
    $('[data-m="recent"]', d).innerHTML = (m.lastLogin || recent.length) ? `<h3>Recent Activity</h3><ul>
      ${m.lastLogin ? `<li><span>Last seen in Azeroth</span><time datetime="${new Date(m.lastLogin).toISOString()}" title="${esc(fullDate(m.lastLogin))}">${esc(ago(m.lastLogin))}</time></li>` : ""}
      ${recent.map((r) => `<li><span>Earned <em>${esc(r.name)}</em></span><time datetime="${new Date(r.ts).toISOString()}" title="${esc(fullDate(r.ts))}">${esc(ago(r.ts))}</time></li>`).join("")}</ul>`
      : (m.available ? "" : `<p class="muted">This character's Armory profile is private or has not been seen in a while, so only the guild roster's record is shown.</p>`);
    const region = (roster.guild?.region || "us").toLowerCase(), realm = encodeURIComponent(m.realmSlug), name = encodeURIComponent(m.name.toLowerCase());
    const loc = region === "eu" ? "en-gb" : region === "kr" ? "ko-kr" : region === "tw" ? "zh-tw" : "en-us";
    const link = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}<span class="sr-only"> (opens in a new tab)</span></a>`;
    $('[data-m="links"]', d).innerHTML = link(`https://worldofwarcraft.blizzard.com/${loc}/character/${region}/${realm}/${name}`, "Blizzard Armory")
      + link(`https://raider.io/characters/${region}/${realm}/${name}`, "Raider.IO")
      + link(`https://www.warcraftlogs.com/character/${region}/${realm}/${name}`, "Warcraft Logs");
    $('[data-m="updated"]', d).textContent = `Profile updated ${ago(m.updatedAt)}${m.updatedAt ? ` (${fullDate(m.updatedAt)})` : ""}.`;
    if (!d.open) d.showModal();
    $(".rr-m-body", d).scrollTop = 0;
    history.replaceState(null, "", location.pathname + location.search + "#character/" + m._key);
  }
  el.modal.addEventListener("close", () => {
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  });
  $("[data-close]", el.modal).addEventListener("click", () => el.modal.close());
  el.modal.addEventListener("click", (e) => { if (e.target === el.modal) el.modal.close(); }); // click on the backdrop
  function openFromHash() {
    const m = location.hash.match(/^#character\/(.+)$/);
    if (!m) return;
    const hit = members.find((x) => x._key === decodeURIComponent(m[1]).toLowerCase());
    if (hit) openModal(hit, null);
  }

  // ---------- events ----------
  let t;
  F.q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { writeUrl(); render(); }, 120); });
  ["class", "role", "realm", "rank", "faction", "sort"].forEach((k) => F[k].addEventListener("change", () => {
    if (k === "sort") setDir(["level", "ilvl", "ap"].includes(F.sort.value)); // numbers read best highest-first
    writeUrl(); render();
  }));
  el.dir.addEventListener("click", () => { setDir(!desc); writeUrl(); render(); });
  el.reset.addEventListener("click", resetAll);
  addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement === document.body) { e.preventDefault(); F.q.focus(); } });

  load();
})();
