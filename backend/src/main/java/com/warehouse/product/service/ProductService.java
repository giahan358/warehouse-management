package com.warehouse.product.service;

import com.warehouse.common.response.PageResponse;
import com.warehouse.product.dto.ProductRequest;
import com.warehouse.product.dto.ProductResponse;
import com.warehouse.product.dto.UpdateProductStatusRequest;
import com.warehouse.product.dto.UpdateProductRequest;
import org.springframework.data.domain.Pageable;

public interface ProductService {
    PageResponse<ProductResponse> getProducts(
            String email,
            String role,
            String keyword,
            Long customerId,
            String category,
            String status,
            String stockStatus,
            Pageable pageable);

    ProductResponse create(String email, String role, ProductRequest request);

    ProductResponse getById(Long id, String email, String role);

    ProductResponse update(Long id, String email, String role, UpdateProductRequest request);

    ProductResponse updateStatus(Long id, String email, String role, UpdateProductStatusRequest request);

    void delete(Long id);
}
