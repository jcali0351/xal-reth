/* The Sanctum Editor's admin Worker (Cloudflare Workers, ES module). It holds the keys the website must never hold and
   answers only John: every request must carry a GitHub token (the one the Sanctum Editor already uses) that GitHub
   confirms can push to the site's repository.

   Routes (all JSON, all need "Authorization: Bearer <GitHub token>"):
     GET    /health                       what is configured
     GET    /analytics?start=&end=&group= GoatCounter totals, pages and events, referrers, browsers, systems, sizes, countries
     GET    /x/queue                      scheduled posts, drafts and the log of what was posted
     PUT    /x/queue                      create or update one item {id?, text, media?: ["img/uploads/…"], at?, status}
     DELETE /x/queue?id=…                 remove an item
     POST   /x/post                       post now {text, media?} or {id} (an item in the queue)
     GET    /x/metrics?refresh=1          our recent posts with their metrics (cached for 12 hours to keep X costs low)
   Cron (wrangler.toml / dashboard: every 5 minutes): posts whatever in the queue is due, at most MAX_PER_RUN at once.

   Secrets (Settings > Variables and Secrets; never in a file): GOATCOUNTER_KEY, X_API_KEY, X_API_SECRET,
   X_ACCESS_TOKEN, X_ACCESS_SECRET. Plain variables: GOATCOUNTER_SITE (the code, e.g. xalreth), REPO
   (default jcali0351/xal-reth), SITE (default https://jcali0351.github.io/xal-reth/), ALLOWED_ORIGINS (default
   https://jcali0351.github.io), MAX_POSTS_PER_DAY (default 12). KV namespace binding: XR. See README.md. */

const enc = new TextEncoder();
const authCache = new Map();   // sha-256 of a token -> expiry (per Worker instance)

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "https://jcali0351.github.io").split(",").map((s) => s.trim());
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (origin && !allowed.includes(origin)) return json({ error: "This Worker answers only the Sanctum Editor." }, 403);
    try {
      if (!(await authorised(request, env))) return json({ error: "Sign in to the Sanctum Editor with a GitHub token that can save to the site." }, 401);
      const url = new URL(request.url), p = url.pathname.replace(/\/+$/, "") || "/";
      if (p === "/health") return json({ ok: true, analytics: !!(env.GOATCOUNTER_SITE && env.GOATCOUNTER_KEY), x: xReady(env), store: !!env.XR });
      if (p === "/analytics" && request.method === "GET") return json(await analytics(env, url));
      if (p === "/x/queue") {
        need(env.XR, "The XR KV namespace is not bound to the Worker.");
        if (request.method === "GET") return json(await readQueue(env));
        if (request.method === "PUT") return json(await saveItem(env, await request.json()));
        if (request.method === "DELETE") return json(await deleteItem(env, url.searchParams.get("id")));
      }
      if (p === "/x/post" && request.method === "POST") return json(await postNow(env, await request.json()));
      if (p === "/x/metrics" && request.method === "GET") return json(await metrics(env, url.searchParams.get("refresh") === "1"));
      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, e && e.status || 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runQueue(env));
  },
};

function need(v, msg) { if (!v) { const e = new Error(msg); e.status = 400; throw e; } }

/* ---------------------------------------------------------------- who may ask */
async function authorised(request, env) {
  const h = request.headers.get("Authorization") || "";
  const token = h.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length < 20) return false;
  const key = await sha256(token);
  const until = authCache.get(key);
  if (until && until > Date.now()) return true;
  const repo = env.REPO || "jcali0351/xal-reth";
  const r = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "xalreth-admin-worker", Accept: "application/vnd.github+json" },
  });
  if (!r.ok) return false;
  const d = await r.json();
  if (!(d.permissions && (d.permissions.push || d.permissions.admin))) return false;
  authCache.set(key, Date.now() + 10 * 60 * 1000);
  return true;
}
async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
function hex(buf) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""); }

/* ---------------------------------------------------------------- analytics (GoatCounter) */
async function analytics(env, url) {
  need(env.GOATCOUNTER_SITE && env.GOATCOUNTER_KEY, "GoatCounter is not set up yet (GOATCOUNTER_SITE and GOATCOUNTER_KEY).");
  const hour = (d) => { d = new Date(d); d.setUTCMinutes(0, 0, 0); return d.toISOString().replace(".000Z", "Z"); };
  const end = hour(url.searchParams.get("end") || Date.now());
  const start = hour(url.searchParams.get("start") || Date.now() - 7 * 864e5);
  const group = ["hour", "day", "week", "month"].includes(url.searchParams.get("group")) ? url.searchParams.get("group") : "day";
  const cacheKey = `ga:${start}:${end}:${group}`;
  if (env.XR) { const c = await env.XR.get(cacheKey, "json"); if (c) return c; }
  const base = `https://${env.GOATCOUNTER_SITE}.goatcounter.com/api/v0`;
  const get = async (path, params = {}) => {
    const q = new URLSearchParams({ start, end, ...params });
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`${base}${path}?${q}`, { headers: { Authorization: `Bearer ${env.GOATCOUNTER_KEY}`, "Content-Type": "application/json" } });
      if (r.status === 429) { await new Promise((s) => setTimeout(s, 600)); continue; }
      if (!r.ok) throw new Error(`GoatCounter ${path}: ${r.status}`);
      return r.json();
    }
    throw new Error("GoatCounter is busy; try again in a moment.");
  };
  // GoatCounter allows 4 requests a second: ask in small groups
  const [total, hits] = await Promise.all([get("/stats/total"), get("/stats/hits", { limit: 100, group })]);
  const [toprefs, browsers, systems] = await Promise.all([get("/stats/toprefs", { limit: 50 }), get("/stats/browsers", { limit: 30 }), get("/stats/systems", { limit: 30 })]);
  await new Promise((s) => setTimeout(s, 300));
  const [sizes, locations, campaigns] = await Promise.all([get("/stats/sizes", { limit: 20 }), get("/stats/locations", { limit: 60 }), get("/stats/campaigns", { limit: 30 })]);
  const out = { start, end, group, total, hits, toprefs, browsers, systems, sizes, locations, campaigns, fetchedAt: new Date().toISOString() };
  if (env.XR) await env.XR.put(cacheKey, JSON.stringify(out), { expirationTtl: 300 });
  return out;
}

/* ---------------------------------------------------------------- X: signing (OAuth 1.0a, user context) */
function xReady(env) { return !!(env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_SECRET); }
const pct = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
async function oauthHeader(env, method, url, extra = {}) {
  const u = new URL(url);
  const oauth = {
    oauth_consumer_key: env.X_API_KEY, oauth_nonce: crypto.randomUUID().replace(/-/g, ""), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: env.X_ACCESS_TOKEN, oauth_version: "1.0",
  };
  const params = [];
  for (const [k, v] of u.searchParams) params.push([pct(k), pct(v)]);
  for (const [k, v] of Object.entries({ ...oauth, ...extra })) params.push([pct(k), pct(v)]);
  params.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  const baseString = [method.toUpperCase(), pct(u.origin + u.pathname), pct(params.map((p) => p[0] + "=" + p[1]).join("&"))].join("&");
  const key = await crypto.subtle.importKey("raw", enc.encode(pct(env.X_API_SECRET) + "&" + pct(env.X_ACCESS_SECRET)), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(baseString)))));
  return "OAuth " + Object.entries({ ...oauth, oauth_signature: sig }).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(", ");
}
async function xFetch(env, method, url, { json, form } = {}) {
  need(xReady(env), "The X keys are not set up yet (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET).");
  const headers = { Authorization: await oauthHeader(env, method, url), "User-Agent": "xalreth-admin-worker" };
  let body;
  if (json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  if (form) body = form;   // multipart: the body is not part of the signature
  const r = await fetch(url, { method, headers, body });
  const text = await r.text();
  let d; try { d = text ? JSON.parse(text) : {}; } catch { d = { raw: text }; }
  if (!r.ok) {
    const msg = (d.detail || d.title || (d.errors && d.errors.map((e) => e.message).join("; ")) || text || r.status);
    const e = new Error(`X said ${r.status}: ${msg}`); e.status = r.status === 429 ? 429 : 502; throw e;
  }
  return d;
}
async function myId(env) {
  let id = env.XR && await env.XR.get("x:me");
  if (!id) {
    const d = await xFetch(env, "GET", "https://api.x.com/2/users/me");
    id = d.data && d.data.id;
    if (env.XR && id) await env.XR.put("x:me", id);
  }
  return id;
}

/* ---------------------------------------------------------------- X: posting */
async function uploadMedia(env, path) {
  const site = env.SITE || "https://jcali0351.github.io/xal-reth/";
  if (!/^img\/[\w\-./]+\.(png|jpe?g|gif|webp)$/i.test(path)) throw new Error(`Pictures must come from the site's img folder: ${path}`);
  const pic = await fetch(site + path);
  if (!pic.ok) throw new Error(`Couldn't fetch ${path} from the site (${pic.status}).`);
  const blob = await pic.blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error(`${path} is larger than X's 5 MB limit for pictures.`);
  const form = new FormData();
  form.append("media", blob, path.split("/").pop());
  form.append("media_category", "tweet_image");
  const d = await xFetch(env, "POST", "https://api.x.com/2/media/upload", { form });
  const id = (d.data && (d.data.id || d.data.media_id_string)) || d.media_id_string;
  if (!id) throw new Error("X accepted the picture but sent no media id.");
  return String(id);
}
async function countToday(env) {
  const day = new Date().toISOString().slice(0, 10);
  const n = Number((env.XR && await env.XR.get("x:count:" + day)) || 0);
  return { day, n };
}
async function publish(env, text, media) {
  text = String(text || "").trim();
  need(text, "The post is empty.");
  const { day, n } = await countToday(env);
  const max = Number(env.MAX_POSTS_PER_DAY || 12);
  if (n >= max) { const e = new Error(`Today's limit of ${max} posts is reached (MAX_POSTS_PER_DAY).`); e.status = 429; throw e; }
  const ids = [];
  for (const m of (media || []).slice(0, 4)) ids.push(await uploadMedia(env, m));
  const body = { text };
  if (ids.length) body.media = { media_ids: ids };
  const d = await xFetch(env, "POST", "https://api.x.com/2/tweets", { json: body });
  if (env.XR) await env.XR.put("x:count:" + day, String(n + 1), { expirationTtl: 3 * 86400 });
  return d.data && d.data.id;
}

/* ---------------------------------------------------------------- X: the queue (KV "x:queue") */
async function readQueue(env) {
  const q = (await env.XR.get("x:queue", "json")) || { items: [], log: [] };
  q.items ||= []; q.log ||= [];
  return q;
}
async function writeQueue(env, q) {
  q.log = (q.log || []).slice(0, 200);
  await env.XR.put("x:queue", JSON.stringify(q));
  return q;
}
async function saveItem(env, item) {
  need(item && typeof item.text === "string", "An item needs text.");
  const q = await readQueue(env);
  const clean = {
    id: item.id || crypto.randomUUID(), text: item.text.slice(0, 4000),
    media: Array.isArray(item.media) ? item.media.slice(0, 4).map(String) : [],
    at: item.at ? new Date(item.at).toISOString() : null,
    status: ["draft", "scheduled", "paused"].includes(item.status) ? item.status : "draft",
    updated: new Date().toISOString(), error: null,
  };
  if (clean.status === "scheduled" && !clean.at) clean.status = "draft";
  const i = q.items.findIndex((x) => x.id === clean.id);
  if (i >= 0) q.items[i] = { ...q.items[i], ...clean }; else q.items.push({ ...clean, created: clean.updated });
  return writeQueue(env, q);
}
async function deleteItem(env, id) {
  const q = await readQueue(env);
  q.items = q.items.filter((x) => x.id !== id);
  return writeQueue(env, q);
}
async function postNow(env, body) {
  if (body && body.id) {
    need(env.XR, "The XR KV namespace is not bound to the Worker.");
    const q = await readQueue(env), it = q.items.find((x) => x.id === body.id);
    need(it, "That item is no longer in the queue.");
    const xid = await publish(env, it.text, it.media);
    q.items = q.items.filter((x) => x.id !== it.id);
    q.log.unshift({ id: xid, text: it.text, media: it.media, at: new Date().toISOString(), via: "post now" });
    await writeQueue(env, q);
    return { ok: true, id: xid };
  }
  const xid = await publish(env, body && body.text, body && body.media);
  if (env.XR) { const q = await readQueue(env); q.log.unshift({ id: xid, text: body.text, media: body.media || [], at: new Date().toISOString(), via: "composer" }); await writeQueue(env, q); }
  return { ok: true, id: xid };
}
async function runQueue(env) {
  if (!env.XR || !xReady(env)) return;
  const q = await readQueue(env), now = Date.now();
  const due = q.items.filter((x) => x.status === "scheduled" && x.at && Date.parse(x.at) <= now).slice(0, Number(env.MAX_PER_RUN || 3));
  for (const it of due) {
    try {
      const xid = await publish(env, it.text, it.media);
      q.items = q.items.filter((x) => x.id !== it.id);
      q.log.unshift({ id: xid, text: it.text, media: it.media, at: new Date().toISOString(), via: "schedule", plannedFor: it.at });
    } catch (e) {
      it.status = "failed"; it.error = String(e.message || e); it.updated = new Date().toISOString();
    }
  }
  if (due.length) await writeQueue(env, q);
}

/* ---------------------------------------------------------------- X: how our posts are doing */
async function metrics(env, refresh) {
  if (!refresh && env.XR) { const c = await env.XR.get("x:metrics", "json"); if (c) return c; }
  const id = await myId(env);
  const base = `https://api.x.com/2/users/${id}/tweets?max_results=50&exclude=replies&tweet.fields=created_at,public_metrics`;
  let d, linkClicks = true;
  try { d = await xFetch(env, "GET", base + ",non_public_metrics"); }
  catch (e) { linkClicks = false; d = await xFetch(env, "GET", base); }   // link clicks are only given for the last 30 days
  const posts = (d.data || []).map((t) => ({
    id: t.id, text: t.text, created: t.created_at,
    impressions: (t.public_metrics && t.public_metrics.impression_count) || 0,
    likes: (t.public_metrics && t.public_metrics.like_count) || 0,
    reposts: (t.public_metrics && t.public_metrics.retweet_count) || 0,
    replies: (t.public_metrics && t.public_metrics.reply_count) || 0,
    quotes: (t.public_metrics && t.public_metrics.quote_count) || 0,
    bookmarks: (t.public_metrics && t.public_metrics.bookmark_count) || 0,
    clicks: t.non_public_metrics ? t.non_public_metrics.url_link_clicks || 0 : null,
  }));
  const out = { posts, linkClicks, fetchedAt: new Date().toISOString() };
  if (env.XR) await env.XR.put("x:metrics", JSON.stringify(out), { expirationTtl: 12 * 3600 });
  return out;
}
