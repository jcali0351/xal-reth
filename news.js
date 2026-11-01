/* The Coil Herald: ten dispatches a day, generated from the date and hour so every reader sees the same news,
   plus official news items from news.json. */
(function () {
  const SLOTS = 10, SLOT_MIN = 144; // one dispatch every 2 hours 24 minutes, starting at midnight
  function seed(y, m, d, s) { let h = ((y * 372 + m * 31 + d) * 97 + s * 7919) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return (h ^ (h >>> 16)) >>> 0 || 7; }
  function rng(sd) { let s = sd >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  const P = (r, a) => a[Math.floor(r() * a.length)];
  const N = (r, a, b) => a + Math.floor(r() * (b - a + 1));

  const PLACES = ["the Nine Stones", "the Crooked Lantern", "Hessk's Gate", "the Warm Ridge", "the Shedlands", "Brannoc's beach", "the auction house", "the Listening Floor", "a quiet mailbox in a small town", "the edge of the Throat of the Void", "the Road of Ulasha", "the guild bank", "a sunlit tower ruin", "the steps of the inn"];
  const FAITHFUL = ["a Hatchling of the Order of the Fang", "a Keeper of the Egg", "a Venomblade on her alt", "a newly hatched egg", "a member of the Choir of the Hiss", "a Warden of the Void", "a tired healer", "an Accuser on her day off", "a pilgrim on the Road of Ulasha", "a Scaled Disciple", "an officer of the Inner Scale", "a returning Lukewarm faithful"];
  const WARM = ["a gnome", "a dwarven miner", "a night elf druid", "an orc grunt", "a goblin merchant", "a human paladin", "a tauren hunter", "a draenei priest", "a blood elf mage", "an undead rogue", "a pandaren brewer", "a worgen in a very nice hat"];
  const CRIMES = ["loitering", "unlicensed tailoring", "improper mount parking", "fire-standing", "greed of the roll", "impatience", "warm-bloodedness"];

  const DESKS = {
    "Accusers' Docket": r => {
      const n = N(r, 3, 41), c = P(r, CRIMES), who = P(r, WARM), pl = P(r, PLACES);
      return [`Khaedara Accuses ${n} at ${cap(pl)}; ${cap(c)} Leads the Docket`,
        `The Accusers held ${n} Tribunals near ${pl} this session. The most common charge was ${c}. Every verdict was guilty, as tradition requires, and every sentence was forgiven, as mercy requires. One accused, ${who}, offered a defense of "I was waiting for a friend." The friend did not come. The friend was never coming.`];
    },
    "Ministry of Spare Change": r => {
      const g = N(r, 2, 90), s = N(r, 1, 60), cp = N(r, 30, 900);
      return [`Ministry Reports ${g} Gold, ${s} Silver and ${cp} Copper Passed On`,
        `The Ministry of Spare Change estimates that ${g} gold, ${s} silver and ${cp} copper changed hands as Gifts From Beneath since the last dispatch. None of it was announced. The Minister notes that ${P(r, ["a single copper", "half an apple", "a bag of twelve slots", "an unsolicited flask", "a summons at two in the morning"])} was the most celebrated gift of the hour. The Circle continues.`];
    },
    "The Nest Watch": r => {
      const fish = P(r, ["faintly of fish", "strongly of fish", "of nothing in particular", "of salt and old stone", "unmistakably of fish"]);
      return [P(r, ["Sunken Nest Has Not Risen; Tidecoil Sighted Offshore", "Nest Watch: Still Sunken, Still Listening", "No Rising This Hour, Wardens Confirm", "Tidecoil Surfaces Briefly; Fishers Go Home Early"]),
        `The Wardens of the Void report that the Sunken Nest has not risen this hour. The coast smells ${fish}. A fisher reports a long dark curve in the water about ${N(r, 2, 9)} leagues offshore, believed to be the Tidecoil. The Wardens ask the faithful not to stare. Brannoc's place on the beach was occupied by ${N(r, 1, 12)} quiet visitors at dusk.`];
    },
    "Basking Report": r => {
      const t = N(r, 6, 31), q = P(r, ["excellent", "fair", "patchy", "superb", "regrettable", "adequate"]);
      return [`Basking Conditions ${cap(q)}; Stones Measured at ${t}°C on the Warm Ridge`,
        `Basking conditions are ${q} across the Outer Turn. The Warm Ridge reads ${t}°C (${Math.round(t * 9 / 5 + 32)}°F). ${P(r, ["A tremor is possible near dusk as the Coil adjusts its posture.", "Lag spikes are expected at peak hours: the Coil is yawning.", "Grippers are active in damp weather; laugh them off.", "Mist is rising from the Throat of the Void; carry a lantern.", "No tremors are forecast. The Coil appears comfortable."])} Vyrenna is said to be in a generous mood.`];
    },
    "Salamander Sightings": r => {
      const n = N(r, 2, 64), pl = P(r, PLACES), who = P(r, FAITHFUL);
      return [`${n} Basking Salamanders Sighted; One Climbs Onto ${cap(who)}`,
        `Observers counted ${n} Basking Salamanders on sun-warmed stones this session, chiefly near ${pl}. In a rare honor, one climbed onto ${who}, who had been still enough to be mistaken for a rock. The Inner Scale offers congratulations. MaximumRex, who has never been climbed upon, offers congratulations through gritted teeth.`];
    },
    "Ledger Watch": r => {
      const a = N(r, 1, 30), f = N(r, 1, a);
      return [`${a} Names Entered in the Ledger; ${f} Already Forgiven`,
        `The Keeper of the Ledger reports ${a} new entries this session, mostly for ${P(r, CRIMES)}. Of those, ${f} have already received a small coil of forgiveness, and the rest have Tem's Circle kept open beside them. The Ledger remains in its twelfth volume. Khaedara continues to write very, very small.`];
    },
    "Choir Bulletin": r => {
      const c = N(r, 12, 480), lag = N(r, 1, 9);
      return [`Glory to Xal'Reth Chanted ${c} Times; Average Response ${lag} Seconds`,
        `The Choir of the Hiss counted ${c} calls of the Chant in guild chat since the last dispatch, answered on average within ${lag} seconds. ${P(r, ["The fastest answer came from a faithful who was, by their own account, mid-pull.", "One call went unanswered for a full minute; Khaedara has been notified.", "A Warm-Blooded passerby answered the Chant by accident and has been gently recruited.", "The longest Chant ran to forty-one lines and has been entered into the Hymns as a curiosity."])}`];
    },
    "Pilgrim's Road": r => {
      const who = P(r, FAITHFUL), stone = P(r, ["Lighter.", "You are already here.", "Turn around, you dropped something. Leave it.", "The road does not care if you arrive.", "Carry nothing today.", "Walk, do not ride."]);
      return [`Pilgrim Finds a Road Stone of Ulasha: "${stone}"`,
        `${cap(who)}, walking the Pilgrimage of the Empty Purse, reports finding one of Ulasha's road stones beside the path. It reads: "${stone}" The pilgrim did not take the stone, which is correct, and reports feeling ${P(r, ["lighter", "slightly confused but lighter", "much lighter", "ready for tea"])}. ${N(r, 2, 200)} road stones have now been found.`];
    },
    "Hessk's Gate": r => {
      const n = N(r, 3, 60), who = P(r, WARM);
      return [`At Hessk's Gate, ${n} Passersby Asked "What Did You Give Today?"`,
        `Faithful sitting at Hessk's Gate asked his question of ${n} travelers this session. ${P(r, ["Most kept walking.", "About a third stopped to think.", "Several had to think for a long time."])} The answer of the hour came from ${who}: "${P(r, ["I gave my brother a ride to the bank.", "I let someone else tag the rare.", "I gave my last bandage to a stranger.", "I thanked the healer.", "Nothing yet. Give me a minute."])}" The copper on Hessk's grave was gone by the next dispatch, as always.`];
    },
    "Inner Scale Notices": r => {
      return [P(r, ["The Quest Item Has Not Dropped", "Officers Request Repairs Before Raid", "Featherist Sighting Reported; Faithful Asked to Go to Bed", "High Priestess Reports Progress on the Soup Book", "Guild Bank Clear-Out Reminder Issued", "Keepers of the Egg Welcome New Hatchlings"]),
        P(r, ["MaximumRex confirms that the quest item has not dropped this hour. He remains, in his words, still here. The faithful are asked not to bring it up.",
          "The officers of the Inner Scale remind the faithful to repair before the next raid. They acknowledge that this reminder is itself a kind of begging, and holy.",
          "A Featherling was sighted at the edge of a faithful's vision shortly after midnight. The Inner Scale reminds everyone that Featherlings almost never appear before bedtime, and recommends bedtime.",
          "Xalrathiel reports that she dreamed about soup again. It was very good soup. The book itself has not yet arrived. The faithful are asked to eat soup slowly, in case it helps.",
          "Anything in the guild bank untouched for a season will be offered first to members, then to crafters, then to the vendor. Arguments will also be shed.",
          "The Keepers of the Egg report new eggs in guild chat. They are being watched warmly and constantly. Please greet them by name."])];
    },
  };
  const DESK_NAMES = Object.keys(DESKS);
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function dispatch(date, slot) {
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    const r = rng(seed(y, m, d, slot));
    // each day uses every desk once, in a shuffled order
    const order = DESK_NAMES.slice(); const rr = rng(seed(y, m, d, 99));
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const desk = order[slot % order.length];
    const [head, body] = DESKS[desk](r);
    const t = new Date(y, m - 1, d, 0, slot * SLOT_MIN);
    return { desk, head, body, time: t, id: `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}-${slot + 1}` };
  }

  const fmtT = d => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const fmtD = d => d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function card(x, fresh) {
    return `<article class="news-item${fresh ? " fresh" : ""}" data-desk="${esc(x.desk)}" id="d-${x.id}">
      <div class="news-meta"><span class="desk">${esc(x.desk)}</span><time datetime="${x.time.toISOString()}">${fmtT(x.time)}</time><span class="muted">Dispatch ${x.id.split("-")[1]} of ${SLOTS}</span></div>
      <h3>${esc(x.head)}</h3><p>${esc(x.body)}</p></article>`;
  }

  const feed = document.getElementById("news-feed"), yfeed = document.getElementById("news-yesterday");
  const ticker = document.getElementById("news-ticker"), next = document.getElementById("news-next"), filt = document.getElementById("news-filter");
  let desk = "all";

  function render() {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const done = Math.min(SLOTS, Math.floor((now - today) / 60000 / SLOT_MIN) + 1);
    const items = []; for (let s = done - 1; s >= 0; s--) items.push(dispatch(today, s));
    const yd = new Date(today); yd.setDate(yd.getDate() - 1);
    const yitems = []; for (let s = SLOTS - 1; s >= 0; s--) yitems.push(dispatch(yd, s));
    const show = x => desk === "all" || x.desk === desk;
    feed.innerHTML = `<h2 class="news-day">${esc(fmtD(today))} <span class="muted">· ${done} of ${SLOTS} dispatches</span></h2>` + (items.filter(show).map((x, i) => card(x, i === 0 && desk === "all")).join("") || '<p class="muted">No dispatches from this desk yet today.</p>');
    yfeed.innerHTML = `<h2 class="news-day">${esc(fmtD(yd))}</h2>` + (yitems.filter(show).map(x => card(x, false)).join("") || '<p class="muted">No dispatches from this desk yesterday.</p>');
    if (ticker) ticker.innerHTML = '<div class="ticker-track">' + items.concat(yitems.slice(0, 4)).map(x => `<a href="#d-${x.id}"><b>${esc(x.desk)}:</b> ${esc(x.head)}</a>`).join('<span aria-hidden="true">◆</span>').repeat(2) + "</div>";
    // countdown to next dispatch
    const nextAt = done < SLOTS ? new Date(today.getTime() + done * SLOT_MIN * 60000) : new Date(today.getTime() + 86400000);
    clearInterval(render._iv);
    const tick = () => {
      const ms = nextAt - new Date();
      if (ms <= 0) { render(); return; }
      const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
      next.innerHTML = `Next dispatch at <strong>${fmtT(nextAt)}</strong> · in ${h ? h + "h " : ""}${m}m ${String(s).padStart(2, "0")}s`;
    };
    tick(); render._iv = setInterval(tick, 1000);
  }

  if (filt) {
    filt.innerHTML = ['<button type="button" class="cat-btn on" data-desk="all">All desks</button>'].concat(DESK_NAMES.map(n => `<button type="button" class="cat-btn" data-desk="${esc(n)}">${esc(n)}</button>`)).join("");
    filt.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      desk = b.dataset.desk; filt.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); render();
    });
  }
  if (feed) render();

  // Official news (news.json), newest first
  const off = document.getElementById("official-news");
  if (off) fetch("news.json", { cache: "no-store" }).then(r => r.json()).then(list => {
    list.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
    off.innerHTML = list.slice(0, 12).map(n => `<article class="news-item official"><div class="news-meta"><span class="desk">${esc(n.category || "Official")}</span><time datetime="${esc(n.date)}">${esc(new Date(n.date + "T" + (n.time || "12:00")).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }))}${n.time ? " · " + esc(n.time) : ""}</time></div>
      <h3>${n.link ? `<a href="${esc(n.link)}">${esc(n.title)}</a>` : esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join("") + (list.length > 12 ? '<p class="center"><a class="btn ghost" href="herald.html">See every post in the Herald Archive</a></p>' : "");
  }).catch(() => { off.innerHTML = '<p class="muted">Official news could not be loaded right now.</p>'; });
})();
