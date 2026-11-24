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
  var PAGE = "khach-hang/payment.html";
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

// Dữ liệu xe được chọn từ trang chủ
let depositAmount = 200000;
let remainingSeconds = 30 * 60;

const vehicleName = sessionStorage.getItem("selectedVehicleName");
const vehicleType = sessionStorage.getItem("selectedVehicleType");
const vehicleRating = sessionStorage.getItem("selectedVehicleRating");
const vehicleSpecs = sessionStorage.getItem("selectedVehicleSpecs");
const vehiclePrice = sessionStorage.getItem("selectedVehiclePrice");
const vehicleImage = sessionStorage.getItem("selectedVehicleImage");

// Cập nhật thông tin xe trên trang thanh toán
if (vehicleName) {
    document.querySelector(".vehicle-details h3").textContent = vehicleName;
}

if (vehicleType) {
    document.querySelector(".vehicle-category").textContent = vehicleType;
}

if (vehicleImage) {
    document.querySelector(".vehicle-summary img").src = vehicleImage;
}

if (vehicleRating) {
    const ratingParts = vehicleRating.match(/([\d.]+)\s*\((\d+)\)/);

    if (ratingParts) {
        document.getElementById("vehicleRatingValue").textContent = ratingParts[1];
        document.getElementById("vehicleTripCount").textContent = "(" + ratingParts[2] + " chuyến)";
    }
}

if (vehicleSpecs) {
    const locationElement = document.getElementById("vehicleLocation");
    const locationText = vehicleSpecs.split("·").pop().trim();

    locationElement.innerHTML =
        '<i class="fa-solid fa-location-dot"></i> ' + locationText;
}

function formatMoney(amount) {
    return amount.toLocaleString("vi-VN") + "đ";
}

// Tính tiền thuê và tiền cọc theo xe được chọn
const rentalDays = 2;
const deliveryFeeValue = 30000;
let totalValue = 330000;

if (vehiclePrice) {
    const dailyPrice = parseInt(vehiclePrice.replace(/\D/g, ""));
    const rentalTotalValue = dailyPrice * rentalDays;
    totalValue = rentalTotalValue + deliveryFeeValue;

    depositAmount = Math.min(
        Math.max(totalValue * 0.3, 200000),
        1000000
    );

    const remainingValue = totalValue - depositAmount;

    document.getElementById("rentalTotal").textContent = formatMoney(rentalTotalValue);
    document.getElementById("deliveryFee").textContent = formatMoney(deliveryFeeValue);
    document.getElementById("depositAmount").textContent = formatMoney(depositAmount);
    document.getElementById("remainingAmount").textContent = formatMoney(remainingValue);
    document.getElementById("totalAmount").textContent = formatMoney(totalValue);
    document.getElementById("payAmount").textContent = formatMoney(depositAmount);
}

const countdown = document.getElementById("countdown");
const payButton = document.getElementById("payButton");
const successButton = document.getElementById("successButton");
const failButton = document.getElementById("failButton");
const resultOverlay = document.getElementById("resultOverlay");
const resultIcon = document.getElementById("resultIcon");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultLabel = document.getElementById("resultLabel");
const receiptStatus = document.getElementById("receiptStatus");
const receiptAmount = document.getElementById("receiptAmount");
const receiptOrderCode = document.getElementById("receiptOrderCode");
const modalMainButton = document.getElementById("modalMainButton");
const viewReceiptButton = document.getElementById("viewReceiptButton");
const successActions = document.getElementById("successActions");
const retryButton = document.getElementById("retryButton");
const receiptNote = document.getElementById("receiptNote");

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;

    return String(minutes).padStart(2, "0") + ":" + String(remain).padStart(2, "0");
}

// Mô phỏng thời gian giữ chỗ 30 phút theo FR-17
const timer = setInterval(function () {
    if (remainingSeconds > 0) {
        remainingSeconds--;
        countdown.textContent = formatTime(remainingSeconds);
    } else {
        countdown.textContent = "00:00";
        countdown.parentElement.style.color = "#c2413b";
        clearInterval(timer);
    }
}, 1000);

// Dữ liệu giao dịch
let orderCode = "";
let transactionCode = "";

let transactionStatus = "";
let transactionDate = "";
let transactionMethod = "Cổng thanh toán nội địa";

function openResult(status) {
    resultOverlay.classList.add("show");
    transactionStatus = status;

    successActions.style.display = "none";
    retryButton.classList.remove("show");
    receiptAmount.textContent = "0đ";

    if (status === "success") {
        orderCode = "VRP-" + Date.now();
        transactionCode = "TXN-" + Date.now();
        resultIcon.classList.remove("failed");
        resultIcon.innerHTML = '<i class="fa-solid fa-check"></i>';

        resultTitle.textContent = "Thanh toán thành công!";
        resultMessage.textContent = "VRP-Go đã ghi nhận khoản tiền cọc của bạn.";
        resultLabel.textContent = "GIAO DỊCH THÀNH CÔNG";

        receiptStatus.textContent = "Đã thanh toán cọc";
        receiptAmount.textContent = formatMoney(window.__vrpDepositAmount || depositAmount);
        receiptOrderCode.textContent = orderCode;

        const now = new Date();

        transactionDate = now.toLocaleDateString("vi-VN") + " · " +
            now.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });


        successActions.style.display = "flex";
        receiptNote.textContent = "Giao dịch đã thành công. Bạn có thể xem và in biên nhận điện tử.";
        var sum = document.getElementById('receiptSummary');
        var label = window.__vrpScheduleLabel || '';
        try { label = label || sessionStorage.getItem('vrpScheduleLabel') || ''; } catch(e) {}
        if (sum && label) {
            var row = sum.querySelector('[data-vrp-schedule]');
            if (!row) {
                row = document.createElement('div');
                row.setAttribute('data-vrp-schedule','1');
                row.innerHTML = '<span>Lịch tuần đã chọn</span><strong></strong>';
                sum.appendChild(row);
            }
            row.querySelector('strong').textContent = label;
        }
    } else if (status === "pending") {
        resultIcon.classList.remove("failed");
        resultIcon.innerHTML = '<i class="fa-solid fa-clock"></i>';

        resultTitle.textContent = "Giao dịch đang xử lý";
        resultMessage.textContent = "Chúng tôi chưa nhận được kết quả cuối cùng. Vui lòng kiểm tra lại sau.";
        resultLabel.textContent = "ĐANG CHỜ KẾT QUẢ";

        receiptStatus.textContent = "Đang xử lý";
        receiptNote.textContent = "Chưa thể tạo biên nhận khi giao dịch chưa có kết quả cuối cùng.";
    } else {
        resultIcon.classList.add("failed");
        resultIcon.innerHTML = '<i class="fa-solid fa-xmark"></i>';

        resultTitle.textContent = "Thanh toán thất bại";
        resultMessage.textContent = "Giao dịch không được ghi nhận. Bạn có thể thử thanh toán lại.";
        resultLabel.textContent = "GIAO DỊCH THẤT BẠI";

        receiptStatus.textContent = "Thất bại";
        receiptNote.textContent = "Giao dịch thất bại không làm mất thời gian giữ chỗ còn lại theo FR-23.";

        retryButton.classList.add("show");
    }
}

// Nút thanh toán chính: phải có lịch tuần đã chọn mới xác nhận được
payButton.addEventListener("click", function () {
    var label = window.__vrpScheduleLabel || '';
    try { label = label || sessionStorage.getItem('vrpScheduleLabel') || sessionStorage.getItem('selectedVehicleDate') || ''; } catch(e) {}
    if (!label) {
        openResult("failed");
        resultTitle.textContent = "Chưa có lịch thuê";
        resultMessage.textContent = "Bạn cần chọn lịch tuần trước khi thanh toán đặt cọc.";
        resultLabel.textContent = "THIẾU THÔNG TIN";
        receiptStatus.textContent = "Chưa xác nhận";
        receiptNote.textContent = "Vui lòng quay lại trang Thuê xe / Lịch tuần để chọn khung giờ.";
        return;
    }
    payButton.disabled = true;
    payButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    setTimeout(function () {
        payButton.disabled = false;
        var dep = window.__vrpDepositAmount || depositAmount;
        payButton.innerHTML = '<i class="fa-solid fa-lock"></i> Thanh toán ' + formatMoney(dep);
        depositAmount = dep;
        openResult("success");
    }, 700);
});

// Giả lập thanh toán thành công
successButton.addEventListener("click", function () {
    openResult("success");
});

// Giả lập thanh toán thất bại
failButton.addEventListener("click", function () {
    openResult("failed");
});

// Thử thanh toán lại
retryButton.addEventListener("click", function () {
    resultOverlay.classList.remove("show");
    payButton.focus();
});

// Nút xem biên nhận
viewReceiptButton.addEventListener("click", function () {
    if (transactionStatus !== "success") {
        return;
    }

    sessionStorage.setItem("receiptData", JSON.stringify({
        orderCode: orderCode,
        transactionCode: transactionCode,
        amount: totalValue,
        depositAmount: depositAmount,
        vehicleName: vehicleName || "Chưa xác định",
        date: transactionDate,
        method: transactionMethod,
        type: "Thanh toán tiền cọc",
        status: "Thành công"
    }));

    if (window.__vrpGo) { window.__vrpGo("receipt.html"); } else { window.location.href = "receipt.html"; }
});

// Nút xem đơn thuê của tôi
modalMainButton.addEventListener("click", function () {
    if (transactionStatus !== "success") {
        return;
    }

    sessionStorage.setItem("openMyOrders", "true");
    if (window.__vrpGo) { window.__vrpGo("account.html"); } else { window.location.href = "account.html"; }
});

// Đóng popup bằng nút X
document.getElementById("modalClose").addEventListener("click", function () {
    resultOverlay.classList.remove("show");
});

// Đóng popup khi bấm ra ngoài
resultOverlay.addEventListener("click", function (event) {
    if (event.target === resultOverlay) {
        resultOverlay.classList.remove("show");
    }
});

// Menu 3 gạch trên điện thoại
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navPopup = document.getElementById("navPopup");
const navPopupOverlay = document.getElementById("navPopupOverlay");
const popupCloseBtn = document.getElementById("popupCloseBtn");

function openNavPopup() {
    navPopup.classList.add("show");
    navPopupOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeNavPopup() {
    navPopup.classList.remove("show");
    navPopupOverlay.classList.remove("show");
    document.body.style.overflow = "";
}

hamburgerBtn.addEventListener("click", openNavPopup);
popupCloseBtn.addEventListener("click", closeNavPopup);
navPopupOverlay.addEventListener("click", closeNavPopup);

// Đóng popup bằng phím Escape
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeNavPopup();
        resultOverlay.classList.remove("show");
    }
});

(function () {
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function fmtMoney(n){ return Math.round(n).toLocaleString('vi-VN') + 'đ'; }
  function applySchedule() {
    var name='',type='',specs='',price='',image='',date='',hour='',end='',label='',rating='';
    try {
      name=sessionStorage.getItem('selectedVehicleName')||'';
      type=sessionStorage.getItem('selectedVehicleType')||'';
      specs=sessionStorage.getItem('selectedVehicleSpecs')||'';
      price=sessionStorage.getItem('selectedVehiclePrice')||'';
      image=sessionStorage.getItem('selectedVehicleImage')||'';
      rating=sessionStorage.getItem('selectedVehicleRating')||'';
      date=sessionStorage.getItem('selectedVehicleDate')||'';
      hour=sessionStorage.getItem('selectedVehicleHour')||'';
      end=sessionStorage.getItem('selectedVehicleEnd')||'';
      label=sessionStorage.getItem('vrpScheduleLabel')||'';
    } catch(e) {}
    try {
      var href = location.hash || '';
      var q = new URLSearchParams(href.indexOf('?')>=0 ? href.split('?')[1] : '');
      if(q.get('xe')) name=q.get('xe');
      if(q.get('date')) date=q.get('date');
      if(q.get('hour')) hour=q.get('hour');
      if(q.get('end')) end=q.get('end');
    } catch(e) {}

    if(name){ var h3=document.querySelector('.vehicle-details h3'); if(h3) h3.textContent=name; }
    if(type){ var cat=document.querySelector('.vehicle-category'); if(cat) cat.textContent=type; }
    var IMG_MAP2={'Honda Vision 2024':'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=85','Yamaha Exciter 155':'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=700&q=85','Honda SH Mode 125':'https://images.unsplash.com/photo-1622185135505-2d795003994a?auto=format&fit=crop&w=700&q=85','VinFast Feliz S':'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=700&q=85','Honda Winner X':'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=700&q=85','Yamaha Janus 2023':'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=700&q=85','Honda Lead 125':'https://images.unsplash.com/photo-1595691403533-7f4a52a5b4a4?auto=format&fit=crop&w=700&q=85','Honda SH 150i':'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=700&q=85','Honda Air Blade 160':'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=700&q=85'};
    var resolvedImg = image || (name && IMG_MAP2[name]) || '';
    var img=document.getElementById('vehicleImage')||document.querySelector('.vehicle-summary img');
    if(img){ if(resolvedImg) img.src=resolvedImg; img.onerror=function(){this.onerror=null; this.src='https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=85';}; }
    var loc=document.getElementById('vehicleLocation'); if(loc){ var place=(specs||'').split('·').pop().trim(); loc.innerHTML='<i class="fa-solid fa-location-dot"></i> '+(place||'Đà Nẵng'); } var rEl=document.getElementById('vehicleRatingValue'); if(rEl && rating){ var m=String(rating).match(/[\d.]+/); if(m) rEl.textContent=m[0]; }

    
    var PRICE_MAP={'Honda Vision 2024':150000,'Yamaha Exciter 155':220000,'Honda SH Mode 125':180000,'VinFast Feliz S':180000,'Honda Winner X':170000,'Yamaha Janus 2023':160000,'Honda Lead 125':160000,'Honda SH 150i':280000,'Honda Air Blade 160':180000};
    if(!price && name && PRICE_MAP[name]) price=String(PRICE_MAP[name]);
    var IMG_MAP={'Honda Vision 2024':'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=85','Yamaha Exciter 155':'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=700&q=85','Honda SH Mode 125':'https://images.unsplash.com/photo-1622185135505-2d795003994a?auto=format&fit=crop&w=700&q=85','VinFast Feliz S':'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=700&q=85','Honda Winner X':'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=700&q=85','Yamaha Janus 2023':'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=700&q=85','Honda Lead 125':'https://images.unsplash.com/photo-1595691403533-7f4a52a5b4a4?auto=format&fit=crop&w=700&q=85','Honda SH 150i':'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=700&q=85'};
    if(!image && name && IMG_MAP[name]) image=IMG_MAP[name];

    var items=document.querySelectorAll('.booking-info-grid .info-item strong');
    var day=date;
    if(date){ var dd=new Date(date+'T00:00:00'); if(!isNaN(dd.getTime())) day=dd.getDate()+'/'+(dd.getMonth()+1)+'/'+dd.getFullYear(); }
    if(day || hour || end) {
      if(items[0]) items[0].textContent = day ? (day + (hour?' · '+hour:'')) : 'Chưa chọn lịch';
      if(items[1]) items[1].textContent = day ? (day + (end?' · '+end:' · (theo ca đã chọn)')) : 'Chưa chọn lịch';
      if(items[2]) items[2].textContent = label || (hour&&end ? (hour+' – '+end) : 'Theo lịch tuần đã chọn');
    }

    var daily=parseInt(String(price||'').replace(/\D/g,''),10);
    if(!daily || isNaN(daily)) daily=150000;
    var rentalDays=2, delivery=30000;
    var rentalTotal=daily*rentalDays;
    var total=rentalTotal+delivery;
    var deposit=Math.round(Math.min(Math.max(total*0.3,200000),1000000));
    var remain=total-deposit;
    var set=function(id,val){var el=document.getElementById(id); if(el) el.textContent=val;};
    set('rentalTotal',fmtMoney(rentalTotal));
    set('deliveryFee',fmtMoney(delivery));
    set('depositAmount',fmtMoney(deposit));
    set('remainingAmount',fmtMoney(remain));
    set('totalAmount',fmtMoney(total));
    set('payAmount',fmtMoney(deposit));
    var ra=document.getElementById('receiptAmount'); if(ra) ra.textContent=fmtMoney(deposit);

    window.__vrpDepositAmount = deposit;
    window.__vrpTotalValue = total;
    window.__vrpScheduleLabel = label || (day?(day+(hour?' · '+hour:'')+(end?' – '+end:'')):'');
  }
  ready(applySchedule);
  setTimeout(applySchedule, 50);
  setTimeout(applySchedule, 400);
  window.addEventListener('hashchange', applySchedule);
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
    var PAGE = "khach-hang/payment.html";

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
