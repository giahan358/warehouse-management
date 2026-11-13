package com.warehouse.customer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMyCustomerRequest(
        @NotBlank @Size(max = 200) String businessName,
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(max = 500) String address,
        @Size(max = 150) String legalRepresentative,
        @Email @Size(max = 255) String billingEmail,
        @Size(max = 100) String bankName,
        @Size(max = 30) String bankAccountNumber,
        @Size(max = 150) String bankAccountHolder) {
}
