
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
let totalValue = 0;

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
        receiptAmount.textContent = formatMoney(totalValue);
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

// Nút thanh toán chính: mô phỏng kết quả
payButton.addEventListener("click", function () {
    payButton.disabled = true;
    payButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

    setTimeout(function () {
        payButton.disabled = false;
        payButton.innerHTML = '<i class="fa-solid fa-lock"></i> Thanh toán ' + formatMoney(depositAmount);

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

    if (window.motogoNavigate) { window.motogoNavigate("receipt.html"); } else { window.location.href = "receipt.html"; }
});

// Nút xem đơn thuê của tôi
modalMainButton.addEventListener("click", function () {
    if (transactionStatus !== "success") {
        return;
    }

    sessionStorage.setItem("openMyOrders", "true");
    if (window.motogoNavigate) { window.motogoNavigate("account.html"); } else { window.location.href = "account.html"; }
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
    if (!navPopup || !navPopupOverlay) return;
    navPopup.classList.add("show");
    navPopupOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeNavPopup() {
    if (!navPopup || !navPopupOverlay) return;
    navPopup.classList.remove("show");
    navPopupOverlay.classList.remove("show");
    document.body.style.overflow = "";
}

if (hamburgerBtn) hamburgerBtn.addEventListener("click", openNavPopup);
if (popupCloseBtn) popupCloseBtn.addEventListener("click", closeNavPopup);
if (navPopupOverlay) navPopupOverlay.addEventListener("click", closeNavPopup);

// Đóng popup bằng phím Escape
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeNavPopup();
        resultOverlay.classList.remove("show");
    }
});
