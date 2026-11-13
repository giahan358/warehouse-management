package com.warehouse.inventory.service;

import com.warehouse.inventory.dto.InventoryAdminSummaryResponse;
import com.warehouse.inventory.dto.InventoryCustomerSummaryResponse;
import com.warehouse.inventory.dto.InventoryCustomerResponse;
import com.warehouse.inventory.dto.InventoryDetailResponse;
import com.warehouse.inventory.dto.InventoryResponse;
import com.warehouse.inventory.dto.UpdateInventoryLocationRequest;
import com.warehouse.common.response.PageResponse;
import org.springframework.data.domain.Pageable;

public interface InventoryService {
    PageResponse<InventoryResponse> getInventory(
            String keyword,
            Long customerId,
            String stockStatus,
            String zone,
            Pageable pageable);

    InventoryAdminSummaryResponse getAdminSummary(Long customerId);

    PageResponse<InventoryCustomerResponse> getMyInventory(
            String email,
            String keyword,
            String stockStatus,
            Pageable pageable);

    InventoryCustomerSummaryResponse getMySummary(String email);

    InventoryDetailResponse getProductInventory(Long productId, String email, String role);

    InventoryResponse updateLocation(Long inventoryId, UpdateInventoryLocationRequest request);
}
