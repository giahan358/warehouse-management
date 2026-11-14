package com.warehouse.auth.dto;

import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.customer.model.Customer;
import com.warehouse.user.model.User;

public record AuthUserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        UserRole role,
        UserStatus status,
        LoginMethod loginMethod,
        Long customerId,
        String customerCode,
        String businessName,
        boolean hasCustomerProfile) {

    public static AuthUserResponse from(User user, Customer customer) {
        return new AuthUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.getLoginMethod(),
                customer == null ? null : customer.getId(),
                customer == null ? null : customer.getCustomerCode(),
                customer == null ? null : customer.getBusinessName(),
                customer != null);
    }
}
