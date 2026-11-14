package com.warehouse.outbound.model;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.enums.PaymentMethod;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "outbound_orders")
@Getter
@Setter
public class OutboundOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", nullable = false, unique = true, length = 50)
    private String orderCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Column(name = "delivery_address", nullable = false, length = 500)
    private String deliveryAddress;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Carrier carrier;

    @Column(name = "tracking_code", length = 50)
    private String trackingCode;

    @Column(length = 200)
    private String note;

    @Column(name = "last_status_note", length = 255)
    private String lastStatusNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OutboundStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Column(name = "cod_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal codAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "cod_status", nullable = false, length = 25)
    private CodStatus codStatus;

    @Column(name = "cod_confirmed_by")
    private Long codConfirmedBy;

    @Column(name = "cod_confirmed_at")
    private LocalDateTime codConfirmedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
