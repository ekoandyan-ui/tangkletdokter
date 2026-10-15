// ============================================================
// Skrip setup database: buat database (bila belum ada), buat
// tabel, lalu isi data awal 6 rumah sakit + akun admin.
//
// Jalankan:  npm run db:setup
// ============================================================

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const hospitalsData = require("./seed-data");

const DB_NAME =
  process.env.DB_NAME ||
  process.env.PGDATABASE ||
  (process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "")
    : "tangklet_dokter");

const DEFAULT_PASSWORD =
  process.env.DEFAULT_ADMIN_PASSWORD || "Demak#2026";

function baseConfig(withDatabase) {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    if (withDatabase) url.pathname = "/" + withDatabase;
    return {
      connectionString: url.toString(),
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    };
  }
  return {
    host: process.env.PGHOST || "127.0.0.1",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: withDatabase,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
  };
}

async function ensureDatabase() {
  // Validasi nama database (identifier sederhana) untuk mencegah injeksi SQL.
  if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
    throw new Error(
      `Nama database tidak valid: "${DB_NAME}". Gunakan hanya huruf, angka, dan garis bawah.`
    );
  }

  const admin = new Client(baseConfig("postgres"));
  await admin.connect();
  const { rows } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [DB_NAME]
  );
  if (rows.length === 0) {
    console.log(`[setup] Membuat database "${DB_NAME}"...`);
    await admin.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`[setup] Database "${DB_NAME}" dibuat.`);
  } else {
    console.log(`[setup] Database "${DB_NAME}" sudah ada.`);
  }
  await admin.end();
}

async function runSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  const client = new Client(baseConfig(DB_NAME));
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("[setup] Skema tabel siap.");
}

async function seed() {
  const client = new Client(baseConfig(DB_NAME));
  await client.connect();
  try {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    for (const h of hospitalsData) {
      const upsertHospital = await client.query(
        `INSERT INTO hospitals (slug, name, official_name, phone_rawat_jalan, phone_igd, image_url)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           official_name = EXCLUDED.official_name,
           phone_rawat_jalan = EXCLUDED.phone_rawat_jalan,
           phone_igd = EXCLUDED.phone_igd,
           image_url = EXCLUDED.image_url,
           updated_at = now()
         RETURNING id`,
        [
          h.slug,
          h.name,
          h.official_name,
          h.phone_rawat_jalan,
          h.phone_igd,
          h.image_url,
        ]
      );
      const hospitalId = upsertHospital.rows[0].id;

      await client.query(
        `INSERT INTO admin_users (username, email, password_hash, hospital_id, must_change_password)
         VALUES ($1,$2,$3,$4,TRUE)
         ON CONFLICT (username) DO UPDATE SET
           email = EXCLUDED.email,
           hospital_id = EXCLUDED.hospital_id,
           password_hash = CASE
             WHEN admin_users.must_change_password THEN EXCLUDED.password_hash
             ELSE admin_users.password_hash
           END`,
        [h.username, h.email, passwordHash, hospitalId]
      );

      // Isi poster hanya jika RS belum punya poster (jangan timpa data admin).
      const existing = await client.query(
        "SELECT COUNT(*)::int AS n FROM posters WHERE hospital_id = $1",
        [hospitalId]
      );
      if (existing.rows[0].n === 0 && Array.isArray(h.posters)) {
        let order = 0;
        for (const p of h.posters) {
          await client.query(
            `INSERT INTO posters (hospital_id, file_url, title, alt_text, sort_order)
             VALUES ($1,$2,$3,$4,$5)`,
            [hospitalId, p.file_url, p.title || null, p.title || null, order++]
          );
        }
      }
    }

    console.log("[setup] Data awal rumah sakit, akun admin, dan poster selesai.");
  } finally {
    await client.end();
  }
}

(async function main() {
  try {
    await ensureDatabase();
    await runSchema();
    await seed();

    console.log("");
    console.log("============================================================");
    console.log(" Setup selesai! Akun admin awal (satu per rumah sakit):");
    console.log("============================================================");
    for (const h of hospitalsData) {
      console.log(`  - ${h.name.padEnd(42)} user: ${h.username}`);
    }
    console.log("");
    console.log(`  Password awal semua akun : ${DEFAULT_PASSWORD}`);
    console.log("  (WAJIB diganti setelah login pertama.)");
    console.log("============================================================");
    console.log("");
    console.log("Langkah berikutnya:  npm start");
    process.exit(0);
  } catch (err) {
    console.error("");
    console.error("[setup] GAGAL:", err.message);
    if (/password|autentikasi|authentication/i.test(err.message)) {
      console.error(
        "Periksa PGPASSWORD / DATABASE_URL pada file .env Anda."
      );
    }
    process.exit(1);
  }
})();
