package com.warehouse.dashboard.service;

import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.exception.ResourceNotFoundException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.dashboard.dto.AdminDashboardResponse;
import com.warehouse.dashboard.dto.CustomerDashboardResponse;
import com.warehouse.dashboard.dto.CustomerOperationResponse;
import com.warehouse.dashboard.dto.DashboardFlowPoint;
import com.warehouse.dashboard.dto.DashboardTaskResponse;
import com.warehouse.dashboard.dto.StaffDashboardResponse;
import com.warehouse.dashboard.dto.TenantUsageResponse;
import com.warehouse.dashboard.dto.ZoneUsageResponse;
import com.warehouse.dashboard.repository.DashboardRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardServiceImpl implements DashboardService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final DashboardRepository dashboardRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final Map<String, BigDecimal> zoneCapacity;

    public DashboardServiceImpl(DashboardRepository dashboardRepository,
            CustomerRepository customerRepository, UserRepository userRepository,
            @Value("${app.dashboard.zone-capacity-a:0}") BigDecimal zoneA,
            @Value("${app.dashboard.zone-capacity-b:0}") BigDecimal zoneB,
            @Value("${app.dashboard.zone-capacity-c:0}") BigDecimal zoneC) {
        this.dashboardRepository = dashboardRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.zoneCapacity = Map.of("A", zoneA, "B", zoneB, "C", zoneC);
    }

    /** Returns top-level admin metrics for the current day and month. */
    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResponse getAdminOverview() {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate firstDay = today.withDayOfMonth(1);
        return dashboardRepository.getAdminOverview(today.atStartOfDay(), today.plusDays(1).atStartOfDay(),
                firstDay.atStartOfDay(), firstDay.plusMonths(1).atStartOfDay());
    }

    /** Returns inbound/outbound quantities grouped by day or ISO week. */
    @Override
    @Transactional(readOnly = true)
    public List<DashboardFlowPoint> getAdminFlow(LocalDate from, LocalDate to, String granularityValue) {
        if (from == null || to == null || from.isAfter(to) || from.plusDays(366).isBefore(to))
            throw badRequest("from/to bắt buộc, khoảng ngày tối đa 367 ngày và from không được sau to");
        String granularity = granularityValue == null ? "day" : granularityValue.toLowerCase(Locale.ROOT);
        if (!granularity.equals("day") && !granularity.equals("week")) throw badRequest("granularity chỉ nhận day hoặc week");
        List<DashboardFlowPoint> daily = dashboardRepository.getFlow(from, to);
        if (granularity.equals("day")) return daily;
        Map<LocalDate, BigDecimal[]> grouped = new java.util.TreeMap<>();
        for (DashboardFlowPoint point : daily) {
            LocalDate weekStart = point.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            BigDecimal[] sums = grouped.computeIfAbsent(weekStart, ignored -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            sums[0] = sums[0].add(point.inboundQuantity());
            sums[1] = sums[1].add(point.outboundQuantity());
        }
        return grouped.entrySet().stream().map(e -> new DashboardFlowPoint(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
    }

    /** Returns current top tenants; fee estimate remains null because no tariff is defined in schema/config. */
    @Override
    @Transactional(readOnly = true)
    public List<TenantUsageResponse> getTenantUsage() {
        return dashboardRepository.getTenantUsage();
    }

    /** Adds configured zone capacities and computes occupancy percentages for the admin chart. */
    @Override
    @Transactional(readOnly = true)
    public List<ZoneUsageResponse> getZoneUsage() {
        Map<String, BigDecimal> used = new HashMap<>();
        dashboardRepository.getZoneUsage().forEach(row -> used.put(row.zone(), row.usedM3()));
        java.util.Set<String> zones = new java.util.TreeSet<>(List.of("A", "B", "C"));
        zones.addAll(used.keySet());
        return zones.stream().map(zone -> {
            BigDecimal capacity = zoneCapacity.getOrDefault(zone, BigDecimal.ZERO);
            BigDecimal volume = used.getOrDefault(zone, BigDecimal.ZERO);
            BigDecimal percent = capacity.signum() <= 0 ? null
                    : volume.multiply(BigDecimal.valueOf(100)).divide(capacity, 2, java.math.RoundingMode.HALF_UP);
            return new ZoneUsageResponse(zone, volume, capacity, percent);
        }).toList();
    }

    /** Returns the current staff workload cards. */
    @Override
    @Transactional(readOnly = true)
    public StaffDashboardResponse getStaffOverview() {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        return dashboardRepository.getStaffOverview(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
    }

    /** Returns a paginated task queue for staff. */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<DashboardTaskResponse> getStaffTasks(Pageable pageable) {
        validatePageable(pageable);
        List<DashboardTaskResponse> content = dashboardRepository.getStaffTasks(pageable.getPageSize(), pageable.getOffset());
        long total = dashboardRepository.countStaffTasks();
        int pages = (int) Math.ceil((double) total / pageable.getPageSize());
        return new PageResponse<>(content, pageable.getPageNumber(), pageable.getPageSize(), total, pages);
    }

    /** Returns dashboard metrics for the authenticated customer's own profile. */
    @Override
    @Transactional(readOnly = true)
    public CustomerDashboardResponse getCustomerOverview(String email) {
        return dashboardRepository.getCustomerOverview(ownCustomer(email).getId());
    }

    /** Returns the latest combined inbound/outbound customer activity. */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerOperationResponse> getCustomerOperations(String email, Pageable pageable) {
        validatePageable(pageable);
        DashboardRepository.CustomerOperationsPage result = dashboardRepository.getCustomerOperations(
                ownCustomer(email).getId(), pageable.getPageSize(), pageable.getOffset());
        int pages = (int) Math.ceil((double) result.totalElements() / pageable.getPageSize());
        return new PageResponse<>(result.content(), pageable.getPageNumber(), pageable.getPageSize(), result.totalElements(), pages);
    }

    private Customer ownCustomer(String email) {
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(() ->
                new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không tồn tại"));
        return customerRepository.findByUserId(user.getId()).orElseThrow(() -> new ResourceNotFoundException("Hồ sơ khách hàng"));
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > 100)
            throw badRequest("page phải >= 0 và size phải từ 1 đến 100");
    }

    private BusinessException badRequest(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", message);
    }
}
