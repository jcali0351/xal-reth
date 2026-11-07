#!/usr/bin/env node
/**
 * Latest post from @xalrethrp: keeps data/latest-tweet.json current for the homepage card (js/latest-tweet.js).
 *
 * Two ways to update it, both from .github/workflows/latest-tweet.yml:
 *   1. By hand, free:  Actions > "Latest post from X" > Run workflow, paste the post's link.
 *        node tools/sync_tweet.mjs --url https://x.com/xalrethrp/status/1234567890
 *   2. Automatically, hourly: add the repository secret X_BEARER_TOKEN (X API, pay-per-use).
 *        X_BEARER_TOKEN=... node tools/sync_tweet.mjs
 *      It asks only for posts newer than the one already shown (since_id), and X bills per post
 *      returned, so an hour with no new post costs nothing. Without the secret it does nothing.
 *
 * Only @xalrethrp's own posts are ever shown: links from other accounts are refused, and the
 * automatic check skips replies and reposts.
 *
 * Node 20+, no packages.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FILE = path.join(ROOT, "data", "latest-tweet.json");
const HANDLE = "xalrethrp";
const API = "https://api.x.com/2";

const readJson = async (f, fallback) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return fallback; } };
const save = async (data) => { await writeFile(FILE, JSON.stringify(data, null, 2) + "\n"); console.log("Saved", data.url || "(no post yet)"); };

function idFromUrl(u) {
  const m = String(u || "").trim().match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/i);
  return m ? { handle: m[1], id: m[2] } : null;
}

// The post's words and date from X's public oEmbed (free, no key), so the site can draw the post in its own colors.
function decode(s) {
  return s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).trim();
}
async function oembed(url) {
  try {
    const r = await fetch(`https://publish.twitter.com/oembed?omit_script=1&dnt=1&url=${encodeURIComponent(url)}`, { headers: { "User-Agent": "xalreth-site" } });
    if (!r.ok) { console.log("oEmbed", r.status); return {}; }
    const d = await r.json();
    if (String(d.author_url || "").toLowerCase().split("/").pop() !== HANDLE) { console.log("oEmbed: not our account"); return {}; }
    const html = String(d.html || "");
    const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const dates = [...html.matchAll(/<a [^>]*>([A-Z][a-z]+ \d{1,2}, \d{4})<\/a>/g)];
    const text = p ? decode(p[1]).replace(/\s*pic\.(twitter|x)\.com\/\S+$/i, "").trim() : "";
    return { text, dateText: dates.length ? dates[dates.length - 1][1] : "" };
  } catch (e) { console.log("oEmbed failed:", e.message); return {}; }
}

async function api(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "xalreth-site" } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`X API ${r.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function main() {
  const args = process.argv.slice(2);
  const cur = await readJson(FILE, { handle: HANDLE });
  const i = args.indexOf("--url");
  if (i !== -1) {
    const raw = args[i + 1];
    if (!raw) { await save({ handle: HANDLE, userId: cur.userId, updated: new Date().toISOString(), source: "cleared" }); return; }
    const p = idFromUrl(raw);
    if (!p) { console.error("That doesn't look like a post link. Use one like https://x.com/xalrethrp/status/1234567890"); process.exit(1); }
    if (p.handle.toLowerCase() !== HANDLE) { console.error(`Only posts from @${HANDLE} can be shown. That link is from @${p.handle}.`); process.exit(1); }
    const url = `https://x.com/${HANDLE}/status/${p.id}`;
    await save({ handle: HANDLE, userId: cur.userId, id: p.id, url, ...(await oembed(url)),
      updated: new Date().toISOString(), source: "manual" });
    return;
  }

  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    // no API key: at least make sure the post we show has its words
    if (cur.id && !cur.text) {
      const o = await oembed(cur.url || `https://x.com/${HANDLE}/status/${cur.id}`);
      if (o.text) await save({ ...cur, ...o, updated: new Date().toISOString() });
    }
    console.log("No X_BEARER_TOKEN secret, so no automatic check for new posts. Update by hand from the Actions tab.");
    return;
  }

  let userId = cur.userId;
  if (!userId) {
    const u = await api(`${API}/users/by/username/${HANDLE}`, token);
    userId = u?.data?.id;
    if (!userId) throw new Error(`Could not find @${HANDLE}`);
  }
  const q = new URLSearchParams({ max_results: "5", exclude: "replies,retweets", "tweet.fields": "created_at" });
  if (cur.id && cur.source !== "cleared") q.set("since_id", cur.id);
  const t = await api(`${API}/users/${userId}/tweets?${q}`, token);
  const post = t?.data?.[0];
  if (!post) {
    console.log("No new post.");
    if (!cur.userId) await save({ ...cur, userId });
    return;
  }
  await save({ handle: HANDLE, userId, id: post.id, url: `https://x.com/${HANDLE}/status/${post.id}`,
    text: post.text, date: post.created_at, updated: new Date().toISOString(), source: "api" });
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
