package com.warehouse.user.service;

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
public class AccountInvitationService {
    private static final Logger LOGGER = LoggerFactory.getLogger(AccountInvitationService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;
    private final String sender;
    private final String frontendBaseUrl;

    public AccountInvitationService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String sender,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.mailSender = mailSender;
        this.sender = sender;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
    }

    public String createSetupToken() {
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    public String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    public void sendSetupEmail(User user, String rawToken) {
        if (sender.isBlank()) {
            throw new BusinessException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "EMAIL_NOT_CONFIGURED",
                    "Dịch vụ email chưa được cấu hình");
        }
        String setupUrl = frontendBaseUrl + "/set-password?token=" + rawToken;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender);
        message.setTo(user.getEmail());
        message.setSubject("Thiết lập tài khoản Warehouse Management");
        message.setText("""
                Xin chào %s,

                Tài khoản nhân viên Warehouse Management đã được tạo cho bạn.
                Hãy mở liên kết sau để thiết lập mật khẩu trong vòng 24 giờ:
                %s

                Nếu bạn không mong đợi email này, vui lòng liên hệ quản trị viên.
                """.formatted(user.getFullName(), setupUrl));
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            LOGGER.error("Unable to send account setup email", exception);
            throw new BusinessException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "ACCOUNT_INVITATION_EMAIL_FAILED",
                    "Không thể gửi email thiết lập tài khoản. Vui lòng thử lại sau.");
        }
    }
}
