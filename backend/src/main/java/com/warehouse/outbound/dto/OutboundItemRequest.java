package com.warehouse.outbound.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record OutboundItemRequest(
        @NotNull @Positive Long productId,
        @NotNull @DecimalMin(value = "0.001") BigDecimal quantityRequested) {
}
