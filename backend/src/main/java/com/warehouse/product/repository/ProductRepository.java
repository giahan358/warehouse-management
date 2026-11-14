package com.warehouse.product.repository;

import com.warehouse.product.model.Product;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {
    java.util.List<Product> findAllByCustomerIdAndBarcodeIgnoreCase(Long customerId, String barcode);

    boolean existsByCustomerIdAndSkuIgnoreCase(Long customerId, String sku);

    boolean existsByCustomerIdAndSkuIgnoreCaseAndIdNot(Long customerId, String sku, Long id);

    @Query(
            value = """
                    SELECT p.id AS id,
                           p.customer_id AS customerId,
                           p.sku AS sku,
                           p.barcode AS barcode,
                           p.name AS name,
                           p.category AS category,
                           p.description AS description,
                           p.unit AS unit,
                           p.length_cm AS lengthCm,
                           p.width_cm AS widthCm,
                           p.height_cm AS heightCm,
                           p.volume_m3 AS volumeM3,
                           p.status AS status,
                           COALESCE(i.quantity, 0) AS onHand,
                           COALESCE(i.allocated_quantity, 0) AS allocated,
                           COALESCE(i.quantity - i.allocated_quantity, 0) AS available,
                           i.expiry_date AS expiryDate,
                           CASE
                             WHEN COALESCE(i.quantity - i.allocated_quantity, 0) <= 0 THEN 'OUT_OF_STOCK'
                             WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY) THEN 'NEAR_EXPIRY'
                             WHEN i.quantity - i.allocated_quantity <= 100 THEN 'LOW'
                             ELSE 'SAFE'
                           END AS stockStatus
                    FROM products p
                    LEFT JOIN inventory i ON i.product_id = p.id AND i.customer_id = p.customer_id
                    WHERE (:customerId IS NULL OR p.customer_id = :customerId)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :keyword, '%')))
                      AND (:category IS NULL OR p.category = :category)
                      AND (:status IS NULL OR p.status = :status)
                      AND (:stockStatus IS NULL
                           OR (:stockStatus = 'OUT_OF_STOCK' AND COALESCE(i.quantity - i.allocated_quantity, 0) <= 0)
                           OR (:stockStatus = 'NEAR_EXPIRY' AND COALESCE(i.quantity - i.allocated_quantity, 0) > 0
                               AND i.expiry_date IS NOT NULL
                               AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))
                           OR (:stockStatus = 'LOW' AND COALESCE(i.quantity - i.allocated_quantity, 0) > 0
                               AND COALESCE(i.quantity - i.allocated_quantity, 0) <= 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY)))
                           OR (:stockStatus = 'SAFE' AND COALESCE(i.quantity - i.allocated_quantity, 0) > 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))))
                    ORDER BY p.id
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM products p
                    LEFT JOIN inventory i ON i.product_id = p.id AND i.customer_id = p.customer_id
                    WHERE (:customerId IS NULL OR p.customer_id = :customerId)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :keyword, '%')))
                      AND (:category IS NULL OR p.category = :category)
                      AND (:status IS NULL OR p.status = :status)
                      AND (:stockStatus IS NULL
                           OR (:stockStatus = 'OUT_OF_STOCK' AND COALESCE(i.quantity - i.allocated_quantity, 0) <= 0)
                           OR (:stockStatus = 'NEAR_EXPIRY' AND COALESCE(i.quantity - i.allocated_quantity, 0) > 0
                               AND i.expiry_date IS NOT NULL
                               AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))
                           OR (:stockStatus = 'LOW' AND COALESCE(i.quantity - i.allocated_quantity, 0) > 0
                               AND COALESCE(i.quantity - i.allocated_quantity, 0) <= 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY)))
                           OR (:stockStatus = 'SAFE' AND COALESCE(i.quantity - i.allocated_quantity, 0) > 100
                               AND (i.expiry_date IS NULL OR i.expiry_date > DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY))))
                    """,
            nativeQuery = true)
    Page<ProductProjection> searchProducts(
            @Param("customerId") Long customerId,
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("status") String status,
            @Param("stockStatus") String stockStatus,
            Pageable pageable);

    @Query(
            value = """
                    SELECT p.id AS id,
                           p.customer_id AS customerId,
                           p.sku AS sku,
                           p.barcode AS barcode,
                           p.name AS name,
                           p.category AS category,
                           p.description AS description,
                           p.unit AS unit,
                           p.length_cm AS lengthCm,
                           p.width_cm AS widthCm,
                           p.height_cm AS heightCm,
                           p.volume_m3 AS volumeM3,
                           p.status AS status,
                           COALESCE(i.quantity, 0) AS onHand,
                           COALESCE(i.allocated_quantity, 0) AS allocated,
                           COALESCE(i.quantity - i.allocated_quantity, 0) AS available,
                           i.expiry_date AS expiryDate,
                           CASE
                             WHEN COALESCE(i.quantity - i.allocated_quantity, 0) <= 0 THEN 'OUT_OF_STOCK'
                             WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY) THEN 'NEAR_EXPIRY'
                             WHEN i.quantity - i.allocated_quantity <= 100 THEN 'LOW'
                             ELSE 'SAFE'
                           END AS stockStatus
                    FROM products p
                    LEFT JOIN inventory i ON i.product_id = p.id AND i.customer_id = p.customer_id
                    WHERE p.id = :id
                    """,
            nativeQuery = true)
    Optional<ProductProjection> findProductViewById(@Param("id") Long id);

    @Query(
            value = """
                    SELECT CASE
                             WHEN EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = :productId)
                               OR EXISTS (SELECT 1 FROM inbound_receipt_items ri WHERE ri.product_id = :productId)
                               OR EXISTS (SELECT 1 FROM outbound_order_items oi WHERE oi.product_id = :productId)
                             THEN TRUE ELSE FALSE
                           END
                    """,
            nativeQuery = true)
    boolean hasBusinessReferences(@Param("productId") Long productId);
}
