package com.warehouse.dashboard.dto;

import java.math.BigDecimal;

public record CustomerDashboardResponse(BigDecimal usedM3, BigDecimal capacityM3, BigDecimal usedPercent,
        BigDecimal totalOnHand, BigDecimal totalAvailable, BigDecimal totalAllocated, long skuCount,
        long activeInboundCount, BigDecimal provisionalFeeThisPeriod, long unpaidInvoiceCount) {
}
