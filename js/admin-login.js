/* ============================================================
 * Tombol "Login Admin Rumah Sakit" pada footer + panel flyover.
 * Di-include di semua halaman publik (index, informasi, speling, chat).
 * ============================================================ */
(function () {
  "use strict";

  var API = window.TangkletAPI;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function buildMarkup() {
    var wrap = document.createElement("div");

    wrap.innerHTML =
      '<button type="button" id="btnLoginAdminRS" class="footer-admin-btn">' +
      '<i class="fas fa-user-shield"></i> Login Admin Rumah Sakit</button>' +

      '<div id="adminLoginOverlay" class="admin-flyover-overlay" aria-hidden="true">' +
      '  <div id="adminLoginPanel" class="admin-flyover-panel" role="dialog" aria-modal="true" aria-labelledby="adminFlyoverTitle" tabindex="-1">' +
      '    <div class="admin-flyover-header">' +
      '      <h3 id="adminFlyoverTitle">Login Admin Rumah Sakit</h3>' +
      '      <button type="button" id="adminFlyoverClose" class="admin-flyover-close" aria-label="Tutup panel login">&times;</button>' +
      "    </div>" +
      '    <form id="adminLoginForm" class="admin-flyover-form" novalidate>' +
      '      <label for="adminHospital">Pilih Rumah Sakit</label>' +
      '      <select id="adminHospital" name="hospital" required>' +
      '        <option value="">— Pilih rumah sakit —</option>' +
      "      </select>" +
      '      <label for="adminUsername">Nama Pengguna / Email</label>' +
      '      <input type="text" id="adminUsername" name="username" autocomplete="username" required>' +
      '      <label for="adminPassword">Kata Sandi</label>' +
      '      <input type="password" id="adminPassword" name="password" autocomplete="current-password" required>' +
      '      <p id="adminLoginMsg" class="admin-flyover-msg" role="alert" aria-live="assertive"></p>' +
      '      <button type="submit" id="adminLoginSubmit" class="admin-flyover-submit">Masuk</button>' +
      '      <p class="admin-flyover-note">Akun hanya disediakan untuk admin resmi tiap rumah sakit.</p>' +
      "    </form>" +
      "  </div>" +
      "</div>";

    // Sisipkan tombol ke footer sebelum blok copyright.
    var copyright = document.querySelector(".footer .copyright");
    var btn = wrap.querySelector("#btnLoginAdminRS");
    if (copyright && copyright.parentNode) {
      copyright.parentNode.insertBefore(btn, copyright);
    } else if (document.querySelector(".footer")) {
      document.querySelector(".footer").appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }

    // Panel flyover ditempel di akhir body.
    document.body.appendChild(wrap.querySelector("#adminLoginOverlay"));
  }

  function openFlyover() {
    var overlay = document.getElementById("adminLoginOverlay");
    var panel = document.getElementById("adminLoginPanel");
    var select = document.getElementById("adminHospital");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    // Muat daftar rumah sakit (sekali).
    if (select && select.options.length <= 1 && API) {
      API.get("/api/public/hospitals")
        .then(function (data) {
          (data.hospitals || []).forEach(function (h) {
            var opt = document.createElement("option");
            opt.value = h.id;
            opt.textContent = h.name;
            select.appendChild(opt);
          });
        })
        .catch(function () {
          /* daftar gagal dimuat; biarkan pilihan kosong */
        });
    }
    setTimeout(function () {
      var f = document.getElementById("adminUsername");
      if (f) f.focus();
      panel && panel.focus();
    }, 60);
    document.addEventListener("keydown", onKeydown);
  }

  function closeFlyover() {
    var overlay = document.getElementById("adminLoginOverlay");
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydown);
    var btn = document.getElementById("btnLoginAdminRS");
    if (btn) btn.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeFlyover();
    if (e.key === "Tab") {
      // Fokus terkunci di dalam panel selama terbuka.
      var panel = document.getElementById("adminLoginPanel");
      if (!panel) return;
      var f = panel.querySelectorAll(
        'button, input, select, textarea, [href]'
      );
      var list = Array.prototype.filter.call(f, function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function showMsg(text, isError) {
    var el = document.getElementById("adminLoginMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "admin-flyover-msg" + (isError ? " error" : "");
  }

  function init() {
    if (!document.querySelector(".footer")) return;
    buildMarkup();

    var btn = document.getElementById("btnLoginAdminRS");
    var closeBtn = document.getElementById("adminFlyoverClose");
    var form = document.getElementById("adminLoginForm");
    var overlay = document.getElementById("adminLoginOverlay");

    btn.addEventListener("click", openFlyover);
    closeBtn.addEventListener("click", closeFlyover);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeFlyover();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showMsg("");
      var submit = document.getElementById("adminLoginSubmit");
      submit.disabled = true;
      submit.textContent = "Memeriksa…";

      var hospitalId = document.getElementById("adminHospital").value;
      var username = document.getElementById("adminUsername").value.trim();
      var password = document.getElementById("adminPassword").value;

      API.post("/api/auth/login", {
        hospital_id: hospitalId ? Number(hospitalId) : null,
        username: username,
        password: password,
      })
        .then(function () {
          window.location.href = "admin.html";
        })
        .catch(function (err) {
          showMsg(err.message || "Login gagal. Periksa kembali data Anda.", true);
          submit.disabled = false;
          submit.textContent = "Masuk";
        });
    });

    // Bila sudah login, tautan tombol mengarah ke dashboard.
    if (API) {
      API.get("/api/auth/me")
        .then(function (d) {
          if (d && d.authenticated) {
            btn.innerHTML = '<i class="fas fa-user-shield"></i> Dashboard Admin';
            btn.classList.add("is-logged-in");
            btn.onclick = function () {
              window.location.href = "admin.html";
            };
          }
        })
        .catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
