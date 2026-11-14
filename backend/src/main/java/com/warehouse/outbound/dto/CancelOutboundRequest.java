package com.warehouse.outbound.dto;

import jakarta.validation.constraints.Size;

public record CancelOutboundRequest(@Size(max = 255) String reason) {
}
