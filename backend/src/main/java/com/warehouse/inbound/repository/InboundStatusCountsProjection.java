package com.warehouse.inbound.repository;

public interface InboundStatusCountsProjection {
    Long getAllCount();
    Long getScheduled();
    Long getReceiving();
    Long getConfirmed();
    Long getCancelled();
}
