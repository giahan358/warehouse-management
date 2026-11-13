package com.warehouse.inbound.dto;

import com.warehouse.common.enums.InboundTimeSlot;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public record CreateInboundReceiptRequest(
        Long customerId,
        @NotNull LocalDateTime expectedAt,
        @Size(max = 20) String vehiclePlate,
        InboundTimeSlot timeSlot,
        @Size(max = 5000) String note,
        @NotEmpty List<@Valid InboundItemRequest> items) {
}
