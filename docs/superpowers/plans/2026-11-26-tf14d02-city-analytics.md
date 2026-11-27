# TF14D02 City Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build city-level analytics reporting order count, total transaction value (GMV), cancellation rate, and complaint rate per city (plus platform-wide summary) via `GET /admin/analytics/cities` protected by operator RBAC.

**Architecture:** Add `backend/app/services/city_analytics_services.py` and `backend/app/routers/city_analytics_routers.py` querying existing `City`, `Store`, `Vehicle`, `Order`, `Complaint` tables with zero DB/model changes. Register router in `backend/app/main.py`.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2.0, pytest + FastAPI `TestClient` + SQLite in-memory.

**Spec:** `docs/superpowers/specs/2026-11-26-tf14d02-city-analytics-design.md`

## Global Constraints

- Zero DB schema or SQLAlchemy model changes (TiDB untouched).
- `GET /admin/analytics/cities` requires `Depends(check_operator)` (`Admin = 1`, `Nhân viên = 3`).
- `total_transaction_value` = sum of `orders.total_amount` excluding cancelled (`Đã hủy`, `Cancelled`) and rejected (`Cửa hàng từ chối`, `Từ chối`, `Rejected`) orders.
- `cancellation_rate` = `round(cancelled_orders / total_orders * 100, 2)` (`0.0` when `total_orders == 0`).
- `complaint_rate` = `round(complained_orders / total_orders * 100, 2)` where `complained_orders` counts distinct `order_id`s with >= 1 complaint (`0.0` when `total_orders == 0`).
- Run all tests from `backend/` via `..\.venv\Scripts\python.exe -m pytest`.

## Review Focus

- **City with 0 orders:** Must still appear in `cities` with `total_orders=0`, `total_transaction_value=0.0`, `cancellation_rate=0.0`, `complaint_rate=0.0` (no ZeroDivisionError). (Pinned in Task 1)
- **Multiple complaints on the same order:** Two complaints on 1 order out of 2 orders in a city MUST give `complained_orders=1`, `total_complaints=2`, `complaint_rate=50.0` (NOT 100.0%). (Pinned in Task 1)
- **Invalid date range (`from_date > to_date`) and nonexistent `city_id`:** `from_date > to_date` -> `422`; nonexistent `city_id` -> `404`. (Pinned in Task 1 & Task 2)
- **RBAC enforcement:** Unauthenticated -> `401`; Customer/Store Owner -> `403`; Admin/Staff -> `200`. (Pinned in Task 2)

---

### Task 1: City Analytics Service (`city_analytics_services.py`)

**Files:**
- Create: `backend/app/services/city_analytics_services.py`
- Create: `backend/tests/test_tf14d02_city_analytics.py`

**Interfaces:**
- Produces in `app.services.city_analytics_services`:
  - `get_city_analytics_report(db: Session, from_date: Optional[date] = None, to_date: Optional[date] = None, city_id: Optional[int] = None) -> Dict[str, Any]`

- [ ] **Step 1: Write failing unit tests covering multi-city aggregation, 0-order city, duplicate complaints on same order, date range filter, invalid range 422, nonexistent city 404**
- [ ] **Step 2: Run `pytest tests/test_tf14d02_city_analytics.py -v` and confirm RED**
- [ ] **Step 3: Implement `city_analytics_services.py`**
- [ ] **Step 4: Run `pytest tests/test_tf14d02_city_analytics.py -v` and confirm GREEN**

---

### Task 2: City Analytics Router (`city_analytics_routers.py`) & Full Verification

**Files:**
- Create: `backend/app/routers/city_analytics_routers.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_tf14d02_city_analytics.py`

- [ ] **Step 1: Add failing API tests for `GET /admin/analytics/cities` (401, 403 for customer/owner, 200 for staff/admin, date & city_id filters)**
- [ ] **Step 2: Run API test and confirm RED**
- [ ] **Step 3: Create `city_analytics_routers.py` and include in `main.py`**
- [ ] **Step 4: Run full pytest suite (`pytest --tb=short -q`), verify GREEN, commit & push `feature/task-TF14D02`**
