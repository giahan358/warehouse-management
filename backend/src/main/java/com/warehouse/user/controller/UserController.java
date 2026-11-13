package com.warehouse.user.controller;

import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.user.dto.CreateUserRequest;
import com.warehouse.user.dto.UpdateUserRequest;
import com.warehouse.user.dto.UserPermissionMatrixResponse;
import com.warehouse.user.dto.UserResponse;
import com.warehouse.user.dto.UserSummaryResponse;
import com.warehouse.user.service.UserService;
import com.warehouse.security.SessionPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @Operation(summary = "List users with filters and pagination")
    public ApiResponse<PageResponse<UserResponse>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String loginMethod,
            @RequestParam(required = false) Boolean hasCustomerProfile,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(
                userService.getUsers(keyword, role, status, loginMethod, hasCustomerProfile, pageable),
                "Lấy danh sách tài khoản thành công");
    }

    @GetMapping("/summary")
    @Operation(summary = "Get user count summary")
    public ApiResponse<UserSummaryResponse> getSummary() {
        return ApiResponse.success(userService.getSummary(), "Lấy thống kê tài khoản thành công");
    }

    @GetMapping("/permission-matrix")
    @Operation(summary = "Get static permission matrix")
    public ApiResponse<UserPermissionMatrixResponse> getPermissionMatrix() {
        return ApiResponse.success(userService.getPermissionMatrix(), "Lấy ma trận quyền thành công");
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a user by ID")
    public ApiResponse<UserResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(userService.getById(id), "Lấy thông tin tài khoản thành công");
    }

    @PostMapping
    @Operation(summary = "Create a warehouse staff account")
    public ApiResponse<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ApiResponse.success(userService.create(request), "Tạo tài khoản nhân viên thành công");
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Change a user's account status")
    public ApiResponse<UserResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal SessionPrincipal currentUser) {
        return ApiResponse.success(
                userService.updateStatus(id, request, currentUser.getSubject()),
                "Cập nhật trạng thái tài khoản thành công");
    }
}
