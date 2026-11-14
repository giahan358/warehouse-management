package com.warehouse.invoice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record InvoiceLineRequest(
        @NotBlank @Size(max = 255) String description,
        @NotNull @DecimalMin("0.001") BigDecimal quantity,
        @NotBlank @Size(max = 30) String unit,
        @NotNull @DecimalMin("0.00") BigDecimal unitPrice) {
}
