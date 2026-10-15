// Catatan perubahan (audit trail).
const pool = require("../db/pool");

async function logChange(adminId, action, entity, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO change_logs (admin_id, action, entity, entity_id, details)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        adminId || null,
        action,
        entity,
        entityId || null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (err) {
    console.error("[audit] gagal mencatat log:", err.message);
  }
}

module.exports = { logChange };
