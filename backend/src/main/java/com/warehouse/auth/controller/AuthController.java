package com.warehouse.auth.controller;

import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.dto.AuthTokenResponse;
import com.warehouse.auth.dto.ChangePasswordRequest;
import com.warehouse.auth.dto.LoginRequest;
import com.warehouse.auth.dto.ResendEmailVerificationRequest;
import com.warehouse.auth.dto.RegisterRequest;
import com.warehouse.auth.dto.SetupPasswordRequest;
import com.warehouse.auth.dto.VerifyEmailRequest;
import com.warehouse.auth.service.AuthService;
import com.warehouse.common.exception.BusinessException;
import com.warehouse.common.response.ApiResponse;
import com.warehouse.security.JwtService;
import com.warehouse.security.SessionPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthUserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(
                authService.register(request),
                "Đăng ký thành công. Hãy xác minh địa chỉ email trước khi đăng nhập.");
    }

    @GetMapping(value = "/verify-email", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> emailVerificationPage(@RequestParam String token) {
        if (!token.matches("^[A-Za-z0-9_-]{43}$")) {
            return htmlResponse(HttpStatus.BAD_REQUEST, verificationResultPage(false));
        }
        String page = """
                <!doctype html>
                <html lang="vi">
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Xác minh email</title>
                <h1>Xác minh email</h1>
                <p>Nhấn nút bên dưới để xác nhận bạn sở hữu địa chỉ email này.</p>
                <form method="post" action="/api/v1/auth/verify-email">
                  <input type="hidden" name="token" value="%s">
                  <button type="submit">Xác minh email</button>
                </form>
                </html>
                """.formatted(token);
        return htmlResponse(page);
    }

    @PostMapping(value = "/verify-email", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request);
        return ApiResponse.success(null, "Địa chỉ email đã được xác minh. Bạn có thể đăng nhập.");
    }

    @PostMapping(value = "/verify-email", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> verifyEmailFromLink(@RequestParam String token) {
        if (!token.matches("^[A-Za-z0-9_-]{43}$")) {
            return htmlResponse(HttpStatus.BAD_REQUEST, verificationResultPage(false));
        }
        try {
            authService.verifyEmail(new VerifyEmailRequest(token));
        } catch (BusinessException exception) {
            if (!"INVALID_OR_EXPIRED_VERIFICATION_TOKEN".equals(exception.getCode())) {
                throw exception;
            }
            return htmlResponse(HttpStatus.BAD_REQUEST, verificationResultPage(false));
        }
        return htmlResponse(verificationResultPage(true));
    }

    @PostMapping("/resend-verification")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<Void> resendEmailVerification(
            @Valid @RequestBody ResendEmailVerificationRequest request) {
        authService.resendEmailVerification(request);
        return ApiResponse.success(
                null,
                "Nếu địa chỉ thuộc về tài khoản chưa xác minh, email hướng dẫn sẽ được gửi.");
    }

    @PostMapping("/login")
    public ApiResponse<AuthTokenResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthUserResponse user = authService.login(request);
        return ApiResponse.success(jwtService.createToken(user), "Đăng nhập thành công");
    }

    @PostMapping("/setup-password")
    public ApiResponse<AuthUserResponse> setupPassword(@Valid @RequestBody SetupPasswordRequest request) {
        return ApiResponse.success(
                authService.setupPassword(request),
                "Thiết lập mật khẩu thành công. Bạn có thể đăng nhập bằng email.");
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<AuthUserResponse> me(@AuthenticationPrincipal SessionPrincipal user) {
        return ApiResponse.success(authService.getCurrentUser(user.getSubject()), "Lấy thông tin tài khoản thành công");
    }

    @PatchMapping("/change-password")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<Void> changePassword(
            @AuthenticationPrincipal SessionPrincipal user,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(user.getSubject(), request);
        return ApiResponse.success(null, "Đổi mật khẩu thành công");
    }

    private ResponseEntity<String> htmlResponse(String body) {
        return htmlResponse(HttpStatus.OK, body);
    }

    private ResponseEntity<String> htmlResponse(HttpStatus status, String body) {
        return ResponseEntity.status(status)
                .contentType(new MediaType("text", "html", StandardCharsets.UTF_8))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("Referrer-Policy", "no-referrer")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; form-action 'self'; frame-ancestors 'none'")
                .body(body);
    }

    private String verificationResultPage(boolean verified) {
        String title = verified ? "Email đã được xác minh" : "Liên kết không hợp lệ";
        String message = verified
                ? "Bạn có thể đóng trang này và đăng nhập."
                : "Liên kết xác minh không hợp lệ hoặc đã hết hạn. Hãy yêu cầu gửi liên kết mới.";
        return """
                <!doctype html>
                <html lang="vi">
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s</title>
                <h1>%s</h1>
                <p>%s</p>
                </html>
                """.formatted(title, title, message);
    }
}
