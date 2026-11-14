package com.warehouse.outbound.dto;

import jakarta.validation.constraints.Size;

public record MarkReturnedRequest(@Size(max = 255) String note) {
}
