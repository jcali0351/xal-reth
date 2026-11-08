-- The Faces of the Coil: the social profiles' database (Cloudflare D1, SQLite).
-- Characters are keyed "realm-slug/name" in lower case, the same as data/roster.json.
-- Apply with: npx wrangler d1 execute xalreth-social --remote --file=tools/social-worker/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- Battle.net account id (never shown)
  created INTEGER NOT NULL,
  last_login INTEGER NOT NULL,
  muted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chars (
  key TEXT PRIMARY KEY,           -- realm-slug/name
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  claimed INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chars_user ON chars(user_id);

CREATE TABLE IF NOT EXISTS profiles (
  key TEXT PRIMARY KEY,
  details TEXT NOT NULL DEFAULT '{}',  -- JSON: icName, title, pronouns, home, affiliation, relationship, likes, dislikes, about, avatar, cover
  status TEXT NOT NULL DEFAULT '',
  status_at INTEGER,
  updated INTEGER NOT NULL,
  active INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,           -- character key
  wall TEXT NOT NULL,             -- whose wall it is on (the author's own for a plain post)
  body TEXT NOT NULL,
  pic TEXT,                       -- pics.id
  kind TEXT NOT NULL DEFAULT 'post', -- post | status
  created INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created);
CREATE INDEX IF NOT EXISTS posts_wall ON posts(wall, created);
CREATE INDEX IF NOT EXISTS posts_author ON posts(author, created);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comments_post ON comments(post, created);
CREATE INDEX IF NOT EXISTS comments_author ON comments(author, created);

CREATE TABLE IF NOT EXISTS reactions (
  post TEXT NOT NULL,
  author TEXT NOT NULL,
  kind TEXT NOT NULL,             -- light | bask | grip | letgo
  created INTEGER NOT NULL,
  PRIMARY KEY (post, author)
);

CREATE TABLE IF NOT EXISTS bonds (
  a TEXT NOT NULL,                -- who asked
  b TEXT NOT NULL,                -- who was asked
  kind TEXT NOT NULL,             -- kin | friend | rival | mentor | student | sworn | beloved
  status TEXT NOT NULL,           -- pending | accepted
  created INTEGER NOT NULL,
  PRIMARY KEY (a, b)
);
CREATE INDEX IF NOT EXISTS bonds_b ON bonds(b);

CREATE TABLE IF NOT EXISTS pics (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,            -- character key
  use TEXT NOT NULL,              -- post | avatar | cover
  type TEXT NOT NULL,             -- image/webp | image/jpeg | image/png
  size INTEGER NOT NULL,
  status TEXT NOT NULL,           -- pending | approved | rejected
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pics_status ON pics(status, created);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,             -- post | comment | profile | pic
  target TEXT NOT NULL,
  reporter TEXT,                  -- character key, if signed in
  reason TEXT NOT NULL,
  created INTEGER NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0
);
