// Middleware autentikasi & otorisasi.
// Semua keputusan akses dilakukan di server. ID rumah sakit yang dikirim
// browser TIDAK pernah dijadikan bukti kewenangan -- selalu pakai hospitalId
// dari sesi server.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Silakan login terlebih dahulu." });
  }
  next();
}

module.exports = { requireAuth };
