#!/usr/bin/env node
/**
 * Guild Roster sync: pulls the guild roster from the Blizzard World of Warcraft API and writes
 *   data/roster.json        what guild-roster.html shows (rewritten only when the roster actually changed)
 *   data/sync-status.json   last attempt / last success, shown on the roster and admin pages
 *   data/roster-cache.json  Last-Modified stamps per character, so unchanged characters cost a 304
 *
 * Runs hourly in GitHub Actions (.github/workflows/roster-sync.yml). Needs Node 20+ and no packages.
 *
 *   BLIZZARD_CLIENT_ID=... BLIZZARD_CLIENT_SECRET=... node tools/sync_roster.mjs [--force] [--test]
 *
 *   --force  ignore syncEveryMinutes (manual sync from the admin page)
 *   --test   only check credentials, realm and guild; writes nothing
 *
 * Settings live in data/roster-config.json (edited from roster-admin.html).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA = path.join(ROOT, "data");
const FILES = {
  config: path.join(DATA, "roster-config.json"),
  roster: path.join(DATA, "roster.json"),
  status: path.join(DATA, "sync-status.json"),
  cache: path.join(DATA, "roster-cache.json"),
};
const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const TEST = args.has("--test");

// ---------- small helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const readJson = async (f, fallback) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return fallback; } };
const slugify = (s) => String(s || "").trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const charKey = (realmSlug, name) => `${realmSlug}/${name.toLowerCase()}`;
const DAY = 24 * 3600 * 1000;

/** One member per line: readable, and git stores the hourly changes as small deltas. */
function stringifyRoster(obj) {
  const { members, ...rest } = obj;
  const head = JSON.stringify(rest, null, 2).replace(/\n}$/, "");
  return `${head},\n  "members": [\n${members.map((m) => "    " + JSON.stringify(m)).join(",\n")}\n  ]\n}\n`;
}
async function writeJson(f, obj, pretty = true) {
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, pretty ? JSON.stringify(obj, null, 2) + "\n" : JSON.stringify(obj) + "\n");
}

// Specialization id -> role. Everything not listed is DPS (Augmentation included).
const TANK = new Set([73, 66, 250, 104, 268, 581]);
const HEALER = new Set([65, 256, 257, 264, 105, 270, 1468]);
const roleOf = (specId) => (TANK.has(specId) ? "Tank" : HEALER.has(specId) ? "Healer" : specId ? "DPS" : null);

// ---------- Blizzard API client: OAuth, rate limiting, retries ----------
class Blizzard {
  constructor({ id, secret, region, locale }) {
    Object.assign(this, { id, secret, region, locale });
    this.host = region === "cn" ? "https://gateway.battlenet.com.cn" : `https://${region}.api.blizzard.com`;
    this.oauth = region === "cn" ? "https://oauth.battlenet.com.cn/token" : "https://oauth.battle.net/token";
    this.token = null; this.tokenExp = 0;
    this.requests = 0;
    // Blizzard allows 100 req/s and 36,000 req/h per client. Stay well under both.
    this.perSecond = 20; this.stamps = [];
  }
  async auth(force = false) {
    if (!force && this.token && Date.now() < this.tokenExp - 60_000) return this.token;
    const res = await this.retry(() => fetch(this.oauth, {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${this.id}:${this.secret}`).toString("base64"),
                 "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    }), "oauth");
    if (!res.ok) throw new Error(`Blizzard sign-in failed (${res.status}). Check the Client ID and Secret.`);
    const j = await res.json();
    this.token = j.access_token; this.tokenExp = Date.now() + j.expires_in * 1000;
    return this.token;
  }
  async throttle() {
    for (;;) {
      const now = Date.now();
      this.stamps = this.stamps.filter((t) => now - t < 1000);
      if (this.stamps.length < this.perSecond) { this.stamps.push(now); return; }
      await sleep(1000 - (now - this.stamps[0]) + 5);
    }
  }
  /** Retries network errors, 429 and 5xx with exponential backoff (honours Retry-After). */
  async retry(doFetch, label, tries = 5) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      await this.throttle();
      this.requests++;
      try {
        const res = await doFetch();
        if (res.status !== 429 && res.status < 500) return res;
        const ra = Number(res.headers.get("retry-after"));
        lastErr = new Error(`${label}: HTTP ${res.status}`);
        await sleep(ra > 0 ? ra * 1000 : 500 * 2 ** i + Math.random() * 300);
      } catch (e) {
        lastErr = e;
        await sleep(500 * 2 ** i + Math.random() * 300);
      }
    }
    throw lastErr;
  }
  /** GET a Game Data / Profile API path. Returns { status, data, lastModified }. 404 and 304 are not errors. */
  async get(p, namespace, { ifModifiedSince } = {}) {
    const url = `${this.host}${p}${p.includes("?") ? "&" : "?"}namespace=${namespace}-${this.region}&locale=${this.locale}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.auth(attempt > 0);
      const headers = { Authorization: `Bearer ${token}` };
      if (ifModifiedSince) headers["If-Modified-Since"] = ifModifiedSince;
      const res = await this.retry(() => fetch(url, { headers }), p);
      if (res.status === 401 && attempt === 0) continue; // token expired mid-run: sign in again once
      const lastModified = res.headers.get("last-modified");
      if (res.status === 304) return { status: 304, data: null, lastModified };
      if (res.status === 404 || res.status === 403) return { status: res.status, data: null, lastModified };
      if (!res.ok) throw new Error(`${p}: HTTP ${res.status}`);
      return { status: 200, data: await res.json(), lastModified };
    }
    throw new Error(`${p}: unauthorized`);
  }
}

/** Runs fn over items with at most `limit` in flight. */
async function pool(items, limit, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

// ---------- sync ----------
async function resolveRealmSlug(api, cfg) {
  if (cfg.realmSlug) return cfg.realmSlug;
  const want = cfg.realm.trim().toLowerCase();
  const idx = await api.get("/data/wow/realm/index", "dynamic");
  const hit = idx.data?.realms?.find((r) => r.name.toLowerCase() === want || r.slug === slugify(cfg.realm));
  if (!hit) throw new Error(`Realm "${cfg.realm}" was not found in region ${cfg.region.toUpperCase()}. Check the realm and region.`);
  return hit.slug;
}

async function fetchCharacter(api, member, prev, cacheEntry, refreshCollections) {
  const realmSlug = member.character.realm.slug;
  const name = member.character.name;
  const base = `/profile/wow/character/${realmSlug}/${encodeURIComponent(name.toLowerCase())}`;
  const p = await api.get(base, "profile", { ifModifiedSince: prev && cacheEntry?.lm ? cacheEntry.lm : undefined });

  if (p.status === 304 && prev && !refreshCollections) return { m: { ...prev, rank: member.rank }, lm: cacheEntry.lm, full: cacheEntry.full, state: "unchanged" };
  if (p.status === 404 || p.status === 403) return { m: null, state: "unavailable" };

  let profile = p.data;
  if (p.status === 304) { // collections are due but the profile itself didn't change: refetch it in full
    const again = await api.get(base, "profile");
    if (!again.data) return { m: null, state: "unavailable" };
    profile = again.data; p.lastModified = again.lastModified;
  }
  const [media, mounts, pets, ach] = await Promise.all([
    api.get(`${base}/character-media`, "profile"),
    api.get(`${base}/collections/mounts`, "profile"),
    api.get(`${base}/collections/pets`, "profile"),
    api.get(`${base}/achievements`, "profile"),
  ]);
  const asset = (k) => media.data?.assets?.find((a) => a.key === k)?.value || null;
  const specId = profile.active_spec?.id || null;
  return {
    state: "fetched", lm: p.lastModified, full: Date.now(),
    m: {
      id: profile.id,
      name: profile.name,
      realm: profile.realm?.name || member.character.realm.slug,
      realmSlug,
      level: profile.level,
      classId: profile.character_class?.id || member.character.playable_class?.id || null,
      class: profile.character_class?.name || null,
      race: profile.race?.name || null,
      spec: profile.active_spec?.name || null,
      specId,
      role: roleOf(specId),
      faction: profile.faction?.name || null,
      gender: profile.gender?.name || null,
      rank: member.rank,
      title: profile.active_title?.display_string ? profile.active_title.display_string.replace("{name}", profile.name) : null,
      ilvl: profile.equipped_item_level || null,
      avgIlvl: profile.average_item_level || null,
      achievementPoints: profile.achievement_points ?? null,
      lastLogin: profile.last_login_timestamp || null,
      mounts: mounts.data?.mounts?.length ?? null,
      pets: pets.data?.pets?.length ?? null,
      recent: (ach.data?.recent_events || []).slice(0, 5).map((e) => ({ name: e.achievement?.name, ts: e.timestamp })),
      // The API no longer lists "inset", but the render server still has it beside the avatar
      media: { avatar: asset("avatar"), inset: asset("inset") || asset("avatar")?.replace(/-avatar\.jpg(\?.*)?$/, "-inset.jpg") || null, main: asset("main-raw") || asset("main") },
      available: true,
      updatedAt: new Date().toISOString(),
    },
  };
}

function buildStats(members) {
  const withIlvl = members.filter((m) => m.ilvl > 0);
  const withAp = members.filter((m) => m.achievementPoints > 0);
  const avg = (arr, k) => (arr.length ? Math.round(arr.reduce((s, m) => s + m[k], 0) / arr.length) : null);
  const top = (arr, k) => { const m = arr.reduce((a, b) => (b[k] > (a?.[k] ?? -1) ? b : a), null); return m ? { name: m.name, realmSlug: m.realmSlug, classId: m.classId, value: m[k] } : null; };
  const classes = [...new Set(members.map((m) => m.class).filter(Boolean))].sort();
  return {
    totalMembers: members.length,
    averageItemLevel: avg(withIlvl, "ilvl"),
    averageAchievementPoints: avg(withAp, "achievementPoints"),
    classesRepresented: classes.length,
    classes,
    highestAchievement: top(withAp, "achievementPoints"),
    highestItemLevel: top(withIlvl, "ilvl"),
  };
}

async function main() {
  const started = Date.now();
  const cfg = { region: "us", locale: "en_US", syncEveryMinutes: 60, minLevel: 1, rankNames: {}, hiddenCharacters: [], ...(await readJson(FILES.config, {})) };
  const prevStatus = await readJson(FILES.status, {});
  const status = { ...prevStatus, lastAttemptAt: new Date().toISOString(), mode: TEST ? "test" : FORCE ? "manual" : "scheduled" };

  const finish = async (ok, message, extra = {}) => {
    Object.assign(status, { ok, message, durationMs: Date.now() - started, ...extra });
    if (ok && !TEST) status.lastSuccessAt = status.lastAttemptAt;
    log(ok ? "OK:" : "FAILED:", message);
    if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `### Guild roster ${TEST ? "connection test" : "sync"}: ${ok ? "✅" : "❌"}\n\n${message}\n`, { flag: "a" });
    if (!TEST) await writeJson(FILES.status, status); // a test never writes files
    if (!ok) process.exitCode = 1;
  };

  try {
    const id = process.env.BLIZZARD_CLIENT_ID, secret = process.env.BLIZZARD_CLIENT_SECRET;
    // Until setup is finished, hourly runs just skip (no failed-run emails every hour)
    if (!TEST && !FORCE && (!id || !secret || !cfg.guildName || !cfg.realm)) { log("Roster sync is not set up yet (secrets or guild/realm missing). Skipping."); return; }
    if (!id || !secret) throw new Error("BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET are not set. Add them as repository secrets (roster-admin.html can do it).");
    if (!cfg.guildName || !cfg.realm) throw new Error("Guild name and realm are not configured yet. Set them on roster-admin.html.");

    if (!TEST && !FORCE && prevStatus.lastSuccessAt) {
      const ageMin = (Date.now() - Date.parse(prevStatus.lastSuccessAt)) / 60000;
      if (ageMin < cfg.syncEveryMinutes - 5) { log(`Not due: last sync ${Math.round(ageMin)} min ago, every ${cfg.syncEveryMinutes} min.`); return; }
    }

    const api = new Blizzard({ id, secret, region: cfg.region, locale: cfg.locale });
    await api.auth();
    const realmSlug = await resolveRealmSlug(api, cfg);
    const guildSlug = slugify(cfg.guildName);
    const gPath = `/data/wow/guild/${realmSlug}/${guildSlug}`;
    const [guild, roster] = await Promise.all([api.get(gPath, "profile"), api.get(`${gPath}/roster`, "profile")]);
    if (!guild.data || !roster.data) throw new Error(`Guild "${cfg.guildName}" was not found on ${realmSlug} (${cfg.region.toUpperCase()}). Check the spelling and realm.`);

    if (TEST) {
      return await finish(true, `Connected. Found **${guild.data.name}** on ${guild.data.realm?.name} (${guild.data.faction?.name}), ${roster.data.members.length} members.`);
    }

    // Class and race names for characters whose profiles are private or stale
    const [classIdx, raceIdx] = await Promise.all([api.get("/data/wow/playable-class/index", "static"), api.get("/data/wow/playable-race/index", "static")]);
    const className = Object.fromEntries((classIdx.data?.classes || []).map((c) => [c.id, c.name]));
    const raceName = Object.fromEntries((raceIdx.data?.races || []).map((r) => [r.id, r.name]));

    const prevRoster = await readJson(FILES.roster, { members: [] });
    const prevByKey = new Map(prevRoster.members.map((m) => [charKey(m.realmSlug, m.name), m]));
    const cache = await readJson(FILES.cache, { members: {} });
    const hidden = new Set((cfg.hiddenCharacters || []).map((s) => s.toLowerCase()));

    const list = roster.data.members.filter((mm) => mm.character.level >= (cfg.minLevel || 1) && !hidden.has(mm.character.name.toLowerCase()));
    log(`Roster: ${list.length} characters (${roster.data.members.length} in guild). Fetching profiles...`);
    const counts = { fetched: 0, unchanged: 0, unavailable: 0, failed: 0 };
    const newCache = { members: {} };

    const members = await pool(list, 8, async (mm) => {
      const key = charKey(mm.character.realm.slug, mm.character.name);
      const prev = prevByKey.get(key);
      const ce = cache.members[key];
      const refreshCollections = !ce?.full || Date.now() - ce.full > DAY; // media, mounts, pets, achievements: daily
      let r;
      try { r = await fetchCharacter(api, mm, prev?.available ? prev : null, ce, refreshCollections); }
      catch (e) { counts.failed++; log(`  ! ${key}: ${e.message}`); r = { m: prev || null, state: "failed" }; }
      if (r.state !== "failed") counts[r.state]++;
      if (r.lm) newCache.members[key] = { lm: r.lm, full: r.full };
      if (r.m) return { ...r.m, rank: mm.rank };
      // Profile not available (private, inactive or transferred): keep what the roster itself says
      return {
        id: mm.character.id, name: mm.character.name,
        realm: (prev?.realm !== mm.character.realm.slug && prev?.realm) || (mm.character.realm.slug === realmSlug && guild.data.realm?.name) || mm.character.realm.slug, realmSlug: mm.character.realm.slug,
        level: mm.character.level, classId: mm.character.playable_class?.id || null, class: className[mm.character.playable_class?.id] || null,
        race: raceName[mm.character.playable_race?.id] || null, spec: null, specId: null, role: null,
        faction: guild.data.faction?.name || null, rank: mm.rank, title: null, ilvl: null, avgIlvl: null, achievementPoints: null,
        lastLogin: null, mounts: null, pets: null, recent: [], media: { avatar: null, inset: null, main: null }, available: false,
        updatedAt: prev?.updatedAt || new Date().toISOString(),
      };
    });

    if (counts.failed > list.length / 2) throw new Error(`${counts.failed} of ${list.length} character requests failed; kept the previous roster.`);

    members.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
    const rankNames = {};
    for (const r of new Set(members.map((m) => m.rank))) rankNames[r] = cfg.rankNames?.[r] || (r === 0 ? "Guild Master" : `Rank ${r}`);
    const body = {
      guild: { name: guild.data.name, realm: guild.data.realm?.name, realmSlug, region: cfg.region, faction: guild.data.faction?.name || null,
               memberCount: roster.data.members.length, achievementPoints: guild.data.achievement_points ?? null, created: guild.data.created_timestamp || null },
      rankNames,
      stats: buildStats(members),
      members,
    };
    const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);
    const changed = hash !== prevRoster.hash;
    if (changed) await writeFile(FILES.roster, stringifyRoster({ version: 1, hash, dataChangedAt: new Date().toISOString(), ...body }));
    await writeJson(FILES.cache, newCache, false);

    await finish(true, `${members.length} characters: ${counts.fetched} refreshed, ${counts.unchanged} unchanged, ${counts.unavailable} private or inactive, ${counts.failed} failed. ${api.requests} API requests. Roster ${changed ? "updated" : "unchanged"}.`,
      { members: members.length, ...counts, requests: api.requests, rosterChanged: changed });
  } catch (e) {
    await finish(false, e.message || String(e));
  }
}

main();
