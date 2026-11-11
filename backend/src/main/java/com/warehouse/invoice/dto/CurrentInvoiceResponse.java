package com.warehouse.invoice.dto;

import java.math.BigDecimal;

public record CurrentInvoiceResponse(InvoiceListResponse invoice, Long daysLeft, BigDecimal amountDue) {
}
