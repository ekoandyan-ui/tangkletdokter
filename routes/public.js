// API publik (tanpa login) — dipakai halaman pengunjung.
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

async function fetchHospitals(hospitalId) {
  const params = [];
  let where = "WHERE h.is_active = TRUE";
  if (hospitalId) {
    params.push(hospitalId);
    where += ` AND h.id = $${params.length}`;
  }

  const hospitalsRes = await pool.query(
    `SELECT id, slug, name, official_name, phone_rawat_jalan, phone_igd,
            address, image_url, updated_at
       FROM hospitals h
       ${where}
       ORDER BY h.id`,
    params
  );

  if (hospitalsRes.rows.length === 0) return [];

  const ids = hospitalsRes.rows.map((r) => r.id);

  const [servicesRes, postersRes] = await Promise.all([
    pool.query(
      `SELECT id, hospital_id, name, description, contact, schedule, sort_order
         FROM services
        WHERE hospital_id = ANY($1) AND is_published = TRUE
        ORDER BY sort_order, id`,
      [ids]
    ),
    pool.query(
      `SELECT id, hospital_id, service_id, file_url, title, alt_text, sort_order
         FROM posters
        WHERE hospital_id = ANY($1) AND is_published = TRUE
        ORDER BY sort_order, id`,
      [ids]
    ),
  ]);

  return hospitalsRes.rows.map((h) => ({
    ...h,
    services: servicesRes.rows.filter((s) => s.hospital_id === h.id),
    posters: postersRes.rows.filter((p) => p.hospital_id === h.id),
  }));
}

// GET /api/public/hospitals
router.get("/hospitals", async (req, res) => {
  try {
    const data = await fetchHospitals();
    res.json({ hospitals: data });
  } catch (err) {
    console.error("[public] gagal memuat daftar RS:", err.message);
    res.status(500).json({ error: "Gagal memuat data rumah sakit." });
  }
});

// GET /api/public/hospitals/:id
router.get("/hospitals/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID rumah sakit tidak valid." });
  }
  try {
    const data = await fetchHospitals(id);
    if (data.length === 0) {
      return res.status(404).json({ error: "Rumah sakit tidak ditemukan." });
    }
    res.json({ hospital: data[0] });
  } catch (err) {
    console.error("[public] gagal memuat detail RS:", err.message);
    res.status(500).json({ error: "Gagal memuat data rumah sakit." });
  }
});

module.exports = router;
