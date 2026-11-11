package com.warehouse.dashboard.controller;

import com.warehouse.common.response.ApiResponse;
import com.warehouse.common.response.PageResponse;
import com.warehouse.dashboard.dto.AdminDashboardResponse;
import com.warehouse.dashboard.dto.CustomerDashboardResponse;
import com.warehouse.dashboard.dto.CustomerOperationResponse;
import com.warehouse.dashboard.dto.DashboardFlowPoint;
import com.warehouse.dashboard.dto.DashboardTaskResponse;
import com.warehouse.dashboard.dto.StaffDashboardResponse;
import com.warehouse.dashboard.dto.TenantUsageResponse;
import com.warehouse.dashboard.dto.ZoneUsageResponse;
import com.warehouse.dashboard.service.DashboardService;
import com.warehouse.security.SessionPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AdminDashboardResponse> adminOverview() {
        return ApiResponse.success(dashboardService.getAdminOverview(), "Lấy tổng quan quản trị thành công");
    }

    @GetMapping("/admin/flow")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<DashboardFlowPoint>> adminFlow(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(defaultValue = "day") String granularity) {
        return ApiResponse.success(dashboardService.getAdminFlow(from, to, granularity), "Lấy dữ liệu nhập xuất thành công");
    }

    @GetMapping("/admin/tenant-usage")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<TenantUsageResponse>> tenantUsage() {
        return ApiResponse.success(dashboardService.getTenantUsage(), "Lấy mức sử dụng của khách hàng thành công");
    }

    @GetMapping("/admin/zone-usage")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<ZoneUsageResponse>> zoneUsage() {
        return ApiResponse.success(dashboardService.getZoneUsage(), "Lấy mức sử dụng theo khu vực thành công");
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('WAREHOUSE_STAFF')")
    public ApiResponse<StaffDashboardResponse> staffOverview() {
        return ApiResponse.success(dashboardService.getStaffOverview(), "Lấy tổng quan công việc thành công");
    }

    @GetMapping("/staff/tasks")
    @PreAuthorize("hasRole('WAREHOUSE_STAFF')")
    public ApiResponse<PageResponse<DashboardTaskResponse>> staffTasks(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(dashboardService.getStaffTasks(pageable), "Lấy hàng đợi công việc thành công");
    }

    @GetMapping("/customer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<CustomerDashboardResponse> customerOverview(@AuthenticationPrincipal SessionPrincipal jwt) {
        return ApiResponse.success(dashboardService.getCustomerOverview(jwt.getSubject()), "Lấy tổng quan kho của bạn thành công");
    }

    @GetMapping("/customer/operations")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<PageResponse<CustomerOperationResponse>> customerOperations(
            @AuthenticationPrincipal SessionPrincipal jwt, @PageableDefault(size = 10) Pageable pageable) {
        return ApiResponse.success(dashboardService.getCustomerOperations(jwt.getSubject(), pageable),
                "Lấy hoạt động kho của bạn thành công");
    }
}
