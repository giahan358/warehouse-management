package com.warehouse.outbound.service;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.exception.ResourceNotFoundException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.inventory.model.Inventory;
import com.warehouse.inventory.repository.InventoryRepository;
import com.warehouse.outbound.dto.CreateOutboundOrderRequest;
import com.warehouse.outbound.dto.OutboundItemRequest;
import com.warehouse.outbound.dto.OutboundItemResponse;
import com.warehouse.outbound.dto.OutboundOrderDetailResponse;
import com.warehouse.outbound.dto.OutboundOrderResponse;
import com.warehouse.outbound.dto.OutboundStatusCountsResponse;
import com.warehouse.outbound.dto.UpdateOutboundActualQuantityRequest;
import com.warehouse.outbound.dto.UpdateTrackingRequest;
import com.warehouse.outbound.model.OutboundOrder;
import com.warehouse.outbound.model.OutboundOrderItem;
import com.warehouse.outbound.repository.OutboundOrderItemRepository;
import com.warehouse.outbound.repository.OutboundOrderRepository;
import com.warehouse.outbound.repository.OutboundStatusCountProjection;
import com.warehouse.product.model.Product;
import com.warehouse.product.repository.ProductRepository;
import com.warehouse.security.JwtService;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class OutboundOrderServiceImpl implements OutboundOrderService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final OutboundOrderRepository orderRepository;
    private final OutboundOrderItemRepository itemRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OutboundOrderServiceImpl(OutboundOrderRepository orderRepository,
            OutboundOrderItemRepository itemRepository, InventoryRepository inventoryRepository,
            ProductRepository productRepository, CustomerRepository customerRepository,
            UserRepository userRepository, ApplicationEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    /** Lists orders with role-scoped customer visibility and optional filters. */
    @Override
    @Transactional
    public PageResponse<OutboundOrderResponse> getOrders(String email, String roleValue, String statusValue,
            LocalDate from, LocalDate to, Long requestedCustomerId, Carrier carrier, String keyword,
            Pageable pageable) {
        validateRange(from, to);
        validatePageable(pageable);
        UserRole role = parseRole(roleValue);
        Long customerId = role == UserRole.CUSTOMER ? ownCustomer(email).getId() : requestedCustomerId;
        OutboundStatus status = parseEnum(statusValue, OutboundStatus.class, "status");
        Page<OutboundOrder> page = orderRepository.searchOrders(customerId, status, carrier,
                from == null ? null : from.atStartOfDay(), to == null ? null : to.plusDays(1).atStartOfDay(),
                blankToNull(keyword), pageable);
        List<Long> customerIds = page.getContent().stream().map(OutboundOrder::getCustomerId).distinct().toList();
        Map<Long, String> customerNames = new HashMap<>();
        customerRepository.findAllById(customerIds).forEach(c -> customerNames.put(c.getId(), c.getBusinessName()));
        List<Long> orderIds = page.getContent().stream().map(OutboundOrder::getId).toList();
        Map<Long, List<OutboundOrderItem>> itemsByOrder = new HashMap<>();
        if (!orderIds.isEmpty()) {
            itemRepository.findByOrderIdInOrderById(orderIds).forEach(i ->
                    itemsByOrder.computeIfAbsent(i.getOrderId(), ignored -> new ArrayList<>()).add(i));
        }
        List<OutboundOrderResponse> content = page.getContent().stream().map(order -> {
            List<OutboundOrderItem> items = itemsByOrder.getOrDefault(order.getId(), List.of());
            BigDecimal total = items.stream().map(OutboundOrderItem::getQuantityRequested)
                    .reduce(ZERO, BigDecimal::add);
            return new OutboundOrderResponse(order.getId(), order.getOrderCode(),
                    customerNames.get(order.getCustomerId()), order.getRecipientName(), order.getRecipientPhone(),
                    order.getDeliveryAddress(), order.getCarrier(), order.getTrackingCode(), order.getStatus(),
                    order.getPaymentMethod(), order.getCodAmount(), order.getCodStatus(), items.size(), total,
                    order.getCreatedAt());
        }).toList();
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    /** Returns order counts by status, scoped to the customer when requested by a customer. */
    @Override
    @Transactional
    public OutboundStatusCountsResponse getStatusCounts(String email, String roleValue, LocalDate from, LocalDate to) {
        validateRange(from, to);
        UserRole role = parseRole(roleValue);
        Long customerId = role == UserRole.CUSTOMER ? ownCustomer(email).getId() : null;
        Map<OutboundStatus, Long> counts = new EnumMap<>(OutboundStatus.class);
        List<OutboundStatusCountProjection> rows = orderRepository.countByStatus(customerId,
                from == null ? null : from.atStartOfDay(), to == null ? null : to.plusDays(1).atStartOfDay());
        rows.forEach(row -> counts.put(row.getStatus(), row.getCount()));
        return new OutboundStatusCountsResponse(counts.getOrDefault(OutboundStatus.PENDING, 0L),
                counts.getOrDefault(OutboundStatus.PREPARING, 0L), counts.getOrDefault(OutboundStatus.PACKED, 0L),
                counts.getOrDefault(OutboundStatus.IN_DELIVERY, 0L), counts.getOrDefault(OutboundStatus.DELIVERED, 0L),
                counts.getOrDefault(OutboundStatus.RETURNED, 0L), counts.getOrDefault(OutboundStatus.CANCELLED, 0L));
    }

    /** Creates an order and reserves all requested stock atomically. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse create(String email, CreateOutboundOrderRequest request) {
        User user = findUser(email);
        Customer customer = ownCustomer(email);
        validateUniqueProducts(request.items());
        BigDecimal codAmount = request.codAmount() == null ? ZERO : request.codAmount();
        if (codAmount.signum() < 0 || (request.paymentMethod() == PaymentMethod.COD && codAmount.signum() <= 0)
                || (request.paymentMethod() != PaymentMethod.COD && codAmount.signum() != 0)) {
            throw badRequest("codAmount phải lớn hơn 0 với COD và bằng 0 hoặc bỏ trống với VNPAY");
        }
        OutboundOrder order = new OutboundOrder();
        order.setOrderCode("TMP-" + UUID.randomUUID());
        order.setCustomerId(customer.getId());
        order.setCreatedBy(user.getId());
        order.setRecipientName(request.recipientName().trim());
        order.setRecipientPhone(request.recipientPhone().trim());
        order.setDeliveryAddress(request.deliveryAddress().trim());
        order.setCarrier(request.carrier());
        order.setNote(blankToNull(request.note()));
        order.setStatus(OutboundStatus.PENDING);
        order.setPaymentMethod(request.paymentMethod());
        order.setCodAmount(codAmount);
        order.setCodStatus(CodStatus.NONE);
        order.setCreatedAt(now());
        order = orderRepository.save(order);
        order.setOrderCode("OUT-" + now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + String.format("%06d", order.getId()));

        List<OutboundOrderItem> items = new ArrayList<>();
        for (OutboundItemRequest itemRequest : request.items().stream()
                .sorted(java.util.Comparator.comparing(OutboundItemRequest::productId)).toList()) {
            Product product = findOwnedActiveProduct(itemRequest.productId(), customer.getId());
            Inventory inventory = lockInventory(customer.getId(), product.getId());
            BigDecimal available = inventory.getQuantity().subtract(inventory.getAllocatedQuantity());
            if (available.compareTo(itemRequest.quantityRequested()) < 0) {
                throw new BusinessException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK",
                        "Tồn kho khả dụng không đủ cho sản phẩm " + product.getSku());
            }
            inventory.setAllocatedQuantity(inventory.getAllocatedQuantity().add(itemRequest.quantityRequested()));
            inventoryRepository.save(inventory);
            items.add(newItem(order.getId(), product.getId(), itemRequest.quantityRequested()));
        }
        itemRepository.saveAll(items);
        return detail(order, customer.getBusinessName(), items);
    }

    /** Loads order detail after verifying the caller's ownership or staff/admin access. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse getById(Long id, String email, String roleValue) {
        OutboundOrder order = findOrder(id);
        authorizeOrder(order, email, roleValue);
        return detail(order, customerName(order.getCustomerId()), itemRepository.findByOrderIdOrderById(id));
    }

    /** Adds an order item while the owning customer order is still pending and reserves stock. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse addItem(Long id, String email, OutboundItemRequest request) {
        OutboundOrder order = lockOrder(id);
        authorizeOwner(order, email);
        requireStatus(order, OutboundStatus.PENDING);
        if (itemRepository.findByOrderIdOrderById(id).stream().anyMatch(i -> i.getProductId().equals(request.productId()))) {
            throw badRequest("Sản phẩm đã có trong đơn xuất");
        }
        Product product = findOwnedActiveProduct(request.productId(), order.getCustomerId());
        Inventory inventory = lockInventory(order.getCustomerId(), product.getId());
        BigDecimal available = inventory.getQuantity().subtract(inventory.getAllocatedQuantity());
        if (available.compareTo(request.quantityRequested()) < 0) {
            throw new BusinessException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Tồn kho khả dụng không đủ");
        }
        inventory.setAllocatedQuantity(inventory.getAllocatedQuantity().add(request.quantityRequested()));
        inventoryRepository.save(inventory);
        OutboundOrderItem item = itemRepository.save(newItem(id, product.getId(), request.quantityRequested()));
        return detail(order, customerName(order.getCustomerId()), itemRepository.findByOrderIdOrderById(id));
    }

    /** Acknowledges a pending order; the database has no separate approved status or approval column. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse approve(Long id, String adminEmail) {
        OutboundOrder order = lockOrder(id);
        requireStatus(order, OutboundStatus.PENDING);
        List<OutboundOrderItem> items = itemRepository.findByOrderIdOrderById(id);
        for (OutboundOrderItem item : items) {
            Inventory inventory = lockInventory(order.getCustomerId(), item.getProductId());
            if (inventory.getAllocatedQuantity().compareTo(item.getQuantityRequested()) < 0) {
                throw new BusinessException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Phần tồn giữ cho đơn không còn hợp lệ");
            }
        }
        User adminOrStaff = findUser(adminEmail);
        if (order.getApprovedAt() == null) {
            order.setApprovedBy(adminOrStaff.getId());
            order.setApprovedAt(now());
            orderRepository.save(order);
        }
        return detail(order, customerName(order.getCustomerId()), items);
    }

    /** Moves a pending order to preparation and consumes the reserved on-hand quantities. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse startPreparing(Long id) {
        OutboundOrder order = lockOrder(id);
        requireStatus(order, OutboundStatus.PENDING);
        if (order.getApprovedAt() == null) {
            throw new BusinessException(HttpStatus.CONFLICT, "INVALID_ORDER_STATUS", "Nhân viên cần tiếp nhận đơn trước khi bắt đầu soạn");
        }
        List<OutboundOrderItem> items = itemRepository.findByOrderIdOrderById(id);
        for (OutboundOrderItem item : items) {
            Inventory inventory = lockInventory(order.getCustomerId(), item.getProductId());
            if (inventory.getQuantity().compareTo(item.getQuantityRequested()) < 0
                    || inventory.getAllocatedQuantity().compareTo(item.getQuantityRequested()) < 0) {
                throw new BusinessException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Tồn kho giữ cho đơn không còn đủ");
            }
            inventory.setQuantity(inventory.getQuantity().subtract(item.getQuantityRequested()));
            inventory.setAllocatedQuantity(inventory.getAllocatedQuantity().subtract(item.getQuantityRequested()));
            inventory.setUpdatedAt(now());
            inventoryRepository.save(inventory);
            item.setQuantityActual(item.getQuantityRequested());
        }
        itemRepository.saveAll(items);
        order.setStatus(OutboundStatus.PREPARING);
        return detail(orderRepository.save(order), customerName(order.getCustomerId()), items);
    }

    /** Saves picker-confirmed quantity and reconciles stock against the initially picked quantity. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse updateActualQuantity(Long id, Long itemId,
            UpdateOutboundActualQuantityRequest request) {
        OutboundOrder order = lockOrder(id);
        requireStatus(order, OutboundStatus.PREPARING);
        OutboundOrderItem item = findItem(id, itemId);
        if (request.quantityActual().compareTo(item.getQuantityRequested()) > 0) {
            throw badRequest("quantityActual không được lớn hơn quantityRequested");
        }
        Inventory inventory = lockInventory(order.getCustomerId(), item.getProductId());
        BigDecimal previousActual = item.getQuantityActual() == null ? ZERO : item.getQuantityActual();
        BigDecimal delta = request.quantityActual().subtract(previousActual);
        if (delta.signum() > 0 && inventory.getQuantity().subtract(inventory.getAllocatedQuantity()).compareTo(delta) < 0) {
            throw new BusinessException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Không còn đủ tồn để tăng số lượng đã soạn");
        }
        inventory.setQuantity(inventory.getQuantity().subtract(delta));
        inventory.setUpdatedAt(now());
        inventoryRepository.save(inventory);
        item.setQuantityActual(request.quantityActual());
        item.setPickNote(blankToNull(request.note()));
        itemRepository.save(item);
        return detail(order, customerName(order.getCustomerId()), itemRepository.findByOrderIdOrderById(id));
    }

    /** Marks a fully prepared order as packed. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse markPacked(Long id) {
        OutboundOrder order = lockOrder(id);
        requireStatus(order, OutboundStatus.PREPARING);
        List<OutboundOrderItem> items = itemRepository.findByOrderIdOrderById(id);
        if (items.isEmpty() || items.stream().anyMatch(i -> i.getQuantityActual() == null)) {
            throw new BusinessException(HttpStatus.CONFLICT, "ORDER_NOT_FULLY_PICKED", "Chưa lưu số lượng thực soạn cho toàn bộ sản phẩm");
        }
        order.setStatus(OutboundStatus.PACKED);
        return detail(orderRepository.save(order), customerName(order.getCustomerId()), items);
    }

    /** Updates the carrier tracking information for an order that has entered fulfillment. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse updateTracking(Long id, UpdateTrackingRequest request) {
        OutboundOrder order = lockOrder(id);
        if (order.getStatus() != OutboundStatus.PACKED && order.getStatus() != OutboundStatus.IN_DELIVERY) {
            throw invalidStatus();
        }
        order.setCarrier(request.carrier());
        order.setTrackingCode(request.trackingCode().trim());
        return detail(orderRepository.save(order), customerName(order.getCustomerId()), itemRepository.findByOrderIdOrderById(id));
    }

    /** Starts delivery, initializes COD reconciliation, then publishes an after-commit email event. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse markInDelivery(Long id, String email) {
        OutboundOrder order = lockOrder(id);
        requireStatus(order, OutboundStatus.PACKED);
        order.setStatus(OutboundStatus.IN_DELIVERY);
        if (order.getCodAmount().signum() > 0) {
            order.setCodStatus(CodStatus.PENDING_RECONCILE);
        }
        order = orderRepository.save(order);
        eventPublisher.publishEvent(new OutboundInDeliveryEvent(order.getId(), email));
        return detail(order, customerName(order.getCustomerId()), itemRepository.findByOrderIdOrderById(id));
    }

    /** Marks delivery as complete only from IN_DELIVERY. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse markDelivered(Long id) {
        OutboundOrder order = lockOrder(id);
        requireStatus(order, OutboundStatus.IN_DELIVERY);
        order.setStatus(OutboundStatus.DELIVERED);
        return detail(orderRepository.save(order), customerName(order.getCustomerId()), itemRepository.findByOrderIdOrderById(id));
    }

    /** Marks a returned shipment and records COD as returned when COD applies. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse markReturned(Long id, String note) {
        OutboundOrder order = lockOrder(id);
        requireStatus(order, OutboundStatus.IN_DELIVERY);
        List<OutboundOrderItem> items = itemRepository.findByOrderIdOrderById(id);
        for (OutboundOrderItem item : items) {
            BigDecimal returnedQuantity = item.getQuantityActual() == null ? item.getQuantityRequested() : item.getQuantityActual();
            if (returnedQuantity.signum() > 0) {
                Inventory inventory = lockInventory(order.getCustomerId(), item.getProductId());
                inventory.setQuantity(inventory.getQuantity().add(returnedQuantity));
                inventory.setUpdatedAt(now());
                inventoryRepository.save(inventory);
            }
        }
        order.setStatus(OutboundStatus.RETURNED);
        order.setLastStatusNote(blankToNull(note));
        if (order.getCodAmount().signum() > 0) {
            order.setCodStatus(CodStatus.RETURNED);
        }
        return detail(orderRepository.save(order), customerName(order.getCustomerId()), items);
    }

    /** Cancels a pending order and atomically releases the inventory reserved at creation. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse cancel(Long id, String email, String roleValue, String reason) {
        OutboundOrder order = lockOrder(id);
        UserRole role = parseRole(roleValue);
        if (role == UserRole.CUSTOMER) {
            authorizeOwner(order, email);
        } else if (role != UserRole.ADMIN && role != UserRole.WAREHOUSE_STAFF) {
            throw forbidden("Không có quyền hủy đơn xuất");
        }
        requireStatus(order, OutboundStatus.PENDING);
        List<OutboundOrderItem> items = itemRepository.findByOrderIdOrderById(id);
        for (OutboundOrderItem item : items) {
            Inventory inventory = lockInventory(order.getCustomerId(), item.getProductId());
            inventory.setAllocatedQuantity(inventory.getAllocatedQuantity().subtract(item.getQuantityRequested()));
            inventory.setUpdatedAt(now());
            inventoryRepository.save(inventory);
        }
        order.setStatus(OutboundStatus.CANCELLED);
        order.setLastStatusNote(blankToNull(reason));
        return detail(orderRepository.save(order), customerName(order.getCustomerId()), items);
    }

    /** Returns the handover snapshot; caller role is restricted by the controller. */
    @Override
    @Transactional
    public OutboundOrderDetailResponse getHandoverReport(Long id) {
        OutboundOrder order = findOrder(id);
        if (order.getStatus() != OutboundStatus.PACKED && order.getStatus() != OutboundStatus.IN_DELIVERY
                && order.getStatus() != OutboundStatus.DELIVERED && order.getStatus() != OutboundStatus.RETURNED) {
            throw invalidStatus();
        }
        return detail(order, customerName(order.getCustomerId()), itemRepository.findByOrderIdOrderById(id));
    }

    private OutboundOrderItem newItem(Long orderId, Long productId, BigDecimal quantity) {
        OutboundOrderItem item = new OutboundOrderItem();
        item.setOrderId(orderId);
        item.setProductId(productId);
        item.setQuantityRequested(quantity);
        item.setQuantityActual(null);
        item.setUnitPrice(ZERO);
        return item;
    }

    private OutboundOrderDetailResponse detail(OutboundOrder order, String customerName, List<OutboundOrderItem> items) {
        Map<Long, Product> products = new HashMap<>();
        productRepository.findAllById(items.stream().map(OutboundOrderItem::getProductId).distinct().toList())
                .forEach(product -> products.put(product.getId(), product));
        List<OutboundItemResponse> itemResponses = items.stream().map(item -> {
            Product product = products.get(item.getProductId());
            return new OutboundItemResponse(item.getId(), item.getProductId(), product == null ? null : product.getSku(),
                    product == null ? null : product.getName(), product == null ? null : product.getUnit(),
                    item.getQuantityRequested(), item.getQuantityActual(), item.getUnitPrice(), item.getPickNote());
        }).toList();
        return new OutboundOrderDetailResponse(order.getId(), order.getOrderCode(), order.getCustomerId(), customerName,
                order.getRecipientName(), order.getRecipientPhone(), order.getDeliveryAddress(), order.getCarrier(),
                order.getTrackingCode(), order.getNote(), order.getStatus(), order.getPaymentMethod(), order.getCodAmount(),
                order.getCodStatus(), order.getCreatedAt(), itemResponses);
    }

    private OutboundOrder findOrder(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Đơn xuất", id));
    }

    private OutboundOrder lockOrder(Long id) {
        return orderRepository.findLockedById(id).orElseThrow(() -> new ResourceNotFoundException("Đơn xuất", id));
    }

    private OutboundOrderItem findItem(Long orderId, Long itemId) {
        return itemRepository.findByOrderIdOrderById(orderId).stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm trong đơn xuất", itemId));
    }

    private Inventory lockInventory(Long customerId, Long productId) {
        List<Inventory> rows = inventoryRepository.findLockedByCustomerAndProduct(customerId, productId);
        if (rows.isEmpty()) {
            throw new BusinessException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Sản phẩm chưa có tồn kho");
        }
        return rows.getFirst();
    }

    private Product findOwnedActiveProduct(Long productId, Long customerId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", productId));
        if (!product.getCustomerId().equals(customerId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ORDER_ACCESS_DENIED", "Sản phẩm không thuộc khách hàng");
        }
        if (product.getStatus() != com.warehouse.common.enums.ProductStatus.ACTIVE) {
            throw badRequest("Không thể tạo đơn với sản phẩm đang ẩn");
        }
        return product;
    }

    private Customer ownCustomer(String email) {
        User user = findUser(email);
        return customerRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ khách hàng"));
    }

    private User findUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không tồn tại"));
    }

    private String customerName(Long customerId) {
        return customerRepository.findById(customerId).map(Customer::getBusinessName).orElse(null);
    }

    private void authorizeOrder(OutboundOrder order, String email, String role) {
        UserRole parsed = parseRole(role);
        if (parsed == UserRole.CUSTOMER) {
            authorizeOwner(order, email);
        } else if (parsed != UserRole.ADMIN && parsed != UserRole.WAREHOUSE_STAFF) {
            throw forbidden("Không có quyền xem đơn xuất");
        }
    }

    private void authorizeOwner(OutboundOrder order, String email) {
        if (!ownCustomer(email).getId().equals(order.getCustomerId())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ORDER_ACCESS_DENIED", "Đơn xuất không thuộc khách hàng hiện tại");
        }
    }

    private UserRole parseRole(String role) {
        try {
            return UserRole.valueOf(role);
        } catch (RuntimeException exception) {
            throw forbidden("Vai trò không hợp lệ");
        }
    }

    private <E extends Enum<E>> E parseEnum(String value, Class<E> type, String name) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw badRequest("Bộ lọc " + name + " không hợp lệ");
        }
    }

    private void validateUniqueProducts(List<OutboundItemRequest> items) {
        Set<Long> seen = new HashSet<>();
        for (OutboundItemRequest item : items) {
            if (!seen.add(item.productId())) throw badRequest("Không được lặp sản phẩm trong đơn xuất");
        }
    }

    private void requireStatus(OutboundOrder order, OutboundStatus required) {
        if (order.getStatus() != required) throw invalidStatus();
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) throw badRequest("from không được sau to");
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > 100)
            throw badRequest("page phải >= 0 và size phải từ 1 đến 100");
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private LocalDateTime now() { return LocalDateTime.now(BUSINESS_ZONE); }
    private BusinessException invalidStatus() {
        return new BusinessException(HttpStatus.CONFLICT, "INVALID_ORDER_STATUS", "Trạng thái đơn không cho phép thao tác này");
    }
    private BusinessException badRequest(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }
    private BusinessException forbidden(String message) {
        return new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }
}
