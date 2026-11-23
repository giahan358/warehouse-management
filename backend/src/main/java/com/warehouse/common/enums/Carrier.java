package com.warehouse.common.enums;

public enum Carrier {
    GHN,
    VIETTEL_POST,
    SELF_PICKUP,
    /** Legacy value found in existing outbound_orders rows; not offered for new orders. */
    GHTK
}
