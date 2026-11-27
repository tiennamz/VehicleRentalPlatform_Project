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
  var PAGE = "weekly-vehicle-schedule.html";
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
        var PAD = function (n) { return String(n).padStart(2, "0"); };
        var SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        var FULL = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        var OPEN = 9;
        var CLOSE = 23;
        var ROW_H = 52;

        var params = new URLSearchParams(window.__VRP_QUERY || "");
        var bodyEl = document.getElementById("calBody");
        var picker = document.getElementById("shiftPicker");
        var pickerWhen = document.getElementById("spWhen");
        var pickerHour = document.getElementById("spHour");
        var continueLink = document.getElementById("spContinue");
        var startSelect = document.getElementById("spStart");
        var endSelect = document.getElementById("spEnd");
        var noteInput = document.getElementById("spNote");
        var rangeEl = document.getElementById("calRange");
        var viewButtons = Array.prototype.slice.call(document.querySelectorAll(".cal-views button"));

        function dateKey(d) {
            return d.getFullYear() + "-" + PAD(d.getMonth() + 1) + "-" + PAD(d.getDate());
        }

        function parseKey(value) {
            var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").slice(0, 10));
            if (!m) return null;
            var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            return isNaN(d.getTime()) ? null : d;
        }

        function addDays(date, days) {
            var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            d.setDate(d.getDate() + days);
            return d;
        }

        function fmt(d) {
            return PAD(d.getDate()) + "/" + PAD(d.getMonth() + 1) + "/" + d.getFullYear();
        }

        function weekStart(date) {
            return addDays(date, -date.getDay());
        }

        function hourLabel(hour) {
            var suffix = hour < 12 ? "SA" : "CH";
            var h12 = hour % 12;
            if (h12 === 0) h12 = 12;
            return h12 + " " + suffix;
        }

        function nowLabel() {
            var now = new Date();
            var h12 = now.getHours() % 12;
            if (h12 === 0) h12 = 12;
            return h12 + ":" + PAD(now.getMinutes()) + (now.getHours() < 12 ? " SA" : " CH");
        }

        function caFor(hour) {
            if (hour < 12) return { name: "Sáng", start: 6, end: 12 };
            if (hour < 18) return { name: "Chiều", start: 12, end: 18 };
            return { name: "Tối", start: 18, end: 23 };
        }

        function clampHour(hour) {
            return Math.max(OPEN, Math.min(CLOSE - 1, hour));
        }

        function makeOrderId() {
            return "RG-2026-" + String(300 + Math.floor(Math.random() * 600)).padStart(5, "0");
        }

        var today = new Date();
        var todayKey = dateKey(today);
        var stored = {};
        try {
            stored.name = sessionStorage.getItem("selectedVehicleName") || "";
            stored.type = sessionStorage.getItem("selectedVehicleType") || "";
            stored.date = sessionStorage.getItem("selectedVehicleDate") || "";
            stored.hour = sessionStorage.getItem("selectedVehicleHour") || "";
        } catch (err) { /* no-op */ }

        var queryDate = parseKey(params.get("date"));
        var queryHour = params.get("hour");
        var pickedDate = queryDate || parseKey(stored.date);
        var pickedHour = parseInt(String(queryHour || stored.hour || "").slice(0, 2), 10);
        if (isNaN(pickedHour)) pickedHour = OPEN;
        pickedHour = Math.max(1, Math.min(23, pickedHour));

        var vehicle = (params.get("xe") || stored.name || "Honda Vision 2024").trim();
        var anchor = pickedDate ? new Date(pickedDate) : new Date(today);
        var viewMode = "week";
        var selection = null;
        var holds = [];
        var holdId = makeOrderId();
        var noteText = params.get("note") || "";

        function timeRange(start, end) {
            return PAD(start) + ":00 – " + PAD(end) + ":00";
        }

        function makeSelection(date, start, end, note) {
            start = Math.max(OPEN, Math.min(CLOSE - 1, start));
            end = Math.max(start + 1, Math.min(CLOSE, end));
            return { dateKey: dateKey(date), date: date, start: start, end: end, note: note || "" };
        }

        function endOfCa(hour) {
            return Math.max(clampHour(hour) + 1, Math.min(caFor(hour).end, CLOSE));
        }

        function holdNote() {
            var text = "Bạn giữ chỗ · " + timeRange(selection.start, selection.end);
            if (noteText) text += " · " + noteText;
            return text;
        }

        function ensureHold() {
            holds = holds.filter(function (h) { return !h.you; });
            if (!selection) return;
            holds.push({
                dateKey: selection.dateKey,
                start: selection.start,
                end: selection.end,
                state: "holding",
                id: holdId,
                note: holdNote(),
                you: true
            });
        }

        (function fillTimeSelects() {
            var startOptions = "";
            for (var h = OPEN; h <= CLOSE - 1; h++) {
                startOptions += '<option value="' + PAD(h) + '">' + PAD(h) + ":00</option>";
            }
            startSelect.innerHTML = startOptions;
            var endOptions = "";
            for (var e = OPEN + 1; e <= CLOSE; e++) {
                endOptions += '<option value="' + PAD(e) + '">' + PAD(e) + ":00</option>";
            }
            endSelect.innerHTML = endOptions;
        })();

        if (pickedDate && (queryHour || stored.hour)) {
            var queryEnd = parseInt(String(params.get("end") || "").slice(0, 2), 10);
            var initialEnd = isNaN(queryEnd) ? endOfCa(clampHour(pickedHour)) : queryEnd;
            selection = makeSelection(pickedDate, clampHour(pickedHour), initialEnd, noteText);
        } else if (pickedDate) {
            selection = makeSelection(pickedDate, clampHour(pickedHour), endOfCa(clampHour(pickedHour)), noteText);
        }

        function demoFor(date) {
            return [];
        }

        function blocksFor(date) {
            var key = dateKey(date);
            var list = demoFor(date);
            holds.forEach(function (h) {
                if (h.dateKey === key) list.push(h);
            });
            return list;
        }

        function eventTitle(b) {
            if (b.state === "confirmed") return "Đã đặt";
            if (b.state === "pending") return "Chờ duyệt";
            return b.you ? "Giữ chỗ của bạn" : "Giữ chỗ (30p)";
        }

        function eventTime(b) {
            return PAD(b.start) + ":00 – " + PAD(Math.min(b.end, CLOSE)) + ":00";
        }

        function renderPicker() {
            if (!selection) {
                picker.hidden = true;
                return;
            }
            picker.hidden = false;
            var d = parseKey(selection.dateKey);
            pickerWhen.textContent = FULL[d.getDay()] + ", " + PAD(d.getDate()) + "/" + PAD(d.getMonth() + 1);
            var ca = caFor(selection.start);
            pickerHour.textContent = timeRange(selection.start, selection.end) + " · Ca " + ca.name +
                " (" + PAD(ca.start) + ":00 – " + PAD(ca.end) + ":00)";
            if (startSelect.value !== PAD(selection.start)) startSelect.value = PAD(selection.start);
            if (endSelect.value !== PAD(selection.end)) endSelect.value = PAD(selection.end);
            if (document.activeElement !== noteInput) noteInput.value = noteText;
            continueLink.href = "create-rental-order.html?xe=" + encodeURIComponent(vehicle) +
                "&date=" + selection.dateKey + "&hour=" + PAD(selection.start) + ":00" +
                "&end=" + PAD(selection.end) + ":00" +
                (noteText ? "&note=" + encodeURIComponent(noteText) : "");
        }

        function rangeLabel() {
            if (viewMode === "day") {
                return FULL[anchor.getDay()] + ", " + fmt(anchor) + " ⌄";
            }
            if (viewMode === "month") {
                return "Tháng " + (anchor.getMonth() + 1) + "/" + anchor.getFullYear() + " ⌄";
            }
            var start = weekStart(anchor);
            var end = addDays(start, 6);
            var text;
            if (start.getMonth() === end.getMonth()) {
                text = start.getDate() + " - " + end.getDate() + "/" + PAD(end.getMonth() + 1) + "/" + end.getFullYear();
            } else {
                text = start.getDate() + "/" + PAD(start.getMonth() + 1) + " - " +
                    end.getDate() + "/" + PAD(end.getMonth() + 1) + "/" + end.getFullYear();
            }
            return text + " ⌄";
        }

        function renderToolbar() {
            rangeEl.textContent = rangeLabel();
            viewButtons.forEach(function (btn) {
                btn.classList.toggle("is-active", btn.getAttribute("data-view") === viewMode);
            });
        }

        function renderTimeGrid(days) {
            var cols = "64px repeat(" + days.length + ", minmax(0, 1fr))";
            var innerMin = days.length === 1 ? 420 : 760;
            var html = '<div class="cal-scroll"><div class="cal-inner" style="min-width:' + innerMin + 'px">';
            html += '<div class="cal-head" style="grid-template-columns:' + cols + '">';
            html += '<div class="cal-corner">GMT+7</div>';
            days.forEach(function (d) {
                var isToday = dateKey(d) === todayKey;
                html += '<div class="cal-dayhead' + (isToday ? " is-today" : "") + '">' +
                    '<span>' + (days.length === 1 ? FULL[d.getDay()] : SHORT[d.getDay()]) + '</span>' +
                    '<strong>' + d.getDate() + '</strong></div>';
            });
            html += '</div>';

            html += '<div class="cal-grid" style="grid-template-columns:' + cols + ';height:' + (CLOSE - OPEN + 1) * ROW_H + 'px">';
            html += '<div class="cal-times">';
            for (var h = OPEN; h <= CLOSE; h++) {
                html += '<div class="cal-time" style="height:' + ROW_H + 'px">' + hourLabel(h) + '</div>';
            }
            html += '</div>';

            days.forEach(function (d) {
                var key = dateKey(d);
                html += '<div class="cal-col' + (key === todayKey ? " is-today" : "") + '" data-date="' + key + '">';
                blocksFor(d).forEach(function (b) {
                    var top = (Math.max(b.start, OPEN) - OPEN) * ROW_H;
                    var height = (Math.min(b.end, CLOSE) - Math.max(b.start, OPEN)) * ROW_H;
                    if (height <= 0) return;
                    html += '<div class="cal-event state-' + b.state + (b.you ? " is-you" : "") +
                        '" style="top:' + top + 'px;height:' + height + 'px">' +
                        '<span class="ev-title">' + eventTitle(b) + '</span>' +
                        '<span class="ev-time">' + eventTime(b) + '</span>' +
                        '<span class="ev-id">' + b.id + '</span>' +
                        (b.note ? '<span class="ev-note">' + b.note + '</span>' : "") +
                        (b.you ? '<span class="ev-handle ev-handle-top" data-edge="start"></span>' +
                            '<span class="ev-handle ev-handle-bottom" data-edge="end"></span>' : "") +
                        '</div>';
                });
                if (selection && selection.dateKey === key) {
                    var selTop = (selection.start - OPEN) * ROW_H;
                    var selHeight = (selection.end - selection.start) * ROW_H;
                    html += '<div class="cal-slot-sel" style="top:' + selTop + 'px;height:' + selHeight + 'px"></div>';
                }
                html += '</div>';
            });

            var todayInView = days.some(function (d) { return dateKey(d) === todayKey; });
            var nowTop = (today.getHours() + today.getMinutes() / 60 - OPEN) * ROW_H;
            if (todayInView && nowTop >= 0 && nowTop <= (CLOSE - OPEN) * ROW_H) {
                html += '<div class="cal-nowbar" style="top:' + nowTop + 'px"><span>' + nowLabel() + '</span></div>';
            }

            html += '</div></div></div>';
            bodyEl.innerHTML = html;
        }

        function renderMonth() {
            var first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
            var start = weekStart(first);
            var html = '<div class="cal-scroll"><div class="cal-inner" style="min-width:680px">';
            html += '<div class="cal-month-head">' + SHORT.map(function (s) { return "<div>" + s + "</div>"; }).join("") + '</div>';
            html += '<div class="cal-month-grid">';
            for (var i = 0; i < 42; i++) {
                var d = addDays(start, i);
                var key = dateKey(d);
                var inMonth = d.getMonth() === first.getMonth();
                var isToday = key === todayKey;
                var hasHold = holds.some(function (h) { return h.dateKey === key; });
                html += '<button type="button" class="cal-month-day' + (inMonth ? "" : " is-out") +
                    (isToday ? " is-today" : "") + (selection && selection.dateKey === key ? " is-selected" : "") +
                    '" data-date="' + key + '"><span>' + d.getDate() + '</span>' +
                    (hasHold ? '<i class="md-dot"></i>' : "") + '</button>';
            }
            html += '</div></div></div>';
            bodyEl.innerHTML = html;
        }

        function render() {
            ensureHold();
            renderToolbar();
            if (viewMode === "month") {
                renderMonth();
            } else if (viewMode === "day") {
                renderTimeGrid([new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())]);
            } else {
                var start = weekStart(anchor);
                var days = [];
                for (var i = 0; i < 7; i++) days.push(addDays(start, i));
                renderTimeGrid(days);
            }
            renderPicker();
        }

        function selectSlot(date, hour) {
            selection = makeSelection(date, clampHour(hour), endOfCa(clampHour(hour)), noteText);
            anchor = date;
            render();
        }

        startSelect.addEventListener("change", function () {
            if (!selection) return;
            var start = parseInt(startSelect.value, 10);
            selection = makeSelection(selection.date, start, selection.end, noteText);
            render();
        });
        endSelect.addEventListener("change", function () {
            if (!selection) return;
            var end = parseInt(endSelect.value, 10);
            selection = makeSelection(selection.date, selection.start, end, noteText);
            render();
        });
        noteInput.addEventListener("input", function () {
            noteText = noteInput.value;
            if (!selection) return;
            selection.note = noteText;
            ensureHold();
            continueLink.href = "create-rental-order.html?xe=" + encodeURIComponent(vehicle) +
                "&date=" + selection.dateKey + "&hour=" + PAD(selection.start) + ":00" +
                "&end=" + PAD(selection.end) + ":00" +
                (noteText ? "&note=" + encodeURIComponent(noteText) : "");
        });
        noteInput.addEventListener("change", function () {
            noteText = noteInput.value;
            if (selection) {
                selection.note = noteText;
                render();
            }
        });

        bodyEl.addEventListener("click", function (e) {
            var md = e.target.closest ? e.target.closest(".cal-month-day") : null;
            if (!md) return;
            var picked = parseKey(md.getAttribute("data-date"));
            viewMode = "day";
            anchor = picked;
            selectSlot(picked, selection ? selection.start : OPEN);
        });

        function hourFromPoint(e, colEl) {
            var rect = colEl.getBoundingClientRect();
            var hour = OPEN + Math.floor((e.clientY - rect.top) / ROW_H);
            return Math.max(OPEN, Math.min(CLOSE - 1, hour));
        }

        function colAtPoint(x, y) {
            var el = document.elementFromPoint(x, y);
            return el && el.closest ? el.closest(".cal-col") : null;
        }

        var drag = null;

        function startDrag(e, state) {
            state.x = e.clientX;
            state.y = e.clientY;
            state.moved = false;
            drag = state;
            bodyEl.classList.add("is-dragging");
            try { bodyEl.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
            e.preventDefault();
        }

        bodyEl.addEventListener("pointerdown", function (e) {
            if (e.button !== 0 || viewMode === "month") return;
            var eventEl = e.target.closest ? e.target.closest(".cal-event") : null;
            var handle = e.target.closest ? e.target.closest(".ev-handle") : null;

            if (handle && eventEl && selection) {
                startDrag(e, {
                    mode: "resize",
                    edge: handle.getAttribute("data-edge"),
                    date: selection.date
                });
                return;
            }
            if (eventEl && eventEl.classList.contains("is-you") && selection) {
                var moveCol = eventEl.closest(".cal-col");
                if (!moveCol) return;
                startDrag(e, {
                    mode: "move",
                    offset: hourFromPoint(e, moveCol) - selection.start
                });
                return;
            }
            if (eventEl) return;

            var col = e.target.closest ? e.target.closest(".cal-col") : null;
            if (!col) return;
            var hour = hourFromPoint(e, col);
            startDrag(e, {
                mode: "create",
                date: parseKey(col.getAttribute("data-date")),
                anchorHour: hour
            });
            selection = makeSelection(drag.date, hour, hour + 1, noteText);
            anchor = drag.date;
            render();
        });

        bodyEl.addEventListener("pointermove", function (e) {
            if (!drag) return;
            if (!drag.moved && Math.abs(e.clientX - drag.x) < 4 && Math.abs(e.clientY - drag.y) < 4) return;
            drag.moved = true;

            if (drag.mode === "create") {
                var createCol = bodyEl.querySelector('.cal-col[data-date="' + dateKey(drag.date) + '"]');
                if (!createCol) return;
                var hour = hourFromPoint(e, createCol);
                var start = Math.min(drag.anchorHour, hour);
                var end = Math.max(drag.anchorHour, hour) + 1;
                selection = makeSelection(drag.date, start, end, noteText);
                render();
                return;
            }

            if (!selection) return;
            if (drag.mode === "resize") {
                var resizeCol = bodyEl.querySelector('.cal-col[data-date="' + selection.dateKey + '"]');
                if (!resizeCol) return;
                var hover = hourFromPoint(e, resizeCol);
                if (drag.edge === "start") {
                    selection = makeSelection(selection.date, Math.min(hover, selection.end - 1), selection.end, noteText);
                } else {
                    selection = makeSelection(selection.date, selection.start, Math.max(hover + 1, selection.start + 1), noteText);
                }
                render();
                return;
            }

            var moveCol = colAtPoint(e.clientX, e.clientY);
            if (!moveCol) return;
            var date = parseKey(moveCol.getAttribute("data-date"));
            var duration = selection.end - selection.start;
            var dropHour = hourFromPoint(e, moveCol);
            var nextStart = Math.max(OPEN, Math.min(CLOSE - duration, dropHour - drag.offset));
            selection = makeSelection(date, nextStart, nextStart + duration, noteText);
            anchor = date;
            render();
        });

        function endDrag(e) {
            if (!drag) return;
            var state = drag;
            drag = null;
            bodyEl.classList.remove("is-dragging");
            try { bodyEl.releasePointerCapture(e.pointerId); } catch (err) { /* no-op */ }
            if (!state.moved && state.mode === "create" && selection) {
                selection = makeSelection(selection.date, selection.start, endOfCa(selection.start), noteText);
                render();
            }
        }
        bodyEl.addEventListener("pointerup", endDrag);
        bodyEl.addEventListener("pointercancel", endDrag);

        document.getElementById("calToday").addEventListener("click", function () {
            anchor = new Date(today);
            render();
        });
        document.getElementById("calPrev").addEventListener("click", function () {
            if (viewMode === "day") anchor = addDays(anchor, -1);
            else if (viewMode === "week") anchor = addDays(anchor, -7);
            else anchor = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
            render();
        });
        document.getElementById("calNext").addEventListener("click", function () {
            if (viewMode === "day") anchor = addDays(anchor, 1);
            else if (viewMode === "week") anchor = addDays(anchor, 7);
            else anchor = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
            render();
        });
        viewButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                viewMode = btn.getAttribute("data-view");
                render();
            });
        });

        document.getElementById("vsName").textContent = vehicle;
        document.getElementById("vsMeta").textContent = stored.type ? stored.type + " · Đà Nẵng" : "VRP-GO · Đà Nẵng";
        document.title = vehicle + " · Lịch thuê · VRP-GO";

        if (stored.name) {
            document.getElementById("bookingStatusVehicle").textContent = stored.name;
            document.getElementById("bookingStatus").hidden = false;
        }

        render();
    })();

(function () {
  var link = document.getElementById('spContinue');
  var cont = document.querySelector('.btn-continue');
  function save() {
    var href = link ? (link.getAttribute('href') || '') : '';
    var q = new URLSearchParams(href.indexOf('?') >= 0 ? href.split('?')[1] : '');
    try {
      if (q.get('xe')) sessionStorage.setItem('selectedVehicleName', q.get('xe'));
      if (q.get('date')) sessionStorage.setItem('selectedVehicleDate', q.get('date'));
      if (q.get('hour')) sessionStorage.setItem('selectedVehicleHour', q.get('hour'));
      var label = '';
      if (q.get('date')) {
        var d = new Date(q.get('date') + 'T00:00:00');
        if (!isNaN(d.getTime())) label = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
      }
      if (q.get('hour')) label += (label ? ' · ' : '') + q.get('hour') + (q.get('end') ? ' – ' + q.get('end') : '');
      if (label) sessionStorage.setItem('vrpScheduleLabel', label);
    } catch (e) {}
  }
  if (link) {
    save();
    if (window.MutationObserver) new MutationObserver(save).observe(link, { attributes: true, attributeFilter: ['href'] });
    link.addEventListener('click', save, true);
  }
  if (cont) cont.addEventListener('click', save, true);
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
    "how-it-works.html": "how-it-works.html"
};
    var PAGE = "weekly-vehicle-schedule.html";

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
