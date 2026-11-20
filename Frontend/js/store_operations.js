// Dữ liệu lịch sử tạm ngưng mẫu
const suspendHistory = [
  {
    scopeText: "Tạm ngưng toàn chi nhánh",
    reason: "Bảo trì & kiểm định định kỳ đội xe",
    start: "01/11/2026 08:00",
    end: "01/11/2026 17:00",
    status: "Đã hoàn tất"
  }
];

// Dữ liệu điểm giao nhận ban đầu
const deliveryHubs = [
  {
    id: 1,
    name: "Chi nhánh VRP Go Tây Hồ (Trụ sở)",
    address: "Số 128 Xuân Diệu, Quảng An, Tây Hồ, Hà Nội",
    type: "Chi nhánh chính (Miễn phí)",
    distance: 0,
    fee: 0,
    hours: "06:30 - 22:00",
    active: true
  },
  {
    id: 2,
    name: "Ga Hà Nội - Cổng Trần Quý Cáp",
    address: "Số 1 Trần Quý Cáp, Văn Miếu, Đống Đa, Hà Nội",
    type: "Sân bay / Nhà ga / Bến xe",
    distance: 6.5,
    fee: 35000,
    hours: "07:00 - 21:30",
    active: true
  },
  {
    id: 3,
    name: "Sân bay Quốc tế Nội Bài (Nhà ga T1/T2)",
    address: "Sảnh đến T1 & T2, Phú Minh, Sóc Sơn, Hà Nội",
    type: "Sân bay / Nhà ga / Bến xe",
    distance: 22,
    fee: 120000,
    hours: "06:00 - 23:00",
    active: true
  }
];

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

// ================= TAB 1: FORM TẠM NGƯNG =================
const scopeMap = {
  store: "Tạm ngưng toàn chi nhánh",
  delivery: "Tạm ngưng giao tận nơi",
  vehicle: "Tạm ngưng xe chỉ định"
};

const formatDateTimeVN = (val) => {
  if (!val) return "--/--/---- --:--";
  const d = new Date(val);
  if (isNaN(d)) return "--/--/---- --:--";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const updateSuspendPreview = () => {
  const scopeVal = document.getElementById("suspendScope").value;
  const reasonVal = document.getElementById("suspendReason").value;
  const noteVal = document.getElementById("suspendNote").value.trim();
  const startVal = document.getElementById("startDateTime").value;
  const endVal = document.getElementById("endDateTime").value;

  document.getElementById("targetVehicleGroup").hidden = scopeVal !== "vehicle";
  document.getElementById("previewScopeBadge").textContent = scopeMap[scopeVal];
  document.getElementById("previewReasonTitle").textContent = reasonVal || "Chưa chọn lý do tạm ngưng";
  document.getElementById("previewNoteText").textContent =
    noteVal || "Nội dung thông báo gửi tới khách thuê sẽ hiển thị tại đây...";
  document.getElementById("previewStartText").textContent = formatDateTimeVN(startVal);
  document.getElementById("previewEndText").textContent = formatDateTimeVN(endVal);

  if (startVal && endVal) {
    const diffMs = new Date(endVal) - new Date(startVal);
    if (diffMs > 0) {
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      const days = Math.floor(totalHours / 24);
      const hours = Math.round((totalHours % 24) * 10) / 10;
      const label = days > 0 ? `${days} ngày ${hours} giờ` : `${totalHours} giờ`;
      document.getElementById("durationDisplay").textContent = `Tạm ngưng trong ${label}`;
      document.getElementById("previewDurationTag").textContent = label;
    } else {
      document.getElementById("durationDisplay").textContent = "Thời gian mở lại phải sau thời gian bắt đầu!";
      document.getElementById("previewDurationTag").textContent = "Lỗi mốc giờ";
    }
  }
};

["suspendScope", "suspendReason", "suspendNote", "startDateTime", "endDateTime"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateSuspendPreview);
  document.getElementById(id).addEventListener("change", updateSuspendPreview);
});

const renderSuspendHistory = () => {
  const container = document.getElementById("suspendHistoryList");
  container.innerHTML = suspendHistory
    .map(
      (item) => `
      <div class="history-item">
        <div class="history-item-head">
          <span>${item.scopeText}</span>
          <span class="text-green">${item.status}</span>
        </div>
        <div>${item.reason}</div>
        <div class="history-item-time">${item.start} &rarr; ${item.end}</div>
      </div>`
    )
    .join("");
};

document.getElementById("suspendForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const startVal = document.getElementById("startDateTime").value;
  const endVal = document.getElementById("endDateTime").value;
  if (new Date(endVal) <= new Date(startVal)) {
    showToast("Thời gian dự kiến mở lại phải lớn hơn thời gian bắt đầu!");
    return;
  }

  const scopeVal = document.getElementById("suspendScope").value;
  const reasonVal = document.getElementById("suspendReason").value;

  suspendHistory.unshift({
    scopeText: scopeMap[scopeVal],
    reason: reasonVal,
    start: formatDateTimeVN(startVal),
    end: formatDateTimeVN(endVal),
    status: "Đang áp dụng"
  });

  renderSuspendHistory();

  const liveBadge = document.getElementById("storeLiveBadge");
  liveBadge.className = "status-indicator paused";
  liveBadge.textContent = `⏸ Đang tạm ngưng đến ${formatDateTimeVN(endVal)}`;
  document.getElementById("resumeStoreBtn").hidden = false;

  showToast("Đã kích hoạt trạng thái tạm ngưng và gửi thông báo!");
});

document.getElementById("resumeStoreBtn").addEventListener("click", () => {
  const liveBadge = document.getElementById("storeLiveBadge");
  liveBadge.className = "status-indicator online";
  liveBadge.textContent = "● Chi nhánh đang hoạt động";
  document.getElementById("resumeStoreBtn").hidden = true;
  if (suspendHistory[0]) suspendHistory[0].status = "Đã mở lại sớm";
  renderSuspendHistory();
  showToast("Đã mở hoạt động trở lại cho chi nhánh!");
});

// ================= TAB 2: ĐIỂM GIAO NHẬN & PHÍ =================
const updateFeeKPIs = () => {
  const activeCount = deliveryHubs.filter((h) => h.active).length;
  document.getElementById("hubCountBadge").textContent = activeCount;
  document.getElementById("kpiActiveHubs").textContent = activeCount;
  document.getElementById("kpiFreeRadius").textContent = `${document.getElementById("freeRadiusInput").value} km`;
  document.getElementById("kpiPerKmFee").textContent = formatVND(document.getElementById("pricePerKmInput").value);
  document.getElementById("kpiAfterHoursFee").textContent = formatVND(document.getElementById("afterHoursFeeInput").value);
};

const calculateSimulatedFee = () => {
  const freeRadius = Number(document.getElementById("freeRadiusInput").value) || 0;
  const perKm = Number(document.getElementById("pricePerKmInput").value) || 0;
  const nightFeeRule = Number(document.getElementById("afterHoursFeeInput").value) || 0;
  const freeMinDays = Number(document.getElementById("freeMinDaysInput").value) || 99;

  const dist = Number(document.getElementById("simDistance").value) || 0;
  const days = Number(document.getElementById("simDays").value) || 1;
  const isNight = document.getElementById("simTimeSlot").value === "night";

  let baseFee = 0;
  if (days >= freeMinDays && dist <= 10) {
    baseFee = 0;
  } else if (dist > freeRadius) {
    baseFee = Math.round((dist - freeRadius) * perKm);
  }

  const nightFee = isNight ? nightFeeRule : 0;
  document.getElementById("simBaseFee").textContent = baseFee === 0 ? "Miễn phí (0 đ)" : formatVND(baseFee);
  document.getElementById("simNightFee").textContent = formatVND(nightFee);
  document.getElementById("simTotalFee").textContent = formatVND(baseFee + nightFee);
};

["freeRadiusInput", "maxRadiusInput", "pricePerKmInput", "afterHoursFeeInput", "freeMinDaysInput", "simDistance", "simDays", "simTimeSlot"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    updateFeeKPIs();
    calculateSimulatedFee();
  });
  document.getElementById(id).addEventListener("change", () => {
    updateFeeKPIs();
    calculateSimulatedFee();
  });
});

const renderHubTable = () => {
  const tbody = document.getElementById("hubTableBody");
  tbody.innerHTML = deliveryHubs
    .map(
      (hub) => `
      <tr>
        <td>
          <strong>${hub.name}</strong>
          <span class="hub-sub">${hub.address} • Giờ: ${hub.hours}</span>
        </td>
        <td>${hub.type}</td>
        <td>${hub.distance} km</td>
        <td><span class="price-text">${hub.fee === 0 ? "Miễn phí" : formatVND(hub.fee)}</span></td>
        <td>
          <span class="badge ${hub.active ? "badge-available" : "badge-maintenance"}">
            ${hub.active ? "Đang áp dụng" : "Tạm ngưng"}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button type="button" class="btn-table btn-toggle-hub ${hub.active ? "btn-danger-text" : "btn-success-text"}" data-id="${hub.id}">
              ${hub.active ? "Tắt" : "Bật"}
            </button>
          </div>
        </td>
      </tr>`
    )
    .join("");

  tbody.querySelectorAll(".btn-toggle-hub").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hub = deliveryHubs.find((item) => item.id === Number(btn.dataset.id));
      if (!hub) return;
      hub.active = !hub.active;
      updateFeeKPIs();
      renderHubTable();
      showToast(`Đã ${hub.active ? "bật" : "tạm ngưng"} điểm giao nhận: ${hub.name}`);
    });
  });
};

document.getElementById("addHubForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const newHub = {
    id: Date.now(),
    name: document.getElementById("hubName").value.trim(),
    type: document.getElementById("hubType").value,
    address: document.getElementById("hubAddress").value.trim(),
    distance: Number(document.getElementById("hubDistance").value),
    fee: Number(document.getElementById("hubFee").value),
    hours: document.getElementById("hubHours").value.trim(),
    active: true
  };
  deliveryHubs.push(newHub);
  e.target.reset();
  document.getElementById("hubHours").value = "07:00 - 21:30";
  updateFeeKPIs();
  renderHubTable();
  showToast(`Đã thêm điểm giao nhận "${newHub.name}"!`);
});

document.getElementById("saveAllFeeConfigBtn").addEventListener("click", () => {
  updateFeeKPIs();
  calculateSimulatedFee();
  showToast("Đã lưu cấu hình điểm giao nhận và biểu phí vận chuyển!");
});

// Điền dữ liệu mẫu nhanh cho Tab hiện tại
document.getElementById("fillSampleBtn").addEventListener("click", () => {
  const isSuspendTab = document.getElementById("tab-suspend-form").classList.contains("active");
  if (isSuspendTab) {
    document.getElementById("suspendScope").value = "store";
    document.getElementById("suspendReason").value = "Bảo trì & kiểm định định kỳ đội xe";
    document.getElementById("suspendNote").value =
      "Chi nhánh Tây Hồ tạm ngưng nhận đơn mới để bảo dưỡng định kỳ toàn bộ xe. Hệ thống tự động mở lại vào 08:00 sáng mai.";
    document.getElementById("startDateTime").value = "2026-11-17T18:00";
    document.getElementById("endDateTime").value = "2026-11-18T08:00";
    document.getElementById("confirmSuspendCheck").checked = true;
    updateSuspendPreview();
    showToast("Đã điền sẵn dữ liệu mẫu cho Form tạm ngưng!");
  } else {
    document.getElementById("hubName").value = "Bến xe Mỹ Đình - Cổng số 2";
    document.getElementById("hubType").value = "Sân bay / Nhà ga / Bến xe";
    document.getElementById("hubAddress").value = "Số 20 Phạm Hùng, Nam Từ Liêm, Hà Nội";
    document.getElementById("hubDistance").value = "8.5";
    document.getElementById("hubFee").value = "55000";
    showToast("Đã điền sẵn mẫu điểm giao nhận mới!");
  }
});

// Khởi tạo
renderSuspendHistory();
updateFeeKPIs();
calculateSimulatedFee();
renderHubTable();