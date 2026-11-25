(function () {
  var KEY = 'vrp_logged_in';
  function logged() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function openProfile() { var p='customer-info.html'; window.location.href = p+'?view=profile'; }
  function apply() {
    var actions = document.querySelector('.header-actions');
    if (actions && logged() && !actions.querySelector('.user-profile')) {
      actions.innerHTML = '<div class="user-profile" id="userProfileBtn" role="button" tabindex="0" title="Tài khoản Vũ Đức"><div class="user-avatar">VU</div><span class="user-name">Vũ Đức</span><span class="user-caret">▾</span></div>';
    }
    var p = document.querySelector('.user-profile');
    if (p && !p.dataset.vrpBound) {
      p.dataset.vrpBound = '1';
      p.addEventListener('click', openProfile);
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter') openProfile(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();

(function () {
  var PAGE = "customer-homepage.html";
  var QUERY = window.location.search;
  var KEYS = ["index.html","sprint-review-report.html","customer-account.html","weekly-vehicle-schedule.html","customer-homepage.html","deposit-payment.html","electronic-receipt.html","complaint-handling.html","create-rental-order.html","faq.html","help-center.html","how-it-works.html","login-register.html","my-orders.html","login-register.html","rental-policy.html","customer-review.html","vehicle-detail.html","vehicle-search.html","store-dashboard.html","store-homepage.html","vehicle-inventory.html","store-rental-orders.html","revenue.html","store-rental-schedule.html","fleet-management.html","store-operations.html","layout-navigation.html","brand-login-register.html","store-registration.html","ui-kit.html","customer-info.html"];
  window.__VRP_PAGE = PAGE;
  window.__VRP_QUERY = QUERY;

  function norm(path) {
    if (!path) return "index.html";
    if (path.slice(-1) === "/") path += "index.html";
    return path.replace(/^\/+/, "");
  }

  function resolve(href) {
    var u;
    try { u = new URL(href, "https://vrp.local/" + PAGE); } catch (e) { return null; }
    if (u.host === "vrp.local") {
      return { key: norm(decodeURIComponent(u.pathname)), search: u.search, hash: u.hash };
    }
    if (u.protocol === "file:" || u.protocol === "about:") {
      var p = decodeURIComponent(u.pathname).replace(/\\/g, "/");
      for (var i = 0; i < KEYS.length; i++) {
        if (p.slice(-KEYS[i].length - 1) === "/" + KEYS[i]) {
          return { key: KEYS[i], search: u.search, hash: u.hash };
        }
      }
    }
    return { external: true, url: u.href };
  }

  window.__vrpGo = function (href, withLoader) {
    if (href == null) return;
    /* Standalone mode (no parent frame): navigate for real so the page loader
       never gets stuck. Keep the animation, just finish the navigation. */
    if (window.parent === window) {
      var __t = String(href), __b = __t.split(/[?#]/)[0];
      if (__b === "homepage.html") __t = "index.html" + __t.slice(__b.length);
      else if (__b === "receipt.html") __t = "electronic-receipt.html" + __t.slice(__b.length);
      else if (__b === "account.html") __t = "customer-account.html" + __t.slice(__b.length);
      else if (__b === "booking.html") __t = "create-rental-order.html" + __t.slice(__b.length);
      else if (__b === "vehicles.html") __t = "vehicle-search.html" + __t.slice(__b.length);
      else if (__b === "dashboard.html") __t = "store-dashboard.html" + __t.slice(__b.length);
      else if (__b === "inventory.html") __t = "vehicle-inventory.html" + __t.slice(__b.length);
      window.location.href = __t;
      return;
    }
    var r = resolve(String(href));
    if (!r || r.external) return;
    parent.postMessage({ vrp: "nav", page: r.key, search: r.search, hash: r.hash }, "*");
  };

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    var r = resolve(href);
    if (!r) return;
    if (r.external) { a.target = "_blank"; a.rel = "noopener"; return; }
    if (KEYS.indexOf(r.key) === -1) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (window.parent === window) { window.__vrpGo(r.key + (r.search || "") + (r.hash || "")); return; }
    parent.postMessage({ vrp: "nav", page: r.key, search: r.search, hash: r.hash }, "*");
  }, true);

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || !f.tagName || f.tagName !== "FORM") return;
    var method = (f.getAttribute("method") || "get").toLowerCase();
    if (method !== "get") return;
    var r = resolve(f.getAttribute("action") || PAGE);
    if (!r || r.external || KEYS.indexOf(r.key) === -1) return;
    e.preventDefault();
    var qs = [];
    new FormData(f).forEach(function (value, key) {
      if (value !== "") qs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    });
    var __search = qs.length ? "?" + qs.join("&") : "";
    if (window.parent === window) { window.__vrpGo(r.key + __search + (r.hash || "")); return; }
    parent.postMessage({
      vrp: "nav",
      page: r.key,
      search: __search,
      hash: r.hash
    }, "*");
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    var target = "";
    if (!target) return;
    try {
      var el = document.querySelector(target);
      if (el) el.scrollIntoView();
    } catch (err) { /* no-op */ }
  });
})();

// Chuyển ảnh banner
const slides = document.querySelectorAll(".hero-slider img");

let currentSlide = 0;

function changeSlide() {
    if (!slides.length) return;

    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add("active");
}

// Tự động chuyển ảnh sau mỗi 4 giây
if (slides.length > 1) {
    setInterval(changeSlide, 4000);
}

// FR-12 và FR-13: Lọc và sắp xếp xe (kết nối GET /vehicles + fallback cục bộ)
const vehicleSection = document.querySelector(".vehicles");

if (vehicleSection) {
    const api = window.VRPVehicleAPI;
    const filterSidebar = vehicleSection.querySelector(".filter-sidebar");
    const filterToggle = vehicleSection.querySelector(".mobile-filter-toggle");
    const filterOverlay = vehicleSection.querySelector(".filter-overlay");
    const resetButton = vehicleSection.querySelector(".btn-reset");
    const sortSelect = vehicleSection.querySelector("#vehicle-sort");
    const vehicleGrid = vehicleSection.querySelector(".vehicle-grid");
    const emptyMessage = vehicleSection.querySelector(".vehicle-empty");

    const originalCards = Array.from(
        vehicleGrid.querySelectorAll(".vehicle-card")
    );

    let userCoords = api ? { lat: api.DEFAULT_COORDS.lat, lng: api.DEFAULT_COORDS.lng } : { lat: 16.0678, lng: 108.2208 };
    let apiMode = null;
    let apiVehicleMap = Object.create(null);
    let activeReqId = 0;

    function haversineKm(lat1, lon1, lat2, lon2) {
        if (api) return api.haversineKm(lat1, lon1, lat2, lon2);
        const toRad = deg => (deg * Math.PI) / 180;
        const R = 6371.0;
        const dPhi = toRad(lat2 - lat1);
        const dLambda = toRad(lon2 - lon1);
        const a =
            Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
        return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
    }

    // Lấy thông tin xe từ thẻ cục bộ
    function getCardData(card) {
        const typeText = card.querySelector(".vehicle-type")?.textContent.trim().toLowerCase() || "";
        const title = card.querySelector(".vehicle-title h3")?.textContent.trim().toLowerCase() || "";
        const specs = card.querySelector(".vehicle-specs")?.textContent.toLowerCase() || "";
        const ratingText = card.querySelector(".rating")?.textContent || "";
        const priceText = card.querySelector(".vehicle-price")?.textContent || "";

        const place = specs.includes("hà nội") ? "ha-noi"
            : specs.includes("tp.hcm") ? "hcm"
                : specs.includes("đà nẵng") ? "da-nang"
                    : specs.includes("vũng tàu") ? "vung-tau" : "";

        let type = "xe-may";
        if (typeText.includes("ô tô")) {
            type = "o-to";
        } else if (typeText.includes("xe điện")) {
            type = "xe-dien";
        }

        const brand = title.includes("honda") ? "honda"
            : title.includes("yamaha") ? "yamaha"
                : title.includes("vinfast") ? "vinfast" : "";

        const lat = card.dataset.lat !== undefined && card.dataset.lat !== "" ? Number(card.dataset.lat) : NaN;
        const lng = card.dataset.lng !== undefined && card.dataset.lng !== "" ? Number(card.dataset.lng) : NaN;
        const distance = Number.isFinite(lat) && Number.isFinite(lng)
            ? haversineKm(userCoords.lat, userCoords.lng, lat, lng)
            : Infinity;

        return {
            type: type,
            brand: brand,
            place: place,
            price: Number(priceText.replace(/[^0-9]/g, "")) || 0,
            rating: Number((ratingText.match(/[0-9]+(?:[.,][0-9]+)?/) || ["0"])[0].replace(",", ".")),
            delivery: (card.dataset.delivery || "").split(","),
            distance: distance
        };
    }

    function selectedValues(name) {
        return Array.from(
            vehicleSection.querySelectorAll(`input[name="${name}"]:checked`)
        ).map(input => input.value);
    }

    function getFilterPayload() {
        const places = selectedValues("place");
        const placeMap = { "da-nang": "Đà Nẵng", "vung-tau": "Vũng Tàu", "ha-noi": "Hà Nội", "hcm": "TP.HCM" };
        return {
            types: selectedValues("type"),
            brands: selectedValues("brand"),
            deliveries: selectedValues("delivery"),
            price: vehicleSection.querySelector('input[name="price"]:checked')?.value || "",
            minRating: Number(vehicleSection.querySelector('input[name="rating-filter"]:checked')?.value || 0),
            city: places.length === 1 ? (placeMap[places[0]] || places[0]) : "",
            sort: sortSelect ? sortSelect.value : "default",
            userLat: userCoords.lat,
            userLng: userCoords.lng
        };
    }

    function renderApiVehicles(items) {
        apiVehicleMap = Object.create(null);
        const esc = api.escapeHtml;
        vehicleGrid.innerHTML = items.map(v => {
            apiVehicleMap[String(v.vehicle_id)] = v;
            const fullName = [v.brand, v.model].filter(Boolean).join(" ").trim() || v.brand;
            const ratingStr = Number(v.rating || 0).toFixed(1);
            const countPart = v.review_count ? ` (${v.review_count})` : "";
            const locText = v.store_address || v.city_name || "Đà Nẵng";
            const distPart = v.distance_km != null ? ` · ${Number(v.distance_km).toFixed(1)} km` : "";
            const deliveryPart = (v.delivery_methods || []).length ? ` · ${v.delivery_methods.join(" / ")}` : "";
            const imgUrl = v.image_url || api.FALLBACK_IMG;
            const priceStr = api.formatPrice(v.price_per_day);
            return `
              <article class="vehicle-card" data-vehicle-id="${esc(v.vehicle_id)}">
                <div class="vehicle-image">
                  <img src="${esc(imgUrl)}" alt="${esc(fullName)}">
                  <button type="button" class="favorite-btn" aria-label="Yêu thích">♡</button>
                </div>
                <div class="vehicle-info">
                  <p class="vehicle-type">${esc(v.type)}</p>
                  <div class="vehicle-title">
                    <h3>${esc(fullName)}</h3>
                    <span class="rating">★ ${ratingStr}${countPart}</span>
                  </div>
                  <p class="vehicle-specs">${esc(locText)}${esc(distPart)}${esc(deliveryPart)}</p>
                  <div class="vehicle-card-bottom">
                    <p class="vehicle-price">${esc(priceStr)} <span>/ ngày</span></p>
                    <div class="vehicle-actions">
                      <a href="#chi-tiet-xe" class="btn btn-outline btn-detail-vrp" style="padding:8px 12px;font-size:12.5px">Chi tiết</a>
                      <a href="weekly-vehicle-schedule.html?xe=${encodeURIComponent(fullName)}" class="btn btn-rent">Thuê xe</a>
                    </div>
                  </div>
                </div>
              </article>`;
        }).join("");
        emptyMessage.hidden = items.length > 0;
    }

    function filterLocalVehicles() {
        const types = selectedValues("type");
        const places = selectedValues("place");
        const brands = selectedValues("brand");
        const deliveries = selectedValues("delivery");
        const price = vehicleSection.querySelector('input[name="price"]:checked')?.value || "";
        const minRating = Number(
            vehicleSection.querySelector('input[name="rating-filter"]:checked')?.value || 0
        );

        let visibleCount = 0;

        originalCards.forEach(card => {
            const data = getCardData(card);
            let matches = true;

            if (types.length && !types.includes(data.type)) matches = false;
            if (places.length && !places.includes(data.place)) matches = false;
            if (brands.length && !brands.includes(data.brand)) matches = false;
            if (deliveries.length && !deliveries.some(value => data.delivery.includes(value))) matches = false;
            if (price === "under-200" && data.price >= 200000) matches = false;
            if (price === "200-400" && (data.price < 200000 || data.price > 400000)) matches = false;
            if (price === "over-400" && data.price <= 400000) matches = false;
            if (minRating && data.rating < minRating) matches = false;

            card.hidden = !matches;
            if (matches) visibleCount++;
        });

        emptyMessage.hidden = visibleCount > 0;
        sortLocalVehicles();
    }

    function sortLocalVehicles() {
        const sortType = sortSelect.value;
        const visibleCards = originalCards.filter(card => !card.hidden);
        const hiddenCards = originalCards.filter(card => card.hidden);

        if (sortType === "price-asc") {
            visibleCards.sort((a, b) => getCardData(a).price - getCardData(b).price);
        } else if (sortType === "price-desc") {
            visibleCards.sort((a, b) => getCardData(b).price - getCardData(a).price);
        } else if (sortType === "rating-desc") {
            visibleCards.sort((a, b) => getCardData(b).rating - getCardData(a).rating);
        } else if (sortType === "distance-asc") {
            visibleCards.sort((a, b) => getCardData(a).distance - getCardData(b).distance);
        }

        const ordered = sortType === "default" ? originalCards : [...visibleCards, ...hiddenCards];
        ordered.forEach(card => {
            const specsEl = card.querySelector(".vehicle-specs");
            if (specsEl) {
                const baseSpecs = specsEl.dataset.baseSpecs || specsEl.textContent.replace(/\s*·\s*[0-9]+(?:\.[0-9]+)?\s*km$/, "");
                specsEl.dataset.baseSpecs = baseSpecs;
                const d = getCardData(card).distance;
                specsEl.textContent = Number.isFinite(d) ? `${baseSpecs} · ${d.toFixed(1)} km` : baseSpecs;
            }
            vehicleGrid.appendChild(card);
        });
    }

    async function filterVehicles() {
        if (!api || apiMode === false) {
            filterLocalVehicles();
            return;
        }
        const reqId = ++activeReqId;
        try {
            const items = await api.fetchVehicles(getFilterPayload(), 2200);
            if (reqId !== activeReqId) return;
            if (apiMode === null && items.length === 0) {
                apiMode = false;
                filterLocalVehicles();
                return;
            }
            apiMode = true;
            renderApiVehicles(items);
        } catch (err) {
            if (reqId !== activeReqId) return;
            if (apiMode === null) apiMode = false;
            filterLocalVehicles();
        }
    }

    function sortVehicles() {
        if (apiMode === true) {
            filterVehicles();
        } else {
            sortLocalVehicles();
        }
    }

    vehicleGrid.addEventListener("click", function (event) {
        const detailBtn = event.target.closest(".btn-detail-vrp");
        if (detailBtn && api) {
            event.preventDefault();
            const card = detailBtn.closest(".vehicle-card");
            const v = card && card.dataset.vehicleId ? apiVehicleMap[card.dataset.vehicleId] : null;
            if (v) {
                api.saveSelectedVehicle(v);
                api.openVehicleModal(v);
            }
            return;
        }
        const rentBtn = event.target.closest(".btn-rent");
        if (rentBtn && api) {
            const card = rentBtn.closest(".vehicle-card");
            const v = card && card.dataset.vehicleId ? apiVehicleMap[card.dataset.vehicleId] : null;
            if (v) api.saveSelectedVehicle(v);
        }
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                sortVehicles();
            },
            () => { /* giữ tọa độ mặc định trung tâm Đà Nẵng */ },
            { enableHighAccuracy: false, timeout: 4000 }
        );
    }

    // Đặt lại bộ lọc
    function resetFilters() {
        vehicleSection.querySelectorAll(".filter-sidebar input").forEach(input => {
            input.checked = false;
        });
        sortSelect.value = "default";
        filterVehicles();
    }

    // Đóng Bottom Sheet
    function closeFilterSheet() {
        filterSidebar.classList.remove("is-open");
        filterOverlay.classList.remove("is-visible");
        document.body.classList.remove("filter-open");
        filterToggle.setAttribute("aria-expanded", "false");
    }

    filterToggle.addEventListener("click", () => {
        filterSidebar.classList.add("is-open");
        filterOverlay.classList.add("is-visible");
        document.body.classList.add("filter-open");
        filterToggle.setAttribute("aria-expanded", "true");
    });

    filterOverlay.addEventListener("click", closeFilterSheet);
    resetButton.addEventListener("click", resetFilters);
    vehicleSection.querySelectorAll(".filter-sidebar input").forEach(input => {
        input.addEventListener("change", filterVehicles);
    });
    sortSelect.addEventListener("change", sortVehicles);

    filterLocalVehicles();
    filterVehicles();
}


// Lưu thông tin xe khi khách bấm Đặt cọc
document.querySelectorAll(".btn-deposit").forEach(function (button) {
    button.addEventListener("click", function (event) {
        event.preventDefault();

        const vehicleCard = button.closest(".vehicle-card");

        const vehicleName = vehicleCard.querySelector(".vehicle-title h3").textContent.trim();
        const vehicleType = vehicleCard.querySelector(".vehicle-type").textContent.trim();
        const vehicleRating = vehicleCard.querySelector(".rating").textContent.trim();
        const vehicleSpecs = vehicleCard.querySelector(".vehicle-specs").textContent.trim();
        const vehiclePrice = vehicleCard.querySelector(".vehicle-price").textContent.trim();
        const vehicleImage = vehicleCard.querySelector(".vehicle-image img").src;

        sessionStorage.setItem("selectedVehicleName", vehicleName);
        sessionStorage.setItem("selectedVehicleType", vehicleType);
        sessionStorage.setItem("selectedVehicleRating", vehicleRating);
        sessionStorage.setItem("selectedVehicleSpecs", vehicleSpecs);
        sessionStorage.setItem("selectedVehiclePrice", vehiclePrice);
        sessionStorage.setItem("selectedVehicleImage", vehicleImage);

        if (window.motogoNavigate) { window.motogoNavigate(button.href); } else { window.__vrpGo(button.href); }
    });
});

/* VRP-GO – click X+ring, hero slideshow, page fade */

/* ---- Click: X + vòng tròn (bỏ cursor theo chuột) ---- */
(function () {
  document.addEventListener("click", function (e) {
    // Không tạo burst khi click vào input/select để khỏi che
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;

    const burst = document.createElement("div");
    burst.className = "click-burst";
    burst.style.left = e.clientX + "px";
    burst.style.top = e.clientY + "px";
    burst.innerHTML = '<span class="burst-ring"></span><span class="burst-ring-2"></span><span class="burst-x"></span>';
    document.body.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 700);
  }, true);
})();

/* ---- Hero slideshow ---- */
(function () {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  if (!slides.length) return;

  let current = 0;
  let timer = null;
  const INTERVAL = 4000;

  function goTo(index) {
    slides[current].classList.remove("active");
    if (dots[current]) dots[current].classList.remove("active");
    current = (index + slides.length) % slides.length;
    slides[current].classList.add("active");
    if (dots[current]) dots[current].classList.add("active");
  }

  function next() { goTo(current + 1); }
  function start() {
    stop();
    timer = setInterval(next, INTERVAL);
  }
  function stop() {
    if (timer) clearInterval(timer);
  }

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      goTo(Number(dot.dataset.index));
      start();
    });
  });

  const visual = document.querySelector(".hero-visual");
  if (visual) {
    visual.addEventListener("mouseenter", stop);
    visual.addEventListener("mouseleave", start);
  }
  start();
})();

/* ---- Page loader: chỉ khi bấm menu header ---- */
(function () {
  const loader = document.createElement("div");
  loader.className = "page-loader";
  loader.innerHTML =
    '<div class="page-loader-stage">' +
      '<div class="page-loader-ring"></div>' +
      '<div class="page-loader-bike" aria-hidden="true">🏍️</div>' +
    '</div>' +
    '<div class="page-loader-text">Đang chuyển trang<span class="page-loader-dots"></span></div>' +
    '<div class="page-loader-sub">VRP-GO</div>';
  document.body.appendChild(loader);

  function isInternalLink(a) {
    if (!a) return false;
    const href = a.getAttribute("href");
    if (!href) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
    try {
      const url = new URL(href, window.location.href);
      if (window.location.protocol === "file:") return true;
      return url.origin === window.location.origin;
    } catch (err) {
      return href.indexOf("http") !== 0;
    }
  }

  /** Chỉ loading khi click logo hoặc link trong .nav-list (header) */
  function isHeaderNavLink(a) {
    if (!a) return false;
    if (a.classList.contains("logo") || a.closest(".logo")) return true;
    if (a.closest(".nav-list")) return true;
    return false;
  }

  window.motogoNavigate = function (href, withLoader) {
    if (!href || document.body.classList.contains("is-leaving")) return;
    if (withLoader) {
      document.body.classList.add("is-leaving");
      loader.classList.add("active");
      setTimeout(function () {
        window.__vrpGo(href);
      }, 1000);
    } else {
      window.__vrpGo(href);
    }
  };

  document.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;
    const a = e.target.closest("a");
    if (!isInternalLink(a)) return;
    // Chỉ intercept + loader cho menu header
    if (!isHeaderNavLink(a)) return;
    e.preventDefault();
    window.motogoNavigate(a.href, true);
  }, false);

  window.addEventListener("pageshow", function () {
    document.body.classList.remove("is-leaving");
    loader.classList.remove("active");
  });
})();

/* ---- Toast ---- */
window.showToast = function (msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 2600);
};

/* ---- Trạng thái dữ liệu: đang tải / rỗng / lỗi ----
   Dùng: thêm data-data-area vào vùng danh sách.
   - data-skeleton="cards|rows", data-skeleton-count="4"
   - data-item=".selector" (phần tử dữ liệu để phát hiện rỗng)
   - data-empty-title / data-empty-text / data-empty-icon
   - data-empty="none" nếu trang tự xử lý trạng thái rỗng
   - data-target=".selector" nếu vùng bọc ngoài danh sách
*/
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function makeState(type, opt) {
    const box = document.createElement("div");
    box.className = "data-state is-" + type;
    box.setAttribute("role", type === "error" ? "alert" : "status");

    const icon = document.createElement("div");
    icon.className = "data-state__icon";
    icon.textContent = opt.icon || (type === "error" ? "⚠️" : "🗂️");
    box.appendChild(icon);

    const title = document.createElement("h3");
    title.textContent = opt.title || (type === "error" ? "Không tải được dữ liệu" : "Chưa có dữ liệu");
    box.appendChild(title);

    const text = document.createElement("p");
    text.textContent = opt.text || (type === "error"
      ? "Đã có lỗi khi tải nội dung. Vui lòng thử lại."
      : "Nội dung sẽ hiển thị khi có dữ liệu.");
    box.appendChild(text);

    if (opt.retry) {
      const actions = document.createElement("div");
      actions.className = "data-state__actions";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-primary";
      button.textContent = "Thử lại";
      button.dataset.retry = "true";
      actions.appendChild(button);
      box.appendChild(actions);
    }
    return box;
  }

  function makeLoading(area) {
    const wrap = document.createElement("div");
    wrap.className = "data-loading";
    wrap.setAttribute("aria-busy", "true");

    const label = document.createElement("div");
    label.className = "data-loading__label";
    label.textContent = area.dataset.loadingText || "Đang tải dữ liệu...";
    wrap.appendChild(label);

    const count = Number(area.dataset.skeletonCount) || 4;
    const kind = area.dataset.skeleton === "rows" ? "rows" : "cards";
    const grid = document.createElement("div");
    grid.className = kind === "rows" ? "skeleton-rows" : "skeleton-grid";

    for (let i = 0; i < count; i++) {
      if (kind === "rows") {
        const row = document.createElement("div");
        row.className = "skeleton-row";
        row.innerHTML =
          '<span class="skeleton skeleton-row__thumb"></span>' +
          '<span class="skeleton-row__main">' +
            '<span class="skeleton skeleton-line is-60"></span>' +
            '<span class="skeleton skeleton-line is-40"></span>' +
          '</span>' +
          '<span class="skeleton skeleton-row__side"></span>';
        grid.appendChild(row);
      } else {
        const card = document.createElement("div");
        card.className = "skeleton-card";
        card.innerHTML =
          '<div class="skeleton skeleton-card__img"></div>' +
          '<div class="skeleton-card__body">' +
            '<div class="skeleton skeleton-line is-60"></div>' +
            '<div class="skeleton skeleton-line"></div>' +
            '<div class="skeleton skeleton-line is-40"></div>' +
          '</div>';
        grid.appendChild(card);
      }
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function visibleItems(area) {
    const selector = area.dataset.item;
    if (!selector) return [];
    return Array.prototype.filter.call(area.querySelectorAll(selector), function (el) {
      return !el.hidden && el.style.display !== "none";
    });
  }

  function setTargetVisible(ctrl, visible) {
    ctrl.target.style.display = visible ? "" : "none";
  }

  function clearHost(ctrl) {
    ctrl.host.innerHTML = "";
    ctrl.host.hidden = true;
  }

  function showEmpty(ctrl) {
    if (ctrl.area.dataset.empty === "none") return;
    clearHost(ctrl);
    ctrl.host.appendChild(makeState("empty", {
      icon: ctrl.area.dataset.emptyIcon,
      title: ctrl.area.dataset.emptyTitle,
      text: ctrl.area.dataset.emptyText
    }));
    ctrl.host.hidden = false;
    setTargetVisible(ctrl, false);
  }

  function refresh(area) {
    const ctrl = area.__vrpState;
    if (!ctrl || !ctrl.ready) return;

    if (ctrl.area.dataset.empty === "none") {
      clearHost(ctrl);
      setTargetVisible(ctrl, true);
      return;
    }

    if (visibleItems(ctrl.area).length === 0) {
      showEmpty(ctrl);
    } else {
      clearHost(ctrl);
      setTargetVisible(ctrl, true);
    }
  }

  function showError(area, message) {
    const ctrl = area.__vrpState;
    if (!ctrl) return;
    ctrl.ready = false;
    clearHost(ctrl);
    const box = makeState("error", {
      icon: "⚠️",
      title: ctrl.area.dataset.errorTitle,
      text: message || ctrl.area.dataset.errorText,
      retry: true
    });
    const retry = box.querySelector("[data-retry]");
    if (retry) {
      retry.addEventListener("click", function () { run(ctrl); });
    }
    ctrl.host.appendChild(box);
    ctrl.host.hidden = false;
    setTargetVisible(ctrl, false);
  }

  function run(ctrl) {
    ctrl.ready = false;
    clearHost(ctrl);
    ctrl.host.appendChild(makeLoading(ctrl.area));
    ctrl.host.hidden = false;
    setTargetVisible(ctrl, false);

    const wait = reduceMotion ? 0 : (Number(ctrl.area.dataset.loadMs) || 320);
    setTimeout(function () {
      try {
        clearHost(ctrl);
        ctrl.area.removeAttribute("aria-busy");
        ctrl.ready = true;
        refresh(ctrl.area);
      } catch (err) {
        showError(ctrl.area);
      }
    }, wait);
  }

  function initArea(area) {
    if (area.__vrpState) return;
    const target = area.dataset.target ? area.querySelector(area.dataset.target) : area;
    if (!target) return;

    const host = document.createElement("div");
    host.className = "data-state-host";
    host.hidden = true;
    target.parentNode.insertBefore(host, target);

    area.__vrpState = { area: area, target: target, host: host, ready: false };
    area.setAttribute("aria-busy", "true");

    area.addEventListener("change", function () {
      setTimeout(function () { refresh(area); }, 0);
    });
    area.addEventListener("input", function () {
      setTimeout(function () { refresh(area); }, 0);
    });

    run(area.__vrpState);
  }

  document.querySelectorAll("[data-data-area]").forEach(initArea);

  window.VRPDataState = {
    refresh: function (target) {
      const area = typeof target === "string" ? document.querySelector(target) : target;
      if (!area) return;
      if (!area.__vrpState) { initArea(area); return; }
      refresh(area);
    },
    showEmpty: function (target, opt) {
      const area = typeof target === "string" ? document.querySelector(target) : target;
      const ctrl = area && area.__vrpState;
      if (!ctrl) return;
      if (opt) {
        if (opt.title) ctrl.area.dataset.emptyTitle = opt.title;
        if (opt.text) ctrl.area.dataset.emptyText = opt.text;
        if (opt.icon) ctrl.area.dataset.emptyIcon = opt.icon;
      }
      showEmpty(ctrl);
    },
    showError: function (target, message) {
      const area = typeof target === "string" ? document.querySelector(target) : target;
      if (area) showError(area, message);
    }
  };
})();

/* ---- Ẩn "Đơn của tôi" khi chưa đăng nhập ---- */
(function () {
  const hasSession = /(?:^|;\s*)access_token=/.test(document.cookie);
  if (hasSession) return;
  document.querySelectorAll(".nav-list li a").forEach(function (a) {
    if (a.textContent.trim() === "Đơn của tôi") {
      const li = a.closest("li");
      if (li) li.remove();
    }
  });
})();

/* ---- Phân quyền giao diện cửa hàng + ẩn menu Vận hành ---- */
(function () {
  const ROLE_KEY = "vrp_role";

  function readRole() {
    try {
      const stored = localStorage.getItem(ROLE_KEY);
      if (stored) return stored;
    } catch (err) { /* localStorage có thể bị chặn ở file:// */ }
    const match = document.cookie.match(/(?:^|;\s*)vrp_role=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "guest";
  }

  function saveRole(role) {
    try { localStorage.setItem(ROLE_KEY, role); } catch (err) { /* no-op */ }
    document.cookie = ROLE_KEY + "=" + encodeURIComponent(role) + "; path=/; SameSite=Lax";
  }

  const params = new URLSearchParams(window.__VRP_QUERY || "");
  const roleParam = params.get("role");
  if (roleParam) saveRole(roleParam);

  const role = readRole();
  const canStore = role === "store" || role === "admin";

  // "Cửa hàng" đã bị bỏ khỏi HTML của trang khách; chỉ chèn lại khi có quyền.
  const navList = document.querySelector(".nav-list");
  if (canStore && navList && !navList.querySelector('a[href*="store-dashboard"], a[href*="store-homepage"], a[href*="store/"]')) {
    const homeLink = navList.querySelector('a[href$="index.html"]');
    const prefix = homeLink ? homeLink.getAttribute("href").replace(/index\.html$/, "") : "";
    const li = document.createElement("li");
    li.innerHTML = '<a href="' + prefix + 'store-dashboard.html">Cửa hàng</a>';
    navList.appendChild(li);
  }

  const demoBtn = document.getElementById("demoStoreAccess");
  if (demoBtn) {
    demoBtn.addEventListener("click", function () {
      saveRole("store");
      const url = new URL("https://vrp.local/" + window.__VRP_PAGE);
      url.searchParams.set("role", "store");
      window.__vrpGo(url.toString());
    });
  }
})();

/* VRP-GO – Xe yêu thích dùng chung giữa trang chủ, danh sách xe và hồ sơ */
(function () {
  var STORAGE_KEY = "vrp_favorites";
  var DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120";

  var SEED = [
    {
      id: 1,
      category: "xe-may",
      name: "HONDA VISION 2024",
      transmission: "Xe tay ga",
      seats: "2 chỗ",
      fuel: "Xăng",
      rating: 5.0,
      trips: 1,
      location: "Hải Châu, Đà Nẵng",
      price: "150K",
      period: "/ngày",
      owner: "Hoàng Long",
      ownerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
      image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=600",
      tags: ["Miễn thế chấp"]
    },
    {
      id: 2,
      category: "xe-may",
      name: "YAMAHA JANUS 2023",
      transmission: "Xe tay ga",
      seats: "2 chỗ",
      fuel: "Xăng",
      rating: 4.9,
      trips: 12,
      location: "Mỹ Khê, Đà Nẵng",
      price: "160K",
      period: "/ngày",
      owner: "Minh Thư",
      ownerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
      image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=600",
      tags: ["Miễn thế chấp", "Giao xe tận nơi"]
    },
    {
      id: 3,
      category: "o-to",
      name: "HYUNDAI SANTAFE 2024",
      transmission: "Số tự động",
      seats: "7 chỗ",
      fuel: "Dầu",
      rating: 5.0,
      trips: 40,
      location: "Hải Châu, Đà Nẵng",
      price: "1.350K",
      period: "/ngày",
      owner: "Đức Mạnh",
      ownerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120",
      image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600",
      tags: ["Có tài xế chuyên nghiệp"]
    }
  ];

  function clone(list) {
    return JSON.parse(JSON.stringify(list));
  }

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) { /* bỏ qua lỗi lưu trữ */ }

    var seeded = clone(SEED);
    write(seeded);
    return seeded;
  }

  function write(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) { /* bỏ qua lỗi lưu trữ */ }
  }

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function sameName(a, b) {
    return normalize(a) === normalize(b);
  }

  function slug(value) {
    return normalize(value)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function list() {
    return read();
  }

  function isFav(name) {
    return read().some(function (item) { return sameName(item.name, name); });
  }

  function remove(id) {
    write(read().filter(function (item) { return String(item.id) !== String(id); }));
  }

  function toggle(item) {
    var items = read();
    var index = items.findIndex(function (entry) {
      return entry.id === item.id || sameName(entry.name, item.name);
    });

    if (index !== -1) {
      items.splice(index, 1);
      write(items);
      return false;
    }

    items.push(item);
    write(items);
    return true;
  }

  window.VRPFavorites = {
    list: list,
    toggle: toggle,
    remove: remove,
    isFav: isFav
  };

  function cardToItem(card) {
    var nameEl = card.querySelector("h3");
    if (!nameEl) return null;

    var name = nameEl.textContent.trim();
    var typeEl = card.querySelector(".vehicle-type, .type");
    var typeText = typeEl ? typeEl.textContent.trim() : "";
    var metaEl = card.querySelector(".vehicle-specs, .meta");
    var metaText = metaEl ? metaEl.textContent.trim() : "";
    var priceEl = card.querySelector(".vehicle-price, .price");
    var priceText = priceEl ? priceEl.textContent.trim() : "";
    var ratingEl = card.querySelector(".rating");
    var ratingText = ratingEl ? ratingEl.textContent : metaText;
    var ratingMatch = ratingText.match(/([0-9]+(?:[.,][0-9]+)?)/);
    var rating = ratingMatch ? parseFloat(ratingMatch[1].replace(",", ".")) : 5;
    var parts = metaText.split("·").map(function (part) { return part.trim(); }).filter(Boolean);
    var location = parts.length ? parts[parts.length - 1] : "Đà Nẵng";
    var priceNumber = Number(priceText.replace(/[^0-9]/g, "")) || 0;
    var isCar = /ô tô/i.test(typeText) || /ô tô/i.test(name);

    return {
      id: "fav-" + slug(name),
      category: isCar ? "o-to" : "xe-may",
      name: name,
      transmission: typeText || (isCar ? "Ô tô" : "Xe máy"),
      seats: isCar ? "5 chỗ" : "2 chỗ",
      fuel: /điện/i.test(typeText) ? "Điện" : (isCar ? "Dầu" : "Xăng"),
      rating: rating,
      trips: 0,
      location: location.replace(/^★\s*/, "").trim(),
      price: priceNumber ? Math.round(priceNumber / 1000) + "K" : priceText,
      period: "/ngày",
      owner: "VRP-GO",
      ownerAvatar: DEFAULT_AVATAR,
      image: card.querySelector("img") ? card.querySelector("img").src : "",
      tags: []
    };
  }

  function paintHearts() {
    var items = read();
    document.querySelectorAll(".vehicle-card .favorite-btn").forEach(function (btn) {
      var card = btn.closest(".vehicle-card");
      var nameEl = card ? card.querySelector("h3") : null;
      if (!nameEl) return;

      var active = items.some(function (item) { return sameName(item.name, nameEl.textContent); });
      btn.classList.toggle("is-fav", active);
      btn.textContent = active ? "♥" : "♡";
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute("aria-label", active ? "Bỏ khỏi xe yêu thích" : "Thêm vào xe yêu thích");
    });
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".vehicle-card .favorite-btn");
    if (!btn) return;

    var card = btn.closest(".vehicle-card");
    var item = card ? cardToItem(card) : null;
    if (!item) return;

    event.preventDefault();
    event.stopPropagation();

    var added = toggle(item);
    paintHearts();

    if (window.showToast) {
      window.showToast(added ? "Đã thêm vào Xe yêu thích" : "Đã bỏ khỏi Xe yêu thích");
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paintHearts);
  } else {
    paintHearts();
  }

  window.addEventListener("pageshow", paintHearts);
})();



/* Liên kết giữa các giao diện đã tách */
(function () {
    var MAP = {
        "index.html": "index.html",
        "sprint-review-report.html": "sprint-review-report.html",
        "customer-account.html": "customer-account.html",
        "weekly-vehicle-schedule.html": "weekly-vehicle-schedule.html",
        "customer-homepage.html": "customer-homepage.html",
        "deposit-payment.html": "deposit-payment.html",
        "electronic-receipt.html": "electronic-receipt.html",
        "complaint-handling.html": "complaint-handling.html",
        "create-rental-order.html": "create-rental-order.html",
        "faq.html": "faq.html",
        "help-center.html": "help-center.html",
        "how-it-works.html": "how-it-works.html",
        "login-register.html": "login-register.html",
        "my-orders.html": "my-orders.html",
        "login-register.html": "login-register.html",
        "rental-policy.html": "rental-policy.html",
        "customer-review.html": "customer-review.html",
        "vehicle-detail.html": "vehicle-detail.html",
        "vehicle-search.html": "vehicle-search.html",
        "store-dashboard.html": "store-dashboard.html",
        "store-homepage.html": "store-homepage.html",
        "vehicle-inventory.html": "vehicle-inventory.html",
        "store-rental-orders.html": "store-rental-orders.html",
        "revenue.html": "revenue.html",
        "store-rental-schedule.html": "store-rental-schedule.html",
        "fleet-management.html": "fleet-management.html",
        "store-operations.html": "store-operations.html",
        "layout-navigation.html": "layout-navigation.html",
        "brand-login-register.html": "brand-login-register.html",
        "store-registration.html": "store-registration.html",
        "ui-kit.html": "ui-kit.html",
        "customer-info.html": "customer-info.html"
    };
    var ALIAS = {
    "store-homepage.html": "store-homepage.html",
    "index.html": "index.html",
    "homepage.html": "index.html",
    "how-it-works.html": "how-it-works.html"
};
    var PAGE = "customer-homepage.html";

    function go(key, search, hash) {
        var target = MAP[key];
        if (!target) return false;
        location.href = target + (search || "") + (hash || "");
        return true;
    }

    window.addEventListener("message", function (e) {
        var m = e.data || {};
        if (m.vrp !== "nav" || !m.page) return;
        go(m.page, m.search, m.hash);
    });

    function norm(path) {
        if (!path) return "index.html";
        if (path.slice(-1) === "/") path += "index.html";
        return path.replace(/^\/+/, "");
    }

    function resolveKey(href) {
        var u;
        try { u = new URL(href, "https://vrp.local/" + PAGE); } catch (e) { return null; }
        if (u.host !== "vrp.local") return null;
        return norm(decodeURIComponent(u.pathname));
    }

    /* Script gốc đã xử lý hầu hết link. Đoạn này chỉ bắt mấy link trỏ tới
       tên file cũ/sai trong bản gốc mà script gốc bỏ qua. */
    document.addEventListener("click", function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a") : null;
        if (!a) return;
        if (a.target && a.target !== "_self") return;
        if (a.hasAttribute("download")) return;
        var href = a.getAttribute("href") || "";
        if (!href || href.charAt(0) === "#") return;
        if (/^(mailto:|tel:|javascript:|https?:)/i.test(href)) return;
        var key = resolveKey(href);
        if (!key || MAP[key]) return;
        var alias = ALIAS[key];
        if (!alias) return;
        var u;
        try { u = new URL(href, location.href); } catch (err) { u = null; }
        e.preventDefault();
        e.stopImmediatePropagation();
        go(alias, u && u.search, u && u.hash);
    }, true);
})();
