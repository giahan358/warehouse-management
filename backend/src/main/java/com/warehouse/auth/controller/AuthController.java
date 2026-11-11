package com.warehouse.auth.controller;

import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.dto.AuthTokenResponse;
import com.warehouse.auth.dto.ChangePasswordRequest;
import com.warehouse.auth.dto.LoginRequest;
import com.warehouse.auth.dto.RegisterRequest;
import com.warehouse.auth.dto.SetupPasswordRequest;
import com.warehouse.auth.service.AuthService;
import com.warehouse.common.response.ApiResponse;
import com.warehouse.security.JwtService;
import com.warehouse.security.SessionPrincipal;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
        return ApiResponse.success(authService.register(request), "Đăng ký tài khoản thành công");
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

    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    public ApiResponse<Void> logout() {
        return ApiResponse.success(null, "Đăng xuất thành công");
    }
}
