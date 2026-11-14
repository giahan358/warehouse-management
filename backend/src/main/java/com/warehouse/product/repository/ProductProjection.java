package com.warehouse.product.repository;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface ProductProjection {
    Long getId();

    Long getCustomerId();

    String getSku();

    String getBarcode();

    String getName();

    String getCategory();

    String getDescription();

    String getUnit();

    BigDecimal getLengthCm();

    BigDecimal getWidthCm();

    BigDecimal getHeightCm();

    BigDecimal getVolumeM3();

    String getStatus();

    BigDecimal getOnHand();

    BigDecimal getAllocated();

    BigDecimal getAvailable();

    LocalDate getExpiryDate();

    String getStockStatus();
}
