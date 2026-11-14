package com.warehouse.dashboard.dto;

import java.math.BigDecimal;

public record AdminDashboardResponse(BigDecimal capacityM3, BigDecimal usedM3, BigDecimal usedPercent,
        long activeCustomers, long lockedCustomers, long asnToday, long receivingCount,
        long activeOutboundOrders, BigDecimal codPendingAmount, BigDecimal serviceFeeThisMonth,
        long unpaidInvoices, long totalProducts) {
}
