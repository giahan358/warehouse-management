package com.warehouse.inventory.repository;

public interface InventorySummaryProjection {
    long getTotal();

    long getSafe();

    long getLow();

    long getOutOfStock();

    long getNearExpiry();

    java.math.BigDecimal getTotalOnHand();

    java.math.BigDecimal getTotalAvailable();

    java.math.BigDecimal getTotalAllocated();

    long getSkuCount();

    java.math.BigDecimal getUsedM3();
}
