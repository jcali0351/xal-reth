/* THE GUILD CREST: every element marked data-crest shows the guild's crest, img/crest/xalreth-crest.svg: a sharp, flat
   redraw of the guild tabard (the dark banner with its magenta beaded trim and the Coil, a serpent ringed round with
   its two heads meeting at the top). Styles: "Guild crest" at the end of style.css.
   (The roster sync also keeps Blizzard's own crest data in data/guild-crest.json and img/crest/, for reference.) */
(function () {
  "use strict";
  var base = window.COIL_BASE || "";
  Array.prototype.forEach.call(document.querySelectorAll("[data-crest]"), function (el) {
    var img = new Image();
    img.className = "crest-img"; img.decoding = "async";
    img.alt = el.getAttribute("data-crest-label") || "The crest of the Cult of Xal'Reth, as it appears on the guild tabard";
    img.onload = function () { el.classList.add("ready"); };
    img.src = base + "img/crest/xalreth-crest.svg";
    el.innerHTML = ""; el.appendChild(img);
  });
})();
