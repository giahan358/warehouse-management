package com.warehouse.payment.service;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.PaymentStatus;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.exception.ResourceNotFoundException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.invoice.dto.PaymentUrlResponse;
import com.warehouse.invoice.model.Invoice;
import com.warehouse.invoice.repository.InvoiceRepository;
import com.warehouse.outbound.model.OutboundOrder;
import com.warehouse.outbound.repository.CodSummaryProjection;
import com.warehouse.outbound.repository.OutboundOrderRepository;
import com.warehouse.payment.dto.CodOrderResponse;
import com.warehouse.payment.dto.CodSummaryResponse;
import com.warehouse.payment.dto.PaymentResponse;
import com.warehouse.payment.dto.VnpayIpnResponse;
import com.warehouse.payment.model.Payment;
import com.warehouse.payment.repository.PaymentRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class PaymentServiceImpl implements PaymentService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final OutboundOrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final String tmnCode;
    private final String hashSecret;
    private final String payUrl;
    private final String returnUrl;
    private final String frontendBaseUrl;
    private final boolean mockEnabled;
    private final String activeProfiles;

    public PaymentServiceImpl(PaymentRepository paymentRepository, InvoiceRepository invoiceRepository,
            OutboundOrderRepository orderRepository, CustomerRepository customerRepository,
            UserRepository userRepository,
            @Value("${app.vnpay.tmn-code:}") String tmnCode,
            @Value("${app.vnpay.hash-secret:}") String hashSecret,
            @Value("${app.vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") String payUrl,
            @Value("${app.vnpay.return-url:}") String returnUrl,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl,
            @Value("${app.vnpay.mock-enabled:false}") boolean mockEnabled,
            @Value("${spring.profiles.active:}") String activeProfiles) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.tmnCode = tmnCode;
        this.hashSecret = hashSecret;
        this.payUrl = payUrl;
        this.returnUrl = returnUrl;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
        this.mockEnabled = mockEnabled;
        this.activeProfiles = activeProfiles;
    }

    /** Creates a pending VNPay payment using the invoice total and returns a signed payment URL. */
    @Override
    @Transactional
    public PaymentUrlResponse createVnpayPayment(Long invoiceId, String email) {
        ensureVnpayConfigured();
        Invoice invoice = invoiceRepository.findLockedById(invoiceId).orElseThrow(() -> invoiceNotFound(invoiceId));
        if (!ownCustomer(email).getId().equals(invoice.getCustomerId())) throw invoiceNotFound(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.UNPAID && invoice.getStatus() != InvoiceStatus.OVERDUE) {
            throw new BusinessException(HttpStatus.CONFLICT, "INVOICE_ALREADY_PAID", "Hóa đơn không còn cần thanh toán");
        }
        Payment payment = new Payment();
        payment.setInvoiceId(invoice.getId());
        payment.setPaymentMethod(PaymentMethod.VNPAY);
        payment.setAmount(invoice.getTotalAmount());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setVnpTxnRef("WH" + System.currentTimeMillis() + randomSuffix());
        paymentRepository.save(payment);

        LocalDateTime now = now();
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_Amount", invoice.getTotalAmount().movePointRight(2).toBigIntegerExact().toString());
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", payment.getVnpTxnRef());
        params.put("vnp_OrderInfo", "Thanh toan hoa don " + invoice.getInvoiceCode());
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", "127.0.0.1");
        params.put("vnp_CreateDate", now.format(VNPAY_DATE));
        params.put("vnp_ExpireDate", now.plusMinutes(15).format(VNPAY_DATE));
        String query = encodeParameters(params);
        String secureHash = hmacSha512(hashSecret, query);
        return new PaymentUrlResponse(payUrl + "?" + query + "&vnp_SecureHash=" + secureHash, payment.getId());
    }

    /** Validates VNPay signature/amount and processes callback idempotently according to VNPay response codes. */
    @Override
    @Transactional
    public com.warehouse.payment.dto.VnpayIpnResponse processVnpayIpn(Map<String, String> parameters) {
        if (!isValidSignature(parameters)) return ipn("97", "Invalid signature");
        String txnRef = parameters.get("vnp_TxnRef");
        Payment payment = paymentRepository.findLockedByVnpTxnRef(txnRef).orElse(null);
        if (payment == null) return ipn("01", "Order not found");
        String responseCode = parameters.get("vnp_ResponseCode");
        String amountValue = parameters.get("vnp_Amount");
        BigDecimal expected = payment.getAmount().movePointRight(2);
        try {
            if (amountValue == null || new BigDecimal(amountValue).compareTo(expected) != 0) {
                return ipn("04", "Invalid amount");
            }
        } catch (NumberFormatException exception) {
            return ipn("04", "Invalid amount");
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return payment.getStatus() == PaymentStatus.SUCCESS ? ipn("00", "Confirm Success") : ipn("02", "Order already confirmed");
        }
        Invoice invoice = invoiceRepository.findLockedById(payment.getInvoiceId())
                .orElseThrow(() -> invoiceNotFound(payment.getInvoiceId()));
        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.CANCELLED) {
            return ipn("02", "Order already confirmed");
        }
        payment.setVnpResponseCode(responseCode);
        payment.setVnpTransactionNo(parameters.get("vnp_TransactionNo"));
        payment.setVnpBankCode(parameters.get("vnp_BankCode"));
        if ("00".equals(responseCode)) {
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setPaidAt(now());
            invoice.setStatus(InvoiceStatus.PAID);
            invoiceRepository.save(invoice);
        } else {
            payment.setStatus(PaymentStatus.FAILED);
        }
        paymentRepository.save(payment);
        return ipn("00", "Confirm Success");
    }

    /** Reads the VNPay browser return without changing payment or invoice state. */
    @Override
    @Transactional
    public String getVnpayReturnResult(Map<String, String> parameters) {
        String outcome = "failed";
        if (isValidSignature(parameters)) {
            String txnRef = parameters.get("vnp_TxnRef");
            Payment payment = txnRef == null ? null : paymentRepository.findByVnpTxnRef(txnRef).orElse(null);
            if (payment != null && payment.getStatus() == PaymentStatus.SUCCESS) outcome = "success";
            else if (payment != null && payment.getStatus() == PaymentStatus.PENDING) outcome = "pending";
        }
        return frontendBaseUrl + "/payment-result?status=" + outcome;
    }

    /** Simulates a VNPay IPN signed with the configured secret; disabled unless explicitly enabled. */
    @Override
    @Transactional
    public VnpayIpnResponse processMockIpn(String txnRef, String responseCode, BigDecimal amount) {
        boolean developmentProfile = java.util.Arrays.stream(activeProfiles.split(","))
                .map(String::trim).anyMatch(profile -> profile.equalsIgnoreCase("dev")
                        || profile.equalsIgnoreCase("development"));
        if (!mockEnabled || !developmentProfile) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "Mock IPN chỉ bật ở môi trường Development");
        }
        ensureVnpayConfigured();
        Payment payment = paymentRepository.findLockedByVnpTxnRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException("Giao dịch", txnRef));
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_Amount", amount.movePointRight(2).toBigIntegerExact().toString());
        params.put("vnp_ResponseCode", responseCode);
        params.put("vnp_TransactionNo", "MOCK-" + txnRef);
        params.put("vnp_BankCode", "MOCK");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_SecureHash", hmacSha512(hashSecret, encodeParameters(new TreeMap<>(params))));
        return processVnpayIpn(params);
    }

    /** Searches payments with filters; controller restricts this endpoint to administrators. */
    @Override
    @Transactional
    public PageResponse<PaymentResponse> getPayments(String methodValue, String statusValue, Long invoiceId,
            LocalDate from, LocalDate to, Pageable pageable) {
        validateRange(from, to);
        validatePageable(pageable);
        PaymentMethod method = parseEnum(methodValue, PaymentMethod.class, "method");
        PaymentStatus status = parseEnum(statusValue, PaymentStatus.class, "status");
        Page<Payment> page = paymentRepository.searchPayments(method, status, invoiceId,
                from == null ? null : from.atStartOfDay(), to == null ? null : to.plusDays(1).atStartOfDay(), null, pageable);
        List<PaymentResponse> content = page.getContent().stream().map(this::paymentResponse).toList();
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    /** Reads a payment and hides it as not found from customers who do not own its invoice. */
    @Override
    @Transactional
    public PaymentResponse getPayment(Long id, String email, boolean admin) {
        Payment payment = paymentRepository.findLockedById(id).orElseThrow(() -> new ResourceNotFoundException("Giao dịch", id));
        Invoice invoice = invoiceRepository.findById(payment.getInvoiceId()).orElseThrow(() -> invoiceNotFound(payment.getInvoiceId()));
        if (!admin && !ownCustomer(email).getId().equals(invoice.getCustomerId())) {
            throw new ResourceNotFoundException("Giao dịch", id);
        }
        return paymentResponse(payment);
    }

    /** Confirms a pending COD payment and marks its invoice paid; only the admin controller exposes this action. */
    @Override
    @Transactional
    public PaymentResponse confirmCodPayment(Long id, String transactionRef, String adminEmail) {
        Payment payment = paymentRepository.findLockedById(id).orElseThrow(() -> new ResourceNotFoundException("Giao dịch", id));
        if (payment.getPaymentMethod() != PaymentMethod.COD || payment.getStatus() != PaymentStatus.PENDING) {
            throw new BusinessException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_PROCESSED", "Giao dịch COD đã được xử lý hoặc không hợp lệ");
        }
        Invoice invoice = invoiceRepository.findLockedById(payment.getInvoiceId()).orElseThrow(() -> invoiceNotFound(payment.getInvoiceId()));
        if (invoice.getStatus() != InvoiceStatus.UNPAID && invoice.getStatus() != InvoiceStatus.OVERDUE) {
            throw new BusinessException(HttpStatus.CONFLICT, "INVOICE_ALREADY_PAID", "Hóa đơn không còn cần thanh toán");
        }
        User admin = findUser(adminEmail);
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setConfirmedBy(admin.getId());
        payment.setTransactionRef(transactionRef == null || transactionRef.isBlank()
                ? "COD-ADMIN-" + id : transactionRef.trim());
        payment.setPaidAt(now());
        invoice.setStatus(InvoiceStatus.PAID);
        invoiceRepository.save(invoice);
        return paymentResponse(paymentRepository.save(payment));
    }

    /** Lists COD orders for the admin reconciliation table. */
    @Override
    @Transactional
    public PageResponse<CodOrderResponse> getCodOrders(String statusValue, Carrier carrier, Long customerId,
            String keyword, Pageable pageable) {
        validatePageable(pageable);
        CodStatus status = parseEnum(statusValue, CodStatus.class, "codStatus");
        Page<OutboundOrder> page = orderRepository.searchCodOrders(customerId, status, carrier, blankToNull(keyword), pageable);
        List<CodOrderResponse> data = page.getContent().stream().map(this::codResponse).toList();
        return new PageResponse<>(data, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    /** Lists only the authenticated customer's COD orders. */
    @Override
    @Transactional
    public PageResponse<CodOrderResponse> getMyCodOrders(String email, String statusValue, Pageable pageable) {
        Customer customer = ownCustomer(email);
        return getCodOrders(statusValue, null, customer.getId(), null, pageable);
    }

    /** Returns the COD reconciliation totals grouped by lifecycle status. */
    @Override
    @Transactional
    public CodSummaryResponse getCodSummary() {
        CodSummaryProjection row = orderRepository.summarizeCod();
        return new CodSummaryResponse(nvl(row.getPendingCount()), nvl(row.getPendingAmount()), nvl(row.getCollectedAmount()),
                nvl(row.getConfirmedAmount()), nvl(row.getReturnedAmount()));
    }

    /** Applies carrier statement status only when it matches the delivered/returned shipping state. */
    @Override
    @Transactional
    public CodOrderResponse updateCodStatus(Long orderId, CodStatus nextStatus) {
        if (nextStatus != CodStatus.COLLECTED && nextStatus != CodStatus.RETURNED) throw badRequest("codStatus chỉ được là COLLECTED hoặc RETURNED");
        OutboundOrder order = orderRepository.findLockedById(orderId).orElseThrow(() -> new ResourceNotFoundException("Đơn xuất", orderId));
        if (order.getCodStatus() == nextStatus
                && ((nextStatus == CodStatus.COLLECTED && order.getStatus() == OutboundStatus.DELIVERED)
                    || (nextStatus == CodStatus.RETURNED && order.getStatus() == OutboundStatus.RETURNED))) {
            return codResponse(order);
        }
        if (order.getCodAmount().signum() <= 0 || order.getCodStatus() != CodStatus.PENDING_RECONCILE) throw codStatusConflict();
        if ((nextStatus == CodStatus.COLLECTED && order.getStatus() != OutboundStatus.DELIVERED)
                || (nextStatus == CodStatus.RETURNED && order.getStatus() != OutboundStatus.RETURNED)) throw codStatusConflict();
        order.setCodStatus(nextStatus);
        return codResponse(orderRepository.save(order));
    }

    /** Confirms collected COD and optionally offsets eligible invoices belonging to the same customer. */
    @Override
    @Transactional
    public CodOrderResponse confirmCodOrder(Long orderId, List<Long> offsetInvoiceIds,
            String transactionRef, String adminEmail) {
        OutboundOrder order = orderRepository.findLockedById(orderId).orElseThrow(() -> new ResourceNotFoundException("Đơn xuất", orderId));
        if (order.getCodAmount().signum() <= 0 || order.getStatus() != OutboundStatus.DELIVERED
                || order.getCodStatus() != CodStatus.COLLECTED) throw codStatusConflict();
        User admin = findUser(adminEmail);
        List<Long> invoiceIds = offsetInvoiceIds == null ? List.of() : offsetInvoiceIds.stream().distinct().sorted().toList();
        if (offsetInvoiceIds != null && invoiceIds.size() != offsetInvoiceIds.size()) throw badRequest("Không được lặp invoiceId trong offsetInvoiceIds");
        BigDecimal offsetTotal = BigDecimal.ZERO;
        List<Invoice> invoices = new ArrayList<>();
        for (Long invoiceId : invoiceIds) {
            Invoice invoice = invoiceRepository.findLockedById(invoiceId).orElseThrow(() -> invoiceNotFound(invoiceId));
            if (!invoice.getCustomerId().equals(order.getCustomerId())
                    || (invoice.getStatus() != InvoiceStatus.UNPAID && invoice.getStatus() != InvoiceStatus.OVERDUE)) {
                throw new BusinessException(HttpStatus.CONFLICT, "COD_INVALID_STATUS", "Hóa đơn không đủ điều kiện cấn trừ");
            }
            offsetTotal = offsetTotal.add(invoice.getTotalAmount());
            invoices.add(invoice);
        }
        if (offsetTotal.compareTo(order.getCodAmount()) > 0) throw badRequest("Tổng hóa đơn cấn trừ vượt quá tiền COD đã thu");
        String reference = transactionRef == null || transactionRef.isBlank()
                ? "COD-" + order.getOrderCode() : transactionRef.trim();
        for (Invoice invoice : invoices) {
            Payment payment = new Payment();
            payment.setInvoiceId(invoice.getId());
            payment.setPaymentMethod(PaymentMethod.COD);
            payment.setTransactionRef(reference.length() > 150 ? reference.substring(0, 150) : reference);
            payment.setAmount(invoice.getTotalAmount());
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setConfirmedBy(admin.getId());
            payment.setPaidAt(now());
            paymentRepository.save(payment);
            invoice.setStatus(InvoiceStatus.PAID);
        }
        invoiceRepository.saveAll(invoices);
        order.setCodStatus(CodStatus.CONFIRMED);
        order.setCodConfirmedBy(admin.getId());
        order.setCodConfirmedAt(now());
        return codResponse(orderRepository.save(order));
    }

    private boolean isValidSignature(Map<String, String> parameters) {
        if (hashSecret == null || hashSecret.isBlank() || parameters == null) return false;
        String provided = parameters.get("vnp_SecureHash");
        if (provided == null) return false;
        Map<String, String> canonical = new TreeMap<>(parameters);
        canonical.remove("vnp_SecureHash");
        canonical.remove("vnp_SecureHashType");
        String calculated = hmacSha512(hashSecret, encodeParameters(canonical));
        return MessageDigest.isEqual(calculated.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII),
                provided.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
    }

    private String hmacSha512(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể ký dữ liệu VNPay", exception);
        }
    }

    private String encodeParameters(Map<String, String> parameters) {
        return parameters.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isEmpty())
                .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .collect(java.util.stream.Collectors.joining("&"));
    }

    private void ensureVnpayConfigured() {
        if (tmnCode.isBlank() || hashSecret.isBlank() || returnUrl.isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "VNPAY_NOT_CONFIGURED", "Chưa cấu hình VNPay cho môi trường này");
        }
    }

    private PaymentResponse paymentResponse(Payment payment) {
        Invoice invoice = invoiceRepository.findById(payment.getInvoiceId()).orElse(null);
        return new PaymentResponse(payment.getId(), payment.getInvoiceId(), invoice == null ? null : invoice.getInvoiceCode(),
                payment.getPaymentMethod(), payment.getAmount(), payment.getStatus(), payment.getTransactionRef(),
                payment.getVnpTxnRef(), payment.getVnpTransactionNo(), payment.getVnpBankCode(),
                payment.getVnpResponseCode(), payment.getPaidAt());
    }

    private CodOrderResponse codResponse(OutboundOrder order) {
        String customerName = customerRepository.findById(order.getCustomerId()).map(Customer::getBusinessName).orElse(null);
        return new CodOrderResponse(order.getId(), order.getOrderCode(), order.getTrackingCode(), order.getCarrier(),
                customerName, order.getRecipientName(), order.getDeliveryAddress(), order.getStatus(),
                order.getCodAmount(), order.getCodStatus());
    }

    private Customer ownCustomer(String email) {
        User user = findUser(email);
        return customerRepository.findByUserId(user.getId()).orElseThrow(() -> new ResourceNotFoundException("Hồ sơ khách hàng"));
    }

    private User findUser(String email) {
        return userRepository.findByEmailIgnoreCase(email).orElseThrow(() ->
                new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không tồn tại"));
    }

    private <E extends Enum<E>> E parseEnum(String value, Class<E> type, String name) {
        if (value == null || value.isBlank()) return null;
        try { return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException exception) { throw badRequest(name + " không hợp lệ"); }
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) throw badRequest("from không được sau to");
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > 100)
            throw badRequest("page phải >= 0 và size phải từ 1 đến 100");
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String randomSuffix() { return java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 10); }
    private LocalDateTime now() { return LocalDateTime.now(BUSINESS_ZONE); }
    private long nvl(Long value) { return value == null ? 0 : value; }
    private BigDecimal nvl(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private VnpayIpnResponse ipn(String code, String message) { return new VnpayIpnResponse(code, message); }
    private ResourceNotFoundException invoiceNotFound(Long id) { return new ResourceNotFoundException("Hóa đơn", id); }
    private BusinessException codStatusConflict() { return new BusinessException(HttpStatus.CONFLICT, "COD_INVALID_STATUS", "Trạng thái đơn không cho phép đối soát COD"); }
    private BusinessException badRequest(String message) { return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message); }
}
