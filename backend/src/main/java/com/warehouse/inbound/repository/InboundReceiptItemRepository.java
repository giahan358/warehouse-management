package com.warehouse.inbound.repository;

import com.warehouse.inbound.model.InboundReceiptItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InboundReceiptItemRepository extends JpaRepository<InboundReceiptItem, Long> {
    List<InboundReceiptItem> findByReceiptIdOrderById(Long receiptId);

    Optional<InboundReceiptItem> findByIdAndReceiptId(Long id, Long receiptId);

    Optional<InboundReceiptItem> findByReceiptIdAndProductId(Long receiptId, Long productId);

    long countByReceiptId(Long receiptId);

    @Query(
            value = """
                    SELECT i.id AS itemId,
                           p.id AS productId,
                           p.sku AS sku,
                           p.name AS productName,
                           p.unit AS unit,
                           i.expected_quantity AS expectedQuantity,
                           i.actual_quantity AS actualQuantity,
                           i.damaged_quantity AS damagedQuantity,
                           i.location_code AS locationCode,
                           i.note AS note
                    FROM inbound_receipt_items i
                    JOIN products p ON p.id = i.product_id
                    WHERE i.receipt_id = :receiptId
                    ORDER BY i.id
                    """,
            nativeQuery = true)
    List<InboundReceiptItemProjection> findItemViews(@Param("receiptId") Long receiptId);
}
