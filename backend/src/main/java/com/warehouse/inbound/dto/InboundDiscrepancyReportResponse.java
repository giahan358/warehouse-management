package com.warehouse.inbound.dto;

import java.math.BigDecimal;
import java.util.List;

public record InboundDiscrepancyReportResponse(
        Long receiptId,
        String receiptCode,
        BigDecimal shortageTotal,
        BigDecimal damagedTotal,
        List<DiscrepancyItem> items) {
    public record DiscrepancyItem(
            Long itemId,
            Long productId,
            String sku,
            String productName,
            String unit,
            BigDecimal expectedQuantity,
            BigDecimal actualQuantity,
            BigDecimal damagedQuantity,
            BigDecimal variance,
            String locationCode,
            String note) {
    }
}
