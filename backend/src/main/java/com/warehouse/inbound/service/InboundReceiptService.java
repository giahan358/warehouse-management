package com.warehouse.inbound.service;

import com.warehouse.inbound.dto.CancelInboundReceiptRequest;
import com.warehouse.inbound.dto.CreateInboundReceiptRequest;
import com.warehouse.inbound.dto.InboundCountingRequest;
import com.warehouse.inbound.dto.InboundDiscrepancyReportResponse;
import com.warehouse.inbound.dto.InboundReceiptDetailResponse;
import com.warehouse.inbound.dto.InboundReceiptResponse;
import com.warehouse.inbound.dto.InboundReceiptItemResponse;
import com.warehouse.inbound.dto.InboundScanRequest;
import com.warehouse.inbound.dto.InboundStatusCountsResponse;
import com.warehouse.inbound.dto.StartInboundReceiptRequest;
import com.warehouse.inbound.dto.UpdateInboundActualQuantityRequest;
import com.warehouse.inbound.dto.UpdateInboundItemRequest;
import com.warehouse.inbound.dto.UpdateInboundReceiptRequest;
import com.warehouse.common.response.PageResponse;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;

public interface InboundReceiptService {
    PageResponse<InboundReceiptResponse> getReceipts(
            String email, String role, String status, LocalDate from, LocalDate to,
            Long requestedCustomerId, String keyword, String dockCode, String timeSlot, Pageable pageable);

    InboundStatusCountsResponse getStatusCounts(String email, String role, LocalDate from, LocalDate to);

    InboundReceiptDetailResponse create(String email, String role, CreateInboundReceiptRequest request);

    InboundReceiptDetailResponse getById(Long id, String email, String role);

    InboundReceiptDetailResponse update(Long id, String email, UpdateInboundReceiptRequest request);

    InboundReceiptItemResponse addItem(Long id, String email, com.warehouse.inbound.dto.InboundItemRequest request);

    InboundReceiptItemResponse updateItem(
            Long id, Long itemId, String email, UpdateInboundItemRequest request);

    void deleteItem(Long id, Long itemId, String email);

    InboundReceiptItemResponse updateActualQuantity(
            Long id, Long itemId, UpdateInboundActualQuantityRequest request);

    InboundReceiptDetailResponse saveCounting(Long id, InboundCountingRequest request);

    InboundReceiptItemResponse scan(Long id, InboundScanRequest request);

    InboundReceiptDetailResponse start(Long id, StartInboundReceiptRequest request);

    InboundReceiptDetailResponse confirm(Long id, String email);

    InboundReceiptDetailResponse cancel(
            Long id, String email, String role, CancelInboundReceiptRequest request);

    InboundDiscrepancyReportResponse getDiscrepancyReport(Long id, String email, String role);
}
