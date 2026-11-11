package com.warehouse.inventory.controller;

import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.inventory.dto.InventoryAdminSummaryResponse;
import com.warehouse.inventory.dto.InventoryCustomerResponse;
import com.warehouse.inventory.dto.InventoryCustomerSummaryResponse;
import com.warehouse.inventory.dto.InventoryDetailResponse;
import com.warehouse.inventory.dto.InventoryResponse;
import com.warehouse.inventory.dto.UpdateInventoryLocationRequest;
import com.warehouse.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
public class InventoryController {
    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "List warehouse inventory with filters and pagination")
    public ApiResponse<PageResponse<InventoryResponse>> getInventory(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String stockStatus,
            @RequestParam(required = false) String zone,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(
                inventoryService.getInventory(keyword, customerId, stockStatus, zone, pageable),
                "Lấy danh sách tồn kho thành công");
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "Get inventory counts grouped by stock status")
    public ApiResponse<InventoryAdminSummaryResponse> getAdminSummary(
            @RequestParam(required = false) Long customerId) {
        return ApiResponse.success(
                inventoryService.getAdminSummary(customerId),
                "Lấy thống kê tồn kho thành công");
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "List inventory belonging to the authenticated customer")
    public ApiResponse<PageResponse<InventoryCustomerResponse>> getMyInventory(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String stockStatus,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(
                inventoryService.getMyInventory(jwt.getSubject(), keyword, stockStatus, pageable),
                "Lấy tồn kho của bạn thành công");
    }

    @GetMapping("/me/summary")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get current customer's total stock and occupied volume")
    public ApiResponse<InventoryCustomerSummaryResponse> getMySummary(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(
                inventoryService.getMySummary(jwt.getSubject()),
                "Lấy thống kê tồn kho của bạn thành công");
    }

    @GetMapping("/{productId}")
    @Operation(summary = "Get stock details for a product; customers can access only their own products")
    public ApiResponse<InventoryDetailResponse> getProductInventory(
            @PathVariable Long productId,
            @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(
                inventoryService.getProductInventory(productId, jwt.getSubject(), currentRole(jwt)),
                "Lấy chi tiết tồn kho thành công");
    }

    @PatchMapping("/{id}/location")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "Update an inventory location without changing its quantities")
    public ApiResponse<InventoryResponse> updateLocation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInventoryLocationRequest request) {
        return ApiResponse.success(
                inventoryService.updateLocation(id, request),
                "Cập nhật vị trí tồn kho thành công");
    }

    private String currentRole(Jwt jwt) {
        return jwt.getClaimAsStringList("roles").stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Authenticated JWT is missing roles"));
    }
}
