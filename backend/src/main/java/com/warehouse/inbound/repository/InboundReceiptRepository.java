package com.warehouse.inbound.repository;

import com.warehouse.inbound.model.InboundReceipt;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InboundReceiptRepository extends JpaRepository<InboundReceipt, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM InboundReceipt r WHERE r.id = :id")
    Optional<InboundReceipt> findByIdForUpdate(@Param("id") Long id);

    @Query(
            value = """
                    SELECT r.id AS id,
                           r.receipt_code AS receiptCode,
                           r.customer_id AS customerId,
                           c.business_name AS customerName,
                           r.status AS status,
                           r.vehicle_plate AS vehiclePlate,
                           r.dock_code AS dockCode,
                           r.time_slot AS timeSlot,
                           r.expected_at AS expectedAt,
                           r.received_at AS receivedAt,
                           COALESCE((SELECT SUM(i.expected_quantity)
                                       FROM inbound_receipt_items i WHERE i.receipt_id = r.id), 0) AS declaredTotal,
                           COALESCE((SELECT SUM(i.actual_quantity)
                                       FROM inbound_receipt_items i WHERE i.receipt_id = r.id), 0) AS actualTotal,
                           COALESCE((SELECT SUM(i.damaged_quantity)
                                       FROM inbound_receipt_items i WHERE i.receipt_id = r.id), 0) AS damagedTotal,
                           CASE
                             WHEN EXISTS (SELECT 1 FROM inbound_receipt_items i
                                           WHERE i.receipt_id = r.id AND i.actual_quantity IS NULL)
                             THEN NULL
                             ELSE COALESCE((SELECT SUM(i.actual_quantity - i.expected_quantity)
                                              FROM inbound_receipt_items i WHERE i.receipt_id = r.id), 0)
                           END AS variance
                    FROM inbound_receipts r
                    JOIN customers c ON c.id = r.customer_id
                    WHERE (:customerId IS NULL OR r.customer_id = :customerId)
                      AND (:status IS NULL OR r.status = :status)
                      AND (:fromDate IS NULL OR DATE(r.expected_at) >= :fromDate)
                      AND (:toDate IS NULL OR DATE(r.expected_at) <= :toDate)
                      AND (:dockCode IS NULL OR LOWER(r.dock_code) = LOWER(:dockCode))
                      AND (:timeSlot IS NULL OR r.time_slot = :timeSlot)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR LOWER(r.receipt_code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(c.business_name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(r.vehicle_plate) LIKE LOWER(CONCAT('%', :keyword, '%')))
                    ORDER BY r.created_at DESC, r.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM inbound_receipts r
                    JOIN customers c ON c.id = r.customer_id
                    WHERE (:customerId IS NULL OR r.customer_id = :customerId)
                      AND (:status IS NULL OR r.status = :status)
                      AND (:fromDate IS NULL OR DATE(r.expected_at) >= :fromDate)
                      AND (:toDate IS NULL OR DATE(r.expected_at) <= :toDate)
                      AND (:dockCode IS NULL OR LOWER(r.dock_code) = LOWER(:dockCode))
                      AND (:timeSlot IS NULL OR r.time_slot = :timeSlot)
                      AND (:keyword IS NULL OR :keyword = ''
                           OR LOWER(r.receipt_code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(c.business_name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(r.vehicle_plate) LIKE LOWER(CONCAT('%', :keyword, '%')))
                    """,
            nativeQuery = true)
    Page<InboundReceiptSummaryProjection> searchReceipts(
            @Param("customerId") Long customerId,
            @Param("status") String status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("keyword") String keyword,
            @Param("dockCode") String dockCode,
            @Param("timeSlot") String timeSlot,
            Pageable pageable);

    @Query(
            value = """
                    SELECT COUNT(*) AS allCount,
                           COALESCE(SUM(CASE WHEN r.status = 'SCHEDULED' THEN 1 ELSE 0 END), 0) AS scheduled,
                           COALESCE(SUM(CASE WHEN r.status = 'RECEIVING' THEN 1 ELSE 0 END), 0) AS receiving,
                           COALESCE(SUM(CASE WHEN r.status = 'CONFIRMED' THEN 1 ELSE 0 END), 0) AS confirmed,
                           COALESCE(SUM(CASE WHEN r.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled
                    FROM inbound_receipts r
                    WHERE (:customerId IS NULL OR r.customer_id = :customerId)
                      AND (:fromDate IS NULL OR DATE(r.expected_at) >= :fromDate)
                      AND (:toDate IS NULL OR DATE(r.expected_at) <= :toDate)
                    """,
            nativeQuery = true)
    InboundStatusCountsProjection getStatusCounts(
            @Param("customerId") Long customerId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
