package com.warehouse.payment.dto;

import java.math.BigDecimal;

public record CodSummaryResponse(long pendingCount, BigDecimal pendingAmount, BigDecimal collectedAmount,
        BigDecimal confirmedAmount, BigDecimal returnedAmount) {
}
