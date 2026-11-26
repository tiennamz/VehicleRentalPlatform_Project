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

const API_BASE = (window.VRP_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

function getAccessToken() {
  const m = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  try {
    return localStorage.getItem("access_token") || sessionStorage.getItem("access_token") || "";
  } catch (e) {
    return "";
  }
}

function getAuthHeaders(extra) {
  const h = Object.assign({}, extra || {});
  const t = getAccessToken();
  if (t) h["Authorization"] = "Bearer " + t;
  return h;
}

function parseBrandAndModel(fullName) {
  const cleaned = String(fullName || "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { brand: cleaned || "Khác", model: cleaned || "Mẫu chuẩn" };
  return { brand: parts[0], model: parts.slice(1).join(" ") };
}

function parseYearFromText(text) {
  const m = String(text || "").match(/\b(19\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : 2025;
}

function parseEngineCapacity(name, type) {
  if (/điện/i.test(type || "")) return 1500;
  const m = String(name || "").match(/\b(50|110|115|125|135|150|155|160|175|250|300|350)\b/);
  return m ? Number(m[1]) : 125;
}

function mapApiStatusToUi(statusText) {
  const s = String(statusText || "").toLowerCase();
  if (s.includes("thuê")) return "rented";
  if (s.includes("bảo")) return "maintenance";
  return "available";
}

function mapUiStatusToApi(uiStatus) {
  if (uiStatus === "maintenance") return "Bảo trì";
  if (uiStatus === "rented") return "Đang thuê";
  return "Sẵn sàng";
}

function mapApiVehicleToRow(v) {
  const fullName = [v.brand, v.model].filter(Boolean).join(" ").trim() || v.brand || "Xe thuê";
  const yearStr = v.manufacture_year ? `Đời ${v.manufacture_year}` : "Đời 2025";
  const ccStr = v.engine_capacity ? `${v.engine_capacity}cc` : "";
  const photo = Array.isArray(v.images) && v.images.length
    ? v.images[0]
    : makeVehicleSVG("#d1fae5", "#065f46", fullName);
  return {
    id: v.vehicle_id,
    isApi: true,
    name: fullName,
    yearColor: [yearStr, ccStr].filter(Boolean).join(" • "),
    plate: v.license_plate,
    type: v.type || "Xe tay ga",
    price: Number(v.price) || 25000,
    status: mapApiStatusToUi(v.status),
    desc: v.description || "Xe sẵn sàng cho thuê tại cửa hàng.",
    photo: photo,
  };
}

let vehicleFullPhoto = "";
let vehicleFullPhotoFile = null;
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
  vehicleFullPhotoFile = null;
  updatePhotoCounter();
};

dropArea.addEventListener("click", (e) => {
  if (e.target !== removeBtn) fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  vehicleFullPhotoFile = file;
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
  vehicleFullPhotoFile = file;
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
    btn.addEventListener("click", async () => {
      const vehicle = storeVehicles.find((item) => item.id === Number(btn.dataset.id));
      if (!vehicle) return;
      if (vehicle.status === "rented") {
        showToast("Xe đang có khách thuê, không thể khóa lúc này!");
        return;
      }
      const nextStatus = vehicle.status === "maintenance" ? "available" : "maintenance";
      const token = getAccessToken();
      if (vehicle.isApi && token) {
        try {
          const res = await fetch(`${API_BASE}/vehicles/${vehicle.id}`, {
            method: "PUT",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ status: mapUiStatusToApi(nextStatus) })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Không thể cập nhật trạng thái xe");
          }
        } catch (err) {
          showToast(err.message || "Lỗi cập nhật trạng thái xe");
          return;
        }
      }
      vehicle.status = nextStatus;
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

async function loadVehiclesFromApi() {
  const token = getAccessToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/vehicles/my-store`, {
      headers: getAuthHeaders(),
      cache: "no-store"
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (Array.isArray(rows)) {
      storeVehicles.length = 0;
      rows.map(mapApiVehicleToRow).forEach((item) => storeVehicles.push(item));
      newestVehicleId = storeVehicles.length ? storeVehicles[0].id : null;
      updateKPIs();
      renderVehicleTable();
    }
  } catch (err) {}
}

// Submit form thêm xe mới (tải ảnh lên Cloudinary + lưu DB qua API)
document.getElementById("vehicleForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!vehicleFullPhoto) {
    showToast("Vui lòng tải lên 1 ảnh toàn diện của xe!");
    return;
  }

  const name = document.getElementById("vehicleName").value.trim();
  const yearColor = document.getElementById("yearColor").value.trim();
  const plate = document.getElementById("licensePlate").value.trim().toUpperCase();
  const type = document.getElementById("vehicleType").value;
  const price = Number(document.getElementById("dailyPrice").value);
  const statusVal = document.getElementById("listingStatus").value;
  const desc = document.getElementById("vehicleDesc").value.trim();

  const token = getAccessToken();
  const submitBtn = e.target.querySelector("button[type='submit']");
  const origBtnText = submitBtn ? submitBtn.textContent : "";

  if (!token) {
    showToast("Vui lòng đăng nhập tài khoản cửa hàng để lưu xe & ảnh lên Cloudinary!");
    return;
  }

  if (token) {
    if (!vehicleFullPhotoFile) {
      showToast("Vui lòng chọn file ảnh thật (JPG/PNG/WEBP) để lưu lên Cloudinary!");
      return;
    }

    const { brand, model } = parseBrandAndModel(name);
    const manufactureYear = parseYearFromText(yearColor);
    const engineCapacity = parseEngineCapacity(name, type);

    const formData = new FormData();
    formData.append("brand", brand);
    formData.append("model", model);
    formData.append("license_plate", plate);
    formData.append("manufacture_year", String(manufactureYear));
    formData.append("type", type);
    formData.append("engine_capacity", String(engineCapacity));
    formData.append("description", desc);
    formData.append("price", String(price));
    formData.append("status", mapUiStatusToApi(statusVal));
    formData.append("files", vehicleFullPhotoFile);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang tải ảnh lên Cloudinary & lưu xe...";
    }

    try {
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.detail || json.error || "Không thể đăng xe lên máy chủ");
      }

      const newVehicle = mapApiVehicleToRow(json);
      storeVehicles.unshift(newVehicle);
      newestVehicleId = newVehicle.id;

      e.target.reset();
      clearPreview();

      updateKPIs();
      renderVehicleTable();
      switchTab("vehicle-list");
      showToast(`Đã đăng xe ${newVehicle.name} (${newVehicle.plate}) & lưu ảnh lên Cloudinary!`);
    } catch (err) {
      showToast(err.message || "Không thể lưu xe, vui lòng thử lại.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origBtnText;
      }
    }
    return;
  }

  const newId = Date.now();
  const newVehicle = {
    id: newId,
    name: name,
    yearColor: yearColor,
    plate: plate,
    type: type,
    price: price,
    status: statusVal,
    desc: desc,
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

loadVehiclesFromApi();

// Khởi tạo
updateKPIs();
renderVehicleTable();