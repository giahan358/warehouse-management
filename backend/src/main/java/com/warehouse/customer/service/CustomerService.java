package com.warehouse.customer.service;

import com.warehouse.customer.dto.CreateCustomerRequest;
import com.warehouse.customer.dto.CustomerListResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.customer.dto.CustomerResponse;
import com.warehouse.customer.dto.UpdateCustomerRequest;
import com.warehouse.customer.dto.UpdateMyCustomerRequest;
import org.springframework.data.domain.Pageable;

public interface CustomerService {
    PageResponse<CustomerListResponse> getCustomers(
            String keyword,
            String servicePackage,
            String feeStatus,
            String accountStatus,
            Pageable pageable);

    CustomerResponse create(CreateCustomerRequest request);

    CustomerResponse getById(Long id);

    CustomerResponse update(Long id, UpdateCustomerRequest request);

    CustomerResponse getMe(String email);

    CustomerResponse updateMe(String email, UpdateMyCustomerRequest request);
}
