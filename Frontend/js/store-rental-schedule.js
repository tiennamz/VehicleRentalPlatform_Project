(function () {
  var PAGE = "store/rental_calendar.html";
  var QUERY = window.location.search;
  var KEYS = ["index.html","docs/bien-ban-sprint-review.html","khach-hang/account.html","khach-hang/calendar.html","khach-hang/index.html","khach-hang/payment.html","khach-hang/receipt.html","operator/complaints.html","pages/booking.html","pages/faq.html","pages/help-center.html","pages/how-it-works.html","pages/login.html","pages/my-orders.html","pages/register.html","pages/rental-policy.html","pages/reviews.html","pages/vehicle-detail.html","pages/vehicles.html","store/dashboard.html","store/index.html","store/inventory.html","store/orders.html","store/revenue.html","store/rental_calendar.html","store/vehicle_management.html","store/store_operations.html","store/layout.html","store/login_register.html","store/regis_for_delivery.html","store/ui_kit.html","pages/user-info.html"];
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
    parent.postMessage({
      vrp: "nav",
      page: r.key,
      search: qs.length ? "?" + qs.join("&") : "",
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
  function openProfile() { var p='../pages/user-info.html'; window.__vrpGo ? window.__vrpGo(p+'?view=profile') : parent.postMessage({vrp:'nav',page:p,search:'?view=profile'},'*'); }
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
window.VRP_ORDERS = [
  {"id": "ORD-8921", "customer": "Nguyễn Văn Tuấn", "phone": "0901 222 333", "vehicle": "Air Blade 160", "plate": "51G1-23456", "range": "13–15/11", "status": "Chờ XN", "hour": "12:00", "note": "Giao xe tại Q1, cọc 30%", "isPrebooked": true, "deposit": "30% (162.000đ)", "price": "180.000đ/ngày", "total": "540.000đ"},
  {"id": "ORD-8922", "customer": "Trần Thị Mai", "phone": "0912 444 555", "vehicle": "Exciter 155", "plate": "51G1-77889", "range": "14–16/11", "status": "Chờ XN", "hour": "09:30", "note": "Nhận xe tại cửa hàng", "isPrebooked": true, "deposit": "30% (198.000đ)", "price": "220.000đ/ngày", "total": "660.000đ"},
  {"id": "ORD-8935", "customer": "Lê Hoàng", "phone": "0987 111 000", "vehicle": "Janus 2023", "plate": "51G1-33445", "range": "15–17/11", "status": "Chờ XN", "hour": "08:45", "note": "Thuê kèm 2 nón bảo hiểm cao cấp", "isPrebooked": true, "deposit": "50% (210.000đ)", "price": "140.000đ/ngày", "total": "420.000đ"},
  {"id": "ORD-8940", "customer": "Đặng Quốc Bảo", "phone": "0938 777 999", "vehicle": "Vision 2024", "plate": "51G1-11223", "range": "18–20/11", "status": "Chờ XN", "hour": "14:00", "note": "Giao tại sân bay Tân Sơn Nhất", "isPrebooked": true, "deposit": "30% (135.000đ)", "price": "150.000đ/ngày", "total": "450.000đ"},
  {"id": "ORD-8910", "customer": "Phạm Hương", "phone": "0933 555 777", "vehicle": "Air Blade 160", "plate": "51G1-23456", "range": "10–12/11", "status": "Đang thuê", "hour": "08:00", "note": "Đã bàn giao xe"},
  {"id": "ORD-8902", "customer": "Đỗ Minh", "phone": "0944 666 888", "vehicle": "Exciter 155", "plate": "51G1-77889", "range": "11–13/11", "status": "Đang thuê", "hour": "09:00", "note": "Khách nhận xe lúc 9h"},
  {"id": "ORD-8925", "customer": "Ngô Lan", "phone": "0977 888 999", "vehicle": "Vision 2024", "plate": "51G1-11223", "range": "13–14/11", "status": "Đang thuê", "hour": "14:00", "note": "Giao tại sân bay"},
  {"id": "ORD-8905", "customer": "Vũ Khoa", "phone": "0966 222 111", "vehicle": "Feliz S", "plate": "51MD-66778", "range": "10–11/11", "status": "Đang thuê", "hour": "10:00", "note": "Đã xác nhận"},
  {"id": "ORD-8899", "customer": "Trần Bình", "phone": "0908 123 456", "vehicle": "Vision 2024", "plate": "51G1-11223", "range": "07–09/11", "status": "Hoàn tất", "hour": "16:00", "note": "Trả xe đúng hạn"},
  {"id": "ORD-8880", "customer": "Lý An", "phone": "0918 654 321", "vehicle": "SH Mode", "plate": "51G1-99881", "range": "05–07/11", "status": "Hoàn tất", "hour": "17:00", "note": "Trả xe đúng hạn"},
  {"id": "ORD-8872", "customer": "Hoàng Yến", "phone": "0922 333 444", "vehicle": "Lead 125", "plate": "51G1-44556", "range": "03–05/11", "status": "Hoàn tất", "hour": "18:00", "note": "Trả xe đúng hạn"},
  {"id": "ORD-8865", "customer": "Phan Đức", "phone": "0934 567 890", "vehicle": "Winner X", "plate": "51G1-88990", "range": "01–03/11", "status": "Hoàn tất", "hour": "10:00", "note": "Trả xe đúng hạn"},
  {"id": "ORD-8850", "customer": "Mai Chi", "phone": "0945 678 901", "vehicle": "Grande", "plate": "51G1-55667", "range": "28–30/10", "status": "Từ chối", "hour": "09:00", "note": "Khách không đóng cọc"}
];

window.VRP_FLEET = [
  { id: "v1", name: "Honda Air Blade 160", shortName: "Air Blade 160", plate: "51G1-23456", type: "Xe tay ga", price: "180.000đ/ngày", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80", status: "prebooked", orderId: "ORD-8921", customer: "Nguyễn Văn Tuấn", phone: "0901 222 333", range: "13–15/11/2026", dateStart: "2026-11-13", hour: "12:00", deposit: "Đã cọc 30% (162.000đ)", total: "540.000đ", note: "Giao xe tại Q1, khách mang CCCD" },
  { id: "v2", name: "Yamaha Exciter 155", shortName: "Exciter 155", plate: "51G1-77889", type: "Xe côn tay", price: "220.000đ/ngày", image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=400&q=80", status: "prebooked", orderId: "ORD-8922", customer: "Trần Thị Mai", phone: "0912 444 555", range: "14–16/11/2026", dateStart: "2026-11-14", hour: "09:30", deposit: "Đã cọc 30% (198.000đ)", total: "660.000đ", note: "Khách nhận trực tiếp tại cửa hàng" },
  { id: "v3", name: "Yamaha Janus 2023", shortName: "Janus 2023", plate: "51G1-33445", type: "Xe tay ga", price: "140.000đ/ngày", image: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=400&q=80", status: "prebooked", orderId: "ORD-8935", customer: "Lê Hoàng", phone: "0987 111 000", range: "15–17/11/2026", dateStart: "2026-11-15", hour: "08:45", deposit: "Đã cọc 50% (210.000đ)", total: "420.000đ", note: "Khách yêu cầu thêm 2 nón bảo hiểm 3/4" },
  { id: "v4", name: "Honda Vision 2024", shortName: "Vision 2024", plate: "51G1-11223", type: "Xe tay ga", price: "150.000đ/ngày", image: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=400&q=80", status: "prebooked", orderId: "ORD-8940", customer: "Đặng Quốc Bảo", phone: "0938 777 999", range: "18–20/11/2026", dateStart: "2026-11-18", hour: "14:00", deposit: "Đã cọc 30% (135.000đ)", total: "450.000đ", note: "Giao xe tại Sân bay Tân Sơn Nhất" },
  { id: "v5", name: "Honda SH Mode 125", shortName: "SH Mode", plate: "51G1-99881", type: "Tay ga cao cấp", price: "250.000đ/ngày", image: "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=400&q=80", status: "available" },
  { id: "v6", name: "VinFast Feliz S", shortName: "Feliz S", plate: "51MD-66778", type: "Xe máy điện", price: "160.000đ/ngày", image: "https://images.unsplash.com/photo-1558980664-3a031cf67ea8?auto=format&fit=crop&w=400&q=80", status: "renting", orderId: "ORD-8905", customer: "Vũ Khoa", phone: "0966 222 111", range: "10–11/11/2026" },
  { id: "v7", name: "Honda Lead 125", shortName: "Lead 125", plate: "51G1-44556", type: "Xe tay ga", price: "170.000đ/ngày", image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80", status: "available" },
  { id: "v8", name: "Honda Winner X", shortName: "Winner X", plate: "51G1-88990", type: "Xe côn tay", price: "200.000đ/ngày", image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=400&q=80", status: "available" },
  { id: "v9", name: "Yamaha Grande", shortName: "Grande", plate: "51G1-55667", type: "Xe tay ga", price: "190.000đ/ngày", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80", status: "available" },
  { id: "v10", name: "Honda SH 150i", shortName: "SH 150i", plate: "51G1-12399", type: "Tay ga cao cấp", price: "320.000đ/ngày", image: "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=400&q=80", status: "available" },
  { id: "v11", name: "Suzuki Raider", shortName: "Raider", plate: "51G1-66778", type: "Xe côn tay", price: "210.000đ/ngày", image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=400&q=80", status: "available" },
  { id: "v12", name: "Yamaha NVX 155", shortName: "NVX 155", plate: "51G1-99001", type: "Xe tay ga", price: "220.000đ/ngày", image: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=400&q=80", status: "available" }
];

try {
  var savedOrders = sessionStorage.getItem("vrpOrders");
  if (savedOrders) {
    var parsed = JSON.parse(savedOrders);
    if (parsed && parsed.length && parsed[0].plate) window.VRP_ORDERS = parsed;
  }
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
    var href = "rental_calendar.html?xe=" + encodeURIComponent(vehicle);
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


/* Shim để JS lịch chạy độc lập trong file tách riêng */
window.__VRP_PAGE = "rental_calendar.html";
window.__VRP_QUERY = location.search;
window.__vrpGo = function (href) { location.href = href; };


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

        var vehicleFilter = params.get("xe") || "prebooked";
        var vehicle = (params.get("xe") || stored.name || "Honda Vision 2024").trim();
        var anchor = pickedDate ? new Date(pickedDate) : new Date(2026, 10, 16);
        if (!pickedDate && window.VRP_ORDERS) {
            var activeDates = [];
            window.VRP_ORDERS.forEach(function (o) {
                if (o.status !== "Đang thuê" && o.status !== "Hoàn tất" && o.status !== "Chờ XN") return;
                var r = vrpOrderRange(o);
                if (r) activeDates.push(r.start);
            });
            activeDates.sort();
            if (activeDates.length) anchor = parseKey(activeDates[activeDates.length - 1]) || anchor;
        }
        var viewMode = "week";
        var selection = null;
        var holds = [];

        function demoFor(date) {
            var list = [];
            var key = dateKey(date);
            (window.VRP_ORDERS || []).forEach(function (o, i) {
                var isPrebooked = (o.status === "Chờ XN" || o.status === "Đặt trước" || o.isPrebooked);
                var isRenting = (o.status === "Đang thuê");
                var isDone = (o.status === "Hoàn tất");

                if (!isPrebooked && !isRenting && !isDone) return;

                // Bộ lọc theo xe hoặc nhóm xe
                if (vehicleFilter === "prebooked") {
                    if (!isPrebooked) return;
                } else if (vehicleFilter === "renting") {
                    if (!isRenting) return;
                } else if (vehicleFilter !== "all") {
                    var term = vehicleFilter.toLowerCase();
                    var matchV = o.vehicle && o.vehicle.toLowerCase().indexOf(term) !== -1;
                    var matchP = o.plate && o.plate.toLowerCase().indexOf(term) !== -1;
                    if (!matchV && !matchP) return;
                }

                var range = vrpOrderRange(o);
                if (!range || key < range.start || key > range.end) return;
                var hour = parseInt(String(o.hour || "").slice(0, 2), 10);
                if (isNaN(hour)) hour = 9 + (i % 6) * 2;
                var start = Math.max(OPEN, Math.min(CLOSE - 2, hour));
                var end = Math.min(CLOSE, start + 3);

                var state = isPrebooked ? "prebooked" : (isRenting ? "confirmed" : "pending");

                list.push({
                    dateKey: key,
                    start: start,
                    end: end,
                    state: state,
                    id: o.id,
                    vehicle: o.vehicle,
                    plate: o.plate || "",
                    customer: o.customer || "",
                    phone: o.phone || "",
                    isPrebooked: isPrebooked,
                    note: (o.plate ? "[" + o.plate + "] " : "") + o.vehicle + " · " + (isPrebooked ? "Đặt trước" : o.status) + (o.note ? " · " + o.note : "")
                });
            });
            return list;
        }

        function blocksFor(date) {
            return demoFor(date);
        }

        function eventTitle(b) {
            if (b.isPrebooked) return '<span class="ev-badge-prebook">⭐ ĐẶT TRƯỚC</span>' + (b.vehicle || "Xe đặt trước");
            if (b.state === "confirmed") return (b.vehicle || "Đã đặt") + ' · Đang thuê';
            if (b.state === "pending") return "Chờ duyệt";
            return b.you ? "Giữ chỗ của bạn" : "Giữ chỗ (30p)";
        }

        function eventTime(b) {
            return PAD(b.start) + ":00 – " + PAD(Math.min(b.end, CLOSE)) + ":00";
        }

        function renderPicker() {}

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
                        '" style="top:' + top + 'px;height:' + height + 'px" data-order-id="' + (b.id || "") + '" data-vehicle="' + (b.vehicle || "") + '"' +
                        (b.isPrebooked ? ' title="Bấm để xem chi tiết xe đặt trước"' : '') + '>' +
                        '<span class="ev-title">' + eventTitle(b) + '</span>' +
                        '<span class="ev-time">' + eventTime(b) + '</span>' +
                        '<span class="ev-id">' + b.id + (b.customer ? " · " + b.customer : "") + (b.plate ? " (" + b.plate + ")" : "") + '</span>' +
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

        function esc(value) {
            return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
            });
        }

        function renderVehicleFilterBar() {
            var select = document.getElementById("calVehicleSelect");
            if (select && select.value !== vehicleFilter) {
                select.value = vehicleFilter;
            }
            document.querySelectorAll(".cvf-pill").forEach(function (pill) {
                var f = pill.getAttribute("data-filter");
                pill.classList.toggle("active", f === vehicleFilter);
            });
            var filterPrebookedBtn = document.getElementById("btnFilterPrebookedOnly");
            var filterAllBtn = document.getElementById("btnFilterAllVehicles");
            if (filterPrebookedBtn) filterPrebookedBtn.classList.toggle("active", vehicleFilter === "prebooked");
            if (filterAllBtn) filterAllBtn.classList.toggle("active", vehicleFilter === "all");
        }

        function renderPrebookedSection() {
            var container = document.getElementById("pvsCardsGrid");
            if (!container) return;
            var prebookedList = (window.VRP_FLEET || []).filter(function (v) {
                return v.status === "prebooked";
            });

            var badgeCount = document.getElementById("pvsBadgeCount");
            if (badgeCount) badgeCount.textContent = prebookedList.length + " xe";
            var kpiCount = document.getElementById("kpiPrebookedCount");
            if (kpiCount) kpiCount.textContent = prebookedList.length;

            var html = "";
            prebookedList.forEach(function (v) {
                var isViewing = (vehicleFilter === v.shortName || vehicleFilter === v.name);
                html += '<div class="pvs-card' + (isViewing ? ' is-active-view' : '') + '" data-vehicle="' + esc(v.shortName) + '" data-date="' + (v.dateStart || '') + '">' +
                    '<span class="pvs-badge-prebook">⭐ Đang đặt trước</span>' +
                    '<div class="pvs-card-top">' +
                        '<img class="pvs-thumb" src="' + esc(v.image) + '" alt="' + esc(v.name) + '">' +
                        '<div class="pvs-top-info">' +
                            '<h4 class="pvs-vehicle-name" title="' + esc(v.name) + '">' + esc(v.name) + '</h4>' +
                            '<span class="pvs-plate-tag">' + esc(v.plate) + '</span>' +
                            '<small style="display:block;color:#6b7280;margin-top:3px">' + esc(v.type) + ' · ' + esc(v.price) + '</small>' +
                        '</div>' +
                    '</div>' +
                    '<div class="pvs-card-body">' +
                        '<div class="pvs-detail-item">' +
                            '<span class="pvs-icon">👤</span>' +
                            '<div>Khách: <strong>' + esc(v.customer) + '</strong> (<a href="tel:' + esc((v.phone || "").replace(/\s+/g,'')) + '" style="color:#079b70;font-weight:600">' + esc(v.phone) + '</a>)</div>' +
                        '</div>' +
                        '<div class="pvs-detail-item">' +
                            '<span class="pvs-icon">📆</span>' +
                            '<div>Lịch đặt: <strong>' + esc(v.range) + '</strong> (Nhận xe ' + esc(v.hour) + ')</div>' +
                        '</div>' +
                        '<div class="pvs-detail-item">' +
                            '<span class="pvs-icon">📋</span>' +
                            '<div>Đơn: <strong>' + esc(v.orderId) + '</strong> <span class="pvs-badge-deposit">' + esc(v.deposit || 'Đã cọc') + '</span></div>' +
                        '</div>' +
                        (v.note ? '<div class="pvs-detail-item"><span class="pvs-icon">📝</span><div style="font-size:11.5px;color:#6b7280;font-style:italic">' + esc(v.note) + '</div></div>' : '') +
                    '</div>' +
                    '<div class="pvs-card-footer">' +
                        '<button type="button" class="btn-pvs-view-cal" data-vehicle="' + esc(v.shortName) + '" data-date="' + (v.dateStart || '') + '">' +
                            '📅 Xem trên lịch' +
                        '</button>' +
                        '<button type="button" class="btn-pvs-order-detail" data-order-id="' + esc(v.orderId) + '">' +
                            'Chi tiết đơn' +
                        '</button>' +
                    '</div>' +
                '</div>';
            });
            container.innerHTML = html;
        }

        function openPrebookModal(orderIdOrVehicle) {
            var order = null;
            var vehicleObj = null;

            if (orderIdOrVehicle) {
                // Find order
                (window.VRP_ORDERS || []).forEach(function (o) {
                    if (o.id === orderIdOrVehicle || (o.vehicle && o.vehicle.toLowerCase().indexOf(orderIdOrVehicle.toLowerCase()) !== -1)) {
                        order = o;
                    }
                });
                // Find vehicle
                (window.VRP_FLEET || []).forEach(function (v) {
                    if (v.orderId === orderIdOrVehicle || v.shortName === orderIdOrVehicle || v.name === orderIdOrVehicle) {
                        vehicleObj = v;
                        if (!order && v.orderId) {
                            (window.VRP_ORDERS || []).forEach(function (o) {
                                if (o.id === v.orderId) order = o;
                            });
                        }
                    }
                });
            }

            if (!order && !vehicleObj) return;

            var vName = vehicleObj ? vehicleObj.name : (order ? order.vehicle : "Xe đặt trước");
            var vPlate = (vehicleObj && vehicleObj.plate) || (order && order.plate) || "51G1-XXXXX";
            var vImg = (vehicleObj && vehicleObj.image) || "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80";
            var vPrice = (vehicleObj && vehicleObj.price) || (order && order.price) || "180.000đ/ngày";
            var vType = (vehicleObj && vehicleObj.type) || "Xe máy";
            var oId = (order && order.id) || (vehicleObj && vehicleObj.orderId) || "ORD-XXXX";
            var cName = (order && order.customer) || (vehicleObj && vehicleObj.customer) || "Khách hàng";
            var cPhone = (order && order.phone) || (vehicleObj && vehicleObj.phone) || "0900 000 000";
            var oRange = (order && order.range) || (vehicleObj && vehicleObj.range) || "Theo lịch";
            var oHour = (order && order.hour) || (vehicleObj && vehicleObj.hour) || "09:00";
            var oDeposit = (order && order.deposit) || (vehicleObj && vehicleObj.deposit) || "Đã cọc 30%";
            var oTotal = (order && order.total) || (vehicleObj && vehicleObj.total) || "540.000đ";
            var oNote = (order && order.note) || (vehicleObj && vehicleObj.note) || "Không có ghi chú thêm.";

            var body = document.getElementById("pbmBody");
            if (!body) return;

            body.innerHTML = 
                '<div class="pbm-vehicle-card">' +
                    '<img class="pbm-vehicle-img" src="' + esc(vImg) + '" alt="' + esc(vName) + '">' +
                    '<div>' +
                        '<div style="font-size:11px;font-weight:700;color:#079b70;text-transform:uppercase;letter-spacing:0.04em">⭐ Đơn đặt trước đã xác nhận</div>' +
                        '<h4 style="margin:2px 0 4px 0;font-size:16px;font-weight:700;color:#1e293b">' + esc(vName) + '</h4>' +
                        '<div style="display:flex;align-items:center;gap:6px">' +
                            '<span class="pvs-plate-tag">' + esc(vPlate) + '</span>' +
                            '<span style="font-size:12px;color:#64748b">' + esc(vType) + ' · ' + esc(vPrice) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="pbm-info-grid">' +
                    '<div class="pbm-info-box">' +
                        '<div class="pbm-info-label">Khách hàng đặt</div>' +
                        '<div class="pbm-info-val">' + esc(cName) + '</div>' +
                    '</div>' +
                    '<div class="pbm-info-box">' +
                        '<div class="pbm-info-label">Số điện thoại liên hệ</div>' +
                        '<div class="pbm-info-val"><a href="tel:' + esc(cPhone.replace(/\s+/g,'')) + '" style="color:#079b70">' + esc(cPhone) + '</a></div>' +
                    '</div>' +
                    '<div class="pbm-info-box">' +
                        '<div class="pbm-info-label">Lịch trình thuê xe</div>' +
                        '<div class="pbm-info-val">' + esc(oRange) + '</div>' +
                    '</div>' +
                    '<div class="pbm-info-box">' +
                        '<div class="pbm-info-label">Khung giờ giao nhận xe</div>' +
                        '<div class="pbm-info-val">' + esc(oHour) + '</div>' +
                    '</div>' +
                    '<div class="pbm-info-box">' +
                        '<div class="pbm-info-label">Trạng thái đặt cọc</div>' +
                        '<div class="pbm-info-val" style="color:#047857">' + esc(oDeposit) + '</div>' +
                    '</div>' +
                    '<div class="pbm-info-box">' +
                        '<div class="pbm-info-label">Tổng giá trị đơn dự kiến</div>' +
                        '<div class="pbm-info-val">' + esc(oTotal) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="pbm-note-box">' +
                    '<strong>💡 Ghi chú đơn / Điểm hẹn:</strong> ' + esc(oNote) +
                '</div>';

            var viewOrderBtn = document.getElementById("pbmViewOrderBtn");
            if (viewOrderBtn) {
                viewOrderBtn.href = "orders.html?order=" + encodeURIComponent(oId);
            }

            var modalBackdrop = document.getElementById("prebookModalBackdrop");
            if (modalBackdrop) {
                modalBackdrop.classList.add("is-open");
                modalBackdrop.setAttribute("aria-hidden", "false");
            }
        }

        function closePrebookModal() {
            var modalBackdrop = document.getElementById("prebookModalBackdrop");
            if (modalBackdrop) {
                modalBackdrop.classList.remove("is-open");
                modalBackdrop.setAttribute("aria-hidden", "true");
            }
        }

        function render() {
            renderToolbar();
            renderVehicleFilterBar();
            renderPrebookedSection();
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


        bodyEl.addEventListener("click", function (e) {
            var md = e.target.closest ? e.target.closest(".cal-month-day") : null;
            if (!md) return;
            var picked = parseKey(md.getAttribute("data-date"));
            viewMode = "day";
            anchor = picked;
            render();
        });


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

        document.title = vehicle + " · Lịch thuê · VRP-GO";

        if (stored.name) {
            document.getElementById("bookingStatusVehicle").textContent = stored.name;
            document.getElementById("bookingStatus").hidden = false;
        }

        // Nút đóng modal
        var closeBtn = document.getElementById("pbmCloseBtn");
        var closeFooterBtn = document.getElementById("pbmCloseFooterBtn");
        var modalBackdrop = document.getElementById("prebookModalBackdrop");
        if (closeBtn) closeBtn.addEventListener("click", closePrebookModal);
        if (closeFooterBtn) closeFooterBtn.addEventListener("click", closePrebookModal);
        if (modalBackdrop) {
            modalBackdrop.addEventListener("click", function (e) {
                if (e.target === modalBackdrop) closePrebookModal();
            });
        }
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closePrebookModal();
        });

        // Click trên trang: Card xe đặt trước & Calendar Event
        document.addEventListener("click", function (e) {
            var viewCalBtn = e.target.closest ? e.target.closest(".btn-pvs-view-cal") : null;
            if (viewCalBtn) {
                var veh = viewCalBtn.getAttribute("data-vehicle");
                var dStr = viewCalBtn.getAttribute("data-date");
                if (veh) {
                    vehicleFilter = veh;
                    if (dStr) {
                        var d = parseKey(dStr);
                        if (d) anchor = d;
                    }
                    render();
                    var calEl = document.querySelector(".cal-card");
                    if (calEl) calEl.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                return;
            }

            var orderBtn = e.target.closest ? e.target.closest(".btn-pvs-order-detail") : null;
            if (orderBtn) {
                var oid = orderBtn.getAttribute("data-order-id");
                if (oid) openPrebookModal(oid);
                return;
            }

            var evEl = e.target.closest ? e.target.closest(".cal-event") : null;
            if (evEl && !bodyEl.classList.contains("is-dragging")) {
                var evOrderId = evEl.getAttribute("data-order-id");
                if (evOrderId && (evEl.classList.contains("state-prebooked") || evEl.classList.contains("state-confirmed"))) {
                    openPrebookModal(evOrderId);
                }
            }
        });

        // KPI cards clicks
        var kpiPre = document.getElementById("kpiPrebooked");
        if (kpiPre) {
            kpiPre.addEventListener("click", function () {
                vehicleFilter = "prebooked";
                render();
                var s = document.getElementById("prebookedVehiclesSection");
                if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }
        var kpiTot = document.getElementById("kpiTotal");
        if (kpiTot) {
            kpiTot.addEventListener("click", function () {
                vehicleFilter = "all";
                render();
            });
        }
        var kpiRent = document.getElementById("kpiRenting");
        if (kpiRent) {
            kpiRent.addEventListener("click", function () {
                vehicleFilter = "renting";
                render();
            });
        }
        var kpiAvail = document.getElementById("kpiAvailable");
        if (kpiAvail) {
            kpiAvail.addEventListener("click", function () {
                vehicleFilter = "all";
                render();
            });
        }

        // Dropdown & Pills
        var vehSelect = document.getElementById("calVehicleSelect");
        if (vehSelect) {
            vehSelect.addEventListener("change", function () {
                vehicleFilter = this.value;
                render();
            });
        }

        document.querySelectorAll(".cvf-pill").forEach(function (pill) {
            pill.addEventListener("click", function () {
                vehicleFilter = this.getAttribute("data-filter");
                render();
            });
        });

        var btnPreOnly = document.getElementById("btnFilterPrebookedOnly");
        if (btnPreOnly) {
            btnPreOnly.addEventListener("click", function () {
                vehicleFilter = "prebooked";
                render();
            });
        }
        var btnAllVeh = document.getElementById("btnFilterAllVehicles");
        if (btnAllVeh) {
            btnAllVeh.addEventListener("click", function () {
                vehicleFilter = "all";
                render();
            });
        }

        render();
    })();



/* Liên kết giữa các giao diện đã tách */
(function () {
    var MAP = {
        "index.html": "../Giao diện trang chủ/index.html",
        "docs/bien-ban-sprint-review.html": "../Giao diện biên bản sprint review/index.html",
        "khach-hang/account.html": "../Giao diện tài khoản khách hàng/index.html",
        "khach-hang/calendar.html": "../Giao diện lịch xe theo tuần/index.html",
        "khach-hang/index.html": "../Giao diện khách hàng trang chủ/index.html",
        "khach-hang/payment.html": "../Giao diện thanh toán đặt cọc/index.html",
        "khach-hang/receipt.html": "../Giao diện biên nhận điện tử/index.html",
        "operator/complaints.html": "../Giao diện xử lý khiếu nại/index.html",
        "pages/booking.html": "../Giao diện tạo đơn thuê/index.html",
        "pages/faq.html": "../Giao diện câu hỏi thường gặp/index.html",
        "pages/help-center.html": "../Giao diện trung tâm trợ giúp/index.html",
        "pages/how-it-works.html": "../Giao diện cách hoạt động/index.html",
        "pages/login.html": "../Giao diện đăng ký, đăng nhập/index.html",
        "pages/my-orders.html": "../Giao diện đơn của tôi/index.html",
        "pages/register.html": "../Giao diện đăng ký, đăng nhập/index.html",
        "pages/rental-policy.html": "../Giao diện chính sách thuê xe/index.html",
        "pages/reviews.html": "../Giao diện đánh giá khách hàng/index.html",
        "pages/vehicle-detail.html": "../Giao diện chi tiết xe/index.html",
        "pages/vehicles.html": "../Giao diện tìm xe/index.html",
        "store/dashboard.html": "../Giao diện dashboard cửa hàng/index.html",
        "store/index.html": "../Giao diện cửa hàng trang chủ/index.html",
        "store/inventory.html": "../Giao diện kho xe/index.html",
        "store/orders.html": "../Giao diện đơn thuê cửa hàng/index.html",
        "store/revenue.html": "../Giao diện doanh thu/index.html",
        "store/rental_calendar.html": "../Giao diện lịch thuê cửa hàng/index.html",
        "store/vehicle_management.html": "../Giao diện quản lý đội xe/index.html",
        "store/store_operations.html": "../Giao diện vận hành cửa hàng/index.html",
        "store/layout.html": "../Giao diện layout và điều hướng/index.html",
        "store/login_register.html": "../Giao diện đăng nhập đăng ký cửa hàng/index.html",
        "store/regis_for_delivery.html": "../Giao diện đăng ký gian hàng/index.html",
        "store/ui_kit.html": "../Giao diện UI Kit/index.html",
        "pages/user-info.html": "../Giao diện thông tin khách hàng/index.html"
    };
    var ALIAS = {
    "store/store_owner_index.html": "store/index.html",
    "pages/index.html": "index.html",
    "pages/pages/how-it-works.html": "pages/how-it-works.html"
};
    var PAGE = "store/rental_calendar.html";

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
    window.location.href = encodeURI('../Giao diện đăng ký, đăng nhập/index.html');
  });
})();