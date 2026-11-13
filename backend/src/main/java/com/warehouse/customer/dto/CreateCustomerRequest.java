package com.warehouse.customer.dto;

import com.warehouse.common.enums.ServicePackage;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateCustomerRequest(
        @NotNull Long userId,
        @NotBlank @Size(max = 200) String businessName,
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Size(max = 500) String address,
        @Size(max = 20) String taxCode,
        @Size(max = 150) String legalRepresentative,
        @Email @Size(max = 255) String billingEmail,
        ServicePackage servicePackage,
        @DecimalMin("0.0") BigDecimal capacityM3) {
}
