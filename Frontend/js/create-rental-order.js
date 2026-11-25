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
  var PAGE = "create-rental-order.html";
  var QUERY = window.location.search;
  var KEYS = ["store-dashboard.html","sprint-review-report.html","customer-account.html","weekly-vehicle-schedule.html","customer-homepage.html","deposit-payment.html","electronic-receipt.html","complaint-handling.html","create-rental-order.html","faq.html","help-center.html","how-it-works.html","login-register.html","my-orders.html","login-register.html","rental-policy.html","customer-review.html","vehicle-detail.html","vehicle-search.html","store-dashboard.html","store-homepage.html","vehicle-inventory.html","store-rental-orders.html","revenue.html","store-rental-schedule.html","fleet-management.html","store-operations.html","layout-navigation.html","brand-login-register.html","store-registration.html","ui-kit.html","customer-info.html"];
  window.__VRP_PAGE = PAGE;
  window.__VRP_QUERY = QUERY;

  function norm(path) {
    if (!path) return "store-dashboard.html";
    if (path.slice(-1) === "/") path += "store-dashboard.html";
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
    const homeLink = navList.querySelector('a[href$="store-dashboard.html"]');
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

(function () {
  var API_BASE = (window.VRPVehicleAPI && window.VRPVehicleAPI.API_BASE) || "http://127.0.0.1:8000";
  var DEFAULT_IMG = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=85";
  var DEFAULT_DELIVERY = { baseFee: 30000, feePerKm: 10000, maxRadiusKm: 15 };

  // Đồng hồ đếm ngược giữ chỗ tạm thời (hết giờ sẽ khóa nút Tạo đơn thuê)
  var sec = 10 * 60;
  var isHoldExpired = false;
  var el = document.getElementById("countdown");
  var bar = document.getElementById("hold-bar");
  var totalSec = sec;

  function lockOrderOnHoldExpired() {
    isHoldExpired = true;
    if (el) el.textContent = "00:00";
    if (bar) bar.style.width = "0%";
    var payBtn = document.getElementById("btn-pay");
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = "Hết thời gian giữ chỗ — vui lòng chọn lại lịch";
    }
    var errBox = document.getElementById("orderErrorBox");
    if (errBox) {
      errBox.hidden = false;
      errBox.textContent = "Đã hết thời gian giữ chỗ tạm thời. Vui lòng quay lại chọn lịch thuê mới để tạo đơn.";
    }
  }

  if (el && bar) {
    var holdTimerId = setInterval(function () {
      if (sec <= 0) {
        clearInterval(holdTimerId);
        lockOrderOnHoldExpired();
        return;
      }
      sec--;
      var m = String(Math.floor(sec / 60)).padStart(2, "0");
      var s = String(sec % 60).padStart(2, "0");
      el.textContent = m + ":" + s;
      bar.style.width = (sec / totalSec * 100) + "%";
      if (sec <= 0) {
        clearInterval(holdTimerId);
        lockOrderOnHoldExpired();
      }
    }, 1000);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatVnd(amount) {
    return Math.round(Number(amount) || 0).toLocaleString("vi-VN") + "đ";
  }

  function toDateInputValue(dateObj) {
    return dateObj.getFullYear() + "-" + pad2(dateObj.getMonth() + 1) + "-" + pad2(dateObj.getDate());
  }

  function parsePriceNumber(raw) {
    if (typeof raw === "number" && !isNaN(raw) && raw > 0) return raw;
    var digits = String(raw || "").replace(/\D/g, "");
    var n = parseInt(digits, 10);
    return isNaN(n) || n <= 0 ? 150000 : n;
  }

  function formatDisplayDateTime(dateStr, hourStr) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    if (!m) return (dateStr || "") + " · " + (hourStr || "08:00");
    return m[3] + "/" + m[2] + "/" + m[1] + " · " + (hourStr || "08:00");
  }

  function buildHourOptions(selectEl, defaultHour) {
    if (!selectEl) return;
    var html = "";
    for (var h = 6; h <= 22; h++) {
      var val = pad2(h) + ":00";
      html += '<option value="' + val + '"' + (val === defaultHour ? " selected" : "") + ">" + val + "</option>";
    }
    selectEl.innerHTML = html;
  }

  function calcDepositBr03Local(totalAmount) {
    var total = Math.max(0, Number(totalAmount) || 0);
    if (total <= 0) return 0;
    var raw = Math.round(total * 0.3);
    var bounded = Math.min(Math.max(raw, 200000), 1000000);
    return Math.min(bounded, total);
  }

  function calculateLocalPricing(state) {
    var start = new Date(state.startDate + "T" + state.startHour + ":00");
    var end = new Date(state.endDate + "T" + state.endHour + ":00");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { error: "Thời gian trả xe phải sau thời gian nhận xe." };
    }
    var diffMs = end.getTime() - start.getTime();
    var durationDays = Math.max(1, Math.ceil(diffMs / 86400000));
    var rentalAmount = state.unitPrice * durationDays;
    var deliveryFee = 0;

    if (state.deliveryMethod === "Giao tận nơi") {
      if (!state.deliveryAddress || !state.deliveryAddress.trim()) {
        return { error: "Vui lòng nhập địa chỉ giao xe khi chọn Giao tận nơi." };
      }
      var dist = parseFloat(state.deliveryDistanceKm);
      if (isNaN(dist) || dist <= 0) {
        return { error: "Khoảng cách giao xe phải lớn hơn 0 km." };
      }
      if (dist > DEFAULT_DELIVERY.maxRadiusKm) {
        return { error: "Khoảng cách giao xe vượt quá bán kính tối đa " + DEFAULT_DELIVERY.maxRadiusKm + " km." };
      }
      deliveryFee = Math.round(DEFAULT_DELIVERY.baseFee + dist * DEFAULT_DELIVERY.feePerKm);
    }

    var totalAmount = rentalAmount + deliveryFee;
    var depositAmount = calcDepositBr03Local(totalAmount);
    var remainingAmount = Math.max(0, totalAmount - depositAmount);

    return {
      source: "local",
      duration_days: durationDays,
      unit_price: state.unitPrice,
      rental_amount: rentalAmount,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      deposit_rate: 30,
      deposit_amount: depositAmount,
      remaining_amount: remainingAmount
    };
  }

  var params = new URLSearchParams(window.location.search || window.__VRP_QUERY || "");
  var storedVehicle = null;
  var stored = {};
  try {
    storedVehicle = JSON.parse(sessionStorage.getItem("vrpSelectedVehicle") || "null");
    stored.name = sessionStorage.getItem("selectedVehicleName") || "";
    stored.type = sessionStorage.getItem("selectedVehicleType") || "";
    stored.rating = sessionStorage.getItem("selectedVehicleRating") || "";
    stored.specs = sessionStorage.getItem("selectedVehicleSpecs") || "";
    stored.price = sessionStorage.getItem("selectedVehiclePrice") || "";
    stored.image = sessionStorage.getItem("selectedVehicleImage") || "";
    stored.date = sessionStorage.getItem("selectedVehicleDate") || "";
    stored.hour = sessionStorage.getItem("selectedVehicleHour") || "";
  } catch (err) { /* no-op */ }

  var vehicleId = (storedVehicle && storedVehicle.vehicle_id) || parseInt(params.get("vehicle_id") || "", 10) || null;
  var vehicleName = (params.get("xe") || (storedVehicle && storedVehicle.name) || stored.name || "Honda Vision 2024").trim();
  var vehicleType = (storedVehicle && storedVehicle.vehicle_type) || stored.type || "XE MÁY";
  var vehicleImage = (storedVehicle && storedVehicle.image_url) || stored.image || DEFAULT_IMG;
  var unitPrice = parsePriceNumber((storedVehicle && storedVehicle.price_per_day) || stored.price || 150000);
  var storeName = (storedVehicle && storedVehicle.store_name) || "";
  var vehicleRating = stored.rating || ((storedVehicle && storedVehicle.avg_rating) ? (storedVehicle.avg_rating + " (" + (storedVehicle.review_count || 0) + ")") : "");
  var vehicleSpecs = stored.specs || (storeName ? ("Cửa hàng " + storeName) : "");

  var bkNameEl = document.getElementById("bkName");
  var bkTypeEl = document.getElementById("bkType");
  var bkImgEl = document.getElementById("bkImg");
  var bkMetaEl = document.getElementById("bkMeta");
  var bkUnitPriceEl = document.getElementById("bkUnitPrice");
  var bkNoteEl = document.getElementById("bkNote");
  var bkBackEl = document.getElementById("bkBack");
  var startDateEl = document.getElementById("startDate");
  var startHourEl = document.getElementById("startHour");
  var endDateEl = document.getElementById("endDate");
  var endHourEl = document.getElementById("endHour");
  var durationBadgeEl = document.getElementById("durationBadge");
  var deliveryDetailsBox = document.getElementById("deliveryDetailsBox");
  var deliveryAddressEl = document.getElementById("deliveryAddress");
  var deliveryDistanceEl = document.getElementById("deliveryDistanceKm");
  var noteCharCountEl = document.getElementById("noteCharCount");
  var sumRentalLabelEl = document.getElementById("sumRentalLabel");
  var sumRentalAmountEl = document.getElementById("sumRentalAmount");
  var sumDeliveryLabelEl = document.getElementById("sumDeliveryLabel");
  var sumDeliveryFeeEl = document.getElementById("sumDeliveryFee");
  var sumTotalAmountEl = document.getElementById("sumTotalAmount");
  var sumDepositAmountEl = document.getElementById("sumDepositAmount");
  var sumRemainingAmountEl = document.getElementById("sumRemainingAmount");
  var pricingStatusEl = document.getElementById("pricingStatus");
  var orderErrorBoxEl = document.getElementById("orderErrorBox");
  var btnPayEl = document.getElementById("btn-pay");

  if (bkNameEl) bkNameEl.textContent = vehicleName;
  if (bkTypeEl) bkTypeEl.textContent = vehicleType;
  if (bkImgEl) {
    bkImgEl.src = vehicleImage;
    bkImgEl.onerror = function () { bkImgEl.src = DEFAULT_IMG; };
  }
  if (bkUnitPriceEl) bkUnitPriceEl.textContent = formatVnd(unitPrice) + " / ngày";

  var today = new Date();
  var defaultStartDate = (params.get("date") || stored.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(defaultStartDate)) {
    var tomorrow = new Date(today.getTime() + 86400000);
    defaultStartDate = toDateInputValue(tomorrow);
  }
  var startDateObj = new Date(defaultStartDate + "T00:00:00");
  var defaultEndDateObj = new Date(startDateObj.getTime() + 2 * 86400000);
  var defaultEndDate = toDateInputValue(defaultEndDateObj);

  var rawStartHour = (params.get("hour") || stored.hour || "08:00").slice(0, 5);
  var rawEndHour = (params.get("end") || rawStartHour || "08:00").slice(0, 5);
  if (!/^\d{2}:00$/.test(rawStartHour)) rawStartHour = "08:00";
  if (!/^\d{2}:00$/.test(rawEndHour)) rawEndHour = "08:00";

  buildHourOptions(startHourEl, rawStartHour);
  buildHourOptions(endHourEl, rawEndHour);
  if (startDateEl) startDateEl.value = defaultStartDate;
  if (endDateEl) endDateEl.value = defaultEndDate;

  var initialNote = params.get("note") || "";
  if (bkNoteEl && initialNote) bkNoteEl.value = initialNote;

  function updateNoteCount() {
    if (!bkNoteEl || !noteCharCountEl) return;
    noteCharCountEl.textContent = bkNoteEl.value.length + " / 500";
  }
  updateNoteCount();

  if (bkBackEl) {
    var back = new URLSearchParams();
    if (vehicleName) back.set("xe", vehicleName);
    if (defaultStartDate) back.set("date", defaultStartDate);
    if (rawStartHour) back.set("hour", rawStartHour);
    if (rawEndHour) back.set("end", rawEndHour);
    if (initialNote) back.set("note", initialNote);
    var backQuery = back.toString();
    bkBackEl.setAttribute("href", "weekly-vehicle-schedule.html" + (backQuery ? "?" + backQuery : ""));
  }

  function getSelectedDeliveryMethod() {
    var checked = document.querySelector('input[name="deliveryMethod"]:checked');
    return checked ? checked.value : "Nhận tại cửa hàng";
  }

  function showError(msg) {
    if (!orderErrorBoxEl) return;
    if (!msg) {
      orderErrorBoxEl.hidden = true;
      orderErrorBoxEl.textContent = "";
    } else {
      orderErrorBoxEl.hidden = false;
      orderErrorBoxEl.textContent = msg;
    }
  }

  function readFormState() {
    return {
      vehicleId: vehicleId,
      unitPrice: unitPrice,
      startDate: startDateEl ? startDateEl.value : defaultStartDate,
      startHour: startHourEl ? startHourEl.value : "08:00",
      endDate: endDateEl ? endDateEl.value : defaultEndDate,
      endHour: endHourEl ? endHourEl.value : "08:00",
      deliveryMethod: getSelectedDeliveryMethod(),
      deliveryAddress: deliveryAddressEl ? deliveryAddressEl.value.trim() : "",
      deliveryDistanceKm: deliveryDistanceEl ? deliveryDistanceEl.value : "",
      note: bkNoteEl ? bkNoteEl.value.trim() : ""
    };
  }

  var latestPricing = null;
  var calcTimer = null;
  var calcSeq = 0;

  function renderPricing(pricing, state) {
    latestPricing = pricing;
    if (bkMetaEl) {
      bkMetaEl.textContent =
        formatDisplayDateTime(state.startDate, state.startHour) +
        " → " +
        formatDisplayDateTime(state.endDate, state.endHour);
    }
    if (isHoldExpired) {
      lockOrderOnHoldExpired();
      return;
    }
    if (pricing.error) {
      showError(pricing.error);
      if (btnPayEl) btnPayEl.disabled = true;
      return;
    }
    showError("");
    if (btnPayEl) btnPayEl.disabled = false;

    if (durationBadgeEl) durationBadgeEl.textContent = pricing.duration_days + " ngày";
    if (sumRentalLabelEl) sumRentalLabelEl.textContent = "Tiền thuê xe (" + pricing.duration_days + " ngày)";
    if (sumRentalAmountEl) sumRentalAmountEl.textContent = formatVnd(pricing.rental_amount);
    if (sumDeliveryLabelEl) {
      sumDeliveryLabelEl.textContent = state.deliveryMethod === "Giao tận nơi"
        ? "Phí giao nhận (" + state.deliveryDistanceKm + " km)"
        : "Phí giao nhận (Nhận tại cửa hàng)";
    }
    if (sumDeliveryFeeEl) sumDeliveryFeeEl.textContent = formatVnd(pricing.delivery_fee);
    if (sumTotalAmountEl) sumTotalAmountEl.textContent = formatVnd(pricing.total_amount);
    if (sumDepositAmountEl) sumDepositAmountEl.textContent = formatVnd(pricing.deposit_amount);
    if (sumRemainingAmountEl) sumRemainingAmountEl.textContent = formatVnd(pricing.remaining_amount);

    if (pricingStatusEl) {
      pricingStatusEl.textContent = pricing.source === "api"
        ? "Đã đồng bộ báo giá trực tiếp từ hệ thống (BR-03)."
        : "Đang tính tạm tính theo công thức BR-03.";
    }
  }

  async function requestBackendPricing(state) {
    if (!state.vehicleId) return null;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 2200) : null;
    try {
      var body = {
        vehicle_id: state.vehicleId,
        start_time: state.startDate + "T" + state.startHour + ":00",
        end_time: state.endDate + "T" + state.endHour + ":00",
        delivery_method: state.deliveryMethod
      };
      if (state.deliveryMethod === "Giao tận nơi") {
        body.delivery_address = state.deliveryAddress;
        body.delivery_distance_km = parseFloat(state.deliveryDistanceKm);
      }
      var res = await fetch(API_BASE + "/orders/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        return { error: data.detail || "Không thể tính giá đơn thuê. Vui lòng kiểm tra lại thông tin." };
      }
      data.source = "api";
      return data;
    } catch (err) {
      return null;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function refreshPricing() {
    var state = readFormState();
    if (deliveryDetailsBox) {
      deliveryDetailsBox.hidden = state.deliveryMethod !== "Giao tận nơi";
    }
    var localResult = calculateLocalPricing(state);
    renderPricing(localResult, state);
    if (localResult.error || !state.vehicleId) return;

    var seq = ++calcSeq;
    clearTimeout(calcTimer);
    calcTimer = setTimeout(async function () {
      var apiResult = await requestBackendPricing(state);
      if (seq !== calcSeq || !apiResult) return;
      renderPricing(apiResult, state);
    }, 260);
  }

  [startDateEl, startHourEl, endDateEl, endHourEl, deliveryAddressEl, deliveryDistanceEl].forEach(function (node) {
    if (!node) return;
    node.addEventListener("input", refreshPricing);
    node.addEventListener("change", refreshPricing);
  });

  document.querySelectorAll('input[name="deliveryMethod"]').forEach(function (radio) {
    radio.addEventListener("change", refreshPricing);
  });

  if (bkNoteEl) {
    bkNoteEl.addEventListener("input", updateNoteCount);
  }

  refreshPricing();

  if (btnPayEl) {
    btnPayEl.addEventListener("click", async function () {
      if (isHoldExpired) {
        lockOrderOnHoldExpired();
        return;
      }
      var state = readFormState();
      var localCheck = calculateLocalPricing(state);
      if (localCheck.error) {
        showError(localCheck.error);
        return;
      }

      btnPayEl.disabled = true;
      btnPayEl.textContent = "Đang tạo đơn thuê...";
      showError("");

      var createdOrder = null;
      var userId = (window.VRPAuth && window.VRPAuth.userId) || null;

      if (state.vehicleId && userId) {
        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 3500) : null;
        try {
          var payload = {
            vehicle_id: state.vehicleId,
            start_time: state.startDate + "T" + state.startHour + ":00",
            end_time: state.endDate + "T" + state.endHour + ":00",
            delivery_method: state.deliveryMethod,
            note: state.note || null
          };
          if (state.deliveryMethod === "Giao tận nơi") {
            payload.delivery_address = state.deliveryAddress;
            payload.delivery_distance_km = parseFloat(state.deliveryDistanceKm);
          }
          var res = await fetch(API_BASE + "/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": String(userId)
            },
            body: JSON.stringify(payload),
            signal: controller ? controller.signal : undefined
          });
          var data = await res.json().catch(function () { return {}; });
          if (!res.ok) {
            showError(data.detail || "Không thể tạo đơn thuê (mã lỗi " + res.status + ").");
            btnPayEl.disabled = false;
            btnPayEl.textContent = "Tạo đơn thuê & chuyển đặt cọc →";
            return;
          }
          createdOrder = data;
        } catch (err) {
          // Backend unreachable -> fall back to demo pending order below
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }

      var finalPricing = createdOrder || latestPricing || localCheck;
      var pendingOrder = {
        order_id: createdOrder ? createdOrder.order_id : null,
        order_code: createdOrder ? ("VRP-" + String(createdOrder.order_id).padStart(6, "0")) : ("VRP-" + String(Date.now()).slice(-6)),
        status: createdOrder ? createdOrder.status : "Chờ đặt cọc",
        vehicle_id: state.vehicleId,
        vehicle_name: vehicleName,
        vehicle_type: vehicleType,
        vehicle_image: vehicleImage,
        vehicle_rating: vehicleRating,
        vehicle_specs: vehicleSpecs,
        unit_price: finalPricing.unit_price || unitPrice,
        start_time: state.startDate + "T" + state.startHour + ":00",
        end_time: state.endDate + "T" + state.endHour + ":00",
        start_display: formatDisplayDateTime(state.startDate, state.startHour),
        end_display: formatDisplayDateTime(state.endDate, state.endHour),
        duration_days: finalPricing.duration_days || localCheck.duration_days,
        delivery_method: state.deliveryMethod,
        delivery_address: state.deliveryMethod === "Giao tận nơi" ? state.deliveryAddress : null,
        delivery_distance_km: state.deliveryMethod === "Giao tận nơi" ? parseFloat(state.deliveryDistanceKm) : null,
        note: state.note || null,
        rental_amount: finalPricing.rental_amount,
        delivery_fee: finalPricing.delivery_fee,
        total_amount: finalPricing.total_amount,
        deposit_amount: finalPricing.deposit_amount,
        remaining_amount: finalPricing.remaining_amount
      };

      try {
        sessionStorage.setItem("vrpPendingOrder", JSON.stringify(pendingOrder));
        sessionStorage.setItem("selectedVehicleName", vehicleName);
        sessionStorage.setItem("selectedVehicleType", vehicleType);
        sessionStorage.setItem("selectedVehicleImage", vehicleImage);
        sessionStorage.setItem("selectedVehiclePrice", formatVnd(unitPrice) + "/ngày");
        if (vehicleRating) sessionStorage.setItem("selectedVehicleRating", vehicleRating);
        if (vehicleSpecs) sessionStorage.setItem("selectedVehicleSpecs", vehicleSpecs);
        sessionStorage.setItem("vrpScheduleLabel", pendingOrder.start_display + " → " + pendingOrder.end_display);
      } catch (err) { /* no-op */ }

      if (window.showToast) {
        window.showToast("Đã tạo đơn thuê " + pendingOrder.order_code + " — chuyển sang thanh toán cọc BR-03.");
      }
      setTimeout(function () {
        if (window.motogoNavigate) {
          window.motogoNavigate("deposit-payment.html");
        } else if (window.__vrpGo) {
          window.__vrpGo("deposit-payment.html");
        } else {
          window.location.href = "deposit-payment.html";
        }
      }, 350);
    });
  }
})();



/* Liên kết giữa các giao diện đã tách */
(function () {
    var MAP = {
        "store-dashboard.html": "index.html",
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
    "index.html": "store-dashboard.html",
    "how-it-works.html": "how-it-works.html"
};
    var PAGE = "create-rental-order.html";

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
        if (!path) return "store-dashboard.html";
        if (path.slice(-1) === "/") path += "store-dashboard.html";
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
