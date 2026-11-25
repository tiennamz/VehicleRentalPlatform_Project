/* VRP-GO – Shared Vehicle Search/Filter/Sort API client & Detail Modal */
(function () {
  var API_BASE = (window.VRP_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
  var DEFAULT_COORDS = { lat: 16.0678, lng: 108.2208, label: "Mặc định: Trung tâm Đà Nẵng" };
  var FALLBACK_IMG = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=80";
  var moneyFmt = new Intl.NumberFormat("vi-VN");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(amount) {
    if (amount == null || isNaN(Number(amount))) return "Liên hệ";
    return moneyFmt.format(Math.round(Number(amount))) + "đ";
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    var toRad = function (deg) { return (deg * Math.PI) / 180; };
    var R = 6371.0;
    var dPhi = toRad(lat2 - lat1);
    var dLambda = toRad(lon2 - lon1);
    var a =
      Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
  }

  function buildVehiclesQuery(filters) {
    var f = filters || {};
    var qs = new URLSearchParams();

    (f.types || []).forEach(function (t) { if (t) qs.append("vehicle_type", t); });
    (f.brands || []).forEach(function (b) { if (b) qs.append("brand", b); });
    (f.deliveries || []).forEach(function (d) { if (d) qs.append("delivery_method", d); });

    if (f.price === "under-200") {
      qs.set("max_price", "199999");
    } else if (f.price === "200-400") {
      qs.set("min_price", "200000");
      qs.set("max_price", "400000");
    } else if (f.price === "over-400") {
      qs.set("min_price", "400001");
    } else {
      if (f.minPrice != null && f.minPrice !== "") qs.set("min_price", String(f.minPrice));
      if (f.maxPrice != null && f.maxPrice !== "") qs.set("max_price", String(f.maxPrice));
    }

    if (f.minRating && Number(f.minRating) > 0) {
      qs.set("min_rating", String(f.minRating));
    }
    if (f.city) {
      qs.set("city", String(f.city));
    }
    if (f.sort && f.sort !== "default") {
      qs.set("sort_by", String(f.sort));
    }
    if (f.userLat != null && f.userLng != null) {
      qs.set("user_lat", String(f.userLat));
      qs.set("user_lng", String(f.userLng));
    }
    if (f.startTime && f.endTime && f.startTime < f.endTime) {
      qs.set("start_time", f.startTime);
      qs.set("end_time", f.endTime);
    }

    return qs.toString();
  }

  async function fetchVehicles(filters, timeoutMs) {
    var query = buildVehiclesQuery(filters);
    var url = API_BASE + "/vehicles" + (query ? "?" + query : "");
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 2200) : null;

    try {
      var res = await fetch(url, {
        signal: controller ? controller.signal : undefined
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error("API status " + res.status);
      var json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    } catch (err) {
      if (timer) clearTimeout(timer);
      throw err;
    }
  }

  function normalizeVehicleForStorage(v) {
    if (!v) return null;
    var fullName = v.name || [v.brand, v.model].filter(Boolean).join(" ").trim() || v.brand || "Xe thuê";
    var priceStr = typeof v.price === "string" && v.price
      ? v.price
      : (v.price_per_day != null ? formatPrice(v.price_per_day) : "Liên hệ");
    var locationStr = v.location || v.store_address || v.city_name || "Đà Nẵng";
    var ratingStr = v.rating != null ? Number(v.rating).toFixed(1) : "4.8";
    var reviewsNum = v.reviews != null ? v.reviews : (v.review_count || 0);
    var ccStr = v.cc || (v.engine_capacity ? (v.engine_capacity + "cc") : (/điện/i.test(v.type || "") ? "Điện" : "125cc"));

    return {
      vehicle_id: v.vehicle_id || null,
      name: fullName,
      brand: v.brand || "",
      model: v.model || "",
      type: v.type || "Xe máy",
      specType: v.specType || v.type || "Xe máy",
      label: v.label || String(v.type || "XE MÁY").toUpperCase(),
      rating: ratingStr,
      reviews: reviewsNum,
      location: locationStr,
      store_name: v.store_name || "",
      distance_km: v.distance_km != null ? Number(v.distance_km) : null,
      delivery_methods: Array.isArray(v.delivery_methods) ? v.delivery_methods : [],
      price: priceStr,
      price_per_day: v.price_per_day != null ? Number(v.price_per_day) : (Number(String(priceStr).replace(/[^\d]/g, "")) || 0),
      image: v.image || v.image_url || FALLBACK_IMG,
      cc: ccStr,
      year: v.year || (v.manufacture_year ? String(v.manufacture_year) : "2024"),
      plate: v.plate || v.license_plate || "43A1-000.00",
      description: v.description || ""
    };
  }

  function saveSelectedVehicle(vehicle, extra) {
    var c = normalizeVehicleForStorage(vehicle);
    if (!c) return null;
    try {
      sessionStorage.setItem("vrpSelectedVehicle", JSON.stringify(c));
      sessionStorage.setItem("selectedVehicleName", c.name);
      sessionStorage.setItem("selectedVehicleImage", c.image);
      sessionStorage.setItem("selectedVehiclePrice", c.price);
      sessionStorage.setItem("selectedVehicleType", c.type);
      sessionStorage.setItem("selectedVehicleRating", "★ " + c.rating + (c.reviews ? " (" + c.reviews + ")" : "") + " · " + c.location);
      sessionStorage.setItem("selectedVehicleSpecs", "★ " + c.rating + " · " + c.location);
      if (extra && extra.date) sessionStorage.setItem("selectedVehicleDate", extra.date);
      if (extra && extra.hour) sessionStorage.setItem("selectedVehicleHour", extra.hour);
    } catch (e) { /* bỏ qua khi trình duyệt chặn storage */ }
    return c;
  }

  function ensureModalStyle() {
    if (document.getElementById("vrpVehiclePreviewStyle")) return;
    var st = document.createElement("style");
    st.id = "vrpVehiclePreviewStyle";
    st.textContent =
      ".vrp-vp-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999;animation:vrpFadeIn .18s ease}" +
      "@keyframes vrpFadeIn{from{opacity:0}to{opacity:1}}" +
      ".vrp-vp-dialog{background:#fff;border-radius:18px;max-width:560px;width:100%;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.28);position:relative;font-family:inherit}" +
      ".vrp-vp-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(15,23,42,.65);color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
      ".vrp-vp-img{width:100%;height:230px;object-fit:cover;display:block;background:#f1f5f9}" +
      ".vrp-vp-body{padding:20px 22px 22px}" +
      ".vrp-vp-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#079b70;background:#e6f7f1;padding:4px 10px;border-radius:999px;margin-bottom:8px}" +
      ".vrp-vp-title{margin:0 0 6px;font-size:21px;font-weight:800;color:#0f172a}" +
      ".vrp-vp-meta{font-size:13.5px;color:#475569;margin-bottom:10px}" +
      ".vrp-vp-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}" +
      ".vrp-vp-tag{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px;background:#f1f5f4;color:#334155}" +
      ".vrp-vp-tag.is-home{background:#e6f7f1;color:#0d4a38}" +
      ".vrp-vp-specs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px}" +
      ".vrp-vp-spec{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;font-size:12.5px;color:#64748b}" +
      ".vrp-vp-spec strong{display:block;color:#0f172a;font-size:13.5px;margin-top:2px}" +
      ".vrp-vp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;border-top:1px solid #e2e8f0}" +
      ".vrp-vp-price{font-size:21px;font-weight:800;color:#079b70}" +
      ".vrp-vp-price small{font-size:12.5px;font-weight:500;color:#64748b}" +
      ".vrp-vp-actions{display:flex;gap:8px}";
    document.head.appendChild(st);
  }

  function openVehicleModal(vehicle, extra) {
    var car = normalizeVehicleForStorage(vehicle);
    if (!car) return;
    var existing = document.getElementById("vrpVehiclePreviewModal");
    if (existing) existing.remove();
    ensureModalStyle();

    var qs = "xe=" + encodeURIComponent(car.name);
    if (extra && extra.date) qs += "&date=" + encodeURIComponent(extra.date);
    if (extra && extra.hour) qs += "&hour=" + encodeURIComponent(extra.hour);
    var rentHref = "weekly-vehicle-schedule.html?" + qs;

    var distText = car.distance_km != null && isFinite(car.distance_km)
      ? (" · " + Number(car.distance_km).toFixed(1) + " km")
      : "";
    var tagsHtml = (car.delivery_methods || []).map(function (m) {
      var isHome = String(m).toLowerCase().indexOf("tận nơi") !== -1;
      return '<span class="vrp-vp-tag' + (isHome ? " is-home" : "") + '">' + escapeHtml(m) + "</span>";
    }).join("");

    var backdrop = document.createElement("div");
    backdrop.id = "vrpVehiclePreviewModal";
    backdrop.className = "vrp-vp-backdrop";
    backdrop.innerHTML =
      '<div class="vrp-vp-dialog" role="dialog" aria-modal="true">' +
        '<button type="button" class="vrp-vp-close" aria-label="Đóng">&times;</button>' +
        '<img class="vrp-vp-img" src="' + escapeHtml(car.image) + '" alt="' + escapeHtml(car.name) + '">' +
        '<div class="vrp-vp-body">' +
          '<span class="vrp-vp-badge">' + escapeHtml(car.label) + "</span>" +
          '<h3 class="vrp-vp-title">' + escapeHtml(car.name) + "</h3>" +
          '<div class="vrp-vp-meta">★ ' + escapeHtml(car.rating) +
            (car.reviews ? " (" + escapeHtml(car.reviews) + " đánh giá)" : "") +
            " · 📍 " + escapeHtml(car.location) + escapeHtml(distText) +
            ' · <strong style="color:#079b70">Sẵn sàng</strong></div>' +
          (tagsHtml ? '<div class="vrp-vp-tags">' + tagsHtml + "</div>" : "") +
          '<div class="vrp-vp-specs">' +
            '<div class="vrp-vp-spec">Loại xe<strong>' + escapeHtml(car.specType) + "</strong></div>" +
            '<div class="vrp-vp-spec">Động cơ / Phân khối<strong>' + escapeHtml(car.cc) + "</strong></div>" +
            '<div class="vrp-vp-spec">Đời xe<strong>' + escapeHtml(car.year) + "</strong></div>" +
            '<div class="vrp-vp-spec">Biển số tham chiếu<strong>' + escapeHtml(car.plate) + "</strong></div>" +
          "</div>" +
          '<div class="vrp-vp-foot">' +
            '<div class="vrp-vp-price">' + escapeHtml(car.price) + ' <small>/ ngày</small></div>' +
            '<div class="vrp-vp-actions">' +
              '<button type="button" class="btn btn-outline btn-sm vrp-vp-cancel">Đóng</button>' +
              '<a href="' + rentHref + '" class="btn btn-primary btn-sm btn-rent-vrp">Thuê xe</a>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>";

    function closeModal() {
      backdrop.remove();
      document.removeEventListener("keydown", onEsc);
    }
    function onEsc(ev) {
      if (ev.key === "Escape") closeModal();
    }

    backdrop.addEventListener("click", function (ev) {
      if (ev.target === backdrop) closeModal();
    });
    backdrop.querySelector(".vrp-vp-close").addEventListener("click", closeModal);
    backdrop.querySelector(".vrp-vp-cancel").addEventListener("click", closeModal);
    var modalRentBtn = backdrop.querySelector(".btn-rent-vrp");
    if (modalRentBtn) {
      modalRentBtn.addEventListener("click", function () {
        saveSelectedVehicle(car, extra);
      });
    }
    document.addEventListener("keydown", onEsc);
    document.body.appendChild(backdrop);
  }

  window.VRPVehicleAPI = {
    API_BASE: API_BASE,
    DEFAULT_COORDS: DEFAULT_COORDS,
    FALLBACK_IMG: FALLBACK_IMG,
    escapeHtml: escapeHtml,
    formatPrice: formatPrice,
    haversineKm: haversineKm,
    buildVehiclesQuery: buildVehiclesQuery,
    fetchVehicles: fetchVehicles,
    normalizeVehicleForStorage: normalizeVehicleForStorage,
    saveSelectedVehicle: saveSelectedVehicle,
    openVehicleModal: openVehicleModal
  };
})();
