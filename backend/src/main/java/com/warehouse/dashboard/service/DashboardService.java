package com.warehouse.dashboard.service;

import com.warehouse.dashboard.dto.AdminDashboardResponse;
import com.warehouse.dashboard.dto.CustomerDashboardResponse;
import com.warehouse.dashboard.dto.CustomerOperationResponse;
import com.warehouse.dashboard.dto.DashboardFlowPoint;
import com.warehouse.dashboard.dto.DashboardTaskResponse;
import com.warehouse.dashboard.dto.StaffDashboardResponse;
import com.warehouse.dashboard.dto.TenantUsageResponse;
import com.warehouse.dashboard.dto.ZoneUsageResponse;
import com.warehouse.common.response.PageResponse;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface DashboardService {
    AdminDashboardResponse getAdminOverview();
    List<DashboardFlowPoint> getAdminFlow(LocalDate from, LocalDate to, String granularity);
    List<TenantUsageResponse> getTenantUsage();
    List<ZoneUsageResponse> getZoneUsage();
    StaffDashboardResponse getStaffOverview();
    PageResponse<DashboardTaskResponse> getStaffTasks(Pageable pageable);
    CustomerDashboardResponse getCustomerOverview(String email);
    PageResponse<CustomerOperationResponse> getCustomerOperations(String email, Pageable pageable);
}
