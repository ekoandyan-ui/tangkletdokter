// ============================================================
// Uji cepat (smoke test) alur admin rumah sakit.
// Jalankan SETELAH "npm run db:setup" dan "npm start":
//   npm run smoke
// Memeriksa: login, sesi, CRUD layanan, unggah poster, dan
// ketersediaan data pada API publik. Semua data uji dibersihkan.
// ============================================================

require("dotenv").config();

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const DEFAULT_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "Demak#2026";

// Kredensial admin uji (satu dari enam akun hasil db:setup).
const TEST_USERNAME = "rsud.sukalijaga";
const TEST_IMAGE = "images/layanan_rsud_suka.jpg";

// ---------- Cookie jar sederhana ----------
const jar = new Map();
function storeCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) {
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      jar.set(name, value);
    }
  }
}
function cookieHeader() {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}
function csrfToken() {
  return jar.get("xsrf_token") || "";
}

async function call(path, opts = {}) {
  opts.headers = Object.assign({}, opts.headers);
  opts.headers.Cookie = cookieHeader();
  const method = (opts.method || "GET").toUpperCase();
  if (method !== "GET" && csrfToken()) opts.headers["X-CSRF-Token"] = csrfToken();
  const res = await fetch(BASE + path, opts);
  storeCookies(res);
  let body = null;
  try {
    body = await res.json();
  } catch (_) {}
  return { status: res.status, body };
}

let passed = 0;
let failed = 0;
function ok(label, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${extra ? " -> " + extra : ""}`);
  }
}

async function main() {
  console.log(`\nSmoke test Tangklet Dokter  (${BASE})\n`);

  // 1. Ping server
  const ping = await call("/api/public/hospitals");
  ok("Server berjalan & API publik terjawab", ping.status === 200, `status ${ping.status}`);

  // 2. CSRF cookie terpasang
  ok("Cookie CSRF (xsrf_token) terpasang", !!jar.get("xsrf_token"));

  // 3. Belum login
  const me0 = await call("/api/auth/me");
  ok("Sesi awal belum terautentikasi", me0.body && me0.body.authenticated === false);

  // 4. Login gagal (kata sandi salah) -> pesan generik
  const bad = await call("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: TEST_USERNAME, password: "salah!!" }),
  });
  ok("Login gagal dengan pesan generik", bad.status === 401 && /salah|pilihan rumah sakit/i.test(bad.body.error || ""));

  // 5. Login sukses
  const login = await call("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: TEST_USERNAME, password: DEFAULT_PASSWORD }),
  });
  ok("Login sukses", login.status === 200 && login.body.ok === true, JSON.stringify(login.body).slice(0, 120));
  const hospitalId = login.body && login.body.hospital && login.body.hospital.id;
  ok("Login mengembalikan data rumah sakit", !!hospitalId);

  // 6. Otorisasi: endpoint admin butuh login
  const anon = await fetch(BASE + "/api/admin/hospital");
  ok("Endpoint admin menolak tanpa sesi", anon.status === 401);

  // 7. Buat layanan uji
  const svc = await call("/api/admin/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Layanan Uji Coba", description: "Dibuat oleh smoke test", schedule: "Senin–Jumat", contact: "0812-0000-0000" }),
  });
  ok("Membuat layanan", svc.status === 201 && svc.body.service, JSON.stringify(svc.body).slice(0, 120));
  const svcId = svc.body && svc.body.service && svc.body.service.id;

  // 8. Ubah layanan
  const upd = await call(`/api/admin/services/${svcId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Layanan Uji Coba Diubah", is_published: true }),
  });
  ok("Memperbarui layanan", upd.status === 200);

  // 9. Cek layanan tampil di API publik
  const pub1 = await call("/api/public/hospitals/" + hospitalId);
  ok("Layanan tampil pada API publik", pub1.body && pub1.body.hospital && (pub1.body.hospital.services || []).some((s) => s.id === svcId));

  // 10. Unggah poster uji (multipart)
  const fs = require("fs");
  const path = require("path");
  const imgPath = path.join(__dirname, "..", TEST_IMAGE);
  if (fs.existsSync(imgPath)) {
    const fd = new FormData();
    fd.append("file", new Blob([fs.readFileSync(imgPath)], { type: "image/jpeg" }), "poster-uji.jpg");
    fd.append("title", "Poster Uji Coba");
    fd.append("alt_text", "Poster Uji Coba");
    const up = await call("/api/admin/posters", { method: "POST", body: fd });
    ok("Mengunggah poster", up.status === 201 && up.body.poster, JSON.stringify(up.body).slice(0, 160));
    const posterId = up.body && up.body.poster && up.body.poster.id;

    // 11. Poster tampil di API publik
    const pub2 = await call("/api/public/hospitals/" + hospitalId);
    ok("Poster tampil pada API publik", pub2.body && pub2.body.hospital && (pub2.body.hospital.posters || []).some((p) => p.id === posterId));

    // 12. Hapus poster (bersih-bersih)
    if (posterId) {
      const del = await call(`/api/admin/posters/${posterId}`, { method: "DELETE" });
      ok("Menghapus poster uji", del.status === 200);
    }
  } else {
    console.log("  • dilewati: berkas uji " + TEST_IMAGE + " tidak ada");
  }

  // 13. Hapus layanan uji (bersih-bersih)
  if (svcId) {
    const delSvc = await call(`/api/admin/services/${svcId}`, { method: "DELETE" });
    ok("Menghapus layanan uji", delSvc.status === 200);
  }

  // 14. Ganti kata sandi (uji validasi, tidak mengubah permanen)
  const badPw = await call("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "salah", newPassword: "123456789" }),
  });
  ok("Ganti kata sandi menolak sandi saat ini yang salah", badPw.status === 400);

  // 15. Logout
  const out = await call("/api/auth/logout", { method: "POST" });
  ok("Logout sukses", out.status === 200);
  const me1 = await call("/api/auth/me");
  ok("Sesi berakhir setelah logout", me1.body && me1.body.authenticated === false);

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal.\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("\n[smoke] Error:", e.message);
  process.exit(1);
});
