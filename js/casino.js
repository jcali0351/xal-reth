/* The Xal'Reth Casino (casino.html): the Void Machine. Every spin is rolled by the Faces server (tools/social-worker,
   /casino/*) after a Battle.net sign-in; this page only animates the result. Needs js/coil-faces.js and js/faces-social.js. */
(function () {
  "use strict";
  var S = window.CoilSocial;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SYMBOLS = ["flame", "crystal", "triangle", "crown", "serpent", "eye"];
  var NAMES = { eye: "Xal'Reth Eye", crystal: "Void Crystal", triangle: "Sacred Triangle", crown: "Cosmic Crown", serpent: "Serpent Sigil", flame: "Purple Flame" };
  var PAYS = [["eye", "THE WEEKLY JACKPOT"], ["serpent", 120], ["crown", 80], ["triangle", 50], ["crystal", 30], ["flame", 20]];
  var CELL = 110, state = null, busy = false, as = null;

  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function icon(id, cls) { return '<svg class="' + (cls || "cz-sym") + '" viewBox="0 0 64 64" role="img" aria-label="' + esc(NAMES[id]) + '"><use href="#cz-' + id + '"/></svg>'; }
  function nameOf(key) {
    var f = state && state.faces && state.faces[key];
    var d = f && f.details ? (typeof f.details === "string" ? JSON.parse(f.details || "{}") : f.details) : {};
    if (d.icName) return d.icName;
    var n = String(key || "").split("/").pop() || "Someone";
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  function fmt(n) { return (n || 0).toLocaleString("en-US"); }

  /* ------------------------------------------------------------ sound: small synthesised effects, no files */
  var audio = null, soundOn = read("xr-casino-sound") !== "off";
  function ctx() { if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } } return audio; }
  function tone(freq, dur, type, vol, when) {
    if (!soundOn) return;
    var a = ctx(); if (!a) return;
    var t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var sfx = {
    lever: function () { tone(140, 0.25, "sawtooth", 0.05); tone(90, 0.3, "triangle", 0.06, 0.08); },
    tick: function () { tone(1200 + Math.random() * 300, 0.03, "square", 0.015); },
    stop: function () { tone(180, 0.12, "triangle", 0.09); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, "triangle", 0.07, i * 0.09); }); },
    small: function () { tone(660, 0.15, "sine", 0.06); tone(880, 0.2, "sine", 0.05, 0.1); },
    lose: function () { tone(220, 0.35, "sine", 0.04); tone(165, 0.45, "sine", 0.04, 0.12); },
    jackpot: function () {
      [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.5, "sawtooth", 0.04, i * 0.12); tone(f / 2, 0.6, "sine", 0.05, i * 0.12); });
      tone(55, 2.2, "sine", 0.12, 0.2);
    },
  };

  /* ------------------------------------------------------------ sparks */
  var canvas = $(".cz-sparks"), parts = [], raf = 0;
  function burst(n, colors, power) {
    if (reduce || !canvas) return;
    var r = canvas.getBoundingClientRect();
    canvas.width = r.width * devicePixelRatio; canvas.height = r.height * devicePixelRatio;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (2 + Math.random() * 6) * (power || 1);
      parts.push({ x: r.width / 2, y: r.height * 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, life: 1, c: colors[i % colors.length], s: 2 + Math.random() * 4 });
    }
    if (!raf) raf = requestAnimationFrame(draw);
  }
  function draw() {
    var g = canvas.getContext("2d"), dpr = devicePixelRatio;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.012;
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill();
    });
    raf = parts.length ? requestAnimationFrame(draw) : 0;
    if (!raf) g.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ------------------------------------------------------------ the reels */
  var reels = [].slice.call(document.querySelectorAll(".cz-reel"));
  function fill(strip, list) { strip.innerHTML = list.map(function (s) { return '<div class="cz-cell" data-s="' + s + '">' + icon(s) + "</div>"; }).join(""); }
  function randomSym() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; }
  // the window shows three rows; the middle one sits on the payline
  reels.forEach(function (r) { r.current = randomSym(); fill($(".cz-strip", r), [randomSym(), r.current, randomSym()]); $(".cz-strip", r).style.transform = "translateY(0)"; });

  // spin the reels to the server's result; resolves when the last reel stops
  function animate(result) {
    return new Promise(function (done) {
      if (reduce) {
        reels.forEach(function (r, i) { r.current = result[i]; fill($(".cz-strip", r), [randomSym(), result[i], randomSym()]); $(".cz-strip", r).style.transform = "translateY(0)"; });
        setTimeout(done, 200); return;
      }
      var left = reels.length;
      reels.forEach(function (r, i) {
        var strip = $(".cz-strip", r), n = 26 + i * 7, list = [];
        for (var k = 0; k < n; k++) list.push(randomSym());
        list.push(result[i]); list.push(randomSym());
        // the symbol on the payline now stays there for the start, so the reel turns from where it was
        list.unshift(r.current || randomSym()); list.unshift(randomSym());
        r.current = result[i];
        fill(strip, list);
        strip.style.transition = "none";
        strip.style.transform = "translateY(0)";
        strip.getBoundingClientRect();
        var dur = 1.5 + i * 0.55;
        strip.style.transition = "transform " + dur + "s cubic-bezier(.12,.62,.18,1.02)";
        var cell = (strip.firstElementChild && strip.firstElementChild.getBoundingClientRect().height) || CELL; // phones show smaller cells
        strip.style.transform = "translateY(" + (-(list.length - 3) * cell) + "px)";
        r.classList.add("spinning");
        var ticks = setInterval(sfx.tick, 70);
        setTimeout(function () {
          clearInterval(ticks); r.classList.remove("spinning"); r.classList.add("landed");
          setTimeout(function () { r.classList.remove("landed"); }, 400);
          sfx.stop();
          if (--left === 0) done();
        }, dur * 1000);
      });
    });
  }

  /* ------------------------------------------------------------ talking to the server */
  function api(path, opts) { return S.api(path, opts); }
  function load() {
    return api("/casino/state").then(function (d) { state = d; render(); }).catch(function (e) {
      $("[data-account]").innerHTML = '<p class="cz-muted">The Void Machine can\'t be reached right now. ' + esc(e.message) + "</p>";
    });
  }

  function spin() {
    if (busy || !state || !state.me || !state.me.canSpin) return;
    busy = true;
    $("[data-spin]").disabled = true; $("[data-lever]").disabled = true;
    var lever = $("[data-lever]"); lever.classList.remove("pulled"); lever.getBoundingClientRect(); lever.classList.add("pulled");
    sfx.lever();
    message("The reels turn in the dark…");
    api("/casino/spin", { method: "POST", body: { as: as } }).then(function (r) {
      return animate(r.reels).then(function () { reveal(r); });
    }).catch(function (e) {
      message(e.message, "bad");
    }).then(function () { busy = false; load(); });
  }

  var revealedAt = 0;
  function reveal(r) {
    revealedAt = Date.now();
    var m = $("#machine");
    m.classList.remove("win", "big", "gaze");
    if (r.kind === "jackpot") {
      m.classList.add("gaze");
      sfx.jackpot();
      burst(160, ["#ffd24a", "#fff3b0", "#a66bff", "#e9d5ff"], 1.6);
      message("THE ETERNAL GAZE FALLS UPON YOU. " + fmt(r.prize) + " tokens!", "jackpot");
      var g = $("[data-gaze]");
      $("[data-gaze-text]").textContent = "Three Eyes open as one. The weekly jackpot of " + fmt(r.prize) + " tokens is yours, and a ticket is already waiting for an officer.";
      g.hidden = false; $("[data-gaze-close]").focus();
    } else if (r.prize > 0) {
      m.classList.add(r.prize >= 50 ? "big" : "win");
      (r.prize >= 30 ? sfx.win : sfx.small)();
      burst(r.prize >= 50 ? 90 : 36, ["#ffd24a", "#a66bff", "#fff"], r.prize >= 50 ? 1.2 : 0.8);
      var how = r.kind === "triple" ? "Three of a kind!" : r.kind === "pair" ? "A pair of omens." : "A single Eye watches over you.";
      message(how + " +" + fmt(r.prize) + " tokens" + (r.bonus ? " (lucky streak +" + r.bonus + "%)" : "") + ".", "good");
    } else {
      sfx.lose();
      message("The Void keeps its counsel today. Come back tomorrow.", "");
    }
    if (r.achievements && r.achievements.length) toast("Achievement: " + r.achievements.join(", "));
    setTimeout(function () { m.classList.remove("win", "big"); }, 2600);
  }

  function message(t, kind) { var el = $("[data-message]"); el.textContent = t; el.className = "cz-message" + (kind ? " " + kind : ""); }
  function toast(t) {
    var el = document.createElement("div"); el.className = "cz-toast"; el.textContent = t; document.body.appendChild(el);
    setTimeout(function () { el.classList.add("out"); }, 3200); setTimeout(function () { el.remove(); }, 3800);
  }

  /* ------------------------------------------------------------ drawing the page */
  function countdown() {
    var el = $("[data-countdown]");
    if (!state || !el) return;
    var ms = state.nextDay - Date.now();
    if (ms <= 0) { el.textContent = "A new day: spin again."; return; }
    var h = Math.floor(ms / 3600e3), m = Math.floor(ms % 3600e3 / 60e3), s = Math.floor(ms % 60e3 / 1000);
    el.textContent = (state.me && !state.me.canSpin ? "Next spin in " : "The day turns in ") + h + "h " + (m < 10 ? "0" : "") + m + "m " + (s < 10 ? "0" : "") + s + "s";
  }

  function render() {
    var d = state;
    // the jackpot
    var jp = d.jackpot || {};
    $("[data-jackpot]").textContent = fmt(jp.pool);
    $("[data-jackpot-note]").textContent = jp.winner ? "claimed this week by " + nameOf(jp.winner) + " · a new pool opens Monday" : "tokens · three Eyes take it all";
    $("[data-min]").textContent = d.redeemMin;
    // the account box
    var acct = $("[data-account]");
    if (!S || !S.on) {
      acct.innerHTML = '<p class="cz-muted">The Void Machine opens when the Faces of the Coil are connected.</p>';
    } else if (!d.me) {
      acct.innerHTML = '<h2>Take a seat</h2><p class="cz-muted">Sign in with Battle.net to spin. Only characters on the guild roster may play, one free spin a day for each account. Nothing about your Battle.net account is shown.</p>' +
        '<a class="btn big" href="' + esc(S.signInUrl()) + '">Sign in with Battle.net</a>';
    } else {
      var chars = d.me.chars || [];
      if (!as || !chars.some(function (c) { return c.key === as; })) as = (read("xr-casino-as") && chars.some(function (c) { return c.key === read("xr-casino-as"); })) ? read("xr-casino-as") : (chars[0] && chars[0].key);
      acct.innerHTML = '<label class="cz-as">Playing as <select data-as>' + chars.map(function (c) {
        return '<option value="' + esc(c.key) + '"' + (c.key === as ? " selected" : "") + ">" + esc(c.name) + "</option>";
      }).join("") + '</select></label><button type="button" class="cz-link" data-out>Sign out</button>';
      $("[data-as]", acct).addEventListener("change", function () { as = this.value; store("xr-casino-as", as); });
      $("[data-out]", acct).addEventListener("click", S.signOut);
    }
    // wallet, tickets, achievements
    var me = d.me, w = me && me.wallet;
    var wal = $("[data-wallet]"), red = $("[data-redeem]"), ach = $("[data-achievements]");
    wal.hidden = red.hidden = ach.hidden = !me;
    if (me) {
      wal.innerHTML = '<div class="cz-tokens"><span>Xal Tokens</span><b>' + fmt(w ? w.tokens : 0) + "</b></div>" +
        '<dl class="cz-stats"><div><dt>Spins</dt><dd>' + fmt(w ? w.spins : 0) + "</dd></div><div><dt>Streak</dt><dd>" + (w ? w.streak : 0) + " day" + (w && w.streak === 1 ? "" : "s") + "</dd></div>" +
        "<div><dt>Best win</dt><dd>" + fmt(w ? w.best_win : 0) + "</dd></div><div><dt>Won in all</dt><dd>" + fmt(w ? w.total_won : 0) + "</dd></div>" +
        "<div><dt>Jackpots</dt><dd>" + (w ? w.jackpots : 0) + "</dd></div><div><dt>Best streak</dt><dd>" + (w ? w.best_streak : 0) + "</dd></div></dl>";
      var amt = $("[data-amount]"); amt.max = w ? w.tokens : 0;
      var tickets = me.tickets || [];
      $("[data-tickets]").innerHTML = tickets.length ? '<h3>Your tickets</h3><ul class="cz-tickets">' + tickets.map(function (t) {
        return '<li class="' + esc(t.status) + '"><code>' + esc(t.id) + "</code><span>" + fmt(t.amount) + " tokens" + (t.kind === "jackpot" ? " · jackpot" : "") + "</span><em>" +
          esc(t.status === "open" ? "waiting for an officer" : t.status === "fulfilled" ? "fulfilled" + (t.note ? ": " + t.note : "") : "void" + (t.note ? ": " + t.note : "")) + "</em></li>";
      }).join("") + "</ul>" : "";
      var got = (w && w.achievements) || {};
      ach.innerHTML = "<h2>Achievements</h2><ul class=\"cz-ach\">" + Object.keys(d.achievementNames).map(function (k) {
        return '<li class="' + (got[k] ? "got" : "") + '">' + esc(d.achievementNames[k]) + "</li>";
      }).join("") + "</ul>";
    }
    var can = !!(me && me.canSpin && as);
    $("[data-spin]").disabled = !can || busy; $("[data-lever]").disabled = !can || busy;
    if (!busy && Date.now() - revealedAt > 15000) { // the result of a spin stays on screen for a while
      if (me && !me.canSpin) message("You have had today's spin. The Void turns again at midnight (UTC).");
      else if (me && can) message("Pull the lever, " + nameOf(as) + ". The Void is listening.");
    }
    // Hall of Fortune
    var leaders = d.leaders || [];
    $("[data-leaders]").innerHTML = leaders.length ? leaders.map(function (l, i) {
      return '<li><span class="cz-rank">' + (i + 1) + '</span><a href="character.html?c=' + encodeURIComponent(l.char_key) + '">' + esc(nameOf(l.char_key)) + "</a>" +
        "<b>" + fmt(l.total_won) + "</b><small>best " + fmt(l.best_win) + (l.jackpots ? " · " + l.jackpots + " jackpot" + (l.jackpots > 1 ? "s" : "") : "") + "</small></li>";
    }).join("") : '<li class="cz-muted">Nobody has spun yet. Be the first.</li>';
    var recent = d.recent || [];
    $("[data-recent]").innerHTML = recent.length ? recent.map(function (r) {
      return "<li>" + r.reels.split(",").map(function (s) { return icon(s, "cz-mini"); }).join("") + " <b>" + esc(nameOf(r.char_key)) + "</b> won " + fmt(r.prize) + "</li>";
    }).join("") : '<li class="cz-muted">The Void is quiet.</li>';
    var jps = d.jackpots || [];
    $("[data-jackpots]").innerHTML = jps.length ? jps.map(function (j) {
      return "<li>" + icon("eye", "cz-mini") + " <b>" + esc(nameOf(j.winner)) + "</b> · " + fmt(j.pool) + " tokens · " + new Date(j.won_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + "</li>";
    }).join("") : '<li class="cz-muted">No one, yet.</li>';
    $("[data-today]").textContent = fmt(d.spinsToday) + " spin" + (d.spinsToday === 1 ? "" : "s") + " today.";
    countdown();
  }

  // the paytable (the same numbers the server uses)
  $("[data-pays]").innerHTML = PAYS.map(function (p) {
    return '<div class="cz-pay' + (p[0] === "eye" ? " jackpot" : "") + '"><span>' + icon(p[0]) + icon(p[0]) + icon(p[0]) + "</span><b>" +
      (typeof p[1] === "number" ? p[1] + " tokens" : p[1]) + "</b><small>" + esc(NAMES[p[0]]) + "</small></div>";
  }).join("") +
    '<div class="cz-pay"><span>' + icon("eye") + icon("eye") + '<svg class="cz-sym ghost" viewBox="0 0 64 64"></svg></span><b>15 tokens</b><small>Two Eyes anywhere</small></div>' +
    '<div class="cz-pay"><span>' + icon("crown") + icon("crown") + '<svg class="cz-sym ghost" viewBox="0 0 64 64"></svg></span><b>5 tokens</b><small>Any pair</small></div>' +
    '<div class="cz-pay"><span>' + icon("eye") + '<svg class="cz-sym ghost" viewBox="0 0 64 64"></svg><svg class="cz-sym ghost" viewBox="0 0 64 64"></svg></span><b>2 tokens</b><small>One Eye</small></div>';

  /* ------------------------------------------------------------ wiring */
  $("[data-spin]").addEventListener("click", spin);
  $("[data-lever]").addEventListener("click", spin);
  var snd = $("[data-sound]");
  function soundLabel() { snd.textContent = soundOn ? "Sound on" : "Sound off"; snd.setAttribute("aria-pressed", String(soundOn)); }
  snd.addEventListener("click", function () { soundOn = !soundOn; store("xr-casino-sound", soundOn ? "on" : "off"); soundLabel(); if (soundOn) sfx.small(); });
  soundLabel();
  $("[data-gaze-close]").addEventListener("click", function () { $("[data-gaze]").hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("[data-gaze]").hidden = true; });
  $("[data-redeem-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var amount = parseInt($("[data-amount]").value, 10) || 0;
    var btn = this.querySelector("button"); btn.disabled = true;
    api("/casino/redeem", { method: "POST", body: { as: as, amount: amount } }).then(function (r) {
      toast("Ticket " + r.ticket.id + " made for " + fmt(r.ticket.amount) + " tokens. Show it to an officer.");
      sfx.win();
      return load();
    }).catch(function (err) { toast(err.message); }).then(function () { btn.disabled = false; });
  });
  setInterval(countdown, 1000);
  if (S && S.on) load(); else { state = { jackpot: { pool: 500 }, redeemMin: 100, achievementNames: {}, leaders: [], recent: [], jackpots: [], spinsToday: 0, nextDay: Date.now() }; render(); }
})();
