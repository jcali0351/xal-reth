/* The Faces of the Coil: the social profiles' server (Cloudflare Workers, ES module, D1 database DB, KV namespace PICS).

   Who may do what
   - Anyone may read: the feed, profiles, posts, comments, bonds and approved pictures.
   - Members sign in with Battle.net (OAuth, scope wow.profile). Their characters that are on the guild roster
     (data/roster.json on the website) become theirs to post as. The session is an HMAC-signed token kept in their
     browser; the Battle.net token itself is never stored.
   - Officers moderate with the same GitHub token the Sanctum Editor uses (it must be able to push to the site's
     repository), sent as "X-Officer-Token".
   - Posts and comments appear at once; anyone may report them; officers hide them or mute a member. Pictures wait
     for an officer's approval before anyone else can see them.

   Secrets (Settings > Variables and Secrets; never in a file): BNET_CLIENT_ID, BNET_CLIENT_SECRET, SESSION_SECRET.
   Variables: SITE (default https://jcali0351.github.io/xal-reth/), REPO (default jcali0351/xal-reth), REGION (us),
   ALLOWED_ORIGINS (default https://jcali0351.github.io). DEV = "1" only on a local wrangler dev, never deployed:
   it adds /auth/dev for testing without Battle.net. See README.md. */

const enc = new TextEncoder();
const HOUR = 3600e3, DAY = 864e5;
const REACTIONS = ["light", "bask", "grip", "letgo"];
const BONDS = ["kin", "friend", "rival", "mentor", "student", "sworn", "beloved"];
const DETAIL_FIELDS = { icName: 80, title: 120, pronouns: 40, home: 120, affiliation: 160, relationship: 80, likes: 400, dislikes: 400, about: 3000 };
const LIMITS = { postsPerHour: 20, commentsPerHour: 60, picsPerDay: 12, reportsPerHour: 20 };
const officerCache = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "https://jcali0351.github.io").split(",").map((s) => s.trim());
    const dev = env.DEV === "1";
    const okOrigin = allowed.includes(origin) || (dev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    const cors = {
      "Access-Control-Allow-Origin": okOrigin ? origin : allowed[0],
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Officer-Token",
      "Access-Control-Max-Age": "600", Vary: "Origin",
    };
    const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const p = url.pathname.replace(/\/+$/, "") || "/", m = request.method;
      const ctx = { env, url, request, dev, site: env.SITE || "https://jcali0351.github.io/xal-reth/" };
      // --- signing in
      if (p === "/auth/login") return login(ctx);
      if (p === "/auth/callback") return callback(ctx);
      if (p === "/auth/dev" && dev) return devLogin(ctx);
      // --- pictures are served to <img> tags, so they carry no header: only approved ones
      if (p === "/pic" && m === "GET") return picture(ctx, cors);
      if (m !== "GET" && origin && !okOrigin) return json({ error: "Not from the sanctum." }, 403);
      // --- officers
      if (p.startsWith("/mod/")) {
        if (!(await officer(ctx))) return json({ error: "Officers only: sign in to the Sanctum Editor." }, 401);
        if (p === "/mod/queue" && m === "GET") return json(await modQueue(ctx));
        if (p === "/mod/hide" && m === "POST") return json(await modHide(ctx, await body(request)));
        if (p === "/mod/pic" && m === "POST") return json(await modPic(ctx, await body(request)));
        if (p === "/mod/mute" && m === "POST") return json(await modMute(ctx, await body(request)));
        if (p === "/mod/resolve" && m === "POST") return json(await modResolve(ctx, await body(request)));
        return json({ error: "Not found" }, 404);
      }
      // --- reading (anyone; signed-in members also see their own reactions)
      const me = await session(ctx);
      if (p === "/health") return json({ ok: true, signin: !!(env.BNET_CLIENT_ID && env.BNET_CLIENT_SECRET && env.SESSION_SECRET), db: !!env.DB, pics: !!env.PICS });
      if (p === "/feed" && m === "GET") return json(await feed(ctx, me));
      if (p === "/profile" && m === "GET") return json(await profile(ctx, me, url.searchParams.get("c")));
      if (p === "/post" && m === "GET") return json(await onePost(ctx, me, url.searchParams.get("id")));
      if (p === "/directory" && m === "GET") return json(await directory(ctx));
      // --- writing (members)
      if (!me) return json({ error: "Sign in with Battle.net first." }, 401);
      if (p === "/me" && m === "GET") return json(await meInfo(ctx, me));
      const b = m === "GET" || m === "DELETE" ? {} : p === "/pics" ? null : await body(request);
      const muted = (await env.DB.prepare("SELECT muted FROM users WHERE id = ?").bind(me.u).first())?.muted;
      if (muted && m !== "GET") return json({ error: "An officer has paused your posting for now. Ask them in Discord." }, 403);
      if (p === "/profile" && m === "PUT") return json(await saveProfile(ctx, me, b));
      if (p === "/status" && m === "POST") return json(await setStatus(ctx, me, b));
      if (p === "/posts" && m === "POST") return json(await newPost(ctx, me, b));
      if (p === "/posts" && m === "DELETE") return json(await delPost(ctx, me, url.searchParams.get("id")));
      if (p === "/comments" && m === "POST") return json(await newComment(ctx, me, b));
      if (p === "/comments" && m === "DELETE") return json(await delComment(ctx, me, url.searchParams.get("id")));
      if (p === "/react" && m === "POST") return json(await react(ctx, me, b));
      if (p === "/bonds" && m === "POST") return json(await askBond(ctx, me, b));
      if (p === "/bonds/accept" && m === "POST") return json(await acceptBond(ctx, me, b));
      if (p === "/bonds" && m === "DELETE") return json(await dropBond(ctx, me, { as: url.searchParams.get("as"), other: url.searchParams.get("other") }));
      if (p === "/pics" && m === "POST") return json(await upload(ctx, me));
      if (p === "/report" && m === "POST") return json(await report(ctx, me, b));
      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, (e && e.status) || 500);
    }
  },
};

/* ------------------------------------------------------------------ small helpers */
function fail(msg, status = 400) { const e = new Error(msg); e.status = status; throw e; }
async function body(request) { try { return await request.json(); } catch { fail("That wasn't valid JSON."); } }
const now = () => Date.now();
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
function clean(s, max) {
  return String(s == null ? "" : s).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, max);
}
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
async function hmac(env, text) {
  if (!env.SESSION_SECRET) fail("SESSION_SECRET is not set.", 500);
  const key = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}
async function sign(env, obj) { const p = b64url(enc.encode(JSON.stringify(obj))); return p + "." + (await hmac(env, p)); }
async function verify(env, token) {
  const [p, s] = String(token || "").split(".");
  if (!p || !s || (await hmac(env, p)) !== s) return null;
  try { const o = JSON.parse(fromB64url(p)); return o.exp > now() ? o : null; } catch { return null; }
}
async function session(ctx) {
  const h = ctx.request.headers.get("Authorization") || "";
  const t = h.replace(/^Bearer\s+/i, "");
  if (!t || !ctx.env.SESSION_SECRET) return null;
  return verify(ctx.env, t);
}
// the characters this member may act as
async function myChars(ctx, me) {
  const r = await ctx.env.DB.prepare("SELECT key, name FROM chars WHERE user_id = ? ORDER BY name").bind(me.u).all();
  return r.results || [];
}
async function asChar(ctx, me, key) {
  key = String(key || "").toLowerCase();
  const row = await ctx.env.DB.prepare("SELECT key FROM chars WHERE key = ? AND user_id = ?").bind(key, me.u).first();
  if (!row) fail("You can only act as your own characters.", 403);
  return key;
}
async function touch(ctx, key) {
  await ctx.env.DB.prepare("INSERT INTO profiles (key, updated, active) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET active = excluded.active").bind(key, now(), now()).run();
}
async function recentCount(ctx, sql, key, since) { return (await ctx.env.DB.prepare(sql).bind(key, since).first())?.n || 0; }
async function roster(ctx) {
  const r = await fetch(ctx.site + "data/roster.json", { cf: { cacheTtl: 300 } });
  if (!r.ok) fail("The guild roster couldn't be read.", 502);
  const d = await r.json();
  const map = new Map();
  for (const m of d.members || []) map.set(`${m.realmSlug}/${m.name.toLowerCase()}`, m);
  return map;
}

/* ------------------------------------------------------------------ signing in with Battle.net */
function back(ctx, ret, hash) {
  const target = new URL(ret && ret.startsWith(ctx.site) ? ret : ctx.site + "rp.html");
  target.hash = hash;
  return Response.redirect(target.toString(), 302);
}
async function login(ctx) {
  const { env, url } = ctx;
  if (!env.BNET_CLIENT_ID) fail("Battle.net sign-in is not set up yet.", 503);
  const ret = url.searchParams.get("return") || "";
  const state = await sign(env, { ret, n: newId(), exp: now() + 10 * 60e3 });
  const auth = new URL("https://oauth.battle.net/authorize");
  auth.search = new URLSearchParams({ client_id: env.BNET_CLIENT_ID, redirect_uri: url.origin + "/auth/callback", response_type: "code", scope: "wow.profile", state }).toString();
  return Response.redirect(auth.toString(), 302);
}
async function callback(ctx) {
  const { env, url } = ctx;
  const st = await verify(env, url.searchParams.get("state"));
  if (!st) return back(ctx, "", "#signin=expired");
  if (url.searchParams.get("error") || !url.searchParams.get("code")) return back(ctx, st.ret, "#signin=cancelled");
  const tok = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(env.BNET_CLIENT_ID + ":" + env.BNET_CLIENT_SECRET), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code"), redirect_uri: url.origin + "/auth/callback" }),
  });
  if (!tok.ok) return back(ctx, st.ret, "#signin=failed");
  const access = (await tok.json()).access_token;
  const region = env.REGION || "us";
  const prof = await fetch(`https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}&locale=en_US`, { headers: { Authorization: "Bearer " + access } });
  if (!prof.ok) return back(ctx, st.ret, "#signin=noprofile");
  const d = await prof.json();
  const userId = String(d.id || "");
  if (!userId) return back(ctx, st.ret, "#signin=noprofile");
  const chars = [];
  for (const acct of d.wow_accounts || []) for (const c of acct.characters || []) if (c.realm?.slug && c.name) chars.push({ key: `${c.realm.slug}/${c.name.toLowerCase()}`, name: c.name });
  return finishLogin(ctx, userId, chars, st.ret);
}
async function finishLogin(ctx, userId, chars, ret) {
  const { env } = ctx;
  const guild = await roster(ctx);
  const mine = chars.filter((c) => guild.has(c.key));
  if (!mine.length) return back(ctx, ret, "#signin=notmember");
  const t = now();
  const stmts = [env.DB.prepare("INSERT INTO users (id, created, last_login) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET last_login = excluded.last_login").bind(userId, t, t)];
  for (const c of mine) {
    stmts.push(env.DB.prepare("INSERT INTO chars (key, user_id, name, claimed) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET user_id = excluded.user_id, name = excluded.name").bind(c.key, userId, guild.get(c.key).name, t));
    stmts.push(env.DB.prepare("INSERT INTO profiles (key, updated, active) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING").bind(c.key, t, t));
  }
  // characters that have left this account (deleted, transferred) are let go
  const keys = mine.map((c) => c.key);
  stmts.push(env.DB.prepare(`DELETE FROM chars WHERE user_id = ? AND key NOT IN (${keys.map(() => "?").join(",")})`).bind(userId, ...keys));
  await env.DB.batch(stmts);
  const token = await sign(env, { u: userId, exp: now() + 30 * DAY });
  return back(ctx, ret, "#session=" + token);
}
async function devLogin(ctx) {
  // local testing only (DEV=1): /auth/dev?user=…&chars=realm/name,realm/name&return=…
  const u = ctx.url.searchParams;
  const chars = (u.get("chars") || "").split(",").filter(Boolean).map((k) => ({ key: k.toLowerCase(), name: k.split("/").pop() }));
  return finishLogin(ctx, "dev-" + (u.get("user") || "1"), chars, u.get("return") || "");
}
async function meInfo(ctx, me) {
  const chars = await myChars(ctx, me);
  const muted = (await ctx.env.DB.prepare("SELECT muted FROM users WHERE id = ?").bind(me.u).first())?.muted || 0;
  const pending = await ctx.env.DB.prepare(`SELECT a, b, kind FROM bonds WHERE status = 'pending' AND b IN (${chars.map(() => "?").join(",") || "''"})`).bind(...chars.map((c) => c.key)).all();
  return { chars, muted: !!muted, bondRequests: pending.results || [] };
}

/* ------------------------------------------------------------------ reading */
async function decorate(ctx, me, posts) {
  if (!posts.length) return { posts: [], faces: {} };
  const ids = posts.map((p) => p.id), qs = ids.map(() => "?").join(",");
  const [rx, cm] = await Promise.all([
    ctx.env.DB.prepare(`SELECT post, kind, COUNT(*) AS n FROM reactions WHERE post IN (${qs}) GROUP BY post, kind`).bind(...ids).all(),
    ctx.env.DB.prepare(`SELECT id, post, author, body, created FROM comments WHERE hidden = 0 AND post IN (${qs}) ORDER BY created`).bind(...ids).all(),
  ]);
  let mine = { results: [] };
  if (me) {
    const chars = (await myChars(ctx, me)).map((c) => c.key);
    if (chars.length) mine = await ctx.env.DB.prepare(`SELECT post, author, kind FROM reactions WHERE post IN (${qs}) AND author IN (${chars.map(() => "?").join(",")})`).bind(...ids, ...chars).all();
  }
  const byPost = {};
  for (const p of posts) byPost[p.id] = { ...p, reactions: {}, mine: {}, comments: [] };
  for (const r of rx.results || []) byPost[r.post].reactions[r.kind] = r.n;
  for (const r of mine.results || []) byPost[r.post].mine[r.author] = r.kind;
  for (const c of cm.results || []) byPost[c.post].comments.push(c);
  const out = posts.map((p) => byPost[p.id]);
  const keys = [...new Set(out.flatMap((p) => [p.author, p.wall, ...p.comments.map((c) => c.author)]))];
  const faces = await facesOf(ctx, keys);
  return { posts: out.map((p) => ({ ...p, commentCount: p.comments.length, comments: p.comments.slice(-30) })), faces };
}
async function facesOf(ctx, keys) {
  if (!keys.length) return {};
  const r = await ctx.env.DB.prepare(`SELECT key, details, status FROM profiles WHERE key IN (${keys.map(() => "?").join(",")})`).bind(...keys).all();
  const faces = {};
  for (const row of r.results || []) {
    const d = safeJson(row.details);
    faces[row.key] = { icName: d.icName || "", title: d.title || "", avatar: d.avatar || "", status: row.status || "" };
  }
  return faces;
}
const safeJson = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };
async function feed(ctx, me) {
  const before = Number(ctx.url.searchParams.get("before")) || now() + 1;
  const limit = Math.min(30, Number(ctx.url.searchParams.get("limit")) || 20);
  const r = await ctx.env.DB.prepare("SELECT id, author, wall, body, pic, kind, created FROM posts WHERE hidden = 0 AND created < ? ORDER BY created DESC LIMIT ?").bind(before, limit).all();
  const d = await decorate(ctx, me, r.results || []);
  return { posts: d.posts || [], faces: d.faces || {}, more: (r.results || []).length === limit };
}
async function onePost(ctx, me, id) {
  const r = await ctx.env.DB.prepare("SELECT id, author, wall, body, pic, kind, created FROM posts WHERE id = ? AND hidden = 0").bind(id || "").all();
  if (!(r.results || []).length) fail("That post is gone.", 404);
  const d = await decorate(ctx, me, r.results);
  return { post: d.posts[0], faces: d.faces };
}
async function profile(ctx, me, key) {
  key = String(key || "").toLowerCase();
  const row = await ctx.env.DB.prepare("SELECT key, details, status, status_at, updated, active FROM profiles WHERE key = ?").bind(key).first();
  const claimed = !!(await ctx.env.DB.prepare("SELECT 1 FROM chars WHERE key = ?").bind(key).first());
  const posts = await ctx.env.DB.prepare("SELECT id, author, wall, body, pic, kind, created FROM posts WHERE hidden = 0 AND (wall = ? OR author = ?) ORDER BY created DESC LIMIT 40").bind(key, key).all();
  const bonds = await ctx.env.DB.prepare("SELECT a, b, kind, created FROM bonds WHERE status = 'accepted' AND (a = ? OR b = ?) ORDER BY created DESC").bind(key, key).all();
  const photos = await ctx.env.DB.prepare("SELECT id, created FROM pics WHERE owner = ? AND status = 'approved' AND use = 'post' ORDER BY created DESC LIMIT 24").bind(key).all();
  const d = await decorate(ctx, me, posts.results || []);
  const bondKeys = (bonds.results || []).map((x) => (x.a === key ? x.b : x.a));
  const faces = { ...(d.faces || {}), ...(await facesOf(ctx, bondKeys.concat([key]))) };
  const details = row ? safeJson(row.details) : {};
  return { key, claimed, details, status: row?.status || "", statusAt: row?.status_at || null, active: row?.active || null,
    posts: d.posts || [], faces, bonds: (bonds.results || []).map((x) => ({ with: x.a === key ? x.b : x.a, kind: x.kind, since: x.created })),
    photos: (photos.results || []).map((x) => x.id) };
}
async function directory(ctx) {
  const r = await ctx.env.DB.prepare("SELECT p.key, p.details, p.status, p.status_at, p.active FROM profiles p JOIN chars c ON c.key = p.key ORDER BY p.active DESC LIMIT 500").all();
  return { profiles: (r.results || []).map((x) => { const d = safeJson(x.details); return { key: x.key, icName: d.icName || "", title: d.title || "", avatar: d.avatar || "", status: x.status || "", statusAt: x.status_at, active: x.active }; }) };
}
async function picture(ctx, cors) {
  const id = ctx.url.searchParams.get("id") || "";
  const row = await ctx.env.DB.prepare("SELECT type, status FROM pics WHERE id = ?").bind(id).first();
  if (!row || row.status !== "approved") return new Response("Not found", { status: 404, headers: cors });
  const data = await ctx.env.PICS.get("pic:" + id, "arrayBuffer");
  if (!data) return new Response("Not found", { status: 404, headers: cors });
  return new Response(data, { headers: { ...cors, "Content-Type": row.type, "Cache-Control": "public, max-age=604800, immutable" } });
}

/* ------------------------------------------------------------------ writing */
async function saveProfile(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const row = await ctx.env.DB.prepare("SELECT details FROM profiles WHERE key = ?").bind(key).first();
  const d = safeJson(row?.details);
  for (const [f, max] of Object.entries(DETAIL_FIELDS)) if (b.details && f in b.details) d[f] = clean(b.details[f], max);
  for (const f of ["avatar", "cover"]) if (b.details && f in b.details) {
    const id = String(b.details[f] || "");
    if (!id) { d[f] = ""; continue; }
    const pic = await ctx.env.DB.prepare("SELECT owner, use FROM pics WHERE id = ?").bind(id).first();
    if (!pic || pic.owner !== key) fail("That picture isn't yours.", 403);
    d[f] = id;
  }
  await ctx.env.DB.prepare("INSERT INTO profiles (key, details, updated, active) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET details = excluded.details, updated = excluded.updated, active = excluded.active")
    .bind(key, JSON.stringify(d), now(), now()).run();
  return { ok: true, details: d };
}
async function setStatus(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const text = clean(b.text, 140);
  if ((await recentCount(ctx, "SELECT COUNT(*) AS n FROM posts WHERE author = ? AND created > ?", key, now() - HOUR)) >= LIMITS.postsPerHour) fail("That's a lot of words for one hour. Bask a while, then try again.", 429);
  const t = now(), stmts = [ctx.env.DB.prepare("INSERT INTO profiles (key, status, status_at, updated, active) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET status = excluded.status, status_at = excluded.status_at, active = excluded.active").bind(key, text, t, t, t)];
  const id = newId();
  if (text) stmts.push(ctx.env.DB.prepare("INSERT INTO posts (id, author, wall, body, kind, created) VALUES (?, ?, ?, ?, 'status', ?)").bind(id, key, key, text, t));
  await ctx.env.DB.batch(stmts);
  return { ok: true, status: text, id: text ? id : null };
}
async function newPost(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const wall = String(b.wall || key).toLowerCase();
  const text = clean(b.body, 1000);
  const pic = b.pic ? String(b.pic) : null;
  if (!text && !pic) fail("Write something first.");
  if (wall !== key && !(await ctx.env.DB.prepare("SELECT 1 FROM profiles WHERE key = ?").bind(wall).first())) fail("That profile doesn't exist yet.", 404);
  if (pic) {
    const p = await ctx.env.DB.prepare("SELECT owner FROM pics WHERE id = ?").bind(pic).first();
    if (!p || p.owner !== key) fail("That picture isn't yours.", 403);
  }
  if ((await recentCount(ctx, "SELECT COUNT(*) AS n FROM posts WHERE author = ? AND created > ?", key, now() - HOUR)) >= LIMITS.postsPerHour) fail("That's a lot of posts for one hour. Bask a while, then try again.", 429);
  const id = newId(), t = now();
  await ctx.env.DB.prepare("INSERT INTO posts (id, author, wall, body, pic, created) VALUES (?, ?, ?, ?, ?, ?)").bind(id, key, wall, text, pic, t).run();
  await touch(ctx, key);
  return { ok: true, id };
}
async function ownsPost(ctx, me, table, id) {
  const row = await ctx.env.DB.prepare(`SELECT author${table === "posts" ? ", wall" : ""} FROM ${table} WHERE id = ?`).bind(id || "").first();
  if (!row) fail("Already gone.", 404);
  const chars = (await myChars(ctx, me)).map((c) => c.key);
  // you may remove what you wrote, and posts others left on your own wall
  if (!(chars.includes(row.author) || (row.wall && chars.includes(row.wall)))) fail("That isn't yours to remove.", 403);
}
async function delPost(ctx, me, id) {
  await ownsPost(ctx, me, "posts", id);
  await ctx.env.DB.batch([ctx.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id), ctx.env.DB.prepare("DELETE FROM comments WHERE post = ?").bind(id), ctx.env.DB.prepare("DELETE FROM reactions WHERE post = ?").bind(id)]);
  return { ok: true };
}
async function newComment(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const text = clean(b.body, 500);
  if (!text) fail("Write something first.");
  if (!(await ctx.env.DB.prepare("SELECT 1 FROM posts WHERE id = ? AND hidden = 0").bind(String(b.post || "")).first())) fail("That post is gone.", 404);
  if ((await recentCount(ctx, "SELECT COUNT(*) AS n FROM comments WHERE author = ? AND created > ?", key, now() - HOUR)) >= LIMITS.commentsPerHour) fail("That's a lot of comments for one hour. Let go a little.", 429);
  const id = newId();
  await ctx.env.DB.prepare("INSERT INTO comments (id, post, author, body, created) VALUES (?, ?, ?, ?, ?)").bind(id, String(b.post), key, text, now()).run();
  await touch(ctx, key);
  return { ok: true, id };
}
async function delComment(ctx, me, id) {
  const row = await ctx.env.DB.prepare("SELECT c.author, p.wall FROM comments c JOIN posts p ON p.id = c.post WHERE c.id = ?").bind(id || "").first();
  if (!row) fail("Already gone.", 404);
  const chars = (await myChars(ctx, me)).map((c) => c.key);
  if (!(chars.includes(row.author) || chars.includes(row.wall))) fail("That isn't yours to remove.", 403);
  await ctx.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  return { ok: true };
}
async function react(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const post = String(b.post || "");
  if (!(await ctx.env.DB.prepare("SELECT 1 FROM posts WHERE id = ? AND hidden = 0").bind(post).first())) fail("That post is gone.", 404);
  if (!b.kind) { await ctx.env.DB.prepare("DELETE FROM reactions WHERE post = ? AND author = ?").bind(post, key).run(); return { ok: true }; }
  if (!REACTIONS.includes(b.kind)) fail("Unknown reaction.");
  await ctx.env.DB.prepare("INSERT INTO reactions (post, author, kind, created) VALUES (?, ?, ?, ?) ON CONFLICT(post, author) DO UPDATE SET kind = excluded.kind").bind(post, key, b.kind, now()).run();
  return { ok: true };
}
async function askBond(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const to = String(b.to || "").toLowerCase();
  if (to === key) fail("A bond needs two people.");
  if (!BONDS.includes(b.kind)) fail("Unknown kind of bond.");
  if (!(await ctx.env.DB.prepare("SELECT 1 FROM chars WHERE key = ?").bind(to).first())) fail("They haven't joined the Faces yet: they need to sign in once.", 404);
  const back2 = await ctx.env.DB.prepare("SELECT status FROM bonds WHERE a = ? AND b = ?").bind(to, key).first();
  if (back2) { // they already asked us: accept it
    await ctx.env.DB.prepare("UPDATE bonds SET status = 'accepted', kind = ? WHERE a = ? AND b = ?").bind(b.kind, to, key).run();
    return { ok: true, status: "accepted" };
  }
  await ctx.env.DB.prepare("INSERT INTO bonds (a, b, kind, status, created) VALUES (?, ?, ?, 'pending', ?) ON CONFLICT(a, b) DO UPDATE SET kind = excluded.kind").bind(key, to, b.kind, now()).run();
  return { ok: true, status: "pending" };
}
async function acceptBond(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const from = String(b.from || "").toLowerCase();
  const r = await ctx.env.DB.prepare("UPDATE bonds SET status = 'accepted' WHERE a = ? AND b = ? AND status = 'pending'").bind(from, key).run();
  if (!r.meta || !r.meta.changes) fail("There's no such request.", 404);
  return { ok: true };
}
async function dropBond(ctx, me, b) {
  const key = await asChar(ctx, me, b.as);
  const other = String(b.other || "").toLowerCase();
  await ctx.env.DB.prepare("DELETE FROM bonds WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)").bind(key, other, other, key).run();
  return { ok: true };
}
async function upload(ctx, me) {
  const u = ctx.url.searchParams;
  const key = await asChar(ctx, me, u.get("as"));
  const use = ["post", "avatar", "cover"].includes(u.get("use")) ? u.get("use") : "post";
  const type = (ctx.request.headers.get("Content-Type") || "").split(";")[0].trim();
  if (!["image/webp", "image/jpeg", "image/png"].includes(type)) fail("Pictures must be WebP, JPEG or PNG.");
  const data = await ctx.request.arrayBuffer();
  if (!data.byteLength) fail("The picture is empty.");
  if (data.byteLength > 600 * 1024) fail("That picture is too large (the page shrinks them first; try a smaller one).", 413);
  const sig = new Uint8Array(data.slice(0, 12));
  const isPng = sig[0] === 0x89 && sig[1] === 0x50, isJpg = sig[0] === 0xff && sig[1] === 0xd8, isWebp = sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50;
  if (!(isPng || isJpg || isWebp)) fail("That doesn't look like a picture.");
  if ((await recentCount(ctx, "SELECT COUNT(*) AS n FROM pics WHERE owner = ? AND created > ?", key, now() - DAY)) >= LIMITS.picsPerDay) fail("That's enough pictures for today.", 429);
  const id = newId();
  await ctx.env.PICS.put("pic:" + id, data);
  await ctx.env.DB.prepare("INSERT INTO pics (id, owner, use, type, size, status, created) VALUES (?, ?, ?, ?, ?, 'pending', ?)").bind(id, key, use, type, data.byteLength, now()).run();
  return { ok: true, id, status: "pending" };
}
async function report(ctx, me, b) {
  const type = ["post", "comment", "profile", "pic"].includes(b.type) ? b.type : fail("Unknown kind of report.");
  const reporter = b.as ? await asChar(ctx, me, b.as) : null;
  if (reporter && (await recentCount(ctx, "SELECT COUNT(*) AS n FROM reports WHERE reporter = ? AND created > ?", reporter, now() - HOUR)) >= LIMITS.reportsPerHour) fail("Thank you. The officers have plenty to read for now.", 429);
  await ctx.env.DB.prepare("INSERT INTO reports (id, type, target, reporter, reason, created) VALUES (?, ?, ?, ?, ?, ?)").bind(newId(), type, String(b.id || "").slice(0, 80), reporter, clean(b.reason, 300) || "(no reason given)", now()).run();
  return { ok: true };
}

/* ------------------------------------------------------------------ officers */
async function officer(ctx) {
  const token = ctx.request.headers.get("X-Officer-Token") || "";
  if (token.length < 20) return false;
  const key = b64url(await crypto.subtle.digest("SHA-256", enc.encode(token)));
  const until = officerCache.get(key);
  if (until && until > now()) return true;
  if (ctx.dev && token === "dev-officer-token-local-only") return true;
  const r = await fetch(`https://api.github.com/repos/${ctx.env.REPO || "jcali0351/xal-reth"}`, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "xalreth-social-worker", Accept: "application/vnd.github+json" } });
  if (!r.ok) return false;
  const d = await r.json();
  if (!(d.permissions && (d.permissions.push || d.permissions.admin))) return false;
  officerCache.set(key, now() + 10 * 60e3);
  return true;
}
async function modQueue(ctx) {
  const db = ctx.env.DB;
  const [reports, pics, muted, hidden] = await Promise.all([
    db.prepare("SELECT id, type, target, reporter, reason, created FROM reports WHERE resolved = 0 ORDER BY created DESC LIMIT 100").all(),
    db.prepare("SELECT id, owner, use, size, created FROM pics WHERE status = 'pending' ORDER BY created LIMIT 100").all(),
    db.prepare("SELECT u.id, GROUP_CONCAT(c.key) AS chars FROM users u LEFT JOIN chars c ON c.user_id = u.id WHERE u.muted = 1 GROUP BY u.id").all(),
    db.prepare("SELECT id, author, body, created FROM posts WHERE hidden = 1 ORDER BY created DESC LIMIT 50").all(),
  ]);
  // what was reported, so officers can judge without leaving the editor
  const items = [];
  for (const r of reports.results || []) {
    let content = null;
    if (r.type === "post") content = await db.prepare("SELECT author, body, hidden FROM posts WHERE id = ?").bind(r.target).first();
    if (r.type === "comment") content = await db.prepare("SELECT author, body, hidden FROM comments WHERE id = ?").bind(r.target).first();
    if (r.type === "profile") content = await db.prepare("SELECT key AS author, details AS body FROM profiles WHERE key = ?").bind(r.target).first();
    items.push({ ...r, content });
  }
  return { reports: items, pics: pics.results || [], muted: muted.results || [], hidden: hidden.results || [] };
}
async function picPreview(ctx, id) {   // officers see pending pictures through this, as data URLs
  const row = await ctx.env.DB.prepare("SELECT type FROM pics WHERE id = ?").bind(id).first();
  const data = await ctx.env.PICS.get("pic:" + id, "arrayBuffer");
  if (!row || !data) return null;
  let s = ""; const a = new Uint8Array(data);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return `data:${row.type};base64,${btoa(s)}`;
}
async function modHide(ctx, b) {
  const table = b.type === "comment" ? "comments" : b.type === "post" ? "posts" : fail("Posts or comments only.");
  await ctx.env.DB.prepare(`UPDATE ${table} SET hidden = ? WHERE id = ?`).bind(b.hidden === false ? 0 : 1, String(b.id || "")).run();
  return { ok: true };
}
async function modPic(ctx, b) {
  if (b.preview) return { ok: true, data: await picPreview(ctx, String(b.id || "")) };
  const status = b.approve ? "approved" : "rejected";
  await ctx.env.DB.prepare("UPDATE pics SET status = ? WHERE id = ?").bind(status, String(b.id || "")).run();
  if (!b.approve) await ctx.env.PICS.delete("pic:" + String(b.id || ""));
  return { ok: true, status };
}
async function modMute(ctx, b) {
  let user = b.user;
  if (!user && b.key) user = (await ctx.env.DB.prepare("SELECT user_id FROM chars WHERE key = ?").bind(String(b.key).toLowerCase()).first())?.user_id;
  if (!user) fail("No such member.", 404);
  await ctx.env.DB.prepare("UPDATE users SET muted = ? WHERE id = ?").bind(b.muted === false ? 0 : 1, user).run();
  return { ok: true };
}
async function modResolve(ctx, b) {
  await ctx.env.DB.prepare("UPDATE reports SET resolved = 1 WHERE id = ?").bind(String(b.id || "")).run();
  return { ok: true };
}
