package com.warehouse.inventory.dto;

import com.warehouse.inventory.repository.InventorySummaryProjection;
import java.math.BigDecimal;

public record InventoryCustomerSummaryResponse(
        BigDecimal totalOnHand,
        BigDecimal totalAvailable,
        BigDecimal totalAllocated,
        long skuCount,
        BigDecimal usedM3,
        BigDecimal capacityM3) {

    public static InventoryCustomerSummaryResponse from(
            InventorySummaryProjection summary,
            BigDecimal capacityM3) {
        return new InventoryCustomerSummaryResponse(
                zeroIfNull(summary.getTotalOnHand()),
                zeroIfNull(summary.getTotalAvailable()),
                zeroIfNull(summary.getTotalAllocated()),
                summary.getSkuCount(),
                zeroIfNull(summary.getUsedM3()),
                zeroIfNull(capacityM3));
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
