# Tài Liệu Thiết Kế — TF149EA: Tính Hoa Hồng 12% Theo BR-09 & Tổng Hợp Đối Soát Theo Tuần Cho Từng Cửa Hàng

## 1. Mục tiêu nghiệp vụ
Xây dựng cơ chế tính hoa hồng nền tảng theo đúng **BR-09** và tổng hợp đối soát theo từng tuần (Thứ 2 – Chủ Nhật) cho từng cửa hàng:
- **Tỷ lệ hoa hồng (BR-09):** mặc định **`12%`** (có thể cấu hình qua `system_config.commission_rate`).
- **Cơ sở tính hoa hồng:**
  - **CHỈ tính trên tiền thuê xe (`rental_amount`)**.
  - **KHÔNG tính trên phí giao nhận (`delivery_fee`)**.
  - **KHÔNG tính** cho các đơn bị hủy, bị từ chối hoặc khoản cọc hoàn trả (`Đã hủy`, `Cửa hàng từ chối`, `Từ chối`).
- **Công thức đối soát cho từng đơn đủ điều kiện (`Hoàn tất` / `Hoàn thành` / `Completed`):**
  - `commission_amount = rental_amount * 12%` (làm tròn 2 chữ số thập phân).
  - `store_net_payout = rental_amount - commission_amount + delivery_fee` (cửa hàng hưởng 88% tiền thuê + 100% phí giao nhận).
- **Tổng hợp theo tuần ISO (Thứ 2 → Chủ Nhật) cho từng cửa hàng:** gom nhóm tất cả đơn hoàn thành thuộc từng `store_id` theo từng tuần, tính tổng tiền thuê, tổng phí giao nhận (miễn hoa hồng), tổng hoa hồng 12% nền tảng và số tiền thực nhận của cửa hàng.

## 2. Thay đổi Cơ sở dữ liệu (Model, Alembic, SQL & TiDB)
1. **Bảng `orders`** (`backend/app/models/order.py`):
   - `commission_rate` (`Numeric(5, 2)`, mặc định `12.00`): tỷ lệ hoa hồng BR-09 áp dụng cho đơn.
   - `commission_amount` (`Numeric(12, 2)`, mặc định `0.00`): số tiền hoa hồng tính trên `rental_amount`.
2. **Bảng mới `weekly_reconciliations`** (`backend/app/models/weekly_reconciliation.py`):
   - `reconciliation_id` (PK), `store_id` (FK `stores.store_id`), `week_start` (`Date`), `week_end` (`Date`), `order_count` (`Integer`), `total_rental_amount` (`Numeric(12,2)`), `total_delivery_fee` (`Numeric(12,2)`), `gross_revenue` (`Numeric(12,2)`), `commission_rate` (`Numeric(5,2)`), `commission_amount` (`Numeric(12,2)`), `net_payout` (`Numeric(12,2)`), `status` (`String(50)`, mặc định `'Đã chốt'`), `generated_at` (`DateTime`).
3. **Migration Alembic:** `f7b2d09e88a7_add_commission_and_weekly_reconciliation.py` (`down_revision = 'e6a1c98d77f6'`), cập nhật `backend/sql/createtable.sql` và đẩy trực tiếp lên TiDB Cloud.

## 3. Thiết kế API Backend (`backend/app/routers/reconciliation_routers.py`)
1. `GET /reconciliation/weekly` — Tổng hợp đối soát theo tuần cho từng cửa hàng (tham số: `store_id`, `owner_id`, `week_start`, `weeks=4`).
2. `POST /reconciliation/weekly/generate` — Chốt & lưu báo cáo đối soát tuần vào bảng `weekly_reconciliations` (kèm cập nhật `commission_rate`, `commission_amount` lên từng đơn).
3. `GET /stores/{store_id}/reconciliation/weekly` — Lấy tổng hợp doanh thu, hoa hồng BR-09 và đối soát nhiều tuần gần nhất cho một cửa hàng cụ thể.

## 4. Tích hợp Frontend (`Frontend/pages/revenue.html`, `Frontend/js/revenue.js`)
- Cập nhật 4 thẻ thống kê sống động: **Tổng tiền thuê**, **Phí giao nhận (0% HH)**, **Hoa hồng 12% (BR-09)**, **Thực nhận cửa hàng**.
- Hiển thị bảng **Đối soát theo tuần** chi tiết từng tuần (số đơn, tiền thuê, phí giao nhận miễn HH, hoa hồng 12%, thực nhận) cùng nút **"Chốt đối soát tuần"** gọi API thực tế (có fallback dữ liệu demo chuẩn BR-09 khi chạy offline).
