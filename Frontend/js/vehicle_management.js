// Tạo ảnh SVG placeholder mẫu (mã hóa Base64 để không bị vỡ thuộc tính src của thẻ <img>)
const makeVehicleSVG = (bg, fg, title) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="sans-serif" font-size="20" font-weight="bold">${title}</text></svg>`;
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
};

// Danh sách xe ban đầu của cửa hàng (mỗi xe 1 ảnh toàn diện)
const storeVehicles = [
  {
    id: 1,
    name: "Honda Air Blade 160 ABS",
    yearColor: "Đời 2025 • Đen Nhám",
    plate: "29F1 - 889.26",
    type: "Xe tay ga",
    price: 25000,
    status: "available",
    desc: "Xe mới bảo dưỡng định kỳ, ODO 4.200km. Tặng kèm 02 mũ bảo hiểm + 02 áo mưa.",
    photo: makeVehicleSVG("#d1fae5", "#065f46", "Ảnh toàn diện Honda Air Blade 160")
  },
  {
    id: 2,
    name: "VinFast Klara S2 (2025)",
    yearColor: "Pin LFP • Trắng Ngọc Trai",
    plate: "29MĐ1 - 452.10",
    type: "Xe máy điện",
    price: 20000,
    status: "rented",
    desc: "Pin LFP chạy 190km/lần sạc, kèm bộ sạc nhanh chính hãng VinFast.",
    photo: makeVehicleSVG("#fef3c7", "#b45309", "Ảnh toàn diện VinFast Klara S2")
  },
  {
    id: 3,
    name: "Honda Vision Thể Thao",
    yearColor: "Đời 2024 • Xám Xi Măng",
    plate: "29B2 - 119.04",
    type: "Xe tay ga",
    price: 20000,
    status: "available",
    desc: "Khóa Smartkey, tiết kiệm xăng, phù hợp di chuyển nội thành.",
    photo: makeVehicleSVG("#d1fae5", "#065f46", "Ảnh toàn diện Honda Vision Thể Thao")
  },
  {
    id: 4,
    name: "Yamaha Exciter 155 VVA",
    yearColor: "Đời 2024 • Xanh GP",
    plate: "29D2 - 773.81",
    type: "Xe côn tay",
    price: 30000,
    status: "maintenance",
    desc: "Đang thay nhông sên dĩa và kiểm tra phanh định kỳ.",
    photo: makeVehicleSVG("#fee2e2", "#b91c1c", "Ảnh toàn diện Yamaha Exciter 155")
  }
];

let vehicleFullPhoto = "";
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

// Cập nhật bộ đếm 1 ảnh toàn diện
const updatePhotoCounter = () => {
  const count = vehicleFullPhoto ? 1 : 0;
  document.getElementById("photoCounterText").innerHTML =
    `Đã tải lên <strong>${count}/1</strong> ảnh toàn diện bắt buộc (PNG, JPG tối đa 5MB).`;
};

// Xử lý Upload 1 ảnh toàn diện có xem trước
const uploadItem = document.querySelector(".upload-item[data-doc='fullView']");
const dropArea = uploadItem.querySelector(".drop-area");
const fileInput = uploadItem.querySelector("input[type='file']");
const previewImg = uploadItem.querySelector(".preview-img");
const dropContent = uploadItem.querySelector(".drop-content");
const removeBtn = uploadItem.querySelector(".remove-img-btn");

const setPreview = (src) => {
  previewImg.src = src;
  previewImg.hidden = false;
  removeBtn.hidden = false;
  dropContent.hidden = true;
  dropArea.classList.add("has-image");
  vehicleFullPhoto = src;
  updatePhotoCounter();
};

const clearPreview = () => {
  previewImg.src = "";
  previewImg.hidden = true;
  removeBtn.hidden = true;
  dropContent.hidden = false;
  dropArea.classList.remove("has-image");
  fileInput.value = "";
  vehicleFullPhoto = "";
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

// Điền dữ liệu mẫu nhanh
document.getElementById("fillSampleBtn").addEventListener("click", () => {
  switchTab("add-vehicle");
  document.getElementById("vehicleName").value = "Honda SH Mode 125 ABS";
  document.getElementById("vehicleType").value = "Xe tay ga";
  document.getElementById("licensePlate").value = "29E2 - 668.99";
  document.getElementById("yearColor").value = "2025 • Đỏ Đen Thể Thao";
  document.getElementById("vehicleDesc").value = "Xe mới 99%, ODO 1.800km, phanh ABS 2 kênh, tặng kèm 02 mũ bảo hiểm.";
  document.getElementById("dailyPrice").value = "28000";
  document.getElementById("depositAmount").value = "1.500.000 đ (Hoặc giữ CCCD gốc)";
  document.getElementById("fuelType").value = "Xăng RON 95 (Đầy bình khi giao)";
  document.getElementById("listingStatus").value = "available";
  document.getElementById("agreeSafety").checked = true;

  setPreview(makeVehicleSVG("#d1fae5", "#065f46", "Ảnh toàn diện Honda SH Mode 125"));
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
            <img src="${v.photo}" alt="${v.name}" class="vehicle-thumb" />
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
      document.getElementById("modalPlate").textContent = `${vehicle.plate} • ${vehicle.type} • ${formatVND(vehicle.price)}/giờ`;
      document.getElementById("modalTitle").textContent = vehicle.name;
      document.getElementById("modalDesc").textContent = vehicle.desc;
      document.getElementById("modalGallery").innerHTML = `<img src="${vehicle.photo}" alt="${vehicle.name}" />`;
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
  if (!vehicleFullPhoto) {
    showToast("Vui lòng tải lên 1 ảnh toàn diện của xe!");
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
    photo: vehicleFullPhoto
  };

  storeVehicles.unshift(newVehicle);
  newestVehicleId = newId;

  e.target.reset();
  clearPreview();

  updateKPIs();
  renderVehicleTable();
  switchTab("vehicle-list");
  showToast(`Đã đăng xe ${newVehicle.name} (${newVehicle.plate}) lên cửa hàng!`);
});

document.getElementById("searchInput").addEventListener("input", renderVehicleTable);
document.getElementById("typeFilter").addEventListener("change", renderVehicleTable);
document.getElementById("statusFilter").addEventListener("change", renderVehicleTable);

// Khởi tạo
updateKPIs();
renderVehicleTable();