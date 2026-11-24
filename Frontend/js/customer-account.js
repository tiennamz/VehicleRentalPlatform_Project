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
  var PAGE = "khach-hang/account.html";
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

// --- Dữ liệu xe yêu thích (dùng chung với trang chủ / danh sách xe) ---
let carsData = {
    'xe-may': [],
    'o-to': []
};

function syncFavorites() {
    const items = window.VRPFavorites ? window.VRPFavorites.list() : [];

    carsData['xe-may'] = items.filter(car => car.category !== 'o-to');
    carsData['o-to'] = items.filter(car => car.category === 'o-to');
}

syncFavorites();

let currentTab = 'xe-may';

// Hàm hiển thị danh sách xe
function renderCars() {
    const container = document.getElementById('cars-container');
    const countXeMay = document.getElementById('count-xe-may');
    const countOTo = document.getElementById('count-o-to');

    if (countXeMay && carsData['xe-may']) countXeMay.innerText = carsData['xe-may'].length;
    if (countOTo && carsData['o-to']) countOTo.innerText = carsData['o-to'].length;

    if (!container) return;

    const items = carsData[currentTab] || [];

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <p>Chưa có chiếc xe nào trong danh sách yêu thích này.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(car => `
        <div class="car-card">
            <div class="car-image-box">
                <img src="${car.image}" alt="${car.name}">
                <div class="car-tags">
                    ${car.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <button onclick="removeCar('${currentTab}', '${car.id}')" class="card-heart-btn" title="Bỏ thích">
                    <i class="fa-solid fa-heart"></i>
                </button>
            </div>

            <div class="car-details">
                <div>
                    <h3 class="car-title">${car.name}</h3>
                    <div class="car-specs">
                        <span><i class="fa-solid fa-gear"></i> ${car.transmission}</span>
                        <span><i class="fa-solid fa-user-group"></i> ${car.seats}</span>
                        <span><i class="fa-solid fa-gas-pump"></i> ${car.fuel}</span>
                    </div>
                    <div class="car-rating">
                        <i class="fa-solid fa-star"></i> ${car.rating} <span>(${car.trips} chuyến)</span>
                    </div>
                    <div class="car-location">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${car.location}</span>
                    </div>
                </div>

                <div class="car-footer">
                    <div class="owner-info">
                        <img src="${car.ownerAvatar}" alt="${car.owner}" class="owner-avatar">
                        <span class="owner-name-text">${car.owner}</span>
                    </div>
                    <div class="car-price">
                        <span class="price-num">${car.price}</span>
                        <span class="price-unit">${car.period}</span>
                    </div>
                </div>
            </div>

            <div class="car-actions">
                <button onclick="removeCar('${currentTab}', '${car.id}')" class="btn-action btn-remove">Bỏ thích</button>
                <button class="btn-action btn-detail">Xem chi tiết</button>
            </div>
        </div>
    `).join('');
}

// Chuyển đổi tab
function switchTab(tab) {
    currentTab = tab;

    const tabTuLai = document.getElementById('tab-xe-may');
    const tabCoTaiXe = document.getElementById('tab-o-to');

    if (tab === 'xe-may') {
        if (tabTuLai) tabTuLai.classList.add('active');
        if (tabCoTaiXe) tabCoTaiXe.classList.remove('active');
    } else {
        if (tabCoTaiXe) tabCoTaiXe.classList.add('active');
        if (tabTuLai) tabTuLai.classList.remove('active');
    }

    renderCars();
}

// Xóa xe khỏi danh sách
function removeCar(tab, id) {
    if (window.VRPFavorites) {
        window.VRPFavorites.remove(id);
    }

    syncFavorites();
    renderCars();
}

// Hàm thông báo đã được tắt theo yêu cầu
function showToast() { }


// --- Quản lý hiển thị các View trong Tài khoản của tôi ---

// Ẩn tất cả các view chức năng
function hideAllAccountViews() {
    const viewIds = ['view-blank', 'view-profile', 'view-orders', 'view-favorites', 'view-reviews'];

    viewIds.forEach(id => {
        const el = document.getElementById(id);

        if (el) {
            el.style.display = 'none';
        }
    });
}

// Hiển thị khoảng trắng của tài khoản
function showBlankAccountView() {
    hideAllAccountViews();

    const blankView = document.getElementById('view-blank');

    if (blankView) {
        blankView.style.display = 'flex';
    }

    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => item.classList.remove('active'));

    const selectText = document.getElementById('accountSelectText');

    if (selectText) {
        selectText.innerText = 'Tài khoản của tôi';
    }

    closeAccountDropdown();
    closeNavPopup();

    const accountSidebar = document.getElementById('accountSidebar');

    if (window.innerWidth <= 1024 && accountSidebar) {
        accountSidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Chuyển đổi và hiển thị chức năng tài khoản
function switchAccountView(itemName) {
    hideAllAccountViews();

    let targetViewId = 'view-favorites';
    let titleName = 'Danh sách của tôi';

    if (itemName === 'Hồ sơ của tôi') {
        targetViewId = 'view-profile';
        titleName = 'Hồ sơ của tôi';
    } else if (itemName === 'Đơn thuê của tôi') {
        targetViewId = 'view-orders';
        titleName = 'Đơn thuê của tôi';
    } else if (itemName === 'Danh sách của tôi' || itemName === 'Danh sách yêu thích') {
        targetViewId = 'view-favorites';
        titleName = 'Danh sách của tôi';
        renderCars();
    } else if (itemName === 'Đánh giá của tôi') {
        targetViewId = 'view-reviews';
        titleName = 'Đánh giá của tôi';
    }

    const targetEl = document.getElementById(targetViewId);

    if (targetEl) {
        targetEl.style.display = 'block';
    }

    const selectText = document.getElementById('accountSelectText');

    if (selectText) {
        selectText.innerText = titleName;
    }

    closeAccountDropdown();
}

// Lưu thông tin hồ sơ
function saveProfile(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('profileNameInput');

    if (nameInput && nameInput.value.trim()) {
        const newName = nameInput.value.trim();

        document.querySelectorAll('.user-name, .popup-name').forEach(el => {
            el.innerText = newName;
        });
    }
}


// Hiển thị ảnh giấy tờ vừa chọn (GPLX, CCCD mặt trước/sau)
function previewDoc(event, key) {
    const file = event.target.files && event.target.files[0];

    if (!file) return;

    if (!file.type || file.type.indexOf('image/') !== 0) {
        alert('Vui lòng chọn file ảnh JPG hoặc PNG.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = document.getElementById(key + 'PreviewImg');
        const wrap = document.getElementById(key + 'Preview');
        const name = document.getElementById(key + 'FileName');

        if (img) img.src = e.target.result;
        if (name) name.textContent = file.name;
        if (wrap) wrap.hidden = false;
    };

    reader.readAsDataURL(file);
}

// Xoá ảnh giấy tờ đã chọn
function removeDoc(key) {
    const input = document.getElementById(key + 'FileInput');
    const wrap = document.getElementById(key + 'Preview');
    const img = document.getElementById(key + 'PreviewImg');

    if (input) input.value = '';
    if (img) img.removeAttribute('src');
    if (wrap) wrap.hidden = true;
}


// --- Quản lý đơn thuê của tôi ---

let currentOrderFilter = 'all';
let selectedOrderCard = null;

// Bộ lọc đơn thuê xe
function filterOrders(status, btn) {
    currentOrderFilter = status;

    const tabs = document.querySelectorAll('.order-tabs .tab-btn');
    tabs.forEach(t => t.classList.remove('active'));

    if (btn) {
        btn.classList.add('active');
    }

    const orders = document.querySelectorAll('.order-list .order-card');

    orders.forEach(card => {
        if (status === 'all' || card.dataset.status === status) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });

    if (window.VRPDataState) {
        window.VRPDataState.refresh(document.querySelector('#view-orders .order-list'));
    }
}

// Cập nhật số lượng đơn trên các tab
function updateOrderCounts() {
    const orders = document.querySelectorAll('.order-list .order-card');
    const tabs = document.querySelectorAll('.order-tabs .tab-btn');

    const counts = {
        all: orders.length,
        pending: 0,
        confirmed: 0,
        renting: 0,
        completed: 0,
        cancelled: 0
    };

    orders.forEach(card => {
        const status = card.dataset.status;

        if (counts[status] !== undefined) {
            counts[status]++;
        }
    });

    const labels = [
        `Tất cả (${counts.all})`,
        `Chờ xác nhận (${counts.pending})`,
        `Đã xác nhận (${counts.confirmed})`,
        `Đang thuê (${counts.renting})`,
        `Đã hoàn thành (${counts.completed})`,
        `Đã hủy (${counts.cancelled})`
    ];

    tabs.forEach((tab, index) => {
        if (labels[index]) {
            tab.innerText = labels[index];
        }
    });
}

// Hiển thị chi tiết đơn thuê
function showOrderDetail(button) {
    const orderCard = button.closest('.order-card');

    if (!orderCard) return;

    const carName = orderCard.querySelector('.order-car-title').innerText;
    const orderInfo = orderCard.querySelectorAll('.order-meta');
    const orderStatus = orderCard.querySelector('.order-badge').innerText;
    const total = orderCard.querySelector('.order-total-price').innerText;

    document.getElementById('detailCarName').innerText = carName;
    document.getElementById('detailOrderCode').innerText = orderInfo[0].innerText.replace('Mã đơn: ', '');
    document.getElementById('detailOrderStatus').innerText = orderStatus;
    document.getElementById('detailOrderDate').innerText = orderInfo[1].innerText.replace('Thời gian: ', '');
    document.getElementById('detailOrderLocation').innerText = orderInfo[2].innerText.replace('Nhận xe: ', '');
    document.getElementById('detailTotal').innerText = total;
    document.getElementById('detailDeposit').innerText = orderInfo[3].innerText.replace('Tiền cọc: ', '');

    document.getElementById('orderDetailModal').style.display = 'flex';
}

// Hiển thị cửa sổ xác nhận hủy đơn
function showCancelOrder(button) {
    selectedOrderCard = button.closest('.order-card');

    if (!selectedOrderCard) return;

    const orderInfo = selectedOrderCard.querySelectorAll('.order-meta');

    const orderCode = orderInfo[0].innerText.replace('Mã đơn: ', '');
    const deposit = orderInfo[3].innerText.replace('Tiền cọc: ', '');

    document.getElementById('cancelOrderCode').innerText = orderCode;
    document.getElementById('cancelOrderDeposit').innerText = deposit;
    document.getElementById('cancelRefundAmount').innerText = deposit;

    document.getElementById('cancelOrderModal').style.display = 'flex';
}

// Xác nhận hủy đơn thuê
function confirmCancelOrder() {
    if (!selectedOrderCard) return;

    selectedOrderCard.dataset.status = 'cancelled';

    const badge = selectedOrderCard.querySelector('.order-badge');
    badge.className = 'order-badge cancelled';
    badge.innerText = 'Đã hủy';

    const cancelButton = selectedOrderCard.querySelector('.btn-cancel');

    if (cancelButton) {
        cancelButton.remove();
    }

    updateOrderCounts();

    const tabs = document.querySelectorAll('.order-tabs .tab-btn');

    const tabIndexes = {
        all: 0,
        pending: 1,
        confirmed: 2,
        renting: 3,
        completed: 4,
        cancelled: 5
    };

    filterOrders(currentOrderFilter, tabs[tabIndexes[currentOrderFilter]]);

    closeOrderModal();

    selectedOrderCard = null;

}

// Đóng khung chi tiết hoặc hủy đơn
function closeOrderModal() {
    document.getElementById('orderDetailModal').style.display = 'none';
    document.getElementById('cancelOrderModal').style.display = 'none';

    selectedOrderCard = null;
}


// --- Quản lý Popup Menu Mobile / iPad ---

function openNavPopup() {
    const popup = document.getElementById('navPopup');
    const overlay = document.getElementById('navPopupOverlay');

    if (popup && overlay) {
        popup.classList.add('show');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeNavPopup() {
    const popup = document.getElementById('navPopup');
    const overlay = document.getElementById('navPopupOverlay');

    if (popup && overlay) {
        popup.classList.remove('show');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}


// --- Quản lý Ô nhỏ chọn Tài khoản của tôi ---

function toggleAccountDropdown(event) {
    if (event) event.stopPropagation();

    const sidebar = document.getElementById('accountSidebar');
    const btn = document.getElementById('accountSelectBtn');

    if (sidebar) {
        const isOpen = sidebar.classList.toggle('open');

        if (btn) {
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    }
}

function closeAccountDropdown() {
    const sidebar = document.getElementById('accountSidebar');
    const btn = document.getElementById('accountSelectBtn');

    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');

        if (btn) {
            btn.setAttribute('aria-expanded', 'false');
        }
    }
}


// Bấm vào avatar (desktop/mobile) → mở ngay phần Hồ sơ của tôi
function showProfileFromAvatar() {
    if (typeof switchAccountView === 'function') {
        switchAccountView('Hồ sơ của tôi');
    }
    document.querySelectorAll('.sidebar-item[data-name]').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.sidebar-item[data-name="Hồ sơ của tôi"]').forEach(function (b) { b.classList.add('active'); });
    var profileView = document.getElementById('view-profile');
    if (profileView) profileView.style.display = 'block';
    if (typeof closeNavPopup === 'function') closeNavPopup();
}
// Khởi tạo các sự kiện điều hướng & dropdown
function initNavigationEvents() {
    const userProfileBtn = document.getElementById('userProfileBtn');

    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', showProfileFromAvatar);
    }

    const popupUserProfileBtn = document.getElementById('popupUserProfileBtn');

    if (popupUserProfileBtn) {
        popupUserProfileBtn.addEventListener('click', showProfileFromAvatar);
    }

    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', openNavPopup);
    }

    const popupCloseBtn = document.getElementById('popupCloseBtn');

    if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', closeNavPopup);
    }

    const navPopupOverlay = document.getElementById('navPopupOverlay');

    if (navPopupOverlay) {
        navPopupOverlay.addEventListener('click', closeNavPopup);
    }

    const accountSelectBtn = document.getElementById('accountSelectBtn');

    if (accountSelectBtn) {
        accountSelectBtn.addEventListener('click', toggleAccountDropdown);

        accountSelectBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleAccountDropdown(e);
            }
        });
    }

    const sidebarItems = document.querySelectorAll('.sidebar-item');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            const itemName = this.getAttribute('data-name') || this.innerText.trim();

            sidebarItems.forEach(si => si.classList.remove('active'));
            this.classList.add('active');

            switchAccountView(itemName);
        });
    });

    const desktopNavLinks = document.querySelectorAll('.nav-list li a');

    desktopNavLinks.forEach(link => {
        link.addEventListener('click', function () {
            desktopNavLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });


    document.addEventListener('click', function (e) {
        const sidebar = document.getElementById('accountSidebar');

        if (sidebar && !sidebar.contains(e.target)) {
            closeAccountDropdown();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeNavPopup();
            closeAccountDropdown();
            closeOrderModal();
        }
    });
}


// --- Khởi chạy khi tải trang ---

window.onload = function () {
    syncFavorites();
    renderCars();
    initNavigationEvents();
    updateOrderCounts();

    // Tự động mở Đơn thuê của tôi khi chuyển từ thanh toán sang
    if (sessionStorage.getItem("openMyOrders") === "true") {
        sessionStorage.removeItem("openMyOrders");

        const orderMenuItem = document.querySelector(
            '.sidebar-item[data-name="Đơn thuê của tôi"]'
        );

        if (orderMenuItem) {
            document.querySelectorAll(".sidebar-item").forEach(function (item) {
                item.classList.remove("active");
            });

            orderMenuItem.classList.add("active");
        }

        switchAccountView("Đơn thuê của tôi");
    }
};

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
  if (canStore && navList && !navList.querySelector('a[href*="store/"]')) {
    const homeLink = navList.querySelector('a[href$="index.html"]');
    const prefix = homeLink ? homeLink.getAttribute("href").replace(/index\.html$/, "") : "";
    const li = document.createElement("li");
    li.innerHTML = '<a href="' + prefix + 'store/dashboard.html">Cửa hàng</a>';
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
    var PAGE = "khach-hang/account.html";

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
