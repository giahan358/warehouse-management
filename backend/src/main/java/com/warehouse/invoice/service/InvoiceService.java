package com.warehouse.invoice.service;

import com.warehouse.common.enums.InvoiceStatus;
import com.warehouse.common.response.PageResponse;
import com.warehouse.invoice.dto.CreateInvoiceRequest;
import com.warehouse.invoice.dto.CurrentInvoiceResponse;
import com.warehouse.invoice.dto.InvoiceDetailResponse;
import com.warehouse.invoice.dto.InvoiceListResponse;
import com.warehouse.invoice.dto.InvoiceSummaryResponse;
import org.springframework.data.domain.Pageable;

public interface InvoiceService {
    PageResponse<InvoiceListResponse> getInvoices(String status, Long customerId, String keyword,
            String month, Pageable pageable);
    InvoiceSummaryResponse getSummary(String month);
    InvoiceDetailResponse create(CreateInvoiceRequest request);
    PageResponse<InvoiceListResponse> getMyInvoices(String email, String status, String keyword, Pageable pageable);
    CurrentInvoiceResponse getCurrentInvoice(String email);
    InvoiceDetailResponse getById(Long id, String email, boolean admin);
    InvoiceDetailResponse cancel(Long id, String reason);
    void sendEmail(Long id, String actorEmail);
}
