// API autentikasi admin rumah sakit.
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { logChange } = require("../lib/audit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Terlalu banyak percobaan login. Silakan coba lagi beberapa saat lagi.",
  },
});

function publicAdmin(admin) {
  return {
    username: admin.username,
    hospitalId: admin.hospital_id,
    mustChangePassword: admin.must_change_password,
  };
}

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Nama pengguna dan kata sandi wajib diisi." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, username, password_hash, hospital_id, is_active, must_change_password
         FROM admin_users
        WHERE lower(username) = lower($1)`,
      [username]
    );

    const admin = rows[0];
    // Pesan gagal disamakan agar tidak membocorkan keberadaan akun.
    const genericError = {
      error: "Nama pengguna, kata sandi, atau pilihan rumah sakit salah.",
    };

    if (!admin || !admin.is_active) {
      return res.status(401).json(genericError);
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json(genericError);
    }

    // Pilihan rumah sakit di flyover harus cocok dengan akun yang dimasuki.
    const hospitalId = Number(req.body.hospital_id);
    if (Number.isInteger(hospitalId) && hospitalId > 0) {
      if (hospitalId !== admin.hospital_id) {
        return res.status(401).json(genericError);
      }
    }

    // Regenerasi sesi untuk mencegah session fixation.
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.adminId = admin.id;
    req.session.hospitalId = admin.hospital_id;
    req.session.username = admin.username;

    await pool.query("UPDATE admin_users SET last_login_at = now() WHERE id = $1", [
      admin.id,
    ]);

    const hospitalRes = await pool.query(
      "SELECT id, name, official_name, phone_rawat_jalan, phone_igd, address, image_url FROM hospitals WHERE id = $1",
      [admin.hospital_id]
    );

    await logChange(admin.id, "login", "admin_user", admin.id, null);

    res.json({
      ok: true,
      admin: publicAdmin(admin),
      hospital: hospitalRes.rows[0] || null,
    });
  } catch (err) {
    console.error("[auth] gagal login:", err.message);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy((err) => {
    if (err) {
      console.error("[auth] gagal logout:", err.message);
      return res.status(500).json({ error: "Gagal keluar." });
    }
    res.clearCookie("tangklet.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  if (!req.session || !req.session.adminId) {
    return res.json({ authenticated: false });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, username, hospital_id, must_change_password
         FROM admin_users WHERE id = $1 AND is_active = TRUE`,
      [req.session.adminId]
    );
    const admin = rows[0];
    if (!admin) {
      return req.session.destroy(() => res.json({ authenticated: false }));
    }
    const hospitalRes = await pool.query(
      "SELECT id, name, official_name, phone_rawat_jalan, phone_igd, address, image_url FROM hospitals WHERE id = $1",
      [admin.hospital_id]
    );
    res.json({
      authenticated: true,
      admin: publicAdmin(admin),
      hospital: hospitalRes.rows[0] || null,
    });
  } catch (err) {
    console.error("[auth] gagal memuat sesi:", err.message);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Kata sandi baru minimal 8 karakter." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT password_hash FROM admin_users WHERE id = $1",
      [req.session.adminId]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: "Sesi tidak valid." });
    }
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) {
      return res.status(400).json({ error: "Kata sandi saat ini salah." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE admin_users SET password_hash = $1, must_change_password = FALSE WHERE id = $2",
      [newHash, req.session.adminId]
    );

    await logChange(req.session.adminId, "update", "admin_user", req.session.adminId, {
      field: "password",
    });

    res.json({ ok: true, message: "Kata sandi berhasil diperbarui." });
  } catch (err) {
    console.error("[auth] gagal ganti kata sandi:", err.message);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

module.exports = router;
