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
