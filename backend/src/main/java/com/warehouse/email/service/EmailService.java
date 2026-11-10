package com.warehouse.email.service;

import com.warehouse.common.enums.EmailNotificationStatus;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.exception.ResourceNotFoundException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.email.dto.EmailNotificationResponse;
import com.warehouse.email.model.EmailNotification;
import com.warehouse.email.repository.EmailNotificationRepository;
import com.warehouse.invoice.model.Invoice;
import com.warehouse.invoice.repository.InvoiceRepository;
import com.warehouse.outbound.model.OutboundOrder;
import com.warehouse.outbound.repository.OutboundOrderRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final JavaMailSender mailSender;
    private final EmailNotificationRepository notificationRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final OutboundOrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final String sender;

    public EmailService(JavaMailSender mailSender, EmailNotificationRepository notificationRepository,
            CustomerRepository customerRepository, UserRepository userRepository,
            OutboundOrderRepository orderRepository, InvoiceRepository invoiceRepository,
            @Value("${spring.mail.username:}") String sender) {
        this.mailSender = mailSender;
        this.notificationRepository = notificationRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.invoiceRepository = invoiceRepository;
        this.sender = sender;
    }

    /** Sends and records the automatic outbound status email after the order transaction commits. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public EmailNotificationResponse sendOutboundOrderNotification(Long orderId, String actorEmail) {
        OutboundOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn xuất", orderId));
        Customer customer = customer(order.getCustomerId());
        String subject = "Đơn xuất kho " + order.getOrderCode() + " đang được vận chuyển";
        String content = "Xin chào " + customer.getBusinessName() + ",\n\n"
                + "Đơn hàng " + order.getOrderCode() + " đã được bàn giao cho đơn vị vận chuyển.\n"
                + "Người nhận: " + order.getRecipientName() + "\n"
                + "Đơn vị vận chuyển: " + (order.getCarrier() == null ? "Chưa cập nhật" : order.getCarrier()) + "\n"
                + "Mã vận đơn: " + (order.getTrackingCode() == null ? "Chưa cập nhật" : order.getTrackingCode()) + "\n";
        return sendAndRecord(customer, order, actorEmail, subject, content);
    }

    /** Sends the same outbound notification on an administrator/staff request. */
    @Transactional
    public EmailNotificationResponse sendOutboundOrderManually(Long orderId, String actorEmail) {
        return sendOutboundOrderNotification(orderId, actorEmail);
    }

    /** Emails an invoice to the customer's billing email, falling back to the account email. */
    @Transactional
    public EmailNotificationResponse sendInvoiceEmail(Long invoiceId, String actorEmail) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn", invoiceId));
        Customer customer = customer(invoice.getCustomerId());
        String subject = "Hóa đơn " + invoice.getInvoiceCode() + " - Warehouse Management";
        String content = "Xin chào " + customer.getBusinessName() + ",\n\n"
                + "Hóa đơn: " + invoice.getInvoiceCode() + "\n"
                + "Nội dung: " + invoice.getDescription() + "\n"
                + "Số tiền: " + invoice.getTotalAmount() + " VND\n"
                + "Ngày đến hạn: " + invoice.getDueDate() + "\n"
                + "Trạng thái: " + invoice.getStatus() + "\n";
        return sendAndRecord(customer, null, actorEmail, subject, content);
    }

    /** Returns paginated email history, scoped to the current customer unless the caller is admin. */
    @Transactional
    public PageResponse<EmailNotificationResponse> getHistory(String email, String roleValue,
            String statusValue, Long customerId, Long orderId, Pageable pageable) {
        validatePageable(pageable);
        UserRole role = parseRole(roleValue);
        if (role == UserRole.CUSTOMER) customerId = ownCustomer(email).getId();
        else if (role != UserRole.ADMIN) throw forbidden();
        EmailNotificationStatus status = parseStatus(statusValue);
        Page<EmailNotification> page = notificationRepository.search(customerId, status, orderId, pageable);
        return new PageResponse<>(page.map(this::response).getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }

    /** Reads a notification and prevents customers from viewing another customer's email history. */
    @Transactional
    public EmailNotificationResponse getById(Long id, String email, String roleValue) {
        EmailNotification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Email notification", id));
        UserRole role = parseRole(roleValue);
        if (role == UserRole.CUSTOMER && !ownCustomer(email).getId().equals(notification.getCustomerId())) {
            throw new ResourceNotFoundException("Email notification", id);
        }
        if (role != UserRole.CUSTOMER && role != UserRole.ADMIN) throw forbidden();
        return response(notification);
    }

    /** Sends a test email directly to an administrator-provided recipient. */
    public void sendTestEmail(String recipientEmail) {
        if (recipientEmail == null || recipientEmail.isBlank()) throw badRequest("recipientEmail là bắt buộc");
        if (sender.isBlank()) throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_NOT_CONFIGURED", "Dịch vụ email chưa được cấu hình");
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender);
        message.setTo(recipientEmail.trim());
        message.setSubject("Warehouse Management - Email test");
        message.setText("Đây là email thử nghiệm từ Warehouse Management.");
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.error("Unable to send test email to {}", recipientEmail, exception);
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_SEND_FAILED", "Không thể gửi email thử nghiệm");
        }
    }

    private EmailNotificationResponse sendAndRecord(Customer customer, OutboundOrder order,
            String actorEmail, String subject, String content) {
        String recipient = customer.getBillingEmail();
        if (recipient == null || recipient.isBlank()) {
            recipient = userRepository.findById(customer.getUserId()).map(User::getEmail).orElse(null);
        }
        EmailNotification notification = new EmailNotification();
        notification.setCustomerId(customer.getId());
        notification.setOutboundOrderId(order == null ? null : order.getId());
        notification.setSentBy(actorEmail == null ? null : userRepository.findByEmailIgnoreCase(actorEmail).map(User::getId).orElse(null));
        notification.setRecipientEmail(recipient == null ? "" : recipient.trim());
        notification.setSubject(subject);
        notification.setContent(content);
        notification.setStatus(EmailNotificationStatus.PENDING);
        notification.setCreatedAt(LocalDateTime.now(BUSINESS_ZONE));
        notification = notificationRepository.save(notification);
        if (notification.getRecipientEmail().isBlank() || sender.isBlank()) {
            notification.setStatus(EmailNotificationStatus.FAILED);
            notification.setErrorMessage(notification.getRecipientEmail().isBlank()
                    ? "Khách hàng chưa có email nhận thông báo"
                    : "Dịch vụ email chưa được cấu hình");
            return response(notificationRepository.save(notification));
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(sender);
            message.setTo(notification.getRecipientEmail());
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
            notification.setStatus(EmailNotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now(BUSINESS_ZONE));
            notification.setErrorMessage(null);
        } catch (MailException exception) {
            log.error("Unable to send notification email id={} recipient={}", notification.getId(), recipient, exception);
            notification.setStatus(EmailNotificationStatus.FAILED);
            notification.setErrorMessage(safeError(exception));
        }
        return response(notificationRepository.save(notification));
    }

    private Customer customer(Long id) {
        return customerRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Khách hàng", id));
    }

    private Customer ownCustomer(String email) {
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(() ->
                new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không tồn tại"));
        return customerRepository.findByUserId(user.getId()).orElseThrow(() -> new ResourceNotFoundException("Hồ sơ khách hàng"));
    }

    private EmailNotificationResponse response(EmailNotification e) {
        return new EmailNotificationResponse(e.getId(), e.getCustomerId(), e.getOutboundOrderId(), e.getSentBy(),
                e.getRecipientEmail(), e.getSubject(), e.getContent(), e.getStatus(), e.getErrorMessage(), e.getSentAt(), e.getCreatedAt());
    }

    private String safeError(Exception exception) {
        String value = exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
        return value.length() > 2000 ? value.substring(0, 2000) : value;
    }

    private EmailNotificationStatus parseStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return EmailNotificationStatus.valueOf(value.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException exception) { throw badRequest("status email không hợp lệ"); }
    }

    private UserRole parseRole(String value) {
        try { return UserRole.valueOf(value); }
        catch (RuntimeException exception) { throw forbidden(); }
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > 100)
            throw badRequest("page phải >= 0 và size phải từ 1 đến 100");
    }

    private BusinessException forbidden() { return new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Không có quyền truy cập lịch sử email"); }
    private BusinessException badRequest(String message) { return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message); }
}
