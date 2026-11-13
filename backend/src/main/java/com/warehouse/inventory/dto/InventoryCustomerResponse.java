package com.warehouse.inventory.dto;

import com.warehouse.common.enums.ProductCategory;
import com.warehouse.common.enums.StockStatus;
import com.warehouse.inventory.repository.InventoryProjection;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InventoryCustomerResponse(
        Long inventoryId,
        Long customerId,
        Long productId,
        String sku,
        String productName,
        ProductCategory category,
        String unit,
        String locationCode,
        String zone,
        BigDecimal onHand,
        BigDecimal allocated,
        BigDecimal available,
        StockStatus stockStatus,
        LocalDate expiryDate,
        LocalDateTime lastInboundAt,
        LocalDateTime updatedAt) {

    public static InventoryCustomerResponse from(InventoryProjection inventory) {
        return new InventoryCustomerResponse(
                inventory.getInventoryId(),
                inventory.getCustomerId(),
                inventory.getProductId(),
                inventory.getSku(),
                inventory.getProductName(),
                inventory.getCategory() == null ? null : ProductCategory.valueOf(inventory.getCategory()),
                inventory.getUnit(),
                inventory.getLocationCode(),
                inventory.getZone(),
                inventory.getOnHand(),
                inventory.getAllocated(),
                inventory.getAvailable(),
                StockStatus.valueOf(inventory.getStockStatus()),
                inventory.getExpiryDate(),
                inventory.getLastInboundAt(),
                inventory.getUpdatedAt());
    }
}
