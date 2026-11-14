package com.warehouse.inventory.repository;

import com.warehouse.inventory.model.Inventory;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    /** Locks the customer's inventory row while an outbound reservation is being changed. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.customerId = :customerId and i.productId = :productId order by i.id")
    java.util.List<Inventory> findLockedByCustomerAndProduct(
            @Param("customerId") Long customerId, @Param("productId") Long productId);

    @Modifying
    @Query(
            value = """
                    INSERT INTO inventory
                        (customer_id, product_id, quantity, allocated_quantity, location_code, expiry_date, updated_at)
                    VALUES
                        (:customerId, :productId, :receivedQuantity, 0, :locationCode, NULL, :updatedAt)
                    ON DUPLICATE KEY UPDATE
                        quantity = quantity + :receivedQuantity,
                        location_code = COALESCE(:locationCode, location_code),
                        updated_at = :updatedAt
                    """,
            nativeQuery = true)
    int addReceivedQuantity(
            @Param("customerId") Long customerId,
            @Param("productId") Long productId,
            @Param("receivedQuantity") java.math.BigDecimal receivedQuantity,
            @Param("locationCode") String locationCode,
            @Param("updatedAt") java.time.LocalDateTime updatedAt);

    @Query(
            value = """
                    SELECT i.id AS inventoryId,
                           i.customer_id AS customerId,
                           c.business_name AS customerName,
                           p.id AS productId,
                           p.sku AS sku,
                           p.name AS productName,
                           p.category AS category,
                           p.unit AS unit,
                           i.location_code AS locationCode,
                           CASE WHEN i.location_code IS NOT NULL AND i.location_code LIKE 'Z_' THEN SUBSTRING(i.location_code, 2, 1)
                                WHEN i.location_code IS NOT NULL AND i.location_code LIKE 'Z_%' THEN SUBSTRING(i.location_code, 2, 1)
                                ELSE NULL END AS zone,
                           i.quantity AS onHand,
                           i.allocated_quantity AS allocated,
                           i.quantity - i.allocated_quantity AS available,
                           CASE
                             WHEN i.quantity - i.allocated_quantity <= 0 THEN 'OUT_OF_STOCK'
                             WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY) THEN 'NEAR_EXPIRY'
                             WHEN i.quantity - i.allocated_quantity <= 100 THEN 'LOW'
                             ELSE 'SAFE'
                           END AS stockStatus,
                           i.expiry_date AS expiryDate,
                           (SELECT MAX(ir.received_at)
                              FROM inbound_receipt_items iri
                              JOIN inbound_receipts ir ON ir.id = iri.receipt_id
                             WHERE iri.product_id = p.id AND ir.customer_id = i.customer_id
                               AND ir.status = 'CONFIRMED') AS lastInboundAt,
                           i.updated_at AS updatedAt
                    FROM inventory i
                    JOIN customers c ON c.id = i.customer_id
                    JOIN products p ON p.id = i.product_id
                    WHERE (:customerId IS NULL OR i.customer_id = :customerId)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(i.location_code) LIKE LOWER(CONCAT('%', :keyword, '%')))
                      AND (:zone IS NULL OR SUBSTRING(i.location_code, 2, 1) = :zone)
                      AND (:stockStatus IS NULL
                           OR (:stockStatus = 'OUT_OF_STOCK' AND i.quantity - i.allocated_quantity <= 0)
                           OR (:stockStatus = 'NEAR_EXPIRY' AND i.quantity - i.allocated_quantity > 0
                               AND i.expiry_date IS NOT NULL
                               AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))
                           OR (:stockStatus = 'LOW' AND i.quantity - i.allocated_quantity > 0
                               AND i.quantity - i.allocated_quantity <= 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY)))
                           OR (:stockStatus = 'SAFE' AND i.quantity - i.allocated_quantity > 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))))
                    ORDER BY i.id
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM inventory i
                    JOIN customers c ON c.id = i.customer_id
                    JOIN products p ON p.id = i.product_id
                    WHERE (:customerId IS NULL OR i.customer_id = :customerId)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(i.location_code) LIKE LOWER(CONCAT('%', :keyword, '%')))
                      AND (:zone IS NULL OR SUBSTRING(i.location_code, 2, 1) = :zone)
                      AND (:stockStatus IS NULL
                           OR (:stockStatus = 'OUT_OF_STOCK' AND i.quantity - i.allocated_quantity <= 0)
                           OR (:stockStatus = 'NEAR_EXPIRY' AND i.quantity - i.allocated_quantity > 0
                               AND i.expiry_date IS NOT NULL
                               AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))
                           OR (:stockStatus = 'LOW' AND i.quantity - i.allocated_quantity > 0
                               AND i.quantity - i.allocated_quantity <= 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY)))
                           OR (:stockStatus = 'SAFE' AND i.quantity - i.allocated_quantity > 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))))
                    """,
            nativeQuery = true)
    Page<InventoryProjection> searchInventory(
            @Param("customerId") Long customerId,
            @Param("keyword") String keyword,
            @Param("stockStatus") String stockStatus,
            @Param("zone") String zone,
            Pageable pageable);

    @Query(
            value = """
                    SELECT COUNT(*) AS total,
                           COALESCE(SUM(CASE WHEN i.quantity - i.allocated_quantity > 100
                             AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))
                             THEN 1 ELSE 0 END), 0) AS safe,
                           COALESCE(SUM(CASE WHEN i.quantity - i.allocated_quantity > 0
                             AND i.quantity - i.allocated_quantity <= 100
                             AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))
                             THEN 1 ELSE 0 END), 0) AS low,
                           COALESCE(SUM(CASE WHEN i.quantity - i.allocated_quantity <= 0 THEN 1 ELSE 0 END), 0) AS outOfStock,
                           COALESCE(SUM(CASE WHEN i.quantity - i.allocated_quantity > 0
                             AND i.expiry_date IS NOT NULL
                             AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY)
                             THEN 1 ELSE 0 END), 0) AS nearExpiry
                    FROM inventory i
                    WHERE (:customerId IS NULL OR i.customer_id = :customerId)
                    """,
            nativeQuery = true)
    InventorySummaryProjection getAdminSummary(@Param("customerId") Long customerId);

    @Query(
            value = """
                    SELECT COALESCE(SUM(i.quantity), 0) AS totalOnHand,
                           COALESCE(SUM(i.quantity - i.allocated_quantity), 0) AS totalAvailable,
                           COALESCE(SUM(i.allocated_quantity), 0) AS totalAllocated,
                           COUNT(DISTINCT i.product_id) AS skuCount,
                           COALESCE(SUM(i.quantity * p.volume_m3), 0) AS usedM3
                    FROM inventory i
                    JOIN products p ON p.id = i.product_id
                    WHERE i.customer_id = :customerId
                    """,
            nativeQuery = true)
    InventorySummaryProjection getCustomerSummary(@Param("customerId") Long customerId);

    @Query(
            value = """
                    SELECT p.id AS productId,
                           p.name AS productName,
                           i.quantity AS quantity,
                           i.allocated_quantity AS allocated,
                           i.quantity - i.allocated_quantity AS available,
                           i.location_code AS locationCode,
                           i.updated_at AS updatedAt
                    FROM products p
                    JOIN inventory i ON i.product_id = p.id AND i.customer_id = p.customer_id
                    WHERE p.id = :productId
                      AND (:customerId IS NULL OR i.customer_id = :customerId)
                    """,
            nativeQuery = true)
    Optional<InventoryDetailProjection> findDetailByProductId(
            @Param("productId") Long productId,
            @Param("customerId") Long customerId);

    @Query(
            value = """
                    SELECT i.id AS inventoryId,
                           i.customer_id AS customerId,
                           c.business_name AS customerName,
                           p.id AS productId,
                           p.sku AS sku,
                           p.name AS productName,
                           p.category AS category,
                           p.unit AS unit,
                           i.location_code AS locationCode,
                           CASE WHEN i.location_code LIKE 'Z_%' THEN SUBSTRING(i.location_code, 2, 1)
                                ELSE NULL END AS zone,
                           i.quantity AS onHand,
                           i.allocated_quantity AS allocated,
                           i.quantity - i.allocated_quantity AS available,
                           CASE
                             WHEN i.quantity - i.allocated_quantity <= 0 THEN 'OUT_OF_STOCK'
                             WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY) THEN 'NEAR_EXPIRY'
                             WHEN i.quantity - i.allocated_quantity <= 100 THEN 'LOW'
                             ELSE 'SAFE'
                           END AS stockStatus,
                           i.expiry_date AS expiryDate,
                           (SELECT MAX(ir.received_at)
                              FROM inbound_receipt_items iri
                              JOIN inbound_receipts ir ON ir.id = iri.receipt_id
                             WHERE iri.product_id = p.id AND ir.customer_id = i.customer_id
                               AND ir.status = 'CONFIRMED') AS lastInboundAt,
                           i.updated_at AS updatedAt
                    FROM inventory i
                    JOIN customers c ON c.id = i.customer_id
                    JOIN products p ON p.id = i.product_id
                    WHERE i.id = :inventoryId
                    """,
            nativeQuery = true)
    Optional<InventoryProjection> findInventoryViewById(@Param("inventoryId") Long inventoryId);

}
