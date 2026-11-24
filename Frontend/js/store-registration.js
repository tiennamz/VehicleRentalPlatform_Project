(function () {
  var PAGE = "store-registration.html";
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
      if (__b === "index.html" && !/index\.html$/i.test(location.pathname)) __t = "homepage.html" + __t.slice(__b.length);
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
// Dữ liệu mẫu danh sách hồ sơ đăng ký gian hàng
const partnerProfiles = [
  {
    id: "#HS601",
    storeName: "Xe Máy Hoàng Gia - Cầu Giấy",
    ownerName: "Nguyễn Văn An",
    phone: "0912345678",
    submittedAt: "16/11/2026",
    docSummary: "Đầy đủ (4/4)",
    status: "pending",
    statusLabel: "Chờ duyệt",
    reason: "",
    steps: [
      { title: "1. Nộp hồ sơ", time: "16/11/2026 09:15", state: "done" },
      { title: "2. Kiểm tra giấy tờ", time: "16/11/2026 10:00", state: "done" },
      { title: "3. Thẩm định thực tế", time: "Đang xử lý...", state: "current" },
      { title: "4. Kích hoạt gian hàng", time: "Chờ hoàn tất", state: "" }
    ],
    docs: [
      { name: "CCCD mặt trước", state: "Hợp lệ", type: "ok" },
      { name: "CCCD mặt sau", state: "Hợp lệ", type: "ok" },
      { name: "Giấy phép kinh doanh", state: "Đang đối chiếu", type: "warn" },
      { name: "Ảnh mặt tiền cửa hàng", state: "Hợp lệ", type: "ok" }
    ]
  },
  {
    id: "#HS603",
    storeName: "Thuê Xe Điện Xanh Đà Nẵng",
    ownerName: "Lê Hoàng Nam",
    phone: "0988776655",
    submittedAt: "14/11/2026",
    docSummary: "Thiếu 1 giấy tờ",
    status: "missing",
    statusLabel: "Thiếu giấy tờ",
    reason: "Ảnh Giấy phép đăng ký kinh doanh bị mờ số mã số thuế. Vui lòng tải lại bản chụp rõ nét.",
    steps: [
      { title: "1. Nộp hồ sơ", time: "14/11/2026 14:20", state: "done" },
      { title: "2. Kiểm tra giấy tờ", time: "15/11/2026 08:45", state: "error" },
      { title: "3. Thẩm định thực tế", time: "Tạm dừng", state: "" },
      { title: "4. Kích hoạt gian hàng", time: "Chưa kích hoạt", state: "" }
    ],
    docs: [
      { name: "CCCD mặt trước", state: "Hợp lệ", type: "ok" },
      { name: "CCCD mặt sau", state: "Hợp lệ", type: "ok" },
      { name: "Giấy phép kinh doanh", state: "Ảnh mờ - Cần bổ sung", type: "err" },
      { name: "Ảnh mặt tiền cửa hàng", state: "Hợp lệ", type: "ok" }
    ]
  },
  {
    id: "#HS604",
    storeName: "VRP Auto Tự Lái Quận 1",
    ownerName: "Phạm Quốc Huy",
    phone: "0909112233",
    submittedAt: "10/11/2026",
    docSummary: "Đầy đủ (4/4)",
    status: "approved",
    statusLabel: "Đã duyệt",
    reason: "",
    steps: [
      { title: "1. Nộp hồ sơ", time: "10/11/2026 10:00", state: "done" },
      { title: "2. Kiểm tra giấy tờ", time: "10/11/2026 15:30", state: "done" },
      { title: "3. Thẩm định thực tế", time: "11/11/2026 09:00", state: "done" },
      { title: "4. Kích hoạt gian hàng", time: "11/11/2026 11:20", state: "done" }
    ],
    docs: [
      { name: "CCCD mặt trước", state: "Đã xác thực", type: "ok" },
      { name: "CCCD mặt sau", state: "Đã xác thực", type: "ok" },
      { name: "Giấy phép kinh doanh", state: "Đã xác thực", type: "ok" },
      { name: "Ảnh mặt tiền cửa hàng", state: "Đã xác thực", type: "ok" }
    ]
  },
  {
    id: "#HS605",
    storeName: "Motorbike Express Nha Trang",
    ownerName: "Đỗ Minh Tuấn",
    phone: "0933445566",
    submittedAt: "08/11/2026",
    docSummary: "Không hợp lệ",
    status: "rejected",
    statusLabel: "Bị từ chối",
    reason: "Thông tin chủ sở hữu trên CCCD không trùng khớp với người đại diện pháp luật trên Giấy phép kinh doanh.",
    steps: [
      { title: "1. Nộp hồ sơ", time: "08/11/2026 16:10", state: "done" },
      { title: "2. Kiểm tra giấy tờ", time: "09/11/2026 10:15", state: "error" },
      { title: "3. Thẩm định thực tế", time: "Đã hủy", state: "" },
      { title: "4. Kích hoạt gian hàng", time: "Từ chối", state: "" }
    ],
    docs: [
      { name: "CCCD mặt trước", state: "Không khớp tên", type: "err" },
      { name: "CCCD mặt sau", state: "Hợp lệ", type: "ok" },
      { name: "Giấy phép kinh doanh", state: "Sai người đại diện", type: "err" },
      { name: "Ảnh mặt tiền cửa hàng", state: "Hợp lệ", type: "ok" }
    ]
  }
];

let selectedProfileId = "#HS601";
const uploadedDocs = {
  cccdFront: false,
  cccdBack: false,
  businessLicense: false,
  storePhoto: false
};

// Hiển thị thông báo Toast
const showToast = (msg) => {
  const toast = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 3200);
};

// Chuyển đổi Tab
const switchTab = (tabName) => {
  document.querySelectorAll(".nav-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
};

document.querySelectorAll(".nav-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.getElementById("goToRegisterBtn").addEventListener("click", () => {
  switchTab("register");
});

// Xử lý Upload 4 loại ảnh có xem trước
const createPlaceholderSVG = (label) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23d1fae5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23065f46" font-family="sans-serif" font-size="16" font-weight="bold">${encodeURIComponent(label)}</text></svg>`;

document.querySelectorAll(".upload-item").forEach((item) => {
  const docKey = item.dataset.doc;
  const dropArea = item.querySelector(".drop-area");
  const fileInput = item.querySelector("input[type='file']");
  const previewImg = item.querySelector(".preview-img");
  const dropContent = item.querySelector(".drop-content");
  const removeBtn = item.querySelector(".remove-img-btn");

  const setPreview = (src) => {
    previewImg.src = src;
    previewImg.hidden = false;
    removeBtn.hidden = false;
    dropContent.hidden = true;
    uploadedDocs[docKey] = true;
  };

  const clearPreview = () => {
    previewImg.src = "";
    previewImg.hidden = true;
    removeBtn.hidden = true;
    dropContent.hidden = false;
    fileInput.value = "";
    uploadedDocs[docKey] = false;
  };

  dropArea.addEventListener("click", (e) => {
    if (e.target !== removeBtn) fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  });

  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearPreview();
  });

  item._setPreview = setPreview;
  item._clearPreview = clearPreview;
});

// Nút điền dữ liệu mẫu nhanh
document.getElementById("fillSampleBtn").addEventListener("click", () => {
  switchTab("register");
  document.getElementById("storeName").value = "VRP Go - Chi nhánh Tây Hồ";
  document.getElementById("businessType").value = "Hộ kinh doanh cá thể";
  document.getElementById("vehicleCategory").value = "Xe máy & Xe điện";
  document.getElementById("fleetSize").value = "25";
  document.getElementById("storeAddress").value = "128 Đường Lạc Long Quân, Quận Tây Hồ, Hà Nội";
  document.getElementById("ownerName").value = "Vũ Minh Đức";
  document.getElementById("ownerIdNumber").value = "001098012345";
  document.getElementById("ownerPhone").value = "0987654321";
  document.getElementById("ownerEmail").value = "vuduc.partner@vrpgo.vn";
  document.getElementById("agreeTerms").checked = true;

  const labels = {
    cccdFront: "CCCD Mặt Trước (Đã tải)",
    cccdBack: "CCCD Mặt Sau (Đã tải)",
    businessLicense: "Giấy Phép Kinh Doanh (Đã tải)",
    storePhoto: "Ảnh Mặt Tiền Cửa Hàng (Đã tải)"
  };

  document.querySelectorAll(".upload-item").forEach((item) => {
    const key = item.dataset.doc;
    item._setPreview(createPlaceholderSVG(labels[key]));
  });

  showToast("Đã điền sẵn dữ liệu mẫu và 4 ảnh giấy tờ!");
});

// Cập nhật KPI & Bảng theo dõi
const updateKPIs = () => {
  document.getElementById("profileCountBadge").textContent = partnerProfiles.length;
  document.getElementById("kpiTotal").textContent = partnerProfiles.length;
  document.getElementById("kpiPending").textContent = partnerProfiles.filter((p) => p.status === "pending").length;
  document.getElementById("kpiApproved").textContent = partnerProfiles.filter((p) => p.status === "approved").length;
  document.getElementById("kpiAction").textContent = partnerProfiles.filter(
    (p) => p.status === "missing" || p.status === "rejected"
  ).length;
};

const renderDetailPanel = (profileId) => {
  const profile = partnerProfiles.find((p) => p.id === profileId) || partnerProfiles[0];
  selectedProfileId = profile.id;

  document.getElementById("detailCode").textContent = profile.id;
  document.getElementById("detailStoreName").textContent = profile.storeName;
  document.getElementById("detailMeta").textContent = `Chủ gian hàng: ${profile.ownerName} • SĐT: ${profile.phone}`;

  const badge = document.getElementById("detailStatusBadge");
  badge.className = `badge badge-${profile.status}`;
  badge.textContent = profile.statusLabel;

  // Render Stepper
  const stepper = document.getElementById("stepperContainer");
  stepper.innerHTML = profile.steps
    .map(
      (step, idx) => `
      <div class="step-node ${step.state}">
        <div class="step-circle">${step.state === "done" ? "✓" : idx + 1}</div>
        <div class="step-title">${step.title}</div>
        <div class="step-time">${step.time}</div>
      </div>`
    )
    .join("");

  // Cảnh báo nếu thiếu / từ chối
  const feedbackAlert = document.getElementById("feedbackAlert");
  if (profile.status === "missing" || profile.status === "rejected") {
    feedbackAlert.hidden = false;
    document.getElementById("feedbackReason").textContent = profile.reason;
  } else {
    feedbackAlert.hidden = true;
  }

  // Render chi tiết 4 giấy tờ
  const docGrid = document.getElementById("docStatusGrid");
  docGrid.innerHTML = profile.docs
    .map(
      (d) => `
      <div class="doc-card">
        <span class="doc-name">${d.name}</span>
        <span class="doc-state doc-${d.type}">● ${d.state}</span>
      </div>`
    )
    .join("");
};

const renderTable = () => {
  const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
  const statusFilter = document.getElementById("statusFilter").value;
  const tbody = document.getElementById("profileTableBody");

  const filtered = partnerProfiles.filter((item) => {
    const matchText =
      item.id.toLowerCase().includes(keyword) ||
      item.storeName.toLowerCase().includes(keyword) ||
      item.ownerName.toLowerCase().includes(keyword);
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchText && matchStatus;
  });

  tbody.innerHTML = filtered
    .map(
      (item) => `
      <tr class="${item.id === selectedProfileId ? "selected-row" : ""}" data-id="${item.id}">
        <td><strong>${item.id}</strong></td>
        <td>${item.storeName}</td>
        <td>${item.ownerName}</td>
        <td>${item.submittedAt}</td>
        <td>${item.docSummary}</td>
        <td><span class="badge badge-${item.status}">${item.statusLabel}</span></td>
        <td><button type="button" class="btn-view">Xem tiến độ</button></td>
      </tr>`
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      renderDetailPanel(row.dataset.id);
      renderTable();
    });
  });
};

// Gửi form đăng ký gian hàng mới
document.getElementById("partnerRegisterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const allUploaded = Object.values(uploadedDocs).every(Boolean);
  if (!allUploaded) {
    showToast("Vui lòng tải lên đầy đủ 4 ảnh hồ sơ pháp lý!");
    return;
  }

  const newId = `#HS60${partnerProfiles.length + 2}`;
  const newProfile = {
    id: newId,
    storeName: document.getElementById("storeName").value.trim(),
    ownerName: document.getElementById("ownerName").value.trim(),
    phone: document.getElementById("ownerPhone").value.trim(),
    submittedAt: "16/11/2026",
    docSummary: "Đầy đủ (4/4)",
    status: "pending",
    statusLabel: "Chờ duyệt",
    reason: "",
    steps: [
      { title: "1. Nộp hồ sơ", time: "16/11/2026 Vừa xong", state: "done" },
      { title: "2. Kiểm tra giấy tờ", time: "Đang tiếp nhận...", state: "current" },
      { title: "3. Thẩm định thực tế", time: "Chờ xử lý", state: "" },
      { title: "4. Kích hoạt gian hàng", time: "Chờ hoàn tất", state: "" }
    ],
    docs: [
      { name: "CCCD mặt trước", state: "Đã tải lên", type: "warn" },
      { name: "CCCD mặt sau", state: "Đã tải lên", type: "warn" },
      { name: "Giấy phép kinh doanh", state: "Đã tải lên", type: "warn" },
      { name: "Ảnh mặt tiền cửa hàng", state: "Đã tải lên", type: "warn" }
    ]
  };

  partnerProfiles.unshift(newProfile);
  e.target.reset();
  document.querySelectorAll(".upload-item").forEach((item) => item._clearPreview());

  updateKPIs();
  renderDetailPanel(newId);
  renderTable();
  switchTab("tracking");
  showToast(`Nộp hồ sơ ${newId} thành công! Đang chuyển sang theo dõi.`);
});

// Nút bổ sung giấy tờ & gửi duyệt lại
document.getElementById("resubmitBtn").addEventListener("click", () => {
  const target = partnerProfiles.find((p) => p.id === selectedProfileId);
  if (!target) return;

  target.status = "pending";
  target.statusLabel = "Chờ duyệt";
  target.docSummary = "Đã bổ sung (4/4)";
  target.reason = "";
  target.steps[1] = { title: "2. Kiểm tra giấy tờ", time: "16/11/2026 Đã bổ sung", state: "done" };
  target.steps[2] = { title: "3. Thẩm định thực tế", time: "Đang thẩm định lại...", state: "current" };
  target.docs.forEach((d) => {
    d.state = "Đã bổ sung - Chờ duyệt";
    d.type = "warn";
  });

  updateKPIs();
  renderDetailPanel(target.id);
  renderTable();
  showToast(`Đã gửi bổ sung giấy tờ cho hồ sơ ${target.id}!`);
});

document.getElementById("searchInput").addEventListener("input", renderTable);
document.getElementById("statusFilter").addEventListener("change", renderTable);

// Khởi tạo giao diện ban đầu
updateKPIs();
renderDetailPanel(selectedProfileId);
renderTable();
/* Avatar chủ cửa hàng: bấm mở trạng thái */
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
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(panel.hidden); }
    else if (e.key === "Escape") { setOpen(false); }
  });
  document.addEventListener("click", function (e) {
    if (!trigger.contains(e.target)) setOpen(false);
  });
})();



/* Liên kết giữa các giao diện đã tách */
(function () {
    var MAP = {
        "index.html": "homepage.html",
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
    "homepage.html": "index.html",
    "how-it-works.html": "how-it-works.html"
};
    var PAGE = "store-registration.html";

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
