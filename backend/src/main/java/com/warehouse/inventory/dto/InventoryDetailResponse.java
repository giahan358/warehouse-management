package com.warehouse.inventory.dto;

import com.warehouse.inventory.repository.InventoryDetailProjection;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InventoryDetailResponse(
        Long productId,
        String productName,
        BigDecimal quantity,
        BigDecimal allocated,
        BigDecimal available,
        String locationCode,
        LocalDateTime updatedAt) {

    public static InventoryDetailResponse from(InventoryDetailProjection inventory) {
        return new InventoryDetailResponse(
                inventory.getProductId(),
                inventory.getProductName(),
                inventory.getQuantity(),
                inventory.getAllocated(),
                inventory.getAvailable(),
                inventory.getLocationCode(),
                inventory.getUpdatedAt());
    }

    public static InventoryDetailResponse empty(Long productId, String productName) {
        return new InventoryDetailResponse(
                productId,
                productName,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                null,
                null);
    }
}
