package com.warehouse.invoice.dto;

import java.math.BigDecimal;

public record InvoiceSummaryResponse(long totalInvoices, long totalUnpaid, long totalOverdue,
        BigDecimal totalPaidAmount, BigDecimal totalUnpaidAmount) {
}
