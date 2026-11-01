/* The Daily Coil: a new post every day, generated from the date so every reader sees the same post. */
(function () {
  const root = document.getElementById("daily"); if (!root) return;

  // ---------- seeded randomness (same post for everyone on a date) ----------
  function seedOf(y, m, d, salt) { let h = (y * 10000 + m * 100 + d) * 2654435761 + salt * 97; h = (h ^ (h >>> 13)) >>> 0; return h || 1; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ---------- moon (computed) ----------
  const SYN = 29.530588853, REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  function moon(date) {
    const days = date.getTime() / 86400000 - REF;
    const age = ((days % SYN) + SYN) % SYN;
    const frac = age / SYN;
    const illum = Math.round((1 - Math.cos(2 * Math.PI * frac)) / 2 * 100);
    const names = [[1.84566, "New Moon"], [5.53699, "Waxing Crescent"], [9.22831, "First Quarter"], [12.91963, "Waxing Gibbous"],
      [16.61096, "Full Moon"], [20.30228, "Waning Gibbous"], [23.99361, "Last Quarter"], [27.68493, "Waning Crescent"], [SYN, "New Moon"]];
    const name = names.find(([lim]) => age < lim)[1];
    const toFull = ((14.765 - age) % SYN + SYN) % SYN, toNew = (SYN - age) % SYN;
    return { age, illum, name, frac, toFull, toNew };
  }
  const MOON_LORE = {
    "New Moon": "The sky is dark and the Coil is closest. The Listeners called this the Night of the Ear: the best night of the month to lie down and listen.",
    "Waxing Crescent": "A thin claw of light. Begin small things tonight: one verse, one copper, one kind word. The Coil favors beginnings that do not announce themselves.",
    "First Quarter": "Half light, half dark, like the Two Coils. A night for deciding what to keep and what to shed.",
    "Waxing Gibbous": "The light gathers. So do the Grippers. Check yourself for anything you are holding too tightly.",
    "Full Moon": "The Unblinking moon. Basking by moonlight is permitted and encouraged. Khaedara reports a measurable rise in loitering.",
    "Waning Gibbous": "The light begins to let go, and does it gracefully. A good night for forgiving a name in the Ledger.",
    "Last Quarter": "The moon sheds half of itself without complaint. Shed one habit tonight and send it after the First Skin.",
    "Waning Crescent": "The last thin light before the dark. Rest. The Coil is patient, and so is tomorrow.",
  };

  // ---------- daily pieces ----------
  const ADJ = ["Shedskin", "Void", "Coilglow", "Hatchling", "Basking", "Ledger", "Pearl", "Nest", "Lantern", "Unblinking", "Salamander", "Tidecoil", "Vigil", "Ember", "Dusk", "Moonscale"];
  const NOUN = ["Violet", "Amethyst", "Plum", "Orchid", "Lavender", "Indigo", "Mauve", "Lilac", "Heather", "Iris", "Twilight", "Haze", "Bloom", "Velvet", "Smoke", "Gold"];
  const SCENTS = ["warm stone after rain", "old parchment and lamp oil", "sea salt drifting up from the Sunken Nest", "steeped black tea, slightly too strong", "cedar smoke from the Crooked Lantern's hearth",
    "crushed peacebloom", "linen cloth fresh from the loom", "cold iron and frost", "honeyed oat bread, half given away", "the inside of a very old library", "mountain wind over the Nine Stones",
    "spiced apple cider", "wet moss on the shaded side", "candle wax at a Vigil", "a sunlit salamander's rock", "copper coins warm from someone's pocket", "lilac on the evening air", "fresh ink on a Dream Page"];
  const FLAVORS = ["plain soup, eaten slowly, as the High Priestess asks", "honey cake shared in three pieces", "salted fish from Brannoc's shore", "blackberry tea", "roasted chestnuts", "warm milk with nutmeg",
    "a conjured muffin, accepted with thanks", "spiced pumpkin bread", "a feast nobody had to ask for", "cold spring water", "dark plum jam", "a single perfect apple"];
  const WEATHER_A = ["Clear above the Outer Turn", "Mild and still", "Overcast with long patient clouds", "Light shedding of leaves on the wind", "Thin mist rising from the Throat of the Void", "Warm on the basking stones", "Cool and bright", "Drizzle, gentle and unhurried", "Windy over the Nine Stones", "Heavy fog along the Shedlands"];
  const WEATHER_B = ["Earthquake risk is low; the Coil appears comfortable.", "A small tremor is possible near dusk as the Coil adjusts its posture.", "Lag spikes likely around peak hours: the Coil is yawning.", "Excellent basking conditions from midday on.", "Grippers are active in damp weather; laugh them off.", "Loitering advisory in effect near all auction houses.", "Salamander sightings expected on south-facing rocks.", "The Tidecoil may surface offshore; do not stare."];
  const THOUGHTS = ["Give one thing to one stranger before you log out.", "Draw a small coil beside a name you have been holding.", "Repair before the raid. An officer will thank you silently.", "Stand still for one whole breath before your next pull.",
    "Answer the Chant, even if you are the only one online.", "Walk one road you would usually fly.", "Greet the newest egg in guild chat by name.", "Say 'I have enough' aloud, once, and notice how it feels.",
    "Pass on a loot roll you do not truly need.", "Sit with a friend who is having a bad day, and say less than you want to.", "Thank the healer. Then thank the tank. Then drink some water.", "Leave an herb for the next gatherer."];
  function numberLore(n) {
    const out = [];
    if (n % 3 === 0) out.push("divisible by three, the number of the Turns");
    if (n % 7 === 0) out.push("divisible by seven, the number of the Tenets and the Kings");
    if (n % 9 === 0) out.push("divisible by nine, the stones of Vessk, counting the one that is missing");
    if (String(n) === String(n).split("").reverse().join("")) out.push("a palindrome, which the Listeners considered a number that has learned to wait");
    if (n % 2 === 1) out.push("odd, and therefore slightly suspicious to Khaedara");
    if (!out.length) out.push("of no particular significance, which the Coil considers its own kind of holiness");
    return out;
  }
  const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join(""); };

  function post(date) {
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    const r = rng(seedOf(y, m, d, 1));
    const hue = Math.floor(r() * 360), sat = 35 + Math.floor(r() * 50), lit = 35 + Math.floor(r() * 30);
    const HUES = [[15, ["Ember", "Crimson", "Blood-Moon"]], [45, ["Amber", "Copper", "Lantern"]], [70, ["Gold", "Honey", "Shedfall"]], [160, ["Moss", "Jade", "Salamander"]],
      [200, ["Tide", "Teal", "Nest-Water"]], [250, ["Twilight", "Indigo", "Deep-Sea"]], [290, ["Violet", "Amethyst", "Coilglow"]], [335, ["Orchid", "Mauve", "Plum"]], [361, ["Rose", "Crimson", "Ember"]]];
    const nouns = HUES.find(([lim]) => hue < lim)[1];
    const tone = lit < 42 ? "Deep " : lit > 58 ? "Pale " : "";
    const color = { hex: hsl2hex(hue, sat, lit), name: pick(r, ADJ) + " " + tone + pick(r, nouns), hue, sat, lit };
    const number = 1 + Math.floor(r() * 10000);
    const scent = pick(r, SCENTS), flavor = pick(r, FLAVORS);
    const weather = { sky: pick(r, WEATHER_A), note: pick(r, WEATHER_B), temp: 8 + Math.floor(r() * 22) };
    const thought = pick(r, THOUGHTS);
    const mo = moon(new Date(Date.UTC(y, m - 1, d, 12)));
    let verse = null;
    if (window.DoDEngine) { const [vc, vv] = window.DoDEngine.votd(y * 10000 + m * 100 + d); verse = { c: vc, v: vv, t: window.DoDEngine.verse(vc, vv).text.replace(/\{target\}/g, "faithful one"), title: window.DOD.chapters[vc - 1].t }; }
    return { date, color, number, scent, flavor, weather, thought, moon: mo, verse };
  }

  const fmt = d => d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function moonSvg(frac) {
    // simple phase drawing: lit disc with a shadow ellipse
    const k = Math.cos(2 * Math.PI * frac), waxing = frac < 0.5, crescent = k > 0;
    const rx = Math.max(0.01, Math.abs(k) * 40);
    const lit = "#efe6ff", dark = "#1a1029";
    const d = `M50 10 A40 40 0 0 ${waxing ? 1 : 0} 50 90 A${rx.toFixed(2)} 40 0 0 ${waxing === crescent ? 0 : 1} 50 10 Z`;
    return `<svg viewBox="0 0 100 100" role="img" aria-label="Moon phase"><circle cx="50" cy="50" r="40" fill="${dark}" stroke="#b98cff" stroke-width="1.5"/>
      <path d="${d}" fill="${lit}"/></svg>`;
  }

  function render(p, full) {
    const mo = p.moon;
    return `<article class="post${full ? " today" : ""}">
      <header><p class="eyebrow">${full ? "Today's Post" : "From the Archive"}</p><h2>${esc(fmt(p.date))}</h2>
      <p class="muted">Posted at dawn by the Wardens of the Void, who were already awake.</p></header>
      <div class="post-grid">
        <section class="tile moon"><div class="moon-art">${moonSvg(mo.frac)}</div><div><h3>The Moon</h3>
          <p class="big">${mo.name}</p><p>${mo.illum}% illuminated · day ${mo.age.toFixed(1)} of 29.5</p>
          <p class="muted">Full moon in ${Math.round(mo.toFull)} days · new moon in ${Math.round(mo.toNew)} days</p></div></section>
        <section class="tile"><h3>The Weather Beneath</h3><p class="big">${esc(p.weather.sky)}</p>
          <p>Around ${p.weather.temp}°C on the Outer Turn (${Math.round(p.weather.temp * 9 / 5 + 32)}°F). ${esc(p.weather.note)}</p>
          ${full ? '<div class="live-wx"><button type="button" class="btn ghost small" data-wx>Show my real local weather</button><p class="wx-out muted" aria-live="polite"></p></div>' : ""}</section>
        <section class="tile color"><span class="swatch" style="background:${p.color.hex}"></span><div><h3>Color of the Day</h3>
          <p class="big">${esc(p.color.name)}</p><p><code>${p.color.hex}</code> · hue ${p.color.hue}°, saturation ${p.color.sat}%, light ${p.color.lit}%</p></div></section>
        <section class="tile"><h3>Number of the Day</h3><p class="big num">${p.number.toLocaleString()}</p>
          <p>This number is ${numberLore(p.number).join("; ")}.</p></section>
        <section class="tile"><h3>Scent of the Day</h3><p class="big">${esc(p.scent)}</p></section>
        <section class="tile"><h3>Flavor of the Day</h3><p class="big">${esc(p.flavor)}</p></section>
      </div>
      ${full ? `<div class="post-body prose">
        <p>Good morning, faithful. Today the moon is a <strong>${mo.name.toLowerCase()}</strong>, ${mo.illum}% lit. ${MOON_LORE[mo.name]}</p>
        <p>The Wardens report <strong>${esc(p.weather.sky[0].toLowerCase() + p.weather.sky.slice(1))}</strong> across the Outer Turn. ${esc(p.weather.note)} Dress for it, or bask through it; both are acceptable.</p>
        <p>Today's color is <strong>${esc(p.color.name)}</strong>. Wear it in your transmog if you can, or simply notice it somewhere in the world. Today's number is <strong>${p.number.toLocaleString()}</strong>; if a roll lands on it, the Coil is smiling. The air smells of <strong>${esc(p.scent)}</strong>, and the flavor of the day is <strong>${esc(p.flavor)}</strong>.</p>
        ${p.verse ? `<blockquote>${esc(p.verse.t)}<cite>Devotion ${p.verse.c}:${p.verse.v} · ${esc(p.verse.title)} · in game: /dod read ${p.verse.c}:${p.verse.v}</cite></blockquote>` : ""}
        <p><strong>Today's practice:</strong> ${esc(p.thought)}</p>
        <p class="muted">Glory to Xal'Reth. A new post appears here every day at midnight, your time.</p></div>` : `<p class="muted post-foot">${p.verse ? "Verse of the day: Devotion " + p.verse.c + ":" + p.verse.v + ". " : ""}Practice: ${esc(p.thought)}</p>`}
    </article>`;
  }

  const today = new Date(); today.setHours(12, 0, 0, 0);
  root.innerHTML = render(post(today), true);
  const arch = document.getElementById("archive");
  if (arch) {
    let html = "";
    for (let i = 1; i <= 14; i++) { const d = new Date(today); d.setDate(d.getDate() - i); html += `<details class="arch"><summary>${esc(fmt(d))} · ${moon(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12))).name}</summary>${render(post(d), false)}</details>`; }
    arch.innerHTML = html;
  }

  // live local weather (Open-Meteo, no account needed); only when the reader asks
  const btn = root.querySelector("[data-wx]");
  if (btn) btn.addEventListener("click", () => {
    const out = root.querySelector(".wx-out");
    if (!navigator.geolocation) { out.textContent = "Your browser does not share location."; return; }
    out.textContent = "Asking the Wardens...";
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: la, longitude: lo } = pos.coords;
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la.toFixed(2)}&longitude=${lo.toFixed(2)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=1`);
        const j = await r.json(), c = j.current, dly = j.daily;
        const W = { 0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog", 51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain", 71: "light snow", 73: "snow", 75: "heavy snow", 80: "rain showers", 81: "rain showers", 82: "violent rain showers", 95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail" };
        const f = t => Math.round(t * 9 / 5 + 32);
        out.innerHTML = `Where you are: <strong>${W[c.weather_code] || "mixed skies"}</strong>, ${Math.round(c.temperature_2m)}°C / ${f(c.temperature_2m)}°F (feels like ${Math.round(c.apparent_temperature)}°C), humidity ${c.relative_humidity_2m}%, wind ${Math.round(c.wind_speed_10m)} km/h. Today ${Math.round(dly.temperature_2m_min[0])}–${Math.round(dly.temperature_2m_max[0])}°C. Sunrise ${dly.sunrise[0].slice(11)}, sunset ${dly.sunset[0].slice(11)}. Weather data by Open-Meteo.`;
      } catch (e) { out.textContent = "The weather could not be fetched just now."; }
    }, () => { out.textContent = "Location was not shared, so the Wardens' forecast will have to do."; }, { timeout: 10000 });
  });
})();
