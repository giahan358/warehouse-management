package com.warehouse.invoice.dto;

import jakarta.validation.constraints.Size;

public record CancelInvoiceRequest(@Size(max = 255) String reason) {
}
