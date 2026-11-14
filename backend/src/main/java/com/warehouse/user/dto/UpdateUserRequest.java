package com.warehouse.user.dto;

import com.warehouse.common.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotNull UserStatus status,
        @Size(max = 255) String reason) {
}
