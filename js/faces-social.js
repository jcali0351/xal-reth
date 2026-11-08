/* The Faces of the Coil, the social layer (rp.html and character.html). Members sign in with Battle.net through the
   social Worker (tools/social-worker/); their characters on the guild roster become theirs to post as. Everything is
   read from and written to that Worker; nothing here is secret. Off (pages fall back to the officer-kept profiles in
   data/rp-profiles.json) until ENDPOINT holds the Worker's address. Needs js/coil-faces.js. */
(function () {
  "use strict";
  var ENDPOINT = "https://xalreth-social.jcali0351.workers.dev";   // the social Worker (tools/social-worker/)
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  try {   // local testing only: ?social=http://127.0.0.1:8787 (kept for this tab)
    var q = new URLSearchParams(location.search).get("social");
    if (local && q) sessionStorage.setItem("xr-faces-dev", q);
    if (local && sessionStorage.getItem("xr-faces-dev")) ENDPOINT = sessionStorage.getItem("xr-faces-dev");
  } catch (e) {}
  ENDPOINT = ENDPOINT.replace(/\/+$/, "");
  var KEY = "xr-faces-session", AS = "xr-faces-as";
  var F = window.CoilFaces;
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  var esc = F.esc;

  // coming back from Battle.net: #session=… or #signin=why
  var signinNote = "";
  var h = location.hash;
  if (/^#session=/.test(h)) { store(KEY, h.slice(9)); history.replaceState(null, "", location.pathname + location.search); }
  else if (/^#signin=/.test(h)) {
    signinNote = ({
      notmember: "None of your characters on that Battle.net account are on the guild roster yet. Join the guild in game, wait an hour for the roster to update, then sign in again.",
      cancelled: "Sign-in was cancelled. Nothing was shared.", expired: "That sign-in took too long. Please try again.",
      failed: "Battle.net didn't let us in that time. Please try again.", noprofile: "Battle.net didn't share any World of Warcraft characters. Please try again, and allow access to your characters."
    })[h.slice(8)] || "";
    history.replaceState(null, "", location.pathname + location.search);
  }

  var REACTIONS = [
    { k: "light", label: "Hold light", svg: '<path d="M12 3c2 3 2 5 0 7-2-2-2-4 0-7Z"/><rect x="9" y="11" width="6" height="10" rx="1"/>' },
    { k: "bask", label: "Basking", svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' },
    { k: "grip", label: "Gripped", svg: '<path d="M7 11V7a2 2 0 0 1 4 0v4M11 10V5a2 2 0 0 1 4 0v5M15 10V7a2 2 0 0 1 4 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-2a2 2 0 0 1 4 0"/>' },
    { k: "letgo", label: "Let go", svg: '<path d="M12 20V8M7 12l5-5 5 5"/><path d="M5 4q7 4 14 0"/>' }
  ];
  var BONDS = { kin: "Kin", friend: "Friend", rival: "Rival", mentor: "Mentor", student: "Student", sworn: "Sworn", beloved: "Beloved" };
  var icon = function (p) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>"; };

  var S = window.CoilSocial = {
    on: !!ENDPOINT, endpoint: ENDPOINT, note: signinNote, REACTIONS: REACTIONS, BONDS: BONDS, icon: icon,
    token: function () { return read(KEY); },
    signedIn: function () { return !!read(KEY); },
    signInUrl: function () { return ENDPOINT + "/auth/login?return=" + encodeURIComponent(location.href.split("#")[0]); },
    signOut: function () { store(KEY, null); store(AS, null); location.reload(); },
    picUrl: function (id) { return id ? ENDPOINT + "/pic?id=" + encodeURIComponent(id) : ""; },
    as: function () { return read(AS); },
    setAs: function (k) { store(AS, k); },
    api: function (path, opts) {
      opts = opts || {};
      var headers = {};
      if (read(KEY)) headers.Authorization = "Bearer " + read(KEY);
      if (opts.body && !opts.raw) headers["Content-Type"] = "application/json";
      if (opts.type) headers["Content-Type"] = opts.type;
      return fetch(ENDPOINT + path, { method: opts.method || "GET", headers: headers, body: opts.raw ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (r.status === 401 && read(KEY)) { store(KEY, null); }
            if (!r.ok) throw new Error(j.error || "The Faces didn't answer (" + r.status + ").");
            return j;
          });
        }, function () { throw new Error("The Faces can't be reached right now. Try again in a moment."); });
    },
    me: null,
    loadMe: function () {
      if (!S.on || !read(KEY)) return Promise.resolve(null);
      if (S.me) return S.me;
      S.me = S.api("/me").then(function (m) {
        var keys = m.chars.map(function (c) { return c.key; });
        if (keys.indexOf(read(AS)) < 0) store(AS, keys[0] || null);
        return m;
      }).catch(function () { return null; });
      return S.me;
    },
    ago: function (t) {
      var s = (Date.now() - t) / 1000;
      if (s < 60) return "just now";
      if (s < 3600) return Math.round(s / 60) + " min ago";
      if (s < 86400) return Math.round(s / 3600) + " h ago";
      if (s < 7 * 86400) return Math.round(s / 86400) + " d ago";
      return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    },
    // a face: the name (in character if they gave one) and a picture (their avatar, else their Armory portrait)
    face: function (d, faces, key) {
      var f = (faces && faces[key]) || {}, m = d.byKey[key], legacy = d.profiles[key] || {};
      return {
        key: key, name: f.icName || legacy.icName || (m ? m.name : F.nameOf(d, key)), title: f.title || legacy.title || "",
        pic: f.avatar ? S.picUrl(f.avatar) : (m && m.media && (m.media.avatar || m.media.inset)) || "", color: F.color(m), status: f.status || ""
      };
    },
    // shrink a picture in the browser before it is sent (WebP, at most maxW x maxH)
    shrink: function (file, maxW, maxH) {
      return createImageBitmap(file).then(function (bmp) {
        var s = Math.min(1, maxW / bmp.width, maxH / bmp.height), c = document.createElement("canvas");
        c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        var tryQ = function (q) {
          return new Promise(function (res) { c.toBlob(res, "image/webp", q); }).then(function (b) {
            if (b && b.size > 550 * 1024 && q > 0.5) return tryQ(q - 0.15);
            if (!b) throw new Error("This browser couldn't prepare the picture.");
            return b;
          });
        };
        return tryQ(0.86);
      });
    },
    upload: function (file, use) {
      var dims = use === "cover" ? [1600, 600] : use === "avatar" ? [512, 512] : [1600, 1600];
      return S.shrink(file, dims[0], dims[1]).then(function (blob) {
        return S.api("/pics?as=" + encodeURIComponent(read(AS)) + "&use=" + use, { method: "POST", body: blob, raw: true, type: blob.type });
      });
    }
  };

  /* ------------------------------------------------------------------ one post */
  function text(t) { return esc(t).replace(/\n/g, "<br>"); }
  S.renderPost = function (d, faces, p, opts) {
    opts = opts || {};
    var a = S.face(d, faces, p.author), w = p.wall !== p.author ? S.face(d, faces, p.wall) : null;
    var mine = p.mine || {}, myKey = read(AS), myRx = mine[myKey] || "";
    var el = document.createElement("article");
    el.className = "fs-post" + (p.kind === "status" ? " status" : "");
    el.dataset.id = p.id;
    el.style.setProperty("--cc", a.color);
    el.innerHTML =
      '<header><a class="fs-av" href="' + esc(F.url(a.key)) + '"' + (a.pic ? ' style="background-image:url(' + esc(a.pic) + ')"' : "") + '><span class="sr-only">' + esc(a.name) + "</span></a>" +
      '<div class="fs-who"><a href="' + esc(F.url(a.key)) + '">' + esc(a.name) + "</a>" +
      (w ? ' <span class="fs-arrow" aria-label="on the wall of">▸</span> <a href="' + esc(F.url(w.key)) + '">' + esc(w.name) + "</a>" : "") +
      (p.kind === "status" ? ' <span class="fs-st">updated their status</span>' : "") +
      '<small><time datetime="' + new Date(p.created).toISOString() + '">' + esc(S.ago(p.created)) + "</time></small></div>" +
      '<button type="button" class="fs-menu" aria-label="More" aria-haspopup="true" data-act="menu">⋯</button></header>' +
      (p.body ? '<p class="fs-body">' + text(p.body) + "</p>" : "") +
      (p.pic ? '<figure class="fs-pic"><img loading="lazy" alt="" src="' + esc(S.picUrl(p.pic)) + '" data-pic></figure>' : "") +
      '<div class="fs-rx" role="group" aria-label="Reactions">' + REACTIONS.map(function (r) {
        var n = (p.reactions || {})[r.k] || 0;
        return '<button type="button" class="fs-r' + (myRx === r.k ? " on" : "") + '" data-act="react" data-k="' + r.k + '" aria-pressed="' + (myRx === r.k) + '" title="' + r.label + '">' +
          icon(r.svg) + "<span>" + r.label + "</span>" + (n ? "<b>" + n + "</b>" : "") + "</button>";
      }).join("") + "</div>" +
      '<ul class="fs-cm">' + (p.comments || []).map(function (c) {
        var ca = S.face(d, faces, c.author);
        return '<li data-cid="' + esc(c.id) + '"><a class="fs-av small" href="' + esc(F.url(ca.key)) + '"' + (ca.pic ? ' style="background-image:url(' + esc(ca.pic) + ')"' : "") + "></a>" +
          '<div><a href="' + esc(F.url(ca.key)) + '">' + esc(ca.name) + "</a> " + text(c.body) + '<small>' + esc(S.ago(c.created)) +
          ' · <button type="button" data-act="ccmenu">⋯</button></small></div></li>';
      }).join("") + "</ul>" +
      (S.signedIn() && S.on ? '<form class="fs-cm-new" data-act="comment"><input type="text" maxlength="500" placeholder="Answer in character…" aria-label="Write a comment"><button type="submit">Send</button></form>' : "");
    var img = el.querySelector("[data-pic]");
    if (img) img.addEventListener("error", function () { img.closest("figure").outerHTML = '<p class="fs-pending">A picture is waiting for an officer\'s blessing.</p>'; });
    return el;
  };

  // one handler for every post on a page: reactions, comments, the ⋯ menus
  S.wire = function (host, d, reload) {
    function needSignIn() {
      if (!S.on) return true;
      if (!S.signedIn()) { if (confirm("Sign in with Battle.net to take part?")) location.href = S.signInUrl(); return true; }
      return false;
    }
    function refresh(article) {
      return S.api("/post?id=" + encodeURIComponent(article.dataset.id)).then(function (r) {
        article.replaceWith(S.renderPost(d, r.faces, r.post));
      }).catch(function () { article.remove(); });
    }
    host.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b || b.tagName === "FORM") return;
      var art = b.closest(".fs-post"); if (!art) return;
      var act = b.dataset.act;
      if (act === "react") {
        if (needSignIn()) return;
        var on = b.classList.contains("on");
        S.api("/react", { method: "POST", body: { as: S.as(), post: art.dataset.id, kind: on ? null : b.dataset.k } }).then(function () { return refresh(art); }).catch(function (x) { alert(x.message); });
      }
      if (act === "menu" || act === "ccmenu") {
        var old = host.querySelector(".fs-pop"); if (old) { var same = old.previousElementSibling === b; old.remove(); if (same) return; }
        var li = b.closest("[data-cid]"), type = li ? "comment" : "post", id = li ? li.dataset.cid : art.dataset.id;
        S.loadMe().then(function (me) {
          var mineKeys = me ? me.chars.map(function (c) { return c.key; }) : [];
          var author = li ? li.querySelector("a[href]").getAttribute("href") : art.querySelector(".fs-who a").getAttribute("href");
          var wallLink = art.querySelectorAll(".fs-who a")[1], wallHref = wallLink ? wallLink.getAttribute("href") : author;
          var keyOf = function (href) { return decodeURIComponent((href.split("c=")[1] || "")).toLowerCase(); };
          var canRemove = mineKeys.indexOf(keyOf(author)) >= 0 || mineKeys.indexOf(keyOf(wallHref)) >= 0;
          var pop = document.createElement("div");
          pop.className = "fs-pop"; pop.setAttribute("role", "menu");
          pop.innerHTML = (canRemove ? '<button type="button" role="menuitem" data-do="remove">Remove</button>' : "") + '<button type="button" role="menuitem" data-do="report">Report to the officers</button>';
          b.insertAdjacentElement("afterend", pop);
          pop.addEventListener("click", function (ev) {
            var what = ev.target.closest("[data-do]"); if (!what) return;
            pop.remove();
            if (what.dataset.do === "remove") {
              if (!confirm("Remove this " + type + "?")) return;
              S.api((type === "post" ? "/posts" : "/comments") + "?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function () { return type === "post" ? art.remove() : refresh(art); }).catch(function (x) { alert(x.message); });
            } else {
              var why = prompt("What is wrong with it? The officers will read this.", "");
              if (why == null) return;
              S.api("/report", { method: "POST", body: { as: S.signedIn() ? S.as() : undefined, type: type, id: id, reason: why } }).then(function () { alert("Thank you. An officer will look at it."); }).catch(function (x) { alert(x.message); });
            }
          });
        });
      }
    });
    document.addEventListener("click", function (e) { var pop = host.querySelector(".fs-pop"); if (pop && !pop.contains(e.target) && !e.target.closest("[data-act=menu],[data-act=ccmenu]")) pop.remove(); });
    host.addEventListener("submit", function (e) {
      var f = e.target.closest("form[data-act=comment]"); if (!f) return;
      e.preventDefault();
      if (needSignIn()) return;
      var input = f.querySelector("input"), art = f.closest(".fs-post");
      if (!input.value.trim()) return;
      f.querySelector("button").disabled = true;
      S.api("/comments", { method: "POST", body: { as: S.as(), post: art.dataset.id, body: input.value } }).then(function () { return refresh(art); })
        .catch(function (x) { alert(x.message); f.querySelector("button").disabled = false; });
    });
  };

  /* ------------------------------------------------------------------ the sign-in bar and composer */
  S.bar = function (host, d, onChange) {
    if (!S.on) { host.innerHTML = '<p class="fs-soon">The Faces are opening soon: members will sign in with Battle.net and post as their own characters.</p>'; return Promise.resolve(null); }
    if (!S.signedIn()) {
      host.innerHTML = (S.note ? '<p class="fs-note">' + esc(S.note) + "</p>" : "") +
        '<div class="fs-signin"><div><b>Join the Faces of the Coil</b><p>Sign in with Battle.net to post, react and comment as your own characters. Only characters on the guild roster can take part. Your Battle.net account stays private: only your characters are shown.</p></div>' +
        '<a class="btn big" href="' + esc(S.signInUrl()) + '">Sign in with Battle.net</a></div>';
      return Promise.resolve(null);
    }
    return S.loadMe().then(function (me) {
      if (!me) { host.innerHTML = '<p class="fs-note">Your sign-in has expired. <a href="' + esc(S.signInUrl()) + '">Sign in again</a>.</p>'; return null; }
      var opts = me.chars.map(function (c) { return '<option value="' + esc(c.key) + '"' + (c.key === S.as() ? " selected" : "") + ">" + esc(S.face(d, {}, c.key).name) + "</option>"; }).join("");
      host.innerHTML = '<div class="fs-me"><label>Posting as <select data-as>' + opts + "</select></label>" +
        '<a href="' + esc(F.url(S.as())) + '" data-myprofile>My profile</a>' + (me.muted ? '<span class="fs-muted">Posting paused by an officer</span>' : "") +
        '<button type="button" class="fs-out" data-out>Sign out</button></div>' +
        (me.bondRequests.length ? '<div class="fs-requests"><b>Bond requests</b>' + me.bondRequests.map(function (r) {
          return '<div><a href="' + esc(F.url(r.a)) + '">' + esc(S.face(d, {}, r.a).name) + "</a> asks to be " + esc(BONDS[r.kind] || r.kind) + " to " + esc(S.face(d, {}, r.b).name) +
            ' <button type="button" class="fs-chip" data-accept="' + esc(r.a) + '" data-to="' + esc(r.b) + '">Accept</button> <button type="button" class="fs-chip" data-decline="' + esc(r.a) + '" data-to="' + esc(r.b) + '">Decline</button></div>';
        }).join("") + "</div>" : "");
      host.querySelector("[data-as]").addEventListener("change", function () { S.setAs(this.value); host.querySelector("[data-myprofile]").href = F.url(this.value); if (onChange) onChange(); });
      host.querySelector("[data-out]").addEventListener("click", S.signOut);
      host.addEventListener("click", function (e) {
        var a = e.target.closest("[data-accept]"), x = e.target.closest("[data-decline]");
        if (a) S.api("/bonds/accept", { method: "POST", body: { as: a.dataset.to, from: a.dataset.accept } }).then(function () { S.me = null; return S.bar(host, d, onChange); }).catch(function (er) { alert(er.message); });
        if (x) S.api("/bonds?as=" + encodeURIComponent(x.dataset.to) + "&other=" + encodeURIComponent(x.dataset.decline), { method: "DELETE" }).then(function () { S.me = null; return S.bar(host, d, onChange); }).catch(function (er) { alert(er.message); });
      });
      return me;
    });
  };

  S.composer = function (host, d, wall, onPosted) {
    if (!S.on || !S.signedIn()) { host.innerHTML = ""; return; }
    var pic = null;
    host.innerHTML = '<form class="fs-compose">' +
      (wall ? "" : '<div class="fs-status"><input type="text" maxlength="140" placeholder="Your status: Basking on the Warm Ridge…" data-status aria-label="Set your status"><button type="button" class="fs-chip" data-set-status>Set status</button></div>') +
      '<textarea maxlength="1000" rows="3" placeholder="' + (wall ? "Write on their wall, in character…" : "What stirs beneath the Coil today?") + '" data-body aria-label="Write a post"></textarea>' +
      '<div class="fs-compose-row"><label class="fs-chip fs-file">Add a picture<input type="file" accept="image/*" data-file hidden></label><span class="fs-picnote" data-picnote></span>' +
      '<button type="submit" class="btn">Post</button></div></form>';
    var f = host.querySelector("form");
    f.querySelector("[data-file]").addEventListener("change", function () {
      var file = this.files && this.files[0]; this.value = ""; if (!file) return;
      var note = f.querySelector("[data-picnote]"); note.textContent = "Preparing the picture…";
      S.upload(file, "post").then(function (r) { pic = r.id; note.textContent = "Picture attached. It shows once an officer approves it."; })
        .catch(function (e) { note.textContent = e.message; });
    });
    var st = f.querySelector("[data-set-status]");
    if (st) st.addEventListener("click", function () {
      var v = f.querySelector("[data-status]").value;
      S.api("/status", { method: "POST", body: { as: S.as(), text: v } }).then(function () { f.querySelector("[data-status]").value = ""; if (onPosted) onPosted(); }).catch(function (e) { alert(e.message); });
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = f.querySelector("[data-body]").value;
      if (!body.trim() && !pic) return;
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      S.api("/posts", { method: "POST", body: { as: S.as(), wall: wall || undefined, body: body, pic: pic || undefined } }).then(function () {
        f.querySelector("[data-body]").value = ""; pic = null; f.querySelector("[data-picnote]").textContent = ""; btn.disabled = false; if (onPosted) onPosted();
      }).catch(function (x) { btn.disabled = false; alert(x.message); });
    });
  };
})();
