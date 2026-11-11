package com.warehouse.invoice.dto;

import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoicePaymentResponse(Long id, PaymentMethod paymentMethod, PaymentStatus status,
        BigDecimal amount, String vnpTransactionNo, String vnpBankCode, LocalDateTime paidAt) {
}
