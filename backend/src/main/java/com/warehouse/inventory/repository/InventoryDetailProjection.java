package com.warehouse.inventory.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface InventoryDetailProjection {
    Long getProductId();

    String getProductName();

    BigDecimal getQuantity();

    BigDecimal getAllocated();

    BigDecimal getAvailable();

    String getLocationCode();

    LocalDateTime getUpdatedAt();
}
