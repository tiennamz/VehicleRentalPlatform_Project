(function () {
  var PAGE = "pages/user-info.html";
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

// --- Dữ liệu xe yêu thích mẫu ---
let carsData = {
    'xe-may': [
        {
            id: 1,
            name: 'HONDA VISION 2024',
            transmission: 'Xe tay ga',
            seats: '2 chỗ',
            fuel: 'Xăng',
            rating: 5.0,
            trips: 1,
            location: 'Khu đô thị Văn Quán, Hà Đông',
            price: '150K',
            period: '/ngày',
            owner: 'Hoàng Long',
            ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
            image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=600',
            tags: ['Miễn thế chấp']
        },
        {
            id: 2,
            name: 'YAMAHA JANUS 2023',
            transmission: 'Xe tay ga',
            seats: '2 chỗ',
            fuel: 'Xăng',
            rating: 4.9,
            trips: 12,
            location: 'Mỹ Đình, Nam Từ Liêm',
            price: '130K',
            period: '/ngày',
            owner: 'Minh Thư',
            ownerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
            image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=600',
            tags: ['Miễn thế chấp', 'Giao xe tận nơi']
        }
    ],
    'o-to': [
        {
            id: 3,
            name: 'HYUNDAI SANTAFE 2024',
            transmission: 'Số tự động',
            seats: '7 chỗ',
            fuel: 'Dầu',
            rating: 5.0,
            trips: 40,
            location: 'Phố Huế, Hoàn Kiếm, Hà Nội',
            price: '1.350K',
            period: '/ngày',
            owner: 'Đức Mạnh',
            ownerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
            image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600',
            tags: ['Có tài xế chuyên nghiệp']
        }
    ]
};

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
                <button onclick="removeCar('${currentTab}', ${car.id})" class="card-heart-btn" title="Bỏ thích">
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
                <button onclick="removeCar('${currentTab}', ${car.id})" class="btn-action btn-remove">Bỏ thích</button>
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
    carsData[tab] = carsData[tab].filter(car => car.id !== id);
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


// Hiển thị ảnh CCCD vừa chọn (mặt trước/mặt sau)
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

// Xoá ảnh CCCD đã chọn
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
    renderCars();
    initNavigationEvents();
    updateOrderCounts();

    // Tự động mở Đơn thuê của tôi khi chuyển từ thanh toán sang
    if (sessionStorage.getItem('openProfileTab') === 'orders') {
        sessionStorage.removeItem('openProfileTab');
        const ordersSidebarItem = document.querySelector('[data-name="Đơn thuê của tôi"]');
        document.querySelectorAll('.sidebar-item').forEach(si => si.classList.remove('active'));
        if (ordersSidebarItem) ordersSidebarItem.classList.add('active');
        switchAccountView("Đơn thuê của tôi");
        return;
    }
    try{
      var _q = window.__VRP_QUERY__ || location.search || '';
      if(_q && _q.charAt(0)!=='?') _q='?'+_q;
      var _v = new URLSearchParams(_q).get('view');
      if(!_v){ var _h=location.hash||''; var _qi=_h.indexOf('?'); if(_qi>=0) _v=new URLSearchParams(_h.slice(_qi)).get('view'); }
      if(!_v){ try{ var _ph=(window.parent&&window.parent.location&&window.parent.location.hash)||''; var _pi=_ph.indexOf('?'); if(_pi>=0) _v=new URLSearchParams(_ph.slice(_pi)).get('view'); }catch(e){} }
      if(_v==='profile'){
        document.querySelectorAll('.sidebar-item[data-name]').forEach(function(b){b.classList.remove('active');});
        document.querySelectorAll('.sidebar-item[data-name="Hồ sơ của tôi"]').forEach(function(b){b.classList.add('active');});
        var st=document.getElementById('accountSelectText'); if(st) st.innerText='Hồ sơ của tôi';
        if(typeof switchAccountView==='function') switchAccountView('Hồ sơ của tôi');
        ['view-favorites','view-orders','view-reviews','view-blank'].forEach(function(id){var el=document.getElementById(id);if(el) el.style.display='none';});
        var pv=document.getElementById('view-profile'); if(pv) pv.style.display='block';
      }
    }catch(e){}
};



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
    var PAGE = "pages/user-info.html";

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
