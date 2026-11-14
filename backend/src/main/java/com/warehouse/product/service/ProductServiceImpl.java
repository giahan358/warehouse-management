package com.warehouse.product.service;

import com.warehouse.common.enums.ProductCategory;
import com.warehouse.common.enums.ProductStatus;
import com.warehouse.common.enums.StockStatus;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.common.util.EnumParser;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.product.dto.ProductRequest;
import com.warehouse.product.dto.ProductResponse;
import com.warehouse.product.dto.UpdateProductStatusRequest;
import com.warehouse.product.dto.UpdateProductRequest;
import com.warehouse.product.model.Product;
import com.warehouse.product.repository.ProductProjection;
import com.warehouse.product.repository.ProductRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductServiceImpl implements ProductService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal CUBIC_CENTIMETERS_PER_CUBIC_METER = BigDecimal.valueOf(1_000_000);
    private static final int MAX_PAGE_SIZE = 100;

    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    public ProductServiceImpl(
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            UserRepository userRepository) {
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getProducts(
            String email,
            String role,
            String keyword,
            Long requestedCustomerId,
            String category,
            String status,
            String stockStatus,
            Pageable pageable) {
        validatePageable(pageable);
        UserRole userRole = parseRole(role);
        Long effectiveCustomerId = switch (userRole) {
            case CUSTOMER -> getOwnCustomer(email).getId();
            case ADMIN, WAREHOUSE_STAFF -> requestedCustomerId;
        };
        Page<ProductProjection> products = productRepository.searchProducts(
                effectiveCustomerId,
                blankToNull(keyword),
                EnumParser.parseFilter(category, ProductCategory.class, "category"),
                EnumParser.parseFilter(status, ProductStatus.class, "status"),
                EnumParser.parseFilter(stockStatus, StockStatus.class, "stockStatus"),
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
        return PageResponse.from(products.map(ProductResponse::from));
    }

    @Override
    @Transactional
    public ProductResponse create(String email, String role, ProductRequest request) {
        UserRole userRole = parseRole(role);
        Long ownerCustomerId;
        if (userRole == UserRole.CUSTOMER) {
            ownerCustomerId = getOwnCustomer(email).getId();
        } else if (userRole == UserRole.ADMIN) {
            if (request.customerId() == null) {
                throw new BusinessException(
                        HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Admin phải chỉ định customerId");
            }
            if (!customerRepository.existsById(request.customerId())) {
                throw customerNotFound(request.customerId());
            }
            ownerCustomerId = request.customerId();
        } else {
            throw forbidden("Nhân viên kho không được tạo sản phẩm");
        }

        validateDimensions(request.lengthCm(), request.widthCm(), request.heightCm());
        ensureSkuAvailable(ownerCustomerId, request.sku(), null);
        Product product = new Product();
        product.setCustomerId(ownerCustomerId);
        applyProductFields(product, request);
        product.setStatus(ProductStatus.ACTIVE);
        product.setCreatedAt(LocalDateTime.now(BUSINESS_ZONE));
        return saveAndRead(product);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getById(Long id, String email, String role) {
        ProductProjection product = findProductView(id);
        if (parseRole(role) == UserRole.CUSTOMER) {
            ensureOwnership(product.getCustomerId(), email);
        }
        return ProductResponse.from(product);
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, String email, String role, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow(() -> productNotFound(id));
        ensureCanManage(product.getCustomerId(), email, role);
        validateDimensions(request.lengthCm(), request.widthCm(), request.heightCm());
        ensureSkuAvailable(product.getCustomerId(), request.sku(), id);
        applyProductFields(product, request);
        return saveAndRead(product);
    }

    @Override
    @Transactional
    public ProductResponse updateStatus(
            Long id,
            String email,
            String role,
            UpdateProductStatusRequest request) {
        Product product = productRepository.findById(id).orElseThrow(() -> productNotFound(id));
        ensureCanManage(product.getCustomerId(), email, role);
        product.setStatus(request.status());
        return saveAndRead(product);
    }

    private ProductResponse saveAndRead(Product product) {
        try {
            Product saved = productRepository.saveAndFlush(product);
            return ProductResponse.from(findProductView(saved.getId()));
        } catch (DataIntegrityViolationException exception) {
            throw new BusinessException(
                    HttpStatus.CONFLICT,
                    "PRODUCT_SKU_ALREADY_EXISTS",
                    "SKU đã tồn tại trong danh mục của khách hàng này");
        }
    }

    private void applyProductFields(Product product, ProductRequest request) {
        product.setSku(request.sku().trim());
        product.setBarcode(blankToNull(request.barcode()));
        product.setName(request.name().trim());
        product.setCategory(request.category());
        product.setDescription(blankToNull(request.description()));
        product.setUnit(request.unit().trim());
        product.setLengthCm(request.lengthCm());
        product.setWidthCm(request.widthCm());
        product.setHeightCm(request.heightCm());
        product.setVolumeM3(calculateVolume(request.lengthCm(), request.widthCm(), request.heightCm()));
    }

    private void applyProductFields(Product product, UpdateProductRequest request) {
        product.setSku(request.sku().trim());
        product.setBarcode(blankToNull(request.barcode()));
        product.setName(request.name().trim());
        product.setCategory(request.category());
        product.setDescription(blankToNull(request.description()));
        product.setUnit(request.unit().trim());
        product.setLengthCm(request.lengthCm());
        product.setWidthCm(request.widthCm());
        product.setHeightCm(request.heightCm());
        product.setVolumeM3(calculateVolume(request.lengthCm(), request.widthCm(), request.heightCm()));
    }

    private BigDecimal calculateVolume(BigDecimal length, BigDecimal width, BigDecimal height) {
        if (length == null) {
            return null;
        }
        return length.multiply(width).multiply(height)
                .divide(CUBIC_CENTIMETERS_PER_CUBIC_METER, 6, RoundingMode.HALF_UP);
    }

    private void validateDimensions(BigDecimal length, BigDecimal width, BigDecimal height) {
        int presentCount = (length == null ? 0 : 1) + (width == null ? 0 : 1) + (height == null ? 0 : 1);
        if (presentCount != 0 && presentCount != 3) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "lengthCm, widthCm và heightCm phải được cung cấp cùng nhau");
        }
    }

    private void ensureSkuAvailable(Long customerId, String sku, Long excludedProductId) {
        boolean exists = excludedProductId == null
                ? productRepository.existsByCustomerIdAndSkuIgnoreCase(customerId, sku.trim())
                : productRepository.existsByCustomerIdAndSkuIgnoreCaseAndIdNot(
                        customerId, sku.trim(), excludedProductId);
        if (exists) {
            throw new BusinessException(
                    HttpStatus.CONFLICT, "PRODUCT_SKU_ALREADY_EXISTS", "SKU đã tồn tại trong danh mục khách hàng");
        }
    }

    private ProductProjection findProductView(Long id) {
        return productRepository.findProductViewById(id).orElseThrow(() -> productNotFound(id));
    }

    private Customer getOwnCustomer(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
        return customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CUSTOMER_PROFILE_NOT_FOUND",
                        "Tài khoản chưa có hồ sơ khách hàng"));
    }

    private void ensureCanManage(Long customerId, String email, String role) {
        UserRole userRole = parseRole(role);
        if (userRole == UserRole.ADMIN) {
            return;
        }
        if (userRole == UserRole.CUSTOMER) {
            ensureOwnership(customerId, email);
            return;
        }
        throw forbidden("Nhân viên kho không được sửa thông tin sản phẩm");
    }

    private void ensureOwnership(Long productCustomerId, String email) {
        Long ownCustomerId = getOwnCustomer(email).getId();
        if (!ownCustomerId.equals(productCustomerId)) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN, "PRODUCT_ACCESS_DENIED", "Bạn không có quyền truy cập sản phẩm này");
        }
    }

    private UserRole parseRole(String role) {
        try {
            return UserRole.valueOf(role);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Vai trò không hợp lệ");
        }
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

    private BusinessException productNotFound(Long id) {
        return new BusinessException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm " + id);
    }

    private BusinessException customerNotFound(Long id) {
        return new BusinessException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng " + id);
    }

    private BusinessException forbidden(String message) {
        return new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
}
