package com.warehouse.inventory.service;

import com.warehouse.common.enums.StockStatus;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.common.util.EnumParser;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.inventory.dto.InventoryAdminSummaryResponse;
import com.warehouse.inventory.dto.InventoryCustomerSummaryResponse;
import com.warehouse.inventory.dto.InventoryCustomerResponse;
import com.warehouse.inventory.dto.InventoryDetailResponse;
import com.warehouse.inventory.dto.InventoryResponse;
import com.warehouse.inventory.dto.UpdateInventoryLocationRequest;
import com.warehouse.inventory.model.Inventory;
import com.warehouse.inventory.repository.InventoryDetailProjection;
import com.warehouse.inventory.repository.InventoryProjection;
import com.warehouse.inventory.repository.InventoryRepository;
import com.warehouse.inventory.repository.InventorySummaryProjection;
import com.warehouse.product.repository.ProductRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryServiceImpl implements InventoryService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_PAGE_SIZE = 100;
    private static final Pattern LOCATION_CODE_PATTERN = Pattern.compile("^Z[A-Z]-[A-Z0-9]+(?:-[A-Z0-9]+)*$");

    private final InventoryRepository inventoryRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public InventoryServiceImpl(
            InventoryRepository inventoryRepository,
            CustomerRepository customerRepository,
            ProductRepository productRepository,
            UserRepository userRepository) {
        this.inventoryRepository = inventoryRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryResponse> getInventory(
            String keyword,
            Long customerId,
            String stockStatus,
            String zone,
            Pageable pageable) {
        validatePageable(pageable);
        Page<InventoryProjection> result = inventoryRepository.searchInventory(
                customerId,
                blankToNull(keyword),
                EnumParser.parseFilter(stockStatus, StockStatus.class, "stockStatus"),
                normalizeZone(zone),
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
        return PageResponse.from(result.map(InventoryResponse::from));
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryAdminSummaryResponse getAdminSummary(Long customerId) {
        if (customerId != null && !customerRepository.existsById(customerId)) {
            throw customerNotFound(customerId);
        }
        InventorySummaryProjection summary = inventoryRepository.getAdminSummary(customerId);
        return InventoryAdminSummaryResponse.from(summary);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryCustomerResponse> getMyInventory(
            String email,
            String keyword,
            String stockStatus,
            Pageable pageable) {
        validatePageable(pageable);
        Long customerId = getOwnCustomer(email).getId();
        Page<InventoryProjection> result = inventoryRepository.searchInventory(
                customerId,
                blankToNull(keyword),
                EnumParser.parseFilter(stockStatus, StockStatus.class, "stockStatus"),
                null,
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
        return PageResponse.from(result.map(InventoryCustomerResponse::from));
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryCustomerSummaryResponse getMySummary(String email) {
        Customer customer = getOwnCustomer(email);
        return InventoryCustomerSummaryResponse.from(
                inventoryRepository.getCustomerSummary(customer.getId()),
                customer.getCapacityM3());
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryDetailResponse getProductInventory(Long productId, String email, String role) {
        UserRole userRole = parseRole(role);
        Long customerId = userRole == UserRole.CUSTOMER ? getOwnCustomer(email).getId() : null;
        InventoryDetailProjection result = inventoryRepository
                .findDetailByProductId(productId, customerId)
                .orElse(null);
        if (result != null) {
            return InventoryDetailResponse.from(result);
        }
        var product = productRepository.findProductViewById(productId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm " + productId));
        if (customerId != null && !customerId.equals(product.getCustomerId())) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN,
                    "PRODUCT_ACCESS_DENIED",
                    "Bạn không có quyền truy cập tồn kho sản phẩm này");
        }
        return InventoryDetailResponse.empty(productId, product.getName());
    }

    @Override
    @Transactional
    public InventoryResponse updateLocation(Long inventoryId, UpdateInventoryLocationRequest request) {
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "INVENTORY_NOT_FOUND", "Không tìm thấy bản ghi tồn kho " + inventoryId));
        String locationCode = request.locationCode().trim().toUpperCase(Locale.ROOT);
        if (!LOCATION_CODE_PATTERN.matcher(locationCode).matches()) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "locationCode phải theo dạng ZA-R04-S02-B12");
        }
        inventory.setLocationCode(locationCode);
        inventory.setUpdatedAt(LocalDateTime.now(BUSINESS_ZONE));
        inventoryRepository.save(inventory);
        return inventoryRepository.findInventoryViewById(inventoryId)
                .map(InventoryResponse::from)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "INVENTORY_NOT_FOUND", "Không tìm thấy bản ghi tồn kho " + inventoryId));
    }

    private Customer getOwnCustomer(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
        return customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "CUSTOMER_PROFILE_NOT_FOUND", "Tài khoản chưa có hồ sơ khách hàng"));
    }

    private String normalizeZone(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String zone = value.trim().toUpperCase(Locale.ROOT);
        if (!zone.matches("[A-Z]")) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "zone phải là một ký tự A-Z");
        }
        return zone;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "page phải >= 0 và size phải từ 1 đến 100");
        }
    }

    private UserRole parseRole(String role) {
        try {
            return UserRole.valueOf(role);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Vai trò không hợp lệ");
        }
    }

    private BusinessException customerNotFound(Long id) {
        return new BusinessException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng " + id);
    }
}
