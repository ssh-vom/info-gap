CREATE TABLE IF NOT EXISTS posts (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  author       TEXT NOT NULL,
  role         TEXT,
  stream       TEXT NOT NULL,
  tags         TEXT NOT NULL DEFAULT '[]',
  video        TEXT,
  body         TEXT NOT NULL,
  reading_time TEXT,
  published    TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagrams (
  id         TEXT PRIMARY KEY,
  scene      TEXT NOT NULL,   -- excalidraw scene JSON (for future re-edit)
  svg        TEXT NOT NULL,   -- exported SVG, served as an <img>
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  linkedin_sub TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT,
  picture      TEXT,
  headline     TEXT,
  location     TEXT,
  school       TEXT,
  grad_year    TEXT,
  program      TEXT,
  linkedin_url TEXT,
  website      TEXT,
  bio          TEXT,
  role_history TEXT NOT NULL DEFAULT '[]',
  education    TEXT NOT NULL DEFAULT '[]',
  skills       TEXT NOT NULL DEFAULT '[]',
  interests    TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
