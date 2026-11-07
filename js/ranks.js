/* The Ranks of the Coil (ranks.html): "Download PNG" turns a rank's insignia (SVG symbol #em-N) into a 512 x 512 PNG,
   for Discord role icons, forum signatures and so on. Everything happens in the visitor's browser. */
(function () {
  "use strict";
  var defs = document.querySelector(".ins-defs");
  if (!defs) return;
  var SIZE = 512;
  function svgFor(n) {
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 200" width="' + SIZE + '" height="' + SIZE + '">' +
      defs.innerHTML + '<use href="#em-' + n + '" xlink:href="#em-' + n + '"/></svg>';
  }
  function save(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-dl]"); if (!b) return;
    var n = b.getAttribute("data-dl"), name = "xalreth-rank-" + n + "-" + (b.getAttribute("data-name") || "insignia");
    var url = URL.createObjectURL(new Blob([svgFor(n)], { type: "image/svg+xml" })), img = new Image();
    var label = b.textContent; b.textContent = "Preparing…";
    img.onload = function () {
      var c = document.createElement("canvas"); c.width = SIZE; c.height = SIZE;
      c.getContext("2d").drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      c.toBlob(function (png) { b.textContent = label; if (png) save(png, name + ".png"); }, "image/png");
    };
    img.onerror = function () {   // a browser that can't paint the SVG gets the SVG itself
      URL.revokeObjectURL(url); b.textContent = label;
      save(new Blob([svgFor(n)], { type: "image/svg+xml" }), name + ".svg");
    };
    img.src = url;
  });
})();
