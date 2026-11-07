#!/usr/bin/env node
/* Auction House sync: pulls the whole auction house of the guild's realm (data/roster-config.json: realm, region) and
   the region-wide commodities from the Blizzard WoW Game Data API, and condenses it to one row per item: the lowest
   price, a quantity-weighted median price, how many are up and in how many listings. Item names, quality, category and
   icons are looked up once and kept between runs (a few thousand new items per run, busiest first).

   Writes into the folder given as the first argument (default ./ah-data):
     auctions.json  { updatedAt, realm, region, connectedRealmId, counts, rows: [[key, kind, min, median, qty, listings]] }
                    key = item id, or "p<species>" for battle pets; kind 0 = realm auction, 1 = commodity, 2 = pet;
                    prices in copper per single item.
     items.json     { items: { id: [name, quality, classId, subclassId, icon] }, pets: { species: [name, icon] },
                      classes: { classId: name }, subclasses: { "classId.subclassId": name } }
     status.json    { updatedAt, ok, message }
   .github/workflows/auctions.yml runs it every hour and publishes that folder as the ah-data branch (one commit,
   replaced each time, so the repository doesn't grow); auction-house.html reads it from raw.githubusercontent.com.

   By hand: BLIZZARD_CLIENT_ID=… BLIZZARD_CLIENT_SECRET=… node tools/sync_auctions.mjs ah-data
   Node 20, no packages. Never put the credentials in a file. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "ah-data"));
const CONFIG = path.join(ROOT, "data", "roster-config.json");
const MAX_NEW = Number(process.env.AH_MAX_NEW || 4000);        // new items to look up per run
const DEADLINE = Date.now() + Number(process.env.AH_MINUTES || 30) * 60000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (f, fb) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return fb; } };
const QUALITY = { POOR: 0, COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4, LEGENDARY: 5, ARTIFACT: 6, HEIRLOOM: 7 };

await mkdir(OUT, { recursive: true });
async function status(ok, message, extra) {
  await writeFile(path.join(OUT, "status.json"), JSON.stringify({ updatedAt: new Date().toISOString(), ok, message, ...extra }, null, 2) + "\n");
}

const id = process.env.BLIZZARD_CLIENT_ID, secret = process.env.BLIZZARD_CLIENT_SECRET;
if (!id || !secret) { await status(false, "BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET are not set."); console.log("No Blizzard credentials; nothing to do."); process.exit(0); }

const cfg = await readJson(CONFIG, {});
const region = (cfg.region || "us").toLowerCase(), locale = cfg.locale || "en_US";
const realmName = cfg.realm || "Moon Guard";
const slug = cfg.realmSlug || realmName.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const host = region === "cn" ? "https://gateway.battlenet.com.cn" : `https://${region}.api.blizzard.com`;
const oauth = region === "cn" ? "https://oauth.battlenet.com.cn/token" : "https://oauth.battle.net/token";

let token = null;
async function auth() {
  const res = await fetch(oauth, { method: "POST", body: "grant_type=client_credentials",
    headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" } });
  if (!res.ok) throw new Error(`Blizzard sign-in failed (${res.status}). Check the BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET secrets.`);
  token = (await res.json()).access_token;
}
async function get(p, ns, tries = 5) {
  const url = `${host}${p}${p.includes("?") ? "&" : "?"}namespace=${ns}-${region}&locale=${locale}`;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res && res.status === 401) { await auth(); continue; }
    if (res && res.status === 404) return null;
    if (res && res.ok) return res.json();
    await sleep((res && res.status === 429 ? 1500 : 400) * 2 ** i);
  }
  throw new Error(`Blizzard didn't answer ${p}.`);
}
async function getOpt(p, ns) { try { return await get(p, ns, 3); } catch { return null; } }

try {
  await auth();
  // the realm's connected realm, whose auction house we read
  const realm = await get(`/data/wow/realm/${slug}`, "dynamic");
  if (!realm) throw new Error(`Realm "${realmName}" (${slug}) wasn't found in ${region.toUpperCase()}.`);
  const crId = Number(((realm.connected_realm && realm.connected_realm.href) || "").match(/connected-realm\/(\d+)/)?.[1]);
  if (!crId) throw new Error("Couldn't find the realm's connected realm.");

  console.log(`Fetching the auction house of ${realm.name || realmName} (connected realm ${crId})…`);
  const realmAh = await get(`/data/wow/connected-realm/${crId}/auctions`, "dynamic");
  console.log(`Fetching region commodities…`);
  const comm = await get(`/data/wow/auctions/commodities`, "dynamic");

  // ---- condense: one row per item (pets per species) ----
  const groups = new Map();   // key -> { kind, prices: [[unit, qty]], qty, listings }
  function add(key, kind, unit, qty) {
    let g = groups.get(key);
    if (!g) { g = { kind, prices: [], qty: 0, listings: 0 }; groups.set(key, g); }
    g.listings++; g.qty += qty;
    if (unit > 0) g.prices.push([unit, qty]);
  }
  let nRealm = 0, nComm = 0;
  for (const a of (realmAh && realmAh.auctions) || []) {
    const it = a.item || {}, qty = a.quantity || 1;
    const unit = a.buyout ? Math.round(a.buyout / qty) : a.unit_price || 0;
    if (it.pet_species_id) add("p" + it.pet_species_id, 2, unit, qty);
    else if (it.id) add(String(it.id), 0, unit, qty);
    nRealm++;
  }
  for (const a of (comm && comm.auctions) || []) {
    const it = a.item || {};
    if (it.id) { add(String(it.id), 1, a.unit_price || 0, a.quantity || 1); nComm++; }
  }
  const rows = [];
  for (const [key, g] of groups) {
    g.prices.sort((x, y) => x[0] - y[0]);
    const min = g.prices.length ? g.prices[0][0] : 0;
    // quantity-weighted median: half of everything up costs this much or less
    let median = min, half = g.prices.reduce((s, p) => s + p[1], 0) / 2, run = 0;
    for (const [u, q] of g.prices) { run += q; if (run >= half) { median = u; break; } }
    rows.push([/^p/.test(key) ? key : Number(key), g.kind, min, median, g.qty, g.listings]);
  }
  rows.sort((a, b) => b[5] - a[5]);
  console.log(`${nRealm} realm auctions and ${nComm} commodity listings, ${rows.length} different items.`);

  // ---- item details, kept between runs ----
  const db = await readJson(path.join(OUT, "items.json"), {});
  db.items ||= {}; db.pets ||= {}; db.classes ||= {}; db.subclasses ||= {};
  const todoItems = rows.filter((r) => typeof r[0] === "number" && !db.items[r[0]]).map((r) => r[0]);
  const todoPets = rows.filter((r) => typeof r[0] === "string" && !db.pets[r[0].slice(1)]).map((r) => r[0].slice(1));
  const iconOf = (u) => (String(u || "").match(/\/([^/]+)\.(jpg|png)$/) || [])[1] || "";
  let looked = 0;
  async function lookItem(itemId) {
    const it = await getOpt(`/data/wow/item/${itemId}`, "static");
    if (!it) { db.items[itemId] = ["Item " + itemId, 1, -1, -1, ""]; return; }
    const media = await getOpt(`/data/wow/media/item/${(it.media && it.media.id) || itemId}`, "static");
    const icon = iconOf(media && media.assets && (media.assets.find((a) => a.key === "icon") || {}).value);
    const c = it.item_class || {}, s = it.item_subclass || {};
    if (c.id != null && c.name) db.classes[c.id] = c.name;
    if (c.id != null && s.id != null && s.name) db.subclasses[c.id + "." + s.id] = s.name;
    db.items[itemId] = [it.name || "Item " + itemId, QUALITY[it.quality && it.quality.type] ?? 1, c.id ?? -1, s.id ?? -1, icon];
    looked++;
  }
  async function lookPet(sp) {
    const p = await getOpt(`/data/wow/pet/${sp}`, "static");
    db.pets[sp] = [p ? p.name : "Battle Pet " + sp, iconOf(p && p.icon)];
    looked++;
  }
  const jobs = todoPets.map((sp) => () => lookPet(sp)).concat(todoItems.slice(0, MAX_NEW).map((i) => () => lookItem(i)));
  console.log(`${todoItems.length + todoPets.length} items need names; looking up ${jobs.length} now.`);
  for (let i = 0; i < jobs.length && Date.now() < DEADLINE; i += 12) {
    await Promise.all(jobs.slice(i, i + 12).map((f) => f()));
    await sleep(120);   // about 100 requests a second at most, under Blizzard's limit
  }

  const updatedAt = new Date().toISOString();
  const counts = { realmAuctions: nRealm, commodityListings: nComm, items: rows.length, named: rows.filter((r) => typeof r[0] === "number" ? db.items[r[0]] : db.pets[r[0].slice(1)]).length };
  await writeFile(path.join(OUT, "auctions.json"), JSON.stringify({ updatedAt, realm: realm.name || realmName, region, connectedRealmId: crId, counts, rows }));
  await writeFile(path.join(OUT, "items.json"), JSON.stringify({ updatedAt, items: db.items, pets: db.pets, classes: db.classes, subclasses: db.subclasses }));
  await writeFile(path.join(OUT, "README.md"), "Auction house data for the Cult of Xal'Reth website (auction-house.html), written every hour by\n" +
    ".github/workflows/auctions.yml (tools/sync_auctions.mjs). This branch is replaced each hour; don't edit it.\n");
  await status(true, `${counts.items} items (${nRealm} realm auctions, ${nComm} commodity listings); looked up ${looked} new names.`, { counts });
  console.log(`Done: ${counts.items} items, ${counts.named} named.`);
} catch (e) {
  console.error(e.message || e);
  await status(false, String(e.message || e));
  process.exitCode = 1;
}
