# FR-16 & FR-18 – Giao diện tạo đơn

## Phạm vi
Gói này tách riêng phần giao diện thuộc task `[FE] FR-16 và FR-18` (`TF13EE2`) từ dự án VRP-GO, đáp ứng đầy đủ các yêu cầu trong mô tả:
- **Đếm ngược thời gian giữ chỗ:** Banner đếm ngược thời gian giữ chỗ (`30:00`) kèm thanh tiến trình trực quan và trạng thái tự hủy khi hết giờ.
- **Chọn hình thức giao nhận:** Tự đến cửa hàng (miễn phí), giao tận nơi (+50.000đ), giao nhận tại sân bay/ga (+80.000đ) kèm ô nhập địa chỉ giao nhận khi chọn giao ngoài cửa hàng.
- **Thông tin liên hệ & Ghi chú:** Nhập họ tên, số điện thoại (có kiểm tra hợp lệ) và ô ghi chú yêu cầu cho cửa hàng.
- **Bảng chi phí:** Hiển thị chi tiết giá thuê theo ngày, phí dịch vụ (5%), bảo hiểm chuyến đi, phí giao nhận, tiền cọc (30%) và tổng cộng — tự động cập nhật ngay khi đổi hình thức giao nhận.

## Chạy thử
1. Giải nén thư mục `FR-16-FR-18-Tao-don`.
2. Mở bằng VS Code và chạy **Live Server** tại `pages/booking.html` (hoặc `http://127.0.0.1:5500/pages/booking.html`).
3. Thử chọn các hình thức giao nhận khác nhau để xem bảng chi phí cập nhật, nhập thông tin & ghi chú rồi bấm **Xác nhận & Thanh toán cọc**.

## File chính cần review
- `pages/booking.html`
- `pages/my-orders.html`
- `khach-hang/payment.html`
- `khach-hang/receipt.html`
- `css/style.css`
- `js/effects.js`
