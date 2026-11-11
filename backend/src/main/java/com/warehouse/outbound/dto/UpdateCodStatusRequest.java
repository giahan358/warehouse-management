package com.warehouse.outbound.dto;

import com.warehouse.common.enums.CodStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateCodStatusRequest(@NotNull CodStatus codStatus) {
}
