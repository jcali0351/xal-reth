/* The Sacred Triangle — interactions. No storage, no network. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Whose hour is it ---------- */
  var hourEl = $("[data-st-hour]");
  function whoseHour(h) {
    if (h >= 21 || h < 4) return ["xalreth", "It is midnight's watch. <strong>Xal'Reth's hour</strong>. Be still."];
    if (h < 8) return [null, "It is dawn. No one's hour. <strong>Begin again.</strong>"];
    if (h < 15) return ["vyrenna", "It is near noon. <strong>Vyrenna's hour</strong>. Give something warm."];
    return ["nhalor", "It is toward dusk. <strong>Nhalor's hour</strong>. Set something down."];
  }
  function paintHour() {
    var w = whoseHour(new Date().getHours());
    if (hourEl) hourEl.innerHTML = w[1];
    $$(".st-panel").forEach(function (p) { p.classList.toggle("is-hour", p.dataset.deity === w[0]); });
  }
  paintHour();
  setInterval(paintHour, 60000);

  /* ---------- Triptych: parallax + mobile dots ---------- */
  var trip = $("[data-st-triptych]");
  if (trip) {
    var panels = $$(".st-panel", trip);
    if (!reduce && window.matchMedia("(hover: hover)").matches) {
      panels.forEach(function (p) {
        var img = p.querySelector("img");
        p.addEventListener("mousemove", function (e) {
          var r = p.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          img.style.setProperty("--px", (-x * 14).toFixed(1) + "px");
          img.style.setProperty("--py", (-y * 10).toFixed(1) + "px");
        });
        p.addEventListener("mouseleave", function () { img.style.setProperty("--px", "0px"); img.style.setProperty("--py", "0px"); });
      });
    }
    var dots = $$("[data-st-dots] button");
    function markDot() {
      var mid = trip.scrollLeft + trip.clientWidth / 2, best = 0, bd = 1e9;
      panels.forEach(function (p, i) { var c = p.offsetLeft + p.offsetWidth / 2, d = Math.abs(c - mid); if (d < bd) { bd = d; best = i; } });
      dots.forEach(function (d, i) { d.setAttribute("aria-current", i === best ? "true" : "false"); });
    }
    dots.forEach(function (d, i) { d.addEventListener("click", function () { panels[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" }); }); });
    trip.addEventListener("scroll", function () { window.requestAnimationFrame(markDot); }, { passive: true });
    // On phones, start on Xal'Reth in the middle.
    if (window.matchMedia("(max-width: 760px)").matches) {
      trip.scrollLeft = panels[1].offsetLeft - (trip.clientWidth - panels[1].offsetWidth) / 2;
    }
    markDot();
  }

  /* ---------- Virtue chips ---------- */
  $$("[data-st-deity]").forEach(function (d) {
    var gloss = $("[data-st-gloss]", d), base = gloss ? gloss.textContent : "";
    var chips = $$(".st-chip", d);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var on = c.getAttribute("aria-pressed") !== "true";
        chips.forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
        c.setAttribute("aria-pressed", on ? "true" : "false");
        gloss.textContent = on ? c.dataset.gloss : base;
        gloss.classList.toggle("dim", !on);
      });
    });
  });

  /* ---------- Tabs ---------- */
  var tabSeq = 0;
  $$("[data-st-tabs]").forEach(function (box) {
    var tabs = $$(".st-tab", box), panels = $$(".st-tabpanel", box);
    tabs.forEach(function (t, i) {
      var id = "st-t" + (++tabSeq);
      t.id = id; panels[i].id = id + "p";
      t.setAttribute("aria-controls", id + "p"); panels[i].setAttribute("aria-labelledby", id);
      panels[i].tabIndex = 0;
    });
    function select(i, focus) {
      tabs.forEach(function (t, j) { t.setAttribute("aria-selected", i === j ? "true" : "false"); t.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (e) {
        var n = tabs.length;
        if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % n, true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); select((i - 1 + n) % n, true); }
        if (e.key === "Home") { e.preventDefault(); select(0, true); }
        if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
      });
    });
    select(0);
  });

  /* ---------- Turn the Triangle ---------- */
  var T = $("[data-st-turning]");
  if (T) {
    var ITEMS = {
      coin: {
        hold: "You hold a gold coin. Not tightly. It sits in the open palm the way Xal'Reth holds the world: steady, without a grip.",
        give: "Vyrenna turns it into warmth. It buys a stranger's repair bill, or a round of feasts before the pull. It is no longer a coin. It is someone's evening.",
        release: "Nhalor takes the memory of it. You do not write it in a Ledger. You do not mention it in guild chat. The gift is forgotten, which is the last part of giving.",
        stop: { hold: "Stopped at the hold: the Hoarder. The coin stays, and so do you, slightly colder every day. The Grippers love you.", give: "Stopped at the gift: the Martyr. You gave the coin and kept the receipt, and now someone owes you, forever, in your head.", release: "Stopped at the release: the Drifter. You let the coin go, and the next one, and the one after, and now you have nothing left to give." }
      },
      friend: {
        hold: "You hold a friendship. You show up. You remember the name of their main. You hold it the way you hold water: in a cupped hand, not a fist.",
        give: "Vyrenna asks you to spend it. In a hard week, the friendship becomes a shelter: a summons, a quiet whisper, a run you did not need.",
        release: "Nhalor asks you to let it be what it is. They join another guild, or log off for a season. You wish them well and do not keep score.",
        stop: { hold: "Stopped at the hold: a friendship that is guarded but never used. It is safe. It is also very small.", give: "Stopped at the gift: a friendship that has become a debt. You counted every favor. They can feel it.", release: "Stopped at the release: you let go before you ever held. You have many acquaintances and no one to call." }
      },
      grudge: {
        hold: "You hold an old grudge. Be honest: you have been holding it a while. Xal'Reth does not mind you holding it. He minds how hard.",
        give: "Vyrenna does something strange with grudges. She warms them until you can see the hurt underneath, and then she gives the hurt a little kindness.",
        release: "Nhalor holds the door. You blow gently across your palm. The grudge goes into the Void, and you are, briefly, astonishingly light.",
        stop: { hold: "Stopped at the hold: the grudge becomes a Gripper, and feeds. It has been eating your evenings for years.", give: "Stopped at the gift: you are kind to the hurt but will not let it go. It becomes the story you tell about yourself.", release: "Stopped at the release: you said you forgave it, but you never really held it long enough to know what it was. It will be back." }
      },
      bag: {
        hold: "You hold a full bag. Every slot is taken. Most of it is grey. Some of it is 'for later'. Xal'Reth holds it with you, patiently, while you look at it.",
        give: "Vyrenna sends the good things to people who need them: the crafting mats to the new egg, the spare cloak to the alt who is cold.",
        release: "Nhalor vendors the rest. The bag has room now. Room, the Canon says, is where the next good thing arrives.",
        stop: { hold: "Stopped at the hold: the Untouched Slot. You will carry that grey item into the Unwrapping.", give: "Stopped at the gift: you mailed everything away and kept a list of who owes you a thank-you.", release: "Stopped at the release: you vendored the lot, including the thing you needed tomorrow. Nhalor winces. Gently." }
      },
      skill: {
        hold: "You hold something you know how to do: a rotation, a route, a recipe, a way of calming a raid. You hold it well, and keep practicing.",
        give: "Vyrenna asks you to teach it, slowly, to someone who does not know it yet, without sighing.",
        release: "Nhalor asks you to let them do it differently. It is theirs now. It might even be better.",
        stop: { hold: "Stopped at the hold: the gatekeeper. You know the thing and you guard it, and the guild is smaller for it.", give: "Stopped at the gift: you taught it, and now you correct everyone who does it any other way.", release: "Stopped at the release: you stopped practicing because you were 'letting go', and forgot how." }
      }
    };
    var ORDER = ["hold", "give", "release"];
    var POS = { hold: [150, 220], give: [60, 50], release: [240, 50] };
    var LABEL = { hold: "Xal'Reth · Hold", give: "Vyrenna · Give", release: "Nhalor · Release" };
    var item = "coin", step = 0, laps = 0;
    var orb = $("[data-orb]", T), stage = $("[data-stage]", T), text = $("[data-turn-text]", T), warn = $("[data-turn-warn]", T);
    var turnBtn = $("[data-turn]", T), stopBtn = $("[data-stop]", T);
    function paint() {
      var k = ORDER[step];
      orb.setAttribute("cx", POS[k][0]); orb.setAttribute("cy", POS[k][1]);
      $$(".node", T).forEach(function (n) { n.classList.toggle("on", n.dataset.node === k); });
      stage.textContent = LABEL[k];
      text.textContent = (laps > 0 && k === "hold") ? "And Xal'Reth holds again. The Void is full of room, and something new has arrived to be held. This is the Turning of the Three. Keep it turning." : ITEMS[item][k];
      warn.hidden = true;
      turnBtn.textContent = k === "release" ? "Return to the Coil" : "Turn";
    }
    turnBtn.addEventListener("click", function () { step = (step + 1) % 3; if (step === 0) laps++; paint(); });
    stopBtn.addEventListener("click", function () { warn.textContent = ITEMS[item].stop[ORDER[step]]; warn.hidden = false; });
    $$(".st-offer button", T).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".st-offer button", T).forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); item = b.dataset.item; step = 0; laps = 0; paint();
      });
    });
    paint();
  }

  /* ---------- The Reading of the Corners ---------- */
  var R = $("[data-st-reading]");
  if (R) {
    // Each answer leans on a corner: h = hold, g = give, r = release.
    var QS = [
      ["A guildmate asks to borrow gold. Your first instinct is to…", [["Check what you'll need it for first. It took a while to save.", "h"], ["Send it before they finish asking. And a little extra.", "g"], ["Shrug. Gold comes and goes. Send it and forget it.", "r"]]],
      ["Your bags are full. You…", [["Make room. Everything in there might be useful someday.", "h"], ["Mail the good bits to alts and friends who could use them.", "g"], ["Vendor everything grey without reading the tooltips.", "r"]]],
      ["A raid night goes badly. Afterward you…", [["Replay every pull in your head until you find the mistake.", "h"], ["Whisper the healer to say they did great. Then the tank.", "g"], ["Log off and sleep. Tomorrow is another reset.", "r"]]],
      ["Someone wronged you a long time ago. Today, that memory…", [["Is still filed exactly where you left it.", "h"], ["Has softened. You'd help them if they asked.", "g"], ["What memory?", "r"]]],
      ["When you are tired, you most often…", [["Push through. Someone has to hold the line.", "h"], ["Keep helping anyway, even if no one asked.", "g"], ["Disappear for a few days without telling anyone.", "r"]]]
    ];
    var NEED = {
      h: { who: "xalreth", name: "Xal'Reth the Eternal", body: "You give freely and you let go easily, which is lovely, and also why you sometimes have nothing left. The corner you have been forgetting is the low one. Xal'Reth asks you to hold something steadily for a while: a routine, a friendship, a small sum of gold you will not spend this week.", practice: "At midnight, cup your hands low and do nothing for one breath. Then keep one promise to yourself, all the way to the end." },
      g: { who: "vyrenna", name: "Vyrenna the Radiant", body: "You hold well and you know how to let go, but the middle step keeps getting skipped. The corner you have been forgetting is warmth. Vyrenna asks you to turn what you are holding into someone else's good evening before you release it.", practice: "At noon, open your palm and give one warm thing away: a meal, a cloak, a summons, a kind word to a healer." },
      r: { who: "nhalor", name: "Nhalor the Veiled", body: "You hold steadily and you give generously, and you are carrying all of it still: every favor, every sacrifice, every slot. The corner you have been forgetting is the open door. Nhalor asks you to set one thing down and not pick it back up.", practice: "At dusk, open your hands palms down and say: What I held today, I set down. Then forgive one name, quietly." },
      even: { who: "xalreth", name: "All three, in balance", body: "Your answers leaned on no corner more than another. The Inner Scale is mildly suspicious, but also pleased. You are, at this moment, turning. The Eye sees you and does not blink.", practice: "Keep the Turning going: at noon give, at dusk release, at midnight be still, at dawn begin again." }
    };
    var body = $("[data-reading-body]", R), qi = 0, score = { h: 0, g: 0, r: 0 };
    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function start() {
      body.innerHTML = '<div style="text-align:center"><button class="btn" type="button" data-begin>Begin the Reading</button></div>';
      $("[data-begin]", body).addEventListener("click", function () { qi = 0; score = { h: 0, g: 0, r: 0 }; ask(); });
    }
    function ask() {
      var q = QS[qi];
      var prog = QS.map(function (_, i) { return '<span class="' + (i < qi ? "done" : "") + '"></span>'; }).join("");
      // shuffle answer order so the corner isn't always in the same slot
      var ans = q[1].slice();
      for (var i = ans.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = ans[i]; ans[i] = ans[j]; ans[j] = t; }
      body.innerHTML = '<div class="st-progress" aria-label="Question ' + (qi + 1) + ' of ' + QS.length + '">' + prog + '</div>' +
        '<p class="st-q">' + esc(q[0]) + '</p><div class="st-answers">' +
        ans.map(function (a) { return '<button class="st-ans" type="button" data-c="' + a[1] + '">' + esc(a[0]) + '</button>'; }).join("") + '</div>';
      $$(".st-ans", body).forEach(function (b) {
        b.addEventListener("click", function () { score[b.dataset.c]++; qi++; if (qi < QS.length) ask(); else result(); });
      });
      var first = $(".st-ans", body); if (first && qi > 0) first.focus({ preventScroll: true });
    }
    function result() {
      // The corner you need is the one you leaned on least.
      var keys = ["h", "g", "r"], min = Math.min(score.h, score.g, score.r), max = Math.max(score.h, score.g, score.r);
      var lows = keys.filter(function (k) { return score[k] === min; });
      var n = (max - min <= 1 && lows.length > 1) || lows.length === 3 ? NEED.even : NEED[lows[0]];
      var lean = keys.filter(function (k) { return score[k] === max; }).map(function (k) { return { h: "holding", g: "giving", r: "releasing" }[k]; }).join(" and ");
      body.innerHTML = '<div class="st-result" aria-live="polite"><img src="img/triangle/' + n.who + '-sm.webp" alt="" width="140" height="210">' +
        '<p class="eyebrow">You have been leaning on ' + lean + '</p><h3>The corner you need: ' + esc(n.name) + '</h3>' +
        '<p>' + esc(n.body) + '</p><p><em>' + esc(n.practice) + '</em></p>' +
        '<p class="muted">The Reading changes as you do. Nothing was saved.</p>' +
        '<div class="btn-row"><a class="btn ghost" href="#' + n.who + '">Read about ' + esc(n.name.split(" ")[0]) + '</a><button class="btn" type="button" data-again>Read again</button></div></div>';
      $("[data-again]", body).addEventListener("click", function () { qi = 0; score = { h: 0, g: 0, r: 0 }; ask(); });
    }
    start();
  }

  /* ---------- Pray the Triangle ---------- */
  var P = $("[data-st-prayer]");
  if (P) {
    var LINES = [
      ["Hands cupped, low", "Xal'Reth, hold us.", "var(--xr)"],
      ["Hands open, palms up", "Vyrenna, warm us.", "var(--vy)"],
      ["Hands open, palms down", "Nhalor, free us.", "var(--nh)"],
      ["Hands together", "Three in one coil.", "var(--bone)"],
      ["Bow", "Glory to Xal'Reth.", "var(--gold)"]
    ];
    var g = $("[data-gesture]", P), l = $("[data-line]", P), b = $("[data-pray]", P), i = -1;
    b.addEventListener("click", function () {
      i++;
      if (i >= LINES.length) { i = -1; g.textContent = "The prayer is finished"; l.textContent = "Hold light. And let go well."; l.style.color = ""; b.textContent = "Pray again"; return; }
      g.textContent = LINES[i][0]; l.textContent = LINES[i][1]; l.style.color = LINES[i][2];
      b.textContent = i === LINES.length - 1 ? "Amen" : "Next";
    });
  }
})();
