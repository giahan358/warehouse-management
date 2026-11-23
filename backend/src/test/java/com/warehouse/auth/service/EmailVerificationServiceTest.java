package com.warehouse.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.warehouse.common.exception.BusinessException;
import com.warehouse.user.model.User;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class EmailVerificationServiceTest {
    @Test
    void createsUrlSafeTokenAndStoresOnlyItsHash() {
        EmailVerificationService service = new EmailVerificationService(
                mock(JavaMailSender.class), "sender@example.com", "https://api.example.com/");

        String token = service.createToken();
        String hash = service.hashToken(token);

        assertTrue(token.matches("^[A-Za-z0-9_-]{43}$"));
        assertEquals(64, hash.length());
        assertNotEquals(token, hash);
    }

    @Test
    void sendsConfirmationLinkToAccountEmail() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        EmailVerificationService service = new EmailVerificationService(
                mailSender, "sender@example.com", "https://api.example.com/");
        User user = new User();
        user.setEmail("owner@example.com");
        user.setFullName("Warehouse Owner");

        service.sendVerificationEmail(user, "A".repeat(43));

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertEquals("owner@example.com", messageCaptor.getValue().getTo()[0]);
        assertTrue(messageCaptor.getValue().getText().contains(
                "https://api.example.com/api/v1/auth/verify-email?token=" + "A".repeat(43)));
    }

    @Test
    void reportsUnavailableWhenSmtpSenderIsNotConfigured() {
        EmailVerificationService service = new EmailVerificationService(
                mock(JavaMailSender.class), " ", "http://localhost:8080");
        User user = new User();
        user.setEmail("owner@example.com");
        user.setFullName("Warehouse Owner");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.sendVerificationEmail(user, "A".repeat(43)));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatus());
        assertEquals("EMAIL_VERIFICATION_UNAVAILABLE", exception.getCode());
    }
}
