use vehicle_rental_platform_db;

INSERT INTO roles (role_id, role_name, description)
VALUES
(1, 'Admin', 'Quản trị viên hệ thống'),
(2, 'Khách hàng', 'Người thuê xe'),
(3, 'Nhân viên', 'Nhân viên cửa hàng'),
(4, 'Chủ cửa hàng', 'Người quản lý cửa hàng');

INSERT INTO cities (city_name)
VALUES
('Vũng Tàu'),
('Đà Nẵng');

INSERT INTO system_config (config_key, config_value, description)
VALUES
('commission_rate', '12', 'Phần trăm hoa hồng hệ thống'),
('booking_hold_minutes', '30', 'Thời gian giữ đơn đặt xe tính bằng phút'),
('deposit_rate', '30', 'Phần trăm tiền đặt cọc'),
('late_return_fee_rate', '20', 'Phần trăm giá thuê một ngày tính cho mỗi giờ trả xe muộn');