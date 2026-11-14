package com.warehouse.inbound.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record InboundScanRequest(
        @NotBlank @Size(max = 50) String barcode,
        @Positive @Digits(integer = 9, fraction = 3) BigDecimal quantity) {
}
