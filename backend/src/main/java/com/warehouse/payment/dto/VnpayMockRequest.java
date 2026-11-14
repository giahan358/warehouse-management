package com.warehouse.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record VnpayMockRequest(@NotBlank String txnRef,
        @NotBlank String responseCode,
        @NotNull @Positive BigDecimal amount) {
}
