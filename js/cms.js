/* Sanctum Editor: a small CMS for the Xal'Reth site (admin.html).
   The site is static on GitHub Pages, so "saving" means committing the changed files to the repo
   through the GitHub API with the editor's own fine-grained token (Contents: read and write).
   The token lives only in the browser (sessionStorage, or localStorage if "keep me signed in").
   Pages are edited in place: the page's HTML is loaded from GitHub, shown without its scripts,
   text blocks become editable on tap, pictures can be swapped, and Save writes the file back. */
(function () {
  "use strict";

  var REPO = "jcali0351/xal-reth", BRANCH = "main", API = "https://api.github.com";
  var SITE = new URL(".", location.href).href;          // the site's root (admin.html sits there)
  var LIVE = "https://jcali0351.github.io/xal-reth/";
  var KEY = "xr-cms-token";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- storage + token */
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function getToken() {
    var s = store("sessionStorage"), l = store("localStorage");
    try { return (s && s.getItem(KEY)) || (l && l.getItem(KEY)) || ""; } catch (e) { return ""; }
  }
  function setToken(t, remember) {
    var s = store("sessionStorage"), l = store("localStorage");
    try { if (s) s.setItem(KEY, t); } catch (e) {}
    try { if (l) { if (remember) l.setItem(KEY, t); else l.removeItem(KEY); } } catch (e) {}
  }
  function clearToken() {
    try { store("sessionStorage").removeItem(KEY); } catch (e) {}
    try { store("localStorage").removeItem(KEY); } catch (e) {}
  }
  var token = getToken();

  /* ---------------------------------------------------------------- small helpers */
  var toastTimer;
  function toast(msg, err) {
    var t = $("#cms-toast"); t.textContent = msg; t.classList.toggle("err", !!err); t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, err ? 7000 : 3800);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function slugify(s, max) {
    return String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max || 60).replace(/-+$/, "") || "item";
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "Saving…"; btn.classList.add("busy"); }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.classList.remove("busy"); }
  }
  function confirmBox(title, text, okLabel) {
    return new Promise(function (res) {
      var d = $("#dlg-confirm"); $("#dcf-title").textContent = title; $("#dcf-text").textContent = text;
      $("#dcf-ok").textContent = okLabel || "OK";
      d.returnValue = ""; d.showModal();
      d.addEventListener("close", function h() { d.removeEventListener("close", h); res(d.returnValue === "ok"); });
    });
  }
  function dialog(id) {
    return new Promise(function (res) {
      var d = $(id); d.returnValue = ""; d.showModal();
      d.addEventListener("close", function h() { d.removeEventListener("close", h); res(d.returnValue === "ok"); });
    });
  }
  $$(".cms-dialog").forEach(function (d) {
    d.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "file") { e.preventDefault(); d.close("ok"); }
    });
  });
  function textOf(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }

  /* text <-> base64 (UTF-8 safe) */
  function b64ToText(b64) {
    var bin = atob(b64.replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onload = function () { res(String(r.result).split(",")[1]); }; r.onerror = rej; r.readAsDataURL(blob);
    });
  }

  /* ---------------------------------------------------------------- GitHub API */
  function gh(path, opts) {
    opts = opts || {};
    var headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(API + path, { method: opts.method || "GET", headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: "no-store" })
      .then(function (r) {
        if (r.ok) return r.status === 204 ? null : r.json();
        return r.json().catch(function () { return {}; }).then(function (j) {
          var msg = j.message || ("GitHub answered " + r.status);
          if (r.status === 401) msg = "GitHub didn't accept the key. It may have expired: sign out and sign in with a new one.";
          if (r.status === 403 && /permission|Resource not accessible/i.test(msg)) msg = "The key can read the site but not change it. On GitHub, give it Contents: Read and write.";
          var e = new Error(msg); e.status = r.status; throw e;
        });
      });
  }
  var R = "/repos/" + REPO;

  /* the file list (paths + blob ids) at the tip of main */
  var tree = new Map(), headSha = "";
  function loadTree() {
    return gh(R + "/git/ref/heads/" + BRANCH).then(function (ref) {
      headSha = ref.object.sha;
      return gh(R + "/git/commits/" + headSha);
    }).then(function (c) { return gh(R + "/git/trees/" + c.tree.sha + "?recursive=1"); })
      .then(function (t) {
        tree = new Map();
        t.tree.forEach(function (it) { if (it.type === "blob") tree.set(it.path, { sha: it.sha, size: it.size }); });
        return tree;
      });
  }
  function readText(path) {
    var it = tree.get(path);
    if (!it) return Promise.reject(new Error(path + " isn't on the site."));
    return gh(R + "/git/blobs/" + it.sha).then(function (b) { return { text: b64ToText(b.content), sha: it.sha }; });
  }

  /* One commit for any number of files.
     changes: [{ path, text } | { path, base64 } | { path, remove: true }], each optionally { base: blobSha the edit started from }.
     If someone (or the hourly Herald) pushed in between, it retries on top of their commit, but stops if
     one of *our* files changed underneath us, so nothing gets silently overwritten. */
  function commit(changes, message) {
    var attempt = 0;
    function go() {
      attempt++;
      var head, baseTree;
      return gh(R + "/git/ref/heads/" + BRANCH).then(function (ref) {
        head = ref.object.sha; return gh(R + "/git/commits/" + head);
      }).then(function (c) {
        baseTree = c.tree.sha;
        if (!changes.some(function (ch) { return ch.base !== undefined; })) return null;
        return gh(R + "/git/trees/" + baseTree + "?recursive=1");
      }).then(function (t) {
        if (t) {
          var now = new Map(); t.tree.forEach(function (it) { now.set(it.path, it.sha); });
          changes.forEach(function (ch) {
            if (ch.base !== undefined && (now.get(ch.path) || null) !== (ch.base || null))
              throw new Error(ch.path + " was changed on GitHub after you opened it. Close it, open it again and redo this edit.");
          });
        }
        return Promise.all(changes.map(function (ch) {
          if (ch.remove) return Promise.resolve({ path: ch.path, mode: "100644", type: "blob", sha: null });
          var body = ch.base64 != null ? { content: ch.base64, encoding: "base64" } : { content: ch.text, encoding: "utf-8" };
          return gh(R + "/git/blobs", { method: "POST", body: body }).then(function (b) { return { path: ch.path, mode: "100644", type: "blob", sha: b.sha }; });
        }));
      }).then(function (entries) {
        return gh(R + "/git/trees", { method: "POST", body: { base_tree: baseTree, tree: entries } });
      }).then(function (nt) {
        return gh(R + "/git/commits", { method: "POST", body: { message: message + "\n\nSaved from the Sanctum Editor (admin.html).", tree: nt.sha, parents: [head] } });
      }).then(function (nc) {
        return gh(R + "/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: nc.sha, force: false } }).then(function () { return nc; });
      }).catch(function (e) {
        if (e.status === 422 && attempt < 4) return new Promise(function (r) { setTimeout(r, 800 * attempt); }).then(go);
        throw e;
      });
    }
    return go().then(function (nc) {
      return loadTree().catch(function () {}).then(function () { return nc; });
    });
  }
  function published(what) { toast(what + " Saved. It'll be live in about a minute."); }

  /* ---------------------------------------------------------------- images */
  var RASTER = /\.(jpe?g|png|webp)$/i;
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res({ img: img, url: url }); };
      img.onerror = function () { rej(new Error("That file doesn't look like a picture this browser can read.")); };
      img.src = url;
    });
  }
  /* Resize big photos and re-encode. type: "image/webp" | "image/jpeg" | "image/png" | null (keep as uploaded). */
  function prepImage(file, type, maxDim) {
    maxDim = maxDim || 2000;
    var ext = (file.name.match(/\.([a-z0-9]+)$/i) || [, ""])[1].toLowerCase();
    if (!type && (file.type === "image/gif" || file.type === "image/svg+xml" || ext === "gif" || ext === "svg"))
      return Promise.resolve({ blob: file, ext: ext === "svg" || file.type === "image/svg+xml" ? "svg" : "gif", width: 0, height: 0 });
    return loadImage(file).then(function (o) {
      var w = o.img.naturalWidth, h = o.img.naturalHeight, k = Math.min(1, maxDim / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * k)), chh = Math.max(1, Math.round(h * k));
      var want = type || "image/webp";
      var keep = !type && k === 1 && file.size < 900 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type);
      if (keep) { URL.revokeObjectURL(o.url); return { blob: file, ext: file.type.split("/")[1].replace("jpeg", "jpg"), width: w, height: h }; }
      var c = document.createElement("canvas"); c.width = cw; c.height = chh;
      var g = c.getContext("2d");
      if (want === "image/jpeg") { g.fillStyle = "#08050f"; g.fillRect(0, 0, cw, chh); }
      g.drawImage(o.img, 0, 0, cw, chh); URL.revokeObjectURL(o.url);
      return new Promise(function (res) { c.toBlob(res, want, 0.88); }).then(function (blob) {
        if (!blob) throw new Error("The picture couldn't be converted.");
        if (type && blob.type !== type) throw new Error("This browser can't save " + type.split("/")[1] + " pictures. Try Chrome, or upload a ." + type.split("/")[1] + " file.");
        return { blob: blob, ext: blob.type.split("/")[1].replace("jpeg", "jpg"), width: cw, height: chh };
      });
    });
  }
  function uploadPath(name, ext) {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    var stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
    return "img/uploads/" + stamp + "-" + slugify(String(name).replace(/\.[a-z0-9]+$/i, ""), 40) + "." + ext;
  }

  /* ================================================================ SIGN IN */
  function showLogin(msg) {
    $("#cms-login").hidden = false; $("#cms-app").hidden = true; $(".cms-who").hidden = true;
    if (msg) { var m = $("#cms-login-msg"); m.textContent = msg; m.className = "cms-msg err"; }
    setTimeout(function () { $("#cms-token").focus(); }, 50);
  }
  function signIn() {
    return gh(R).then(function (repo) {
      if (repo.permissions && repo.permissions.push === false) throw new Error("This GitHub account can't change the site.");
      return gh("/user").catch(function () { return {}; });
    }).then(function (u) {
      $(".cms-user").textContent = u && u.login ? "Signed in as " + u.login : "Signed in";
      $(".cms-who").hidden = false; $("#cms-login").hidden = true; $("#cms-app").hidden = false;
      return startApp();
    });
  }
  $("#cms-login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = $("#cms-token").value.trim(), m = $("#cms-login-msg"), btn = e.target.querySelector("button");
    if (!t) return;
    token = t; m.textContent = "Checking the key…"; m.className = "cms-msg"; busy(btn, true, "Checking…");
    signIn().then(function () {
      setToken(t, $("#cms-remember").checked); $("#cms-token").value = "";
    }).catch(function (err) {
      token = ""; m.textContent = err.status === 404 ? "That key can't see the xal-reth repository. When you make it, choose Only select repositories › xal-reth." : err.message; m.className = "cms-msg err";
    }).then(function () { busy(btn, false); });
  });
  $("[data-signout]").addEventListener("click", function () {
    if (dirtyAnywhere() && !window.confirm("You have unsaved changes. Sign out anyway?")) return;
    clearToken(); token = ""; location.hash = ""; location.reload();
  });

  /* ================================================================ DASHBOARD */
  var titles = {}; // page -> title, from search-index.json
  function startApp() {
    fetch(SITE + "search-index.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) { list.forEach(function (it) { if (it.u && it.u.indexOf("#") < 0) titles[it.u] = it.t; }); })
      .catch(function () {}).then(renderPages);
    return loadTree().then(function () {
      renderPages(); renderImages(); renderBlog(); loadHero(); loadSky();
      route();
    }).catch(function (e) { toast(e.message, true); });
  }
  $$(".cms-tabs button").forEach(function (b) {
    b.addEventListener("click", function () { showTab(b.dataset.tab); });
  });
  function showTab(name) {
    $$(".cms-tabs button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === name ? "true" : "false"); });
    $$(".cms-panel").forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    if (!tree.size) return;   // refresh what the tab shows, in case something else changed the site meanwhile
    if (name === "blog") renderBlog();
    if (name === "images") renderImages();
    if (name === "hero" && !(hero && hero.dirty)) loadHero();
    if (name === "sky" && !(sky && sky.dirty)) loadSky();
    if (name === "bank") loadBank();
  }
  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    var m = h.match(/^edit=(.+\.html)$/);
    if (m && tree.has(m[1])) {
      if (/^post-.+\.html$/.test(m[1])) { showTab("blog"); openPost(m[1]); } else openEditor(m[1]);
    }
  }

  /* ---------- Pages list */
  function pageGroups() {
    var pages = Array.from(tree.keys()).filter(function (p) { return /^[^/]+\.html$/.test(p) && p !== "admin.html" && p !== "roster-admin.html"; }).sort();
    var g = { "Main pages": [], "Blog posts": [], "Coil Herald posts": [], "Addon pages": [] };
    pages.forEach(function (p) {
      if (/^post-/.test(p)) g["Blog posts"].push(p);
      else if (/^herald-/.test(p)) g["Coil Herald posts"].push(p);
      else if (/^addon-/.test(p)) g["Addon pages"].push(p);
      else g["Main pages"].push(p);
    });
    g["Main pages"].sort(function (a, b) { return a === "index.html" ? -1 : b === "index.html" ? 1 : 0; });
    g["Coil Herald posts"].reverse();
    return g;
  }
  function prettyName(p) {
    if (titles[p]) return titles[p];
    if (p === "index.html") return "Homepage";
    return p.replace(/\.html$/, "").replace(/^(herald-\d{8}-\d{4}-|post-|addon-)/, "").replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function renderPages() {
    var box = $("#pages-list"); if (!tree.size) return;
    var q = $("#pages-search").value.trim().toLowerCase(), g = pageGroups(), html = "";
    Object.keys(g).forEach(function (k) {
      var rows = g[k].filter(function (p) { return !q || (p + " " + prettyName(p)).toLowerCase().indexOf(q) >= 0; });
      if (!rows.length) return;
      html += '<p class="cms-group">' + esc(k) + "</p>";
      rows.forEach(function (p) {
        var big = (tree.get(p).size || 0) > 1500000;
        html += '<div class="cms-row"><div class="grow"><span class="t">' + esc(prettyName(p)) + '</span><span class="s">' + esc(p) + (big ? " · very long page, may be slow" : "") + "</span></div>" +
          '<div class="acts">' + (/^post-/.test(p) ? '<button class="cms-btn ghost small" data-open-post="' + esc(p) + '">Edit post</button>' : "") +
          '<button class="cms-btn small" data-edit-page="' + esc(p) + '">Edit</button></div></div>';
      });
    });
    box.innerHTML = html || '<p class="cms-hint">No pages match.</p>';
  }
  $("#pages-search").addEventListener("input", renderPages);
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-edit-page]"); if (b) { e.preventDefault(); openEditor(b.dataset.editPage); return; }
    var p = e.target.closest("[data-open-post]"); if (p) { e.preventDefault(); showTab("blog"); openPost(p.dataset.openPost); }
  });

  /* ================================================================ VISUAL PAGE EDITOR */
  var BLOCKS = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,dt,dd,summary,caption,label,button,a,span,small,b,strong,em,i,time,cite,legend,div";
  var CONTAINERS = "div,section,article,header,footer,nav,main,aside,ul,ol,dl,table,tbody,thead,tr,figure,form,p,h1,h2,h3,h4,h5,h6,blockquote,li,picture,img,canvas,svg,video,iframe,input,select,textarea,details";
  var SINGLE_LINE = /^(H[1-6]|BUTTON|A|SPAN|SMALL|B|STRONG|EM|I|TIME|LABEL|SUMMARY|LEGEND|CAPTION|CITE|TH)$/;
  var ed = null; // current editor session
  var keepScroll = 0;

  function openEditor(path) {
    if (!tree.has(path)) { toast(path + " isn't on the site.", true); return; }
    var box = $("#cms-editor");
    box.hidden = false; document.body.style.overflow = "hidden";
    $(".ed-file", box).textContent = path; $("[data-ed-live]").href = LIVE + path;
    $("[data-ed-save]").disabled = true; $("[data-ed-save]").textContent = "Save";
    var frame = $(".ed-frame", box); frame.srcdoc = '<body style="background:#08050f;color:#b0a6c4;font:20px Georgia;padding:30px">Opening ' + esc(path) + "…</body>";
    location.hash = "edit=" + path;
    readText(path).then(function (f) { buildEditor(path, f.text, f.sha); })
      .catch(function (e) { toast(e.message, true); closeEditor(true); });
  }

  function buildEditor(path, source, sha) {
    var doc = new DOMParser().parseFromString(source, "text/html");
    var n = 0, codeIds = new Set();
    doc.querySelectorAll("*").forEach(function (el) { el.setAttribute("data-cms-i", n++); });
    // anything that runs code (scripts, inline handlers) can't be edited as text, or the code would be lost
    doc.querySelectorAll("script,noscript,template,style,iframe,svg").forEach(function (el) {
      for (var a = el; a; a = a.parentElement) codeIds.add(a.getAttribute("data-cms-i"));
    });
    doc.querySelectorAll("*").forEach(function (el) {
      for (var i = 0; i < el.attributes.length; i++) if (/^on/i.test(el.attributes[i].name)) {
        for (var a = el; a; a = a.parentElement) codeIds.add(a.getAttribute("data-cms-i"));
        break;
      }
    });

    var work = doc.cloneNode(true);
    work.querySelectorAll("script, meta[http-equiv]").forEach(function (s) { s.remove(); });
    work.querySelectorAll("*").forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) { if (/^on/i.test(a.name)) el.removeAttribute(a.name); });
    });
    var base = work.createElement("base"); base.href = SITE; work.head.insertBefore(base, work.head.firstChild);
    var st = work.createElement("style"); st.textContent = FRAME_CSS; work.head.appendChild(st);
    // show things that normally wait for their scripts to appear
    work.querySelectorAll("[data-alliance]").forEach(function (s) { s.classList.add("in"); });

    ed = { path: path, sha: sha, doc: doc, codeIds: codeIds, dirty: new Set(), attrs: {}, images: {}, head: null, frameDoc: null };
    var frame = $("#cms-editor .ed-frame");
    frame.onload = function () { wireFrame(frame); };
    frame.srcdoc = "<!doctype html>" + work.documentElement.outerHTML;
  }

  var FRAME_CSS = [
    "[data-cms-ed]{cursor:text;outline:1px dashed transparent;outline-offset:3px;transition:outline-color .15s}",
    "[data-cms-ed]:hover{outline-color:rgba(201,162,255,.85)}",
    "@media (hover:none){[data-cms-ed]{outline-color:rgba(201,162,255,.22)}}",
    "[data-cms-dirty]{outline:1px solid rgba(127,227,154,.75)!important}",
    "[data-cms-ed][contenteditable]{outline:2px solid #c9a2ff!important;background:rgba(20,10,35,.75)!important;color:#fff!important;-webkit-text-fill-color:#fff!important;animation:none!important;opacity:1!important;transform:none!important}",
    "img[data-cms-img]{cursor:pointer}",
    "img[data-cms-img]:hover{outline:3px solid #c9a2ff;outline-offset:-3px}",
    "[data-cms-newimg]{outline:3px solid #7fe39a!important;outline-offset:-3px}",
    "html{scroll-behavior:auto}"
  ].join("\n");

  function ownText(el) {
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.nodeValue.trim()) return true;
    return false;
  }
  function wireFrame(frame) {
    var fd = frame.contentDocument; if (!fd || !ed) return;
    ed.frameDoc = fd;
    // mark what can be edited: the outermost text blocks that contain no layout of their own
    var cands = Array.prototype.slice.call(fd.body.querySelectorAll(BLOCKS)).filter(function (el) {
      if (ed.codeIds.has(el.getAttribute("data-cms-i"))) return false;
      if (!el.textContent.trim()) return false;
      if (el.querySelector(CONTAINERS)) return false;
      if (el.tagName === "DIV" || el.tagName === "SPAN" || el.tagName === "A" || el.tagName === "BUTTON") {
        if (!ownText(el) && el.children.length !== 1) return false;
      }
      return true;
    });
    var set = new Set(cands);
    cands.forEach(function (el) {
      for (var a = el.parentElement; a; a = a.parentElement) if (set.has(a)) return;
      el.setAttribute("data-cms-ed", "");
    });
    fd.body.querySelectorAll("img").forEach(function (img) {
      if (!ed.codeIds.has(img.getAttribute("data-cms-i"))) img.setAttribute("data-cms-img", "");
    });

    fd.addEventListener("click", function (e) {
      var img = e.target.closest && e.target.closest("img[data-cms-img]");
      var blk = e.target.closest && e.target.closest("[data-cms-ed]");
      if (e.target.closest && e.target.closest("a,button,form,label,summary")) e.preventDefault();
      if (img && !blk) { e.preventDefault(); finishEditing(); replaceImageInPage(img); return; }
      if (blk) { if (blk !== ed.active) startEditing(blk); return; }
      finishEditing();
    }, true);
    fd.addEventListener("submit", function (e) { e.preventDefault(); }, true);
    fd.addEventListener("keydown", function (e) {
      var a = ed && ed.active; if (!a) return;
      if (e.key === "Escape") { e.preventDefault(); finishEditing(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!SINGLE_LINE.test(a.tagName)) fd.execCommand("insertLineBreak");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveEditor(); }
    });
    fd.addEventListener("paste", function (e) {
      if (!ed || !ed.active) return;
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData("text/plain");
      fd.execCommand("insertText", false, SINGLE_LINE.test(ed.active.tagName) ? t.replace(/\s*\n\s*/g, " ") : t);
    });
    fd.addEventListener("input", function () { if (ed && ed.active) markDirty(ed.active); });
    if (keepScroll) { try { fd.defaultView.scrollTo(0, keepScroll); } catch (e) {} keepScroll = 0; }
    updateTools();
  }
  function startEditing(el) {
    finishEditing();
    ed.active = el;
    el.setAttribute("contenteditable", "true"); el.setAttribute("spellcheck", "true");
    el.focus();
    updateTools();
  }
  function finishEditing() {
    if (!ed || !ed.active) return;
    var el = ed.active; ed.active = null;
    el.removeAttribute("contenteditable"); el.removeAttribute("spellcheck");
    updateTools();
  }
  function markDirty(el) {
    ed.dirty.add(el); el.setAttribute("data-cms-dirty", ""); updateSave();
  }
  function changeCount() {
    if (!ed) return 0;
    return ed.dirty.size + Object.keys(ed.attrs).length + Object.keys(ed.images).length + (ed.head ? 1 : 0);
  }
  function updateSave() {
    var c = changeCount(), b = $("[data-ed-save]");
    b.disabled = !c; b.textContent = c ? "Save " + c + " change" + (c > 1 ? "s" : "") : "Save";
  }
  function updateTools() {
    var on = !!(ed && ed.active);
    $$("#cms-editor .ed-tool").forEach(function (b) { b.disabled = !on; });
  }

  /* toolbar: work on the text being edited */
  $$("#cms-editor .ed-tool").forEach(function (b) {
    b.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep the selection in the page
    b.addEventListener("click", function () {
      if (!ed || !ed.active) return;
      var fd = ed.frameDoc, cmd = b.dataset.cmd;
      if (cmd === "link") return editLink();
      fd.execCommand(cmd, false, null);
      markDirty(ed.active);
    });
  });
  function editLink() {
    var fd = ed.frameDoc, sel = fd.getSelection(), active = ed.active;
    var node = sel && sel.anchorNode, a = node && (node.nodeType === 1 ? node : node.parentElement).closest("a");
    if (!a && active.closest("a")) a = active.closest("a");
    var range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    $("#dl-href").value = a ? a.getAttribute("href") || "" : "";
    if (!a && (!range || range.collapsed)) { toast("Select the words you want to turn into a link first."); return; }
    dialog("#dlg-link").then(function (ok) {
      if (!ok) return;
      var href = $("#dl-href").value.trim();
      if (a) {
        if (!href) { a.replaceWith.apply(a, Array.prototype.slice.call(a.childNodes)); }
        else a.setAttribute("href", href);
        if (a.hasAttribute("data-cms-i") && !active.contains(a)) ed.attrs[a.getAttribute("data-cms-i")] = { href: href };
      } else if (href) {
        sel.removeAllRanges(); sel.addRange(range);
        fd.execCommand("createLink", false, href);
        if (/^https?:/i.test(href) && href.indexOf(LIVE) !== 0) {
          var made = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement).closest("a");
          if (made) { made.setAttribute("target", "_blank"); made.setAttribute("rel", "noopener"); }
        }
      }
      markDirty(active);
    });
  }

  /* replace a picture on the page */
  var imgDlg = { file: null, prepared: null };
  function openImageDialog(oldSrc, alt, opts) {
    opts = opts || {};
    imgDlg.file = null; imgDlg.prepared = null;
    $("#di-old").src = oldSrc; $("#di-new").removeAttribute("src");
    $("#di-file").value = ""; $("#di-ok").disabled = true;
    $("#di-alt-wrap").hidden = !!opts.noAlt; $("#di-alt").value = alt || "";
    $("#di-twin-wrap").hidden = !opts.twin; if (opts.twin) $("#di-twin-text").textContent = "Also replace " + opts.twin + " (the same picture in another format; some browsers show that one)";
    $("#di-note").textContent = opts.note || "";
    return dialog("#dlg-image").then(function (ok) { return ok && imgDlg.file ? { file: imgDlg.file, alt: $("#di-alt").value.trim(), twin: opts.twin && $("#di-twin").checked } : null; });
  }
  $("#di-file").addEventListener("change", function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { toast("Please choose a picture file.", true); return; }
    imgDlg.file = f; $("#di-new").src = URL.createObjectURL(f); $("#di-ok").disabled = false;
  });
  function replaceImageInPage(img) {
    var id = img.getAttribute("data-cms-i");
    openImageDialog(img.currentSrc || img.src, img.getAttribute("alt"), { note: "The picture is resized for the web and saved in img/uploads/. Pictures used on many pages (or in the page background) are easier to change in the Images tab." })
      .then(function (r) {
        if (!r) return;
        return prepImage(r.file, null).then(function (p) {
          var url = URL.createObjectURL(p.blob);
          img.removeAttribute("srcset"); img.src = url; img.setAttribute("alt", r.alt);
          var pic = img.parentElement && img.parentElement.tagName === "PICTURE" ? img.parentElement : null;
          if (pic) pic.querySelectorAll("source").forEach(function (s) { s.remove(); });
          img.setAttribute("data-cms-newimg", "");
          ed.images[id] = { prepared: p, alt: r.alt, name: r.file.name };
          updateSave();
        });
      }).catch(function (e) { toast(e.message, true); });
  }

  /* page title & description */
  function metaEl(doc, sel) { return doc.querySelector(sel); }
  $("[data-ed-settings]").addEventListener("click", function () {
    if (!ed) return;
    var d = ed.doc, h = ed.head || {};
    $("#ds-title").value = h.title != null ? h.title : (d.title || "");
    var m = metaEl(d, 'meta[name="description"]');
    $("#ds-desc").value = h.desc != null ? h.desc : (m ? m.getAttribute("content") : "");
    dialog("#dlg-settings").then(function (ok) {
      if (!ok) return;
      ed.head = { title: $("#ds-title").value.trim(), desc: $("#ds-desc").value.trim() };
      updateSave();
    });
  });
  function applyHead(d, head) {
    if (!head) return;
    if (head.title) {
      var t = d.querySelector("title"); if (t) t.textContent = head.title;
      ['meta[property="og:title"]', 'meta[name="twitter:title"]'].forEach(function (s) { var m = d.querySelector(s); if (m) m.setAttribute("content", head.title); });
    }
    ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(function (s) {
      var m = d.querySelector(s); if (m) m.setAttribute("content", head.desc);
    });
    d.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
      try {
        var j = JSON.parse(s.textContent);
        if (j["@type"] === "WebPage") { if (head.title) j.name = head.title; j.description = head.desc; s.textContent = JSON.stringify(j); }
      } catch (e) {}
    });
  }

  /* code view */
  $("[data-ed-code]").addEventListener("click", function () {
    if (!ed) return;
    if (changeCount()) { toast("Save or undo your changes on the page first, then open the HTML."); return; }
    var path = ed.path, sha = ed.sha;
    readText(path).then(function (f) {
      $("#dc-code").value = f.text;
      return dialog("#dlg-code").then(function (ok) {
        if (!ok || $("#dc-code").value === f.text) return;
        toast("Saving…");
        return commit([{ path: path, text: $("#dc-code").value, base: sha }], "CMS: Edit " + path + " (HTML)").then(function () {
          published(path); openEditor(path);
        });
      });
    }).catch(function (e) { toast(e.message, true); });
  });

  /* serialize the edited document */
  function serialize(doc) {
    var dt = doc.doctype ? "<!DOCTYPE " + doc.doctype.name + (doc.doctype.publicId ? ' PUBLIC "' + doc.doctype.publicId + '"' : "") + (doc.doctype.systemId ? ' "' + doc.doctype.systemId + '"' : "") + ">\n" : "";
    var out = doc.documentElement.outerHTML + "\n";
    // keep the original's lower-case doctype if it had one
    return dt.replace(/^<!DOCTYPE html>/, "<!doctype html>") + out;
  }
  function cleanCopy(el) {
    var c = el.cloneNode(true);
    [c].concat(Array.prototype.slice.call(c.querySelectorAll("*"))).forEach(function (x) {
      ["contenteditable", "spellcheck", "data-cms-ed", "data-cms-dirty", "data-cms-img", "data-cms-newimg"].forEach(function (a) { x.removeAttribute(a); });
    });
    // typing leaves non-breaking spaces next to normal ones; tidy those runs into one space
    var w = c.ownerDocument.createTreeWalker(c, 4), t;
    while ((t = w.nextNode())) if (/[ \u00a0]{2,}/.test(t.nodeValue)) t.nodeValue = t.nodeValue.replace(/[ \u00a0]{2,}/g, " ");
    return c;
  }
  function saveEditor() {
    if (!ed || !changeCount()) return;
    finishEditing();
    var btn = $("[data-ed-save]"), d = ed.doc.cloneNode(true), changes = [], session = ed;
    busy(btn, true);
    // 1) text
    ed.dirty.forEach(function (w) {
      var id = w.getAttribute("data-cms-i"), o = id && d.querySelector('[data-cms-i="' + id + '"]');
      if (!o) return;
      var oldText = textOf(o);
      o.innerHTML = cleanCopy(w).innerHTML;
      if (o.hasAttribute("aria-label") && o.getAttribute("aria-label").trim() === oldText) o.setAttribute("aria-label", textOf(o));
      var host = o.closest("[aria-label]");
      if (host && host !== o && host.getAttribute("aria-label").trim() === oldText) host.setAttribute("aria-label", textOf(o));
    });
    // 2) attributes (links on cards etc.)
    Object.keys(ed.attrs).forEach(function (id) {
      var o = d.querySelector('[data-cms-i="' + id + '"]'); if (!o) return;
      var a = ed.attrs[id]; Object.keys(a).forEach(function (k) { if (a[k]) o.setAttribute(k, a[k]); });
    });
    // 3) head
    applyHead(d, ed.head);
    // 4) images
    var ups = Object.keys(ed.images).map(function (id) {
      var im = ed.images[id], path = uploadPath(im.name, im.prepared.ext);
      var o = d.querySelector('[data-cms-i="' + id + '"]');
      return blobToB64(im.prepared.blob).then(function (b64) {
        changes.push({ path: path, base64: b64 });
        if (!o) return;
        o.setAttribute("src", path); o.removeAttribute("srcset"); o.removeAttribute("sizes"); o.setAttribute("alt", im.alt);
        if (im.prepared.width && o.hasAttribute("width")) { o.setAttribute("width", im.prepared.width); o.setAttribute("height", im.prepared.height); }
        var pic = o.parentElement && o.parentElement.tagName === "PICTURE" ? o.parentElement : null;
        if (pic) pic.querySelectorAll("source").forEach(function (s) { s.remove(); });
      });
    });
    Promise.all(ups).then(function () {
      var out = d.cloneNode(true);
      out.querySelectorAll("[data-cms-i]").forEach(function (x) { x.removeAttribute("data-cms-i"); });
      changes.push({ path: session.path, text: serialize(out), base: session.sha });
      return commit(changes, "CMS: Edit " + session.path);
    }).then(function () {
      published(session.path);
      busy(btn, false);
      if (ed === session) {   // reload from GitHub so the next save starts fresh, at the same spot
        try { keepScroll = session.frameDoc.defaultView.scrollY; } catch (e) {}
        openEditor(session.path);
      }
    }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  }
  $("[data-ed-save]").addEventListener("click", saveEditor);
  function closeEditor(force) {
    if (!force && changeCount() && !window.confirm("Leave without saving your changes?")) return;
    ed = null; $("#cms-editor").hidden = true; document.body.style.overflow = "";
    $("#cms-editor .ed-frame").srcdoc = ""; if (/^#edit=/.test(location.hash)) history.replaceState(null, "", location.pathname);
  }
  $("[data-ed-close]").addEventListener("click", function () { closeEditor(false); });

  function dirtyAnywhere() { return changeCount() > 0 || (post && post.dirty) || (hero && hero.dirty) || (sky && sky.dirty); }
  window.addEventListener("beforeunload", function (e) { if (dirtyAnywhere()) { e.preventDefault(); e.returnValue = ""; } });

  /* ================================================================ IMAGES (replace a file in place) */
  var IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
  function renderImages() {
    var box = $("#images-grid"), q = $("#images-search").value.trim().toLowerCase();
    var list = Array.from(tree.keys()).filter(function (p) { return IMG_EXT.test(p) && (!q || p.toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { var ua = /^img\/uploads\//.test(a), ub = /^img\/uploads\//.test(b); return ua === ub ? a.localeCompare(b) : ua ? 1 : -1; });
    box.innerHTML = list.map(function (p) {
      return '<button type="button" class="cms-img" data-img="' + esc(p) + '"><img src="' + esc(SITE + p) + '?v=' + tree.get(p).sha.slice(0, 7) + '" alt="" loading="lazy"><span>' + esc(p) + "</span></button>";
    }).join("") || '<p class="cms-hint">No images match.</p>';
  }
  $("#images-search").addEventListener("input", renderImages);
  $("#images-grid").addEventListener("click", function (e) {
    var b = e.target.closest("[data-img]"); if (!b) return;
    var path = b.dataset.img, ext = path.split(".").pop().toLowerCase();
    var stem = path.replace(/\.[^.]+$/, ""), twin = null;
    ["webp", "png", "jpg", "jpeg"].forEach(function (x) { if (!twin && x !== ext && tree.has(stem + "." + x)) twin = stem + "." + x; });
    if (ext === "svg" || ext === "gif" || ext === "avif") {
      toast("To change " + path + ", pick a ." + ext + " file of the same kind.");
    }
    openImageDialog(SITE + path + "?v=" + tree.get(path).sha.slice(0, 7), "", { noAlt: true, twin: twin,
      note: "The new picture is saved under the same name (" + path + "), so every page that uses it updates. Visitors may need a refresh to see it." })
      .then(function (r) {
        if (!r) return;
        var mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
        var jobs = [[path, ext]].concat(r.twin ? [[twin, twin.split(".").pop().toLowerCase()]] : []);
        toast("Preparing the picture…");
        return Promise.all(jobs.map(function (j) {
          var p = j[0], x = j[1];
          var prep = mime[x] ? prepImage(r.file, mime[x], 2400) : (r.file.name.toLowerCase().split(".").pop() === x ? Promise.resolve({ blob: r.file }) : Promise.reject(new Error("Please choose a ." + x + " file for " + p + ".")));
          return prep.then(function (pp) { return blobToB64(pp.blob); }).then(function (b64) { return { path: p, base64: b64 }; });
        })).then(function (changes) {
          toast("Saving…");
          return commit(changes, "CMS: Replace " + jobs.map(function (j) { return j[0]; }).join(" and "));
        }).then(function () { published(path); renderImages(); });
      }).catch(function (e) { toast(e.message, true); });
  });

  /* ================================================================ BLOG */
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var COIL_MONTHS = { 9: "Shedfall", 10: "Small Portions" }; // the months the Coil calendar names so far (Oct, Nov)
  function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function parseISO(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); }
  function isoOf(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function longDate(d) { return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function coilDate(d) { var m = COIL_MONTHS[d.getMonth()]; return m ? "the " + ordinal(d.getDate()) + " day of " + m + ", Year " + (d.getFullYear() - 2024) + " of the Restoration" : ""; }
  function dateFromLong(s) {
    var m = /([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(s || ""); if (!m) return null;
    var mi = MONTHS.indexOf(m[1]); return mi < 0 ? null : new Date(+m[3], mi, +m[2]);
  }

  var blogDoc = null, blogSha = "", cats = [];
  function loadBlog() {
    return readText("blog.html").then(function (f) {
      blogDoc = new DOMParser().parseFromString(f.text, "text/html"); blogSha = f.sha;
      cats = $$(".cat-btn[data-cat]", blogDoc).filter(function (b) { return b.dataset.cat !== "all"; })
        .map(function (b) { return { key: b.dataset.cat, name: catName(b) }; });
      return blogDoc;
    });
  }
  function catName(b) { // "Rites <span>4</span>" -> "Rites"
    var t = ""; b.childNodes.forEach(function (n) { if (n.nodeType === 3) t += n.nodeValue; });
    return t.replace(/\s+/g, " ").trim() || textOf(b);
  }
  function recountCats(bd) { // keep the little numbers on the category buttons right
    var cards = blogCards(bd);
    $$(".cat-btn[data-cat]", bd).forEach(function (b) {
      var n = b.dataset.cat === "all" ? cards.length : cards.filter(function (c) { return c.getAttribute("data-cat") === b.dataset.cat; }).length;
      var sp = b.querySelector("span"); if (sp) sp.textContent = n;
    });
  }
  function blogCards(doc) { return $$("a.post-card[href]", doc).filter(function (a) { return !a.classList.contains("mini"); }); }
  function renderBlog() {
    var box = $("#blog-list");
    return loadBlog().then(function (doc) {
      var cards = blogCards(doc);
      box.innerHTML = cards.map(function (a) {
        var href = a.getAttribute("href"), img = a.querySelector("img");
        return '<div class="cms-row">' + (img ? '<img src="' + esc(SITE + img.getAttribute("src")) + '" alt="" style="' + esc(img.getAttribute("style") || "") + '">' : "") +
          '<div class="grow"><span class="t">' + esc(textOf(a.querySelector("h3"))) + '</span><span class="s">' + esc(textOf(a.querySelector(".kicker"))) + (a.classList.contains("big") ? " · featured" : "") + "</span></div>" +
          '<div class="acts"><button class="cms-btn ghost small" data-edit-page="' + esc(href) + '">On the page</button><button class="cms-btn small" data-open-post="' + esc(href) + '">Edit post</button></div></div>';
      }).join("") || '<p class="cms-hint">No posts yet. Write the first one!</p>';
    }).catch(function (e) { box.innerHTML = '<p class="cms-msg err">' + esc(e.message) + "</p>"; });
  }

  /* ---------- post form */
  var post = null;
  var pf = { title: $("#pf-title"), summary: $("#pf-summary"), cat: $("#pf-cat"), date: $("#pf-date"), coil: $("#pf-coil"),
    img: $("#pf-img"), focus: $("#pf-focus"), body: $("#pf-body"), html: $("#pf-body-html"), tags: $("#pf-tags"), feature: $("#pf-feature") };
  function fillCats(sel) {
    pf.cat.innerHTML = cats.map(function (c) { return '<option value="' + esc(c.key) + '">' + esc(c.name) + "</option>"; }).join("");
    if (sel) pf.cat.value = sel;
  }
  function focusOf(style) {
    var m = /object-position:\s*([^;]+)/.exec(style || ""), v = m ? m[1].trim().split(/\s+/) : ["center", "50%"];
    var y = v[1] || "50%", n = y === "top" ? 0 : y === "bottom" ? 100 : y === "center" ? 50 : parseFloat(y);
    return { x: v[0] || "center", y: isNaN(n) ? 50 : n };
  }
  function showPostEditor(p) {
    post = p; post.dirty = false;
    $("#cms-post").hidden = false; document.body.style.overflow = "hidden";
    $("#post-file").textContent = p.isNew ? "New post" : p.path;
    $("[data-post-visual]").hidden = p.isNew; $("#pf-danger").hidden = p.isNew; $("#pf-feature-wrap").hidden = !p.isNew;
    fillCats(p.cat);
    pf.title.value = p.title || ""; pf.summary.value = p.summary || ""; pf.date.value = isoOf(p.date || new Date());
    pf.coil.value = p.coil != null ? p.coil : coilDate(p.date || new Date());
    pf.img.src = p.imgUrl || SITE + (p.img || "xalreth.jpg");
    var f = focusOf(p.imgStyle); pf.focus.value = f.y; pf.img.style.objectPosition = f.x + " " + f.y + "%";
    pf.body.innerHTML = p.body || "<p></p>"; pf.html.hidden = true; pf.body.hidden = false;
    pf.tags.value = (p.tags || []).join(", "); pf.feature.checked = true;
    $("#cms-post").scrollTop = 0;
    if (!p.isNew) location.hash = "edit=" + p.path;
    setTimeout(function () { (p.isNew ? pf.title : pf.body).focus(); }, 60);
  }
  function closePost(force) {
    if (!force && post && post.dirty && !window.confirm("Leave without publishing your changes?")) return;
    post = null; $("#cms-post").hidden = true; document.body.style.overflow = "";
    if (/^#edit=/.test(location.hash)) history.replaceState(null, "", location.pathname);
  }
  $("[data-post-close]").addEventListener("click", function () { closePost(false); });
  $("[data-post-visual]").addEventListener("click", function () { var p = post && post.path; if (p) { closePost(false); if (!post) openEditor(p); } });
  $("#post-form").addEventListener("input", function () { if (post) post.dirty = true; });
  $("#post-form").addEventListener("submit", function (e) { e.preventDefault(); });
  pf.date.addEventListener("change", function () {
    var d = parseISO(pf.date.value), c = coilDate(d);
    if (!pf.coil.value || /of the Restoration$/.test(pf.coil.value)) pf.coil.value = c;
  });
  pf.focus.addEventListener("input", function () { pf.img.style.objectPosition = focusOf(post && post.imgStyle).x + " " + pf.focus.value + "%"; });
  $("#pf-img-file").addEventListener("change", function () {
    var f = this.files && this.files[0]; if (!f || !post) return;
    post.newImg = f; pf.img.src = URL.createObjectURL(f); post.dirty = true; this.value = "";
  });

  $("[data-new-post]").addEventListener("click", function () {
    (blogDoc ? Promise.resolve() : loadBlog()).then(function () {
      showPostEditor({ isNew: true, cat: cats[0] && cats[0].key, date: new Date(), img: "xalreth.jpg", imgStyle: "object-position: center 30%", body: "<p></p>", tags: [] });
    }).catch(function (e) { toast(e.message, true); });
  });

  /* read a post page into the form */
  function bodyNodes(article) {
    var by = article.querySelector(".byline") || article.querySelector(".post-meta");
    var stop = article.querySelector(".post-tags") || article.querySelector(".post-nav");
    var nodes = [], n = by ? by.nextSibling : article.firstChild;
    while (n && n !== stop) { nodes.push(n); n = n.nextSibling; }
    return { nodes: nodes, after: by, stop: stop };
  }
  function openPost(path) {
    Promise.all([blogDoc ? Promise.resolve() : loadBlog(), readText(path)]).then(function (r) {
      var f = r[1], doc = new DOMParser().parseFromString(f.text, "text/html");
      var art = doc.querySelector("article.article") || doc.querySelector("article");
      if (!art) { toast("This post doesn't use the usual layout. Opening it on the page instead."); openEditor(path); return; }
      var head = doc.querySelector(".post-head"), chip = art.querySelector(".cat-chip");
      var catKey = chip ? ((chip.getAttribute("href") || "").match(/cat=([a-z0-9-]+)/) || [, ""])[1] : "";
      var dateSpan = $$(".post-meta > span", art).filter(function (s) { return dateFromLong(s.textContent); })[0];
      var coil = art.querySelector(".coil-date"), img = art.querySelector(".article-hero img");
      var bn = bodyNodes(art), holder = doc.createElement("div");
      bn.nodes.forEach(function (n) { holder.appendChild(n.cloneNode(true)); });
      showPostEditor({
        isNew: false, path: path, sha: f.sha, doc: doc,
        title: textOf(head && head.querySelector("h1")) || doc.title,
        summary: textOf(head && head.querySelector("p:not(.eyebrow)")),
        cat: catKey, date: dateSpan ? dateFromLong(dateSpan.textContent) : new Date(), coil: coil ? textOf(coil) : "",
        img: img ? img.getAttribute("src") : "xalreth.jpg", imgStyle: img ? img.getAttribute("style") || "" : "",
        body: holder.innerHTML.trim(), tags: $$(".post-tags .tag", art).map(textOf)
      });
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ---------- rich text */
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
  $$(".rt-bar button").forEach(function (b) {
    b.addEventListener("mousedown", function (e) { if (b.dataset.rt !== "html") e.preventDefault(); });
    b.addEventListener("click", function () {
      var c = b.dataset.rt;
      if (c === "html") {
        if (pf.html.hidden) { pf.html.value = cleanBody(pf.body.innerHTML); pf.html.hidden = false; pf.body.hidden = true; b.textContent = "Visual"; }
        else { pf.body.innerHTML = pf.html.value; pf.html.hidden = true; pf.body.hidden = false; b.textContent = "HTML"; }
        return;
      }
      if (!pf.html.hidden) return;
      pf.body.focus();
      if (c === "p" || c === "h2" || c === "h3" || c === "blockquote") document.execCommand("formatBlock", false, c === "p" ? "P" : c.toUpperCase());
      else if (c === "ul") document.execCommand("insertUnorderedList");
      else if (c === "ol") document.execCommand("insertOrderedList");
      else if (c === "bold" || c === "italic" || c === "unlink") document.execCommand(c);
      else if (c === "link") {
        var sel = getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        var a = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement).closest("a");
        if (!a && (!range || range.collapsed)) { toast("Select the words you want to turn into a link first."); return; }
        $("#dl-href").value = a ? a.getAttribute("href") : "";
        dialog("#dlg-link").then(function (ok) {
          if (!ok) return; var href = $("#dl-href").value.trim();
          if (a) { if (href) a.setAttribute("href", href); else a.replaceWith.apply(a, Array.prototype.slice.call(a.childNodes)); }
          else if (href) { pf.body.focus(); sel.removeAllRanges(); sel.addRange(range); document.execCommand("createLink", false, href); }
          if (post) post.dirty = true;
        });
        return;
      }
      if (post) post.dirty = true;
    });
  });
  pf.body.addEventListener("paste", function (e) {
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData("text/plain");
    var paras = t.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (paras.length > 1) document.execCommand("insertHTML", false, paras.map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""));
    else document.execCommand("insertText", false, t);
  });
  $("#pf-body-img").addEventListener("change", function () {
    var f = this.files && this.files[0]; this.value = ""; if (!f || !post) return;
    var cap = window.prompt("Caption under the picture (optional):", "") || "";
    var alt = window.prompt("Describe the picture for screen readers (optional):", cap) || "";
    prepImage(f, null).then(function (p) {
      var url = URL.createObjectURL(p.blob), id = "u" + Date.now();
      post.bodyImgs = post.bodyImgs || {}; post.bodyImgs[url] = { prepared: p, name: f.name };
      pf.body.focus();
      document.execCommand("insertHTML", false, '<figure><img src="' + url + '" alt="' + esc(alt) + '" loading="lazy" width="' + p.width + '" height="' + p.height + '">' + (cap ? "<figcaption>" + esc(cap) + "</figcaption>" : "") + "</figure><p></p>");
      post.dirty = true;
    }).catch(function (e) { toast(e.message, true); });
  });

  /* keep the post's HTML tidy: only simple writing tags, no pasted styles */
  var KEEP = { P: 1, H2: 1, H3: 1, H4: 1, BLOCKQUOTE: 1, UL: 1, OL: 1, LI: 1, A: 1, STRONG: 1, B: 1, EM: 1, I: 1, BR: 1, FIGURE: 1, IMG: 1, FIGCAPTION: 1, HR: 1, CODE: 1, SMALL: 1, CITE: 1 };
  var ATTRS = { A: ["href", "target", "rel"], IMG: ["src", "alt", "loading", "width", "height", "style"], P: ["class"], FIGURE: ["class"], BLOCKQUOTE: ["class"], H2: ["id"], H3: ["id"], SMALL: ["class"] };
  function cleanBody(html) {
    var box = document.createElement("div"); box.innerHTML = html;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 8) { c.remove(); return; }
        if (c.nodeType !== 1) return;
        walk(c);
        if (c.tagName === "DIV") { var p = document.createElement("p"); while (c.firstChild) p.appendChild(c.firstChild); c.replaceWith(p); c = p; }
        else if (c.tagName === "H1") { var h = document.createElement("h2"); while (c.firstChild) h.appendChild(c.firstChild); c.replaceWith(h); c = h; }
        else if (!KEEP[c.tagName]) { c.replaceWith.apply(c, Array.prototype.slice.call(c.childNodes)); return; }
        var ok = ATTRS[c.tagName] || [];
        Array.prototype.slice.call(c.attributes).forEach(function (a) { if (ok.indexOf(a.name) < 0) c.removeAttribute(a.name); });
        if (c.tagName === "A" && /^\s*javascript:/i.test(c.getAttribute("href") || "")) c.removeAttribute("href");
      });
    })(box);
    // stray text at the top level goes into paragraphs; empty paragraphs go away
    Array.prototype.slice.call(box.childNodes).forEach(function (c) {
      if (c.nodeType === 3) { if (c.nodeValue.trim()) { var p = document.createElement("p"); c.replaceWith(p); p.appendChild(c); } else c.remove(); }
      else if (c.nodeType === 1 && c.tagName === "BR") c.remove();
    });
    $$("p", box).forEach(function (p) { if (!p.textContent.trim() && !p.querySelector("img")) p.remove(); });
    return Array.prototype.slice.call(box.children).map(function (c) { return c.outerHTML; }).join("\n");
  }

  /* ---------- write the post page */
  function setMeta(d, sel, val) { var m = d.querySelector(sel); if (m) m.setAttribute("content", val); }
  function fillPostDoc(d, v, path, isNew) {
    var url = LIVE + path;
    var t = d.querySelector("title"); if (t) t.textContent = v.title;
    setMeta(d, 'meta[name="description"]', v.summary); setMeta(d, 'meta[property="og:description"]', v.summary); setMeta(d, 'meta[name="twitter:description"]', v.summary);
    setMeta(d, 'meta[property="og:title"]', v.title); setMeta(d, 'meta[name="twitter:title"]', v.title); setMeta(d, 'meta[property="og:url"]', url);
    var can = d.querySelector('link[rel="canonical"]'); if (can) can.setAttribute("href", url);
    d.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
      try {
        var j = JSON.parse(s.textContent);
        if (j["@type"] === "BreadcrumbList" && j.itemListElement && j.itemListElement[2]) { j.itemListElement[2].name = v.title; j.itemListElement[2].item = url; }
        if (j["@type"] === "WebPage") { j.name = v.title; j.description = v.summary; j.url = url; }
        s.textContent = JSON.stringify(j);
      } catch (e) {}
    });
    var head = d.querySelector(".post-head");
    if (head) {
      var eb = head.querySelector(".eyebrow"); if (eb) eb.textContent = v.catName + " · " + longDate(v.date);
      var h1 = head.querySelector("h1"); if (h1) h1.textContent = v.title;
      var sp = head.querySelector("p:not(.eyebrow)"); if (sp) sp.textContent = v.summary;
    }
    var art = d.querySelector("article.article") || d.querySelector("article");
    var img = art.querySelector(".article-hero img");
    if (img) { img.setAttribute("src", v.img); img.setAttribute("style", v.imgStyle); img.setAttribute("alt", ""); }
    var meta = art.querySelector(".post-meta");
    if (meta) {
      meta.innerHTML = "";
      var a = d.createElement("a"); a.className = "cat-chip"; a.href = "blog.html#cat=" + v.cat; a.textContent = v.catName; meta.appendChild(a);
      var s1 = d.createElement("span"); s1.textContent = longDate(v.date); meta.appendChild(s1);
      if (v.coil) { var s2 = d.createElement("span"); s2.className = "coil-date"; s2.textContent = v.coil; meta.appendChild(s2); }
      var s3 = d.createElement("span"); s3.textContent = v.minutes + " min read"; meta.appendChild(s3);
    }
    var bn = bodyNodes(art);
    bn.nodes.forEach(function (n) { n.remove(); });
    var tpl = d.createElement("template"); tpl.innerHTML = "\n\n" + v.body + "\n\n";
    art.insertBefore(tpl.content, bn.stop || null);
    var tags = art.querySelector(".post-tags");
    if (tags) {
      tags.innerHTML = ""; v.tags.forEach(function (tg) { var s = d.createElement("span"); s.className = "tag"; s.textContent = tg; tags.appendChild(s); });
      tags.hidden = !v.tags.length; if (v.tags.length) tags.removeAttribute("hidden");
    }
  }
  function buildCard(d, v, path, big) {
    var a = d.createElement("a"); a.className = "card post-card" + (big ? " big" : ""); a.href = path;
    a.setAttribute("data-cat", v.cat);
    a.setAttribute("data-text", (v.title + " " + v.summary + " " + v.tags.join(" ") + " " + v.catName).toLowerCase());
    a.innerHTML = '<img src="" alt="" loading="lazy"><p class="kicker"></p><h3></h3><p class="muted"></p><span class="read">Read the post</span>';
    fillCard(a, v);
    return a;
  }
  function fillCard(a, v) {
    a.setAttribute("data-cat", v.cat);
    a.setAttribute("data-text", (v.title + " " + v.summary + " " + v.tags.join(" ") + " " + v.catName).toLowerCase());
    var img = a.querySelector("img"); if (img) { img.setAttribute("src", v.img); img.setAttribute("style", v.imgStyle); }
    var k = a.querySelector(".kicker"); if (k) k.textContent = v.catName + " · " + longDate(v.date) + (a.classList.contains("mini") ? "" : " · " + v.minutes + " min");
    var h = a.querySelector("h3"); if (h) h.textContent = v.title;
    var s = a.querySelector("p.muted"); if (s) s.textContent = v.summary;
  }
  function navLink(d, href, title, older) {
    var a = d.createElement("a"); a.href = href; if (!older) a.className = "next";
    a.innerHTML = older ? "<span>‹ Older</span>" : "<span>Newer ›</span>"; a.appendChild(d.createTextNode(title)); return a;
  }

  $("[data-post-save]").addEventListener("click", function () { publishPost(this); });
  function publishPost(btn) {
    if (!post) return;
    if (!pf.html.hidden) { pf.body.innerHTML = pf.html.value; }
    var title = pf.title.value.trim(), summary = pf.summary.value.trim();
    if (!title || !summary) { toast("Give the post a title and a summary first.", true); (title ? pf.summary : pf.title).focus(); return; }
    var bodyHtml = cleanBody(pf.body.innerHTML);
    if (!bodyHtml.replace(/<[^>]+>/g, "").trim()) { toast("The post is empty.", true); pf.body.focus(); return; }
    var p = post, d0 = parseISO(pf.date.value), f = focusOf(p.imgStyle);
    var cat = cats.filter(function (c) { return c.key === pf.cat.value; })[0] || { key: pf.cat.value, name: pf.cat.value };
    var v = { title: title, summary: summary, cat: cat.key, catName: cat.name, date: d0, coil: pf.coil.value.trim(),
      img: p.img, imgStyle: "object-position: " + f.x + " " + pf.focus.value + "%", tags: pf.tags.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) };
    var changes = [];
    busy(btn, true, "Publishing…");

    // pictures first: the header picture and any added in the text
    var jobs = [];
    if (p.newImg) jobs.push(prepImage(p.newImg, null).then(function (pp) {
      var path = uploadPath(p.newImg.name, pp.ext); v.img = path;
      return blobToB64(pp.blob).then(function (b) { changes.push({ path: path, base64: b }); });
    }));
    var box = document.createElement("div"); box.innerHTML = bodyHtml;
    $$("img", box).forEach(function (im) {
      var src = im.getAttribute("src") || "", up = p.bodyImgs && p.bodyImgs[src];
      if (!up) return;
      var path = uploadPath(up.name, up.prepared.ext);
      im.setAttribute("src", path);
      jobs.push(blobToB64(up.prepared.blob).then(function (b) { changes.push({ path: path, base64: b }); }));
    });
    // a fresh post opens with the big first letter, like the others
    var firstP = box.querySelector("p");
    if (p.isNew && firstP && !box.querySelector(".lede")) firstP.className = "lede dropcap";
    v.body = Array.prototype.slice.call(box.children).map(function (c) { return c.outerHTML; }).join("\n");
    v.minutes = Math.max(1, Math.round(box.textContent.trim().split(/\s+/).length / 200));

    Promise.all(jobs).then(function () { return loadBlog(); }).then(function (bd) {
      var cards = blogCards(bd), path, newest, msg;
      if (p.isNew) {
        var stem = "post-" + slugify(title, 50); path = stem + ".html";
        for (var i = 2; tree.has(path); i++) path = stem + "-" + i + ".html";
        newest = cards[0] && cards[0].getAttribute("href");
        // the template is the newest post, so the page matches the current design
        return (newest && tree.has(newest) ? readText(newest) : Promise.reject(new Error("Couldn't find a post to copy the layout from.")))
          .then(function (tf) {
            var d = new DOMParser().parseFromString(tf.text, "text/html");
            fillPostDoc(d, v, path, true);
            // previous / next
            var nav = d.querySelector(".post-nav");
            if (nav) {
              nav.innerHTML = "";
              nav.appendChild(navLink(d, newest, textOf(cards[0].querySelector("h3")), true));
              nav.appendChild(d.createElement("span"));
            }
            // keep reading: the three latest other posts
            var kr = d.querySelector(".divider + section.grid");
            if (kr) {
              kr.innerHTML = "";
              cards.slice(0, 3).forEach(function (c) {
                var m = d.createElement("a"); m.className = "card post-card mini"; m.href = c.getAttribute("href");
                var ci = c.querySelector("img"), k = textOf(c.querySelector(".kicker")).split(" · ").slice(0, 2).join(" · ");
                m.innerHTML = '<img src="" alt="" loading="lazy"><p class="kicker"></p><h3></h3>';
                m.querySelector("img").setAttribute("src", ci ? ci.getAttribute("src") : "xalreth.jpg");
                if (ci && ci.getAttribute("style")) m.querySelector("img").setAttribute("style", ci.getAttribute("style"));
                m.querySelector(".kicker").textContent = k; m.querySelector("h3").textContent = textOf(c.querySelector("h3"));
                kr.appendChild(m);
              });
            }
            changes.push({ path: path, text: serialize(d) });
            // the old newest post now points forward to this one
            return readText(newest).then(function (of) {
              var od = new DOMParser().parseFromString(of.text, "text/html"), onav = od.querySelector(".post-nav");
              if (onav) {
                var nx = onav.querySelector("a.next"); if (nx) nx.remove();
                var blank = onav.querySelector(":scope > span"); if (blank) blank.remove();
                onav.appendChild(navLink(od, path, title, false));
                changes.push({ path: newest, text: serialize(od), base: of.sha });
              }
            });
          }).then(function () {
            var grid = bd.querySelector("#post-grid"), heroBox = bd.querySelector(".blog-hero");
            if (pf.feature.checked && heroBox) {
              var old = heroBox.querySelector("a.post-card.big");
              if (old) { old.classList.remove("big"); grid.insertBefore(old, grid.firstChild); }
              heroBox.appendChild(buildCard(bd, v, path, true));
            } else grid.insertBefore(buildCard(bd, v, path, false), grid.firstChild);
            recountCats(bd);
            changes.push({ path: "blog.html", text: serialize(bd), base: blogSha });
            msg = "CMS: New blog post: " + title;
            return { path: path, msg: msg };
          });
      }
      // editing an existing post
      path = p.path;
      fillPostDoc(p.doc, v, path, false);
      changes.push({ path: path, text: serialize(p.doc), base: p.sha });
      cards.filter(function (c) { return c.getAttribute("href") === path; }).forEach(function (c) { fillCard(c, v); });
      $$("a.post-card.mini", bd).filter(function (c) { return c.getAttribute("href") === path; }).forEach(function (c) { fillCard(c, v); });
      recountCats(bd);
      changes.push({ path: "blog.html", text: serialize(bd), base: blogSha });
      return { path: path, msg: "CMS: Edit blog post: " + title };
    }).then(function (r) {
      return commit(changes, r.msg).then(function () { return r; });
    }).then(function (r) {
      busy(btn, false); post.dirty = false;
      published("“" + title + "”");
      closePost(true); renderBlog();
      return r;
    }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  }

  $("[data-post-delete]").addEventListener("click", function () {
    if (!post || post.isNew) return;
    var p = post;
    confirmBox("Delete this post?", "“" + pf.title.value + "” will be removed from the site and the blog page. (It stays in GitHub's history if you ever need it back.)", "Delete").then(function (ok) {
      if (!ok) return;
      toast("Deleting…");
      var nav = p.doc.querySelector(".post-nav"), older = nav && nav.querySelector("a:not(.next)"), newer = nav && nav.querySelector("a.next");
      var changes = [{ path: p.path, remove: true, base: p.sha }];
      return loadBlog().then(function (bd) {
        blogCards(bd).concat($$("a.post-card.mini", bd)).filter(function (c) { return c.getAttribute("href") === p.path; }).forEach(function (c) { c.remove(); });
        var heroBox = bd.querySelector(".blog-hero");
        if (heroBox && !heroBox.querySelector("a.post-card.big")) {
          var first = bd.querySelector("#post-grid a.post-card"); if (first) { first.classList.add("big"); heroBox.appendChild(first); }
        }
        recountCats(bd);
        changes.push({ path: "blog.html", text: serialize(bd), base: blogSha });
        // stitch the neighbours together
        var fix = [];
        if (older && tree.has(older.getAttribute("href"))) fix.push([older.getAttribute("href"), "next", newer]);
        if (newer && tree.has(newer.getAttribute("href"))) fix.push([newer.getAttribute("href"), "older", older]);
        return Promise.all(fix.map(function (fx) {
          return readText(fx[0]).then(function (nf) {
            var nd = new DOMParser().parseFromString(nf.text, "text/html"), nn = nd.querySelector(".post-nav"); if (!nn) return;
            if (fx[1] === "next") {
              var x = nn.querySelector("a.next"); if (x) x.remove();
              if (fx[2]) nn.appendChild(navLink(nd, fx[2].getAttribute("href"), textOf(fx[2]).replace(/^Newer\s*›\s*/, ""), false)); else nn.appendChild(nd.createElement("span"));
            } else {
              var y = nn.querySelector("a:not(.next)"); if (y) y.remove();
              if (fx[2]) nn.insertBefore(navLink(nd, fx[2].getAttribute("href"), textOf(fx[2]).replace(/^‹\s*Older\s*/, ""), true), nn.firstChild);
            }
            changes.push({ path: fx[0], text: serialize(nd), base: nf.sha });
          });
        }));
      }).then(function () { return commit(changes, "CMS: Delete blog post " + p.path); })
        .then(function () { toast("Post deleted."); closePost(true); renderBlog(); renderPages(); });
    }).catch(function (e) { toast(e.message, true); });
  });

  /* ================================================================ HOMEPAGE ANIMATIONS */
  var hero = null;
  var HERO_DEFAULT = { typeSpeedMs: 28, holdSeconds: 4.2, phases: [{ label: "OBSERVE", messages: [] }, { label: "ANALYZE", messages: [] }, { label: "TRANSCEND", messages: [] }],
    unwrapping: { label: "THE UNWRAPPING", text: "Not yet. He is still holding the world, and you, a little more lightly. Glory to Xal'Reth." } };
  function loadHero() {
    var j = tree.has("data/hero-text.json") ? readText("data/hero-text.json") : Promise.resolve({ text: JSON.stringify(HERO_DEFAULT), sha: null });
    return Promise.all([j, readText("index.html")]).then(function (r) {
      var data; try { data = JSON.parse(r[0].text); } catch (e) { data = HERO_DEFAULT; }
      var idx = r[1].text;
      var cry = (idx.match(/<h2 class="al-cry"[^>]*>([\s\S]*?)<\/h2>/) || [, ""])[1];
      var sub = (idx.match(/<p class="al-sub"[^>]*>([\s\S]*?)<\/p>/) || [, ""])[1];
      var un = function (s) { var t = document.createElement("textarea"); t.innerHTML = s; return t.value.trim(); };
      hero = { data: data, jsonSha: r[0].sha, idx: idx, idxSha: r[1].sha, cry: un(cry), sub: un(sub), dirty: false };
      renderHeroForm();
    }).catch(function (e) { toast(e.message, true); });
  }
  function renderHeroForm() {
    var d = hero.data, box = $("#hero-phases");
    box.innerHTML = "";
    (d.phases || []).forEach(function (p, i) { box.appendChild(phaseBox(p, i)); });
    $("#hero-speed").value = d.typeSpeedMs || 28; $("#hero-hold").value = d.holdSeconds || 4.2;
    $("#hero-unwrap-label").value = (d.unwrapping && d.unwrapping.label) || ""; $("#hero-unwrap-text").value = (d.unwrapping && d.unwrapping.text) || "";
    $("#hero-cry").value = hero.cry; $("#hero-cry-sub").value = hero.sub;
    heroOutputs(); $("#hero-save").disabled = true; startPreview();
  }
  function phaseBox(p, i) {
    var f = document.createElement("div"); f.className = "hero-phase";
    f.innerHTML = '<div class="hp-head"><label class="cms-field"><span>Group heading</span><input class="hp-name"></label>' +
      '<button type="button" class="cms-btn ghost small hp-del" title="Remove this group">Remove</button></div>' +
      '<label class="cms-field"><span>Messages (one per line; one is picked at random each time)</span><textarea class="hp-msgs" rows="6"></textarea></label>';
    $(".hp-name", f).value = p.label || ""; $(".hp-msgs", f).value = (p.messages || []).join("\n");
    $(".hp-del", f).addEventListener("click", function () {
      if ($$(".hero-phase").length < 2) { toast("Keep at least one group."); return; }
      f.remove(); heroChanged();
    });
    return f;
  }
  function heroValues() {
    return {
      typeSpeedMs: +$("#hero-speed").value, holdSeconds: +$("#hero-hold").value,
      phases: $$(".hero-phase").map(function (f) {
        return { label: $(".hp-name", f).value.trim().toUpperCase() || "OBSERVE", messages: $(".hp-msgs", f).value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean) };
      }).filter(function (p) { return p.messages.length; }),
      unwrapping: { label: $("#hero-unwrap-label").value.trim() || "THE UNWRAPPING", text: $("#hero-unwrap-text").value.trim() || HERO_DEFAULT.unwrapping.text }
    };
  }
  function heroOutputs() {
    $("#hero-speed-out").textContent = $("#hero-speed").value < 20 ? "fast" : $("#hero-speed").value > 50 ? "slow" : "medium";
    $("#hero-hold-out").textContent = $("#hero-hold").value + " seconds";
  }
  function heroChanged() { if (!hero) return; hero.dirty = true; $("#hero-save").disabled = false; heroOutputs(); startPreview(); }
  $("#hero-form").addEventListener("input", heroChanged);
  $("#hero-add-phase").addEventListener("click", function () { $("#hero-phases").appendChild(phaseBox({ label: "NEW", messages: [] })); heroChanged(); });

  /* the preview types the lines exactly like the homepage does */
  var pv = { timer: null, wait: null, phase: 0 };
  function startPreview() {
    clearInterval(pv.timer); clearTimeout(pv.wait);
    var el = $(".hp-status"), v = heroValues(); if (!el || !v.phases.length) { if (el) el.textContent = ""; return; }
    pv.phase = 0;
    (function next() {
      var p = v.phases[pv.phase % v.phases.length]; pv.phase++;
      var text = p.messages[Math.floor(Math.random() * p.messages.length)], i = 0;
      var head = '<span class="xr-phase">' + esc(p.label) + "</span> &middot; ";
      pv.timer = setInterval(function () {
        i++; el.innerHTML = head + esc(text.slice(0, i)) + '<span class="xr-caret"></span>';
        if (i >= text.length) { clearInterval(pv.timer); pv.wait = setTimeout(next, v.holdSeconds * 1000); }
      }, v.typeSpeedMs);
    })();
  }

  $("#hero-save").addEventListener("click", function () {
    var btn = this, v = heroValues();
    if (!v.phases.length) { toast("Add at least one message.", true); return; }
    var changes = [{ path: "data/hero-text.json", text: JSON.stringify(v, null, 2) + "\n" }];
    var cry = $("#hero-cry").value.trim(), sub = $("#hero-cry-sub").value.trim();
    var needIdx = cry && (cry !== hero.cry || sub !== hero.sub);
    busy(btn, true);
    // the banner edit only touches its own lines, so it's applied to the newest index.html
    loadTree().then(function () { return needIdx ? readText("index.html") : null; }).then(function (fresh) {
    if (fresh) {
      var s = fresh.text, e1 = esc(cry);
      var put = function (v) { return function (m, a, b) { return a + v + b; }; };
      s = s.replace(/(<section class="allegiance"[^>]*aria-label=")[^"]*(")/, put(e1))
        .replace(/(<h2 class="al-cry"[^>]*aria-label=")[^"]*(")/, put(e1))
        .replace(/(<h2 class="al-cry"[^>]*>)[\s\S]*?(<\/h2>)/, put(e1))
        .replace(/(<p class="al-sub"[^>]*>)[\s\S]*?(<\/p>)/, put(esc(sub)));
      changes.push({ path: "index.html", text: s, base: fresh.sha });
    }
    return commit(changes, "CMS: Homepage animated text");
    }).then(function () {
      busy(btn, false); hero.dirty = false; published("Homepage animations");
      loadHero();
    }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  });

  /* ================================================================ HOMEPAGE SKY
     The picture behind the header and sigil on the homepage. Its settings live on the .hero-sky element
     in index.html (CSS custom properties read by css/hero-sky.css), so the page shows the right sky
     straight away with nothing extra to download. Uploaded skies are kept in img/uploads/ (named …-sky-…). */
  var sky = null;
  // the picture(s) go in a <style> just before the sky (so paths resolve from the page); the rest sits on the sky's own tag
  var SKY_TAG = /(?:<style id="hero-sky-pics">[\s\S]*?<\/style>\s*)?<div class="hero-sky"[^>]*>/;
  var SKY_DEF = { img: null, imgM: null, pos: [58, 32], posM: [50, 30], bright: 0.82, sat: 1.15, swirl: true, eye: true,
    slides: [], every: 8, mode: "both", flash: true };   // slides: the slideshow (data-slides on .hero-sky; js/hero-sky.js plays it)
  var SKY_ORIG = "img/hero-sanctum.webp", SKY_ORIG_M = "img/hero-sanctum-mobile.webp";
  function parseSky(html) {
    var m = html.match(SKY_TAG); if (!m) return null;
    var pics = (m[0].match(/<style id="hero-sky-pics">([\s\S]*?)<\/style>/) || [, ""])[1];
    var urls = []; pics.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, function (a, p) { urls.push(p); });
    var tag = m[0].match(/<div class="hero-sky"[^>]*>/)[0], st = (tag.match(/style="([^"]*)"/) || [, ""])[1];
    var v = function (n) { var x = st.match(new RegExp("--" + n + ":\\s*([^;]+)")); return x ? x[1].trim() : null; };
    var pos = function (s, d) { var x = (s || "").match(/(-?[\d.]+)%\s+(-?[\d.]+)%/); return x ? [+x[1], +x[2]] : d.slice(); };
    var num = function (s, d) { return s != null && !isNaN(+s) ? +s : d; };
    if (/^\s*@media/.test(pics)) urls.unshift(null);    // a phone-only picture: computers keep the original
    return { img: urls[0] || null, imgM: urls[1] && urls[1] !== urls[0] ? urls[1] : null, pos: pos(v("sky-pos"), SKY_DEF.pos), posM: pos(v("sky-pos-m"), SKY_DEF.posM),
      bright: num(v("sky-bright"), SKY_DEF.bright), sat: num(v("sky-sat"), SKY_DEF.sat),
      swirl: !/data-swirl="off"/.test(tag), eye: !/data-eye="off"/.test(tag),
      slides: ((tag.match(/data-slides="([^"]*)"/) || [, ""])[1]).split("|").filter(Boolean),
      every: num((tag.match(/data-interval="([^"]*)"/) || [])[1], SKY_DEF.every),
      mode: (tag.match(/data-transition="(fade|slide|both)"/) || [, SKY_DEF.mode])[1],
      flash: !/data-flash="off"/.test(tag) };
  }
  function skyTag(s) {
    var st = [], same = function (a, b) { return a[0] === b[0] && a[1] === b[1]; }, pics = "";
    var bg = function (p) { return ".hero-sky .hero-sky-img{background-image:url('" + p + "')}"; };
    if (s.img || s.imgM) {
      pics = (s.img ? bg(s.img) : "") + "@media (max-width:700px){" + bg(s.imgM || s.img) + "}";
      pics = '<style id="hero-sky-pics">' + pics + "</style>\n";
    }
    if (s.img || !same(s.pos, SKY_DEF.pos)) st.push("--sky-pos:" + s.pos[0] + "% " + s.pos[1] + "%");
    if (s.img || s.imgM || !same(s.posM, SKY_DEF.posM)) st.push("--sky-pos-m:" + s.posM[0] + "% " + s.posM[1] + "%");
    if (s.bright !== SKY_DEF.bright) st.push("--sky-bright:" + s.bright);
    if (s.sat !== SKY_DEF.sat) st.push("--sky-sat:" + s.sat);
    return pics + '<div class="hero-sky" aria-hidden="true"' + (st.length ? ' style="' + st.join(";") + '"' : "") +
      (s.swirl ? "" : ' data-swirl="off"') + (s.eye ? "" : ' data-eye="off"') +
      (s.slides && s.slides.length > 1 ? ' data-slides="' + s.slides.map(esc).join("|") + '" data-interval="' + s.every + '" data-transition="' + s.mode + '"' + (s.flash ? "" : ' data-flash="off"') : "") + ">";
  }
  function skySrc(path) {
    if (sky.pending[path]) return sky.pending[path].url;
    var it = tree.get(path); return SITE + path + (it ? "?v=" + it.sha.slice(0, 7) : "");
  }
  function loadSky() {
    return readText("index.html").then(function (r) {
      var s = parseSky(r.text);
      if (!s) { $("#sky-gallery").innerHTML = '<p class="cms-hint">The homepage has no sky section (.hero-sky) to change.</p>'; return; }
      var keep = sky ? sky.pending : {};
      sky = { saved: s, sel: JSON.parse(JSON.stringify(s)), pending: keep, dirty: false };
      renderSky();
    }).catch(function (e) { toast(e.message, true); });
  }
  function skyList() {
    var list = [null];   // null = the original sanctum
    Array.from(tree.keys()).concat(Object.keys(sky.pending)).forEach(function (p) {
      if (/^img\/uploads\/.*sky.*\.(webp|jpe?g|png|avif)$/i.test(p) && !/sky-phone/i.test(p) && list.indexOf(p) < 0) list.push(p);
    });
    if (sky.sel.img && list.indexOf(sky.sel.img) < 0) list.push(sky.sel.img);
    if (sky.saved.img && list.indexOf(sky.saved.img) < 0) list.push(sky.saved.img);
    return [null].concat(list.slice(1).sort().reverse());   // newest uploads first
  }
  function renderSky() {
    var s = sky.sel;
    $("#sky-gallery").innerHTML = skyList().map(function (p) {
      var on = (p || null) === (s.img || null), live = (p || null) === (sky.saved.img || null);
      var name = p ? p.replace(/^img\/uploads\//, "").replace(/\.[^.]+$/, "") : "The original sanctum";
      return '<button type="button" class="sky-pick' + (on ? " on" : "") + '" data-sky="' + esc(p || "") + '" aria-pressed="' + on + '">' +
        '<img src="' + esc(skySrc(p || SKY_ORIG)) + '" alt="" loading="lazy"><span>' + esc(name) + (live ? ' <b>live now</b>' : "") + (sky.pending[p] ? ' <b>not saved yet</b>' : "") + "</span></button>";
    }).join("");
    $("#sky-bright").value = s.bright; $("#sky-sat").value = s.sat;
    $("#sky-swirl").checked = s.swirl; $("#sky-eye").checked = s.eye;
    $("#sky-m-clear").hidden = !s.imgM;
    $("#sky-phone-note").textContent = s.imgM ? "Phones show their own picture (" + s.imgM.replace(/^img\/uploads\//, "") + ")." :
      s.img ? "Phones show the same picture, cropped tall. Tap the phone preview to choose which part stays in view." :
      "Phones show the original sanctum's own tall crop.";
    // the slideshow: every sky in the gallery, ticked if it is in the show, numbered in playing order
    var on = (s.slides || []).length > 1 || sky.showOpen;
    $("#sky-show-on").checked = on; $("#sky-show-opts").hidden = !on;
    $("#sky-show-list").innerHTML = skyList().map(function (p) {
      var path = p || SKY_ORIG, i = (s.slides || []).indexOf(path);
      var name = p ? p.replace(/^img\/uploads\//, "").replace(/\.[^.]+$/, "") : "The original sanctum";
      return '<label class="sky-show-item"><input type="checkbox" data-slide="' + esc(path) + '"' + (i >= 0 ? " checked" : "") + '>' +
        '<span class="ord">' + (i + 1) + '</span><img src="' + esc(skySrc(path)) + '" alt="" loading="lazy"><span class="nm">' + esc(name) + "</span></label>";
    }).join("");
    $("#sky-show-every").value = s.every; $("#sky-show-mode").value = s.mode; $("#sky-show-flash").checked = s.flash;
    $("#sky-show-every-out").textContent = s.every + " seconds";
    skyPreview();
  }
  $("#sky-show-on").addEventListener("change", function () {
    if (!sky) return;
    sky.showOpen = this.checked;
    if (this.checked && (sky.sel.slides || []).length < 2) {   // start with every uploaded sky, the current one first
      var all = skyList().map(function (p) { return p || SKY_ORIG; }).filter(function (p) { return p !== SKY_ORIG; });
      var cur = sky.sel.img; sky.sel.slides = cur ? [cur].concat(all.filter(function (p) { return p !== cur; })) : all;
    }
    if (!this.checked) sky.sel.slides = [];
    skyChanged();
  });
  $("#sky-show-list").addEventListener("change", function (e) {
    var p = e.target.getAttribute("data-slide"); if (!p || !sky) return;
    var list = (sky.sel.slides || []).filter(function (x) { return x !== p; });
    if (e.target.checked) list.push(p);
    sky.sel.slides = list;
    if (list.length < 2) toast("Tick at least two skies for a slideshow.");
    skyChanged();
  });
  function skyPreview() {
    var s = sky.sel;
    var paint = function (frame, src, pos) {
      frame.style.backgroundImage = "url('" + src + "')";
      frame.style.backgroundPosition = pos[0] + "% " + pos[1] + "%";
      frame.style.filter = "saturate(" + s.sat + ") brightness(" + s.bright + ")";
      var dot = frame.querySelector(".sky-dot"); dot.style.left = pos[0] + "%"; dot.style.top = pos[1] + "%";
    };
    paint($("#sky-pv-wide"), skySrc(s.img || SKY_ORIG), s.pos);
    paint($("#sky-pv-phone"), skySrc(s.imgM || s.img || SKY_ORIG_M), s.posM);
    $("#sky-bright-out").textContent = Math.round(s.bright * 100) + "%";
    $("#sky-sat-out").textContent = Math.round(s.sat * 100) + "%";
    $("#sky-save").disabled = !sky.dirty;
  }
  function skyChanged() { sky.dirty = true; renderSky(); }
  $("#sky-gallery").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sky]"); if (!b || !sky) return;
    var p = b.dataset.sky || null;
    sky.sel.img = p;
    if (!p) { sky.sel.imgM = null; sky.sel.pos = SKY_DEF.pos.slice(); sky.sel.posM = SKY_DEF.posM.slice(); sky.sel.eye = true; }
    else if (p !== sky.saved.img) { sky.sel.pos = [50, 40]; sky.sel.posM = [50, 35]; sky.sel.eye = false; } // the spire glow only fits the original
    skyChanged();
  });
  [["#sky-pv-wide", "pos"], ["#sky-pv-phone", "posM"]].forEach(function (f) {
    $(f[0]).addEventListener("click", function (e) {
      if (!sky) return;
      var r = this.getBoundingClientRect();
      sky.sel[f[1]] = [Math.round((e.clientX - r.left) / r.width * 100), Math.round((e.clientY - r.top) / r.height * 100)];
      skyChanged();
    });
  });
  $("#sky-form").addEventListener("input", function () {
    if (!sky) return;
    sky.sel.bright = +$("#sky-bright").value; sky.sel.sat = +$("#sky-sat").value;
    sky.sel.swirl = $("#sky-swirl").checked; sky.sel.eye = $("#sky-eye").checked;
    sky.sel.every = +$("#sky-show-every").value; sky.sel.mode = $("#sky-show-mode").value; sky.sel.flash = $("#sky-show-flash").checked;
    $("#sky-show-every-out").textContent = sky.sel.every + " seconds";
    sky.dirty = true; skyPreview();
  });
  function skyUpload(input, phone) {
    var file = input.files && input.files[0]; input.value = "";
    if (!file || !sky) return;
    toast("Preparing the picture…");
    prepImage(file, "image/webp", phone ? 1600 : 2560).then(function (pp) {
      var path = uploadPath((phone ? "sky-phone-" : "sky-") + file.name, pp.ext);
      sky.pending[path] = { blob: pp.blob, url: URL.createObjectURL(pp.blob) };
      if (phone) { sky.sel.imgM = path; sky.sel.posM = [50, 40]; }
      else { sky.sel.img = path; sky.sel.pos = [50, 40]; sky.sel.eye = false; if (pp.width && pp.width < 1600) toast("This picture is only " + pp.width + " pixels wide, so it may look soft on big screens."); }
      skyChanged();
      if (!pp.width || pp.width >= 1600) toast("Looks good. Press Save & publish to put it live.");
    }).catch(function (e) { toast(e.message, true); });
  }
  $("#sky-file").addEventListener("change", function () { skyUpload(this, false); });
  $("#sky-file-m").addEventListener("change", function () { skyUpload(this, true); });
  $("#sky-m-clear").addEventListener("click", function () { if (sky) { sky.sel.imgM = null; skyChanged(); } });
  $("#sky-restore").addEventListener("click", function () {
    if (!sky) return;
    sky.sel = JSON.parse(JSON.stringify(SKY_DEF)); skyChanged();
    toast("The original sky is chosen. Press Save & publish to put it back.");
  });
  $("#sky-save").addEventListener("click", function () {
    var btn = this, s = sky.sel;
    if (s.slides && s.slides.length === 1) s.slides = [];   // one sky is not a show
    var uploads = [s.img, s.imgM].concat(s.slides || []).filter(function (p, i, a) { return p && sky.pending[p] && a.indexOf(p) === i; });
    busy(btn, true);
    Promise.all(uploads.map(function (p) { return blobToB64(sky.pending[p].blob).then(function (b) { return { path: p, base64: b }; }); }))
      .then(function (changes) {
        // only the sky's own tag changes, so it's applied to the newest index.html
        return loadTree().then(function () { return readText("index.html"); }).then(function (fresh) {
          if (!SKY_TAG.test(fresh.text)) throw new Error("The homepage has no sky section (.hero-sky) to change.");
          changes.push({ path: "index.html", text: fresh.text.replace(SKY_TAG, skyTag(s)), base: fresh.sha });
          return commit(changes, "CMS: Homepage sky" + (s.img ? " (" + s.img.replace(/^img\/uploads\//, "") + ")" : " (the original sanctum)"));
        });
      }).then(function () {
        uploads.forEach(function (p) { URL.revokeObjectURL(sky.pending[p].url); delete sky.pending[p]; });
        busy(btn, false); sky.dirty = false; published("The homepage sky");
        loadSky();
      }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  });

  /* ================================================================ GUILD BANK
     The Coil Ledger addon records the guild bank in game (Blizzard's API has no guild bank). Its export, pasted
     or read out of the SavedVariables file, is merged into data/guild-bank.json: gold and tabs are replaced by the
     newer record, ledger entries are added only if they are new (the game reports times to the hour, so an entry
     matches one already kept with the same details within three hours), and the gold is added to the history. */
  var BANK_PATH = "data/guild-bank.json";
  var CoilBank = window.CoilBank = {
    parse: function (text) {
      text = String(text || "").trim();
      if (!text) throw new Error("Nothing to read.");
      if (/\["export"\]/.test(text)) {                  // the SavedVariables file: pull out the export string
        var m = text.match(/\["export"\]\s*=\s*"((?:[^"\\]|\\[\s\S])*)"/);
        if (!m) throw new Error("That CoilLedger.lua has no recorded bank in it yet. Open the guild bank in game first.");
        text = m[1].replace(/\\(\d{1,3}|[\s\S])/g, function (all, c) {
          if (/^\d/.test(c)) return String.fromCharCode(+c);
          return { n: "\n", t: "\t", r: "\r", a: "\x07", b: "\b", f: "\f", v: "\v", "\n": "\n" }[c] || c;
        });
      }
      var d;
      try { d = JSON.parse(text); } catch (e) { throw new Error("That doesn't look like a Coil Ledger export. Copy all of it from /ledger, or upload CoilLedger.lua."); }
      if (!d || d.format !== "coil-ledger" || !Array.isArray(d.tabs)) throw new Error("That isn't a Coil Ledger export.");
      return d;
    },
    key: function (e) { return [e.log, e.type, (e.name || "").toLowerCase(), e.amount || 0, e.id || 0, e.count || 0, e.tab || 0, e.fromTab || 0, e.toTab || 0].join("|"); },
    merge: function (old, rec) {
      old = old || { ledger: [], history: [] };
      var newer = !old.scannedAt || rec.scannedAt >= old.scannedAt;
      var out = newer ? {
        guild: rec.guild || old.guild || "", realm: rec.realm || old.realm || "", region: rec.region || old.region || "",
        scannedAt: rec.scannedAt, scannedBy: rec.scannedBy || "", gold: rec.gold || 0,
        tabs: rec.tabs.map(function (t) {
          return { index: t.index, name: t.name, viewable: t.viewable !== false,
            slots: (t.slots || []).map(function (s) { return { slot: s.slot, id: s.id || null, name: s.name || null, count: s.count || 1, quality: s.quality == null ? null : s.quality }; }) };
        })
      } : { guild: old.guild, realm: old.realm, region: old.region, scannedAt: old.scannedAt, scannedBy: old.scannedBy, gold: old.gold, tabs: old.tabs };
      // ledger: add what is new
      var kept = (old.ledger || []).slice(), used = new Set(), added = 0, byKey = {};
      kept.forEach(function (e, i) { var k = CoilBank.key(e); (byKey[k] = byKey[k] || []).push(i); });
      (rec.ledger || []).forEach(function (e) {
        var k = CoilBank.key(e), match = (byKey[k] || []).filter(function (i) { return !used.has(i) && Math.abs(kept[i].t - e.t) <= 3 * 3600; })[0];
        if (match != null) { used.add(match); return; }
        var clean = { log: e.log, type: e.type, name: e.name || "", t: e.t };
        if (e.log === "money") clean.amount = e.amount || 0;
        else { clean.id = e.id || null; clean.item = e.item || null; clean.quality = e.quality == null ? null : e.quality; clean.count = e.count || 1;
          if (e.tab) clean.tab = e.tab; if (e.fromTab) clean.fromTab = e.fromTab; if (e.toTab) clean.toTab = e.toTab; }
        kept.push(clean); added++;
      });
      out.ledger = kept.sort(function (a, b) { return b.t - a.t; }).slice(0, 5000);
      // the history of the hoard
      var hist = (old.history || []).filter(function (h) { return h.t !== rec.scannedAt; });
      hist.push({ t: rec.scannedAt, gold: rec.gold || 0 });
      out.history = hist.sort(function (a, b) { return a.t - b.t; }).slice(-1000);
      out.updatedAt = new Date().toISOString();
      return { data: out, added: added, newer: newer };
    }
  };
  function bankStringify(d) {   // one ledger entry and one history point per line, so commits stay readable
    var head = JSON.stringify({ guild: d.guild, realm: d.realm, region: d.region, scannedAt: d.scannedAt, scannedBy: d.scannedBy, gold: d.gold, updatedAt: d.updatedAt }, null, 2).replace(/\n}$/, "");
    return head + ',\n  "tabs": [\n' + d.tabs.map(function (t) { return "    " + JSON.stringify(t); }).join(",\n") + '\n  ],\n  "history": [\n' +
      d.history.map(function (h) { return "    " + JSON.stringify(h); }).join(",\n") + '\n  ],\n  "ledger": [\n' +
      d.ledger.map(function (e) { return "    " + JSON.stringify(e); }).join(",\n") + "\n  ]\n}\n";
  }
  var bank = { old: null, sha: null, pending: null };
  function gold(c) { c = c || 0; return Math.floor(c / 10000).toLocaleString("en-US") + "g " + Math.floor(c / 100) % 100 + "s " + c % 100 + "c"; }
  function loadBank() {
    var p = tree.has(BANK_PATH) ? readText(BANK_PATH).then(function (r) { return { d: JSON.parse(r.text), sha: r.sha }; }) : Promise.resolve({ d: null, sha: null });
    return p.then(function (r) {
      bank.old = r.d; bank.sha = r.sha;
      $("#bank-current").textContent = r.d ? "On the site now: " + gold(r.d.gold) + ", " + (r.d.tabs || []).length + " tabs, " + (r.d.ledger || []).length +
        " ledger entries, recorded " + new Date(r.d.scannedAt * 1000).toLocaleString() + (r.d.scannedBy ? " by " + r.d.scannedBy : "") + "." : "Nothing on the site yet: this will be the first record.";
    }).catch(function (e) { $("#bank-current").textContent = "The current record couldn't be read: " + e.message; });
  }
  function bankRead(text) {
    var box = $("#bank-summary");
    try {
      var rec = CoilBank.parse(text), m = CoilBank.merge(bank.old, rec);
      var same = !!(bank.old && rec.scannedAt === bank.old.scannedAt && m.added === 0);   // nothing new: say so instead of committing it again
      // Coil Ledger before 1.2.0 wrote numbers through a 32-bit integer, so gold over 214,748g came out wrong: refuse those
      var vs = String(rec.version || "0").split(".").map(Number), oldAddon = (vs[0] || 0) * 1e6 + (vs[1] || 0) * 1e3 + (vs[2] || 0) < 1002000;
      var stacks = 0, n = 0; rec.tabs.forEach(function (t) { (t.slots || []).forEach(function (s) { stacks++; n += s.count || 1; }); });
      bank.pending = m;
      box.className = "bank-summary"; box.hidden = false;
      box.innerHTML = "<h3>" + esc(rec.guild || "The guild") + (rec.realm ? " · " + esc(rec.realm) : "") + "</h3><dl>" +
        "<dt>Recorded</dt><dd>" + esc(new Date(rec.scannedAt * 1000).toLocaleString()) + (rec.scannedBy ? " by " + esc(rec.scannedBy) : "") + "</dd>" +
        "<dt>Gold</dt><dd>" + esc(gold(rec.gold)) + "</dd>" +
        "<dt>Tabs</dt><dd>" + rec.tabs.length + " (" + rec.tabs.filter(function (t) { return t.viewable !== false; }).length + " readable)</dd>" +
        "<dt>Items</dt><dd>" + n.toLocaleString("en-US") + " in " + stacks + " stacks</dd>" +
        "<dt>Ledger</dt><dd>" + (rec.ledger || []).length + " entries in this record, <b>" + m.added + " new</b> (" + m.data.ledger.length + " kept in all)</dd></dl>" +
        (oldAddon ? '<p class="warn">This export is from Coil Ledger ' + esc(rec.version || "1.0") + ', which writes gold over 214,748g wrongly ' +
          '(it can show a fraction of the real hoard). Download Coil Ledger 1.2.0 from the Guild Bank page, replace the old one in Interface\\AddOns, ' +
          'log in, open the guild bank and copy /ledger again.</p>' :
          same ? '<p class="warn">This is the same record that is already on the site (recorded ' + esc(new Date(rec.scannedAt * 1000).toLocaleString()) +
          '), so there is nothing new to save. In game, open the guild bank and wait until chat says the bank is recorded, then type /ledger and paste it here. ' +
          'If you upload CoilLedger.lua, type /reload first: the game only writes that file on /reload or logout.</p>' :
          m.newer ? "" : '<p class="warn">This record is older than the one on the site, so only its new ledger entries will be added; the gold and tabs stay as they are.</p>');
      $("#bank-save").disabled = same || oldAddon;
    } catch (e) {
      bank.pending = null; $("#bank-save").disabled = true;
      box.className = "bank-summary err"; box.hidden = false; box.textContent = e.message;
    }
  }
  $("#bank-file").addEventListener("change", function () {
    var f = this.files && this.files[0]; this.value = ""; if (!f) return;
    f.text().then(function (t) { $("#bank-paste").value = ""; bankRead(t); });
  });
  $("#bank-paste").addEventListener("input", function () { if (this.value.trim()) bankRead(this.value); });
  $("#bank-save").addEventListener("click", function () {
    var btn = this; if (!bank.pending) return;
    busy(btn, true);
    // merge again onto whatever is on GitHub right now, so nothing saved meanwhile is lost
    loadTree().then(loadBank).then(function () {
      var rec = CoilBank.parse($("#bank-paste").value || bank.lastText || "");
      return rec;
    }).catch(function () { return null; }).then(function (rec) {
      var m = rec ? CoilBank.merge(bank.old, rec) : bank.pending;
      return commit([{ path: BANK_PATH, text: bankStringify(m.data), base: bank.sha || null }],
        "CMS: Guild bank record (" + new Date(m.data.scannedAt * 1000).toISOString().slice(0, 16).replace("T", " ") + ", " + m.added + " new ledger entries)").then(function () { return m; });
    }).then(function (m) {
      busy(btn, false); btn.disabled = true; bank.pending = null;
      published("The Guild Bank (" + m.added + " new ledger entries)");
      $("#bank-summary").hidden = true; $("#bank-paste").value = ""; bank.lastText = "";
      loadBank();
    }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  });
  // keep the uploaded file's text for the re-merge on save
  var _bankRead = bankRead; bankRead = function (t) { bank.lastText = t; _bankRead(t); };

  /* ================================================================ go */
  window.addEventListener("hashchange", function () { if (tree.size && $("#cms-editor").hidden && $("#cms-post").hidden) route(); });
  if (token) {
    signIn().catch(function (e) {
      if (e.status === 401 || e.status === 404) { clearToken(); token = ""; showLogin(e.status === 401 ? "Your key has expired or was removed. Please sign in again." : e.message); }
      else showLogin(e.message);
    });
  } else showLogin();
})();
