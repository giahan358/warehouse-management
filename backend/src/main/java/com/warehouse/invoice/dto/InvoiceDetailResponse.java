package com.warehouse.invoice.dto;

import com.warehouse.common.enums.InvoiceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceDetailResponse(Long id, String invoiceCode, Long customerId, String customerName,
        String taxCode, Long outboundOrderId, String description, LocalDate periodStart,
        LocalDate periodEnd, LocalDate dueDate, BigDecimal amount, BigDecimal vatRate,
        BigDecimal vatAmount, BigDecimal totalAmount, InvoiceStatus status, LocalDateTime createdAt,
        List<InvoiceItemResponse> items, List<InvoicePaymentResponse> payments) {
}
