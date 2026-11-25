# Tài Liệu Thiết Kế — TF14679: Cửa Hàng Xác Nhận / Từ Chối Đơn Trong 15 Phút & Chuyển Vận Hành Viên Xử Lý

## 1. Mục tiêu nghiệp vụ
Cho phép cửa hàng chủ động **xác nhận** hoặc **từ chối đơn thuê kèm lý do bắt buộc** trong khung thời gian **SLA 15 phút** kể từ khi đơn được tạo. Nếu quá 15 phút mà cửa hàng chưa phản hồi, hệ thống tự động chuyển đơn sang trạng thái **`Chờ vận hành viên xử lý`** và khóa quyền xác nhận/từ chối muộn của cửa hàng.

## 2. Thay đổi Cơ sở dữ liệu (bảng `orders`)
Bổ sung 4 cột vào model `Order` (`backend/app/models/order.py`), migration Alembic `c4e8a76b55d4_add_store_confirmation_sla_fields.py` (`down_revision = 'b3d7f65a44c3'`) và file `backend/sql/createtable.sql`:
- `confirmation_deadline` (`DateTime`, cho phép NULL): mốc hạn chót cửa hàng phải phản hồi (mặc định bằng `created_at + 15 phút`, có thể cấu hình qua `system_config.store_confirmation_timeout_minutes`, mặc định `15`).
- `store_responded_at` (`DateTime`, cho phép NULL): thời điểm cửa hàng bấm xác nhận hoặc từ chối đơn.
- `rejection_reason` (`Text`, cho phép NULL): lý do từ chối đơn thuê do cửa hàng nhập.
- `escalated_at` (`DateTime`, cho phép NULL): thời điểm đơn quá hạn 15 phút bị tự động chuyển sang vận hành viên xử lý.

## 3. Luồng trạng thái đơn thuê
- **Trạng thái đang chờ cửa hàng phản hồi:** `Chờ cửa hàng xác nhận`, `Chờ thanh toán`, `Đã đặt cọc`.
- **Cửa hàng xác nhận trong hạn 15 phút:** chuyển sang **`Đã xác nhận`**, lưu `store_responded_at`.
- **Cửa hàng từ chối trong hạn 15 phút (kèm lý do 3–500 ký tự):** chuyển sang **`Cửa hàng từ chối`**, lưu `rejection_reason` và `store_responded_at`.
- **Quá hạn 15 phút chưa phản hồi:** tự động chuyển sang **`Chờ vận hành viên xử lý`**, lưu `escalated_at`.
  - Nếu cửa hàng cố xác nhận hoặc từ chối sau khi đã hết 15 phút: hệ thống tự chuyển trạng thái sang `Chờ vận hành viên xử lý`, lưu DB và trả lỗi HTTP **`409 Conflict`**.

## 4. Danh sách API Backend (`backend/app/routers/store_order_confirmation_routers.py`)
1. `GET /stores/orders` — Lấy danh sách đơn thuê của cửa hàng (hỗ trợ lọc `store_id`, `owner_id`, `order_status`). Hệ thống tự động quét và chuyển các đơn quá 15 phút trước khi trả dữ liệu, kèm `confirmation_deadline`, `remaining_seconds`, `is_overdue`, `rejection_reason`, `escalated_at`.
2. `POST /stores/orders/{order_id}/confirm` — Cửa hàng xác nhận đơn trong hạn 15 phút (kiểm tra quyền chủ cửa hàng → `403` nếu không đúng cửa hàng; `409` nếu quá hạn hoặc đơn đã xử lý).
3. `POST /stores/orders/{order_id}/reject` — Cửa hàng từ chối đơn trong hạn 15 phút kèm `rejection_reason` bắt buộc (`422` nếu rỗng hoặc < 3 ký tự).
4. `POST /orders/escalate-overdue` — Quét toàn bộ đơn quá hạn 15 phút trong hệ thống và chuyển sang trạng thái `Chờ vận hành viên xử lý` (dùng cho cron job hoặc vận hành viên kích hoạt thủ công).
5. `GET /operator/orders/escalated` — Lấy danh sách tất cả đơn đang ở trạng thái `Chờ vận hành viên xử lý` để vận hành viên tiếp nhận.

## 5. Tích hợp Frontend (`store-rental-orders.html`, `store-rental-orders.js`, `store-rental-orders.css`)
- Bổ sung tab lọc **`Chờ VHV xử lý`** và bộ đếm số lượng đơn trực tiếp trên từng tab trạng thái.
- Hiển thị đồng hồ đếm ngược 15 phút chạy theo từng giây cho mỗi đơn chờ xác nhận; khi về `00:00` tự động chuyển trạng thái sang **`Chờ vận hành viên xử lý`** và khóa nút thao tác.
- Nút **Xác nhận** gọi `POST /stores/orders/{order_id}/confirm` (có fallback demo khi chạy offline).
- Nút **Từ chối** mở modal chọn nhanh hoặc nhập lý do từ chối bắt buộc → gọi `POST /stores/orders/{order_id}/reject` và hiển thị lý do từ chối ngay dưới trạng thái đơn.
