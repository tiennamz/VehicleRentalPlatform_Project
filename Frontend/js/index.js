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
  var PAGE = "index.html";
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

document.querySelectorAll(".btn-rent-vrp").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const card = btn.closest(".vehicle-card");
    const meta = card.querySelector(".meta").textContent.trim();
    sessionStorage.setItem("selectedVehicleName", card.querySelector("h3").textContent.trim());
    sessionStorage.setItem("selectedVehicleType", card.querySelector(".type").textContent.trim());
    sessionStorage.setItem("selectedVehicleRating", meta);
    sessionStorage.setItem("selectedVehicleSpecs", meta);
    sessionStorage.setItem("selectedVehiclePrice", card.querySelector(".price").textContent.trim());
    sessionStorage.setItem("selectedVehicleImage", card.querySelector("img").src);
  });
});



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
    var PAGE = "index.html";

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

  function openVehiclePreviewModal(car) {
    if (!car) return;
    var existing = document.getElementById("vrpVehiclePreviewModal");
    if (existing) existing.remove();

    if (!document.getElementById("vrpVehiclePreviewStyle")) {
      var st = document.createElement("style");
      st.id = "vrpVehiclePreviewStyle";
      st.textContent =
        ".vrp-vp-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999;animation:vrpFadeIn .18s ease}" +
        "@keyframes vrpFadeIn{from{opacity:0}to{opacity:1}}" +
        ".vrp-vp-dialog{background:#fff;border-radius:18px;max-width:560px;width:100%;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.28);position:relative;font-family:inherit}" +
        ".vrp-vp-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(15,23,42,.65);color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
        ".vrp-vp-img{width:100%;height:240px;object-fit:cover;display:block;background:#f1f5f9}" +
        ".vrp-vp-body{padding:20px 22px 22px}" +
        ".vrp-vp-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#079b70;background:#e6f7f1;padding:4px 10px;border-radius:999px;margin-bottom:8px}" +
        ".vrp-vp-title{margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a}" +
        ".vrp-vp-meta{font-size:14px;color:#475569;margin-bottom:14px}" +
        ".vrp-vp-specs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px}" +
        ".vrp-vp-spec{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:13px;color:#64748b}" +
        ".vrp-vp-spec strong{display:block;color:#0f172a;font-size:14px;margin-top:2px}" +
        ".vrp-vp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;border-top:1px solid #e2e8f0}" +
        ".vrp-vp-price{font-size:22px;font-weight:800;color:#079b70}" +
        ".vrp-vp-price small{font-size:13px;font-weight:500;color:#64748b}" +
        ".vrp-vp-actions{display:flex;gap:8px}";
      document.head.appendChild(st);
    }

    var rentHref = "weekly-vehicle-schedule.html?xe=" + encodeURIComponent(car.name || "");
    var backdrop = document.createElement("div");
    backdrop.id = "vrpVehiclePreviewModal";
    backdrop.className = "vrp-vp-backdrop";
    backdrop.innerHTML =
      '<div class="vrp-vp-dialog" role="dialog" aria-modal="true">' +
        '<button type="button" class="vrp-vp-close" aria-label="Đóng">&times;</button>' +
        '<img class="vrp-vp-img" src="' + (car.image || "") + '" alt="' + (car.name || "Xe") + '">' +
        '<div class="vrp-vp-body">' +
          '<span class="vrp-vp-badge">' + (car.label || car.type || "XE MÁY") + '</span>' +
          '<h3 class="vrp-vp-title">' + (car.name || "") + '</h3>' +
          '<div class="vrp-vp-meta">★ ' + (car.rating || "4.9") + (car.reviews ? " (" + car.reviews + " đánh giá)" : "") + " · 📍 " + (car.location || "Đà Nẵng") + ' · <strong style="color:#079b70">Còn xe</strong></div>' +
          '<div class="vrp-vp-specs">' +
            '<div class="vrp-vp-spec">Loại xe<strong>' + (car.specType || car.type || "Xe máy") + '</strong></div>' +
            '<div class="vrp-vp-spec">Động cơ / Phân khối<strong>' + (car.cc || "125cc") + '</strong></div>' +
            '<div class="vrp-vp-spec">Đời xe<strong>' + (car.year || "2024") + '</strong></div>' +
            '<div class="vrp-vp-spec">Biển số tham chiếu<strong>' + (car.plate || "43-C1") + '</strong></div>' +
          '</div>' +
          '<div class="vrp-vp-foot">' +
            '<div class="vrp-vp-price">' + (car.price || "150.000đ") + ' <small>/ ngày</small></div>' +
            '<div class="vrp-vp-actions">' +
              '<button type="button" class="btn btn-outline btn-sm vrp-vp-cancel">Đóng</button>' +
              '<a href="' + rentHref + '" class="btn btn-primary btn-sm btn-rent-vrp">Thuê xe</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

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
        save(car);
      });
    }
    document.addEventListener("keydown", onEsc);
    document.body.appendChild(backdrop);
  }

  if (PAGE === "index.html") {
    var featuredGrid = document.querySelector(".vehicles-grid");
    var api = window.VRPVehicleAPI;

    function bindStaticFeaturedCards() {
      document.querySelectorAll(".vehicles-grid .vehicle-card").forEach(function (card) {
        var h = card.querySelector("h3");
        if (!h) return;
        var name = h.textContent.trim();
        var fallbackCar = {
          name: name,
          type: card.querySelector(".type") ? card.querySelector(".type").textContent.trim() : "Xe máy",
          price: card.querySelector(".price") ? card.querySelector(".price").childNodes[0].textContent.trim() : "150.000đ",
          image: card.querySelector("img") ? card.querySelector("img").src : "",
          location: "Đà Nẵng",
          rating: "4.8"
        };
        var c = findCar(name) || fallbackCar;
        var detail = card.querySelector('a[href="vehicle-detail.html"]');
        var rent = card.querySelector(".btn-rent-vrp");
        if (detail) {
          detail.setAttribute("href", "#chi-tiet-xe");
          detail.addEventListener("click", function (e) {
            e.preventDefault();
            save(c);
            openVehiclePreviewModal(c);
          });
        }
        if (rent) {
          rent.setAttribute("href", "weekly-vehicle-schedule.html?xe=" + encodeURIComponent(name));
          rent.addEventListener("click", function () { save(c); });
        }
      });
    }

    bindStaticFeaturedCards();

    if (featuredGrid && api) {
      api.fetchVehicles({ sort: "rating-desc" }, 2200).then(function (items) {
        if (!items || !items.length) return;
        var topItems = items.slice(0, 6);
        var map = Object.create(null);
        featuredGrid.innerHTML = topItems.map(function (v) {
          map[String(v.vehicle_id)] = v;
          var fullName = [v.brand, v.model].filter(Boolean).join(" ").trim() || v.brand;
          var ratingStr = Number(v.rating || 0).toFixed(1);
          var locText = v.store_address || v.city_name || "Đà Nẵng";
          var priceStr = api.formatPrice(v.price_per_day);
          var imgUrl = v.image_url || api.FALLBACK_IMG;
          return (
            '<article class="vehicle-card" data-vehicle-id="' + api.escapeHtml(v.vehicle_id) + '">' +
              '<div class="thumb">' +
                '<span class="badge-avail">Có thể thuê</span>' +
                '<button type="button" class="favorite-btn" aria-label="Thêm vào xe yêu thích">♡</button>' +
                '<img src="' + api.escapeHtml(imgUrl) + '" alt="' + api.escapeHtml(fullName) + '">' +
              "</div>" +
              '<div class="body">' +
                '<p class="type">' + api.escapeHtml(v.type) + "</p>" +
                "<h3>" + api.escapeHtml(fullName) + "</h3>" +
                '<div class="meta">★ ' + ratingStr + " · " + api.escapeHtml(locText) + "</div>" +
                '<div class="price">' + api.escapeHtml(priceStr) + ' <small>/ ngày</small></div>' +
                '<div class="vehicle-actions">' +
                  '<a href="#chi-tiet-xe" class="btn btn-outline btn-sm btn-detail-vrp">Chi tiết</a>' +
                  '<a href="weekly-vehicle-schedule.html?xe=' + encodeURIComponent(fullName) + '" class="btn btn-primary btn-sm btn-rent-vrp">Thuê xe</a>' +
                "</div>" +
              "</div>" +
            "</article>"
          );
        }).join("");

        featuredGrid.addEventListener("click", function (ev) {
          var dBtn = ev.target.closest(".btn-detail-vrp");
          if (dBtn) {
            ev.preventDefault();
            var card = dBtn.closest(".vehicle-card");
            var v = card ? map[card.dataset.vehicleId] : null;
            if (v) {
              api.saveSelectedVehicle(v);
              api.openVehicleModal(v);
            }
            return;
          }
          var rBtn = ev.target.closest(".btn-rent-vrp");
          if (rBtn) {
            var rCard = rBtn.closest(".vehicle-card");
            var rv = rCard ? map[rCard.dataset.vehicleId] : null;
            if (rv) api.saveSelectedVehicle(rv);
          }
        });

        var area = featuredGrid.closest("[data-data-area]");
        if (window.VRPDataState && area) window.VRPDataState.refresh(area);
      }).catch(function () {
        /* Giữ nguyên thẻ tĩnh mặc định khi backend chưa chạy */
      });
    }
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
