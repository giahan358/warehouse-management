package com.warehouse.inbound.controller;

import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.inbound.dto.CancelInboundReceiptRequest;
import com.warehouse.inbound.dto.CreateInboundReceiptRequest;
import com.warehouse.inbound.dto.InboundCountingRequest;
import com.warehouse.inbound.dto.InboundDiscrepancyReportResponse;
import com.warehouse.inbound.dto.InboundItemRequest;
import com.warehouse.inbound.dto.InboundReceiptDetailResponse;
import com.warehouse.inbound.dto.InboundReceiptItemResponse;
import com.warehouse.inbound.dto.InboundReceiptResponse;
import com.warehouse.inbound.dto.InboundScanRequest;
import com.warehouse.inbound.dto.InboundStatusCountsResponse;
import com.warehouse.inbound.dto.StartInboundReceiptRequest;
import com.warehouse.inbound.dto.UpdateInboundActualQuantityRequest;
import com.warehouse.inbound.dto.UpdateInboundItemRequest;
import com.warehouse.inbound.dto.UpdateInboundReceiptRequest;
import com.warehouse.inbound.service.InboundReceiptService;
import com.warehouse.security.SessionPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inbound-receipts")
@SecurityRequirement(name = "bearerAuth")
public class InboundReceiptController {
    private final InboundReceiptService inboundReceiptService;

    public InboundReceiptController(InboundReceiptService inboundReceiptService) {
        this.inboundReceiptService = inboundReceiptService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    @Operation(summary = "List inbound receipts with filters and pagination")
    public ApiResponse<PageResponse<InboundReceiptResponse>> getReceipts(
            @AuthenticationPrincipal SessionPrincipal jwt,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String dockCode,
            @RequestParam(required = false) String timeSlot,
            @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(
                inboundReceiptService.getReceipts(
                        jwt.getSubject(),
                        currentRole(jwt),
                        status,
                        from,
                        to,
                        customerId,
                        keyword,
                        dockCode,
                        timeSlot,
                        pageable),
                "Lấy danh sách phiếu nhập thành công");
    }

    @GetMapping("/status-counts")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    @Operation(summary = "Count inbound receipts by status")
    public ApiResponse<InboundStatusCountsResponse> getStatusCounts(
            @AuthenticationPrincipal SessionPrincipal jwt,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ApiResponse.success(
                inboundReceiptService.getStatusCounts(jwt.getSubject(), currentRole(jwt), from, to),
                "Lấy thống kê phiếu nhập thành công");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a scheduled inbound receipt")
    public ApiResponse<InboundReceiptDetailResponse> create(
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody CreateInboundReceiptRequest request) {
        return ApiResponse.success(
                inboundReceiptService.create(jwt.getSubject(), currentRole(jwt), request),
                "Tạo phiếu nhập thành công");
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    @Operation(summary = "Get inbound receipt details and items")
    public ApiResponse<InboundReceiptDetailResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(
                inboundReceiptService.getById(id, jwt.getSubject(), currentRole(jwt)),
                "Lấy chi tiết phiếu nhập thành công");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Update an owned scheduled inbound receipt")
    public ApiResponse<InboundReceiptDetailResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody UpdateInboundReceiptRequest request) {
        return ApiResponse.success(
                inboundReceiptService.update(id, jwt.getSubject(), request),
                "Cập nhật phiếu nhập thành công");
    }

    @PostMapping("/{id}/items")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a product to an owned scheduled inbound receipt")
    public ApiResponse<InboundReceiptItemResponse> addItem(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody InboundItemRequest request) {
        return ApiResponse.success(
                inboundReceiptService.addItem(id, jwt.getSubject(), request),
                "Thêm sản phẩm vào phiếu nhập thành công");
    }

    @PutMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Update expected quantity before receiving starts")
    public ApiResponse<InboundReceiptItemResponse> updateItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody UpdateInboundItemRequest request) {
        return ApiResponse.success(
                inboundReceiptService.updateItem(id, itemId, jwt.getSubject(), request),
                "Cập nhật sản phẩm trong phiếu nhập thành công");
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Delete an item from an owned scheduled receipt that has other items")
    public ApiResponse<Void> deleteItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @AuthenticationPrincipal SessionPrincipal jwt) {
        inboundReceiptService.deleteItem(id, itemId, jwt.getSubject());
        return ApiResponse.success(null, "Xóa sản phẩm khỏi phiếu nhập thành công");
    }

    @PatchMapping("/{id}/items/{itemId}/actual-quantity")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "Save actual and damaged quantities for an item being received")
    public ApiResponse<InboundReceiptItemResponse> updateActualQuantity(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateInboundActualQuantityRequest request) {
        return ApiResponse.success(
                inboundReceiptService.updateActualQuantity(id, itemId, request),
                "Lưu kết quả kiểm đếm thành công");
    }

    @PutMapping("/{id}/counting")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "Save all item counting results in one request")
    public ApiResponse<InboundReceiptDetailResponse> saveCounting(
            @PathVariable Long id,
            @Valid @RequestBody InboundCountingRequest request) {
        return ApiResponse.success(
                inboundReceiptService.saveCounting(id, request),
                "Lưu kết quả kiểm đếm thành công");
    }

    @PostMapping("/{id}/scan")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "Increment the counted quantity by scanning a product barcode")
    public ApiResponse<InboundReceiptItemResponse> scan(
            @PathVariable Long id,
            @Valid @RequestBody InboundScanRequest request) {
        return ApiResponse.success(inboundReceiptService.scan(id, request), "Quét sản phẩm thành công");
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "Start receiving a scheduled inbound receipt at a dock")
    public ApiResponse<InboundReceiptDetailResponse> start(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody(required = false) StartInboundReceiptRequest request) {
        return ApiResponse.success(
                inboundReceiptService.start(id, request),
                "Bắt đầu tiếp nhận phiếu nhập thành công");
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF')")
    @Operation(summary = "Confirm a fully counted receipt and add good quantities to inventory")
    public ApiResponse<InboundReceiptDetailResponse> confirm(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(
                inboundReceiptService.confirm(id, jwt.getSubject()),
                "Xác nhận nhập kho thành công");
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    @Operation(summary = "Cancel an eligible inbound receipt")
    public ApiResponse<InboundReceiptDetailResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt,
            @Valid @RequestBody(required = false) CancelInboundReceiptRequest request) {
        return ApiResponse.success(
                inboundReceiptService.cancel(id, jwt.getSubject(), currentRole(jwt), request),
                "Hủy phiếu nhập thành công");
    }

    @GetMapping("/{id}/discrepancy-report")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_STAFF', 'CUSTOMER')")
    @Operation(summary = "Get counted items with quantity variance or damage")
    public ApiResponse<InboundDiscrepancyReportResponse> getDiscrepancyReport(
            @PathVariable Long id,
            @AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(
                inboundReceiptService.getDiscrepancyReport(id, jwt.getSubject(), currentRole(jwt)),
                "Lấy biên bản chênh lệch thành công");
    }

    private String currentRole(SessionPrincipal jwt) {
        return jwt.role().name();
    }
}
