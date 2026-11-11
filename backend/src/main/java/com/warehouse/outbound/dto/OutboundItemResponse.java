package com.warehouse.outbound.dto;

import java.math.BigDecimal;

public record OutboundItemResponse(
        Long itemId,
        Long productId,
        String sku,
        String productName,
        String unit,
        BigDecimal quantityRequested,
        BigDecimal quantityActual,
        BigDecimal unitPrice,
        String note) {
}
