package com.warehouse.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateInventoryLocationRequest(@NotBlank @Size(max = 50) String locationCode) {
}
