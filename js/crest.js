/* THE GUILD CREST: every element marked data-crest shows the guild's crest, img/crest/xalreth-crest.svg: the guild
   tabard (the dark banner with its magenta beaded trim) bearing the Coil, the guild's own in-game emblem (Blizzard
   emblem 37, embedded and tinted magenta). Styles: "Guild crest" at the end of style.css. When the picture changes, bump its ?v= here
   and in style.css (the guild frame) so visitors get the new one at once.
   (The roster sync also keeps Blizzard's own crest data in data/guild-crest.json and img/crest/, for reference.) */
(function () {
  "use strict";
  var base = window.COIL_BASE || "";
  Array.prototype.forEach.call(document.querySelectorAll("[data-crest]"), function (el) {
    var img = new Image();
    img.className = "crest-img"; img.decoding = "async";
    img.alt = el.getAttribute("data-crest-label") || "The crest of the Cult of Xal'Reth, as it appears on the guild tabard";
    img.onload = function () { el.classList.add("ready"); };
    img.src = base + "img/crest/xalreth-crest.svg?v=2";
    el.innerHTML = ""; el.appendChild(img);
  });
})();
