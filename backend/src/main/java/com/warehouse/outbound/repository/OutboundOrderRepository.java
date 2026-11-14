package com.warehouse.outbound.repository;

import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.outbound.model.OutboundOrder;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OutboundOrderRepository extends JpaRepository<OutboundOrder, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from OutboundOrder o where o.id = :id")
    Optional<OutboundOrder> findLockedById(@Param("id") Long id);

    @Query(value = """
            select o from OutboundOrder o
            where (:customerId is null or o.customerId = :customerId)
              and (:status is null or o.status = :status)
              and (:carrier is null or o.carrier = :carrier)
              and (:fromDate is null or o.createdAt >= :fromDate)
              and (:toDate is null or o.createdAt < :toDate)
              and (:keyword is null or :keyword = ''
                   or lower(o.orderCode) like lower(concat('%', :keyword, '%'))
                   or lower(o.recipientName) like lower(concat('%', :keyword, '%'))
                   or o.recipientPhone like concat('%', :keyword, '%')
                   or lower(coalesce(o.trackingCode, '')) like lower(concat('%', :keyword, '%')))
            """,
            countQuery = """
            select count(o) from OutboundOrder o
            where (:customerId is null or o.customerId = :customerId)
              and (:status is null or o.status = :status)
              and (:carrier is null or o.carrier = :carrier)
              and (:fromDate is null or o.createdAt >= :fromDate)
              and (:toDate is null or o.createdAt < :toDate)
              and (:keyword is null or :keyword = ''
                   or lower(o.orderCode) like lower(concat('%', :keyword, '%'))
                   or lower(o.recipientName) like lower(concat('%', :keyword, '%'))
                   or o.recipientPhone like concat('%', :keyword, '%')
                   or lower(coalesce(o.trackingCode, '')) like lower(concat('%', :keyword, '%')))
            """)
    Page<OutboundOrder> searchOrders(
            @Param("customerId") Long customerId,
            @Param("status") OutboundStatus status,
            @Param("carrier") com.warehouse.common.enums.Carrier carrier,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("select o.status as status, count(o) as count from OutboundOrder o "
            + "where (:customerId is null or o.customerId = :customerId) "
            + "and (:fromDate is null or o.createdAt >= :fromDate) "
            + "and (:toDate is null or o.createdAt < :toDate) group by o.status")
    List<OutboundStatusCountProjection> countByStatus(
            @Param("customerId") Long customerId,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate);

    long countByCustomerIdAndStatusIn(Long customerId, List<OutboundStatus> statuses);

    @Query("select o from OutboundOrder o where o.codAmount > 0 "
            + "and (:customerId is null or o.customerId = :customerId) "
            + "and (:codStatus is null or o.codStatus = :codStatus) "
            + "and (:carrier is null or o.carrier = :carrier) "
            + "and (:keyword is null or :keyword = '' or lower(o.orderCode) like lower(concat('%', :keyword, '%')) "
            + "or lower(coalesce(o.trackingCode, '')) like lower(concat('%', :keyword, '%'))) "
            + "order by o.createdAt desc")
    Page<OutboundOrder> searchCodOrders(@Param("customerId") Long customerId,
            @Param("codStatus") com.warehouse.common.enums.CodStatus codStatus,
            @Param("carrier") com.warehouse.common.enums.Carrier carrier,
            @Param("keyword") String keyword, Pageable pageable);

    @Query("select coalesce(sum(case when o.codStatus = com.warehouse.common.enums.CodStatus.PENDING_RECONCILE then 1 else 0 end), 0) as pendingCount, "
            + "coalesce(sum(case when o.codStatus = com.warehouse.common.enums.CodStatus.PENDING_RECONCILE then o.codAmount else 0 end), 0) as pendingAmount, "
            + "coalesce(sum(case when o.codStatus = com.warehouse.common.enums.CodStatus.COLLECTED then o.codAmount else 0 end), 0) as collectedAmount, "
            + "coalesce(sum(case when o.codStatus = com.warehouse.common.enums.CodStatus.CONFIRMED then o.codAmount else 0 end), 0) as confirmedAmount, "
            + "coalesce(sum(case when o.codStatus = com.warehouse.common.enums.CodStatus.RETURNED then o.codAmount else 0 end), 0) as returnedAmount "
            + "from OutboundOrder o where o.codAmount > 0")
    CodSummaryProjection summarizeCod();
}
