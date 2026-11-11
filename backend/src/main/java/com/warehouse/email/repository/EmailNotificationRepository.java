package com.warehouse.email.repository;

import com.warehouse.common.enums.EmailNotificationStatus;
import com.warehouse.email.model.EmailNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailNotificationRepository extends JpaRepository<EmailNotification, Long> {
    @Query("select e from EmailNotification e where (:customerId is null or e.customerId = :customerId) "
            + "and (:status is null or e.status = :status) "
            + "and (:orderId is null or e.outboundOrderId = :orderId) order by e.createdAt desc")
    Page<EmailNotification> search(@Param("customerId") Long customerId,
            @Param("status") EmailNotificationStatus status,
            @Param("orderId") Long orderId, Pageable pageable);
}
