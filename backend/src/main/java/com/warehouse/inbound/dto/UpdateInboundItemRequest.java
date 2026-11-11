package com.warehouse.inbound.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record UpdateInboundItemRequest(
        @NotNull @Positive @Digits(integer = 9, fraction = 3) BigDecimal expectedQuantity) {
}
