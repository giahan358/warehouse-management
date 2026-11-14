package com.warehouse.payment.dto;

import java.math.BigDecimal;

public record CodPaidInvoiceResponse(Long id, String invoiceCode, BigDecimal totalAmount) {
}
