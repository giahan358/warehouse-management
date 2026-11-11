package com.warehouse.payment.controller;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.outbound.dto.ConfirmCodRequest;
import com.warehouse.outbound.dto.UpdateCodStatusRequest;
import com.warehouse.payment.dto.CodOrderResponse;
import com.warehouse.payment.dto.CodSummaryResponse;
import com.warehouse.payment.dto.ConfirmCodPaymentRequest;
import com.warehouse.payment.dto.PaymentResponse;
import com.warehouse.payment.dto.VnpayIpnResponse;
import com.warehouse.payment.dto.VnpayMockRequest;
import com.warehouse.payment.service.PaymentService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/payments")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<PaymentResponse>> getPayments(
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long invoiceId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(paymentService.getPayments(method, status, invoiceId, from, to, pageable),
                "Lấy danh sách giao dịch thành công");
    }

    @GetMapping("/payments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    public ApiResponse<PaymentResponse> getPayment(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(paymentService.getPayment(id, jwt.getSubject(), isAdmin(jwt)),
                "Lấy chi tiết giao dịch thành công");
    }

    @PostMapping("/payments/{id}/cod/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PaymentResponse> confirmCodPayment(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody(required = false) ConfirmCodPaymentRequest request) {
        return ApiResponse.success(paymentService.confirmCodPayment(id,
                request == null ? null : request.transactionRef(), jwt.getSubject()),
                "Xác nhận thanh toán COD thành công");
    }

    @GetMapping("/payments/vnpay/return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> parameters) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(paymentService.getVnpayReturnResult(parameters)).toString())
                .build();
    }

    @PostMapping("/payments/vnpay/ipn")
    public VnpayIpnResponse vnpayIpn(@RequestParam Map<String, String> parameters) {
        return paymentService.processVnpayIpn(parameters);
    }

    @PostMapping("/payments/vnpay/ipn/mock")
    @PreAuthorize("hasRole('ADMIN')")
    public VnpayIpnResponse mockVnpayIpn(@Valid @RequestBody VnpayMockRequest request) {
        return paymentService.processMockIpn(request.txnRef(), request.responseCode(), request.amount());
    }

    @GetMapping("/cod/orders")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<CodOrderResponse>> getCodOrders(
            @RequestParam(required = false) String codStatus,
            @RequestParam(required = false) Carrier carrier,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(paymentService.getCodOrders(codStatus, carrier, customerId, keyword, pageable),
                "Lấy danh sách đơn COD thành công");
    }

    @GetMapping("/cod/orders/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CodSummaryResponse> getCodSummary() {
        return ApiResponse.success(paymentService.getCodSummary(), "Lấy thống kê đối soát COD thành công");
    }

    @PatchMapping("/outbound-orders/{id}/cod/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CodOrderResponse> updateCodStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateCodStatusRequest request) {
        return ApiResponse.success(paymentService.updateCodStatus(id, request.codStatus()),
                "Cập nhật trạng thái đối soát COD thành công");
    }

    @PostMapping("/outbound-orders/{id}/cod/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CodOrderResponse> confirmCodOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody(required = false) ConfirmCodRequest request) {
        return ApiResponse.success(paymentService.confirmCodOrder(id,
                request == null ? null : request.offsetInvoiceIds(),
                request == null ? null : request.transactionRef(), jwt.getSubject()),
                "Xác nhận đối soát COD thành công");
    }

    @GetMapping("/cod/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<PageResponse<CodOrderResponse>> getMyCodOrders(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String codStatus,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(paymentService.getMyCodOrders(jwt.getSubject(), codStatus, pageable),
                "Lấy danh sách COD của bạn thành công");
    }

    private boolean isAdmin(Jwt jwt) {
        return jwt.getClaimAsStringList("roles").contains("ADMIN");
    }
}
