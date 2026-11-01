/* Blog index: category filter (with #cat= links) and search. */
(function () {
  const grid = document.getElementById("post-grid"); if (!grid) return;
  const cards = [...document.querySelectorAll(".post-card[data-cat]")];
  const btns = [...document.querySelectorAll(".cat-btn")];
  const search = document.getElementById("post-search"), none = document.getElementById("no-posts");
  let cat = "all";
  function apply() {
    const q = (search.value || "").trim().toLowerCase();
    let shown = 0;
    cards.forEach((c) => {
      const ok = (cat === "all" || c.dataset.cat === cat) && (!q || c.dataset.text.includes(q));
      c.hidden = !ok; if (ok) shown++;
    });
    none.hidden = shown > 0;
    btns.forEach((b) => { const on = b.dataset.cat === cat; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  }
  btns.forEach((b) => b.addEventListener("click", () => { cat = b.dataset.cat; history.replaceState(null, "", cat === "all" ? "#" : "#cat=" + cat); apply(); }));
  search.addEventListener("input", apply);
  const m = location.hash.match(/cat=([a-z-]+)/); if (m) cat = m[1];
  apply();
})();
