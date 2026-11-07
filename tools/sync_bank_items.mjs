#!/usr/bin/env node
/* Guild Bank item details: fills data/item-cache.json with the icon (and, if missing, the name and quality) of every
   item in data/guild-bank.json, from the Blizzard WoW Game Data API. The bank itself comes from the Coil Ledger addon
   (Blizzard's API has no guild bank), uploaded in the Sanctum Editor; this only adds the pictures.

   Run by .github/workflows/bank-items.yml after data/guild-bank.json changes, or by hand:
     BLIZZARD_CLIENT_ID=… BLIZZARD_CLIENT_SECRET=… node tools/sync_bank_items.mjs
   Node 20, no packages. Never put the credentials in a file. Never hand-edit data/item-cache.json. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BANK = path.join(ROOT, "data", "guild-bank.json");
const CACHE = path.join(ROOT, "data", "item-cache.json");
const CONFIG = path.join(ROOT, "data", "roster-config.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (f, fb) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return fb; } };

const id = process.env.BLIZZARD_CLIENT_ID, secret = process.env.BLIZZARD_CLIENT_SECRET;
if (!id || !secret) { console.log("BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET are not set; nothing to do."); process.exit(0); }

const cfg = await readJson(CONFIG, {});
const region = (cfg.region || "us").toLowerCase(), locale = cfg.locale || "en_US";
const host = region === "cn" ? "https://gateway.battlenet.com.cn" : `https://${region}.api.blizzard.com`;
const oauth = region === "cn" ? "https://oauth.battlenet.com.cn/token" : "https://oauth.battle.net/token";

let token = null;
async function auth() {
  const res = await fetch(oauth, { method: "POST", body: "grant_type=client_credentials",
    headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" } });
  if (!res.ok) throw new Error(`Blizzard sign-in failed (${res.status}).`);
  token = (await res.json()).access_token;
}
async function get(p) {
  const url = `${host}${p}?namespace=static-${region}&locale=${locale}`;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res && res.status === 401) { await auth(); continue; }
    if (res && (res.status === 404 || res.status === 403)) return null;
    if (res && res.ok) return res.json();
    await sleep(400 * 2 ** i);
  }
  return null;
}

const bank = await readJson(BANK, null);
if (!bank) { console.log("No data/guild-bank.json yet."); process.exit(0); }
const cache = await readJson(CACHE, { items: {} });
cache.items ||= {};

const ids = new Set();
for (const t of bank.tabs || []) for (const s of t.slots || []) if (s.id) ids.add(s.id);
for (const e of bank.ledger || []) if (e.id) ids.add(e.id);
const todo = [...ids].filter((i) => !cache.items[i] || !cache.items[i].icon);
console.log(`${ids.size} items in the bank and ledger, ${todo.length} need details.`);
if (!todo.length) process.exit(0);

await auth();
let done = 0;
const names = new Map();
for (const t of bank.tabs || []) for (const s of t.slots || []) if (s.id && s.name) names.set(s.id, s);
for (const e of bank.ledger || []) if (e.id && e.item && !names.has(e.id)) names.set(e.id, { name: e.item, quality: e.quality });
const QUALITY = { POOR: 0, COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4, LEGENDARY: 5, ARTIFACT: 6, HEIRLOOM: 7 };

async function one(itemId) {
  const media = await get(`/data/wow/media/item/${itemId}`);
  const icon = media?.assets?.find((a) => a.key === "icon")?.value || null;
  const entry = { ...(cache.items[itemId] || {}), icon };
  const known = names.get(itemId);
  if (known?.name) { entry.name = known.name; if (known.quality != null) entry.quality = known.quality; }
  else {
    const item = await get(`/data/wow/item/${itemId}`);
    if (item) { entry.name = item.name; entry.quality = QUALITY[item.quality?.type] ?? null; }
  }
  cache.items[itemId] = entry; done++;
}
// a few at a time, well under Blizzard's limits
for (let i = 0; i < todo.length; i += 8) {
  await Promise.all(todo.slice(i, i + 8).map(one));
  await sleep(150);
}
cache.updatedAt = new Date().toISOString();
const sorted = Object.fromEntries(Object.entries(cache.items).sort((a, b) => Number(a[0]) - Number(b[0])));
await writeFile(CACHE, `{\n  "updatedAt": ${JSON.stringify(cache.updatedAt)},\n  "items": {\n${Object.entries(sorted).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n  }\n}\n`);
console.log(`Fetched details for ${done} items.`);
