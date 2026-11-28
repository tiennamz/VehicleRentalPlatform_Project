// FR-38: Giao diện báo cáo quản trị - dữ liệu minh họa
const reportData = [
    { city: "Vũng Tàu", orders: 720, value: 1380000000, cancel: 8.2, complaint: 1.8 },
    { city: "Đà Nẵng", orders: 564, value: 1080000000, cancel: 9.1, complaint: 2.5 }
];

let visibleData = reportData.slice();

function formatMoney(value) {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

function formatCompactMoney(value) {
    return (value / 1000000000).toFixed(2).replace(".", ",") + " tỷ";
}

function calculateAverage(data, field) {
    let total = 0;
    let orders = 0;
    data.forEach(function (item) {
        total += item[field] * item.orders;
        orders += item.orders;
    });
    if (orders === 0) return 0;
    return total / orders;
}

function renderAdminReport() {
    let orders = 0;
    let value = 0;
    visibleData.forEach(function (item) {
        orders += item.orders;
        value += item.value;
    });

    document.getElementById("totalOrders").textContent = orders.toLocaleString("vi-VN");
    document.getElementById("totalValue").textContent = formatCompactMoney(value);
    document.getElementById("cancelRate").textContent = calculateAverage(visibleData, "cancel").toFixed(1).replace(".", ",") + "%";
    document.getElementById("complaintRate").textContent = calculateAverage(visibleData, "complaint").toFixed(1).replace(".", ",") + "%";

    renderCityChart();
    renderRateList();
    renderCityTable();
}

function renderCityChart() {
    const chart = document.getElementById("cityChart");
    chart.innerHTML = "";

    let maxOrders = Math.max(...visibleData.map(item => item.orders), 1);
    let maxValue = Math.max(...visibleData.map(item => item.value), 1);

    visibleData.forEach(function (item) {
        const row = document.createElement("div");
        row.className = "city-chart-row";
        const ordersWidth = item.orders / maxOrders * 100;
        const valueWidth = item.value / maxValue * 100;

        row.innerHTML = `
            <div class="city-name">${item.city}</div>
            <div class="bar-stack">
                <div class="bar-track"><div class="bar-fill orders" style="width:${ordersWidth}%"></div></div>
                <div class="bar-track"><div class="bar-fill value" style="width:${valueWidth}%"></div></div>
            </div>
            <div class="chart-number">${item.orders.toLocaleString("vi-VN")} đơn</div>
        `;
        chart.appendChild(row);
    });

    if (visibleData.length === 0) {
        chart.textContent = "Không có dữ liệu cho lựa chọn này.";
    }
}

function renderRateList() {
    const list = document.getElementById("rateList");
    list.innerHTML = "";

    visibleData.forEach(function (item) {
        const block = document.createElement("div");
        block.innerHTML = `
            <div class="rate-item-top"><strong>${item.city} · Tỷ lệ hủy</strong><span>${item.cancel}%</span></div>
            <div class="rate-track"><div class="rate-fill" style="width:${item.cancel}%"></div></div>
            <div class="rate-item-top" style="margin-top:12px"><strong>${item.city} · Tỷ lệ khiếu nại</strong><span>${item.complaint}%</span></div>
            <div class="rate-track"><div class="rate-fill complaint" style="width:${item.complaint}%"></div></div>
        `;
        list.appendChild(block);
    });

    if (visibleData.length === 0) {
        list.textContent = "Không có dữ liệu cho lựa chọn này.";
    }
}

function renderCityTable() {
    const table = document.getElementById("cityTable");
    table.innerHTML = "";

    visibleData.forEach(function (item) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.city}</td>
            <td>${item.orders.toLocaleString("vi-VN")}</td>
            <td>${formatMoney(item.value)}</td>
            <td>${item.cancel.toFixed(1).replace(".", ",")}%</td>
            <td>${item.complaint.toFixed(1).replace(".", ",")}%</td>
        `;
        table.appendChild(row);
    });

    if (visibleData.length === 0) {
        table.innerHTML = '<tr><td colspan="5">Không có dữ liệu.</td></tr>';
    }
}

document.getElementById("applyFilter").addEventListener("click", function () {
    const city = document.getElementById("cityFilter").value;
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;

    if (start && end && start > end) {
        alert("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        return;
    }

    visibleData = reportData.filter(function (item) {
        if (city === "all") return true;
        return item.city === city;
    });
    renderAdminReport();
});

document.getElementById("exportAdmin").addEventListener("click", function () {
    let rows = [["Thành phố", "Tổng số đơn", "Giá trị giao dịch", "Tỷ lệ hủy (%)", "Tỷ lệ khiếu nại (%)"]];
    visibleData.forEach(function (item) {
        rows.push([item.city, item.orders, item.value, item.cancel, item.complaint]);
    });

    const csv = "\uFEFF" + rows.map(row => row.join(",")).join("\n");
    const file = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bao-cao-quan-tri-vrp-go.csv";
    link.click();
    URL.revokeObjectURL(url);
});

renderAdminReport();