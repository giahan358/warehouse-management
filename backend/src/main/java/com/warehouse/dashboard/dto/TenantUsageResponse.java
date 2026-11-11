package com.warehouse.dashboard.dto;

import java.math.BigDecimal;

public record TenantUsageResponse(Long customerId, String businessName, BigDecimal usedM3,
        BigDecimal capacityM3, BigDecimal quotaPercent, BigDecimal estimatedMonthlyFee) {
}
