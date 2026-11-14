package com.warehouse.customer.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface CustomerProjection {
    Long getId();

    Long getUserId();

    String getCustomerCode();

    String getBusinessName();

    String getTaxCode();

    String getLegalRepresentative();

    String getPhone();

    String getAddress();

    String getBillingEmail();

    String getServicePackage();

    BigDecimal getCapacityM3();

    String getBankName();

    String getBankAccountNumber();

    String getBankAccountHolder();

    LocalDateTime getCreatedAt();

    String getEmail();

    String getAccountStatus();

    String getLoginMethod();

    Long getSkuCount();

    BigDecimal getTotalUnits();

    BigDecimal getUsedM3();

    String getFeeStatus();

    BigDecimal getOutstandingDebt();

    BigDecimal getReservedInboundM3();
}
