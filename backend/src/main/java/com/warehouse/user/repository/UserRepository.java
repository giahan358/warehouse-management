package com.warehouse.user.repository;

import com.warehouse.user.model.User;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByGoogleId(String googleId);

    Optional<User> findByPasswordSetupTokenHash(String passwordSetupTokenHash);

    boolean existsByEmailIgnoreCase(String email);

    @Query(
            value = """
                    SELECT u.id AS id,
                           u.full_name AS fullName,
                           u.email AS email,
                           u.phone AS phone,
                           u.role AS role,
                           u.status AS status,
                           u.lock_reason AS lockReason,
                           u.login_method AS loginMethod,
                           COALESCE(c.business_name, 'Warehouse') AS organization
                    FROM users u
                    LEFT JOIN customers c ON c.user_id = u.id
                    WHERE (:keyword IS NULL OR :keyword = ''
                           OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR u.phone LIKE CONCAT('%', :keyword, '%')
                           OR LOWER(c.business_name) LIKE LOWER(CONCAT('%', :keyword, '%')))
                      AND (:role IS NULL OR u.role = :role)
                      AND (:status IS NULL OR u.status = :status)
                      AND (:loginMethod IS NULL OR u.login_method = :loginMethod)
                    ORDER BY u.id
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM users u
                    LEFT JOIN customers c ON c.user_id = u.id
                    WHERE (:keyword IS NULL OR :keyword = ''
                           OR LOWER(u.full_name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                           OR u.phone LIKE CONCAT('%', :keyword, '%')
                           OR LOWER(c.business_name) LIKE LOWER(CONCAT('%', :keyword, '%')))
                      AND (:role IS NULL OR u.role = :role)
                      AND (:status IS NULL OR u.status = :status)
                      AND (:loginMethod IS NULL OR u.login_method = :loginMethod)
                    """,
            nativeQuery = true)
    Page<UserWithOrganizationProjection> searchUsers(
            @Param("keyword") String keyword,
            @Param("role") String role,
            @Param("status") String status,
            @Param("loginMethod") String loginMethod,
            Pageable pageable);

    @Query(
            value = """
                    SELECT COUNT(*) AS totalUsers,
                           COALESCE(SUM(CASE WHEN role = 'CUSTOMER' THEN 1 ELSE 0 END), 0) AS customerCount,
                           COALESCE(SUM(CASE WHEN role = 'WAREHOUSE_STAFF' THEN 1 ELSE 0 END), 0) AS staffCount,
                           COALESCE(SUM(CASE WHEN status = 'LOCKED' THEN 1 ELSE 0 END), 0) AS lockedCount
                    FROM users
                    """,
            nativeQuery = true)
    UserSummaryProjection getSummary();

    @Query(
            value = """
                    SELECT u.id AS id,
                           u.full_name AS fullName,
                           u.email AS email,
                           u.phone AS phone,
                           u.role AS role,
                           u.status AS status,
                           u.lock_reason AS lockReason,
                           u.login_method AS loginMethod,
                           COALESCE(c.business_name, 'Warehouse') AS organization
                    FROM users u
                    LEFT JOIN customers c ON c.user_id = u.id
                    WHERE u.id = :id
                    """,
            nativeQuery = true)
    Optional<UserWithOrganizationProjection> findUserWithOrganizationById(@Param("id") Long id);
}
