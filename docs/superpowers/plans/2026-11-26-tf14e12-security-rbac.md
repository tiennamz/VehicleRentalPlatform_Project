# TF14E12 Security & API RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Task TF14E12: bcrypt password hashing verification, absolute operator-only KYC document image viewing with private Cloudinary storage, protected 12-month personal data access logs, and comprehensive JWT + RBAC API authorization across all protected routers.

**Architecture:** Extend `backend/app/core/security.py` with `bcrypt` password helpers and `backend/dependencies/middleware.py` with unified RBAC/ownership dependencies (`check_operator`, `is_operator`, `ensure_owner_or_roles`). Enforce `type="private"` KYC uploads in `cloudinary_helper.py`, strip all KYC image URLs from every non-operator endpoint in `user_services.py`, and wire mandatory JWT + RBAC dependencies onto all admin, operator, profile, order, handover, store SLA, and reconciliation routers while updating existing tests to authenticate with role-appropriate Bearer tokens.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2.0, PyJWT, `bcrypt==5.0.0`, pytest + FastAPI `TestClient` + SQLite in-memory.

**Spec:** `docs/superpowers/specs/2026-11-26-tf14e12-security-rbac-design.md`

## Global Constraints

- Role IDs are fixed in `backend/dependencies/middleware.py`: `ADMIN = 1`, `CUSTOMER = 2`, `STAFF = 3`, `STORE_OWNER = 4`.
- Operators (`Vận hành viên`) are strictly `RoleID.ADMIN (1)` and `RoleID.STAFF (3)`.
- KYC document image URLs (`img_id_card_before`, `img_id_card_after`, `img_license_front`, `img_license_back`) MUST ONLY be returned by `GET /admin/verification/customers/{user_id}/kyc` to authenticated operators (`Admin` or `Staff`). Every other endpoint MUST return `None` for those URL fields.
- New KYC uploads MUST use Cloudinary `type="private"`.
- Personal data access logs MUST enforce `MIN_RETENTION_DAYS = 365` (returning `403 Forbidden` for any purge cutoff < 365 days).
- No database schema migrations (no `password_hash` column, no `store_staff` join table).
- Run all tests from `backend/` using `..\.venv\Scripts\python.exe -m pytest`.

## Review Focus

- **Empty or >72-byte UTF-8 password passed to `hash_password` / `verify_password`:** `hash_password("")` or whitespace-only must raise `ValueError`; passwords exceeding 72 UTF-8 bytes must not crash `bcrypt==5.0.0` (raise clear `ValueError` or pre-validate cleanly) and `verify_password` with malformed hash must return `False` without raising. (Pinned in Task 1)
- **Spoofed `staff_id` / `X-Staff-Id` / `X-User-Id` headers with a valid non-privileged JWT:** Sending `?staff_id=1` or `X-Staff-Id: 1` or `X-User-Id: 1` alongside a Customer JWT MUST be ignored and still rejected with `403 Forbidden`; audit log `accessor_id` MUST always equal the authenticated JWT `current_user.user_id`. (Pinned in Task 4 & Task 5)
- **Customer IDOR via mismatched `renter_id` in order/cancel requests:** A Customer JWT (`user_id=10`) sending `POST /orders` with `renter_id=20` or `GET /orders/my?renter_id=20` MUST receive `403 Forbidden`. (Pinned in Task 5)
- **Store Owner cross-store access on orders, handover, and reconciliation:** A `STORE_OWNER` JWT owning Store A MUST receive `403 Forbidden` when confirming/rejecting Store B's orders, confirming handover on Store B's order, or viewing Store B's weekly reconciliation. (Pinned in Task 5)
- **Upload response leaking KYC URLs to the uploading customer:** Immediately after `POST /users/me/documents/id-card` or `POST /users/me/documents/driver-license`, the JSON response MUST have `img_id_card_before=None`, `img_id_card_after=None`, `img_license_front=None`, `img_license_back=None` while still setting `has_front_image=True` / `has_back_image=True`. (Pinned in Task 3)

---

### Task 1: Password Hashing Utilities & Plaintext Safety Verification

**Files:**
- Modify: `backend/app/core/security.py`
- Create: `backend/tests/test_tf14e12_security_and_rbac.py`

**Interfaces:**
- Produces in `app.core.security`:
  - `hash_password(plain_password: str) -> str`
  - `verify_password(plain_password: str, hashed_password: str) -> bool`

- [ ] **Step 1: Write failing password encryption & plaintext safety tests**

Add to `backend/tests/test_tf14e12_security_and_rbac.py`:
```python
import pytest
from app.core.security import hash_password, verify_password
from app.models.user import User


def test_bcrypt_hash_password_uses_random_salt_and_verifies():
    h1 = hash_password("StrongPass@2026")
    h2 = hash_password("StrongPass@2026")
    assert h1 != h2
    assert h1.startswith("$2b$") or h1.startswith("$2a$")
    assert "StrongPass@2026" not in h1
    assert verify_password("StrongPass@2026", h1) is True
    assert verify_password("WrongPass@2026", h1) is False


def test_bcrypt_password_edge_cases():
    with pytest.raises(ValueError):
        hash_password("")
    with pytest.raises(ValueError):
        hash_password("   ")
    with pytest.raises(ValueError):
        hash_password("a" * 73)
    assert verify_password("StrongPass@2026", "not-a-valid-bcrypt-hash") is False
    assert verify_password("", "$2b$12$invalid") is False


def test_user_model_does_not_store_plaintext_password_column():
    column_names = set(User.__table__.columns.keys())
    assert "password" not in column_names
    assert "plain_password" not in column_names
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_tf14e12_security_and_rbac.py -v`
Expected: FAIL with `ImportError: cannot import name 'hash_password' from 'app.core.security'`.

- [ ] **Step 3: Implement `hash_password` and `verify_password` in `backend/app/core/security.py`**

Implement using `bcrypt`:
- `hash_password(plain_password: str) -> str`: validate `isinstance(plain_password, str)` and `plain_password.strip() != ""`, encode UTF-8, raise `ValueError` if byte length > 72, return `bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")`.
- `verify_password(plain_password: str, hashed_password: str) -> bool`: return `False` if either argument is empty, non-string, > 72 bytes, or if `bcrypt.checkpw` raises `ValueError`.

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_tf14e12_security_and_rbac.py -v`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/security.py backend/tests/test_tf14e12_security_and_rbac.py
git commit -m "feat(TF14E12): add bcrypt password hashing utilities and plaintext safety tests"
```

---

### Task 2: Centralized RBAC & Ownership Helpers in Middleware

**Files:**
- Modify: `backend/dependencies/middleware.py`
- Modify: `backend/tests/test_tf14e12_security_and_rbac.py`

**Interfaces:**
- Produces in `dependencies.middleware`:
  - `get_user_role_ids(user: User) -> set[int]`
  - `is_admin(user: User) -> bool`
  - `is_operator(user: User) -> bool`
  - `check_operator` (`require_roles(RoleID.ADMIN, RoleID.STAFF)`)
  - `ensure_owner_or_roles(current_user: User, owner_user_id: int, allowed_role_ids: set[int], detail: str = ...) -> User`

- [ ] **Step 1: Write failing tests for middleware RBAC helpers**

Add tests in `backend/tests/test_tf14e12_security_and_rbac.py`:
- `test_middleware_role_helpers_identify_admin_and_operator`: verify `is_operator` is `True` for `RoleID.ADMIN` and `RoleID.STAFF`, `False` for `RoleID.CUSTOMER` and `RoleID.STORE_OWNER`; `is_admin` is `True` only for `RoleID.ADMIN`.
- `test_ensure_owner_or_roles_blocks_other_user_with_403`: verify owner passes, allowed role passes, unrelated customer raises `HTTPException(403)`.

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_tf14e12_security_and_rbac.py -k "middleware or ensure_owner" -v`
Expected: FAIL with `ImportError`.

- [ ] **Step 3: Implement helpers in `backend/dependencies/middleware.py`**

Add `get_user_role_ids`, `is_admin`, `is_operator`, `check_operator = require_roles(RoleID.ADMIN, RoleID.STAFF)`, and `ensure_owner_or_roles(...)`. Reuse `get_user_role_ids` inside `require_roles` to avoid duplication.

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_tf14e12_security_and_rbac.py -v`
Expected: All tests in file pass.

- [ ] **Step 5: Commit**

```bash
git add backend/dependencies/middleware.py backend/tests/test_tf14e12_security_and_rbac.py
git commit -m "feat(TF14E12): add check_operator and ownership RBAC helpers in middleware"
```

---

### Task 3: Strict Operator-Only KYC Document Viewing & Private Cloudinary Upload

**Files:**
- Modify: `backend/app/utils/cloudinary_helper.py`
- Modify: `backend/app/services/user_services.py`
- Modify: `backend/app/routers/user_routers.py`
- Modify: `backend/app/routers/booking_eligibility_routers.py` (profile & license endpoints lines 33-95)
- Modify: `backend/tests/test_user_profile_cloudinary_api.py`

**Interfaces:**
- Consumes: `get_current_user`, `ensure_owner_or_roles`, `RoleID` from `dependencies.middleware`.
- Produces:
  - `upload_kyc_image_to_cloudinary(...)` sends `"type": "private"` in `sign_params` and `form_data`.
  - `serialize_user_profile(user, id_card, lic, include_doc_urls: bool = False)` returns `None` for all 4 document URLs when `include_doc_urls=False` and adds `has_front_image: bool`, `has_back_image: bool` on both `id_card` and `driver_license`.
  - `upload_id_card_images(...)` and `upload_driver_license_images(...)` return `None` for document URLs and `has_front_image: bool`, `has_back_image: bool`.
  - All `/users/{user_id}/*` endpoints require `current_user: User = Depends(get_current_user)` (remove `_get_optional_user`).

- [ ] **Step 1: Update & add failing tests in `backend/tests/test_user_profile_cloudinary_api.py`**

Update `test_user_profile_cloudinary_api.py` to assert Option B (absolute operator-only KYC viewing):
- `test_upload_kyc_image_uses_private_delivery_type`: mock `httpx.Client.post` and assert `data["type"] == "private"` in the Cloudinary upload payload.
- `test_customer_cannot_view_own_kyc_image_urls_after_upload_or_reload`:
  - `POST /users/me/documents/id-card` -> `200`, `img_id_card_before is None`, `img_id_card_after is None`, `has_front_image is True`, `has_back_image is True`.
  - `POST /users/me/documents/driver-license` -> `200`, `img_license_front is None`, `img_license_back is None`, `has_front_image is True`.
  - `GET /users/me/profile` -> `200`, `id_card["img_id_card_before"] is None`, `id_card["has_front_image"] is True`, `driver_license["img_license_front"] is None`, `driver_license["has_front_image"] is True`.
  - `GET /users/10/profile` without token -> `401`.
  - `GET /users/10/profile` with another customer token -> `403`.
  - `GET /users/10/profile` with `STORE_OWNER` token -> `403`.
  - `POST /users/10/documents/id-card` without token -> `401`.

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_user_profile_cloudinary_api.py -v`
Expected: FAIL because URLs are still returned and unauthenticated `/users/10/profile` returns 200.

- [ ] **Step 3: Implement private Cloudinary upload and strict KYC URL masking**

1. In `backend/app/utils/cloudinary_helper.py`:
   - In `upload_kyc_image_to_cloudinary`, add `"type": "private"` to `sign_params` (which is also included in `form_data`).
   - In `user_services.py`, when cleaning up failed KYC uploads with `delete_cloudinary_image_by_public_id(pid, delivery_type="private")`, pass `delivery_type="private"`.
2. In `backend/app/services/user_services.py`:
   - In `serialize_user_profile`, default `include_sensitive_docs: bool = True` (keep metadata visible to owner/operator) and add `include_doc_urls: bool = False`. Always emit `has_front_image: bool(id_card.img_id_card_before)` / `has_back_image: bool(id_card.img_id_card_after)` (and similarly for `driver_license`). Set `img_id_card_before`, `img_id_card_after`, `img_license_front`, `img_license_back` to `build_viewable_kyc_url(...) if include_doc_urls else None`.
   - In `upload_id_card_images` and `upload_driver_license_images`, return `None` for the `img_*` fields and include `has_front_image` and `has_back_image`.
3. In `backend/app/routers/user_routers.py`:
   - Remove `_get_optional_user`.
   - Require `current_user: User = Depends(get_current_user)` on `POST /{user_id}/avatar`, `POST /{user_id}/documents/id-card`, `POST /{user_id}/documents/driver-license` and enforce `ensure_owner_or_roles(current_user, user_id, {RoleID.ADMIN})`.
4. In `backend/app/routers/booking_eligibility_routers.py`:
   - Require `current_user: User = Depends(get_current_user)` on `GET /users/{user_id}/profile`, `PUT /users/{user_id}/profile`, `POST /users/{user_id}/licenses`.
   - On `GET /users/{user_id}/profile`: allow only owner or `{RoleID.ADMIN, RoleID.STAFF}` (block `STORE_OWNER` and other customers with `403`), and call `get_personal_profile(db=db, user_id=user_id, include_sensitive_docs=True)` which returns `img_* = None` (document URLs strictly come from `/admin/verification/customers/{user_id}/kyc`).
   - On `PUT /users/{user_id}/profile` and `POST /users/{user_id}/licenses`: enforce `ensure_owner_or_roles(current_user, user_id, {RoleID.ADMIN})`.

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_user_profile_cloudinary_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/cloudinary_helper.py backend/app/services/user_services.py backend/app/routers/user_routers.py backend/app/routers/booking_eligibility_routers.py backend/tests/test_user_profile_cloudinary_api.py
git commit -m "feat(TF14E12): enforce private KYC uploads and hide document URLs from non-operators"
```

---

### Task 4: Operator-Only Verification & 12-Month Audit Log RBAC

**Files:**
- Modify: `backend/app/routers/verification_routers.py`
- Modify: `backend/app/routers/audit_routers.py`
- Modify: `backend/tests/test_verification_api.py`
- Modify: `backend/tests/test_tf14e12_security_and_rbac.py`

**Interfaces:**
- Consumes: `check_operator`, `check_admin` from `dependencies.middleware`.
- Produces:
  - `GET /admin/verification/customers/{user_id}/kyc` -> `Depends(check_operator)`, returns signed private URLs via `build_viewable_kyc_url`, records `PersonalDataAccessLog(accessor_id=current_user.user_id, action="VIEW")`.
  - `POST /admin/verification/licenses/{license_id}/review` and `POST /admin/verification/id-cards/{info_id}/review` -> `Depends(check_operator)`, `staff_user_id=current_user.user_id`.
  - `GET /admin/audit-logs/personal-data` -> `Depends(check_operator)`.
  - `DELETE /admin/audit-logs/personal-data/purge` -> `Depends(check_admin)`.

- [ ] **Step 1: Update `test_verification_api.py` and add failing RBAC/audit tests**

- Update `backend/tests/test_verification_api.py` to seed `Role` + `UserRole` for Admin (`1`), Staff (`3`), Customer (`2`), Store Owner (`4`) and send Bearer tokens on authorized requests.
- Add tests asserting:
  - Unauthenticated calls to `/admin/verification/*` and `/admin/audit-logs/*` return `401`.
  - Customer and Store Owner tokens (even with `?staff_id=1` and `X-Staff-Id: 1`) receive `403` on `/admin/verification/customers/2/kyc`, review endpoints, and `/admin/audit-logs/personal-data`.
  - Staff (`role_id=3`) token succeeds (`200`) on `GET /admin/verification/customers/2/kyc`, receives signed KYC URLs, records `PersonalDataAccessLog` with `accessor_id == staff.user_id` (ignoring `?staff_id=1`), succeeds (`200`) on `GET /admin/audit-logs/personal-data`, and receives `403` on `DELETE /admin/audit-logs/personal-data/purge`.
  - Admin (`role_id=1`) token receives `403` on `DELETE /admin/audit-logs/personal-data/purge` with cutoff < 365 days, and `200` with cutoff > 365 days.

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_verification_api.py -v`
Expected: FAIL because endpoints currently allow unauthenticated/non-operator access.

- [ ] **Step 3: Lock down `verification_routers.py` and `audit_routers.py`**

- In `backend/app/routers/verification_routers.py`: remove `get_accessor_id`; add `current_user: User = Depends(check_operator)` to all 3 endpoints; pass `staff_user_id=current_user.user_id`; on `review_id_card_endpoint`, also wrap `img_id_card_before` / `img_id_card_after` with `build_viewable_kyc_url(...)`.
- In `backend/app/routers/audit_routers.py`: add `current_user: User = Depends(check_operator)` to `get_audit_logs_endpoint` and `current_user: User = Depends(check_admin)` to `purge_audit_logs_endpoint`.

- [ ] **Step 4: Run tests to verify they pass**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_verification_api.py tests/test_audit_log_service.py tests/test_verification_services.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/verification_routers.py backend/app/routers/audit_routers.py backend/tests/test_verification_api.py
git commit -m "feat(TF14E12): enforce operator RBAC on KYC verification and 12-month audit logs"
```

---

### Task 5: Comprehensive API RBAC on Delivery, Orders, Cancellation, Handover, Store SLA & Reconciliation

**Files:**
- Modify: `backend/app/routers/delivery_routers.py`
- Modify: `backend/app/schemas/booking_eligibility_schemas.py`
- Modify: `backend/app/routers/booking_eligibility_routers.py`
- Modify: `backend/app/routers/order_cancellation_history_routers.py`
- Modify: `backend/app/routers/handover_confirmation_routers.py`
- Modify: `backend/app/routers/store_order_confirmation_routers.py`
- Modify: `backend/app/routers/reconciliation_routers.py`
- Modify: `backend/app/routers/store.py`
- Modify existing tests to authenticate with role-appropriate Bearer tokens:
  - `backend/tests/test_delivery_config_and_fee.py`
  - `backend/tests/test_tf13d97_age_and_booking_guard.py`
  - `backend/tests/test_order_creation_and_br03.py`
  - `backend/tests/test_order_refund_br04_and_history.py`
  - `backend/tests/test_dual_handover_confirmation.py`
  - `backend/tests/test_store_order_confirmation_sla.py`
  - `backend/tests/test_commission_br09_and_reconciliation.py`

**Interfaces:**
- Consumes: `get_current_user`, `check_admin`, `check_operator`, `check_store_manager`, `check_store_staff_or_admin`, `is_admin`, `is_operator`, `RoleID` from `dependencies.middleware`.
- Ownership rules:
  - `PUT /admin/delivery-config` -> `Depends(check_admin)`.
  - `POST /orders`: `OrderCreateSchema.renter_id: Optional[int] = None`; non-operator gets `403` if `renter_id` is set and `!= current_user.user_id`, otherwise bound to `current_user.user_id`.
  - `GET /orders/{order_id}`: `get_current_user`; allow renter, owning store's `owner_id`, or `is_operator(current_user)`; else `403`.
  - `GET /orders/my`, `GET /orders/{order_id}/cancel-preview`, `POST /orders/{order_id}/cancel`: `get_current_user`; remove `X-User-Id` trust; non-operator gets `403` if explicit `renter_id != current_user.user_id`, otherwise bound to `current_user.user_id`.
  - `GET /orders/{order_id}/handover`: `get_current_user`; allow renter, owning store's `owner_id`, or `is_operator(current_user)`; else `403`.
  - `POST /orders/{order_id}/handover/staff-confirm`: `check_store_staff_or_admin`; if not `is_operator(current_user)`, verify `store.owner_id == current_user.user_id` (`403` otherwise); `staff_id = current_user.user_id`.
  - `POST /orders/{order_id}/handover/customer-confirm`: `get_current_user`; `renter_id = current_user.user_id` (403 if not order's renter).
  - `GET /stores/orders`, `POST /stores/orders/{order_id}/confirm`, `POST /stores/orders/{order_id}/reject`: `check_store_staff_or_admin`; if not `is_operator(current_user)`, enforce `owner_id = current_user.user_id` (403 if requesting another store's `store_id`/`owner_id`).
  - `POST /orders/escalate-overdue`, `GET /operator/orders/escalated`: `check_operator`.
  - `POST /reconciliation/weekly/generate`: `check_admin`.
  - `GET /reconciliation/weekly`, `GET /stores/{store_id}/reconciliation/weekly`: `check_store_manager`; if not `is_admin(current_user)`, verify `store.owner_id == current_user.user_id` (`403` otherwise).
  - `backend/app/routers/store.py`: replace local `check_admin` helper on `pending`, `approve`, `reject` with `Depends(check_admin)` from `dependencies.middleware`.

- [ ] **Step 1: Add failing API RBAC tests for these endpoint groups in `backend/tests/test_tf14e12_security_and_rbac.py`**

Cover for each group:
- Unauthenticated -> `401`
- Wrong role -> `403` (Customer calling `/admin/delivery-config`, `/reconciliation/weekly/generate`, `/operator/orders/escalated`, `/stores/orders`, `/handover/staff-confirm`)
- Customer IDOR (`renter_id` mismatch on `POST /orders`, `GET /orders/my`) -> `403`
- Store Owner cross-store access (Store A owner accessing Store B's orders, handover, or reconciliation) -> `403`
- Authorized role -> `200` / `201`

- [ ] **Step 2: Run new RBAC tests to verify they fail**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest tests/test_tf14e12_security_and_rbac.py -v`
Expected: New RBAC tests FAIL (endpoints return 200/422 instead of 401/403).

- [ ] **Step 3: Apply JWT + RBAC & ownership guards across all 8 router/schema files**

Apply the exact rules from the Interfaces block above to:
1. `backend/app/routers/delivery_routers.py`
2. `backend/app/schemas/booking_eligibility_schemas.py` & `backend/app/routers/booking_eligibility_routers.py`
3. `backend/app/routers/order_cancellation_history_routers.py`
4. `backend/app/routers/handover_confirmation_routers.py`
5. `backend/app/routers/store_order_confirmation_routers.py`
6. `backend/app/routers/reconciliation_routers.py`
7. `backend/app/routers/store.py`

- [ ] **Step 4: Update existing test suites to send role-appropriate Bearer tokens**

Update the 7 existing test files so each test authenticates with a valid JWT token matching its role (`Admin`, `Customer`, `Staff`, `Store Owner`) instead of unauthenticated calls or `X-User-Id` headers.

- [ ] **Step 5: Run full backend test suite**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest -q`
Expected: All tests PASS with 0 failures and 0 errors.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/ backend/app/schemas/booking_eligibility_schemas.py backend/tests/
git commit -m "feat(TF14E12): enforce JWT and RBAC across admin, operator, store, order, and reconciliation APIs"
```

---

### Task 6: Final Verification & Audit Check

**Files:**
- Verify: all modified files and `backend/tests/test_tf14e12_security_and_rbac.py`

- [ ] **Step 1: Audit all routes registered on `app.routes` to verify no protected endpoint lacks auth**

Add an automated route-audit test `test_all_protected_routes_require_authentication` in `backend/tests/test_tf14e12_security_and_rbac.py` that enumerates `app.routes`, excludes the explicit public whitelist (`/health/check`, `/firebase`, `/auth/register`, `/auth/login`, `/vehicles`, `/stores/public`, `/delivery-config`, `/delivery-config/calculate-fee`, `/orders/calculate`, OpenAPI/docs), and asserts every remaining route has a FastAPI auth dependency (`get_current_user` or `require_roles`).

- [ ] **Step 2: Run the entire backend test suite with verbose summary**

Run from `backend/`: `..\.venv\Scripts\python.exe -m pytest -v`
Expected: 100% PASS.

- [ ] **Step 3: Commit final verification test**

```bash
git add backend/tests/test_tf14e12_security_and_rbac.py
git commit -m "test(TF14E12): add automated route auth audit test"
```
