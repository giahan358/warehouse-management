package com.warehouse.customer.dto;

import com.warehouse.common.enums.CustomerFeeStatus;
import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.ServicePackage;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.customer.repository.CustomerProjection;
import java.math.BigDecimal;

public record CustomerResponse(
        Long id,
        String customerCode,
        String businessName,
        String taxCode,
        String legalRepresentative,
        String phone,
        String address,
        String billingEmail,
        ServicePackage servicePackage,
        BigDecimal capacityM3,
        Long skuCount,
        BigDecimal totalUnits,
        CustomerFeeStatus feeStatus,
        BigDecimal outstandingDebt,
        UserStatus accountStatus,
        Long userId,
        String email,
        LoginMethod loginMethod,
        BigDecimal usedM3,
        BigDecimal reservedInboundM3,
        BigDecimal remainingM3,
        BigDecimal usedPercent,
        String bankName,
        String bankAccountNumber,
        String bankAccountHolder) {

    public static CustomerResponse from(CustomerProjection customer) {
        BigDecimal capacity = zeroIfNull(customer.getCapacityM3());
        BigDecimal used = zeroIfNull(customer.getUsedM3());
        BigDecimal reserved = zeroIfNull(customer.getReservedInboundM3());
        BigDecimal remaining = capacity.subtract(used).subtract(reserved).max(BigDecimal.ZERO);
        BigDecimal percent = capacity.signum() == 0
                ? BigDecimal.ZERO
                : used.multiply(BigDecimal.valueOf(100))
                        .divide(capacity, 2, java.math.RoundingMode.HALF_UP);

        return new CustomerResponse(
                customer.getId(),
                customer.getCustomerCode(),
                customer.getBusinessName(),
                customer.getTaxCode(),
                customer.getLegalRepresentative(),
                customer.getPhone(),
                customer.getAddress(),
                customer.getBillingEmail(),
                ServicePackage.valueOf(customer.getServicePackage()),
                capacity,
                customer.getSkuCount(),
                zeroIfNull(customer.getTotalUnits()),
                CustomerFeeStatus.valueOf(customer.getFeeStatus()),
                zeroIfNull(customer.getOutstandingDebt()),
                UserStatus.valueOf(customer.getAccountStatus()),
                customer.getUserId(),
                customer.getEmail(),
                LoginMethod.valueOf(customer.getLoginMethod()),
                used,
                reserved,
                remaining,
                percent,
                customer.getBankName(),
                customer.getBankAccountNumber(),
                customer.getBankAccountHolder());
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
