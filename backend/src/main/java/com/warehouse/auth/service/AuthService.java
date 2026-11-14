package com.warehouse.auth.service;

import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.dto.ChangePasswordRequest;
import com.warehouse.auth.dto.LoginRequest;
import com.warehouse.auth.dto.RegisterRequest;
import com.warehouse.auth.dto.SetupPasswordRequest;
import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.customer.model.Customer;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import com.warehouse.user.service.AccountInvitationService;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountInvitationService accountInvitationService;

    public AuthService(
            UserRepository userRepository,
            CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder,
            AccountInvitationService accountInvitationService) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.accountInvitationService = accountInvitationService;
    }

    @Transactional
    public AuthUserResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        validatePasswordLength(request.password());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng");
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setLoginMethod(LoginMethod.EMAIL);
        user.setRole(UserRole.CUSTOMER);
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now(BUSINESS_ZONE));
        return response(userRepository.save(user), null);
    }

    @Transactional(readOnly = true)
    public AuthUserResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(this::invalidCredentials);
        ensureActive(user);
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72
                || user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return response(user, findCustomer(user.getId()));
    }

    @Transactional(readOnly = true)
    public AuthUserResponse devLogin(String email) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản"));
        ensureActive(user);
        return response(user, findCustomer(user.getId()));
    }

    @Transactional
    public AuthUserResponse changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
        ensureActive(user);
        validatePasswordLength(request.newPassword());
        if (user.getPasswordHash() == null) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Tài khoản Google chưa có mật khẩu hiện tại");
        }
        if (request.currentPassword().getBytes(StandardCharsets.UTF_8).length > 72
                || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        return response(userRepository.save(user), findCustomer(user.getId()));
    }

    @Transactional
    public AuthUserResponse setupPassword(SetupPasswordRequest request) {
        validatePasswordLength(request.password());
        User user = userRepository.findByPasswordSetupTokenHash(accountInvitationService.hashToken(request.token()))
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.BAD_REQUEST, "INVALID_OR_EXPIRED_SETUP_TOKEN", "Link thiết lập mật khẩu không hợp lệ"));
        if (user.getPasswordSetupExpiresAt() == null
                || !user.getPasswordSetupExpiresAt().isAfter(LocalDateTime.now(BUSINESS_ZONE))) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "INVALID_OR_EXPIRED_SETUP_TOKEN", "Link thiết lập mật khẩu đã hết hạn");
        }
        ensureActive(user);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPasswordSetupTokenHash(null);
        user.setPasswordSetupExpiresAt(null);
        return response(userRepository.save(user), findCustomer(user.getId()));
    }

    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
        ensureActive(user);
        return response(user, findCustomer(user.getId()));
    }

    private AuthUserResponse response(User user, Customer customer) {
        return AuthUserResponse.from(user, customer);
    }

    private Customer findCustomer(Long userId) {
        return customerRepository.findByUserId(userId).orElse(null);
    }

    private void ensureActive(User user) {
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa");
        }
    }

    private BusinessException invalidCredentials() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Email không được để trống");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validatePasswordLength(String password) {
        int length = password.getBytes(StandardCharsets.UTF_8).length;
        if (password.length() < 8 || length > 72) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "VALIDATION_ERROR",
                    "Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte UTF-8");
        }
    }
}
