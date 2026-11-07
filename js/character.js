/* The Armory of the Coil (character.html?c=realm-slug/name): one faithful's page. Their roster record and render
   (data/roster.json), gear, Mythic+ and raids (data/characters.json; both from the hourly Blizzard sync), their
   roleplay profile (data/rp-profiles.json) and duel record (data/duels.json; both kept in the Sanctum Editor). */
(function () {
  "use strict";
  var root = document.querySelector("[data-char]");
  if (!root || !window.CoilFaces) return;
  var F = window.CoilFaces, esc = F.esc, num = F.num;
  var $ = function (s) { return root.querySelector(s); };
  var key = (new URLSearchParams(location.search).get("c") || "").toLowerCase();
  var SLOTS = ["Head", "Neck", "Shoulders", "Back", "Chest", "Shirt", "Tabard", "Wrist", "Hands", "Waist", "Legs", "Feet", "Finger 1", "Finger 2", "Trinket 1", "Trinket 2", "Main Hand", "Off Hand"];

  function ago(t) {
    if (!t) return "never";
    var s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " minutes ago";
    if (s < 86400) return Math.round(s / 3600) + " hours ago";
    var d = Math.round(s / 86400); return d === 1 ? "yesterday" : d + " days ago";
  }
  function paras(t) { return String(t || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""); }

  F.load().then(function (d) {
    var m = d.byKey[key];
    if (!m) {
      document.title = "Not Found · The Armory of the Coil · Cult of Xal'Reth";
      $("[data-c-name]").textContent = key ? F.nameOf(d, key) : "Who?";
      $("[data-c-line]").textContent = key ? "Not on the guild roster right now. Perhaps they are basking elsewhere." : "Choose someone from the Guild Roster or the RP profiles.";
      $("[data-c-body]").innerHTML = '<p class="ch-empty">Every faithful has a page here. Find one on <a href="guild-roster.html">the Guild Roster</a> or among <a href="rp.html">the RP profiles</a>.</p>';
      return;
    }
    var x = d.chars[key] || null, rp = d.profiles[key] || null, cc = F.color(m), cls = F.className(m);
    root.style.setProperty("--cc", cc);
    document.title = (rp && rp.icName ? rp.icName : m.name) + " · The Armory of the Coil · Cult of Xal'Reth";
    var title = m.title && m.title !== m.name ? m.title : "";
    $("[data-c-name]").textContent = rp && rp.icName ? rp.icName : m.name;
    $("[data-c-title]").textContent = rp && rp.title ? rp.title : title;
    $("[data-c-line]").textContent = [rp && rp.icName && rp.icName !== m.name ? m.name : "", "Level " + m.level, m.race, [m.spec, cls].filter(Boolean).join(" "), m.realm].filter(Boolean).join(" · ");
    $("[data-c-rank]").textContent = d.ranks[m.rank] || ("Rank " + m.rank);
    $("[data-c-rank]").href = "ranks.html";
    var img = $("[data-c-render]");
    if (m.media && (m.media.main || m.media.inset)) {
      img.onload = function () { img.classList.add("loaded"); };
      img.onerror = function () { if (m.media.inset && img.src !== m.media.inset) img.src = m.media.inset; };
      img.src = (rp && rp.portrait) || m.media.main || m.media.inset; img.alt = m.name + ", " + (m.race || "") + " " + cls;
    } else if (rp && rp.portrait) { img.src = rp.portrait; img.classList.add("loaded"); }
    var mp = x && x.mplus;
    var chip = function (label, value, style) { return '<div class="ch-chip"><span>' + esc(label) + "</span><b" + (style ? ' style="' + style + '"' : "") + ">" + value + "</b></div>"; };
    $("[data-c-chips]").innerHTML =
      chip("Item level", num(m.ilvl)) +
      chip("Mythic+ rating", mp && mp.rating != null ? num(mp.rating) : "–", mp && mp.color ? "color:" + esc(mp.color) : "") +
      chip("Achievements", num(m.achievementPoints)) + chip("Mounts", num(m.mounts)) + chip("Pets", num(m.pets)) +
      chip("Last seen", esc(ago(m.lastLogin)));

    var html = "";
    // the roleplay profile
    if (rp) {
      html += '<section class="ch-sect ch-rp" aria-labelledby="ch-rp-h"><p class="kicker">In character</p><h2 id="ch-rp-h">' + esc(rp.icName || m.name) + "</h2>" +
        (rp.pronouns ? '<p class="ch-pron">' + esc(rp.pronouns) + "</p>" : "") +
        (rp.quote ? '<blockquote class="ch-quote">' + esc(rp.quote) + "</blockquote>" : "") +
        '<div class="ch-two">' + (rp.appearance ? "<div><h3>Appearance</h3>" + paras(rp.appearance) + "</div>" : "") + (rp.personality ? "<div><h3>Personality</h3>" + paras(rp.personality) + "</div>" : "") + "</div>" +
        (rp.backstory ? "<h3>History</h3>" + paras(rp.backstory) : "") +
        (rp.sections || []).map(function (s) { return "<h3>" + esc(s.heading) + "</h3>" + paras(s.body); }).join("");
      if ((rp.relationships || []).length) {
        html += '<h3>Bonds</h3><ul class="ch-bonds">' + rp.relationships.map(function (r) {
          var to = String(r.to || ""), known = d.byKey[to.toLowerCase()], h2h = known ? F.headToHead(d.duels, key, to.toLowerCase()) : null;
          var label = (known ? '<a href="' + esc(F.url(to.toLowerCase())) + '">' + esc(known.name) + "</a>" : esc(to));
          return "<li>" + label + " <small>" + esc(r.label || "") + (h2h && (h2h.aw || h2h.bw) ? " · duels " + h2h.aw + "–" + h2h.bw : "") + "</small></li>";
        }).join("") + "</ul>";
      }
      if ((rp.timeline || []).length) {
        html += '<h3>Timeline</h3><ol class="ch-time">' + rp.timeline.map(function (t) { return "<li><span>" + esc(t.date || "") + "</span><b>" + esc(t.title || "") + "</b>" + paras(t.body) + "</li>"; }).join("") + "</ol>";
      }
      if (rp.ooc) html += '<div class="ch-ooc"><b>Out of character</b>' + paras(rp.ooc) + "</div>";
      html += "</section>";
    } else {
      html += '<section class="ch-sect ch-norp"><p>No roleplay profile yet. Every faithful may have one: ask an officer, or <a href="contact.html">send yours through the contact page</a>.</p></section>';
    }
    // duels
    var st = F.standings(d.duels)[key];
    if (st) {
      var mine = d.duels.filter(function (u) { return u.w === key || u.l === key; }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).slice(0, 6);
      html += '<section class="ch-sect" aria-labelledby="ch-duel-h"><p class="kicker">The duelling ground</p><h2 id="ch-duel-h">Duels</h2><div class="ch-duel"><b>' + st.wins + "–" + st.losses + "</b><span>" +
        Math.round(st.rate * 100) + "% won · " + (st.streak > 0 ? st.streak + " win streak" : -st.streak + " loss streak") + '</span><span class="ch-form">' + st.last.map(function (r) { return '<i class="' + r + '">' + r + "</i>"; }).join("") + "</span></div>" +
        '<ul class="ch-duels">' + mine.map(function (u) {
          var won = u.w === key, other = won ? u.l : u.w;
          return '<li class="' + (won ? "W" : "L") + '"><b>' + (won ? "Won" : "Lost") + '</b> against <a href="' + esc(F.url(other)) + '">' + esc(F.nameOf(d, other)) + "</a><small>" + esc(u.date || "") + (u.place ? " · " + esc(u.place) : "") + "</small></li>";
        }).join("") + '</ul><p><a href="duels.html">The full leaderboard</a></p></section>';
    }
    // gear
    if (x && x.gear && x.gear.length) {
      var order = function (g) { var i = SLOTS.indexOf(g.slot); return i < 0 ? 99 : i; };
      html += '<section class="ch-sect" aria-labelledby="ch-gear-h"><p class="kicker">From the Armory</p><h2 id="ch-gear-h">Equipment</h2><ul class="ch-gear">' +
        x.gear.slice().sort(function (a, b) { return order(a) - order(b); }).map(function (g) {
          return '<li class="q' + g.q + '"><span class="slot">' + esc(g.slot) + '</span><a href="https://www.wowhead.com/item=' + g.id + '" target="_blank" rel="noopener">' + esc(g.name) + "</a><b>" + (g.ilvl || "") + "</b></li>";
        }).join("") + "</ul></section>";
    }
    // Mythic+
    if (mp && (mp.rating || (mp.best || []).length)) {
      html += '<section class="ch-sect" aria-labelledby="ch-mp-h"><p class="kicker">This season</p><h2 id="ch-mp-h">Mythic+</h2>' +
        '<p class="ch-rating" style="color:' + esc(mp.color || "#e0c4ff") + '">' + num(mp.rating) + "</p>" +
        ((mp.best || []).length ? '<ul class="ch-runs">' + mp.best.map(function (r) { return "<li><span>" + esc(r.dungeon) + "</span><b>+" + r.level + "</b><small>" + (r.timed ? "in time" : "over time") + "</small></li>"; }).join("") + "</ul>" : "") + "</section>";
    }
    // raids
    if (x && x.raid && (x.raid.instances || []).length) {
      html += '<section class="ch-sect" aria-labelledby="ch-raid-h"><p class="kicker">' + esc(x.raid.expansion) + '</p><h2 id="ch-raid-h">Raids</h2>' + x.raid.instances.map(function (ins) {
        return '<div class="ch-raid"><b>' + esc(ins.name) + "</b>" + ins.modes.map(function (mo) {
          var p = mo.of ? Math.round(mo.done / mo.of * 100) : 0;
          return '<div class="ch-prog"><span>' + esc(mo.difficulty) + "</span><i><em style=\"width:" + p + '%"></em></i><small>' + mo.done + "/" + mo.of + "</small></div>";
        }).join("") + "</div>";
      }).join("") + "</section>";
    }
    if (!x) html += '<p class="ch-note">Gear, Mythic+ and raids arrive with the next daily refresh of the roster from Blizzard.</p>';
    // recent achievements
    var recent = (m.recent || []).filter(function (r) { return r.name; });
    if (recent.length) html += '<section class="ch-sect"><p class="kicker">Lately</p><h2>Recent Deeds</h2><ul class="ch-recent">' + recent.map(function (r) { return "<li>" + esc(r.name) + " <small>" + esc(ago(r.ts)) + "</small></li>"; }).join("") + "</ul></section>";
    var region = ((d.roster.guild && d.roster.guild.region) || "us").toLowerCase(), realm = encodeURIComponent(m.realmSlug), nm = encodeURIComponent(m.name.toLowerCase());
    html += '<p class="ch-links"><a href="https://worldofwarcraft.blizzard.com/en-us/character/' + region + "/" + realm + "/" + nm + '" target="_blank" rel="noopener">Blizzard Armory</a>' +
      '<a href="https://raider.io/characters/' + region + "/" + realm + "/" + nm + '" target="_blank" rel="noopener">Raider.IO</a>' +
      '<a href="https://www.warcraftlogs.com/character/' + region + "/" + realm + "/" + nm + '" target="_blank" rel="noopener">Warcraft Logs</a>' +
      '<a href="guild-roster.html#character/' + esc(key) + '">On the Guild Roster</a></p>' +
      '<p class="ch-note">Armory data from Blizzard, refreshed hourly' + (x && x.at ? "; gear and progress " + esc(ago(x.at)) : "") + ". Roleplay profiles and duels are kept by the officers.</p>";
    $("[data-c-body]").innerHTML = html;
  });
})();
