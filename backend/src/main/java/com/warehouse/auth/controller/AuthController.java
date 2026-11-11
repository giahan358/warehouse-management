package com.warehouse.auth.controller;

import com.warehouse.auth.dto.AuthTokenResponse;
import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.dto.GoogleLoginRequest;
import com.warehouse.auth.dto.LoginRequest;
import com.warehouse.auth.dto.RegisterRequest;
import com.warehouse.auth.dto.SetupPasswordRequest;
import com.warehouse.auth.service.AuthService;
import com.warehouse.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a customer account")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthUserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(authService.register(request), "Đăng ký tài khoản thành công");
    }

    @PostMapping("/login")
    @Operation(summary = "Log in with email and password")
    public ApiResponse<AuthTokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request), "Đăng nhập thành công");
    }

    @PostMapping("/google")
    @Operation(summary = "Log in with a Google ID token")
    public ApiResponse<AuthTokenResponse> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        return ApiResponse.success(authService.loginWithGoogle(request.idToken()), "Đăng nhập Google thành công");
    }

    @PostMapping("/setup-password")
    @Operation(summary = "Set a password using a one-time email invitation token")
    public ApiResponse<AuthUserResponse> setupPassword(@Valid @RequestBody SetupPasswordRequest request) {
        return ApiResponse.success(
                authService.setupPassword(request),
                "Thiết lập mật khẩu thành công. Bạn có thể đăng nhập bằng email.");
    }

    @GetMapping("/me")
    @Operation(summary = "Get the current authenticated user", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<AuthUserResponse> me(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return ApiResponse.success(authService.getCurrentUser(jwt.getSubject()), "Lấy thông tin tài khoản thành công");
    }

    @PostMapping("/logout")
    @Operation(summary = "Log out from the current client", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> logout() {
        return ApiResponse.success(null, "Đăng xuất thành công. Hãy xóa access token ở client.");
    }
}
