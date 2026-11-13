package com.warehouse.outbound.dto;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.enums.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OutboundOrderDetailResponse(
        Long id,
        String orderCode,
        Long customerId,
        String customerName,
        String recipientName,
        String recipientPhone,
        String deliveryAddress,
        Carrier carrier,
        String trackingCode,
        String note,
        OutboundStatus status,
        PaymentMethod paymentMethod,
        BigDecimal codAmount,
        CodStatus codStatus,
        LocalDateTime createdAt,
        List<OutboundItemResponse> items) {
}
