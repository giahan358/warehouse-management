package com.warehouse.user.dto;

public record UserSummaryResponse(
        long totalUsers,
        long customerCount,
        long staffCount,
        long lockedCount) {
}
