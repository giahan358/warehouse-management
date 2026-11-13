package com.warehouse.outbound.service;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.enums.OutboundStatus;
import com.warehouse.common.response.PageResponse;
import com.warehouse.outbound.dto.CreateOutboundOrderRequest;
import com.warehouse.outbound.dto.OutboundOrderDetailResponse;
import com.warehouse.outbound.dto.OutboundOrderResponse;
import com.warehouse.outbound.dto.OutboundStatusCountsResponse;
import com.warehouse.outbound.dto.UpdateOutboundActualQuantityRequest;
import com.warehouse.outbound.dto.UpdateTrackingRequest;
import java.time.LocalDate;

public interface OutboundOrderService {
    PageResponse<OutboundOrderResponse> getOrders(String email, String role, String status,
            LocalDate from, LocalDate to, Long customerId, Carrier carrier, String keyword,
            org.springframework.data.domain.Pageable pageable);
    OutboundStatusCountsResponse getStatusCounts(String email, String role, LocalDate from, LocalDate to);
    OutboundOrderDetailResponse create(String email, CreateOutboundOrderRequest request);
    OutboundOrderDetailResponse getById(Long id, String email, String role);
    OutboundOrderDetailResponse startPreparing(Long id);
    OutboundOrderDetailResponse updateActualQuantity(Long id, Long itemId, UpdateOutboundActualQuantityRequest request);
    OutboundOrderDetailResponse markPacked(Long id);
    OutboundOrderDetailResponse updateTracking(Long id, UpdateTrackingRequest request);
    OutboundOrderDetailResponse markInDelivery(Long id, String email);
    OutboundOrderDetailResponse markDelivered(Long id);
    OutboundOrderDetailResponse markReturned(Long id, String note);
    OutboundOrderDetailResponse cancel(Long id, String email, String role, String reason);
    OutboundOrderDetailResponse getHandoverReport(Long id);
}
