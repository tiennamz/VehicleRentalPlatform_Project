// Cấu hình menu điều hướng theo từng vai trò
const ROLE_CONFIG = {
  customer: {
    name: "Khách thuê",
    avatar: "TD",
    badge: "Khách ▾",
    heading: "KHÁCH THUÊ • ĐIỀU HƯỚNG CHUNG",
    menus: [
      { icon: "🏠", label: "Trang chủ / Tìm kiếm xe" },
      { icon: "📋", label: "Đơn thuê của tôi" },
      { icon: "💬", label: "Tin nhắn với cửa hàng" },
      { icon: "👤", label: "Hồ sơ & Giấy tờ cá nhân" }
    ]
  },
  owner: {
    name: "Chủ cửa hàng",
    avatar: "VD",
    badge: "Chủ xe ▾",
    heading: "CHỦ CỬA HÀNG • QUẢN LÝ KINH DOANH",
    menus: [
      { icon: "📊", label: "Tổng quan (Dashboard)" },
      { icon: "🛵", label: "Quản lý kho xe & Mức cọc" },
      { icon: "📅", label: "Lịch nhận & trả xe tuần" },
      { icon: "👥", label: "Phân quyền nhân viên cửa hàng" }
    ]
  },
  staff: {
    name: "Nhân viên cửa hàng",
    avatar: "NV",
    badge: "Staff ▾",
    heading: "NHÂN VIÊN • NGHIỆP VỤ TẠI QUẦY",
    menus: [
      { icon: "📋", label: "Xác nhận đơn & Giao xe" },
      { icon: "📝", label: "Lập biên bản bàn giao & Ảnh" },
      { icon: "🔄", label: "Xử lý nhận lại xe / Tất toán" },
      { icon: "💬", label: "Chat hỗ trợ khách hàng" }
    ]
  },
  ops: {
    name: "Vận hành viên",
    avatar: "VH",
    badge: "Ops ▾",
    heading: "VẬN HÀNH • GIÁM SÁT & HỖ TRỢ",
    menus: [
      { icon: "👁️", label: "Giám sát đơn hàng toàn hệ thống" },
      { icon: "⚠️", label: "Xử lý sự cố No-show / Khiếu nại" },
      { icon: "💳", label: "Kiểm tra giao dịch cọc & Hoàn tiền" },
      { icon: "📞", label: "Hỗ trợ trực tuyến đa kênh" }
    ]
  },
  admin: {
    name: "Quản trị hệ thống",
    avatar: "AD",
    badge: "Admin ▾",
    heading: "ADMIN • QUẢN TRỊ HỆ THỐNG",
    menus: [
      { icon: "🛡️", label: "Duyệt hồ sơ gian hàng đối tác" },
      { icon: "👥", label: "Quản lý tài khoản & Phân quyền" },
      { icon: "📈", label: "Thống kê & Báo cáo doanh thu" },
      { icon: "⚙️", label: "Cấu hình tham số hệ thống" }
    ]
  }
};

const userAvatar = document.getElementById("userAvatar");
const userRoleLabel = document.getElementById("userRoleLabel");
const menuHeading = document.getElementById("menuHeading");
const menuList = document.getElementById("menuList");
const contentRoleBadge = document.getElementById("contentRoleBadge");
const pageTitle = document.getElementById("pageTitle");
const pageDesc = document.getElementById("pageDesc");
const roleToggleBtn = document.getElementById("roleToggleBtn");
const roleDropdown = document.getElementById("roleDropdown");

// Hàm render nội dung trang khi chọn menu
const selectMenuItem = (roleName, menuLabel, activeBtn) => {
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.classList.remove("active");
  });
  activeBtn.classList.add("active");

  pageTitle.textContent = menuLabel;
  pageDesc.textContent = `Đang hiển thị chức năng "${menuLabel}" dành cho vai trò ${roleName}.`;
};

// Hàm render giao diện theo vai trò
const renderRole = (roleKey) => {
  const config = ROLE_CONFIG[roleKey];
  if (!config) return;

  userAvatar.textContent = config.avatar;
  userRoleLabel.textContent = config.badge;
  menuHeading.textContent = config.heading;
  contentRoleBadge.textContent = config.name;

  menuList.innerHTML = "";

  config.menus.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `menu-item ${index === 0 ? "active" : ""}`;
    btn.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;

    btn.addEventListener("click", () => {
      selectMenuItem(config.name, item.label, btn);
    });

    menuList.appendChild(btn);
  });

  // Mặc định chọn mục đầu tiên
  pageTitle.textContent = config.menus[0].label;
  pageDesc.textContent = `Đang hiển thị chức năng "${config.menus[0].label}" dành cho vai trò ${config.name}.`;
};

// Bật/tắt dropdown chọn vai trò
roleToggleBtn.addEventListener("click", () => {
  roleDropdown.hidden = !roleDropdown.hidden;
});

// Chọn vai trò từ dropdown
roleDropdown.querySelectorAll("li").forEach((item) => {
  item.addEventListener("click", () => {
    const selectedRole = item.dataset.role;
    renderRole(selectedRole);
    roleDropdown.hidden = true;
  });
});

// Đóng dropdown khi bấm ra ngoài
document.addEventListener("click", (e) => {
  if (!e.target.closest(".role-switcher")) {
    roleDropdown.hidden = true;
  }
});

// Khởi tạo mặc định với vai trò Khách thuê
renderRole("customer");