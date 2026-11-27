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
  var PAGE = "vehicle-search.html";
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

    if (ctrl.area.dataset.vrpLoading === "1") {
      clearHost(ctrl);
      setTargetVisible(ctrl, true);
      return;
    }

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
      price: "20K",
      period: "/giờ",
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
      price: "20K",
      period: "/giờ",
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
      price: "150K",
      period: "/giờ",
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
    isFav: isFav,
    refresh: paintHearts
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
      period: "/giờ",
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

(function () {
  var pickupDate = document.querySelector('input[name="pickup-date"]');
  var pickupHour = document.querySelector('select[name="pickup-hour"]');
  var returnDate = document.querySelector('input[name="return-date"]');
  var returnHour = document.querySelector('select[name="return-hour"]');

  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDay(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  var now = new Date();
  var today = isoDay(now);
  var tomorrow = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  if (pickupDate) { pickupDate.min = today; }
  if (returnDate) { returnDate.min = today; }

  /* Nhận ngày giờ người dùng đã chọn ở trang chủ (form tìm xe) */
  var params = new URLSearchParams(window.__VRP_QUERY || "");
  var pickup = params.get("pickup") || "";
  var giveBack = params.get("return") || "";

  if (pickupDate && /^\d{4}-\d{2}-\d{2}/.test(pickup)) {
    pickupDate.value = pickup.slice(0, 10);
    if (pickupHour && pickup.slice(11, 16)) {
      var wanted = pickup.slice(11, 16);
      var opt = Array.prototype.find.call(pickupHour.options, function (o) { return o.value === wanted; });
      if (!opt) {
        wanted = wanted.slice(0, 2) + ":00";
        opt = Array.prototype.find.call(pickupHour.options, function (o) { return o.value === wanted; });
      }
      if (opt) pickupHour.value = opt.value;
    }
  }

  if (returnDate && /^\d{4}-\d{2}-\d{2}/.test(giveBack)) {
    returnDate.value = giveBack.slice(0, 10);
    if (returnHour && giveBack.slice(11, 16)) {
      var wantedR = giveBack.slice(11, 16);
      var optR = Array.prototype.find.call(returnHour.options, function (o) { return o.value === wantedR; });
      if (!optR) {
        wantedR = wantedR.slice(0, 2) + ":00";
        optR = Array.prototype.find.call(returnHour.options, function (o) { return o.value === wantedR; });
      }
      if (optR) returnHour.value = optR.value;
    }
  }

  function currentDate() { return (pickupDate && pickupDate.value) || today; }
  function currentHour() { return (pickupHour && pickupHour.value) || "08:00"; }

  function calendarHref(name) {
    return "weekly-vehicle-schedule.html?xe=" + encodeURIComponent(name) +
      "&date=" + currentDate() + "&hour=" + encodeURIComponent(currentHour());
  }

  /* Cập nhật sẵn link để ngày/giờ đi kèm cả khi mở bản gộp 1 file */
  function syncRentLinks() {
    document.querySelectorAll(".btn-rent-vrp").forEach(function (btn) {
      const card = btn.closest(".vehicle-card");
      const nameEl = card && card.querySelector("h3");
      if (nameEl) btn.setAttribute("href", calendarHref(nameEl.textContent.trim()));
    });
  }

  syncRentLinks();
  if (pickupDate) pickupDate.addEventListener("change", syncRentLinks);
  if (pickupHour) pickupHour.addEventListener("change", syncRentLinks);

  document.querySelectorAll(".btn-rent-vrp").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const card = btn.closest(".vehicle-card");
      const meta = card.querySelector(".meta").textContent.trim();
      const name = card.querySelector("h3").textContent.trim();
      const day = currentDate();
      const hour = currentHour();

      sessionStorage.setItem("selectedVehicleName", name);
      sessionStorage.setItem("selectedVehicleType", card.querySelector(".type").textContent.trim());
      sessionStorage.setItem("selectedVehicleRating", meta);
      sessionStorage.setItem("selectedVehicleSpecs", meta);
      sessionStorage.setItem("selectedVehiclePrice", card.querySelector(".price").textContent.trim());
      sessionStorage.setItem("selectedVehicleImage", card.querySelector("img").src);
      sessionStorage.setItem("selectedVehicleDate", day);
      sessionStorage.setItem("selectedVehicleHour", hour);

      btn.setAttribute("href", calendarHref(name));
    });
  });
})();

/* Lọc xe theo loại, giá, hãng, hình thức giao nhận, điểm đánh giá & sắp xếp theo giá, đánh giá, khoảng cách */
(function () {
  const grid = document.querySelector(".vehicle-grid");
  const panel = document.querySelector(".filter-panel");
  if (!grid || !panel) return;

  const api = window.VRPVehicleAPI;
  const sortSelect = document.getElementById("vehicleSort");
  const resetBtn = document.getElementById("resetFiltersBtn");
  const resultsCountEl = document.getElementById("resultsCount");
  const locateBtn = document.getElementById("locateUserBtn");
  const locationStatusEl = document.getElementById("locationStatus");
  const pickupDateEl = panel.querySelector('input[name="pickup-date"]');
  const pickupHourEl = panel.querySelector('select[name="pickup-hour"]');
  const returnDateEl = panel.querySelector('input[name="return-date"]');
  const returnHourEl = panel.querySelector('select[name="return-hour"]');

  const DEFAULT_COORDS = api ? api.DEFAULT_COORDS : { lat: 16.0678, lng: 108.2208, label: "Mặc định: Trung tâm Đà Nẵng" };
  let userCoords = { lat: DEFAULT_COORDS.lat, lng: DEFAULT_COORDS.lng, isCustom: false };
  let apiMode = null; // null = chưa kiểm tra, true = dùng API backend, false = fallback dữ liệu cục bộ
  let apiVehicleMap = Object.create(null);

  const localCards = Array.from(grid.querySelectorAll(".vehicle-card"));
  const FALLBACK_IMG = api ? api.FALLBACK_IMG : "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=80";

  function haversineKm(lat1, lon1, lat2, lon2) {
    return api ? api.haversineKm(lat1, lon1, lat2, lon2) : 0;
  }

  function escapeHtml(value) {
    return api ? api.escapeHtml(value) : String(value == null ? "" : value);
  }

  function formatPrice(amount) {
    return api ? api.formatPrice(amount) : (String(amount || 0) + "đ");
  }

  function hydrateFiltersFromUrl() {
    const q = new URLSearchParams(window.location.search || "");
    const applyChecks = function (paramName, inputName) {
      const vals = q.getAll(paramName).join(",").split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      if (!vals.length) return;
      panel.querySelectorAll('input[name="' + inputName + '"]').forEach(function (cb) {
        if (vals.indexOf(cb.value.toLowerCase()) !== -1) cb.checked = true;
      });
    };
    applyChecks("type", "type");
    applyChecks("vehicle_type", "type");
    applyChecks("brand", "brand");
    applyChecks("delivery", "delivery");
    applyChecks("delivery_method", "delivery");

    const priceParam = q.get("price");
    if (priceParam) {
      const r = panel.querySelector('input[name="price"][value="' + priceParam + '"]');
      if (r) r.checked = true;
    }
    const ratingParam = q.get("rating") || q.get("min_rating");
    if (ratingParam) {
      const r = panel.querySelector('input[name="rating"][value="' + ratingParam + '"]');
      if (r) r.checked = true;
    }
    const sortParam = q.get("sort") || q.get("sort_by");
    if (sortParam && sortSelect) {
      const normalized = sortParam.replace("_", "-");
      const opt = Array.from(sortSelect.options).find(function (o) { return o.value === normalized; });
      if (opt) sortSelect.value = opt.value;
    }
  }

  function cardData(card) {
    const typeText = (card.querySelector(".type")?.textContent || "").toLowerCase();
    const nameText = (card.querySelector("h3")?.textContent || "").toLowerCase();
    const metaText = card.querySelector(".meta")?.textContent || "";
    const priceText = card.querySelector(".price")?.textContent || "";
    const rawDelivery = (card.dataset.delivery || "tai-cua-hang").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    const ratingMatch = metaText.match(/([0-9]+(?:[.,][0-9]+)?)/);

    const type = card.dataset.type || (typeText.includes("ô tô") ? "o-to" : typeText.includes("xe điện") ? "xe-dien" : "xe-may");
    const brand = card.dataset.brand || (
      nameText.includes("honda") ? "honda"
        : nameText.includes("yamaha") ? "yamaha"
        : nameText.includes("vinfast") ? "vinfast"
        : nameText.includes("hyundai") ? "hyundai"
        : nameText.includes("toyota") ? "toyota" : ""
    );
    const price = Number(card.dataset.price || priceText.replace(/[^\d]/g, "")) || 0;
    const rating = Number(card.dataset.rating || (ratingMatch ? ratingMatch[1].replace(",", ".") : 0)) || 0;
    const lat = card.dataset.lat !== undefined && card.dataset.lat !== "" ? Number(card.dataset.lat) : NaN;
    const lng = card.dataset.lng !== undefined && card.dataset.lng !== "" ? Number(card.dataset.lng) : NaN;
    const distance = Number.isFinite(lat) && Number.isFinite(lng)
      ? haversineKm(userCoords.lat, userCoords.lng, lat, lng)
      : Infinity;

    return {
      name: card.querySelector("h3")?.textContent.trim() || "",
      typeLabel: card.querySelector(".type")?.textContent.trim() || "",
      type: type,
      brand: brand,
      price: price,
      rating: rating,
      reviews: Number(card.dataset.reviews || 0),
      location: card.dataset.location || "Đà Nẵng",
      image: card.querySelector("img")?.src || FALLBACK_IMG,
      delivery: rawDelivery,
      deliveryLabels: rawDelivery.map(function (d) { return d === "giao-tan-noi" ? "Giao tận nơi" : "Nhận tại cửa hàng"; }),
      distance: distance
    };
  }

  function checkedValues(name) {
    return Array.from(panel.querySelectorAll('input[name="' + name + '"]:checked')).map(function (input) {
      return input.value;
    }).filter(Boolean);
  }

  function getSelectedFilters() {
    const priceVal = panel.querySelector('input[name="price"]:checked')?.value || "";
    const ratingVal = Number(panel.querySelector('input[name="rating"]:checked')?.value || 0);
    const startTime = (pickupDateEl && pickupDateEl.value)
      ? (pickupDateEl.value + "T" + ((pickupHourEl && pickupHourEl.value) || "08:00") + ":00")
      : "";
    const endTime = (returnDateEl && returnDateEl.value)
      ? (returnDateEl.value + "T" + ((returnHourEl && returnHourEl.value) || "17:00") + ":00")
      : "";
    return {
      types: checkedValues("type"),
      brands: checkedValues("brand"),
      deliveries: checkedValues("delivery"),
      price: priceVal,
      minRating: ratingVal,
      sort: sortSelect ? sortSelect.value : "default",
      userLat: userCoords.lat,
      userLng: userCoords.lng,
      startTime: startTime,
      endTime: endTime
    };
  }

  function updateResultCount(count) {
    if (resultsCountEl) {
      resultsCountEl.textContent = "Hiển thị " + count + " xe";
    }
  }

  function updateCardDistanceText(card, distKm) {
    const metaEl = card.querySelector(".meta");
    if (!metaEl) return;
    const baseLocation = card.dataset.location || "Đà Nẵng";
    const ratingVal = card.dataset.rating || "4.8";
    const reviewsVal = card.dataset.reviews;
    const ratingPart = reviewsVal ? ("★ " + ratingVal + " (" + reviewsVal + ")") : ("★ " + ratingVal);
    const distPart = Number.isFinite(distKm) ? (" · " + distKm.toFixed(1) + " km") : "";
    metaEl.textContent = ratingPart + " · " + baseLocation + distPart;
  }

  function applyLocalFiltersAndSort() {
    const f = getSelectedFilters();
    let visibleCount = 0;

    localCards.forEach(function (card) {
      const data = cardData(card);
      let match = true;

      if (f.types.length && f.types.indexOf(data.type) === -1) match = false;
      if (f.brands.length && f.brands.indexOf(data.brand) === -1) match = false;
      if (f.deliveries.length && !f.deliveries.some(function (d) { return data.delivery.indexOf(d) !== -1; })) match = false;
      if (f.price === "under-25" && data.price >= 25000) match = false;
      if (f.price === "mid-35" && (data.price < 25000 || data.price > 35000)) match = false;
      if (f.price === "over-35" && data.price <= 35000) match = false;
      if (f.minRating && data.rating < f.minRating) match = false;

      card.hidden = !match;
      updateCardDistanceText(card, data.distance);
      if (match) visibleCount++;
    });

    const visibleCards = localCards.filter(function (c) { return !c.hidden; });
    const hiddenCards = localCards.filter(function (c) { return c.hidden; });

    if (f.sort === "price-asc") {
      visibleCards.sort(function (a, b) { return cardData(a).price - cardData(b).price; });
    } else if (f.sort === "price-desc") {
      visibleCards.sort(function (a, b) { return cardData(b).price - cardData(a).price; });
    } else if (f.sort === "rating-desc") {
      visibleCards.sort(function (a, b) { return cardData(b).rating - cardData(a).rating; });
    } else if (f.sort === "distance-asc") {
      visibleCards.sort(function (a, b) { return cardData(a).distance - cardData(b).distance; });
    }

    const ordered = f.sort === "default" ? localCards : visibleCards.concat(hiddenCards);
    ordered.forEach(function (card) { grid.appendChild(card); });

    updateResultCount(visibleCount);
    const area = grid.closest("[data-data-area]");
    if (window.VRPDataState && area) window.VRPDataState.refresh(area);
    if (window.VRPFavorites && window.VRPFavorites.refresh) window.VRPFavorites.refresh();
  }

  function renderApiCards(items) {
    apiVehicleMap = Object.create(null);
    grid.innerHTML = items.map(function (v) {
      apiVehicleMap[String(v.vehicle_id)] = v;
      const fullName = [v.brand, v.model].filter(Boolean).join(" ").trim() || v.brand;
      const priceStr = v.price_per_day != null ? formatPrice(v.price_per_day) : "Liên hệ";
      const ratingStr = Number(v.rating || 0).toFixed(1);
      const countPart = v.review_count ? (" (" + v.review_count + ")") : "";
      const locText = v.store_address || v.city_name || "Đà Nẵng";
      const distPart = v.distance_km != null ? (" · " + Number(v.distance_km).toFixed(1) + " km") : "";
      const imgUrl = v.image_url || FALLBACK_IMG;
      const deliveryTagsHtml = (v.delivery_methods || []).map(function (m) {
        const isHome = m.toLowerCase().includes("tận nơi");
        return '<span class="delivery-tag' + (isHome ? " is-delivery" : "") + '">' + escapeHtml(m) + "</span>";
      }).join("");
      const pickupDay = (pickupDateEl && pickupDateEl.value) || "";
      const pickupHr = (pickupHourEl && pickupHourEl.value) || "08:00";
      const rentHref = "weekly-vehicle-schedule.html?xe=" + encodeURIComponent(fullName) +
        (pickupDay ? "&date=" + encodeURIComponent(pickupDay) + "&hour=" + encodeURIComponent(pickupHr) : "");

      return (
        '<article class="vehicle-card" data-vehicle-id="' + escapeHtml(v.vehicle_id) + '">' +
          '<div class="img-wrap">' +
            '<button type="button" class="favorite-btn" aria-label="Thêm vào xe yêu thích">♡</button>' +
            '<img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(fullName) + '">' +
          "</div>" +
          '<div class="body">' +
            '<p class="type">' + escapeHtml(v.type) + "</p>" +
            "<h3>" + escapeHtml(fullName) + "</h3>" +
            '<p class="meta">★ ' + ratingStr + countPart + " · " + escapeHtml(locText) + distPart + "</p>" +
            (deliveryTagsHtml ? '<div class="delivery-tags">' + deliveryTagsHtml + "</div>" : "") +
            '<div class="bottom">' +
              '<p class="price">' + escapeHtml(priceStr) + ' <span>/ giờ</span></p>' +
              '<div class="vehicle-actions">' +
                '<a href="#chi-tiet-xe" class="btn btn-outline btn-sm btn-detail-vrp">Chi tiết</a>' +
                '<a href="' + rentHref + '" class="btn btn-primary btn-sm btn-rent-vrp">Thuê xe</a>' +
              "</div>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    updateResultCount(items.length);
    const area = grid.closest("[data-data-area]");
    if (window.VRPDataState && area) window.VRPDataState.refresh(area);
    if (window.VRPFavorites && window.VRPFavorites.refresh) window.VRPFavorites.refresh();
  }

  function resolveCardVehicle(card) {
    const vid = card && card.dataset ? card.dataset.vehicleId : null;
    if (vid && apiVehicleMap[vid]) return apiVehicleMap[vid];
    const d = cardData(card);
    return {
      name: d.name,
      type: d.typeLabel || d.type,
      rating: d.rating,
      reviews: d.reviews,
      location: d.location,
      distance_km: Number.isFinite(d.distance) ? d.distance : null,
      delivery_methods: d.deliveryLabels,
      price: formatPrice(d.price),
      price_per_day: d.price,
      image: d.image
    };
  }

  let activeRequestId = 0;
  async function applyFiltersAndSort() {
    if (!api) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:42px 16px;color:#64748b;font-size:14px;">Không thể kết nối API tìm xe.</div>';
      updateResultCount(0);
      return;
    }

    const requestId = ++activeRequestId;
    const area = grid.closest("[data-data-area]");
    if (area) area.dataset.vrpLoading = "1";
    if (window.VRPDataState && area) window.VRPDataState.refresh(area);
    if (api.showLoadingPopup) api.showLoadingPopup("Đang tải danh sách xe...");

    try {
      const items = await api.fetchVehicles(getSelectedFilters(), 15000);
      if (requestId !== activeRequestId) return;

      if (area) delete area.dataset.vrpLoading;
      apiMode = true;
      renderApiCards(items);
    } catch (err) {
      if (requestId !== activeRequestId) return;
      if (area) delete area.dataset.vrpLoading;
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:42px 16px;color:#e11d48;font-size:14px;">Không thể tải danh sách xe từ cơ sở dữ liệu. Vui lòng thử lại sau.</div>';
      if (window.VRPDataState && area) window.VRPDataState.refresh(area);
      updateResultCount(0);
    } finally {
      if (requestId === activeRequestId && api.hideLoadingPopup) {
        api.hideLoadingPopup();
      }
    }
  }

  // Event delegation cho cả nút Chi tiết (mở modal) và Thuê xe (lưu dữ liệu xe thật)
  grid.addEventListener("click", function (event) {
    const detailBtn = event.target.closest(".btn-detail-vrp");
    if (detailBtn) {
      event.preventDefault();
      const card = detailBtn.closest(".vehicle-card");
      if (card && api) {
        const extra = {
          date: (pickupDateEl && pickupDateEl.value) || "",
          hour: (pickupHourEl && pickupHourEl.value) || "08:00"
        };
        const vehicleObj = resolveCardVehicle(card);
        api.saveSelectedVehicle(vehicleObj, extra);
        api.openVehicleModal(vehicleObj, extra);
      }
      return;
    }

    const rentBtn = event.target.closest(".btn-rent-vrp");
    if (!rentBtn) return;
    const card = rentBtn.closest(".vehicle-card");
    if (!card || !api) return;
    api.saveSelectedVehicle(resolveCardVehicle(card), {
      date: (pickupDateEl && pickupDateEl.value) || "",
      hour: (pickupHourEl && pickupHourEl.value) || "08:00"
    });
  });

  if (locateBtn) {
    locateBtn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        if (window.showToast) window.showToast("Trình duyệt không hỗ trợ định vị. Đang dùng trung tâm Đà Nẵng.");
        return;
      }
      if (locationStatusEl) locationStatusEl.textContent = "Đang lấy vị trí...";
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          userCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isCustom: true
          };
          if (locationStatusEl) {
            locationStatusEl.textContent = "Vị trí của bạn (" + userCoords.lat.toFixed(3) + ", " + userCoords.lng.toFixed(3) + ")";
          }
          if (sortSelect && sortSelect.value !== "distance-asc") {
            sortSelect.value = "distance-asc";
          }
          applyFiltersAndSort();
        },
        function () {
          userCoords = { lat: DEFAULT_COORDS.lat, lng: DEFAULT_COORDS.lng, isCustom: false };
          if (locationStatusEl) locationStatusEl.textContent = DEFAULT_COORDS.label;
          if (window.showToast) window.showToast("Không truy cập được vị trí, đang tính theo trung tâm Đà Nẵng.");
          applyFiltersAndSort();
        },
        { enableHighAccuracy: false, timeout: 6000 }
      );
    });
  }

  panel.querySelectorAll('input[type="checkbox"], input[type="radio"], input[type="date"], select').forEach(function (input) {
    input.addEventListener("change", applyFiltersAndSort);
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", applyFiltersAndSort);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      panel.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
      panel.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = r.value === ""; });
      if (pickupDateEl) pickupDateEl.value = "";
      if (returnDateEl) returnDateEl.value = "";
      if (sortSelect) sortSelect.value = "default";
      applyFiltersAndSort();
    });
  }

  hydrateFiltersFromUrl();
  if (api) {
    grid.innerHTML = "";
    if (resultsCountEl) resultsCountEl.textContent = "Đang tải xe...";
    applyFiltersAndSort();
  } else {
    applyLocalFiltersAndSort();
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
    var PAGE = "vehicle-search.html";

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


/* VRP-GO: đồng bộ xe đang chọn giữa các giao diện */
(function () {
  var CARS = [{"name": "Honda Vision 2024", "type": "Tay ga · Phố", "specType": "Tay ga · Phố", "label": "XE MÁY · TAY GA", "rating": "4.9", "reviews": 128, "location": "Hải Châu, Đà Nẵng", "price": "150.000đ", "image": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80", "cc": "110cc", "year": "2024", "plate": "30A-123.45"}, {"name": "Yamaha Exciter 155", "type": "Côn tay · Tour", "specType": "Côn tay · Tour", "label": "XE MÁY · CÔN TAY", "rating": "4.8", "reviews": 64, "location": "Đà Nẵng", "price": "220.000đ", "image": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80", "cc": "155cc", "year": "2024", "plate": "30B-456.78"}, {"name": "Honda SH Mode 125", "type": "Tay ga cao cấp", "specType": "Tay ga cao cấp", "label": "XE MÁY · CAO CẤP", "rating": "4.9", "reviews": 52, "location": "Đà Nẵng", "price": "200.000đ", "image": "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=800&q=80", "cc": "125cc", "year": "2024", "plate": "30C-789.01"}, {"name": "VinFast Feliz S", "type": "Xe điện", "specType": "Xe điện", "label": "XE ĐIỆN", "rating": "4.7", "reviews": 41, "location": "Đà Nẵng", "price": "180.000đ", "image": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80", "cc": "Điện", "year": "2024", "plate": "30D-234.56"}, {"name": "Honda Winner X", "type": "Côn tay", "specType": "Côn tay", "label": "XE MÁY · CÔN TAY", "rating": "4.8", "reviews": 58, "location": "Đà Nẵng", "price": "210.000đ", "image": "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=800&q=80", "cc": "150cc", "year": "2024", "plate": "30E-345.67"}, {"name": "Yamaha Janus 2023", "type": "Tay ga · Nữ", "specType": "Tay ga · Nữ", "label": "XE MÁY · TAY GA", "rating": "4.6", "reviews": 37, "location": "Đà Nẵng", "price": "160.000đ", "image": "https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=800&q=80", "cc": "125cc", "year": "2023", "plate": "30F-456.78"}, {"name": "Honda Lead 125", "type": "Tay ga · Cốp rộng", "specType": "Tay ga · Cốp rộng", "label": "XE MÁY · TAY GA", "rating": "4.7", "reviews": 45, "location": "Đà Nẵng", "price": "155.000đ", "image": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80", "cc": "125cc", "year": "2024", "plate": "30G-567.89"}, {"name": "Honda SH 150i", "type": "Tay ga cao cấp", "specType": "Tay ga cao cấp", "label": "XE MÁY · CAO CẤP", "rating": "5.0", "reviews": 71, "location": "Đà Nẵng", "price": "280.000đ", "image": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80", "cc": "150cc", "year": "2024", "plate": "30H-678.90"}, {"name": "Honda Air Blade 160", "type": "Xe máy · Tay ga", "specType": "Tay ga", "label": "XE MÁY · TAY GA", "rating": "4.9", "reviews": 66, "location": "Đà Nẵng", "price": "180.000đ", "image": "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=700&q=80", "cc": "160cc", "year": "2024", "plate": "30I-789.01"}];
  var PAGE = window.__VRP_PAGE || "";

  function norm(v) { return String(v || "").replace(/\s+/g, " ").trim().toLowerCase(); }
  function findCar(name) {
    for (var i = 0; i < CARS.length; i++) {
      if (norm(CARS[i].name) === norm(name)) return CARS[i];
    }
    return null;
  }
  var q = new URLSearchParams(window.location.search || "");
  var chosen = findCar(q.get("xe") || "");

  function save(c) {
    if (!c) return;
    try {
      sessionStorage.setItem("vrpSelectedVehicle", JSON.stringify(c));
      sessionStorage.setItem("selectedVehicleName", c.name || "");
      sessionStorage.setItem("selectedVehicleImage", c.image || "");
      sessionStorage.setItem("selectedVehiclePrice", c.price || "");
      sessionStorage.setItem("selectedVehicleType", c.type || "");
    } catch (e) { /* bỏ qua khi trình duyệt chặn storage */ }
  }
  function restored() {
    try {
      var c = JSON.parse(sessionStorage.getItem("vrpSelectedVehicle") || "null");
      return c && c.name ? c : null;
    } catch (e) { return null; }
  }

  if (PAGE === "index.html") {
    document.querySelectorAll(".vehicles-grid .vehicle-card").forEach(function (card) {
      var h = card.querySelector("h3");
      if (!h) return;
      var name = h.textContent.trim();
      var c = findCar(name);
      var detail = card.querySelector('a[href="vehicle-detail.html"]');
      var rent = card.querySelector(".btn-rent-vrp");
      if (detail) detail.setAttribute("href", "vehicle-detail.html?xe=" + encodeURIComponent(name));
      if (rent) rent.setAttribute("href", "weekly-vehicle-schedule.html?xe=" + encodeURIComponent(name));
      [detail, rent].forEach(function (a) {
        if (a) a.addEventListener("click", function () { save(c || { name: name }); });
      });
    });
  }

  if (PAGE === "vehicle-search.html") {
    document.querySelectorAll(".vehicle-grid .vehicle-card").forEach(function (card) {
      var h = card.querySelector("h3");
      if (!h) return;
      var name = h.textContent.trim();
      var detail = card.querySelector('a[href="vehicle-detail.html"]');
      if (detail) detail.setAttribute("href", "vehicle-detail.html?xe=" + encodeURIComponent(name));
      var rent = card.querySelector(".btn-rent-vrp");
      if (rent) rent.addEventListener("click", function () { save(findCar(name) || { name: name }); });
    });
    var target = chosen || restored();
    if (target) {
      var cards = document.querySelectorAll(".vehicle-grid .vehicle-card");
      for (var i = 0; i < cards.length; i++) {
        var hh = cards[i].querySelector("h3");
        if (hh && norm(hh.textContent) === norm(target.name)) {
          cards[i].style.outline = "3px solid #079b70";
          cards[i].style.outlineOffset = "3px";
          try { cards[i].scrollIntoView({ block: "center" }); } catch (e) {}
          break;
        }
      }
    }
  }

  if (PAGE === "vehicle-detail.html") {
    var c = chosen || restored();
    if (!c) return;
    save(c);

    var nf = new Intl.NumberFormat("vi-VN");
    var money = function (n) { return nf.format(Math.round(n)) + "đ"; };

    document.title = c.name + " · VRP-GO";
    var bc = document.querySelector(".breadcrumb");
    if (bc && bc.childNodes.length) {
      bc.childNodes[bc.childNodes.length - 1].nodeValue = " / " + c.name;
    }
    var img = document.querySelector(".gallery-main img");
    if (img) { img.src = c.image; img.alt = c.name; }
    var label = document.querySelector(".detail-layout .section-label");
    if (label) label.textContent = c.label || "XE MÁY";
    var h1 = document.querySelector(".detail-layout h1");
    if (h1) h1.textContent = c.name;
    var meta = h1 && h1.parentNode.querySelector("p[style]");
    if (meta) {
      meta.innerHTML = "★ " + c.rating + " (" + c.reviews + ") · 📍 " + c.location +
        ' · <span style="color:var(--primary);font-weight:600">Còn xe</span>';
    }
    var specs = document.querySelectorAll(".specs .spec strong");
    if (specs.length >= 4) {
      specs[0].textContent = c.specType;
      specs[1].textContent = c.cc;
      specs[2].textContent = c.year;
      specs[3].textContent = c.plate;
    }
    var rate = Number(String(c.price).replace(/[^0-9]/g, "")) || 0;
    var rent2 = rate * 2;
    var fee = Math.round(rent2 * 0.05);
    var ins = 30000;
    var sub = rent2 + fee + ins;
    var deposit = Math.round(sub * 0.3);
    var big = document.querySelector(".price-big");
    if (big) big.textContent = c.price;
    var lines = document.querySelectorAll(".cost-line strong");
    if (lines.length >= 4) {
      lines[0].textContent = money(rent2);
      lines[1].textContent = money(fee);
      lines[2].textContent = money(ins);
      lines[3].textContent = money(deposit);
    }
    var total = document.querySelector(".cost-total strong");
    if (total) total.textContent = money(sub);
    var book = document.querySelector('.booking-side a[href="create-rental-order.html"]');
    if (book) book.setAttribute("href", "create-rental-order.html?xe=" + encodeURIComponent(c.name));
  }
})();
