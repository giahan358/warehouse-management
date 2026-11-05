package com.warehouse.customer.repository;

import com.warehouse.customer.model.Customer;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    boolean existsByUserId(Long userId);

    boolean existsByCustomerCode(String customerCode);

    Optional<Customer> findByUserId(Long userId);

    @Query(
            value = """
                    SELECT c.id AS id,
                           c.user_id AS userId,
                           c.customer_code AS customerCode,
                           c.business_name AS businessName,
                           c.tax_code AS taxCode,
                           c.legal_representative AS legalRepresentative,
                           c.phone AS phone,
                           c.address AS address,
                           c.billing_email AS billingEmail,
                           c.service_package AS servicePackage,
                           c.capacity_m3 AS capacityM3,
                           c.bank_name AS bankName,
                           c.bank_account_number AS bankAccountNumber,
                           c.bank_account_holder AS bankAccountHolder,
                           c.created_at AS createdAt,
                           u.email AS email,
                           u.status AS accountStatus,
                           u.login_method AS loginMethod,
                           (SELECT COUNT(*) FROM products p WHERE p.customer_id = c.id) AS skuCount,
                           (SELECT COALESCE(SUM(i.quantity), 0)
                              FROM inventory i WHERE i.customer_id = c.id) AS totalUnits,
                           (SELECT COALESCE(SUM(i.quantity * p.volume_m3), 0)
                              FROM inventory i
                              JOIN products p ON p.id = i.product_id
                             WHERE i.customer_id = c.id) AS usedM3,
                           CASE
                             WHEN EXISTS (SELECT 1 FROM invoices inv
                                           WHERE inv.customer_id = c.id AND inv.status = 'OVERDUE') THEN 'OVERDUE'
                             WHEN EXISTS (SELECT 1 FROM invoices inv
                                           WHERE inv.customer_id = c.id AND inv.status = 'UNPAID') THEN 'UNPAID'
                             ELSE 'PAID'
                           END AS feeStatus,
                           (SELECT COALESCE(SUM(inv.total_amount), 0)
                              FROM invoices inv
                             WHERE inv.customer_id = c.id AND inv.status IN ('UNPAID', 'OVERDUE')) AS outstandingDebt
                    FROM customers c
                    JOIN users u ON u.id = c.user_id
                    WHERE (:keyword IS NULL OR :keyword = ''
                           OR LOWER(c.customer_code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(c.business_name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(c.tax_code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR c.phone LIKE CONCAT('%', :keyword, '%'))
                      AND (:servicePackage IS NULL OR c.service_package = :servicePackage)
                      AND (:accountStatus IS NULL OR u.status = :accountStatus)
                      AND (:feeStatus IS NULL
                           OR (:feeStatus = 'OVERDUE' AND EXISTS
                               (SELECT 1 FROM invoices inv WHERE inv.customer_id = c.id AND inv.status = 'OVERDUE'))
                           OR (:feeStatus = 'UNPAID'
                               AND NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.customer_id = c.id AND inv.status = 'OVERDUE')
                               AND EXISTS (SELECT 1 FROM invoices inv WHERE inv.customer_id = c.id AND inv.status = 'UNPAID'))
                           OR (:feeStatus = 'PAID'
                               AND NOT EXISTS (SELECT 1 FROM invoices inv
                                               WHERE inv.customer_id = c.id AND inv.status IN ('UNPAID', 'OVERDUE'))))
                    ORDER BY c.id
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM customers c
                    JOIN users u ON u.id = c.user_id
                    WHERE (:keyword IS NULL OR :keyword = ''
                           OR LOWER(c.customer_code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(c.business_name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(c.tax_code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR c.phone LIKE CONCAT('%', :keyword, '%'))
                      AND (:servicePackage IS NULL OR c.service_package = :servicePackage)
                      AND (:accountStatus IS NULL OR u.status = :accountStatus)
                      AND (:feeStatus IS NULL
                           OR (:feeStatus = 'OVERDUE' AND EXISTS
                               (SELECT 1 FROM invoices inv WHERE inv.customer_id = c.id AND inv.status = 'OVERDUE'))
                           OR (:feeStatus = 'UNPAID'
                               AND NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.customer_id = c.id AND inv.status = 'OVERDUE')
                               AND EXISTS (SELECT 1 FROM invoices inv WHERE inv.customer_id = c.id AND inv.status = 'UNPAID'))
                           OR (:feeStatus = 'PAID'
                               AND NOT EXISTS (SELECT 1 FROM invoices inv
                                               WHERE inv.customer_id = c.id AND inv.status IN ('UNPAID', 'OVERDUE'))))
                    """,
            nativeQuery = true)
    Page<CustomerProjection> searchCustomers(
            @Param("keyword") String keyword,
            @Param("servicePackage") String servicePackage,
            @Param("feeStatus") String feeStatus,
            @Param("accountStatus") String accountStatus,
            Pageable pageable);

    @Query(
            value = """
                    SELECT c.id AS id,
                           c.user_id AS userId,
                           c.customer_code AS customerCode,
                           c.business_name AS businessName,
                           c.tax_code AS taxCode,
                           c.legal_representative AS legalRepresentative,
                           c.phone AS phone,
                           c.address AS address,
                           c.billing_email AS billingEmail,
                           c.service_package AS servicePackage,
                           c.capacity_m3 AS capacityM3,
                           c.bank_name AS bankName,
                           c.bank_account_number AS bankAccountNumber,
                           c.bank_account_holder AS bankAccountHolder,
                           c.created_at AS createdAt,
                           u.email AS email,
                           u.status AS accountStatus,
                           u.login_method AS loginMethod,
                           (SELECT COUNT(*) FROM products p WHERE p.customer_id = c.id) AS skuCount,
                           (SELECT COALESCE(SUM(i.quantity), 0)
                              FROM inventory i WHERE i.customer_id = c.id) AS totalUnits,
                           (SELECT COALESCE(SUM(i.quantity * p.volume_m3), 0)
                              FROM inventory i JOIN products p ON p.id = i.product_id
                             WHERE i.customer_id = c.id) AS usedM3,
                           CASE
                             WHEN EXISTS (SELECT 1 FROM invoices inv
                                           WHERE inv.customer_id = c.id AND inv.status = 'OVERDUE') THEN 'OVERDUE'
                             WHEN EXISTS (SELECT 1 FROM invoices inv
                                           WHERE inv.customer_id = c.id AND inv.status = 'UNPAID') THEN 'UNPAID'
                             ELSE 'PAID'
                           END AS feeStatus,
                           (SELECT COALESCE(SUM(inv.total_amount), 0)
                              FROM invoices inv
                             WHERE inv.customer_id = c.id AND inv.status IN ('UNPAID', 'OVERDUE')) AS outstandingDebt,
                           (SELECT COALESCE(SUM(iri.expected_quantity * p.volume_m3), 0)
                              FROM inbound_receipt_items iri
                              JOIN inbound_receipts ir ON ir.id = iri.receipt_id
                              JOIN products p ON p.id = iri.product_id
                             WHERE ir.customer_id = c.id AND ir.status IN ('SCHEDULED', 'RECEIVING')) AS reservedInboundM3
                    FROM customers c
                    JOIN users u ON u.id = c.user_id
                    WHERE c.id = :customerId
                    """,
            nativeQuery = true)
    Optional<CustomerProjection> findCustomerDetailsById(@Param("customerId") Long customerId);

    @Query(
            value = """
                    SELECT c.id AS id,
                           c.user_id AS userId,
                           c.customer_code AS customerCode,
                           c.business_name AS businessName,
                           c.tax_code AS taxCode,
                           c.legal_representative AS legalRepresentative,
                           c.phone AS phone,
                           c.address AS address,
                           c.billing_email AS billingEmail,
                           c.service_package AS servicePackage,
                           c.capacity_m3 AS capacityM3,
                           c.bank_name AS bankName,
                           c.bank_account_number AS bankAccountNumber,
                           c.bank_account_holder AS bankAccountHolder,
                           c.created_at AS createdAt,
                           u.email AS email,
                           u.status AS accountStatus,
                           u.login_method AS loginMethod,
                           (SELECT COUNT(*) FROM products p WHERE p.customer_id = c.id) AS skuCount,
                           (SELECT COALESCE(SUM(i.quantity), 0)
                              FROM inventory i WHERE i.customer_id = c.id) AS totalUnits,
                           (SELECT COALESCE(SUM(i.quantity * p.volume_m3), 0)
                              FROM inventory i JOIN products p ON p.id = i.product_id
                             WHERE i.customer_id = c.id) AS usedM3,
                           CASE
                             WHEN EXISTS (SELECT 1 FROM invoices inv
                                           WHERE inv.customer_id = c.id AND inv.status = 'OVERDUE') THEN 'OVERDUE'
                             WHEN EXISTS (SELECT 1 FROM invoices inv
                                           WHERE inv.customer_id = c.id AND inv.status = 'UNPAID') THEN 'UNPAID'
                             ELSE 'PAID'
                           END AS feeStatus,
                           (SELECT COALESCE(SUM(inv.total_amount), 0)
                              FROM invoices inv
                             WHERE inv.customer_id = c.id AND inv.status IN ('UNPAID', 'OVERDUE')) AS outstandingDebt,
                           (SELECT COALESCE(SUM(iri.expected_quantity * p.volume_m3), 0)
                              FROM inbound_receipt_items iri
                              JOIN inbound_receipts ir ON ir.id = iri.receipt_id
                              JOIN products p ON p.id = iri.product_id
                             WHERE ir.customer_id = c.id AND ir.status IN ('SCHEDULED', 'RECEIVING')) AS reservedInboundM3
                    FROM customers c
                    JOIN users u ON u.id = c.user_id
                    WHERE u.email = :email
                    """,
            nativeQuery = true)
    Optional<CustomerProjection> findCustomerDetailsByUserEmail(@Param("email") String email);
}
