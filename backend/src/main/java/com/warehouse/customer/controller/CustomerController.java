package com.warehouse.customer.controller;

import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.customer.dto.CreateCustomerRequest;
import com.warehouse.customer.dto.CustomerListResponse;
import com.warehouse.customer.dto.CustomerResponse;
import com.warehouse.customer.dto.UpdateCustomerRequest;
import com.warehouse.customer.dto.UpdateMyCustomerRequest;
import com.warehouse.customer.service.CustomerService;
import com.warehouse.security.SessionPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
@SecurityRequirement(name = "bearerAuth")
public class CustomerController {
    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List customers with filters and pagination")
    public ApiResponse<PageResponse<CustomerListResponse>> getCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String servicePackage,
            @RequestParam(required = false) String feeStatus,
            @RequestParam(required = false) String accountStatus,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(
                customerService.getCustomers(keyword, servicePackage, feeStatus, accountStatus, pageable),
                "Lấy danh sách khách hàng thành công");
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a customer business profile for an existing customer account")
    public ApiResponse<CustomerResponse> create(@Valid @RequestBody CreateCustomerRequest request) {
        return ApiResponse.success(customerService.create(request), "Tạo hồ sơ khách hàng thành công");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get a customer profile and warehouse usage")
    public ApiResponse<CustomerResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(customerService.getById(id), "Lấy thông tin khách hàng thành công");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update an administrative customer profile")
    public ApiResponse<CustomerResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        return ApiResponse.success(customerService.update(id, request), "Cập nhật khách hàng thành công");
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get the current customer's own profile and warehouse usage")
    public ApiResponse<CustomerResponse> getMe(@AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(customerService.getMe(jwt.getSubject()), "Lấy hồ sơ của bạn thành công");
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Update editable fields on the current customer's own profile")
    public ApiResponse<CustomerResponse> updateMe(
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody UpdateMyCustomerRequest request) {
        return ApiResponse.success(
                customerService.updateMe(jwt.getSubject(), request),
                "Cập nhật hồ sơ của bạn thành công");
    }
}
