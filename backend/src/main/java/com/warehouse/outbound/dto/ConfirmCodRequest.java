package com.warehouse.outbound.dto;

import jakarta.validation.constraints.Positive;
import java.util.List;

public record ConfirmCodRequest(
        List<@Positive Long> offsetInvoiceIds,
        String transactionRef) {
}
