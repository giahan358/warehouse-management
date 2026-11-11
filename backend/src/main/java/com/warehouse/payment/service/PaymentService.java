package com.warehouse.payment.service;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.CodStatus;
import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.enums.PaymentMethod;
import com.warehouse.common.enums.PaymentStatus;
import com.warehouse.common.response.PageResponse;
import com.warehouse.invoice.dto.PaymentUrlResponse;
import com.warehouse.payment.dto.CodOrderResponse;
import com.warehouse.payment.dto.CodSummaryResponse;
import com.warehouse.payment.dto.PaymentResponse;
import com.warehouse.payment.dto.VnpayIpnResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.data.domain.Pageable;

public interface PaymentService {
    PaymentUrlResponse createVnpayPayment(Long invoiceId, String email);
    VnpayIpnResponse processVnpayIpn(Map<String, String> parameters);
    String getVnpayReturnResult(Map<String, String> parameters);
    VnpayIpnResponse processMockIpn(String txnRef, String responseCode, BigDecimal amount);
    PageResponse<PaymentResponse> getPayments(String method, String status, Long invoiceId,
            LocalDate from, LocalDate to, Pageable pageable);
    PaymentResponse getPayment(Long id, String email, boolean admin);
    PaymentResponse confirmCodPayment(Long id, String transactionRef, String adminEmail);
    PageResponse<CodOrderResponse> getCodOrders(String status, Carrier carrier, Long customerId,
            String keyword, Pageable pageable);
    PageResponse<CodOrderResponse> getMyCodOrders(String email, String status, Pageable pageable);
    CodSummaryResponse getCodSummary();
    CodOrderResponse updateCodStatus(Long orderId, CodStatus status);
    CodOrderResponse confirmCodOrder(Long orderId, java.util.List<Long> offsetInvoiceIds,
            String transactionRef, String adminEmail);
}
