/* A faithful's profile (character.html?c=realm-slug/name): the Faces of the Coil's social profile on top of the Armory.
   Cover and avatar, name, title and status, bonds and the wall (from the social Worker through js/faces-social.js),
   About (their own details and the officer-kept profile in data/rp-profiles.json), Photos, and the Armory tab: render,
   gear, Mythic+, raids, duels and recent deeds (data/roster.json, data/characters.json, data/duels.json). */
(function () {
  "use strict";
  var root = document.querySelector("[data-char]");
  if (!root || !window.CoilFaces || !window.CoilSocial) return;
  var F = window.CoilFaces, S = window.CoilSocial, esc = F.esc, num = F.num;
  var $ = function (s) { return root.querySelector(s); };
  var key = (new URLSearchParams(location.search).get("c") || "").toLowerCase();
  var SLOTS = ["Head", "Neck", "Shoulders", "Back", "Chest", "Shirt", "Tabard", "Wrist", "Hands", "Waist", "Legs", "Feet", "Finger 1", "Finger 2", "Trinket 1", "Trinket 2", "Main Hand", "Off Hand"];
  var DETAIL_LABELS = [["pronouns", "Pronouns"], ["home", "Home"], ["affiliation", "Affiliations"], ["relationship", "Relationship"], ["likes", "Likes"], ["dislikes", "Dislikes"]];
  var D, M, SP = null, ME = null;

  function ago(t) {
    if (!t) return "never";
    var s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " minutes ago";
    if (s < 86400) return Math.round(s / 3600) + " hours ago";
    var dd = Math.round(s / 86400); return dd === 1 ? "yesterday" : dd + " days ago";
  }
  function paras(t) { return String(t || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""); }
  function mine() { return !!(ME && ME.chars.some(function (c) { return c.key === key; })); }

  /* ---------------------------------------------------------------- the head of the profile */
  function paintHead() {
    var legacy = D.profiles[key] || {}, det = (SP && SP.details) || {};
    var name = det.icName || legacy.icName || M.name, title = det.title || legacy.title || (M.title && M.title !== M.name ? M.title : "");
    document.title = name + " · The Faces of the Coil · Cult of Xal'Reth";
    root.style.setProperty("--cc", F.color(M));
    var cover = $("[data-cover]");
    cover.style.backgroundImage = det.cover ? "url(" + S.picUrl(det.cover) + ")" : "";
    cover.classList.toggle("has-pic", !!det.cover);
    var render = $("[data-cover-render]");
    if (!det.cover && M.media && (M.media.main || M.media.inset)) { render.src = M.media.main || M.media.inset; render.hidden = false; } else render.hidden = true;
    var av = $("[data-avatar]"), pic = det.avatar ? S.picUrl(det.avatar) : legacy.portrait || (M.media && (M.media.inset || M.media.avatar)) || "";
    av.style.backgroundImage = pic ? "url(" + pic + ")" : "";
    $("[data-c-name]").textContent = name;
    $("[data-c-title]").textContent = title;
    $("[data-c-line]").textContent = [name !== M.name ? M.name : "", "Level " + M.level, M.race, [M.spec, F.className(M)].filter(Boolean).join(" "), M.realm].filter(Boolean).join(" · ");
    var rank = $("[data-c-rank]"); rank.textContent = D.ranks[M.rank] || ("Rank " + M.rank);
    var status = SP && SP.status;
    $("[data-c-status]").innerHTML = status ? '<span class="pf-status-dot" aria-hidden="true"></span>' + esc(status) + (SP.statusAt ? " <small>" + esc(S.ago(SP.statusAt)) + "</small>" : "") : "";
    $("[data-c-status]").hidden = !status;
    // actions
    var acts = $("[data-actions]");
    if (!S.on) acts.innerHTML = "";
    else if (mine()) {
      acts.innerHTML = '<button type="button" class="btn" data-edit>Edit profile</button>' +
        '<label class="btn ghost">Change picture<input type="file" accept="image/*" hidden data-up="avatar"></label>' +
        '<label class="btn ghost">Change cover<input type="file" accept="image/*" hidden data-up="cover"></label><span class="pf-upnote" data-upnote></span>';
    } else if (S.signedIn() && ME) {
      acts.innerHTML = '<label class="pf-bondpick">Bond <select data-bond-kind>' + Object.keys(S.BONDS).map(function (k) { return '<option value="' + k + '">' + S.BONDS[k] + "</option>"; }).join("") +
        '</select></label><button type="button" class="btn" data-bond>Ask</button><a class="btn ghost" href="#wall" data-towall>Write on their wall</a>';
    } else if (SP && SP.claimed !== false) {
      acts.innerHTML = '<a class="btn ghost" href="' + esc(S.signInUrl()) + '">Sign in to bond or write</a>';
    } else acts.innerHTML = "";
  }

  /* ---------------------------------------------------------------- tabs */
  function show(tab) {
    root.querySelectorAll("[data-tab]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === tab ? "true" : "false"); });
    root.querySelectorAll("[data-panel]").forEach(function (p) { p.hidden = p.dataset.panel !== tab; });
    try { history.replaceState(null, "", location.pathname + location.search + "#" + tab); } catch (e) {}
  }

  function paintWall() {
    var host = $("[data-wall]");
    if (!S.on) { host.innerHTML = '<p class="fs-soon">The wall opens when the Faces do. Until then, see the About and Armory tabs.</p>'; return; }
    if (!SP || !SP.claimed) {
      host.innerHTML = '<p class="fs-empty">' + esc(M.name) + " hasn't joined the Faces yet. Once they sign in with Battle.net, their wall opens here.</p>";
      $("[data-wall-compose]").innerHTML = ""; return;
    }
    S.composer($("[data-wall-compose]"), D, mine() ? null : key, reload);
    host.innerHTML = "";
    if (!SP.posts.length) host.innerHTML = '<p class="fs-empty">Nothing on the wall yet.' + (S.signedIn() ? " Be the first to write." : "") + "</p>";
    SP.posts.forEach(function (p) { host.appendChild(S.renderPost(D, SP.faces, p)); });
  }

  function paintAbout() {
    var det = (SP && SP.details) || {}, legacy = D.profiles[key] || {};
    var facts = DETAIL_LABELS.map(function (l) { var v = det[l[0]] || legacy[l[0]]; return v ? "<div><dt>" + l[1] + "</dt><dd>" + esc(v) + "</dd></div>" : ""; }).join("");
    var html = (facts ? '<dl class="pf-facts">' + facts + "</dl>" : "") +
      (det.about ? '<div class="pf-about">' + paras(det.about) + "</div>" : "") +
      (legacy.quote ? '<blockquote class="ch-quote">' + esc(legacy.quote) + "</blockquote>" : "") +
      ((legacy.appearance || legacy.personality) ? '<div class="ch-two">' + (legacy.appearance ? "<div><h3>Appearance</h3>" + paras(legacy.appearance) + "</div>" : "") + (legacy.personality ? "<div><h3>Personality</h3>" + paras(legacy.personality) + "</div>" : "") + "</div>" : "") +
      (legacy.backstory ? "<h3>History</h3>" + paras(legacy.backstory) : "") +
      (legacy.sections || []).map(function (s) { return "<h3>" + esc(s.heading) + "</h3>" + paras(s.body); }).join("") +
      ((legacy.timeline || []).length ? '<h3>Timeline</h3><ol class="ch-time">' + legacy.timeline.map(function (t) { return "<li><span>" + esc(t.date || "") + "</span><b>" + esc(t.title || "") + "</b>" + paras(t.body) + "</li>"; }).join("") + "</ol>" : "") +
      (legacy.ooc ? '<div class="ch-ooc"><b>Out of character</b>' + paras(legacy.ooc) + "</div>" : "");
    $("[data-about]").innerHTML = html || '<p class="fs-empty">Nothing written yet.' + (mine() ? ' Press <b>Edit profile</b> to tell the Coil who you are.' : "") + "</p>";
  }

  function paintBonds() {
    var legacy = (D.profiles[key] || {}).relationships || [], list = (SP && SP.bonds) || [];
    var cards = list.map(function (b) {
      var f = S.face(D, SP.faces, b.with), h2h = F.headToHead(D.duels, key, b.with);
      return '<li class="pf-bond" style="--cc:' + esc(f.color) + '"><a href="' + esc(F.url(b.with)) + '"><span class="fs-av"' + (f.pic ? ' style="background-image:url(' + esc(f.pic) + ')"' : "") + "></span>" +
        "<span><b>" + esc(f.name) + "</b><small>" + esc(S.BONDS[b.kind] || b.kind) + (h2h.aw || h2h.bw ? " · duels " + h2h.aw + "–" + h2h.bw : "") + "</small></span></a>" +
        (mine() ? '<button type="button" class="fs-chip" data-unbond="' + esc(b.with) + '" aria-label="End this bond">×</button>' : "") + "</li>";
    }).join("");
    var old = legacy.map(function (r) {
      var to = String(r.to || "").toLowerCase(), m = D.byKey[to];
      return '<li class="pf-bond"><span class="fs-av"></span><span><b>' + (m ? '<a href="' + esc(F.url(to)) + '">' + esc(m.name) + "</a>" : esc(r.to)) + "</b><small>" + esc(r.label || "") + "</small></span></li>";
    }).join("");
    $("[data-bonds]").innerHTML = (cards || old) ? '<ul class="pf-bonds">' + cards + old + "</ul>" : '<p class="fs-empty">No bonds yet. Every rivalry starts with a request.</p>';
  }

  function paintPhotos() {
    var ph = (SP && SP.photos) || [];
    $("[data-photos]").innerHTML = ph.length ? '<ul class="pf-photos">' + ph.map(function (id) { return '<li><a href="' + esc(S.picUrl(id)) + '" target="_blank" rel="noopener"><img loading="lazy" alt="" src="' + esc(S.picUrl(id)) + '"></a></li>'; }).join("") + "</ul>"
      : '<p class="fs-empty">No pictures yet.' + (mine() ? " Add one to a post; it appears here once an officer approves it." : "") + "</p>";
  }

  function paintArmory() {
    var x = D.chars[key] || null, mp = x && x.mplus;
    var chip = function (label, value, style) { return '<div class="ch-chip"><span>' + esc(label) + "</span><b" + (style ? ' style="' + style + '"' : "") + ">" + value + "</b></div>"; };
    var html = '<div class="pf-armory"><div><div class="ch-chips">' +
      chip("Item level", num(M.ilvl)) + chip("Mythic+ rating", mp && mp.rating != null ? num(mp.rating) : "–", mp && mp.color ? "color:" + esc(mp.color) : "") +
      chip("Achievements", num(M.achievementPoints)) + chip("Mounts", num(M.mounts)) + chip("Pets", num(M.pets)) + chip("Last seen", esc(ago(M.lastLogin))) + "</div>";
    var st = F.standings(D.duels)[key];
    if (st) {
      var mineD = D.duels.filter(function (u) { return u.w === key || u.l === key; }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).slice(0, 6);
      html += '<section class="ch-sect"><h3>Duels</h3><div class="ch-duel"><b>' + st.wins + "–" + st.losses + "</b><span>" + Math.round(st.rate * 100) + "% won · " +
        (st.streak > 0 ? st.streak + " win streak" : -st.streak + " loss streak") + '</span><span class="ch-form">' + st.last.map(function (r) { return '<i class="' + r + '">' + r + "</i>"; }).join("") + "</span></div>" +
        '<ul class="ch-duels">' + mineD.map(function (u) { var won = u.w === key, other = won ? u.l : u.w; return '<li class="' + (won ? "W" : "L") + '"><b>' + (won ? "Won" : "Lost") + '</b> against <a href="' + esc(F.url(other)) + '">' + esc(F.nameOf(D, other)) + "</a><small>" + esc(u.date || "") + (u.place ? " · " + esc(u.place) : "") + "</small></li>"; }).join("") +
        '</ul><p><a href="duels.html">The Duelling Ground</a></p></section>';
    }
    if (x && x.gear && x.gear.length) {
      var order = function (g) { var i = SLOTS.indexOf(g.slot); return i < 0 ? 99 : i; };
      html += '<section class="ch-sect"><h3>Equipment</h3><ul class="ch-gear">' + x.gear.slice().sort(function (a, b) { return order(a) - order(b); }).map(function (g) {
        return '<li class="q' + g.q + '"><span class="slot">' + esc(g.slot) + '</span><a href="https://www.wowhead.com/item=' + g.id + '" target="_blank" rel="noopener">' + esc(g.name) + "</a><b>" + (g.ilvl || "") + "</b></li>";
      }).join("") + "</ul></section>";
    }
    if (mp && (mp.rating || (mp.best || []).length)) {
      html += '<section class="ch-sect"><h3>Mythic+ this season</h3><p class="ch-rating" style="color:' + esc(mp.color || "#e0c4ff") + '">' + num(mp.rating) + "</p>" +
        ((mp.best || []).length ? '<ul class="ch-runs">' + mp.best.map(function (r) { return "<li><span>" + esc(r.dungeon) + "</span><b>+" + r.level + "</b><small>" + (r.timed ? "in time" : "over time") + "</small></li>"; }).join("") + "</ul>" : "") + "</section>";
    }
    if (x && x.raid && (x.raid.instances || []).length) {
      html += '<section class="ch-sect"><h3>Raids · ' + esc(x.raid.expansion) + "</h3>" + x.raid.instances.map(function (ins) {
        return '<div class="ch-raid"><b>' + esc(ins.name) + "</b>" + ins.modes.map(function (mo) { var p = mo.of ? Math.round(mo.done / mo.of * 100) : 0; return '<div class="ch-prog"><span>' + esc(mo.difficulty) + '</span><i><em style="width:' + p + '%"></em></i><small>' + mo.done + "/" + mo.of + "</small></div>"; }).join("") + "</div>";
      }).join("") + "</section>";
    }
    if (!x) html += '<p class="ch-note">Gear, Mythic+ and raids arrive with the next daily refresh of the roster from Blizzard.</p>';
    var recent = (M.recent || []).filter(function (r) { return r.name; });
    if (recent.length) html += '<section class="ch-sect"><h3>Recent deeds</h3><ul class="ch-recent">' + recent.map(function (r) { return "<li>" + esc(r.name) + " <small>" + esc(ago(r.ts)) + "</small></li>"; }).join("") + "</ul></section>";
    var region = ((D.roster.guild && D.roster.guild.region) || "us").toLowerCase(), realm = encodeURIComponent(M.realmSlug), nm = encodeURIComponent(M.name.toLowerCase());
    html += '<p class="ch-links"><a href="https://worldofwarcraft.blizzard.com/en-us/character/' + region + "/" + realm + "/" + nm + '" target="_blank" rel="noopener">Blizzard Armory</a>' +
      '<a href="https://raider.io/characters/' + region + "/" + realm + "/" + nm + '" target="_blank" rel="noopener">Raider.IO</a>' +
      '<a href="https://www.warcraftlogs.com/character/' + region + "/" + realm + "/" + nm + '" target="_blank" rel="noopener">Warcraft Logs</a>' +
      '<a href="guild-roster.html#character/' + esc(key) + '">On the Guild Roster</a></p></div>' +
      (M.media && M.media.main ? '<img class="ch-render loaded" src="' + esc(M.media.main) + '" alt="' + esc(M.name) + '">' : "") + "</div>";
    $("[data-armory]").innerHTML = html;
  }

  function paintAll() { paintHead(); paintWall(); paintAbout(); paintBonds(); paintPhotos(); paintArmory(); }
  function reload() {
    if (!S.on) { paintAll(); return Promise.resolve(); }
    return S.api("/profile?c=" + encodeURIComponent(key)).then(function (p) { SP = p; }).catch(function () { SP = null; }).then(paintAll);
  }

  /* ---------------------------------------------------------------- editing your own profile */
  function openEdit() {
    var dlg = $("[data-editdlg]"), det = (SP && SP.details) || {}, legacy = D.profiles[key] || {};
    ["icName", "title", "pronouns", "home", "affiliation", "relationship", "likes", "dislikes", "about"].forEach(function (f) {
      dlg.querySelector('[name="' + f + '"]').value = det[f] != null ? det[f] : (f === "icName" ? legacy.icName || M.name : legacy[f] || "");
    });
    dlg.showModal();
  }
  root.addEventListener("click", function (e) {
    if (e.target.closest("[data-edit]")) openEdit();
    if (e.target.closest("[data-towall]")) { e.preventDefault(); show("wall"); var t = root.querySelector("[data-wall-compose] textarea"); if (t) t.focus(); }
    var bond = e.target.closest("[data-bond]");
    if (bond) S.api("/bonds", { method: "POST", body: { as: S.as(), to: key, kind: $("[data-bond-kind]").value } })
      .then(function (r) { alert(r.status === "accepted" ? "You are now bound. The Coil approves." : "Asked. They'll see your request when they next sign in."); return reload(); }).catch(function (x) { alert(x.message); });
    var ub = e.target.closest("[data-unbond]");
    if (ub && confirm("End this bond?")) S.api("/bonds?as=" + encodeURIComponent(key) + "&other=" + encodeURIComponent(ub.dataset.unbond), { method: "DELETE" }).then(reload).catch(function (x) { alert(x.message); });
    var tab = e.target.closest("[data-tab]"); if (tab) show(tab.dataset.tab);
  });
  root.addEventListener("change", function (e) {
    var up = e.target.closest("[data-up]"); if (!up) return;
    var file = up.files && up.files[0]; up.value = ""; if (!file) return;
    var note = $("[data-upnote]"), use = up.dataset.up; note.textContent = "Preparing the picture…";
    S.setAs(key);
    S.upload(file, use).then(function (r) {
      var d = {}; d[use] = r.id;
      return S.api("/profile", { method: "PUT", body: { as: key, details: d } });
    }).then(function () { note.textContent = "Saved. It shows once an officer approves it."; return reload(); }).catch(function (x) { note.textContent = x.message; });
  });
  $("[data-editform]").addEventListener("submit", function (e) {
    if (e.submitter && e.submitter.value === "cancel") return;
    e.preventDefault();
    var f = e.target, d = {};
    ["icName", "title", "pronouns", "home", "affiliation", "relationship", "likes", "dislikes", "about"].forEach(function (k) { d[k] = f.querySelector('[name="' + k + '"]').value; });
    S.api("/profile", { method: "PUT", body: { as: key, details: d } }).then(function () { $("[data-editdlg]").close(); return reload(); }).catch(function (x) { alert(x.message); });
  });

  /* ---------------------------------------------------------------- go */
  F.load().then(function (d) {
    D = d; M = d.byKey[key];
    if (!M) {
      document.title = "Not Found · The Faces of the Coil · Cult of Xal'Reth";
      $("[data-c-name]").textContent = key ? F.nameOf(d, key) : "Who?";
      $("[data-c-line]").textContent = key ? "Not on the guild roster right now. Perhaps they are basking elsewhere." : "Choose someone from the Faces or the Guild Roster.";
      $("[data-tabs]").hidden = true; root.querySelectorAll("[data-panel]").forEach(function (p) { p.hidden = true; });
      return;
    }
    S.wire($("[data-wall]"), d);
    var start = (location.hash || "").slice(1);
    show(["wall", "about", "bonds", "photos", "armory"].indexOf(start) >= 0 ? start : S.on ? "wall" : "about");
    (S.on ? S.loadMe() : Promise.resolve(null)).then(function (me) { ME = me; return reload(); });
  });
})();
