// API admin rumah sakit. Semua endpoint memerlukan login dan hanya
// mengakses data milik hospitalId pada sesi.
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const router = express.Router();
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { requireCsrf } = require("../middleware/csrf");
const { logChange } = require("../lib/audit");

router.use(requireAuth);
router.use(requireCsrf);

// ---------- Konfigurasi unggahan poster ----------
const UPLOAD_DIR = path.join(
  __dirname,
  "..",
  process.env.UPLOAD_DIR || "uploads"
);
const UPLOADS_URL_BASE = (process.env.UPLOADS_URL_BASE || "/uploads").replace(
  /\/$/,
  ""
);
const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 5);
const ALLOWED_TYPES = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || ".bin";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(
        new Error("Tipe berkas tidak diizinkan. Gunakan PNG, JPG, WEBP, atau GIF.")
      );
    }
    cb(null, true);
  },
});

function safeUnlinkByUrl(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith(UPLOADS_URL_BASE + "/")) return;
  const name = path.basename(fileUrl);
  const full = path.join(UPLOAD_DIR, name);
  if (!full.startsWith(UPLOAD_DIR)) return; // cegah path traversal
  fs.unlink(full, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("[admin] gagal menghapus berkas:", err.message);
    }
  });
}

const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ============ PROFIL RUMAH SAKIT ============

// GET /api/admin/hospital
router.get("/hospital", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, name, official_name, phone_rawat_jalan, phone_igd,
              address, image_url, updated_at
         FROM hospitals WHERE id = $1`,
      [req.session.hospitalId]
    );
    res.json({ hospital: rows[0] || null });
  } catch (err) {
    console.error("[admin] gagal memuat profil:", err.message);
    res.status(500).json({ error: "Gagal memuat profil rumah sakit." });
  }
});

// PUT /api/admin/hospital
router.put("/hospital", async (req, res) => {
  const phoneRawat = req.body.phone_rawat_jalan != null ? String(req.body.phone_rawat_jalan).trim() : null;
  const phoneIgd = req.body.phone_igd != null ? String(req.body.phone_igd).trim() : null;
  const address = req.body.address != null ? String(req.body.address).trim() : null;

  try {
    const { rows } = await pool.query(
      `UPDATE hospitals
          SET phone_rawat_jalan = $1,
              phone_igd = $2,
              address = $3,
              updated_at = now()
        WHERE id = $4
        RETURNING id, slug, name, official_name, phone_rawat_jalan, phone_igd, address, image_url, updated_at`,
      [phoneRawat, phoneIgd, address, req.session.hospitalId]
    );
    await logChange(req.session.adminId, "update", "hospital", req.session.hospitalId, {
      phone_rawat_jalan: phoneRawat,
      phone_igd: phoneIgd,
      address,
    });
    res.json({ ok: true, hospital: rows[0] });
  } catch (err) {
    console.error("[admin] gagal memperbarui profil:", err.message);
    res.status(500).json({ error: "Gagal menyimpan profil rumah sakit." });
  }
});

// ============ LAYANAN ============

// GET /api/admin/services
router.get("/services", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, contact, schedule, is_published, sort_order, updated_at
         FROM services WHERE hospital_id = $1
        ORDER BY sort_order, id`,
      [req.session.hospitalId]
    );
    res.json({ services: rows });
  } catch (err) {
    console.error("[admin] gagal memuat layanan:", err.message);
    res.status(500).json({ error: "Gagal memuat layanan." });
  }
});

// POST /api/admin/services
router.post("/services", async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Nama layanan wajib diisi." });

  try {
    const { rows } = await pool.query(
      `INSERT INTO services (hospital_id, name, description, contact, schedule, is_published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6,
               COALESCE((SELECT MAX(sort_order) + 1 FROM services WHERE hospital_id = $1), 0))
       RETURNING id, name, description, contact, schedule, is_published, sort_order`,
      [
        req.session.hospitalId,
        name,
        req.body.description || null,
        req.body.contact || null,
        req.body.schedule || null,
        req.body.is_published === false ? false : true,
      ]
    );
    await logChange(req.session.adminId, "create", "service", rows[0].id, { name });
    res.status(201).json({ ok: true, service: rows[0] });
  } catch (err) {
    console.error("[admin] gagal menambah layanan:", err.message);
    res.status(500).json({ error: "Gagal menambah layanan." });
  }
});

// PUT /api/admin/services/:id
router.put("/services/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID layanan tidak valid." });

  try {
    const existing = await pool.query(
      "SELECT id FROM services WHERE id = $1 AND hospital_id = $2",
      [id, req.session.hospitalId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Layanan tidak ditemukan." });
    }

    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Nama layanan wajib diisi." });

    const { rows } = await pool.query(
      `UPDATE services
          SET name = $1, description = $2, contact = $3, schedule = $4,
              is_published = $5, updated_at = now()
        WHERE id = $6 AND hospital_id = $7
        RETURNING id, name, description, contact, schedule, is_published, sort_order`,
      [
        name,
        req.body.description || null,
        req.body.contact || null,
        req.body.schedule || null,
        req.body.is_published === false ? false : true,
        id,
        req.session.hospitalId,
      ]
    );
    await logChange(req.session.adminId, "update", "service", id, { name });
    res.json({ ok: true, service: rows[0] });
  } catch (err) {
    console.error("[admin] gagal memperbarui layanan:", err.message);
    res.status(500).json({ error: "Gagal memperbarui layanan." });
  }
});

// DELETE /api/admin/services/:id
router.delete("/services/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID layanan tidak valid." });
  try {
    const result = await pool.query(
      "DELETE FROM services WHERE id = $1 AND hospital_id = $2 RETURNING id",
      [id, req.session.hospitalId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Layanan tidak ditemukan." });
    }
    await logChange(req.session.adminId, "delete", "service", id, null);
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin] gagal menghapus layanan:", err.message);
    res.status(500).json({ error: "Gagal menghapus layanan." });
  }
});

// POST /api/admin/services/reorder  { order: [id, id, ...] }
router.post("/services/reorder", async (req, res) => {
  const order = Array.isArray(req.body.order) ? req.body.order : null;
  if (!order) return res.status(400).json({ error: "Format urutan tidak valid." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < order.length; i++) {
      const id = parseId(order[i]);
      if (!id) continue;
      await client.query(
        "UPDATE services SET sort_order = $1 WHERE id = $2 AND hospital_id = $3",
        [i, id, req.session.hospitalId]
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[admin] gagal mengurutkan layanan:", err.message);
    res.status(500).json({ error: "Gagal menyimpan urutan layanan." });
  } finally {
    client.release();
  }
});

// ============ POSTER ============

// GET /api/admin/posters
router.get("/posters", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, service_id, file_url, title, alt_text, is_published, sort_order, uploaded_at
         FROM posters WHERE hospital_id = $1
        ORDER BY sort_order, id`,
      [req.session.hospitalId]
    );
    res.json({ posters: rows });
  } catch (err) {
    console.error("[admin] gagal memuat poster:", err.message);
    res.status(500).json({ error: "Gagal memuat poster." });
  }
});

// POST /api/admin/posters (multipart/form-data: file, title, alt_text, service_id)
router.post("/posters", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? `Ukuran berkas melebihi batas ${MAX_MB} MB.`
          : err.message || "Gagal mengunggah berkas.";
      return res.status(400).json({ error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Berkas poster wajib diunggah." });
    }

    const fileUrl = `${UPLOADS_URL_BASE}/${req.file.filename}`;
    const serviceId = req.body.service_id ? parseId(req.body.service_id) : null;

    try {
      // Pastikan service_id (bila ada) milik RS yang sama.
      if (serviceId) {
        const s = await pool.query(
          "SELECT id FROM services WHERE id = $1 AND hospital_id = $2",
          [serviceId, req.session.hospitalId]
        );
        if (s.rows.length === 0) {
          safeUnlinkByUrl(fileUrl);
          return res.status(400).json({ error: "Layanan tidak valid." });
        }
      }

      const { rows } = await pool.query(
        `INSERT INTO posters (hospital_id, service_id, file_url, title, alt_text, is_published, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6,
                 COALESCE((SELECT MAX(sort_order) + 1 FROM posters WHERE hospital_id = $1), 0))
         RETURNING id, service_id, file_url, title, alt_text, is_published, sort_order, uploaded_at`,
        [
          req.session.hospitalId,
          serviceId,
          fileUrl,
          req.body.title || null,
          req.body.alt_text || req.body.title || null,
          req.body.is_published === "false" ? false : true,
        ]
      );
      await logChange(req.session.adminId, "create", "poster", rows[0].id, {
        file_url: fileUrl,
      });
      res.status(201).json({ ok: true, poster: rows[0] });
    } catch (e) {
      safeUnlinkByUrl(fileUrl);
      console.error("[admin] gagal menyimpan poster:", e.message);
      res.status(500).json({ error: "Gagal menyimpan poster." });
    }
  });
});

// PUT /api/admin/posters/:id  (metadata saja; ganti berkas = hapus + unggah baru)
router.put("/posters/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID poster tidak valid." });

  try {
    const existing = await pool.query(
      "SELECT id FROM posters WHERE id = $1 AND hospital_id = $2",
      [id, req.session.hospitalId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Poster tidak ditemukan." });
    }

    const serviceId = req.body.service_id ? parseId(req.body.service_id) : null;
    if (serviceId) {
      const s = await pool.query(
        "SELECT id FROM services WHERE id = $1 AND hospital_id = $2",
        [serviceId, req.session.hospitalId]
      );
      if (s.rows.length === 0) {
        return res.status(400).json({ error: "Layanan tidak valid." });
      }
    }

    const { rows } = await pool.query(
      `UPDATE posters
          SET title = $1, alt_text = $2, service_id = $3, is_published = $4
        WHERE id = $5 AND hospital_id = $6
        RETURNING id, service_id, file_url, title, alt_text, is_published, sort_order, uploaded_at`,
      [
        req.body.title || null,
        req.body.alt_text || req.body.title || null,
        serviceId,
        req.body.is_published === false ? false : true,
        id,
        req.session.hospitalId,
      ]
    );
    await logChange(req.session.adminId, "update", "poster", id, {
      title: req.body.title || null,
    });
    res.json({ ok: true, poster: rows[0] });
  } catch (err) {
    console.error("[admin] gagal memperbarui poster:", err.message);
    res.status(500).json({ error: "Gagal memperbarui poster." });
  }
});

// DELETE /api/admin/posters/:id
router.delete("/posters/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID poster tidak valid." });
  try {
    const result = await pool.query(
      "DELETE FROM posters WHERE id = $1 AND hospital_id = $2 RETURNING file_url",
      [id, req.session.hospitalId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Poster tidak ditemukan." });
    }
    safeUnlinkByUrl(result.rows[0].file_url);
    await logChange(req.session.adminId, "delete", "poster", id, null);
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin] gagal menghapus poster:", err.message);
    res.status(500).json({ error: "Gagal menghapus poster." });
  }
});

// POST /api/admin/posters/reorder  { order: [id, id, ...] }
router.post("/posters/reorder", async (req, res) => {
  const order = Array.isArray(req.body.order) ? req.body.order : null;
  if (!order) return res.status(400).json({ error: "Format urutan tidak valid." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < order.length; i++) {
      const id = parseId(order[i]);
      if (!id) continue;
      await client.query(
        "UPDATE posters SET sort_order = $1 WHERE id = $2 AND hospital_id = $3",
        [i, id, req.session.hospitalId]
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[admin] gagal mengurutkan poster:", err.message);
    res.status(500).json({ error: "Gagal menyimpan urutan poster." });
  } finally {
    client.release();
  }
});

module.exports = router;
