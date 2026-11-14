-- Adds optional operational notes required by the outbound and invoice API contracts.
ALTER TABLE outbound_orders
    ADD COLUMN last_status_note VARCHAR(255) NULL COMMENT 'Lý do hủy/hoàn đơn gần nhất';

ALTER TABLE outbound_orders
    ADD COLUMN approved_by BIGINT NULL COMMENT 'Admin/Staff tiếp nhận đơn',
    ADD COLUMN approved_at DATETIME NULL;

ALTER TABLE outbound_orders
    ADD CONSTRAINT fk_outbound_approved_by FOREIGN KEY (approved_by) REFERENCES users (id);

ALTER TABLE outbound_order_items
    ADD COLUMN pick_note VARCHAR(255) NULL COMMENT 'Ghi chú khi soạn thiếu hàng';

ALTER TABLE invoices
    ADD COLUMN cancel_reason VARCHAR(255) NULL;
