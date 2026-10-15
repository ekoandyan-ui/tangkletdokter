-- ============================================================
-- Skema database Tangklet Dokter
-- PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS hospitals (
  id                 SERIAL PRIMARY KEY,
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  official_name      TEXT,
  phone_rawat_jalan  TEXT,
  phone_igd          TEXT,
  address            TEXT,
  image_url          TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id                  SERIAL PRIMARY KEY,
  username            TEXT UNIQUE NOT NULL,
  email               TEXT,
  password_hash       TEXT NOT NULL,
  hospital_id         INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  contact       TEXT,
  schedule      TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posters (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  service_id    INTEGER REFERENCES services(id) ON DELETE SET NULL,
  file_url      TEXT NOT NULL,
  title         TEXT,
  alt_text      TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_logs (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   INTEGER,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_hospital ON services(hospital_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_posters_hospital ON posters(hospital_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_admin_users_hospital ON admin_users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_created ON change_logs(created_at DESC);

-- Tabel sesi (dibuat juga otomatis oleh connect-pg-simple bila createTableIfMissing)
CREATE TABLE IF NOT EXISTS "session" (
  sid    TEXT PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" (expire);
