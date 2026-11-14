package com.warehouse.inventory.dto;

import com.warehouse.inventory.repository.InventorySummaryProjection;

public record InventoryAdminSummaryResponse(
        long total,
        long safe,
        long low,
        long outOfStock,
        long nearExpiry) {

    public static InventoryAdminSummaryResponse from(InventorySummaryProjection summary) {
        return new InventoryAdminSummaryResponse(
                summary.getTotal(),
                summary.getSafe(),
                summary.getLow(),
                summary.getOutOfStock(),
                summary.getNearExpiry());
    }
}
