package com.warehouse.outbound.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateOutboundActualQuantityRequest(
        @NotNull @DecimalMin("0.000") BigDecimal quantityActual,
        @Size(max = 255) String note) {
}
