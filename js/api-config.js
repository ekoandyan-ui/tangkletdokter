/* ============================================================
 * Konfigurasi API untuk sisi klien.
 * Bila API berada di domain berbeda dari halaman statis, isi URL lengkap
 * pada window.TANGKLET_API_BASE sebelum file ini dimuat.
 * Contoh: window.TANGKLET_API_BASE = "https://api.contoh.go.id";
 * ============================================================ */
(function (global) {
  "use strict";

  var BASE = global.TANGKLET_API_BASE || "";

  function readCookie(name) {
    var match = document.cookie.match(
      new RegExp("(^|; )" + name + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[2]) : null;
  }

  function request(path, options) {
    options = options || {};
    var method = (options.method || "GET").toUpperCase();
    var headers = options.headers || {};
    headers["Accept"] = "application/json";

    var body = options.body;
    if (
      body &&
      !(body instanceof FormData) &&
      typeof body !== "string"
    ) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    // Token CSRF (double-submit cookie) untuk permintaan yang mengubah data.
    if (method !== "GET" && method !== "HEAD") {
      var token = readCookie("xsrf_token");
      if (token) headers["X-CSRF-Token"] = token;
    }

    return fetch(BASE + path, {
      method: method,
      headers: headers,
      body: body,
      credentials: "same-origin",
    }).then(function (res) {
      var contentType = res.headers.get("content-type") || "";
      if (contentType.indexOf("application/json") !== -1) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var err = new Error(
              (data && data.error) || "Terjadi kesalahan (" + res.status + ")"
            );
            err.status = res.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      }
      if (!res.ok) {
        var e2 = new Error("Terjadi kesalahan (" + res.status + ")");
        e2.status = res.status;
        throw e2;
      }
      return res;
    });
  }

  var API = {
    get: function (path) {
      return request(path, { method: "GET" });
    },
    post: function (path, body, isForm) {
      return request(path, {
        method: "POST",
        body: isForm ? body : body || {},
      });
    },
    put: function (path, body) {
      return request(path, { method: "PUT", body: body || {} });
    },
    del: function (path) {
      return request(path, { method: "DELETE" });
    },
    base: BASE,
  };

  global.TangkletAPI = API;
  global.TangkletAPIRequest = request;
})(window);
