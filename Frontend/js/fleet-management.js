(function () {
  var PAGE = "fleet-management.html";
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
    if (document.documentElement.classList.contains("modal-mode")) return;
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
// Tạo ảnh SVG placeholder mẫu (mã hóa Base64 để không bị vỡ thuộc tính src của thẻ <img>)
const makeVehicleSVG = (bg, fg, title) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="sans-serif" font-size="18" font-weight="bold">${title}</text></svg>`;
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
};

// Danh sách xe ban đầu của cửa hàng
const storeVehicles = [
  {
    id: 1,
    name: "Honda Air Blade 160 ABS",
    yearColor: "Đời 2025 • Đen Nhám",
    plate: "29F1 - 889.26",
    type: "Xe tay ga",
    price: 180000,
    status: "available",
    desc: "Xe mới bảo dưỡng định kỳ, ODO 4.200km. Tặng kèm 02 mũ bảo hiểm + 02 áo mưa.",
    photos: [
      makeVehicleSVG("#d1fae5", "#065f46", "Ảnh toàn diện AB 160")
    ]
  },
  {
    id: 2,
    name: "VinFast Klara S2 (2025)",
    yearColor: "Pin LFP • Trắng Ngọc Trai",
    plate: "29MĐ1 - 452.10",
    type: "Xe máy điện",
    price: 150000,
    status: "rented",
    desc: "Pin LFP chạy 190km/lần sạc, kèm bộ sạc nhanh chính hãng VinFast.",
    photos: [
      makeVehicleSVG("#fef3c7", "#b45309", "Ảnh toàn diện Klara S2")
    ]
  },
  {
    id: 3,
    name: "Honda Vision Thể Thao",
    yearColor: "Đời 2024 • Xám Xi Măng",
    plate: "29B2 - 119.04",
    type: "Xe tay ga",
    price: 140000,
    status: "available",
    desc: "Khóa Smartkey, tiết kiệm xăng, phù hợp di chuyển nội thành.",
    photos: [
      makeVehicleSVG("#d1fae5", "#065f46", "Ảnh toàn diện Vision")
    ]
  },
  {
    id: 4,
    name: "Yamaha Exciter 155 VVA",
    yearColor: "Đời 2024 • Xanh GP",
    plate: "29D2 - 773.81",
    type: "Xe côn tay",
    price: 220000,
    status: "maintenance",
    desc: "Đang thay nhông sên dĩa và kiểm tra phanh định kỳ.",
    photos: [
      makeVehicleSVG("#fee2e2", "#b91c1c", "Ảnh toàn diện Exciter 155")
    ]
  }
];

const requiredPhotos = {
  overview: ""
};
let newestVehicleId = 1;

const statusLabelMap = {
  available: "Sẵn sàng thuê",
  rented: "Đang cho thuê",
  maintenance: "Bảo dưỡng"
};

const formatVND = (num) => Number(num).toLocaleString("vi-VN") + " đ";

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

document.getElementById("viewListBtn").addEventListener("click", () => switchTab("vehicle-list"));
document.getElementById("goToAddVehicleBtn").addEventListener("click", () => switchTab("add-vehicle"));

// Cập nhật trạng thái ảnh toàn diện
const updatePhotoCounter = () => {
  const count = Object.values(requiredPhotos).filter(Boolean).length;
  document.getElementById("photoCounterText").innerHTML =
    `Tải lên <strong>1 ảnh toàn diện</strong> của xe (PNG, JPG tối đa 5MB).${count ? " Đã có ảnh." : ""}`;
};

// Xử lý Upload 1 ảnh toàn diện có xem trước
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
    dropArea.classList.add("has-image");
    requiredPhotos[docKey] = src;
    updatePhotoCounter();
  };

  const clearPreview = () => {
    previewImg.src = "";
    previewImg.hidden = true;
    removeBtn.hidden = true;
    dropContent.hidden = false;
    dropArea.classList.remove("has-image");
    fileInput.value = "";
    requiredPhotos[docKey] = "";
    updatePhotoCounter();
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

  dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));

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

// Điền dữ liệu mẫu nhanh
document.getElementById("fillSampleBtn").addEventListener("click", () => {
  switchTab("add-vehicle");
  document.getElementById("vehicleName").value = "Honda SH Mode 125 ABS";
  document.getElementById("vehicleType").value = "Xe tay ga";
  document.getElementById("licensePlate").value = "29E2 - 668.99";
  document.getElementById("yearColor").value = "2025 • Đỏ Đen Thể Thao";
  document.getElementById("vehicleDesc").value = "Xe mới 99%, ODO 1.800km, phanh ABS 2 kênh, tặng kèm 02 mũ bảo hiểm.";
  document.getElementById("dailyPrice").value = "200000";
  document.getElementById("depositAmount").value = "1.500.000 đ (Hoặc giữ CCCD gốc)";
  document.getElementById("fuelType").value = "Xăng RON 95 (Đầy bình khi giao)";
  document.getElementById("listingStatus").value = "available";
  document.getElementById("agreeSafety").checked = true;

  const sampleLabels = {
    overview: "Ảnh toàn diện SH Mode 125 ABS"
  };

  document.querySelectorAll(".upload-item").forEach((item) => {
    const key = item.dataset.doc;
    item._setPreview(makeVehicleSVG("#d1fae5", "#065f46", sampleLabels[key]));
  });

  showToast("Đã điền sẵn thông tin xe và ảnh toàn diện xem trước!");
});

// Cập nhật thống kê KPI
const updateKPIs = () => {
  document.getElementById("vehicleCountBadge").textContent = storeVehicles.length;
  document.getElementById("kpiTotal").textContent = storeVehicles.length;
  document.getElementById("kpiAvailable").textContent = storeVehicles.filter((v) => v.status === "available").length;
  document.getElementById("kpiRented").textContent = storeVehicles.filter((v) => v.status === "rented").length;
  document.getElementById("kpiMaintenance").textContent = storeVehicles.filter((v) => v.status === "maintenance").length;
};

// Render bảng danh sách xe của cửa hàng
const renderVehicleTable = () => {
  const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
  const typeVal = document.getElementById("typeFilter").value;
  const statusVal = document.getElementById("statusFilter").value;
  const tbody = document.getElementById("vehicleTableBody");

  const filtered = storeVehicles.filter((v) => {
    const matchText = v.name.toLowerCase().includes(keyword) || v.plate.toLowerCase().includes(keyword);
    const matchType = typeVal === "all" || v.type === typeVal;
    const matchStatus = statusVal === "all" || v.status === statusVal;
    return matchText && matchType && matchStatus;
  });

  tbody.innerHTML = filtered
    .map(
      (v) => `
      <tr class="${v.id === newestVehicleId ? "highlight-row" : ""}">
        <td>
          <div class="vehicle-cell">
            <img src="${v.photos[0]}" alt="${v.name}" class="vehicle-thumb" />
            <div>
              <strong>${v.name}</strong>
              <span class="vehicle-sub">${v.yearColor}</span>
            </div>
          </div>
        </td>
        <td><strong>${v.plate}</strong></td>
        <td>${v.type}</td>
        <td><span class="price-text">${formatVND(v.price)}</span></td>
        <td>1 ảnh toàn diện</td>
        <td><span class="badge badge-${v.status}">${statusLabelMap[v.status]}</span></td>
        <td>
          <div class="action-btns">
            <button type="button" class="btn-table btn-preview-modal" data-id="${v.id}">Xem ảnh</button>
            <button type="button" class="btn-table btn-toggle-status ${
              v.status === "maintenance" ? "btn-success-text" : "btn-danger-text"
            }" data-id="${v.id}">
              ${v.status === "maintenance" ? "Mở" : "Khóa"}
            </button>
          </div>
        </td>
      </tr>`
    )
    .join("");

  // Sự kiện xem ảnh xe
  tbody.querySelectorAll(".btn-preview-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const vehicle = storeVehicles.find((item) => item.id === Number(btn.dataset.id));
      if (!vehicle) return;
      document.getElementById("modalPlate").textContent = `${vehicle.plate} • ${vehicle.type} • ${formatVND(vehicle.price)}/ngày`;
      document.getElementById("modalTitle").textContent = vehicle.name;
      document.getElementById("modalDesc").textContent = vehicle.desc;
      document.getElementById("modalGallery").innerHTML = vehicle.photos
        .map((src) => `<img src="${src}" alt="${vehicle.name}" />`)
        .join("");
      document.getElementById("previewModal").hidden = false;
    });
  });

  // Sự kiện khóa / mở bảo dưỡng nhanh
  tbody.querySelectorAll(".btn-toggle-status").forEach((btn) => {
    btn.addEventListener("click", () => {
      const vehicle = storeVehicles.find((item) => item.id === Number(btn.dataset.id));
      if (!vehicle) return;
      if (vehicle.status === "rented") {
        showToast("Xe đang có khách thuê, không thể khóa lúc này!");
        return;
      }
      vehicle.status = vehicle.status === "maintenance" ? "available" : "maintenance";
      updateKPIs();
      renderVehicleTable();
      showToast(`Đã cập nhật trạng thái xe ${vehicle.plate}: ${statusLabelMap[vehicle.status]}`);
    });
  });
};

// Đóng Modal
document.getElementById("closeModalBtn").addEventListener("click", () => {
  document.getElementById("previewModal").hidden = true;
});
document.getElementById("previewModal").addEventListener("click", (e) => {
  if (e.target.id === "previewModal") document.getElementById("previewModal").hidden = true;
});

// Submit form thêm xe mới
document.getElementById("vehicleForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!requiredPhotos.overview) {
    showToast("Vui lòng tải lên ảnh toàn diện của xe!");
    return;
  }

  const newId = Date.now();
  const newVehicle = {
    id: newId,
    name: document.getElementById("vehicleName").value.trim(),
    yearColor: document.getElementById("yearColor").value.trim(),
    plate: document.getElementById("licensePlate").value.trim().toUpperCase(),
    type: document.getElementById("vehicleType").value,
    price: Number(document.getElementById("dailyPrice").value),
    status: document.getElementById("listingStatus").value,
    desc: document.getElementById("vehicleDesc").value.trim(),
    photos: [requiredPhotos.overview]
  };

  storeVehicles.unshift(newVehicle);
  newestVehicleId = newId;

  e.target.reset();
  document.querySelectorAll(".upload-item").forEach((item) => item._clearPreview());

  updateKPIs();
  renderVehicleTable();
  if (document.documentElement.classList.contains("modal-mode")) {
    setTimeout(() => window.parent.postMessage({ vrp: "closeAddVehicleModal" }, "*"), 1200);
  } else {
    switchTab("vehicle-list");
  }
  showToast(`Đã đăng xe ${newVehicle.name} (${newVehicle.plate}) lên cửa hàng!`);
});

document.getElementById("searchInput").addEventListener("input", renderVehicleTable);
document.getElementById("typeFilter").addEventListener("change", renderVehicleTable);
document.getElementById("statusFilter").addEventListener("change", renderVehicleTable);

// Khởi tạo
updateKPIs();
renderVehicleTable();
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
    var PAGE = "fleet-management.html";

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
