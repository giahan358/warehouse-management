package com.warehouse.email.controller;

import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.email.dto.EmailNotificationResponse;
import com.warehouse.email.dto.EmailTestRequest;
import com.warehouse.email.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/email-notifications")
public class EmailNotificationController {
    private final EmailService emailService;

    public EmailNotificationController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/outbound-orders/{id}/send")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<EmailNotificationResponse> sendOutboundOrder(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(emailService.sendOutboundOrderManually(id, jwt.getSubject()),
                "Đã xử lý gửi email thông báo đơn xuất");
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    public ApiResponse<PageResponse<EmailNotificationResponse>> getHistory(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long outboundOrderId,
            @PageableDefault(size = 10) Pageable pageable) {
        String role = jwt.getClaimAsStringList("roles").stream().findFirst().orElse("");
        return ApiResponse.success(emailService.getHistory(jwt.getSubject(), role, status,
                customerId, outboundOrderId, pageable), "Lấy lịch sử gửi email thành công");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    public ApiResponse<EmailNotificationResponse> getById(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        String role = jwt.getClaimAsStringList("roles").stream().findFirst().orElse("");
        return ApiResponse.success(emailService.getById(id, jwt.getSubject(), role), "Lấy chi tiết email thành công");
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<Void> sendTest(@Valid @RequestBody EmailTestRequest request) {
        emailService.sendTestEmail(request.recipientEmail());
        return ApiResponse.success(null, "Đã gửi email thử nghiệm");
    }
}
