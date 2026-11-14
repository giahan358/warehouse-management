package com.warehouse.user.service;

import com.warehouse.user.dto.CreateUserRequest;
import com.warehouse.common.response.PageResponse;
import com.warehouse.user.dto.UpdateUserRequest;
import com.warehouse.user.dto.UserPermissionMatrixResponse;
import com.warehouse.user.dto.UserResponse;
import com.warehouse.user.dto.UserSummaryResponse;
import org.springframework.data.domain.Pageable;

public interface UserService {
    PageResponse<UserResponse> getUsers(
            String keyword,
            String role,
            String status,
            String loginMethod,
            Boolean hasCustomerProfile,
            Pageable pageable);

    UserSummaryResponse getSummary();

    UserPermissionMatrixResponse getPermissionMatrix();

    UserResponse getById(Long id);

    UserResponse create(CreateUserRequest request);

    UserResponse updateStatus(Long id, UpdateUserRequest request, String currentUserEmail);
}
