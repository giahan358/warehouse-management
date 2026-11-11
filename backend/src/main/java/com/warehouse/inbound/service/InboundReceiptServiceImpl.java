package com.warehouse.inbound.service;

import com.warehouse.common.enums.InboundStatus;
import com.warehouse.common.enums.InboundTimeSlot;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.common.util.EnumParser;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.inbound.dto.CancelInboundReceiptRequest;
import com.warehouse.inbound.dto.CreateInboundReceiptRequest;
import com.warehouse.inbound.dto.InboundCountingRequest;
import com.warehouse.inbound.dto.InboundDiscrepancyReportResponse;
import com.warehouse.inbound.dto.InboundItemRequest;
import com.warehouse.inbound.dto.InboundReceiptDetailResponse;
import com.warehouse.inbound.dto.InboundReceiptItemResponse;
import com.warehouse.inbound.dto.InboundReceiptResponse;
import com.warehouse.inbound.dto.InboundScanRequest;
import com.warehouse.inbound.dto.InboundStatusCountsResponse;
import com.warehouse.inbound.dto.StartInboundReceiptRequest;
import com.warehouse.inbound.dto.UpdateInboundActualQuantityRequest;
import com.warehouse.inbound.dto.UpdateInboundItemRequest;
import com.warehouse.inbound.dto.UpdateInboundReceiptRequest;
import com.warehouse.inbound.model.InboundReceipt;
import com.warehouse.inbound.model.InboundReceiptItem;
import com.warehouse.inbound.repository.InboundReceiptItemProjection;
import com.warehouse.inbound.repository.InboundReceiptItemRepository;
import com.warehouse.inbound.repository.InboundReceiptRepository;
import com.warehouse.inbound.repository.InboundReceiptSummaryProjection;
import com.warehouse.inbound.repository.InboundStatusCountsProjection;
import com.warehouse.inventory.repository.InventoryRepository;
import com.warehouse.product.model.Product;
import com.warehouse.product.repository.ProductRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InboundReceiptServiceImpl implements InboundReceiptService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter RECEIPT_MONTH = DateTimeFormatter.ofPattern("yyyyMM");
    private static final Pattern LOCATION_CODE_PATTERN = Pattern.compile("^Z[A-Z]-[A-Z0-9]+(?:-[A-Z0-9]+)*$");
    private static final int MAX_PAGE_SIZE = 100;

    private final InboundReceiptRepository receiptRepository;
    private final InboundReceiptItemRepository itemRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;

    public InboundReceiptServiceImpl(
            InboundReceiptRepository receiptRepository,
            InboundReceiptItemRepository itemRepository,
            CustomerRepository customerRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            InventoryRepository inventoryRepository) {
        this.receiptRepository = receiptRepository;
        this.itemRepository = itemRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InboundReceiptResponse> getReceipts(
            String email, String role, String status, LocalDate from, LocalDate to,
            Long requestedCustomerId, String keyword, String dockCode, String timeSlot, Pageable pageable) {
        validatePageable(pageable);
        validateDateRange(from, to);
        UserRole userRole = parseRole(role);
        Long customerId = userRole == UserRole.CUSTOMER
                ? getOwnCustomer(email).getId()
                : requestedCustomerId;
        if (customerId != null && !customerRepository.existsById(customerId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng");
        }
        Page<InboundReceiptSummaryProjection> page = receiptRepository.searchReceipts(
                customerId,
                EnumParser.parseFilter(status, InboundStatus.class, "status"),
                from,
                to,
                blankToNull(keyword),
                blankToNull(dockCode),
                EnumParser.parseFilter(timeSlot, InboundTimeSlot.class, "timeSlot"),
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
        return PageResponse.from(page.map(InboundReceiptResponse::from));
    }

    @Override
    @Transactional(readOnly = true)
    public InboundStatusCountsResponse getStatusCounts(String email, String role, LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        Long customerId = parseRole(role) == UserRole.CUSTOMER ? getOwnCustomer(email).getId() : null;
        InboundStatusCountsProjection counts = receiptRepository.getStatusCounts(customerId, from, to);
        return InboundStatusCountsResponse.from(counts);
    }

    @Override
    @Transactional
    public InboundReceiptDetailResponse create(String email, String role, CreateInboundReceiptRequest request) {
        UserRole userRole = parseRole(role);
        Long customerId;
        if (userRole == UserRole.CUSTOMER) {
            customerId = getOwnCustomer(email).getId();
        } else if (userRole == UserRole.ADMIN) {
            if (request.customerId() == null) {
                throw badRequest("Admin phải chỉ định customerId");
            }
            customerId = request.customerId();
            if (!customerRepository.existsById(customerId)) {
                throw new BusinessException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng");
            }
        } else {
            throw forbidden("Nhân viên kho không được tạo phiếu nhập");
        }

        User user = findUser(email);
        validateUniqueProducts(request.items());
        InboundReceipt receipt = new InboundReceipt();
        LocalDateTime now = now();
        receipt.setReceiptCode("NK-" + now.format(RECEIPT_MONTH) + "-" + UUID.randomUUID());
        receipt.setCustomerId(customerId);
        receipt.setCreatedBy(user.getId());
        receipt.setStatus(InboundStatus.SCHEDULED);
        receipt.setExpectedAt(request.expectedAt());
        receipt.setVehiclePlate(blankToNull(request.vehiclePlate()));
        receipt.setTimeSlot(request.timeSlot());
        receipt.setNote(blankToNull(request.note()));
        receipt.setCreatedAt(now);
        receipt = receiptRepository.saveAndFlush(receipt);

        List<InboundReceiptItem> items = new ArrayList<>();
        for (InboundItemRequest itemRequest : request.items()) {
            Product product = findOwnedProduct(itemRequest.productId(), customerId);
            items.add(newItem(receipt.getId(), product.getId(), itemRequest.expectedQuantity()));
        }
        itemRepository.saveAllAndFlush(items);
        return toDetail(receipt);
    }

    @Override
    @Transactional(readOnly = true)
    public InboundReceiptDetailResponse getById(Long id, String email, String role) {
        InboundReceipt receipt = getAccessibleReceipt(id, email, role);
        return toDetail(receipt);
    }

    @Override
    @Transactional
    public InboundReceiptDetailResponse update(Long id, String email, UpdateInboundReceiptRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        ensureOwner(receipt, email);
        ensureStatus(receipt, InboundStatus.SCHEDULED);
        receipt.setExpectedAt(request.expectedAt());
        receipt.setVehiclePlate(blankToNull(request.vehiclePlate()));
        receipt.setTimeSlot(request.timeSlot());
        receipt.setNote(blankToNull(request.note()));
        receiptRepository.saveAndFlush(receipt);
        return toDetail(receipt);
    }

    @Override
    @Transactional
    public InboundReceiptItemResponse addItem(Long id, String email, InboundItemRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        ensureOwner(receipt, email);
        ensureStatus(receipt, InboundStatus.SCHEDULED);
        if (itemRepository.findByReceiptIdAndProductId(id, request.productId()).isPresent()) {
            throw new BusinessException(HttpStatus.CONFLICT, "DUPLICATE_RECEIPT_ITEM", "Sản phẩm đã có trong phiếu");
        }
        Product product = findOwnedProduct(request.productId(), receipt.getCustomerId());
        InboundReceiptItem item = itemRepository.saveAndFlush(
                newItem(id, product.getId(), request.expectedQuantity()));
        return findItemView(id, item.getId());
    }

    @Override
    @Transactional
    public InboundReceiptItemResponse updateItem(
            Long id, Long itemId, String email, UpdateInboundItemRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        ensureOwner(receipt, email);
        ensureStatus(receipt, InboundStatus.SCHEDULED);
        InboundReceiptItem item = findItem(id, itemId);
        item.setExpectedQuantity(request.expectedQuantity());
        itemRepository.saveAndFlush(item);
        return findItemView(id, itemId);
    }

    @Override
    @Transactional
    public void deleteItem(Long id, Long itemId, String email) {
        InboundReceipt receipt = lockReceipt(id);
        ensureOwner(receipt, email);
        ensureStatus(receipt, InboundStatus.SCHEDULED);
        InboundReceiptItem item = findItem(id, itemId);
        if (itemRepository.countByReceiptId(id) <= 1) {
            throw new BusinessException(
                    HttpStatus.CONFLICT, "RECEIPT_REQUIRES_ITEM", "Phiếu nhập phải có ít nhất một sản phẩm");
        }
        itemRepository.delete(item);
    }

    @Override
    @Transactional
    public InboundReceiptItemResponse updateActualQuantity(
            Long id, Long itemId, UpdateInboundActualQuantityRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        ensureReceiving(receipt);
        InboundReceiptItem item = findItem(id, itemId);
        item.setActualQuantity(request.actualQuantity());
        if (request.damagedQuantity() != null) {
            item.setDamagedQuantity(request.damagedQuantity());
        }
        if (request.locationCode() != null) {
            item.setLocationCode(normalizeLocationCode(request.locationCode()));
        }
        if (request.note() != null) {
            item.setNote(blankToNull(request.note()));
        }
        itemRepository.saveAndFlush(item);
        return findItemView(id, itemId);
    }

    @Override
    @Transactional
    public InboundReceiptDetailResponse saveCounting(Long id, InboundCountingRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        ensureReceiving(receipt);
        List<InboundReceiptItem> items = itemRepository.findByReceiptIdOrderById(id);
        Set<Long> expectedIds = new HashSet<>();
        java.util.Map<Long, InboundCountingRequest.ItemCount> countsById = new java.util.HashMap<>();
        for (InboundReceiptItem item : items) {
            expectedIds.add(item.getId());
        }
        for (InboundCountingRequest.ItemCount count : request.items()) {
            if (countsById.putIfAbsent(count.itemId(), count) != null) {
                throw badRequest("Không được gửi trùng itemId trong kết quả kiểm đếm");
            }
        }
        if (!expectedIds.equals(countsById.keySet())) {
            throw badRequest("Kết quả kiểm đếm phải bao gồm chính xác toàn bộ sản phẩm trong phiếu");
        }
        for (InboundReceiptItem item : items) {
            InboundCountingRequest.ItemCount count = countsById.get(item.getId());
            item.setActualQuantity(count.actualQuantity());
            item.setDamagedQuantity(count.damagedQuantity() == null ? BigDecimal.ZERO : count.damagedQuantity());
            item.setLocationCode(normalizeLocationCode(count.locationCode()));
            item.setNote(blankToNull(count.note()));
        }
        itemRepository.saveAllAndFlush(items);
        return toDetail(receipt);
    }

    @Override
    @Transactional
    public InboundReceiptItemResponse scan(Long id, InboundScanRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        ensureReceiving(receipt);
        String barcode = request.barcode().trim();
        List<Product> products = productRepository.findAllByCustomerIdAndBarcodeIgnoreCase(
                receipt.getCustomerId(), barcode);
        if (products.isEmpty()) {
            throw new BusinessException(
                    HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm có barcode này");
        }
        if (products.size() > 1) {
            throw new BusinessException(
                    HttpStatus.CONFLICT, "BARCODE_AMBIGUOUS", "Barcode được gán cho nhiều sản phẩm");
        }
        InboundReceiptItem item = itemRepository.findByReceiptIdAndProductId(id, products.get(0).getId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "INBOUND_ITEM_NOT_FOUND", "Sản phẩm không có trong phiếu nhập"));
        BigDecimal increment = request.quantity() == null ? BigDecimal.ONE : request.quantity();
        BigDecimal current = item.getActualQuantity() == null ? BigDecimal.ZERO : item.getActualQuantity();
        item.setActualQuantity(current.add(increment));
        itemRepository.saveAndFlush(item);
        return findItemView(id, item.getId());
    }

    @Override
    @Transactional
    public InboundReceiptDetailResponse start(Long id, StartInboundReceiptRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        ensureStatus(receipt, InboundStatus.SCHEDULED);
        receipt.setStatus(InboundStatus.RECEIVING);
        if (request != null && request.dockCode() != null) {
            receipt.setDockCode(blankToNull(request.dockCode()));
        }
        receiptRepository.saveAndFlush(receipt);
        return toDetail(receipt);
    }

    @Override
    @Transactional
    public InboundReceiptDetailResponse confirm(Long id, String email) {
        InboundReceipt receipt = lockReceipt(id);
        ensureReceiving(receipt);
        List<InboundReceiptItem> items = itemRepository.findByReceiptIdOrderById(id);
        if (items.isEmpty() || items.stream().anyMatch(item -> item.getActualQuantity() == null)) {
            throw new BusinessException(
                    HttpStatus.CONFLICT,
                    "RECEIPT_NOT_FULLY_COUNTED",
                    "Cần lưu số lượng thực nhận cho tất cả sản phẩm trước khi xác nhận");
        }
        LocalDateTime receivedAt = now();
        for (InboundReceiptItem item : items) {
            inventoryRepository.addReceivedQuantity(
                    receipt.getCustomerId(),
                    item.getProductId(),
                    item.getActualQuantity(),
                    item.getLocationCode(),
                    receivedAt);
        }
        receipt.setStatus(InboundStatus.CONFIRMED);
        receipt.setReceivedAt(receivedAt);
        receipt.setConfirmedBy(findUser(email).getId());
        receiptRepository.saveAndFlush(receipt);
        return toDetail(receipt);
    }

    @Override
    @Transactional
    public InboundReceiptDetailResponse cancel(
            Long id, String email, String role, CancelInboundReceiptRequest request) {
        InboundReceipt receipt = lockReceipt(id);
        UserRole userRole = parseRole(role);
        if (userRole == UserRole.CUSTOMER) {
            ensureOwner(receipt, email);
            ensureStatus(receipt, InboundStatus.SCHEDULED);
        } else if (receipt.getStatus() != InboundStatus.SCHEDULED
                && receipt.getStatus() != InboundStatus.RECEIVING) {
            throw invalidStatus();
        }
        receipt.setStatus(InboundStatus.CANCELLED);
        String reason = request == null ? null : blankToNull(request.reason());
        if (reason != null) {
            String prefix = blankToNull(receipt.getNote());
            receipt.setNote(prefix == null ? "Lý do hủy: " + reason : prefix + "\nLý do hủy: " + reason);
        }
        receiptRepository.saveAndFlush(receipt);
        return toDetail(receipt);
    }

    @Override
    @Transactional(readOnly = true)
    public InboundDiscrepancyReportResponse getDiscrepancyReport(Long id, String email, String role) {
        InboundReceipt receipt = getAccessibleReceipt(id, email, role);
        List<InboundDiscrepancyReportResponse.DiscrepancyItem> discrepancies = new ArrayList<>();
        BigDecimal shortageTotal = BigDecimal.ZERO;
        BigDecimal damagedTotal = BigDecimal.ZERO;
        for (InboundReceiptItemProjection item : itemRepository.findItemViews(id)) {
            BigDecimal actual = item.getActualQuantity();
            BigDecimal damaged = item.getDamagedQuantity() == null ? BigDecimal.ZERO : item.getDamagedQuantity();
            if (actual == null) {
                continue;
            }
            BigDecimal variance = actual.subtract(item.getExpectedQuantity());
            if (variance.signum() != 0 || damaged.signum() > 0) {
                discrepancies.add(new InboundDiscrepancyReportResponse.DiscrepancyItem(
                        item.getItemId(),
                        item.getProductId(),
                        item.getSku(),
                        item.getProductName(),
                        item.getUnit(),
                        item.getExpectedQuantity(),
                        actual,
                        damaged,
                        variance,
                        item.getLocationCode(),
                        item.getNote()));
                shortageTotal = shortageTotal.add(item.getExpectedQuantity().subtract(actual).max(BigDecimal.ZERO));
                damagedTotal = damagedTotal.add(damaged);
            }
        }
        return new InboundDiscrepancyReportResponse(
                id, receipt.getReceiptCode(), shortageTotal, damagedTotal, List.copyOf(discrepancies));
    }

    private InboundReceiptDetailResponse toDetail(InboundReceipt receipt) {
        List<InboundReceiptItemResponse> items = itemRepository.findItemViews(receipt.getId()).stream()
                .map(InboundReceiptItemResponse::from)
                .toList();
        Customer customer = customerRepository.findById(receipt.getCustomerId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng"));
        String customerName = customer.getBusinessName();
        return InboundReceiptDetailResponse.from(receipt, customerName, items);
    }

    private InboundReceipt getAccessibleReceipt(Long id, String email, String role) {
        InboundReceipt receipt = receiptRepository.findById(id).orElseThrow(this::receiptNotFound);
        if (parseRole(role) == UserRole.CUSTOMER) {
            ensureOwner(receipt, email);
        }
        return receipt;
    }

    private InboundReceipt lockReceipt(Long id) {
        return receiptRepository.findByIdForUpdate(id).orElseThrow(this::receiptNotFound);
    }

    private void ensureOwner(InboundReceipt receipt, String email) {
        if (!receipt.getCustomerId().equals(getOwnCustomer(email).getId())) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN, "RECEIPT_ACCESS_DENIED", "Bạn không có quyền truy cập phiếu nhập này");
        }
    }

    private void ensureStatus(InboundReceipt receipt, InboundStatus expected) {
        if (receipt.getStatus() != expected) {
            throw invalidStatus();
        }
    }

    private void ensureReceiving(InboundReceipt receipt) {
        ensureStatus(receipt, InboundStatus.RECEIVING);
    }

    private InboundReceiptItem findItem(Long receiptId, Long itemId) {
        return itemRepository.findByIdAndReceiptId(itemId, receiptId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "INBOUND_ITEM_NOT_FOUND", "Không tìm thấy sản phẩm trong phiếu nhập"));
    }

    private InboundReceiptItemResponse findItemView(Long receiptId, Long itemId) {
        return itemRepository.findItemViews(receiptId).stream()
                .filter(item -> item.getItemId().equals(itemId))
                .findFirst()
                .map(InboundReceiptItemResponse::from)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "INBOUND_ITEM_NOT_FOUND", "Không tìm thấy sản phẩm trong phiếu nhập"));
    }

    private InboundReceiptItem newItem(Long receiptId, Long productId, BigDecimal expectedQuantity) {
        InboundReceiptItem item = new InboundReceiptItem();
        item.setReceiptId(receiptId);
        item.setProductId(productId);
        item.setExpectedQuantity(expectedQuantity);
        item.setDamagedQuantity(BigDecimal.ZERO);
        return item;
    }

    private Product findOwnedProduct(Long productId, Long customerId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm " + productId));
        if (!product.getCustomerId().equals(customerId)) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN, "PRODUCT_ACCESS_DENIED", "Sản phẩm không thuộc khách hàng của phiếu nhập");
        }
        return product;
    }

    private void validateUniqueProducts(List<InboundItemRequest> items) {
        Set<Long> productIds = new HashSet<>();
        for (InboundItemRequest item : items) {
            if (!productIds.add(item.productId())) {
                throw new BusinessException(
                        HttpStatus.BAD_REQUEST, "DUPLICATE_RECEIPT_ITEM", "Không được lặp sản phẩm trong phiếu nhập");
            }
        }
    }

    private Customer getOwnCustomer(String email) {
        User user = findUser(email);
        return customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CUSTOMER_PROFILE_NOT_FOUND",
                        "Tài khoản chưa có hồ sơ khách hàng"));
    }

    private User findUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
    }

    private UserRole parseRole(String value) {
        try {
            return UserRole.valueOf(value);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw forbidden("Vai trò không hợp lệ");
        }
    }

    private String normalizeLocationCode(String value) {
        String locationCode = blankToNull(value);
        if (locationCode == null) {
            return null;
        }
        locationCode = locationCode.toUpperCase(Locale.ROOT);
        if (!LOCATION_CODE_PATTERN.matcher(locationCode).matches()) {
            throw badRequest("locationCode phải theo dạng ZA-R04-S02-B12");
        }
        return locationCode;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw badRequest("from không được sau to");
        }
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > MAX_PAGE_SIZE) {
            throw badRequest("page phải >= 0 và size phải từ 1 đến 100");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(BUSINESS_ZONE);
    }

    private BusinessException receiptNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "RECEIPT_NOT_FOUND", "Không tìm thấy phiếu nhập");
    }

    private BusinessException invalidStatus() {
        return new BusinessException(
                HttpStatus.CONFLICT, "INVALID_RECEIPT_STATUS", "Trạng thái phiếu nhập không cho phép thao tác này");
    }

    private BusinessException badRequest(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    private BusinessException forbidden(String message) {
        return new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
}
