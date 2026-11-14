package com.warehouse.dashboard.dto;

import java.math.BigDecimal;

public record ZoneUsageResponse(String zone, BigDecimal usedM3, BigDecimal capacityM3, BigDecimal usedPercent) {
}
