// Proteksi CSRF dengan pola double-submit cookie.
// Cookie token dibuat acak, dapat dibaca JavaScript (httpOnly: false),
// dan setiap permintaan yang mengubah data wajib mengirimkan header
// "x-csrf-token" yang nilainya sama dengan cookie tersebut.

const crypto = require("crypto");

const CSRF_COOKIE = "xsrf_token";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

function ensureCsrfCookie(req, res, next) {
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 1000 * 60 * 60 * 8,
      path: "/",
    });
    req.cookies[CSRF_COOKIE] = token;
  }
  next();
}

function requireCsrf(req, res, next) {
  if (SAFE_METHODS.includes(req.method)) return next();
  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.get("x-csrf-token") || req.get("x-xsrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res
      .status(403)
      .json({ error: "Token keamanan tidak valid. Muat ulang halaman." });
  }
  next();
}

module.exports = { ensureCsrfCookie, requireCsrf, CSRF_COOKIE };
