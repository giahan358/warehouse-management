package com.warehouse.outbound.dto;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.enums.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OutboundOrderResponse(
        Long id,
        String orderCode,
        String customerName,
        String recipientName,
        String recipientPhone,
        String deliveryAddress,
        Carrier carrier,
        String trackingCode,
        OutboundStatus status,
        PaymentMethod paymentMethod,
        BigDecimal codAmount,
        CodStatus codStatus,
        long itemCount,
        BigDecimal totalQuantity,
        LocalDateTime createdAt) {
}
