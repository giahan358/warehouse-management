package com.warehouse.user.service;

import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.response.PageResponse;
import com.warehouse.common.util.EnumParser;
import com.warehouse.user.dto.CreateUserRequest;
import com.warehouse.user.dto.UpdateUserRequest;
import com.warehouse.user.dto.UserPermissionMatrixResponse;
import com.warehouse.user.dto.UserResponse;
import com.warehouse.user.dto.UserSummaryResponse;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import com.warehouse.user.repository.UserSummaryProjection;
import com.warehouse.user.repository.UserWithOrganizationProjection;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_PAGE_SIZE = 100;
    private final UserRepository userRepository;
    private final AccountInvitationService accountInvitationService;

    public UserServiceImpl(UserRepository userRepository, AccountInvitationService accountInvitationService) {
        this.userRepository = userRepository;
        this.accountInvitationService = accountInvitationService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getUsers(
            String keyword,
            String role,
            String status,
            String loginMethod,
            Pageable pageable) {
        validatePageable(pageable);
        String normalizedRole = EnumParser.parseFilter(role, UserRole.class, "role");
        String normalizedStatus = EnumParser.parseFilter(status, UserStatus.class, "status");
        String normalizedLoginMethod = EnumParser.parseFilter(loginMethod, LoginMethod.class, "loginMethod");
        Pageable stablePage = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize());
        Page<UserWithOrganizationProjection> result = userRepository.searchUsers(
                normalizeKeyword(keyword),
                normalizedRole,
                normalizedStatus,
                normalizedLoginMethod,
                stablePage);
        return PageResponse.from(result.map(UserResponse::from));
    }

    @Override
    @Transactional(readOnly = true)
    public UserSummaryResponse getSummary() {
        UserSummaryProjection summary = userRepository.getSummary();
        return new UserSummaryResponse(
                summary.getTotalUsers(),
                summary.getCustomerCount(),
                summary.getStaffCount(),
                summary.getLockedCount());
    }

    @Override
    @Transactional(readOnly = true)
    public UserPermissionMatrixResponse getPermissionMatrix() {
        return new UserPermissionMatrixResponse(List.of(
                permission("accountManagement", true, false, false),
                permission("customerManagement", true, false, false),
                permission("productAndInventory", true, true, true),
                permission("inboundOperations", true, true, true),
                permission("outboundOperations", true, true, true),
                permission("invoicesAndPayments", true, false, true)));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        UserWithOrganizationProjection user = userRepository.findUserWithOrganizationById(id)
                .orElseThrow(() -> userNotFound(id));
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (request.role() != UserRole.WAREHOUSE_STAFF) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Admin chỉ được tạo tài khoản WAREHOUSE_STAFF");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng");
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setLoginMethod(LoginMethod.EMAIL);
        user.setRole(UserRole.WAREHOUSE_STAFF);
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(java.time.LocalDateTime.now(BUSINESS_ZONE));
        String rawSetupToken = accountInvitationService.createSetupToken();
        user.setPasswordSetupTokenHash(accountInvitationService.hashToken(rawSetupToken));
        user.setPasswordSetupExpiresAt(java.time.LocalDateTime.now(BUSINESS_ZONE).plusHours(24));
        userRepository.save(user);
        Long createdUserId = user.getId();
        accountInvitationService.sendSetupEmail(user, rawSetupToken);
        UserWithOrganizationProjection createdUser =
                userRepository.findUserWithOrganizationById(createdUserId).orElse(null);
        if (createdUser == null) {
            throw userNotFound(createdUserId);
        }
        return UserResponse.from(createdUser);
    }

    @Override
    @Transactional
    public UserResponse updateStatus(Long id, UpdateUserRequest request, String currentUserEmail) {
        User user = userRepository.findById(id).orElseThrow(() -> userNotFound(id));
        UserStatus newStatus = request.status();
        if (newStatus == UserStatus.LOCKED) {
            if (user.getEmail().equalsIgnoreCase(currentUserEmail)) {
                throw new BusinessException(
                        HttpStatus.BAD_REQUEST, "CANNOT_LOCK_SELF", "Admin không thể tự khóa tài khoản của mình");
            }
            if (request.reason() == null || request.reason().isBlank()) {
                throw new BusinessException(
                        HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Bắt buộc nhập lý do khi khóa tài khoản");
            }
            user.setLockReason(request.reason().trim());
        } else {
            user.setLockReason(null);
        }
        user.setStatus(newStatus);
        User saved = userRepository.save(user);
        return UserResponse.from(userRepository.findUserWithOrganizationById(saved.getId())
                .orElseThrow(() -> userNotFound(saved.getId())));
    }

    private UserPermissionMatrixResponse.PermissionGroup permission(
            String name,
            boolean admin,
            boolean staff,
            boolean customer) {
        return new UserPermissionMatrixResponse.PermissionGroup(
                name,
                Map.of(
                        UserRole.ADMIN.name(), admin,
                        UserRole.WAREHOUSE_STAFF.name(), staff,
                        UserRole.CUSTOMER.name(), customer));
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null || keyword.isBlank() ? null : keyword.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validatePageable(Pageable pageable) {
        if (pageable.getPageNumber() < 0 || pageable.getPageSize() < 1 || pageable.getPageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "page phải >= 0 và size phải từ 1 đến 100");
        }
    }

    private BusinessException userNotFound(Long id) {
        return new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản " + id);
    }
}
