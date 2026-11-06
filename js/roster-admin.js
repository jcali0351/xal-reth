/* ==========================================================
   ROSTER SETTINGS (roster-admin.html)
   Talks to the GitHub API with the admin's own token:
   - data/roster-config.json  (guild, realm, region, frequency, ranks)
   - Actions secrets BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET (sealed-box encrypted here)
   - workflow_dispatch of roster-sync.yml (manual sync, connection test)
   The token is kept in sessionStorage only.
   ========================================================== */
(function () {
  "use strict";
  const REPO = "jcali0351/xal-reth", BRANCH = "main", WORKFLOW = "roster-sync.yml", CONFIG = "data/roster-config.json";
  const SODIUM = "https://cdn.jsdelivr.net/npm/libsodium-wrappers@0.7.15/+esm";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const when = (t) => (t ? new Date(t).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—");
  const say = (sel, text, kind) => { const p = $(sel); p.textContent = text; p.className = "msg" + (kind ? " " + kind : ""); };

  let token = null, configSha = null;
  const store = {
    get() { try { return sessionStorage.getItem("xr-gh-token"); } catch { return null; } },
    set(v) { try { v ? sessionStorage.setItem("xr-gh-token", v) : sessionStorage.removeItem("xr-gh-token"); } catch { /* private mode */ } },
  };

  async function gh(path, opts = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${token}`, ...(opts.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (res.status === 204) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const hint = res.status === 401 ? "The token was refused." : res.status === 403 || res.status === 404 ? "The token lacks a permission for this (check Contents, Actions and Secrets)." : "";
      throw new Error(`${body.message || "GitHub error " + res.status}. ${hint}`.trim());
    }
    return body;
  }
  const b64encode = (s) => { const bytes = new TextEncoder().encode(s); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); };
  const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  // ---------- status (public file first, then live from the API) ----------
  function showStatus(s) {
    if (!s) return;
    $('[data-s="success"]').textContent = when(s.lastSuccessAt);
    $('[data-s="attempt"]').textContent = s.lastAttemptAt ? `${when(s.lastAttemptAt)} (${s.mode || "scheduled"})` : "—";
    $('[data-s="message"]').innerHTML = s.ok == null ? esc(s.message || "—") : `<span class="pill ${s.ok ? "success" : "failure"}">${s.ok ? "OK" : "Failed"}</span> ${esc(s.message || "")}`;
    $('[data-s="members"]').textContent = s.members != null ? `${s.members} on the roster, ${s.requests ?? "?"} API requests, ${Math.round((s.durationMs || 0) / 1000)}s` : "—";
  }
  fetch("data/sync-status.json", { cache: "no-cache" }).then((r) => r.json()).then(showStatus).catch(() => {});

  async function refreshLive() {
    try {
      const f = await gh(`/repos/${REPO}/contents/data/sync-status.json?ref=${BRANCH}`);
      showStatus(JSON.parse(b64decode(f.content)));
    } catch { /* not committed yet */ }
    try {
      const s = await gh(`/repos/${REPO}/actions/secrets`);
      const names = Object.fromEntries(s.secrets.map((x) => [x.name, x.updated_at]));
      const id = names.BLIZZARD_CLIENT_ID, sec = names.BLIZZARD_CLIENT_SECRET;
      $('[data-s="secrets"]').innerHTML = id && sec ? `<span class="pill success">Set</span> updated ${esc(when(sec > id ? sec : id))}` : `<span class="pill failure">Missing</span> add them in step 3`;
    } catch (e) { $('[data-s="secrets"]').textContent = e.message; }
    await listRuns();
  }

  async function listRuns() {
    try {
      const r = await gh(`/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=5`);
      $("[data-runs]").innerHTML = r.workflow_runs.map((run) => {
        const st = run.status !== "completed" ? "running" : run.conclusion === "success" ? "success" : "failure";
        const label = run.status !== "completed" ? run.status.replace("_", " ") : run.conclusion;
        return `<li><a href="${esc(run.html_url)}" target="_blank" rel="noopener">${esc(run.display_title)}</a><span>${esc(when(run.created_at))} <span class="pill ${st}">${esc(label)}</span></span></li>`;
      }).join("") || "<li>No runs yet.</li>";
      return r.workflow_runs;
    } catch (e) {
      $("[data-runs]").innerHTML = `<li>${esc(e.message.includes("Not Found") ? "The roster-sync workflow is not in the repository yet. Commit .github/workflows/roster-sync.yml first." : e.message)}</li>`;
      return [];
    }
  }

  // ---------- connect ----------
  async function connect(t) {
    token = t;
    say("[data-connect-msg]", "Connecting…");
    try {
      const repo = await gh(`/repos/${REPO}`);
      if (!repo.permissions?.push) throw new Error("This token cannot write to the repository.");
      store.set(t);
      say("[data-connect-msg]", `Connected to ${repo.full_name}.`, "ok");
      $$("[data-needs-token]").forEach((p) => p.classList.remove("locked"));
      $("[data-sync]").disabled = $("[data-test]").disabled = false;
      $("[data-forget]").hidden = false;
      $('[data-connect] [name="token"]').value = "";
      await loadConfig();
      await refreshLive();
    } catch (e) {
      token = null; store.set(null);
      say("[data-connect-msg]", e.message, "err");
    }
  }
  $("[data-connect-btn]").addEventListener("click", () => { const v = $('[data-connect] [name="token"]').value.trim(); if (v) connect(v); });
  $("[data-connect]").addEventListener("submit", (e) => { e.preventDefault(); $("[data-connect-btn]").click(); });
  $("[data-forget]").addEventListener("click", () => { store.set(null); location.reload(); });

  // ---------- guild config ----------
  const rankBox = $("[data-ranks]");
  rankBox.innerHTML = Array.from({ length: 10 }, (_, i) => `<label><span>Rank ${i}</span><input name="rank${i}" placeholder="${i === 0 ? "Guild Master" : "Rank " + i}"></label>`).join("");
  const cf = $("[data-config]");

  async function loadConfig() {
    try {
      const f = await gh(`/repos/${REPO}/contents/${CONFIG}?ref=${BRANCH}`);
      configSha = f.sha;
      const c = JSON.parse(b64decode(f.content));
      for (const k of ["guildName", "realm", "realmSlug", "region", "minLevel"]) if (c[k] != null) cf[k].value = c[k];
      cf.syncEveryMinutes.value = String(c.syncEveryMinutes || 60);
      for (let i = 0; i < 10; i++) cf["rank" + i].value = c.rankNames?.[i] || "";
      cf.hiddenCharacters.value = (c.hiddenCharacters || []).join("\n");
    } catch (e) {
      configSha = null;
      say("[data-config-msg]", e.message.includes("Not Found") ? "No settings saved yet. Fill them in and save." : e.message, e.message.includes("Not Found") ? "" : "err");
    }
  }

  $("[data-save-config]").addEventListener("click", async () => {
    if (!cf.reportValidity()) return;
    const rankNames = {};
    for (let i = 0; i < 10; i++) { const v = cf["rank" + i].value.trim(); if (v) rankNames[i] = v; }
    const cfg = {
      guildName: cf.guildName.value.trim(), realm: cf.realm.value.trim(), realmSlug: cf.realmSlug.value.trim().toLowerCase(),
      region: cf.region.value, locale: { us: "en_US", eu: "en_GB", kr: "ko_KR", tw: "zh_TW" }[cf.region.value] || "en_US",
      syncEveryMinutes: Number(cf.syncEveryMinutes.value), minLevel: Math.max(1, Number(cf.minLevel.value) || 1),
      rankNames, hiddenCharacters: cf.hiddenCharacters.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    };
    say("[data-config-msg]", "Saving…");
    try {
      const r = await gh(`/repos/${REPO}/contents/${CONFIG}`, { method: "PUT", body: JSON.stringify({
        message: `Roster settings: ${cfg.guildName} on ${cfg.realm} (${cfg.region.toUpperCase()})`, branch: BRANCH,
        content: b64encode(JSON.stringify(cfg, null, 2) + "\n"), ...(configSha ? { sha: configSha } : {}) }) });
      configSha = r.content.sha;
      say("[data-config-msg]", "Saved. Run “Test connection” to check the guild is found.", "ok");
    } catch (e) {
      say("[data-config-msg]", e.message.includes("does not match") ? "The settings changed elsewhere. Reload the page and try again." : e.message, "err");
    }
  });

  // ---------- Blizzard secrets ----------
  $("[data-save-secrets]").addEventListener("click", async () => {
    const sf = $("[data-secrets]"), id = sf.id.value.trim(), secret = sf.secret.value.trim();
    if (!id && !secret) { say("[data-secrets-msg]", "Nothing to save: both fields are empty."); return; }
    if (!id || !secret) { say("[data-secrets-msg]", "Enter both the Client ID and the Secret.", "err"); return; }
    say("[data-secrets-msg]", "Encrypting…");
    try {
      const sodium = (await import(SODIUM)).default; await sodium.ready;
      const key = await gh(`/repos/${REPO}/actions/secrets/public-key`);
      const pk = sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL);
      const seal = (v) => sodium.to_base64(sodium.crypto_box_seal(sodium.from_string(v), pk), sodium.base64_variants.ORIGINAL);
      for (const [name, value] of [["BLIZZARD_CLIENT_ID", id], ["BLIZZARD_CLIENT_SECRET", secret]]) {
        await gh(`/repos/${REPO}/actions/secrets/${name}`, { method: "PUT", body: JSON.stringify({ encrypted_value: seal(value), key_id: key.key_id }) });
      }
      sf.reset();
      say("[data-secrets-msg]", "Credentials saved as repository secrets. Run “Test connection” to check them.", "ok");
      refreshLive();
    } catch (e) { say("[data-secrets-msg]", e.message, "err"); }
  });

  // ---------- manual sync / test ----------
  let polling = null;
  async function dispatch(mode) {
    clearInterval(polling);
    const started = Date.now() - 5000;
    $("[data-sync]").disabled = $("[data-test]").disabled = true;
    say("[data-run-msg]", mode === "test" ? "Starting the connection test…" : "Starting a sync…");
    try {
      await gh(`/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, { method: "POST", body: JSON.stringify({ ref: BRANCH, inputs: { mode } }) });
    } catch (e) { say("[data-run-msg]", e.message, "err"); $("[data-sync]").disabled = $("[data-test]").disabled = false; return; }
    let n = 0;
    polling = setInterval(async () => {
      n++;
      const runs = await listRuns();
      const run = runs.find((r) => r.event === "workflow_dispatch" && Date.parse(r.created_at) >= started);
      if (run && run.status === "completed") {
        clearInterval(polling);
        $("[data-sync]").disabled = $("[data-test]").disabled = false;
        const ok = run.conclusion === "success";
        say("[data-run-msg]", ok ? (mode === "test" ? "Connection works: Blizzard answered and the guild was found. Details are in the run summary." : "Sync finished. The roster page updates within a few minutes, once GitHub Pages redeploys.")
          : `The ${mode === "test" ? "test" : "sync"} failed. Open the run above for the reason.`, ok ? "ok" : "err");
        refreshLive();
      } else if (run) say("[data-run-msg]", `Running (${run.status.replace("_", " ")})…`);
      if (n > 60) { clearInterval(polling); $("[data-sync]").disabled = $("[data-test]").disabled = false; say("[data-run-msg]", "Still running. Check the Actions tab."); }
    }, 5000);
  }
  $("[data-sync]").addEventListener("click", () => dispatch("sync"));
  $("[data-test]").addEventListener("click", () => dispatch("test"));

  const saved = store.get();
  if (saved) connect(saved);
})();
