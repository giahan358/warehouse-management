package com.warehouse.inbound.dto;

import com.warehouse.common.enums.InboundTimeSlot;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record UpdateInboundReceiptRequest(
        @NotNull LocalDateTime expectedAt,
        @Size(max = 20) String vehiclePlate,
        InboundTimeSlot timeSlot,
        @Size(max = 5000) String note) {
}
