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
  var PAGE = "my-orders.html";
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
    var PAGE = "my-orders.html";

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

/* ---- TF14841: Danh sách đơn, lịch sử & hủy đơn hoàn cọc theo BR-04 ---- */
(function () {
  var API_BASE = "http://127.0.0.1:8000";
  var HISTORY_STATUSES = ["Hoàn tất", "Hoàn thành", "Completed", "Đã hủy", "Cancelled", "Cửa hàng từ chối", "Từ chối"];
  var NON_CANCELLABLE = ["Đang thuê"].concat(HISTORY_STATUSES);

  var listEl = document.getElementById("myOrdersList");
  var tabsEl = document.getElementById("myOrderTabs");
  var cancelModal = document.getElementById("cancelBr04Modal");
  var historyModal = document.getElementById("historyModal");
  if (!listEl) return;

  var activeScope = "all";
  var ordersState = [];
  var activeCancelOrder = null;

  /* Escape HTML để tránh XSS khi render dữ liệu đơn thuê */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Định dạng tiền VNĐ */
  function formatVnd(n) {
    return Math.round(Number(n) || 0).toLocaleString("vi-VN") + "đ";
  }

  /* Định dạng thời gian ngắn dd/mm HH:MM */
  function formatDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var hh = String(d.getHours()).padStart(2, "0");
    var mi = String(d.getMinutes()).padStart(2, "0");
    return dd + "/" + mm + "/" + d.getFullYear() + " · " + hh + ":" + mi;
  }

  /* Tính thử mức hoàn cọc BR-04 cục bộ (fallback khi chạy offline) */
  function calcBr04Local(order) {
    var deposit = Number(order.deposit_amount) || 0;
    var pickupMs = order.start_time ? new Date(order.start_time).getTime() : Date.now();
    var hoursLeft = Math.round(((pickupMs - Date.now()) / 3600000) * 100) / 100;
    if (order.order_status === "Chờ thanh toán" || deposit <= 0) {
      return {
        hours_before_pickup: hoursLeft,
        deposit_amount: deposit,
        refund_rate: 0,
        refund_amount: 0,
        policy_note: "Đơn chưa thanh toán tiền cọc nên không phát sinh khoản hoàn cọc."
      };
    }
    if (hoursLeft >= 24) {
      return {
        hours_before_pickup: hoursLeft,
        deposit_amount: deposit,
        refund_rate: 100,
        refund_amount: deposit,
        policy_note: "Hủy trước giờ nhận xe từ 24 giờ trở lên — hoàn 100% tiền cọc (BR-04)."
      };
    }
    if (hoursLeft >= 6) {
      return {
        hours_before_pickup: hoursLeft,
        deposit_amount: deposit,
        refund_rate: 50,
        refund_amount: Math.round(deposit * 0.5),
        policy_note: "Hủy trước giờ nhận xe từ 6 đến dưới 24 giờ — hoàn 50% tiền cọc (BR-04)."
      };
    }
    return {
      hours_before_pickup: hoursLeft,
      deposit_amount: deposit,
      refund_rate: 0,
      refund_amount: 0,
      policy_note: "Hủy trước giờ nhận xe dưới 6 giờ — không hoàn tiền cọc (BR-04)."
    };
  }

  /* Dữ liệu mẫu phong phú cho chế độ offline (phủ đủ 3 mốc BR-04 + lịch sử) */
  function buildDemoOrders() {
    var now = Date.now();
    var H = 3600000;
    return [
      {
        order_id: 1001, order_code: "DH-20261125-001", vehicle_name: "Honda Vision 2024",
        city_name: "Đà Nẵng", store_name: "VRP Đà Nẵng",
        start_time: new Date(now + 36 * H).toISOString(), end_time: new Date(now + 84 * H).toISOString(),
        deposit_amount: 300000, total_amount: 450000, order_status: "Đã xác nhận",
        refund_rate: 0, refund_amount: 0, can_cancel: true, is_history: false, fromApi: false,
        history_events: [
          { event: "Tạo đơn thuê", timestamp: new Date(now - 2 * H).toISOString(), detail: "Tổng đơn 450.000đ · Tiền cọc 300.000đ" },
          { event: "Cửa hàng xác nhận đơn", timestamp: new Date(now - 1.9 * H).toISOString(), detail: "Cửa hàng đã xác nhận trong hạn 15 phút." }
        ]
      },
      {
        order_id: 1002, order_code: "DH-20261125-002", vehicle_name: "Honda Air Blade 160",
        city_name: "Vũng Tàu", store_name: "Cửa hàng Minh Thư",
        start_time: new Date(now + 12 * H).toISOString(), end_time: new Date(now + 60 * H).toISOString(),
        deposit_amount: 400000, total_amount: 600000, order_status: "Đã xác nhận",
        refund_rate: 0, refund_amount: 0, can_cancel: true, is_history: false, fromApi: false,
        history_events: [
          { event: "Tạo đơn thuê", timestamp: new Date(now - 5 * H).toISOString(), detail: "Tổng đơn 600.000đ · Tiền cọc 400.000đ" }
        ]
      },
      {
        order_id: 1003, order_code: "DH-20261125-003", vehicle_name: "VinFast Feliz S",
        city_name: "Đà Nẵng", store_name: "VRP Đà Nẵng",
        start_time: new Date(now + 3 * H).toISOString(), end_time: new Date(now + 27 * H).toISOString(),
        deposit_amount: 200000, total_amount: 250000, order_status: "Chờ cửa hàng xác nhận",
        refund_rate: 0, refund_amount: 0, can_cancel: true, is_history: false, fromApi: false,
        history_events: [
          { event: "Tạo đơn thuê", timestamp: new Date(now - 0.1 * H).toISOString(), detail: "Tổng đơn 250.000đ · Tiền cọc 200.000đ" }
        ]
      },
      {
        order_id: 1004, order_code: "DH-20261120-008", vehicle_name: "Yamaha Janus 2023",
        city_name: "Đà Nẵng", store_name: "VRP Đà Nẵng",
        start_time: new Date(now - 6 * H).toISOString(), end_time: new Date(now + 42 * H).toISOString(),
        deposit_amount: 200000, total_amount: 320000, order_status: "Đang thuê",
        refund_rate: 0, refund_amount: 0, can_cancel: false, is_history: false, fromApi: false,
        history_events: [
          { event: "Tạo đơn thuê", timestamp: new Date(now - 30 * H).toISOString(), detail: "Tổng đơn 320.000đ · Tiền cọc 200.000đ" },
          { event: "Bàn giao xe", timestamp: new Date(now - 6 * H).toISOString(), detail: "Khách đã nhận xe đúng hẹn." }
        ]
      },
      {
        order_id: 1005, order_code: "DH-20261105-003", vehicle_name: "Honda SH Mode",
        city_name: "Đà Nẵng", store_name: "VRP Đà Nẵng",
        start_time: new Date(now - 240 * H).toISOString(), end_time: new Date(now - 192 * H).toISOString(),
        deposit_amount: 200000, total_amount: 400000, order_status: "Hoàn tất",
        refund_rate: 0, refund_amount: 0, can_cancel: false, is_history: true, fromApi: false,
        history_events: [
          { event: "Tạo đơn thuê", timestamp: new Date(now - 260 * H).toISOString(), detail: "Tổng đơn 400.000đ · Tiền cọc 200.000đ" },
          { event: "Hoàn tất chuyến đi", timestamp: new Date(now - 192 * H).toISOString(), detail: "Trả xe đúng hạn, đã tất toán." }
        ]
      },
      {
        order_id: 1006, order_code: "DH-20261028-019", vehicle_name: "Toyota Vios 2024",
        city_name: "Vũng Tàu", store_name: "Cửa hàng Minh Thư",
        start_time: new Date(now - 300 * H).toISOString(), end_time: new Date(now - 252 * H).toISOString(),
        deposit_amount: 600000, total_amount: 2000000, order_status: "Đã hủy",
        cancelled_at: new Date(now - 330 * H).toISOString(), cancel_reason: "Thay đổi lịch công tác",
        refund_rate: 100, refund_amount: 600000, can_cancel: false, is_history: true, fromApi: false,
        history_events: [
          { event: "Tạo đơn thuê", timestamp: new Date(now - 350 * H).toISOString(), detail: "Tổng đơn 2.000.000đ · Tiền cọc 600.000đ" },
          { event: "Hủy đơn & hoàn cọc BR-04", timestamp: new Date(now - 330 * H).toISOString(), detail: "Lý do: Thay đổi lịch công tác · Hoàn 100% cọc (600.000đ)" }
        ]
      }
    ];
  }

  /* Chọn class badge phù hợp cho từng trạng thái đơn */
  function badgeClass(status) {
    if (status === "Đã xác nhận") return "b-confirmed";
    if (status === "Đang thuê") return "b-active";
    if (status === "Hoàn tất" || status === "Hoàn thành") return "b-done";
    if (status === "Đã hủy" || status === "Cửa hàng từ chối" || status === "Từ chối") return "b-cancelled";
    if (status === "Chờ vận hành viên xử lý") return "b-escalated";
    return "b-pending";
  }

  /* Cập nhật 4 thẻ thống kê và số lượng trên các tab lọc */
  function updateCounters() {
    var activeList = ordersState.filter(function (o) { return HISTORY_STATUSES.indexOf(o.order_status) === -1; });
    var historyList = ordersState.filter(function (o) { return HISTORY_STATUSES.indexOf(o.order_status) !== -1; });
    var pendingCount = ordersState.filter(function (o) { return o.order_status === "Chờ thanh toán" || o.order_status === "Chờ cửa hàng xác nhận"; }).length;
    var confirmedCount = ordersState.filter(function (o) { return o.order_status === "Đã xác nhận"; }).length;
    var rentingCount = ordersState.filter(function (o) { return o.order_status === "Đang thuê"; }).length;

    var setText = function (id, val) { var n = document.getElementById(id); if (n) n.textContent = String(val); };
    setText("statPending", pendingCount);
    setText("statConfirmed", confirmedCount);
    setText("statActive", rentingCount);
    setText("statHistory", historyList.length);

    if (tabsEl) {
      var counts = { all: ordersState.length, active: activeList.length, history: historyList.length };
      var labels = { all: "Tất cả", active: "Đơn hiện tại", history: "Lịch sử đơn" };
      tabsEl.querySelectorAll(".mo-tab[data-scope]").forEach(function (btn) {
        var key = btn.getAttribute("data-scope");
        btn.textContent = labels[key] + " (" + counts[key] + ")";
        btn.classList.toggle("active", key === activeScope);
      });
    }
  }

  /* Render danh sách đơn thuê theo tab đang chọn */
  function renderOrders() {
    updateCounters();
    var filtered = ordersState.filter(function (o) {
      var isHist = HISTORY_STATUSES.indexOf(o.order_status) !== -1;
      if (activeScope === "active") return !isHist;
      if (activeScope === "history") return isHist;
      return true;
    });

    listEl.innerHTML = filtered.map(function (o) {
      var canCancel = NON_CANCELLABLE.indexOf(o.order_status) === -1;
      var refundBadge = (o.order_status === "Đã hủy")
        ? '<span class="mo-refund-chip">Hoàn cọc BR-04: ' + Math.round(o.refund_rate || 0) + "% (" + formatVnd(o.refund_amount || 0) + ")</span>"
        : "";
      var actions = '<div class="mo-actions">' +
        '<button type="button" class="btn btn-outline" style="padding:7px 12px;font-size:12.5px" data-mo-action="history" data-code="' + esc(o.order_code) + '">Lịch sử</button>' +
        (canCancel ? '<button type="button" class="mo-btn-cancel-sm" data-mo-action="cancel" data-code="' + esc(o.order_code) + '">Hủy đơn</button>' : "") +
        (o.order_status === "Hoàn tất" || o.order_status === "Hoàn thành" ? '<a href="customer-review.html" class="btn btn-outline" style="padding:7px 12px;font-size:12.5px">Đánh giá</a>' : "") +
      "</div>";

      return '<div class="order-row">' +
        '<div style="flex:1;min-width:200px">' +
          "<strong>" + esc(o.order_code) + "</strong>" +
          '<p style="font-size:13px;color:var(--muted);margin:4px 0 0">' +
            esc(o.vehicle_name || "Xe thuê") +
            (o.start_time ? " · Nhận: " + formatDateTime(o.start_time) : "") +
            (o.city_name ? " · " + esc(o.city_name) : "") +
          "</p>" +
          refundBadge +
        "</div>" +
        '<span class="badge ' + badgeClass(o.order_status) + '">' + esc(o.order_status) + "</span>" +
        '<strong style="color:var(--primary);min-width:96px;text-align:right">' + formatVnd(o.total_amount) + "</strong>" +
        actions +
      "</div>";
    }).join("");

    if (window.VRPDataState) window.VRPDataState.refresh("#myOrdersList");
  }

  /* Lấy header xác thực người dùng nếu đã đăng nhập */
  function getAuthHeaders() {
    var h = { "Content-Type": "application/json" };
    if (window.VRPAuth && window.VRPAuth.userId) h["X-User-Id"] = String(window.VRPAuth.userId);
    return h;
  }

  /* Mở modal hủy đơn và hiển thị mức hoàn cọc BR-04 xem trước */
  async function openCancelModal(order) {
    if (!cancelModal || !order) return;
    activeCancelOrder = order;
    var preview = calcBr04Local(order);

    if (order.fromApi && order.order_id) {
      try {
        var res = await fetch(API_BASE + "/orders/" + order.order_id + "/cancel-preview", { headers: getAuthHeaders() });
        if (res.ok) {
          var json = await res.json();
          if (json && json.data) preview = json.data;
        }
      } catch (err) { /* fallback dùng preview cục bộ */ }
    }

    document.getElementById("cancelOrderSummary").textContent =
      "Đơn " + order.order_code + " · " + (order.vehicle_name || "Xe thuê") + " (Nhận xe: " + formatDateTime(order.start_time) + ")";
    document.getElementById("cancelHoursLeft").textContent =
      (preview.hours_before_pickup > 0 ? preview.hours_before_pickup + " giờ" : "Đã qua giờ nhận xe");
    document.getElementById("cancelDepositPaid").textContent = formatVnd(preview.deposit_amount);
    document.getElementById("cancelRefundRate").textContent = Math.round(preview.refund_rate) + "%";
    document.getElementById("cancelRefundAmount").textContent = formatVnd(preview.refund_amount);
    document.getElementById("cancelPolicyNote").textContent = preview.policy_note || "";
    document.getElementById("cancelReasonInput").value = "";
    var errEl = document.getElementById("cancelErrorMsg");
    if (errEl) { errEl.hidden = true; errEl.textContent = ""; }
    cancelModal.hidden = false;
  }

  /* Gửi yêu cầu hủy đơn & áp dụng hoàn cọc BR-04 */
  async function confirmCancelOrder() {
    if (!activeCancelOrder) return;
    var order = activeCancelOrder;
    var reason = (document.getElementById("cancelReasonInput").value || "").trim();
    var errEl = document.getElementById("cancelErrorMsg");
    var br04Result = calcBr04Local(order);

    if (order.fromApi && order.order_id) {
      try {
        var res = await fetch(API_BASE + "/orders/" + order.order_id + "/cancel", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ cancel_reason: reason || null })
        });
        var payload = await res.json().catch(function () { return {}; });
        if (!res.ok) {
          if (errEl) { errEl.hidden = false; errEl.textContent = payload.detail || "Không thể hủy đơn."; }
          return;
        }
        if (payload && payload.data) {
          Object.assign(order, payload.data, { fromApi: true });
          cancelModal.hidden = true;
          activeCancelOrder = null;
          if (window.showToast) window.showToast("Đã hủy đơn " + order.order_code + " — hoàn " + Math.round(order.refund_rate) + "% cọc (" + formatVnd(order.refund_amount) + ").");
          renderOrders();
          return;
        }
      } catch (err) { /* fallback offline bên dưới */ }
    }

    order.order_status = "Đã hủy";
    order.cancelled_at = new Date().toISOString();
    order.cancel_reason = reason || null;
    order.refund_rate = br04Result.refund_rate;
    order.refund_amount = br04Result.refund_amount;
    order.can_cancel = false;
    order.is_history = true;
    order.history_events = (order.history_events || []).concat([{
      event: "Hủy đơn & hoàn cọc BR-04",
      timestamp: order.cancelled_at,
      detail: (reason ? "Lý do: " + reason + " · " : "") + "Hoàn " + Math.round(br04Result.refund_rate) + "% cọc (" + formatVnd(br04Result.refund_amount) + ")"
    }]);

    cancelModal.hidden = true;
    activeCancelOrder = null;
    if (window.showToast) window.showToast("Đã hủy đơn " + order.order_code + " — hoàn " + Math.round(order.refund_rate) + "% cọc (" + formatVnd(order.refund_amount) + ").");
    renderOrders();
  }

  /* Mở modal xem chi tiết đơn & dòng thời gian lịch sử sự kiện */
  function openHistoryModal(order) {
    if (!historyModal || !order) return;
    var body = document.getElementById("historyModalBody");
    var events = order.history_events || [];
    body.innerHTML =
      '<div class="br04-preview-box">' +
        '<div class="br04-row"><span>Mã đơn</span><strong>' + esc(order.order_code) + "</strong></div>" +
        '<div class="br04-row"><span>Phương tiện</span><strong>' + esc(order.vehicle_name || "—") + "</strong></div>" +
        '<div class="br04-row"><span>Trạng thái hiện tại</span><strong>' + esc(order.order_status) + "</strong></div>" +
        '<div class="br04-row"><span>Tổng đơn / Tiền cọc</span><strong>' + formatVnd(order.total_amount) + " / " + formatVnd(order.deposit_amount) + "</strong></div>" +
        (order.order_status === "Đã hủy"
          ? '<div class="br04-row br04-highlight"><span>Hoàn cọc BR-04</span><strong>' + Math.round(order.refund_rate || 0) + "% (" + formatVnd(order.refund_amount || 0) + ")</strong></div>"
          : "") +
      "</div>" +
      '<strong style="font-size:13.5px;color:var(--text)">Lịch sử xử lý đơn</strong>' +
      '<ul class="mo-timeline">' +
        (events.length
          ? events.map(function (ev) {
              return "<li><strong>" + esc(ev.event) + "</strong><small>" + formatDateTime(ev.timestamp) + "</small><span>" + esc(ev.detail) + "</span></li>";
            }).join("")
          : "<li><strong>Tạo đơn thuê</strong><span>Chưa có sự kiện bổ sung.</span></li>") +
      "</ul>";
    historyModal.hidden = false;
  }

  if (tabsEl) {
    tabsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".mo-tab[data-scope]");
      if (!btn) return;
      activeScope = btn.getAttribute("data-scope") || "all";
      renderOrders();
    });
  }

  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-mo-action]");
    if (!btn) return;
    var code = btn.getAttribute("data-code");
    var order = ordersState.find(function (o) { return o.order_code === code; });
    if (!order) return;
    if (btn.getAttribute("data-mo-action") === "cancel") openCancelModal(order);
    if (btn.getAttribute("data-mo-action") === "history") openHistoryModal(order);
  });

  ["cancelModalClose", "cancelBackBtn"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", function () { cancelModal.hidden = true; activeCancelOrder = null; });
  });
  var confirmBtn = document.getElementById("cancelConfirmBtn");
  if (confirmBtn) confirmBtn.addEventListener("click", confirmCancelOrder);

  ["historyModalClose", "historyModalOkBtn"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", function () { historyModal.hidden = true; });
  });

  /* Khởi tạo dữ liệu đơn thuê: gọi API GET /orders/my, fallback sang demo khi offline */
  async function initMyOrders() {
    ordersState = buildDemoOrders();
    renderOrders();
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 2000) : null;
    try {
      var res = await fetch(API_BASE + "/orders/my", {
        headers: getAuthHeaders(),
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) return;
      var payload = await res.json();
      if (payload && payload.data && Array.isArray(payload.data.orders) && payload.data.orders.length > 0) {
        ordersState = payload.data.orders.map(function (o) { o.fromApi = true; return o; });
        renderOrders();
      }
    } catch (err) { /* giữ dữ liệu demo khi Backend chưa chạy */ }
    finally { if (timer) clearTimeout(timer); }
  }

  initMyOrders();
})();
