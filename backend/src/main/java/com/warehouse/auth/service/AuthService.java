package com.warehouse.auth.service;

import com.warehouse.auth.dto.AuthTokenResponse;
import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.dto.LoginRequest;
import com.warehouse.auth.dto.RegisterRequest;
import com.warehouse.auth.dto.SetupPasswordRequest;
import com.warehouse.common.enums.LoginMethod;
import com.warehouse.common.enums.UserRole;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.security.GoogleIdTokenVerifier;
import com.warehouse.security.JwtService;
import com.warehouse.user.service.AccountInvitationService;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final AccountInvitationService accountInvitationService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            AccountInvitationService accountInvitationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
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
        return AuthUserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthTokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(this::invalidCredentials);
        ensureActive(user);
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw invalidCredentials();
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return issueToken(user);
    }

    @Transactional
    public AuthTokenResponse loginWithGoogle(String idToken) {
        Map<String, Object> googleClaims = googleIdTokenVerifier.verify(idToken);
        String googleId = (String) googleClaims.get("sub");
        String googleEmail = (String) googleClaims.get("email");
        if (googleId == null || googleEmail == null || googleEmail.isBlank()) {
            throw new BusinessException(
                    HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN", "Google ID token thiếu thông tin tài khoản");
        }
        String email = normalizeEmail(googleEmail);
        String fullName = (String) googleClaims.getOrDefault("name", email);
        if (fullName == null || fullName.isBlank()) {
            fullName = email;
        }
        String resolvedFullName = fullName;

        User user = userRepository.findByGoogleId(googleId).orElseGet(() -> {
            User sameEmailUser = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (sameEmailUser != null) {
                throw new BusinessException(
                        HttpStatus.CONFLICT,
                        "ACCOUNT_LINK_REQUIRED",
                        "Email đã được đăng ký bằng phương thức khác");
            }

            User newUser = new User();
            newUser.setFullName(resolvedFullName);
            newUser.setEmail(email);
            newUser.setGoogleId(googleId);
            newUser.setLoginMethod(LoginMethod.GOOGLE);
            newUser.setRole(UserRole.CUSTOMER);
            newUser.setStatus(UserStatus.ACTIVE);
            newUser.setCreatedAt(LocalDateTime.now(BUSINESS_ZONE));
            return userRepository.save(newUser);
        });

        ensureActive(user);
        return issueToken(user);
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
        return AuthUserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Tài khoản không còn tồn tại"));
        ensureActive(user);
        return AuthUserResponse.from(user);
    }

    private AuthTokenResponse issueToken(User user) {
        String accessToken = jwtService.createToken(user);
        return new AuthTokenResponse(
                accessToken,
                "Bearer",
                jwtService.getExpirationSeconds(),
                AuthUserResponse.from(user));
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
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Mật khẩu không được vượt quá 72 byte UTF-8");
        }
    }
}
