package com.warehouse.outbound.controller;

import com.warehouse.common.enums.Carrier;
import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.outbound.dto.CreateOutboundOrderRequest;
import com.warehouse.outbound.dto.CancelOutboundRequest;
import com.warehouse.outbound.dto.OutboundItemRequest;
import com.warehouse.outbound.dto.OutboundOrderDetailResponse;
import com.warehouse.outbound.dto.OutboundOrderResponse;
import com.warehouse.outbound.dto.OutboundStatusCountsResponse;
import com.warehouse.outbound.dto.MarkReturnedRequest;
import com.warehouse.outbound.dto.UpdateOutboundActualQuantityRequest;
import com.warehouse.outbound.dto.UpdateTrackingRequest;
import com.warehouse.outbound.service.OutboundOrderService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class OutboundOrderController {
    private final OutboundOrderService outboundOrderService;

    public OutboundOrderController(OutboundOrderService outboundOrderService) {
        this.outboundOrderService = outboundOrderService;
    }

    @GetMapping("/outbound-orders")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    public ApiResponse<PageResponse<OutboundOrderResponse>> getOrders(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Carrier carrier,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(outboundOrderService.getOrders(jwt.getSubject(), role(jwt), status,
                from, to, customerId, carrier, keyword, pageable), "Lấy danh sách đơn xuất thành công");
    }

    @GetMapping("/outbound-orders/status-counts")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    public ApiResponse<OutboundStatusCountsResponse> getStatusCounts(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ApiResponse.success(outboundOrderService.getStatusCounts(jwt.getSubject(), role(jwt), from, to),
                "Lấy thống kê đơn xuất thành công");
    }

    @PostMapping("/outbound-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OutboundOrderDetailResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateOutboundOrderRequest request) {
        return ApiResponse.success(outboundOrderService.create(jwt.getSubject(), request), "Tạo đơn xuất thành công");
    }

    @GetMapping("/outbound-orders/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    public ApiResponse<OutboundOrderDetailResponse> getById(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(outboundOrderService.getById(id, jwt.getSubject(), role(jwt)),
                "Lấy chi tiết đơn xuất thành công");
    }

    @PostMapping("/outbound-orders/{id}/items")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OutboundOrderDetailResponse> addItem(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody OutboundItemRequest request) {
        return ApiResponse.success(outboundOrderService.addItem(id, jwt.getSubject(), request),
                "Thêm sản phẩm vào đơn xuất thành công");
    }

    @PatchMapping("/outbound-orders/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> approve(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(outboundOrderService.approve(id, jwt.getSubject()), "Đơn xuất đã được tiếp nhận");
    }

    @PatchMapping("/outbound-orders/{id}/start-preparing")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> startPreparing(@PathVariable Long id) {
        return ApiResponse.success(outboundOrderService.startPreparing(id), "Bắt đầu soạn đơn xuất");
    }

    @PatchMapping("/outbound-orders/{id}/items/{itemId}/actual-quantity")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> updateActualQuantity(
            @PathVariable Long id, @PathVariable Long itemId,
            @Valid @RequestBody UpdateOutboundActualQuantityRequest request) {
        return ApiResponse.success(outboundOrderService.updateActualQuantity(id, itemId, request),
                "Cập nhật số lượng thực soạn thành công");
    }

    @PatchMapping("/outbound-orders/{id}/mark-packed")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> markPacked(@PathVariable Long id) {
        return ApiResponse.success(outboundOrderService.markPacked(id), "Xác nhận đóng gói thành công");
    }

    @PatchMapping("/outbound-orders/{id}/tracking")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> updateTracking(
            @PathVariable Long id, @Valid @RequestBody UpdateTrackingRequest request) {
        return ApiResponse.success(outboundOrderService.updateTracking(id, request), "Cập nhật mã vận đơn thành công");
    }

    @PatchMapping("/outbound-orders/{id}/mark-in-delivery")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> markInDelivery(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(outboundOrderService.markInDelivery(id, jwt.getSubject()),
                "Đơn đã bàn giao cho đơn vị vận chuyển");
    }

    @PatchMapping("/outbound-orders/{id}/mark-delivered")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> markDelivered(@PathVariable Long id) {
        return ApiResponse.success(outboundOrderService.markDelivered(id), "Xác nhận giao hàng thành công");
    }

    @PatchMapping("/outbound-orders/{id}/mark-returned")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> markReturned(
            @PathVariable Long id, @Valid @RequestBody(required = false) MarkReturnedRequest request) {
        return ApiResponse.success(outboundOrderService.markReturned(id,
                request == null ? null : request.note()), "Xác nhận đơn hoàn thành công");
    }

    @PatchMapping("/outbound-orders/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    public ApiResponse<OutboundOrderDetailResponse> cancel(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody(required = false) CancelOutboundRequest request) {
        return ApiResponse.success(outboundOrderService.cancel(id, jwt.getSubject(), role(jwt),
                request == null ? null : request.reason()), "Hủy đơn xuất thành công");
    }

    @GetMapping("/outbound-orders/{id}/handover-report")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    public ApiResponse<OutboundOrderDetailResponse> getHandoverReport(@PathVariable Long id) {
        return ApiResponse.success(outboundOrderService.getHandoverReport(id), "Lấy biên bản bàn giao thành công");
    }

    private String role(Jwt jwt) {
        return jwt.getClaimAsStringList("roles").stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Authenticated JWT is missing roles"));
    }
}
