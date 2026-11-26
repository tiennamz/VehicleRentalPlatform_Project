# Thiết kế Bảo mật & Phân quyền API — Task TF14E12

**Ngày:** 2026-11-26  
**Task:** TF14E12 — Kiểm tra mã hoá mật khẩu, quyền xem ảnh giấy tờ chỉ cho vận hành viên, nhật ký truy cập 12 tháng, phân quyền API  
**Phương án đã chọn:** Cách 1 — Siết chặt JWT + RBAC toàn diện trên tất cả API nhạy cảm & quản trị; quyền xem ảnh giấy tờ tuyệt đối chỉ cho vận hành viên (Phương án B).

---

## 1. Mục tiêu & Lý do (Intent & Why)

Hệ thống hiện tại đã có nền tảng xác thực Firebase Auth + JWT, bảng nhật ký `personal_data_access_logs` và `middleware.py` định nghĩa 4 vai trò (`Admin=1`, `Khách hàng=2`, `Nhân viên=3`, `Chủ cửa hàng=4`), nhưng qua rà soát thực tế vẫn tồn tại nhiều lỗ hổng bảo mật nghiêm trọng:

1. Chưa có tiện ích và kiểm thử xác minh mã hoá mật khẩu (`bcrypt`) cũng như đảm bảo không lưu/lộ mật khẩu plaintext.
2. Ảnh giấy tờ định danh (CCCD/GPLX) đang được tải lên Cloudinary ở chế độ public (`upload`) và trả URL xem ảnh cho cả chính chủ lẫn `Chủ cửa hàng` (`RoleID.STORE_OWNER`), đồng thời API `/admin/verification/*` không kiểm tra JWT/role (nhận `staff_id` tự do qua query/header, mặc định `1`).
3. API nhật ký truy cập `/admin/audit-logs/*` hoàn toàn không có xác thực/phân quyền — bất kỳ ai cũng có thể đọc log dữ liệu cá nhân hoặc gọi `DELETE /purge`.
4. Nhiều API quản trị, vận hành, hồ sơ người dùng và đơn thuê chưa bắt buộc JWT + kiểm tra vai trò/quyền sở hữu, cho phép giả mạo `X-User-Id` hoặc bỏ qua xác thực khi không gửi token (`_get_optional_user`).

Task **TF14E12** giải quyết triệt để cả 4 hạng mục này.

---

## 2. Phạm vi: Goals, Non-Goals & Anti-Goals

### Goals (Mục tiêu bắt buộc)
1. **Mã hoá mật khẩu (`bcrypt` + kiểm chứng an toàn):**
   - Giữ Firebase Auth làm luồng đăng ký/đăng nhập chính.
   - Bổ sung hàm `hash_password(plain_password: str) -> str` và `verify_password(plain_password: str, hashed_password: str) -> bool` dùng thư viện `bcrypt` (đã có `bcrypt==5.0.0` trong `backend/requirement.txt`) tại `backend/app/core/security.py`, kèm kiểm tra đầu vào hợp lệ (không rỗng, xử lý chuẩn UTF-8 và giới hạn 72 bytes của bcrypt).
   - Bổ sung bộ kiểm thử bảo mật xác nhận: hash sinh ra luôn có salt ngẫu nhiên (cùng mật khẩu cho 2 hash khác nhau), không chứa plaintext, xác thực đúng/sai chính xác; model `User` không lưu mật khẩu plaintext và các response API không bao giờ trả trường `password` / `password_hash`.
2. **Quyền xem ảnh giấy tờ (CCCD/GPLX) tuyệt đối chỉ cho vận hành viên:**
   - Định nghĩa nhóm **Vận hành viên** gồm `RoleID.ADMIN (1)` và `RoleID.STAFF (3)` (`check_operator = require_roles(RoleID.ADMIN, RoleID.STAFF)`).
   - `upload_kyc_image_to_cloudinary()` trong `backend/app/utils/cloudinary_helper.py` bắt buộc gửi `type="private"` khi ký và tải ảnh CCCD/GPLX lên Cloudinary (không dùng public `upload`).
   - `delete_cloudinary_image_by_public_id()` sử dụng đúng `delivery_type` (`"private"` cho ảnh KYC, `"upload"` cho avatar/xe).
   - **Chỉ duy nhất** endpoint vận hành `GET /admin/verification/customers/{user_id}/kyc` (yêu cầu `check_operator`) mới được trả URL có chữ ký tạm thời (`build_viewable_kyc_url`) cho `img_id_card_before`, `img_id_card_after`, `img_license_front`, `img_license_back`.
   - **Tất cả các endpoint khác** (`GET /users/me/profile`, `PUT /users/me/profile`, `GET /users/{user_id}/profile`, `PUT /users/{user_id}/profile`, `POST /users/me/documents/id-card`, `POST /users/me/documents/driver-license`, `POST /users/{user_id}/documents/id-card`, `POST /users/{user_id}/documents/driver-license`) **tuyệt đối không trả URL ảnh giấy tờ**: các trường `img_id_card_before`, `img_id_card_after`, `img_license_front`, `img_license_back` luôn là `None`, thay vào đó trả cờ boolean `has_front_image` / `has_back_image` (hoặc `has_id_card_before` / `has_id_card_after`) cùng trạng thái xác thực (`status`, `verification_status`, `rejected_reason`, `verified_at`) và thông tin văn bản của bằng lái.
   - `Chủ cửa hàng` (`RoleID.STORE_OWNER = 4`), `Khách hàng` (`RoleID.CUSTOMER = 2`, kể cả chính chủ) và người dùng chưa đăng nhập **không bao giờ** nhận được URL ảnh CCCD/GPLX từ bất kỳ API nào.
3. **Nhật ký truy cập dữ liệu cá nhân lưu trữ tối thiểu 12 tháng:**
   - Bảo vệ `GET /admin/audit-logs/personal-data` bằng `check_operator` (`Admin`, `Nhân viên`).
   - Bảo vệ `DELETE /admin/audit-logs/personal-data/purge` bằng `check_admin` (chỉ `Admin`).
   - Duy trì cứng chính sách lưu trữ tối thiểu `MIN_RETENTION_DAYS = 365` ngày: mọi yêu cầu xoá log có `cutoff_date > now - 365 days` phải trả `403 Forbidden`; không cung cấp API sửa hoặc xoá đơn lẻ từng bản ghi log.
   - Mọi thao tác xem (`VIEW`) và duyệt/từ chối (`APPROVE`/`REJECT`) hồ sơ KYC tại `/admin/verification/*` phải ghi `accessor_id = current_user.user_id` lấy trực tiếp từ JWT đã xác thực (không nhận từ query/header), kèm `target_user_id`, `data_type`, `action`, `ip_address`, `user_agent`, `accessed_at`.
4. **Phân quyền API toàn diện (JWT + RBAC):**
   - Chuẩn hoá các dependency trong `backend/dependencies/middleware.py`:
     - `get_current_user`: bắt buộc có JWT hợp lệ (Bearer header hoặc cookie `access_token`), trả `401` nếu thiếu/hết hạn/không hợp lệ.
     - `check_admin = require_roles(RoleID.ADMIN)`
     - `check_operator = require_roles(RoleID.ADMIN, RoleID.STAFF)`
     - `check_store_owner = require_roles(RoleID.STORE_OWNER)`
     - `check_store_manager = require_roles(RoleID.ADMIN, RoleID.STORE_OWNER)`
     - `check_store_staff_or_admin = require_roles(RoleID.ADMIN, RoleID.STORE_OWNER, RoleID.STAFF)`
   - Ma trận phân quyền áp dụng cho tất cả router:

| Nhóm API | Endpoint | Quyền yêu cầu | Ghi chú kiểm tra quyền sở hữu |
|---|---|---|---|
| Public | `GET /health/check`, `GET /firebase`, `POST /auth/register`, `POST /auth/login`, `GET /vehicles`, `GET /stores/public`, `GET /delivery-config`, `POST /delivery-config/calculate-fee`, `POST /orders/calculate` | Public | Không trả dữ liệu nhạy cảm / ảnh KYC |
| Verification (KYC) | `GET /admin/verification/customers/{user_id}/kyc`, `POST /admin/verification/licenses/{license_id}/review`, `POST /admin/verification/id-cards/{info_id}/review` | `check_operator` (`Admin`, `Nhân viên`) | Bỏ `staff_id`/`X-Staff-Id`; `accessor_id = current_user.user_id`; ghi audit log |
| Audit Logs | `GET /admin/audit-logs/personal-data` | `check_operator` | Chỉ vận hành viên được tra cứu |
| Audit Logs Purge | `DELETE /admin/audit-logs/personal-data/purge` | `check_admin` | Chỉ Admin; chặn xoá log < 365 ngày (`403`) |
| Delivery Admin | `PUT /admin/delivery-config` | `check_admin` | Chỉ Admin cấu hình phí/bán kính giao xe |
| User Profile & Docs | `GET/PUT /users/me/profile`, `POST /users/me/avatar`, `POST /users/me/documents/*` | `get_current_user` | Chính chủ; **không trả URL ảnh giấy tờ** |
| User Profile by ID | `GET/PUT /users/{user_id}/profile`, `POST /users/{user_id}/avatar`, `POST /users/{user_id}/licenses`, `POST /users/{user_id}/documents/*` | `get_current_user` | Bỏ `_get_optional_user`; chỉ chính chủ hoặc `Admin` (riêng `GET` cho phép thêm `Nhân viên`, vẫn **không trả URL ảnh giấy tờ**) |
| Orders (Customer) | `POST /orders`, `GET /orders/{order_id}`, `GET /orders/my`, `GET /orders/{order_id}/cancel-preview`, `POST /orders/{order_id}/cancel` | `get_current_user` | *(Đề xuất kỹ thuật)* Với khách hàng/chủ cửa hàng: nếu không truyền `renter_id` thì mặc định dùng `current_user.user_id`; nếu truyền `renter_id != current_user.user_id` thì trả `403 Forbidden` (chống IDOR). `Admin`/`Nhân viên` có thể thao tác theo `renter_id` chỉ định. Với `GET /orders/{order_id}`, cho phép chính chủ đơn, chủ cửa hàng sở hữu xe, hoặc `Admin`/`Nhân viên` |
| Store Orders & SLA | `GET /stores/orders`, `POST /stores/orders/{order_id}/confirm`, `POST /stores/orders/{order_id}/reject` | `check_store_staff_or_admin` | *(Đề xuất kỹ thuật)* Do bảng `stores` chỉ có `owner_id` (chưa có bảng `store_staff`): `Chủ cửa hàng (4)` chỉ được thao tác trên cửa hàng có `store.owner_id == current_user.user_id` (`403` nếu khác); `Admin (1)` và `Nhân viên (3)` là vận hành viên toàn hệ thống nên thao tác được mọi cửa hàng |
| Operator SLA | `POST /orders/escalate-overdue`, `GET /operator/orders/escalated` | `check_operator` | Chỉ vận hành viên |
| Handover | `GET /orders/{order_id}/handover` | `get_current_user` | Chính chủ đơn, `Chủ cửa hàng` sở hữu xe của đơn, hoặc `Admin`/`Nhân viên` |
| Handover Confirm | `POST /orders/{order_id}/handover/staff-confirm` | `check_store_staff_or_admin` | `staff_id` lấy từ `current_user.user_id`; `Chủ cửa hàng (4)` bị giới hạn trong cửa hàng của mình, `Admin`/`Nhân viên` thao tác được mọi đơn |
| Handover Confirm | `POST /orders/{order_id}/handover/customer-confirm` | `get_current_user` | `renter_id` lấy từ `current_user.user_id` (chỉ chính chủ đơn; trả `403` nếu không phải người thuê của đơn) |
| Reconciliation | `POST /reconciliation/weekly/generate` | `check_admin` | Chỉ Admin chốt đối soát tuần |
| Reconciliation View | `GET /reconciliation/weekly`, `GET /stores/{store_id}/reconciliation/weekly` | `check_store_manager` (`Admin`, `Chủ cửa hàng`) | `Chủ cửa hàng` chỉ xem đối soát cửa hàng của chính mình (`403` nếu xem cửa hàng khác) |
| Store & Vehicle | Router `store.py`, `vehicle.py`, `price_table_routers.py` | Giữ nguyên và xác nhận không thiếu auth | Kiểm tra lại các endpoint `store.py` (`pending`, `approve`, `reject`) dùng `check_admin` chuẩn |

### Non-Goals (Ngoài phạm vi)
- Không thay thế Firebase Auth bằng hệ thống đăng nhập email/password lưu trong MySQL.
- Không thêm cột `password_hash` vào bảng `users`, không tạo bảng `store_staff` mới hoặc chạy migration thay đổi cấu trúc DB.
- *(Đề xuất kỹ thuật)* Không chạy script migrate ngược các ảnh cũ đã lưu trên Cloudinary dạng `type="upload"`; quy định `type="private"` áp dụng bắt buộc cho mọi ảnh KYC tải lên mới, còn ảnh cũ vẫn chỉ hiển thị được cho vận hành viên qua `GET /admin/verification/customers/{user_id}/kyc` và bị ẩn hoàn toàn ở mọi endpoint khác.
- Không thiết kế lại giao diện Frontend (chỉ kiểm tra tính tương thích nếu cần).

### Anti-Goals (Tuyệt đối tránh)
- Không để lại bất kỳ fallback mặc định nào kiểu `staff_id = 1` hay `X-User-Id` cho phép giả mạo danh tính trên API bảo vệ.
- Không trả URL ảnh CCCD/GPLX (kể cả signed URL) cho bất kỳ vai trò nào ngoài `Admin` và `Nhân viên` (kể cả chính chủ khách hàng hay Chủ cửa hàng).
- Không cho phép xoá nhật ký truy cập dữ liệu cá nhân dưới 12 tháng (365 ngày).

---

## 3. Ràng buộc kỹ thuật (Constraints)

- Backend: Python 3.14, FastAPI, SQLAlchemy 2.0, `PyJWT`, `bcrypt==5.0.0`, test chạy bằng `.venv\Scripts\python.exe -m pytest` trong thư mục `backend/`.
- Vai trò trong DB tuân thủ `RoleID`: `1=Admin`, `2=Khách hàng`, `3=Nhân viên`, `4=Chủ cửa hàng`.
- Khi siết JWT bắt buộc lên các router, toàn bộ các file test hiện có trong `backend/tests/` gọi các endpoint đó phải được cập nhật để đính kèm Bearer token đúng vai trò, đảm bảo toàn bộ test suite chạy xanh 100%.

---

## 4. Các phương án đã cân nhắc (Approaches)

1. **Cách 1 — Siết chặt JWT + RBAC toàn diện trên tất cả API nhạy cảm & quản trị (Đã chọn):**
   - Áp dụng `Depends(get_current_user)` và `Depends(require_roles(...))` đồng bộ trên toàn bộ router quản trị, vận hành, hồ sơ, đơn thuê, bàn giao và đối soát; bỏ hoàn toàn cơ chế tin cậy `staff_id`/`X-User-Id` không xác thực; cập nhật toàn bộ test cũ và bổ sung test bảo mật TF14E12.
   - *Lý do chọn:* Loại bỏ triệt để lỗ hổng giả mạo danh tính và đáp ứng trọn vẹn tiêu chí phân quyền API của TF14E12.
2. **Cách 2 — Chỉ siết nhóm KYC/Audit/Admin, giữ tương thích ngược `X-User-Id` cho API đơn hàng & đối soát cũ (Đã loại):**
   - Ít sửa test cũ hơn nhưng vẫn để hở nhiều endpoint nghiệp vụ quan trọng không yêu cầu JWT.

---

## 5. Phần để lại cho người triển khai (Left to Builder)

- Cách tổ chức helper kiểm tra quyền sở hữu đơn thuê/cửa hàng tái sử dụng giữa các router (ví dụ helper trong `dependencies/middleware.py` hoặc trong từng router/service).
- Cấu trúc chi tiết các file test mới (ví dụ `backend/tests/test_tf14e12_security_and_rbac.py`) và cách refactor fixture tạo JWT token cho các test cũ.
- Chi tiết thông báo lỗi tiếng Việt nhất quán cho các mã `401 Unauthorized` và `403 Forbidden`.
