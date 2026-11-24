(function () {
  var PAGE = "store/index.html";
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
// FR-34: Dữ liệu minh họa cho Dashboard cửa hàng
const orderStatusData = [
    { name: "Chờ xác nhận", count: 12, className: "pending" },
    { name: "Đã xác nhận", count: 20, className: "confirmed" },
    { name: "Đang thuê", count: 18, className: "renting" },
    { name: "Hoàn tất", count: 30, className: "done" },
    { name: "Đã hủy", count: 6, className: "cancelled" }
];

const weeklyRevenue = [
    { label: "Tuần 1", value: 8200000 },
    { label: "Tuần 2", value: 12800000 },
    { label: "Tuần 3", value: 9600000 },
    { label: "Tuần 4", value: 11900000 }
];

const monthlyRevenue = [
    { label: "T7", value: 32500000 },
    { label: "T8", value: 38900000 },
    { label: "T9", value: 41200000 },
    { label: "T10", value: 44500000 },
    { label: "T11", value: 48500000 }
];

const revenueRecords = [
    { date: "2026-11-02", orders: 4, revenue: 1800000 },
    { date: "2026-11-05", orders: 6, revenue: 2600000 },
    { date: "2026-11-09", orders: 5, revenue: 2200000 },
    { date: "2026-11-13", orders: 7, revenue: 3100000 },
    { date: "2026-11-18", orders: 8, revenue: 3600000 },
    { date: "2026-11-22", orders: 6, revenue: 2700000 },
    { date: "2026-11-27", orders: 9, revenue: 4200000 }
];

function formatMoney(value) {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

function renderStatusChart() {
    const chart = document.getElementById("statusChart");
    chart.innerHTML = "";
    const maxCount = Math.max(...orderStatusData.map(item => item.count));

    orderStatusData.forEach(function (item) {
        const row = document.createElement("div");
        row.className = "status-row";
        row.innerHTML = `
            <span class="status-name">${item.name}</span>
            <div class="status-track">
                <div class="status-fill ${item.className}" style="width:${item.count / maxCount * 100}%"></div>
            </div>
            <span class="status-count">${item.count}</span>
        `;
        chart.appendChild(row);
    });
}

function renderRevenueChart(mode) {
    const chart = document.getElementById("revenueChart");
    const total = document.getElementById("revenueTotal");
    chart.innerHTML = "";

    let data = weeklyRevenue;
    if (mode === "month") {
        data = monthlyRevenue;
    }

    let maxValue = Math.max(...data.map(item => item.value));
    let sum = 0;

    data.forEach(function (item) {
        sum += item.value;
        const column = document.createElement("div");
        column.className = "revenue-column";
        const height = item.value / maxValue * 125;

        column.innerHTML = `
            <span class="revenue-value">${(item.value / 1000000).toFixed(1)}tr</span>
            <div class="revenue-bar" style="height:${height}px"></div>
            <span class="revenue-label">${item.label}</span>
        `;
        chart.appendChild(column);
    });

    total.textContent = formatMoney(sum);
}

document.getElementById("totalOrders").textContent = orderStatusData.reduce((sum, item) => sum + item.count, 0);
document.getElementById("pendingOrders").textContent = orderStatusData[0].count;
document.getElementById("activeOrders").textContent = orderStatusData[2].count;
document.getElementById("monthlyRevenue").textContent = "48,5 triệu";

renderStatusChart();
renderRevenueChart("week");

// Chuyển giữa biểu đồ doanh thu tuần và tháng
const tabButtons = document.getElementsByClassName("tab-button");
Array.from(tabButtons).forEach(function (button) {
    button.addEventListener("click", function () {
        Array.from(tabButtons).forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        renderRevenueChart(button.dataset.mode);
    });
});

// FR-35: Xuất báo cáo doanh thu theo khoảng ngày đã chọn
document.getElementById("exportRevenue").addEventListener("click", function () {
    const startDate = document.getElementById("exportStart").value;
    const endDate = document.getElementById("exportEnd").value;
    const hint = document.getElementById("exportHint");

    if (!startDate || !endDate) {
        alert("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
        return;
    }

    if (startDate > endDate) {
        alert("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        return;
    }

    const selectedRecords = revenueRecords.filter(function (item) {
        return item.date >= startDate && item.date <= endDate;
    });

    if (selectedRecords.length === 0) {
        alert("Không có dữ liệu doanh thu trong khoảng thời gian đã chọn.");
        return;
    }

    const rows = [["Ngày", "Số đơn hoàn tất", "Doanh thu (VND)"]];
    selectedRecords.forEach(function (item) {
        rows.push([item.date, item.orders, item.revenue]);
    });

    const totalOrders = selectedRecords.reduce((sum, item) => sum + item.orders, 0);
    const totalRevenue = selectedRecords.reduce((sum, item) => sum + item.revenue, 0);
    rows.push(["TỔNG CỘNG", totalOrders, totalRevenue]);

    const csv = "\uFEFF" + rows.map(row => row.join(",")).join("\n");
    const file = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bao-cao-doanh-thu-cua-hang.csv";
    link.click();
    URL.revokeObjectURL(url);

    hint.textContent = "Đã tạo báo cáo gồm " + selectedRecords.length + " dòng dữ liệu. File CSV có thể mở bằng Excel.";
});



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
    var PAGE = "store/index.html";

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