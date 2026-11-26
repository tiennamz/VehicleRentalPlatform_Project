# TF14C2C System Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build centralized system configuration management (commission rate, reservation hold time, cancellation policy, late return fee) with Admin-only update API and wire all 4 domain modules to read live values from `system_config`.

**Architecture:** Add `backend/app/schemas/system_config_schemas.py`, `backend/app/services/system_config_services.py`, and `backend/app/routers/system_config_routers.py` backed by the existing `system_config` key-value table. Update `reconciliation_services.py`, `booking_eligibility_services.py`, `store_order_confirmation_services.py`, and `order_cancellation_history_services.py` to read directly from `system_config_services`.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2.0, Pydantic v2, pytest + FastAPI `TestClient` + SQLite in-memory.

**Spec:** `docs/superpowers/specs/2026-11-26-tf14c2c-system-config-design.md`

## Global Constraints

- Reuse existing `system_config` table (`config_key`, `config_value`, `description`, `created_at`) — no DB migration.
- `PUT /admin/system-config` requires `Depends(check_admin)` (`RoleID.ADMIN = 1`); `GET /system-config` is public; `POST /orders/{order_id}/late-fee/calculate` requires `Depends(get_current_user)` with renter/store-owner/operator ownership check.
- `hold_time_minutes` writes symmetrically to both `hold_time_minutes` and `store_confirmation_timeout_minutes` keys.
- Run all tests from `backend/` via `..\.venv\Scripts\python.exe -m pytest`.

## Review Focus

- **Partial update violating cross-field cancellation constraints:** Updating only `cancel_partial_refund_hours=30` when stored `cancel_full_refund_hours=24` MUST fail with `422`/`400` because cross-field validation runs against the merged config. (Pinned in Task 1)
- **Late return fee exact boundaries:** Returning early or exactly at `end_time + grace_minutes` -> `0.00`; returning `grace_minutes + 1` minute late -> `1 * late_return_fee_per_hour`; `grace_minutes + 61` minutes late -> `2 * late_return_fee_per_hour`. (Pinned in Task 1)
- **Dynamic config propagation across all 4 modules:** Changing config via `PUT /admin/system-config` immediately affects: (1) `generate_weekly_reconciliation` / `get_weekly_reconciliation_report` commission rate, (2) `create_rental_order` `confirmation_deadline` and `store_order_confirmation_services` timeout, (3) `preview_order_cancellation` / `cancel_order_with_br04` refund rate, and (4) `POST /orders/{order_id}/late-fee/calculate`. (Pinned in Task 2 & Task 3)
- **Non-admin blocked from updating system config & cross-user blocked from late-fee calculation:** Unauthenticated -> `401`; Customer/Staff/Store Owner calling `PUT /admin/system-config` -> `403`; unrelated Customer calling `POST /orders/{order_id}/late-fee/calculate` -> `403`. (Pinned in Task 3)
- **Route auth audit compatibility:** `GET /system-config` added to public whitelist in `test_all_protected_routes_require_authentication` so the TF14E12 route audit remains 100% green. (Pinned in Task 3)

---

### Task 1: Centralized System Config Schemas, Service & Late Return Fee Calculation

**Files:**
- Create: `backend/app/schemas/system_config_schemas.py`
- Create: `backend/app/services/system_config_services.py`
- Create: `backend/tests/test_tf14c2c_system_config.py`

**Interfaces:**
- Produces in `app.schemas.system_config_schemas`:
  - `SystemConfigUpdateSchema` (all 9 fields optional for partial/full update with field bounds)
  - `LateReturnFeeCalculateRequestSchema` (`actual_return_time: Optional[datetime] = None`)
- Produces in `app.services.system_config_services`:
  - `DEFAULT_SYSTEM_CONFIG: dict[str, tuple[str, str]]`
  - `get_system_config(db: Optional[Session]) -> dict[str, Any]`
  - `update_system_config(db: Session, payload: SystemConfigUpdateSchema) -> dict[str, Any]`
  - `get_hold_time_minutes(db: Session) -> int`
  - `calculate_late_return_fee(db: Session, expected_end_time: datetime, actual_return_time: Optional[datetime] = None) -> dict[str, Any]`

- [ ] **Step 1: Write failing unit tests for defaults, partial/full update, cross-field validation, and late fee boundaries**
- [ ] **Step 2: Run `pytest tests/test_tf14c2c_system_config.py -v` and confirm RED**
- [ ] **Step 3: Implement `system_config_schemas.py` and `system_config_services.py`**
- [ ] **Step 4: Run `pytest tests/test_tf14c2c_system_config.py -v` and confirm GREEN**

---

### Task 2: Wire All 4 Domain Modules to Read from `system_config_services`

**Files:**
- Modify: `backend/app/services/reconciliation_services.py` (`get_commission_rate`)
- Modify: `backend/app/services/booking_eligibility_services.py` (`create_rental_order` `confirmation_deadline`)
- Modify: `backend/app/services/store_order_confirmation_services.py` (`get_confirmation_timeout_minutes`)
- Modify: `backend/app/services/order_cancellation_history_services.py` (`calculate_refund_br04`, `preview_order_cancellation`, `cancel_order_with_br04`)
- Modify: `backend/tests/test_tf14c2c_system_config.py`

**Interfaces:**
- Consumes: `get_system_config`, `get_hold_time_minutes` from `app.services.system_config_services`.

- [ ] **Step 1: Add failing integration tests proving that updating `system_config` changes commission rate, order hold deadline, store SLA timeout, and BR-04 cancellation refund tiers**
- [ ] **Step 2: Run tests and confirm RED**
- [ ] **Step 3: Update all 4 services to read dynamically from `system_config_services`**
- [ ] **Step 4: Run tests and confirm GREEN**

---

### Task 3: System Config & Late Fee API Router + RBAC & Route Audit

**Files:**
- Create: `backend/app/routers/system_config_routers.py`
- Modify: `backend/app/main.py` (register `system_config_routers`)
- Modify: `backend/tests/test_tf14e12_security_and_rbac.py` (add `("GET", "/system-config")` to `public_whitelist`)
- Modify: `backend/tests/test_tf14c2c_system_config.py`

**Interfaces:**
- `GET /system-config` -> public
- `PUT /admin/system-config` -> `Depends(check_admin)`
- `POST /orders/{order_id}/late-fee/calculate` -> `Depends(get_current_user)` (renter, owning store owner, or operator)

- [ ] **Step 1: Add failing API tests for `GET /system-config`, `PUT /admin/system-config` (401/403/200/422), and `POST /orders/{order_id}/late-fee/calculate` (401/403/200)**
- [ ] **Step 2: Run tests and confirm RED**
- [ ] **Step 3: Create `system_config_routers.py`, include in `main.py`, update route-audit whitelist**
- [ ] **Step 4: Run full pytest suite (`pytest --tb=short -v`) and confirm GREEN**

---

### Task 4: Commit & Push `feature/task-TF14C2C`

- [ ] **Step 1: Verify `git status` and commit all TF14C2C files on `feature/task-TF14C2C`**
- [ ] **Step 2: Push `feature/task-TF14C2C` to `origin`**
