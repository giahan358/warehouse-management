package com.warehouse.customer.dto;

import com.warehouse.common.enums.ServicePackage;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateCustomerRequest(
        @NotBlank @Size(max = 200) String businessName,
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(max = 500) String address,
        @Size(max = 20) String taxCode,
        @Size(max = 150) String legalRepresentative,
        @Email @Size(max = 255) String billingEmail,
        @NotNull ServicePackage servicePackage,
        @NotNull @DecimalMin("0.0") BigDecimal capacityM3,
        @Size(max = 100) String bankName,
        @Size(max = 30) String bankAccountNumber,
        @Size(max = 150) String bankAccountHolder) {
}
