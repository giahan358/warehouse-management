package com.warehouse.inventory.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public interface InventoryProjection {
    Long getInventoryId();

    Long getCustomerId();

    String getCustomerName();

    Long getProductId();

    String getSku();

    String getProductName();

    String getCategory();

    String getUnit();

    String getLocationCode();

    String getZone();

    BigDecimal getOnHand();

    BigDecimal getAllocated();

    BigDecimal getAvailable();

    String getStockStatus();

    LocalDate getExpiryDate();

    LocalDateTime getLastInboundAt();

    LocalDateTime getUpdatedAt();
}
