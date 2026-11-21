# FR-14 – Giao diện chi tiết xe

## Phạm vi
Gói này tách riêng phần giao diện thuộc task `[FE] FR-14` (`TF13DFF`) từ dự án VRP-GO, đáp ứng đầy đủ các hạng mục mô tả:
- **Thư viện ảnh xe:** Ảnh chính độ phân giải cao kèm 4 ảnh thu nhỏ (góc chính diện, thân xe, đầu xe, phanh & lốp) chuyển đổi trực tiếp.
- **Thông số kỹ thuật:** Loại xe, dung tích động cơ, năm sản xuất, biển số, mức tiêu hao nhiên liệu, truyền động, trang bị đi kèm và yêu cầu giấy tờ.
- **Chi phí dự kiến:** Chọn ngày giờ nhận/trả xe, tự động kiểm tra hợp lệ và tính giá thuê theo ngày, phí dịch vụ (5%), bảo hiểm, tiền cọc (30%) và tổng chi phí dự kiến.
- **Chính sách hủy:** Bảng mức hoàn cọc theo mốc thời gian hủy (`≥ 24h`, `6–24h`, `< 6h`) kèm liên kết tới `pages/rental-policy.html#huy`.
- **Đánh giá:** Hiển thị điểm đánh giá trung bình, nhận xét thực tế từ khách thuê kèm liên kết tới `pages/reviews.html`.

## Chạy thử
1. Giải nén thư mục `FR-14-Chi-tiet-xe`.
2. Mở bằng VS Code và chạy **Live Server** tại `pages/vehicle-detail.html` (hoặc `http://127.0.0.1:5500/pages/vehicle-detail.html`).
3. Bấm chuyển các ảnh thumbnail trong thư viện ảnh và thay đổi ngày giờ nhận/trả xe để kiểm tra bảng tính chi phí dự kiến.

## File chính cần review
- `pages/vehicle-detail.html`
- `pages/reviews.html`
- `pages/rental-policy.html`
- `css/style.css`
- `js/effects.js`
