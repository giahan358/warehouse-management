package com.warehouse.inbound.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record InboundCountingRequest(@NotEmpty List<@Valid ItemCount> items) {
    public record ItemCount(
            @NotNull Long itemId,
            @NotNull @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal actualQuantity,
            @PositiveOrZero @Digits(integer = 9, fraction = 3) BigDecimal damagedQuantity,
            @Size(max = 50) String locationCode,
            @Size(max = 5000) String note) {
    }
}
