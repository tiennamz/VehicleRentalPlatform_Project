(function () {
  var PAGE = "store-rental-orders.html";
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
  var btn = document.getElementById('shellNotifyBtn');
  var panel = document.getElementById('shellNotifyPanel');
  if (btn && panel) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', String(!panel.hidden));
    });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();


/* ===== DỮ LIỆU ĐƠN DÙNG CHUNG CHO ĐƠN THUÊ + LỊCH THUÊ ===== */
window.VRP_ORDERS = [{"id": "ORD-8921", "customer": "Nguyễn Văn Tuấn", "phone": "0901 222 333", "vehicle": "Air Blade 160", "range": "13–15/11", "status": "Chờ XN", "hour": "12:00", "note": ""}, {"id": "ORD-8922", "customer": "Trần Thị Mai", "phone": "0912 444 555", "vehicle": "Exciter 155", "range": "14–16/11", "status": "Chờ XN", "hour": "03:20", "note": ""}, {"id": "ORD-8935", "customer": "Lê Hoàng", "phone": "0987 111 000", "vehicle": "Janus 2023", "range": "15–17/11", "status": "Chờ XN", "hour": "08:45", "note": ""}, {"id": "ORD-8910", "customer": "Phạm Hương", "phone": "", "vehicle": "Air Blade 160", "range": "10–12/11", "status": "Đang thuê", "hour": "", "note": "Đã bàn giao xe"}, {"id": "ORD-8902", "customer": "Đỗ Minh", "phone": "", "vehicle": "Exciter 155", "range": "11–13/11", "status": "Đang thuê", "hour": "", "note": "Khách nhận xe lúc 9h"}, {"id": "ORD-8925", "customer": "Ngô Lan", "phone": "", "vehicle": "Vision 2024", "range": "13–14/11", "status": "Đang thuê", "hour": "", "note": "Giao tại sân bay"}, {"id": "ORD-8905", "customer": "Vũ Khoa", "phone": "", "vehicle": "Feliz S", "range": "10–11/11", "status": "Đang thuê", "hour": "", "note": "Đã xác nhận"}, {"id": "ORD-8899", "customer": "Trần Bình", "phone": "", "vehicle": "Vision 2024", "range": "07–09/11", "status": "Hoàn tất", "hour": "", "note": "Trả xe đúng hạn"}, {"id": "ORD-8880", "customer": "Lý An", "phone": "", "vehicle": "SH Mode", "range": "05–07/11", "status": "Hoàn tất", "hour": "", "note": "Trả xe đúng hạn"}, {"id": "ORD-8872", "customer": "Hoàng Yến", "phone": "", "vehicle": "Lead 125", "range": "03–05/11", "status": "Hoàn tất", "hour": "", "note": "Trả xe đúng hạn"}, {"id": "ORD-8865", "customer": "Phan Đức", "phone": "", "vehicle": "Winner X", "range": "01–03/11", "status": "Hoàn tất", "hour": "", "note": "Trả xe đúng hạn"}, {"id": "ORD-8850", "customer": "Mai Chi", "phone": "", "vehicle": "Grande", "range": "28–30/10", "status": "Từ chối", "hour": "", "note": "Khách không đóng cọc"}];
try {
  var savedOrders = sessionStorage.getItem("vrpOrders");
  if (savedOrders) window.VRP_ORDERS = JSON.parse(savedOrders);
} catch (err) { /* no-op */ }

function vrpSaveOrders() {
  try { sessionStorage.setItem("vrpOrders", JSON.stringify(window.VRP_ORDERS)); } catch (err) {}
}

/* Chuyển "13–15/11" thành {start,end} dạng YYYY-MM-DD */
function vrpOrderRange(order) {
  var m = /(\d{1,2})\s*[–-]\s*(\d{1,2})\/(\d{1,2})/.exec(order.range || "");
  if (!m) return null;
  var month = Number(m[3]);
  var year = 2026;
  function two(n) { return String(n).padStart(2, "0"); }
  function iso(day) {
    return year + "-" + two(month) + "-" + two(Number(day));
  }
  return { start: iso(m[1]), end: iso(m[2]) };
}

(function () {
  var params = new URLSearchParams(window.location.search || "");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function isoFromRange(text) {
    var m = /(\d{1,2})\s*[–-]\s*(\d{1,2})\/(\d{1,2})/.exec(String(text || ""));
    if (!m) return "";
    var d = new Date(2026, Number(m[3]) - 1, Number(m[1]));
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /* --- Từ Lịch thuê sang: hiện ngữ cảnh đơn khi vào lịch từ Đơn thuê --- */
  var orderContext = document.getElementById("vrpOrderContext");
  if (orderContext && params.get("order")) {
    document.getElementById("vrpOrderContextTitle").textContent =
      "Đang xem lịch cho đơn " + params.get("order");
    var detail = [];
    if (params.get("xe")) detail.push("Xe: " + params.get("xe"));
    var d = params.get("date");
    if (d) detail.push("Ngày: " + d);
    document.getElementById("vrpOrderContextDetail").textContent = detail.join(" · ");
    orderContext.hidden = false;
  }

  /* --- Từ Đơn thuê sang: nhận xe/ngày/giờ đã chọn trong Lịch thuê --- */
  var req = document.getElementById("vrpCalendarRequest");
  var xe = params.get("xe");
  var date = params.get("date");
  if (req && xe) {
    var hour = params.get("hour") || "";
    var end = params.get("end") || "";
    var note = params.get("note") || "";
    var detail = "Xe: " + xe;
    if (date) detail += " · Ngày: " + date;
    if (hour) detail += " · " + hour + (end ? " → " + end : "");
    if (note) detail += ' · Ghi chú: "' + note + '"';
    document.getElementById("vrpCalendarRequestDetail").textContent = detail;
    req.hidden = false;

    document.getElementById("vrpCreateFromCalendar").addEventListener("click", function () {
      var tbody = document.querySelector(".order-table tbody");
      if (!tbody) return;
      var tr = document.createElement("tr");
      var id = "ORD-" + String(9000 + Math.floor(Math.random() * 900));
      var timeText = date ? date.split("-").reverse().join("/") : "—";
      tr.innerHTML =
        "<td><strong>" + esc(id) + "</strong></td>" +
        "<td>Khách mới<br><small style='color:var(--muted)'>Từ lịch thuê</small></td>" +
        "<td>" + esc(xe) + "</td>" +
        "<td>" + esc(timeText) + "</td>" +
        "<td><span class='badge badge-open'>Chờ XN · " + esc(hour || "--:--") + "</span></td>" +
        "<td><button class='btn btn-primary' style='padding:6px 12px;font-size:12px' " +
        "onclick=\"showToast('Đã xác nhận " + esc(id) + "')\">Xác nhận</button></td>";
      tbody.insertBefore(tr, tbody.firstChild);
      window.VRP_ORDERS.unshift({
        id: id, customer: "Khách mới", phone: "", vehicle: xe,
        range: timeText, status: "Chờ XN", hour: hour || "", note: note
      });
      vrpSaveOrders();
      req.querySelector(".vrp-link-text strong").textContent = "Đã tạo đơn từ lịch thuê";
      this.textContent = "Đã tạo ✓";
      this.disabled = true;
    });
  }

  /* --- Mỗi đơn có nút "Xem lịch" để quay sang lịch của đúng xe/ngày đó --- */
  document.querySelectorAll(".order-table tbody tr").forEach(function (tr) {
    var tds = tr.querySelectorAll("td");
    if (tds.length < 6 || tds[5].querySelector(".vrp-row-link")) return;
    var vehicle = tds[2].textContent.trim();
    var time = tds[3].textContent.trim();
    var idMatch = /ORD-\d+/.exec(tds[0].textContent);
    var href = "store-rental-schedule.html?xe=" + encodeURIComponent(vehicle);
    var iso = isoFromRange(time);
    if (iso) href += "&date=" + encodeURIComponent(iso);
    if (idMatch) href += "&order=" + encodeURIComponent(idMatch[0]);
    var link = document.createElement("a");
    link.className = "vrp-row-link";
    link.href = href;
    link.textContent = "Xem lịch";
    tds[5].appendChild(link);
  });
})();

/* ===== JS RIÊNG CỦA TRANG ===== */
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

/* ---- Page loader: chỉ khi bấm menu header (an toàn file:// + Live Server) ---- */
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

  function isHeaderNavLink(a) {
    if (!a) return false;
    if (a.classList.contains("logo") || a.closest(".logo")) return true;
    if (a.closest(".nav-list")) return true;
    return false;
  }

  function resolveHref(a) {
    // Ưu tiên absolute URL từ trình duyệt; fallback thuộc tính href gốc
    try {
      if (a.href) return a.href;
    } catch (e) { /* ignore */ }
    return a.getAttribute("href");
  }

  window.motogoNavigate = function (href, withLoader) {
    if (!href || document.body.classList.contains("is-leaving")) return;
    if (withLoader) {
      document.body.classList.add("is-leaving");
      loader.classList.add("active");
      // Delay ngắn hơn để đỡ cảm giác "treo", vẫn kịp thấy animation
      setTimeout(function () {
        try {
          window.location.assign(href);
        } catch (err) {
          window.location.href = href;
        }
      }, 550);
    } else {
      try {
        window.location.assign(href);
      } catch (err) {
        window.location.href = href;
      }
    }
  };

  document.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;
    const a = e.target.closest("a");
    if (!isInternalLink(a)) return;
    if (!isHeaderNavLink(a)) return;

    // Chỉ hiện loader, KHÔNG preventDefault — trình duyệt tự chuyển trang
    // Tránh lỗi "bấm menu không được" khi file:// hoặc Live Server lỗi
    try {
      document.body.classList.add("is-leaving");
      loader.classList.add("active");
    } catch (err) { /* ignore */ }
  }, false);

  // Nếu loader bị kẹt (back/forward cache, lỗi), luôn gỡ khi trang hiện
  function clearLeaving() {
    document.body.classList.remove("is-leaving");
    loader.classList.remove("active");
  }
  window.addEventListener("pageshow", clearLeaving);
  window.addEventListener("load", clearLeaving);
  // An toàn: tự tắt loader sau 3s nếu vẫn còn
  setTimeout(clearLeaving, 3000);
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

/* ---- Avatar cửa hàng: bấm để xem trạng thái chủ cửa hàng ---- */
(function () {
  const trigger = document.getElementById("storeUserBtn");
  const panel = document.getElementById("storeUserStatus");
  if (!trigger || !panel) return;

  function setOpen(open) {
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(panel.hidden);
  });
  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(panel.hidden);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  });
  document.addEventListener("click", function (e) {
    if (!trigger.contains(e.target)) setOpen(false);
  });
})();

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

  const params = new URLSearchParams(window.location.search);
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
    li.innerHTML = '<a href="' + prefix + 'index.html">Cửa hàng</a>';
    navList.appendChild(li);
  }

  const demoBtn = document.getElementById("demoStoreAccess");
  if (demoBtn) {
    demoBtn.addEventListener("click", function () {
      saveRole("store");
      const url = new URL(window.location.href);
      url.searchParams.set("role", "store");
      window.location.href = url.toString();
    });
  }
})();



    /* Chặn giao diện cửa hàng ngay từ đầu trang với người không có quyền */
    (function () {
      var ROLE_KEY = "vrp_role";
      var roleParam = new URLSearchParams(window.location.search).get("role");
      var role = "store"; /* demo: mở sẵn */

      if (roleParam) {
        try { localStorage.setItem(ROLE_KEY, roleParam); } catch (err) {}
        document.cookie = ROLE_KEY + "=" + encodeURIComponent(roleParam) + "; path=/; SameSite=Lax";
        role = roleParam;
      } else {
        try { role = localStorage.getItem(ROLE_KEY) || ""; } catch (err) {}
        if (!role) {
          var match = document.cookie.match(/(?:^|;\s*)vrp_role=([^;]+)/);
          role = match ? decodeURIComponent(match[1]) : "store";
        }
      }

      // Demo FE: guest cũng được mở; chỉ khóa khi role=guest VÀ có ?lock=1
      if (!role || role === "guest") role = "store";
      var lockParam = null;
      try { lockParam = new URLSearchParams(window.location.search).get("lock"); } catch (e) {}
      if (lockParam === "1" && roleParam === "guest") {
        document.documentElement.className += " vrp-locked";
      } else if (role !== "store" && role !== "admin" && role !== "customer") {
        document.documentElement.className += " vrp-locked";
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
    "how-it-works.html": "how-it-works.html"
};
    var PAGE = "store-rental-orders.html";

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

/* ---- Nút đăng xuất trong sidebar ---- */
(function () {
  var btn = document.getElementById('sidebarLogoutBtn');
  if (!btn || btn.dataset.logoutBound) return;
  btn.dataset.logoutBound = '1';
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.removeItem('vrp_logged_in');
      localStorage.removeItem('vrp_role');
      document.cookie = 'vrp_logged_in=; Max-Age=0; path=/';
      document.cookie = 'vrp_role=; Max-Age=0; path=/';
    } catch (err) {}
    window.location.href = encodeURI('login-register.html');
  });
})();

/* ---- TF14679: Xác nhận / Từ chối đơn trong 15 phút & tự động chuyển VHV xử lý ---- */
(function () {
  var API_BASE = "http://127.0.0.1:8000";
  var PENDING_STATUSES = ["Chờ XN", "Chờ cửa hàng xác nhận", "Chờ thanh toán", "Đã đặt cọc"];
  var STATUS_CONFIRMED = "Đã xác nhận";
  var STATUS_RENTING = "Đang thuê";
  var STATUS_REJECTED = "Cửa hàng từ chối";
  var STATUS_ESCALATED = "Chờ vận hành viên xử lý";
  var HANDOVER_STORE_KEY = "vrpDualHandover";

  /* Đọc/lưu trạng thái xác nhận bàn giao 2 chiều cục bộ để đồng bộ demo giữa NV & Khách */
  function readLocalHandover(code) {
    try {
      var map = JSON.parse(localStorage.getItem(HANDOVER_STORE_KEY) || "{}");
      return map[code] || { staff_confirmed: false, customer_confirmed: false };
    } catch (e) {
      return { staff_confirmed: false, customer_confirmed: false };
    }
  }
  function saveLocalHandover(code, state) {
    try {
      var map = JSON.parse(localStorage.getItem(HANDOVER_STORE_KEY) || "{}");
      map[code] = state;
      localStorage.setItem(HANDOVER_STORE_KEY, JSON.stringify(map));
    } catch (e) { /* no-op */ }
  }

  var tbody = document.querySelector(".order-table tbody");
  var tabsWrap = document.getElementById("orderStatusTabs");
  var modal = document.getElementById("rejectOrderModal");
  var modalClose = document.getElementById("rejectModalClose");
  var modalCancel = document.getElementById("rejectCancelBtn");
  var modalSubmit = document.getElementById("rejectSubmitBtn");
  var modalOrderInfo = document.getElementById("rejectModalOrderInfo");
  var reasonInput = document.getElementById("rejectReasonInput");
  var rejectError = document.getElementById("rejectErrorMsg");
  if (!tbody) return;

  var activeTab = "all";
  var activeRejectOrder = null;
  var ordersState = [];

  /* Escape ký tự HTML đặc biệt để tránh XSS khi render chuỗi vào bảng */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Hiển thị thông báo nhanh (toast) nếu trang có sẵn helper showToast */
  function toast(msg) {
    if (window.showToast) window.showToast(msg);
  }

  /* Đổi chuỗi đếm ngược dạng MM:SS sang tổng số giây (mặc định 15 phút) */
  function parseMmSsToSeconds(str) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(str || "").trim());
    if (!m) return 15 * 60;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  /* Định dạng số giây còn lại thành chuỗi MM:SS để hiển thị trên badge */
  function formatMmSs(totalSeconds) {
    var sec = Math.max(0, Math.floor(totalSeconds));
    var m = String(Math.floor(sec / 60)).padStart(2, "0");
    var s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }

  /* Định dạng khoảng thời gian nhận - trả xe từ ISO string sang dạng dd–dd/mm */
  function formatRangeFromIso(startIso, endIso) {
    if (!startIso || !endIso) return "—";
    var s = new Date(startIso);
    var e = new Date(endIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "—";
    var d1 = String(s.getDate()).padStart(2, "0");
    var m1 = String(s.getMonth() + 1).padStart(2, "0");
    var d2 = String(e.getDate()).padStart(2, "0");
    var m2 = String(e.getMonth() + 1).padStart(2, "0");
    return m1 === m2 ? (d1 + "–" + d2 + "/" + m2) : (d1 + "/" + m1 + "–" + d2 + "/" + m2);
  }

  /* Ánh xạ trạng thái tiếng Việt của đơn về đúng nhóm tab lọc trên giao diện */
  function getTabBucket(status) {
    if (PENDING_STATUSES.indexOf(status) !== -1) return "pending";
    if (status === STATUS_ESCALATED) return "escalated";
    if (status === STATUS_CONFIRMED) return "confirmed";
    if (status === "Đang thuê") return "renting";
    if (status === "Hoàn tất" || status === "Hoàn thành") return "done";
    if (status === STATUS_REJECTED || status === "Từ chối") return "rejected";
    return "all";
  }

  /* Chuẩn hóa dữ liệu demo cục bộ (dùng khi chạy Frontend độc lập không bật Backend) */
  function normalizeDemoOrders() {
    var now = Date.now();
    return (window.VRP_ORDERS || []).map(function (o) {
      var isPending = PENDING_STATUSES.indexOf(o.status) !== -1;
      var deadlineMs = o.deadlineMs || (isPending ? now + parseMmSsToSeconds(o.hour) * 1000 : null);
      return {
        order_id: o.order_id || null,
        code: o.id || ("ORD-" + (o.order_id || "0000")),
        customer: o.customer || "Khách thuê",
        phone: o.phone || "",
        vehicle: o.vehicle || "Xe thuê",
        range: o.range || "—",
        status: o.status || "Chờ XN",
        deadlineMs: deadlineMs,
        rejection_reason: o.rejection_reason || (o.status === "Từ chối" ? o.note : ""),
        note: o.note || "",
        fromApi: false
      };
    });
  }

  /* Chuẩn hóa dữ liệu trả về từ API GET /stores/orders về cùng cấu trúc hiển thị */
  function normalizeApiOrders(rows) {
    var now = Date.now();
    return (rows || []).map(function (o) {
      var isPending = PENDING_STATUSES.indexOf(o.order_status) !== -1;
      var deadlineMs = isPending ? (now + (Number(o.remaining_seconds) || 0) * 1000) : null;
      return {
        order_id: o.order_id,
        code: o.order_code || ("ORD-" + o.order_id),
        customer: o.renter_name || ("Khách #" + o.renter_id),
        phone: o.renter_phone || "",
        vehicle: o.vehicle_name || ("Xe #" + o.vehicle_id),
        range: formatRangeFromIso(o.start_time, o.end_time),
        status: o.order_status,
        deadlineMs: deadlineMs,
        rejection_reason: o.rejection_reason || "",
        note: o.note || "",
        fromApi: true
      };
    });
  }

  /* Cập nhật số lượng đơn trên từng tab trạng thái (Tất cả, Chờ XN, Chờ VHV xử lý...) */
  function updateTabCounts() {
    if (!tabsWrap) return;
    var counts = { all: ordersState.length, pending: 0, escalated: 0, confirmed: 0, renting: 0, done: 0, rejected: 0 };
    ordersState.forEach(function (o) {
      var b = getTabBucket(o.status);
      if (counts[b] != null) counts[b]++;
    });
    var labels = {
      all: "Tất cả",
      pending: "Chờ XN",
      escalated: "Chờ VHV xử lý",
      confirmed: "Đã xác nhận",
      renting: "Đang thuê",
      done: "Hoàn tất",
      rejected: "Từ chối"
    };
    tabsWrap.querySelectorAll(".tab[data-tab]").forEach(function (btn) {
      var key = btn.getAttribute("data-tab");
      btn.textContent = (labels[key] || key) + " (" + (counts[key] || 0) + ")";
      btn.classList.toggle("active", key === activeTab);
    });
  }

  function renderStatusCell(order) {
    var bucket = getTabBucket(order.status);
    if (bucket === "pending") {
      var rem = order.deadlineMs ? Math.max(0, Math.ceil((order.deadlineMs - Date.now()) / 1000)) : 0;
      var urgentCls = rem <= 180 ? " badge-sla-urgent" : "";
      return '<span class="badge badge-open' + urgentCls + '" data-sla-code="' + esc(order.code) + '">Chờ XN · ' + formatMmSs(rem) + "</span>";
    }
    if (bucket === "escalated") {
      return '<span class="badge badge-escalated">Chờ vận hành viên xử lý</span><span class="reject-reason-note">Quá hạn 15 phút xác nhận</span>';
    }
    if (bucket === "confirmed") {
      var ho = readLocalHandover(order.code);
      var sTxt = (order.staff_confirmed || ho.staff_confirmed) ? "NV ✓" : "NV ○";
      var cTxt = (order.customer_confirmed || ho.customer_confirmed) ? "Khách ✓" : "Khách ○";
      return '<span class="badge badge-confirmed">Đã xác nhận</span>' +
        '<span class="reject-reason-note">Bàn giao 2 chiều: ' + sTxt + " · " + cTxt + "</span>";
    }
    if (bucket === "renting") {
      return '<span class="badge badge-progress">Đang thuê</span>';
    }
    if (bucket === "done") {
      return '<span class="badge badge-done">Hoàn tất</span>';
    }
    return '<span class="badge badge-rejected">' + esc(order.status) + "</span>" +
      (order.rejection_reason ? '<span class="reject-reason-note">Lý do: ' + esc(order.rejection_reason) + "</span>" : "");
  }

  function renderActionCell(order) {
    var bucket = getTabBucket(order.status);
    var scheduleLink = '<a class="vrp-row-link" href="store-rental-schedule.html?xe=' + encodeURIComponent(order.vehicle) + '&order=' + encodeURIComponent(order.code) + '">Xem lịch</a>';
    if (bucket === "pending") {
      return '<div class="order-actions">' +
        '<button type="button" class="btn btn-primary" style="padding:6px 12px;font-size:12px" data-action="confirm" data-code="' + esc(order.code) + '">Xác nhận</button>' +
        '<button type="button" class="btn-reject-sm" data-action="reject" data-code="' + esc(order.code) + '">Từ chối</button>' +
        scheduleLink +
      "</div>";
    }
    if (bucket === "confirmed") {
      var hoAct = readLocalHandover(order.code);
      var staffDone = !!(order.staff_confirmed || hoAct.staff_confirmed);
      return '<div class="order-actions">' +
        '<button type="button" class="btn btn-primary" style="padding:6px 12px;font-size:12px" data-action="staff-handover" data-code="' + esc(order.code) + '"' + (staffDone ? " disabled" : "") + '>' +
          (staffDone ? "NV đã XN · Chờ khách" : "NV xác nhận giao xe") +
        "</button>" +
        scheduleLink +
      "</div>";
    }
    return '<div class="order-actions">' + scheduleLink + "</div>";
  }

  function renderTable() {
    updateTabCounts();
    var filtered = ordersState.filter(function (o) {
      return activeTab === "all" || getTabBucket(o.status) === activeTab;
    });
    tbody.innerHTML = filtered.map(function (o) {
      return '<tr data-order-code="' + esc(o.code) + '">' +
        "<td><strong>" + esc(o.code) + "</strong></td>" +
        "<td>" + esc(o.customer) + (o.phone ? '<br><small style="color:var(--muted)">' + esc(o.phone) + "</small>" : "") + "</td>" +
        "<td>" + esc(o.vehicle) + "</td>" +
        "<td>" + esc(o.range) + "</td>" +
        "<td>" + renderStatusCell(o) + "</td>" +
        "<td>" + renderActionCell(o) + "</td>" +
      "</tr>";
    }).join("");
    if (window.VRPDataState) window.VRPDataState.refresh("[data-data-area]");
  }

  function getOwnerHeaders() {
    var headers = { "Content-Type": "application/json" };
    if (window.VRPAuth && window.VRPAuth.userId) {
      headers["X-User-Id"] = String(window.VRPAuth.userId);
    }
    return headers;
  }

  /* Xử lý khi cửa hàng bấm "Xác nhận": kiểm tra quá hạn 15 phút và gọi API xác nhận */
  async function handleConfirm(order) {
    if (!order) return;
    if (order.deadlineMs && Date.now() >= order.deadlineMs) {
      order.status = STATUS_ESCALATED;
      order.deadlineMs = null;
      toast("Đơn " + order.code + " đã quá hạn 15 phút — đã chuyển sang Chờ vận hành viên xử lý.");
      renderTable();
      return;
    }

    if (order.fromApi && order.order_id) {
      try {
        var res = await fetch(API_BASE + "/stores/orders/" + order.order_id + "/confirm", {
          method: "POST",
          headers: getOwnerHeaders(),
          body: JSON.stringify({})
        });
        var payload = await res.json().catch(function () { return {}; });
        if (res.status === 409) {
          order.status = STATUS_ESCALATED;
          order.deadlineMs = null;
          toast(payload.detail || "Đơn đã quá hạn 15 phút và chuyển sang Chờ vận hành viên xử lý.");
          renderTable();
          return;
        }
        if (!res.ok) {
          toast(payload.detail || "Không thể xác nhận đơn.");
          return;
        }
      } catch (err) {
        // Offline fallback below
      }
    }

    order.status = STATUS_CONFIRMED;
    order.deadlineMs = null;
    toast("Đã xác nhận đơn " + order.code + " thành công.");
    renderTable();
  }

  /* Mở modal yêu cầu cửa hàng nhập lý do trước khi từ chối đơn thuê */
  function openRejectModal(order) {
    if (!modal || !order) return;
    activeRejectOrder = order;
    if (modalOrderInfo) {
      modalOrderInfo.textContent = "Đơn " + order.code + " · " + order.vehicle + " (" + order.customer + "). Vui lòng nhập lý do từ chối:";
    }
    if (reasonInput) reasonInput.value = "";
    if (rejectError) { rejectError.hidden = true; rejectError.textContent = ""; }
    modal.hidden = false;
    if (reasonInput) reasonInput.focus();
  }

  function closeRejectModal() {
    if (modal) modal.hidden = true;
    activeRejectOrder = null;
  }

  /* Xác nhận từ chối đơn: kiểm tra lý do >= 3 ký tự, kiểm tra SLA 15 phút và gọi API từ chối */
  async function submitReject() {
    if (!activeRejectOrder) return;
    var reason = (reasonInput ? reasonInput.value : "").trim();
    if (reason.length < 3) {
      if (rejectError) {
        rejectError.hidden = false;
        rejectError.textContent = "Vui lòng nhập lý do từ chối (tối thiểu 3 ký tự).";
      }
      return;
    }

    var order = activeRejectOrder;
    if (order.deadlineMs && Date.now() >= order.deadlineMs) {
      order.status = STATUS_ESCALATED;
      order.deadlineMs = null;
      closeRejectModal();
      toast("Đơn " + order.code + " đã quá hạn 15 phút — đã chuyển sang Chờ vận hành viên xử lý.");
      renderTable();
      return;
    }

    if (order.fromApi && order.order_id) {
      try {
        var res = await fetch(API_BASE + "/stores/orders/" + order.order_id + "/reject", {
          method: "POST",
          headers: getOwnerHeaders(),
          body: JSON.stringify({ rejection_reason: reason })
        });
        var payload = await res.json().catch(function () { return {}; });
        if (res.status === 409) {
          order.status = STATUS_ESCALATED;
          order.deadlineMs = null;
          closeRejectModal();
          toast(payload.detail || "Đơn đã quá hạn 15 phút và chuyển sang Chờ vận hành viên xử lý.");
          renderTable();
          return;
        }
        if (!res.ok) {
          if (rejectError) {
            rejectError.hidden = false;
            rejectError.textContent = payload.detail || "Không thể từ chối đơn.";
          }
          return;
        }
      } catch (err) {
        // Offline fallback below
      }
    }

    order.status = STATUS_REJECTED;
    order.rejection_reason = reason;
    order.deadlineMs = null;
    closeRejectModal();
    toast("Đã từ chối đơn " + order.code + " với lý do: " + reason);
    renderTable();
  }

  if (tabsWrap) {
    tabsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".tab[data-tab]");
      if (!btn) return;
      activeTab = btn.getAttribute("data-tab") || "all";
      renderTable();
    });
  }

  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var code = btn.getAttribute("data-code");
    var order = ordersState.find(function (o) { return o.code === code; });
    if (!order) return;
    if (btn.getAttribute("data-action") === "confirm") handleConfirm(order);
    if (btn.getAttribute("data-action") === "reject") openRejectModal(order);
    if (btn.getAttribute("data-action") === "staff-handover") handleStaffHandover(order);
  });

  /* TF148C7: Nhân viên xác nhận bàn giao xe (chỉ sang Đang thuê khi Khách cũng đã xác nhận) */
  async function handleStaffHandover(order) {
    if (!order) return;
    if (order.fromApi && order.order_id) {
      try {
        var res = await fetch(API_BASE + "/orders/" + order.order_id + "/handover/staff-confirm", {
          method: "POST",
          headers: getOwnerHeaders(),
          body: JSON.stringify({})
        });
        var payload = await res.json().catch(function () { return {}; });
        if (!res.ok) {
          toast(payload.detail || "Không thể xác nhận bàn giao xe.");
          return;
        }
        var d = payload.data || {};
        order.staff_confirmed = !!d.staff_confirmed;
        order.customer_confirmed = !!d.customer_confirmed;
        order.status = d.order_status || order.status;
        toast(payload.message || (d.both_confirmed ? "Cả 2 bên đã xác nhận — đơn chuyển sang Đang thuê." : "Nhân viên đã xác nhận — đang chờ khách xác nhận."));
        renderTable();
        return;
      } catch (err) { /* fallback offline bên dưới */ }
    }

    var localHo = readLocalHandover(order.code);
    localHo.staff_confirmed = true;
    saveLocalHandover(order.code, localHo);
    order.staff_confirmed = true;
    order.customer_confirmed = !!localHo.customer_confirmed;
    if (order.staff_confirmed && order.customer_confirmed) {
      order.status = STATUS_RENTING;
      toast("Cả nhân viên và khách hàng đã xác nhận — đơn " + order.code + " chuyển sang Đang thuê.");
    } else {
      toast("Nhân viên đã xác nhận giao xe " + order.code + " — đang chờ khách hàng xác nhận để chuyển sang Đang thuê.");
    }
    renderTable();
  }

  if (modalClose) modalClose.addEventListener("click", closeRejectModal);
  if (modalCancel) modalCancel.addEventListener("click", closeRejectModal);
  if (modalSubmit) modalSubmit.addEventListener("click", submitReject);
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeRejectModal();
    });
  }
  document.querySelectorAll("#rejectReasonChips .reason-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      if (reasonInput) reasonInput.value = chip.getAttribute("data-reason") || "";
      if (rejectError) rejectError.hidden = true;
    });
  });

  // Live 1-second SLA ticker: auto-escalate any order hitting 00:00
  setInterval(function () {
    var changed = false;
    var now = Date.now();
    ordersState.forEach(function (o) {
      if (getTabBucket(o.status) !== "pending" || !o.deadlineMs) return;
      var rem = Math.ceil((o.deadlineMs - now) / 1000);
      if (rem <= 0) {
        o.status = STATUS_ESCALATED;
        o.deadlineMs = null;
        changed = true;
        toast("Đơn " + o.code + " đã quá hạn 15 phút — tự động chuyển sang Chờ vận hành viên xử lý.");
      } else {
        var badge = tbody.querySelector('[data-sla-code="' + o.code + '"]');
        if (badge) {
          badge.textContent = "Chờ XN · " + formatMmSs(rem);
          badge.classList.toggle("badge-sla-urgent", rem <= 180);
        }
      }
    });
    if (changed) renderTable();
  }, 1000);

  async function initOrders() {
    ordersState = normalizeDemoOrders();
    renderTable();
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 2000) : null;
    try {
      var res = await fetch(API_BASE + "/stores/orders", {
        headers: getOwnerHeaders(),
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) return;
      var payload = await res.json();
      if (payload && Array.isArray(payload.data) && payload.data.length > 0) {
        ordersState = normalizeApiOrders(payload.data);
        renderTable();
      }
    } catch (err) {
      // Keep demo orders seamlessly when backend is offline
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  initOrders();
})();