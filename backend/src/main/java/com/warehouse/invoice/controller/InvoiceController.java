package com.warehouse.invoice.controller;

import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.invoice.dto.CancelInvoiceRequest;
import com.warehouse.invoice.dto.CreateInvoiceRequest;
import com.warehouse.invoice.dto.CurrentInvoiceResponse;
import com.warehouse.invoice.dto.InvoiceDetailResponse;
import com.warehouse.invoice.dto.InvoiceListResponse;
import com.warehouse.invoice.dto.InvoiceSummaryResponse;
import com.warehouse.invoice.dto.PaymentUrlResponse;
import com.warehouse.invoice.service.InvoiceService;
import com.warehouse.security.SessionPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import com.warehouse.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "bearerAuth")
public class InvoiceController {
    private final InvoiceService invoiceService;
    private final PaymentService paymentService;

    public InvoiceController(InvoiceService invoiceService, PaymentService paymentService) {
        this.invoiceService = invoiceService;
        this.paymentService = paymentService;
    }

    @GetMapping("/invoices")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<InvoiceListResponse>> getInvoices(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String month,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(invoiceService.getInvoices(status, customerId, keyword, month, pageable),
                "Lấy danh sách hóa đơn thành công");
    }

    @GetMapping("/invoices/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<InvoiceSummaryResponse> getSummary(@RequestParam(required = false) String month) {
        return ApiResponse.success(invoiceService.getSummary(month), "Lấy thống kê hóa đơn thành công");
    }

    @PostMapping("/invoices")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<InvoiceDetailResponse> create(@Valid @RequestBody CreateInvoiceRequest request) {
        return ApiResponse.success(invoiceService.create(request), "Tạo hóa đơn thành công");
    }

    @GetMapping("/invoices/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<PageResponse<InvoiceListResponse>> getMyInvoices(
            @AuthenticationPrincipal SessionPrincipal jwt,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(invoiceService.getMyInvoices(jwt.getSubject(), status, keyword, pageable),
                "Lấy lịch sử hóa đơn thành công");
    }

    @GetMapping("/invoices/me/current")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<CurrentInvoiceResponse> getCurrent(@AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(invoiceService.getCurrentInvoice(jwt.getSubject()),
                "Lấy hóa đơn cần thanh toán thành công");
    }

    @GetMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    public ApiResponse<InvoiceDetailResponse> getById(@PathVariable Long id, @AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(invoiceService.getById(id, jwt.getSubject(), isAdmin(jwt)),
                "Lấy chi tiết hóa đơn thành công");
    }

    @PatchMapping("/invoices/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<InvoiceDetailResponse> cancel(
            @PathVariable Long id, @Valid @RequestBody(required = false) CancelInvoiceRequest request) {
        return ApiResponse.success(invoiceService.cancel(id, request == null ? null : request.reason()),
                "Hủy hóa đơn thành công");
    }

    @PostMapping("/invoices/{id}/send-email")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> sendEmail(@PathVariable Long id, @AuthenticationPrincipal SessionPrincipal jwt) {
        invoiceService.sendEmail(id, jwt.getSubject());
        return ApiResponse.success(null, "Đã gửi hóa đơn qua email");
    }

    @PostMapping("/invoices/{id}/payments/vnpay")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PaymentUrlResponse> createVnpayPayment(
            @PathVariable Long id, @AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(paymentService.createVnpayPayment(id, jwt.getSubject()),
                "Tạo liên kết thanh toán thành công");
    }

    private boolean isAdmin(SessionPrincipal jwt) {
        return jwt.roles().contains("ADMIN");
    }
}
