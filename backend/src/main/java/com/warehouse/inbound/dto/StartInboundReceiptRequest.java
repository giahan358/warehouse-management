package com.warehouse.inbound.dto;

import jakarta.validation.constraints.Size;

public record StartInboundReceiptRequest(@Size(max = 20) String dockCode) {
}
