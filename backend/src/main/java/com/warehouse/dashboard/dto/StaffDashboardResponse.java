package com.warehouse.dashboard.dto;

public record StaffDashboardResponse(long receivingScheduledToday, long openCountingReceipts,
        long outboundToPrepare, long outboundPacked, long discrepancyReports, String shiftName) {
}
