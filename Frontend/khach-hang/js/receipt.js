
// Lấy các thành phần trên trang biên nhận
const receiptSection = document.getElementById("receiptSection");
const backReceiptButton = document.getElementById("backReceiptButton");
const printButton = document.getElementById("printButton");

const transactionStatus = document.getElementById("transactionStatus");
const statusIcon = document.getElementById("statusIcon");
const statusTitle = document.getElementById("statusTitle");
const statusDescription = document.getElementById("statusDescription");
const statusLabel = document.getElementById("statusLabel");

const receiptAmount = document.getElementById("receiptAmount");
const receiptOrderCode = document.getElementById("receiptOrderCode");
const receiptTransactionCode = document.getElementById("receiptTransactionCode");
const receiptDate = document.getElementById("receiptDate");
const receiptMethod = document.getElementById("receiptMethod");

const paidLabel = document.getElementById("paidLabel");
const receiptStatusText = document.getElementById("receiptStatusText");

// Định dạng tiền Việt Nam
function formatMoney(amount) {
    return Number(amount).toLocaleString("vi-VN") + "đ";
}

// Lấy dữ liệu giao dịch đã lưu từ trang thanh toán
function loadReceipt() {
    const savedData = sessionStorage.getItem("receiptData");

    if (!savedData) {
        showNoReceipt();
        return;
    }

    let data;

    try {
        data = JSON.parse(savedData);
    } catch (error) {
        showNoReceipt();
        return;
    }

    if (!data || data.status !== "Thành công") {
        showNoReceipt();
        return;
    }

    receiptOrderCode.textContent = data.orderCode || "Không có dữ liệu";
    receiptTransactionCode.textContent = data.transactionCode || "Không có dữ liệu";
    receiptDate.textContent = data.date || "Không có dữ liệu";
    receiptMethod.textContent = data.method || "Không có dữ liệu";

    receiptAmount.textContent = formatMoney(data.amount);

    showReceiptStatus();
}

// Hiển thị trạng thái giao dịch thành công
function showReceiptStatus() {
    transactionStatus.className = "transaction-status success";

    statusIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
    statusTitle.textContent = "Thanh toán thành công!";
    statusDescription.textContent = "Giao dịch tiền cọc của bạn đã được ghi nhận.";
    statusLabel.textContent = "GIAO DỊCH THÀNH CÔNG";

    paidLabel.className = "paid-label";
    paidLabel.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã thanh toán';

    receiptStatusText.className = "success-text";
    receiptStatusText.textContent = "Thành công";
}

// Không có giao dịch thành công thì không hiển thị biên nhận
function showNoReceipt() {
    receiptSection.hidden = true;

    const errorSection = document.getElementById("receiptErrorSection");

    if (errorSection) {
        errorSection.hidden = false;
    }
}

// Quay lại trang thanh toán
function backToPayment() {
    // Lịch sử trình duyệt sẽ đưa người dùng về trang thanh toán trước đó.
    if (document.referrer) {
        window.history.back();
    } else {
        if (window.motogoNavigate) { window.motogoNavigate("payment.html"); } else { window.location.href = "payment.html"; }
    }
}

// Sự kiện nút quay lại
backReceiptButton.addEventListener("click", backToPayment);

// Sự kiện in biên nhận
printButton.addEventListener("click", function () {
    window.print();
});

// Tải biên nhận khi mở trang
loadReceipt();
