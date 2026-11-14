package com.warehouse.outbound.repository;

import com.warehouse.common.enums.OutboundStatus;

public interface OutboundStatusCountProjection {
    OutboundStatus getStatus();
    Long getCount();
}
