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
