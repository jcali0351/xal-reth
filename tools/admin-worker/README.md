# The Sanctum Editor's admin Worker: analytics and X

The Sanctum Editor (admin.html) runs in John's browser, and the website is static, so the keys for GoatCounter and X
can't live in either. This small Cloudflare Worker holds them as secrets. It answers only requests that carry a GitHub
token which GitHub confirms can save to `jcali0351/xal-reth`, which is the token you already sign in to the editor with.
No new password.

Nothing in this folder contains a key. Never put one in a file.

## 1. GoatCounter (visitor counts, free, no cookies)

1. Make an account at https://www.goatcounter.com/signup. Choose a code, for example `xalreth`
   (your dashboard is then https://xalreth.goatcounter.com).
2. In GoatCounter: Settings > **Data collection**: tick "Don't track my own pageviews" if you like.
3. Your name menu > **API** > New API key with "Read statistics" ticked. Keep it for step 3.
4. Tell Claude the code (it is not secret), or put it yourself in `js/counter.js` (`var CODE = "xalreth";`) and commit.
   Counting starts once that is live.

## 2. X (posting and stats for @xalrethrp)

1. https://developer.x.com > Developer Console: create a Project and an App.
2. App settings > **User authentication settings**: App permissions **Read and write**. Type of App: "Web App,
   Automated App or Bot". Callback and website: https://jcali0351.github.io/xal-reth/ .
3. Keys and tokens: copy the **API Key and Secret**, then generate the **Access Token and Secret** (they must say
   "Read and Write"; regenerate them if you changed the permission after making them).
4. Billing: buy a small amount of credit and **set a monthly spending limit**. A plain post is cheap; a post with a link
   costs much more; reading stats of your own posts is the cheapest call. The editor warns before a post with a link.

## 3. Cloudflare (the Worker itself, free plan)

1. https://dash.cloudflare.com (free account) > **Workers & Pages** > Create > Create Worker. Name it `xalreth-admin`,
   Deploy.
2. **Edit code**: delete what is there, paste all of `worker.js` from this folder, Deploy.
3. **Storage & Databases > KV** > Create a namespace called `xalreth-admin`. Then in the Worker: Settings > **Bindings**
   > Add > KV namespace, variable name **XR**, the namespace you just made.
4. Worker > Settings > **Variables and Secrets** > Add:
   - `GOATCOUNTER_SITE` (Text): your code, e.g. `xalreth`
   - `GOATCOUNTER_KEY` (Secret): the GoatCounter API key
   - `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` (all Secret)
   - optional: `MAX_POSTS_PER_DAY` (Text, default 12), `ALLOWED_ORIGINS` if the site ever moves
5. Worker > Settings > **Trigger events** > Add > Cron trigger: `*/5 * * * *` (scheduled posts go out within 5 minutes).
6. Copy the Worker's address, like `https://xalreth-admin.yourname.workers.dev`.

## 4. Connect the editor

Open admin.html, go to the **Analytics** or **X** tab, paste the Worker address into "Admin Worker address" and press
Save (it is kept in this browser; it is not secret). The tab shows what is set up and what is missing.

## What it costs and what it stores

- Cloudflare free plan: 100,000 requests a day and 5 cron triggers per account; this uses one cron trigger and a few
  hundred requests a day at most.
- GoatCounter: free for reasonable use.
- X: only what you spend from your credits, within the limit you set. Stats are read at most every 12 hours unless
  you press Refresh. Posts are capped at MAX_POSTS_PER_DAY.
- The Worker's KV holds the post queue, the log of the last 200 posts, the cached stats and short-lived analytics
  caches. No visitor data.
