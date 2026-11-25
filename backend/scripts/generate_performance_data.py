
import random
from datetime import datetime, date, timedelta
from time import perf_counter

from sqlalchemy import text
from app.database.database import engine


CITY_ID = 2
CITY_NAME = "Đà Nẵng"

OWNER_NAME = "Nguyễn Minh Hoàng"
OWNER_EMAIL = "owner@gmail.com"

STORE_NAME = "MotoGo Performance Test Store"
STORE_ADDRESS = "123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng"
ORDER_MARKER = "[PERF_TEST_DATA] Đà Nẵng"
PRICE_TYPE = "PERF_TEST_DAILY"

RENTERS = [
    ("Nguyễn Văn An", "nguyenvanan@gmail.com"),
    ("Trần Minh Đức", "tranminhduc@gmail.com"),
    ("Lê Hoàng Nam", "lehoangnam@gmail.com"),
    ("Phạm Quốc Bảo", "phamquocbao@gmail.com"),
    ("Hoàng Minh Tuấn", "hoangminhtuan@gmail.com"),
    ("Võ Thành Đạt", "vothanhdat@gmail.com"),
    ("Đặng Anh Khoa", "danganhkhoa@gmail.com"),
    ("Bùi Gia Huy", "buigiahuy@gmail.com"),
    ("Đỗ Minh Khánh", "dominhkhanh@gmail.com"),
    ("Ngô Đức Anh", "ngoducanh@gmail.com"),
]

VEHICLES = [
    ("Honda", "Vision", "43A-123.45", "Xe tay ga", 2023, 110, 180000),
    ("Honda", "Air Blade", "43A-124.56", "Xe tay ga", 2024, 160, 220000),
    ("Yamaha", "Grande", "43A-125.67", "Xe tay ga", 2023, 125, 200000),
    ("Honda", "SH Mode", "43A-126.78", "Xe tay ga", 2024, 125, 280000),
    ("Honda", "Lead", "43A-127.89", "Xe tay ga", 2022, 125, 190000),
    ("Yamaha", "Janus", "43A-128.90", "Xe tay ga", 2023, 125, 170000),
    ("Yamaha", "Exciter 155", "43A-129.01", "Xe số", 2024, 155, 250000),
    ("Honda", "Wave Alpha", "43A-130.12", "Xe số", 2023, 110, 130000),
    ("Honda", "Future", "43A-131.23", "Xe số", 2024, 125, 160000),
    ("Yamaha", "Sirius", "43A-132.34", "Xe số", 2022, 110, 140000),
    ("Honda", "Winner X", "43A-135.79", "Xe số", 2024, 150, 250000),
    ("Toyota", "Vios", "43A-246.80", "Ô tô 4 chỗ", 2023, 1500, 850000),
]


def generate_random_phone(conn):
    prefixes = [
        "032", "033", "034", "035", "036",
        "037", "038", "039", "070", "076",
        "077", "078", "079", "081", "082",
        "083", "084", "085", "086", "088",
        "089", "090", "091", "092", "093",
        "094", "096", "097", "098", "099"
    ]

    while True:
        phone = random.choice(prefixes) + "".join(
            random.choices("0123456789", k=7)
        )

        exists = conn.execute(
            text("""
                SELECT user_id
                FROM users
                WHERE phone_number = :phone
            """),
            {"phone": phone}
        ).scalar_one_or_none()

        if exists is None:
            return phone


def get_role_id(conn, role_name):
    role_id = conn.execute(
        text("""
            SELECT role_id
            FROM roles
            WHERE role_name = :role_name
        """),
        {"role_name": role_name}
    ).scalar_one_or_none()

    if role_id is None:
        raise ValueError(f"Không tìm thấy role: {role_name}")

    return role_id


def get_or_create_user(
    conn,
    fullname,
    email,
    role_id,
    birthday
):
    existing_user = conn.execute(
        text("""
            SELECT user_id, fullname
            FROM users
            WHERE email = :email
        """),
        {"email": email}
    ).mappings().first()

    if existing_user:
        if existing_user["fullname"] != fullname:
            raise ValueError(
                f"Email {email} đã thuộc về một tài khoản khác. "
                "Dừng để tránh sử dụng nhầm tài khoản."
            )

        user_id = existing_user["user_id"]

    else:
        phone = generate_random_phone(conn)

        result = conn.execute(
            text("""
                INSERT INTO users (
                    fullname,
                    email,
                    phone_number,
                    status,
                    created_at,
                    date_of_birth
                )
                VALUES (
                    :fullname,
                    :email,
                    :phone,
                    'Hoạt động',
                    :created_at,
                    :birthday
                )
            """),
            {
                "fullname": fullname,
                "email": email,
                "phone": phone,
                "created_at": datetime.now(),
                "birthday": birthday
            }
        )

        user_id = result.lastrowid

    existing_role = conn.execute(
        text("""
            SELECT user_id
            FROM user_role
            WHERE user_id = :user_id
            AND role_id = :role_id
        """),
        {
            "user_id": user_id,
            "role_id": role_id
        }
    ).scalar_one_or_none()

    if existing_role is None:
        conn.execute(
            text("""
                INSERT INTO user_role (user_id, role_id)
                VALUES (:user_id, :role_id)
            """),
            {
                "user_id": user_id,
                "role_id": role_id
            }
        )

    return user_id


def get_or_create_store(conn, owner_id, owner_phone):
    store = conn.execute(
        text("""
            SELECT store_id
            FROM stores
            WHERE owner_id = :owner_id
            AND store_name = :store_name
        """),
        {
            "owner_id": owner_id,
            "store_name": STORE_NAME
        }
    ).scalar_one_or_none()

    if store is not None:
        return store

    result = conn.execute(
        text("""
            INSERT INTO stores (
                owner_id,
                store_name,
                address,
                contact,
                status,
                city_id
            )
            VALUES (
                :owner_id,
                :store_name,
                :address,
                :contact,
                'Đã duyệt',
                :city_id
            )
        """),
        {
            "owner_id": owner_id,
            "store_name": STORE_NAME,
            "address": STORE_ADDRESS,
            "contact": owner_phone,
            "city_id": CITY_ID
        }
    )

    return result.lastrowid


def get_or_create_vehicle(conn, store_id, vehicle):
    (
        brand,
        model,
        license_plate,
        vehicle_type,
        year,
        capacity,
        price
    ) = vehicle

    existing_vehicle = conn.execute(
        text("""
            SELECT vehicle_id, store_id
            FROM vehicles
            WHERE license_plate = :license_plate
        """),
        {"license_plate": license_plate}
    ).mappings().first()

    if existing_vehicle:
        if existing_vehicle["store_id"] != store_id:
            raise ValueError(
                f"Biển số {license_plate} đã thuộc cửa hàng khác."
            )

        return existing_vehicle["vehicle_id"], price

    result = conn.execute(
        text("""
            INSERT INTO vehicles (
                store_id,
                brand,
                license_plate,
                type,
                status,
                model,
                manufacture_year,
                engine_capacity,
                description
            )
            VALUES (
                :store_id,
                :brand,
                :license_plate,
                :vehicle_type,
                'Sẵn sàng',
                :model,
                :year,
                :capacity,
                :description
            )
        """),
        {
            "store_id": store_id,
            "brand": brand,
            "license_plate": license_plate,
            "vehicle_type": vehicle_type,
            "model": model,
            "year": year,
            "capacity": capacity,
            "description": f"{brand} {model} - Xe dữ liệu kiểm thử performance"
        }
    )

    return result.lastrowid, price


def get_or_create_price(conn, vehicle_id, amount, now):
    price_id = conn.execute(
        text("""
            SELECT price_id
            FROM price_tables
            WHERE vehicle_id = :vehicle_id
            AND price_type = :price_type
        """),
        {
            "vehicle_id": vehicle_id,
            "price_type": PRICE_TYPE
        }
    ).scalar_one_or_none()

    if price_id is not None:
        return price_id

    result = conn.execute(
        text("""
            INSERT INTO price_tables (
                vehicle_id,
                effective_from,
                effective_to,
                amount,
                price_type
            )
            VALUES (
                :vehicle_id,
                :effective_from,
                :effective_to,
                :amount,
                :price_type
            )
        """),
        {
            "vehicle_id": vehicle_id,
            "effective_from": now - timedelta(days=365),
            "effective_to": now + timedelta(days=365),
            "amount": amount,
            "price_type": PRICE_TYPE
        }
    )

    return result.lastrowid


def get_or_create_order(
    conn,
    renter_id,
    vehicle_id,
    price_id,
    start_time,
    end_time,
    amount
):
    existing_order = conn.execute(
        text("""
            SELECT order_id
            FROM orders
            WHERE renter_id = :renter_id
            AND vehicle_id = :vehicle_id
            AND start_time = :start_time
            AND delivery_address = :marker
        """),
        {
            "renter_id": renter_id,
            "vehicle_id": vehicle_id,
            "start_time": start_time,
            "marker": ORDER_MARKER
        }
    ).scalar_one_or_none()

    if existing_order is not None:
        return existing_order

    duration_days = (end_time - start_time).total_seconds() / 86400
    total_amount = round(amount * duration_days, 2)

    created_at = min(
        start_time - timedelta(days=7),
        datetime.now()
    )

    result = conn.execute(
        text("""
            INSERT INTO orders (
                renter_id,
                vehicle_id,
                price_id,
                start_time,
                end_time,
                total_amount,
                order_status,
                created_at,
                delivery_method,
                delivery_address,
                delivery_distance_km,
                delivery_fee
            )
            VALUES (
                :renter_id,
                :vehicle_id,
                :price_id,
                :start_time,
                :end_time,
                :total_amount,
                'Chờ thanh toán',
                :created_at,
                'Nhận tại cửa hàng',
                :marker,
                0,
                0
            )
        """),
        {
            "renter_id": renter_id,
            "vehicle_id": vehicle_id,
            "price_id": price_id,
            "start_time": start_time,
            "end_time": end_time,
            "total_amount": total_amount,
            "created_at": created_at,
            "marker": ORDER_MARKER
        }
    )

    return result.lastrowid


def main():
    start_timer = perf_counter()
    now = datetime.now()

    with engine.begin() as conn:

        city_exists = conn.execute(
            text("""
                SELECT city_id
                FROM cities
                WHERE city_id = :city_id
            """),
            {"city_id": CITY_ID}
        ).scalar_one_or_none()

        if city_exists is None:
            raise ValueError(
                f"Không tìm thấy thành phố {CITY_NAME}, "
                f"city_id={CITY_ID}"
            )

        customer_role_id = get_role_id(conn, "Khách hàng")
        owner_role_id = get_role_id(conn, "Chủ cửa hàng")

        owner_id = get_or_create_user(
            conn,
            OWNER_NAME,
            OWNER_EMAIL,
            owner_role_id,
            date(1990, 1, 15)
        )

        owner_phone = conn.execute(
            text("""
                SELECT phone_number
                FROM users
                WHERE user_id = :user_id
            """),
            {"user_id": owner_id}
        ).scalar_one()

        renter_ids = []

        for index, (fullname, email) in enumerate(RENTERS):
            renter_id = get_or_create_user(
                conn,
                fullname,
                email,
                customer_role_id,
                date(1995 + index % 5, 1, 15)
            )

            renter_ids.append(renter_id)

        store_id = get_or_create_store(
            conn,
            owner_id,
            owner_phone
        )

        vehicle_data = []

        for vehicle in VEHICLES:
            vehicle_id, price = get_or_create_vehicle(
                conn,
                store_id,
                vehicle
            )

            price_id = get_or_create_price(
                conn,
                vehicle_id,
                price,
                now
            )

            vehicle_data.append(
                (vehicle_id, price_id, price)
            )

        for vehicle_index, (
            vehicle_id,
            price_id,
            price
        ) in enumerate(vehicle_data):

            for order_index in range(10):
                renter_id = renter_ids[
                    (vehicle_index + order_index) % len(renter_ids)
                ]

                day_offset = -35 + order_index * 7

                start_date = now.date() + timedelta(
                    days=day_offset
                )

                start_time = datetime.combine(
                    start_date,
                    datetime.min.time()
                ).replace(hour=8)

                end_time = start_time + timedelta(days=2)

                get_or_create_order(
                    conn,
                    renter_id,
                    vehicle_id,
                    price_id,
                    start_time,
                    end_time,
                    price
                )

        vehicle_count = conn.execute(
            text("""
                SELECT COUNT(*)
                FROM vehicles
                WHERE store_id = :store_id
            """),
            {"store_id": store_id}
        ).scalar_one()

        price_count = conn.execute(
            text("""
                SELECT COUNT(*)
                FROM price_tables p
                JOIN vehicles v ON p.vehicle_id = v.vehicle_id
                WHERE v.store_id = :store_id
                AND p.price_type = :price_type
            """),
            {
                "store_id": store_id,
                "price_type": PRICE_TYPE
            }
        ).scalar_one()

        order_count = conn.execute(
            text("""
                SELECT COUNT(*)
                FROM orders
                WHERE delivery_address = :marker
            """),
            {"marker": ORDER_MARKER}
        ).scalar_one()
        renter_count = len(renter_ids)
        print("\n========== PERFORMANCE TEST DATA ==========")
        print(f"Thành phố: {CITY_NAME}")
        print(f"Cửa hàng ID: {store_id}")
        print(f"Chủ cửa hàng ID: {owner_id}")
        print(f"Số khách hàng: {renter_count}")
        print(f"Số phương tiện: {vehicle_count}")
        print(f"Số bảng giá: {price_count}")
        print(f"Số đơn thuê performance test: {order_count}")
        print("============================================")

    elapsed = perf_counter() - start_timer

    print(f"Thời gian thực thi: {elapsed:.2f} giây")
    print("Tạo dữ liệu performance test thành công!")


if __name__ == "__main__":
    main()
