CREATE DATABASE IF NOT EXISTS warehouse_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE warehouse_db;

CREATE TABLE `users` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(255) UNIQUE NOT NULL,
  `phone` varchar(20),
  `password_hash` varchar(255),
  `google_id` varchar(255),
  `role` varchar(30) NOT NULL COMMENT 'ADMIN, WAREHOUSE_STAFF, CUSTOMER',
  `status` varchar(20) NOT NULL COMMENT 'ACTIVE, LOCKED',
  `created_at` datetime NOT NULL
);

CREATE TABLE `customers` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `user_id` bigint UNIQUE NOT NULL,
  `business_name` varchar(200) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` varchar(500) NOT NULL,
  `created_at` datetime NOT NULL
);

CREATE TABLE `products` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `sku` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text,
  `unit` varchar(30) NOT NULL,
  `created_at` datetime NOT NULL
);

CREATE TABLE `inventory` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `updated_at` datetime NOT NULL
);

CREATE TABLE `inbound_receipts` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `receipt_code` varchar(50) UNIQUE NOT NULL,
  `customer_id` bigint NOT NULL,
  `created_by` bigint NOT NULL,
  `status` varchar(30) NOT NULL COMMENT 'SCHEDULED, RECEIVING, CONFIRMED, CANCELLED',
  `expected_at` datetime NOT NULL,
  `received_at` datetime,
  `note` text,
  `created_at` datetime NOT NULL
);

CREATE TABLE `inbound_receipt_items` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `receipt_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `expected_quantity` decimal(12,3) NOT NULL,
  `actual_quantity` decimal(12,3),
  `note` text
);

CREATE TABLE `outbound_orders` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `order_code` varchar(50) UNIQUE NOT NULL,
  `customer_id` bigint NOT NULL,
  `created_by` bigint NOT NULL,
  `recipient_name` varchar(150) NOT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `delivery_address` varchar(500) NOT NULL,
  `status` varchar(30) NOT NULL COMMENT 'PENDING, PREPARING, IN_DELIVERY, DELIVERED, CANCELLED',
  `payment_method` varchar(20) NOT NULL COMMENT 'COD, VNPAY',
  `created_at` datetime NOT NULL
);

CREATE TABLE `outbound_order_items` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity_requested` decimal(12,3) NOT NULL,
  `quantity_actual` decimal(12,3),
  `unit_price` decimal(15,2) NOT NULL COMMENT 'Phi dich vu kho tren moi don vi, khong phai gia ban hang hoa'
);

CREATE TABLE `invoices` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `invoice_code` varchar(50) UNIQUE NOT NULL,
  `customer_id` bigint NOT NULL,
  `outbound_order_id` bigint,
  `description` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `status` varchar(20) NOT NULL COMMENT 'UNPAID, PAID, CANCELLED',
  `created_at` datetime NOT NULL
);

CREATE TABLE `payments` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `invoice_id` bigint NOT NULL,
  `payment_method` varchar(20) NOT NULL COMMENT 'VNPAY, COD',
  `transaction_ref` varchar(150),
  `amount` decimal(15,2) NOT NULL,
  `status` varchar(20) NOT NULL COMMENT 'PENDING, SUCCESS, FAILED',
  `paid_at` datetime
);

CREATE TABLE `email_notifications` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `customer_id` BIGINT NOT NULL,
  `outbound_order_id` BIGINT,
  `sent_by` BIGINT,
  `recipient_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL
    COMMENT 'PENDING, SENT, FAILED',
  `error_message` TEXT,
  `sent_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_email_notifications_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),

  CONSTRAINT `fk_email_notifications_order`
    FOREIGN KEY (`outbound_order_id`) REFERENCES `outbound_orders` (`id`),

  CONSTRAINT `fk_email_notifications_sender`
    FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`)
);

-- 1. USERS
INSERT INTO `users` (
    `id`, `full_name`, `email`, `phone`, `password_hash`,
    `google_id`, `role`, `status`, `created_at`
) VALUES
(1, 'Admin', 'admin@example.com', '0901000001', NULL, NULL, 'ADMIN', 'ACTIVE', '2026-10-19 13:51:42'),
(2, 'Nhan vien kho', 'staff@example.com', '0901000002', NULL, NULL, 'WAREHOUSE_STAFF', 'ACTIVE', '2026-10-19 13:51:42'),
(3, 'Khach hang An', 'an@example.com', '0901000003', NULL, NULL, 'CUSTOMER', 'ACTIVE', '2026-10-19 13:51:42'),
(4, 'Khach hang Binh', 'binh@example.com', '0901000004', NULL, NULL, 'CUSTOMER', 'ACTIVE', '2026-10-19 13:51:42');


-- 2. CUSTOMERS
INSERT INTO `customers` (
    `id`, `user_id`, `business_name`, `phone`, `address`, `created_at`
) VALUES
(1, 3, 'Cua hang An Phat', '0902000001', 'Quan 1, TP Ho Chi Minh', '2026-10-19 13:51:42'),
(2, 4, 'Cua hang Binh Minh', '0902000002', 'Quan 7, TP Ho Chi Minh', '2026-10-19 13:51:42');


-- 3. PRODUCTS
INSERT INTO `products` (
    `id`, `customer_id`, `sku`, `name`, `description`, `unit`, `created_at`
) VALUES
(1, 1, 'AN-SP001', 'Thung giay', 'Thung giay dong goi', 'thung', '2026-10-19 13:51:42'),
(2, 1, 'AN-SP002', 'Hop carton', 'Hop carton kich thuoc vua', 'hop', '2026-10-19 13:51:42'),
(3, 2, 'BM-SP001', 'Chai nhua', 'Chai nhua dung tich 500ml', 'thung', '2026-10-19 13:51:42'),
(4, 2, 'BM-SP002', 'Tui dong goi', 'Tui dong goi hang hoa', 'goi', '2026-10-19 13:51:42');


-- 4. INVENTORY
INSERT INTO `inventory` (
    `id`, `customer_id`, `product_id`, `quantity`, `updated_at`
) VALUES
(1, 1, 1, 100.000, '2026-10-19 13:51:42'),
(2, 1, 2, 250.000, '2026-10-19 13:51:42'),
(3, 2, 3, 80.000, '2026-10-19 13:51:42'),
(4, 2, 4, 150.000, '2026-10-19 13:51:42');


-- 5. INBOUND_RECEIPTS
INSERT INTO `inbound_receipts` (
    `id`, `receipt_code`, `customer_id`, `created_by`, `status`,
    `expected_at`, `received_at`, `note`, `created_at`
) VALUES
(1, 'PN-DEMO-001', 1, 2, 'CONFIRMED',
 '2026-10-14 13:51:42', '2026-10-14 13:51:42',
 'Da nhan du hang', '2026-10-13 13:51:42'),
(2, 'PN-DEMO-002', 2, 2, 'SCHEDULED',
 '2026-10-21 13:51:42', NULL,
 'Cho khach gui hang den', '2026-10-19 13:51:42');


-- 6. INBOUND_RECEIPT_ITEMS
INSERT INTO `inbound_receipt_items` (
    `id`, `receipt_id`, `product_id`, `expected_quantity`,
    `actual_quantity`, `note`
) VALUES
(1, 1, 1, 100.000, 100.000, 'Da kiem dem'),
(2, 1, 2, 250.000, 250.000, 'Da kiem dem'),
(3, 2, 3, 80.000, NULL, 'Chua nhan hang');


-- 7. OUTBOUND_ORDERS
INSERT INTO `outbound_orders` (
    `id`, `order_code`, `customer_id`, `created_by`,
    `recipient_name`, `recipient_phone`, `delivery_address`,
    `status`, `payment_method`, `created_at`
) VALUES
(1, 'PX-DEMO-001', 1, 2, 'Nguyen Van Nam', '0913000001',
 'Quan 3, TP Ho Chi Minh', 'DELIVERED', 'COD', '2026-10-16 13:51:42'),
(2, 'PX-DEMO-002', 2, 2, 'Tran Thi Mai', '0913000002',
 'Thu Duc, TP Ho Chi Minh', 'PENDING', 'VNPAY', '2026-10-19 13:51:42');


-- 8. OUTBOUND_ORDER_ITEMS
INSERT INTO `outbound_order_items` (
    `id`, `order_id`, `product_id`, `quantity_requested`,
    `quantity_actual`, `unit_price`
) VALUES
(1, 1, 1, 10.000, 10.000, 5000.00),
(2, 1, 2, 20.000, 20.000, 3000.00),
(3, 2, 3, 5.000, NULL, 7000.00);


-- 9. INVOICES
INSERT INTO `invoices` (
    `id`, `invoice_code`, `customer_id`, `outbound_order_id`,
    `description`, `amount`, `total_amount`, `status`, `created_at`
) VALUES
(1, 'HD-DEMO-001', 1, 1, 'Phi dich vu xuat kho',
 110000.00, 110000.00, 'PAID', '2026-10-16 13:51:42'),
(2, 'HD-DEMO-002', 2, 2, 'Phi dich vu xuat kho',
 35000.00, 35000.00, 'UNPAID', '2026-10-19 13:51:42');


-- 10. PAYMENTS
INSERT INTO `payments` (
    `id`, `invoice_id`, `payment_method`, `transaction_ref`,
    `amount`, `status`, `paid_at`
) VALUES
(1, 1, 'COD', 'COD-DEMO-001', 110000.00, 'SUCCESS', '2026-10-19 13:51:42'),
(2, 2, 'VNPAY', NULL, 35000.00, 'PENDING', NULL);


-- 11. EMAIL_NOTIFICATIONS
INSERT INTO `email_notifications` (
    `id`, `customer_id`, `outbound_order_id`, `sent_by`,
    `recipient_email`, `subject`, `content`, `status`,
    `error_message`, `sent_at`, `created_at`
) VALUES
(1, 2, 2, 1, 'binh@example.com',
 'Thông báo đơn xuất kho',
 'Xin chào Khach hang Binh, đơn hàng PX-DEMO-002 đang được chuẩn bị.',
 'SENT', NULL, '2026-10-19 15:56:28', '2026-10-19 15:56:28');

CREATE UNIQUE INDEX `products_index_0` ON `products` (`customer_id`, `sku`);

CREATE UNIQUE INDEX `inventory_index_1` ON `inventory` (`customer_id`, `product_id`);

ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `products` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);

ALTER TABLE `inventory` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);

ALTER TABLE `inventory` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `inbound_receipts` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);

ALTER TABLE `inbound_receipts` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `inbound_receipt_items` ADD FOREIGN KEY (`receipt_id`) REFERENCES `inbound_receipts` (`id`);

ALTER TABLE `inbound_receipt_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `outbound_orders` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);

ALTER TABLE `outbound_orders` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `outbound_order_items` ADD FOREIGN KEY (`order_id`) REFERENCES `outbound_orders` (`id`);

ALTER TABLE `outbound_order_items` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `invoices` ADD FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);

ALTER TABLE `invoices` ADD FOREIGN KEY (`outbound_order_id`) REFERENCES `outbound_orders` (`id`);

ALTER TABLE `payments` ADD FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`);
