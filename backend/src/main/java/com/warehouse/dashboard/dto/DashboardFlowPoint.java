package com.warehouse.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardFlowPoint(LocalDate date, BigDecimal inboundQuantity, BigDecimal outboundQuantity) {
}
