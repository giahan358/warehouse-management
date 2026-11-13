package com.warehouse.inbound.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface InboundReceiptSummaryProjection {
    Long getId();
    String getReceiptCode();
    Long getCustomerId();
    String getCustomerName();
    String getStatus();
    String getVehiclePlate();
    String getDockCode();
    String getTimeSlot();
    LocalDateTime getExpectedAt();
    LocalDateTime getReceivedAt();
    BigDecimal getDeclaredTotal();
    BigDecimal getActualTotal();
    BigDecimal getDamagedTotal();
    BigDecimal getVariance();
}
