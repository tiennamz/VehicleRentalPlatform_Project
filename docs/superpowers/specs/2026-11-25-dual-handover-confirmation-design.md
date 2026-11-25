# Tài Liệu Thiết Kế — TF148C7: Xác Nhận Bàn Giao 2 Chiều (Cả Khách Và Nhân Viên Xác Nhận Mới Sang Đang Thuê)

## 1. Mục tiêu nghiệp vụ
Đảm bảo quy trình bàn giao nhận xe minh bạch và an toàn giữa hai bên:
- Khi đơn thuê ở trạng thái **`Đã xác nhận`**, cả **Khách hàng** và **Nhân viên cửa hàng** đều phải thực hiện xác nhận bàn giao nhận xe (`handover_in_out = "OUT"`).
- Nếu **chỉ mới 1 bên xác nhận** (chỉ Khách hoặc chỉ Nhân viên): đơn **chưa được chuyển** sang `Đang thuê` mà vẫn giữ nguyên trạng thái **`Đã xác nhận`** và hiển thị rõ đang chờ bên còn lại xác nhận.
- Chỉ khi **CẢ HAI BÊN** (`staff_confirmed == True` **VÀ** `customer_confirmed == True`) cùng xác nhận: hệ thống mới tự động chuyển `order.order_status` sang **`Đang thuê`**, cập nhật trạng thái xe `vehicle.status = "Đang thuê"` và ghi nhận mốc thời gian bàn giao `handover_at`.

## 2. Thay đổi Cơ sở dữ liệu (bảng `handover_records`)
Bổ sung 4 cột vào model `HandoverRecord` (`backend/app/models/handover_record.py`), tạo migration Alembic `e6a1c98d77f6_add_dual_handover_confirmation_fields.py` (`down_revision = 'd5f9b87c66e5'`) và cập nhật `backend/sql/createtable.sql`:
- `staff_confirmed` (`Boolean`, mặc định `False`): cờ nhân viên/cửa hàng đã xác nhận giao xe.
- `staff_confirmed_at` (`DateTime`, nullable): thời điểm nhân viên xác nhận giao xe.
- `customer_confirmed` (`Boolean`, mặc định `False`): cờ khách hàng đã xác nhận nhận xe.
- `customer_confirmed_at` (`DateTime`, nullable): thời điểm khách hàng xác nhận nhận xe.

## 3. Thiết kế API Backend (`backend/app/routers/handover_confirmation_routers.py`)
1. `GET /orders/{order_id}/handover` — Xem trạng thái xác nhận bàn giao 2 chiều của đơn (`staff_confirmed`, `customer_confirmed`, `both_confirmed`, `waiting_for`, `order_status`, `condition_note`).
2. `POST /orders/{order_id}/handover/staff-confirm` — Nhân viên/chủ cửa hàng xác nhận giao xe (kiểm tra quyền chủ cửa hàng/nhân viên → `403` nếu khách hàng hoặc cửa hàng khác gọi; kiểm tra trạng thái đơn `Đã xác nhận` → `409` nếu sai trạng thái).
3. `POST /orders/{order_id}/handover/customer-confirm` — Khách hàng xác nhận nhận xe (kiểm tra đúng chủ đơn `renter_id` → `403` nếu người khác gọi; kiểm tra trạng thái đơn `Đã xác nhận` → `409` nếu sai trạng thái).

## 4. Tích hợp Frontend (2 phía vai trò)
- **Giao diện Nhân viên / Cửa hàng** (`Frontend/js/store-rental-orders.js`):
  - Với đơn ở trạng thái **`Đã xác nhận`**, hiển thị tiến độ xác nhận 2 chiều (`NV` & `Khách`) và nút **"NV xác nhận giao xe"** gọi `POST /orders/{id}/handover/staff-confirm`.
- **Giao diện Khách hàng** (`Frontend/js/my-orders.js`):
  - Với đơn ở trạng thái **`Đã xác nhận`**, hiển thị tiến độ xác nhận 2 chiều và nút **"Xác nhận nhận xe"** gọi `POST /orders/{id}/handover/customer-confirm`.
  - Hỗ trợ đồng bộ cục bộ qua `localStorage` khi chạy demo offline để có thể mở song song 2 tab Khách hàng và Cửa hàng bấm xác nhận và thấy đơn chỉ chuyển sang **`Đang thuê`** khi cả 2 bên đã bấm!
