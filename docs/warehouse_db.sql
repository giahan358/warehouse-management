-- =====================================================================
--  QUY ƯỚC NGHIỆP VỤ (xử lý ở Service, dùng @Transactional):
--   - Tồn khả dụng = quantity - allocated_quantity
--   - Khách tạo đơn xuất (PENDING)        : allocated_quantity += qty
--   - Nhân viên bắt đầu soạn (PREPARING)  : quantity -= qty, allocated_quantity -= qty
--   - Hủy đơn khi PENDING                 : allocated_quantity -= qty
--   - Xác nhận nhập kho (CONFIRMED)       : quantity += actual_quantity (hàng hỏng không cộng)
--   - Khách chỉ sửa/hủy phiếu nhập khi SCHEDULED, hủy đơn xuất khi PENDING
--   - COD chỉ ADMIN được xác nhận
--   - Mọi API của CUSTOMER phải lọc theo customer_id của user đăng nhập
-- =====================================================================

CREATE DATABASE IF NOT EXISTS warehouse_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE warehouse_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS email_notifications;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS outbound_order_items;
DROP TABLE IF EXISTS outbound_orders;
DROP TABLE IF EXISTS inbound_receipt_items;
DROP TABLE IF EXISTS inbound_receipts;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. USERS (Google OAuth2, 3 vai trò, khóa/mở khóa, phương thức đăng nhập)
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(255) UNIQUE NOT NULL,
  `phone` varchar(20),
  `password_hash` varchar(255),
  `google_id` varchar(255) UNIQUE,
  `login_method` varchar(20) NOT NULL DEFAULT 'EMAIL' COMMENT 'EMAIL hoặc GOOGLE',
  `role` varchar(30) NOT NULL COMMENT 'ADMIN, WAREHOUSE_STAFF, CUSTOMER',
  `status` varchar(20) NOT NULL COMMENT 'ACTIVE, LOCKED',
  `lock_reason` varchar(255) COMMENT 'Lý do khóa (nợ cước quá hạn...)',
  `password_setup_token_hash` varchar(64),
  `password_setup_expires_at` datetime,
  `created_at` datetime NOT NULL
);

-- ---------------------------------------------------------------------
-- 2. CUSTOMERS (hồ sơ doanh nghiệp + hạn mức m3 + tài khoản nhận COD)
-- ---------------------------------------------------------------------
CREATE TABLE `customers` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `user_id` bigint UNIQUE NOT NULL,
  `customer_code` varchar(30) UNIQUE NOT NULL COMMENT 'CUST-VN01',
  `business_name` varchar(200) NOT NULL,
  `tax_code` varchar(20) COMMENT 'Mã số thuế',
  `legal_representative` varchar(150),
  `phone` varchar(20) NOT NULL,
  `address` varchar(500) NOT NULL COMMENT 'Địa chỉ chung của doanh nghiệp',
  `billing_email` varchar(255) COMMENT 'Email nhận hóa đơn',
  `service_package` varchar(20) NOT NULL DEFAULT 'STANDARD' COMMENT 'STANDARD, PRO, ENTERPRISE',
  `capacity_m3` decimal(12,2) NOT NULL DEFAULT 0 COMMENT 'Hạn mức dung tích thuê',
  `bank_name` varchar(100) COMMENT 'Tài khoản nhận tiền COD',
  `bank_account_number` varchar(30),
  `bank_account_holder` varchar(150),
  `created_at` datetime NOT NULL
);

-- ---------------------------------------------------------------------
-- 3. PRODUCTS (sản phẩm thuộc sở hữu khách hàng)
-- ---------------------------------------------------------------------
CREATE TABLE `products` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `sku` varchar(100) NOT NULL,
  `barcode` varchar(50),
  `name` varchar(200) NOT NULL,
  `category` varchar(30) COMMENT 'ELECTRONIC, COSMETIC, PHARMA, FASHION, PACKAGING, OTHER',
  `description` text,
  `unit` varchar(30) NOT NULL,
  `length_cm` decimal(8,2),
  `width_cm` decimal(8,2),
  `height_cm` decimal(8,2),
  `volume_m3` decimal(12,6) COMMENT 'Thể tích 1 đơn vị (tính phí chiếm chỗ)',
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, HIDDEN',
  `created_at` datetime NOT NULL
);

-- ---------------------------------------------------------------------
-- 4. INVENTORY (tồn thực tế + tạm giữ + vị trí kệ)
-- ---------------------------------------------------------------------
CREATE TABLE `inventory` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity` decimal(12,3) NOT NULL DEFAULT 0 COMMENT 'Tồn thực tế (on-hand)',
  `allocated_quantity` decimal(12,3) NOT NULL DEFAULT 0 COMMENT 'Tạm giữ cho đơn xuất PENDING',
  `location_code` varchar(50) COMMENT 'Vị trí bin/rack, vd ZA-R04-S02-B12',
  `expiry_date` date COMMENT 'Hạn sử dụng (nếu có)',
  `updated_at` datetime NOT NULL,
  CONSTRAINT `chk_inventory_qty` CHECK (`quantity` >= 0 AND `allocated_quantity` >= 0 AND `allocated_quantity` <= `quantity`)
);

-- ---------------------------------------------------------------------
-- 5. INBOUND_RECEIPTS (phiếu hẹn nhập kho / ASN)
-- ---------------------------------------------------------------------
CREATE TABLE `inbound_receipts` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `receipt_code` varchar(50) UNIQUE NOT NULL,
  `customer_id` bigint NOT NULL,
  `created_by` bigint NOT NULL COMMENT 'User tạo phiếu (khách hàng)',
  `confirmed_by` bigint COMMENT 'Nhân viên xác nhận nhập kho',
  `status` varchar(30) NOT NULL COMMENT 'SCHEDULED, RECEIVING, CONFIRMED, CANCELLED',
  `vehicle_plate` varchar(20) COMMENT 'Biển số xe',
  `dock_code` varchar(20) COMMENT 'Cửa dock tiếp nhận, vd D-02',
  `time_slot` varchar(20) COMMENT 'Ca giao xe: MORNING hoặc AFTERNOON',
  `expected_at` datetime NOT NULL,
  `received_at` datetime,
  `note` text,
  `created_at` datetime NOT NULL
);

-- ---------------------------------------------------------------------
-- 6. INBOUND_RECEIPT_ITEMS
-- ---------------------------------------------------------------------
CREATE TABLE `inbound_receipt_items` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `receipt_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `expected_quantity` decimal(12,3) NOT NULL COMMENT 'Khai báo',
  `actual_quantity` decimal(12,3) COMMENT 'Thực nhận đạt, được cộng vào tồn',
  `damaged_quantity` decimal(12,3) NOT NULL DEFAULT 0 COMMENT 'Hư hỏng, không cộng tồn',
  `location_code` varchar(50) COMMENT 'Vị trí kệ gán khi kiểm đếm',
  `note` text
);

-- ---------------------------------------------------------------------
-- 7. OUTBOUND_ORDERS (đơn xuất kho + vận chuyển + COD)
-- ---------------------------------------------------------------------
CREATE TABLE `outbound_orders` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `order_code` varchar(50) UNIQUE NOT NULL,
  `customer_id` bigint NOT NULL,
  `created_by` bigint NOT NULL COMMENT 'User tạo đơn (khách hàng)',
  `approved_by` bigint COMMENT 'Admin/Staff tiếp nhận đơn',
  `approved_at` datetime,
  `recipient_name` varchar(150) NOT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `delivery_address` varchar(500) NOT NULL,
  `carrier` varchar(30) COMMENT 'GHN, GHTK, VIETTEL_POST, SELF_PICKUP',
  `tracking_code` varchar(50) COMMENT 'Mã vận đơn',
  `note` varchar(200),
  `last_status_note` varchar(255) COMMENT 'Lý do hủy/hoàn đơn gần nhất',
  `status` varchar(30) NOT NULL COMMENT 'PENDING, PREPARING, PACKED, IN_DELIVERY, DELIVERED, RETURNED, CANCELLED',
  `payment_method` varchar(20) NOT NULL COMMENT 'COD, VNPAY',
  `cod_amount` decimal(15,2) NOT NULL DEFAULT 0 COMMENT 'Tiền thu hộ',
  `cod_status` varchar(25) NOT NULL DEFAULT 'NONE' COMMENT 'NONE, PENDING_RECONCILE, COLLECTED, CONFIRMED, RETURNED',
  `cod_confirmed_by` bigint COMMENT 'Chỉ ADMIN',
  `cod_confirmed_at` datetime,
  `created_at` datetime NOT NULL
);

-- ---------------------------------------------------------------------
-- 8. OUTBOUND_ORDER_ITEMS
-- ---------------------------------------------------------------------
CREATE TABLE `outbound_order_items` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity_requested` decimal(12,3) NOT NULL,
  `quantity_actual` decimal(12,3),
  `pick_note` varchar(255) COMMENT 'Ghi chú khi soạn thiếu hàng',
  `unit_price` decimal(15,2) NOT NULL COMMENT 'Phí dịch vụ kho trên mỗi đơn vị'
);

-- ---------------------------------------------------------------------
-- 9. INVOICES (hóa đơn phí dịch vụ kho)
-- ---------------------------------------------------------------------
CREATE TABLE `invoices` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `invoice_code` varchar(50) UNIQUE NOT NULL,
  `customer_id` bigint NOT NULL,
  `outbound_order_id` bigint COMMENT 'NULL nếu là hóa đơn phí lưu kho theo kỳ',
  `description` varchar(255) NOT NULL,
  `period_start` date,
  `period_end` date,
  `due_date` date,
  `amount` decimal(15,2) NOT NULL COMMENT 'Tiền dịch vụ trước thuế',
  `vat_rate` decimal(5,2) NOT NULL DEFAULT 0,
  `vat_amount` decimal(15,2) NOT NULL DEFAULT 0,
  `total_amount` decimal(15,2) NOT NULL,
  `status` varchar(20) NOT NULL COMMENT 'UNPAID, PAID, OVERDUE, CANCELLED',
  `cancel_reason` varchar(255),
  `created_at` datetime NOT NULL,
  CONSTRAINT `chk_invoice_total` CHECK (`total_amount` = `amount` + `vat_amount`)
);

-- ---------------------------------------------------------------------
-- 10. INVOICE_ITEMS (các khoản mục phí trong hóa đơn)
-- ---------------------------------------------------------------------
CREATE TABLE `invoice_items` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `invoice_id` bigint NOT NULL,
  `description` varchar(255) NOT NULL COMMENT 'Phí lưu kho, nâng hạ Inbound, đóng gói Outbound...',
  `quantity` decimal(15,3) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `line_amount` decimal(15,2) NOT NULL
);

-- ---------------------------------------------------------------------
-- 11. PAYMENTS (VNPay Sandbox + COD)
-- ---------------------------------------------------------------------
CREATE TABLE `payments` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `invoice_id` bigint NOT NULL,
  `payment_method` varchar(20) NOT NULL COMMENT 'VNPAY, COD',
  `transaction_ref` varchar(150),
  `amount` decimal(15,2) NOT NULL,
  `status` varchar(20) NOT NULL COMMENT 'PENDING, SUCCESS, FAILED',
  `vnp_txn_ref` varchar(100) UNIQUE COMMENT 'vnp_TxnRef gửi sang VNPay',
  `vnp_transaction_no` varchar(50),
  `vnp_bank_code` varchar(20),
  `vnp_response_code` varchar(5) COMMENT '00 = thành công, 24 = khách hủy',
  `confirmed_by` bigint COMMENT 'Admin xác nhận COD',
  `paid_at` datetime
);

-- ---------------------------------------------------------------------
-- 12. EMAIL_NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE `email_notifications` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` BIGINT NOT NULL,
  `outbound_order_id` BIGINT,
  `sent_by` BIGINT,
  `recipient_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL COMMENT 'PENDING, SENT, FAILED',
  `error_message` TEXT,
  `sent_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_email_notifications_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_email_notifications_order` FOREIGN KEY (`outbound_order_id`) REFERENCES `outbound_orders` (`id`),
  CONSTRAINT `fk_email_notifications_sender` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`)
);

-- =====================================================================
-- DỮ LIỆU MẪU
-- =====================================================================

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password_hash`, `google_id`, `login_method`, `role`, `status`, `lock_reason`, `created_at`) VALUES
(1, 'Admin', 'admin@example.com', '0901000001', NULL, NULL, 'EMAIL', 'ADMIN', 'ACTIVE', NULL, '2026-10-19 13:51:42'),
(2, 'Nhân viên kho', 'staff@example.com', '0901000002', NULL, NULL, 'EMAIL', 'WAREHOUSE_STAFF', 'ACTIVE', NULL, '2026-10-19 13:51:42'),
(3, 'Khách hàng An', 'an@example.com', '0901000003', NULL, 'google-id-an-123', 'GOOGLE', 'CUSTOMER', 'ACTIVE', NULL, '2026-10-19 13:51:42'),
(4, 'Khách hàng Bình', 'binh@example.com', '0901000004', NULL, NULL, 'EMAIL', 'CUSTOMER', 'ACTIVE', NULL, '2026-10-19 13:51:42'),
(5, 'Khách hàng Cường', 'cuong@example.com', '0901000005', NULL, 'google-id-cuong-456', 'GOOGLE', 'CUSTOMER', 'LOCKED', 'Nợ cước phí kho quá hạn', '2026-10-19 13:51:42');

INSERT INTO `customers` (`id`, `user_id`, `customer_code`, `business_name`, `tax_code`, `legal_representative`, `phone`, `address`, `billing_email`, `service_package`, `capacity_m3`, `bank_name`, `bank_account_number`, `bank_account_holder`, `created_at`) VALUES
(1, 3, 'CUST-VN01', 'Cửa hàng An Phát', '0314892019', 'Nguyễn Văn An', '0902000001', 'Quận 1, TP Hồ Chí Minh', 'ketoan@anphat.vn', 'ENTERPRISE', 3200.00, 'Vietcombank', '0071000123456', 'CUA HANG AN PHAT', '2026-10-19 13:51:42'),
(2, 4, 'CUST-VN02', 'Cửa hàng Bình Minh', '0108933211', 'Trần Bình', '0902000002', 'Quận 7, TP Hồ Chí Minh', 'ketoan@binhminh.vn', 'PRO', 650.00, 'Techcombank', '19031234567890', 'CUA HANG BINH MINH', '2026-10-19 13:51:42'),
(3, 5, 'CUST-VN03', 'Dược phẩm Trung Đô', '0300188732', 'Phạm Văn Cường', '0902000003', 'Gò Vấp, TP Hồ Chí Minh', 'ketoan@trungdo.vn', 'PRO', 450.00, NULL, NULL, NULL, '2026-10-19 13:51:42');

INSERT INTO `products` (`id`, `customer_id`, `sku`, `barcode`, `name`, `category`, `description`, `unit`, `length_cm`, `width_cm`, `height_cm`, `volume_m3`, `status`, `created_at`) VALUES
(1, 1, 'AN-SP001', '8935002148101', 'Thùng giấy', 'PACKAGING', 'Thùng giấy đóng gói', 'thùng', 50, 40, 30, 0.060000, 'ACTIVE', '2026-10-19 13:51:42'),
(2, 1, 'AN-SP002', '8935002148102', 'Hộp carton', 'PACKAGING', 'Hộp carton kích thước vừa', 'hộp', 30, 20, 15, 0.009000, 'ACTIVE', '2026-10-19 13:51:42'),
(3, 2, 'BM-SP001', '8935002148201', 'Chai nhựa', 'OTHER', 'Chai nhựa dung tích 500ml', 'thùng', 40, 30, 25, 0.030000, 'ACTIVE', '2026-10-19 13:51:42'),
(4, 2, 'BM-SP002', '8935002148202', 'Túi đóng gói', 'PACKAGING', 'Túi đóng gói hàng hóa', 'gói', 25, 20, 10, 0.005000, 'ACTIVE', '2026-10-19 13:51:42'),
(5, 1, 'SKU-TG-4402', '8935002148301', 'Router Wi-Fi 6 Mesh Enterprise AX3000', 'ELECTRONIC', 'Băng tần kép, 4 anten rời', 'hộp', 26, 18.5, 6.5, 0.003127, 'ACTIVE', '2026-10-19 13:51:42');

INSERT INTO `inventory` (`id`, `customer_id`, `product_id`, `quantity`, `allocated_quantity`, `location_code`, `expiry_date`, `updated_at`) VALUES
(1, 1, 1, 90.000, 0.000, 'ZA-R04-S01-B08', NULL, '2026-10-19 13:51:42'),
(2, 1, 2, 230.000, 0.000, 'ZA-R04-S02-B12', NULL, '2026-10-19 13:51:42'),
(3, 2, 3, 80.000, 5.000, 'ZA-R05-S01-B01', NULL, '2026-10-19 13:51:42'),
(4, 2, 4, 150.000, 0.000, 'ZA-R05-S01-B02', NULL, '2026-10-19 13:51:42'),
(5, 1, 5, 260.000, 0.000, 'ZB-E01-S01-B04', NULL, '2026-10-19 13:51:42');

INSERT INTO `inbound_receipts` (`id`, `receipt_code`, `customer_id`, `created_by`, `confirmed_by`, `status`, `vehicle_plate`, `dock_code`, `time_slot`, `expected_at`, `received_at`, `note`, `created_at`) VALUES
(1, 'NK-202610-0001', 1, 3, 2, 'CONFIRMED', '51D-894.22', 'A-03', 'MORNING', '2026-10-14 13:51:42', '2026-10-14 13:51:42', 'Đã nhận đủ hàng', '2026-10-13 13:51:42'),
(2, 'NK-202610-0002', 2, 4, NULL, 'SCHEDULED', '29C-774.19', NULL, 'AFTERNOON', '2026-10-21 13:51:42', NULL, 'Chờ khách gửi hàng đến', '2026-10-19 13:51:42'),
(3, 'NK-202610-0003', 1, 3, NULL, 'RECEIVING', '51D-892.44', 'D-04', 'MORNING', '2026-10-19 10:30:00', NULL, 'Đang kiểm đếm tại dock', '2026-10-18 14:15:00');

INSERT INTO `inbound_receipt_items` (`id`, `receipt_id`, `product_id`, `expected_quantity`, `actual_quantity`, `damaged_quantity`, `location_code`, `note`) VALUES
(1, 1, 1, 100.000, 100.000, 0, 'ZA-R04-S01-B08', 'Đã kiểm đếm'),
(2, 1, 2, 250.000, 250.000, 0, 'ZA-R04-S02-B12', 'Đã kiểm đếm'),
(3, 2, 3, 80.000, NULL, 0, NULL, 'Chưa nhận hàng'),
(4, 3, 5, 200.000, 196.000, 4.000, 'ZB-E01-S01-B04', '4 hộp móp bao bì, lập biên bản');

INSERT INTO `outbound_orders` (`id`, `order_code`, `customer_id`, `created_by`, `recipient_name`, `recipient_phone`, `delivery_address`, `carrier`, `tracking_code`, `note`, `status`, `payment_method`, `cod_amount`, `cod_status`, `cod_confirmed_by`, `cod_confirmed_at`, `created_at`) VALUES
(1, 'OUT-2026-0001', 1, 3, 'Nguyễn Văn Nam', '0913000001', 'Quận 3, TP Hồ Chí Minh', 'GHTK', 'S22.GHTK.8912401', NULL, 'DELIVERED', 'COD', 4850000.00, 'CONFIRMED', 1, '2026-10-19 13:30:00', '2026-10-16 13:51:42'),
(2, 'OUT-2026-0002', 2, 4, 'Trần Thị Mai', '0913000002', 'Thủ Đức, TP Hồ Chí Minh', 'VIETTEL_POST', NULL, NULL, 'PENDING', 'VNPAY', 0.00, 'NONE', NULL, NULL, '2026-10-19 13:51:42');

INSERT INTO `outbound_order_items` (`id`, `order_id`, `product_id`, `quantity_requested`, `quantity_actual`, `unit_price`) VALUES
(1, 1, 1, 10.000, 10.000, 5000.00),
(2, 1, 2, 20.000, 20.000, 3000.00),
(3, 2, 3, 5.000, NULL, 7000.00);

INSERT INTO `invoices` (`id`, `invoice_code`, `customer_id`, `outbound_order_id`, `description`, `period_start`, `period_end`, `due_date`, `amount`, `vat_rate`, `vat_amount`, `total_amount`, `status`, `created_at`) VALUES
(1, 'INV-202610-0001', 1, 1, 'Phí dịch vụ xuất kho', '2026-10-16', '2026-10-16', '2026-10-30', 110000.00, 0, 0, 110000.00, 'PAID', '2026-10-16 13:51:42'),
(2, 'INV-202610-0002', 2, 2, 'Phí dịch vụ xuất kho', '2026-10-19', '2026-10-19', '2026-11-02', 35000.00, 0, 0, 35000.00, 'UNPAID', '2026-10-19 13:51:42'),
(3, 'INV-202610-AP01', 1, NULL, 'Phí dịch vụ kho tháng 10/2026', '2026-10-01', '2026-10-31', '2026-10-30', 38500000.00, 0, 0, 38500000.00, 'UNPAID', '2026-10-20 08:00:00'),
(4, 'INV-202609-TD04', 3, NULL, 'Phí dịch vụ kho tháng 09/2026', '2026-09-01', '2026-09-30', '2026-10-10', 38500000.00, 8.00, 3080000.00, 41580000.00, 'OVERDUE', '2026-09-20 08:00:00');

INSERT INTO `invoice_items` (`id`, `invoice_id`, `description`, `quantity`, `unit`, `unit_price`, `line_amount`) VALUES
(1, 1, 'Phí xuất kho Thùng giấy', 10, 'thùng', 5000.00, 50000.00),
(2, 1, 'Phí xuất kho Hộp carton', 20, 'hộp', 3000.00, 60000.00),
(3, 2, 'Phí xuất kho Chai nhựa', 5, 'thùng', 7000.00, 35000.00),
(4, 3, 'Phí thuê diện tích lưu kho Zone B', 1000, 'm3', 27000.00, 27000000.00),
(5, 3, 'Phí lưu kho hàng lạnh Zone C', 150, 'm3', 18000.00, 2700000.00),
(6, 3, 'Phí nâng hạ & bốc dỡ Inbound', 6, 'chuyến', 600000.00, 3600000.00),
(7, 3, 'Phí đóng gói & in tem Outbound', 520, 'kiện', 10000.00, 5200000.00),
(8, 4, 'Phí lưu kho lạnh tháng 09/2026', 1, 'kỳ', 38500000.00, 38500000.00);

INSERT INTO `payments` (`id`, `invoice_id`, `payment_method`, `transaction_ref`, `amount`, `status`, `vnp_txn_ref`, `vnp_transaction_no`, `vnp_bank_code`, `vnp_response_code`, `confirmed_by`, `paid_at`) VALUES
(1, 1, 'COD', 'COD-DEMO-001', 110000.00, 'SUCCESS', NULL, NULL, NULL, NULL, 1, '2026-10-19 13:51:42'),
(2, 2, 'VNPAY', NULL, 35000.00, 'PENDING', 'INV-202610-0002-T1', NULL, NULL, NULL, NULL, NULL),
(3, 4, 'VNPAY', NULL, 41580000.00, 'FAILED', 'INV-202609-TD04', NULL, NULL, '24', NULL, NULL);

INSERT INTO `email_notifications` (`id`, `customer_id`, `outbound_order_id`, `sent_by`, `recipient_email`, `subject`, `content`, `status`, `error_message`, `sent_at`, `created_at`) VALUES
(1, 2, 2, 1, 'binh@example.com', 'Thông báo đơn xuất kho',
 'Xin chào Khách hàng Bình, đơn hàng OUT-2026-0002 đang được chuẩn bị.',
 'SENT', NULL, '2026-10-19 15:56:28', '2026-10-19 15:56:28');

-- =====================================================================
-- KHÓA NGOẠI & INDEX
-- =====================================================================
CREATE UNIQUE INDEX `products_index_0` ON `products` (`customer_id`, `sku`);
CREATE UNIQUE INDEX `inventory_index_1` ON `inventory` (`customer_id`, `product_id`);
CREATE INDEX `idx_inbound_status` ON `inbound_receipts` (`status`, `expected_at`);
CREATE INDEX `idx_outbound_status` ON `outbound_orders` (`status`, `created_at`);
CREATE INDEX `idx_invoice_customer_status` ON `invoices` (`customer_id`, `status`);

ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `products` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);
ALTER TABLE `inventory` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);
ALTER TABLE `inventory` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `inbound_receipts` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);
ALTER TABLE `inbound_receipts` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
ALTER TABLE `inbound_receipts` ADD FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`);
ALTER TABLE `inbound_receipt_items` ADD FOREIGN KEY (`receipt_id`) REFERENCES `inbound_receipts` (`id`);
ALTER TABLE `inbound_receipt_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `outbound_orders` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);
ALTER TABLE `outbound_orders` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
ALTER TABLE `outbound_orders` ADD FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);
ALTER TABLE `outbound_orders` ADD FOREIGN KEY (`cod_confirmed_by`) REFERENCES `users` (`id`);
ALTER TABLE `outbound_order_items` ADD FOREIGN KEY (`order_id`) REFERENCES `outbound_orders` (`id`);
ALTER TABLE `outbound_order_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
ALTER TABLE `invoices` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);
ALTER TABLE `invoices` ADD FOREIGN KEY (`outbound_order_id`) REFERENCES `outbound_orders` (`id`);
ALTER TABLE `invoice_items` ADD FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`);
ALTER TABLE `payments` ADD FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`);
ALTER TABLE `payments` ADD FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`);
