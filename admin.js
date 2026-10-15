/* ============================================================
 * Dashboard Admin Rumah Sakit
 * Mengelola profil, layanan, dan poster milik RS yang sedang login.
 * ============================================================ */
(function () {
  "use strict";

  var API = window.TangkletAPI;
  var SESSION = null; // { admin, hospital }
  var servicesCache = [];
  var posterServiceOptions = [];

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function setMsg(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "admin-msg" + (isError ? " error" : text ? " ok" : "");
  }

  function telLink(p) {
    return p ? "tel:" + String(p).replace(/[-\s]/g, "") : "#";
  }

  /* ================= VIEW SWITCH ================= */
  function showLogin() {
    $("adminLoginView").hidden = false;
    $("adminDashboard").hidden = true;
    $("adminUserBox").hidden = true;
  }

  function showDashboard() {
    $("adminLoginView").hidden = true;
    $("adminDashboard").hidden = false;
    $("adminUserBox").hidden = false;
    $("adminHospitalName").textContent = SESSION.hospital
      ? SESSION.hospital.name
      : "";
    if (SESSION.admin && SESSION.admin.mustChangePassword) {
      $("mustChangeNotice").hidden = false;
    }
  }

  /* ================= TABS ================= */
  function initTabs() {
    var tabs = document.querySelectorAll(".admin-tab");
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener("click", function () {
        activateTab(t.getAttribute("data-tab"));
      });
    });
  }

  function activateTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll(".admin-tab"), function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === name);
    });
    ["profil", "layanan", "poster", "akun"].forEach(function (n) {
      var panel = $("tab-" + n);
      if (panel) panel.hidden = n !== name;
    });
    if (name === "layanan") loadServices();
    if (name === "poster") {
      loadPosters();
      loadServiceSelect();
    }
  }

  /* ================= LOGIN (dashboard) ================= */
  function loadHospitalOptions(selectEl) {
    API.get("/api/public/hospitals")
      .then(function (data) {
        (data.hospitals || []).forEach(function (h) {
          var opt = document.createElement("option");
          opt.value = h.id;
          opt.textContent = h.name;
          selectEl.appendChild(opt);
        });
      })
      .catch(function () {});
  }

  function initLogin() {
    loadHospitalOptions($("dashHospital"));

    $("dashboardLoginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("dashLoginMsg");
      var btn = $("dashLoginSubmit");
      btn.disabled = true;
      btn.textContent = "Memeriksa…";
      setMsg(msg, "");

      var hospitalId = $("dashHospital").value;
      API.post("/api/auth/login", {
        hospital_id: hospitalId ? Number(hospitalId) : null,
        username: $("dashUsername").value.trim(),
        password: $("dashPassword").value,
      })
        .then(function (res) {
          SESSION = res;
          showDashboard();
          loadProfile();
          if (res.admin && res.admin.mustChangePassword) activateTab("akun");
          else activateTab("profil");
        })
        .catch(function (err) {
          setMsg(msg, err.message || "Login gagal.", true);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Masuk";
        });
    });
  }

  function initLogout() {
    $("btnLogout").addEventListener("click", function () {
      API.post("/api/auth/logout", {}).then(function () {
        window.location.reload();
      });
    });
  }

  /* ================= PROFIL ================= */
  function loadProfile() {
    API.get("/api/admin/hospital")
      .then(function (res) {
        var h = res.hospital || {};
        $("hPhoneRawat").value = h.phone_rawat_jalan || "";
        $("hPhoneIgd").value = h.phone_igd || "";
        $("hAddress").value = h.address || "";
      })
      .catch(function (err) {
        setMsg($("hospitalMsg"), err.message, true);
      });
  }

  function initProfile() {
    $("hospitalForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("hospitalMsg");
      setMsg(msg, "");
      API.put("/api/admin/hospital", {
        phone_rawat_jalan: $("hPhoneRawat").value.trim(),
        phone_igd: $("hPhoneIgd").value.trim(),
        address: $("hAddress").value.trim(),
      })
        .then(function () {
          setMsg(msg, "Profil rumah sakit berhasil disimpan.", false);
        })
        .catch(function (err) {
          setMsg(msg, err.message, true);
        });
    });
  }

  /* ================= LAYANAN ================= */
  function loadServices() {
    API.get("/api/admin/services")
      .then(function (res) {
        servicesCache = res.services || [];
        renderServices();
      })
      .catch(function (err) {
        $("serviceList").innerHTML = '<p class="admin-empty">' + esc(err.message) + "</p>";
      });
  }

  function renderServices() {
    var list = $("serviceList");
    if (!servicesCache.length) {
      list.innerHTML = '<p class="admin-empty">Belum ada layanan. Tambahkan lewat formulir di atas.</p>';
      return;
    }
    list.innerHTML = servicesCache
      .map(function (s, i) {
        return (
          '<div class="admin-row" data-id="' + s.id + '">' +
          '  <div class="admin-row-main">' +
          '    <strong>' + esc(s.name) + "</strong>" +
          "    " + (s.is_published ? '<span class="badge ok">Terbit</span>' : '<span class="badge off">Draft</span>') +
          "    <div class='admin-row-meta'>" +
          (s.schedule ? "<span><i class='far fa-clock'></i> " + esc(s.schedule) + "</span>" : "") +
          (s.contact ? "<span><i class='fas fa-phone'></i> " + esc(s.contact) + "</span>" : "") +
          "    </div>" +
          "  </div>" +
          '  <div class="admin-row-actions">' +
          '    <button type="button" class="mini-btn" data-act="up" title="Naik" ' + (i === 0 ? "disabled" : "") + '><i class="fas fa-arrow-up"></i></button>' +
          '    <button type="button" class="mini-btn" data-act="down" title="Turun" ' + (i === servicesCache.length - 1 ? "disabled" : "") + '><i class="fas fa-arrow-down"></i></button>' +
          '    <button type="button" class="mini-btn" data-act="edit" title="Ubah"><i class="fas fa-pen"></i></button>' +
          '    <button type="button" class="mini-btn danger" data-act="delete" title="Hapus"><i class="fas fa-trash"></i></button>' +
          "  </div>" +
          "</div>"
        );
      })
      .join("");

    Array.prototype.forEach.call(list.querySelectorAll(".admin-row"), function (row) {
      row.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-act]");
        if (!btn) return;
        var id = Number(row.getAttribute("data-id"));
        var act = btn.getAttribute("data-act");
        if (act === "edit") editService(id);
        else if (act === "delete") deleteService(id);
        else if (act === "up") moveItem("services", -1, row);
        else if (act === "down") moveItem("services", 1, row);
      });
    });
  }

  function resetServiceForm() {
    $("serviceId").value = "";
    $("serviceName").value = "";
    $("serviceDesc").value = "";
    $("serviceSchedule").value = "";
    $("serviceContact").value = "";
    $("servicePublished").checked = true;
    $("serviceFormTitle").innerHTML = '<i class="fas fa-notes-medical"></i> Tambah Layanan';
    $("serviceSubmit").textContent = "Simpan Layanan";
    $("serviceCancel").hidden = true;
    setMsg($("serviceMsg"), "");
  }

  function editService(id) {
    var s = servicesCache.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    $("serviceId").value = s.id;
    $("serviceName").value = s.name || "";
    $("serviceDesc").value = s.description || "";
    $("serviceSchedule").value = s.schedule || "";
    $("serviceContact").value = s.contact || "";
    $("servicePublished").checked = !!s.is_published;
    $("serviceFormTitle").innerHTML = '<i class="fas fa-notes-medical"></i> Ubah Layanan';
    $("serviceSubmit").textContent = "Perbarui Layanan";
    $("serviceCancel").hidden = false;
    $("tab-layanan").scrollTop = 0;
    $("serviceForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteService(id) {
    if (!confirm("Hapus layanan ini? Tindakan ini tidak bisa dibatalkan.")) return;
    API.del("/api/admin/services/" + id)
      .then(function () {
        servicesCache = servicesCache.filter(function (s) { return s.id !== id; });
        renderServices();
        loadServiceSelect();
      })
      .catch(function (err) {
        setMsg($("serviceMsg"), err.message, true);
      });
  }

  function moveItem(kind, dir, rowEl) {
    var arr = kind === "services" ? servicesCache : postersCache;
    // Baris yang diklik dikirim langsung (lebih andal di Safari/mobile).
    var activeId = rowEl ? Number(rowEl.getAttribute("data-id")) : null;
    var idx = arr.findIndex(function (x) { return x.id === activeId; });
    if (idx < 0) return;
    var to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    var tmp = arr[idx];
    arr[idx] = arr[to];
    arr[to] = tmp;
    var order = arr.map(function (x) { return x.id; });
    API.post("/api/admin/" + kind + "/reorder", { order: order })
      .then(function () {
        if (kind === "services") renderServices();
        else renderPosters();
      })
      .catch(function (err) {
        // kembalikan ke urutan semula bila gagal
        arr[idx] = arr[to];
        arr[to] = tmp;
        alert(err.message || "Gagal menyimpan urutan.");
      });
  }

  function initServiceForm() {
    $("serviceForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("serviceMsg");
      setMsg(msg, "");
      var id = $("serviceId").value;
      var payload = {
        name: $("serviceName").value.trim(),
        description: $("serviceDesc").value.trim() || null,
        schedule: $("serviceSchedule").value.trim() || null,
        contact: $("serviceContact").value.trim() || null,
        is_published: $("servicePublished").checked,
      };
      var req = id
        ? API.put("/api/admin/services/" + id, payload)
        : API.post("/api/admin/services", payload);
      req
        .then(function () {
          resetServiceForm();
          loadServices();
          loadServiceSelect();
          setMsg(msg, "Layanan berhasil disimpan.", false);
        })
        .catch(function (err) {
          setMsg(msg, err.message, true);
        });
    });

    $("serviceCancel").addEventListener("click", resetServiceForm);
  }

  /* ================= POSTER ================= */
  var postersCache = [];

  function loadServiceSelect() {
    // Isi dropdown layanan untuk form poster & edit.
    API.get("/api/admin/services")
      .then(function (res) {
        posterServiceOptions = res.services || [];
        var sel = $("posterService");
        var current = sel.value;
        sel.innerHTML = '<option value="">— Tanpa layanan —</option>' +
          posterServiceOptions
            .map(function (s) {
              return '<option value="' + s.id + '">' + esc(s.name) + "</option>";
            })
            .join("");
        sel.value = current || "";
      })
      .catch(function () {});
  }

  function loadPosters() {
    API.get("/api/admin/posters")
      .then(function (res) {
        postersCache = res.posters || [];
        renderPosters();
      })
      .catch(function (err) {
        $("posterList").innerHTML = '<p class="admin-empty">' + esc(err.message) + "</p>";
      });
  }

  function serviceName(id) {
    var s = posterServiceOptions.filter(function (x) { return x.id === id; })[0];
    return s ? s.name : "";
  }

  function renderPosters() {
    var list = $("posterList");
    if (!postersCache.length) {
      list.innerHTML = '<p class="admin-empty">Belum ada poster. Unggah lewat formulir di atas.</p>';
      return;
    }
    list.innerHTML = postersCache
      .map(function (p, i) {
        return (
          '<div class="poster-card admin-row" data-id="' + p.id + '">' +
          '  <img class="poster-thumb" src="' + esc(p.file_url) + '" alt="' + esc(p.alt_text || p.title || "Poster") + '">' +
          '  <div class="poster-body">' +
          '    <input class="poster-title-input" type="text" value="' + esc(p.title || "") + '" placeholder="Judul poster">' +
          "    <div class='poster-meta'>" +
          (p.service_id ? "<span class='badge ok'>" + esc(serviceName(p.service_id)) + "</span>" : "") +
          "    </div>" +
          '    <label class="admin-check small"><input type="checkbox" class="poster-pub" ' + (p.is_published ? "checked" : "") + "> Terbit</label>" +
          "  </div>" +
          '  <div class="admin-row-actions">' +
          '    <button type="button" class="mini-btn" data-act="up" title="Naik" ' + (i === 0 ? "disabled" : "") + '><i class="fas fa-arrow-up"></i></button>' +
          '    <button type="button" class="mini-btn" data-act="down" title="Turun" ' + (i === postersCache.length - 1 ? "disabled" : "") + '><i class="fas fa-arrow-down"></i></button>' +
          '    <button type="button" class="mini-btn danger" data-act="delete" title="Hapus"><i class="fas fa-trash"></i></button>' +
          "  </div>" +
          "</div>"
        );
      })
      .join("");

    Array.prototype.forEach.call(list.querySelectorAll(".poster-card"), function (card) {
      var id = Number(card.getAttribute("data-id"));

      var titleInput = card.querySelector(".poster-title-input");
      titleInput.addEventListener("change", function () {
        updatePoster(id, { title: titleInput.value.trim() || null });
      });

      var pubInput = card.querySelector(".poster-pub");
      pubInput.addEventListener("change", function () {
        updatePoster(id, { is_published: pubInput.checked });
      });

      card.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-act]");
        if (!btn) return;
        var act = btn.getAttribute("data-act");
        if (act === "delete") deletePoster(id);
        else if (act === "up") moveItem("posters", -1, card);
        else if (act === "down") moveItem("posters", 1, card);
      });
    });
  }

  function updatePoster(id, payload) {
    API.put("/api/admin/posters/" + id, payload)
      .then(function () {
        loadPosters();
      })
      .catch(function (err) {
        alert(err.message || "Gagal menyimpan poster.");
        loadPosters();
      });
  }

  function deletePoster(id) {
    if (!confirm("Hapus poster ini? Berkas gambar juga akan dihapus.")) return;
    API.del("/api/admin/posters/" + id)
      .then(function () {
        loadPosters();
      })
      .catch(function (err) {
        alert(err.message || "Gagal menghapus poster.");
      });
  }

  function initPosterForm() {
    var fileInput = $("posterFile");
    fileInput.addEventListener("change", function () {
      var f = fileInput.files[0];
      if (!f) {
        $("posterPreview").hidden = true;
        return;
      }
      var url = URL.createObjectURL(f);
      $("posterPreviewImg").src = url;
      $("posterPreview").hidden = false;
    });

    $("posterUploadForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("posterMsg");
      var btn = $("posterSubmit");
      var f = fileInput.files[0];
      if (!f) {
        setMsg(msg, "Pilih berkas gambar terlebih dahulu.", true);
        return;
      }
      btn.disabled = true;
      btn.textContent = "Mengunggah…";
      setMsg(msg, "");

      var fd = new FormData();
      fd.append("file", f);
      fd.append("title", $("posterTitle").value.trim());
      fd.append("alt_text", $("posterTitle").value.trim());
      var sid = $("posterService").value;
      if (sid) fd.append("service_id", sid);

      API.post("/api/admin/posters", fd, true)
        .then(function () {
          $("posterUploadForm").reset();
          $("posterPreview").hidden = true;
          setMsg(msg, "Poster berhasil diunggah.", false);
          loadPosters();
        })
        .catch(function (err) {
          setMsg(msg, err.message || "Gagal mengunggah poster.", true);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Unggah Poster";
        });
    });
  }

  /* ================= GANTI KATA SANDI ================= */
  function initChangePassword() {
    $("changePasswordForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("pwMsg");
      setMsg(msg, "");
      var cur = $("curPassword").value;
      var nw = $("newPassword").value;
      var cf = $("confirmPassword").value;

      if (nw.length < 8) {
        setMsg(msg, "Kata sandi baru minimal 8 karakter.", true);
        return;
      }
      if (nw !== cf) {
        setMsg(msg, "Konfirmasi kata sandi tidak cocok.", true);
        return;
      }

      API.post("/api/auth/change-password", {
        currentPassword: cur,
        newPassword: nw,
      })
        .then(function () {
          setMsg(msg, "Kata sandi berhasil diperbarui.", false);
          $("changePasswordForm").reset();
          $("mustChangeNotice").hidden = true;
          if (SESSION && SESSION.admin) SESSION.admin.mustChangePassword = false;
        })
        .catch(function (err) {
          setMsg(msg, err.message, true);
        });
    });
  }

  /* ================= INIT ================= */
  function init() {
    if (!API) return;
    initTabs();
    initLogin();
    initLogout();
    initProfile();
    initServiceForm();
    initPosterForm();
    initChangePassword();

    API.get("/api/auth/me")
      .then(function (res) {
        if (res && res.authenticated) {
          SESSION = res;
          showDashboard();
          loadProfile();
          var hash = (window.location.hash || "").replace("#", "");
          if (hash === "change-password") activateTab("akun");
          else if (hash) activateTab(hash);
          else activateTab("profil");
        } else {
          showLogin();
        }
      })
      .catch(function () {
        showLogin();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
