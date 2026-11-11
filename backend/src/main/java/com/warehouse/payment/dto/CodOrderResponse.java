package com.warehouse.payment.dto;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.OutboundStatus;
import java.math.BigDecimal;

public record CodOrderResponse(Long orderId, String orderCode, String trackingCode, Carrier carrier,
        String customerName, String recipientName, String deliveryAddress,
        OutboundStatus shippingStatus, BigDecimal codAmount, CodStatus codStatus,
        BigDecimal offsetTotal, BigDecimal remainingAmount) {
}
