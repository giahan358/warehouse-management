package com.warehouse.payment.dto;

import jakarta.validation.constraints.Size;

public record ConfirmCodPaymentRequest(@Size(max = 150) String transactionRef) {
}
