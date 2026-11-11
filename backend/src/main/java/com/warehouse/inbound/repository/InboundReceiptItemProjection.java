package com.warehouse.inbound.repository;

import java.math.BigDecimal;

public interface InboundReceiptItemProjection {
    Long getItemId();
    Long getProductId();
    String getSku();
    String getProductName();
    String getUnit();
    BigDecimal getExpectedQuantity();
    BigDecimal getActualQuantity();
    BigDecimal getDamagedQuantity();
    String getLocationCode();
    String getNote();
}
