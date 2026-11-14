package com.warehouse.auth.controller;

import com.warehouse.auth.dto.AuthUserResponse;
import com.warehouse.auth.dto.AuthTokenResponse;
import com.warehouse.auth.dto.DevLoginRequest;
import com.warehouse.auth.service.AuthService;
import com.warehouse.common.response.ApiResponse;
import com.warehouse.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("dev")
@RequestMapping("/api/v1/auth")
public class DevAuthController {
    private final AuthService authService;
    private final JwtService jwtService;

    public DevAuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/dev-login")
    public ApiResponse<AuthTokenResponse> devLogin(@Valid @RequestBody DevLoginRequest request) {
        AuthUserResponse user = authService.devLogin(request.email());
        return ApiResponse.success(jwtService.createToken(user), "Đăng nhập môi trường phát triển thành công");
    }
}
