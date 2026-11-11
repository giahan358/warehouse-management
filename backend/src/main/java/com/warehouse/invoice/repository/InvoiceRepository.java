package com.warehouse.invoice.repository;

import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.invoice.model.Invoice;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> findLockedById(@Param("id") Long id);

    @Query("select i from Invoice i join Customer c on c.id = i.customerId "
            + "where (:customerId is null or i.customerId = :customerId) "
            + "and (:status is null or i.status = :status) "
            + "and (:fromDate is null or i.createdAt >= :fromDate) "
            + "and (:toDate is null or i.createdAt < :toDate) "
            + "and (:keyword is null or :keyword = '' or lower(i.invoiceCode) like lower(concat('%', :keyword, '%')) "
            + "or lower(i.description) like lower(concat('%', :keyword, '%')) "
            + "or lower(c.businessName) like lower(concat('%', :keyword, '%')) "
            + "or lower(coalesce(c.taxCode, '')) like lower(concat('%', :keyword, '%'))) "
            + "order by i.createdAt desc, i.id desc")
    Page<Invoice> searchInvoices(@Param("customerId") Long customerId,
            @Param("status") InvoiceStatus status,
            @Param("fromDate") java.time.LocalDateTime fromDate,
            @Param("toDate") java.time.LocalDateTime toDate,
            @Param("keyword") String keyword,
            Pageable pageable);

    List<Invoice> findByCustomerIdAndStatusInOrderByDueDateAsc(Long customerId, List<InvoiceStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Invoice> findByStatusAndDueDateBefore(InvoiceStatus status, LocalDate dueDate);

    @Query(value = "select count(*) as totalInvoices, "
            + "coalesce(sum(case when status='UNPAID' then 1 else 0 end),0) as totalUnpaid, "
            + "coalesce(sum(case when status='OVERDUE' then 1 else 0 end),0) as totalOverdue, "
            + "coalesce(sum(case when status='PAID' then total_amount else 0 end),0) as totalPaidAmount, "
            + "coalesce(sum(case when status in ('UNPAID','OVERDUE') then total_amount else 0 end),0) as totalUnpaidAmount "
            + "from invoices where (:month is null or date_format(created_at, '%Y-%m') = :month)", nativeQuery = true)
    InvoiceSummaryProjection summarize(@Param("month") String month);

    List<Invoice> findByCustomerIdAndStatusInAndDueDateIsNotNullOrderByDueDateAsc(
            Long customerId, List<InvoiceStatus> statuses);
}
