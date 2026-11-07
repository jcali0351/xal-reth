/* The Auction House (auction-house.html). Reads auctions.json and items.json from the ah-data branch, which
   .github/workflows/auctions.yml (tools/sync_auctions.mjs) rewrites every hour from the Blizzard API, and shows every
   item up for sale: search, realm / commodities / pets, category, quality and sorting, 60 rows at a time. */
(function () {
  "use strict";
  var root = document.querySelector("[data-ah]");
  if (!root) return;
  var SRC = root.getAttribute("data-src") || "https://raw.githubusercontent.com/jcali0351/xal-reth/ah-data/";
  // for local testing only: ?src= points at another copy of the data
  var q0 = new URLSearchParams(location.search);
  if (q0.get("src") && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) SRC = q0.get("src");
  var ICON = "https://render.worldofwarcraft.com/us/icons/56/";
  var PAGE = 60;
  var $ = function (s) { return root.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString("en-US"); };

  var all = [], shown = PAGE, state = { q: "", kind: "all", cls: "", qual: null, sort: "lst", dir: -1 };
  var KIND = ["Realm", "Commodity", "Pet"];

  function money(c, dim) {
    c = Math.round(c || 0);
    if (!c) return '<span class="ah-money' + (dim ? " dim" : "") + '">–</span>';
    var g = Math.floor(c / 10000), s = Math.floor(c / 100) % 100, k = c % 100, out = [];
    if (g) out.push('<span class="g">' + fmt(g) + "</span><i class=\"g\">g</i>");
    if (s || (g && k)) out.push('<span class="s">' + s + "</span><i class=\"s\">s</i>");
    if (k && g < 1000) out.push('<span class="c">' + k + "</span><i class=\"c\">c</i>");
    return '<span class="ah-money' + (dim ? " dim" : "") + '">' + out.join("") + "</span>";
  }
  function ago(iso) {
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (!isFinite(m)) return "";
    if (m < 2) return "just now"; if (m < 60) return m + " minutes ago";
    var h = Math.round(m / 60); return h + (h === 1 ? " hour ago" : " hours ago");
  }

  function load() {
    var bust = "?h=" + Math.floor(Date.now() / 600000);   // a fresh copy every 10 minutes
    var get = function (f) { return fetch(SRC + f + bust, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
    return Promise.all([get("auctions.json"), get("items.json").catch(function () { return {}; })]).then(function (r) { build(r[0], r[1]); })
      .catch(function () {
        return get("status.json").then(function (s) { wait(s && s.message); }, function () { wait(); });
      });
  }
  function wait(msg) {
    $(".ah-results").innerHTML = '<div class="ah-wait"><b>The Ministry is counting.</b>The auction house is read from Blizzard every hour, and the first count hasn\'t arrived yet. Come back soon.' +
      (msg ? '<p class="ah-note">Last word from the counting-house: ' + esc(msg) + "</p>" : "") + "</div>";
    $(".ah-bar").hidden = true;
  }

  function build(a, db) {
    var items = db.items || {}, pets = db.pets || {}, classes = db.classes || {}, subs = db.subclasses || {};
    var catCount = {};
    all = (a.rows || []).map(function (r) {
      var key = r[0], pet = typeof key === "string", it;
      var o = { kind: r[1], min: r[2], med: r[3], qty: r[4], lst: r[5] };
      if (pet) {
        var sp = key.slice(1); it = pets[sp];
        o.id = sp; o.name = it ? it[0] : "Battle Pet"; o.q = 3; o.icon = it ? it[1] : ""; o.cls = "pet"; o.cat = "Battle Pet";
        o.url = "https://www.wowhead.com/battle-pet/" + sp;
      } else {
        it = items[key];
        o.id = key; o.name = it ? it[0] : "Item " + key; o.q = it ? it[1] : 1; o.icon = it ? it[4] : "";
        o.cls = it && it[2] >= 0 ? String(it[2]) : "";
        o.cat = it ? (subs[it[2] + "." + it[3]] || classes[it[2]] || "") : "";
        o.url = "https://www.wowhead.com/item=" + key;
      }
      o.named = !!it;
      o.s = o.name.toLowerCase() + " " + o.cat.toLowerCase();
      if (o.cls) catCount[o.cls] = (catCount[o.cls] || 0) + 1;
      return o;
    });

    // header numbers
    var c = a.counts || {};
    $("[data-stat=listings]").textContent = fmt(c.realmAuctions);
    $("[data-stat=commodities]").textContent = fmt(c.commodityListings);
    $("[data-stat=items]").textContent = fmt(all.length);
    $("[data-stat=updated]").textContent = ago(a.updatedAt) || "–";
    $("[data-stat=updated]").title = new Date(a.updatedAt).toLocaleString();
    var realm = $("[data-realm]"); if (realm && a.realm) realm.textContent = a.realm;

    // tab counts and the category list
    var kc = [0, 0, 0]; all.forEach(function (o) { kc[o.kind]++; });
    root.querySelectorAll(".ah-tabs button").forEach(function (b) {
      var k = b.getAttribute("data-kind"), n = k === "all" ? all.length : kc[+k];
      b.querySelector("span").textContent = " " + fmt(n);
    });
    var sel = $("[data-cls]");
    Object.keys(catCount).sort(function (x, y) { return (classes[x] || "").localeCompare(classes[y] || ""); }).forEach(function (k) {
      if (!classes[k]) return;
      var op = document.createElement("option"); op.value = k; op.textContent = classes[k] + " (" + fmt(catCount[k]) + ")"; sel.appendChild(op);
    });
    var unnamed = all.filter(function (o) { return !o.named; }).length;
    if (unnamed) $(".ah-foot").insertAdjacentHTML("beforeend", "<p class=\"ah-note\">" + fmt(unnamed) + " items are still being identified; their names arrive over the next few hourly updates.</p>");
    $(".ah-bar").hidden = false;
    render();
  }

  function filtered() {
    var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var out = all.filter(function (o) {
      if (state.kind !== "all" && o.kind !== +state.kind) return false;
      if (state.cls && o.cls !== state.cls) return false;
      if (state.qual != null && o.q !== state.qual) return false;
      for (var i = 0; i < words.length; i++) if (o.s.indexOf(words[i]) === -1 && String(o.id) !== words[i]) return false;
      return true;
    });
    var k = state.sort, d = state.dir;
    out.sort(function (x, y) {
      if (k === "name") return d * x.name.localeCompare(y.name);
      var a = x[k], b = y[k];
      if (k === "min" || k === "med") { if (!a) return 1; if (!b) return -1; }   // no price goes last
      return d * (a - b) || x.name.localeCompare(y.name);
    });
    return out;
  }
  function render() {
    var list = filtered(), box = $(".ah-results");
    $(".ah-count").innerHTML = "<b>" + fmt(list.length) + "</b> " + (list.length === 1 ? "item" : "items");
    root.querySelectorAll(".ah-head button").forEach(function (b) {
      if (b.getAttribute("data-sort") === state.sort) b.setAttribute("aria-sort", state.dir > 0 ? "ascending" : "descending"); else b.removeAttribute("aria-sort");
    });
    if (!list.length) { box.innerHTML = '<div class="ah-empty"><b>Nothing for sale.</b>No listings match. Try fewer words, or another tab.</div>'; $(".ah-more").hidden = true; return; }
    box.innerHTML = '<ul class="ah-list">' + list.slice(0, shown).map(row).join("") + "</ul>";
    var more = $(".ah-more"); more.hidden = list.length <= shown;
    more.querySelector("button").textContent = "Show " + Math.min(PAGE, list.length - shown) + " more (" + fmt(list.length - shown) + " left)";
  }
  function row(o) {
    var ico = o.icon ? ' style="background-image:url(' + ICON + esc(o.icon) + '.jpg)"' : "";
    return '<li class="ah-item q' + o.q + '"><div class="ah-name"><span class="ah-ico"' + ico + '></span><a href="' + esc(o.url) + '" target="_blank" rel="noopener">' + esc(o.name) + "</a>" +
      (o.kind === 1 ? '<span class="ah-tag">Commodity</span>' : "") + "</div>" +
      '<div class="ah-cat">' + esc(o.cat || "–") + "</div>" +
      '<div class="r ah-min">' + money(o.min) + "</div>" +
      '<div class="r ah-med">' + money(o.med, true) + "</div>" +
      '<div class="r ah-num ah-qty">' + fmt(o.qty) + "</div>" +
      '<div class="r ah-num ah-lst">' + fmt(o.lst) + "</div></li>";
  }

  // controls
  var timer;
  $("[data-q]").addEventListener("input", function () { var v = this.value; clearTimeout(timer); timer = setTimeout(function () { state.q = v.trim(); shown = PAGE; render(); }, 140); });
  root.querySelectorAll(".ah-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      root.querySelectorAll(".ah-tabs button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      state.kind = b.getAttribute("data-kind"); shown = PAGE; render();
    });
  });
  $("[data-cls]").addEventListener("change", function () { state.cls = this.value; shown = PAGE; render(); });
  $("[data-sort-sel]").addEventListener("change", function () { var v = this.value.split(":"); state.sort = v[0]; state.dir = +v[1]; shown = PAGE; render(); });
  root.querySelectorAll(".ah-q button").forEach(function (b) {
    b.addEventListener("click", function () {
      var q = +b.getAttribute("data-q-val"), on = state.qual === q;
      root.querySelectorAll(".ah-q button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      state.qual = on ? null : q; if (!on) b.setAttribute("aria-pressed", "true"); shown = PAGE; render();
    });
  });
  root.querySelectorAll(".ah-head button").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-sort");
      if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = k === "name" || k === "min" || k === "med" ? 1 : -1; }
      var s = $("[data-sort-sel]"), want = state.sort + ":" + state.dir; if (s.querySelector('option[value="' + want + '"]')) s.value = want;
      shown = PAGE; render();
    });
  });
  $(".ah-more button").addEventListener("click", function () { shown += PAGE; render(); });
  // "/" jumps to the search box
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); e.stopPropagation(); $("[data-q]").focus(); }
  }, true);

  load();
})();
