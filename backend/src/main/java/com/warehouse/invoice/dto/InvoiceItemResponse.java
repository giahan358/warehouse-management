package com.warehouse.invoice.dto;

import java.math.BigDecimal;

public record InvoiceItemResponse(Long id, String description, BigDecimal quantity,
        String unit, BigDecimal unitPrice, BigDecimal lineAmount) {
}
