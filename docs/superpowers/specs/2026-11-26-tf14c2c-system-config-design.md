# Thiết kế Quản trị Cấu hình Hệ thống — Task TF14C2C

**Ngày:** 2026-11-26  
**Task:** TF14C2C — Quản trị hệ thống chỉnh hoa hồng, thời gian giữ chỗ, chính sách hủy, phí trả trễ; các module đọc giá trị từ cấu hình

---

## 1. Mục tiêu & Lý do (Intent & Why)

Hiện tại các thông số nghiệp vụ cốt lõi đang bị phân tán hoặc hardcode trực tiếp trong code:
- Tỷ lệ hoa hồng (`commission_rate`) đã đọc từ `system_config` trong `reconciliation_services.py` nhưng chưa có API quản trị.
- Thời gian giữ chỗ / hạn xác nhận đơn (`store_confirmation_timeout_minutes`) bị hardcode `timedelta(minutes=15)` lúc tạo đơn trong `booking_eligibility_services.py`.
- Chính sách hủy BR-04 (`>= 24h: 100%`, `6h–24h: 50%`, `< 6h: 0%`) bị hardcode hoàn toàn trong `order_cancellation_history_services.py`.
- Phí trả trễ chưa có cấu hình lẫn hàm tính toán.

**TF14C2C** tập trung hoá toàn bộ 4 nhóm tham số này vào một nguồn duy nhất (`system_config`), cho phép `Admin` chỉnh sửa qua API có validate chặt chẽ và đảm bảo mọi module nghiệp vụ đọc trực tiếp giá trị mới nhất từ cấu hình.

---

## 2. Phương án kiến trúc (Approaches)

- **Cách chọn (Duy nhất phù hợp với dự án): Dịch vụ cấu hình tập trung trên bảng `system_config` hiện có (`system_config_services.py` + `system_config_routers.py`):**
  - Tận dụng bảng `system_config (config_key, config_value, description, created_at)` đã có sẵn (không cần migration DB, đồng nhất với `delivery_services.py`).
  - Một service trung tâm `get_system_config(db)` / `update_system_config(db, payload)` quản lý giá trị mặc định, ép kiểu an toàn (`Decimal`/`int`), validate ràng buộc chéo, và các module nghiệp vụ gọi trực tiếp qua service này.
- **Các phương án bị loại:**
  - *Tạo bảng SQL mới có cột cứng cho từng cấu hình:* Phải viết migration thay đổi schema DB và trùng lặp mục đích với bảng `system_config` đã tồn tại.
  - *Lưu file JSON/ENV tĩnh:* Không thể chỉnh động lúc runtime qua API quản trị và mất đồng bộ giữa nhiều instance.

---

## 3. Danh sách tham số cấu hình & Ràng buộc validate

| Nhóm | `config_key` | Kiểu | Mặc định | Ràng buộc validate |
|---|---|---|---|---|
| Hoa hồng | `commission_rate` | `Decimal` (%) | `12.00` | `0 <= val <= 100` |
| Thời gian giữ chỗ | `hold_time_minutes` *(đồng bộ cả `store_confirmation_timeout_minutes`)* | `int` (phút) | `15` | `1 <= val <= 1440` |
| Chính sách hủy | `cancel_full_refund_hours` | `Decimal` (giờ) | `24.00` | `> cancel_partial_refund_hours`, `<= 720` |
| Chính sách hủy | `cancel_full_refund_rate` | `Decimal` (%) | `100.00` | `0 <= val <= 100`, `>= cancel_partial_refund_rate` |
| Chính sách hủy | `cancel_partial_refund_hours` | `Decimal` (giờ) | `6.00` | `>= 0`, `< cancel_full_refund_hours` |
| Chính sách hủy | `cancel_partial_refund_rate` | `Decimal` (%) | `50.00` | `0 <= val <= 100`, `>= cancel_late_refund_rate` |
| Chính sách hủy | `cancel_late_refund_rate` | `Decimal` (%) | `0.00` | `0 <= val <= 100` |
| Phí trả trễ *(PA A)* | `late_return_grace_minutes` | `int` (phút) | `30` | `0 <= val <= 720` |
| Phí trả trễ *(PA A)* | `late_return_fee_per_hour` | `Decimal` (VNĐ/giờ) | `50000.00` | `>= 0` |

### Công thức phí trả trễ (Phương án A — đã chốt)
- `late_minutes = max(0, int((actual_return_time - end_time).total_seconds() // 60))` (nếu `actual_return_time <= end_time` thì `late_minutes = 0`).
- Nếu `late_minutes <= late_return_grace_minutes`: `billable_late_hours = 0`, `late_fee = 0.00`.
- Nếu `late_minutes > late_return_grace_minutes`:
  - `chargeable_minutes = late_minutes - late_return_grace_minutes`
  - `billable_late_hours = math.ceil(chargeable_minutes / 60)`
  - `late_fee = (Decimal(billable_late_hours) * late_return_fee_per_hour).quantize(Decimal("0.01"))`

---

## 4. API & Tích hợp các module

### API quản trị & tra cứu cấu hình (`backend/app/routers/system_config_routers.py`)
- `GET /system-config` — Public (giống `GET /delivery-config`, cho phép các trang đặt xe/chính sách hiển thị đúng mức phí & chính sách hiện hành).
- `PUT /admin/system-config` — Yêu cầu `Depends(check_admin)` (tuân thủ RBAC TF14E12); hỗ trợ cập nhật toàn phần hoặc từng phần (partial update: trường nào truyền vào mới cập nhật, nhưng luôn validate ràng buộc chéo trên cấu hình kết quả cuối cùng).
- `POST /orders/{order_id}/late-fee/calculate` — Yêu cầu `Depends(get_current_user)` (chỉ chính chủ đơn, chủ cửa hàng sở hữu xe, hoặc vận hành viên); tính phí trả trễ cho đơn theo `actual_return_time` đọc từ `system_config`.

### Tích hợp đọc cấu hình trên 4 module
1. **Hoa hồng (`reconciliation_services.py`):** `get_commission_rate(db)` đọc từ `system_config_services.get_system_config(db)["commission_rate"]`.
2. **Thời gian giữ chỗ (`booking_eligibility_services.py` & `store_order_confirmation_services.py`):**
   - `booking_eligibility_services.create_rental_order()` thay hardcode `timedelta(minutes=15)` bằng `timedelta(minutes=get_hold_time_minutes(db))`.
   - `store_order_confirmation_services.get_confirmation_timeout_minutes(db)` đọc đồng bộ từ `system_config_services` (ưu tiên `hold_time_minutes`, tương thích ngược nếu DB/test chỉ set `store_confirmation_timeout_minutes`; khi `PUT /admin/system-config` cập nhật `hold_time_minutes` thì ghi đồng bộ cả 2 key để không lệch).
3. **Chính sách hủy (`order_cancellation_history_services.py`):**
   - `calculate_refund_br04(..., db: Optional[Session] = None)` đọc 5 tham số hủy từ `get_system_config(db)` khi có `db` (vẫn giữ mặc định `24h/100%`, `6h/50%`, `0%` khi gọi unit test thuần không truyền `db`).
   - `preview_order_cancellation` và `cancel_order_with_br04` truyền `db=db` vào `calculate_refund_br04`.
4. **Phí trả trễ (`system_config_services.py`):** Cung cấp `calculate_late_return_fee(db, expected_end_time, actual_return_time)` và endpoint `POST /orders/{order_id}/late-fee/calculate`.

---

## 5. Non-Goals & Anti-Goals
- Không thêm bảng DB mới hay chạy migration.
- Không phá vỡ các test hiện có của BR-04, BR-09, SLA 15 phút, và route-audit test của TF14E12 (phải cập nhật whitelist `("GET", "/system-config")` trong `test_all_protected_routes_require_authentication`).
- Không cho phép non-admin gọi `PUT /admin/system-config` (`401`/`403`).
