package com.warehouse.payment.dto;

import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(Long id, Long invoiceId, String invoiceCode, PaymentMethod paymentMethod,
        BigDecimal amount, PaymentStatus status, String transactionRef, String vnpTxnRef,
        String vnpTransactionNo, String vnpBankCode, String vnpResponseCode,
        LocalDateTime paidAt) {
}
