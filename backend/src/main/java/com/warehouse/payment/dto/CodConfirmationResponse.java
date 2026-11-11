package com.warehouse.payment.dto;

import com.warehouse.common.enums.CodStatus;
import java.math.BigDecimal;
import java.util.List;

public record CodConfirmationResponse(
        Long orderId,
        BigDecimal codAmount,
        BigDecimal offsetTotal,
        BigDecimal remainingAmount,
        CodStatus codStatus,
        List<CodPaidInvoiceResponse> paidInvoices) {
}
