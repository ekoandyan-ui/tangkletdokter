/* ============================================================
 * Halaman beranda: daftar rumah sakit + modal detail diambil dari API.
 * Bila API gagal, tampilkan pesan yang jelas dan data cadangan.
 * ============================================================ */
(function () {
  "use strict";

  var API = window.TangkletAPI;

  // Data cadangan (hanya dipakai bila API tidak bisa dijangkau).
  var FALLBACK = [
    { id: 1, name: "RSUD Sunan Kalijaga", image_url: "/images/rsud_suka.jpg" },
    { id: 2, name: "RSUD Sultan Fatah", image_url: "/images/rsud_sulfat.jpeg" },
    { id: 3, name: "RSI Nahdlatul Ulama Demak", image_url: "/images/rsi_nu.jpeg" },
    { id: 4, name: "RS Pelita Anugerah", image_url: "/images/rs_pelita.jpg" },
    { id: 5, name: "RS PKU Muhammadiyah", image_url: "/images/rs_pku.jpg" },
    { id: 6, name: "Charlie Hospital Demak", image_url: "/images/rs_charlie.jpg" },
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function telLink(phone) {
    if (!phone) return "#";
    return "tel:" + String(phone).replace(/[-\s]/g, "");
  }

  /* ---------- Daftar kartu rumah sakit ---------- */
  function renderCards(list, container) {
    container.innerHTML = list
      .map(function (h) {
        return (
          '<div class="rumahsakit-col" data-id="' +
          h.id +
          '">' +
          '  <div class="rs-img-wrap">' +
          '    <img src="' +
          esc(h.image_url) +
          '" alt="' +
          esc(h.name) +
          '">' +
          '    <div class="layer"><h3>' +
          esc(h.name) +
          "</h3></div>" +
          "  </div>" +
          '  <button class="btn-detail-rs" data-id="' +
          h.id +
          '">Detail</button>' +
          "</div>"
        );
      })
      .join("");

    // Pasang event (bukan inline onclick) agar id tidak bocor ke markup.
    Array.prototype.forEach.call(
      container.querySelectorAll(".btn-detail-rs"),
      function (btn) {
        btn.addEventListener("click", function () {
          openDetailRS(btn.getAttribute("data-id"));
        });
      }
    );
  }

  function showError(msg) {
    var el = document.getElementById("rsError");
    if (!el) return;
    el.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> <strong>' +
      esc(msg) +
      "</strong><br>" +
      "Pastikan server aplikasi (backend) sedang berjalan, lalu muat ulang halaman.";
    el.style.display = "block";
  }

  function loadList() {
    var row = document.getElementById("rsRow");
    if (!row || !API) return;

    API.get("/api/public/hospitals")
      .then(function (data) {
        var list = data.hospitals || [];
        if (!list.length) {
          renderCards(FALLBACK, row);
          showError("Data rumah sakit masih kosong di server.");
          return;
        }
        renderCards(list, row);
      })
      .catch(function () {
        renderCards(FALLBACK, row);
        showError("Gagal memuat data rumah sakit dari server.");
      });
  }

  /* ---------- Modal detail ---------- */
  function renderServices(services) {
    var box = document.getElementById("modalServices");
    if (!box) return;
    if (!services || !services.length) {
      box.innerHTML =
        '<p class="modal-empty">Belum ada layanan yang diterbitkan rumah sakit ini.</p>';
      return;
    }
    box.innerHTML =
      '<h4 class="modal-sub-title">Layanan</h4>' +
      '<div class="service-list">' +
      services
        .map(function (s) {
          var meta = [];
          if (s.schedule) meta.push("<span><i class='far fa-clock'></i> " + esc(s.schedule) + "</span>");
          if (s.contact) meta.push("<span><i class='fas fa-phone'></i> <a href='" + telLink(s.contact) + "'>" + esc(s.contact) + "</a></span>");
          return (
            '<div class="service-item">' +
            "  <div class='service-name'>" +
            esc(s.name) +
            "</div>" +
            (s.description ? "<div class='service-desc'>" + esc(s.description) + "</div>" : "") +
            (meta.length ? "<div class='service-meta'>" + meta.join("") + "</div>" : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  }

  function setSlider(posters) {
    var sliderContainer = document.querySelector(".modal-slider");
    var dotsContainer = document.getElementById("sliderDots");
    if (!sliderContainer || !dotsContainer) return;

    sliderContainer.innerHTML = "";
    dotsContainer.innerHTML = "";

    if (!posters || !posters.length) {
      sliderContainer.innerHTML =
        '<div class="modal-slide active"><img src="images/layanan.jpg" alt="Poster Layanan"></div>';
      return;
    }

    posters.forEach(function (p, index) {
      var slideDiv = document.createElement("div");
      slideDiv.className = "modal-slide" + (index === 0 ? " active" : "");
      var img = document.createElement("img");
      img.src = p.file_url;
      img.alt = p.alt_text || p.title || "Poster Layanan " + (index + 1);
      img.onerror = function () {
        this.src = "images/layanan.jpg";
      };
      slideDiv.appendChild(img);
      sliderContainer.appendChild(slideDiv);

      var dotSpan = document.createElement("span");
      dotSpan.className = "dot" + (index === 0 ? " active" : "");
      dotSpan.setAttribute("onclick", "goToSlide(" + index + ")");
      dotsContainer.appendChild(dotSpan);
    });

    var prevBtn = document.querySelector(".slider-prev");
    var nextBtn = document.querySelector(".slider-next");
    if (posters.length <= 1) {
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
      dotsContainer.style.display = "none";
    } else {
      if (prevBtn) prevBtn.style.display = "flex";
      if (nextBtn) nextBtn.style.display = "flex";
      dotsContainer.style.display = "flex";
    }
  }

  function fillModal(h) {
    document.getElementById("modalRsName").textContent = h.name;

    var rawatEl = document.getElementById("modalPhoneRawat");
    var igdEl = document.getElementById("modalPhoneIGD");
    rawatEl.textContent = h.phone_rawat_jalan || "-";
    rawatEl.href = telLink(h.phone_rawat_jalan);
    igdEl.textContent = h.phone_igd || "-";
    igdEl.href = telLink(h.phone_igd);

    setSlider(h.posters || []);
    renderServices(h.services || []);

    currentSlide = 0;
    slides = document.querySelectorAll(".modal-slide");
    dots = document.querySelectorAll(".dot");
    updateSlider();

    var modal = document.getElementById("modalDetailRS");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function fillModalError() {
    document.getElementById("modalRsName").textContent = "Gagal memuat data";
    var box = document.getElementById("modalServices");
    if (box) {
      box.innerHTML =
        '<p class="modal-empty error"><i class="fas fa-exclamation-triangle"></i> ' +
        "Data rumah sakit tidak dapat dimuat dari server. Pastikan backend berjalan, lalu muat ulang halaman.</p>";
    }
    var slider = document.querySelector(".modal-slider");
    if (slider) {
      slider.innerHTML = '<div class="modal-slide active"><img src="images/layanan.jpg" alt="Poster Layanan"></div>';
    }
    var rawatEl = document.getElementById("modalPhoneRawat");
    var igdEl = document.getElementById("modalPhoneIGD");
    if (rawatEl) { rawatEl.textContent = "-"; rawatEl.href = "#"; }
    if (igdEl) { igdEl.textContent = "-"; igdEl.href = "#"; }

    currentSlide = 0;
    slides = document.querySelectorAll(".modal-slide");
    dots = document.querySelectorAll(".dot");
    updateSlider();

    var modal = document.getElementById("modalDetailRS");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  // Dipakai dari markup & handler kartu: terima id rumah sakit.
  window.openDetailRS = function (id) {
    var numId = parseInt(id, 10);
    if (!numId || !API) return;
    API.get("/api/public/hospitals/" + numId)
      .then(function (data) {
        if (data && data.hospital) fillModal(data.hospital);
        else fillModalError();
      })
      .catch(function () {
        fillModalError();
      });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadList);
  } else {
    loadList();
  }
})();
