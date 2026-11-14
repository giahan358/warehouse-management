package com.warehouse.dashboard.dto;

import java.time.LocalDateTime;

public record DashboardTaskResponse(String taskType, String refType, Long refId, String refCode,
        String customerName, String locationOrDock, LocalDateTime dueAt, String status) {
}
