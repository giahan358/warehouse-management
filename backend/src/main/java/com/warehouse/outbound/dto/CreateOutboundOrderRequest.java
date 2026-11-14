package com.warehouse.outbound.dto;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreateOutboundOrderRequest(
        @NotBlank @Size(max = 150) String recipientName,
        @NotBlank @Size(max = 20) String recipientPhone,
        @NotBlank @Size(max = 500) String deliveryAddress,
        @NotNull PaymentMethod paymentMethod,
        Carrier carrier,
        BigDecimal codAmount,
        @Size(max = 200) String note,
        @NotEmpty List<@Valid OutboundItemRequest> items) {
}
