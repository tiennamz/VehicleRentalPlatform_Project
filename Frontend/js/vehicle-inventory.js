(function () {
  var PAGE = "vehicle-inventory.html";
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
  function bindLogout(btn) {
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
  }
  bindLogout(document.getElementById('sidebarLogoutBtn'));
  function apply() {
    var actions = document.querySelector('.header-actions');
    if (!actions || !logged()) return;
    if (!actions.querySelector('.user-profile')) {
      actions.insertAdjacentHTML('beforeend', '<div class="user-profile" id="userProfileBtn" role="button" tabindex="0" title="Tài khoản Vũ Đức"><div class="user-avatar">VU</div><span class="user-name">Vũ Đức</span><span class="user-caret">▾</span></div>');
      actions.insertAdjacentHTML('beforeend', '<div class="header-logout-menu" id="headerLogoutMenu" hidden><a class="header-menu-profile" href="customer-info.html">Hồ sơ của tôi</a><button type="button" class="sidebar-logout-btn" id="storeLogoutBtn"><svg viewBox="0 0 640 512" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C69.5 32 48 53.5 48 80l0 352c0 26.5 21.5 48 48 48l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-48 0 0-320 48 0z"/></svg><span>Đăng xuất</span></button></div>');
    }
    var p = document.getElementById('userProfileBtn');
    var menu = document.getElementById('headerLogoutMenu');
    if (p && menu && !p.dataset.menuBound) {
      p.dataset.menuBound = '1';
      function toggleMenu() { menu.hidden = !menu.hidden; }
      p.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); }
      });
      document.addEventListener('click', function (e) {
        if (!p.contains(e.target) && !menu.contains(e.target)) menu.hidden = true;
      });
    }
    bindLogout(document.getElementById('storeLogoutBtn'));
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
    var PAGE = "vehicle-inventory.html";

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


/* Popup chỉnh sửa phương tiện (từ bản VRP-GO-hoan-chinh / vehicle-inventory.html) */
(function () {
  'use strict';
  var API_BASE = (window.VRP_API_BASE || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  var KEY = 'vrp_store_vehicles_hourly_v1';
  var FALLBACK_IMG = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80';
  function getToken() {
    var m = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    try { return localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''; } catch (e) { return ''; }
  }
  function getAuthHeaders(extra) {
    var h = Object.assign({}, extra || {});
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }
  function mapStatusFromApi(s) {
    var str = String(s || '').toLowerCase();
    if (str.indexOf('thuê') !== -1) return 'Đang thuê';
    if (str.indexOf('bảo') !== -1) return 'Bảo dưỡng';
    return 'Sẵn sàng';
  }
  function mapStatusToApi(s) {
    if (s === 'Bảo dưỡng') return 'Bảo trì';
    if (s === 'Đang thuê') return 'Đang thuê';
    return 'Sẵn sàng';
  }
  function parseBrandAndModel(fullName) {
    var cleaned = String(fullName || '').trim();
    var parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { brand: cleaned || 'Khác', model: cleaned || 'Mẫu chuẩn' };
    return { brand: parts[0], model: parts.slice(1).join(' ') };
  }
  var defaults = [
    ['Honda Air Blade 160', '51G1-23456', 'Sẵn sàng', 25000],
    ['Yamaha Exciter 155', '51G1-77889', 'Đang thuê', 30000],
    ['Honda Vision 2024', '51G1-11223', 'Sẵn sàng', 20000],
    ['Honda SH Mode 125', '51G1-55667', 'Bảo dưỡng', 28000],
    ['Yamaha Janus 2023', '51G1-33445', 'Sẵn sàng', 20000],
    ['VinFast Feliz S', '51G1-99887', 'Đang thuê', 25000],
    ['Honda Lead 125', '51G1-66778', 'Sẵn sàng', 22000],
    ['Honda Winner X', '51G1-44556', 'Sẵn sàng', 28000],
    ['Yamaha Grande', '51G1-22334', 'Sẵn sàng', 25000],
    ['Honda SH 150i', '51G1-88990', 'Đang thuê', 35000],
    ['Suzuki Raider', '51G1-10112', 'Sẵn sàng', 25000],
    ['Yamaha NVX 155', '51G1-55601', 'Bảo dưỡng', 30000]
  ].map(function (v, i) {
    return { id: i, name: v[0], plate: v[1], status: v[2], price: v[3] };
  });

  function normalize(v) {
    var regular = Number(v.regularPrice != null ? v.regularPrice : v.price) || 0;
    return Object.assign({}, v, {
      price: regular, regularPrice: regular,
      weekendPrice: Number(v.weekendPrice != null ? v.weekendPrice : regular),
      holidayPrice: Number(v.holidayPrice != null ? v.holidayPrice : regular)
    });
  }
  function load() {
    try {
      var x = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(x) && x.length) return x.map(normalize);
    } catch (e) {}
    return defaults.map(function (v) { return normalize(Object.assign({}, v)); });
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function money(n) { return Number(n || 0).toLocaleString('vi-VN') + 'đ'; }
  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
  }
  function updateCards(list) {
    document.querySelectorAll('.vehicle-card').forEach(function (card, i) {
      var v = list[i];
      if (!v) return;
      var h = card.querySelector('h3');
      var meta = card.querySelector('.meta');
      var price = card.querySelector('.price');
      if (h) h.textContent = v.name;
      if (meta) {
        var color = v.status === 'Sẵn sàng' ? '#047857' : v.status === 'Đang thuê' ? '#b45309' : '#475569';
        meta.textContent = v.plate + ' · ';
        var span = document.createElement('span');
        span.textContent = v.status;
        span.style.cssText = 'color:' + color + ';font-weight:600';
        meta.appendChild(span);
      }
      if (price) price.innerHTML = money(v.price) + ' <small>/ giờ</small>';
    });
  }

  function init() {
    var modal = document.getElementById('vehicleEditModal');
    var cards = document.querySelectorAll('.vehicle-card');
    if (!modal || !cards.length) return;
    var list = load();
    try { if (!localStorage.getItem(KEY)) save(list); } catch (e) {}
    updateCards(list);

    var selected = 0;
    var pendingEditImageFile = null;
    var pendingEditImagePreview = '';
    var editImgPreviewEl = document.getElementById('editVehicleImagePreview');
    var editImgInputEl = document.getElementById('editVehicleImageFile');
    var editImgBtnEl = document.getElementById('btnPickEditVehicleImage');
    var editImgNameEl = document.getElementById('editVehicleImageName');

    if (editImgBtnEl && editImgInputEl) {
      editImgBtnEl.addEventListener('click', function () {
        editImgInputEl.click();
      });
      editImgInputEl.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type || file.type.indexOf('image/') !== 0) {
          toast('Vui lòng chọn file ảnh JPG, PNG hoặc WEBP.');
          editImgInputEl.value = '';
          return;
        }
        pendingEditImageFile = file;
        if (editImgNameEl) editImgNameEl.textContent = file.name;
        var reader = new FileReader();
        reader.onload = function (ev) {
          pendingEditImagePreview = ev.target.result;
          if (editImgPreviewEl) editImgPreviewEl.src = pendingEditImagePreview;
        };
        reader.readAsDataURL(file);
      });
    }

    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      pendingEditImageFile = null;
      pendingEditImagePreview = '';
      if (editImgInputEl) editImgInputEl.value = '';
      if (editImgNameEl) editImgNameEl.textContent = 'JPG/PNG/WEBP · tối đa 5MB';
    }
    function openModal(i) {
      selected = i;
      var v = list[i];
      if (!v) return;
      pendingEditImageFile = null;
      pendingEditImagePreview = '';
      if (editImgInputEl) editImgInputEl.value = '';
      if (editImgNameEl) editImgNameEl.textContent = 'JPG/PNG/WEBP · tối đa 5MB';
      if (editImgPreviewEl) {
        var cardImg = document.querySelectorAll('.vehicle-card .thumb img')[i];
        editImgPreviewEl.src = v.image || (cardImg ? cardImg.src : FALLBACK_IMG);
      }
      document.getElementById('editVehicleName').value = v.name;
      document.getElementById('editVehiclePlate').value = v.plate;
      document.getElementById('editVehicleStatus').value = v.status;
      document.getElementById('editVehiclePrice').value = v.price;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.getElementById('editVehicleName').focus();
    }

    function bindCardHandlers() {
      document.querySelectorAll('.vehicle-card').forEach(function (card, i) {
        if (card.dataset.vrpEditBound) return;
        card.dataset.vrpEditBound = '1';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Chỉnh sửa xe');
        card.addEventListener('click', function () { openModal(i); });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(i); }
        });
      });
    }

    function renderDynamicGrid(items) {
      var grid = document.querySelector('.vehicles-grid');
      if (!grid) return;
      grid.innerHTML = items.map(function (v) {
        var color = v.status === 'Sẵn sàng' ? '#047857' : v.status === 'Đang thuê' ? '#b45309' : '#475569';
        var imgSrc = v.image || FALLBACK_IMG;
        return '<div class="vehicle-card">' +
          '<div class="thumb"><img src="' + imgSrc + '" alt=""></div>' +
          '<div class="body">' +
            '<h3>' + v.name + '</h3>' +
            '<div class="meta">' + v.plate + ' · <span style="color:' + color + ';font-weight:600">' + v.status + '</span></div>' +
            '<div class="price">' + money(v.price) + ' <small>/ giờ</small></div>' +
          '</div>' +
        '</div>';
      }).join('');

      var heading = document.querySelector('.page-head h1');
      if (heading) heading.textContent = 'Kho xe · ' + items.length + ' xe';
      var statStrong = document.querySelectorAll('.stats-grid .stat-card strong');
      if (statStrong.length >= 4) {
        statStrong[0].textContent = String(items.length);
        statStrong[1].textContent = String(items.filter(function (x) { return x.status === 'Sẵn sàng'; }).length);
        statStrong[2].textContent = String(items.filter(function (x) { return x.status === 'Đang thuê'; }).length);
        statStrong[3].textContent = String(items.filter(function (x) { return x.status === 'Bảo dưỡng'; }).length);
      }
      bindCardHandlers();
    }

    async function loadVehiclesFromApi() {
      var token = getToken();
      if (!token) return;
      try {
        var res = await fetch(API_BASE + '/vehicles/my-store', { headers: getAuthHeaders(), cache: 'no-store' });
        if (!res.ok) return;
        var rows = await res.json();
        if (Array.isArray(rows)) {
          list = rows.map(function (v) {
            return normalize({
              id: v.vehicle_id,
              isApi: true,
              name: [v.brand, v.model].filter(Boolean).join(' ').trim() || v.brand || 'Xe thuê',
              plate: v.license_plate,
              status: mapStatusFromApi(v.status),
              price: Number(v.price) || 25000,
              image: (Array.isArray(v.images) && v.images[0]) ? v.images[0] : FALLBACK_IMG
            });
          });
          renderDynamicGrid(list);
        }
      } catch (err) {}
    }

    window.__vrpReloadInventory = loadVehiclesFromApi;
    bindCardHandlers();
    loadVehiclesFromApi();

    document.getElementById('closeVehicleModal').addEventListener('click', close);
    document.getElementById('cancelVehicleEdit').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    document.getElementById('vehicleEditForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var current = list[selected];
      if (!current) return;
      var nextName = document.getElementById('editVehicleName').value.trim();
      var nextPlate = document.getElementById('editVehiclePlate').value.trim();
      var nextStatus = document.getElementById('editVehicleStatus').value;
      var price = Math.max(0, Number(document.getElementById('editVehiclePrice').value) || 0);

      var token = getToken();
      var saveBtn = this.querySelector('button[type="submit"]');
      var origSaveText = saveBtn ? saveBtn.textContent : 'Lưu thay đổi';

      if (!token) {
        toast('Vui lòng đăng nhập tài khoản cửa hàng để lưu thay đổi & ảnh lên Cloudinary!');
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = pendingEditImageFile ? 'Đang tải ảnh lên Cloudinary...' : 'Đang lưu...';
      }
      try {
        var bm = parseBrandAndModel(nextName);
        if (current.isApi) {
          var res = await fetch(API_BASE + '/vehicles/' + current.id, {
            method: 'PUT',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              brand: bm.brand,
              model: bm.model,
              license_plate: nextPlate,
              status: mapStatusToApi(nextStatus),
              price: price
            })
          });
          var errJson = await res.json().catch(function () { return {}; });
          if (!res.ok) {
            throw new Error(errJson.detail || errJson.error || 'Không thể cập nhật thông tin xe');
          }

          var updatedImageUrl = current.image;
          if (pendingEditImageFile) {
            var imgForm = new FormData();
            imgForm.append('replace', 'true');
            imgForm.append('files', pendingEditImageFile);
            var imgRes = await fetch(API_BASE + '/vehicles/' + current.id + '/images', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: imgForm
            });
            var imgJson = await imgRes.json().catch(function () { return {}; });
            if (!imgRes.ok) {
              throw new Error(imgJson.detail || imgJson.error || 'Không thể tải ảnh xe mới lên Cloudinary');
            }
            if (Array.isArray(imgJson.images) && imgJson.images[0]) {
              updatedImageUrl = imgJson.images[0];
            }
          }

          list[selected] = Object.assign({}, current, {
            name: nextName,
            plate: nextPlate,
            status: nextStatus,
            price: price,
            regularPrice: price,
            image: updatedImageUrl
          });
          renderDynamicGrid(list);
          close();
          toast(pendingEditImageFile ? 'Đã cập nhật xe và lưu ảnh mới lên Cloudinary!' : 'Đã cập nhật thông tin xe lên hệ thống.');
          return;
        }

        // Trường hợp xe mẫu chưa có trên DB: tạo mới xe lên DB + upload ảnh lên Cloudinary
        if (!pendingEditImageFile) {
          throw new Error('Xe mẫu chưa có trên máy chủ. Vui lòng chọn 1 ảnh xe để lưu lên Cloudinary!');
        }
        var createForm = new FormData();
        createForm.append('brand', bm.brand);
        createForm.append('model', bm.model);
        createForm.append('license_plate', nextPlate);
        createForm.append('manufacture_year', '2025');
        createForm.append('type', 'Xe tay ga');
        createForm.append('engine_capacity', '125');
        createForm.append('description', 'Xe cập nhật từ Kho xe');
        createForm.append('price', String(price));
        createForm.append('status', mapStatusToApi(nextStatus));
        createForm.append('files', pendingEditImageFile);

        var createRes = await fetch(API_BASE + '/vehicles', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: createForm
        });
        var createJson = await createRes.json().catch(function () { return {}; });
        if (!createRes.ok) {
          throw new Error(createJson.detail || createJson.error || 'Không thể lưu xe và ảnh lên Cloudinary');
        }
        list[selected] = normalize({
          id: createJson.vehicle_id,
          isApi: true,
          name: [createJson.brand, createJson.model].filter(Boolean).join(' ').trim() || nextName,
          plate: createJson.license_plate || nextPlate,
          status: mapStatusFromApi(createJson.status),
          price: Number(createJson.price) || price,
          image: (Array.isArray(createJson.images) && createJson.images[0]) ? createJson.images[0] : current.image
        });
        renderDynamicGrid(list);
        close();
        toast('Đã lưu xe và tải ảnh lên Cloudinary thành công!');
        return;
      } catch (err) {
        toast(err.message || 'Lỗi cập nhật xe');
        return;
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = origSaveText;
        }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ---- Popup "Thêm xe": hiển thị giao diện quản lý đội xe thu nhỏ ---- */
(function () {
  var openBtn = document.getElementById('openAddVehicleModal');
  var modal = document.getElementById('addVehicleModal');
  var frame = document.getElementById('addVehicleFrame');
  var closeBtn = document.getElementById('closeAddVehicleModal');
  if (!openBtn || !modal || !frame || !closeBtn) return;

  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    frame.src = 'about:blank';
  }

  openBtn.addEventListener('click', function () {
    frame.src = encodeURI('fleet-management.html?modal=1');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    closeBtn.focus();
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.vrp === 'vehicleAdded' && typeof window.__vrpReloadInventory === 'function') {
      window.__vrpReloadInventory();
    }
    if (m.vrp === 'closeAddVehicleModal') close();
  });
})();
