package com.warehouse.dashboard.repository;

import com.warehouse.dashboard.dto.AdminDashboardResponse;
import com.warehouse.dashboard.dto.CustomerDashboardResponse;
import com.warehouse.dashboard.dto.CustomerOperationResponse;
import com.warehouse.dashboard.dto.DashboardFlowPoint;
import com.warehouse.dashboard.dto.DashboardTaskResponse;
import com.warehouse.dashboard.dto.StaffDashboardResponse;
import com.warehouse.dashboard.dto.TenantUsageResponse;
import com.warehouse.dashboard.dto.ZoneUsageResponse;
import com.warehouse.common.exception.ResourceNotFoundException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardRepository {
    private final JdbcTemplate jdbc;

    public DashboardRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Reads the single-row admin dashboard aggregates from the operational tables. */
    public AdminDashboardResponse getAdminOverview(LocalDateTime todayStart, LocalDateTime tomorrowStart,
            LocalDateTime monthStart, LocalDateTime nextMonthStart) {
        String sql = """
                SELECT
                  (SELECT COALESCE(SUM(capacity_m3),0) FROM customers) AS capacityM3,
                  (SELECT COALESCE(SUM(i.quantity * p.volume_m3),0) FROM inventory i JOIN products p ON p.id=i.product_id) AS usedM3,
                  (SELECT COUNT(*) FROM customers c JOIN users u ON u.id=c.user_id WHERE u.status='ACTIVE') AS activeCustomers,
                  (SELECT COUNT(*) FROM customers c JOIN users u ON u.id=c.user_id WHERE u.status='LOCKED') AS lockedCustomers,
                  (SELECT COUNT(*) FROM inbound_receipts WHERE status='SCHEDULED' AND expected_at>=? AND expected_at<?) AS asnToday,
                  (SELECT COUNT(*) FROM inbound_receipts WHERE status='RECEIVING') AS receivingCount,
                  (SELECT COUNT(*) FROM outbound_orders WHERE status IN ('PENDING','PREPARING','PACKED','IN_DELIVERY')) AS activeOutboundOrders,
                  (SELECT COALESCE(SUM(cod_amount),0) FROM outbound_orders WHERE cod_status='PENDING_RECONCILE') AS codPendingAmount,
                  (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE created_at>=? AND created_at<? AND status<>'CANCELLED') AS serviceFeeThisMonth,
                  (SELECT COUNT(*) FROM invoices WHERE status IN ('UNPAID','OVERDUE')) AS unpaidInvoices,
                  (SELECT COUNT(*) FROM products) AS totalProducts
                """;
        return jdbc.queryForObject(sql, (rs, row) -> {
            BigDecimal capacity = decimal(rs, "capacityM3");
            BigDecimal used = decimal(rs, "usedM3");
            return new AdminDashboardResponse(capacity, used, percent(used, capacity),
                    rs.getLong("activeCustomers"), rs.getLong("lockedCustomers"), rs.getLong("asnToday"),
                    rs.getLong("receivingCount"), rs.getLong("activeOutboundOrders"),
                    decimal(rs, "codPendingAmount"), decimal(rs, "serviceFeeThisMonth"),
                    rs.getLong("unpaidInvoices"), rs.getLong("totalProducts"));
        }, todayStart, tomorrowStart, monthStart, nextMonthStart);
    }

    /** Aggregates confirmed inbound and non-cancelled outbound quantities by calendar day. */
    public List<DashboardFlowPoint> getFlow(LocalDate from, LocalDate to) {
        String sql = """
                SELECT event_date, SUM(inbound_qty) AS inboundQuantity, SUM(outbound_qty) AS outboundQuantity
                FROM (
                  SELECT DATE(COALESCE(r.received_at,r.expected_at)) AS event_date,
                         COALESCE(SUM(i.actual_quantity),0) AS inbound_qty, 0 AS outbound_qty
                    FROM inbound_receipts r JOIN inbound_receipt_items i ON i.receipt_id=r.id
                   WHERE r.status='CONFIRMED' AND DATE(COALESCE(r.received_at,r.expected_at)) BETWEEN ? AND ?
                   GROUP BY DATE(COALESCE(r.received_at,r.expected_at))
                  UNION ALL
                  SELECT DATE(o.created_at) AS event_date, 0 AS inbound_qty,
                         COALESCE(SUM(COALESCE(i.quantity_actual,i.quantity_requested)),0) AS outbound_qty
                    FROM outbound_orders o JOIN outbound_order_items i ON i.order_id=o.id
                   WHERE o.status<>'CANCELLED' AND DATE(o.created_at) BETWEEN ? AND ?
                   GROUP BY DATE(o.created_at)
                ) flows GROUP BY event_date ORDER BY event_date
                """;
        return jdbc.query(sql, (rs, row) -> new DashboardFlowPoint(rs.getDate("event_date").toLocalDate(),
                decimal(rs, "inboundQuantity"), decimal(rs, "outboundQuantity")), from, to, from, to);
    }

    /** Returns the ten customers occupying the most warehouse volume. */
    public List<TenantUsageResponse> getTenantUsage() {
        String sql = """
                SELECT c.id AS customerId,c.business_name AS businessName,c.capacity_m3 AS capacityM3,
                       COALESCE(SUM(i.quantity*p.volume_m3),0) AS usedM3
                  FROM customers c LEFT JOIN inventory i ON i.customer_id=c.id
                  LEFT JOIN products p ON p.id=i.product_id
                 GROUP BY c.id,c.business_name,c.capacity_m3
                 ORDER BY usedM3 DESC,c.id LIMIT 10
                """;
        return jdbc.query(sql, (rs, row) -> {
            BigDecimal capacity = decimal(rs, "capacityM3");
            BigDecimal used = decimal(rs, "usedM3");
            return new TenantUsageResponse(rs.getLong("customerId"), rs.getString("businessName"), used,
                    capacity, percent(used, capacity), null);
        });
    }

    /** Reads utilization by zone; capacity comes from application configuration. */
    public List<ZoneUsageResponse> getZoneUsage() {
        String sql = """
                SELECT SUBSTRING(i.location_code,2,1) AS zone,
                       COALESCE(SUM(i.quantity*p.volume_m3),0) AS usedM3
                  FROM inventory i JOIN products p ON p.id=i.product_id
                 WHERE i.location_code LIKE 'Z_%'
                 GROUP BY SUBSTRING(i.location_code,2,1) ORDER BY zone
                """;
        return jdbc.query(sql, (rs, row) -> new ZoneUsageResponse(rs.getString("zone"),
                decimal(rs, "usedM3"), BigDecimal.ZERO, BigDecimal.ZERO));
    }

    /** Builds staff workflow cards from today's inbound and outbound records. */
    public StaffDashboardResponse getStaffOverview(LocalDateTime todayStart, LocalDateTime tomorrowStart) {
        String sql = """
                SELECT
                  (SELECT COUNT(*) FROM inbound_receipts WHERE status='SCHEDULED' AND expected_at>=? AND expected_at<?) AS receivingScheduledToday,
                  (SELECT COUNT(*) FROM inbound_receipts WHERE status='RECEIVING') AS openCountingReceipts,
                  (SELECT COUNT(*) FROM outbound_orders WHERE status IN ('PENDING','PREPARING')) AS outboundToPrepare,
                  (SELECT COUNT(*) FROM outbound_orders WHERE status='PACKED') AS outboundPacked,
                  (SELECT COUNT(DISTINCT r.id) FROM inbound_receipts r JOIN inbound_receipt_items i ON i.receipt_id=r.id
                    WHERE r.status='CONFIRMED' AND (i.damaged_quantity>0 OR (i.actual_quantity IS NOT NULL AND i.actual_quantity<>i.expected_quantity))) AS discrepancyReports
                """;
        return jdbc.queryForObject(sql, (rs, row) -> new StaffDashboardResponse(
                rs.getLong("receivingScheduledToday"), rs.getLong("openCountingReceipts"),
                rs.getLong("outboundToPrepare"), rs.getLong("outboundPacked"),
                rs.getLong("discrepancyReports"), null), todayStart, tomorrowStart);
    }

    /** Aggregates the logged-in customer's inventory, inbound activity, and invoice status. */
    public CustomerDashboardResponse getCustomerOverview(Long customerId) {
        String sql = """
                SELECT c.capacity_m3 AS capacityM3,
                  COALESCE(SUM(i.quantity*p.volume_m3),0) AS usedM3,
                  COALESCE(SUM(i.quantity),0) AS totalOnHand,
                  COALESCE(SUM(i.quantity-i.allocated_quantity),0) AS totalAvailable,
                  COALESCE(SUM(i.allocated_quantity),0) AS totalAllocated,
                  COUNT(DISTINCT i.product_id) AS skuCount,
                  (SELECT COUNT(*) FROM inbound_receipts r WHERE r.customer_id=c.id AND r.status IN ('SCHEDULED','RECEIVING')) AS activeInboundCount,
                  (SELECT COUNT(*) FROM invoices inv WHERE inv.customer_id=c.id AND inv.status IN ('UNPAID','OVERDUE')) AS unpaidInvoiceCount
                FROM customers c LEFT JOIN inventory i ON i.customer_id=c.id
                LEFT JOIN products p ON p.id=i.product_id WHERE c.id=? GROUP BY c.id,c.capacity_m3
                """;
        return jdbc.query(sql, rs -> {
            if (!rs.next()) throw new ResourceNotFoundException("Hồ sơ khách hàng", customerId);
            BigDecimal used = decimal(rs, "usedM3");
            BigDecimal capacity = decimal(rs, "capacityM3");
            return new CustomerDashboardResponse(used, capacity, percent(used, capacity),
                    decimal(rs, "totalOnHand"), decimal(rs, "totalAvailable"), decimal(rs, "totalAllocated"),
                    rs.getLong("skuCount"), rs.getLong("activeInboundCount"), null, rs.getLong("unpaidInvoiceCount"));
        }, customerId);
    }

    /** Returns the prioritized warehouse task queue with page limit/offset applied in SQL. */
    public List<DashboardTaskResponse> getStaffTasks(int limit, long offset) {
        String sql = """
                SELECT * FROM (
                  SELECT 'RECEIVE_TRUCK' taskType,'INBOUND' refType,r.id refId,r.receipt_code refCode,
                         c.business_name customerName,r.dock_code locationOrDock,r.expected_at dueAt,r.status
                    FROM inbound_receipts r JOIN customers c ON c.id=r.customer_id WHERE r.status='SCHEDULED'
                  UNION ALL
                  SELECT 'COUNT','INBOUND',r.id,r.receipt_code,c.business_name,r.dock_code,r.expected_at,r.status
                    FROM inbound_receipts r JOIN customers c ON c.id=r.customer_id WHERE r.status='RECEIVING'
                  UNION ALL
                  SELECT 'PICK_PACK','OUTBOUND',o.id,o.order_code,c.business_name,o.tracking_code,o.created_at,o.status
                    FROM outbound_orders o JOIN customers c ON c.id=o.customer_id WHERE o.status IN ('PENDING','PREPARING')
                  UNION ALL
                  SELECT 'HANDOVER_3PL','OUTBOUND',o.id,o.order_code,c.business_name,o.tracking_code,o.created_at,o.status
                    FROM outbound_orders o JOIN customers c ON c.id=o.customer_id WHERE o.status='PACKED'
                ) tasks ORDER BY dueAt,refId LIMIT ? OFFSET ?
                """;
        return jdbc.query(sql, (rs, row) -> new DashboardTaskResponse(rs.getString("taskType"), rs.getString("refType"),
                rs.getLong("refId"), rs.getString("refCode"), rs.getString("customerName"),
                rs.getString("locationOrDock"), localDateTime(rs, "dueAt"), rs.getString("status")), limit, offset);
    }

    /** Counts the complete staff task queue for page metadata. */
    public long countStaffTasks() {
        Long total = jdbc.queryForObject("""
                SELECT
                  (SELECT COUNT(*) FROM inbound_receipts WHERE status IN ('SCHEDULED','RECEIVING'))
                  + (SELECT COUNT(*) FROM outbound_orders WHERE status IN ('PENDING','PREPARING','PACKED'))
                """, Long.class);
        return total == null ? 0 : total;
    }

    /** Returns the latest inbound/outbound activity and the total result count for a customer. */
    public CustomerOperationsPage getCustomerOperations(Long customerId, int limit, long offset) {
        String union = """
                SELECT 'INBOUND' AS type,r.receipt_code AS code,r.created_at AS createdAt,
                       COUNT(i.id) AS itemCount,COALESCE(SUM(i.expected_quantity),0) AS totalQuantity,
                       r.status AS status,(r.status='SCHEDULED') AS cancellable
                  FROM inbound_receipts r LEFT JOIN inbound_receipt_items i ON i.receipt_id=r.id
                 WHERE r.customer_id=? GROUP BY r.id,r.receipt_code,r.created_at,r.status
                UNION ALL
                SELECT 'OUTBOUND',o.order_code,o.created_at,COUNT(i.id),COALESCE(SUM(i.quantity_requested),0),
                       o.status,(o.status='PENDING')
                  FROM outbound_orders o LEFT JOIN outbound_order_items i ON i.order_id=o.id
                 WHERE o.customer_id=? GROUP BY o.id,o.order_code,o.created_at,o.status
                """;
        List<CustomerOperationResponse> content = jdbc.query("SELECT * FROM (" + union + ") ops "
                        + "ORDER BY createdAt DESC LIMIT ? OFFSET ?",
                (rs, row) -> new CustomerOperationResponse(rs.getString("type"), rs.getString("code"),
                        localDateTime(rs, "createdAt"), rs.getLong("itemCount"), decimal(rs, "totalQuantity"),
                        rs.getString("status"), rs.getBoolean("cancellable")), customerId, customerId, limit, offset);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM (SELECT id FROM inbound_receipts WHERE customer_id=? "
                + "UNION ALL SELECT id FROM outbound_orders WHERE customer_id=?) records", Long.class, customerId, customerId);
        return new CustomerOperationsPage(content, total == null ? 0 : total);
    }

    private BigDecimal decimal(ResultSet rs, String column) throws SQLException {
        BigDecimal value = rs.getBigDecimal(column);
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal percent(BigDecimal amount, BigDecimal capacity) {
        if (capacity == null || capacity.signum() <= 0) return BigDecimal.ZERO.setScale(2);
        return amount.multiply(BigDecimal.valueOf(100)).divide(capacity, 2, java.math.RoundingMode.HALF_UP);
    }

    private LocalDateTime localDateTime(ResultSet rs, String column) throws SQLException {
        java.sql.Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime();
    }

    public record CustomerOperationsPage(List<CustomerOperationResponse> content, long totalElements) {
    }
}
