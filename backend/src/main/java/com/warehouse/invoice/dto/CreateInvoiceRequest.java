package com.warehouse.invoice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateInvoiceRequest(
        @NotNull @Positive Long customerId,
        @Positive Long outboundOrderId,
        @NotBlank @Size(max = 255) String description,
        LocalDate periodStart,
        LocalDate periodEnd,
        LocalDate dueDate,
        @DecimalMin("0.00") BigDecimal vatRate,
        @NotEmpty List<@Valid InvoiceLineRequest> items) {
}
