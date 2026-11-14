package com.warehouse.email.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailTestRequest(@NotBlank @Email String recipientEmail) {
}
