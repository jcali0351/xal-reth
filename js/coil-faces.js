/* Shared by character.html, rp.html and duels.html: loads the roster (data/roster.json), the character extras
   (data/characters.json, from the hourly roster sync), the RP profiles (data/rp-profiles.json) and the duel ledger
   (data/duels.json, both kept in the Sanctum Editor), and a few helpers. window.CoilFaces.load() resolves with them. */
(function () {
  "use strict";
  var CLASSES = {
    1: ["Warrior", "#c69b6d"], 2: ["Paladin", "#f48cba"], 3: ["Hunter", "#aad372"], 4: ["Rogue", "#fff468"],
    5: ["Priest", "#ffffff"], 6: ["Death Knight", "#c41e3a"], 7: ["Shaman", "#2f8cff"], 8: ["Mage", "#3fc7eb"],
    9: ["Warlock", "#a173ff"], 10: ["Monk", "#00d98b"], 11: ["Druid", "#ff7c0a"], 12: ["Demon Hunter", "#7cdc2c"], 13: ["Evoker", "#cd9a4b"]
  };
  var base = window.COIL_BASE || "";
  function get(path, fallback) {
    var bust = "?h=" + Math.floor(Date.now() / 600000);
    return fetch(base + path + bust, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { return fallback; });
  }
  var cache = null;
  var F = window.CoilFaces = {
    esc: function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); },
    keyOf: function (m) { return m.realmSlug + "/" + m.name.toLowerCase(); },
    color: function (m) { return (m && CLASSES[m.classId] || [])[1] || "#a66bff"; },
    className: function (m) { return (m && (m.class || (CLASSES[m.classId] || [])[0])) || "Unknown"; },
    url: function (key) { return base + "character.html?c=" + encodeURIComponent(key); },
    num: function (n) { return n == null ? "–" : Number(n).toLocaleString("en-US"); },
    load: function () {
      if (cache) return cache;
      cache = Promise.all([get("data/roster.json", { members: [] }), get("data/characters.json", { chars: {} }), get("data/rp-profiles.json", { profiles: {} }),
        get("data/duels.json", { duels: [] }), get("data/roster-config.json", {})]).then(function (r) {
        var roster = r[0] || { members: [] }, byKey = {};
        (roster.members || []).forEach(function (m) { byKey[F.keyOf(m)] = m; });
        var ranks = Object.assign({}, (r[4] && r[4].rankNames) || {}, roster.rankNames || {});
        return { roster: roster, byKey: byKey, chars: (r[1] && r[1].chars) || {}, profiles: (r[2] && r[2].profiles) || {}, duels: (r[3] && r[3].duels) || [], ranks: ranks };
      });
      return cache;
    },
    // a name for any key, even someone who left the guild or is not in it
    nameOf: function (d, key) {
      var m = d.byKey[key]; if (m) return m.name;
      var n = String(key).split("/").pop() || key; return n.charAt(0).toUpperCase() + n.slice(1);
    },
    // wins, losses, streak (+ for wins, - for losses) and the last five, newest first, per duelist
    standings: function (duels) {
      var s = {};
      duels.slice().sort(function (a, b) { return (a.date || "").localeCompare(b.date || "") || (a.id || "").localeCompare(b.id || ""); }).forEach(function (d) {
        [[d.w, true], [d.l, false]].forEach(function (p) {
          var x = s[p[0]] || (s[p[0]] = { key: p[0], wins: 0, losses: 0, streak: 0, last: [] });
          if (p[1]) { x.wins++; x.streak = x.streak > 0 ? x.streak + 1 : 1; } else { x.losses++; x.streak = x.streak < 0 ? x.streak - 1 : -1; }
          x.last.unshift(p[1] ? "W" : "L"); x.last = x.last.slice(0, 5);
        });
      });
      Object.keys(s).forEach(function (k) { var x = s[k]; x.total = x.wins + x.losses; x.rate = x.total ? x.wins / x.total : 0; });
      return s;
    },
    headToHead: function (duels, a, b) {
      var aw = 0, bw = 0;
      duels.forEach(function (d) { if (d.w === a && d.l === b) aw++; else if (d.w === b && d.l === a) bw++; });
      return { aw: aw, bw: bw };
    }
  };
})();
