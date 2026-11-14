package com.warehouse.outbound.repository;

import java.math.BigDecimal;

public interface CodSummaryProjection {
    Long getPendingCount();
    BigDecimal getPendingAmount();
    BigDecimal getCollectedAmount();
    BigDecimal getConfirmedAmount();
    BigDecimal getReturnedAmount();
}
