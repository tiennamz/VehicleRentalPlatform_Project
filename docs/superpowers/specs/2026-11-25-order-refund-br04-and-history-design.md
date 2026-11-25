# Tài Liệu Thiết Kế — TF14841: Hoàn Cọc Theo BR-04, Danh Sách Đơn & Lịch Sử Thuê Xe

## 1. Mục tiêu nghiệp vụ
Cung cấp đầy đủ chức năng cho khách hàng:
1. **Hủy đơn thuê & Hoàn cọc theo quy tắc BR-04:**
   - Hủy trước giờ nhận xe **từ 24 giờ trở lên** (`>= 24h`): hoàn **100%** tiền cọc.
   - Hủy trước giờ nhận xe **từ 6 giờ đến dưới 24 giờ** (`6h <= t < 24h`): hoàn **50%** tiền cọc.
   - Hủy trước giờ nhận xe **dưới 6 giờ** (`t < 6h`): hoàn **0%** tiền cọc (không hoàn cọc).
   - Đơn ở trạng thái chưa đóng cọc (`deposit_amount == 0` hoặc `Chờ thanh toán`) khi hủy không phát sinh hoàn cọc (`0đ`), nhưng vẫn được hủy và giải phóng lịch xe.
2. **Danh sách đơn và lịch sử thuê xe:**
   - Xem toàn bộ đơn thuê của khách hàng, phân tách rõ **Đơn hiện tại** (Chờ thanh toán, Chờ cửa hàng xác nhận, Đã xác nhận, Đang thuê, Chờ VHV xử lý) và **Lịch sử đơn** (Hoàn tất / Hoàn thành, Đã hủy, Cửa hàng từ chối).
   - Xem chi tiết dòng thời gian (timeline) các mốc trạng thái của từng đơn và thông tin hoàn cọc BR-04.

## 2. Thay đổi Cơ sở dữ liệu
Bổ sung 4 cột vào bảng `orders` (`backend/app/models/order.py`), tạo migration `d5f9b87c66e5_add_order_cancellation_br04_fields.py` (`down_revision = 'c4e8a76b55d4'`) và cập nhật `backend/sql/createtable.sql`:
- `cancelled_at` (`DateTime`, nullable): thời điểm khách hàng hủy đơn.
- `cancel_reason` (`Text`, nullable): lý do hủy đơn do khách nhập.
- `refund_rate` (`Numeric(5, 2)`, mặc định `0`): tỷ lệ hoàn cọc áp dụng theo BR-04 (`100`, `50` hoặc `0`).
- `refund_amount` (`Numeric(12, 2)`, mặc định `0`): số tiền cọc thực tế hoàn lại cho khách (VNĐ).

Khi hủy đơn phát sinh `refund_amount > 0`, hệ thống tự động tạo bản ghi giao dịch hoàn tiền trong bảng `transactions` (`transaction_type = "Hoàn cọc BR-04"`, `status = "Đã hoàn tiền"`).

## 3. Thiết kế API Backend (`backend/app/routers/order_cancellation_history_routers.py`)
1. `GET /orders/my` — Lấy danh sách đơn và lịch sử của khách hàng (tham số: `renter_id` hoặc header `X-User-Id`, `scope=all|active|history`, `order_status`), trả về `summary` (thống kê số lượng đơn & tổng tiền hoàn cọc) và `orders` (kèm `history_events` cho từng đơn).
2. `GET /orders/{order_id}/cancel-preview` — Tính thử mức hoàn cọc theo BR-04 trước khi khách bấm xác nhận hủy (trả về số giờ còn lại, tỷ lệ hoàn, số tiền hoàn, giải thích chính sách).
3. `POST /orders/{order_id}/cancel` — Thực hiện hủy đơn, áp dụng hoàn cọc BR-04, ghi giao dịch hoàn tiền (nếu > 0) và tự động giải phóng lịch xe. Kiểm tra chủ đơn (`403`) và chặn hủy đơn đang thuê / đã hoàn thành / đã hủy (`409`).

## 4. Tích hợp Frontend (`Frontend/pages/my-orders.html`, `my-orders.css`, `my-orders.js`)
- Bổ sung thanh tab lọc (**Tất cả**, **Đang xử lý**, **Đang thuê**, **Lịch sử**) và 4 thẻ thống kê động.
- Nối API `GET /orders/my` (có fallback dữ liệu demo đa dạng khi chạy offline).
- Thêm nút **Hủy đơn** mở modal xem trước mức hoàn cọc BR-04 (`100%` / `50%` / `0%`) + nhập lý do hủy → gọi `POST /orders/{id}/cancel`.
- Thêm nút **Lịch sử** mở modal hiển thị chi tiết bảng kê chi phí BR-03, thông tin hoàn cọc BR-04 và dòng thời gian sự kiện của đơn.
