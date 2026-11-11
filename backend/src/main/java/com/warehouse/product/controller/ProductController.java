package com.warehouse.product.controller;

import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.product.dto.ProductRequest;
import com.warehouse.product.dto.ProductResponse;
import com.warehouse.product.dto.UpdateProductRequest;
import com.warehouse.product.dto.UpdateProductStatusRequest;
import com.warehouse.product.service.ProductService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @Operation(summary = "List products with filters, stock data, and pagination")
    public ApiResponse<PageResponse<ProductResponse>> getProducts(
            @AuthenticationPrincipal SessionPrincipal jwt,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String stockStatus,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(
                productService.getProducts(
                        jwt.getSubject(),
                        currentRole(jwt),
                        keyword,
                        customerId,
                        category,
                        status,
                        stockStatus,
                        pageable),
                "Lấy danh sách sản phẩm thành công");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a product for the authenticated customer or an admin-selected customer")
    public ApiResponse<ProductResponse> create(
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody ProductRequest request) {
        return ApiResponse.success(
                productService.create(jwt.getSubject(), currentRole(jwt), request),
                "Tạo sản phẩm thành công");
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a product; customers can access only their own products")
    public ApiResponse<ProductResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(
                productService.getById(id, jwt.getSubject(), currentRole(jwt)),
                "Lấy thông tin sản phẩm thành công");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(summary = "Update a product owned by the admin's selected customer or current customer")
    public ApiResponse<ProductResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody UpdateProductRequest request) {
        return ApiResponse.success(
                productService.update(id, jwt.getSubject(), currentRole(jwt), request),
                "Cập nhật sản phẩm thành công");
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(summary = "Change product status")
    public ApiResponse<ProductResponse> updateStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody UpdateProductStatusRequest request) {
        return ApiResponse.success(
                productService.updateStatus(id, jwt.getSubject(), currentRole(jwt), request),
                "Cập nhật trạng thái sản phẩm thành công");
    }

    private String currentRole(SessionPrincipal jwt) {
        return jwt.role().name();
    }
}
