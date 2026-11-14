package com.warehouse.customer.dto;

import com.warehouse.common.enums.CustomerFeeStatus;
import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.ServicePackage;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.customer.repository.CustomerProjection;
import java.math.BigDecimal;

public record CustomerListResponse(
        Long id,
        String customerCode,
        String businessName,
        String taxCode,
        String legalRepresentative,
        String phone,
        String address,
        ServicePackage servicePackage,
        BigDecimal capacityM3,
        Long skuCount,
        BigDecimal totalUnits,
        CustomerFeeStatus feeStatus,
        BigDecimal outstandingDebt,
        UserStatus accountStatus,
        Long userId,
        LoginMethod loginMethod) {

    public static CustomerListResponse from(CustomerProjection customer) {
        return new CustomerListResponse(
                customer.getId(),
                customer.getCustomerCode(),
                customer.getBusinessName(),
                customer.getTaxCode(),
                customer.getLegalRepresentative(),
                customer.getPhone(),
                customer.getAddress(),
                ServicePackage.valueOf(customer.getServicePackage()),
                customer.getCapacityM3(),
                customer.getSkuCount(),
                customer.getTotalUnits(),
                CustomerFeeStatus.valueOf(customer.getFeeStatus()),
                customer.getOutstandingDebt(),
                UserStatus.valueOf(customer.getAccountStatus()),
                customer.getUserId(),
                LoginMethod.valueOf(customer.getLoginMethod()));
    }
}
