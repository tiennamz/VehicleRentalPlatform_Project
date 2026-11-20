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