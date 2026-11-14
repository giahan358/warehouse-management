package com.warehouse.outbound.repository;

public interface OutboundItemCountProjection {
    Long getOrderId();
    Long getItemCount();
}
