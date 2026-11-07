# Vessk's mind: turning on full AI replies

The chat on the site (`js/chat.js`) works on its own. It answers from the site's pages, and "Talk to John" emails the author.
To let Vessk answer anything in his own words with Claude, put this small worker between the site and the Claude API.
The API key stays in the worker as a secret. It never goes in the website.

## What you need

- A free Cloudflare account: https://dash.cloudflare.com/sign-up
- A Claude API key from https://console.anthropic.com (Settings > API Keys). Set a monthly spend limit there.
  Each chat reply is a few thousand tokens on a small, fast model, so it costs a fraction of a cent.

## Setup (about 10 minutes, all in the browser)

1. Cloudflare dashboard > **Workers & Pages** > **Create** > **Create Worker**. Name it `xalreth-chat` and press **Deploy**.
2. Press **Edit code**, delete what is there, paste in all of `worker.js` from this folder, and press **Deploy**.
3. Go to the worker's **Settings** > **Variables and Secrets** and add:
   - `ANTHROPIC_API_KEY`, type **Secret**, value: your Claude API key.
   - (optional) `MODEL` if you want a different Claude model than `claude-haiku-5-5`.
   - (optional) `ALLOWED_ORIGINS` if the site moves to another address (default `https://jcali0351.github.io`).
4. Copy the worker's address, like `https://xalreth-chat.yourname.workers.dev`.
5. In `js/chat.js`, set `endpoint:` to that address, then commit. (Or just tell Claude the address and it will do it.)

Vessk then answers with Claude, using the most relevant passages from the site for each question. If the worker is ever
down or out of credit, the chat quietly falls back to answering from the site.

## Safety built in

- Only the site's own address can call the worker (`ALLOWED_ORIGINS`).
- Each visitor gets 30 questions per 10 minutes; replies are capped at 500 tokens; long messages are trimmed.
- Vessk says plainly that he is an AI, stays friendly, and hands off to John when someone wants a person, has a bug he
  can't solve, or seems upset.
