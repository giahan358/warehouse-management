package com.warehouse.payment.repository;

import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.PaymentStatus;
import com.warehouse.payment.model.Payment;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByVnpTxnRef(String vnpTxnRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findLockedById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.vnpTxnRef = :txnRef")
    Optional<Payment> findLockedByVnpTxnRef(@Param("txnRef") String txnRef);

    java.util.List<Payment> findByInvoiceIdOrderByIdDesc(Long invoiceId);

    boolean existsByInvoiceIdAndPaymentMethodAndStatus(Long invoiceId, PaymentMethod method, PaymentStatus status);

    @Query("select p from Payment p join Invoice i on i.id = p.invoiceId "
            + "where (:method is null or p.paymentMethod = :method) "
            + "and (:status is null or p.status = :status) "
            + "and (:invoiceId is null or p.invoiceId = :invoiceId) "
            + "and (:fromDate is null or p.paidAt >= :fromDate) "
            + "and (:toDate is null or p.paidAt < :toDate) "
            + "and (:customerId is null or i.customerId = :customerId) "
            + "order by p.id desc")
    Page<Payment> searchPayments(@Param("method") PaymentMethod method,
            @Param("status") PaymentStatus status, @Param("invoiceId") Long invoiceId,
            @Param("fromDate") LocalDateTime fromDate, @Param("toDate") LocalDateTime toDate,
            @Param("customerId") Long customerId, Pageable pageable);
}
