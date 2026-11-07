/* THE GUILD CREST: draws the guild's tabard crest, as the Blizzard API describes it, into every element marked
   data-crest, the way the World of Warcraft armory does: the faction ring, the tabard banner in the guild's background
   colour, the border and the emblem in their colours, a gloss and the hooks.
   data/guild-crest.json (written by tools/sync_roster.mjs) gives the colours, the faction and the guild's own emblem
   and border pictures (saved in img/crest/); the fixed parts of the tabard come from img/crest/kit/ (Blizzard's).
   The greyscale pictures are tinted here, keeping their shading. Until the first sync brings the crest, the element
   stays hidden. Styles: "Guild crest" at the end of style.css. */
(function () {
  "use strict";
  var spots = Array.prototype.slice.call(document.querySelectorAll("[data-crest]"));
  if (!spots.length) return;
  var base = window.COIL_BASE || "", KIT = "img/crest/kit/";
  var W = 216, H = 240;   // the armory's crest: a 216 px ring with the banner hanging over its lower edge

  function load(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = base + src; }); }
  function tinted(img, color) {   // greyscale picture x colour, keeping the picture's own transparency
    var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    var g = c.getContext("2d"); g.drawImage(img, 0, 0);
    if (color) { g.globalCompositeOperation = "multiply"; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "destination-in"; g.drawImage(img, 0, 0); }
    return c;
  }
  function draw(el, c, im) {
    var k = Math.max(1, Math.min(window.devicePixelRatio || 1, 3) * (el.clientWidth || W) / W);
    var cv = document.createElement("canvas"); cv.width = Math.round(W * k); cv.height = Math.round(H * k); cv.className = "crest-canvas";
    var g = cv.getContext("2d"); g.scale(k, k); g.imageSmoothingQuality = "high";
    var put = function (img, x, y) { if (img) g.drawImage(img, x, y); };
    if (el.getAttribute("data-crest-ring") !== "off") put(im.ring, 0, 0);
    put(im.shadow, 18, 27);
    if (im.bg) put(tinted(im.bg, c.background && c.background.color), 18, 27);
    put(tinted(im.border, c.border.color), 31, 40);
    put(tinted(im.emblem, c.emblem.color), 33, 57);
    put(im.overlay, 18, 27);
    put(im.hooks, 18, 27);
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", el.getAttribute("data-crest-label") || "The crest of the Cult of Xal'Reth, as it appears on the guild tabard");
    el.innerHTML = ""; el.appendChild(cv); el.classList.add("ready");
  }
  fetch(base + "data/guild-crest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
    if (!c || !c.emblem || !c.border) return;
    var faction = /horde/i.test(c.faction || "") ? "horde" : "alliance";
    return Promise.all([load(c.border.image), load(c.emblem.image), load(KIT + "ring-" + faction + ".png"), load(KIT + "bg_00.png"),
      load(KIT + "shadow_00.png"), load(KIT + "overlay_00.png"), load(KIT + "hooks.png")]).then(function (a) {
      if (!a[0] || !a[1]) return;
      var im = { border: a[0], emblem: a[1], ring: a[2], bg: a[3], shadow: a[4], overlay: a[5], hooks: a[6] };
      spots.forEach(function (el) { draw(el, c, im); });
    });
  }).catch(function () { /* no crest yet: the spot stays hidden */ });
})();
