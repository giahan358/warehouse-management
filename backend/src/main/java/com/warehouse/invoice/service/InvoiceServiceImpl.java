package com.warehouse.invoice.service;

import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.PaymentStatus;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.exception.ResourceNotFoundException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.email.service.EmailService;
import com.warehouse.invoice.dto.CreateInvoiceRequest;
import com.warehouse.invoice.dto.CurrentInvoiceResponse;
import com.warehouse.invoice.dto.InvoiceDetailResponse;
import com.warehouse.invoice.dto.InvoiceItemResponse;
import com.warehouse.invoice.dto.InvoiceLineRequest;
import com.warehouse.invoice.dto.InvoiceListResponse;
import com.warehouse.invoice.dto.InvoicePaymentResponse;
import com.warehouse.invoice.dto.InvoiceSummaryResponse;
import com.warehouse.invoice.model.Invoice;
import com.warehouse.invoice.model.InvoiceItem;
import com.warehouse.invoice.repository.InvoiceItemRepository;
import com.warehouse.invoice.repository.InvoiceRepository;
import com.warehouse.invoice.repository.InvoiceSummaryProjection;
import com.warehouse.outbound.model.OutboundOrder;
import com.warehouse.outbound.repository.OutboundOrderRepository;
import com.warehouse.payment.model.Payment;
import com.warehouse.payment.repository.PaymentRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class InvoiceServiceImpl implements InvoiceService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository itemRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final OutboundOrderRepository orderRepository;
    private final EmailService emailService;

    public InvoiceServiceImpl(InvoiceRepository invoiceRepository, InvoiceItemRepository itemRepository,
            PaymentRepository paymentRepository, CustomerRepository customerRepository,
            UserRepository userRepository, OutboundOrderRepository orderRepository, EmailService emailService) {
        this.invoiceRepository = invoiceRepository;
        this.itemRepository = itemRepository;
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.emailService = emailService;
    }

    /** Lists invoices with customer, status, keyword, and month filters. */
    @Override
    @Transactional
    public PageResponse<InvoiceListResponse> getInvoices(String statusValue, Long customerId, String keyword,
            String month, Pageable pageable) {
        validatePageable(pageable);
        validateMonth(month);
        InvoiceStatus status = parseStatus(statusValue);
        LocalDateTime from = month == null ? null : YearMonth.parse(month).atDay(1).atStartOfDay();
        LocalDateTime to = month == null ? null : YearMonth.parse(month).plusMonths(1).atDay(1).atStartOfDay();
        Page<Invoice> page = invoiceRepository.searchInvoices(customerId, status, from, to, blankToNull(keyword), pageable);
        List<InvoiceListResponse> content = page.getContent().stream().map(this::listResponse).toList();
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    /** Returns invoice counts and monetary totals for all time or a selected month. */
    @Override
    @Transactional
    public InvoiceSummaryResponse getSummary(String month) {
        validateMonth(month);
        InvoiceSummaryProjection result = invoiceRepository.summarize(month);
        return new InvoiceSummaryResponse(nvl(result.getTotalInvoices()), nvl(result.getTotalUnpaid()),
                nvl(result.getTotalOverdue()), nvl(result.getTotalPaidAmount()), nvl(result.getTotalUnpaidAmount()));
    }

    /** Creates an unpaid invoice and computes each line and VAT total on the server. */
    @Override
    @Transactional
    public InvoiceDetailResponse create(CreateInvoiceRequest request) {
        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new ResourceNotFoundException("Khách hàng", request.customerId()));
        if (request.periodStart() != null && request.periodEnd() != null
                && request.periodStart().isAfter(request.periodEnd())) {
            throw badRequest("periodStart không được sau periodEnd");
        }
        BigDecimal vatRate = request.vatRate() == null ? BigDecimal.ZERO : request.vatRate();
        if (vatRate.compareTo(new BigDecimal("100.00")) > 0) {
            throw badRequest("vatRate không được vượt quá 100%");
        }
        if (request.outboundOrderId() != null) {
            OutboundOrder order = orderRepository.findById(request.outboundOrderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Đơn xuất", request.outboundOrderId()));
            if (!order.getCustomerId().equals(customer.getId())) throw badRequest("Đơn xuất không thuộc khách hàng đã chọn");
        }
        List<InvoiceItem> items = request.items().stream().map(this::newItem).toList();
        BigDecimal amount = items.stream().map(InvoiceItem::getLineAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal vatAmount = amount.multiply(vatRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        Invoice invoice = new Invoice();
        invoice.setInvoiceCode("TMP-" + UUID.randomUUID());
        invoice.setCustomerId(customer.getId());
        invoice.setOutboundOrderId(request.outboundOrderId());
        invoice.setDescription(request.description().trim());
        invoice.setPeriodStart(request.periodStart());
        invoice.setPeriodEnd(request.periodEnd());
        invoice.setDueDate(request.dueDate());
        invoice.setAmount(amount);
        invoice.setVatRate(vatRate.setScale(2, RoundingMode.HALF_UP));
        invoice.setVatAmount(vatAmount);
        invoice.setTotalAmount(amount.add(vatAmount));
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setCreatedAt(now());
        invoice = invoiceRepository.save(invoice);
        invoice.setInvoiceCode("INV-" + now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-"
                + String.format("%06d", invoice.getId()));
        invoiceRepository.save(invoice);
        Invoice saved = invoice;
        items.forEach(item -> item.setInvoiceId(saved.getId()));
        itemRepository.saveAll(items);
        return detail(invoice, customer, items, List.of());
    }

    /** Lists the current customer's invoices without accepting a customer ID from the client. */
    @Override
    @Transactional
    public PageResponse<InvoiceListResponse> getMyInvoices(String email, String status, String keyword, Pageable pageable) {
        Long customerId = ownCustomer(email).getId();
        return getInvoices(status, customerId, keyword, null, pageable);
    }

    /** Finds the nearest-due unpaid/overdue invoice for the authenticated customer. */
    @Override
    @Transactional
    public CurrentInvoiceResponse getCurrentInvoice(String email) {
        Customer customer = ownCustomer(email);
        List<Invoice> candidates = invoiceRepository.findByCustomerIdAndStatusInAndDueDateIsNotNullOrderByDueDateAsc(
                customer.getId(), List.of(InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE));
        if (candidates.isEmpty()) return null;
        Invoice invoice = candidates.getFirst();
        long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(BUSINESS_ZONE), invoice.getDueDate());
        return new CurrentInvoiceResponse(listResponse(invoice), daysLeft, invoice.getTotalAmount());
    }

    /** Loads an invoice and its items/payments after enforcing administrator or owner access. */
    @Override
    @Transactional
    public InvoiceDetailResponse getById(Long id, String email, boolean admin) {
        Invoice invoice = findInvoice(id);
        Customer customer = customerRepository.findById(invoice.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Khách hàng", invoice.getCustomerId()));
        if (!admin && !ownCustomer(email).getId().equals(customer.getId())) throw invoiceNotFound();
        List<InvoiceItem> items = itemRepository.findByInvoiceIdOrderById(id);
        List<Payment> payments = paymentRepository.findByInvoiceIdOrderByIdDesc(id);
        return detail(invoice, customer, items, payments);
    }

    /** Cancels an unpaid/overdue invoice only when no successful payment exists. */
    @Override
    @Transactional
    public InvoiceDetailResponse cancel(Long id, String reason) {
        Invoice invoice = invoiceRepository.findLockedById(id).orElseThrow(() -> invoiceNotFound());
        if (invoice.getStatus() == InvoiceStatus.PAID
                || paymentRepository.existsByInvoiceIdAndPaymentMethodAndStatus(id, PaymentMethod.VNPAY, PaymentStatus.SUCCESS)
                || paymentRepository.existsByInvoiceIdAndPaymentMethodAndStatus(id, PaymentMethod.COD, PaymentStatus.SUCCESS)) {
            throw new BusinessException(HttpStatus.CONFLICT, "INVOICE_CANNOT_CANCEL", "Hóa đơn đã thanh toán hoặc không thể hủy");
        }
        if (invoice.getStatus() != InvoiceStatus.UNPAID && invoice.getStatus() != InvoiceStatus.OVERDUE) {
            throw new BusinessException(HttpStatus.CONFLICT, "INVOICE_CANNOT_CANCEL", "Trạng thái hóa đơn không cho phép hủy");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelReason(reason == null || reason.isBlank() ? null : reason.trim());
        Customer customer = customerRepository.findById(invoice.getCustomerId()).orElse(null);
        return detail(invoiceRepository.save(invoice), customer, itemRepository.findByInvoiceIdOrderById(id),
                paymentRepository.findByInvoiceIdOrderByIdDesc(id));
    }

    /** Sends an invoice email using the shared notification service. */
    @Override
    public void sendEmail(Long id, String actorEmail) {
        findInvoice(id);
        emailService.sendInvoiceEmail(id, actorEmail);
    }

    private InvoiceItem newItem(InvoiceLineRequest request) {
        InvoiceItem item = new InvoiceItem();
        item.setDescription(request.description().trim());
        item.setQuantity(request.quantity());
        item.setUnit(request.unit().trim());
        item.setUnitPrice(request.unitPrice().setScale(2, RoundingMode.HALF_UP));
        item.setLineAmount(request.quantity().multiply(request.unitPrice()).setScale(2, RoundingMode.HALF_UP));
        return item;
    }

    private InvoiceListResponse listResponse(Invoice invoice) {
        Customer customer = customerRepository.findById(invoice.getCustomerId()).orElse(null);
        return new InvoiceListResponse(invoice.getId(), invoice.getInvoiceCode(),
                customer == null ? null : customer.getBusinessName(), customer == null ? null : customer.getTaxCode(),
                invoice.getDescription(), invoice.getPeriodStart(), invoice.getPeriodEnd(), invoice.getDueDate(),
                invoice.getAmount(), invoice.getVatRate(), invoice.getVatAmount(), invoice.getTotalAmount(), invoice.getStatus());
    }

    private InvoiceDetailResponse detail(Invoice invoice, Customer customer, List<InvoiceItem> items, List<Payment> payments) {
        List<InvoiceItemResponse> itemDtos = items.stream().map(i -> new InvoiceItemResponse(i.getId(), i.getDescription(),
                i.getQuantity(), i.getUnit(), i.getUnitPrice(), i.getLineAmount())).toList();
        List<InvoicePaymentResponse> paymentDtos = payments.stream().map(p -> new InvoicePaymentResponse(p.getId(),
                p.getPaymentMethod(), p.getStatus(), p.getAmount(), p.getVnpTransactionNo(), p.getVnpBankCode(), p.getPaidAt())).toList();
        return new InvoiceDetailResponse(invoice.getId(), invoice.getInvoiceCode(), invoice.getCustomerId(),
                customer == null ? null : customer.getBusinessName(), customer == null ? null : customer.getTaxCode(),
                invoice.getOutboundOrderId(), invoice.getDescription(), invoice.getPeriodStart(), invoice.getPeriodEnd(),
                invoice.getDueDate(), invoice.getAmount(), invoice.getVatRate(), invoice.getVatAmount(), invoice.getTotalAmount(),
                invoice.getStatus(), invoice.getCreatedAt(), itemDtos, paymentDtos);
    }

    private Invoice findInvoice(Long id) {
        return invoiceRepository.findById(id).orElseThrow(this::invoiceNotFound);
    }

    private Customer ownCustomer(String email) {
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(() ->
                new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không tồn tại"));
        return customerRepository.findByUserId(user.getId()).orElseThrow(() ->
                new ResourceNotFoundException("Hồ sơ khách hàng"));
    }

    private InvoiceStatus parseStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return InvoiceStatus.valueOf(value.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException exception) { throw badRequest("status không hợp lệ"); }
    }

    private void validateMonth(String month) {
        if (month == null) return;
        try { YearMonth.parse(month); }
        catch (RuntimeException exception) { throw badRequest("month phải theo định dạng yyyy-MM"); }
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > 100)
            throw badRequest("page phải >= 0 và size phải từ 1 đến 100");
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private long nvl(Long value) { return value == null ? 0 : value; }
    private BigDecimal nvl(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private LocalDateTime now() { return LocalDateTime.now(BUSINESS_ZONE); }
    private ResourceNotFoundException invoiceNotFound() { return new ResourceNotFoundException("Hóa đơn"); }
    private BusinessException badRequest(String message) { return new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message); }
}
