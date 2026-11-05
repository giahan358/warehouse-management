package com.warehouse.inbound.dto;

import com.warehouse.inbound.repository.InboundStatusCountsProjection;

public record InboundStatusCountsResponse(long all, long scheduled, long receiving, long confirmed, long cancelled) {
    public static InboundStatusCountsResponse from(InboundStatusCountsProjection projection) {
        return new InboundStatusCountsResponse(
                projection.getAllCount(),
                projection.getScheduled(),
                projection.getReceiving(),
                projection.getConfirmed(),
                projection.getCancelled());
    }
}
