// ============================================================
// Tangklet Dokter - server aplikasi
// Menyajikan halaman statis + API publik & admin rumah sakit.
// ============================================================

require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const cookieParser = require("cookie-parser");

const pool = require("./db/pool");
const { ensureCsrfCookie } = require("./middleware/csrf");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, process.env.UPLOAD_DIR || "uploads");

// Di belakang proxy (mis. saat produksi), percayai header X-Forwarded-*.
app.set("trust proxy", 1);

// Header keamanan. CSP dimatikan agar tidak memblokir skrip/CDN yang sudah
// dipakai halaman (Font Awesome, Google Fonts, skrip inline). Untuk produksi
// sebaiknya atur CSP yang ketat.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ---------- Sesi ----------
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === "ganti-dengan-string-acak-panjang") {
  console.warn(
    "[peringatan] SESSION_SECRET belum diatur dengan nilai acak yang aman. " +
      "Isi di file .env sebelum dipakai di produksi."
  );
}

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    name: "tangklet.sid",
    secret: sessionSecret || "dev-secret-jangan-dipakai-di-produksi",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 1000 * 60 * 60 * 8, // 8 jam
    },
  })
);

app.use(ensureCsrfCookie);

// ---------- API ----------
app.use("/api/public", require("./routes/public"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});

// ---------- Berkas unggahan poster ----------
app.use("/uploads", express.static(UPLOAD_DIR, { dotfiles: "deny" }));

// ---------- Halaman & aset statis ----------
// Blokir akses ke berkas sensitif (kode server, konfigurasi, database).
const BLOCKED_PREFIXES = [
  "/db",
  "/routes",
  "/middleware",
  "/lib",
  "/node_modules",
  "/outputs",
];
const BLOCKED_FILES = /(^|\/)(server\.js|package(-lock)?\.json|\.env.*|.*\.(sql|bat|ps1|md))$/i;

app.use((req, res, next) => {
  const p = decodeURIComponent(req.path).toLowerCase();
  if (
    BLOCKED_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/")) ||
    BLOCKED_FILES.test(p)
  ) {
    return res.status(404).send("Not found");
  }
  next();
});

app.use(
  express.static(ROOT, {
    dotfiles: "deny",
    extensions: ["html"],
    index: "index.html",
  })
);

// Penanganan galat umum (termasuk galat JSON parsing).
app.use((err, req, res, next) => {
  console.error("[server] galat:", err.message);
  if (res.headersSent) return next(err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
  res.status(500).send("Terjadi kesalahan pada server.");
});

app.listen(PORT, () => {
  console.log("============================================");
  console.log(` Tangklet Dokter berjalan di:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(` Halaman publik : http://localhost:${PORT}/index.html`);
  console.log(` Dashboard admin: http://localhost:${PORT}/admin.html`);
  console.log("============================================");
});
