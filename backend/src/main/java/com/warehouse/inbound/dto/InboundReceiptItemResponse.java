package com.warehouse.inbound.dto;

import com.warehouse.inbound.repository.InboundReceiptItemProjection;
import java.math.BigDecimal;

public record InboundReceiptItemResponse(
        Long itemId,
        Long productId,
        String sku,
        String productName,
        String unit,
        BigDecimal expectedQuantity,
        BigDecimal actualQuantity,
        BigDecimal damagedQuantity,
        String locationCode,
        String note,
        BigDecimal variance) {

    public static InboundReceiptItemResponse from(InboundReceiptItemProjection projection) {
        BigDecimal actual = projection.getActualQuantity();
        return new InboundReceiptItemResponse(
                projection.getItemId(),
                projection.getProductId(),
                projection.getSku(),
                projection.getProductName(),
                projection.getUnit(),
                projection.getExpectedQuantity(),
                actual,
                projection.getDamagedQuantity(),
                projection.getLocationCode(),
                projection.getNote(),
                actual == null ? null : actual.subtract(projection.getExpectedQuantity()));
    }
}
