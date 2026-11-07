# Sanctum Editor: Analytics and X tools (plan for approval)

Written 2026-11-07. Nothing in this plan is built, signed up for or added to the site until John approves it.

> This file is public (GitHub Pages serves the repository). It holds no keys, tokens or addresses, and none may be added.
> Running costs are given in the conversation, not here: X's prices change often, so check the X Developer Console.

## Why this needs something beyond GitHub Pages

The site is static. GitHub Pages cannot count visits, and the Sanctum Editor runs only in John's browser with his
GitHub token. Two things therefore need help from outside:

1. **Counting visits** needs a counter that pages report to.
2. **Reading the counts and posting to X** needs secret keys. Secrets can never live in the repository or in a
   browser, so a small server must hold them and answer only John.

The plan uses one small **Cloudflare Worker** (the same kind as Vessk's `tools/chat-worker/`) as that server. It holds
the keys as Worker secrets and lets in only requests that carry a GitHub token which GitHub confirms can push to
`jcali0351/xal-reth`, the token the Sanctum Editor already has. No new password to remember.

```
 Visitors' browsers ── count ──▶ Analytics service (cookieless)
                                        ▲ read with secret key
 Sanctum Editor (John) ──▶ Admin Worker (Cloudflare) ── checks the GitHub token with GitHub
                                        ▼ post / schedule with X keys        ▲ cron every 5 min
                                       X API ◀────────────── posts that are due
```

## Part 1: Analytics

### Options

| | A. GoatCounter (recommended) | B. Cloudflare Web Analytics | C. Our own counter (Worker + D1) |
|---|---|---|---|
| Cost | Free hosted service for reasonable use | Free | Free within Cloudflare's free limits |
| Cookies / consent banner | None; the service says no GDPR notice is needed | None | None, if built that way |
| Pages, referrers, browsers, systems, screen sizes, countries | Yes | Yes | Whatever we build |
| Custom events (form sends, downloads, searches) | Yes | No | Yes |
| Live "visitors right now" | No | No | Could be built |
| Reading the numbers into the CMS | JSON API with a key (4 requests a second) | GraphQL API with a Cloudflare token | Direct |
| Work | Small | Small | Largest: we would be running an analytics product |

**Recommendation: A, GoatCounter.** It covers what the wish list asks for that is possible honestly, it has events
for the goals, and it keeps the Coil's habit of not tracking people. John can also log in to GoatCounter's own
dashboard at any time.

### What the Analytics tab would show

- Cards: visits, page views, compared with the previous period (up/down and the change).
- Traffic chart with ranges: today, 7 days, 30 days, 90 days, a year, custom.
- Sources: direct, search, social (X, Discord, Reddit, YouTube and the rest), other sites, as a bar and pie chart.
- Top pages: views, sortable and searchable.
- Devices, browsers, systems and screen sizes; countries (GoatCounter counts countries, not cities).
- Goals as events: recruitment and officer applications sent, contact messages, "Talk to John" chats, addon
  downloads, fishing-leaderboard visits.
- The Seeking Glass: most searched words and searches that found nothing (sent as events, words only).
- CSV export of any table.
- What is not possible here: a live visitor count, sessions and bounce rate in the strict sense, city-level maps,
  per-visitor paths. The tab will say so rather than invent numbers.

### Privacy

- Add a short page, "What the sanctum counts", linked from every footer: no cookies, no personal data, what is counted
  and why. (Optional but recommended.)
- Visitors with "Do Not Track" or "Global Privacy Control" switched on are not counted.

## Part 2: X tools

### What X allows today

X's API is pay-per-use: John buys credits in the X Developer Console, every call draws them down, and he can set a
spending limit that blocks requests when reached. **A post that contains a link costs much more than a plain post**,
so the tools will warn before sending one with a link. Reading our own posts' metrics is the cheapest kind of call.

### The X tab

- **Compose**: text with the 280-character counter, a link warning, pictures from `img/uploads/` (subject to X's
  media upload rules), preview.
- **Post now** or **schedule** (date, time, time zone). The Worker keeps the queue and a cron trigger posts what is
  due every 5 minutes, even when John's computer is off.
- **Queue and calendar**: scheduled, draft, published, failed; edit, duplicate, delete, post now, pause.
- **Suggestions**: draft posts written in the Coil's voice from new Herald posts, blog posts and addon releases
  (from `news.json`), costing nothing until posted.
- **Performance**: impressions, likes, reposts, replies, bookmarks and link clicks for our own posts, read once a day
  to keep costs low; top posts of the last 30 days.
- Not proposed at first: mention and reply monitoring (each post read costs), multiple accounts, follower-growth
  history (not available cheaply). These can be added later if wanted.

### What John sets up himself (keys never pass through Claude)

1. A free Cloudflare account, and the admin Worker deployed from `tools/admin-worker/` (instructions in its README).
2. A GoatCounter account for the site; its API key stored as a Worker secret.
3. An X developer app for @xalrethrp with read and write permission; its keys stored as Worker secrets; credits bought
   and a spending limit set in the X Developer Console.

## Decisions needed

1. Analytics service: A (GoatCounter), B (Cloudflare Web Analytics) or C (our own counter).
2. Add the "What the sanctum counts" privacy page and footer link?
3. X tools: which parts (compose and post, scheduling, suggestions, performance), and is John willing to buy X API
   credits with a monthly spending limit?
4. Cloudflare: OK to use a free Cloudflare account for the admin Worker?

Until these are answered, nothing is added to the site and no account is created.

## Decided and built (2026-11-07)

John chose GoatCounter, the privacy page and a Cloudflare Worker, and left the X parts open, so all four were built
(none costs anything until credits are bought and something is posted). Built: `js/counter.js` (off until its CODE is
set), `counts.html` and the footer link, `tools/admin-worker/` (worker.js + README.md with the setup steps), and the
editor's Analytics and X tabs. Tested in a browser against stand-in replies; not yet against the real GoatCounter, X
or Cloudflare, which needs John's accounts and keys.
