package com.warehouse.auth.service;

import com.warehouse.common.exception.BusinessException;
import com.warehouse.user.model.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailVerificationService {
    private static final Logger LOGGER = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;
    private final String sender;
    private final String backendBaseUrl;

    public EmailVerificationService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String sender,
            @Value("${app.backend.base-url:http://localhost:8080}") String backendBaseUrl) {
        this.mailSender = mailSender;
        this.sender = sender;
        this.backendBaseUrl = backendBaseUrl.replaceAll("/+$", "");
    }

    public String createToken() {
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    public String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    public void sendVerificationEmail(User user, String rawToken) {
        if (sender.isBlank()) {
            throw emailServiceUnavailable("Dịch vụ email chưa được cấu hình");
        }

        String verificationUrl = backendBaseUrl
                + "/api/v1/auth/verify-email?token=" + rawToken;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender);
        message.setTo(user.getEmail());
        message.setSubject("Xác minh địa chỉ email - Warehouse Management");
        message.setText("""
                Xin chào %s,

                Hãy xác minh địa chỉ email của bạn bằng liên kết sau:
                %s

                Liên kết có hiệu lực trong 24 giờ. Nếu bạn không đăng ký tài khoản,
                hãy bỏ qua email này.
                """.formatted(user.getFullName(), verificationUrl));
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            LOGGER.error("Unable to send email verification message", exception);
            throw emailServiceUnavailable("Không thể gửi email xác minh. Vui lòng thử lại sau.");
        }
    }

    private BusinessException emailServiceUnavailable(String message) {
        return new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_VERIFICATION_UNAVAILABLE", message);
    }
}
