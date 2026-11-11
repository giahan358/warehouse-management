package com.warehouse.email.dto;

import com.warehouse.common.enums.EmailNotificationStatus;
import java.time.LocalDateTime;

public record EmailNotificationResponse(Long id, Long customerId, Long outboundOrderId,
        Long sentBy, String recipientEmail, String subject, String content,
        EmailNotificationStatus status, String errorMessage, LocalDateTime sentAt,
        LocalDateTime createdAt) {
}
