package com.warehouse.inbound.dto;

import jakarta.validation.constraints.Size;

public record CancelInboundReceiptRequest(@Size(max = 1000) String reason) {
}
