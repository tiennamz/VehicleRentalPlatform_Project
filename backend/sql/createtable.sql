use vehicle_rental_platform_db;

CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    fullname VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(255) UNIQUE,
    status VARCHAR(255) DEFAULT 'active',
    created_at DATETIME
);

CREATE TABLE roles (
    role_id BIGINT PRIMARY KEY,
    role_name ENUM(
        'Admin',
        'Khách hàng',
        'Nhân viên',
        'Chủ cửa hàng'
    ),
    description TEXT NOT NULL
);

CREATE TABLE cities (
    city_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    city_name VARCHAR(255) UNIQUE
);

CREATE TABLE stores (
    store_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_id BIGINT,
    store_name VARCHAR(255),
    address VARCHAR(255),
    contact VARCHAR(255),
    status VARCHAR(255),
    city_id BIGINT,

    CONSTRAINT fk_stores_owner FOREIGN KEY (owner_id) REFERENCES users(user_id),

    CONSTRAINT fk_stores_city FOREIGN KEY (city_id) REFERENCES cities(city_id)
);

CREATE TABLE vehicles (
    vehicle_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    store_id BIGINT,
    brand VARCHAR(255),
    license_plate VARCHAR(255) UNIQUE,
    type ENUM(
        'Xe tay ga',
        'Xe số',
        'Ô tô 4 chỗ',
        'Ô tô 7 chỗ',
        'Ô tô 16 chỗ'
    ),
    status VARCHAR(255),

    CONSTRAINT fk_vehicles_store FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

CREATE TABLE price_tables (
    price_id BIGINT PRIMARY KEY,
    vehicle_id BIGINT,
    effective_from DATETIME,
    effective_to DATETIME,
    amount DECIMAL(12,2),
    price_type VARCHAR(255),

    CONSTRAINT fk_price_tables_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    renter_id BIGINT,
    vehicle_id BIGINT,
    price_id BIGINT,
    start_time DATETIME,
    end_time DATETIME,
    total_amount DECIMAL(12,2),
    order_status VARCHAR(255),
    created_at DATETIME,

    CONSTRAINT fk_orders_renter FOREIGN KEY (renter_id) REFERENCES users(user_id),
    CONSTRAINT fk_orders_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    CONSTRAINT fk_orders_price FOREIGN KEY (price_id) REFERENCES price_tables(price_id)
);

CREATE TABLE transactions (
    transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT,
    transaction_code VARCHAR(255),
    payment_method ENUM(
        'Tiền mặt',
        'Thẻ tín dụng',
        'Chuyển khoản ngân hàng'
    ),
    amount DECIMAL(12,2),
    transaction_type VARCHAR(255),
    status VARCHAR(255),
    paid_at DATETIME,

    CONSTRAINT fk_transactions_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE handover_records (
    handover_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT,
    staff_id BIGINT,
    handover_type VARCHAR(255),
    condition_note VARCHAR(255),
    handover_at DATETIME,
    handover_in_out ENUM('OUT', 'IN'),

    CONSTRAINT fk_handover_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_handover_staff FOREIGN KEY (staff_id) REFERENCES users(user_id)
);

CREATE TABLE user_role (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    assigned_at DATETIME,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES users(user_id),

    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE reviews (
    review_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT UNIQUE,
    reviewer_id BIGINT,
    rating INT,
    comment VARCHAR(255),
    created_at DATETIME,

    CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
);

CREATE TABLE complaints (
    complaint_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT,
    user_id BIGINT,
    complaint_type VARCHAR(255),
    content TEXT,
    complaint_status VARCHAR(255),
    created_at DATETIME,

    CONSTRAINT fk_complaints_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE images (
    image_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id BIGINT,
    handover_id BIGINT,
    review_id BIGINT,
    complaint_id BIGINT,
    img_url TEXT,
    img_type VARCHAR(255),
    upload_at DATETIME,

    CONSTRAINT fk_images_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    CONSTRAINT fk_images_handover FOREIGN KEY (handover_id) REFERENCES handover_records(handover_id),
    CONSTRAINT fk_images_review FOREIGN KEY (review_id) REFERENCES reviews(review_id),
    CONSTRAINT fk_images_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
);

CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    title VARCHAR(255),
    content TEXT,
    notification_type VARCHAR(255),
    send_at DATETIME,

    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE system_config (
    config_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(255),
    config_value VARCHAR(255),
    description TEXT,
    created_at DATETIME
);

CREATE TABLE verifiable_information (
    information_id BIGINT PRIMARY KEY,
    img_id_card_before VARCHAR(255) UNIQUE,
    img_id_card_after VARCHAR(255) UNIQUE,
    status_approve ENUM(
        'Đang chờ',
        'Bị từ chối',
        'Đã xác thực'
    ),

    CONSTRAINT fk_verifiable_information_user FOREIGN KEY (information_id) REFERENCES users(user_id)
);

CREATE TABLE favorite_vehicles (
    favorite_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    vehicle_id BIGINT,
    created_at DATETIME,

    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_favorite_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    CONSTRAINT uq_favorite_user_vehicle UNIQUE (user_id, vehicle_id)
);

CREATE TABLE driver_license (
    driver_license_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNIQUE,
    license_number VARCHAR(255) UNIQUE,
    license_class ENUM('A', 'A1', 'B1', 'C'),
    issue_date DATETIME,
    expiry_date DATETIME,
    verification_status ENUM(
        'Đang chờ',
        'Đã xác thực',
        'Bị từ chối',
        'Đã hết hạn'
    ),
    rejected_reason VARCHAR(255),
    verified_at DATETIME,

    CONSTRAINT fk_driver_license_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

