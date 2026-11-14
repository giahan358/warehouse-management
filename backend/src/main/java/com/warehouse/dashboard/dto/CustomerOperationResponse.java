package com.warehouse.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CustomerOperationResponse(String type, String code, LocalDateTime createdAt,
        long itemCount, BigDecimal totalQuantity, String status, boolean cancellable) {
}
