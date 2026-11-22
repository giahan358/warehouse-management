package com.warehouse.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.warehouse.auth.dto.LoginRequest;
import com.warehouse.auth.dto.RegisterRequest;
import com.warehouse.auth.dto.VerifyEmailRequest;
import com.warehouse.common.enums.UserStatus;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.customer.repository.CustomerRepository;
import com.warehouse.user.model.User;
import com.warehouse.user.repository.UserRepository;
import com.warehouse.user.service.AccountInvitationService;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceEmailVerificationTest {
    private static final String EMAIL = "new.user@example.com";
    private static final String TOKEN = "A".repeat(43);

    @Test
    void registrationStoresOnlyTokenHashAndSendsVerificationLink() {
        UserRepository userRepository = mock(UserRepository.class);
        EmailVerificationService verificationService = mock(EmailVerificationService.class);
        when(verificationService.createToken()).thenReturn(TOKEN);
        when(verificationService.hashToken(TOKEN)).thenReturn("hashed-token");
        when(userRepository.saveAndFlush(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        AuthService authService = authService(userRepository, verificationService, mock(PasswordEncoder.class));

        var response = authService.register(new RegisterRequest("New User", EMAIL, "password123", null));

        assertFalse(response.emailVerified());
        var userCaptor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        assertFalse(userCaptor.getValue().isEmailVerified());
        assertEquals("hashed-token", userCaptor.getValue().getEmailVerificationTokenHash());
        verify(verificationService).sendVerificationEmail(userCaptor.getValue(), TOKEN);
    }

    @Test
    void loginRejectsCorrectPasswordUntilEmailIsVerified() {
        UserRepository userRepository = mock(UserRepository.class);
        User user = new User();
        user.setEmail(EMAIL);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(false);
        user.setPasswordHash("encoded-password");
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);
        AuthService authService = authService(
                userRepository, mock(EmailVerificationService.class), passwordEncoder);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.login(new LoginRequest(EMAIL, "password123")));

        assertEquals("EMAIL_NOT_VERIFIED", exception.getCode());
    }

    @Test
    void verificationConsumesTokenAndMarksAccountVerified() {
        UserRepository userRepository = mock(UserRepository.class);
        EmailVerificationService verificationService = mock(EmailVerificationService.class);
        User user = new User();
        user.setEmailVerified(false);
        user.setEmailVerificationExpiresAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusHours(1));
        when(verificationService.hashToken(TOKEN)).thenReturn("hashed-token");
        when(userRepository.findLockedByEmailVerificationTokenHash("hashed-token"))
                .thenReturn(Optional.of(user));
        AuthService authService = authService(
                userRepository, verificationService, mock(PasswordEncoder.class));

        authService.verifyEmail(new VerifyEmailRequest(TOKEN));

        assertTrue(user.isEmailVerified());
        assertNull(user.getEmailVerificationTokenHash());
        assertNull(user.getEmailVerificationExpiresAt());
        verify(userRepository).save(user);
    }

    @Test
    void expiredVerificationTokenIsRejectedWithoutChangingAccount() {
        UserRepository userRepository = mock(UserRepository.class);
        EmailVerificationService verificationService = mock(EmailVerificationService.class);
        User user = new User();
        user.setEmailVerified(false);
        user.setEmailVerificationExpiresAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusSeconds(1));
        when(verificationService.hashToken(TOKEN)).thenReturn("hashed-token");
        when(userRepository.findLockedByEmailVerificationTokenHash("hashed-token"))
                .thenReturn(Optional.of(user));
        AuthService authService = authService(
                userRepository, verificationService, mock(PasswordEncoder.class));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.verifyEmail(new VerifyEmailRequest(TOKEN)));

        assertEquals("INVALID_OR_EXPIRED_VERIFICATION_TOKEN", exception.getCode());
        assertFalse(user.isEmailVerified());
    }

    @Test
    void resendUsesAccountLockAndHonorsCooldown() {
        UserRepository userRepository = mock(UserRepository.class);
        EmailVerificationService verificationService = mock(EmailVerificationService.class);
        User user = new User();
        user.setEmail(EMAIL);
        user.setEmailVerified(false);
        user.setEmailVerificationSentAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        when(userRepository.lockByEmailForVerification(EMAIL)).thenReturn(Optional.of(user));
        AuthService authService = authService(
                userRepository, verificationService, mock(PasswordEncoder.class));

        authService.resendEmailVerification(new com.warehouse.auth.dto.ResendEmailVerificationRequest(EMAIL));

        verify(userRepository).lockByEmailForVerification(EMAIL);
        org.mockito.Mockito.verifyNoInteractions(verificationService);
    }

    private AuthService authService(
            UserRepository userRepository,
            EmailVerificationService verificationService,
            PasswordEncoder passwordEncoder) {
        return new AuthService(
                userRepository,
                mock(CustomerRepository.class),
                passwordEncoder,
                mock(AccountInvitationService.class),
                verificationService);
    }
}
