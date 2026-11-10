package com.warehouse.email.model;

import com.warehouse.common.enums.EmailNotificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "email_notifications")
@Getter @Setter
public class EmailNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "customer_id", nullable = false)
    private Long customerId;
    @Column(name = "outbound_order_id")
    private Long outboundOrderId;
    @Column(name = "sent_by")
    private Long sentBy;
    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;
    @Column(nullable = false, length = 255)
    private String subject;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmailNotificationStatus status;
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
