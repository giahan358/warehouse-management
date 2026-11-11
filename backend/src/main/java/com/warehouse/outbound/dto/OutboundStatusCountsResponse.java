package com.warehouse.outbound.dto;

public record OutboundStatusCountsResponse(
        long pending,
        long preparing,
        long packed,
        long inDelivery,
        long delivered,
        long returned,
        long cancelled) {
}
