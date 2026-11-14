package com.warehouse.invoice.dto;

import com.warehouse.common.enums.InvoiceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;

public record InvoiceListResponse(Long id, String invoiceCode, String customerName, String taxCode,
        String description, LocalDate periodStart, LocalDate periodEnd, LocalDate dueDate,
        BigDecimal amount, BigDecimal vatRate, BigDecimal vatAmount, BigDecimal totalAmount,
        InvoiceStatus status) {
}
