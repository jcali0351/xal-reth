# The Faces of the Coil: the social Worker

The Faces of the Coil (rp.html and every character page) let members sign in with Battle.net and post, set a status,
react, comment, form bonds and share pictures as their own characters. The website is static, so this small Cloudflare
Worker does the server's part: it signs members in, keeps the posts in a D1 database and the pictures in KV, and answers
the Sanctum Editor's Faces tab for officers.

Nothing in this folder holds a key. Never put one in a file.

## What it costs

The Cloudflare free plan: 100,000 requests a day, D1 (5 GB, 5 million reads and 100,000 writes a day), KV (1 GB). A
guild uses a tiny fraction of that. Battle.net sign-in uses the guild's existing Blizzard API client.

## 1. The Blizzard side (one setting)

At https://develop.battle.net/access/clients open the guild's API client (the one whose ID and secret are already the
repository secrets BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET) and add a **Redirect URL**:
`https://xalreth-social.YOURNAME.workers.dev/auth/callback` (the Worker's address from step 2, plus `/auth/callback`).
Save. Nothing else changes for the roster or auction syncs.

## 2. The Worker (Cloudflare dashboard, about 15 minutes)

1. https://dash.cloudflare.com > **Workers & Pages** > Create > Create Worker. Name it `xalreth-social`, Deploy.
2. **Edit code**: replace everything with all of `worker.js` from this folder. Deploy.
3. **Storage & Databases > D1** > Create database `xalreth-social`. Open it > **Console**, paste all of `schema.sql`, Execute.
4. **Storage & Databases > KV** > Create namespace `xalreth-social-pics`.
5. Back in the Worker: Settings > **Bindings** > Add:
   - D1 database, variable name **DB**, the `xalreth-social` database
   - KV namespace, variable name **PICS**, the `xalreth-social-pics` namespace
6. Settings > **Variables and Secrets** > Add (type **Secret** for all three):
   - `BNET_CLIENT_ID`: the Blizzard client ID (the same one as the repository secret)
   - `BNET_CLIENT_SECRET`: the Blizzard client secret
   - `SESSION_SECRET`: a long random string you make up (40+ characters). Changing it later signs everyone out.
   Never add a variable called `DEV`: that is for local testing only.
7. Copy the Worker's address, like `https://xalreth-social.yourname.workers.dev`.

## 3. Connect the website

- Put the address in `js/faces-social.js` (`var ENDPOINT = "https://…";`) and commit, or tell Claude the address.
  The Faces open the moment that is live.
- In the Sanctum Editor, **Faces** tab: paste the same address and press Save. Pictures waiting for approval and
  reports appear there.

## How it keeps people safe

- Only characters on the guild roster (data/roster.json) can be claimed, and only by the Battle.net account that owns
  them. Battle.net accounts and BattleTags are never shown or stored beyond an internal account number.
- Posts and comments appear at once; anyone can report one; officers hide it, pause a member's posting (every
  character on their account), or show it again. Members can remove their own words, and anything left on their wall.
- Pictures are shrunk in the browser, checked to be real images, and stay invisible to everyone else until an officer
  approves them. Rejected pictures are deleted.
- Limits per character: 20 posts an hour, 60 comments an hour, 12 pictures a day.
- All text is stored and shown as plain text: no HTML, no scripts.

## Testing locally (what Claude did)

With Node.js and `wrangler` installed outside the repository, a `wrangler.toml` that points `main` at this `worker.js`,
binds a local D1 `DB` and KV `PICS`, and sets `DEV = "1"`, `SITE = "http://127.0.0.1:8765/"` and a local
`SESSION_SECRET` in `.dev.vars`: `wrangler d1 execute xalreth-social --local --file=schema.sql`, then `wrangler dev`.
`/auth/dev?user=1&chars=moon-guard/name` signs in without Battle.net, and the officer token
`dev-officer-token-local-only` works, only while DEV is "1". Open the site with `?social=http://127.0.0.1:8787`.

## The Xal'Reth Casino (casino.html)

The same Worker runs the casino: `/casino/state` (anyone), `/casino/spin` and `/casino/redeem` (signed-in members) and
`/mod/casino`, `/mod/casino/ticket` (officers, from the Sanctum Editor's Casino tab). Spins are rolled here with
crypto randomness, one per Battle.net account per UTC day, guild characters only. Winnings are Xal Tokens; members trade
100 or more for a ticket and officers fulfil tickets by hand. No money, no buying spins. The tables are the `casino_*`
ones at the end of schema.sql; on a new database run the whole file. Paytable and jackpot are the constants at the top of
the casino section in worker.js (keep PAYS in js/casino.js the same).
