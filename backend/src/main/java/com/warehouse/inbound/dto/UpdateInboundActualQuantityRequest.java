package com.warehouse.inbound.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateInboundActualQuantityRequest(
        @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal actualQuantity,
        @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal damagedQuantity,
        @Size(max = 50) String locationCode,
        @Size(max = 5000) String note) {
}
