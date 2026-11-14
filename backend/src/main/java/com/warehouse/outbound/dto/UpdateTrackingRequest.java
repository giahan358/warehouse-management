package com.warehouse.outbound.dto;

import com.warehouse.common.enums.Carrier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateTrackingRequest(
        @NotNull Carrier carrier,
        @NotBlank @Size(max = 50) String trackingCode) {
}
