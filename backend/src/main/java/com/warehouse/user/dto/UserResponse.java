package com.warehouse.user.dto;

import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.user.repository.UserWithOrganizationProjection;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        UserRole role,
        UserStatus status,
        String lockReason,
        LoginMethod loginMethod,
        String organization) {

    public static UserResponse from(UserWithOrganizationProjection user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                UserRole.valueOf(user.getRole()),
                UserStatus.valueOf(user.getStatus()),
                user.getLockReason(),
                LoginMethod.valueOf(user.getLoginMethod()),
                user.getOrganization());
    }

}
